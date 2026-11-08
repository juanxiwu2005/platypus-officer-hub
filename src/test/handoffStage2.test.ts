import { describe, expect, it } from "vitest"
import { seedDemo } from "../data/seed"
import { reducer } from "../data/store"
import { clubDraft, validateClub } from "../data/settings"
import { officers } from "../data/permissions"
import { claimTask } from "../data/taskWorkflow"
import { handbookSources, sourceFingerprint, WEEK_ONE } from "../lib/handbook"
import type { DemoState } from "../data/types"
import type { HandoffAction, Successor } from "../data/handoff"

/** Handoff stage 2 (docs/HANDOFF_EXECUTION_PLAN.md §4): bugs B2 (club members can take over), B5 (open roles), D7 (one role at a time). */
const act = (s: DemoState, action: HandoffAction) => reducer(s, { type: "handoffAction", action })
const as = (s: DemoState, viewerId: string) => ({ ...s, viewerId })
const record = (s: DemoState, roleId: string) => s.handoffRoles.find(r => r.roleId === roleId)!
const holder = (s: DemoState, roleId: string) => s.roles.find(r => r.id === roleId)!.holderId

function seasonWithoutSample(): DemoState {
  const s = seedDemo()
  return act({ ...s, handoff: null, handoffRoles: [] }, { kind: "start", from: s.today, to: "2026-11-21" })
}
/** Draft, confirm (by `speaker`), approve (president Alex) and the first-week checks, ready for Finish. */
function ready(s: DemoState, roleId: string, speaker: string, checks = true): DemoState {
  const src = handbookSources(s, roleId)
  s = act(s, { kind: "draft", roleId, raw: { entries: src.slice(0, 3).map(x => ({ sourceId: x.id })) }, fingerprint: sourceFingerprint(src), model: null, source: "test" })
  s = act(as(s, speaker), { kind: "confirm", roleId })
  s = act(as(s, "alex"), { kind: "approve", roleId })
  if (checks) for (const item of WEEK_ONE) s = act(s, { kind: "check", roleId, itemId: item.id })
  return s
}
const finish = (s: DemoState, roleId: string, successor: Successor) => act(as(s, "alex"), { kind: "complete", roleId, successor })

describe("B2: someone already in the club can take a role over", () => {
  it("Sam (Marketing lead) takes the Treasurer role; Marketing becomes open and Settings still save", () => {
    let s = ready(seasonWithoutSample(), "r-fin", "maya")
    s = finish(s, "r-fin", { kind: "existing", personId: "sam" })
    expect(record(s, "r-fin")).toMatchObject({ completed: true, incomingId: "sam" })
    expect(holder(s, "r-fin")).toBe("sam")
    expect(holder(s, "r-mkt")).toBeNull()
    expect(s.people.find(p => p.id === "sam")!.roleId).toBe("r-fin")
    expect(s.people.find(p => p.id === "maya")!.leftOn).toBe(s.today)
    expect(officers(s).some(p => p.id === "sam")).toBe(true)
    expect(validateClub(clubDraft(s))).toBeNull()
  })

  it("no duplicate person is created, and the open-tasks go to Sam as Not claimed", () => {
    let s = ready(seasonWithoutSample(), "r-fin", "maya")
    const mayaOpen = s.nodes.filter(n => n.ownerId === "maya" && n.status !== "done").map(n => n.id)
    expect(mayaOpen.length).toBeGreaterThan(0)
    const people = s.people.length
    s = finish(s, "r-fin", { kind: "existing", personId: "sam" })
    expect(s.people.length).toBe(people)
    for (const id of mayaOpen) expect(s.nodes.find(n => n.id === id)).toMatchObject({ ownerId: "sam", status: "unclaimed", acceptedOn: null })
    expect(s.notifications.some(n => n.recipientId === "sam" && n.text.includes("waiting for you"))).toBe(true)
  })

  it("transferred tasks wait for the new officer: only they can claim, and then it is accepted", () => {
    let s = ready(seasonWithoutSample(), "r-fin", "maya")
    const id = s.nodes.find(n => n.ownerId === "maya" && n.status !== "done")!.id
    s = finish(s, "r-fin", { kind: "existing", personId: "sam" })
    expect(claimTask(s, id, "jordan")).toBe(s)
    expect(claimTask(s, id, "sam").nodes.find(n => n.id === id)).toMatchObject({ ownerId: "sam", status: "accepted" })
  })

  it("a former officer can come back: they are an officer again", () => {
    let s = ready(seasonWithoutSample(), "r-fin", "maya")
    s = finish(s, "r-fin", { kind: "new", name: "Taylor Example" })
    expect(s.people.find(p => p.id === "maya")!.leftOn).toBeTruthy()
    // Taylor hands the role back to Maya in a new round.
    s = act(as(s, "alex"), { kind: "startRole", roleId: "r-fin" })
    const taylor = holder(s, "r-fin")!
    s = ready(s, "r-fin", taylor)
    s = finish(s, "r-fin", { kind: "existing", personId: "maya" })
    const maya = s.people.find(p => p.id === "maya")!
    expect(maya.leftOn).toBeUndefined()
    expect(maya.roleId).toBe("r-fin")
    expect(holder(s, "r-fin")).toBe("maya")
    expect(validateClub(clubDraft(s))).toBeNull()
  })

  it("is refused for: the president role leaving its post, the person already holding the role, an unknown person", () => {
    const s = ready(seasonWithoutSample(), "r-fin", "maya")
    // Alex is the president: taking Treasurer would leave no president.
    expect(finish(s, "r-fin", { kind: "existing", personId: "alex" })).toEqual(s)
    expect(finish(s, "r-fin", { kind: "existing", personId: "maya" })).toEqual(s)
    expect(finish(s, "r-fin", { kind: "existing", personId: "nobody" })).toEqual(s)
    const unchecked = ready(seasonWithoutSample(), "r-fin", "maya", false)
    expect(finish(unchecked, "r-fin", { kind: "existing", personId: "sam" })).toEqual(unchecked) // first-week checks not done
  })

  it("only the president or vice president can finish a handoff", () => {
    const s = ready(seasonWithoutSample(), "r-fin", "maya")
    const attempt = act(as(s, "sam"), { kind: "complete", roleId: "r-fin", successor: { kind: "existing", personId: "sam" } })
    expect(attempt).toEqual(as(s, "sam"))
  })

  it("a new person still cannot reuse a name already in the club", () => {
    const s = ready(seasonWithoutSample(), "r-fin", "maya")
    const name = s.people.find(p => p.id === "sam")!.name
    expect(finish(s, "r-fin", { kind: "new", name: name.toUpperCase() })).toEqual(s)
  })
})

