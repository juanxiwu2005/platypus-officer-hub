import type { DemoState, Event, Node } from "./types"
import { canLead, isOfficer } from "./permissions"
import { commandContext, sanitizeOps, validDate, type CommandOp } from "../lib/commands"
import type { ChangeSet, Tier } from "./types"
import { applySchedule } from "../engine/schedule"
import { topoOrder } from "../engine/schedule"
import { taskAnchor } from "../engine/taskDates"
import { addNotices } from "./taskWorkflow"
import { findWorkflowTemplateVersion, instantiateWorkflowTemplate, publishedWorkflowTemplates, STANDARD_WORKFLOW_TEMPLATE_ID, workflowTemplateRunError } from "./workflowTemplates"

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
/**
 * Who may change an event's date, name and headcount (S0, Juanxi 2026-11-22): the same people who may create events,
 * and only while they are a current officer (the reducer already makes former and incoming officers read-only).
 */
export const canChangeEvent = (s: DemoState) => canCreateEvent(s) && !s.people.some(p => p.id === s.viewerId && !isOfficer(p))
/**
 * The one permission line for events (S3), for "+ New event", Ask's event forms and the event date. It names who can:
 * the president or VP, plus the officers they choose when Settings says so. Null when this viewer may.
 */
export function eventBlocked(s: DemoState, verb: "create" | "change"): string | null {
  if (s.people.some(p => p.id === s.viewerId && !isOfficer(p))) return `Only current officers can ${verb} events.`
  if (canCreateEvent(s)) return null
  return (s.org.settings.eventCreators ?? "leads") === "chosen" ? `Only the president, VP and officers they choose can ${verb} events.` : `Only the president or VP can ${verb} events.`
}
/** Tasks are open to everyone: for yourself, or for anyone else in the club (Juanxi, 2026-10-27). */
export function canApplyOp(s: DemoState, op: { op: string; eventId?: string | null }): boolean {
  // Administrative tasks are open to all officers. Altering an event workflow is a
  // president/VP decision, even when Platypus has drafted the proposed adjustment.
  if (op.op === "add_node") return !op.eventId || canLead(s)
  if (op.op === "create_event") return canCreateEvent(s)
  return canLead(s)
}
export const notAllowedText = (op: { op: string }) => op.op === "create_event" ? "The president chooses who can create events (Settings)." : "The president or VP approves changes."

/** `date` is the event date, or a standalone task's due date; `buffered` sets its club deadline earlier. */
export interface HumanInputs {
  date?: string
  buffered?: boolean
  /** Chosen by the organizer, outside the AI command whitelist. The version is pinned before approval. */
  workflowTemplateId?: string
  workflowTemplateVersion?: number
}

function eventWorkflowChoice(s: DemoState, human: HumanInputs) {
  if (human.workflowTemplateId !== undefined || human.workflowTemplateVersion !== undefined) {
    return { templateId: human.workflowTemplateId ?? "", templateVersion: human.workflowTemplateVersion }
  }
  const published = publishedWorkflowTemplates(s)
  const templateId = s.org.defaultWorkflowTemplateId ?? STANDARD_WORKFLOW_TEMPLATE_ID
  const selected = published.find(template => template.id === templateId)
  return { templateId, templateVersion: selected?.version }
}

