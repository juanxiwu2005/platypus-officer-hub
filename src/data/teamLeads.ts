import type { DemoState, Event, Node } from "./types"
import { officers } from "./permissions"

/**
 * Team leads for an event (Juanxi 2026-11-28, option A). When an event is created, each organization team that has work in
 * the event gets one lead for this event. The lead receives all of the team's tasks and hands them out inside the team, so
 * middle officers assign work themselves instead of the president doing it for them. Leads are chosen only by someone who
 * may create events; a lead can reassign only their team's open tasks in this event, and only to people on that team.
 */

/** Current officers on an organization team, through the roles mapped to it in Settings → Roles & teams, in role order. */
export function teamMembers(s: DemoState, teamId: string): string[] {
  const current = new Set(officers(s).map(person => person.id))
  const ids = s.roles.filter(role => s.org.workflowRoleTeams?.[role.id] === teamId && role.holderId && current.has(role.holderId)).map(role => role.holderId!)
  return [...new Set(ids)]
}

export interface TeamLeadChoice { teamId: string; name: string; steps: number; members: string[]; defaultLeadId: string | null }

/**
 * The teams of a new event's tasks, with their members and the default lead: the member the workflow gives most of the
 * team's tasks, else the first member. A team with no current member has no lead and keeps the workflow's owners.
 */
export function teamLeadChoices(s: DemoState, nodes: Node[]): TeamLeadChoice[] {
  const teams = s.org.workflowTeams ?? []
  return teams.flatMap(team => {
    const work = nodes.filter(node => node.teamId === team.id)
    if (!work.length) return []
    const members = teamMembers(s, team.id)
    const counts = new Map(members.map(id => [id, work.filter(node => node.ownerId === id).length]))
    const defaultLeadId = members.reduce<string | null>((best, id) => best === null || counts.get(id)! > counts.get(best)! ? id : best, null)
    return [{ teamId: team.id, name: team.name, steps: work.length, members, defaultLeadId }]
  })
}

/** Why these leads cannot be used for these tasks; null when every lead is a current member of their team. */
export function teamLeadsError(s: DemoState, nodes: Node[], leads: Record<string, string> | undefined): string | null {
  if (leads === undefined) return null
  if (typeof leads !== "object" || leads === null || Array.isArray(leads)) return "Choose a lead for each team."
  const choices = teamLeadChoices(s, nodes)
  for (const [teamId, personId] of Object.entries(leads)) {
    const choice = choices.find(item => item.teamId === teamId)
    if (!choice) return "A team lead was chosen for a team with no tasks in this event."
    if (!choice.members.includes(personId)) return `Choose someone on the ${choice.name} team to lead it.`
  }
  return null
}

/**
 * Every team gets a lead: the one chosen, else the default. Each task of a team with a lead goes to that lead, ready in their
 * To do. Tasks without a team, or of a team with no current member, keep the workflow's owner.
 */
export function withTeamLeads(s: DemoState, event: Event, nodes: Node[], chosen: Record<string, string> | undefined): { event: Event; nodes: Node[] } {
  const leads: Record<string, string> = {}
  for (const choice of teamLeadChoices(s, nodes)) {
    const pick = chosen?.[choice.teamId]
    const lead = pick && choice.members.includes(pick) ? pick : choice.defaultLeadId
    if (lead) leads[choice.teamId] = lead
  }
  if (!Object.keys(leads).length) return { event, nodes }
  return {
    event: { ...event, teamLeads: leads },
    nodes: nodes.map(node => {
      const lead = node.teamId ? leads[node.teamId] : undefined
      if (!lead || node.ownerId === lead) return node
      return { ...node, ownerId: lead, status: "accepted" as const, acceptedOn: s.today, assignedOn: s.today }
    }),
  }
}

/** The lead of this task's team in its event, if any. */
export function teamLeadOf(s: DemoState, node: Node): string | undefined {
  if (!node.eventId || !node.teamId) return undefined
  return s.events.find(event => event.id === node.eventId)?.teamLeads?.[node.teamId]
}

/** Why the viewer cannot give this task to this person as its team lead; null when they can. */
export function assignTeamTaskError(s: DemoState, nodeId: string, ownerId: string): string | null {
  const node = s.nodes.find(item => item.id === nodeId)
  if (!node) return "This task is no longer in the plan."
  if (teamLeadOf(s, node) !== s.viewerId) return "Only this team's lead for the event can hand out its tasks."
  if (node.status === "done") return "This task is done."
  if (node.ownerId === ownerId) return "This task is already theirs."
  if (!teamMembers(s, node.teamId!).includes(ownerId)) return "Choose someone on this team."
  return null
}
