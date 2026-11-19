import type { Action } from "../data/store"
import type { DemoState } from "../data/types"
import type { PreparedReminder } from "./deliveryContracts"
import { reminderBatchContext } from "./deliveryContracts"
import { isReminderRuntime } from "./runtime"
import { buildReminderFacts, buildReminderInput, reminderPeople } from "./facts"
import { planReminders } from "./engine"
import { buildReminderMail } from "./mail"
import { makeTaskAccessGrant, taskAccessToken, taskAccessUrl, verifyTaskAccessGrant } from "./taskAccess"

export interface BatchResult { recordedIds: string[]; failedIds: string[]; error: string | null }
export async function sendReminderBatch(store: {getState: () => DemoState; tryDispatch: (a: Action) => boolean}, candidateIds: string[], origin: string, via: "platypus" | "automatic", isCurrent = () => true): Promise<BatchResult> {
  const requested = [...new Set(candidateIds)]
  const failed = (error: string): BatchResult => ({ recordedIds: [], failedIds: requested, error })
  const state = store.getState()
  if (!isReminderRuntime(state.reminderRuntime) || state.reminderRuntime.version !== 2) return failed("Enable the updated reminder plan first.")
  const candidates = planReminders(buildReminderInput(state, state.reminderRuntime)).ready
  const people = reminderPeople(state), entries: PreparedReminder[] = []
  for (const candidate of candidates.filter(c => requested.includes(c.id)).slice(0, 200)) {
    if (!isCurrent()) return failed("The reminder preparation changed. Please review the latest plan.")
    try {
      const id = candidate.id
      const facts = candidate && buildReminderFacts(state, candidate.nodeId)
      const recipient = candidate && people.find(p => p.id === candidate.recipientId)
      if (!candidate || !facts || !recipient) continue
      const grant = await makeTaskAccessGrant(state, candidate.nodeId, candidate.waitingRequestId, via === "automatic")
      const prepared = { ...state, taskAccessGrants: [...(state.taskAccessGrants ?? []), grant] }
      if (!await verifyTaskAccessGrant(prepared, taskAccessToken(grant))) continue
      const request = state.reminderRuntime.waitingRequests.find(r => r.id === candidate.waitingRequestId)
      const mail = buildReminderMail({ today: state.today, facts, recipient, candidate, request, requesterName: people.find(p => p.id === facts.ownerId)?.name, taskUrl: taskAccessUrl(origin, grant, facts.eventId) })
      if (mail.checked) entries.push({ candidateId: id, grant, message: { ...mail, channel: "email", preparedOn: state.today, accessId: grant.id } })
    } catch { /* Keep valid entries; the result identifies everything that was not recorded. */ }
  }
  if (!isCurrent()) return failed("The reminder preparation changed. Please review the latest plan.")
  const before = store.getState()
  const previous = new Set(isReminderRuntime(before.reminderRuntime) ? before.reminderRuntime.deliveries.map(d => d.id) : [])
  if (!entries.length || !store.tryDispatch({ type: "recordReminderBatch", ...{ via, entries, context: reminderBatchContext(state) } })) return failed("These reminders were not recorded. Check saving and the latest plan, then try again.")
  const after = store.getState()
  const recorded = isReminderRuntime(after.reminderRuntime) ? after.reminderRuntime.deliveries.filter(d => !previous.has(d.id) && entries.some(e => e.candidateId === d.candidateId)) : []
  const failedIds = requested.filter(id => !recorded.some(d => d.candidateId === id))
  return { recordedIds: recorded.map(d => d.id), failedIds, error: failedIds.length ? "Some reminders changed or reached a limit. Only the saved records are shown." : null }
}
