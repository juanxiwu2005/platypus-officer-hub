import { expect, test, type Page } from "@playwright/test"
import { openMore, viewAs } from "./helpers"

// Handoff stage 1 (docs/HANDOFF_EXECUTION_PLAN.md §3). The sample club's handoff season is already open (P3-A).
test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", r => r.fulfill({ json: { ok: true, configured: true, provider: "mock", model: "mock" } }))
  await page.route("**/api/handbook/draft", r => r.fulfill({ json: { entries: [{ sourceId: "interview:r-fin:1" }], model: "mock", provider: "mock", source: "ai" } }))
})

/** Treasurer: draft, Maya confirms, Alex approves, finish. Leaves the viewer on Alex (the president). */
async function handOverTreasurer(page: Page) {
  await page.goto("/#/handoff")
  await expect(page.getByRole("button", { name: "Save dates" })).toBeVisible()
  await page.getByRole("button", { name: /^Treasurer handbook/ }).click()
  const role = page.getByRole("region", { name: "Treasurer handbook" })
  await role.getByRole("button", { name: "Draft role handbook" }).click()
  await expect(role.getByTestId("handbook-draft")).toBeVisible()
  await viewAs(page, "maya")
  await role.getByRole("button", { name: "Confirm as outgoing officer", exact: true }).click()
  await viewAs(page, "alex")
  await role.getByRole("button", { name: "Approve as president", exact: true }).click()
  await role.getByRole("button", { name: "Finish role handoff" }).click()
  await expect(role).toContainText("Handed to Incoming Treasurer (example)")
}

test("after a role handoff, Settings still save and the former officer leaves the View as list", async ({ page }) => {
  await handOverTreasurer(page)
  await openMore(page)
  const options = await page.getByTestId("view-as").locator("option").allTextContents()
  expect(options.some(o => o.startsWith("Incoming Treasurer (example)"))).toBe(true)
  expect(options.some(o => o.startsWith("Maya"))).toBe(false)
  await page.keyboard.press("Escape")

  await page.goto("/#/settings")
  const settings = page.getByTestId("club-settings")
  await settings.getByLabel("Club name", { exact: true }).fill("Desert Founders Renamed")
  await expect(settings.getByRole("status")).toContainText("Saved")
  await page.reload()
  await expect(page.getByTestId("club-settings").getByLabel("Club name", { exact: true })).toHaveValue("Desert Founders Renamed")
})

test("a role added in Settings during the season gets its own handbook card", async ({ page }) => {
  await page.goto("/#/settings")
  await page.getByRole("button", { name: "Roles & teams", exact: true }).click()
  const settings = page.getByTestId("club-settings")
  await settings.getByRole("button", { name: "Contact list", exact: true }).click()
  await settings.getByRole("button", { name: "Edit roles", exact: true }).click()
  await settings.getByRole("button", { name: "Add role", exact: true }).click()
  await settings.getByLabel("Role title", { exact: true }).last().fill("Events Chair")
  await expect(settings.getByRole("status")).toContainText("Saved")
  await page.goto("/#/handoff")
  await page.getByRole("button", { name: /^Events Chair handbook/ }).click()
  const role = page.getByRole("region", { name: "Events Chair handbook" })
  await expect(role).toBeVisible()
  await expect(page.getByText("Start the handoff season to draft this handbook")).toHaveCount(0)
})

test("a new interview box is empty with a hint, not prefilled", async ({ page }) => {
  await page.goto("/#/handoff")
  await page.getByRole("button", { name: "Save dates" }).waitFor()
  // A season the president starts from scratch: clear the sample season first.
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("platypus.v1.demo")!); s.handoff = null; s.handoffRoles = []; localStorage.setItem("platypus.v1.demo", JSON.stringify(s)) })
  await page.reload()
  await page.getByRole("button", { name: "Start handoff season" }).click()
  await page.getByRole("button", { name: /^Treasurer handbook/ }).click()
  const box = page.getByRole("region", { name: "Treasurer handbook" }).getByLabel("Outgoing interview · fictional example only")
  await expect(box).toHaveValue("")
  await expect(box).toHaveAttribute("placeholder", "One point per line. Fictional examples only.")
})
