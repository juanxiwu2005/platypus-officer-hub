import type { DemoState } from "../data/types"
import { canCreateEvent, canLead } from "../data/changeReview"
import { forecastFor } from "../engine/forecast"
import { workload } from "../engine/team"
import { personalBuffer } from "../engine/schedule"
import { RULES } from "../data/rules"
import { departmentsOf, dutiesOf, roleDepartment } from "../data/structure"

/**
 * Everything the signed-in officer can see in the app, as one compact object for the assistant (v1.2,
 * Juanxi 2026-10-23: "AI 能访问当前账号下管理的所有数据"). Same visibility as the pages:
 * - other officers' personal buffers, private notices and private replies are left out;
 * - uploaded files, the demo signing key and officer links never leave the browser.
 * All dates here come from the rule engine or from people; the assistant may repeat them, never invent them.
 */
export function aiSnapshot(s: DemoState) {
  const me = s.people.find(p => p.id === s.viewerId)
  const lead = canLead(s)
  const f = forecastFor(s)
  const name = (id: string | null | undefined) => s.people.find(p => p.id === id)?.name ?? null
  const role = (id: string | null | undefined) => s.roles.find(r => r.id === id)?.displayName ?? null
  return {
    today: s.today,
    you: me && { id: me.id, name: me.name, role: role(me.roleId), canApprove: lead, canCreateEvents: canCreateEvent(s), personalBufferDays: personalBuffer(s, me).days, busyWeeks: me.busyWeeks, remindAt: me.remindAt, channels: me.channels },
    club: { name: s.org.name, school: s.org.school, mission: s.org.mission, goals: s.org.goals.map(({ label, target, current, unit }) => ({ label, target, current, unit })), clubBufferBusinessDays: s.org.settings.clubBufferBusinessDays, sendMode: s.org.settings.sendMode, tags: (s.org.board?.tags ?? []).map(({ id, label }) => ({ id, label })), planningNotes: s.org.workspace.planningNotes.slice(0, 1500) },
    roles: s.roles.map(r => ({ id: r.id, title: r.displayName, function: r.fn, holder: name(r.holderId), holderId: r.holderId, department: roleDepartment(departmentsOf(s), r)?.name ?? null, reportsTo: role(r.reportsToId), duties: dutiesOf(r) })),
    departments: departmentsOf(s).map(d => ({ id: d.id, name: d.name, function: d.fn, duties: d.duties })),
    people: s.people.map(p => {
      const w = workload(s, p.id)
      return { id: p.id, name: p.name, role: role(p.roleId), email: p.email, channels: p.channels, busyWeeks: p.busyWeeks, careerGoal: p.careerGoal, interests: p.interests, workload: w.band, workloadPoints: w.points }
    }),
    events: s.events.map(e => ({ id: e.id, name: e.name, date: e.date, type: e.type, headcount: e.headcount, venue: e.venue, food: e.food, funding: e.funding, speaker: e.speaker, details: e.details ?? null, risk: f.events[e.id]?.color ?? null })),
    tasks: s.nodes.map(n => n.status === "done"
      ? { id: n.id, title: n.title, eventId: n.eventId, status: n.status, owner: name(n.ownerId), completedOn: n.completedOn ?? null }
      : {
        id: n.id, title: n.title, eventId: n.eventId, phase: n.phase, status: n.status, ownerId: n.ownerId, owner: name(n.ownerId), tier: n.tier, tags: n.tags ?? [],
        startBy: n.latestStart, clubDeadline: n.clubDeadline, officialDeadline: n.officialDeadline, overdue: !!n.clubDeadline && n.clubDeadline < s.today,
        risk: f.nodes[n.id]?.color ?? null, onTimeChance: f.nodes[n.id] ? Math.round(f.nodes[n.id].probability * 100) : null,
        waitsFor: n.dependsOn, waitingOn: n.waitingOn, rules: n.ruleIds, why: n.why.slice(0, 200),
      }),
    funding: s.funding.map(x => ({ eventId: x.eventId, event: s.events.find(e => e.id === x.eventId)?.name, source: x.source, amount: x.amount, spent: x.spent ?? 0, stage: x.stage, spendBy: x.spendBy })),
    partners: s.contacts.map(c => ({ id: c.id, name: c.name, organization: c.organization, relation: c.relation, owner: role(c.ownerRoleId), lastContact: c.lastContact, cadenceDays: c.cadenceDays, events: c.eventIds })),
    handoff: s.handoff && { from: s.handoff.from, to: s.handoff.to, roles: s.handoffRoles.map(h => ({ role: role(h.roleId), outgoing: name(h.outgoingId), incoming: name(h.incomingId), confirmed: h.confirmed, approved: h.approved, completed: h.completed })) },
    yourUpdates: s.notifications.filter(n => n.recipientId === s.viewerId).slice(-15).map(n => ({ text: n.text, on: n.createdOn, read: n.read, taskId: n.nodeId })),
    extensionRequests: s.extensionRequests.filter(r => lead || r.ownerId === s.viewerId).map(r => ({ taskId: r.nodeId, owner: name(r.ownerId), requestedDate: r.requestedDate, reason: r.reason.slice(0, 200), status: r.status })),
    silentTasks: lead ? s.silenceCases.filter(c => !c.closedOn).map(c => ({ taskId: c.nodeId, owner: name(c.ownerId), since: c.startedOn })) : [],
    remindersSent: lead ? s.nudges.slice(-10).map(n => ({ taskId: n.nodeId, on: n.sentOn, channel: n.channel })) : [],
    ruleBook: RULES.map(r => ({ id: r.id, short: r.short ?? r.text.slice(0, 80), timing: r.timing ?? null })),
  }
}
export type AiSnapshot = ReturnType<typeof aiSnapshot>

/** Every date the app itself knows. Only these may appear in the assistant's words. */
export function knownDates(value: unknown, out = new Set<string>()): Set<string> {
  if (typeof value === "string") { for (const m of value.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)) out.add(m[0]) }
  else if (Array.isArray(value)) value.forEach(v => knownDates(v, out))
  else if (value && typeof value === "object") Object.values(value).forEach(v => knownDates(v, out))
  return out
}
