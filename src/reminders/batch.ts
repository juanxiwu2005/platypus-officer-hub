import type { DemoState } from "../data/types"
import type { ReminderBatch } from "./deliveryContracts"
import { reminderBatchContext } from "./deliveryContracts"
import { canLead } from "../data/permissions"
import { isReminderRuntime } from "./runtime"
import { taskAccessIssueValid, taskAccessToken, usableTaskAccessGrant } from "./taskAccess"
import { confirmPlannedReminder } from "./adapter"
import { buildReminderInput } from "./facts"
import { planReminders } from "./engine"

/** Each entry is checked against the state left by the previous entry, including recipient limits. */
export function recordReminderBatch(s: DemoState, batch: ReminderBatch): DemoState {
  if (!isReminderRuntime(s.reminderRuntime) || s.reminderRuntime.version !== 2 || !batch || !Array.isArray(batch.entries)) return s
  if (JSON.stringify(batch.context) !== JSON.stringify(reminderBatchContext(s))) return s
  if (batch.via === "automatic" ? s.org.settings.reminderMode !== "auto_email" : batch.via !== "platypus" || s.org.settings.reminderMode !== "review_then_auto" || !canLead(s)) return s
  if (s.taskAccessGrants !== undefined && !Array.isArray(s.taskAccessGrants)) return s
  const order = new Map(planReminders(buildReminderInput(s, s.reminderRuntime)).ready.map((c, index) => [c.id, index]))
  let next = s
  for (const entry of batch.entries.slice(0, 200).sort((a, b) => (order.get(a?.candidateId) ?? Infinity) - (order.get(b?.candidateId) ?? Infinity))) {
    try {
      const grant = entry.grant
      const old = usableTaskAccessGrant(next, taskAccessToken(grant))
      if (!old && (!taskAccessIssueValid(next, grant, batch.via === "automatic") || next.taskAccessGrants?.some(g => g?.id === grant.id))) continue
      const prepared = old ? next : { ...next, taskAccessGrants: [...(next.taskAccessGrants ?? []), grant] }
      const recorded = confirmPlannedReminder(prepared, entry.candidateId, batch.via, entry.message)
      if (recorded.reminderRuntime !== prepared.reminderRuntime) next = recorded
    } catch { /* A stale or malformed entry cannot abort or falsely record the rest of the batch. */ }
  }
  return next
}
