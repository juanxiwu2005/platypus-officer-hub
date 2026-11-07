import { finishAttempt, loadOnboardingRecord, markWelcomeSeen, recordStep, startAttempt, type OnboardingEvent } from "../lib/onboardingRecord"

/** The walkthrough's current attempt lives in sessionStorage, so a reload keeps recording into the same attempt. */
const ACTIVE = "platypus.v1.onboarding.active"
export const FLOW_VERSION = "ob-3"   // ob-3: First event can be skipped (ob-2: it was required)
const read = () => { try { return window.sessionStorage.getItem(ACTIVE) } catch { return null } }
const write = (id: string | null) => { try { id ? window.sessionStorage.setItem(ACTIVE, id) : window.sessionStorage.removeItem(ACTIVE) } catch { /* recording is optional */ } }

/** One place that begins a walkthrough: used by the welcome page and by "Replay walkthrough". Marks the welcome page as seen. */
export function beginWalkthrough(): string {
  // The study link opened again in the same tab while an attempt is still open: that attempt is over. The record has no "abandoned" outcome, so it
  // ends as "exited"; unlike Exit, it has no "exit" step, which is how the two can be told apart.
  const open = read()
  if (open && loadOnboardingRecord().attempts.some(a => a.id === open && !a.outcome)) finishAttempt(open, "exited")
  const id = startAttempt("start", FLOW_VERSION)
  write(id); markWelcomeSeen()
  return id
}
export function recordEvent(step: string, event: OnboardingEvent): void { const id = read(); if (id) recordStep(id, step, event) }
export function endWalkthrough(outcome: "completed" | "exited"): void { const id = read(); if (id) { finishAttempt(id, outcome); write(null) } }
/** Forget the current attempt without recording anything more: the "Test Onboarding Page" buttons use it, so testing never adds to the research record. */
export function forgetWalkthrough(): void { write(null) }
