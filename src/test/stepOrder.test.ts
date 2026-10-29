import { describe, expect, it } from "vitest"
import { seedDemo } from "../data/seed"
import { loggedReducer, reducer } from "../data/store"
import { computeSchedule, applySchedule } from "../engine/schedule"
import { computeForecast } from "../engine/forecast"
import { phaseChain } from "../lib/phases"
import {
  PHASES, applyEdits, createsLoop, descendantsOf, displayOrder, doAfter, doAlongside, doBefore, flipLink, inverseOf, moveGroup, movePhase, phaseOrderOf, setDays, stepDown, stepUp,
  type StepEdit,
} from "../lib/stepOrder"
import type { DemoState, Node } from "../data/types"

const EV = "e-night"
const base = () => seedDemo()
const evNodes = (s: DemoState) => s.nodes.filter(n => n.eventId === EV)
const step = (s: DemoState, key: string) => evNodes(s).find(n => n.stepKey === key)!
const deps = (s: DemoState, key: string) => step(s, key).dependsOn.map(id => s.nodes.find(n => n.id === id)!.stepKey)
const asOfficer = (s: DemoState): DemoState => ({ ...s, viewerId: s.roles.find(r => r.fn !== "president" && r.fn !== "vice_president" && r.holderId)!.holderId! })
const apply = (s: DemoState, edits: StepEdit[], phaseOrder?: DemoState["events"][0]["phaseOrder"]) => reducer(s, { type: "applyStepEdits", eventId: EV, edits, ...(phaseOrder ? { phaseOrder } : {}) })
const changedDeps = (a: DemoState, b: DemoState) => b.nodes.filter(n => n.dependsOn.join() !== a.nodes.find(x => x.id === n.id)!.dependsOn.join()).map(n => n.stepKey)

describe("M3 step editor: list order never rebuilds the dependencies", () => {
  it("groups by phase in the standard order and copes with the template's three backwards links", () => {
    const s = base()
    const groups = displayOrder(evNodes(s), computeSchedule(s))
    expect(groups.map(g => g.phase)).toEqual(PHASES.filter(p => evNodes(s).some(n => n.phase === p)))
    // approve (plan) waits for budget (money): the list must not break on it
    expect(deps(s, "approve")).toContain("budget")
    expect(groups.flatMap(g => g.rows).length).toBe(evNodes(s).length)
    // inside a group, a step that waits for another comes after it
    for (const g of groups) for (const r of g.rows) for (const d of r.dependsOn) { const dep = g.rows.find(x => x.id === d); if (dep) expect(g.rows.indexOf(dep)).toBeLessThan(g.rows.indexOf(r)) }
  })

  it("moving the room after the registration changes one step's links and keeps every parallel branch", () => {
    const s = base()
    expect(deps(s, "venue")).toEqual(["approve"])
    expect(deps(s, "registry")).toEqual(["approve"])
    const r = doAfter(evNodes(s), step(s, "venue").id, step(s, "registry").id)
    expect(r.error).toBeUndefined()
    const next = apply(s, r.edits)
    expect(deps(next, "venue")).toEqual(["registry"]) // approve is now redundant
    expect(changedDeps(s, next)).toEqual(["venue"])
    for (const k of ["registry", "advisor", "quote", "flyer", "foodex", "usg", "rsvp", "review"]) expect(deps(next, k)).toEqual(deps(s, k))
    expect(deps(next, "ritm").sort()).toEqual(["registry", "venue"])
  })

  it("never turns the plan into one long chain", () => {
    let s = base()
    const before = computeSchedule(s)
    let n = 0
    for (const [a, b] of [["venue", "registry"], ["advisor", "venue"], ["flyer", "advisor"]]) {
      const r = doAfter(evNodes(s), step(s, a).id, step(s, b).id)
      if (r.edits.length) { s = apply(s, r.edits); n++ }
    }
    expect(changedDeps(base(), s).length).toBeLessThanOrEqual(n)
    // the steps that were all waiting only for "approve" and were not touched still wait only for it
    for (const k of ["registry", "quote"]) expect(deps(s, k)).toEqual(["approve"])
    // each move can lengthen the longest chain by at most one step (a chain of all steps would add ~16)
    const longest = (x: DemoState) => { const depth = (id: string): number => 1 + Math.max(0, ...x.nodes.find(m => m.id === id)!.dependsOn.map(depth)); return Math.max(...evNodes(x).map(m => depth(m.id))) }
    expect(longest(s)).toBeLessThanOrEqual(longest(base()) + n)
    expect(before).toBeTruthy()
  })

  it("do before, swap, down and up each touch only the steps they name", () => {
    const s = base()
    const nodes = evNodes(s)
    const before = doBefore(nodes, step(s, "advisor").id, step(s, "quote").id)
    expect(before.edits.map(e => e.id)).toEqual([step(s, "quote").id])
    expect(deps(apply(s, before.edits), "quote")).toEqual(["advisor"]) // approve is implied by advisor, so it goes
    const flip = flipLink(nodes, step(s, "ritm").id, step(s, "venue").id)
    expect(flip.error).toBeUndefined()
    expect(flip.edits.map(e => e.id).sort()).toEqual([step(s, "ritm").id, step(s, "venue").id].sort())
    const down = stepDown(nodes, step(s, "advisor").id, step(s, "quote").id)
    const up = stepUp(nodes, step(s, "quote").id, step(s, "advisor").id)
    expect(down.edits.length).toBe(1)
    expect(up.edits.length).toBe(1)
  })

  it("alongside gives a step its neighbour's own prerequisites", () => {
    const s = base()
    const after = apply(s, doAfter(evNodes(s), step(s, "venue").id, step(s, "registry").id).edits)
    const r = doAlongside(evNodes(after), step(after, "venue").id, step(after, "registry").id)
    expect(r.error).toBeUndefined()
    expect(deps(apply(after, r.edits), "venue")).toEqual(["approve"])
    expect(doAlongside(evNodes(s), step(s, "advisor").id, step(s, "quote").id).edits).toEqual([]) // already side by side
  })

  it("refuses anything that would make a step wait for itself, in the helpers and in the store", () => {
    const s = base()
    const nodes = evNodes(s)
    const r = doAfter(nodes, step(s, "approve").id, step(s, "venue").id)
    expect(r.error).toMatch(/already waits for/)
    expect(descendantsOf(nodes, step(s, "approve").id).has(step(s, "venue").id)).toBe(true)
    const loop: StepEdit[] = [{ id: step(s, "budget").id, patch: { dependsOn: [step(s, "approve").id] } }]
    expect(createsLoop(nodes, loop)).toBe(step(s, "budget").id)
    expect(apply(s, loop)).toBe(s)
  })
})

