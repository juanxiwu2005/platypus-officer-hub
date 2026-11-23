import { defaultTaskDue } from "../engine/taskDates"
import type { DemoState, Node, NodeStatus } from "./types"
import { canLead } from "./changeReview"
import { addNotices, claimTask, closeSilence, replyToTask } from "./taskWorkflow"
import { applySchedule } from "../engine/schedule"
import { STATUS_DEFAULTS } from "../components/ui/statusDefaults"
import { isBudgetControlledNode } from "../engine/eventBudget"

/**
 * Task board actions (v1.1, decision 3): officers drag their own tasks; the president or VP can drag anyone's,
 * and the owner gets a private note. The claim handshake still holds: only the owner can claim a task.
 */
// The six status names are fixed (S3, 2026-11-23). A renamed status in an old save stays in the data but is not shown.
const label = (_s: DemoState, st: NodeStatus) => STATUS_DEFAULTS[st].label

export function canMoveTask(s: DemoState, n: Node, to: NodeStatus): string | null {
  const lead = canLead(s), owner = n.ownerId === s.viewerId
  if (to === "done" && isBudgetControlledNode(n)) return "Update the Event Budget line items to complete this finance step."
  if (!lead && !owner) return "You can move your own tasks. The president or VP can move anyone's."
  if (to === n.status) return null
  if (n.status === "unclaimed" && to !== "unclaimed") {
    if (n.ownerId && n.ownerId !== s.viewerId) return `Only ${s.people.find(p => p.id === n.ownerId)?.name.split(" ")[0] ?? "the owner"} can claim this task.`
  }
  if (to === "unclaimed" && !lead) return "Only the president or VP can send a task back to be claimed."
  if (n.status === "done" && !lead) return "Ask the president or VP to reopen a finished task."
  return null
}

function reorder(s: DemoState, nodeId: string, status: NodeStatus, beforeId: string | null): DemoState {
  const column = s.nodes.filter(n => n.status === status && n.id !== nodeId).sort(byRank)
  const at = beforeId ? column.findIndex(n => n.id === beforeId) : -1
  const moving = s.nodes.find(n => n.id === nodeId)!
  column.splice(at < 0 ? column.length : at, 0, moving)
  const ranks = new Map(column.map((n, i) => [n.id, i]))
  return { ...s, nodes: s.nodes.map(n => ranks.has(n.id) ? { ...n, rank: ranks.get(n.id) } : n) }
}
const byRank =(a: Node, b: Node) => (a.rank ?? 1e6) - (b.rank ?? 1e6) || (a.latestStart ?? "9999").localeCompare(b.latestStart ?? "9999") || a.id.localeCompare(b.id)

export function moveTask(s: DemoState, nodeId: string, to: NodeStatus, beforeId: string | null = null): DemoState {
  const n = s.nodes.find(x => x.id === nodeId)
  if (!n || canMoveTask(s, n, to)) return s
  let next = s
  if (to !== n.status) {
    const actor = s.viewerId
    // Claim first when the owner (or anyone, for a task with no owner) picks it up.
    if (n.status === "unclaimed" && to !== "unclaimed") next = claimTask(next, n.id, actor)
    const cur = next.nodes.find(x => x.id === n.id)!
    const owner = cur.ownerId
    if (to === "done" && owner) next = replyToTask(next, n.id, owner, "done")
    else if (to === "blocked" && owner === actor) next = replyToTask(next, n.id, owner, "help")
    else if (to !== "accepted" || cur.status !== "accepted") {
      next = closeSilence({ ...next, nodes: next.nodes.map(x => x.id === n.id ? { ...x, status: to, lastUpdate: s.today, ...(to === "unclaimed" ? { acceptedOn: null } : {}), ...(to !== "waiting" ? { waitingOn: null, waitingOnPersonId: null } : {}), ...(n.status === "done" ? { completedOn: undefined } : {}) } : x) }, n.id)
      next = applySchedule(next)
    }
    if (owner && owner !== actor) {
      const who = s.people.find(p => p.id === actor)?.name.split(" ")[0] ?? "A lead"
      next = addNotices(next, n.id, [owner], "info", `${who} moved “${n.title}” to ${label(s, to)}.`, `moved:${n.id}:${to}:${s.today}:${next.notifications.length}`)
    }
  }
  return reorder(next, n.id, next.nodes.find(x => x.id === n.id)!.status, beforeId)
}

/**
 * A new task never lands in Done, and an officer's new task is their own, so the status a person
 * asks for is not always the status the task starts in. `startStatus` is the one source of truth
 * for where it lands.
 */
export function startStatus(s: DemoState, asked: NodeStatus): NodeStatus {
  // Creating cannot finish a task: reopening a done task needs the president or VP (canMoveTask),
  // and the Done reply (contribution, notices) belongs to moveTask, not to the create path.
  const wanted: NodeStatus = asked === "done" ? "accepted" : asked
  // Only a lead can post a task for someone else to claim; anyone else's new task is their own.
  if (wanted === "unclaimed") return canLead(s) ? "unclaimed" : "accepted"
  return wanted
}

/**
 * Where a task from the page-head form went (FB-5), said in the person's own words. It follows createTasks: your own
 * task is in To do at once; someone else's waits in Not claimed until they accept it; no owner means anyone can claim it.
 */
export function newTaskNotice(s: DemoState, ownerId: string | null): string {
  if (ownerId === s.viewerId) return `Added to your ${label(s, "accepted")}.`
  const first = s.people.find(p => p.id === ownerId)?.name.split(" ")[0]
  if (ownerId && first) return `Sent to ${first}. It stays in ${label(s, "unclaimed")} until ${first} accepts.`
  return `Posted in ${label(s, "unclaimed")}. Anyone can claim it.`
}

export function addBoardTask(s: DemoState, title: string, status: NodeStatus): DemoState {
  const t = title.trim().slice(0, 100)
  if (!t) return s
  const person = s.people.find(p => p.id === s.viewerId)
  const fn = s.roles.find(r => r.id === person?.roleId)?.fn ?? "programs"
  const st = startStatus(s, status)
  const ownerId = st === "unclaimed" ? null : s.viewerId
  const id = `task-${s.nodes.length}-${Date.now().toString(36)}`
  const node: Node = { id, title: t, eventId: null, stepKey: null, phase: null, fn, ownerId, approverRoleId: s.roles.find(r => r.fn === "president")?.id ?? null, consultedRoleIds: [], informedRoleIds: [], dependsOn: [], tier: "light", estDays: 1, anchor: { kind: "fixed", official: null, club: defaultTaskDue(s) }, clubDeadlineOverride: null, officialDeadline: null, clubDeadline: null, latestStart: null, ruleIds: [], status: st, acceptedOn: ownerId ? s.today : null, waitingOn: null, draftLink: null, why: "", source: "Added on the task board", lastUpdate: s.today, assignedOn: s.today, ownerVersion: 0 }
  return applySchedule(reorder({ ...s, nodes: [...s.nodes, node] }, id, st, null))
}
