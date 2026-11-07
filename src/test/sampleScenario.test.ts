import { describe, expect, it } from "vitest"
import { DEMO_TODAY, seedDemo } from "../data/seed"
import { clubDraft, completeSetup, startWorkspace, type ClubDraft } from "../data/settings"
import { sampleMaps, withSampleScenario } from "../data/sampleScenario"
import { blankPerson, demoEmail, DUTY_TEMPLATES } from "../data/structure"
import { parseCommand } from "../lib/commands"
import { applySchedule } from "../engine/schedule"
import { forecastFor, forecastQueue } from "../engine/forecast"
import { reducer } from "../data/store"
import type { DemoState, Role, RoleFunction } from "../data/types"

// P3-A: after Start workspace the participant's own club keeps the sample scenario (three event templates, tasks, risks, funding,
// contacts, handoff), moved onto the participant's roles and officers. Dates come from the rule engine.
const CODE = "12345678-1234-1234-1234-123456789abc"
const SAMPLE_EVENTS = ["Networking Night", "Spring Speaker Night", "Founder Dinner"]
const base = () => seedDemo(undefined, "v2")
const mixer = (s: DemoState) => parseCommand("Plan Welcome Mixer on Nov 19, 30 people", s)[0]

/** A club the way a constitution reads it: ten renamed roles with new ids, new officers, one vacant advisor seat. */
function constitutionClub(s: DemoState, drop: RoleFunction[] = []): ClubDraft {
  const rows: [string, string, RoleFunction, string | null][] = [
    ["c-pres", "President", "president", "Avery Quinn"],
    ["c-vp", "Vice President", "vice_president", "Blake Moreno"],
    ["c-vpf", "Vice President of Finance", "finance", "Casey Ito"],
    ["c-dom", "Director of Marketing", "marketing", "Devon Park"],
    ["c-doe", "Director of Events", "programs", "Emery Shah"],
    ["c-dow", "Director of Workshops", "programs", "Finley Ross"],
    ["c-out", "Director of Outreach", "outreach", "Gray Lopez"],
    ["c-sec", "Secretary", "secretary", "Harper Diaz"],
    ["c-mem", "Membership Chair", "membership", "Indy Brooks"],
    ["c-adv", "Faculty Advisor", "advisor", null],
  ]
  const kept = rows.filter(([, , fn]) => !drop.includes(fn))
  const roles: Role[] = kept.map(([id, displayName, fn, who], i) => ({ id, displayName, fn, holderId: who ? `p-${id}` : null, reportsToId: i ? "c-pres" : null, duties: DUTY_TEMPLATES[fn] }))
  const people = kept.filter(([, , , who]) => who).map(([id, , , who]) => ({ ...blankPerson(`p-${id}`, id, who!), email: demoEmail(who!) }))
  return { name: "Fictional Robotics Guild", mission: "Build and race small robots together.", goals: [{ id: "g-new", label: "Build nights", target: 8, current: 3, unit: "nights" }], roles, people, workspace: s.org.workspace }
}

