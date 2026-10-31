import { describe, expect, it } from "vitest"
import { seedDemo } from "../data/seed"
import { buildEventNodes } from "../engine/playbooks"
import { reducer } from "../data/store"
import { applySchedule, computeSchedule } from "../engine/schedule"
import { metroLayout, EVENT_KEY } from "../components/flow/metro"
import { cannotDelete, flowGaps, flowTracks, moveBetween, newStepNode, removalEdits, unlinkSteps } from "../lib/flowEdit"
import { applyEdits, ancestorsOf } from "../lib/stepOrder"
import type { Node } from "../data/types"

// These assertions deliberately exercise the retained legacy graph and its editing
// affordances. New and migrated activities use the v2 standard graph.
const seeded = seedDemo()
const legacyEvent = { ...seeded.events[0], checks: undefined }
const legacyNodes = buildEventNodes(legacyEvent, seeded.roles).map(n => n.stepKey === "mktneeds" ? { ...n, status: "done" as const } : n)
const base = applySchedule({ ...seeded, events: [legacyEvent, ...seeded.events.slice(1)], nodes: [...legacyNodes, ...seeded.nodes.filter(n => n.eventId !== legacyEvent.id)] })
const ev = base.events[0]                                              // Networking Night
const nodes = () => base.nodes.filter(n => n.eventId === ev.id)
const at = (ns: Node[], key: string) => ns.find(n => n.stepKey === key)!
const id = (key: string) => `${ev.id}:${key}`
const move = (ns: Node[], r: string, u: string | null, v: string | null) => { const r1 = moveBetween(ns, id(r), u ? id(u) : null, v ? id(v) : null); return { r: r1, after: applyEdits(ns, r1.edits) } }
const chainOf = (ns: Node[], keys: string[]) => keys.every((k, i) => i === 0 || ancestorsOf(ns, id(k)).has(id(keys[i - 1])))
const orderOk = (ns: Node[]) => ns.every(n => !ancestorsOf(ns, n.id).has(n.id))

describe("flow chart · dragging a step to a new place (snaps between two neighbours)", () => {
  it("the first dot dropped between the second and the third: the order becomes 2nd, 1st, 3rd", () => {
    const ns = nodes()
    expect(chainOf(ns, ["draft", "mktneeds", "budget"])).toBe(true)                                   // today: event plan → marketing needs → budget
    const { r, after } = move(ns, "draft", "mktneeds", "budget")
    expect(r.error).toBeUndefined(); expect(r.message).toBe("Moved “Draft the event plan: headcount, room, food, staffing” between “List marketing needs and estimate their cost” and “Build the budget and choose the funding source”.")
    expect(at(after, "mktneeds").dependsOn).toEqual([])                                               // marketing needs is now first
    expect(at(after, "draft").dependsOn).toEqual([id("mktneeds")])
    expect(at(after, "budget").dependsOn).toEqual([id("draft")])
    expect(chainOf(after, ["mktneeds", "draft", "budget", "approve"])).toBe(true)
    expect(orderOk(after)).toBe(true)
    expect(r.edits.map(e => Object.keys(e.patch))).toEqual(r.edits.map(() => ["dependsOn"]))          // only links change; never a date
  })
  it("dropping a step where it already is changes nothing", () => {
    expect(move(nodes(), "mktneeds", "draft", "budget").r).toMatchObject({ edits: [], message: expect.stringContaining("already there") })
    expect(moveBetween(nodes(), id("budget"), id("budget"), id("approve")).edits).toEqual([])
  })
  it("moving a step takes it out cleanly: what waited for it waits for what it waited for", () => {
    const ns = nodes()
    const { after } = move(ns, "approve", "foodex" in {} ? null : "review", null)                      // approve to the very end of the pre-event line
    expect(at(after, "registry").dependsOn).toEqual([id("budget")])                                    // registry used to wait for approve; now for approve's own predecessor
    expect(orderOk(after)).toBe(true)
    expect(ancestorsOf(after, id("approve")).has(id("review"))).toBe(true)
  })
  it("refuses a drop that would make a step wait for itself", () => {
    const ns = nodes()
    const r = moveBetween(ns, id("draft"), id("budget"), id("mktneeds"))                                // after budget but before marketing needs, which budget waits for
    expect(r.error).toMatch(/wait for itself/); expect(r.edits).toEqual([])
  })
  it("moves to the very start (no step before it) and keeps ASU deadlines on rule steps", () => {
    const ns = nodes()
    const { r, after } = move(ns, "budget", null, "draft")
    expect(at(after, "budget").dependsOn).toEqual([]); expect(at(after, "draft").dependsOn).toEqual([id("budget")]); expect(orderOk(after)).toBe(true); expect(r.error).toBeUndefined()
    const rule = move(ns, "usg", "approve", null)
    expect(rule.r.note).toMatch(/keeps its ASU deadline/)
    expect(rule.after.find(n => n.id === id("usg"))!.anchor).toEqual(ns.find(n => n.id === id("usg"))!.anchor)
  })
  it("the dates still come from the engine: moved steps are re-dated and no issue says a step waits for itself", () => {
    const { after } = move(nodes(), "draft", "mktneeds", "budget")
    const s = { ...base, nodes: base.nodes.map(n => after.find(a => a.id === n.id) ?? n) }
    const plan = computeSchedule(s)
    expect(plan.nodes[id("draft")].latestStart).toBeTruthy()
    expect(Object.values(plan.nodes).flatMap(p => p.issues).some(i => /itself/i.test(i.text))).toBe(false)
  })
})

