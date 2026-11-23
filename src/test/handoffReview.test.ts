import { beforeEach, describe, expect, it } from "vitest"
import { seedDemo, SCHEMA_VERSION } from "../data/seed"
import { loadStateWithNotice, reducer, STORAGE_KEY } from "../data/store"
import { clubDraft, validateClub } from "../data/settings"
import { handbookFresh, handbookSources, sourceFingerprint } from "../lib/handbook"
import { roleDossier } from "../lib/roleDossier"
import { handoffRisk } from "../lib/handoffRisk"
import { leaders } from "../data/taskWorkflow"
import { runFollowupDay, suggestedOwner } from "../engine/followup"
import { reviewPayload } from "../lib/eventReview"
import { draftPayload } from "../pages/Handoff"
import { addDays } from "../lib/dates"
import type { DemoState, HandbookSource } from "../data/types"
import type { HandoffAction } from "../data/handoff"

/** Fixes from the Claude review of the Handoff redesign (2026-11-09, docs/PROGRESS.md). One block per finding. */
const act = (s: DemoState, action: HandoffAction) => reducer(s, { type: "handoffAction", action })
const as = (s: DemoState, viewerId: string) => ({ ...s, viewerId })
const rec = (s: DemoState, roleId = "r-fin") => s.handoffRoles.find(r => r.roleId === roleId)!
function season(): DemoState { const s = seedDemo(); return act({ ...s, handoff: null, handoffRoles: [] }, { kind: "start", from: s.today, to: "2026-11-21" }) }
function approved(s0 = season(), roleId = "r-fin", out = "maya"): DemoState {
  const sources = handbookSources(s0, roleId)
  let s = act(as(s0, "alex"), { kind: "draft", roleId, raw: { entries: sources.slice(0, 3).map(x => ({ sourceId: x.id })) }, fingerprint: sourceFingerprint(sources), model: null, source: "test" })
  s = act(as(s, out), { kind: "confirm", roleId })
  return act(as(s, "alex"), { kind: "approve", roleId })
}
const finish = (s: DemoState, name = "Taylor Example", roleId = "r-fin") => act(as(s, "alex"), { kind: "complete", roleId, successor: { kind: "new", name } })

describe("1: a second handoff of a role keeps the first one", () => {
  it("the finished round moves to handoffHistory instead of being overwritten", () => {
    const done = finish(approved())
    const first = rec(done)
    const again = act(done, { kind: "startRole", roleId: "r-fin" })
    expect(rec(again).completed).toBe(false)
    expect(again.handoffHistory).toHaveLength(1)
    expect(again.handoffHistory![0]).toMatchObject({ roleId: "r-fin", completed: true, incomingId: first.incomingId, season: done.handoff!.id })
    expect(again.handoffHistory![0].entries).toEqual(first.entries)
  })
})

describe("2: only current officers lead or stand in", () => {
  it("a president who handed the role over no longer counts as a leader", () => {
    const s = finish(approved(season(), "r-pres", "alex"), "New President", "r-pres")
    expect(s.people.find(p => p.id === "alex")!.leftOn).toBeTruthy()
    expect(leaders(s)).not.toContain("alex")
    expect(leaders(s)).toContain(s.roles.find(r => r.id === "r-pres")!.holderId)
  })
  it("the follow-up check never suggests a former or a not-yet-started officer", () => {
    let s = finish(approved())
    s = act(as(s, "alex"), { kind: "setIncoming", roleId: "r-mkt", successor: { kind: "new", name: "Waiting Person" } })
    const nonOfficers = s.people.filter(p => p.leftOn || p.incomingFor).map(p => p.id)
    expect(nonOfficers.length).toBeGreaterThanOrEqual(2)
    for (const n of s.nodes) expect(nonOfficers).not.toContain(suggestedOwner(s, n))
  })
})

