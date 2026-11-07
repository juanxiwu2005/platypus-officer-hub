import type { DemoState, HandoffSeason, Role, RoleFunction, RoleHandoff } from "./types"
import { applySchedule } from "../engine/schedule"
import { syncBudgetFlow } from "../engine/eventBudget"

/**
 * The sample scenario (Phase 3, P3-A). A participant sets up their own club in the founder walkthrough; the workspace they then use
 * keeps their club (name, mission, goals, roles, officers, settings, event workflow) and borrows the scenario from the fictional sample
 * club: its three event templates with their steps, the board tasks, funding, contacts, the handoff season and the private updates.
 *
 * Every sample record that points at a sample role or officer is moved to the participant's role with the same function (fallback: the
 * president role) and to that role's officer (fallback: the president's officer). Dates are not copied as facts: applySchedule (the
 * rule engine) recomputes every step date afterwards.
 */

/** Example lines the sample officers gave in their outgoing interview, by role function. Fictional, and labelled as examples on screen. */
export const SAMPLE_INTERVIEWS: Partial<Record<RoleFunction, string[]>> = {
  finance: [
    "Example (fictional): Photograph every receipt the day you buy something; USG wants the invoice addressed to ASU.",
    "Example (fictional): Reimbursement checks take about three weeks, so tell members before they pay out of pocket.",
    "Example (fictional): Reconcile the budget tracker after every event, not at the end of the semester.",
  ],
  secretary: [
    "Example (fictional): Send the general meeting agenda the day before and post minutes within two days.",
    "Example (fictional): Attendance from check-in feeds our loyal-members goal, so keep the sign-in sheet every week.",
    "Example (fictional): The officer list in Sun Devil Central must match whoever holds each role.",
  ],
  programs: [
    "Example (fictional): Room requests need the Event Registry number, so register the event first.",
    "Example (fictional): Only three officers can hold a Mazevo account; ask early if you need one.",
  ],
}

export interface SampleSeason { from: string; to: string }

/** A handoff season over the given roles: every role gets a record; roles whose function has sample interview lines start with them. */
export function sampleHandoff(roles: Role[], season: SampleSeason): { handoff: HandoffSeason; handoffRoles: RoleHandoff[] } {
  const seen = new Set<RoleFunction>()
  const handoffRoles = roles.map(role => {
    // Only the first role of a function inherits that function's example interview; a second role of the same kind starts empty.
    const interview = seen.has(role.fn) ? [] : SAMPLE_INTERVIEWS[role.fn] ?? []
    seen.add(role.fn)
    return { roleId: role.id, outgoingId: role.holderId, interview: [...interview], entries: [], sources: [], fingerprint: "", source: "", model: null, confirmed: false, approved: false, checks: [], completed: false, reviewed: false, incomingId: null }
  })
  return { handoff: { id: `season:${season.from}`, from: season.from, to: season.to, roleIds: roles.map(r => r.id) }, handoffRoles }
}

export interface SampleMaps { role: Map<string, string>; person: Map<string, string> }

/**
 * Where each sample role and officer goes in the participant's club. Same function first (a holder is preferred when the participant
 * made two roles of one kind), otherwise the president role; a role without an officer sends its work to the president's officer.
 */
export function sampleMaps(sample: Pick<DemoState, "roles" | "people">, roles: Role[]): SampleMaps {
  const president = roles.find(r => r.fn === "president") ?? roles[0]
  const presidentHolder = president?.holderId ?? roles.find(r => r.holderId)?.holderId ?? null
  const target = (fn: RoleFunction) => {
    const same = roles.filter(r => r.fn === fn)
    return same.find(r => r.holderId) ?? same[0] ?? president
  }
  const role = new Map<string, string>()
  const person = new Map<string, string>()
  for (const r of sample.roles) {
    const to = target(r.fn)
    if (to) role.set(r.id, to.id)
    const holder = to?.holderId ?? presidentHolder
    if (r.holderId && holder) person.set(r.holderId, holder)
  }
  // An officer of the sample club who holds no sample role (not expected, but possible after a demo handoff) goes to the president.
  for (const p of sample.people) if (!person.has(p.id) && presidentHolder) person.set(p.id, presidentHolder)
  return { role, person }
}

