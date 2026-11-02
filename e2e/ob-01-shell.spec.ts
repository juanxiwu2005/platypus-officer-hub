import { expect, test } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { onboardingRecord } from "./ob-helpers"

// OB-01: the focus shell, the progress chain, the step flow and the draft. The new screens are placeholders until OB-04…OB-09, so these tests
// look at the structure around them.
const scan = async (page: import("@playwright/test").Page) => (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations.map(v => v.id)

test("the founder flow shows a progress chain that follows the route", async ({ page }) => {
  await page.goto("/#/welcome/founder/name")
  const chain = page.getByRole("list", { name: "Walkthrough progress" })
  await expect(chain.getByRole("listitem")).toHaveCount(7)
  await expect(chain.locator("[aria-current=step]")).toHaveText(/Name/)
  await page.goto("/#/welcome/founder/team")
  await expect(chain.locator("[aria-current=step]")).toHaveText(/Team/)
  await expect(chain.locator(".is-done")).toHaveCount(3)
})
test("the member flow has its own six steps", async ({ page }) => {
  await page.goto("/#/welcome/member/reminders")
  await expect(page.getByRole("list", { name: "Walkthrough progress" }).getByRole("listitem")).toHaveCount(6)
})
test("the welcome and classic pages have no progress chain, and nothing from the app frame", async ({ page }) => {
  for (const path of ["/#/welcome", "/#/welcome/classic"]) {
    await page.goto(path)
    await expect(page.getByRole("list", { name: "Walkthrough progress" })).toHaveCount(0)
    await expect(page.getByRole("combobox", { name: "View as" })).toHaveCount(0)
  }
})
test("the classic setup still finishes inside the shell, and the classic join page has one main landmark", async ({ page }) => {
  await page.goto("/#/welcome/classic")
  await page.getByRole("button", { name: "Use the sample constitution" }).click()
  await expect(page.getByTestId("constitution-chip")).toBeVisible()
  expect(await scan(page)).toEqual([])
  await page.goto("/#/welcome/classic-join?invite=nope")
  await expect(page.locator("main")).toHaveCount(1)
})
test("an unknown /welcome path shows a placeholder and no accessibility problems", async ({ page }) => {
  await page.goto("/#/welcome/founder/goals")
  expect(await scan(page)).toEqual([])
})
test("Save & exit on a flow screen records the step it left from", async ({ page }) => {
  await page.goto("/#/welcome/start")
  await page.goto("/#/welcome/founder/goals")
  await page.getByRole("button", { name: "Save & exit" }).click()
  await expect(page.locator("main h1")).toHaveText("Today")
  const rec = await onboardingRecord(page)
  expect(rec.attempts[0].steps).toContainEqual(expect.objectContaining({ step: "founder.goals", event: "exit" }))
})
