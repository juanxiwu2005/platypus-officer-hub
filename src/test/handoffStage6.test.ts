import { beforeEach, describe, expect, it } from "vitest"
import { SCHEMA_VERSION, seedDemo } from "../data/seed"
import { loadStateWithNotice, reducer, STORAGE_KEY } from "../data/store"
import { clubDraft, validateClub } from "../data/settings"
import { handbookSources } from "../lib/handbook"
import { ROLE_START_PROMPTS, roleDossier } from "../lib/roleDossier"
import type { RoleChange } from "../data/roleChanges"
import type { DemoState, Role } from "../data/types"

/** Handoff stage 6 (docs/HANDOFF_EXECUTION_PLAN.md §8): role renames, new-role starter notes, moving work, closing a role (kept, never deleted: D-6a). */
const change = (s: DemoState, c: RoleChange) => reducer(s, { type: "roleChange", change: c })
const as = (s: DemoState, viewerId: string) => ({ ...s, viewerId })
const sample = () => seedDemo(undefined, "v2")
const save = (s: DemoState, edit: (roles: Role[]) => Role[]) => { const d = clubDraft(s); d.roles = edit(d.roles); return reducer(s, { type: "saveClubSettings", draft: d, defaults: s.org.settings }) }
const rename = (s: DemoState, id: string, displayName: string) => save(s, roles => roles.map(r => r.id === id ? { ...r, displayName } : r))
const role = (s: DemoState, id: string) => s.roles.find(r => r.id === id)!
/** The sample club plus a vacant "Outreach Chair" with a contact, a task of its kind and the president as its boss. */
function withNewRole(): DemoState {
  let s = save(sample(), roles => [...roles, { id: "r-out", displayName: "Outreach Chair", fn: "outreach", holderId: null, reportsToId: "r-pres", duties: "Find speakers and keep the partner list warm." }])
  const task = { ...s.nodes.find(n => n.status !== "done")!, id: "t-out", title: "Email the partner list", ownerId: null, status: "unclaimed" as const, fn: "outreach" as const, eventId: null, stepKey: null, dependsOn: [], consultedRoleIds: ["r-out"], informedRoleIds: [], approverRoleId: "r-out" }
  s = { ...s, nodes: [...s.nodes, task], contacts: s.contacts.map(c => c.id === "c-caterer" ? { ...c, ownerRoleId: "r-out" } : c) }
  return s
}

beforeEach(() => window.localStorage.clear())

describe("role renames keep the old title", () => {
  it("a rename records the title the role had and the date", () => {
    const s = rename(sample(), "r-fin", "Finance Chair")
    expect(role(s, "r-fin")).toMatchObject({ displayName: "Finance Chair", formerNames: [{ name: "Treasurer", until: s.today }], renamedOn: s.today })
  })

  it("typing it out (several saves the same day) records only the real previous title, and going back removes it", () => {
    let s = sample()
    for (const name of ["F", "Fi", "Finance", "Finance Chair"]) s = rename(s, "r-fin", name)
    expect(role(s, "r-fin").formerNames).toEqual([{ name: "Treasurer", until: s.today }])
    s = rename(s, "r-fin", "Treasurer")
    expect(role(s, "r-fin").formerNames).toBeUndefined()
  })

  it("a rename on a later day adds the earlier title too; the form cannot rewrite the history", () => {
    let s = rename(sample(), "r-fin", "Finance Chair")
    s = rename({ ...s, today: "2026-12-01" }, "r-fin", "Head of Finance")
    expect(role(s, "r-fin").formerNames!.map(f => f.name)).toEqual(["Treasurer", "Finance Chair"])
    const forged = save(s, roles => roles.map(r => r.id === "r-fin" ? { ...r, formerNames: [{ name: "Nothing", until: "2000-01-01" }] } : r))
    expect(role(forged, "r-fin").formerNames!.map(f => f.name)).toEqual(["Treasurer", "Finance Chair"])
  })
})