/** Every reference in the state that names a role, an officer, an event or a node, with what it points at. */
function danglingRefs(s: DemoState): string[] {
  const roles = new Set(s.roles.map(r => r.id)), people = new Set(s.people.map(p => p.id)), events = new Set(s.events.map(e => e.id)), nodes = new Set(s.nodes.map(n => n.id))
  const contacts = new Set(s.contacts.map(c => c.id)), orgs = new Set(s.organizations.map(o => o.id))
  const bad: string[] = []
  const check = (set: Set<string>, id: string | null | undefined, where: string) => { if (id && !set.has(id)) bad.push(`${where} → ${id}`) }
  check(people, s.viewerId, "viewerId")
  for (const r of s.roles) { check(people, r.holderId, `role ${r.id}.holderId`); check(roles, r.reportsToId, `role ${r.id}.reportsToId`) }
  for (const p of s.people) check(roles, p.roleId, `person ${p.id}.roleId`)
  for (const n of s.nodes) {
    check(people, n.ownerId, `node ${n.id}.ownerId`); check(roles, n.approverRoleId, `node ${n.id}.approverRoleId`); check(people, n.waitingOnPersonId, `node ${n.id}.waitingOnPersonId`)
    for (const id of [...n.consultedRoleIds, ...n.informedRoleIds]) check(roles, id, `node ${n.id}.raci`)
    check(events, n.eventId, `node ${n.id}.eventId`)
    for (const id of n.dependsOn) check(nodes, id, `node ${n.id}.dependsOn`)
  }
  for (const c of s.contributions) { check(people, c.personId, "contribution.personId"); check(nodes, c.nodeId, "contribution.nodeId") }
  for (const c of s.contacts) { check(roles, c.ownerRoleId, `contact ${c.id}.ownerRoleId`); check(people, c.introducedById, `contact ${c.id}.introducedById`); check(people, c.createdBy, `contact ${c.id}.createdBy`); check(orgs, c.organizationId, `contact ${c.id}.organizationId`); for (const id of c.eventIds) check(events, id, `contact ${c.id}.eventIds`) }
  for (const o of s.organizations) check(people, o.createdBy, `organization ${o.id}.createdBy`)
  for (const i of s.interactions) { check(people, i.byId, `interaction ${i.id}.byId`); check(contacts, i.contactId, `interaction ${i.id}.contactId`); check(orgs, i.organizationId, `interaction ${i.id}.organizationId`); check(events, i.eventId, `interaction ${i.id}.eventId`) }
  for (const f of s.funding) check(events, f.eventId, "funding.eventId")
  for (const x of s.notifications) { check(people, x.recipientId, `notice ${x.id}.recipientId`); check(nodes, x.nodeId, `notice ${x.id}.nodeId`) }
  for (const x of s.nudges) { check(people, x.sentBy, "nudge.sentBy"); check(nodes, x.nodeId, "nudge.nodeId") }
  for (const x of s.extensionRequests) { check(people, x.ownerId, "extension.ownerId"); check(nodes, x.nodeId, "extension.nodeId") }
  for (const x of s.silenceCases) { check(people, x.ownerId, "silence.ownerId"); check(people, x.temporaryOwnerId, "silence.temporaryOwnerId") }
  for (const x of s.protocolLog) { for (const id of x.recipientIds) check(people, id, "protocol.recipientIds"); check(people, x.suggestedOwnerId, "protocol.suggestedOwnerId") }
  for (const id of s.handoff?.roleIds ?? []) check(roles, id, "handoff.roleIds")
  for (const r of s.handoffRoles) { check(roles, r.roleId, "handoffRole.roleId"); check(people, r.outgoingId, "handoffRole.outgoingId"); check(people, r.incomingId, "handoffRole.incomingId") }
  for (const id of s.org.settings.eventCreatorIds ?? []) check(people, id, "settings.eventCreatorIds")
  for (const e of s.events) if (e.goalId && !s.org.goals.some(g => g.id === e.goalId)) bad.push(`event ${e.id}.goalId → ${e.goalId}`)
  return bad
}

/** Dates are the rule engine's: scheduling the result again changes no date. */
const datesOf = (s: DemoState) => s.nodes.map(n => [n.id, n.officialDeadline, n.clubDeadline, n.latestStart])

