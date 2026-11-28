import type { Cheer, CheerBook, CheerCard, CheerPoints, DemoState, Notice, Person } from "./types"
import { ALLOWANCE_LEAD, ALLOWANCE_OFFICER, CHEER_CARDS, LEGACY_POINTS, MAX_CC, MAX_RECIPIENTS, NOTE_MAX, NOTE_MIN, POINTS_MIN, POINTS_SAVED_MAX } from "./cheerRules"
import { isOfficer } from "./permissions"
import { addDays, fromISO } from "../lib/dates"
import { nextCounter } from "../lib/ids"

/**
 * Cheers model (R1, docs/feedback-fix/CHEERS_R1_CONTRACT.md §2, amended by §8 for R1.1). Dates come only from the demo clock
 * (`state.today`). A cheer is visible to its sender, its recipients and the officers the sender chose to let know (`ccIds`), and
 * its note never leaves this module except to those people: the notice to each let-know person carries it (the sender chose to
 * share it with them); no recipient notice, activity fact or log entry does. Since R1.1 every cheer is also emailed to its
 * recipients (the demo records `email: true` and sends nothing), and a cheer can no longer be withdrawn.
 *
 * This module is in the entry chunk (the store's reducer and loading, the card host and the inbox use it). The read helpers only
 * the Cheers screens use (`weeklyLine`, `thankPromptFor`, `cheerRecipients`, `receivedThisTerm`, `givenThisTerm`) are in
 * `cheerViews.ts`, which only those lazily loaded screens import. They are deliberately not re-exported here: that would put
 * them back in the entry chunk.
 */
export type CheerAction =
  | { kind: "send"; toIds: string[]; points: CheerPoints; note: string; nodeId?: string; card: CheerCard; ccIds?: string[] }
  /** Refused since R1.1 (§8.7): kept in the type so an older caller or a replayed log still reaches the reducer and is turned down. */
  | { kind: "withdraw"; id: string }
  | { kind: "markSeen"; ids: string[] }
  | { kind: "dismissWeeklyLine" }

const EMPTY: CheerBook = { cheers: [] }
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const ID_MAX = 64

