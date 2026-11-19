import { afterEach, describe, expect, it } from "vitest"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { useState } from "react"
import type { StepTemplate } from "../../data/types"
import { seedDemo } from "../../data/seed"
import { RailProvider, useRail } from "../rail/RailContext"
import { WorkflowBuilder } from "./WorkflowBuilder"
import type { BuilderSnapshot } from "./model"

const teams = [{ id: "events", name: "Events team" }, { id: "marketing", name: "Marketing team" }]
const task = (key: string, dependsOn: string[] = []): StepTemplate => ({ key, title: key, fn: "programs", ownerRoleId: "r-events", phase: "prepare", placement: { branchId: "speaker", order: 0 }, stepKind: "situation", cond: "speaker", estDays: 1, tier: "light", dependsOn, why: "Do the work", source: "Manual", custom: true, anchor: { kind: "target", days: 7, unit: "calendar", label: "Human target" } })
let latest: BuilderSnapshot
function Details() { return <aside>{useRail().workflowDetail}</aside> }
function App({ initial }: { initial: BuilderSnapshot }) {
  const [snapshot, setSnapshot] = useState(initial)
  latest = snapshot
  return <RailProvider><WorkflowBuilder state={seedDemo(undefined, "v2")} steps={snapshot.steps} branches={snapshot.branches} stepTeams={snapshot.stepTeams} graph={snapshot.milestoneGraph} teams={teams} policy="custom" onChange={(steps, branches, stepTeams, milestoneGraph) => setSnapshot({ steps, branches, stepTeams, milestoneGraph })} /><Details /></RailProvider>
}
const show = (steps = [task("A"), task("B", ["A"])]) => render(<App initial={{ steps, branches: [{ id: "speaker", title: "Speaker", side: "before_event", order: 1, conditions: ["speaker"] }], stepTeams: Object.fromEntries(steps.map(step => [step.key, "events"])) }} />)
afterEach(cleanup)

