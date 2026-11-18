import { describe, expect, it } from "vitest"
import type { Node, WorkflowBranch } from "../data/types"
import { seedDemo } from "../data/seed"
import { insertFlowBranch, insertFlowStep, moveBetween, type FlowInsertionTarget } from "../lib/flowEdit"
import { ancestorsOf, applyEdits, cleanPatch } from "../lib/stepOrder"
import { orderedBranchNodes } from "../lib/flowOrder"
import { metroLayout, EVENT_KEY } from "../components/flow/metro"

const base = seedDemo(undefined, "v2")
const ev = { ...base.events[0], id: "test" }
const n = (id: string, branchId: string, order: number, dependsOn: string[] = [], extra: Partial<Node> = {}): Node => ({ ...base.nodes[0], id, stepKey: id, title: id, eventId: ev.id, phase: branchId === "post" ? "close" : "prepare", status: "accepted", dependsOn, ruleIds: [], anchor: null, placement: { branchId, order }, ...extra })
const branches: WorkflowBranch[] = [
  { id: "work", title: "Work", side: "before_event", order: 8 },
  { id: "outside", title: "Outside", side: "before_event", order: 9 },
  { id: "post", title: "Post", side: "after_event", order: 10 },
]
const target = (branchId: string, afterId: string | null, beforeId: string | null): FlowInsertionTarget => ({ branchId, afterId, beforeId, source: "gap" })
const ids = (nodes: Node[], branch: string) => orderedBranchNodes(nodes, branch).map(n => n.id)

