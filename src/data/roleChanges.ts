import type { DemoState, Node, Role } from "./types"
import { canLead } from "./changeReview"
import { applySchedule } from "../engine/schedule"
import { addNotices } from "./taskWorkflow"
import { roleTasks, ROLE_START_PROMPTS } from "../lib/roleDossier"

/**
 * Changes to the roles themselves (Handoff stage 6): move work from one role to another, close a role (kept in `archivedRoles`, never
 * deleted: Juanxi, D-6a), and the president's answers for a new role. A split is "add the new role in Settings, then move the work that
 * belongs to it"; a merge is "move everything, then close the old role". The president or vice president only.
 */
export type RoleChange =
  | { kind: "moveWork"; fromRoleId: string; toRoleId: string; taskIds: string[]; contactIds: string[] }
  | { kind: "closeRole"; roleId: string; intoRoleId: string }
  | { kind: "startNote"; roleId: string; index: number; answer: string }

const swap = (ids: string[], from: string, to: string) => ids.map(id => id === from ? to : id).filter((id, i, all) => all.indexOf(id) === i)

export function changeRole(s: DemoState, a: RoleChange): DemoState {
  if (!canLead(s)) return s
  if (a.kind === "startNote") {
    const role = s.roles.find(r => r.id === a.roleId), answer = a.answer.trim()
    if (!role || !Number.isInteger(a.index) || a.index < 0 || a.index >= ROLE_START_PROMPTS.length || answer.length > 300) return s
    const notes = ROLE_START_PROMPTS.map((_, i) => i === a.index ? answer : role.startNotes?.[i] ?? "")
    return { ...s, roles: s.roles.map(r => r.id === role.id ? { ...r, startNotes: notes } : r) }
  }
  if (a.kind === "moveWork") {
    const from = s.roles.find(r => r.id === a.fromRoleId), to = s.roles.find(r => r.id === a.toRoleId)
    if (!from || !to || from.id === to.id) return s
    const own = new Set(roleTasks(s, from, from.holderId).filter(n => n.status !== "done").map(n => n.id))
    const mine = new Set(s.contacts.filter(c => c.ownerRoleId === from.id).map(c => c.id))
    if (a.taskIds.some(id => !own.has(id)) || a.contactIds.some(id => !mine.has(id)) || (!a.taskIds.length && !a.contactIds.length)) return s
    return moved(s, from, to, new Set(a.taskIds), new Set(a.contactIds))
  }
  const role = s.roles.find(r => r.id === a.roleId), into = s.roles.find(r => r.id === a.intoRoleId)
  // The president role always stays, and a role someone still holds has to be handed over (to "nobody") first, so its work and people are not left behind.
  if (!role || !into || role.id === into.id || role.fn === "president" || role.holderId) return s
  const rest = new Set(roleTasks(s, role, null).filter(n => n.status !== "done").map(n => n.id))
  let next = moved(s, role, into, rest, new Set(s.contacts.filter(c => c.ownerRoleId === role.id).map(c => c.id)))
  const steps = next.org.eventWorkflow?.steps
  next = {
    ...next,
    nodes: next.nodes.map(n => n.approverRoleId === role.id || n.consultedRoleIds.includes(role.id) || n.informedRoleIds.includes(role.id)
      ? { ...n, approverRoleId: n.approverRoleId === role.id ? into.id : n.approverRoleId, consultedRoleIds: swap(n.consultedRoleIds, role.id, into.id), informedRoleIds: swap(n.informedRoleIds, role.id, into.id) } : n),
    org: steps?.some(st => st.ownerRoleId === role.id) ? { ...next.org, eventWorkflow: { ...next.org.eventWorkflow!, steps: steps.map(st => st.ownerRoleId === role.id ? { ...st, ownerRoleId: into.id } : st) } } : next.org,
    // Roles that reported to the closed one now report to whoever it reported to.
    roles: next.roles.filter(r => r.id !== role.id).map(r => r.reportsToId === role.id ? { ...r, reportsToId: role.reportsToId ?? null } : r),
    archivedRoles: [...next.archivedRoles, { ...role, archivedOn: s.today, closedInto: into.id }],
  }
  return applySchedule(next)
}

/** Open tasks and contacts to another role. Tasks become Not claimed and wait for the new holder to tap "I've got it" (nobody owns them if the role is open). */
function moved(s: DemoState, from: Role, to: Role, taskIds: Set<string>, contactIds: Set<string>): DemoState {
  const owner = to.holderId
  const nodes: Node[] = s.nodes.map(n => taskIds.has(n.id) ? { ...n, fn: to.fn, ownerId: owner, ownerVersion: (n.ownerVersion ?? 0) + 1, status: "unclaimed" as const, acceptedOn: null, assignedOn: s.today } : n)
  let next: DemoState = applySchedule({
    ...s, nodes,
    contacts: s.contacts.map(c => contactIds.has(c.id) ? { ...c, ownerRoleId: to.id } : c),
    extensionRequests: s.extensionRequests.map(r => r.status === "pending" && taskIds.has(r.nodeId) ? { ...r, status: "cancelled" as const } : r),
    silenceCases: s.silenceCases.map(c => !c.closedOn && taskIds.has(c.nodeId) ? { ...c, closedOn: s.today } : c),
  })
  const first = [...taskIds][0]
  if (owner && first) next = addNotices(next, first, [owner], "info", `${taskIds.size} open task${taskIds.size === 1 ? "" : "s"} moved from ${from.displayName} to your role. Tap “I've got it” on each one you take.`, `move:${from.id}:${to.id}:${s.today}:${taskIds.size}`)
  return next
}
