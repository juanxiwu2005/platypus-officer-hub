import { describe, expect, it } from "vitest"
import type { DemoState, Event, StepTemplate, WorkflowMilestoneGraph, WorkflowTemplateDraft } from "../data/types"
import { seedDemo } from "../data/seed"
import { duplicateWorkflowTemplate, findWorkflowTemplateVersion, getWorkflowTemplate, instantiateWorkflowTemplate, newWorkflowTemplate, publishWorkflowTemplate, saveWorkflowTemplateDraft, workflowTemplateDraftError } from "../data/workflowTemplates"
import { EVENT_STEPS } from "./playbooks"
import { ensureWorkflowPresetTeams } from "../data/workflowTeamDefaults"
import { computeSchedule } from "./schedule"
import { shiftWork } from "./calendar"
import { createWorkflowMilestoneGraph, workflowMilestoneDates, workflowMilestoneGraphError, workflowMilestoneSteps, workflowMilestoneTaskDate } from "./workflowMilestones"

const step = (key: string, patch: Partial<StepTemplate> = {}): StepTemplate => ({ key, title: key, fn: "programs", phase: "prepare", estDays: 1, tier: "light", dependsOn: [], why: "Fictional task", source: "Milestone test", custom: true, anchor: { kind: "target", days: 7, unit: "calendar", label: "Saved target" }, ...patch })
const steps = () => [step("before"), step("shared"), step("between"), step("after", { phase: "close" })]
const graph = (): WorkflowMilestoneGraph => ({ version: 1, start: { title: "Start", details: "Start together." }, done: { title: "Done", details: "Close the workflow." }, eventDays: [{ id: "__event__", title: "Day 1", offsetDays: 0, details: "First session" }, { id: "__event2__", title: "Day 2", offsetDays: 1, details: "Second session" }], spine: ["__start__", "shared", "__event__", "__event2__", "__end__"], teamBranches: [{ id: "pre", teamId: "ops", fromId: "__start__", toId: "shared", stepIds: ["before"] }, { id: "during", teamId: "ops", fromId: "__event__", toId: "__event2__", stepIds: ["between"] }, { id: "post", teamId: "ops", fromId: "__event2__", toId: "__end__", stepIds: ["after"] }], taskAnchors: { before: { eventDayId: "__event__", offsetDays: -7 }, shared: { eventDayId: "__event__", offsetDays: -1 }, between: { eventDayId: "__event__", offsetDays: 0 }, after: { eventDayId: "__event2__", offsetDays: 2 } } })
const event = (): Event => ({ id: "two-days", name: "Fictional two-day visit", date: "2027-03-25", type: "social", headcount: 20, venue: "campus", food: "none", funding: "none", speaker: false, checks: {}, goalId: null, playbookId: "custom" })
const world = () => {
  const base = seedDemo(undefined, "v2")
  return { ...base, org: { ...base.org, workflowTeams: [{ id: "ops", name: "Operations" }] } }
}
function published(sourceSteps = steps(), sourceGraph = graph()): DemoState {
  let state = newWorkflowTemplate(world(), "two-day-template", "Two-day visit")
  const ownerRoleId = state.roles.find(role => role.fn === "programs")!.id
  const draft: WorkflowTemplateDraft = { name: "Two-day visit", kind: "custom", baseVersion: 0, teamExecution: "dependencies", steps: sourceSteps.map(value => ({ ...value, ownerRoleId })), teamMap: { version: 1, workflowId: "two-day-template", stepTeams: Object.fromEntries(sourceSteps.map(value => [value.key, "ops"])) }, milestoneGraph: sourceGraph }
  state = saveWorkflowTemplateDraft(state, "two-day-template", draft)
  expect(getWorkflowTemplate(state, "two-day-template")?.draft?.steps.length).toBe(sourceSteps.length)
  return publishWorkflowTemplate(state, "two-day-template")
}

