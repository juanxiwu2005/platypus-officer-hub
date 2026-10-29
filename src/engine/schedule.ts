import type { DemoState, Event, Node, Person } from "../data/types"
import { RULES } from "../data/rules"
import { addDays, daysBetween, fmtLong } from "../lib/dates"
import {
  BREAKS, CALENDAR_END, CALENDAR_START, FINALS, HOLIDAYS, TERMS, findPeriod, isWeekend, onOrAfter, onOrBefore, outsideCalendar,
  isBusinessDay, personalWorkDay, shiftWork, skippedReasons, type WorkDay,
} from "./calendar"

/**
 * The rule engine (plan §4 mechanism 1, §11). Deterministic: the same state always gives the same dates.
 * AI never writes dates; it may only propose nodes and links, and this engine dates them.
 *
 * For each event:
 *  1. Backward pass (latest safe plan). For every node, the club deadline is the earliest of
 *     - the official ASU deadline minus the club buffer (default 3 business days),
 *     - the club timing from the playbook (e.g. SEO T-14 checklist),
 *     - the business day before any step that depends on it must start.
 *     Latest start = club deadline minus effort days and the owner's personal buffer, on the owner's
 *     working days (business days outside their busy weeks).
 *  2. Forward pass (what people decided). A club deadline set by a person replaces the recommended one;
 *     if an unfinished upstream step ends later than a step could start, that step moves later.
 *  3. Issues. Red (error) = an ASU deadline is missed or the plan runs past the event. Amber (warn) =
 *     club deadline or latest start passed, moved by an upstream step, no owner. Info = for context.
 */

export const DEFAULT_PERSONAL_BUFFER = 1

export type Severity = "error" | "warn" | "info"
export interface Issue {
  code: string
  severity: Severity
  text: string
  ruleId?: string
  nodeId?: string
}

export interface NodePlan {
  id: string
  official: string | null
  club: string
  latestStart: string
  /** The engine's own club deadline before any person's override. */
  recommendedClub: string
  explain: { official: string | null; club: string; latestStart: string }
  pushedBy: string | null
  issues: Issue[]
}

export interface EventPlan {
  eventId: string
  issues: Issue[]
}

export interface Schedule {
  nodes: Record<string, NodePlan>
  events: Record<string, EventPlan>
}

const RULE_BY_ID = Object.fromEntries(RULES.map(r => [r.id, r]))
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`
const calendarSpan = () => `${fmtLong(CALENDAR_START)} to ${fmtLong(CALENDAR_END)}`
const closedReason = (d: string) => HOLIDAYS[d] ?? (isWeekend(d) ? "weekend" : "closed day")

interface Ctx {
  state: DemoState
  byId: Map<string, Node>
}

function ownerOf(ctx: Ctx, n: Node): Person | undefined {
  return n.ownerId ? ctx.state.people.find(p => p.id === n.ownerId) : undefined
}

/** Local, opt-out scheduling adjustment. Legacy records without a completion date do not train it. */
export function personalBuffer(state: DemoState, person?: Person) {
  if (!person || person.personalBufferEnabled === false) return { days: DEFAULT_PERSONAL_BUFFER, count: 0, explanation: "Standard one-day buffer; personalization is off or no officer is assigned." }
  const records = state.contributions.filter((c,i,all) => c.personId === person.id && c.completedOn && (!person.bufferHistoryFrom || c.completedOn > person.bufferHistoryFrom) && all.findIndex(x=>x.nodeId===c.nodeId && x.personId===c.personId)===i && state.nodes.some(n=>n.id===c.nodeId && n.status==="done"))
  const late = records.filter(c=>!c.onTime).length
  // Five completed records before adaptation; five equal prior observations soften early swings.
  const extra = records.length >= 5 ? Math.floor(3 * late / (records.length + 5)) : 0
  const days = Math.min(5, Math.max(0, person.personalBufferDays) + extra)
  return { days, count: records.length, explanation: `Your chosen base is ${person.personalBufferDays} day(s). ${records.length} dated local task completions; ${extra} extra scheduling day(s) from the smoothed late-completion share. No contribution points use this value.` }
}

function effortOf(ctx: Ctx, n: Node) {
  const p = ownerOf(ctx, n)
  const buffer = personalBuffer(ctx.state, p).days
  const work: WorkDay = personalWorkDay(p?.busyWeeks)
  return { days: Math.max(0, n.estDays) + buffer, buffer, work, person: p }
}

function startWhy(club: string, n: Node, e: ReturnType<typeof effortOf>, start: string) {
  const first = e.person?.name.split(" ")[0]
  let s = `${fmtLong(club)} minus ${plural(n.estDays, "day")} of work and ${plural(e.buffer, "day")} of ${first ? `${first}'s` : "default"} personal buffer`
  const skipped = skippedReasons(start, club, e.person?.busyWeeks).map(r => (r === "busy week" && first ? `${first}'s busy week` : r))
  if (skipped.length) s += `, skipping ${skipped.join(" and ")}`
  return s
}

