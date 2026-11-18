import type { DemoState, ExtensionRequest, Node, Notice } from "./types"
import { nextCounter } from "../lib/ids"
import { isOfficer, isPresident } from "./permissions"
import { validDate } from "../lib/commands"
import { applySchedule, computeSchedule } from "../engine/schedule"
import { isBudgetControlledNode } from "../engine/eventBudget"

export type TaskReply = "done" | "todo" | "working" | "waiting" | "help" | "extension"
export interface ReplyInput { waitingOn?: string; waitingOnPersonId?: string | null; draftLink?: string; requestedDate?: string; reason?: string }
export const safeLink = (s: string) => { try { return ["https:", "http:"].includes(new URL(s).protocol) } catch { return false } }
/** Whoever holds the president or vice-president role now. A former president keeps that role id for history, so the role's holder decides. */
export const leaders = (s: DemoState) => s.roles.filter(r => (r.fn === "president" || r.fn === "vice_president") && r.holderId && s.people.some(p => p.id === r.holderId)).map(r => r.holderId!)
const rolePeople = (s: DemoState, ids: string[]) => s.roles.filter(r => ids.includes(r.id) && r.holderId).map(r => r.holderId!)
export const extensionReviewers = (s: DemoState, n: Node) => [...new Set([...leaders(s), ...rolePeople(s, n.approverRoleId ? [n.approverRoleId] : [])])].filter(id => s.people.some(p => p.id === id && isOfficer(p)))
export function canReviewExtension(s: DemoState, r: ExtensionRequest): boolean {
  const n = s.nodes.find(n => n.id === r.nodeId)
  return !!n && extensionReviewers(s, n).includes(s.viewerId)
}

export function addNotices(s: DemoState, nodeId: string, ids: string[], kind: Notice["kind"], text: string, key: string): DemoState {
  const notifications = [...s.notifications]
  for (const recipientId of [...new Set(ids)].filter(id => s.people.some(p => p.id === id))) {
    const id = `${key}:${recipientId}`
    if (!notifications.some(n => n.id === id)) notifications.push({ id, recipientId, nodeId, kind, text, createdOn: s.today, read: false })
  }
  return { ...s, notifications }
}

/** Notifications stay in the intended person's local inbox; nothing is sent externally. */
export function routeTaskChange(s: DemoState, n: Node, kind: "done" | "todo" | "working" | "waiting" | "help" | "claim" | "extension" | "extended", reopened = false): DemoState {
  let next = s
  const key = `${n.id}:${kind}:${s.today}:${s.notifications.length}`
  const lead = leaders(s)
  const affected = s.nodes.filter(x => x.dependsOn.includes(n.id) && x.status !== "done")
  if (kind === "done") {
    for (const down of affected) {
      if (down.ownerId && down.dependsOn.every(id => s.nodes.find(x => x.id === id)?.status === "done"))
        next = addNotices(next, down.id, [down.ownerId], "ready", `You can start “${down.title}”: its upstream steps are complete.`, key + down.id)
    }
  } else if (reopened) {
    const blocked = affected.filter(down => !down.dependsOn.every(id => s.nodes.find(x => x.id === id)?.status === "done"))
    next = { ...next, notifications: next.notifications.map(notice => notice.kind === "ready" && blocked.some(down => down.id === notice.nodeId) ? { ...notice, read: true } : notice) }
    for (const down of blocked) if (down.ownerId) next = addNotices(next, down.id, [down.ownerId], "delay", `“${n.title}” was reopened. Please check this dependency before continuing “${down.title}”.`, key + down.id)
  } else if (["waiting", "help", "extended"].includes(kind)) {
    const schedule = computeSchedule(s)
    for (const down of affected) if (down.ownerId) next = addNotices(next, down.id, [down.ownerId], "delay", `“${n.title}” has an update. Check your revised start: ${schedule.nodes[down.id]?.latestStart ?? "pending"}.`, key + down.id)
  }
  const advisors = rolePeople(s, n.consultedRoleIds)
  const informed = rolePeople(s, n.informedRoleIds)
  if (kind === "help") next = addNotices(next, n.id, [...advisors, ...rolePeople(s, n.approverRoleId ? [n.approverRoleId] : []), ...lead], "help", `Help requested for “${n.title}”.`, key + ":help")
  if (kind === "extension") {
    const request = s.extensionRequests.find(r => r.nodeId === n.id && r.status === "pending")
    const who = s.people.find(p => p.id === (request?.requestedBy ?? request?.ownerId))?.name ?? "A teammate", event = s.events.find(e => e.id === n.eventId)
    next = addNotices(next, n.id, extensionReviewers(s, n), "approval", `${who} requested a new deadline${request ? ` of ${request.requestedDate}` : ""} for “${n.title}”${event ? ` · ${event.name}` : ""}. Open to review.`, key + ":approval")
  }
  if (kind !== "extension") next = addNotices(next, n.id, [...advisors, ...informed].filter(id => !lead.includes(id) && id !== n.ownerId), "info", `“${n.title}”: ${kind === "done" ? "completed" : kind === "claim" ? "claimed by its owner" : "status updated"}.`, key + ":info")
  if (["waiting", "extended"].includes(kind) && computeSchedule(s).nodes[n.id]?.issues.some(i => i.severity !== "info")) next = addNotices(next, n.id, lead, "delay", `“${n.title}” has a schedule risk. Review the reason in Tasks.`, key + ":risk")
  return next
}

