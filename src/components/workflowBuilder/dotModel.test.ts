import { describe, expect, it } from "vitest"
import type { StepTemplate } from "../../data/types"
import { graphError, type BuilderSnapshot } from "./model"
import { addDotTask, moveDotTask, orderedDotSteps } from "./dotModel"

const task = (key: string, dependsOn: string[] = []): StepTemplate => ({ key, title: key, fn: "programs", ownerRoleId: "programs-role", phase: "prepare", estDays: 2, tier: "medium", dependsOn, anchor: { kind: "target", days: 10, unit: "calendar", label: "Club target" }, why: "Saved instructions.", source: "Club authored", custom: true })
const teams = [{ id: "ops", name: "Operations" }, { id: "finance", name: "Finance" }]
const snapshot = (): BuilderSnapshot => ({ steps: [task("a"), task("b", ["a"]), task("c")], branches: [], stepTeams: { a: "ops", b: "ops", c: "finance" } })

describe("dot workflow authoring transactions", () => {
  it("creates a first task independently without manufacturing Start or Done tasks", () => {
    const value = addDotTask({ steps: [], stepTeams: {} }, {}, "new")
    expect(value.steps).toHaveLength(1)
    expect(value.steps[0]).toMatchObject({ key: "new", title: "New task", dependsOn: [] })
    expect(value.stepTeams).toEqual({})
  })
  it("inserts immediately after the selected task and keeps the remaining chain intact", () => {
    const initial = snapshot(), result = addDotTask(initial, { teamId: "ops", afterKey: "a" }, "new")
    expect(result.steps.find(step => step.key === "new")?.dependsOn).toEqual(["a"])
    expect(result.steps.find(step => step.key === "b")?.dependsOn).toEqual(["new"])
    expect(result.steps.find(step => step.key === "c")).toBe(initial.steps[2])
    expect(result.stepTeams.new).toBe("ops")
    expect(graphError(result.steps)).toBeNull()
    expect(initial.steps[1].dependsOn).toEqual(["a"])
  })
  it("appends to the selected team's end when a selected task belongs to another team", () => {
    const result = addDotTask(snapshot(), { teamId: "ops", afterKey: "c" }, "new")
    expect(result.steps.find(step => step.key === "new")?.dependsOn).toEqual(["b"])
    expect(result.stepTeams.new).toBe("ops")
  })
  it("inherits a selected task's team when no team argument is supplied", () => {
    const result = addDotTask(snapshot(), { afterKey: "c" }, "new")
    expect(result.steps.find(step => step.key === "new")?.dependsOn).toEqual(["c"])
    expect(result.stepTeams.new).toBe("finance")
  })
  it("keeps original tasks, dates, roles, conditions, dependencies and branches identical when moving across teams", () => {
    const initial = snapshot()
    initial.steps[1] = { ...initial.steps[1], cond: "funding", stepKind: "situation", placement: { branchId: "finance", order: 8 }, timing: { startDays: 20, dueDays: 10 } }
    const before = structuredClone(initial)
    const result = moveDotTask(initial, "b", "finance", teams, "c", true)
    expect(result.stepTeams).toEqual({ a: "ops", b: "finance", c: "finance" })
    expect(result.steps).toBe(initial.steps)
    expect(result.steps).toEqual(before.steps)
    expect(result.branches).toBe(initial.branches)
    expect(initial).toEqual(before)
    expect(graphError(result.steps)).toBeNull()
  })
  it("reorders only within a team while preserving an existing external dependency", () => {
    const initial = snapshot()
    initial.steps[1] = { ...initial.steps[1], dependsOn: ["a", "c"] }
    const result = moveDotTask(initial, "b", "ops", teams, "a", true)
    expect(result.stepTeams).toBe(initial.stepTeams)
    expect(result.steps.find(step => step.key === "b")?.dependsOn).toEqual(["c"])
    expect(result.steps.find(step => step.key === "a")?.dependsOn).toEqual(["b"])
    expect(graphError(result.steps)).toBeNull()
  })
  it("treats a drop that leaves independent tasks in the same order as a complete no-op", () => {
    const initial: BuilderSnapshot = { steps: [task("a"), task("b"), task("c")], stepTeams: { a: "ops", b: "ops", c: "ops" } }
    expect(moveDotTask(initial, "a", "ops", teams, "b", true)).toBe(initial)
    expect(moveDotTask(initial, "b", "ops", teams, "a", false)).toBe(initial)
    expect(initial.steps.every(step => step.dependsOn?.length === 0)).toBe(true)
  })
  it("moves independent tasks by canvas order without linking them or changing their relative dates", () => {
    const initial: BuilderSnapshot = { steps: [task("a"), { ...task("b"), anchor: { kind: "target", days: 4, unit: "calendar", label: "Later task" } }, task("c")], stepTeams: { a: "ops", b: "ops", c: "ops" } }
    const result = moveDotTask(initial, "b", "ops", teams, "a", true)
    expect(orderedDotSteps(result.steps).map(step => step.key)).toEqual(["b", "a", "c"])
    expect(result.steps.map(step => step.dependsOn)).toEqual(initial.steps.map(step => step.dependsOn))
    expect(result.steps.map(step => step.anchor)).toEqual(initial.steps.map(step => step.anchor))
    expect(result.steps.map(step => step.estDays)).toEqual(initial.steps.map(step => step.estDays))
    expect(initial.steps.every(step => step.placement === undefined)).toBe(true)
  })
  it("reverses an actual two-task chain without serializing an unrelated parallel task", () => {
    const initial: BuilderSnapshot = { steps: [task("a"), task("b", ["a"]), task("independent")], stepTeams: { a: "ops", b: "ops", independent: "ops" } }
    const result = moveDotTask(initial, "b", "ops", teams, "a", true)
    expect(result.steps.find(step => step.key === "a")?.dependsOn).toEqual(["b"])
    expect(result.steps.find(step => step.key === "b")?.dependsOn).toEqual([])
    expect(result.steps.find(step => step.key === "independent")?.dependsOn).toEqual([])
    expect(orderedDotSteps(result.steps).map(step => step.key)).toEqual(["b", "a", "independent"])
    expect(graphError(result.steps)).toBeNull()
  })
  it("preserves parallel siblings in a branching graph instead of converting the whole component into a chain", () => {
    const initial: BuilderSnapshot = { steps: [task("a"), task("b", ["a"]), task("c", ["a"])], stepTeams: { a: "ops", b: "ops", c: "ops" } }
    const result = moveDotTask(initial, "c", "ops", teams, "b", true)
    expect(orderedDotSteps(result.steps).map(step => step.key)).toEqual(["a", "c", "b"])
    expect(result.steps.map(step => step.dependsOn)).toEqual(initial.steps.map(step => step.dependsOn))
    expect(graphError(result.steps)).toBeNull()
  })
  it("keeps external dependencies available for the caller's cycle validation", () => {
    const initial = snapshot()
    initial.steps[1] = { ...initial.steps[1], dependsOn: ["a", "c"] }
    initial.steps[2] = { ...initial.steps[2], dependsOn: ["a"] }
    const result = moveDotTask(initial, "b", "ops", teams, "a", true)
    expect(result.steps.find(step => step.key === "b")?.dependsOn).toContain("c")
    expect(result.steps.find(step => step.key === "c")?.dependsOn).toContain("a")
    expect(graphError(result.steps)).toContain("loop")
  })
  it("ignores invalid drops and repeated existing step IDs", () => {
    const initial = snapshot()
    expect(moveDotTask(initial, "a", "missing", teams)).toBe(initial)
    expect(moveDotTask(initial, "missing", "ops", teams)).toBe(initial)
    expect(moveDotTask(initial, "a", "ops", teams)).toBe(initial)
    expect(addDotTask(initial, { teamId: "ops" }, "a")).toBe(initial)
  })
  it("adds repeatable Event day presets with separate identities and a relative zero-day target", () => {
    let result = addDotTask({ steps: [], stepTeams: {} }, { teamId: "ops", preset: "event-day" }, "event-one")
    result = addDotTask(result, { teamId: "finance", preset: "event-day" }, "event-two")
    expect(result.steps.map(step => step.title)).toEqual(["Event day", "Event day"])
    expect(result.steps.map(step => step.key)).toEqual(["event-one", "event-two"])
    expect(result.steps.every(step => step.estDays === 0 && step.phase === "prepare" && step.anchor?.kind === "target" && step.anchor.days === 0)).toBe(true)
    expect(result.stepTeams).toEqual({ "event-one": "ops", "event-two": "finance" })
    expect(result.steps.some(step => ["__start__", "__event__", "__end__"].includes(step.key))).toBe(false)
  })
  it("does not make a preset inherit a close-out phase or conditional business branch", () => {
    const initial: BuilderSnapshot = { steps: [{ ...task("close"), phase: "close", cond: "funding", timing: { startDays: -1, dueDays: -2 }, placement: { branchId: "close-finance", order: 1 } }], stepTeams: { close: "finance" } }
    const result = addDotTask(initial, { teamId: "finance", preset: "full-check" }, "review")
    const preset = result.steps.find(step => step.key === "review")!
    expect(preset).toMatchObject({ title: "Full check", phase: "prepare", estDays: 1, placement: { branchId: "main" }, anchor: { kind: "target", days: 14 }, dependsOn: ["close"] })
    expect(preset.cond).toBeUndefined()
    expect(preset.timing).toBeUndefined()
    expect(preset.key).not.toBe("finalcheck")
    expect(initial.steps[0].phase).toBe("close")
  })
})
