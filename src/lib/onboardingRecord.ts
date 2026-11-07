/** Browser-only evidence for the optional onboarding walkthrough. It never stores form values. */
export type OnboardingEvent = "enter" | "leave" | "back" | "skip" | "complete" | "exit"

export interface OnboardingStepRecord { step: string; event: OnboardingEvent; at: number }
export interface OnboardingAttempt {
  id: string
  entry: "start" | "explore"
  flowVersion: string
  replay: number
  startedAt: number
  finishedAt?: number
  outcome?: "completed" | "exited" | "explored"
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

export function startAttempt(entry: "start" | "explore", flowVersion: string): string {
  const record = loadOnboardingRecord()
  const replay = record.attempts.filter(a => a.entry === entry).length
  const id = `ob-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  record.attempts.push({ id, entry, flowVersion: String(flowVersion).slice(0, 40), replay, startedAt: Date.now(), steps: [] })
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
