import type { LogEntry, ReminderMode } from "../data/types"
import { isReminderMode, REMINDER_MODES, reminderModeTestId } from "../data/reminderMode"

/** Browser-only evidence for the optional onboarding walkthrough. It never stores form values. */
export type OnboardingEvent = "enter" | "leave" | "back" | "skip" | "complete" | "exit"

export interface OnboardingStepRecord { step: string; event: OnboardingEvent; at: number }
/** What the president chose on the Confirm screen. Either one ends setup; the attempt may still go on to the officer preview. */
export type SetupChoice = "start-workspace" | "keep-demo"
export interface OnboardingAttempt {
  id: string
  entry: "start" | "explore"
  flowVersion: string
  replay: number
  startedAt: number
  finishedAt?: number
  /** How the whole attempt ended. "exited" after setup means the person left later (e.g. Exit in the officer preview), not that setup was unfinished: see `setupCompletedAt`. */
  outcome?: "completed" | "exited" | "explored"
  /** The study session (src/lib/studySession.ts) the attempt belongs to; missing for attempts recorded before sessions existed or outside one. */
  sessionId?: string
  /** Real time Start workspace or Keep current demo was pressed (the first time in this attempt), and which one. */
  setupCompletedAt?: number
  setupChoice?: SetupChoice
  steps: OnboardingStepRecord[]
}
export interface OnboardingRecord { attempts: OnboardingAttempt[] }

const KEY = "platypus.v1.onboarding"
const LIMIT = 40
const STEP_LIMIT = 200
let memorySeen = false
let memoryRearmed = false

const storage = () => window.localStorage
const empty = (): OnboardingRecord => ({ attempts: [] })

export function loadOnboardingRecord(): OnboardingRecord {
  try {
    const raw = storage().getItem(KEY)
    if (!raw) return empty()
    const parsed = JSON.parse(raw) as OnboardingRecord
    if (!parsed || !Array.isArray(parsed.attempts)) return empty()
    return { attempts: parsed.attempts.filter(a => a && typeof a.id === "string" && (a.entry === "start" || a.entry === "explore") && typeof a.flowVersion === "string" && Array.isArray(a.steps)).slice(-LIMIT) }
  } catch { return empty() }
}

function save(record: OnboardingRecord) {
  try { storage().setItem(KEY, JSON.stringify({ attempts: record.attempts.slice(-LIMIT) })) } catch { /* private/blocked storage: memory fallback still works */ }
}

export function hasSeenWelcome(): boolean {
  if (memorySeen) return true
  try { return storage().getItem(`${KEY}.seen`) === "1" } catch { return false }
}

export function markWelcomeSeen(): void {
  memorySeen = true; memoryRearmed = false
  try { storage().setItem(`${KEY}.seen`, "1"); storage().removeItem(`${KEY}.rearmed`) } catch { /* session-only */ }
}

/** Reset demo was used since the welcome page was last seen. Reset writes the sample club straight back, so "no saved data" alone cannot tell a first visit. */
export function isRearmed(): boolean {
  if (memoryRearmed) return true
  try { return storage().getItem(`${KEY}.rearmed`) === "1" } catch { return false }
}

/** Reset demo deliberately re-arms the invitation without deleting participant evidence. */
export function rearm(): void {
  memorySeen = false; memoryRearmed = true
  try { storage().removeItem(`${KEY}.seen`); storage().setItem(`${KEY}.rearmed`, "1") } catch { /* session-only */ }
}

