import { expect, test, type Page } from "@playwright/test"
import { closeRail } from "./helpers"

// DX-18: an empty list that was emptied by a search or filter says how to get everything back; the Today stars say what to do.
async function fresh(page: Page, path: string) {
  await page.goto("/#/")
  await page.evaluate(() => window.localStorage.clear())
  await page.goto(`/#${path}`)
  await closeRail(page)
}

test("Partners people: an empty search offers Clear filters, and it brings the list back", async ({ page }) => {
  await fresh(page, "/partners")
  await expect(page.getByTestId("contacts").getByRole("row").nth(1)).toBeVisible()   // the list has rendered
  const before = await page.getByTestId("contacts").getByRole("row").count()
  expect(before).toBeGreaterThan(1)
  await page.getByLabel("Search partners").fill("zzzz-no-such-person")
  await expect(page.getByText("No contacts match.")).toBeVisible()
  await page.getByRole("button", { name: "Clear filters" }).click()
  await expect(page.getByLabel("Search partners")).toHaveValue("")
  await expect(page.getByText("No contacts match.")).toHaveCount(0)
  expect(await page.getByTestId("contacts").getByRole("row").count()).toBe(before)
})

test("Partners organizations: the same way back", async ({ page }) => {
  await fresh(page, "/partners")
  await page.getByRole("button", { name: /Organizations/ }).click()
  await page.getByLabel("Search partners").fill("zzzz-no-such-org")
  await expect(page.getByText("No organizations match.")).toBeVisible()
  await page.getByRole("button", { name: "Clear filters" }).click()
  await expect(page.getByText("No organizations match.")).toHaveCount(0)
})

test("Rules: an empty search offers Clear filters", async ({ page }) => {
  await fresh(page, "/rules")
  const count = () => page.locator(".rule-row").count()
  const before = await count()
  expect(before).toBeGreaterThan(0)
  await page.getByLabel("Search sources").fill("zzzz-no-such-source")
  await expect(page.getByText("No matching source.")).toBeVisible()
  await page.getByRole("button", { name: "Clear filters" }).click()
  await expect(page.getByLabel("Search sources")).toHaveValue("")
  expect(await count()).toBe(before)
})

test("Today: the empty stars card says what to do", async ({ page }) => {
  await fresh(page, "/")
  // The sample club already has a star this week (P3-A), so empty the week's finished-work records first.
  await page.reload()                                                     // a fresh load saves the sample club
  await expect(page.getByRole("heading", { name: "Superstar of the week" })).toBeVisible()
  await expect.poll(() => page.evaluate(() => localStorage.getItem("platypus.v1.demo"))).not.toBeNull()
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem("platypus.v1.demo")!)
    raw.contributions = []
    localStorage.setItem("platypus.v1.demo", JSON.stringify(raw))
  })
  await page.reload()
  await expect(page.getByText("No stars yet. Finish a step.")).toBeVisible()
})
