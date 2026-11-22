import { expect, test, type Page } from "@playwright/test"
import { closeRail, viewAs } from "./helpers"

// DX-18: an empty list that was emptied by a search or filter says how to get everything back; the Today stars say what to do.
async function fresh(page: Page, path: string) {
  await page.addInitScript(() => window.localStorage.clear())
  await page.goto(`/#${path}`)
  await closeRail(page)
}

test("Rules: an empty search offers Clear filters", async ({ page }) => {
  await fresh(page, "/rules")
  await expect(page.locator(".rule-row").first()).toBeVisible()
  const count = () => page.locator(".rule-row").count()
  const before = await count()
  expect(before).toBeGreaterThan(0)
  await page.getByLabel("Search sources").fill("zzzz-no-such-source")
  await expect(page.getByText("No matching source.")).toBeVisible()
  await page.getByRole("button", { name: "Clear filters" }).click()
  await expect(page.getByLabel("Search sources")).toHaveValue("")
  expect(await count()).toBe(before)
})

// FB-8: the stars card left the home page (the reminder centre). Its empty sections say what is (not) there instead.
// Concept F hides the president's empty history; an officer's own reminders keep both sections and word them when empty.
test("Reminders: an empty section says so instead of showing nothing", async ({ page }) => {
  await fresh(page, "/")
  await viewAs(page, "maya")
  await closeRail(page)
  const yours = page.getByTestId("your-reminders")
  await expect(yours.getByRole("heading", { name: "Coming up", exact: true })).toBeVisible()
  await expect(yours).toContainText("No reminders coming up for you this week.")
  await expect(yours.getByRole("heading", { name: "Recorded for you", exact: true })).toBeVisible()
  await expect(yours).toContainText("No recorded reminders yet.")
})