describe("flow chart · cutting a link and adding / deleting steps", () => {
  it("cuts a direct link; explains an indirect or missing one", () => {
    const ns = nodes()
    const cut = unlinkSteps(ns, id("mktneeds"), id("draft"))
    expect(cut.error).toBeUndefined(); expect(applyEdits(ns, cut.edits).find(n => n.id === id("mktneeds"))!.dependsOn).toEqual([])
    expect(unlinkSteps(ns, id("approve"), id("draft")).error).toMatch(/through other steps/)
    expect(unlinkSteps(ns, id("flyer"), id("quote")).message).toMatch(/only shows their order/)
  })
  it("a new step between two neighbours waits for the first and is waited for by the second", () => {
    const ns = nodes(), fresh = newStepNode(ev, `${ev.id}:s1`, at(ns, "budget"), base.today)
    expect(fresh).toMatchObject({ title: "New step", ownerId: null, status: "unclaimed", estDays: 1, phase: "money", ruleIds: [], stepKey: null })
    const r = moveBetween([...ns, fresh], fresh.id, id("budget"), id("approve"))
    const after = applyEdits([...ns, fresh], r.edits)
    expect(after.find(n => n.id === fresh.id)!.dependsOn).toEqual([id("budget")]); expect(at(after, "approve").dependsOn).toEqual([fresh.id]); expect(orderOk(after)).toBe(true)
  })
  it("only steps no ASU rule needs, and not yet finished, can be deleted; the steps after one wait for what it waited for", () => {
    const ns = nodes()
    expect(cannotDelete(at(ns, "usg"))).toMatch(/ASU rule/); expect(cannotDelete(at(ns, "mktneeds"))).toMatch(/already done/); expect(cannotDelete(at(ns, "rsvp"))).toBeNull()
    const edits = removalEdits(ns, id("rsvp"))
    const after = applyEdits(ns.filter(n => n.id !== id("rsvp")), edits)
    expect(at(after, "promo").dependsOn).toEqual([id("flyer")]); expect(orderOk(after)).toBe(true)
    expect(after.every(n => n.dependsOn.every(d => after.some(x => x.id === d)))).toBe(true)
  })
})

