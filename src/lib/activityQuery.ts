import type { ActivityEvent, DemoState } from "../data/types"
import { daysBetween } from "./dates"

/**
 * Pure read helpers over the activity record (R0, docs/feedback-fix/CHEERS_R0_CONTRACT.md §4). Nothing in the interface uses them
 * yet; R1 and R2 build on them. Every result is in recording order (`seq`) and never changes the record.
 */

const record = (s: Pick<DemoState, "activity">): ActivityEvent[] =>
  Array.isArray(s.activity) ? [...s.activity].sort((a, b) => a.seq - b.seq) : []
const numberFact = (e: ActivityEvent, key: string) => { const v = e.facts?.[key]; return typeof v === "number" ? v : 0 }

/** Events about a person (they are in `personIds`) or done by them (`actorId`). */
export function eventsForPerson(s: Pick<DemoState, "activity">, personId: string): ActivityEvent[] {
  return record(s).filter(e => e.actorId === personId || (Array.isArray(e.personIds) && e.personIds.includes(personId)))
}

/** Every event of one task, including the ones recorded before it was removed. */
export function eventsForTask(s: Pick<DemoState, "activity">, nodeId: string): ActivityEvent[] {
  return record(s).filter(e => e.nodeId === nodeId)
}

export interface FirstResponse {
  /** The task's latest `task.assigned` or `reminder.recorded` event. */
  trigger: ActivityEvent
  /** The first `task.claimed` or `task.status` event after it by a person the trigger was about, or null while there is none. */
  response: ActivityEvent | null
  /** Calendar days from the trigger to the response (0 = same day), or null without a response. */
  days: number | null
}

/**
 * How quickly a task's person answered its latest assignment or reminder. Only an answer by someone the trigger is about
 * (the new owner, or the reminded owner) counts, so a status change written by the same assignment action is not mistaken for
 * the owner's reply. Null when the task was never assigned or reminded.
 */
export function firstResponse(s: Pick<DemoState, "activity">, nodeId: string): FirstResponse | null {
  const events = eventsForTask(s, nodeId)
  const trigger = events.filter(e => e.kind === "task.assigned" || e.kind === "reminder.recorded").at(-1)
  if (!trigger) return null
  const response = events.find(e => e.seq > trigger.seq && (e.kind === "task.claimed" || e.kind === "task.status")
    && e.actorId !== null && Array.isArray(trigger.personIds) && trigger.personIds.includes(e.actorId)) ?? null
  return { trigger, response, days: response ? daysBetween(trigger.on, response.on) : null }
}

/** A person's `task.done` events from `from` to `to` (demo dates, both included) that came with written details or files. */
export function deliveredWithDetails(s: Pick<DemoState, "activity">, personId: string, from: string, to: string): ActivityEvent[] {
  return record(s).filter(e => e.kind === "task.done" && e.on >= from && e.on <= to && Array.isArray(e.personIds) && e.personIds.includes(personId)
    && (numberFact(e, "detailsChars") > 0 || numberFact(e, "files") > 0))
}
