/**
 * The study session (Phase 3, docs/PHASE3_DATA_DICTIONARY.md): one recorded walkthrough attempt and everything done after it, until the
 * next one begins. A session begins only where a recorded walkthrough begins (`beginWalkthrough`: the study link /#/start, /welcome/start,
 * Demo → Replay walkthrough), never from the Demo menu's Test buttons.
 *
 * Design: the header below lives in this browser only (its own localStorage key). When a session begins, the interaction log drops every
 * earlier entry (they belong to an earlier session, or an earlier person on this computer) and the header keeps only how many there were
 * (`previousEntriesCleared`), never their content. Every log entry written afterwards carries the session id, and the export keeps only
 * this session's entries and walkthrough attempts, so a stray older entry (another tab still open) can never slip into the file.
 * The id is random and says nothing about a person or a time.
 */
export interface StudySession {
  id: string
  /** Real time the session began, milliseconds since 1970. */
  startedAt: number
  /** Log entries deleted from this browser when the session began (count only). */
  previousEntriesCleared: number
}

export const SESSION_KEY = "platypus.v1.session"
let memory: StudySession | null = null
/** Saving failed (storage full or blocked): this tab keeps the session in memory. */
let memoryOnly = false
type Listener = (session: StudySession) => number | void
const listeners = new Set<Listener>()

function newId(): string {
  const bytes = new Uint8Array(8)
  try { globalThis.crypto.getRandomValues(bytes) } catch { for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256) }
  return `s-${Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("")}`
}

function valid(v: unknown): v is StudySession {
  const s = v as StudySession
  return !!s && typeof s === "object" && typeof s.id === "string" && /^s-[0-9a-f]{4,32}$/.test(s.id) && Number.isFinite(s.startedAt) && Number.isInteger(s.previousEntriesCleared) && s.previousEntriesCleared >= 0
}

function save(session: StudySession) {
  memory = session
  try { window.localStorage.setItem(SESSION_KEY, JSON.stringify(session)); memoryOnly = false } catch { memoryOnly = true /* the session lives in memory for this tab */ }
}

/** The session this browser is in, or null when no recorded walkthrough has begun here. */
export function currentSession(): StudySession | null {
  if (memoryOnly) return memory
  try {
    const raw = window.localStorage.getItem(SESSION_KEY)
    const parsed = raw ? JSON.parse(raw) as unknown : null
    return (memory = valid(parsed) ? parsed : null)
  } catch { return memory }
}

/**
 * Begin a new session. Listeners (the store) clear what belongs to earlier sessions and return how many log entries they removed;
 * the header records the total. Synchronous: when this returns, the log already belongs to the new session.
 */
export function beginSession(now = Date.now()): StudySession {
  const session: StudySession = { id: newId(), startedAt: now, previousEntriesCleared: 0 }
  memory = session
  for (const listener of listeners) { const n = listener(session); if (typeof n === "number" && n > 0) session.previousEntriesCleared += n }
  save(session)
  return session
}

/** More earlier entries were removed for this session after it began (a log loaded later still held some). */
export function noteCleared(id: string, n: number): void {
  const s = currentSession()
  if (!s || s.id !== id || !(n > 0)) return
  save({ ...s, previousEntriesCleared: s.previousEntriesCleared + n })
}

export function onSessionStart(listener: Listener): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** Forget the session (tests only). */
export function resetSessionForTests(): void {
  memory = null; memoryOnly = false
  try { window.localStorage.removeItem(SESSION_KEY) } catch { /* nothing */ }
}

/** Arizona time (America/Phoenix: UTC−7 all year, no daylight saving), e.g. "2026-11-07 10:46:40.337". Empty for a missing time. */
export function azTime(ms: number | null | undefined): string {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return ""
  return new Date(ms - 7 * 3600_000).toISOString().replace("T", " ").replace("Z", "")
}
