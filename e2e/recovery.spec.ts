import { expect, test } from "@playwright/test"
import { openDemoMenu } from "./helpers"

// Audit §5.3: nothing guarded the two ways a participant could lose the demo and not get it back —
// one accidental Reset, and saved data that breaks every render from then on.

test("Reset demo asks once, and forgets the question if you walk away", async ({ page }) => {
  await page.goto("/#/tasks")
  await openDemoMenu(page)
  const reset = page.getByTestId("reset-demo")
  await reset.click()
  await expect(reset).toHaveText("Click again to reset")
  // One click changes nothing: the demo clock is still where it was.
  await expect(page.getByTestId("demo-date")).toContainText("Oct 22")
  await page.keyboard.press("Escape")
  await openDemoMenu(page)
  await expect(page.getByTestId("reset-demo")).toHaveText("Reset demo")
  await page.getByTestId("reset-demo").click()
  await page.getByTestId("reset-demo").click()
  await expect(page.locator(".toast")).toContainText("Demo data reset")
})

test("damaged saved data shows a way out instead of a white page, and the reset works", async ({ page }) => {
  await page.goto("/#/tasks")
  // Passes the schema check in loadState, then breaks on the first render — the reload loop a
  // participant could not escape, because the store's own reset never gets to run.
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("platypus.v1.demo")!)
    localStorage.setItem("platypus.v1.demo", JSON.stringify({ schemaVersion: saved.schemaVersion, people: [], roles: [], nodes: [], events: [] }))
  })
  await page.reload()
  const screen = page.getByTestId("app-error")
  await expect(screen).toBeVisible()
  await expect(screen).toContainText("Reload first")
  await expect(screen.getByRole("button", { name: "Reload" })).toBeVisible()
  await screen.getByTestId("error-reset").click()
  await expect(page.getByRole("navigation", { name: "Sections" })).toBeVisible()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!).people.length)).toBeGreaterThan(0)
})
