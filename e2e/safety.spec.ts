import { expect, test } from "@playwright/test"
import { readFileSync } from "node:fs"
import { closeRail } from "./helpers"

test("Settings has an Export my data button that downloads the data and the interaction log", async ({ page }) => {
  await page.goto("/#/")
  await page.evaluate(() => window.localStorage.clear())
  await page.goto("/#/settings")
  await closeRail(page)
  // do something so the log has a line to show
  await page.getByTestId("demo-menu").click()
  await page.getByTestId("clock-1").click()
  await page.getByRole("button", { name: "My preferences" }).click()
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-data").click()])
  expect(download.suggestedFilename()).toMatch(/^platypus-export-.*\.json$/)
  const file = JSON.parse(readFileSync((await download.path())!, "utf8"))
  expect(file).toMatchObject({ format: "platypus-export", formatVersion: 1 })
  expect(file.state.nodes.length).toBeGreaterThan(0)
  expect(file.interactionLog.entries.map((e: { type: string }) => e.type)).toContain("advanceClock")
  const entry = file.interactionLog.entries.find((e: { type: string }) => e.type === "advanceClock")
  expect(entry).toMatchObject({ actor: "alex", payload: { days: 1 }, applied: true })
  expect(entry.before.today).toBe("2026-10-22")
  expect(entry.at).toBeGreaterThan(1_700_000_000_000) // a real timestamp, not the demo date
  expect(file.state.today).toBe("2026-10-23") // what the screen shows still follows the demo clock
})

test("when the browser refuses to save, the page says so instead of staying silent", async ({ page }) => {
  await page.goto("/#/")
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await expect(page.getByTestId("storage-banner")).toHaveCount(0)
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException("full", "QuotaExceededError") } })
  await closeRail(page)
  await page.getByTestId("demo-menu").click()
  await page.getByTestId("clock-1").click()
  await expect(page.getByTestId("storage-banner")).toContainText("could not be saved")
  await expect(page.getByRole("button", { name: "Download my data" })).toBeVisible()
})

test("old data from another version is kept in the browser and the page says where", async ({ page }) => {
  await page.goto("/#/")
  await page.evaluate(() => window.localStorage.setItem("platypus.v1.demo", JSON.stringify({ schemaVersion: 1, marker: "typed by a participant" })))
  await page.reload()
  await expect(page.getByTestId("storage-banner")).toContainText("platypus.v1.demo.backup.v1")
  expect(await page.evaluate(() => window.localStorage.getItem("platypus.v1.demo.backup.v1"))).toContain("typed by a participant")
})
