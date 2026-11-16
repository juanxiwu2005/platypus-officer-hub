import type { DemoState, Node, NodeStatus, ReminderMode } from "../data/types"
import { forecastFor } from "../engine/forecast"
import { nudgeBlocked } from "./nudges"
import { addDays, daysBetween } from "./dates"

/**
 * FB-8 (docs/feedback-fix/PLAN.md §12.2): the reminder centre, as one pure function of the demo state.
 * Every date comes from the rule engine: a task's send day is the engine's `latestStart`, its Due is `clubDeadline`.
 * Nothing here works out a date of its own; it only compares the engine's ISO dates with the demo `today`
 * ("within 7 days", "2 days without a reply"). Nothing is ever sent: an automatic send is only shown, never written.
 */

/** How a reminder went out. `would` = Send automatically, derived on the send day and never stored. `followup` = the silence protocol's simulated reminder. */
export type SentKind = "president" | "platypus" | "would" | "followup"

export interface QueueItem {
  node: Node
  ownerId: string
  /** The engine's send day (latestStart). */
  sendDay: string | null
  /** Forecast red: listed first, with a risk mark. */
  risk: boolean
  /** Why no reminder can be prepared now (nudgeBlocked), or null. */
  blocked: string | null
}
export interface SentItem extends QueueItem { id: string; on: string; kind: SentKind; sentBy?: string }
export interface ReplyItem extends QueueItem { sentOn: string; reply: string }
export interface WaitItem extends QueueItem { sentOn: string; days: number }

export interface ReminderQueue {
  mode: ReminderMode | null
  /** The two review modes and no mode: send-day items wait for a lead. Send automatically: they go straight to Sent. */
  review: boolean
  needsOk: QueueItem[]
  thisWeek: QueueItem[]
  sent: SentItem[]
  replies: ReplyItem[]
  noReply: WaitItem[]
}

/** Days without any update after a reminder before it counts as "No reply yet". */
export const NO_REPLY_DAYS = 2
/** "This week": a send day from tomorrow up to this many days ahead. */
export const WEEK_DAYS = 7

/** What the owner answered, in the reply buttons' words (the reminder's response), or the task's state when they changed it another way. */
const RESPONSE_WORD: Record<NodeStatus, string> = { accepted: "Claimed", done: "Done", waiting: "Waiting on…", blocked: "Need help", in_progress: "Need more time", unclaimed: "Not claimed" }
const STATUS_WORD: Record<NodeStatus, string> = { accepted: "Claimed", done: "Done", waiting: "Waiting on…", blocked: "Need help", in_progress: "Working on it", unclaimed: "Not claimed" }
function replyWord(n: Node, status: NodeStatus, fromResponse: boolean) {
  if (status === "waiting" && n.waitingOn?.trim()) return `Waiting on ${n.waitingOn.trim()}`
  return (fromResponse ? RESPONSE_WORD : STATUS_WORD)[status]
}

interface Send { id: string; nodeId: string; on: string; kind: SentKind; sentBy?: string; response: NodeStatus | null }

/** Every reminder that really went out in the demo record: reminders a lead recorded, and the silence protocol's simulated ones. */
function recordedSends(s: DemoState): Send[] {
  return [
    ...s.nudges.map(x => ({ id: x.id, nodeId: x.nodeId, on: x.sentOn, kind: (x.via === "platypus" ? "platypus" : "president") as SentKind, sentBy: x.sentBy, response: x.response })),
    ...s.protocolLog.filter(e => e.kind === "reminder" && e.recipientIds.length).map(e => ({ id: e.id, nodeId: e.nodeId, on: e.scheduledOn, kind: "followup" as const, response: null })),
  ]
}

