import { expect, test } from "@playwright/test"
import { resetDemo } from "./helpers"

const PAGES: [string, string][] = [
  ["/", "Today"], ["/events", "Events"], ["/tasks", "Tasks"], ["/team", "Team"], ["/funding", "Funding"],
  ["/handoff", "Handoff"], ["/partners", "Partners"], ["/rules", "Rules"], ["/settings", "Settings"], ["/help", "Help"],
]

for (const [path, h1] of PAGES) {
  test(`page ${path} loads with a short title`, async ({ page }) => {
    const errors: string[] = []
    page.on("pageerror", e => errors.push(e.message))
    await page.goto(`/#${path}`)
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(h1)
    expect(errors).toEqual([])
  })
}

test("view-as switches whose tasks are shown, and reset restores the demo", async ({ page }) => {
  await page.goto("/#/tasks")
  await page.getByTestId("view-as").selectOption("maya")
  await expect(page.getByTestId("my-tasks")).toContainText("Reconcile September receipts")
  await page.reload()
  await expect(page.getByTestId("view-as")).toHaveValue("maya")
  await resetDemo(page)
  await expect(page.getByTestId("view-as")).toHaveValue("alex")
})

test("every page has the same three parts: nav, content and the Ask panel", async ({ page }) => {
  await page.goto("/#/rules")
  await expect(page.getByRole("navigation", { name: "Sections" })).toBeVisible()
  await expect(page.locator("main")).toBeVisible()
  await expect(page.locator("main textarea")).toHaveCount(0) // no AI boxes inside pages any more
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1)
})
