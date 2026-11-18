import type { DemoState, Node } from "../data/types"
import { isOfficer, isPresident } from "../data/permissions"
import { validDate } from "../lib/commands"
import { applySchedule, computeSchedule } from "../engine/schedule"
import { closeSilence, leaders } from "../data/taskWorkflow"

export interface TaskTargetInput { date: string; message: string; notifyPersonIds: string[]; expectedTask: string }
export interface TaskTargetChange { id: string; actorId: string; ownerId: string | null; ownerVersion: number; on: string; previousDate: string | null; date: string; message: string; notifiedPersonIds: string[]; affectedNodeIds: string[] }
export interface TaskTargetLog { version: 1; revision: number; changes: TaskTargetChange[] }
export const taskTargetKey = (n: Node) => JSON.stringify([n.ownerId, n.ownerVersion ?? 0, n.status, n.clubDeadline, n.clubDeadlineOverride, n.targetDates?.version, n.targetDates?.revision])
export function targetLog(n: Node): TaskTargetLog | null {
  const log = n.targetDates
  if (log === undefined) return { version: 1, revision: 0, changes: [] }
  return log?.version === 1 && Number.isSafeInteger(log.revision) && log.revision >= 0 && Array.isArray(log.changes) && log.changes.length === log.revision && log.changes.every(c => c && typeof c.id === "string" && typeof c.actorId === "string" && (c.ownerId === null || typeof c.ownerId === "string") && Number.isSafeInteger(c.ownerVersion) && c.ownerVersion >= 0 && validDate(c.on) && validDate(c.date) && (c.previousDate === null || validDate(c.previousDate)) && typeof c.message === "string" && Array.isArray(c.notifiedPersonIds) && c.notifiedPersonIds.every(id => typeof id === "string") && Array.isArray(c.affectedNodeIds) && c.affectedNodeIds.every(id => typeof id === "string")) ? log : null
}

/** Recommendations follow dependency edges, including changed later tasks, never screen position. */
export function targetImpact(s: DemoState, nodeId: string, date: string) {
  const before = computeSchedule(s), changed = { ...s, nodes: s.nodes.map(n => n.id === nodeId ? { ...n, clubDeadlineOverride: date } : n) }
  const after = computeSchedule(changed), descendants = new Set<string>(), queue = [nodeId]
  while (queue.length) { const id = queue.shift()!; for (const n of s.nodes) if (n.id !== nodeId && n.dependsOn.includes(id) && !descendants.has(n.id)) { descendants.add(n.id); queue.push(n.id) } }
  const affected = s.nodes.filter(n => {
    if (n.status === "done" || !descendants.has(n.id)) return false
    const a = before.nodes[n.id], b = after.nodes[n.id]
    return n.dependsOn.includes(nodeId) || (a && b && (a.club !== b.club || a.latestStart !== b.latestStart || JSON.stringify(a.issues) !== JSON.stringify(b.issues)))
  })
  return { before, after, affected, state: changed }
}
export function suggestedTargetPeople(s: DemoState, nodeId: string, date: string) {
  const affected = targetImpact(s, nodeId, date).affected, lead = new Set(leaders(s))
  return s.people.filter(p => isOfficer(p) && (lead.has(p.id) || affected.some(n => n.ownerId === p.id))).map(p => ({ person: p, lead: lead.has(p.id), tasks: affected.filter(n => n.ownerId === p.id) }))
}

/** The target, immutable change record and one notice per selected person persist together. */
export function updateTaskTarget(s: DemoState, nodeId: string, actorId: string, input: TaskTargetInput): DemoState {
  const n = s.nodes.find(n => n.id === nodeId), actor = s.people.find(p => p.id === actorId)
  if (!n || !actor || !isOfficer(actor) || (n.ownerId !== actorId && !isPresident(s, actorId)) || n.status === "unclaimed" || n.status === "done" || !input || !validDate(input.date) || input.date < s.today || input.date === n.clubDeadline || typeof input.message !== "string" || input.message.length > 300 || input.expectedTask !== taskTargetKey(n) || !Array.isArray(input.notifyPersonIds) || input.notifyPersonIds.length > s.people.length || !input.notifyPersonIds.every(id => typeof id === "string" && s.people.some(p => p.id === id && isOfficer(p)))) return s
  const log = targetLog(n)
  if (!log) return s
  const impact = targetImpact(s, nodeId, input.date), next = applySchedule(impact.state)
  // No target-date action can change an official school deadline.
  if (next.nodes.some(x => impact.before.nodes[x.id]?.official !== impact.after.nodes[x.id]?.official) || next.nodes.find(x => x.id === nodeId)?.clubDeadline !== input.date) return s
  const notifiedPersonIds = [...new Set(input.notifyPersonIds)], revision = log.revision + 1, id = `target-date:${nodeId}:${revision}`
  const record: TaskTargetChange = { id, actorId, ownerId: n.ownerId, ownerVersion: n.ownerVersion ?? 0, on: s.today, previousDate: n.clubDeadline, date: input.date, message: input.message.trim(), notifiedPersonIds, affectedNodeIds: impact.affected.map(x => x.id) }
  const event = s.events.find(e => e.id === n.eventId), notifications = [...next.notifications]
  for (const recipientId of notifiedPersonIds) {
    const tasks = impact.affected.filter(x => x.ownerId === recipientId)
    const text = `${actor.name} updated “${n.title}”${event ? ` · ${event.name}` : ""} from ${n.clubDeadline ?? "not set"} to ${input.date}.${tasks.length ? ` Your connected tasks: ${tasks.map(x => x.title).join("; ")}.` : ""}${record.message ? ` ${record.message}` : ""}`
    notifications.push({ id: `${id}:${recipientId}`, recipientId, nodeId, kind: "info", text, createdOn: s.today, read: false })
  }
  return closeSilence({ ...next, notifications, nudges: s.reminderRuntime ? next.nudges : next.nudges.map(r => r.nodeId === nodeId ? { ...r, response: n.status } : r), nodes: next.nodes.map(x => x.id === nodeId ? { ...x, lastUpdate: s.today, targetDates: { version: 1, revision, changes: [...log.changes, record] } } : x), extensionRequests: next.extensionRequests.map(r => r.nodeId === nodeId && r.status === "pending" ? { ...r, status: "cancelled" } : r) }, nodeId)
}
