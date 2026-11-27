import type { ActivityEvent, ActivityFact, Contribution, DemoState, Node } from "./types"
import { ACTIVITY_KINDS, backfillActivityId, isActivityFact } from "./activityIds"
import { playbookOf } from "./playbook"

/**
 * Backfill and sanitizing of the activity record (R0, docs/feedback-fix/CHEERS_R0_CONTRACT.md §5).
 *
 * - A state that never had a record (an older save, the seed, a reset demo, an imported file without one) gets one rebuilt from
 *   the records it already holds: assignments, claims, submissions, completions, reminders (legacy nudges and reminder plan v2
 *   deliveries), events and Playbook answers.
 * - A state that has a record keeps it, sanitized: malformed events and facts are dropped, nothing valid is changed.
 *
 * Only IDs, demo dates, enums, counts and booleans enter the record: never task titles, details text, names or email addresses.
 * Both functions are pure and deterministic, and return the same object when nothing changes.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
/** A real calendar date written as YYYY-MM-DD (rejects 2026-02-30 and similar). */
function isIsoDate(v: unknown): v is string {
  if (typeof v !== "string" || !ISO_DATE.test(v)) return false
  const [y, m, d] = v.split("-").map(Number)
  const t = new Date(Date.UTC(y, m - 1, d))
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d
}
/** Calendar days from `a` to `b` (positive when `b` is later). Both are valid ISO dates. */
function calendarDays(a: string, b: string): number {
  const utc = (v: string) => { const [y, m, d] = v.split("-").map(Number); return Date.UTC(y, m - 1, d) }
  return Math.round((utc(b) - utc(a)) / 86_400_000)
}

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v)
const isString = (v: unknown): v is string => typeof v === "string"
const nonEmpty = (v: unknown): v is string => typeof v === "string" && v.length > 0

/** Keeps only the facts a record may hold (contract §2). */
function cleanFacts(raw: Record<string, unknown>): Record<string, ActivityFact> {
  const out: Record<string, ActivityFact> = {}
  for (const [k, v] of Object.entries(raw)) if (isActivityFact(v)) out[k] = v
  return out
}

const EVENT_KEYS = new Set(["id", "seq", "on", "actorId", "kind", "personIds", "nodeId", "eventId", "facts", "source"])

/** Longest ID (event, actor, person, task or club event) and kind a record keeps (contract §5): longer text is not an ID. */
const ID_MAX = 128
const KIND_MAX = 64
/**
 * Highest `seq` kept. The contract asks for a safe integer; this also leaves room above it, so the live events numbered after an
 * imported one stay safe integers (`seq: Number.MAX_SAFE_INTEGER` would make the next live seq unsafe, then dropped on reload).
 * A browser's storage holds a few tens of thousands of events, far below this.
 */
const SEQ_MAX = 1_000_000_000
const LIVE_ID = /^act:(\d+)$/
const isId = (v: unknown): v is string => nonEmpty(v) && v.length <= ID_MAX
const usableId = (v: unknown) => v === undefined || isId(v)

/**
 * One event from saved or imported data, or null when it cannot be kept. Returns the original object when it is already clean.
 * Optional fields of the wrong type or length, person IDs that are too long, facts that fail `isActivityFact`, and unknown fields
 * (which could carry free text) are removed. A live-style ID (`act:<n>`) must carry its own seq, so it cannot take the ID of a
 * live event recorded after it.
 */