describe("saved workflow branch operations", () => {
  it("inserts before the first speaker step using its branch and condition, never Start or another route", () => {
    const first = n("partner", "speaker", 0, [], { cond: "externalGuest" })
    const fresh = n("fresh", "outside", 0)
    const result = insertFlowStep([first], fresh, { ...target("speaker", null, first.id), referenceId: first.id, source: "before_node" }, branches)
    const after = applyEdits([first, fresh], result.edits)
    expect(result.error).toBeUndefined()
    expect(after.find(n => n.id === "fresh")).toMatchObject({ placement: { branchId: "speaker", order: 0 }, cond: "externalGuest" })
    expect(after.find(n => n.id === "partner")?.dependsOn).toEqual(["fresh"])
    expect(ids(after, "speaker")).toEqual(["fresh", "partner"])
  })
  it("appends on the selected route and replaces only that route's terminal join", () => {
    const a = n("a", "work", 0), other = n("other", "outside", 0)
    const gate = n("finalcheck", "main", 0, [a.id, other.id])
    const fresh = n("fresh", "work", 1)
    const result = insertFlowStep([a, other, gate], fresh, { ...target("work", a.id, gate.id), referenceId: a.id, source: "after_node" }, branches)
    const after = applyEdits([a, other, gate, fresh], result.edits)
    expect(result.error).toBeUndefined()
    expect(after.find(n => n.id === gate.id)?.dependsOn).toEqual([other.id, fresh.id])
    expect(after.find(n => n.id === fresh.id)?.dependsOn).toEqual([a.id])
    expect(after.find(n => n.id === fresh.id)?.placement?.branchId).toBe("work")
  })
  it("moves within a route, updates its layout, and preserves both cross-branch directions", () => {
    const nodes = [n("a", "work", 0), n("b", "work", 1, ["a"]), n("c", "work", 2, ["b", "external"]), n("external", "outside", 0), n("waiter", "outside", 1, ["c"])]
    const result = moveBetween(nodes, "c", "a", "b", { target: target("work", "a", "b"), branches })
    const after = applyEdits(nodes, result.edits)
    expect(result.error).toBeUndefined()
    expect(ids(after, "work")).toEqual(["a", "c", "b"])
    expect(after.find(n => n.id === "c")?.dependsOn).toEqual(["a", "external"])
    expect(after.find(n => n.id === "waiter")?.dependsOn).toEqual(["c"])
    const layout = metroLayout({ ...base, events: [{ ...ev, workflowBranches: branches }], nodes: after }, {} as never, ev.id)
    expect(layout.branches.find(b => b.id === "work")?.nodes.map(x => x.node.id)).toEqual(["a", "c", "b"])
  })
  it("uses positions only between independent tasks and never changes dependencies while drawing", () => {
    const nodes = [n("a", "work", 10), n("b", "work", 0, ["a"]), n("parallel", "work", -1)]
    expect(ids(nodes, "work")).toEqual(["parallel", "a", "b"])
    expect(nodes[2].dependsOn).toEqual([])
  })
  it("rejects stale neighbours, changed-side moves, and cycles atomically", () => {
    const nodes = [n("a", "work", 0), n("b", "work", 1, ["a"]), n("c", "work", 2, ["b", "external"]), n("external", "outside", 0, ["b"]), n("closed", "post", 0)]
    expect(insertFlowStep(nodes, n("fresh", "work", 0), target("work", "a", "c"), branches)).toMatchObject({ edits: [], error: expect.stringContaining("neighbours") })
    expect(moveBetween(nodes, "c", "a", "b", { target: target("work", "a", "b"), branches })).toMatchObject({ edits: [], error: expect.stringContaining("circular") })
    expect(moveBetween(nodes, "c", null, "closed", { target: target("post", null, "closed"), branches })).toMatchObject({ edits: [], error: expect.stringContaining("preparation and close-out") })
  })
  it("requires scope confirmation before moving out of a conditional branch", () => {
    const nodes = [n("partner", "speaker", 0, [], { cond: "externalGuest" }), n("other", "work", 0)]
    const t = { ...target("work", null, "other"), condition: null }
    expect(moveBetween(nodes, "partner", null, "other", { target: t, branches })).toMatchObject({ edits: [], error: expect.stringContaining("Confirm") })
    const result = moveBetween(nodes, "partner", null, "other", { target: t, branches, conditionConfirmed: true })
    expect(result.error).toBeUndefined()
    expect(applyEdits(nodes, result.edits).find(n => n.id === "partner")).toMatchObject({ placement: { branchId: "work", order: 0 }, cond: undefined })
  })
  it("preserves the standard Full Check dependency when an order task moves to Marketing", () => {
    const nodes = base.nodes.filter(n => n.eventId === "e-speaker")
    const id = (key: string) => `e-speaker:${key}`
    const result = moveBetween(nodes, id("orderPlaced"), id("marketingNeeds"), id("contentCreation"), { target: target("marketing", id("marketingNeeds"), id("contentCreation")), branches: [] })
    expect(result.error).toBeUndefined()
    const after = applyEdits(nodes, result.edits)
    expect(ancestorsOf(after, id("finalcheck")).has(id("orderPlaced"))).toBe(true)
    expect(ancestorsOf(after, id("orderPlaced")).has(id("purchaseApproval"))).toBe(true)
  })
  it("rejects moving a required core step into a conditional branch before reporting success", () => {
    const nodes = base.nodes.filter(n => n.eventId === "e-speaker")
    const id = (key: string) => `e-speaker:${key}`
    const result = moveBetween(nodes, id("promotionItems"), id("partner"), id("speakerPacket"), { target: { ...target("speaker", id("partner"), id("speakerPacket")), condition: null }, branches: [], conditionConfirmed: true })
    expect(result).toMatchObject({ edits: [], error: expect.stringContaining("Required workflow") })
  })
  it("creates new pre and post branches with real entry/exit dependencies", () => {
    const nodes = [n("finalcheck", "main", 0), n("headcount", "main", 1)]
    const pre: WorkflowBranch = { id: "new-pre", title: "New prep", side: "before_event", order: 20 }
    const before = n("fresh", pre.id, 0)
    const preResult = insertFlowBranch(nodes, before, pre, branches)
    expect(preResult.error).toBeUndefined()
    expect(applyEdits([...nodes, before], preResult.edits).find(n => n.id === "finalcheck")?.dependsOn).toEqual(["fresh"])
    const post: WorkflowBranch = { ...pre, id: "new-post", side: "after_event" }
    const after = n("later", post.id, 0, [], { phase: "close" })
    const postResult = insertFlowBranch(nodes, after, post, branches)
    expect(postResult.error).toBeUndefined()
    expect(applyEdits([...nodes, after], postResult.edits).find(n => n.id === "later")?.dependsOn).toEqual(["headcount"])
  })
  it("shows all historical tasks when Full Check, Check-in and Headcount are absent", () => {
    const nodes = [n("a", "work", 0), n("later", "post", 0)]
    const layout = metroLayout({ ...base, events: [{ ...ev, workflowBranches: branches }], nodes }, {} as never, ev.id)
    expect(layout.branches.flatMap(b => b.nodes.map(x => x.node.id)).sort()).toEqual(["a", "later"])
    const post = layout.branches.find(b => b.id === "post")!
    expect(layout.stations[post.from].key).toBe(EVENT_KEY)
    const phone = metroLayout({ ...base, events: [{ ...ev, workflowBranches: branches }], nodes }, {} as never, ev.id, false)
    expect(new Set(phone.branches.map(b => b.row)).size).toBe(phone.branches.length)
  })
  it("keeps valid condition patches and rejects invalid workday values rather than clamping them", () => {
    expect(cleanPatch({ cond: "externalGuest", estDays: 10 }, new Set(), "a")).toMatchObject({ cond: "externalGuest", estDays: 10, startPolicy: "effort" })
    expect(cleanPatch({ cond: "made-up", estDays: 2.5 }, new Set(), "a")).toEqual({})
  })
})
