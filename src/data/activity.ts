import type { ActivityEvent, ActivityFact, Cheer, DemoState, Event, Node, Nudge, PlaybookAnswer, RoleHandoff } from "./types"
import type { ReminderDelivery } from "../reminders/contracts"
import { ACTIVITY_KINDS, isActivityFact, liveActivityId, nextActivitySeq } from "./activityIds"
import { daysBetween } from "../lib/dates"

/**
 * Live activity events (R0, docs/feedback-fix/CHEERS_R0_CONTRACT.md §3–§4). The reducer hands over the state before and after
 * one action; this file compares them by ID and writes one event per meaningful change. Facts are IDs, enums, numbers,
 * booleans and demo dates only: titles, details, reasons, names and email addresses never enter the record.
 */

/** A live event before `withActivity` numbers it. */
export type DerivedActivity = Omit<ActivityEvent, "id" | "seq">

/** Actions whose task completions come from the event budget (Event Budget is the completion authority for financial steps). */
const BUDGET_ACTIONS = new Set([
  "budgetLineAdd", "budgetLineUpdate", "budgetLineDelete",
  "startFunding", "advanceFunding", "fundingAmount", "fundingSpend", "fundingSpendBy", "fundingPackage",
])
const HANDOFF_STEPS = ["confirmed", "approved", "completed", "reviewed"] as const
/** The demo clock is moved by the lead, but what it triggers is done by the club's schedule, not a person. */
export const CLOCK_ACTOR = "system:clock"

const kindRank = (kind: string) => { const i = ACTIVITY_KINDS.indexOf(kind as never); return i < 0 ? ACTIVITY_KINDS.length : i }
const people = (...ids: unknown[]): string[] => [...new Set(ids.filter((id): id is string => typeof id === "string" && id.length > 0))]
/** Keeps every fact inside the record's rules: a value that is not a short ID, enum, number, boolean or date becomes null. */
const clean = (facts: Record<string, unknown>): Record<string, ActivityFact> =>
  Object.fromEntries(Object.entries(facts).map(([key, value]) => [key, isActivityFact(value) ? value : null]))
/**
 * Saved data can be malformed (an old or hand-edited file); the reducer must never fail because of the record. These readers keep
 * only entries that are objects with a string key, so a broken entry is skipped instead of throwing.
 */
const list = (v: unknown): unknown[] => Array.isArray(v) ? v : []
const keyed = <T>(v: unknown, key = "id"): T[] =>
  list(v).filter(x => !!x && typeof x === "object" && typeof (x as Record<string, unknown>)[key] === "string") as T[]
type Submission = { id: string; authorId?: unknown; details?: unknown; attachmentIds?: unknown }
const submissionsOf = (n: Node) => keyed<Submission>(n.taskWork?.submissions)
const submissionFacts = (s: Submission | undefined) => ({
  detailsChars: typeof s?.details === "string" ? s.details.length : 0,
  files: Array.isArray(s?.attachmentIds) ? s.attachmentIds.length : 0,
})
const targetChanges = (n: Node) => list(n.targetDates?.changes).length
const deliveriesOf = (s: DemoState) => keyed<ReminderDelivery>(s.reminderRuntime?.deliveries)
const answersOf = (s: DemoState) => keyed<PlaybookAnswer>(s.playbook?.answers)
const votersOf = (a: PlaybookAnswer | undefined, side: "up" | "down") => list(a?.votes?.[side]).filter((id): id is string => typeof id === "string")
const cheersOf = (s: DemoState) => keyed<Cheer>(s.cheers && typeof s.cheers === "object" ? s.cheers.cheers : undefined)

/**
 * The events one action produced, without `id` and `seq`, in recording order: by node order in `next.nodes` (removed nodes
 * after, in their former order), then by the kind order of contract §3. Pure and deterministic.
 */
