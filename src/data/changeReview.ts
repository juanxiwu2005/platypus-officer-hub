import type { DemoState, Event, Node } from "./types"
import { canLead } from "./permissions"
import { commandContext, sanitizeOps, validDate, type CommandOp } from "../lib/commands"
import type { ChangeSet, Tier } from "./types"
import { applySchedule } from "../engine/schedule"
import { buildEventNodes, orgSteps } from "../engine/playbooks"
import { topoOrder } from "../engine/schedule"
import { taskAnchor } from "../engine/taskDates"
import { addNotices } from "./taskWorkflow"

export { canLead }
/**
 * Who may create events (Juanxi, 2026-10-27): the president and VP by default; the president can open it to
 * everyone or to chosen officers in Settings.
 */
export const canCreateEvent = (s: DemoState) => {
  if (canLead(s)) return true
  const mode = s.org.settings.eventCreators ?? "leads"
  return mode === "everyone" || (mode === "chosen" && (s.org.settings.eventCreatorIds ?? []).includes(s.viewerId))
}
/** Tasks are open to everyone: for yourself, or for anyone else in the club (Juanxi, 2026-10-27). */
export function canApplyOp(s: DemoState, op: { op: string }): boolean {
  if (op.op === "add_node") return true
  if (op.op === "create_event") return canCreateEvent(s)
  return canLead(s)
}
export const notAllowedText = (op: { op: string }) => op.op === "create_event" ? "The president chooses who can create events (Settings)." : "The president or VP approves changes."

/** `date` is the event date, or a standalone task's due date; `buffered` sets its club deadline earlier. */
export interface HumanInputs { date?: string; buffered?: boolean }

/** Validate against fresh state before any mutation. No arbitrary patch or AI date reaches store. */
export function validateReview(s: DemoState, raw: unknown, human: HumanInputs = {}): string | null {
  const op = sanitizeOps([raw], commandContext(s))[0]
  if (!op) return "This change no longer matches the current demo. Please draft it again."
  if (!canApplyOp(s, op)) return op.op === "create_event" ? "Only the president, VP or officers they choose can create events." : "Only the president or vice president can approve changes."
  if (op.op === "add_node" && op.eventId) return "Event steps come from the checklist-selected workflow template; update the checklist instead of adding a task."
  if ((op.op === "create_event" || (op.op === "add_node" && !op.eventId)) && !validDate(human.date ?? "")) return "Choose and confirm a date before applying this change."
  if ((op.op === "create_event" || (op.op === "add_node" && !op.eventId)) && human.date! < s.today) return "Pick a date from today on."
  if (op.op === "link_dependency") {
    const n = s.nodes.find(n => n.id === op.nodeId)!
    const upstream = s.nodes.find(n => n.id === op.dependsOnId)!
    if (n.eventId !== upstream.eventId) return "Dependencies must belong to the same event or standalone task group."
    const nodes = s.nodes.map(x => x.id === n.id ? { ...x, dependsOn: [...new Set([...x.dependsOn, upstream.id])] } : x)
    if (topoOrder(nodes).looped.length) return "This link would create a loop. Choose a different dependency."
  }
  if (op.op === "set_funding_amount" && op.amount < (s.funding.find(f => f.eventId === op.eventId)?.spent ?? 0)) return "The budget cannot be lower than what is already spent."
  if (op.op === "advance_funding" && s.funding.find(f => f.eventId === op.eventId)?.stage === "attendance_submitted") return "This funding request is already at its last stage."
  if (op.op === "propose_nudge") {
    const n = s.nodes.find(n => n.id === op.nodeId)!
    if (n.status === "done" || !n.ownerId) return "Choose an open task with an owner before drafting a reminder."
  }
  return null
}

