import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { RailProvider, useRail } from "../rail/RailContext"
import { MilestoneExecutionChart } from "./MilestoneExecutionChart"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { DemoState, Event, Node, StepTemplate, WorkflowMilestoneGraph } from "../../data/types"
import { seedDemo } from "../../data/seed"
import { projectMilestoneExecution } from "./milestoneExecution"

export function milestoneExecutionFixture() {
  const state = seedDemo(undefined, "v2")
  const sourceEvent = state.events[0], base = state.nodes.find(node => node.eventId === sourceEvent.id)!
  const steps: StepTemplate[] = ["prepare", "check", "between", "after"].map(key => ({ key, title: key, fn: "programs", ownerRoleId: null, phase: key === "after" ? "close" : "prepare", estDays: 1, tier: "light", dependsOn: [], why: "Fictional task", source: "Fictional unit fixture", custom: true }))
  const graph: WorkflowMilestoneGraph = {
    version: 1, start: { title: "Start", details: "Prepare together" }, done: { title: "Done", details: "Archive the result" },
    eventDays: [{ id: "__event__", title: "Opening day", offsetDays: 0, details: "First program" }, { id: "__event2__", title: "Closing day", offsetDays: 1, details: "Second program" }],
    spine: ["__start__", "check", "__event__", "__event2__", "__end__"],
    teamBranches: [{ id: "before", teamId: "events", fromId: "__start__", toId: "check", stepIds: ["prepare"] }, { id: "between-days", teamId: "events", fromId: "__event__", toId: "__event2__", stepIds: ["between"] }, { id: "after-days", teamId: "events", fromId: "__event2__", toId: "__end__", stepIds: ["after"] }],
    taskAnchors: Object.fromEntries(steps.map(step => [step.key, { eventDayId: "__event__", offsetDays: -1 }])),
  }
  const event: Event = { ...sourceEvent, date: "2027-04-16", workflowRun: { id: "actual-run", templateId: "two-days", templateVersion: 1, templateName: "Two days", snapshot: { version: 1, savedOn: state.today, name: "Two days", kind: "custom", steps, milestoneGraph: graph, teams: [{ id: "events", name: "Operations" }], teamMap: { version: 1, workflowId: "two-days", stepTeams: Object.fromEntries(steps.map(step => [step.key, "events"])) } } } }
  const nodes: Node[] = steps.map(step => ({ ...base, id: `actual:${step.key}`, eventId: event.id, stepKey: step.key, title: `Current ${step.title}`, ruleIds: [], dependsOn: [], teamId: "events", workflowSource: { runId: "actual-run", templateId: "two-days", templateVersion: 1, templateStepId: step.key } }))
  return { state: { ...state, events: [event], nodes } as DemoState, event, nodes, graph }
}

describe("milestone execution projection", () => {
  it("maps stable template keys to real tasks and keeps the two fixed event dates", () => {
    const { event, nodes } = milestoneExecutionFixture(), before = structuredClone({ event, nodes })
    const projected = projectMilestoneExecution(event, nodes)
    expect(projected.graph?.teamBranches.map(branch => branch.id)).toEqual(["before", "between-days", "after-days"])
    expect(projected.nodeByStep.get("prepare")?.id).toBe("actual:prepare")
    expect(projected.steps[0].title).toBe("Current prepare")
    expect(projected.dates).toEqual({ __event__: "2027-04-16", __event2__: "2027-04-17" })
    expect(projected.unplaced).toEqual([])
    expect({ event, nodes }).toEqual(before)
  })
  it("removes filtered conditional tasks and reconnects a missing shared junction without inventing task records", () => {
    const { event, nodes } = milestoneExecutionFixture()
    const actual = nodes.filter(node => node.stepKey !== "check" && node.stepKey !== "between")
    const projected = projectMilestoneExecution(event, actual)
    expect(projected.graph?.spine).toEqual(["__start__", "__event__", "__event2__", "__end__"])
    expect(projected.graph?.teamBranches[0]).toMatchObject({ toId: "__event__", stepIds: ["prepare"] })
    expect(projected.graph?.teamBranches[1].stepIds).toEqual([])
    expect(projected.steps.map(step => step.key)).toEqual(["prepare", "after"])
    expect(projected.nodeByStep.size).toBe(2)
  })
  it("does not match duplicate titles and retains tasks added outside the template", () => {
    const { event, nodes } = milestoneExecutionFixture()
    nodes[1].title = nodes[0].title
    const extra = { ...nodes[0], id: "new-task", stepKey: "manual", workflowSource: undefined }
    const projected = projectMilestoneExecution(event, [...nodes, extra])
    expect(projected.nodeByStep.get("check")?.id).toBe("actual:check")
    expect(projected.unplaced).toEqual([extra])
    expect(projected.nodeByStep.size + projected.unplaced.length).toBe(5)
  })
  it("keeps malformed saved graphs read-only with all actual tasks accessible", () => {
    const { event, nodes } = milestoneExecutionFixture()
    event.workflowRun!.snapshot.milestoneGraph!.spine = ["__start__", "missing", "__end__"]
    const projected = projectMilestoneExecution(event, nodes)
    expect(projected.graph).toBeNull()
    expect(projected.unplaced).toEqual(nodes)
    expect(projected.issues.join()).toContain("review")
  })
})


afterEach(cleanup)
function StationDetails() { return <aside>{useRail().workflowDetail}</aside> }
describe("milestone activity chart", () => {
  it("opens real task IDs and keeps event-day details separate from task actions", () => {
    const { state, event } = milestoneExecutionFixture(), onSelect = vi.fn(), before = structuredClone(state)
    render(<RailProvider><MilestoneExecutionChart state={state} eventId={event.id} sched={{ nodes: {}, events: {} }} forecast={{ nodes: {}, events: {} }} selectedId={null} onSelect={onSelect} /><StationDetails /></RailProvider>)
    expect(within(screen.getByTestId("flow-chart")).getAllByTestId(/^flow-node-/)).toHaveLength(4)
    fireEvent.click(screen.getByTestId("flow-node-prepare"))
    expect(onSelect).toHaveBeenCalledWith("actual:prepare")
    fireEvent.click(screen.getByTestId("flow-event-day-2"))
    const details = screen.getByTestId("execution-milestone-details")
    expect(within(details).getByRole("heading", { name: "Closing day" })).toBeTruthy()
    expect(within(details).getByText("Apr 17")).toBeTruthy()
    expect(details.textContent).toContain("not a task")
    expect(within(details).queryByRole("button", { name: /mark done/i })).toBeNull()
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(state).toEqual(before)
  })
})