/** Official ASU deadline for a rule anchor, or null. */
export function officialDeadline(n: Node, ev: Event): { date: string; why: string } | null {
  const a = n.anchor
  if (!a) return null
  if (a.kind === "fixed") return a.official ? { date: a.official, why: "Fixed deadline" } : null
  if (a.kind !== "rule") return null
  const rule = RULE_BY_ID[a.ruleId]
  let date: string
  let why: string
  if (a.unit === "business") {
    date = shiftWork(ev.date, -a.days)
    why = `${a.ruleId}: ${plural(a.days, "business day")} before the event`
  } else {
    const raw = addDays(ev.date, -a.days)
    date = onOrBefore(raw)
    why = `${a.ruleId}: ${plural(a.days, "day")} before the event`
    if (date !== raw) why += `; ${fmtLong(raw)} is a ${closedReason(raw)}, so the business day before`
  }
  if (rule?.note) why += `. ${rule.note}`
  return { date, why }
}

function targetDate(n: Node, ev: Event): { date: string; why: string } | null {
  const a = n.anchor
  if (!a || a.kind !== "target") return null
  const raw = a.unit === "business" ? shiftWork(ev.date, -a.days) : addDays(ev.date, -a.days)
  let date = onOrBefore(raw)
  if (a.days < 0) date = date > ev.date ? date : shiftWork(ev.date, 1)
  return { date, why: a.label }
}

/** Kahn's algorithm. Nodes caught in a loop are appended at the end and reported. */
export function topoOrder(nodes: Node[]): { order: Node[]; looped: Node[] } {
  const ids = new Set(nodes.map(n => n.id))
  const indeg = new Map<string, number>()
  const children = new Map<string, string[]>()
  for (const n of nodes) {
    indeg.set(n.id, 0)
    children.set(n.id, [])
  }
  for (const n of nodes)
    for (const d of n.dependsOn)
      if (ids.has(d) && d !== n.id) {
        indeg.set(n.id, (indeg.get(n.id) ?? 0) + 1)
        children.get(d)!.push(n.id)
      }
  const byId = new Map(nodes.map(n => [n.id, n]))
  const queue = nodes.filter(n => indeg.get(n.id) === 0).map(n => n.id)
  const order: Node[] = []
  while (queue.length) {
    const id = queue.shift()!
    order.push(byId.get(id)!)
    for (const c of children.get(id)!) {
      indeg.set(c, indeg.get(c)! - 1)
      if (indeg.get(c) === 0) queue.push(c)
    }
  }
  const seen = new Set(order.map(n => n.id))
  const looped = nodes.filter(n => !seen.has(n.id))
  return { order: [...order, ...looped], looped }
}

interface Rec {
  official: { date: string; why: string } | null
  club: string
  clubWhy: string
  start: string
  startWhy: string
}

