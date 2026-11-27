import { describe, expect, it } from "vitest"
import { seedDemo } from "../data/seed"
import { clubDraft, type ClubDraft } from "../data/settings"
import { blankPerson, demoEmail, DUTY_TEMPLATES } from "../data/structure"
import { playbookOf } from "../data/playbook"
import { reducer } from "../data/store"
import type { DemoState, Role, RoleFunction } from "../data/types"

// Audit D8: a brand-new club must not inherit the demo club's Playbook (answers by alex/maya/jordan/sam, role IDs of the demo club),
// its onboarding checklist, its role terms or its earlier handoff rounds. Runs the same reducer action the Team screen dispatches.
const CODE = "12345678-1234-1234-1234-123456789abc"

/** A new club with its own role and officer IDs (none shared with the demo club). */
function newClub(s: DemoState): ClubDraft {
  const rows: [string, string, RoleFunction, string | null][] = [
    ["c-pres", "President", "president", "Avery Quinn"],
    ["c-vpf", "Vice President of Finance", "finance", "Casey Ito"],
    ["c-doe", "Director of Events", "programs", "Emery Shah"],
    ["c-sec", "Secretary", "secretary", "Harper Diaz"],
    ["c-adv", "Faculty Advisor", "advisor", null],
  ]
  const roles: Role[] = rows.map(([id, displayName, fn, who], i) => ({ id, displayName, fn, holderId: who ? `p-${id}` : null, reportsToId: i ? "c-pres" : null, duties: DUTY_TEMPLATES[fn] }))
  const people = rows.filter(([, , , who]) => who).map(([id, , , who]) => ({ ...blankPerson(`p-${id}`, id, who!), email: demoEmail(who!) }))
  return { name: "Fictional Robotics Guild", mission: "Build and race small robots together.", goals: [], roles, people, workspace: s.org.workspace }
}

/** The demo club after some use: a vote and a read on its Playbook, an onboarding checklist, an earlier handoff round and chosen event creators. */
function usedDemo(): DemoState {
  const s = seedDemo(undefined, "v2")
  const p = s.playbook!
  return {
    ...s,
    playbook: { ...p, reads: { alex: ["pq-1"], maya: ["pq-2"] }, asked: [{ id: "ask-1", questionText: "Who books the van?", askedBy: "maya", askedOn: s.today, status: "open" }], categories: [{ id: "cat:van", label: "Van" }] },
    org: { ...s.org, onboardingChecklist: { version: 1, modules: [], updatedOn: s.today }, settings: { ...s.org.settings, eventCreatorIds: ["maya"] } },
    handoffHistory: [{ ...s.handoffRoles[0], season: "season:old" }],
  }
}

const start = (s: DemoState, d: ClubDraft) => reducer(s, { type: "completeSetup", draft: d, event: null, date: "", inviteCode: CODE })

/** Every person or role ID the Playbook, role terms and handoff data name that the club does not have. */
function dangling(s: DemoState): string[] {
  const people = new Set(s.people.map(p => p.id)), roles = new Set(s.roles.map(r => r.id))
  const bad: string[] = []
  const person = (id: string | null | undefined, where: string) => { if (id && !people.has(id)) bad.push(`${where} → ${id}`) }
  const role = (id: string, where: string) => { if (!roles.has(id)) bad.push(`${where} → ${id}`) }
  const p = s.playbook
  for (const q of p?.questions ?? []) { person(q.createdBy, `question ${q.id}.createdBy`); if (q.roleIds !== "all") for (const id of q.roleIds) role(id, `question ${q.id}.roleIds`) }
  for (const a of p?.answers ?? []) { person(a.authorId, `answer ${a.id}.authorId`); for (const id of [...a.votes.up, ...a.votes.down]) person(id, `answer ${a.id}.votes`) }
  for (const [who, ids] of Object.entries(p?.reads ?? {})) { person(who, "reads"); expect(ids.length).toBeGreaterThan(0) }
  for (const x of p?.asked ?? []) person(x.askedBy, `asked ${x.id}.askedBy`)
  for (const t of s.roleTerms) { person(t.personId, `term ${t.id}.personId`); role(t.roleId, `term ${t.id}.roleId`) }
  for (const h of s.handoffHistory ?? []) { role(h.roleId, "handoffHistory.roleId"); person(h.outgoingId, "handoffHistory.outgoingId"); person(h.incomingId, "handoffHistory.incomingId") }
  for (const h of s.handoffRoles) { role(h.roleId, "handoffRole.roleId"); person(h.outgoingId, "handoffRole.outgoingId"); person(h.incomingId, "handoffRole.incomingId") }
  for (const id of s.org.settings.eventCreatorIds ?? []) person(id, "settings.eventCreatorIds")
  return bad
}

describe("a new club starts its own Playbook (D8)", () => {
  it("keeps only the school-rule questions and answers, with no dangling person or role IDs", () => {
    const before = usedDemo()
    const next = start(before, newClub(before))
    expect(next).not.toBe(before)
    expect(dangling(next)).toEqual([])
    const p = playbookOf(next)
    // Every answer is a school rule with its source, written by nobody, with no votes.
    expect(p.answers.length).toBeGreaterThan(0)
    expect(p.answers.every(a => a.kind === "rule" && a.authorId === null && !!a.policyId && !a.votes.up.length && !a.votes.down.length)).toBe(true)
    expect(p.answers.some(a => a.text.includes("5 weeks ahead"))).toBe(false)
    // Only sample questions that have a school rule; none of the demo club's own extras.
    expect(p.questions.map(q => q.id)).toEqual(["pq-1", "pq-2", "pq-3", "pq-4", "pq-5", "pq-6", "pq-7", "pq-8", "pq-11", "pq-12"])
    expect(p.questions.every(q => q.origin === "seed" && q.createdBy === null && q.checklistItemIds.length === 0)).toBe(true)
    expect(p.reads).toBeUndefined()
    expect(p.asked).toBeUndefined()
    expect(p.categories).toBeUndefined()
    // Question roles follow the role with the same function: the Treasurer's questions go to the new finance role.
    expect(p.questions.find(q => q.id === "pq-2")!.roleIds).toEqual(["c-vpf"])
    expect(p.questions.find(q => q.id === "pq-4")!.roleIds).toEqual(["c-doe"])
  })

  it("the onboarding checklist is the default for a new club (not set up), and role terms are the new holders only", () => {
    const before = usedDemo()
    const next = start(before, newClub(before))
    expect(before.org.onboardingChecklist).toBeDefined()
    expect(next.org.onboardingChecklist).toBeUndefined()
    expect(next.handoffHistory).toBeUndefined()
    expect(next.org.settings.eventCreatorIds).toEqual([])
    expect(next.roleTerms.map(t => [t.roleId, t.personId, t.status])).toEqual(next.roles.filter(r => r.holderId).map(r => [r.id, r.holderId, "active"]))
  })

  it("the same holds when the founder keeps the demo club's own roles and officers", () => {
    const before = usedDemo()
    const next = start(before, clubDraft(before))
    expect(dangling(next)).toEqual([])
    const p = playbookOf(next)
    expect(p.answers.every(a => a.kind === "rule" && a.authorId === null)).toBe(true)
    expect(p.reads).toBeUndefined()
    expect(next.org.onboardingChecklist).toBeUndefined()
    expect(next.org.settings.eventCreatorIds).toEqual(["maya"])
    expect(next.roleTerms.every(t => t.status === "active")).toBe(true)
  })
})
