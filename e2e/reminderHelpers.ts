import { expect, type Page } from "@playwright/test"
import { closeRail } from "./helpers"
import { savedDemo } from "./demo-contract"
import { upgradeReminderPlan } from "../src/reminders/adapter"

/**
 * Put the saved demo into the updated reminder plan. S2 (2026-11-22) removed the home page's "Enable updated reminders"
 * card because saves are to upgrade automatically on load (a separate package). Until that lands, this applies the same
 * upgrade the store's `upgradeReminderPlan` action applies, then reloads; once saves upgrade on load it is a no-op.
 */
export async function enableUpdatedReminders(page: Page) {
  await page.goto("/#/")
  await expect(page.getByTestId("reminder-centre")).toBeAttached()   // an older plan renders an empty centre
  await closeRail(page)
  const state = await savedDemo(page)
  if (state.reminderRuntime?.version !== 2) {
    await page.evaluate(next => localStorage.setItem("platypus.v1.demo", JSON.stringify(next)), upgradeReminderPlan(state))
    await page.reload()
    await expect(page.getByTestId("reminder-centre")).toBeVisible()
    await closeRail(page)
    await expect.poll(async () => (await savedDemo(page)).reminderRuntime?.version).toBe(2)
  }
}