export function reminderQueue(s: DemoState): ReminderQueue {
  const mode = s.org.settings.reminderMode ?? null
  const review = mode !== "auto_email"
  const forecast = forecastFor(s)
  const item = (n: Node): QueueItem => ({ node: n, ownerId: n.ownerId!, sendDay: n.latestStart, risk: forecast.nodes[n.id]?.color === "red", blocked: nudgeBlocked(s, n) })
  const owned = s.nodes.filter(n => !!n.ownerId)
  const open = owned.filter(n => n.status !== "done")
  const recorded = recordedSends(s)
  // A send day has come when it is today or earlier and nothing went out on or after it.
  const due = open.filter(n => n.latestStart && n.latestStart <= s.today && !recorded.some(x => x.nodeId === n.id && x.on >= n.latestStart!))
  const derived: Send[] = review ? [] : due.map(n => ({ id: `auto:${n.id}:${n.latestStart}`, nodeId: n.id, on: n.latestStart!, kind: "would", response: null }))
  const sends = [...recorded, ...derived]
  const byId = new Map(owned.map(n => [n.id, n]))

  const needsOk = review ? due.map(item) : []
  const weekEnd = addDays(s.today, WEEK_DAYS)
  const thisWeek = open.filter(n => n.latestStart && n.latestStart > s.today && n.latestStart <= weekEnd).map(item)
  const sent: SentItem[] = sends.filter(x => byId.has(x.nodeId)).map(x => ({ ...item(byId.get(x.nodeId)!), id: x.id, on: x.on, kind: x.kind, sentBy: x.sentBy }))

  const replies: ReplyItem[] = [], noReply: WaitItem[] = []
  for (const n of owned) {
    const mine = sends.filter(x => x.nodeId === n.id).sort((a, b) => b.on.localeCompare(a.on))
    if (!mine.length) continue
    const latest = mine[0]
    const answered = s.nudges.filter(x => x.nodeId === n.id && x.sentOn >= latest.on && x.response !== null).at(-1)
    if (answered) { replies.push({ ...item(n), sentOn: latest.on, reply: replyWord(n, answered.response!, true) }); continue }
    if (n.lastUpdate && n.lastUpdate > latest.on) { replies.push({ ...item(n), sentOn: latest.on, reply: replyWord(n, n.status, false) }); continue }
    const days = daysBetween(latest.on, s.today)
    if (n.status !== "done" && days >= NO_REPLY_DAYS) noReply.push({ ...item(n), sentOn: latest.on, days })
  }

  // Forecast red first in every section, then by date, then by id so the order never jumps.
  const riskFirst = <T extends QueueItem>(date: (x: T) => string, newest = false) => (a: T, b: T) =>
    Number(b.risk) - Number(a.risk) || (newest ? date(b).localeCompare(date(a)) : date(a).localeCompare(date(b))) || a.node.id.localeCompare(b.node.id)
  const bySend = riskFirst<QueueItem>(x => x.sendDay ?? "9999-12-31")
  return {
    mode, review,
    // Needs your OK shows each Due, so it reads in Due order; This week shows the send day, so it reads in that order.
    needsOk: needsOk.sort(riskFirst<QueueItem>(x => x.node.clubDeadline ?? "9999-12-31")),
    thisWeek: thisWeek.sort(bySend),
    sent: sent.sort(riskFirst<SentItem>(x => x.on, true)),
    replies: replies.sort(riskFirst<ReplyItem>(x => x.sentOn, true)),
    noReply: noReply.sort(riskFirst<WaitItem>(x => x.sentOn)),
  }
}

export interface YourReminders {
  /** Your open tasks whose send day is today or later: when each reminder goes out. */
  upcoming: QueueItem[]
  /** Reminders that went out for your tasks, newest first. */
  received: SentItem[]
}

/** The read-only view for an officer who is not the president or VP: their own tasks only. */
export function yourReminders(s: DemoState, viewerId: string): YourReminders {
  const q = reminderQueue(s)
  const forecast = forecastFor(s)
  const upcoming = s.nodes.filter(n => n.ownerId === viewerId && n.status !== "done" && n.latestStart && n.latestStart >= s.today)
    .map(n => ({ node: n, ownerId: viewerId, sendDay: n.latestStart, risk: forecast.nodes[n.id]?.color === "red", blocked: null }))
    .sort((a, b) => a.sendDay!.localeCompare(b.sendDay!) || a.node.id.localeCompare(b.node.id))
  const received = q.sent.filter(x => x.ownerId === viewerId).sort((a, b) => b.on.localeCompare(a.on) || a.node.id.localeCompare(b.node.id))
  return { upcoming, received }
}

/** Approve all (review_then_auto): the items one click can approve now, i.e. not held back by a reminder limit. */
export const approvable = (q: ReminderQueue) => q.mode === "review_then_auto" ? q.needsOk.filter(x => !x.blocked) : []