function planEvent(ctx: Ctx, ev: Event, out: Schedule) {
  const { state } = ctx
  const nodes = state.nodes.filter(n => n.eventId === ev.id)
  const { order, looped } = topoOrder(nodes)
  const ids = new Set(nodes.map(n => n.id))
  const children = new Map<string, string[]>(nodes.map(n => [n.id, []]))
  for (const n of nodes) for (const d of n.dependsOn) if (ids.has(d) && d !== n.id) children.get(d)!.push(n.id)
  const buffer = state.org.settings.clubBufferBusinessDays
  const afterEvent = shiftWork(ev.date, 1)
  const loopedIds = new Set(looped.map(n => n.id))

  // 1. Backward pass
  const rec = new Map<string, Rec>()
  for (const n of [...order].reverse()) {
    const official = officialDeadline(n, ev)
    const cands: { date: string; why: string }[] = []
    if (official) cands.push({ date: shiftWork(official.date, -buffer), why: `${plural(buffer, "business day")} before the ASU deadline (club buffer)` })
    const t = targetDate(n, ev)
    if (t) cands.push(t)
    for (const c of children.get(n.id)!) {
      const r = rec.get(c)
      if (r && !loopedIds.has(c)) cands.push({ date: shiftWork(r.start, -1), why: `Must be done before “${ctx.byId.get(c)!.title}” starts (${fmtLong(r.start)})` })
    }
    if (cands.length === 0) {
      cands.push(n.phase === "close" ? { date: shiftWork(ev.date, 3), why: "Three business days after the event" } : { date: shiftWork(ev.date, -1), why: "The business day before the event" })
    }
    const best = cands.reduce((a, b) => (b.date < a.date ? b : a))
    const e = effortOf(ctx, n)
    let start = shiftWork(best.date, -e.days, e.work)
    let sWhy = startWhy(best.date, n, e, start)
    if (n.phase === "close" && start < afterEvent) {
      start = onOrAfter(afterEvent, e.work)
      sWhy = "The first business day after the event"
    }
    rec.set(n.id, { official, club: best.date, clubWhy: best.why, start, startWhy: sWhy })
  }

  // 2. Forward pass
  for (const n of order) {
    const r = rec.get(n.id)!
    const e = effortOf(ctx, n)
    let club = n.clubDeadlineOverride ?? r.club
    let clubWhy = n.clubDeadlineOverride ? `Set by a person (Platypus recommends ${fmtLong(r.club)})` : r.clubWhy
    let start = n.clubDeadlineOverride ? shiftWork(club, -e.days, e.work) : r.start
    let sWhy = n.clubDeadlineOverride ? startWhy(club, n, e, start) : r.startWhy
    if (n.phase === "close" && start < afterEvent) {
      start = onOrAfter(afterEvent, e.work)
      sWhy = "The first business day after the event"
      if (club < start) {
        club = shiftWork(start, e.days, e.work)
        clubWhy = "Close-out work can only start after the event"
      }
    }
    let pushedBy: string | null = null
    let earliest: string | null = null
    for (const u of n.dependsOn) {
      const up = out.nodes[u]
      const un = ctx.byId.get(u)
      if (!up || !un || un.status === "done" || loopedIds.has(u)) continue
      const e1 = shiftWork(up.club, 1)
      if (!earliest || e1 > earliest) {
        earliest = e1
        pushedBy = u
      }
    }
    if (earliest && start < earliest) {
      start = onOrAfter(earliest, e.work)
      club = shiftWork(start, e.days, e.work)
      const u = ctx.byId.get(pushedBy!)!
      clubWhy = `Moved later: “${u.title}” finishes ${fmtLong(out.nodes[u.id].club)}`
      sWhy = `The business day after “${u.title}” finishes`
    } else pushedBy = null

    if (n.recoveryFrom && n.status !== "done" && start < n.recoveryFrom) {
      start = onOrAfter(n.recoveryFrom, e.work)
      club = shiftWork(start, e.days, e.work)
      clubWhy = "Recovery plan approved by the president; ASU deadline stays unchanged"
      sWhy = "First available working day in the approved recovery plan"
    }

    out.nodes[n.id] = {
      id: n.id,
      official: r.official?.date ?? null,
      club,
      latestStart: start,
      recommendedClub: r.club,
      explain: { official: r.official?.why ?? null, club: clubWhy, latestStart: sWhy },
      pushedBy,
      issues: nodeIssues(ctx, n, { official: r.official?.date ?? null, club, start, rec: r.club, pushedBy, looped: loopedIds.has(n.id) }, ev),
    }
  }

  out.events[ev.id] = { eventId: ev.id, issues: eventIssues(ctx, ev, nodes, out, looped) }
}