/**
 * The participant's club (from setup) plus the sample scenario. Pure: the sample is passed in (normally `seedDemo(today, "v2")`).
 * `setup` must be the state completeSetup returned: its roles, people, org, events and nodes are the participant's own.
 */
export function withSampleScenario(setup: DemoState, sample: DemoState): DemoState {
  const roles = setup.roles
  const { role, person } = sampleMaps(sample, roles)
  const president = roles.find(r => r.fn === "president")
  const r = (id: string | null | undefined): string | null => id ? role.get(id) ?? president?.id ?? null : null
  const p = (id: string | null | undefined): string | null => id ? person.get(id) ?? president?.holderId ?? null : null
  const ps = (ids: string[]) => [...new Set(ids.map(p).filter((id): id is string => !!id))]
  const rs = (ids: string[]) => [...new Set(ids.map(r).filter((id): id is string => !!id))]
  const goalId = setup.org.goals[0]?.id ?? null

  const events = sample.events.map(e => ({ ...e, goalId: e.goalId && setup.org.goals.some(g => g.id === e.goalId) ? e.goalId : goalId }))
  const nodes = sample.nodes.map(n => {
    const owner = p(n.ownerId)
    const ownRole = owner ? roles.find(x => x.holderId === owner)?.id ?? null : null
    return {
      ...n,
      ownerId: owner,
      approverRoleId: r(n.approverRoleId) === ownRole ? null : r(n.approverRoleId),
      consultedRoleIds: rs(n.consultedRoleIds).filter(id => id !== ownRole),
      informedRoleIds: rs(n.informedRoleIds).filter(id => id !== ownRole),
      waitingOnPersonId: n.waitingOnPersonId ? p(n.waitingOnPersonId) : n.waitingOnPersonId,
    }
  })
  const handoff = sample.handoff ? sampleHandoff(roles, { from: sample.handoff.from, to: sample.handoff.to }) : { handoff: null, handoffRoles: [] }

  const merged: DemoState = {
    ...setup,
    viewerId: president?.holderId ?? setup.viewerId,
    // The participant's own first event (if they planned one) comes first; the sample templates follow.
    events: [...setup.events, ...events],
    nodes: [...setup.nodes, ...nodes],
    nudges: sample.nudges.map(x => ({ ...x, sentBy: p(x.sentBy) ?? x.sentBy })),
    contributions: sample.contributions.flatMap(c => { const id = p(c.personId); return id ? [{ ...c, personId: id }] : [] }),
    organizations: sample.organizations.map(o => ({ ...o, createdBy: p(o.createdBy) })),
    contacts: sample.contacts.map(c => ({ ...c, ownerRoleId: r(c.ownerRoleId) ?? c.ownerRoleId, introducedById: p(c.introducedById), createdBy: p(c.createdBy) })),
    interactions: sample.interactions.flatMap(i => { const by = p(i.byId); return by ? [{ ...i, byId: by }] : [] }),
    funding: sample.funding.map(f => ({ ...f })),
    handoff: handoff.handoff,
    handoffRoles: handoff.handoffRoles,
    feedback: [],
    changeSets: [],
    extensionRequests: sample.extensionRequests.flatMap(x => { const owner = p(x.ownerId); return owner ? [{ ...x, ownerId: owner, ...(x.reviewedBy ? { reviewedBy: p(x.reviewedBy) ?? undefined } : {}) }] : [] }),
    notifications: sample.notifications.flatMap(x => { const to = p(x.recipientId); return to ? [{ ...x, recipientId: to }] : [] }),
    silenceCases: sample.silenceCases.flatMap(x => { const owner = p(x.ownerId); return owner ? [{ ...x, ownerId: owner, ...(x.temporaryOwnerId ? { temporaryOwnerId: p(x.temporaryOwnerId) ?? undefined } : {}) }] : [] }),
    protocolLog: sample.protocolLog.map(x => ({ ...x, recipientIds: ps(x.recipientIds), ...(x.suggestedOwnerId ? { suggestedOwnerId: p(x.suggestedOwnerId) ?? undefined } : {}) })),
    officerGrants: [],
  }
  // Dates come only from the rule engine: recompute every step and task now that owners (and their calendars) changed.
  return events.reduce((state, event) => syncBudgetFlow(state, event.id), applySchedule(merged))
}
