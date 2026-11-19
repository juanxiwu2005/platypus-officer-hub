import { describe, expect, it } from "vitest"
import type { StepTemplate, WorkflowMilestoneGraph } from "../../data/types"
import { createWorkflowMilestoneGraph, workflowMilestoneGraphError, workflowMilestoneSteps, WORKFLOW_DAY_ONE, WORKFLOW_DAY_TWO, WORKFLOW_DONE, WORKFLOW_START } from "../../engine/workflowMilestones"
import { graphError, insertTeamBuilderStep, type BuilderSnapshot } from "./model"
import { addMilestoneBranch, addMilestoneCheck, addMilestoneTask, assignMilestoneBranchTeam, ensureMilestoneSnapshot, moveMilestoneTask, setMilestoneDayCount, syncMilestoneSnapshot } from "./milestoneCommands"

const step = (key: string, dependsOn: string[] = []): StepTemplate => ({ key, title: key, fn: "programs", ownerRoleId: "events-role", phase: "prepare", estDays: 2, tier: "medium", dependsOn, anchor: { kind: "target", days: 7, unit: "calendar", label: "Authored target" }, why: "Saved instructions", source: "Fictional fixture", custom: true })
const graph = (steps: StepTemplate[], map: Record<string, string>): WorkflowMilestoneGraph => createWorkflowMilestoneGraph(steps, map)
const fixture = (): BuilderSnapshot => {
  const steps = [step("A"), step("B", ["A"]), step("outside")]
  const stepTeams = { A: "ops", B: "ops", outside: "finance" }
  return { steps, stepTeams, branches: [{ id: "business", title: "Travel", side: "before_event", condition: "travel", order: 0 }], milestoneGraph: graph(steps, stepTeams) }
}
const branchFor = (snapshot: BuilderSnapshot, key: string) => snapshot.milestoneGraph!.teamBranches.find(branch => branch.stepIds.includes(key))!
const errors = (snapshot: BuilderSnapshot) => workflowMilestoneGraphError(snapshot.milestoneGraph, snapshot.steps, new Set(["ops", "finance"]))

