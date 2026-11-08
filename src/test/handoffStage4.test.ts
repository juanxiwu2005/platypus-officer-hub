import { describe, expect, it } from "vitest"
import { seedDemo } from "../data/seed"
import { reducer } from "../data/store"
import { handbookSources, sanitizeHandbook, sourceFingerprint } from "../lib/handbook"
import { HANDBOOK_MAX, HANDBOOK_SECTIONS, localHandbook, sectionOf } from "../lib/handbookDraft"
import { roleDossier } from "../lib/roleDossier"
import { handoffRisk } from "../lib/handoffRisk"
import type { Contact, DemoState } from "../data/types"
import type { HandoffAction } from "../data/handoff"

/** Handoff stage 4 (docs/HANDOFF_EXECUTION_PLAN.md §6): the role dossier, handbook sections and the handover risk. */
const as = (s: DemoState, viewerId: string) => ({ ...s, viewerId })
const act = (s: DemoState, action: HandoffAction) => reducer(s, { type: "handoffAction", action })
const sample = () => seedDemo(undefined, "v2")
const contact = (over: Partial<Contact>): Contact => ({ id: "c-test", name: "Riley Test (fictional)", title: "Advisor", organizationId: null, relation: "Campus office", email: "riley@example.org", phone: "555-0100", social: "@riley", preferredChannel: "email", tags: [], stage: "warm", source: "", introducedById: null, visibility: "all", lastContact: "2026-10-20", cadenceDays: 30, ownerRoleId: "r-fin", eventIds: [], createdBy: "maya", ...over })

describe("the role dossier", () => {
  it("has four blocks, each row naming the record it comes from", () => {
    const d = roleDossier(sample(), "r-fin")
    expect(d.blocks.calendar.some(r => r.id === "deadline:t-usg")).toBe(true)
    expect(d.blocks.calendar.some(r => r.id.startsWith("step:"))).toBe(true)
    expect(d.blocks.inFlight.length).toBeGreaterThan(0)
    expect(d.blocks.people.map(r => r.id)).toEqual(["contact:c-caterer"])
    for (const row of Object.values(d.blocks).flat()) expect(row.id).toMatch(/^(task|deadline|step|contact|lesson):[\w:-]+$/)
  })

  it("in flight lists open work only; calendar leaves out finished work and anything after the first 30 days", () => {
    const s = sample()
    const d = roleDossier(s, "r-fin")
    for (const row of d.blocks.inFlight) expect(s.nodes.find(n => n.id === row.nodeId)!.status).not.toBe("done")
    const later = { ...s, nodes: s.nodes.map(n => n.id === "t-usg" ? { ...n, clubDeadline: "2027-06-01", officialDeadline: null } : n.id === "t-recon" ? { ...n, status: "done" as const } : n) }
    const ids = roleDossier(later, "r-fin").blocks.calendar.map(r => r.id)
    expect(ids).not.toContain("deadline:t-usg")
    expect(ids).not.toContain("deadline:t-recon")
  })

  it("a contact line has no email, phone or handle", () => {
    const s = { ...sample(), contacts: [...sample().contacts, contact({})] }
    const text = roleDossier(s, "r-fin").blocks.people.map(r => r.text).join(" ")
    expect(text).toContain("Riley Test")
    expect(text).not.toMatch(/riley@|555-0100|@riley|email/i)
  })

  it("lessons come from extension requests, tasks that went quiet and work that finished late; a missing reason is a gap", () => {
    const s0 = sample()
    const s = {
      ...s0,
      extensionRequests: [{ id: "x1", nodeId: "t-usg", ownerId: "maya", requestedOn: s0.today, requestedDate: s0.today, previousDeadline: null, draftLink: "", reason: "", status: "approved" as const }],
      silenceCases: [{ id: "q1", nodeId: "t-recon", ownerId: "maya", startedOn: s0.today, closedOn: null }],
      contributions: [...s0.contributions, { personId: "maya", nodeId: "t-sponsor", points: 1, onTime: false }],
    }
    const d = roleDossier(s, "r-fin")
    expect(d.blocks.lessons.map(r => r.id)).toEqual(["lesson:ext:x1", "lesson:quiet:q1", "lesson:late:t-sponsor"])
    expect(d.blocks.lessons[0]).toMatchObject({ gap: true })
    expect(d.blocks.lessons[0].text).toContain("no reason recorded")
    expect(d.gaps).toBeGreaterThanOrEqual(1)
  })

  it("an empty role says so instead of making things up", () => {
    const s = sample()
    const draft = { ...s, roles: [...s.roles, { id: "r-new", displayName: "Events Chair", fn: "outreach" as const, holderId: null, reportsToId: null }] }
    const d = roleDossier(draft, "r-new")
    expect(d.blocks.inFlight).toEqual([])
    expect(d.blocks.people).toEqual([])
    expect(d.blocks.lessons).toEqual([])
    expect(roleDossier(draft, "nope").gaps).toBe(0)
  })
})