function cleanEvent(raw: unknown): ActivityEvent | null {
  if (!isObject(raw)) return null
  const { id, seq, on, actorId, kind, personIds, nodeId, eventId, facts, source } = raw
  if (!isId(id) || !Number.isSafeInteger(seq) || (seq as number) < 1 || (seq as number) > SEQ_MAX || !isIsoDate(on)
    || !(actorId === null || (isString(actorId) && actorId.length <= ID_MAX))
    || !nonEmpty(kind) || kind.length > KIND_MAX || !Array.isArray(personIds) || !personIds.every(isString) || (source !== "live" && source !== "backfill")) return null
  const live = LIVE_ID.exec(id)
  if (live && Number(live[1]) !== seq) return null
  const people = (personIds as string[]).filter(p => p.length <= ID_MAX)
  const event: ActivityEvent = { id, seq: seq as number, on, actorId, kind, personIds: people, source }
  if (isId(nodeId)) event.nodeId = nodeId
  if (isId(eventId)) event.eventId = eventId
  if (isObject(facts)) event.facts = cleanFacts(facts)
  const unchanged = Object.keys(raw).every(k => EVENT_KEYS.has(k)) && people.length === personIds.length
    && usableId(nodeId) && usableId(eventId)
    && (facts === undefined || (isObject(facts) && Object.keys(event.facts!).length === Object.keys(facts).length))
  return unchanged ? raw as unknown as ActivityEvent : event
}

/**
 * The valid events of a saved or imported record, sorted by `seq` (contract §5). Unknown kinds are kept (a file from a later
 * version); a duplicate ID keeps its first occurrence. Valid events are returned as the same objects.
 */
export function sanitizeActivity(raw: unknown): ActivityEvent[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const kept: ActivityEvent[] = []
  for (const item of raw) {
    const event = cleanEvent(item)
    if (!event || seen.has(event.id)) continue
    seen.add(event.id)
    kept.push(event)
  }
  // Array.prototype.sort is stable, so events that share a seq keep their saved order.
  return kept.sort((a, b) => a.seq - b.seq)
}

type Draft = Omit<ActivityEvent, "id" | "seq"> & { subject: string }

/** Kind order from contract §3, used to order events of the same day. Unknown kinds go last. */
const kindRank = (kind: string) => { const i = (ACTIVITY_KINDS as readonly string[]).indexOf(kind); return i < 0 ? ACTIVITY_KINDS.length : i }

/**
 * The contribution recorded for this completion: one dated the day the task was completed (an older one belongs to an earlier
 * completion of a reopened task), the owner's when there is one, otherwise any for the task.
 */
function contributionFor(byNode: Map<string, Contribution[]>, node: Node): Contribution | undefined {
  const list = (byNode.get(node.id) ?? []).filter(c => c.completedOn === node.completedOn)
  return list.find(c => c.personId === node.ownerId) ?? list[0]
}

/** The `revision` of a submission: its position among the task's submissions (1 for the first), as live events record it. */
function submissionRevision(_id: string, index: number): number {
  return index + 1
}

