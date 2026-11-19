import type { Channel } from "../data/types"
import type { BlockedReminder, ReminderCandidate, ReminderDelivery } from "./contracts"
import type { PreparedReminder } from "./deliveryContracts"

/**
 * Person digest (Juanxi 2026-11-19, concept F): every ready reminder for one recipient on one day goes out as ONE email.
 * Per-task deliveries, grants and limits stay per task; the digest only groups them and owns the email text.
 * Frozen contract shared by the engine work (digest.ts, engine.ts, batch.ts, store) and the UI work (Today, rail).
 */
export interface ReminderDigestGroup {
  /** Deterministic: JSON.stringify(["digest", recipientId, today, ...candidateIds in group order]). */
  id: string
  recipientId: string
  recipientName: string
  /** Engine priority order (overdue → due → past due → start → follow-ups). Never empty. */
  candidates: ReminderCandidate[]
  /** True when any candidate is due, overdue or past its due date. */
  important: boolean
}
export interface ReminderDigestPlan {
  /** Recipients in priority order of their first candidate. Each group is one email today. */
  groups: ReminderDigestGroup[]
  blocked: BlockedReminder[]
  upcoming: ReminderCandidate[]
}
/** The email actually prepared for a group; saved in runtime.digests once recorded. Rules only, no AI. */
export interface ReminderDigestSnapshot {
  version: 1
  /** "reminder-digest:<sequence>" once recorded. */
  id: string
  groupId: string
  recipientId: string
  recipientName: string
  intendedEmail: string | null
  channel: Channel
  preparedOn: string
  sentOn: string
  via: ReminderDelivery["via"]
  subject: string
  body: string
  /** `${subject}\n\n${body}` */
  text: string
  /** One task entry URL per task, in the same order as the group's candidates. */
  taskUrls: string[]
  nodeIds: string[]
  wordCount: number
  checked: boolean
  source: "rules"
}
/** A group ready to record: per-task grants and per-task mail snapshots plus the combined email. */
export interface PreparedDigest {
  groupId: string
  recipientId: string
  entries: PreparedReminder[]
  digest: Omit<ReminderDigestSnapshot, "id" | "sentOn" | "via">
}
export interface DigestRecordResult {
  recordedGroupIds: string[]
  failedGroupIds: string[]
  /** Plain English for the page, or null. */
  error: string | null
}