describe("leads-only contacts stay private, in the dossier and in the handbook", () => {
  const withSecret = () => ({ ...sample(), contacts: [...sample().contacts, contact({ id: "c-secret", name: "Quiet Donor (fictional)", visibility: "leads" })] })
  const people = (s: DemoState, viewer: string) => roleDossier(as(s, viewer), "r-fin").blocks.people.map(r => r.id)

  it("the dossier shows it to the president and the owning role, not to other officers", () => {
    const s = withSecret()
    expect(people(s, "alex")).toContain("contact:c-secret")
    expect(people(s, "maya")).toContain("contact:c-secret")
    expect(people(s, "jordan")).not.toContain("contact:c-secret")
  })

  it("the handbook never copies it, whoever builds it, so the same draft holds for every viewer", () => {
    const s = withSecret()
    for (const viewer of ["alex", "maya", "jordan"]) expect(handbookSources(as(s, viewer), "r-fin").map(x => x.id)).not.toContain("contact:c-secret")
    expect(sourceFingerprint(handbookSources(as(s, "alex"), "r-fin"))).toBe(sourceFingerprint(handbookSources(as(s, "jordan"), "r-fin")))
  })

  it("a handbook drafted by one person is not stale for the next (draft by Alex, confirm by Maya, approve by Alex)", () => {
    let s = act({ ...as(withSecret(), "alex"), handoff: null, handoffRoles: [] }, { kind: "start", from: "2026-10-31", to: "2026-11-21" })
    const src = handbookSources(s, "r-fin")
    s = act(s, { kind: "draft", roleId: "r-fin", raw: { entries: src.slice(0, 5).map(x => ({ sourceId: x.id })) }, fingerprint: sourceFingerprint(src), model: null, source: "t" })
    s = act(as(s, "maya"), { kind: "confirm", roleId: "r-fin" })
    s = act(as(s, "alex"), { kind: "approve", roleId: "r-fin" })
    expect(s.handoffRoles.find(r => r.roleId === "r-fin")).toMatchObject({ confirmed: true, approved: true })
  })
})

describe("handbook sources and sections", () => {
  it("sources are unique and cover the dossier plus tasks and interview", () => {
    const src = handbookSources(sample(), "r-fin")
    expect(new Set(src.map(s => s.id)).size).toBe(src.length)
    expect(new Set(src.map(s => s.kind))).toEqual(new Set(["task", "deadline", "step", "contact", "interview"]))
  })

  it("every source belongs to one section, and tasks split into open work and finished work", () => {
    const s = sample()
    const src = handbookSources(s, "r-fin")
    for (const x of src) expect(HANDBOOK_SECTIONS).toContain(sectionOf(x))
    expect(sectionOf({ id: "task:a", kind: "task", text: "Task: x. Purpose: y. Recorded status: done." })).toBe("Finished work")
    expect(sectionOf({ id: "task:a", kind: "task", text: "Task: x. Purpose: y. Recorded status: waiting." })).toBe("In flight")
    expect(sectionOf({ id: "interview:r:1", kind: "interview", text: "x" })).toBe("From the outgoing officer")
  })

  it("the built-in handbook takes from every section in turn, at most 12", () => {
    const src = handbookSources(sample(), "r-fin")
    const picked = localHandbook(src).entries.map(e => src.find(s => s.id === e.sourceId)!)
    expect(picked.length).toBeLessThanOrEqual(HANDBOOK_MAX)
    const sections = new Set(picked.map(sectionOf))
    for (const name of HANDBOOK_SECTIONS) if (src.some(x => sectionOf(x) === name)) expect(sections).toContain(name)
  })

  it("the AI can only pick records that exist, and new kinds are accepted as sources", () => {
    const src = handbookSources(sample(), "r-fin")
    const entries = sanitizeHandbook({ entries: [{ sourceId: "deadline:t-usg", text: "INVENTED 2099-01-01" }, { sourceId: "contact:c-caterer" }, { sourceId: "contact:nope" }] }, src)
    expect(entries.map(e => e.sourceId)).toEqual(["deadline:t-usg", "contact:c-caterer"])
    expect(JSON.stringify(entries)).not.toMatch(/INVENTED|2099/)
  })
})

describe("handover risk", () => {
  it("orders roles by simple counts and explains in at most three reasons", () => {
    const s = sample()
    const risks = Object.fromEntries(s.roles.map(r => [r.id, handoffRisk(s, r.id)]))
    expect(risks["r-mkt"].score).toBeGreaterThan(risks["r-sec"].score)
    expect(new Set(Object.values(risks).map(r => r.level)).size).toBeGreaterThan(1) // not everything is "high"
    for (const r of Object.values(risks)) { expect(r.reasons.length).toBeLessThanOrEqual(3); expect(r.reasons[0]).toMatch(/open task/) }
  })

  it("two ASU deadlines in the next 30 days make a role high risk on their own", () => {
    const s = sample()
    expect(handoffRisk(s, "r-sec").level).not.toBe("high")
    const secretary = s.nodes.filter(n => n.ownerId === "priya" && n.status !== "done").slice(0, 2).map(n => n.id)
    expect(secretary).toHaveLength(2)
    const nodes = s.nodes.map(n => secretary.includes(n.id) ? { ...n, officialDeadline: "2026-11-10" } : n)
    const r = handoffRisk({ ...s, nodes }, "r-sec")
    expect(r.level).toBe("high")
    expect(r.reasons).toContain("2 ASU deadlines within 30 days")
  })

  it("a role with nothing open is low risk", () => {
    const s = sample()
    const r = handoffRisk({ ...s, roles: [...s.roles, { id: "r-new", displayName: "Events Chair", fn: "outreach", holderId: null, reportsToId: null }] }, "r-new")
    expect(r.level).toBe("low")
  })
})