/** Validate against fresh state before any mutation. No arbitrary patch or AI date reaches store. */
export function validateReview(s: DemoState, raw: unknown, human: HumanInputs = {}): string | null {
  const op = sanitizeOps([raw], commandContext(s))[0]
  if (!op) return "This change no longer matches the current demo. Please draft it again."
  if (!canApplyOp(s, op)) return op.op === "create_event" ? "Only the president, VP or officers they choose can create events." : "Only the president or vice president can approve changes."
  // A standalone task needs a due date. An event adjustment inherits the event's
  // rule-engine schedule, so it must never ask the president to invent one.
  if ((op.op === "create_event" || (op.op === "add_node" && !op.eventId)) && !validDate(human.date ?? "")) return "Choose and confirm a date before applying this change."
  if ((op.op === "create_event" || (op.op === "add_node" && !op.eventId)) && human.date! < s.today) return "Pick a date from today on."
  if (op.op === "create_event") {
    const choice = eventWorkflowChoice(s, human)
    const version = Number.isInteger(choice.templateVersion) ? findWorkflowTemplateVersion(s, choice.templateId, choice.templateVersion) : undefined
    if (!version) return "Choose a saved workflow version before creating this event."
    const problem = workflowTemplateRunError(s, version)
    if (problem) return problem
  }
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
    // Replaying the same approved request must never duplicate tasks or reset their work.
    if (s.events.some(event => event.id === id) || s.nodes.some(node => node.eventId === id)) return {}
    const { op: _kind, ...fields } = op
    const event: Event = { ...fields, id, date: human.date!, goalId: s.org.goals[0]?.id ?? null, playbookId: "seo-event" }
    const choice = eventWorkflowChoice(s, human)
    if (!Number.isInteger(choice.templateVersion) || !findWorkflowTemplateVersion(s, choice.templateId, choice.templateVersion)) return {}
    const result = instantiateWorkflowTemplate(s, event, choice)
    if (result.error) return {}
    return { events: [...s.events, result.event], nodes: [...s.nodes, ...result.nodes] }
  }
  if (op.op === "add_node") {
    if (op.eventId) {
      const event = s.events.find(e => e.id === op.eventId)
      if (!event) return {}
      const person = s.people.find(p => p.id === op.ownerId)
      const fn = s.roles.find(r => r.id === person?.roleId)?.fn ?? "programs"
      const node: Node = { id, title: op.title, eventId: event.id, stepKey: null, phase: op.phase ?? "prepare", fn, ownerId: op.ownerId, approverRoleId: s.roles.find(r => r.fn === "president")?.id ?? null, consultedRoleIds: [], informedRoleIds: [], dependsOn: [], tier: op.tier, estDays: op.tier === "heavy" ? 3 : op.tier === "medium" ? 2 : 1, anchor: { kind: "target", days: 14, unit: "calendar", label: "President-added event adjustment" }, clubDeadlineOverride: null, officialDeadline: null, clubDeadline: null, latestStart: null, ruleIds: [], status: op.ownerId ? "accepted" : "unclaimed", acceptedOn: op.ownerId ? s.today : null, waitingOn: null, draftLink: null, why: op.why ?? "President-requested adjustment to the event workflow.", source: "President-reviewed event adjustment", lastUpdate: s.today, assignedOn: s.today, ownerVersion: 0 }
      return { nodes: [...s.nodes, node] }
    }
    const person = s.people.find(p => p.id === op.ownerId)
    const fn = s.roles.find(r => r.id === person?.roleId)?.fn ?? "programs"
    const node: Node = { id, title: op.title, eventId: null, stepKey: null, phase: null, fn, ownerId: op.ownerId, approverRoleId: s.roles.find(r => r.fn === "president")?.id ?? null, consultedRoleIds: [], informedRoleIds: [], dependsOn: [], tier: op.tier, estDays: op.tier === "heavy" ? 3 : op.tier === "medium" ? 2 : 1, anchor: taskAnchor(s, human.date!, human.buffered ?? false), clubDeadlineOverride: null, officialDeadline: null, clubDeadline: null, latestStart: null, ruleIds: [], status: op.ownerId ? "accepted" : "unclaimed", acceptedOn: op.ownerId ? s.today : null, waitingOn: null, draftLink: null, why: op.why ?? "Supports our club's plan.", source: canLead(s) ? "President-reviewed command" : "Added by an officer", lastUpdate: s.today, assignedOn: s.today, ownerVersion: 0 }
    return { nodes: [...s.nodes, node] }
  }
  return {}
}

/**
 * The optional "new task" email (Juanxi, 2026-11-28): asked once, right after the maker gives someone else a task. Only the task's
 * maker, once, and only to another current officer who owns it. Demo: recorded, nothing leaves the app. Reminders never see it.
 */
export function sendTaskEmail(s: DemoState, nodeId: string): DemoState {
  const node = s.nodes.find(n => n.id === nodeId)
  const made = s.changeSets.some(c => c.by === s.viewerId && !c.undone && c.createdIds?.includes(nodeId))
  const to = s.people.find(p => p.id === node?.ownerId && isOfficer(p))
  if (!node || !made || !to || to.id === s.viewerId || (s.taskEmails ?? []).some(e => e.nodeId === nodeId)) return s
  return { ...s, taskEmails: [...(s.taskEmails ?? []), { id: `mail:${nodeId}`, nodeId, toId: to.id, fromId: s.viewerId, sentOn: s.today }] }
}

/** The notice the new owner gets when someone else gives them a task. */
export function assignedNotice(s: DemoState, node: Node): DemoState {
  if (!node.ownerId || node.ownerId === s.viewerId) return s
  const who = s.people.find(p => p.id === s.viewerId)?.name.split(" ")[0] ?? "A teammate"
  return addNotices(s, node.id, [node.ownerId], "info", `${who} gave you a new task: “${node.title}”. Claim it when you're ready.`, `assigned:${node.id}`)
}

/**
 * `link`: a club task linked to an upcoming event, with the branch place the Tasks page worked out (src/data/clubTasks.ts, kept
 * out of the startup bundle); `eventId` stays null for club tasks.
 */
