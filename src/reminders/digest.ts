import type { Action } from "../data/store"
import type { DemoState } from "../data/types"
import type { DigestRecordResult, PreparedDigest, ReminderDigestGroup, ReminderDigestPlan } from "./digestContracts"
import type { ReminderDelivery } from "./contracts"
import { buildReminderInput, reminderPeople } from "./facts"
import { planReminders } from "./engine"
import { importantReminder } from "./policy"
import { isReminderRuntime } from "./runtime"

type Store = { getState: () => DemoState; tryDispatch: (a: Action) => boolean }

/**
 * SKELETON (2026-11-19 contract). Grouping works now so the UI can be built against real data;
 * the engine work replaces the bodies (limits per email, digest mail, recording) without changing signatures.
 */
export function planReminderDigests(state: DemoState): ReminderDigestPlan {
  if (!isReminderRuntime(state.reminderRuntime) || state.reminderRuntime.version !== 2) return { groups: [], blocked: [], upcoming: [] }
  const plan = planReminders(buildReminderInput(state, state.reminderRuntime))
  const people = new Map(reminderPeople(state).map(p => [p.id, p]))
  const order: string[] = [], byRecipient = new Map<string, ReminderDigestGroup["candidates"]>()
  for (const c of plan.ready) {
    if (!byRecipient.has(c.recipientId)) { byRecipient.set(c.recipientId, []); order.push(c.recipientId) }
    byRecipient.get(c.recipientId)!.push(c)
  }
  const groups = order.map(recipientId => {
    const candidates = byRecipient.get(recipientId)!
    return { id: JSON.stringify(["digest", recipientId, state.today, ...candidates.map(c => c.id)]), recipientId,
      recipientName: people.get(recipientId)?.name ?? "Former member", candidates,
      important: candidates.some(c => importantReminder(c, state.today)) }
  })
  return { groups, blocked: plan.blocked, upcoming: plan.upcoming }
}

/** Issue (and save) the task links for one group and build its per-task and combined email. */
export async function prepareReminderDigest(_store: Store, _groupId: string, _origin: string, _via: ReminderDelivery["via"]): Promise<PreparedDigest | { error: string }> {
  return { error: "Not implemented yet." }
}

/** Record prepared groups in one store action. Each group is all-or-nothing. */
export function recordReminderDigests(_store: Store, prepared: PreparedDigest[], _via: ReminderDelivery["via"]): DigestRecordResult {
  return { recordedGroupIds: [], failedGroupIds: prepared.map(p => p.groupId), error: "Not implemented yet." }
}

/** Prepare and record several groups ("Send all", automatic mode). */
export async function sendReminderDigests(_store: Store, groupIds: string[], _origin: string, _via: "platypus" | "automatic", _isCurrent: () => boolean = () => true): Promise<DigestRecordResult> {
  return { recordedGroupIds: [], failedGroupIds: groupIds, error: "Not implemented yet." }
}
