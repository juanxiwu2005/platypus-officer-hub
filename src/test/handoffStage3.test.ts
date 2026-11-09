import { beforeEach, describe, expect, it } from "vitest"
import { SCHEMA_VERSION, seedDemo } from "../data/seed"
import { loadStateWithNotice, reducer, STORAGE_KEY } from "../data/store"
import { clubDraft, validateClub } from "../data/settings"
import { isOfficer, officers } from "../data/permissions"
import { normalizeTerms } from "../data/roleTerms"
import { claimTask } from "../data/taskWorkflow"
import { handbookSources, sourceFingerprint, WEEK_ONE } from "../lib/handbook"
import type { DemoState } from "../data/types"
import type { HandoffAction, Successor } from "../data/handoff"

/** Handoff stage 3 (docs/HANDOFF_EXECUTION_PLAN.md §5): people and role terms are separate; the next officer exists before the handover (B3). */
const act = (s: DemoState, action: HandoffAction) => reducer(s, { type: "handoffAction", action })
const as = (s: DemoState, viewerId: string) => ({ ...s, viewerId })
const record = (s: DemoState, roleId: string) => s.handoffRoles.find(r => r.roleId === roleId)!
const holder = (s: DemoState, roleId: string) => s.roles.find(r => r.id === roleId)!.holderId
const terms = (s: DemoState, roleId: string) => s.roleTerms.filter(t => t.roleId === roleId)

function season(): DemoState {
  const s = seedDemo()
  return act({ ...s, handoff: null, handoffRoles: [] }, { kind: "start", from: s.today, to: "2026-11-21" })
}
function ready(s: DemoState, roleId: string, speaker: string): DemoState {
  const src = handbookSources(s, roleId)
  s = act(s, { kind: "draft", roleId, raw: { entries: src.slice(0, 3).map(x => ({ sourceId: x.id })) }, fingerprint: sourceFingerprint(src), model: null, source: "test" })
  s = act(as(s, speaker), { kind: "confirm", roleId })
  return act(as(s, "alex"), { kind: "approve", roleId })
}
const name = (s: DemoState, roleId: string, succ: { kind: "new"; name: string } | { kind: "existing"; personId: string }) => act(as(s, "alex"), { kind: "setIncoming", roleId, successor: succ })
const finish = (s: DemoState, roleId: string, successor?: Successor) => act(as(s, "alex"), { kind: "complete", roleId, successor })

describe("role terms follow who holds what", () => {
  it("the seed club has one active term per officer, and normalizing again changes nothing", () => {
    const s = seedDemo()
    expect(s.roleTerms.filter(t => t.status === "active").map(t => `${t.roleId}:${t.personId}`).sort()).toEqual(s.roles.map(r => `${r.id}:${r.holderId}`).sort())
    expect(normalizeTerms(s)).toBe(s)
  })

  it("a handoff ends the old term and starts the new one, with the season on both", () => {
    const s = finish(ready(season(), "r-fin", "maya"), "r-fin", { kind: "new", name: "Taylor Example" })
    const now = holder(s, "r-fin")!
    const t = terms(s, "r-fin")
    expect(t.find(x => x.personId === "maya")).toMatchObject({ status: "former", to: s.today })
    expect(t.find(x => x.personId === now)).toMatchObject({ status: "active", from: s.today, to: null, handoffId: s.handoff!.id })
    expect(t.filter(x => x.status === "active")).toHaveLength(1)
  })

  it("an older save without terms loads with them: active for every holder, former for someone who already left", () => {
    window.localStorage.clear()
    const done = finish(ready(season(), "r-fin", "maya"), "r-fin", { kind: "new", name: "Taylor Example" })
    const { roleTerms: _gone, ...old } = { ...done, schemaVersion: SCHEMA_VERSION - 1 }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(old))
    const { state, notice } = loadStateWithNotice()
    expect(notice).toBeNull()
    expect(state.schemaVersion).toBe(SCHEMA_VERSION)
    expect(state.roleTerms.filter(t => t.status === "active")).toHaveLength(state.roles.length)
    expect(state.roleTerms.find(t => t.personId === "maya")).toMatchObject({ status: "former", from: null })
    expect(state.people.map(p => p.id)).toEqual(done.people.map(p => p.id)) // nobody lost or duplicated
  })
})