export function validateReply(s: DemoState, n: Node, actorId: string, reply: TaskReply, input: ReplyInput): string | null {
  if (!["done", "todo", "working", "waiting", "help", "extension"].includes(reply)) return "Choose a supported task update."
  if (n.ownerId !== actorId && !isPresident(s, actorId)) return "Only this task's owner or the president can send an update."
  if (n.status === "done" && (isBudgetControlledNode(n) || !["todo", "working", "waiting", "help"].includes(reply))) return "This task is already complete."
  if (n.status === "unclaimed") return "Tap “I've got it” before updating this task."
  if (reply === "waiting" && !input.waitingOn?.trim()) return "Choose who or what you are waiting on."
  if (reply === "extension") {
    if (input.draftLink && !safeLink(input.draftLink)) return "Use an http or https link."
    if (!validDate(input.requestedDate ?? "") || input.requestedDate! <= (n.clubDeadline ?? s.today) || input.requestedDate! < s.today) return "Choose a date later than the current club deadline and no earlier than today."
    if (s.extensionRequests.some(r => r.nodeId === n.id && r.status === "pending")) return "An extension request is already awaiting review."
    if (!extensionReviewers(s, n).length) return "Assign a current approver or club lead before requesting a new deadline."
    if (input.reason !== undefined && (typeof input.reason !== "string" || input.reason.length > 300)) return "Keep your message within 300 characters."
  }
  return null
}

