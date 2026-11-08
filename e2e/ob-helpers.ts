import { expect, type Page } from "@playwright/test"
import type { ReminderMode } from "../src/data/types"
import { onboardingCopy } from "../src/onboarding/copy"

/** Helpers for the onboarding specs (OB-01). The walkthrough switch is off by default, so a spec turns it on with ?walkthrough=1. */
export const WELCOME_ON = "/?walkthrough=1#/"
/** What the walkthrough has recorded in this browser (the new key, separate from the interaction log). */
export const onboardingRecord = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.onboarding") ?? '{"attempts":[]}') as { attempts: { id: string; entry: string; replay: number; outcome?: string; flowVersion: string; steps: { step: string; event: string }[] }[] })
/** A new walkthrough starts with an empty mission, and Goals (even Skip for now) needs one. */
export const MISSION = "Help students build robots together."
export const fillMission = (page: Page) => page.getByRole("textbox", { name: "Mission" }).fill(MISSION)
export const seenWelcome = (page: Page) => page.evaluate(() => localStorage.getItem("platypus.v1.onboarding.seen") === "1")

/**
 * P3-H: the founder flow's Reminders screen, between First event and Confirm. A spec that walks the whole founder flow passes it here:
 * with no `mode` it presses Skip for now (the club then has no reminderMode, as before this screen existed); with a `mode` it ticks that
 * option and presses Continue. Either way it waits for the screen first, so a spec cannot pass it by accident.
 */
export async function passReminders(page: Page, mode?: ReminderMode) {
  const screen = page.getByTestId("reminder-mode")
  await expect(page.getByRole("heading", { level: 1, name: onboardingCopy.founder.reminders.title })).toBeVisible()
  if (!mode) { await screen.getByRole("button", { name: onboardingCopy.skip }).click(); return }
  await screen.getByRole("radio", { name: onboardingCopy.founder.reminders.options[mode].title }).check()
  await screen.getByRole("button", { name: onboardingCopy.next, exact: true }).click()
}