describe("the next officer exists before the handover (B3)", () => {
  beforeEach(() => window.localStorage.clear())

  it("naming a new person creates them now: not an officer, not in officer lists, with an incoming term", () => {
    const s = name(ready(season(), "r-fin", "maya"), "r-fin", { kind: "new", name: "Taylor Example" })
    const p = s.people.find(x => x.name === "Taylor Example")!
    expect(p).toMatchObject({ incomingFor: "r-fin", roleId: "r-fin" })
    expect(p.email).toMatch(/@example\.org$/)
    expect(record(s, "r-fin")).toMatchObject({ incomingId: p.id, completed: false })
    expect(holder(s, "r-fin")).toBe("maya") // Maya still holds the role
    expect(isOfficer(p)).toBe(false)
    expect(officers(s).some(x => x.id === p.id)).toBe(false)
    expect(terms(s, "r-fin").find(t => t.personId === p.id)).toMatchObject({ status: "incoming", from: s.today, handoffId: s.handoff!.id })
    expect(terms(s, "r-fin").find(t => t.personId === "maya")!.status).toBe("active")
  })

  it("Settings still validate and save while someone is waiting to take a role", () => {
    const s = name(ready(season(), "r-fin", "maya"), "r-fin", { kind: "new", name: "Taylor Example" })
    expect(validateClub(clubDraft(s))).toBeNull()
    const draft = clubDraft(s)
    draft.name = "Renamed"
    expect(reducer(s, { type: "saveClubSettings", draft, defaults: s.org.settings }).org.name).toBe("Renamed")
  })

  it("the next officer can read but not change: no role rights, cannot touch the old holder's tasks", () => {
    let s = name(ready(season(), "r-fin", "maya"), "r-fin", { kind: "new", name: "Taylor Example" })
    const taylor = s.people.find(x => x.name === "Taylor Example")!.id
    const task = s.nodes.find(n => n.ownerId === "maya" && n.status !== "done")!
    s = as(s, taylor)
    expect(reducer(s, { type: "updateNode", id: task.id, patch: { title: "Changed" } })).toEqual(s)
    expect(reducer(s, { type: "moveTask", nodeId: task.id, status: "done" })).toEqual(s)
    expect(claimTask(s, task.id, taylor)).toBe(s)
    expect(act(s, { kind: "approve", roleId: "r-fin" })).toEqual(s)
    expect(act(s, { kind: "complete", roleId: "r-fin" })).toEqual(s)
    expect(handbookSources(s, "r-fin").length).toBeGreaterThan(0) // the handbook and the open tasks are readable
  })

  it("Finish uses the named person: one active term, the waiting mark is gone, tasks wait for them", () => {
    let s = name(ready(season(), "r-fin", "maya"), "r-fin", { kind: "new", name: "Taylor Example" })
    const taylor = s.people.find(x => x.name === "Taylor Example")!.id
    const open = s.nodes.filter(n => n.ownerId === "maya" && n.status !== "done").map(n => n.id)
    s = finish(s, "r-fin")
    expect(holder(s, "r-fin")).toBe(taylor)
    expect(s.people.find(x => x.id === taylor)!.incomingFor).toBeUndefined()
    expect(isOfficer(s.people.find(x => x.id === taylor)!)).toBe(true)
    expect(terms(s, "r-fin").filter(t => t.personId === taylor)).toHaveLength(1)
    expect(terms(s, "r-fin").find(t => t.personId === taylor)).toMatchObject({ status: "active", from: s.today })
    for (const id of open) expect(s.nodes.find(n => n.id === id)).toMatchObject({ ownerId: taylor, status: "unclaimed" })
    expect(validateClub(clubDraft(s))).toBeNull()
  })

  it("naming someone already in the club (Sam) leaves Sam an officer until the handover", () => {
    let s = name(ready(season(), "r-fin", "maya"), "r-fin", { kind: "existing", personId: "sam" })
    expect(record(s, "r-fin").incomingId).toBe("sam")
    expect(isOfficer(s.people.find(x => x.id === "sam")!)).toBe(true)
    expect(holder(s, "r-mkt")).toBe("sam")
    expect(terms(s, "r-fin").find(t => t.personId === "sam")!.status).toBe("incoming")
    s = finish(s, "r-fin")
    expect(holder(s, "r-fin")).toBe("sam")
    expect(holder(s, "r-mkt")).toBeNull()
    expect(terms(s, "r-fin").find(t => t.personId === "sam")!.status).toBe("active")
    expect(terms(s, "r-mkt").find(t => t.personId === "sam")).toMatchObject({ status: "former", to: s.today })
  })

  it("changing the choice removes the unused new person and their term", () => {
    let s = name(ready(season(), "r-fin", "maya"), "r-fin", { kind: "new", name: "Taylor Example" })
    s = act(as(s, "alex"), { kind: "clearIncoming", roleId: "r-fin" })
    expect(record(s, "r-fin").incomingId).toBeNull()
    expect(s.people.some(x => x.name === "Taylor Example")).toBe(false)
    expect(s.roleTerms.some(t => t.status === "incoming")).toBe(false)
    s = name(s, "r-fin", { kind: "new", name: "Riley Example" })
    expect(s.people.filter(x => x.incomingFor).map(x => x.name)).toEqual(["Riley Example"])
  })

  it("a second one cannot be named over the first, and a named role cannot take another successor at Finish", () => {
    const s = name(ready(season(), "r-fin", "maya"), "r-fin", { kind: "new", name: "Taylor Example" })
    expect(name(s, "r-fin", { kind: "new", name: "Riley Example" })).toEqual(s)
    expect(finish(s, "r-fin", { kind: "new", name: "Riley Example" })).toEqual(s)
    expect(finish(s, "r-fin", { kind: "vacant" })).toEqual(s)
  })

  it("refuses: the president, the current holder, an unknown person, a repeated name, and anyone but the president", () => {
    const s = ready(season(), "r-fin", "maya")
    expect(name(s, "r-fin", { kind: "existing", personId: "alex" })).toEqual(s)
    expect(name(s, "r-fin", { kind: "existing", personId: "maya" })).toEqual(s)
    expect(name(s, "r-fin", { kind: "existing", personId: "nobody" })).toEqual(s)
    expect(name(s, "r-fin", { kind: "new", name: s.people.find(p => p.id === "sam")!.name.toUpperCase() })).toEqual(s)
    expect(name(s, "r-fin", { kind: "new", name: "  " })).toEqual(s)
    const byMaya = act(as(s, "maya"), { kind: "setIncoming", roleId: "r-fin", successor: { kind: "new", name: "Taylor Example" } })
    expect(byMaya).toEqual(as(s, "maya"))
  })

  it("starting a new round for the role drops a successor that was named for the old one", () => {
    let s = finish(ready(season(), "r-fin", "maya"), "r-fin", { kind: "new", name: "Taylor Example" })
    s = act(as(s, "alex"), { kind: "startRole", roleId: "r-fin" })
    s = name(s, "r-fin", { kind: "new", name: "Riley Example" })
    expect(s.people.filter(p => p.incomingFor)).toHaveLength(1)
    s = { ...s, handoffRoles: s.handoffRoles.map(h => h.roleId === "r-fin" ? { ...h, incomingId: null } : h) }
    s = normalizeTerms(s)
    expect(s.people.some(p => p.name === "Riley Example")).toBe(false)
  })
})

