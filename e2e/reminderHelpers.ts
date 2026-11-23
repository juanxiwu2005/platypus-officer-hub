import { expect, type Page } from "@playwright/test"
import type { ReminderMode } from "../src/data/types"
import { closeRail } from "./helpers"
import { savedDemo } from "./demo-contract"

/**
 * Opens the reminder centre on the current reminder plan. Since S2 (2026-11-22) every loaded, reset or imported demo is upgraded
 * automatically, so this only checks that: the "Enable updated reminders" card must not appear. The name is kept for older specs.
 * `mode` saves another sending choice first (the sample club starts on "review_then_auto"), the way Settings would store it.
 */
export async function enableUpdatedReminders(page: Page, mode?: ReminderMode) {
  await page.goto("/#/")
  if (mode) {
    await savedDemo(page)
    await page.evaluate(mode => {
      const s = JSON.parse(localStorage.getItem("platypus.v1.demo")!)
      s.org.settings.reminderMode = mode
      localStorage.setItem("platypus.v1.demo", JSON.stringify(s))
    }, mode)
    await page.reload()
  }
  await expect(page.getByTestId("reminder-centre")).toBeVisible()
  await closeRail(page)
  await expect.poll(async () => (await savedDemo(page)).reminderRuntime?.version).toBe(2)
  await expect(page.getByTestId("reminder-plan-status")).toHaveCount(0)
}
