import { expect, test, type Page } from "@playwright/test"
import { closeRail } from "../../../e2e/helpers"

async function fresh(page: Page, path: string) {
  await page.addInitScript(() => window.localStorage.clear())
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