function planStandalone(ctx: Ctx, n: Node, out: Schedule) {
  const a = n.anchor
  const e = effortOf(ctx, n)
  const fixedClub = a?.kind === "fixed" ? a.club : a?.kind === "followup" ? onOrBefore(addDays(a.from, a.days)) : n.clubDeadline ?? ctx.state.today
  const official = a?.kind === "fixed" ? a.official : null
  let club = n.clubDeadlineOverride ?? fixedClub
  let start = shiftWork(club, -e.days, e.work)
  if (n.recoveryFrom && n.status !== "done" && start < n.recoveryFrom) {
    start = onOrAfter(n.recoveryFrom, e.work)
    club = shiftWork(start, e.days, e.work)
  }
  out.nodes[n.id] = {
    id: n.id,
    official,
    club,
    latestStart: start,
    recommendedClub: fixedClub,
    explain: {
      official: official ? "Fixed deadline" : null,
      club: n.recoveryFrom ? "Recovery plan approved by the president" : n.clubDeadlineOverride ? `Set by a person (was ${fmtLong(fixedClub)})` : a?.kind === "followup" ? a.label : "Set when the task was created",
      latestStart: startWhy(club, n, e, start),
    },
    pushedBy: null,
    issues: nodeIssues(ctx, n, { official, club, start, rec: fixedClub, pushedBy: null, looped: false }, null),
  }
}

function nodeIssues(
  ctx: Ctx,
  n: Node,
  d: { official: string | null; club: string; start: string; rec: string; pushedBy: string | null; looped: boolean },
  ev: Event | null,
): Issue[] {
  if (n.status === "done") return []
  const today = ctx.state.today
  const out: Issue[] = []
  const ruleId = n.anchor?.kind === "rule" ? n.anchor.ruleId : undefined
  if (d.looped) out.push({ code: "loop", severity: "error", text: "This step and another step each wait for the other. Remove one of the links." })
  // The calendar data has an end. Past it every day looks like "between semesters" and dates drift silently, so say so loudly.
  const stray = [ev?.date, d.official, d.club, d.start].filter((x): x is string => !!x && outsideCalendar(x))
  if (stray.length) out.push({ code: "calendar_range", severity: "error", text: `This step involves ${fmtLong(stray.sort()[0])}, outside the ASU calendar Platypus knows (${calendarSpan()}). Its dates cannot be trusted.` })
  if (d.official && d.club > d.official)
    out.push({ code: "official_missed", severity: "error", ruleId, text: `Planned finish ${fmtLong(d.club)} is after the ASU deadline ${fmtLong(d.official)}${ruleId ? ` (${ruleId})` : ""}.` })
  if (ev && n.phase !== "close" && d.club >= ev.date)
    out.push({ code: "after_event", severity: "error", text: `Planned finish ${fmtLong(d.club)} is not before the event (${fmtLong(ev.date)}).` })
  if (d.official && today > d.official)
    out.push({ code: "official_passed", severity: "error", ruleId, text: `The ASU deadline (${fmtLong(d.official)}) has passed. Time for Plan B.` })
  else if (today > d.club) out.push({ code: "club_passed", severity: "warn", text: `Past the club deadline (${fmtLong(d.club)}).` })
  else if ((n.status === "unclaimed" || n.status === "accepted") && today > d.start)
    out.push({ code: "start_passed", severity: "warn", text: `Should have started by ${fmtLong(d.start)}.` })
  if (d.pushedBy) {
    const u = ctx.byId.get(d.pushedBy)!
    out.push({ code: "pushed", severity: "warn", nodeId: u.id, text: `Moved later because “${u.title}” finishes later.` })
  }
  if (n.clubDeadlineOverride && n.clubDeadlineOverride > d.rec && !d.pushedBy)
    out.push({ code: "override_later", severity: "info", text: `Later than the recommended ${fmtLong(d.rec)}, so there is less room for surprises.` })
  if (!n.ownerId) out.push({ code: "no_owner", severity: "warn", text: "No owner yet." })
  else if (n.status === "unclaimed") {
    const p = ownerOf(ctx, n)
    out.push({ code: "not_claimed", severity: "info", text: `Waiting for ${p?.name.split(" ")[0] ?? "the owner"} to claim it.` })
    if (daysBetween(n.assignedOn ?? n.lastUpdate ?? ctx.state.today, today) >= 2)
      out.push({ code: "claim_overdue", severity: "warn", text: "Not claimed within 48 hours. Ask the president to check the handover privately." })
  }
  return out
}

