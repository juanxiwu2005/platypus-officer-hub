import { expect, type Page } from "@playwright/test"
import { closeRail } from "./helpers"
import { savedDemo } from "./demo-contract"

/** Existing demo data opts in through the shipped control; it is never upgraded by a fixture write. */
export async function enableUpdatedReminders(page: Page) {
  await page.goto("/#/")
  await expect(page.getByTestId("reminder-centre")).toBeVisible()
  await closeRail(page)
  const state = await savedDemo(page)
  if (state.reminderRuntime?.version !== 2) {
    await page.getByRole("button", { name: "Enable updated reminders", exact: true }).click()
    await expect.poll(async () => (await savedDemo(page)).reminderRuntime?.version).toBe(2)
  }
}