describe("Start workspace keeps the sample scenario", () => {
  it("default roles: the sample club's own draft gets the three templates plus the planned event, with every owner unchanged", () => {
    const s = base(), d = clubDraft(s)
    const next = startWorkspace(s, d, mixer(s), "2026-11-19", CODE)
    expect(next.events.map(e => e.name)).toEqual(["Welcome Mixer", ...SAMPLE_EVENTS])
    expect(next.viewerId).toBe("alex")
    const sample = new Map(s.nodes.map(n => [n.id, n]))
    for (const n of next.nodes.filter(n => sample.has(n.id))) {
      expect(n.ownerId, n.id).toBe(sample.get(n.id)!.ownerId)
      expect(n.status, n.id).toBe(sample.get(n.id)!.status)
    }
    expect(next.nodes.filter(n => !n.eventId)).toHaveLength(s.nodes.filter(n => !n.eventId).length)
    expect(next.contacts.map(c => [c.id, c.ownerRoleId])).toEqual(s.contacts.map(c => [c.id, c.ownerRoleId]))
    expect(next.funding).toEqual(s.funding)
    expect(next.handoff?.roleIds).toEqual(next.roles.map(r => r.id))
    expect(next.handoffRoles.find(r => r.roleId === "r-fin")?.interview.length).toBeGreaterThan(0)
    expect(next.org.setupCompletedOn).toBe(next.today)
    expect(next.org.inviteCode).toBe(CODE)
    expect(danglingRefs(next)).toEqual([])
  })

  it("Today, Tasks and Superstar are populated: at-risk items with an owner to remind, every board status, a star this week", () => {
    const s = base(), next = startWorkspace(s, clubDraft(s), mixer(s), "2026-11-19", CODE)
    const risks = forecastQueue(next, forecastFor(next))
    expect(risks.length).toBe(3)
    expect(risks.some(n => n.ownerId)).toBe(true)
    const standalone = next.nodes.filter(n => !n.eventId)
    expect(standalone.length).toBeGreaterThanOrEqual(15)
    expect(standalone.length).toBeLessThanOrEqual(25)
    expect(new Set(standalone.map(n => n.status))).toEqual(new Set(["unclaimed", "accepted", "in_progress", "waiting", "blocked", "done"]))
    expect(new Set(standalone.map(n => n.ownerId).filter(Boolean))).toEqual(new Set(next.people.map(p => p.id)))
    expect(next.contributions.length).toBeGreaterThan(0)
    expect(next.notifications.some(x => x.recipientId === next.viewerId && !x.read)).toBe(true)
  })

  it("constitution-style renamed roles: each record moves to the role with the same function and its officer", () => {
    const s = base(), d = constitutionClub(s)
    const next = startWorkspace(s, d, mixer(s), "2026-11-19", CODE)
    expect(next.org.name).toBe("Fictional Robotics Guild")
    expect(next.roles.map(r => r.id).sort()).toEqual(d.roles.map(r => r.id).sort())
    expect(next.people.map(p => p.id).sort()).toEqual(d.people.map(p => p.id).sort())
    expect(next.viewerId).toBe("p-c-pres")
    expect(next.events.map(e => e.name)).toEqual(["Welcome Mixer", ...SAMPLE_EVENTS])
    const owner = (id: string) => next.nodes.find(n => n.id === id)!.ownerId
    expect(owner("t-recon")).toBe("p-c-vpf")            // Treasurer's task → Vice President of Finance
    expect(owner("t-flyer")).toBe("p-c-dom")            // Marketing lead → Director of Marketing
    expect(owner("t-room")).toBe("p-c-doe")             // Events lead → the first programs role with an officer
    expect(owner("t-agenda")).toBe("p-c-sec")
    expect(owner("t-sdc")).toBe("p-c-pres")
    expect(owner("e-night:budgetRequest")).toBe("p-c-vpf")
    expect(next.contacts.find(c => c.id === "c-caterer")!.ownerRoleId).toBe("c-vpf")
    expect(next.contacts.find(c => c.id === "c-founder")!.ownerRoleId).toBe("c-pres")
    expect(next.nodes.find(n => n.id === "e-night:budgetRequest")!.approverRoleId).toBe("c-pres")
    expect(next.handoffRoles.map(r => r.roleId)).toEqual(next.roles.map(r => r.id))
    expect(next.handoffRoles.find(r => r.roleId === "c-adv")!.outgoingId).toBeNull()
    expect(next.org.goals.map(g => g.id)).toEqual(["g-new"])
    expect(next.events.every(e => e.goalId === "g-new")).toBe(true)
    // Nothing from the sample club's people or roles is left.
    expect(JSON.stringify({ nodes: next.nodes, contacts: next.contacts, contributions: next.contributions, notifications: next.notifications, handoffRoles: next.handoffRoles, interactions: next.interactions })).not.toMatch(/"(alex|maya|jordan|sam|priya|r-pres|r-fin|r-events|r-mkt|r-sec)"/)
    expect(danglingRefs(next)).toEqual([])
  })

  it("missing finance role: finance work and contacts go to the president role and its officer", () => {
    const s = base(), d = constitutionClub(s, ["finance"])
    const next = startWorkspace(s, d, mixer(s), "2026-11-19", CODE)
    expect(next.nodes.find(n => n.id === "t-recon")!.ownerId).toBe("p-c-pres")
    expect(next.nodes.filter(n => n.eventId === "e-night" && n.fn === "finance").every(n => n.ownerId === "p-c-pres")).toBe(true)
    expect(next.contacts.find(c => c.id === "c-caterer")!.ownerRoleId).toBe("c-pres")
    expect(next.contributions.filter(c => c.nodeId === "e-night:budget").map(c => c.personId)).toEqual(["p-c-pres"])
    // The president owns those steps now, so nobody is asked to approve their own work.
    expect(next.nodes.filter(n => n.ownerId === "p-c-pres").every(n => n.approverRoleId !== "c-pres")).toBe(true)
    expect(danglingRefs(next)).toEqual([])
  })

  it("a vacant role sends its work to the president's officer", () => {
    const s = base(), d = constitutionClub(s)
    d.roles = d.roles.map(r => r.id === "c-dom" ? { ...r, holderId: null } : r); d.people = d.people.filter(p => p.id !== "p-c-dom")
    const next = startWorkspace(s, d, mixer(s), "2026-11-19", CODE)
    expect(next.nodes.find(n => n.id === "t-flyer")!.ownerId).toBe("p-c-pres")
    expect(next.contacts.every(c => d.roles.some(r => r.id === c.ownerRoleId))).toBe(true)
    expect(danglingRefs(next)).toEqual([])
  })

  it("skipped first event: no setup event, the rest of setup and the sample still apply", () => {
    const s = base(), d = constitutionClub(s)
    const club = completeSetup(s, d, null, "", CODE)
    expect(club).not.toBe(s)
    expect(club.events).toEqual([]); expect(club.nodes).toEqual([])
    expect(club.org.name).toBe("Fictional Robotics Guild"); expect(club.org.setupCompletedOn).toBe(s.today)
    expect(completeSetup(s, d, undefined, "", CODE).events).toEqual([])
    const next = startWorkspace(s, d, null, "", CODE)
    expect(next.events.map(e => e.name)).toEqual(SAMPLE_EVENTS)
    expect(next.nodes.some(n => n.eventId?.startsWith("setup-event"))).toBe(false)
    expect(next.viewerId).toBe("p-c-pres")
    expect(danglingRefs(next)).toEqual([])
    // A planned event still needs a valid, future date; a refused setup changes nothing.
    expect(completeSetup(s, d, mixer(s), "", CODE)).toBe(s)
    expect(startWorkspace(s, d, mixer(s), "2026-10-01", CODE)).toBe(s)
    expect(startWorkspace({ ...s, viewerId: "maya" }, d, null, "", CODE).viewerId).toBe("maya")
  })

  it("dates come from the rule engine: scheduling again changes nothing, and the setup event keeps its own dates", () => {
    const s = base(), d = constitutionClub(s)
    const club = completeSetup(s, d, mixer(s), "2026-11-19", CODE)
    const next = withSampleScenario(club, seedDemo(club.today, "v2"))
    expect(datesOf(applySchedule(next))).toEqual(datesOf(next))
    for (const n of club.nodes) expect(next.nodes.find(x => x.id === n.id)).toMatchObject({ officialDeadline: n.officialDeadline, latestStart: n.latestStart, ownerId: n.ownerId })
    expect(next.events.find(e => e.id === "e-founder")!.date).toBe("2026-12-03")
    expect(next.nodes.every(n => !!n.clubDeadline && !!n.latestStart)).toBe(true)
  })

  it("the Start workspace action uses it; the preview helper stays the participant's club only", () => {
    const s = base(), d = clubDraft(s)
    const action = reducer(s, { type: "completeSetup", draft: d, event: mixer(s), date: "2026-11-19", inviteCode: CODE })
    expect(action.events.map(e => e.name)).toEqual(["Welcome Mixer", ...SAMPLE_EVENTS])
    expect(completeSetup(s, d, mixer(s), "2026-11-19", CODE).events.map(e => e.name)).toEqual(["Welcome Mixer"])
    expect(reducer(s, { type: "completeSetup", draft: d, event: null, date: "", inviteCode: CODE }).events.map(e => e.name)).toEqual(SAMPLE_EVENTS)
  })
})

describe("sample role map", () => {
  it("prefers a role with an officer, then the president", () => {
    const s = base(), d = constitutionClub(s, ["secretary"])
    const { role, person } = sampleMaps(s, d.roles)
    expect(role.get("r-events")).toBe("c-doe")
    expect(role.get("r-sec")).toBe("c-pres")
    expect(person.get("priya")).toBe("p-c-pres")
    expect(person.get("maya")).toBe("p-c-vpf")
  })
})

describe("the sample club's week (seed v2)", () => {
  it("is fictional, dated by the engine and consistent", () => {
    const s = base()
    expect(s.today).toBe(DEMO_TODAY)
    expect(danglingRefs(s)).toEqual([])
    expect(datesOf(applySchedule(s))).toEqual(datesOf(s))
    for (const c of s.contributions) expect(s.nodes.find(n => n.id === c.nodeId)?.status).toBe("done")
    // Not claimed work has no owner (assigned work starts in To do).
    for (const n of s.nodes.filter(n => n.status === "unclaimed")) expect(n.ownerId).toBeNull()
  })
})
