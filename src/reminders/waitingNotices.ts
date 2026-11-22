import type { DemoState } from "../data/types"
import { addNotices } from "../data/taskWorkflow"
import { addDays } from "../lib/dates"
import { expectedInputOn, FOLLOWUP_DAYS } from "./policy"
import { isReminderRuntime } from "./runtime"

/** Waiting pauses owner nudges, but never hides an unresolved dependency from its owner. */
export function notifyWaitingOwner(s: DemoState): DemoState {
  if (!isReminderRuntime(s.reminderRuntime)) return s
  let next = s
  for (const request of s.reminderRuntime.waitingRequests) {
    const node = s.nodes.find(n => n.id === request.nodeId)
    if (request.closedOn || !node || node.status !== "waiting" || node.ownerId !== request.ownerId || (node.ownerVersion ?? 0) !== request.ownerVersion) continue
    if (request.response === "provided") {
      next = addNotices(next, node.id, [request.ownerId], "info", `Input is available for “${node.title}”. Please check it and update the task when you can continue.`, `waiting-provided:${request.id}`)
      continue
    }
    const deadline = request.response === "acknowledged" ? expectedInputOn(request) : addDays(request.createdOn, FOLLOWUP_DAYS)
    if (s.today < deadline) continue
    next = addNotices(next, node.id, [request.ownerId], "info", `“${node.title}” is still waiting for input. Please check the request and decide the next step.`, `waiting-needs-action:${request.id}:${request.response === "acknowledged" ? "promised" : "unanswered"}`)
  }
  return next
}
