import type { Cheer, CheerBook, CheerCard, CheerPoints, DemoState, Notice, Person } from "./types"
import { ALLOWANCE_LEAD, ALLOWANCE_OFFICER, CHEER_CARDS, CHEER_POINTS, MAX_RECIPIENTS, NOTE_MAX, NOTE_MIN, WEEKLY_LINE_LAST_WEEKDAY } from "./cheerRules"
import { isOfficer } from "./permissions"
import { TERMS } from "../engine/calendar"
import { addDays, fromISO } from "../lib/dates"
import { nextCounter } from "../lib/ids"
import { deliveredWithDetails } from "../lib/activityQuery"

/**
 * Cheers model (R1, docs/feedback-fix/CHEERS_R1_CONTRACT.md §2). Every exported name and signature here is frozen; the interface
 * agent builds against them. Dates come only from the demo clock (`state.today`). A cheer is visible to its sender and recipients
 * only, and its note never leaves this module except to the people in it (no notice, activity fact or log entry carries it).
 */
export type CheerAction =
  | { kind: "send"; toIds: string[]; points: CheerPoints; note: string; nodeId?: string; card: CheerCard; email?: boolean }
  | { kind: "withdraw"; id: string }
  | { kind: "markSeen"; ids: string[] }
  | { kind: "dismissWeeklyLine" }

const EMPTY: CheerBook = { cheers: [] }
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const ID_MAX = 64

const personOf = (s: DemoState, id: string) => s.people.find(p => p.id === id)
const firstName = (p: Person | undefined) => p?.name.trim().split(/\s+/)[0] || "A teammate"
const live = (c: Cheer) => !c.withdrawnOn
const cost = (c: Pick<Cheer, "points" | "toIds">) => c.points * c.toIds.length
const byName = (a: Person, b: Person) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)
/** Unique, non-empty strings, in first-seen order. */
const uniqueIds = (v: unknown): string[] => Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string" && x.length > 0))] : []

/** Monday and Sunday of the demo week that contains `day`. */
const weekOf = (day: string) => {
  const monday = addDays(day, -((fromISO(day).getDay() + 6) % 7))
  return { monday, sunday: addDays(monday, 6) }
}
/** "This term": the term containing today, else the latest that ended before it, else everything. */
const termOf = (today: string): { from: string; to: string } => {
  const current = TERMS.find(t => today >= t.from && today <= t.to)
  if (current) return current
  const past = TERMS.filter(t => t.to < today).sort((a, b) => a.to.localeCompare(b.to)).at(-1)
  return past ?? { from: "0000-01-01", to: "9999-12-31" }
}
/** The president or vice president who currently holds that role. */
const isLead = (s: DemoState, personId: string) => {
  const person = personOf(s, personId)
  if (!person || !isOfficer(person)) return false
  const role = s.roles.find(r => r.id === person.roleId)
  return role?.holderId === person.id && (role.fn === "president" || role.fn === "vice_president")
}

export const cheersOf = (s: DemoState): CheerBook => s.cheers && Array.isArray(s.cheers.cheers) ? s.cheers : EMPTY

/** Cheers the person sent or received, not withdrawn, newest first. Nobody else's cheers are ever returned. */
export const visibleCheers = (s: DemoState, personId: string): Cheer[] =>
  cheersOf(s).cheers.map((c, i) => ({ c, i }))
    .filter(({ c }) => live(c) && (c.fromId === personId || c.toIds.includes(personId)))
    .sort((a, b) => b.c.on.localeCompare(a.c.on) || b.i - a.i).map(({ c }) => c)

export const allowanceOf = (s: DemoState, personId: string): { total: number; used: number; left: number } => {
  const total = isLead(s, personId) ? ALLOWANCE_LEAD : ALLOWANCE_OFFICER
  const { monday, sunday } = weekOf(s.today)
  const used = cheersOf(s).cheers.filter(c => live(c) && c.fromId === personId && c.on >= monday && c.on <= sunday).reduce((n, c) => n + cost(c), 0)
  return { total, used, left: Math.max(0, total - used) }
}

const inTerm = (s: DemoState) => { const t = termOf(s.today); return (c: Cheer) => live(c) && c.on >= t.from && c.on <= t.to }
export const receivedThisTerm = (s: DemoState, personId: string): number =>
  cheersOf(s).cheers.filter(inTerm(s)).filter(c => c.toIds.includes(personId)).reduce((n, c) => n + c.points, 0)
export const givenThisTerm = (s: DemoState, personId: string): number =>
  cheersOf(s).cheers.filter(inTerm(s)).filter(c => c.fromId === personId).reduce((n, c) => n + cost(c), 0)

/** Received cheers the person has not seen yet, oldest first. */
export const unseenFor = (s: DemoState, personId: string): Cheer[] =>
  cheersOf(s).cheers.map((c, i) => ({ c, i }))
    .filter(({ c }) => live(c) && c.toIds.includes(personId) && !c.seenBy.includes(personId))
    .sort((a, b) => a.c.on.localeCompare(b.c.on) || a.i - b.i).map(({ c }) => c)

/** Current officers send; incoming officers only receive; former officers do neither. */
export const canSendCheers = (s: DemoState, personId: string): boolean => { const p = personOf(s, personId); return !!p && isOfficer(p) }
export const canReceiveCheers = (s: DemoState, personId: string): boolean => { const p = personOf(s, personId); return !!p && !p.leftOn }

/** People the sender may cheer, in display order. */
export const cheerRecipients = (s: DemoState, fromId: string): Person[] =>
  s.people.filter(p => p.id !== fromId && canReceiveCheers(s, p.id)).sort(byName)

