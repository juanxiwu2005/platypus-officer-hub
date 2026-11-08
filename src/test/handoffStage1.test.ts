import { describe, expect, it } from "vitest"
import { seedDemo } from "../data/seed"
import { reducer } from "../data/store"
import { clubDraft, validateClub } from "../data/settings"
import { officers } from "../data/permissions"
import { aiSnapshot } from "../lib/aiContext"
import { commandContext } from "../lib/commands"
import { handbookSources, sourceFingerprint } from "../lib/handbook"
import { roleProgress } from "../pages/Handoff"
import type { DemoState } from "../data/types"
import type { HandoffAction } from "../data/handoff"

/** Handoff stage 1 (docs/HANDOFF_EXECUTION_PLAN.md §3): bugs B1, B4 and B6 from docs/HANDOFF_REDESIGN_PLAN.md. */
const act = (s: DemoState, action: HandoffAction) => reducer(s, { type: "handoffAction", action })
const as = (s: DemoState, viewerId: string) => ({ ...s, viewerId })

/** The seed club with a fresh season (the default seed has none), so the tests don't depend on the sample season. */
function season(): DemoState {
  const s = seedDemo()
  return act({ ...s, handoff: null, handoffRoles: [] }, { kind: "start", from: s.today, to: "2026-11-21" })
}

/** Treasurer (Maya) handed to a new fictional officer. */
function handedOver(name = "Taylor Example", prep: (s: DemoState) => DemoState = s => s): DemoState {
  let s = prep(season())
  const sources = handbookSources(s, "r-fin")
  s = act(s, { kind: "draft", roleId: "r-fin", raw: { entries: sources.slice(0, 3).map(x => ({ sourceId: x.id })) }, fingerprint: sourceFingerprint(sources), model: null, source: "test" })
  s = act(as(s, "maya"), { kind: "confirm", roleId: "r-fin" })
  s = act(as(s, "alex"), { kind: "approve", roleId: "r-fin" })
  return act(s, { kind: "complete", roleId: "r-fin", incomingName: name })
}

describe("B1: the club keeps working after a role handoff", () => {
  it("Settings still validate and save after a handoff", () => {
    const s = handedOver()
    expect(s.handoffRoles.find(r => r.roleId === "r-fin")?.completed).toBe(true)
    expect(validateClub(clubDraft(s))).toBeNull()
    const draft = clubDraft(s)
    draft.name = "Renamed Club"
    const saved = reducer(s, { type: "saveClubSettings", draft, defaults: s.org.settings })
    expect(saved.org.name).toBe("Renamed Club")
  })

  it("the new officer gets a valid, distinct example.org email", () => {
    const s = handedOver()
    const incoming = s.people.find(p => p.id === s.roles.find(r => r.id === "r-fin")!.holderId)!
    expect(incoming.email).toMatch(/^[^\s@]+@example\.org$/i)
    expect(s.people.filter(p => p.email.toLowerCase() === incoming.email.toLowerCase())).toHaveLength(1)
  })

  it("an email already in use gets a numbered one instead", () => {
    const s = handedOver("Taylor Example", prep => ({ ...prep, people: prep.people.map(p => p.id === "jordan" ? { ...p, email: "taylor.example@example.org" } : p) }))
    const incoming = s.people.find(p => p.id === s.roles.find(r => r.id === "r-fin")!.holderId)!
    expect(incoming.email).toBe("taylor.example.2@example.org")
    expect(validateClub(clubDraft(s))).toBeNull()
  })

  it("the outgoing officer becomes a former officer: kept for history, out of officer lists and AI assignment", () => {
    const s = handedOver()
    const maya = s.people.find(p => p.id === "maya")!
    expect(maya.leftOn).toBe(s.today)
    expect(officers(s).some(p => p.id === "maya")).toBe(false)
    expect(commandContext(s).people.some(p => p.id === "maya")).toBe(false)
    expect(aiSnapshot(s).people.some(p => p.id === "maya")).toBe(false)
    // History stays: Maya's finished tasks still name her.
    expect(s.nodes.some(n => n.ownerId === "maya" && n.status === "done")).toBe(seedDemo().nodes.some(n => n.ownerId === "maya" && n.status === "done"))
    expect(s.contributions).toEqual(handedOver().contributions)
  })

  it("the new officer is not a former officer, even though their profile was copied from the outgoing one", () => {
    const s = handedOver()
    const incoming = s.people.find(p => p.id === s.roles.find(r => r.id === "r-fin")!.holderId)!
    expect(incoming.leftOn).toBeUndefined()
    expect(officers(s).some(p => p.id === incoming.id)).toBe(true)
  })

  it("the officer limit counts current officers only", () => {
    const s = handedOver()
    expect(s.people.length).toBe(officers(s).length + 1)
    expect(validateClub(clubDraft(s))).toBeNull()
  })
})

describe("B4: a role added during an open season joins it", () => {
  it("adding a role in Settings gives it a season record", () => {
    const s = season()
    const draft = clubDraft(s)
    draft.roles = [...draft.roles, { id: "r-new", displayName: "Events Chair", fn: "programs", holderId: null, reportsToId: null }]
    const saved = reducer(s, { type: "saveClubSettings", draft, defaults: s.org.settings })
    expect(saved.roles.some(r => r.id === "r-new")).toBe(true)
    expect(saved.handoffRoles.find(r => r.roleId === "r-new")).toMatchObject({ outgoingId: null, interview: [], completed: false })
    expect(saved.handoff?.roleIds).toContain("r-new")
  })

  it("Save dates also brings in roles that were missing (older saved data)", () => {
    const s = season()
    const missing = { ...s, roles: [...s.roles, { id: "r-new", displayName: "Events Chair", fn: "programs" as const, holderId: null, reportsToId: null }] }
    const next = act(missing, { kind: "start", from: s.today, to: "2026-11-25" })
    expect(next.handoff?.to).toBe("2026-11-25")
    expect(next.handoffRoles.some(r => r.roleId === "r-new")).toBe(true)
  })

  it("without a season, adding a role does not start one", () => {
    const s = seedDemo()
    const plain = { ...s, handoff: null, handoffRoles: [] }
    const draft = clubDraft(plain)
    draft.roles = [...draft.roles, { id: "r-new", displayName: "Events Chair", fn: "programs", holderId: null, reportsToId: null }]
    const saved = reducer(plain, { type: "saveClubSettings", draft, defaults: plain.org.settings })
    expect(saved.handoff).toBeNull()
    expect(saved.handoffRoles).toEqual([])
  })
})

describe("B6: the interview step is not done before anyone writes it", () => {
  it("a new season starts with empty interviews, so step 1 is still to do", () => {
    const s = season()
    expect(s.handoffRoles.every(r => r.interview.length === 0)).toBe(true)
    expect(roleProgress(s.handoffRoles.find(r => r.roleId === "r-fin"))).toEqual({ done: 0, stage: "Interview" })
  })

  it("saving the interview completes step 1", () => {
    const s = act(as(season(), "maya"), { kind: "interview", roleId: "r-fin", lines: ["Reconcile after every event."] })
    expect(roleProgress(s.handoffRoles.find(r => r.roleId === "r-fin")).done).toBe(1)
  })

  it("the sample club's season keeps its example interviews (Phase 3 sample data unchanged)", () => {
    const sample = seedDemo(undefined, "v2")
    expect(sample.handoffRoles.some(r => r.interview.length > 0)).toBe(true)
  })
})
