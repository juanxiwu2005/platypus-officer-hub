import type { DemoState, Event, Node, Person, StepTiming } from "../data/types"
import { RULES, ruleSourceName } from "../data/rules"
import { addDays, daysBetween, fmtLong } from "../lib/dates"
import { workflowMilestoneDates, workflowMilestoneGraphError, workflowMilestoneTaskDate } from "./workflowMilestones"
import {
  BREAKS, CALENDAR_END, CALENDAR_START, FINALS, HOLIDAYS, TERMS, findPeriod, isWeekend, onOrAfter, onOrBefore, outsideCalendar,
  busyDays, isBusinessDay, personalWorkDay, shiftWork, skippedReasons, studentOffReason, type WorkDay,
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
 *
 * Calibrated steps (FB-6: the node has `timing`, from the owner's timing table) are dated from their own window instead:
 *  - club deadline = the earlier of (ASU deadline - club buffer) and (event day - dueDays), moved to the business day
 *    before when it lands on a closed day (after-event steps: the business day after);
 *  - latest start = event day - startDays, moved earlier to the owner's working day; only the part of the personal
 *    buffer above the default one day moves it further;
 *  - the backward pass does not pull them earlier for a later step's start;
 *  - between two calibrated steps a link means finish order only: an unfinished upstream step moves this one later only
 *    when its deadline is later than this one's (the same day is fine). This also holds after a calibrated step for an
 *    uncalibrated one. Before a calibrated step, an uncalibrated step keeps the rule above for the start; it moves the
 *    deadline only when it has slipped past its own recommended date;
 *  - a later calibrated step's ASU deadline is a hard limit for the calibrated steps before it (backward pass), and the
 *    template's own finish order is part of the recommended deadline, so a fresh event shows no "Moved later" warning.
 * Steps without `timing` (hand-made tasks, conditional steps, events built before FB-6) retain their earlier rules unless explicitly edited.
 * New workflow snapshots with `teamExecution: sequential` instead use full effort plus personal buffer and
 * finish-to-start dependencies. Calibrated due targets and official limits remain; start windows cannot force overlap.
 * Historical snapshots without that explicit flag retain the rules above.
 * An explicit `startPolicy: effort` keeps calibrated due dates and link semantics, but dates its start from the
 * work estimate and the full personal buffer. If a real start constraint leaves too little time, its feasible
 * finish is shown with an effort_window warning; the original target and official deadline remain available.
 * New workflow snapshots marked teamExecution: sequential instead treat every dependency as finish-to-start.
 * Their calibrated due offsets remain targets, while starts come from work estimates and downstream needs;
 * calibrated start windows never prevent starting early enough. Existing snapshots retain the rules above.
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
  if (!person || person.personalBufferEnabled === false) return { days: DEFAULT_PERSONAL_BUFFER, count: 0, explanation: "Standard: one extra day." }
  const records = state.contributions.filter((c,i,all) => c.personId === person.id && c.completedOn && (!person.bufferHistoryFrom || c.completedOn > person.bufferHistoryFrom) && all.findIndex(x=>x.nodeId===c.nodeId && x.personId===c.personId)===i && state.nodes.some(n=>n.id===c.nodeId && n.status==="done"))
  const late = records.filter(c=>!c.onTime).length
  // Five completed records before adaptation; five equal prior observations soften early swings.
  const extra = records.length >= 5 ? Math.floor(3 * late / (records.length + 5)) : 0
  const days = Math.min(5, Math.max(0, person.personalBufferDays) + extra)
  return { days, count: records.length, explanation: `Your base: ${plural(person.personalBufferDays, "extra day")}${extra ? `, plus ${plural(extra, "day")} from your recent finishes` : ""}. Never used for contributions.` }
}

function effortOf(ctx: Ctx, n: Node) {
  const p = ownerOf(ctx, n)
  const buffer = personalBuffer(ctx.state, p).days
  const work: WorkDay = personalWorkDay(p?.busyWeeks)
  return { days: Math.max(0, n.estDays) + buffer, buffer, work, person: p }
}

function startWhy(club: string, n: Node, e: ReturnType<typeof effortOf>, start: string) {
  const first = e.person?.name.split(" ")[0]
  let s = `${fmtLong(club)} minus ${plural(n.estDays, "day")} of work and ${plural(e.buffer, "day")} of ${first ? `${first}'s` : "default"} extra days`
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
    why = `${ruleSourceName(a.ruleId)}: ${plural(a.days, "business day")} before the event`
  } else {
    const raw = addDays(ev.date, -a.days)
    date = onOrBefore(raw)
    why = `${ruleSourceName(a.ruleId)}: ${plural(a.days, "day")} before the event`
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

const dayWord = (n: number, unit: StepTiming["unit"]) => plural(Math.abs(n), unit === "business" ? "business day" : "day")
/** Event day shifted by a calibrated offset (positive = before the event). */
const fromEvent = (ev: Event, days: number, unit: StepTiming["unit"]) => (unit === "business" ? shiftWork(ev.date, -days) : addDays(ev.date, -days))
/** Words for a calibrated offset, e.g. "60 days before the event", "the event day", "5 business days after the event". */
const offsetWords = (days: number, unit: StepTiming["unit"]) => (days === 0 ? "the event day" : `${dayWord(days, unit)} ${days > 0 ? "before" : "after"} the event`)

/** The club deadline from a calibrated step's own timing (before the ASU buffer is compared). */
function timingDue(n: Node, ev: Event, t: StepTiming): { date: string; why: string } {
  const raw = fromEvent(ev, t.dueDays, t.unit)
  // Before or on the event day: the business day before a closed day. After the event (and a close-out step due on the event day): the business day after.
  const after = t.dueDays < 0 || (t.dueDays === 0 && n.phase === "close")
  const date = after ? onOrAfter(raw) : onOrBefore(raw)
  let why = `Club timing: due ${t.dueDays === 0 ? "on " : ""}${offsetWords(t.dueDays, t.unit)}`
  if (date !== raw) why += `; ${fmtLong(raw)} is a ${closedReason(raw)}, so the business day ${after ? "after" : "before"}`
  return { date, why }
}

/** First day a close-out step may start: the event day for a step due on the event day (Headcount), else the first business day after it. */
const closeFloor = (n: Node, ev: Event) => (n.timing?.dueDays === 0 ? ev.date : shiftWork(ev.date, 1))
const closeFloorWhy = (n: Node) => (n.timing?.dueDays === 0 ? "Starts on the event day" : "The first business day after the event")

/** A person changed the work estimate: count real working days, including the full buffer, back from the deadline. */
function effortStart(ctx: Ctx, n: Node, club: string): { date: string; why: string } {
  const e = effortOf(ctx, n)
  const finish = onOrBefore(club, e.work)
  const date = shiftWork(finish, -e.days, e.work)
  let why = startWhy(club, n, e, date)
  if (finish !== club) why += `; work is ready by ${fmtLong(finish)}, the owner's working day on or before the deadline`
  return { date, why }
}

/** Latest start of a calibrated step: its window opens `startDays` before the event, on the owner's working day. */
function timingStart(ctx: Ctx, n: Node, ev: Event, t: StepTiming, club: string): { date: string; why: string } {
  if (n.startPolicy === "effort") return effortStart(ctx, n, club)
  const e = effortOf(ctx, n)
  const first = e.person?.name.split(" ")[0]
  const raw = fromEvent(ev, t.startDays, t.unit)
  let date = onOrBefore(raw, e.work)
  let why = `Club timing: starts ${t.startDays === 0 ? "on " : ""}${offsetWords(t.startDays, t.unit)}`
  if (date !== raw) {
    const off = isBusinessDay(raw) ? studentOffReason(raw, busyDays(e.person?.busyWeeks)) ?? "closed day" : closedReason(raw)
    why += `; ${fmtLong(raw)} is ${off === "busy week" && first ? `in ${first}'s busy week` : `a ${off}`}, so the working day before`
  }
  // The default personal buffer (1 day) is already part of the owner's timing table; only a larger buffer starts earlier.
  const extra = Math.max(0, e.buffer - DEFAULT_PERSONAL_BUFFER)
  if (extra) {
    date = shiftWork(date, -extra, e.work)
    why += `, then ${plural(extra, "more working day")} of ${first ? `${first}'s` : "the"} extra days`
  } else if (first) why += ` (${first}'s extra day is already part of this timing)`
  if (n.phase === "close" && date < closeFloor(n, ev)) {
    date = closeFloor(n, ev)
    why = closeFloorWhy(n)
  }
  if (date > club) {
    date = club
    why = "The same day as the club deadline"
  }
  return { date, why }
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
  /** Calibrated steps: the club deadline is set by an ASU deadline (this step's own, or a later step's). */
  asu?: boolean
}

function planEvent(ctx: Ctx, ev: Event, out: Schedule) {
  if (ev.workflowRun?.snapshot.milestoneGraph) { planMilestoneEvent(ctx, ev, out); return }
  const { state } = ctx
  const sequential = ev.workflowRun?.snapshot.teamExecution === "sequential"
  // A linked club task keeps its own due date (src/data/clubTasks.ts), so it is planned as a standalone task below.
  const nodes = state.nodes.filter(n => n.eventId === ev.id && !n.clubTask)
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
    if (n.timing && !sequential) {
      // Calibrated: its own window, not squeezed earlier by the steps after it.
      const own = timingDue(n, ev, n.timing)
      const buffered = official ? { date: shiftWork(official.date, -buffer), why: `${plural(buffer, "business day")} before the ASU deadline (days early)` } : null
      let best = buffered && buffered.date < own.date ? buffered : own
      let asu = best === buffered
      // An ASU deadline is a hard limit for the steps before it too: when a calibrated step that waits for this one must finish
      // earlier than this one's own timing because of its ASU deadline, this one finishes by then (the same day is fine). A club
      // timing never pulls an earlier step; finish order then moves the later step instead (forward pass).
      for (const c of children.get(n.id)!) {
        const r = rec.get(c)
        const child = ctx.byId.get(c)!
        if (r?.asu && !loopedIds.has(c) && child.timing && r.club < best.date) {
          best = { date: r.club, why: `Must be done by the time “${child.title}” is due (${fmtLong(r.club)}), which its ASU deadline sets` }
          asu = true
        }
      }
      if (n.phase === "close" && best.date < closeFloor(n, ev)) best = { date: closeFloor(n, ev), why: "Close-out work can only start after the event" }
      const st = timingStart(ctx, n, ev, n.timing, best.date)
      rec.set(n.id, { official, club: best.date, clubWhy: best.why, start: st.date, startWhy: st.why, asu })
      continue
    }
    const cands: { date: string; why: string }[] = []
    if (official) cands.push({ date: shiftWork(official.date, -buffer), why: `${plural(buffer, "business day")} before the ASU deadline (days early)` })
    // Keep authored club due targets and official anchors, but not calibrated start windows.
    const t = sequential && n.timing ? timingDue(n, ev, n.timing) : targetDate(n, ev)
    if (t) cands.push(t)
    for (const c of children.get(n.id)!) {
      const r = rec.get(c)
      if (r && !loopedIds.has(c)) {
        const child = ctx.byId.get(c)!
        const floor = sequential && child.phase === "close" ? onOrAfter(closeFloor(child, ev), effortOf(ctx, child).work) : null
        const start = floor && floor > r.start ? floor : r.start
        cands.push({ date: shiftWork(start, -1), why: `Must be done before “${child.title}” starts (${fmtLong(start)})` })
      }
    }
    if (cands.length === 0) {
      cands.push(n.phase === "close" ? { date: shiftWork(ev.date, 3), why: "Three business days after the event" } : { date: shiftWork(ev.date, -1), why: "The business day before the event" })
    }
    const best = cands.reduce((a, b) => (b.date < a.date ? b : a))
    const e = effortOf(ctx, n)
    let club = best.date
    let clubWhy = best.why
    const explicit = sequential || n.startPolicy === "effort" ? effortStart(ctx, n, club) : null
    let start = explicit?.date ?? shiftWork(club, -e.days, e.work)
    let sWhy = explicit?.why ?? startWhy(club, n, e, start)
    if (!explicit && n.phase === "close" && start < afterEvent) {
      start = onOrAfter(afterEvent, e.work)
      sWhy = "The first business day after the event"
      club = shiftWork(start, e.days, e.work)
      clubWhy = "Close-out work can only start after the event"
    }
    rec.set(n.id, { official, club, clubWhy, start, startWhy: sWhy })
  }

  // 2. Forward pass
  // A calibrated step's link means finish order (FB-6): the recommended deadline of a step is never before the recommended
  // deadline of a calibrated step it waits for. This keeps the template's own order quietly; only a real slip warns (below).
  const planned = new Map<string, { date: string; why: string }>()
  for (const n of order) {
    const r0 = rec.get(n.id)!
    let p = { date: r0.club, why: r0.clubWhy }
    for (const u of n.dependsOn) {
      const un = ctx.byId.get(u), pu = planned.get(u)
      if (!sequential && un?.timing && pu && !loopedIds.has(u) && !loopedIds.has(n.id) && pu.date > p.date) p = { date: pu.date, why: `Finishes after “${un.title}” (${fmtLong(pu.date)}), so the steps stay in order` }
    }
    planned.set(n.id, p)
    const r = p.date === r0.club ? r0 : { ...r0, club: p.date, clubWhy: p.why }
    if (sequential || n.startPolicy === "effort") {
      planExplicitEffort(ctx, n, ev, r, out, loopedIds, sequential)
      continue
    }
    if (n.timing) {
      planCalibrated(ctx, n, ev, r, out, loopedIds, planned)
      continue
    }
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
      // A calibrated step before this one only sets the finish order (below), not when this one may start.
      if (!up || !un || un.status === "done" || loopedIds.has(u) || un.timing) continue
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
    for (const u of n.dependsOn) {
      const up = out.nodes[u]
      const un = ctx.byId.get(u)
      if (!up || !un?.timing || un.status === "done" || loopedIds.has(u) || up.club <= club) continue
      club = up.club
      clubWhy = `Moved later: “${un.title}” finishes ${fmtLong(up.club)}`
      pushedBy = u
    }

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

/** New milestone versions pin their targets. Dependency conflicts become risks, never moving an event day or target. */
function planMilestoneEvent(ctx: Ctx, ev: Event, out: Schedule) {
  const version = ev.workflowRun!.snapshot, graph = version.milestoneGraph!
  const nodes = ctx.state.nodes.filter(node => node.eventId === ev.id && !node.clubTask), { order, looped } = topoOrder(nodes)
  const invalid = workflowMilestoneGraphError(graph, version.steps, new Set(version.teams.map(team => team.id)))
  if (invalid) {
    for (const node of nodes) {
      const club = node.clubDeadline ?? ev.date, start = node.latestStart ?? club
      out.nodes[node.id] = { id: node.id, official: node.officialDeadline, club, latestStart: start, recommendedClub: club, explain: { official: null, club: "Saved workflow graph needs review.", latestStart: "Saved workflow graph needs review." }, pushedBy: null, issues: [{ code: "milestone_graph", severity: "error", text: invalid }] }
    }
    out.events[ev.id] = { eventId: ev.id, issues: [{ code: "milestone_graph", severity: "error", text: invalid }] }
    return
  }
  const loopedIds = new Set(looped.map(node => node.id))
  for (const node of order) {
    const key = node.workflowSource?.templateStepId ?? node.stepKey ?? node.id
    const anchor = graph.taskAnchors[key], day = graph.eventDays.find(candidate => candidate.id === anchor?.eventDayId)
    const target = workflowMilestoneTaskDate(graph, key, ev.date) ?? (node.timing ? timingDue(node, ev, node.timing).date : targetDate(node, ev)?.date) ?? node.clubDeadline ?? ev.date
    const official = officialDeadline(node, ev)
    const cap = official ? shiftWork(official.date, -ctx.state.org.settings.clubBufferBusinessDays) : null
    const recommended = cap && cap < target ? cap : target
    const requested = node.clubDeadlineOverride ?? recommended
    const club = cap && cap < requested ? cap : requested
    const start = effortStart(ctx, node, club)
    const why = cap && club === cap ? `Day 1 ASU deadline with the club's days early; ${official!.why}`
      : `${day?.title ?? "Activity"} ${anchor?.offsetDays === 0 ? "date" : `${anchor?.offsetDays ?? 0} ${anchor?.unit === "business" ? "working" : "calendar"} days`}; this target stays fixed.`
    const nodeEvent = day ? { ...ev, date: addDays(ev.date, day.offsetDays) } : ev
    const issues = nodeIssues(ctx, node, { official: official?.date ?? null, club, start: start.date, rec: recommended, pushedBy: null, looped: loopedIds.has(node.id) }, nodeEvent).filter(issue => issue.code !== "after_event")
    if (node.recoveryFrom && node.recoveryFrom > start.date) issues.push({ code: "milestone_recovery", severity: "warn", text: `The recovery start ${fmtLong(node.recoveryFrom)} leaves less time before this fixed target. Review the plan; event days have not moved.` })
    out.nodes[node.id] = { id: node.id, official: official?.date ?? null, club, latestStart: start.date, recommendedClub: recommended, explain: { official: official?.why ?? null, club: why, latestStart: start.why }, pushedBy: null, issues }
  }
  for (const node of order) {
    const plan = out.nodes[node.id]
    for (const id of node.dependsOn) {
      const parent = ctx.byId.get(id), prior = out.nodes[id]
      if (!parent || !prior || parent.status === "done" || prior.club <= plan.latestStart) continue
      plan.issues.push({ code: "milestone_dependency", severity: "warn", nodeId: id, text: `“${parent.title}” is planned to finish ${fmtLong(prior.club)}, after this task's planned start. Coordinate or change this task's target; its date has not moved.` })
    }
  }
  const dayDates = workflowMilestoneDates(graph, ev.date)
  const byStep = new Map(nodes.map(node => [node.workflowSource?.templateStepId ?? node.stepKey ?? node.id, node]))
  const boundaryDate = (id: string, side: "from" | "to"): string | undefined => {
    if (dayDates[id]) return dayDates[id]
    const task = byStep.get(id)
    if (task) return out.nodes[task.id]?.club
    const index = graph.spine.indexOf(id)
    const candidates = graph.spine.filter((_, position) => side === "from" ? position <= index : position >= index)
    return (side === "from" ? candidates.reverse() : candidates).map(key => dayDates[key]).find(Boolean)
  }
  for (const branch of graph.teamBranches) {
    const floor = branch.fromId === "__start__" ? undefined : boundaryDate(branch.fromId, "from")
    const ceiling = branch.toId === "__end__" ? undefined : boundaryDate(branch.toId, "to")
    for (const key of branch.stepIds) {
      const node = byStep.get(key)
      if (!node || node.status === "done") continue
      const plan = out.nodes[node.id]
      if ((floor && (plan.club < floor || plan.latestStart < floor)) || (ceiling && plan.club > ceiling)) plan.issues.push({ code: "milestone_branch_window", severity: "error", text: `This task does not fit its branch${floor ? ` from ${fmtLong(floor)}` : ""}${ceiling ? ` through ${fmtLong(ceiling)}` : ""}. Choose a target and work estimate within that interval; the event dates have not moved.` })
    }
  }
  const issues = eventIssues(ctx, ev, nodes, out, looped).filter(issue => issue.code !== "past"), dates = workflowMilestoneDates(graph, ev.date)
  if (dates[graph.eventDays.at(-1)!.id] < ctx.state.today) issues.push({ code: "past", severity: "info", text: "This event has already happened." })
  const outsideBranch = nodes.filter(node => out.nodes[node.id].issues.some(issue => issue.code === "milestone_branch_window"))
  if (outsideBranch.length) issues.push({ code: "milestone_branch_window", severity: "error", text: `${plural(outsideBranch.length, "task")} falls outside its authored branch interval. Review the targets or work estimates; event days stay fixed.` })
  for (const day of graph.eventDays.slice(1)) {
    const date = dates[day.id]
    issues.push(...eventIssues(ctx, { ...ev, date }, [], out, []).filter(issue => ["finals", "holiday", "break", "calendar_range", "no_term"].includes(issue.code)).map(issue => ({ ...issue, text: `${day.title}: ${issue.text}` })))
  }
  out.events[ev.id] = { eventId: ev.id, issues }
}

/** Forward pass for a calibrated step (see the header): a person's deadline, finish order between calibrated steps, recovery. */
function planCalibrated(ctx: Ctx, n: Node, ev: Event, r: Rec, out: Schedule, loopedIds: Set<string>, planned: Map<string, { date: string }>) {
  const e = effortOf(ctx, n)
  const close = n.phase === "close"
  let club = n.clubDeadlineOverride ?? r.club
  let clubWhy = n.clubDeadlineOverride ? `Set by a person (Platypus recommends ${fmtLong(r.club)})` : r.clubWhy
  let start = r.start
  let sWhy = r.startWhy
  let pushedBy: string | null = null
  let pushClub: string | null = null
  let earliest: string | null = null
  let earliestBy: string | null = null
  for (const u of n.dependsOn) {
    const up = out.nodes[u]
    const un = ctx.byId.get(u)
    if (!up || !un || un.status === "done" || loopedIds.has(u)) continue
    if (un.timing) {
      // Finish order: not before the upstream step finishes (the same day is fine).
      if (up.club > club && (!pushClub || up.club > pushClub)) {
        pushClub = up.club
        pushedBy = u
      }
    } else {
      const e1 = shiftWork(up.club, 1)
      if (!earliest || e1 > earliest) {
        earliest = e1
        earliestBy = u
      }
    }
  }
  if (pushClub && pushedBy) {
    club = pushClub
    clubWhy = `Moved later: “${ctx.byId.get(pushedBy)!.title}” finishes ${fmtLong(pushClub)}`
  }
  if (n.clubDeadlineOverride) {
    // A person's deadline: start no later than the calibrated start, and early enough for the work before the deadline
    // (the deadline after any finish-order move, so an early date that an unfinished step overrides does not start the work early).
    const byEffort = shiftWork(club, -e.days, e.work)
    if (byEffort < start) {
      start = byEffort
      sWhy = startWhy(club, n, e, start)
    }
    if (close && start < closeFloor(n, ev)) {
      start = closeFloor(n, ev)
      sWhy = closeFloorWhy(n)
    }
    if (club < start) {
      club = start
      clubWhy = "Close-out work can only start after the event"
    }
  }
  if (earliest && earliestBy && start < earliest) {
    // An uncalibrated step before it: the existing rule, start the business day after it finishes. When that step has slipped
    // (it finishes later than recommended), the work then needs its effort days and the deadline moves with a warning. When it is
    // on its recommended date (a conditional step placed between calibrated steps), only the start moves, never past the deadline.
    const u = ctx.byId.get(earliestBy)!
    const slipped = out.nodes[u.id].club > (planned.get(u.id)?.date ?? out.nodes[u.id].club)
    start = onOrAfter(earliest, e.work)
    // On plan, and the owner has no working day left before the deadline (finals, a semester break): the next business day.
    if (!slipped && start > club) start = onOrAfter(earliest)
    sWhy = `The business day after “${u.title}” finishes`
    const byEffort = slipped ? shiftWork(start, e.days, e.work) : start
    if (byEffort > club) {
      club = byEffort
      clubWhy = `Moved later: “${u.title}” finishes ${fmtLong(out.nodes[u.id].club)}`
      if (!pushedBy || out.nodes[earliestBy].club > out.nodes[pushedBy].club) pushedBy = earliestBy
    }
  }
  if (n.recoveryFrom && n.status !== "done" && start < n.recoveryFrom) {
    start = onOrAfter(n.recoveryFrom, e.work)
    const byEffort = shiftWork(start, e.days, e.work)
    if (byEffort > club) club = byEffort
    clubWhy = "Recovery plan approved by the president; ASU deadline stays unchanged"
    sWhy = "First available working day in the approved recovery plan"
  }
  if (start > club) {
    start = club
    sWhy = "The same day as the club deadline"
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

/** Explicit effort retains legacy calibrated finish order unless this execution opts into finish-to-start. */
function planExplicitEffort(ctx: Ctx, n: Node, ev: Event, r: Rec, out: Schedule, loopedIds: Set<string>, sequential = false) {
  const e = effortOf(ctx, n)
  let club = n.clubDeadlineOverride ?? r.club
  let clubWhy = n.clubDeadlineOverride ? `Set by a person (Platypus recommends ${fmtLong(r.club)})` : r.clubWhy
  let pushedBy: string | null = null
  let earliest: string | null = null
  let earliestBy: string | null = null
  for (const id of n.dependsOn) {
    const upstream = ctx.byId.get(id), plan = out.nodes[id]
    if (!upstream || !plan || upstream.status === "done" || loopedIds.has(id)) continue
    if (upstream.timing && !sequential) {
      if (plan.club > club) {
        club = plan.club
        pushedBy = id
        clubWhy = `Moved later: “${upstream.title}” finishes ${fmtLong(plan.club)}`
      }
    } else {
      const available = shiftWork(plan.club, 1)
      if (!earliest || available > earliest) { earliest = available; earliestBy = id }
    }
  }
  const target = club
  const base = effortStart(ctx, n, club)
  let start = base.date, sWhy = base.why
  let constraint: string | null = null
  if (n.phase === "close") {
    const floor = onOrAfter(closeFloor(n, ev), e.work)
    if (start < floor) {
      start = floor
      constraint = `Close-out work cannot start before ${fmtLong(floor)}`
      sWhy = constraint
    }
  }
  if (earliest && earliestBy) {
    const available = onOrAfter(earliest, e.work)
    if (start < available) {
      start = available
      pushedBy = earliestBy
      constraint = `“${ctx.byId.get(earliestBy)!.title}” must finish before this work starts`
      sWhy = `The owner's first working day after “${ctx.byId.get(earliestBy)!.title}” finishes`
    }
  }
  if (n.recoveryFrom && n.status !== "done") {
    const available = onOrAfter(n.recoveryFrom, e.work)
    if (start < available) {
      start = available
      constraint = `The approved recovery plan starts ${fmtLong(available)}`
      sWhy = "First available working day in the approved recovery plan"
    }
  }
  const finish = shiftWork(start, e.days, e.work)
  const insufficient = finish > club
  if (insufficient) {
    club = finish
    clubWhy = `${constraint ?? "The available work window is too short"}. ${plural(n.estDays, "working day")} of work and ${plural(e.buffer, "working day")} of extra days move the planned finish from ${fmtLong(target)} to ${fmtLong(finish)}; the original target and ASU deadline stay unchanged`
  }
  const issues = nodeIssues(ctx, n, { official: r.official?.date ?? null, club, start, rec: r.club, pushedBy, looped: loopedIds.has(n.id) }, ev)
  if (insufficient && n.status !== "done") issues.push({ code: "effort_window", severity: "warn", text: `The work and extra days do not fit the target of ${fmtLong(target)}. Earliest feasible finish: ${fmtLong(finish)}. The target has not been met.` })
  out.nodes[n.id] = {
    id: n.id, official: r.official?.date ?? null, club, latestStart: start, recommendedClub: r.club,
    explain: { official: r.official?.why ?? null, club: clubWhy, latestStart: sWhy }, pushedBy, issues,
  }
}

function planStandalone(ctx: Ctx, n: Node, out: Schedule) {
  const a = n.anchor
  const e = effortOf(ctx, n)
  const fixedClub = a?.kind === "fixed" ? a.club : a?.kind === "followup" ? onOrBefore(addDays(a.from, a.days)) : n.clubDeadline ?? ctx.state.today
  const official = a?.kind === "fixed" ? a.official : null
  let club = n.clubDeadlineOverride ?? fixedClub
  const target = club
  const explicit = n.startPolicy === "effort" ? effortStart(ctx, n, club) : null
  let start = explicit?.date ?? shiftWork(club, -e.days, e.work)
  if (n.recoveryFrom && n.status !== "done" && start < n.recoveryFrom) {
    start = onOrAfter(n.recoveryFrom, e.work)
    club = shiftWork(start, e.days, e.work)
  }
  const issues = nodeIssues(ctx, n, { official, club, start, rec: fixedClub, pushedBy: null, looped: false }, null)
  if (explicit && club > target && n.status !== "done") issues.push({ code: "effort_window", severity: "warn", text: `The approved recovery start leaves too little time before ${fmtLong(target)}. Earliest feasible finish: ${fmtLong(club)}. The target has not been met.` })
  out.nodes[n.id] = {
    id: n.id,
    official,
    club,
    latestStart: start,
    recommendedClub: fixedClub,
    explain: {
      official: official ? "Fixed deadline" : null,
      club: n.recoveryFrom ? "Recovery plan approved by the president" : n.clubDeadlineOverride ? `Set by a person (was ${fmtLong(fixedClub)})` : a?.kind === "followup" ? a.label : "Set when the task was created",
      latestStart: explicit && club === target ? explicit.why : startWhy(club, n, e, start),
    },
    pushedBy: null,
    issues,
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
    out.push({ code: "official_missed", severity: "error", ruleId, text: `Planned finish ${fmtLong(d.club)} is after the ASU deadline ${fmtLong(d.official)}${ruleId ? ` (${ruleSourceName(ruleId)})` : ""}.` })
  // Check-in materials are intentionally allowed to be completed up to the event day.
  // They become an event-level warning only if they remain open on that day.
  const isCheckin = n.stepKey === "checkin"
  // Human-authored workflows also cover event-day and follow-up work. Their
  // explicit T0/T+ targets are valid; the standard event policy stays unchanged.
  const customWorkflow = ev?.workflowRun?.snapshot.kind === "custom" || ev?.playbookId === "workflow-editor-custom"
  const customTarget = customWorkflow && n.anchor?.kind === "target" ? n.anchor.days : null
  const outsideEventTarget = customTarget !== null && customTarget < 0 ? false : customTarget === 0 ? d.club > ev!.date : d.club >= (ev?.date ?? "")
  if (ev && n.phase !== "close" && !isCheckin && outsideEventTarget)
    out.push({ code: "after_event", severity: "error", text: `Planned finish ${fmtLong(d.club)} is not before the event (${fmtLong(ev.date)}).` })
  if (ev && isCheckin && today === ev.date)
    out.push({ code: "checkin_due", severity: "error", text: "Check-in materials are still incomplete on event day." })
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
  if (finals) issues.push({ code: "finals", severity: "error", ruleId: "R13", text: `${fmtLong(ev.date)} is during ${finals.label}. ASU does not allow events then (${ruleSourceName("R13")}).` })
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
  const missed = nodes.filter(n => out.nodes[n.id]?.issues.some(i => i.code === "official_missed" || i.code === "after_event" || i.code === "checkin_due"))
  if (missed.length) issues.push({ code: "plan_misses", severity: "error", text: `${plural(missed.length, "step")} cannot finish in time with the current plan.` })
  if (looped.length) issues.push({ code: "loop", severity: "error", text: `Steps wait for each other in a loop: ${looped.map(n => n.title).join("; ")}.` })
  return issues
}

export function computeSchedule(state: DemoState): Schedule {
  const ctx: Ctx = { state, byId: new Map(state.nodes.map(n => [n.id, n])) }
  const out: Schedule = { nodes: {}, events: {} }
  for (const ev of state.events) planEvent(ctx, ev, out)
  for (const n of state.nodes) if (!n.eventId || n.clubTask || !state.events.some(e => e.id === n.eventId)) planStandalone(ctx, n, out)
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
  // This intentionally follows business meaning instead of playbook keys.  It works for the
  // v2 budget route and for a saved legacy graph while those records are being migrated.
  const steps = state.nodes.filter(n => n.eventId === eventId && n.phase === "money" && !!n.officialDeadline)
  return steps.map(n => n.officialDeadline).filter((d): d is string => !!d).sort()[0] ?? null
}