/** Why a send would be refused (shown under the form), or null when it is allowed. */
export const validateCheer = (s: DemoState, fromId: string, input: Extract<CheerAction, { kind: "send" }>): string | null => {
  if (!canSendCheers(s, fromId)) return "Only current officers can give points."
  const toIds = uniqueIds(input.toIds)
  if (!toIds.length) return "Choose who to cheer."
  if (toIds.length > MAX_RECIPIENTS) return `Up to ${MAX_RECIPIENTS} people at a time.`
  if (toIds.includes(fromId)) return "You can't cheer yourself."
  if (!toIds.every(id => canReceiveCheers(s, id))) return "Choose people on the team."
  if (!CHEER_POINTS.includes(input.points)) return "Choose 10, 25, 50 or 100 points."
  if (!CHEER_CARDS.includes(input.card)) return "Choose a card style."
  if (input.nodeId && !s.nodes.some(n => n.id === input.nodeId)) return "Choose a task from this club."
  const note = typeof input.note === "string" ? input.note.trim() : ""
  if (note.length < NOTE_MIN) return `Write at least ${NOTE_MIN} characters.`
  if (note.length > NOTE_MAX) return `Keep it under ${NOTE_MAX} characters.`
  const { left } = allowanceOf(s, fromId)
  if (input.points * toIds.length > left) return left ? `Only ${left} points left this week.` : "No points left this week."
  return null
}

/** The president/VP weekly line, or null when it should not show. */
export const weeklyLine = (s: DemoState, viewerId: string): { personIds: string[] } | null => {
  if (!isLead(s, viewerId)) return null
  const weekday = (fromISO(s.today).getDay() + 6) % 7 + 1 // 1 = Monday … 7 = Sunday
  if (weekday > WEEKLY_LINE_LAST_WEEKDAY) return null
  const { monday, sunday } = weekOf(s.today)
  if (cheersOf(s).weeklyLineDismissed?.[viewerId] === monday) return null
  const personIds = s.people
    .filter(p => p.id !== viewerId && canReceiveCheers(s, p.id) && deliveredWithDetails(s, p.id, monday, sunday).length > 0)
    .sort(byName).slice(0, MAX_RECIPIENTS).map(p => p.id)
  return personIds.length ? { personIds } : null
}

/** The "Say thanks?" prompt on a finished task, or null. */
export const thankPromptFor = (s: DemoState, viewerId: string, nodeId: string): { ownerId: string } | null => {
  const n = s.nodes.find(x => x.id === nodeId)
  if (!n || n.status !== "done" || !n.ownerId || n.ownerId === viewerId) return null
  return canReceiveCheers(s, n.ownerId) && canSendCheers(s, viewerId) ? { ownerId: n.ownerId } : null
}

/** A cheer in its canonical field order, so saving and sanitizing produce the same JSON. */
const shape = (c: Cheer): Cheer => ({
  id: c.id, fromId: c.fromId, toIds: c.toIds, points: c.points, note: c.note,
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
      const cheer = shape({
        id, fromId: actorId, toIds: uniqueIds(action.toIds), points: action.points, note: action.note.trim(),
        nodeId: action.nodeId || undefined, card: action.card, on: state.today, email: action.email === true, seenBy: [],
      })
      const notices = [...state.notifications]
      for (const recipientId of cheer.toIds) {
        const noticeId = `cheer:${id}:${recipientId}`
        if (!notices.some(n => n.id === noticeId))
          notices.push({ id: noticeId, recipientId, nodeId: cheer.nodeId ?? "", kind: "cheer", text: `${firstName(sender)} sent you ${cheer.points} points.`, createdOn: state.today, read: false, cheerId: id })
      }
      return { ...withBook(state, { ...book, cheers: [...book.cheers, cheer] }), notifications: notices }
    }
    case "withdraw": {
      const target = book.cheers.find(c => c.id === action.id)
      if (!target || target.fromId !== actorId || !live(target) || target.on !== state.today) return state
      const cheers = book.cheers.map(c => c === target ? shape({ ...c, withdrawnOn: state.today }) : c)
      return { ...withBook(state, { ...book, cheers }), notifications: readNotices(state.notifications, new Set([target.id])) }
    }
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

/** One saved cheer cleaned, or null when it cannot be kept. */
function cleanCheer(raw: unknown, people: Set<string>): Cheer | null {
  if (!raw || typeof raw !== "object") return null
  const c = raw as Record<string, unknown>
  if (typeof c.id !== "string" || !c.id || c.id.length > ID_MAX) return null
  if (typeof c.fromId !== "string" || !people.has(c.fromId)) return null
  const toIds = uniqueIds(c.toIds).filter(id => id !== c.fromId && people.has(id))
  if (!toIds.length || toIds.length > MAX_RECIPIENTS) return null
  if (!CHEER_POINTS.includes(c.points as CheerPoints) || !CHEER_CARDS.includes(c.card as CheerCard)) return null
  if (typeof c.note !== "string") return null
  const note = c.note.trim()
  if (note.length < NOTE_MIN || note.length > NOTE_MAX) return null
  if (typeof c.on !== "string" || !ISO_DATE.test(c.on)) return null
  const nodeId = typeof c.nodeId === "string" && c.nodeId.length <= ID_MAX ? c.nodeId : undefined
  const withdrawnOn = typeof c.withdrawnOn === "string" && ISO_DATE.test(c.withdrawnOn) ? c.withdrawnOn : undefined
  return shape({
    id: c.id, fromId: c.fromId, toIds, points: c.points as CheerPoints, note, nodeId, card: c.card as CheerCard, on: c.on,
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