describe("B5: a role nobody holds can be handed over", () => {
  /** Maya's Treasurer role left open at the end of her handoff. */
  function leftOpen(): DemoState {
    return finish(ready(seasonWithoutSample(), "r-fin", "maya"), "r-fin", { kind: "vacant" })
  }

  it("leaving a role open: no officer, tasks have no owner and are Not claimed, Maya is a former officer", () => {
    const before = ready(seasonWithoutSample(), "r-fin", "maya")
    const mayaOpen = before.nodes.filter(n => n.ownerId === "maya" && n.status !== "done").map(n => n.id)
    const s = finish(before, "r-fin", { kind: "vacant" })
    expect(holder(s, "r-fin")).toBeNull()
    expect(record(s, "r-fin")).toMatchObject({ completed: true, incomingId: null })
    for (const id of mayaOpen) expect(s.nodes.find(n => n.id === id)).toMatchObject({ ownerId: null, status: "unclaimed" })
    expect(s.people.find(p => p.id === "maya")!.leftOn).toBe(s.today)
    expect(s.viewerId).toBe("alex") // the president keeps the view
    expect(validateClub(clubDraft(s))).toBeNull()
  })

  it("the president role can never be left open", () => {
    const s = ready(seasonWithoutSample(), "r-pres", "alex")
    expect(finish(s, "r-pres", { kind: "vacant" })).toEqual(s)
  })

  it("a role that is already open cannot be 'left open' again", () => {
    const s = leftOpen()
    const again = act(as(s, "alex"), { kind: "startRole", roleId: "r-fin" })
    expect(finish(again, "r-fin", { kind: "vacant" })).toEqual(again)
  })

  it("the president answers for an open role: interview, confirm, then a new person takes it", () => {
    let s = act(as(leftOpen(), "alex"), { kind: "startRole", roleId: "r-fin" })
    expect(record(s, "r-fin")).toMatchObject({ completed: false, incomingId: null })
    expect(record(s, "r-fin").entries.length).toBeGreaterThan(0) // the work already done is kept
    s = act(s, { kind: "interview", roleId: "r-fin", lines: ["Reconcile after every event."] }) // president answering
    expect(record(s, "r-fin").interview).toEqual(["Reconcile after every event."])
    s = ready(s, "r-fin", "alex")
    s = finish(s, "r-fin", { kind: "new", name: "Riley Example" })
    const riley = holder(s, "r-fin")!
    expect(s.people.find(p => p.id === riley)).toMatchObject({ name: "Riley Example", roleId: "r-fin" })
    expect(s.people.find(p => p.id === riley)!.email).toMatch(/@example\.org$/)
    expect(officers(s).some(p => p.id === riley)).toBe(true)
    expect(validateClub(clubDraft(s))).toBeNull()
  })

  it("only the president can speak for an open role", () => {
    const s = act(as(leftOpen(), "alex"), { kind: "startRole", roleId: "r-fin" })
    expect(act(as(s, "jordan"), { kind: "interview", roleId: "r-fin", lines: ["x"] })).toEqual(as(s, "jordan"))
  })

  it("an open role's handbook does not collect every unowned task of every kind", () => {
    const s = leftOpen()
    const own = handbookSources(s, "r-fin").filter(x => x.kind === "task").map(x => x.nodeId)
    for (const id of own) expect(s.nodes.find(n => n.id === id)!.fn === "finance" || s.nodes.find(n => n.id === id)!.ownerId === "maya").toBe(true)
  })

  it("a role open from the start gets its holder as the outgoing officer once someone is assigned", () => {
    const s0 = seasonWithoutSample()
    const draft = clubDraft(s0)
    draft.roles = [...draft.roles, { id: "r-new", displayName: "Events Chair", fn: "programs", holderId: null, reportsToId: null }]
    const s1 = reducer(s0, { type: "saveClubSettings", draft, defaults: s0.org.settings })
    expect(record(s1, "r-new").outgoingId).toBeNull()
    const holderPerson = { ...s1.people.find(p => p.id === "jordan")!, id: "kim", name: "Kim Example", email: "kim@example.org", roleId: "r-new" }
    const s2 = act({ ...s1, roles: s1.roles.map(r => r.id === "r-new" ? { ...r, holderId: "kim" } : r), people: [...s1.people, holderPerson] }, { kind: "start", from: s1.today, to: "2026-11-25" })
    expect(record(s2, "r-new").outgoingId).toBe("kim")
  })
})