describe("milestone authoring commands", () => {
  it("only initializes missing metadata, preserving original objects and invalid saved metadata", () => {
    const value = fixture(), { milestoneGraph: _graph, ...legacy } = value
    const initialized = ensureMilestoneSnapshot(legacy)
    expect(initialized.steps).toBe(legacy.steps)
    expect(initialized.branches).toBe(legacy.branches)
    expect(errors(initialized)).toBeNull()
    expect(ensureMilestoneSnapshot(value)).toBe(value)
    const invalid = { ...value, milestoneGraph: { ...value.milestoneGraph!, spine: [WORKFLOW_START, "unknown", WORKFLOW_DAY_ONE, WORKFLOW_DONE] } }
    expect(ensureMilestoneSnapshot(invalid)).toBe(invalid)
  })

  it("switches one/two days without losing real tasks or moving school dates away from Day 1", () => {
    const value = fixture()
    value.steps.push({ ...step("close"), phase: "close" }, { ...step("school"), phase: "close", ruleIds: ["R01"], anchor: { kind: "rule", ruleId: "R01", days: 14, unit: "calendar" } })
    value.stepTeams = { ...value.stepTeams, close: "ops", school: "finance" }
    value.milestoneGraph = graph(value.steps, value.stepTeams)
    const schoolAnchor = value.milestoneGraph.taskAnchors.school
    const two = setMilestoneDayCount(value, 2)
    expect(two.steps).toBe(value.steps)
    expect(two.milestoneGraph!.eventDays.map(day => day.id)).toEqual([WORKFLOW_DAY_ONE, WORKFLOW_DAY_TWO])
    expect(two.milestoneGraph!.taskAnchors.close.eventDayId).toBe(WORKFLOW_DAY_TWO)
    expect(two.milestoneGraph!.taskAnchors.school).toEqual(schoolAnchor)
    expect(two.milestoneGraph!.teamBranches.filter(branch => branch.stepIds.includes("close"))[0].fromId).toBe(WORKFLOW_DAY_TWO)
    const one = setMilestoneDayCount(two, 1)
    expect(one.steps).toBe(value.steps)
    expect(one.milestoneGraph!.eventDays).toHaveLength(1)
    expect(one.milestoneGraph!.taskAnchors.close.eventDayId).toBe(WORKFLOW_DAY_ONE)
    expect(setMilestoneDayCount(one, 3 as 1)).toBe(one)
    expect(errors(one)).toBeNull()
  })

  it("converts a between-days branch into Day 1 to Done when returning to a one-day workflow", () => {
    let value = setMilestoneDayCount(fixture(), 2)
    value = addMilestoneBranch(value, { teamId: "ops", fromId: WORKFLOW_DAY_ONE, toId: WORKFLOW_DAY_TWO }, "between")
    value = addMilestoneTask(value, "between", "middle")
    expect(value.steps.find(step => step.key === "middle")?.phase).toBe("prepare")
    expect(value.milestoneGraph!.taskAnchors.middle).toEqual({ eventDayId: WORKFLOW_DAY_TWO, offsetDays: -1, unit: "calendar" })
    value = setMilestoneDayCount(value, 1)
    expect(branchFor(value, "middle")).toMatchObject({ fromId: WORKFLOW_DAY_ONE, toId: WORKFLOW_DONE })
    expect(value.steps.some(step => step.key === "middle")).toBe(true)
    expect(value.milestoneGraph!.taskAnchors.middle.eventDayId).toBe(WORKFLOW_DAY_ONE)
    expect(errors(value)).toBeNull()
  })

  it("inserts Day 2 immediately after Day 1 before existing headcount, preserving editable names", () => {
    const value = fixture()
    value.steps.push({ ...step("headcount"), phase: "close" })
    value.stepTeams.headcount = "ops"
    value.milestoneGraph = graph(value.steps, value.stepTeams)
    value.milestoneGraph.eventDays[0].title = "Arrival day"
    const two = setMilestoneDayCount(value, 2)
    expect(two.milestoneGraph!.spine).toEqual([WORKFLOW_START, WORKFLOW_DAY_ONE, WORKFLOW_DAY_TWO, "headcount", WORKFLOW_DONE])
    expect(two.milestoneGraph!.eventDays[0].title).toBe("Arrival day")
  })

  it("adds repeatable empty branches referencing existing team IDs without creating tasks or changing business conditions", () => {
    const value = fixture(), count = value.steps.length
    const result = addMilestoneBranch(value, { teamId: "ops", fromId: WORKFLOW_DAY_ONE, toId: WORKFLOW_DONE }, "second-ops")
    expect(result.steps).toBe(value.steps)
    expect(result.steps).toHaveLength(count)
    expect(result.branches).toBe(value.branches)
    expect(result.milestoneGraph!.teamBranches.at(-1)).toEqual({ id: "second-ops", teamId: "ops", fromId: WORKFLOW_DAY_ONE, toId: WORKFLOW_DONE, stepIds: [] })
    expect(addMilestoneBranch(result, { teamId: "ops", fromId: WORKFLOW_START, toId: WORKFLOW_DAY_ONE }, "second-ops")).toBe(result)
    expect(errors(result)).toBeNull()
  })

  it("adds a task only to its chosen branch even when another branch has the same team", () => {
    let value = addMilestoneBranch(fixture(), { teamId: "ops", fromId: WORKFLOW_DAY_ONE, toId: WORKFLOW_DONE }, "post")
    const original = structuredClone(value)
    value = addMilestoneTask(value, "post", "new")
    expect(branchFor(value, "new").id).toBe("post")
    expect(value.steps.find(step => step.key === "new")).toMatchObject({ title: "New task", phase: "close", dependsOn: [] })
    expect(value.milestoneGraph!.taskAnchors.new).toEqual({ eventDayId: WORKFLOW_DAY_ONE, offsetDays: 1, unit: "calendar" })
    expect(value.steps.slice(0, 3)).toEqual(original.steps)
    expect(errors(value)).toBeNull()
  })

  it("inherits the branch's last task context and date offset without affecting another branch", () => {
    const value = fixture(), branch = branchFor(value, "B")
    value.steps[1] = { ...value.steps[1], cond: "travel", placement: { branchId: "business", order: 4 }, stepKind: "situation" }
    value.milestoneGraph!.taskAnchors.B = { eventDayId: WORKFLOW_DAY_ONE, offsetDays: -9, unit: "business" }
    const result = addMilestoneTask(value, branch.id, "new")
    expect(result.steps.find(step => step.key === "new")).toMatchObject({ ownerRoleId: "events-role", cond: "travel", placement: { branchId: "business" }, stepKind: "situation", dependsOn: [] })
    expect(result.milestoneGraph!.taskAnchors.new).toEqual(value.milestoneGraph!.taskAnchors.B)
    expect(branchFor(result, "outside").stepIds).toEqual(["outside"])
  })

  it("creates a default branch from an explicit task team and refuses to guess one for an empty organization", () => {
    const bare: BuilderSnapshot = { steps: [], stepTeams: {} }
    expect(addMilestoneTask(bare).steps).toEqual([])
    const base = { ...bare, steps: [step("shared")], stepTeams: { shared: "ops" }, milestoneGraph: { ...graph([step("shared")], { shared: "ops" }), spine: [WORKFLOW_START, "shared", WORKFLOW_DAY_ONE, WORKFLOW_DONE], teamBranches: [] } }
    const result = addMilestoneTask(base, undefined, "new")
    expect(branchFor(result, "new").teamId).toBe("ops")
    expect(errors(result)).toBeNull()
  })

  it("adds independent Full checks to the shared spine and reroutes the first merge before the event day", () => {
    const value = fixture()
    for (const anchor of Object.values(value.milestoneGraph!.taskAnchors)) anchor.offsetDays = -21
    const result = addMilestoneCheck(value, "check-one")
    expect(result.milestoneGraph!.spine).toEqual([WORKFLOW_START, "check-one", WORKFLOW_DAY_ONE, WORKFLOW_DONE])
    expect(result.milestoneGraph!.teamBranches.every(branch => branch.toId === "check-one")).toBe(true)
    expect(result.stepTeams["check-one"]).toBe("ops")
    expect(result.milestoneGraph!.taskAnchors["check-one"]).toEqual({ eventDayId: WORKFLOW_DAY_ONE, offsetDays: -14, unit: "calendar" })
    const again = addMilestoneCheck(result, "check-two")
    expect(again.milestoneGraph!.spine).toEqual([WORKFLOW_START, "check-one", "check-two", WORKFLOW_DAY_ONE, WORKFLOW_DONE])
    expect(again.steps.filter(step => step.title === "Full check")).toHaveLength(2)
    expect(again.milestoneGraph!.teamBranches.every(branch => branch.toId === "check-one")).toBe(true)
    expect(graphError(workflowMilestoneSteps(again.steps, again.milestoneGraph!))).toBeNull()
    expect(errors(again)).toBeNull()
  })

  it("moves across an empty branch while preserving school fields and external explicit prerequisites", () => {
    let value = fixture()
    value.steps[1] = { ...value.steps[1], ruleIds: ["R01"], cond: "travel", dependsOn: ["A", "outside"], anchor: { kind: "rule", ruleId: "R01", days: 14, unit: "calendar" } }
    value = addMilestoneBranch(value, { teamId: "finance", fromId: WORKFLOW_DAY_ONE, toId: WORKFLOW_DONE }, "empty")
    const before = structuredClone(value.steps[1])
    const result = moveMilestoneTask(value, "B", "empty")
    expect(branchFor(result, "B").id).toBe("empty")
    expect(result.stepTeams.B).toBe("finance")
    expect(result.steps[1]).toEqual({ ...before, dependsOn: ["outside"] })
    expect(result.milestoneGraph!.taskAnchors.B.eventDayId).toBe(WORKFLOW_DAY_ONE)
    expect(result.steps[0]).toBe(value.steps[0])
    expect(result.branches).toBe(value.branches)
    expect(errors(result)).toBeNull()
  })

  it("leaves later pre-event work and empty branches at Day 1 when adding an earlier Full check", () => {
    let value = addMilestoneBranch(ensureMilestoneSnapshot({ steps: [], stepTeams: {} }), { teamId: "ops", fromId: WORKFLOW_START, toId: WORKFLOW_DAY_ONE }, "work")
    value = addMilestoneTask(value, "work", "task")
    value = addMilestoneBranch(value, { teamId: "finance", fromId: WORKFLOW_START, toId: WORKFLOW_DAY_ONE }, "empty")
    expect(value.milestoneGraph!.taskAnchors.task.offsetDays).toBe(-1)
    const result = addMilestoneCheck(value, "check")
    expect(branchFor(result, "task").toId).toBe(WORKFLOW_DAY_ONE)
    expect(result.milestoneGraph!.teamBranches.find(branch => branch.id === "empty")?.toId).toBe(WORKFLOW_DAY_ONE)
    expect(result.milestoneGraph!.spine).toContain("check")
    expect(result.milestoneGraph!.taskAnchors.task.offsetDays).toBe(-1)
    expect(errors(result)).toBeNull()
    expect(graphError(workflowMilestoneSteps(result.steps, result.milestoneGraph!))).toBeNull()
  })

  it("reconnects only old immediate chain neighbors when reordering, with no new cycle", () => {
    const value = fixture()
    value.steps = [step("A"), step("B", ["A"]), step("C", ["B"]), step("outside")]
    value.stepTeams.C = "ops"; value.milestoneGraph = graph(value.steps, value.stepTeams)
    const result = moveMilestoneTask(value, "B", branchFor(value, "B").id, "C", false)
    expect(branchFor(result, "B").stepIds).toEqual(["A", "C", "B"])
    expect(result.steps.find(step => step.key === "C")?.dependsOn).toEqual(["A"])
    expect(result.steps.find(step => step.key === "B")?.dependsOn).toEqual([])
    const compiled = workflowMilestoneSteps(result.steps, result.milestoneGraph!)
    expect(compiled.find(step => step.key === "B")?.dependsOn).toEqual(["C"])
    expect(graphError(compiled)).toBeNull()
    expect(moveMilestoneTask(result, "B", branchFor(result, "B").id, "C", false)).toBe(result)
  })

  it("retargets the day on cross-interval moves while preserving an explicitly saved offset and unit", () => {
    let value = setMilestoneDayCount(fixture(), 2)
    value.milestoneGraph!.taskAnchors.B = { eventDayId: WORKFLOW_DAY_ONE, offsetDays: -3, unit: "business" }
    value = addMilestoneBranch(value, { teamId: "ops", fromId: WORKFLOW_DAY_ONE, toId: WORKFLOW_DAY_TWO }, "between")
    const result = moveMilestoneTask(value, "B", "between")
    expect(result.milestoneGraph!.taskAnchors.B).toEqual({ eventDayId: WORKFLOW_DAY_TWO, offsetDays: -3, unit: "business" })
    expect(result.steps[1].anchor).toEqual(value.steps[1].anchor)
    expect(errors(result)).toBeNull()
  })

  it("places a task on the main spine before Day 1 and refuses to move a referenced shared station away", () => {
    const value = fixture(), result = moveMilestoneTask(value, "B", "__main__")
    expect(result.milestoneGraph!.spine).toEqual([WORKFLOW_START, "B", WORKFLOW_DAY_ONE, WORKFLOW_DONE])
    expect(result.stepTeams.B).toBe(value.stepTeams.B)
    const early = { ...value, milestoneGraph: { ...value.milestoneGraph!, taskAnchors: Object.fromEntries(Object.keys(value.milestoneGraph!.taskAnchors).map(key => [key, { eventDayId: WORKFLOW_DAY_ONE, offsetDays: -21 }])) } }
    const check = addMilestoneCheck(early, "check")
    expect(moveMilestoneTask(check, "check", branchFor(check, "A").id)).toBe(check)
    expect(moveMilestoneTask(check, WORKFLOW_DAY_ONE, branchFor(check, "A").id)).toBe(check)
  })

  it("moves a post-Day-2 task to the main line against Day 1 while retaining its authored offset and role", () => {
    let value = setMilestoneDayCount(fixture(), 2)
    value = addMilestoneBranch(value, { teamId: "ops", fromId: WORKFLOW_DAY_TWO, toId: WORKFLOW_DONE }, "post")
    value = addMilestoneTask(value, "post", "closing")
    value.milestoneGraph!.taskAnchors.closing = { eventDayId: WORKFLOW_DAY_TWO, offsetDays: 3, unit: "business" }
    const result = moveMilestoneTask(value, "closing", "__main__")
    expect(result.milestoneGraph!.spine.indexOf("closing")).toBeLessThan(result.milestoneGraph!.spine.indexOf(WORKFLOW_DAY_ONE))
    expect(result.milestoneGraph!.taskAnchors.closing).toEqual({ eventDayId: WORKFLOW_DAY_ONE, offsetDays: 3, unit: "business" })
    expect(result.steps.find(step => step.key === "closing")?.ownerRoleId).toEqual(value.steps.find(step => step.key === "closing")?.ownerRoleId)
  })

  it("assigns a branch's team without touching any real task field, dates or other branches", () => {
    const value = fixture(), branch = branchFor(value, "A")
    const result = assignMilestoneBranchTeam(value, branch.id, "finance")
    expect(result.steps).toBe(value.steps)
    expect(result.milestoneGraph!.taskAnchors).toBe(value.milestoneGraph!.taskAnchors)
    expect(result.stepTeams).toEqual({ A: "finance", B: "finance", outside: "finance" })
    expect(branchFor(result, "outside")).toBe(branchFor(value, "outside"))
  })

  it("syncs Quick entry additions into the actual neighbor's interval even for the same pre/post team", () => {
    let value = addMilestoneBranch(fixture(), { teamId: "ops", fromId: WORKFLOW_DAY_ONE, toId: WORKFLOW_DONE }, "post")
    value = addMilestoneTask(value, "post", "closing")
    const extra = { ...step("added"), phase: "close" as const, dependsOn: ["closing"] }
    const next = { ...value, steps: [...value.steps, extra], stepTeams: { ...value.stepTeams, added: "ops" } }
    const synced = syncMilestoneSnapshot(value, next)
    expect(branchFor(synced, "added").id).toBe("post")
    expect(branchFor(synced, "A").stepIds).toEqual(["A", "B"])
    expect(errors(synced)).toBeNull()
  })

  it.each(["before", "after"] as const)("syncs an old %s insertion beside a shared station into the correct main-line interval", position => {
    const value = addMilestoneCheck(fixture(), "check")
    const inserted = insertTeamBuilderStep(value, "check", position, "added")
    const result = syncMilestoneSnapshot(value, inserted)
    expect(branchFor(result, "added")).toMatchObject(position === "after"
      ? { fromId: "check", toId: WORKFLOW_DAY_ONE }
      : { fromId: WORKFLOW_START, toId: "check" })
    expect(result.milestoneGraph!.taskAnchors.added.offsetDays).toBe(-14)
    expect(graphError(workflowMilestoneSteps(result.steps, result.milestoneGraph!))).toBeNull()
    expect(errors(result)).toBeNull()
  })

  it("initializes a Quick entry task's explicitly authored target instead of replacing it with a generic branch offset", () => {
    const value = ensureMilestoneSnapshot({ steps: [], stepTeams: {} })
    const next = { ...value, steps: [step("added")], stepTeams: { added: "ops" } }
    const result = syncMilestoneSnapshot(value, next)
    expect(result.milestoneGraph!.taskAnchors.added).toEqual({ eventDayId: WORKFLOW_DAY_ONE, offsetDays: -7, unit: "calendar" })
  })

  it("removes real deleted shared stations and reconnects both sides without deleting surviving branch tasks", () => {
    const value = addMilestoneCheck(fixture(), "check")
    const next = { ...value, steps: value.steps.filter(step => step.key !== "check"), stepTeams: { A: "ops", B: "ops", outside: "finance" } }
    const result = syncMilestoneSnapshot(value, next)
    expect(result.milestoneGraph!.spine).toEqual([WORKFLOW_START, WORKFLOW_DAY_ONE, WORKFLOW_DONE])
    expect(result.milestoneGraph!.teamBranches.every(branch => branch.toId === WORKFLOW_DAY_ONE)).toBe(true)
    expect(result.milestoneGraph!.taskAnchors.check).toBeUndefined()
    expect(result.steps.map(step => step.key)).toEqual(["A", "B", "outside"])
    expect(errors(result)).toBeNull()
  })

  it("does not reset unrelated graph errors or edit original task fields during synchronization", () => {
    const value = fixture()
    value.milestoneGraph!.teamBranches[0].fromId = "missing-station"
    const next = { ...value, steps: value.steps.map(step => step.key === "A" ? { ...step, title: "New name" } : step) }
    expect(syncMilestoneSnapshot(value, next)).toBe(next)
    const added = { ...next, steps: [...next.steps, step("new")], stepTeams: { ...next.stepTeams, new: "finance" } }
    const result = syncMilestoneSnapshot(next, added)
    expect(result.milestoneGraph!.teamBranches[0].fromId).toBe("missing-station")
    expect(result.steps).toBe(added.steps)
    expect(errors(result)).not.toBeNull()
  })
})