describe("the first-week list belongs to the new officer, after the handover (B3)", () => {
  const tick = (s: DemoState, viewer: string, itemId = WEEK_ONE[0].id) => act(as(s, viewer), { kind: "check", roleId: "r-fin", itemId })

  it("nothing can be ticked before the handover, by anyone", () => {
    const named = name(ready(season(), "r-fin", "maya"), "r-fin", { kind: "new", name: "Taylor Example" })
    const taylor = named.people.find(x => x.name === "Taylor Example")!.id
    for (const who of ["alex", "maya", taylor]) expect(record(tick(named, who), "r-fin").checks).toEqual([])
  })

  it("after the handover the new officer or the president can tick; the former officer and other officers cannot", () => {
    const done = finish(name(ready(season(), "r-fin", "maya"), "r-fin", { kind: "new", name: "Taylor Example" }), "r-fin")
    const taylor = holder(done, "r-fin")!
    expect(record(tick(done, taylor), "r-fin").checks).toEqual([WEEK_ONE[0].id])
    expect(record(tick(done, "alex"), "r-fin").checks).toEqual([WEEK_ONE[0].id])
    expect(record(tick(done, "maya"), "r-fin").checks).toEqual([])
    expect(record(tick(done, "jordan"), "r-fin").checks).toEqual([])
  })

  it("the handover itself no longer waits for the checklist", () => {
    const s = ready(season(), "r-fin", "maya")
    expect(record(s, "r-fin").checks).toEqual([])
    expect(record(finish(s, "r-fin", { kind: "new", name: "Taylor Example" }), "r-fin").completed).toBe(true)
  })
})
