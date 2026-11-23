import { expect, test } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { closeRail } from "./helpers"

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { configured: false } }))
})

test("Team opens directly from the main navigation and remains current after refresh", async ({ page }, info) => {
  const errors: string[] = []
  page.on("pageerror", error => errors.push(error.message))
  await page.goto("/#/events")
  await closeRail(page)
  const nav = page.getByRole("navigation", { name: "Sections", exact: true })
  await expect(nav.getByRole("link")).toHaveText([/^Reminders/, /^Plan/, /^Team/, /^Handoff/, /^Rules/, /^Quest$/, /^Settings/, /^Help/])
  await expect(nav.getByRole("button", { name: "More", exact: true })).toHaveCount(0)
  await expect(nav.getByRole("link", { name: "Partners", exact: true })).toHaveCount(0)
  const team = nav.getByRole("link", { name: "Team", exact: true })
  await team.click()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Team")
  await expect(team).toHaveAttribute("aria-current", "page")
  await page.reload()
  await expect(team).toHaveAttribute("aria-current", "page")
  await closeRail(page)
  const axe = await new AxeBuilder({ page }).include("nav.sidenav").withTags(["wcag2a", "wcag2aa"]).analyze()
  expect(axe.violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
  await page.screenshot({ path: info.outputPath("team-primary-navigation.png") })
  expect(errors).toEqual([])
})

test("archived Partners bookmarks redirect without loading the old screen or changing contact records", async ({ page }) => {
  const scripts: string[] = []
  page.on("request", request => { if (request.resourceType() === "script") scripts.push(request.url()) })
  await page.goto("/#/team")
  const data = () => page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("platypus.v1.demo")!)
    return { schema: state.schemaVersion, contacts: state.contacts, organizations: state.organizations, interactions: state.interactions }
  })
  const before = await data()
  expect(before.contacts.length).toBeGreaterThan(0)
  for (const path of ["/partners", "/partners?contact=c-caterer", "/partners/old-link"]) {
    await page.goto(`/#${path}`)
    await expect(page).toHaveURL(/#\/$/)
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Reminders")
  }
  await page.reload()
  await expect(page).toHaveURL(/#\/$/)
  expect(await data()).toEqual(before)
  expect(scripts.filter(url => /\/Partners[-.]/.test(url))).toEqual([])
  await expect(page.getByTestId("contacts")).toHaveCount(0)
})

test("Handoff can still open shared contact details after the standalone Partners screen is archived", async ({ page }) => {
  await page.goto("/#/handoff")
  await closeRail(page)
  const { contact, role } = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("platypus.v1.demo")!)
    const contact = state.contacts.find((item: { visibility: string; ownerRoleId: string }) => item.visibility === "all" && item.ownerRoleId)
    return { contact, role: state.roles.find((item: { id: string }) => item.id === contact.ownerRoleId) }
  })
  await page.getByTestId("role-handbooks").locator("button.relay").filter({ hasText: role.displayName }).click()
  const dossier = page.getByTestId("role-dossier")
  if (!(await dossier.getAttribute("open"))) {
    // The boolean open attribute is an empty string when present.
    if (!(await dossier.evaluate(element => (element as HTMLDetailsElement).open))) await dossier.locator("summary").click()
  }
  await dossier.getByTestId("dossier-people").getByRole("button").filter({ hasText: contact.name }).click()
  await expect(page.getByRole("heading", { name: contact.name, exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Contacted today", exact: true })).toBeVisible()
})
