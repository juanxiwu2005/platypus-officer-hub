import { finishAttempt, loadOnboardingRecord, markSetup, markWelcomeSeen, recordStep, startAttempt, type OnboardingEvent, type SetupChoice } from "../lib/onboardingRecord"
import { beginSession } from "../lib/studySession"

/** The walkthrough's current attempt lives in sessionStorage, so a reload keeps recording into the same attempt. */
const ACTIVE = "platypus.v1.onboarding.active"
// ob-5 (FB-2/FB-3, 2026-11): the Constitution and Goals screens are removed (the constitution is an optional section on Team, the mission is on Name,
// goals live in Settings only); Invite no longer leads into the member preview and Confirm has one primary button (those two are FB-3, same release).
// ob-4 (P3-H, 2026-11-08): a new optional founder screen, Reminders, between First event and Confirm. ob-3: First event can be skipped (ob-2: it was required).
export const FLOW_VERSION = "ob-5"
const read = () => { try { return window.sessionStorage.getItem(ACTIVE) } catch { return null } }
const write = (id: string | null) => { try { id ? window.sessionStorage.setItem(ACTIVE, id) : window.sessionStorage.removeItem(ACTIVE) } catch { /* recording is optional */ } }

/**
 * One place that begins a walkthrough: used by the study link (/#/start), the welcome page and "Replay walkthrough". Marks the welcome page as seen.
 * It also begins a new study session (src/lib/studySession.ts): data from an earlier sitting (older than 6 hours) is removed, counted;
 * the last 6 hours stay, so opening the link again mid-session loses nothing. The Demo menu's Test buttons never come here, so they never start a session or record anything.
 */
export function beginWalkthrough(): string {
  // The new session first: it removes an open attempt from an earlier sitting (older than 6 hours) instead of closing it now.
  const session = beginSession()
  // The study link opened again in the same tab while an attempt is still open: that attempt is over. The record has no "abandoned" outcome, so it
  // ends as "exited"; unlike Exit, it has no "exit" step, which is how the two can be told apart.
  const open = read()
  if (open && loadOnboardingRecord().attempts.some(a => a.id === open && !a.outcome)) finishAttempt(open, "exited")
  const id = startAttempt("start", FLOW_VERSION, session.id)
  write(id); markWelcomeSeen()
  return id
}
export function recordEvent(step: string, event: OnboardingEvent): void { const id = read(); if (id) recordStep(id, step, event) }
/** Start workspace or Keep current demo on the Confirm screen: setup is over, whatever the attempt's final outcome turns out to be. */
export function recordSetup(choice: SetupChoice): void { const id = read(); if (id) markSetup(id, choice) }
export function endWalkthrough(outcome: "completed" | "exited"): void { const id = read(); if (id) { finishAttempt(id, outcome); write(null) } }
/** Forget the current attempt without recording anything more: the "Test Onboarding Page" buttons use it, so testing never adds to the research record. */
export function forgetWalkthrough(): void { write(null) }