describe("M3 step editor: only dependsOn, estDays and phase are written; dates come from the engine", () => {
  it("ignores date fields in an edit and re-dates everything with the engine", () => {
    const s = base()
    const venue = step(s, "venue")
    const patch = { dependsOn: [step(s, "registry").id], estDays: 4, clubDeadline: "2020-01-01", latestStart: "2020-01-01", officialDeadline: "2020-01-01", clubDeadlineOverride: "2020-01-01", lastUpdate: "2020-01-01", title: "Hacked", ownerId: "x" } as unknown as StepEdit["patch"]
    const next = apply(s, [{ id: venue.id, patch }])
    const n = next.nodes.find(x => x.id === venue.id)!
    expect(n.estDays).toBe(4)
    expect(n.title).toBe(venue.title)
    expect(n.ownerId).toBe(venue.ownerId)
    expect(n.clubDeadlineOverride).toBe(venue.clubDeadlineOverride)
    expect(n.lastUpdate).toBe(venue.lastUpdate)
    // every date on every step is exactly what the engine computes for the new state
    const plan = computeSchedule(next)
    for (const m of next.nodes.filter(x => x.eventId === EV)) {
      expect(m.clubDeadline).toBe(plan.nodes[m.id].club)
      expect(m.latestStart).toBe(plan.nodes[m.id].latestStart)
      expect(m.officialDeadline).toBe(plan.nodes[m.id].official)
    }
    expect(next).toEqual(applySchedule(next))
  })

  it("days are whole numbers from 0 to 30, and more days means an earlier latest start", () => {
    const s = base()
    const id = step(s, "flyer").id
    expect(apply(s, [{ id, patch: { estDays: 99 } }]).nodes.find(n => n.id === id)!.estDays).toBe(30)
    expect(apply(s, [{ id, patch: { estDays: -4 } }]).nodes.find(n => n.id === id)!.estDays).toBe(0)
    expect(apply(s, [{ id, patch: { estDays: 2.6 } }]).nodes.find(n => n.id === id)!.estDays).toBe(3)
    const more = apply(s, setDays(evNodes(s), id, step(s, "flyer").estDays + 3).edits)
    expect(more.nodes.find(n => n.id === id)!.latestStart! < step(s, "flyer").latestStart!).toBe(true)
    expect(setDays(evNodes(s), id, step(s, "flyer").estDays).edits).toEqual([])
  })

  it("only the president and vice president can use it, and edits to other events' steps are ignored", () => {
    const s = base()
    const e = doAfter(evNodes(s), step(s, "venue").id, step(s, "registry").id).edits
    expect(apply(asOfficer(s), e)).toEqual(asOfficer(s))
    const other = s.nodes.find(n => n.eventId && n.eventId !== EV)!
    expect(apply(s, [{ id: other.id, patch: { estDays: 9 } }])).toBe(s)
  })

  it("phases: moving into Close warns that it is scheduled after the event; the group order is display only", () => {
    const s = base()
    const id = step(s, "advisor").id
    const r = movePhase(evNodes(s), id, "close")
    expect(r.note).toMatch(/after the event/)
    expect(apply(s, r.edits).nodes.find(n => n.id === id)!.phase).toBe("close")
    expect(apply(s, [{ id, patch: { phase: "nonsense" as never } }])).toBe(s)
    const order = moveGroup(PHASES, "money", -1)
    expect(order.slice(0, 3)).toEqual(["plan", "money", "prepare"])
    const withOrder = apply(s, [], order)
    expect(withOrder.events.find(e => e.id === EV)!.phaseOrder).toEqual(order)
    // dates do not depend on the order of the groups
    expect(withOrder.nodes.map(n => [n.id, n.clubDeadline, n.latestStart, n.officialDeadline])).toEqual(s.nodes.map(n => [n.id, n.clubDeadline, n.latestStart, n.officialDeadline]))
    expect(phaseOrderOf(withOrder.events.find(e => e.id === EV))).toEqual(order)
    expect(phaseChain(withOrder, computeForecast(withOrder), EV).map(x => x.key).indexOf("money")).toBeLessThan(phaseChain(withOrder, computeForecast(withOrder), EV).map(x => x.key).indexOf("prepare"))
    expect(phaseOrderOf({ phaseOrder: ["plan"] as never })).toEqual(PHASES)
  })

  it("an undo puts back links, days and phase exactly, and the log records the change without dates", () => {
    const s = base()
    const r = doAfter(evNodes(s), step(s, "venue").id, step(s, "registry").id)
    const edits: StepEdit[] = [...r.edits, { id: step(s, "venue").id, patch: { ...r.edits[0].patch, estDays: 5, phase: "run" } }]
    const back = inverseOf(evNodes(s), edits)
    const changed = apply(s, edits)
    const restored = apply(changed, back)
    const snap = (x: DemoState) => x.nodes.map(n => [n.id, n.dependsOn, n.estDays, n.phase, n.clubDeadline, n.latestStart])
    expect(snap(restored)).toEqual(snap(s))
    const root = loggedReducer({ app: s, log: [] }, { action: { type: "applyStepEdits", eventId: EV, edits: [{ id: step(s, "venue").id, patch: { dependsOn: [step(s, "registry").id], clubDeadline: "2020-01-01" } as never }] }, at: 1 })
    const entry = root.log[0]
    expect(entry.type).toBe("applyStepEdits")
    expect(entry.applied).toBe(true)
    expect(JSON.stringify(entry)).not.toMatch(/clubDeadline|latestStart|officialDeadline|2020-01-01/)
    expect(JSON.stringify(entry.before)).toMatch(/dependsOn/)
  })

  it("applyEdits is pure", () => {
    const s = base()
    const nodes = evNodes(s)
    const copy = JSON.stringify(nodes)
    applyEdits(nodes, [{ id: nodes[0].id, patch: { estDays: 9 } }])
    expect(JSON.stringify(nodes)).toBe(copy)
    const n: Node = nodes[0]
    expect(n).toBe(nodes[0])
  })
})
