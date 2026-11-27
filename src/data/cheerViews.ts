import type { Cheer, DemoState, Person } from "./types"
import { MAX_RECIPIENTS, WEEKLY_LINE_LAST_WEEKDAY } from "./cheerRules"
import { canReceiveCheers, canSendCheers, cheersOf, cost, isLead, live, weekOf } from "./cheers"
import { TERMS } from "../engine/calendar"
import { fromISO } from "../lib/dates"
import { deliveredWithDetails } from "../lib/activityQuery"

/**
 * Cheers read helpers that only the Cheers screens use (R1, docs/feedback-fix/CHEERS_R1_CONTRACT.md §2), kept apart from
 * `cheers.ts` so they load with those lazily loaded screens and not with the app's first screen. The rules are the contract's;
 * names and signatures are the ones frozen in stage A, only their module changed (review fix, 2026-11-26).
 */

const byName = (a: Person, b: Person) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)

/** "This term": the term containing today, else the latest that ended before it, else everything. */
const termOf = (today: string): { from: string; to: string } => {
  const current = TERMS.find(t => today >= t.from && today <= t.to)
  if (current) return current
  const past = TERMS.filter(t => t.to < today).sort((a, b) => a.to.localeCompare(b.to)).at(-1)
  return past ?? { from: "0000-01-01", to: "9999-12-31" }
}
const inTerm = (s: DemoState) => { const t = termOf(s.today); return (c: Cheer) => live(c) && c.on >= t.from && c.on <= t.to }
export const receivedThisTerm = (s: DemoState, personId: string): number =>
  cheersOf(s).cheers.filter(inTerm(s)).filter(c => c.toIds.includes(personId)).reduce((n, c) => n + c.points, 0)
export const givenThisTerm = (s: DemoState, personId: string): number =>
  cheersOf(s).cheers.filter(inTerm(s)).filter(c => c.fromId === personId).reduce((n, c) => n + cost(c), 0)

/**
 * "Let others know too (optional)" (R1.1, §8.9): current officers other than the sender and the recipients. `suggested` comes
 * first: the president, the vice presidents, then each recipient's team lead (the holder of the role their role reports to),
 * in that order; `others` are the rest, in name order.
 */
export const ccCandidates = (s: DemoState, fromId: string, toIds: string[]): { suggested: Person[]; others: Person[] } => {
  const open = s.people.filter(p => p.id !== fromId && !toIds.includes(p.id) && canSendCheers(s, p.id))
  const holderOf = (roleId: string | null | undefined) => { const r = roleId ? s.roles.find(x => x.id === roleId) : undefined; return r?.holderId ?? null }
  const roleOf = (p: Person) => s.roles.find(r => r.id === p.roleId && r.holderId === p.id)
  const order: string[] = []
  const push = (id: string | null) => { if (id && !order.includes(id) && open.some(p => p.id === id)) order.push(id) }
  for (const fn of ["president", "vice_president"] as const) open.filter(p => roleOf(p)?.fn === fn).sort(byName).forEach(p => push(p.id))
  for (const id of toIds) { const p = s.people.find(x => x.id === id); push(p ? holderOf(roleOf(p)?.reportsToId) : null) }
  const suggested = order.map(id => open.find(p => p.id === id)!)
  return { suggested, others: open.filter(p => !order.includes(p.id)).sort(byName) }
}

/** People the sender may cheer, in display order. */
export const cheerRecipients = (s: DemoState, fromId: string): Person[] =>
  s.people.filter(p => p.id !== fromId && canReceiveCheers(s, p.id)).sort(byName)

/** Whether `today` is a weekly-line day (Monday to WEEKLY_LINE_LAST_WEEKDAY). */
const isWeeklyLineDay =(today: string): boolean => (fromISO(today).getDay() + 6) % 7 + 1 <= WEEKLY_LINE_LAST_WEEKDAY // 1 = Monday … 7 = Sunday

/** The president/VP weekly line, or null when it should not show. */
export const weeklyLine = (s: DemoState, viewerId: string): { personIds: string[] } | null => {
  if (!isLead(s, viewerId) || !isWeeklyLineDay(s.today)) return null
  const { monday, sunday } = weekOf(s.today)
  if (cheersOf(s).weeklyLineDismissed?.[viewerId] === monday) return null
  const personIds = s.people
    // On time and with details, as the approved screen F7 says (a late completion with details does not count).
    .filter(p => p.id !== viewerId && canReceiveCheers(s, p.id) && deliveredWithDetails(s, p.id, monday, sunday).some(e => e.facts?.onTime !== false))
    .sort(byName).slice(0, MAX_RECIPIENTS).map(p => p.id)
  return personIds.length ? { personIds } : null
}

/** The "Say thanks?" prompt on a finished task, or null. */
export const thankPromptFor = (s: DemoState, viewerId: string, nodeId: string): { ownerId: string } | null => {
  const n = s.nodes.find(x => x.id === nodeId)
  if (!n || n.status !== "done" || !n.ownerId || n.ownerId === viewerId) return null
  return canReceiveCheers(s, n.ownerId) && canSendCheers(s, viewerId) ? { ownerId: n.ownerId } : null
}
