import type { DemoState } from "../data/types"
import type { TaskAccessUpdate } from "./accessContracts"
import { usableTaskAccessGrant } from "./taskAccess"
import { addNotices, claimTask, replyToTask } from "../data/taskWorkflow"
import { isReminderRuntime } from "./runtime"
import { addDays } from "../lib/dates"
import { FOLLOWUP_DAYS, validReminderDay } from "./policy"

/** Scope is taken from the stored grant, never from the URL or the page's viewer selector. */
export function applyTaskAccessUpdate(s: DemoState, token: string, update: TaskAccessUpdate): DemoState {
  const grant = usableTaskAccessGrant(s, token)
  const node = s.nodes.find(n => n.id === grant?.nodeId)
  if (!grant || !node || !update || typeof update.kind !== "string") return s
  if (grant.scope === "waiting") {
    if (node.status === "done" || !isReminderRuntime(s.reminderRuntime) || !["acknowledge", "provided"].includes(update.kind)) return s
    const request = s.reminderRuntime.waitingRequests.find(r => r.id === grant.waitingRequestId)
    const response = update.kind === "provided" ? "provided" as const : "acknowledged" as const
    if (!request || request.closedOn || request.response === response || request.response === "provided") return s
    const expectedOn = response === "acknowledged" ? update.expectedOn ?? addDays(s.today, FOLLOWUP_DAYS) : request.expectedOn
    if (response === "acknowledged" && (!validReminderDay(expectedOn) || expectedOn < s.today)) return s
    const sequence = s.reminderRuntime.sequence + 1
    const next: DemoState = { ...s, reminderRuntime: { ...s.reminderRuntime, sequence,
      waitingRequests: s.reminderRuntime.waitingRequests.map(r => r.id === request.id ? { ...r, response, respondedOn: s.today, responseBy: grant.recipientId, ...(expectedOn ? { expectedOn } : {}) } : r),
      updates: [...s.reminderRuntime.updates, { id: `reminder-update:${sequence}`, sequence, nodeId: node.id, ownerId: node.ownerId, ownerVersion: node.ownerVersion ?? 0, actorId: grant.recipientId, on: s.today, status: node.status, ownerReply: false, waitingRequestId: request.id, waitingResponse: response }],
    } }
    return response === "provided"
      ? addNotices(next, node.id, [request.ownerId], "info", `Input is available for “${node.title}”. Please check it and update the task when you can continue.`, `waiting-provided:${request.id}`)
      : addNotices(next, node.id, [request.ownerId], "info", `Input for “${node.title}” is expected by ${expectedOn}. Please check whether this fits the task's due date.`, `waiting-promised:${request.id}`)
  }
  if (update.kind === "claim") return claimTask(s, node.id, grant.recipientId)
  if (!["todo", "working", "done", "stuck", "waiting", "extension"].includes(update.kind)) return s
  const reply = update.kind === "stuck" ? "help" : update.kind as "todo" | "working" | "done" | "waiting" | "extension"
  return replyToTask(s, node.id, grant.recipientId, reply, { waitingOn: update.waitingOn, waitingOnPersonId: update.waitingOnPersonId, requestedDate: update.requestedDate, reason: update.reason })
}