describe("a new role starts with something to hand over", () => {
  it("its duties and the president's answers are in the dossier and the handbook sources", () => {
    let s = withNewRole()
    expect(roleDossier(s, "r-out").blocks.calendar[0]).toMatchObject({ id: "step:duties" })
    expect(roleDossier(s, "r-out").blocks.calendar[0].text).toContain("Find speakers")
    s = as(s, "alex")
    s = change(s, { kind: "startNote", roleId: "r-out", index: 0, answer: "Speakers bring new members." })
    const row = roleDossier(s, "r-out").blocks.lessons.find(r => r.id === "lesson:start:r-out:0")!
    expect(row.text).toBe(`${ROLE_START_PROMPTS[0]} Speakers bring new members.`)
    expect(handbookSources(s, "r-out").map(x => x.id)).toEqual(expect.arrayContaining(["step:duties", "lesson:start:r-out:0"]))
  })

  it("the answers survive a Settings save, can be cleared, and only the president or vice president can write them", () => {
    let s = change(as(withNewRole(), "alex"), { kind: "startNote", roleId: "r-out", index: 1, answer: "Ten speakers." })
    s = rename(s, "r-out", "Outreach Lead")
    expect(role(s, "r-out").startNotes).toEqual(["", "Ten speakers.", ""])
    s = change(s, { kind: "startNote", roleId: "r-out", index: 1, answer: "" })
    expect(roleDossier(s, "r-out").blocks.lessons).toEqual([])
    const maya = as(s, "maya")
    expect(change(maya, { kind: "startNote", roleId: "r-out", index: 0, answer: "x" })).toEqual(maya)
    expect(change(s, { kind: "startNote", roleId: "r-out", index: 3, answer: "x" })).toEqual(s)
    expect(change(s, { kind: "startNote", roleId: "r-out", index: 0, answer: "x".repeat(301) })).toEqual(s)
    expect(change(s, { kind: "startNote", roleId: "nope", index: 0, answer: "x" })).toEqual(s)
  })
})

describe("moving work between roles", () => {
  const mayaTasks = (s: DemoState) => s.nodes.filter(n => n.ownerId === "maya" && n.status !== "done").map(n => n.id)

  it("tasks go to the other role's holder as Not claimed, contacts change owner, and the new holder is told", () => {
    const s0 = as(sample(), "alex")
    const ids = mayaTasks(s0).slice(0, 2)
    const s = change(s0, { kind: "moveWork", fromRoleId: "r-fin", toRoleId: "r-mkt", taskIds: ids, contactIds: ["c-caterer"] })
    for (const id of ids) expect(s.nodes.find(n => n.id === id)).toMatchObject({ ownerId: "sam", status: "unclaimed", acceptedOn: null, fn: "marketing" })
    expect(s.contacts.find(c => c.id === "c-caterer")!.ownerRoleId).toBe("r-mkt")
    expect(s.notifications.some(n => n.recipientId === "sam" && n.text.includes("moved from Treasurer"))).toBe(true)
    expect(s.nodes.find(n => n.id === mayaTasks(s0)[2])!.ownerId).toBe("maya") // what was not picked stays
  })

  it("a role nobody holds receives them with no owner", () => {
    const s0 = as(withNewRole(), "alex")
    const s = change(s0, { kind: "moveWork", fromRoleId: "r-fin", toRoleId: "r-out", taskIds: mayaTasks(s0).slice(0, 1), contactIds: [] })
    expect(s.nodes.find(n => n.id === mayaTasks(s0)[0])).toMatchObject({ ownerId: null, status: "unclaimed", fn: "outreach" })
  })

  it("pending extension requests on moved tasks are cancelled", () => {
    const s0 = as(sample(), "alex")
    const id = mayaTasks(s0)[0]
    const s = change({ ...s0, extensionRequests: [{ id: "x1", nodeId: id, ownerId: "maya", requestedOn: s0.today, requestedDate: s0.today, previousDeadline: null, draftLink: "", reason: "r", status: "pending" }] }, { kind: "moveWork", fromRoleId: "r-fin", toRoleId: "r-mkt", taskIds: [id], contactIds: [] })
    expect(s.extensionRequests[0].status).toBe("cancelled")
  })

  it("is refused for: anyone but the president, the same role, another role's task, a finished task, an unknown contact, nothing picked", () => {
    const s = as(sample(), "alex")
    const id = mayaTasks(s)[0]
    const go = (over: object, st = s) => change(st, { kind: "moveWork", fromRoleId: "r-fin", toRoleId: "r-mkt", taskIds: [id], contactIds: [], ...over })
    expect(go({}, as(s, "maya"))).toEqual(as(s, "maya"))
    expect(go({ toRoleId: "r-fin" })).toEqual(s)
    expect(go({ toRoleId: "nope" })).toEqual(s)
    expect(go({ taskIds: [s.nodes.find(n => n.ownerId === "sam" && n.status !== "done")!.id] })).toEqual(s)
    expect(go({ taskIds: [s.nodes.find(n => n.status === "done")!.id] })).toEqual(s)
    expect(go({ taskIds: [], contactIds: ["nope"] })).toEqual(s)
    expect(go({ taskIds: [], contactIds: [] })).toEqual(s)
  })
})