/** Events rebuilt from what the state already records (contract §5). Nothing else is guessed: votes and handoff steps have no dates. */
function backfillEvents(s: DemoState): ActivityEvent[] {
  const drafts: Draft[] = []
  const add = (d: Draft) => { if (isIsoDate(d.on)) drafts.push(d) }
  const nodes = Array.isArray(s.nodes) ? s.nodes.filter(n => isObject(n) && nonEmpty(n.id)) : []
  const byNode = new Map<string, Contribution[]>()
  for (const c of Array.isArray(s.contributions) ? s.contributions : []) {
    if (!isObject(c) || !isString(c.nodeId)) continue
    byNode.set(c.nodeId, [...(byNode.get(c.nodeId) ?? []), c])
  }
  const ownerOf = new Map(nodes.map(n => [n.id, nonEmpty(n.ownerId) ? n.ownerId : null]))

  for (const n of nodes) {
    const owner = ownerOf.get(n.id) ?? null
    const people = owner ? [owner] : []
    const where = { nodeId: n.id, ...(nonEmpty(n.eventId) ? { eventId: n.eventId } : {}) }
    // Assigned to a person: who assigned it is not recorded. A task posted to nobody is not an assignment (contract §3).
    if (owner && n.assignedOn) add({ subject: n.id, kind: "task.assigned", on: n.assignedOn, actorId: null, personIds: people, ...where, source: "backfill" })
    // A lead's assignment sets acceptedOn on the day it assigns, like an owner accepting on that day: the two cannot be told
    // apart, so only an acceptance on another day is a claim (contract §5, amended; live claims follow the same meaning, §3).
    if (n.acceptedOn && n.acceptedOn !== n.assignedOn) add({ subject: n.id, kind: "task.claimed", on: n.acceptedOn, actorId: owner, personIds: people, ...where, source: "backfill" })
    const saved = isObject(n.taskWork) ? n.taskWork.submissions : undefined
    const submissions = Array.isArray(saved) ? saved.filter(x => isObject(x) && nonEmpty(x.id)) : []
    submissions.forEach((x, i) => {
      const author = nonEmpty(x.authorId) ? x.authorId : null
      add({
        subject: `${n.id}:${x.id}`, kind: "task.submitted", on: x.savedOn, actorId: author, personIds: author ? [author] : [], ...where, source: "backfill",
        facts: { detailsChars: isString(x.details) ? x.details.length : 0, files: Array.isArray(x.attachmentIds) ? x.attachmentIds.length : 0, revision: submissionRevision(x.id, i) },
      })
    })
    if (n.status === "done" && isIsoDate(n.completedOn)) {
      const deadline = isIsoDate(n.clubDeadline) ? n.clubDeadline : null
      const credit = contributionFor(byNode, n)
      const latest = submissions[submissions.length - 1]
      add({
        subject: n.id, kind: "task.done", on: n.completedOn, actorId: owner, personIds: people, ...where, source: "backfill",
        facts: {
          onTime: typeof credit?.onTime === "boolean" ? credit.onTime : deadline === null || n.completedOn <= deadline,
          daysEarly: deadline === null ? null : calendarDays(n.completedOn, deadline),
          detailsChars: latest && isString(latest.details) ? latest.details.length : 0,
          files: latest && Array.isArray(latest.attachmentIds) ? latest.attachmentIds.length : 0,
          // A backfilled completion cannot tell whether it came from the budget table.
          viaBudget: false,
        },
      })
    }
  }

  // A reminder's task and club event, as the live record writes them.
  const eventOf = new Map(nodes.map(n => [n.id, nonEmpty(n.eventId) ? n.eventId : null]))
  const at = (nodeId: unknown) => isString(nodeId) ? { nodeId, ...(eventOf.get(nodeId) ? { eventId: eventOf.get(nodeId)! } : {}) } : {}
  // A legacy nudge always went to the task's owner.
  for (const x of Array.isArray(s.nudges) ? s.nudges : []) {
    if (!isObject(x) || !nonEmpty(x.id)) continue
    const owner = isString(x.nodeId) ? ownerOf.get(x.nodeId) ?? null : null
    add({
      subject: x.id, kind: "reminder.recorded", on: x.sentOn, actorId: nonEmpty(x.sentBy) ? x.sentBy : null, personIds: owner ? [owner] : [],
      ...at(x.nodeId), source: "backfill",
      facts: { via: x.via === "president" || x.via === "platypus" ? x.via : null, channel: isString(x.channel) ? x.channel : null, recipientId: owner },
    })
  }

  // Reminder plan v2 records its sends as deliveries, with the owner and recipient as they were when it was sent. The ledger does
  // not name who pressed send for a manual or Platypus-drafted reminder, so only automatic sends have an actor.
  const runtime = isObject(s.reminderRuntime) ? s.reminderRuntime : undefined
  for (const d of Array.isArray(runtime?.deliveries) ? runtime.deliveries as unknown[] : []) {
    if (!isObject(d) || !nonEmpty(d.id)) continue
    const owner = nonEmpty(d.ownerId) ? d.ownerId : null, recipient = nonEmpty(d.recipientId) ? d.recipientId : null
    const message = isObject(d.message) ? d.message : undefined
    add({
      subject: d.id, kind: "reminder.recorded", on: d.sentOn as string, actorId: d.via === "automatic" ? "system:reminders" : null,
      personIds: [...new Set([owner, recipient].filter(nonEmpty))], ...at(d.nodeId), source: "backfill",
      facts: { via: isString(d.via) ? d.via : null, channel: isString(message?.channel) ? message.channel : null, recipientId: recipient },
    })
  }

  // The day an event was created is not recorded: it is dated on the state's own day.
  for (const e of Array.isArray(s.events) ? s.events : []) {
    if (!isObject(e) || !nonEmpty(e.id)) continue
    add({ subject: e.id, kind: "event.created", on: s.today, actorId: null, personIds: [], eventId: e.id, source: "backfill", facts: { date: isIsoDate(e.date) ? e.date : null } })
  }

  for (const a of playbookOf(s).answers) {
    const author = nonEmpty(a.authorId) ? a.authorId : null
    add({ subject: a.id, kind: "playbook.answer_added", on: a.on, actorId: author, personIds: author ? [author] : [], source: "backfill", facts: { questionId: a.questionId, answerKind: a.kind } })
  }

  // Cheers (R1): the same facts as the live record (src/data/activity.ts), never the note, and for people let know only a count.
  for (const c of s.cheers && typeof s.cheers === "object" && Array.isArray(s.cheers.cheers) ? s.cheers.cheers : []) {
    if (!isObject(c) || !nonEmpty(c.id) || !nonEmpty(c.fromId)) continue
    const recipients = Array.isArray(c.toIds) ? [...new Set(c.toIds.filter(nonEmpty))] : []
    const cc = Array.isArray(c.ccIds) ? new Set(c.ccIds.filter(nonEmpty)).size : 0
    add({ subject: c.id, kind: "cheer.sent", on: c.on, actorId: c.fromId, personIds: recipients, ...(nonEmpty(c.nodeId) ? { nodeId: c.nodeId } : {}), source: "backfill",
      facts: { cheerId: c.id, points: c.points, recipients: recipients.length, noteChars: typeof c.note === "string" ? c.note.length : 0, card: c.card, email: c.email === true, ...(cc ? { cc } : {}) } })
    if (nonEmpty(c.withdrawnOn)) add({ subject: c.id, kind: "cheer.withdrawn", on: c.withdrawnOn, actorId: c.fromId, personIds: recipients, source: "backfill", facts: { cheerId: c.id } })
  }

  drafts.sort((a, b) => a.on < b.on ? -1 : a.on > b.on ? 1 : kindRank(a.kind) - kindRank(b.kind) || (a.subject < b.subject ? -1 : a.subject > b.subject ? 1 : 0))
  const seen = new Set<string>()
  const events: ActivityEvent[] = []
  for (const { subject, facts, ...rest } of drafts) {
    const id = backfillActivityId(rest.kind, subject)
    if (seen.has(id)) continue // a duplicated record ID in damaged data: the first one wins
    seen.add(id)
    events.push({ id, seq: events.length + 1, ...rest, ...(facts ? { facts: cleanFacts(facts) } : {}) })
  }
  return events
}

/**
 * The state with a usable activity record (contract §5). An existing record is sanitized (the same state when nothing was dropped);
 * a missing one is rebuilt from existing records (an empty array when there is nothing). A value that is not an array cannot hold a
 * record, so it is treated like a missing one and rebuilt.
 */
export function withActivityBackfill(s: DemoState): DemoState {
  const raw = (s as { activity?: unknown }).activity
  if (Array.isArray(raw)) {
    const clean = sanitizeActivity(raw)
    return clean.length === raw.length && clean.every((e, i) => e === raw[i]) ? s : { ...s, activity: clean }
  }
  return { ...s, activity: backfillEvents(s) }
}