function eventIssues(ctx: Ctx, ev: Event, nodes: Node[], out: Schedule, looped: Node[]): Issue[] {
  const issues: Issue[] = []
  const today = ctx.state.today
  const finals = findPeriod(ev.date, FINALS)
  if (finals) issues.push({ code: "finals", severity: "error", ruleId: "R13", text: `${fmtLong(ev.date)} is during ${finals.label}. ASU does not allow events then (R13).` })
  if (ev.date in HOLIDAYS) issues.push({ code: "holiday", severity: "warn", text: `ASU is closed on ${fmtLong(ev.date)} (${HOLIDAYS[ev.date]}).` })
  const brk = findPeriod(ev.date, BREAKS)
  if (brk) issues.push({ code: "break", severity: "warn", text: `${fmtLong(ev.date)} is during ${brk.label}. Classes are excused, so many members may be away.` })
  const outside = outsideCalendar(ev.date) || nodes.some(n => out.nodes[n.id]?.issues.some(i => i.code === "calendar_range"))
  if (outside) issues.push({ code: "calendar_range", severity: "error", text: `Some dates for this event fall outside the ASU calendar Platypus knows (${calendarSpan()}), so its deadlines cannot be trusted. Do not rely on them until the calendar is updated.` })
  if (!outside && !finals && !findPeriod(ev.date, TERMS)) issues.push({ code: "no_term", severity: "warn", text: `${fmtLong(ev.date)} is between semesters. Most members are away.` })
  if (ev.date < today) issues.push({ code: "past", severity: "info", text: "This event has already happened." })
  const passed = nodes.filter(n => out.nodes[n.id]?.issues.some(i => i.code === "official_passed"))
  if (passed.length)
    issues.push({ code: "official_passed", severity: "error", text: `${plural(passed.length, "ASU deadline")} already passed: ${passed.map(n => n.title).join("; ")}. Consider moving the event or a Plan B.` })
  const missed = nodes.filter(n => out.nodes[n.id]?.issues.some(i => i.code === "official_missed" || i.code === "after_event"))
  if (missed.length) issues.push({ code: "plan_misses", severity: "error", text: `${plural(missed.length, "step")} cannot finish in time with the current plan.` })
  if (looped.length) issues.push({ code: "loop", severity: "error", text: `Steps wait for each other in a loop: ${looped.map(n => n.title).join("; ")}.` })
  return issues
}

export function computeSchedule(state: DemoState): Schedule {
  const ctx: Ctx = { state, byId: new Map(state.nodes.map(n => [n.id, n])) }
  const out: Schedule = { nodes: {}, events: {} }
  for (const ev of state.events) planEvent(ctx, ev, out)
  for (const n of state.nodes) if (!n.eventId || !state.events.some(e => e.id === n.eventId)) planStandalone(ctx, n, out)
  return out
}

/** Write the engine's dates into the nodes. The store calls this after every change. */
export function applySchedule(state: DemoState): DemoState {
  const s = computeSchedule(state)
  return {
    ...state,
    nodes: state.nodes.map(n => {
      const p = s.nodes[n.id]
      if (!p) return n
      if (n.officialDeadline === p.official && n.clubDeadline === p.club && n.latestStart === p.latestStart) return n
      return { ...n, officialDeadline: p.official, clubDeadline: p.club, latestStart: p.latestStart }
    }),
  }
}

/** Forecast clock: all simulated completion dates still come from this date engine.
 * Memoized by owner/start/duration so 1,000 runs do not repeat calendar walks. */
export function forecastClock(state: DemoState) {
  const cache = new Map<string, string>()
  return (node: Node, start: string, effort: number, calendarWait = 0): string => {
    const key = `${node.ownerId}:${start}:${effort}:${calendarWait}`
    if (cache.has(key)) return cache.get(key)!
    const person = state.people.find(p => p.id === node.ownerId)
    const work = node.ownerId === null ? isBusinessDay : personalWorkDay(person?.busyWeeks)
    const date = calendarWait > 0 ? onOrAfter(addDays(start, calendarWait)) : shiftWork(onOrAfter(start, work), effort, work)
    cache.set(key, date)
    return date
  }
}

/** Human-selected handoff window; derived milestones are calculated here, never by AI. */
export function handoffDates(start: string) {
  return { interview: addDays(start, 3), handbook: addDays(start, 7), weekOne: addDays(start, 7), weekTwo: addDays(start, 14), review: addDays(start, 30) }
}
export function fundingDecisionDate(state: DemoState, eventId: string): string | null {
  const steps = state.nodes.filter(n => n.eventId === eventId && (n.stepKey === "usg" || n.stepKey === "usgspeaker"))
  return steps.map(n => n.officialDeadline).filter((d): d is string => !!d).sort()[0] ?? null
}