describe("flow chart · where a step can be dropped", () => {
  const sched = computeSchedule(base)
  const L = metroLayout(base, sched, ev.id, true)
  it("every pair of neighbours on the main line and on each branch is a drop place; nothing is offered right after the event day", () => {
    const tracks = flowTracks(L), gaps = flowGaps(L)
    expect(tracks[0].id).toBe("main"); expect(tracks.length).toBe(1 + L.branches.length)
    expect(gaps.length).toBeGreaterThan(8)
    expect(gaps.some(g => g.u.key === EVENT_KEY)).toBe(false)
    const main = gaps.filter(g => g.track === "main")
    expect(main.map(g => g.u.key)).toEqual(tracks[0].items.slice(0, -1).filter(x => x.key !== EVENT_KEY).map(x => x.key))
    expect(new Set(gaps.map(g => g.id)).size).toBe(gaps.length)
    const draftToMk = gaps.find(g => g.uId === id("draft") && g.vId === id("mktneeds"))!
    expect(draftToMk.row).toBe(0); expect(draftToMk.col).toBeCloseTo((draftToMk.u.col + draftToMk.v.col) / 2)
  })
  it("the gap before the event day has no step after it, and a branch ends on its main-line station", () => {
    const gaps = flowGaps(L)
    expect(gaps.some(g => g.v.key === EVENT_KEY && g.vId === null && g.uId !== null)).toBe(true)
    const branchGap = gaps.find(g => g.track !== "main")!
    expect(branchGap.row).not.toBe(0)
  })
})

describe("flow chart · the store actions", () => {
  const lead = base                                                          // Alex is the president
  it("adds a step between two neighbours, selects nothing else, and re-dates", () => {
    const next = reducer(lead, { type: "addEventStep", eventId: ev.id, id: `${ev.id}:s1`, uId: id("budget"), vId: id("approve") })
    const n = next.nodes.find(x => x.id === `${ev.id}:s1`)!
    expect(n).toMatchObject({ title: "New step", dependsOn: [id("budget")] }); expect(at(next.nodes, "approve").dependsOn).toEqual([n.id]); expect(n.latestStart).toBeTruthy()
    expect(reducer(lead, { type: "addEventStep", eventId: ev.id, id: "other:s1", uId: null, vId: null })).toBe(lead)                  // id must belong to the event
    expect(reducer(next, { type: "addEventStep", eventId: ev.id, id: n.id, uId: null, vId: null })).toBe(next)                         // and be new
    expect(reducer({ ...lead, viewerId: "maya" }, { type: "addEventStep", eventId: ev.id, id: `${ev.id}:s2`, uId: null, vId: null }).nodes).toHaveLength(lead.nodes.length)  // only the president and vice president
  })
  it("deletes a step, rewires, cleans what pointed at it; refuses rule steps; undo puts everything back", () => {
    const snapshot = structuredClone(lead.nodes.filter(n => n.eventId === ev.id))
    const gone = reducer(lead, { type: "removeEventStep", eventId: ev.id, nodeId: id("rsvp") })
    expect(gone.nodes.some(n => n.id === id("rsvp"))).toBe(false); expect(at(gone.nodes, "promo").dependsOn).toEqual([id("flyer")])
    expect(reducer(lead, { type: "removeEventStep", eventId: ev.id, nodeId: id("mktneeds") })).toBe(lead)                              // finished steps stay
    expect(reducer(lead, { type: "removeEventStep", eventId: ev.id, nodeId: id("usg") })).toBe(lead)
    const back = reducer(gone, { type: "restoreEventNodes", eventId: ev.id, nodes: snapshot })
    expect(back.nodes.filter(n => n.eventId === ev.id).map(n => [n.id, n.dependsOn]).sort()).toEqual(snapshot.map(n => [n.id, n.dependsOn]).sort())
    expect(reducer(gone, { type: "restoreEventNodes", eventId: ev.id, nodes: [{ ...snapshot[0], eventId: "other" }] })).toBe(gone)
    expect(back.nodes.filter(n => n.eventId !== ev.id)).toHaveLength(lead.nodes.filter(n => n.eventId !== ev.id).length)
  })
})