describe("D7: hand over one role without a club-wide season", () => {
  it("starts a season for just that role", () => {
    const s0 = { ...seedDemo(), handoff: null, handoffRoles: [] }
    const s = act(as(s0, "alex"), { kind: "startRole", roleId: "r-fin" })
    expect(s.handoff).toMatchObject({ roleIds: ["r-fin"], partial: true })
    expect(s.handoffRoles.map(r => r.roleId)).toEqual(["r-fin"])
  })

  it("roles added or missing later do not join a one-role season", () => {
    const s0 = act(as({ ...seedDemo(), handoff: null, handoffRoles: [] }, "alex"), { kind: "startRole", roleId: "r-fin" })
    const draft = clubDraft(s0)
    draft.roles = [...draft.roles, { id: "r-new", displayName: "Events Chair", fn: "programs", holderId: null, reportsToId: null }]
    const saved = reducer(s0, { type: "saveClubSettings", draft, defaults: s0.org.settings })
    expect(saved.handoffRoles.map(r => r.roleId)).toEqual(["r-fin"])
  })

  it("'Start handoff season' turns it into a full season", () => {
    const s0 = act(as({ ...seedDemo(), handoff: null, handoffRoles: [] }, "alex"), { kind: "startRole", roleId: "r-fin" })
    const s = act(s0, { kind: "start", from: s0.today, to: "2026-11-30" })
    expect(s.handoff?.partial).toBeUndefined()
    expect(s.handoffRoles.length).toBe(s.roles.length)
  })

  it("a second role can be added to a one-role season; an unfinished role is not restarted", () => {
    let s = act(as({ ...seedDemo(), handoff: null, handoffRoles: [] }, "alex"), { kind: "startRole", roleId: "r-fin" })
    s = act(s, { kind: "interview", roleId: "r-fin", lines: ["kept"] } as HandoffAction)
    const again = act(s, { kind: "startRole", roleId: "r-fin" })
    expect(again).toEqual(s)
    s = act(s, { kind: "startRole", roleId: "r-mkt" })
    expect(s.handoffRoles.map(r => r.roleId)).toEqual(["r-fin", "r-mkt"])
  })

  it("only the president or vice president can start one", () => {
    const s0 = { ...seedDemo(), handoff: null, handoffRoles: [] }
    expect(act(as(s0, "maya"), { kind: "startRole", roleId: "r-fin" })).toEqual(as(s0, "maya"))
    expect(act(as(s0, "alex"), { kind: "startRole", roleId: "nope" })).toEqual(as(s0, "alex"))
  })

  it("the one-role handoff finishes and does not touch other roles", () => {
    let s = act(as({ ...seedDemo(), handoff: null, handoffRoles: [] }, "alex"), { kind: "startRole", roleId: "r-fin" })
    s = ready(s, "r-fin", "maya")
    s = finish(s, "r-fin", { kind: "new", name: "Casey Example" })
    expect(holder(s, "r-fin")).not.toBe("maya")
    expect(holder(s, "r-mkt")).toBe("sam")
    expect(validateClub(clubDraft(s))).toBeNull()
  })
})
