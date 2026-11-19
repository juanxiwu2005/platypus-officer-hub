import { describe, expect, it } from "vitest"
import type { StepTemplate, WorkflowBranch } from "../../data/types"
import { seedDemo } from "../../data/seed"
import { builderDeletionReason, createBuilderStep, deleteBuilderStep, graphError, insertBuilderStep, type BuilderSnapshot } from "./model"
import { buildTimeline } from "./timeline"

const branch: WorkflowBranch = { id: "speaker", title: "Speaker", order: 0, side: "before_event", conditions: ["speaker", "travel"] }
const task = (key: string, dependsOn: string[] = []): StepTemplate => ({ key, title: key, fn: "programs", ownerRoleId: "r-events", phase: "prepare", stepKind: "situation", cond: "speaker", placement: { branchId: "speaker", order: 0 }, estDays: 2, tier: "light", dependsOn, why: "Instructions", source: "Test", custom: true, anchor: { kind: "target", days: 7, unit: "calendar", label: "Human target" } })
const snapshot = (): BuilderSnapshot => ({ steps: [task("A"), task("B", ["A"]), task("C", ["B"])], branches: [branch], stepTeams: { A: "team-1", B: "team-1", C: "team-2" } })

describe("workflow editor graph operations", () => {
  it("inserts before a task within its scope, branch and team, retaining all previous prerequisites", () => {
    const result = insertBuilderStep(snapshot(), "B", "before", "new")
    const fresh = result.steps.find(step => step.key === "new")!
    expect(fresh).toMatchObject({ dependsOn: ["A"], stepKind: "situation", cond: "speaker", ownerRoleId: "r-events", placement: { branchId: "speaker" } })
    expect(result.stepTeams.new).toBe("team-1")
    expect(result.steps.find(step => step.key === "B")?.dependsOn).toEqual(["new"])
    expect(result.branches).toEqual([branch])
  })

  it("inserts after within the clicked branch without reassigning another branch's dependency", () => {
    const current = snapshot()
    current.steps.push({ ...task("other", ["B"]), placement: { branchId: "other-branch", order: 0 } })
    const result = insertBuilderStep(current, "B", "after", "new")
    expect(result.steps.find(step => step.key === "new")?.dependsOn).toEqual(["B"])
    expect(result.steps.find(step => step.key === "C")?.dependsOn).toEqual(["new"])
    expect(result.steps.find(step => step.key === "other")?.dependsOn).toEqual(["B"])
  })

  it("adds a parallel task with the same prerequisites, without silently rewiring later tasks", () => {
    const result = insertBuilderStep(snapshot(), "B", "parallel", "new")
    expect(result.steps.find(step => step.key === "new")?.dependsOn).toEqual(["A"])
    expect(result.steps.find(step => step.key === "C")?.dependsOn).toEqual(["B"])
  })

  it("rejects cycles and dangling references", () => {
    expect(graphError([task("A", ["B"]), task("B", ["A"])])).toContain("loop")
    expect(graphError([task("A", ["missing"])])).toContain("no longer exists")
  })

  it("keeps downstream work connected when a removable step is deleted", () => {
    const result = deleteBuilderStep(snapshot(), "B")
    expect(result.steps.find(step => step.key === "C")?.dependsOn).toEqual(["A"])
    expect(result.stepTeams.B).toBeUndefined()
    expect(builderDeletionReason(task("finalcheck"), "standard")).toContain("must stay")
    expect(builderDeletionReason(task("finalcheck"), "custom")).toBeNull()
  })

  it("generates opaque 36-character step identifiers independently of titles", () => {
    const a = createBuilderStep("Same name"), b = createBuilderStep("Same name")
    expect(a.key).toHaveLength(36)
    expect(a.key).not.toBe(b.key)
    expect(a.key).not.toContain("Same")
  })
})

describe("workflow editor team timeline", () => {
  it("renders exactly one row per team, including empty teams and both sides of the target day", () => {
    const current = snapshot()
    current.steps[2] = { ...current.steps[2], phase: "close", anchor: { kind: "target", days: -2, unit: "calendar", label: "After" } }
    current.stepTeams.C = "team-1"
    const result = buildTimeline(seedDemo(undefined, "v2"), current, [{ id: "team-1", name: "Operations" }, { id: "team-2", name: "Empty team" }])
    expect(result.rows).toHaveLength(2)
    expect(result.rows[0].boxes.map(box => box.step.key).sort()).toEqual(["A", "B", "C"])
    expect(result.rows[1].boxes).toHaveLength(0)
    expect(result.boxes.every(box => Number.isFinite(box.x) && Number.isFinite(box.y))).toBe(true)
  })

  it("reports no extra row for unmapped work and keeps the original dependency records intact", () => {
    const current = snapshot()
    delete current.stepTeams.B
    const before = structuredClone(current)
    const result = buildTimeline(seedDemo(undefined, "v2"), current, [{ id: "team-1", name: "Operations" }])
    expect(result.rows).toHaveLength(1)
    expect(result.boxes.map(box => box.step.key)).toEqual(["A"])
    expect(current).toEqual(before)
  })
})
