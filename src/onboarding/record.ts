import { finishAttempt, markWelcomeSeen, recordStep, startAttempt, type OnboardingEvent } from "../lib/onboardingRecord"

/** The walkthrough's current attempt lives in sessionStorage, so a reload keeps recording into the same attempt. */
const ACTIVE = "platypus.v1.onboarding.active"
export const FLOW_VERSION = "ob-1"
const read = () => { try { return window.sessionStorage.getItem(ACTIVE) } catch { return null } }
const write = (id: string | null) => { try { id ? window.sessionStorage.setItem(ACTIVE, id) : window.sessionStorage.removeItem(ACTIVE) } catch { /* recording is optional */ } }

/** One place that begins a walkthrough: used by the welcome page and by "Replay walkthrough". Marks the welcome page as seen. */
export function beginWalkthrough(): string {
  const id = startAttempt("start", FLOW_VERSION)
  write(id); markWelcomeSeen()
  return id
}
export function recordEvent(step: string, event: OnboardingEvent): void { const id = read(); if (id) recordStep(id, step, event) }
export function endWalkthrough(outcome: "completed" | "exited"): void { const id = read(); if (id) { finishAttempt(id, outcome); write(null) } }