export interface TaskLink { eventId: string; branchId: string; order: number; teamId?: string }
export interface NewTask { title: string; ownerId: string | null; eventId: string | null; tier?: Tier; link?: TaskLink }
/**
 * The Ask task form and the Tasks page form (M2b, FB-5): one task per owner, applied at once as the viewer, with Undo.
 * Anyone may create tasks for themselves or for anyone else (Juanxi, 2026-10-27); someone else's waits in Not claimed
 * until they accept it. Standalone tasks need a due date from today on. Both forms now send `buffered: false` (one
 * date, Due); the parameter stays so older change records still read (engine/taskDates.ts).
 */
export function createTasks(s: DemoState, a: { id: string; sentence: string; tasks: NewTask[]; date: string; buffered: boolean; source?: string }): DemoState {
  if (s.changeSets.some(c => c.id === a.id) || !a.tasks.length || a.tasks.length > 10) return s
  if (a.tasks.some(task => task.eventId !== null)) return s
  // A linked club task needs an event still ahead and a due date before its event day (clubTasks.ts linkError says why to the user).
  // A malformed branch place is harmless: placementOf (engine/workflowBranches.ts) shows it as an unrecognized branch.
  if (a.tasks.some(({ link }) => link && !(s.events.some(e => e.id === link.eventId && e.date > s.today && a.date < e.date)))) return s
  const lead = canLead(s)
  // Only the president or VP may put a task into an event's flow (Juanxi 2026-11-28), as with the event's own steps.
  if (!lead && a.tasks.some(task => task.link)) return s
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
    // M2b (AGENTS.md rule 3): a task given to someone else is theirs only once they accept it, so it waits in
    // Not claimed with them as owner until they press "I've got it" (claimTask). Your own task is To do at once.
    if (op.ownerId && op.ownerId !== s.viewerId) next = { ...next, nodes: next.nodes.map(n => n.id === id ? { ...n, status: "unclaimed", acceptedOn: null } : n) }
    const link = a.tasks[i].link
    // Linked club task: the event's flow shows it at the end of its owner's branch; its dates stay its own (engine/schedule.ts).
    if (link) next = { ...next, nodes: next.nodes.map(n => n.id === id ? { ...n, eventId: link.eventId, clubTask: true, phase: "prepare", placement: { branchId: link.branchId, order: link.order }, ...(link.teamId ? { teamId: link.teamId } : {}) } : n) }
    next = assignedNotice(next, next.nodes.find(n => n.id === id)!)
    createdIds.push(id)
  })
  const record: ChangeSet = { id: a.id, sentence: a.sentence, ops, status: "applied", reviews: ops.map(() => "applied"), source: a.source, auto: true, by: s.viewerId, before: { nodes: [], contacts: [] }, createdIds }
  return applySchedule({ ...next, changeSets: [...next.changeSets, record] })
}

/**
 * Undo on the New event form's "created" card (Option A, Juanxi 2026-11-28). Removes every event this change set created,
 * with the event's own tasks, the notices about them and any funding record started for it, and marks the set undone.
 * Allowed for whoever created it or a lead. A club task someone linked to the event stays, unlinked, because it is theirs.
 */
export function undoCreatedEvent(s: DemoState, id: string): DemoState {
  const change = s.changeSets.find(c => c.id === id)
  if (!change || change.undone || (change.by !== s.viewerId && !canLead(s))) return s
  const eventIds = new Set(change.ops.flatMap((op, i) => op.op === "create_event" && change.reviews?.[i] === "applied" ? [`${change.id}:${i}`] : []))
  if (![...eventIds].some(eventId => s.events.some(e => e.id === eventId))) return s
  const removed = new Set(s.nodes.filter(n => n.eventId && eventIds.has(n.eventId) && !n.clubTask).map(n => n.id))
  const nodes = s.nodes.filter(n => !removed.has(n.id)).map(n => {
    let next = n.dependsOn.some(d => removed.has(d)) ? { ...n, dependsOn: n.dependsOn.filter(d => !removed.has(d)) } : n
    if (next.clubTask && next.eventId && eventIds.has(next.eventId)) {
      const { placement: _placement, ...rest } = next
      void _placement
      next = { ...rest, eventId: null }
    }
    return next
  })
  return applySchedule({
    ...s,
    events: s.events.filter(e => !eventIds.has(e.id)),
    nodes,
    notifications: s.notifications.filter(n => !removed.has(n.nodeId)),
    funding: s.funding.filter(f => !eventIds.has(f.eventId)),
    changeSets: s.changeSets.map(c => c.id === change.id ? { ...c, undone: true } : c),
  })
}
