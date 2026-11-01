import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { closeRail } from "./helpers"

// S8: hover cards cannot be hovered on a phone, so a tap opens the same card as a sheet at the bottom of the screen.
const phoneOnly = (info: { project: { name: string } }) => test.skip(info.project.name !== "mobile", "touch behaviour is tested on the phone project")
const scan = async (page: Page) => (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(" ")).slice(0, 3).join(" ; ")}`)

test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", r => r.fulfill({ json: { ok: true, configured: false, provider: null, model: null } }))
})

test("Events funding on a phone: each of the six stages opens when tapped, and a tap elsewhere closes it", async ({ page }, info) => {
  phoneOnly(info)
  await page.goto("/#/events?event=e-night&view=budget")
  await closeRail(page)
  await page.getByRole("button", { name: "Funding application", exact: true }).tap()
  const card = page.getByRole("region", { name: "Funding for Networking Night" })
  const dots = card.getByRole("list", { name: "Networking Night funding stages" }).locator("button.chain-btn")
  await expect(dots).toHaveCount(6)
  const stages = ["Budget request", "Budget approved", "Purchase request", "Purchase approved", "Ordered or reimbursed", "Attendance submitted"]
  for (let index = 0; index < stages.length; index++) {
    await dots.nth(index).tap()
    const sheet = card.locator(".hover-card").nth(index)
    await expect(sheet).toBeVisible()
    await expect(sheet).toContainText(stages[index])
    await expect(dots.nth(index)).toHaveAttribute("aria-expanded", "true")
    const box = await sheet.boundingBox()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width)
    await card.getByRole("heading", { name: "Networking Night", exact: true }).tap()
    await expect(sheet).toBeHidden()
  }
  expect(await scan(page)).toEqual([])
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

test("Events flow steps open the shared task details with deadlines and rule sources", async ({ page }, info) => {
  await page.goto("/#/events")
  await closeRail(page)
  const node = page.getByTestId("flow-node-purchaseRequest")
  if (info.project.name === "mobile") await node.tap()
  else await node.click()
  const panel = page.getByTestId("task-detail")
  await expect(panel).toBeVisible()
  await expect(panel.getByRole("heading", { name: "Purchase Request" })).toBeVisible()
  await expect(panel.locator(".task-dates")).toContainText("ASU deadline")
  await expect(panel.locator(".task-dates")).toContainText("Thu, Mar 11")
  await panel.getByText("Sources and responsibilities", { exact: true }).click()
  await expect(panel.getByRole("link", { name: "R09", exact: true })).toBeVisible()
})

test("navigation: the second group has a title on wide screens and stays hidden on a phone", async ({ page }, info) => {
  await page.goto("/#/")
  const label = page.locator("nav.sidenav .group")
  await expect(label).toHaveText("Reference")
  if (info.project.name === "mobile") await expect(label).toBeHidden()
  else await expect(label).toBeVisible()
})

test("navigation: Tasks counts open work separately from unread private updates", async ({ page }) => {
  await page.goto("/#/")
  await closeRail(page)
  const count = page.getByTestId("nav-open-tasks")
  const initial = await count.innerText()
  await expect(page.getByTestId("bell")).toHaveAccessibleName("Private updates, 0 unread")
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem("platypus.v1.demo")!)
    const viewer = raw.viewerId
    raw.notifications = [0, 1].map(i => ({ id: `n-test-${i}`, recipientId: viewer, nodeId: raw.nodes[0].id, kind: "info", text: "Test update", createdOn: raw.today, read: false }))
    localStorage.setItem("platypus.v1.demo", JSON.stringify(raw))
  })
  await page.reload()
  await closeRail(page)
  await expect(count).toHaveText(initial)
  await expect(page.getByRole("link", { name: /Tasks/ })).toContainText("open tasks")
  await expect(page.getByTestId("bell")).toHaveAccessibleName("Private updates, 2 unread")
  expect(await scan(page)).toEqual([])
})
