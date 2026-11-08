import { attemptLastAt, pruneAttempts } from "./onboardingRecord"

/**
 * Study sessions (Phase 3, docs/PHASE3_DATA_DICTIONARY.md §1.1). A session begins where a recorded walkthrough begins (`beginWalkthrough`:
 * the study link /#/start, /welcome/start, Demo → Replay walkthrough), never from the Demo menu's Test buttons.
 *
 * Design: when a session begins, only data from an earlier sitting is removed from this browser: log entries and walkthrough attempts that are
 * more than 6 hours old (unless they belong to a session that began within those 6 hours). Anything from the last 6 hours stays, so opening the
 * study link again in the middle of a sitting loses nothing: the export then simply holds two sessions. Only counts of what was removed are kept.
 * Every log entry written during a session carries its id. The ids are random and say nothing about a person or a time.
 * The list of sessions (the "book") lives in this browser only, under its own localStorage key.
 */
export interface StudySession {
  id: string
  /** Real time the session began, milliseconds since 1970. */
  startedAt: number
  /** Log entries removed from this browser when the session began, because they were older than 6 hours (count only). */
  previousEntriesCleared: number
  /** Walkthrough attempts removed at the same moment, for the same reason (count only). */
  previousAttemptsCleared: number
}
export interface Book {
  /** Oldest first; the last one is the current session. */
  sessions: StudySession[]
  /** How many entries of the log's current numbering were removed by the 6-hour clean-up, so the export can tell them apart from the 2,000-entry cap. */
  seqCleared: number
}

export const SESSION_KEY = "platypus.v1.session"
/** Data older than this, outside a session that began within it, belongs to an earlier sitting. */
export const SITTING_MS = 6 * 3600_000
const SESSION_LIMIT = 20
const emptyBook = (): Book => ({ sessions: [], seqCleared: 0 })
let memory: Book = emptyBook()
/** Saving failed (storage full or blocked): this tab keeps the book in memory. */
let memoryOnly = false

/** What a session start keeps: (time, session id) → true when it is from the last 6 hours or from a session that began within them. */
export type Keep = (at: number, sessionId?: string | null) => boolean
type Listener = (session: StudySession, keep: Keep) => { cleared: number; kept: number } | void
const listeners = new Set<Listener>()

function newId(): string {
  const bytes = new Uint8Array(8)
  try { globalThis.crypto.getRandomValues(bytes) } catch { for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256) }
  return `s-${Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("")}`
}

const count = (n: unknown) => (Number.isInteger(n) && (n as number) >= 0 ? (n as number) : 0)
function validSession(v: unknown): v is StudySession {
  const s = v as StudySession
  return !!s && typeof s === "object" && typeof s.id === "string" && /^s-[0-9a-f]{4,32}$/.test(s.id) && Number.isFinite(s.startedAt)
}

export function loadBook(): Book {
  if (memoryOnly) return memory
  try {
    const raw = window.localStorage.getItem(SESSION_KEY)
    const parsed = raw ? JSON.parse(raw) as Partial<Book> : null
    if (!parsed || !Array.isArray(parsed.sessions)) return (memory = emptyBook())
    const sessions = parsed.sessions.filter(validSession).map(s => ({ id: s.id, startedAt: s.startedAt, previousEntriesCleared: count(s.previousEntriesCleared), previousAttemptsCleared: count(s.previousAttemptsCleared) }))
    return (memory = { sessions: sessions.slice(-SESSION_LIMIT), seqCleared: count(parsed.seqCleared) })
  } catch { return memory }
}

function save(book: Book) {
  memory = book
  try { window.localStorage.setItem(SESSION_KEY, JSON.stringify(book)); memoryOnly = false } catch { memoryOnly = true }
}

/** The session this browser is in (the latest one), or null when no recorded walkthrough has begun here. */
export function currentSession(): StudySession | null {
  const { sessions } = loadBook()
  return sessions[sessions.length - 1] ?? null
}

/** The keep rule as it stands at time `now`, given the sessions known then. */
export function keeper(sessions: StudySession[], now: number): Keep {
  const cutoff = now - SITTING_MS
  const recent = new Set(sessions.filter(s => s.startedAt >= cutoff).map(s => s.id))
  return (at, sessionId) => at >= cutoff || (!!sessionId && recent.has(sessionId))
}

/**
 * Begin a new session. Listeners (the store) remove log entries from an earlier sitting and say how many they removed and kept;
 * walkthrough attempts from an earlier sitting go too. Synchronous: when this returns, new entries belong to the new session.
 */
export function beginSession(now = Date.now()): StudySession {
  const book = loadBook()
  const keep = keeper(book.sessions, now)
  const session: StudySession = { id: newId(), startedAt: now, previousEntriesCleared: 0, previousAttemptsCleared: 0 }
  let heard = false, kept = 0
  for (const listener of listeners) {
    const r = listener(session, keep)
    if (r) { heard = true; session.previousEntriesCleared += r.cleared; kept += r.kept }
  }
  session.previousAttemptsCleared = pruneAttempts(a => keep(attemptLastAt(a), a.sessionId))
  // An emptied log starts numbering again at 1; otherwise the removed entries were the oldest numbers of the same numbering.
  const seqCleared = !heard ? book.seqCleared : kept > 0 ? book.seqCleared + session.previousEntriesCleared : 0
  save({ sessions: [...book.sessions, session].slice(-SESSION_LIMIT), seqCleared })
  return session
}

export function onSessionStart(listener: Listener): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** Forget every session (tests only). */
export function resetSessionForTests(): void {
  memory = emptyBook(); memoryOnly = false
  try { window.localStorage.removeItem(SESSION_KEY) } catch { /* nothing */ }
}

/** Arizona time (America/Phoenix: UTC−7 all year, no daylight saving), e.g. "2026-11-07 10:46:40.337". Empty for a missing time. */
export function azTime(ms: number | null | undefined): string {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return ""
  return new Date(ms - 7 * 3600_000).toISOString().replace("T", " ").replace("Z", "")
}