describe("3: a next officer reads but does not change tasks before the handover (D-3a)", () => {
  it("cannot claim, create or edit tasks, but can still mark their reading", () => {
    let s = approved()
    s = act(s, { kind: "setIncoming", roleId: "r-fin", successor: { kind: "new", name: "Pat Waiting" } })
    const inc = rec(s).incomingId!
    const free = s.nodes.find(n => !n.ownerId && n.status === "unclaimed")!
    const viewer = as(s, inc)
    expect(reducer(viewer, { type: "claimTask", nodeId: free.id })).toBe(viewer)
    expect(reducer(viewer, { type: "createTasks", id: "mine", sentence: "Mine", tasks: [{ title: "Mine", ownerId: inc, eventId: null }], date: "2026-11-10", buffered: false })).toBe(viewer)
    expect(reducer(viewer, { type: "updateNode", id: free.id, patch: { title: "Renamed" } })).toBe(viewer)
    const read = act(viewer, { kind: "readSection", roleId: "r-fin", section: "In flight", mark: "got" })
    expect(rec(read).reading).toEqual({ "In flight": "got" })
    expect(reducer(viewer, { type: "setViewer", viewerId: "alex" }).viewerId).toBe("alex")
  })
})

describe("4: saves from before the redesign", () => {
  beforeEach(() => window.localStorage.clear())
  /** What the old complete action left behind: the new person with no email, the old one with no leftOn. */
  function legacy(): DemoState {
    const s = seedDemo()
    const maya = s.people.find(p => p.id === "maya")!
    return {
      ...s,
      roles: s.roles.map(r => r.id === "r-fin" ? { ...r, holderId: "incoming:season:x:r-fin" } : r),
      people: [...s.people, { ...maya, id: "incoming:season:x:r-fin", name: "Legacy New", email: "" }],
      handoff: { id: "season:x", from: s.today, to: "2026-11-21", roleIds: s.roles.map(r => r.id) },
      handoffRoles: [{ roleId: "r-fin", outgoingId: "maya", interview: [], entries: [], sources: [], fingerprint: "", source: "", model: null, confirmed: true, approved: true, checks: [], completed: true, reviewed: false, incomingId: "incoming:season:x:r-fin" }],
    }
  }
  it("a v20 save with an old finished handoff loads with Settings working again", () => {
    expect(validateClub(clubDraft(legacy()))).not.toBeNull()
    const { roleTerms: _t, archivedRoles: _a, ...old } = { ...legacy(), schemaVersion: 20 }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(old))
    const { state, notice } = loadStateWithNotice()
    expect(notice).toBeNull()
    expect(state.schemaVersion).toBe(SCHEMA_VERSION)
    expect(state.people.find(p => p.id === "maya")!.leftOn).toBeTruthy()
    expect(state.people.find(p => p.id === "incoming:season:x:r-fin")!.email).toMatch(/@example\.org$/)
    expect(validateClub(clubDraft(state))).toBeNull()
  })
  it("a v20 save is not touched by the older demo-plan update", () => {
    const s = seedDemo()
    const plan = s.nodes.find(n => n.id === "e-speaker:plan")
    if (!plan) return
    const open = { ...s, schemaVersion: 20, nodes: s.nodes.map(n => n.id === plan.id ? { ...n, status: "accepted" as const, completedOn: undefined } : n) }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(open))
    expect(loadStateWithNotice().state.nodes.find(n => n.id === plan.id)!.status).toBe("accepted")
  })
})

describe("5: after the handover the dossier and risk describe the new holder's work", () => {
  it("open tasks moved to the new officer still show in the dossier and the risk", () => {
    const before = approved()
    const open = roleDossier(before, "r-fin").blocks.inFlight.length
    const s = finish(before)
    expect(open).toBeGreaterThan(0)
    expect(roleDossier(s, "r-fin").blocks.inFlight.length).toBe(open)
    expect(handoffRisk(s, "r-fin").reasons.join(" ")).not.toMatch(/^0 open tasks/)
  })
})