describe("versioned one/two-day workflow graph", () => {
  it("covers all 46 standard tasks once, preserves business paths and retains every original prerequisite", () => {
    const state = ensureWorkflowPresetTeams(seedDemo(undefined, "v2")), version = findWorkflowTemplateVersion(state, "standard-event")!
    const before = structuredClone(version.steps)
    const value = createWorkflowMilestoneGraph(version.steps, version.teamMap!.stepTeams)
    expect(workflowMilestoneGraphError(value, version.steps, new Set(state.org.workflowTeams!.map(team => team.id)))).toBeNull()
    expect(value.spine).toEqual(["__start__", "finalcheck", "checkin", "__event__", "headcount", "__end__"])
    const placed = [...value.spine.filter(id => version.steps.some(item => item.key === id)), ...value.teamBranches.flatMap(branch => branch.stepIds)]
    expect(placed).toHaveLength(46)
    expect(new Set(placed).size).toBe(46)
    const operationId = version.teamMap!.stepTeams.plan
    expect(value.teamBranches.filter(branch => branch.teamId === operationId && branch.fromId === "__start__").length).toBeGreaterThan(1)
    for (const item of workflowMilestoneSteps(version.steps, value)) expect(item.dependsOn).toEqual(expect.arrayContaining(before.find(original => original.key === item.key)!.dependsOn ?? []))
    expect(version.steps).toEqual(before)
    expect(EVENT_STEPS).toHaveLength(46)
    expect(workflowMilestoneGraphError(createWorkflowMilestoneGraph(version.steps, version.teamMap!.stepTeams, 2), version.steps)).toBeNull()
    const edited = saveWorkflowTemplateDraft(state, "standard-event", { ...version, teamExecution: "dependencies", baseVersion: 1, milestoneGraph: value })
    const saved = publishWorkflowTemplate(edited, "standard-event")
    expect(findWorkflowTemplateVersion(saved, "standard-event", 2)?.milestoneGraph).toEqual(value)
    const run = instantiateWorkflowTemplate(saved, { ...event(), speaker: true, checks: { speaker: true, partner: true } }, { templateId: "standard-event", templateVersion: 2 })
    expect(run.error).toBeUndefined()
    expect(run.nodes.length).toBeGreaterThan(0)
    expect(run.nodes.some(node => node.stepKey?.startsWith("__"))).toBe(false)
  })
  it("accepts only one or two ordered pinned days and a complete unique task placement", () => {
    const value = graph()
    expect(workflowMilestoneGraphError(value, steps(), new Set(["ops"]))).toBeNull()
    expect(workflowMilestoneGraphError({ ...value, eventDays: [...value.eventDays, { ...value.eventDays[1], id: "third" }] }, steps())).toBeTruthy()
    expect(workflowMilestoneGraphError({ ...value, eventDays: value.eventDays.map((day, index) => ({ ...day, offsetDays: index ? 0 : 0 })) }, steps())).toBeTruthy()
    expect(workflowMilestoneGraphError({ ...value, spine: ["__start__", "shared", "__event2__", "__event__", "__end__"] }, steps())).toBeTruthy()
    expect(workflowMilestoneGraphError({ ...value, teamBranches: value.teamBranches.slice(1) }, steps())).toContain("exactly once")
    expect(workflowMilestoneGraphError({ ...value, teamBranches: value.teamBranches.map((branch, index) => index ? branch : { ...branch, stepIds: ["before", "shared"] }) }, steps())).toContain("exactly once")
    expect(workflowMilestoneGraphError(value, steps(), new Set(["another-team"]))).toContain("existing team")
    const unfinished = { ...value, teamBranches: value.teamBranches.map(branch => ({ ...branch, teamId: "" })) }
    expect(workflowMilestoneGraphError(unfinished, steps())).toBeNull()
    expect(workflowMilestoneGraphError(unfinished, steps(), new Set(["ops"]))).toContain("existing team")
  })
  it("rejects a branch join that conflicts with an existing prerequisite rather than deleting that edge", () => {
    const original = steps().map(item => item.key === "before" ? { ...item, dependsOn: ["shared"] } : item)
    expect(workflowMilestoneGraphError(graph(), original)).toContain("loop")
    expect(workflowMilestoneSteps(original, graph()).find(item => item.key === "before")?.dependsOn).toContain("shared")
  })
  it("keeps actual calendar days fixed while respecting an individual task's working-day offset", () => {
    const value = graph()
    value.eventDays[1].offsetDays = 3
    value.taskAnchors.after = { eventDayId: "__event2__", offsetDays: 2, unit: "business" }
    expect(workflowMilestoneDates(value, "2027-03-25")).toEqual({ __event__: "2027-03-25", __event2__: "2027-03-28" })
    expect(workflowMilestoneTaskDate(value, "after", "2027-03-25")).toBe(shiftWork("2027-03-28", 2))
  })
  it("copies graph references with new task IDs while preserving reserved stations and day details", () => {
    const state = published(), original = findWorkflowTemplateVersion(state, "two-day-template")!
    const ids = ["copy-before", "copy-shared", "copy-between", "copy-after"]
    const copied = duplicateWorkflowTemplate(state, "two-day-template", "copy-template", "Copy", () => ids.shift()!)
    const draft = getWorkflowTemplate(copied, "copy-template")!.draft!
    expect(draft.milestoneGraph?.spine).toEqual(["__start__", "copy-shared", "__event__", "__event2__", "__end__"])
    expect(draft.milestoneGraph?.teamBranches[0]).toMatchObject({ toId: "copy-shared", stepIds: ["copy-before"] })
    expect(draft.milestoneGraph?.taskAnchors["copy-after"]).toEqual(original.milestoneGraph?.taskAnchors.after)
    expect(draft.milestoneGraph?.eventDays).toEqual(original.milestoneGraph?.eventDays)
  })
  it("instantiates real branch departures and joins without generating station tasks", () => {
    const state = published(), run = instantiateWorkflowTemplate(state, event(), { templateId: "two-day-template" })
    expect(run.error).toBeUndefined()
    expect(run.nodes).toHaveLength(4)
    expect(run.nodes.find(node => node.stepKey === "shared")?.dependsOn).toEqual(["two-days:before"])
    expect(run.nodes.find(node => node.stepKey === "between")?.dependsOn).toEqual(["two-days:shared"])
    expect(run.nodes.find(node => node.stepKey === "after")?.dependsOn).toEqual(["two-days:between"])
    expect(run.event.date).toBe("2027-03-25")
    expect(run.event.workflowRun?.snapshot.milestoneGraph?.eventDays).toHaveLength(2)
  })
  it("pins task targets and both event days when an incomplete predecessor is scheduled later", () => {
    const value = graph(); value.taskAnchors.before.offsetDays = 20
    const state = published(steps(), value), run = instantiateWorkflowTemplate(state, event(), { templateId: "two-day-template" })
    const running = { ...state, events: [run.event], nodes: run.nodes }
    const schedule = computeSchedule(running)
    expect(schedule.nodes["two-days:shared"].club).toBe("2027-03-24")
    expect(schedule.nodes["two-days:between"].club).toBe("2027-03-25")
    expect(schedule.nodes["two-days:after"].club).toBe("2027-03-28")
    expect(schedule.nodes["two-days:shared"].issues.some(issue => issue.code === "milestone_dependency")).toBe(true)
    expect(schedule.nodes["two-days:shared"].pushedBy).toBeNull()
    expect(workflowMilestoneDates(value, run.event.date)).toEqual({ __event__: "2027-03-25", __event2__: "2027-03-26" })
    expect(run.nodes.every(node => node.status !== "done")).toBe(true)
  })
  it("keeps ASU anchors on Day 1 and caps the target at the original school deadline with buffer", () => {
    const school = step("registry", { anchor: { kind: "rule", ruleId: "R01", days: 14, unit: "calendar" }, ruleIds: ["R01"] })
    const value = createWorkflowMilestoneGraph([school], { registry: "ops" }, 2)
    value.taskAnchors.registry.offsetDays = 0
    const state = published([school], value), run = instantiateWorkflowTemplate(state, event(), { templateId: "two-day-template" })
    const plan = computeSchedule({ ...state, events: [run.event], nodes: run.nodes }).nodes["two-days:registry"]
    expect(plan.official).toBe("2027-03-11")
    expect(plan.club <= plan.official!).toBe(true)
    expect(plan.club).toBe(shiftWork(plan.official!, -state.org.settings.clubBufferBusinessDays))
    value.taskAnchors.registry.eventDayId = "__event2__"
    expect(workflowMilestoneGraphError(value, [school])).toContain("Day 1")
  })
  it.each([-1, 2])("reports a between-days task outside its interval at offset %s without moving either date", offsetDays => {
    const value = graph(); value.taskAnchors.between.offsetDays = offsetDays
    const state = published(steps(), value), run = instantiateWorkflowTemplate(state, event(), { templateId: "two-day-template" })
    const schedule = computeSchedule({ ...state, events: [run.event], nodes: run.nodes })
    expect(schedule.nodes["two-days:between"].issues.some(issue => issue.code === "milestone_branch_window" && issue.severity === "error")).toBe(true)
    expect(schedule.nodes["two-days:between"].club).toBe(workflowMilestoneTaskDate(value, "between", run.event.date))
    expect(workflowMilestoneDates(value, run.event.date)).toEqual({ __event__: "2027-03-25", __event2__: "2027-03-26" })
  })
  it("allows a between-days target when its work and buffer fit, and flags an estimate that would start too early", () => {
    const value = graph(); value.taskAnchors.between = { eventDayId: "__event2__", offsetDays: 0 }
    const source = steps().map(item => item.key === "between" ? { ...item, estDays: 0 } : item)
    const state = published(source, value), run = instantiateWorkflowTemplate(state, event(), { templateId: "two-day-template" })
    const people = state.people.map(person => ({ ...person, personalBufferDays: 1 }))
    const original = computeSchedule({ ...state, people, events: [run.event], nodes: run.nodes })
    expect(original.nodes["two-days:between"].issues.some(issue => issue.code === "milestone_branch_window")).toBe(false)
    const increased = computeSchedule({ ...state, people, events: [run.event], nodes: run.nodes.map(node => node.stepKey === "between" ? { ...node, estDays: 3 } : node) })
    expect(increased.nodes["two-days:between"].issues.some(issue => issue.code === "milestone_branch_window")).toBe(true)
    expect(increased.nodes["two-days:between"].club).toBe(original.nodes["two-days:between"].club)
  })
  it("does not call a two-day activity past while its second day is still in the future", () => {
    const state = published(), run = instantiateWorkflowTemplate(state, event(), { templateId: "two-day-template" })
    const schedule = computeSchedule({ ...state, today: "2027-03-25", events: [run.event], nodes: run.nodes })
    expect(schedule.events[run.event.id].issues.some(issue => issue.code === "past")).toBe(false)
  })
  it("does not allow a branch team to disagree with its task map", () => {
    const state = published(), original = findWorkflowTemplateVersion(state, "two-day-template")!
    const wrong = { ...original, teamMap: { ...original.teamMap!, stepTeams: { ...original.teamMap!.stepTeams, before: "another" } } }
    expect(workflowTemplateDraftError(wrong, state.roles)).toContain("branch's team")
  })
})
