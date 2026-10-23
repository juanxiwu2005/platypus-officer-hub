import type { DemoState, Event, Node } from "./types"
import { sanitizeOps, validDate, type CommandOp } from "../lib/commands"
import { buildEventNodes } from "../engine/playbooks"
import { topoOrder } from "../engine/schedule"

export const canLead = (s: DemoState) => {
  const person = s.people.find(p => p.id === s.viewerId)
  const role = s.roles.find(r => r.id === person?.roleId)
  return role?.fn === "president" || role?.fn === "vice_president"
}
export interface HumanInputs { date?: string }

/** Validate against fresh state before any mutation. No arbitrary patch or AI date reaches store. */
export function validateReview(s: DemoState, raw: unknown, human: HumanInputs = {}): string | null {
  if (!canLead(s)) return "Only the president or vice president can approve changes."
  const op = sanitizeOps([raw], s)[0]
  if (!op) return "This change no longer matches the current demo. Please draft it again."
  if ((op.op === "create_event" || (op.op === "add_node" && !op.eventId)) && !validDate(human.date ?? "")) return "Choose and confirm a date before applying this change."
  if (op.op === "link_dependency") {
    const n = s.nodes.find(n => n.id === op.nodeId)!
    const upstream = s.nodes.find(n => n.id === op.dependsOnId)!
    if (n.eventId !== upstream.eventId) return "Dependencies must belong to the same event or standalone task group."
    const nodes = s.nodes.map(x => x.id === n.id ? { ...x, dependsOn: [...new Set([...x.dependsOn, upstream.id])] } : x)
    if (topoOrder(nodes).looped.length) return "This link would create a loop. Choose a different dependency."
  }
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
    return { events: [...s.events, event], nodes: [...s.nodes, ...buildEventNodes(event, s.roles).map(n => ({ ...n, assignedOn: s.today, ownerVersion: 0 }))] }
  }
  if (op.op === "add_node") {
    const person = s.people.find(p => p.id === op.ownerId)
    const fn = s.roles.find(r => r.id === person?.roleId)?.fn ?? "programs"
    const node: Node = { id, title: op.title, eventId: op.eventId, stepKey: null, phase: op.eventId ? "prepare" : null, fn, ownerId: op.ownerId, approverRoleId: s.roles.find(r => r.fn === "president")?.id ?? null, consultedRoleIds: [], informedRoleIds: [], dependsOn: [], tier: op.tier, estDays: op.tier === "heavy" ? 3 : op.tier === "medium" ? 2 : 1, anchor: op.eventId ? { kind: "target", days: 14, unit: "calendar", label: "Club preparation target" } : { kind: "fixed", official: null, club: human.date! }, clubDeadlineOverride: null, officialDeadline: null, clubDeadline: null, latestStart: null, ruleIds: [], status: "unclaimed", acceptedOn: null, waitingOn: null, draftLink: null, why: "Supports our club's plan.", source: "President-reviewed command", lastUpdate: s.today }
    return { nodes: [...s.nodes, node] }
  }
  return {}
}