export function deriveActivity(prev: DemoState, next: DemoState, action: { type: string }, actorId: string): DerivedActivity[] {
  const on = next.today, actor = action.type === "advanceClock" ? CLOCK_ACTOR : actorId
  const found: { node: number; kind: number; order: number; event: DerivedActivity }[] = []
  const prevNodes = keyed<Node>(prev.nodes), nextNodes = keyed<Node>(next.nodes)
  const nodeIndex = new Map(nextNodes.map((n, i) => [n.id, i]))
  const removedIndex = new Map(prevNodes.filter(n => !nodeIndex.has(n.id)).map((n, i) => [n.id, nextNodes.length + i]))
  const indexOf = (nodeId: unknown) => typeof nodeId !== "string" ? Infinity : nodeIndex.get(nodeId) ?? removedIndex.get(nodeId) ?? Infinity
  const add = (kind: string, personIds: string[], extra: { nodeId?: unknown; eventId?: unknown; facts?: Record<string, unknown>; actorId?: string } = {}) => {
    const event: DerivedActivity = { on, actorId: extra.actorId ?? actor, kind, personIds, source: "live" }
    if (typeof extra.nodeId === "string") event.nodeId = extra.nodeId
    if (typeof extra.eventId === "string") event.eventId = extra.eventId
    if (extra.facts && Object.keys(extra.facts).length) event.facts = clean(extra.facts)
    found.push({ node: indexOf(extra.nodeId), kind: kindRank(kind), order: found.length, event })
  }

  // Tasks.
  const before = new Map(prevNodes.map(n => [n.id, n]))
  // Tasks the record saw removed: one that appears again (the chart's Undo) is marked restored, so counts of created tasks can skip it.
  let removedBefore: Set<string> | undefined
  const wasRemoved = (nodeId: string) => (removedBefore ??= new Set(list(prev.activity).flatMap(e => {
    const x = e as Partial<ActivityEvent> | null
    return x && typeof x === "object" && x.kind === "task.removed" && typeof x.nodeId === "string" ? [x.nodeId] : []
  }))).has(nodeId)
  for (const n of nextNodes) {
    const old = before.get(n.id), at = { nodeId: n.id, eventId: n.eventId }
    if (!old) {
      add("task.created", people(n.ownerId), { ...at, facts: { status: n.status, eventId: n.eventId, ...(wasRemoved(n.id) ? { restored: true } : {}) } })
      // A task created for someone is also an assignment, as the backfill reads it from assignedOn (contract §3, amended at integration).
      if (n.ownerId && !wasRemoved(n.id)) add("task.assigned", people(n.ownerId), { ...at, facts: { from: null } })
      continue
    }
    if (n.ownerId && n.ownerId !== old.ownerId) add("task.assigned", people(n.ownerId), { ...at, facts: { from: old.ownerId } })
    // A claim is the owner accepting the task (in the app or through their task link). A lead giving an unclaimed task to someone
    // also sets acceptedOn, but that is an assignment, recorded above and as the status change below (contract §3, amended).
    if (old.status === "unclaimed" && n.status !== "unclaimed" && n.acceptedOn && n.acceptedOn !== old.acceptedOn && n.ownerId && actor === n.ownerId) add("task.claimed", people(n.ownerId), at)
    if (n.status !== old.status) add("task.status", people(n.ownerId), { ...at, facts: { from: old.status, to: n.status } })
    if (n.waitingOnPersonId && n.waitingOnPersonId !== old.waitingOnPersonId) add("task.waiting_on", people(n.waitingOnPersonId), { ...at, facts: { ownerId: n.ownerId } })
    if ((n.clubDeadlineOverride ?? null) !== (old.clubDeadlineOverride ?? null) || targetChanges(n) > targetChanges(old))
      add("task.target_changed", people(n.ownerId), { ...at, facts: { from: old.clubDeadline, to: n.clubDeadline } })
    const submitted = new Set(submissionsOf(old).map(s => s.id)), submissions = submissionsOf(n)
    submissions.forEach((s, index) => {
      if (submitted.has(s.id)) return
      add("task.submitted", people(typeof s.authorId === "string" ? s.authorId : null), { ...at, facts: { ...submissionFacts(s), revision: index + 1 } })
    })
    if (n.status === "done" && old.status !== "done") {
      const completedOn = n.completedOn ?? on, deadline = n.clubDeadline
      add("task.done", people(n.ownerId), { ...at, facts: {
        onTime: deadline ? completedOn <= deadline : true,
        daysEarly: deadline ? daysBetween(completedOn, deadline) : null,
        ...submissionFacts(submissions.at(-1)),
        viaBudget: BUDGET_ACTIONS.has(action.type),
      } })
    }
    if (old.status === "done" && n.status !== "done") add("task.reopened", people(n.ownerId), { ...at, facts: { to: n.status } })
  }
  for (const old of prevNodes) if (!nodeIndex.has(old.id)) add("task.removed", people(old.ownerId), { nodeId: old.id, eventId: old.eventId, facts: { status: old.status } })

  // Reminders: legacy nudges, and deliveries of the versioned reminder plan (which records reminders there instead of in nudges).
  // `recipientId` tells a reminder to the owner from one to the person the owner waits on (src/lib/activityQuery.ts firstResponse).
  const nodeOf = (nodeId: unknown) => typeof nodeId === "string" ? nextNodes[nodeIndex.get(nodeId) ?? -1] ?? before.get(nodeId) : undefined
  const ownerOf = (nodeId: unknown) => nodeOf(nodeId)?.ownerId ?? null, eventOf = (nodeId: unknown) => nodeOf(nodeId)?.eventId ?? null
  const oldNudges = new Set(keyed<Nudge>(prev.nudges).map(x => x.id))
  // A legacy nudge always went to the task's owner.
  for (const x of keyed<Nudge>(next.nudges)) if (!oldNudges.has(x.id))
    add("reminder.recorded", people(ownerOf(x.nodeId)), { nodeId: x.nodeId, eventId: eventOf(x.nodeId), facts: { via: x.via ?? null, channel: x.channel, recipientId: ownerOf(x.nodeId) } })
  const oldDeliveries = new Set(deliveriesOf(prev).map(d => d.id))
  for (const d of deliveriesOf(next)) if (!oldDeliveries.has(d.id))
    add("reminder.recorded", people(d.ownerId, d.recipientId), { nodeId: d.nodeId, eventId: eventOf(d.nodeId), facts: { via: d.via, channel: d.message?.channel ?? null, recipientId: d.recipientId } })

  // Events.
  const oldEvents = new Set(keyed<Event>(prev.events).map(e => e.id))
  for (const e of keyed<Event>(next.events)) if (!oldEvents.has(e.id)) add("event.created", [], { eventId: e.id, facts: { date: e.date } })

  // Playbook answers and votes.
  const oldAnswers = new Map(answersOf(prev).map(a => [a.id, a]))
  for (const a of answersOf(next)) {
    const old = oldAnswers.get(a.id)
    if (!old) add("playbook.answer_added", people(a.authorId), { facts: { questionId: a.questionId, answerKind: a.kind } })
    for (const side of ["up", "down"] as const) {
      const had = new Set(votersOf(old, side))
      for (const voter of votersOf(a, side)) if (!had.has(voter)) add("playbook.voted", people(voter), { facts: { answerId: a.id, vote: side } })
    }
  }

  // Handoff steps.
  const oldHandoffs = new Map<string, RoleHandoff>()
  for (const h of keyed<RoleHandoff>(prev.handoffRoles, "roleId")) if (!oldHandoffs.has(h.roleId)) oldHandoffs.set(h.roleId, h)
  for (const h of keyed<RoleHandoff>(next.handoffRoles, "roleId")) {
    const old = oldHandoffs.get(h.roleId)
    for (const step of HANDOFF_STEPS) if (h[step] === true && old?.[step] !== true)
      add("handoff.step", people(h.outgoingId, h.incomingId), { facts: { roleId: h.roleId, step } })
  }

  // Cheers (R1, docs/feedback-fix/CHEERS_R1_CONTRACT.md §2): the sender is the actor. IDs and numbers only: never the note, and
  // for the people the sender let know (R1.1, §8.9) only how many (`cc`, when there are any), never who.
  const oldCheers = new Map(cheersOf(prev).map(c => [c.id, c]))
  for (const c of cheersOf(next)) {
    const old = oldCheers.get(c.id), recipients = people(...list(c.toIds)), sender = typeof c.fromId === "string" ? c.fromId : undefined
    const cc = people(...list(c.ccIds)).length
    if (!old) add("cheer.sent", recipients, { actorId: sender, nodeId: c.nodeId || undefined, facts: {
      cheerId: c.id, points: c.points, recipients: recipients.length, noteChars: typeof c.note === "string" ? c.note.length : 0, card: c.card, email: c.email === true,
      ...(cc ? { cc } : {}),
    } })
    if (c.withdrawnOn && !old?.withdrawnOn) add("cheer.withdrawn", recipients, { actorId: sender, facts: { cheerId: c.id } })
  }

  return found.sort((a, b) => a.node - b.node || a.kind - b.kind || a.order - b.order).map(k => k.event)
}

/**
 * Appends this action's events to `next.activity` (append only; earlier events are never edited). Returns `next` itself when
 * nothing is recorded, so `next === state` checks and Undo keep working. A state that was never backfilled (no `activity`)
 * gains only the new events: backfill is src/data/activityBackfill.ts's job.
 */
export function withActivity(prev: DemoState, next: DemoState, action: { type: string }, actorId: string): DemoState {
  const derived = deriveActivity(prev, next, action, actorId)
  if (!derived.length) return next
  // Loading and import sanitize the record (activityBackfill.ts); this only guards against a broken entry throwing here.
  const record = Array.isArray(next.activity) ? next.activity : [], first = nextActivitySeq(record.filter(e => !!e && typeof e === "object"))
  const added: ActivityEvent[] = derived.map((event, i) => ({ id: liveActivityId(first + i), seq: first + i, ...event }))
  return { ...next, activity: [...record, ...added] }
}