describe("closing a role keeps its history (D-6a)", () => {
  const close = (s: DemoState, over: Partial<Extract<RoleChange, { kind: "closeRole" }>> = {}) => change(as(s, "alex"), { kind: "closeRole", roleId: "r-out", intoRoleId: "r-pres", ...over })

  it("the role leaves the role lists but stays in archivedRoles with when and where its work went", () => {
    const s = close(withNewRole())
    expect(s.roles.some(r => r.id === "r-out")).toBe(false)
    expect(s.archivedRoles).toEqual([expect.objectContaining({ id: "r-out", displayName: "Outreach Chair", archivedOn: s.today, closedInto: "r-pres" })])
    expect(s.archivedRoles[0].duties).toContain("Find speakers") // nothing about the role is lost
    expect(validateClub(clubDraft(s))).toBeNull()
  })

  it("its contacts, tasks and RACI roles move to the other role; nothing points at the closed one", () => {
    const s = close(withNewRole())
    expect(s.contacts.find(c => c.id === "c-caterer")!.ownerRoleId).toBe("r-pres")
    expect(s.nodes.find(n => n.id === "t-out")).toMatchObject({ fn: "president", ownerId: "alex", status: "unclaimed", approverRoleId: "r-pres", consultedRoleIds: ["r-pres"] })
    expect(s.contacts.some(c => c.ownerRoleId === "r-out")).toBe(false)
    expect(JSON.stringify(s.nodes.map(n => [n.approverRoleId, n.consultedRoleIds, n.informedRoleIds]))).not.toContain("r-out")
  })

  it("roles that reported to it report to its boss; the club's workflow steps move too", () => {
    let s = withNewRole()
    s = save(s, roles => [...roles, { id: "r-sub", displayName: "Outreach Helper", fn: "outreach", holderId: null, reportsToId: "r-out" }])
    s = { ...s, org: { ...s.org, eventWorkflow: { updatedOn: s.today, steps: [{ key: "k", title: "Ask speakers", fn: "outreach", ownerRoleId: "r-out", phase: "plan", estDays: 1, tier: "light", why: "w", source: "s" }] } } }
    s = close(s)
    expect(role(s, "r-sub").reportsToId).toBe("r-pres")
    expect(s.org.eventWorkflow!.steps[0].ownerRoleId).toBe("r-pres")
  })

  it("the history is still there: renames, and who held it", () => {
    let s = rename(withNewRole(), "r-out", "Outreach Lead")
    s = close(s)
    expect(s.archivedRoles[0]).toMatchObject({ displayName: "Outreach Lead", formerNames: [{ name: "Outreach Chair", until: s.today }] })
    const taken = save(s, roles => [...roles, { id: "r-out2", displayName: "Outreach Lead", fn: "outreach", holderId: null, reportsToId: "r-pres" }])
    expect(taken.roles.some(r => r.id === "r-out2")).toBe(true) // the title can be used again
  })

  it("is refused for: a role someone holds, the president role, the same role, an unknown role, anyone but the president", () => {
    const s = withNewRole()
    expect(close(s, { roleId: "r-fin", intoRoleId: "r-pres" })).toEqual(as(s, "alex")) // Maya still holds it
    expect(close(s, { roleId: "r-pres", intoRoleId: "r-fin" })).toEqual(as(s, "alex"))
    expect(close(s, { intoRoleId: "r-out" })).toEqual(as(s, "alex"))
    expect(close(s, { intoRoleId: "nope" })).toEqual(as(s, "alex"))
    expect(close(s, { roleId: "nope" })).toEqual(as(s, "alex"))
    expect(change(as(s, "maya"), { kind: "closeRole", roleId: "r-out", intoRoleId: "r-pres" })).toEqual(as(s, "maya"))
  })

  it("a handed-over role can be closed after it was left open", () => {
    let s = as(sample(), "alex")
    s = reducer(s, { type: "handoffAction", action: { kind: "start", from: s.today, to: "2026-11-21" } })
    s = { ...s, roles: s.roles.map(r => r.id === "r-sec" ? { ...r, holderId: null } : r) }
    s = change(s, { kind: "closeRole", roleId: "r-sec", intoRoleId: "r-pres" })
    expect(s.archivedRoles.map(r => r.id)).toEqual(["r-sec"])
    expect(s.handoffRoles.some(h => h.roleId === "r-sec")).toBe(true) // its handoff record is kept
    expect(s.roleTerms.some(t => t.roleId === "r-sec")).toBe(true) // and who held it
  })
})

describe("an older save opens with no closed roles", () => {
  it("version 21 data loads with an empty list and nothing lost", () => {
    const { archivedRoles: _gone, ...old } = { ...sample(), schemaVersion: SCHEMA_VERSION - 1 }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(old))
    const { state, notice } = loadStateWithNotice()
    expect(notice).toBeNull()
    expect(state.schemaVersion).toBe(SCHEMA_VERSION)
    expect(state.archivedRoles).toEqual([])
    expect(state.roles.length).toBe(sample().roles.length)
  })
})