export function closeSilence(s: DemoState, nodeId: string): DemoState {
  return { ...s, silenceCases: s.silenceCases.map(c => c.nodeId === nodeId && !c.closedOn ? { ...c, closedOn: s.today } : c) }
}
export function claimTask(s: DemoState, nodeId: string, actorId: string): DemoState {
  const n = s.nodes.find(n => n.id === nodeId)
  if (!n || n.status !== "unclaimed" || (n.ownerId && n.ownerId !== actorId) || !s.people.some(p => p.id === actorId)) return s
  const claimed: Node = { ...n, ownerId: actorId, status: "accepted", acceptedOn: s.today, lastUpdate: s.today, assignedOn: n.assignedOn ?? s.today }
  const next = closeSilence({ ...s, nodes: s.nodes.map(x => x.id === n.id ? claimed : x), nudges: s.reminderRuntime ? s.nudges : s.nudges.map(x => x.nodeId === n.id ? { ...x, response: "accepted" } : x) }, n.id)
  return routeTaskChange(applySchedule(next), claimed, "claim")
}
export function replyToTask(s: DemoState, nodeId: string, actorId: string, reply: TaskReply, input: ReplyInput = {}): DemoState {
  const n = s.nodes.find(n => n.id === nodeId)
  if (!n || (reply === "done" && isBudgetControlledNode(n)) || validateReply(s, n, actorId, reply, input)) return s
  const reopening = n.status === "done"
  const status = reply === "extension" ? n.status : reply === "done" ? "done" : reply === "todo" ? "accepted" : reply === "waiting" ? "waiting" : reply === "help" ? "blocked" : "in_progress"
  const waitingOnPersonId = reply === "extension" ? n.waitingOnPersonId : reply === "waiting" && input.waitingOnPersonId && input.waitingOnPersonId !== actorId && s.people.some(p => p.id === input.waitingOnPersonId) ? input.waitingOnPersonId : null
  const updated: Node = { ...n, status, lastUpdate: s.today, waitingOn: reply === "extension" ? n.waitingOn : reply === "waiting" ? input.waitingOn!.trim().slice(0, 180) : null, waitingOnPersonId, ...(reply === "done" ? { completedOn: s.today } : reopening ? { completedOn: undefined } : {}), ...(reply === "extension" && input.draftLink ? { draftLink: input.draftLink } : {}) }
  let next = closeSilence({ ...s, nodes: s.nodes.map(x => x.id === n.id ? updated : x), nudges: s.reminderRuntime ? s.nudges : s.nudges.map(x => x.nodeId === n.id ? { ...x, response: status } : x) }, n.id)
  if (reply === "waiting" && waitingOnPersonId) {
    const who = s.people.find(p => p.id === actorId)?.name.split(" ")[0] ?? "A teammate"
    next = addNotices(next, n.id, [waitingOnPersonId], "info", `${who} is waiting for you on “${n.title}”. It is now in your To do list.`, `waiting-on:${n.id}:${s.today}:${next.notifications.length}`)
  }
  if (reply === "done") {
    next.extensionRequests = next.extensionRequests.map(r => r.nodeId === n.id && r.status === "pending" ? { ...r, status: "cancelled" } : r)
    if (!s.contributions.some(c => c.nodeId === n.id)) next.contributions = [...s.contributions, { personId: n.ownerId ?? actorId, nodeId: n.id, points: ({ light: 1, medium: 2, heavy: 3 }[n.tier]) + (s.today <= (n.clubDeadline ?? s.today) ? 1 : 0), onTime: s.today <= (n.clubDeadline ?? s.today), completedOn: s.today }]
  }
  if (reopening) next.contributions = next.contributions.filter(c => c.nodeId !== n.id)
  if (reply === "extension") next.extensionRequests = [...s.extensionRequests, { id: `extension-${n.id}-${nextCounter(s.extensionRequests.map(r => r.id), /-(\d+)$/)}`, nodeId: n.id, ownerId: n.ownerId ?? actorId, requestedOn: s.today, requestedBy: actorId, requestedDate: input.requestedDate!, previousDeadline: n.clubDeadline, draftLink: input.draftLink ?? "", reason: (input.reason ?? "").trim(), status: "pending" }]
  next = applySchedule(next)
  return routeTaskChange(next, updated, reply, reopening)
}

export function reviewExtension(s: DemoState, id: string, approve: boolean): DemoState {
  const r = s.extensionRequests.find(r => r.id === id)
  if (!r || !canReviewExtension(s, r) || r.status !== "pending") return s
  const n = s.nodes.find(n => n.id === r.nodeId)
  if (!n || (approve && (n.status === "done" || n.ownerId !== r.ownerId || n.clubDeadline !== r.previousDeadline || r.requestedDate < s.today))) return s
  const updated: Node = approve ? { ...n, clubDeadlineOverride: r.requestedDate } : n
  let next = applySchedule({ ...s, nodes: s.nodes.map(x => x.id === n.id ? updated : x), extensionRequests: s.extensionRequests.map(x => x.id === id ? { ...x, status: approve ? "approved" : "rejected", reviewedBy: s.viewerId, reviewedOn: s.today } : x) })
  next = addNotices(next, n.id, [r.ownerId], "approval", `Your extension for “${n.title}” was ${approve ? "approved" : "declined"}. ${approve ? "The ASU deadline has not changed." : "The current club deadline still applies."}`, id + ":decision")
  return approve ? routeTaskChange(next, updated, "extended") : next
}
