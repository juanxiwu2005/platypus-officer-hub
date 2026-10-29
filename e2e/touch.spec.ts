import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { closeRail } from "./helpers"

// S8: hover cards cannot be hovered on a phone, so a tap opens the same card as a sheet at the bottom of the screen.
const phoneOnly = (info: { project: { name: string } }) => test.skip(info.project.name !== "mobile", "touch behaviour is tested on the phone project")
const scan = async (page: Page) => (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(" ")).slice(0, 3).join(" ; ")}`)

test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", r => r.fulfill({ json: { ok: true, configured: false, provider: null, model: null } }))
})

test("Funding on a phone: each of the six dots opens its stage when tapped, and a tap elsewhere closes it", async ({ page }, info) => {
  phoneOnly(info)
  await page.goto("/#/funding")
  await closeRail(page)
  const dots = page.getByTestId("funding-stages").first().locator("button.chain-btn")
  await expect(dots).toHaveCount(6)
  await dots.first().tap()
  const sheet = page.getByTestId("funding-stages").first().locator(".hover-card").first()
  await expect(sheet).toBeVisible()
  await expect(sheet).toContainText("Budget request")
  await expect(dots.first()).toHaveAttribute("aria-expanded", "true")
  const box = await sheet.boundingBox()
  const view = page.viewportSize()!
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(view.width) // a sheet, so it never runs off the edge
  expect(await scan(page)).toEqual([])
  await page.getByRole("heading", { level: 1 }).tap() // a tap elsewhere closes the sheet
  await expect(sheet).toBeHidden()
  await dots.nth(3).tap()
  await expect(page.getByTestId("funding-stages").first().locator(".hover-card").nth(3)).toContainText("Purchase approved")
})

test("Handoff on a phone: the season dots and each first-week item open their source when tapped", async ({ page }, info) => {
  phoneOnly(info)
  await page.goto("/#/handoff")
  await closeRail(page)
  const dot = page.locator(".season button.chain-btn").first()
  await dot.tap()
  await expect(page.locator(".season .hover-card").first()).toBeVisible()
  await page.getByRole("heading", { level: 1 }).tap()
  await page.getByRole("button", { name: "Start handoff season" }).tap() // the role handbooks only open once a season has started
  await page.locator("main button.relay").first().tap()
  const details = page.getByRole("region", { name: "Details" })
  await expect(details).toBeVisible()
  const source = details.getByRole("button", { name: /^Where ".*" comes from$/ }).first()
  await source.tap()
  await expect(details.locator(".hover-card").filter({ hasText: /SEO|ASU/ }).first()).toBeVisible()
  // Tapping the item's text still ticks the box; only the ⓘ opens the source.
  await expect(details.locator("label.check-label input[type=checkbox]").first()).not.toBeChecked()
})

test("Events on a phone: opening a flow step shows its ASU deadline and rule without another tap; on a computer the extra part stays folded", async ({ page }, info) => {
  await page.goto("/#/events")
  await closeRail(page)
  await page.getByTestId("flow-node-usg").tap().catch(() => page.getByTestId("flow-node-usg").click())
  const panel = page.getByTestId("node-panel")
  await expect(panel).toBeVisible()
  const more = panel.locator("details.more")
  if (info.project.name === "mobile") {
    await expect(more).toHaveAttribute("open", "")
    await expect(panel.getByText("ASU deadline:")).toBeVisible()
  } else {
    await expect(more).not.toHaveAttribute("open", "")
  }
})

test("navigation: the second group has a title on wide screens and stays hidden on a phone", async ({ page }, info) => {
  await page.goto("/#/")
  const label = page.locator("nav.sidenav .group")
  await expect(label).toHaveText("Reference")
  if (info.project.name === "mobile") await expect(label).toBeHidden()
  else await expect(label).toBeVisible()
})

test("navigation: Tasks shows how many private updates are unread, and nothing when there are none", async ({ page }) => {
  await page.goto("/#/")
  await closeRail(page)
  await expect(page.getByTestId("nav-unread")).toHaveCount(0)
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem("platypus.v1.demo")!)
    const viewer = raw.viewerId
    raw.notifications = [0, 1].map(i => ({ id: `n-test-${i}`, recipientId: viewer, nodeId: raw.nodes[0].id, kind: "info", text: "Test update", createdOn: raw.today, read: false }))
    localStorage.setItem("platypus.v1.demo", JSON.stringify(raw))
  })
  await page.reload()
  await closeRail(page)
  const count = page.getByTestId("nav-unread")
  await expect(count).toContainText("2")
  await expect(page.getByRole("link", { name: /Tasks/ })).toContainText("unread private updates")
  expect(await scan(page)).toEqual([])
})
