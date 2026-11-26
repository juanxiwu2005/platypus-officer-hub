import type { ActivityEvent, ActivityFact, ActivityKind } from "./types"

/**
 * Shared helpers for the activity record (R0, docs/feedback-fix/CHEERS_R0_CONTRACT.md). Owned by the main agent so that
 * src/data/activity.ts (live events) and src/data/activityBackfill.ts (events rebuilt from older records) agree on IDs and order.
 */

/** Every kind this version writes. Readers must still accept other strings (an imported file from a later version). */
export const ACTIVITY_KINDS: readonly ActivityKind[] = [
  "task.created", "task.removed", "task.assigned", "task.claimed", "task.status", "task.waiting_on", "task.target_changed",
  "task.submitted", "task.done", "task.reopened", "reminder.recorded", "event.created",
  "playbook.answer_added", "playbook.voted", "handoff.step",
  "cheer.sent", "progress.milestone",
]

/** The next unused sequence number (1 for an empty or missing record). */
export const nextActivitySeq = (events: readonly ActivityEvent[] | undefined): number =>
  (events ?? []).reduce((max, e) => Math.max(max, Number.isInteger(e.seq) ? e.seq : 0), 0) + 1

/** ID of a live event. */
export const liveActivityId = (seq: number): string => `act:${seq}`

/** ID of a backfilled event: stable for the same kind and subject, so running the backfill twice cannot duplicate it. */
export const backfillActivityId = (kind: string, subject: string): string => `act:bf:${kind}:${subject}`

/** A fact value: an ID, an enum, a number, a boolean, a demo date or null. Strings are capped so free text cannot slip in at length. */
export const FACT_TEXT_MAX = 64
export const isActivityFact = (v: unknown): v is ActivityFact =>
  v === null || typeof v === "boolean" || (typeof v === "number" && Number.isFinite(v)) || (typeof v === "string" && v.length <= FACT_TEXT_MAX)

/** The most events one record keeps before Settings warns (decision D7: nothing is dropped). */
export const ACTIVITY_WARN_AT = 15000