export function startAttempt(entry: "start" | "explore", flowVersion: string, sessionId?: string | null): string {
  const record = loadOnboardingRecord()
  const replay = record.attempts.filter(a => a.entry === entry).length
  const id = `ob-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  record.attempts.push({ id, entry, flowVersion: String(flowVersion).slice(0, 40), replay, startedAt: Date.now(), ...(sessionId ? { sessionId: String(sessionId).slice(0, 40) } : {}), steps: [] })
  save(record)
  return id
}

export function recordStep(attemptId: string, step: string, event: OnboardingEvent): void {
  const record = loadOnboardingRecord()
  const attempt = record.attempts.find(a => a.id === attemptId)
  if (!attempt || !["enter", "leave", "back", "skip", "complete", "exit"].includes(event)) return
  attempt.steps.push({ step: String(step).slice(0, 80), event, at: Date.now() })
  if (attempt.steps.length > STEP_LIMIT) attempt.steps.splice(0, attempt.steps.length - STEP_LIMIT)
  save(record)
}

export function finishAttempt(attemptId: string, outcome: "completed" | "exited" | "explored"): void {
  const record = loadOnboardingRecord()
  const attempt = record.attempts.find(a => a.id === attemptId)
  if (!attempt) return
  attempt.finishedAt = Date.now()
  attempt.outcome = outcome
  save(record)
}

/** Start workspace or Keep current demo was pressed. Only the first press counts (a double click, or Back and a second press, keeps the first). */
export function markSetup(attemptId: string, choice: SetupChoice): void {
  const record = loadOnboardingRecord()
  const attempt = record.attempts.find(a => a.id === attemptId)
  if (!attempt || attempt.setupCompletedAt !== undefined || (choice !== "start-workspace" && choice !== "keep-demo")) return
  attempt.setupCompletedAt = Date.now()
  attempt.setupChoice = choice
  save(record)
}

/**
 * Whether the president planned a first event or pressed Skip for now, read from the step events only (nothing typed):
 * the last time the First event screen was left forward (before setup ended, when it did), was that a Skip? null when it never was.
 */
export function firstEventChoice(attempt: OnboardingAttempt | undefined, step = "founder.first-event"): "planned" | "skipped" | null {
  if (!attempt) return null
  const until = attempt.setupCompletedAt ?? Infinity
  const own = attempt.steps.filter(s => s.step === step && s.at <= until)
  for (let i = own.length - 1; i >= 0; i--) if (own[i].event === "leave") return own[i - 1]?.event === "skip" ? "skipped" : "planned"
  return null
}

export type ReminderModeChoice = ReminderMode | "skipped"
export const REMINDERS_STEP = "founder.reminders"
export const REMINDERS_ROUTE = "/welcome/founder/reminders"

/**
 * The Reminders screen's answer (P3-H), from what is already recorded, nothing new: the step events say whether the screen was last left
 * forward with Skip for now ("skipped") or Continue; for Continue, the last option ticked on that screen before leaving it is read from the
 * interaction log (`ui.change` with the radio's data-testid, in the attempt's session). `stored` (org.settings.reminderMode, when this attempt
 * pressed Start workspace) is used only if the log no longer has that tick. null: the screen was never left forward (or the answer cannot be read).
 * The screen exists only in ob-4 attempts. ob-5 (S2, 2026-11-22) removed it, so an ob-5 attempt has no founder.reminders step and this is
 * always null for it, even though its club now stores the default reminderMode: that default was never the president's answer.
 * This reader stays so files with older attempts still export their answer.
 */
export function reminderModeChoice(attempt: OnboardingAttempt | undefined, log: readonly LogEntry[], stored?: unknown): ReminderModeChoice | null {
  if (!attempt) return null
  const until = attempt.setupCompletedAt ?? Infinity
  const own = attempt.steps.filter(s => s.step === REMINDERS_STEP && s.at <= until)
  let i = own.length - 1
  while (i >= 0 && own[i].event !== "leave") i--
  if (i < 0) return null
  if (own[i - 1]?.event === "skip") return "skipped"
  const leftAt = own[i].at
  for (let j = log.length - 1; j >= 0; j--) {
    const e = log[j]
    if (e.type !== "ui.change" || e.at > leftAt || e.at < attempt.startedAt || (attempt.sessionId && e.session !== attempt.sessionId)) continue
    const p = (e.payload ?? {}) as Record<string, unknown>
    if (p.route !== REMINDERS_ROUTE || p.checked !== true) continue
    const mode = REMINDER_MODES.find(m => reminderModeTestId(m) === p.testid)
    if (mode) return mode
  }
  return isReminderMode(stored) ? stored : null
}

/** The attempt's latest moment (its start, a step, or its end): what the 6-hour session clean-up compares. */
export function attemptLastAt(a: OnboardingAttempt): number {
  return Math.max(a.startedAt, a.finishedAt ?? 0, a.setupCompletedAt ?? 0, ...a.steps.map(s => s.at))
}

/** Remove the attempts `keep` rejects (a new study session removes those from an earlier sitting). Returns how many went. */
export function pruneAttempts(keep: (a: OnboardingAttempt) => boolean): number {
  const record = loadOnboardingRecord()
  const kept = record.attempts.filter(keep)
  if (kept.length !== record.attempts.length) save({ attempts: kept })
  return record.attempts.length - kept.length
}