describe("manual workflow builder", () => {
  it("quickly records multiple sequential tasks, then displays the same records and links in the timeline", () => {
    show([])
    fireEvent.click(screen.getByRole("button", { name: "Quick entry" }))
    fireEvent.change(screen.getByLabelText("Task names"), { target: { value: "Agree visit\nConfirm transport\nShare briefing" } })
    fireEvent.click(screen.getByRole("button", { name: "Add tasks" }))
    expect(latest.steps).toHaveLength(3)
    expect(latest.steps[1].dependsOn).toEqual([latest.steps[0].key])
    expect(latest.steps[2].dependsOn).toEqual([latest.steps[1].key])
    const keys = latest.steps.map(step => step.key)
    fireEvent.click(screen.getByRole("button", { name: "Flow" }))
    expect(screen.getAllByTestId("workflow-branch-track").length).toBeGreaterThan(0)
    expect(screen.getByRole("button", { name: "Edit Confirm transport" })).toBeTruthy()
    expect(latest.steps.map(step => step.key)).toEqual(keys)
  })

  it("renames a task, changes effort and target, and keeps its identity and prerequisites", () => {
    show()
    fireEvent.click(screen.getByRole("button", { name: "Edit B" }))
    fireEvent.change(screen.getByLabelText("Task name"), { target: { value: "Confirm transport" } })
    fireEvent.change(screen.getByLabelText("Days of work"), { target: { value: "2" } })
    fireEvent.change(screen.getByLabelText("Finish by (T±)"), { target: { value: "-14" } })
    fireEvent.change(screen.getByLabelText("Details"), { target: { value: "Confirm seats and pickup point." } })
    expect(latest.steps.find(step => step.key === "B")).toMatchObject({ title: "Confirm transport", estDays: 2, startPolicy: "effort", dependsOn: ["A"], why: "Confirm seats and pickup point." })
    expect(latest.milestoneGraph?.taskAnchors.B.offsetDays).toBe(-14)
  })

  it("assigns a branch to an existing team without changing task definitions", () => {
    show()
    fireEvent.click(screen.getAllByRole("button", { name: /^Edit branch / })[0])
    const before = structuredClone(latest.steps)
    fireEvent.change(screen.getByLabelText("Team"), { target: { value: "marketing" } })
    expect(latest.stepTeams.B).toBe("marketing")
    expect(latest.steps).toEqual(before)
    expect(latest.milestoneGraph?.teamBranches[0].teamId).toBe("marketing")
  })

  it("inserts in the selected branch with the selected situation category and can undo the entire insertion", () => {
    show()
    fireEvent.click(screen.getByRole("button", { name: "Edit B" }))
    fireEvent.click(screen.getByRole("button", { name: "Add before" }))
    const fresh = latest.steps.find(step => !["A", "B"].includes(step.key))!
    expect(fresh).toMatchObject({ stepKind: "situation", cond: "speaker", placement: { branchId: "speaker" }, dependsOn: ["A"], ownerRoleId: "r-events" })
    expect(latest.stepTeams[fresh.key]).toBe("events")
    expect(latest.steps.find(step => step.key === "B")?.dependsOn).toEqual([fresh.key])
    fireEvent.click(screen.getByRole("button", { name: "Undo edit" }))
    expect(latest.steps).toHaveLength(2)
    expect(latest.steps.find(step => step.key === "B")?.dependsOn).toEqual(["A"])
    expect(latest.stepTeams[fresh.key]).toBeUndefined()
  })

  it("refuses a cycle through Connect and leaves double-clicking a connection inert", () => {
    show()
    const original = structuredClone(latest)
    fireEvent.doubleClick(screen.getByTestId("workflow-main-track"))
    expect(latest).toEqual(original)
    fireEvent.click(screen.getByRole("button", { name: "Edit B" }))
    fireEvent.click(screen.getByRole("button", { name: "Connect" }))
    fireEvent.click(screen.getByRole("button", { name: "Edit A" }))
    expect(screen.getByRole("alert").textContent).toContain("loop")
    expect(latest).toEqual(original)
  })

  it("inserts before a merge in its own team and category without a branch picker", () => {
    show([task("Speaker task"), { ...task("Marketing task"), placement: { branchId: "marketing", order: 1 }, stepKind: "core", cond: undefined }, { ...task("Merge", ["Speaker task", "Marketing task"]), placement: { branchId: "main", order: 2 }, stepKind: "core", cond: undefined }])
    fireEvent.click(screen.getByRole("button", { name: "Edit Merge" }))
    expect(screen.queryByLabelText("Insertion branch")).toBeNull()
    expect(screen.queryByRole("button", { name: "Add parallel" })).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Add before" }))
    const fresh = latest.steps.find(step => !["Speaker task", "Marketing task", "Merge"].includes(step.key))!
    expect(latest.steps).toHaveLength(4)
    expect(fresh).toMatchObject({ placement: { branchId: "main" }, dependsOn: ["Speaker task", "Marketing task"], stepKind: "core" })
    expect(fresh.cond).toBeUndefined()
    expect(latest.stepTeams[fresh.key]).toBe("events")
    expect(latest.steps.find(step => step.key === "Merge")?.dependsOn).toEqual([fresh.key])
  })

  it("keeps malformed work estimates out of the saved definition", () => {
    show()
    fireEvent.click(screen.getByRole("button", { name: "Edit B" }))
    fireEvent.change(screen.getByLabelText("Days of work"), { target: { value: "1.5" } })
    expect(latest.steps.find(step => step.key === "B")?.estDays).toBe(1)
    expect(screen.getByRole("alert").textContent).toContain("whole number")
  })

  it("adds a branch using an existing organization team and can add its first task", () => {
    show()
    const before = structuredClone(latest.steps)
    fireEvent.click(screen.getByRole("button", { name: "Add branch" }))
    fireEvent.change(screen.getByLabelText("Team"), { target: { value: "marketing" } })
    fireEvent.click(within(screen.getByTestId("workflow-builder-details")).getByRole("button", { name: "Add branch" }))
    expect(latest.steps).toEqual(before)
    const branch = latest.milestoneGraph!.teamBranches.at(-1)!
    expect(branch.teamId).toBe("marketing")
    expect(branch.stepIds).toEqual([])
    fireEvent.click(screen.getByRole("button", { name: `Add task to branch ${branch.id}` }))
    expect(latest.stepTeams[latest.steps.at(-1)!.key]).toBe("marketing")
  })

  it("edits both endpoints and both event days in Details, with only one/two day options", () => {
    show([])
    fireEvent.click(screen.getByTestId("workflow-start"))
    fireEvent.change(screen.getByLabelText("Station name"), { target: { value: "Begin planning" } })
    fireEvent.change(screen.getByLabelText("Details"), { target: { value: "Gather the team" } })
    expect(latest.milestoneGraph?.start).toEqual({ title: "Begin planning", details: "Gather the team" })
    fireEvent.click(screen.getByTestId("workflow-done"))
    fireEvent.change(screen.getByLabelText("Station name"), { target: { value: "All complete" } })
    expect(latest.milestoneGraph?.done.title).toBe("All complete")
    fireEvent.click(screen.getByTestId("workflow-event-day-1"))
    fireEvent.change(screen.getByLabelText("Event day name"), { target: { value: "Opening" } })
    fireEvent.change(screen.getByLabelText("Workflow length"), { target: { value: "2" } })
    fireEvent.click(screen.getByTestId("workflow-event-day-2"))
    fireEvent.change(screen.getByLabelText("Event day name"), { target: { value: "Showcase" } })
    fireEvent.change(screen.getByLabelText("Days after Day 1"), { target: { value: "3" } })
    expect(latest.milestoneGraph?.eventDays.map(day => [day.title, day.offsetDays])).toEqual([["Opening", 0], ["Showcase", 3]])
    expect(within(screen.getByLabelText("Workflow length")).getAllByRole("option")).toHaveLength(2)
    expect(latest.steps).toEqual([])
  })

  it("does not silently chain independent same-team tasks when editing their definitions", () => {
    show([task("A"), task("B")])
    fireEvent.click(screen.getByRole("button", { name: "Edit B" }))
    fireEvent.change(screen.getByLabelText("Task name"), { target: { value: "Updated B" } })
    expect(latest.steps.map(step => step.dependsOn)).toEqual([[], []])
    expect(latest.steps.map(step => step.key)).toEqual(["A", "B"])
  })
})
