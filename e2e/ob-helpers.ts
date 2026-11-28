import type { Page } from "@playwright/test"

/** Helpers for the onboarding specs (OB-01). The walkthrough switch is off by default, so a spec turns it on with ?walkthrough=1. */
export const WELCOME_ON = "/?walkthrough=1#/"
/** What the walkthrough has recorded in this browser (the new key, separate from the interaction log). */
export const onboardingRecord = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.onboarding") ?? '{"attempts":[]}') as { attempts: { id: string; entry: string; replay: number; outcome?: string; flowVersion: string; setupChoice?: string; steps: { step: string; event: string }[] }[] })
export const seenWelcome = (page: Page) => page.evaluate(() => localStorage.getItem("platypus.v1.onboarding.seen") === "1")