/** New objects only; all edits to existing nodes are routed through store.updateNode. */
export function newObjects(s: DemoState, op: CommandOp, id: string, human: HumanInputs): { events?: Event[]; nodes?: Node[] } {
  if (op.op === "create_event") {
    const { op: _kind, ...fields } = op
    const event: Event = { ...fields, id, date: human.date!, goalId: s.org.goals[0]?.id ?? null, playbookId: "seo-event" }
    return { events: [...s.events, event], nodes: [...s.nodes, ...buildEventNodes(event, s.roles, { steps: orgSteps(s) }).map(n => ({ ...n, assignedOn: s.today, ownerVersion: 0 }))] }
  }
  if (op.op === "add_node") {
    if (op.eventId) return {}
    const person = s.people.find(p => p.id === op.ownerId)
    const fn = s.roles.find(r => r.id === person?.roleId)?.fn ?? "programs"
    const node: Node = { id, title: op.title, eventId: null, stepKey: null, phase: null, fn, ownerId: op.ownerId, approverRoleId: s.roles.find(r => r.fn === "president")?.id ?? null, consultedRoleIds: [], informedRoleIds: [], dependsOn: [], tier: op.tier, estDays: op.tier === "heavy" ? 3 : op.tier === "medium" ? 2 : 1, anchor: taskAnchor(s, human.date!, human.buffered ?? false), clubDeadlineOverride: null, officialDeadline: null, clubDeadline: null, latestStart: null, ruleIds: [], status: op.ownerId ? "accepted" : "unclaimed", acceptedOn: op.ownerId ? s.today : null, waitingOn: null, draftLink: null, why: op.why ?? "Supports our club's plan.", source: canLead(s) ? "President-reviewed command" : "Added by an officer", lastUpdate: s.today, assignedOn: s.today, ownerVersion: 0 }
    return { nodes: [...s.nodes, node] }
  }
  return {}
}

/** The notice the new owner gets when someone else gives them a task. */
export function assignedNotice(s: DemoState, node: Node): DemoState {
  if (!node.ownerId || node.ownerId === s.viewerId) return s
  const who = s.people.find(p => p.id === s.viewerId)?.name.split(" ")[0] ?? "A teammate"
  return addNotices(s, node.id, [node.ownerId], "info", `${who} gave you a new task: “${node.title}”. Claim it when you're ready.`, `assigned:${node.id}`)
}

export interface NewTask { title: string; ownerId: string | null; eventId: string | null; tier?: Tier }
/**
 * The Ask task form (M2b): one task per owner, applied at once as the viewer, with Undo. Anyone may create
 * tasks for themselves or for anyone else (Juanxi, 2026-10-27). Standalone tasks need a due date from today on;
 * with `buffered` the club deadline comes earlier by the club buffer (engine/taskDates.ts).
 */
export function createTasks(s: DemoState, a: { id: string; sentence: string; tasks: NewTask[]; date: string; buffered: boolean; source?: string }): DemoState {
  if (s.changeSets.some(c => c.id === a.id) || !a.tasks.length || a.tasks.length > 10) return s
  if (a.tasks.some(task => task.eventId !== null)) return s
  const lead = canLead(s)
  // Only a lead can post a task nobody owns yet; anyone else's task without an owner is their own.
  const raw = a.tasks.map(t => ({ op: "add_node", title: t.title, eventId: t.eventId, ownerId: t.ownerId ?? (lead ? null : s.viewerId), tier: t.tier ?? "light" }))
  const ops = sanitizeOps(raw, commandContext(s)).filter((o): o is Extract<CommandOp, { op: "add_node" }> => o.op === "add_node")
  if (ops.length !== raw.length) return s
  if (ops.some(o => !o.eventId) && (!validDate(a.date) || a.date < s.today)) return s
  let next = s
  const createdIds: string[] = []
  ops.forEach((op, i) => {
    const id = `${a.id}:${i}`
    next = { ...next, ...newObjects(next, op, id, { date: a.date, buffered: a.buffered }) }
    next = assignedNotice(next, next.nodes.find(n => n.id === id)!)
    createdIds.push(id)
  })
  const record: ChangeSet = { id: a.id, sentence: a.sentence, ops, status: "applied", reviews: ops.map(() => "applied"), source: a.source, auto: true, by: s.viewerId, before: { nodes: [], contacts: [] }, createdIds }
  return applySchedule({ ...next, changeSets: [...next.changeSets, record] })
}