const personOf = (s: DemoState, id: string) => s.people.find(p => p.id === id)
const firstName = (p: Person | undefined) => p?.name.trim().split(/\s+/)[0] || "A teammate"
const joinNames = (names: string[]) => names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`
/** Not withdrawn. Also used by cheerViews.ts. */
export const live = (c: Cheer) => !c.withdrawnOn
/** What a cheer cost its sender: points × recipients. Also used by cheerViews.ts. */
export const cost = (c: Pick<Cheer, "points" | "toIds">) => c.points * c.toIds.length
/** Unique, non-empty strings, in first-seen order. */
const uniqueIds = (v: unknown): string[] => Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string" && x.length > 0))] : []

/** Monday and Sunday of the demo week that contains `day`. Also used by cheerViews.ts. */
export const weekOf = (day: string) => {
  const monday = addDays(day, -((fromISO(day).getDay() + 6) % 7))
  return { monday, sunday: addDays(monday, 6) }
}
/** The president or vice president who currently holds that role. Also used by cheerViews.ts and the weekly line's first check. */
export const isLead = (s: DemoState, personId: string) => {
  const person = personOf(s, personId)
  if (!person || !isOfficer(person)) return false
  const role = s.roles.find(r => r.id === person.roleId)
  return role?.holderId === person.id && (role.fn === "president" || role.fn === "vice_president")
}

/**
 * Whether a saved entry has every field the read helpers and the reducer touch. Loading, reset and import clean cheers
 * (`withSanitizedCheers`), but a save the migration could not upgrade is shown as it is, so a `null` or half-written entry
 * must not throw anywhere: such entries are ignored, and the next change to the cheers drops them.
 */
const usable = (c: unknown): c is Cheer => {
  if (!c || typeof c !== "object") return false
  const x = c as Record<string, unknown>
  return typeof x.id === "string" && typeof x.fromId === "string" && Array.isArray(x.toIds) && Array.isArray(x.seenBy)
    && typeof x.on === "string" && typeof x.points === "number" && typeof x.note === "string"
}
/** The usable view of each unsanitized book, so one saved book always reads as the same object. */
const usableViews = new WeakMap<CheerBook, CheerBook>()

/** Every saved cheer (everyone's: callers filter by viewer), with any unusable entry left out (see `usable`). */
export const cheersOf = (s: DemoState): CheerBook => {
  const book = s.cheers
  if (!book || typeof book !== "object" || !Array.isArray(book.cheers)) return EMPTY
  const entries: unknown[] = book.cheers
  if (entries.every(usable)) return book
  let view = usableViews.get(book)
  if (!view) { view = { ...book, cheers: entries.filter(usable) }; usableViews.set(book, view) }
  return view
}

/** Whether the person is in the cheer: its sender, a recipient, or someone the sender let know. Also used by the screens. */
export const isInCheer = (c: Cheer, personId: string): boolean =>
  c.fromId === personId || c.toIds.includes(personId) || (Array.isArray(c.ccIds) && c.ccIds.includes(personId))
/** Cheers the person sent, received or was let know of, not withdrawn, newest first. Nobody else's cheers are ever returned. */
export const visibleCheers = (s: DemoState, personId: string): Cheer[] =>
  cheersOf(s).cheers.map((c, i) => ({ c, i }))
    .filter(({ c }) => live(c) && isInCheer(c, personId))
    .sort((a, b) => b.c.on.localeCompare(a.c.on) || b.i - a.i).map(({ c }) => c)

export const allowanceOf = (s: DemoState, personId: string): { total: number; used: number; left: number } => {
  const total = isLead(s, personId) ? ALLOWANCE_LEAD : ALLOWANCE_OFFICER
  const { monday, sunday } = weekOf(s.today)
  const used = cheersOf(s).cheers.filter(c => live(c) && c.fromId === personId && c.on >= monday && c.on <= sunday).reduce((n, c) => n + cost(c), 0)
  return { total, used, left: Math.max(0, total - used) }
}

/** Received cheers the person has not seen yet, oldest first. */
export const unseenFor = (s: DemoState, personId: string): Cheer[] =>
  cheersOf(s).cheers.map((c, i) => ({ c, i }))
    .filter(({ c }) => live(c) && c.toIds.includes(personId) && !c.seenBy.includes(personId))
    .sort((a, b) => a.c.on.localeCompare(b.c.on) || a.i - b.i).map(({ c }) => c)

/** Current officers send; incoming officers only receive; former officers do neither. */
export const canSendCheers = (s: DemoState, personId: string): boolean => { const p = personOf(s, personId); return !!p && isOfficer(p) }
export const canReceiveCheers = (s: DemoState, personId: string): boolean => { const p = personOf(s, personId); return !!p && !p.leftOn }

/** Why a send would be refused (shown under the form), or null when it is allowed. */
export const validateCheer = (s: DemoState, fromId: string, input: Extract<CheerAction, { kind: "send" }>): string | null => {
  if (!canSendCheers(s, fromId)) return "Only current officers can give points."
  const toIds = uniqueIds(input.toIds)
  if (!toIds.length) return "Choose who to cheer."
  if (toIds.length > MAX_RECIPIENTS) return `Up to ${MAX_RECIPIENTS} people at a time.`
  if (toIds.includes(fromId)) return "You can't cheer yourself."
  if (!toIds.every(id => canReceiveCheers(s, id))) return "Choose people on the team."
  if (typeof input.points !== "number" || !Number.isInteger(input.points)) return "Enter whole points."
  if (input.points < POINTS_MIN) return `Give at least ${POINTS_MIN} points.`
  if (!CHEER_CARDS.includes(input.card)) return "Choose a trophy."
  const ccIds = uniqueIds(input.ccIds)
  if (ccIds.length > MAX_CC) return `Let up to ${MAX_CC} others know.`
  if (ccIds.some(id => id === fromId || toIds.includes(id))) return "They are already in this cheer."
  if (!ccIds.every(id => canSendCheers(s, id))) return "Let current officers know."
  if (input.nodeId && !s.nodes.some(n => n.id === input.nodeId)) return "Choose a task from this club."
  const note = typeof input.note === "string" ? input.note.trim() : ""
  if (note.length < NOTE_MIN) return `Write at least ${NOTE_MIN} characters.`
  if (note.length > NOTE_MAX) return `Keep it under ${NOTE_MAX} characters.`
  const { left } = allowanceOf(s, fromId)
  if (input.points * toIds.length > left) return left ? `Only ${left.toLocaleString("en-US")} points left this week.` : "No points left this week."
  return null
}

/** A cheer in its canonical field order, so saving and sanitizing produce the same JSON. */
const shape = (c: Cheer): Cheer => ({
  id: c.id, fromId: c.fromId, toIds: c.toIds,
  ...(c.ccIds?.length ? { ccIds: c.ccIds } : {}),
  points: c.points, note: c.note,
  ...(c.nodeId ? { nodeId: c.nodeId } : {}),
  card: c.card, on: c.on,
  ...(c.email ? { email: true } : {}),
  seenBy: c.seenBy,
  ...(c.withdrawnOn ? { withdrawnOn: c.withdrawnOn } : {}),
})
const withBook = (s: DemoState, book: CheerBook): DemoState => ({ ...s, cheers: book })
/** Marks the cheer's unread notices read (all of them, or only one recipient's). */
const readNotices = (notices: Notice[], cheerIds: Set<string>, recipientId?: string): Notice[] =>
  notices.some(n => !n.read && n.kind === "cheer" && !!n.cheerId && cheerIds.has(n.cheerId) && (!recipientId || n.recipientId === recipientId))
    ? notices.map(n => !n.read && n.kind === "cheer" && !!n.cheerId && cheerIds.has(n.cheerId) && (!recipientId || n.recipientId === recipientId) ? { ...n, read: true } : n)
    : notices

/** The reducer case. Returns `state` itself when the action is refused or changes nothing. */
export function changeCheers(state: DemoState, action: CheerAction, actorId: string): DemoState {
  if (!action || typeof action !== "object") return state
  const book = cheersOf(state)
  switch (action.kind) {
    case "send": {
      if (validateCheer(state, actorId, action)) return state
      const sender = personOf(state, actorId)
      const id = `ch-${nextCounter(book.cheers.map(c => c.id), /^ch-(\d+)$/)}`
      // Every cheer is emailed to its recipients (§8.8): the demo records that and sends nothing.
      const cheer = shape({
        id, fromId: actorId, toIds: uniqueIds(action.toIds), ccIds: uniqueIds(action.ccIds), points: action.points, note: action.note.trim(),
        nodeId: action.nodeId || undefined, card: action.card, on: state.today, email: true, seenBy: [],
      })
      const notices = [...state.notifications]
      const add = (n: Notice) => { if (!notices.some(x => x.id === n.id)) notices.push(n) }
      const base = { nodeId: cheer.nodeId ?? "", kind: "cheer" as const, createdOn: state.today, read: false, cheerId: id }
      // Recipients: who sent it and how many points, never the note (the card shows it).
      for (const recipientId of cheer.toIds) add({ ...base, id: `cheer:${id}:${recipientId}`, recipientId, text: `${firstName(sender)} sent you ${cheer.points} points.` })
      // People let know: the sender chose to share the note with them (§8.9).
      const names = joinNames(cheer.toIds.map(rid => firstName(personOf(state, rid))))
      for (const ccId of cheer.ccIds ?? []) add({ ...base, id: `cheer-cc:${id}:${ccId}`, recipientId: ccId, text: `${firstName(sender)} recognized ${names}: “${cheer.note}”` })
      return { ...withBook(state, { ...book, cheers: [...book.cheers, cheer] }), notifications: notices }
    }
    // No withdrawal since R1.1 (§8.7): a cheer is final. Cheers an R1 sender withdrew stay hidden and count for nobody.
    case "withdraw": return state
    case "markSeen": {
      const wanted = new Set(uniqueIds(action.ids))
      const seen = new Set<string>()
      const cheers = book.cheers.map(c => {
        if (!wanted.has(c.id) || !live(c) || !c.toIds.includes(actorId) || c.seenBy.includes(actorId)) return c
        seen.add(c.id)
        return shape({ ...c, seenBy: [...c.seenBy, actorId] })
      })
      if (!seen.size) return state
      return { ...withBook(state, { ...book, cheers }), notifications: readNotices(state.notifications, seen, actorId) }
    }
    case "dismissWeeklyLine": {
      if (!isLead(state, actorId)) return state
      const { monday } = weekOf(state.today)
      if (book.weeklyLineDismissed?.[actorId] === monday) return state
      return withBook(state, { ...book, weeklyLineDismissed: { ...book.weeklyLineDismissed, [actorId]: monday } })
    }
    default: return state
  }
}

/** Points a saved cheer may hold: an R1 value (10, 25, 50, 100) or a whole number from POINTS_MIN up to the import guard. */
const savedPoints = (v: unknown): v is CheerPoints =>
  typeof v === "number" && Number.isInteger(v) && (LEGACY_POINTS.includes(v) || (v >= POINTS_MIN && v <= POINTS_SAVED_MAX))

/** One saved cheer cleaned, or null when it cannot be kept. */
function cleanCheer(raw: unknown, people: Set<string>): Cheer | null {
  if (!raw || typeof raw !== "object") return null
  const c = raw as Record<string, unknown>
  if (typeof c.id !== "string" || !c.id || c.id.length > ID_MAX) return null
  if (typeof c.fromId !== "string" || !people.has(c.fromId)) return null
  const toIds = uniqueIds(c.toIds).filter(id => id !== c.fromId && people.has(id))
  if (!toIds.length || toIds.length > MAX_RECIPIENTS) return null
  if (!savedPoints(c.points) || !CHEER_CARDS.includes(c.card as CheerCard)) return null
  // People let know: known people outside the cheer, deduplicated, at most MAX_CC (extra ones lose sight of it, never gain it).
  const ccIds = uniqueIds(c.ccIds).filter(id => id !== c.fromId && !toIds.includes(id) && people.has(id)).slice(0, MAX_CC)
  if (typeof c.note !== "string") return null
  const note = c.note.trim()
  if (note.length < NOTE_MIN || note.length > NOTE_MAX) return null
  if (typeof c.on !== "string" || !ISO_DATE.test(c.on)) return null
  const nodeId = typeof c.nodeId === "string" && c.nodeId.length <= ID_MAX ? c.nodeId : undefined
  const withdrawnOn = typeof c.withdrawnOn === "string" && ISO_DATE.test(c.withdrawnOn) ? c.withdrawnOn : undefined
  return shape({
    id: c.id, fromId: c.fromId, toIds, ccIds, points: c.points as CheerPoints, note, nodeId, card: c.card as CheerCard, on: c.on,
    email: c.email === true, seenBy: uniqueIds(c.seenBy).filter(id => toIds.includes(id)), withdrawnOn,
  })
}

/** Clean the cheers of a loaded or imported state (drop malformed cheers, cap fields). Returns `s` itself when nothing changes. */
export function withSanitizedCheers(s: DemoState): DemoState {
  if (s.cheers === undefined) return s
  const raw = (s.cheers && typeof s.cheers === "object" ? s.cheers : {}) as Partial<Record<keyof CheerBook, unknown>>
  const people = new Set(Array.isArray(s.people) ? s.people.map(p => p?.id).filter((id): id is string => typeof id === "string") : [])
  const ids = new Set<string>()
  const cheers: Cheer[] = []
  for (const entry of Array.isArray(raw.cheers) ? raw.cheers : []) {
    const c = cleanCheer(entry, people)
    if (!c || ids.has(c.id)) continue
    ids.add(c.id)
    cheers.push(c)
  }
  const dismissed = raw.weeklyLineDismissed && typeof raw.weeklyLineDismissed === "object" && !Array.isArray(raw.weeklyLineDismissed)
    ? Object.fromEntries(Object.entries(raw.weeklyLineDismissed as Record<string, unknown>).filter(([id, on]) => people.has(id) && typeof on === "string" && ISO_DATE.test(on)))
    : undefined
  const book: CheerBook = { cheers, ...(dismissed && Object.keys(dismissed).length ? { weeklyLineDismissed: dismissed as Record<string, string> } : {}) }
  return JSON.stringify(book) === JSON.stringify(s.cheers) ? s : { ...s, cheers: book }
}