describe("6: renaming a role several times in one day", () => {
  it("A → B → A → C still remembers A", () => {
    let s = seedDemo()
    const rename = (name: string) => { const d = clubDraft(s); d.roles = d.roles.map(r => r.id === "r-fin" ? { ...r, displayName: name } : r); s = reducer(s, { type: "saveClubSettings", draft: d, defaults: s.org.settings }) }
    const orig = s.roles.find(r => r.id === "r-fin")!.displayName
    rename("Finance Chair"); rename(orig)
    expect(s.roles.find(r => r.id === "r-fin")!.formerNames ?? []).toEqual([])
    rename("Money Lead"); rename("Budget Lead")
    expect(s.roles.find(r => r.id === "r-fin")!.formerNames).toEqual([{ name: orig, until: s.today }])
  })
})

describe("7: changing the next officer", () => {
  it("the next one starts clean and never gets the dropped person's id", () => {
    let s = approved()
    s = act(s, { kind: "setIncoming", roleId: "r-fin", successor: { kind: "new", name: "First Pick" } })
    s = act(s, { kind: "startShadow", roleId: "r-fin" })
    const first = rec(s).incomingId!
    s = act(as(s, first), { kind: "readSection", roleId: "r-fin", section: "In flight", mark: "unclear" })
    s = act(as(s, "alex"), { kind: "clearIncoming", roleId: "r-fin" })
    s = act(s, { kind: "setIncoming", roleId: "r-fin", successor: { kind: "new", name: "Second Pick" } })
    const r = rec(s)
    expect(r.incomingId).not.toBe(first)
    expect(r).toMatchObject({ shadowNodeId: null, reading: {}, readBack: null })
    expect(r.questions?.some(q => q.kind === "unclear")).toBe(true) // the question stays for the outgoing officer
    expect(s.notifications.some(n => n.recipientId === r.incomingId)).toBe(false)
    expect(act(s, { kind: "startShadow", roleId: "r-fin" })).not.toBe(s)
  })
})

describe("8: a handbook goes stale only when a line it quotes changes", () => {
  it("one demo day later the approved handbook can still be handed over", () => {
    let s = approved()
    s = runFollowupDay(s, addDays(s.today, 1))
    expect(handbookFresh(rec(s), handbookSources(s, "r-fin"))).toBe(true)
    expect(rec(finish(s)).completed).toBe(true)
  })
  it("changing a quoted task makes it stale", () => {
    const s = approved()
    const quoted = rec(s).entries.find(e => e.sourceId.startsWith("task:"))!
    const t = reducer(as(s, "alex"), { type: "updateNode", id: quoted.sourceId.slice(5), patch: { why: "A brand new purpose" } })
    expect(handbookFresh(rec(t), handbookSources(t, "r-fin"))).toBe(false)
    expect(rec(finish(t)).completed).toBe(false)
  })
})

describe("9: the draft request keeps the interview and does not grow every day", () => {
  it("interview lines go first and the request holds at most 100 records", () => {
    const many: HandbookSource[] = [...Array.from({ length: 120 }, (_, i) => ({ id: `task:t${i}`, kind: "task" as const, text: `Task ${i}` })), { id: "interview:r-fin:1", kind: "interview", text: "Keep receipts" }]
    const sent = draftPayload(many)
    expect(sent).toHaveLength(100)
    expect(sent[0].id).toBe("interview:r-fin:1")
  })
  it("a task that goes quiet many times is one lesson, not one per day", () => {
    let s = approved()
    for (let i = 0; i < 10; i++) s = runFollowupDay(s, addDays(s.today, 1))
    const lessons = roleDossier(s, "r-fin").blocks.lessons.filter(r => r.id.startsWith("lesson:quiet:"))
    expect(new Set(lessons.map(r => r.nodeId)).size).toBe(lessons.length)
  })
})

describe("10 and 12: lists and section names", () => {
  it("the event plan check sends only current officers to the AI", () => {
    const s = finish(approved())
    const ids = reviewPayload(s, s.events[0].id)!.people.map(p => p.id)
    expect(ids).not.toContain("maya")
  })
  it("a section that is not in the handbook cannot be marked", () => {
    let s = approved()
    s = act(s, { kind: "setIncoming", roleId: "r-fin", successor: { kind: "new", name: "Pat Waiting" } })
    const v = as(s, rec(s).incomingId!)
    expect(act(v, { kind: "readSection", roleId: "r-fin", section: "Made up", mark: "unclear" })).toBe(v)
  })
})
