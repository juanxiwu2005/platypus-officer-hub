import { afterEach, describe, expect, it } from "vitest"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { useState } from "react"
import type { DemoState, StepTemplate } from "../../data/types"
import { seedDemo } from "../../data/seed"
import { RailProvider, useRail } from "../rail/RailContext"
import { WorkflowBuilder } from "./WorkflowBuilder"
import type { BuilderSnapshot } from "./model"

const teams = [{ id: "events", name: "Events team" }, { id: "marketing", name: "Marketing team" }]
const task = (key: string, dependsOn: string[] = []): StepTemplate => ({ key, title: key, fn: "programs", ownerRoleId: "r-events", phase: "prepare", placement: { branchId: "speaker", order: 0 }, stepKind: "situation", cond: "speaker", estDays: 1, tier: "light", dependsOn, why: "Do the work", source: "Manual", custom: true, anchor: { kind: "target", days: 7, unit: "calendar", label: "Human target" } })
let latest: BuilderSnapshot
function Details() { return <aside>{useRail().workflowDetail}</aside> }
const seeded = seedDemo(undefined, "v2")
function App({ initial, state = seeded }: { initial: BuilderSnapshot; state?: DemoState }) {
  const [snapshot, setSnapshot] = useState(initial)
  latest = snapshot
  return <RailProvider><WorkflowBuilder state={state} steps={snapshot.steps} branches={snapshot.branches} stepTeams={snapshot.stepTeams} graph={snapshot.milestoneGraph} teams={teams} policy="custom" onChange={(steps, branches, stepTeams, milestoneGraph) => setSnapshot({ steps, branches, stepTeams, milestoneGraph })} /><Details /></RailProvider>
}
const show = (steps = [task("A"), task("B", ["A"])], state?: DemoState) => render(<App state={state} initial={{ steps, branches: [{ id: "speaker", title: "Speaker", side: "before_event", order: 1, conditions: ["speaker"] }], stepTeams: Object.fromEntries(steps.map(step => [step.key, "events"])) }} />)
const menu = (trigger: string, item: string) => { fireEvent.click(screen.getByRole("button", { name: trigger })); fireEvent.click(screen.getByRole("menuitem", { name: item })) }
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
    fireEvent.click(screen.getByRole("button", { name: "Connect on canvas" }))
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
    menu("Add", "Team branch")
    expect(screen.getByRole("heading", { name: "Add team branch" })).toBeTruthy()
    fireEvent.change(screen.getByLabelText("Team"), { target: { value: "marketing" } })
    fireEvent.click(within(screen.getByTestId("workflow-builder-details")).getByRole("button", { name: "Add branch" }))
    expect(latest.steps).toEqual(before)
    const branch = latest.milestoneGraph!.teamBranches.at(-1)!
    expect(branch.teamId).toBe("marketing")
    expect(branch.stepIds).toEqual([])
    fireEvent.click(screen.getByRole("button", { name: `Add task to branch ${branch.id}` }))
    expect(latest.stepTeams[latest.steps.at(-1)!.key]).toBe("marketing")
  })

  it("can clear a branch team and add unassigned work without inventing mapping values", () => {
    show()
    fireEvent.click(screen.getAllByRole("button", { name: /^Edit branch / })[0])
    fireEvent.change(screen.getByLabelText("Team"), { target: { value: "" } })
    expect(latest.stepTeams).toEqual({})
    expect(latest.milestoneGraph?.teamBranches[0].teamId).toBe("")
    fireEvent.click(screen.getByRole("button", { name: "+ Task" }))
    expect(latest.steps).toHaveLength(3)
    expect(Object.values(latest.stepTeams)).toEqual([])
    expect(latest.milestoneGraph?.teamBranches[0].stepIds).toHaveLength(3)
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
    fireEvent.click(within(screen.getByRole("group", { name: "Workflow length" })).getByRole("button", { name: "2-day" }))
    fireEvent.click(screen.getByTestId("workflow-event-day-2"))
    fireEvent.change(screen.getByLabelText("Event day name"), { target: { value: "Showcase" } })
    fireEvent.change(screen.getByLabelText("Days after Day 1"), { target: { value: "3" } })
    expect(latest.milestoneGraph?.eventDays.map(day => [day.title, day.offsetDays])).toEqual([["Opening", 0], ["Showcase", 3]])
    expect(within(screen.getByRole("group", { name: "Workflow length" })).getAllByRole("button").map(button => [button.textContent, button.getAttribute("aria-pressed")])).toEqual([["1-day", "false"], ["2-day", "true"]])
    expect(latest.steps).toEqual([])
  })

  it("does not silently chain independent same-team tasks when editing their definitions", () => {
    show([task("A"), task("B")])
    fireEvent.click(screen.getByRole("button", { name: "Edit B" }))
    fireEvent.change(screen.getByLabelText("Task name"), { target: { value: "Updated B" } })
    expect(latest.steps.map(step => step.dependsOn)).toEqual([[], []])
    expect(latest.steps.map(step => step.key)).toEqual(["A", "B"])
  })

  it("bulk-assigns selected steps to a team branch in one undoable edit", () => {
    show([task("A"), task("B", ["A"]), { ...task("C"), placement: { branchId: "main", order: 3 } }])
    const before = structuredClone(latest)
    menu("Add", "Team branch")
    fireEvent.change(screen.getByLabelText("Team"), { target: { value: "marketing" } })
    fireEvent.click(within(screen.getByTestId("workflow-builder-details")).getByRole("button", { name: "Add branch" }))
    const target = latest.milestoneGraph!.teamBranches.at(-1)!
    expect(screen.getByRole("heading", { name: "Marketing team path" })).toBeTruthy()
    expect(screen.getByText("0 steps")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "+ Select steps" }))
    expect(screen.getByRole("button", { name: "Select steps" }).getAttribute("aria-pressed")).toBe("true")
    expect((screen.getByRole("button", { name: "Assign 0 steps" }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole("button", { name: "Edit A" }))
    fireEvent.click(screen.getByRole("button", { name: "Edit C" }))
    fireEvent.click(screen.getByRole("button", { name: "Edit B" }))
    fireEvent.click(screen.getByRole("button", { name: "Edit C" }))
    expect(screen.getByText("2 steps selected")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Assign 2 steps" }))
    expect(latest.milestoneGraph!.teamBranches.find(branch => branch.id === target.id)!.stepIds).toEqual(["A", "B"])
    expect([latest.stepTeams.A, latest.stepTeams.B, latest.stepTeams.C]).toEqual(["marketing", "marketing", "events"])
    expect(latest.steps.map(step => step.key)).toEqual(["A", "B", "C"])
    expect(screen.getByText("Moved 2 steps to Marketing team.")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Select steps" }).getAttribute("aria-pressed")).toBe("false")
    fireEvent.click(screen.getByRole("button", { name: "Undo edit" }))
    expect(latest.milestoneGraph!.teamBranches.find(branch => branch.id === target.id)!.stepIds).toEqual([])
    expect(latest.stepTeams).toEqual(before.stepTeams)
  })

  it("leaves select mode with Escape and asks for a branch when none exists", () => {
    show()
    fireEvent.click(screen.getByRole("button", { name: "Select steps" }))
    expect(screen.getByTestId("workflow-builder-details")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Edit A" }))
    expect(screen.getByText("1 step selected")).toBeTruthy()
    fireEvent.keyDown(window, { key: "Escape" })
    expect(screen.getByRole("button", { name: "Select steps" }).getAttribute("aria-pressed")).toBe("false")
    expect(screen.getByRole("button", { name: "+ Select steps" })).toBeTruthy()
    cleanup()
    show([])
    fireEvent.click(screen.getByRole("button", { name: "Select steps" }))
    expect(screen.getByRole("alert").textContent).toBe("Choose a team branch first.")
  })

  it("shows the branch roster from mapped roles and its description, and protects a branch that has steps", () => {
    const state = { ...seeded, org: { ...seeded.org, workflowRoleTeams: { "r-events": "events" } } }
    const holder = state.people.find(person => person.id === state.roles.find(role => role.id === "r-events")!.holderId)!
    show(undefined, state)
    fireEvent.click(screen.getAllByRole("button", { name: /^Edit branch / })[0])
    expect(screen.getByRole("heading", { name: "Events team path" })).toBeTruthy()
    expect(within(screen.getByRole("list", { name: "Team roster" })).getByText(`${holder.name.split(" ")[0]} · Events lead`)).toBeTruthy()
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Books rooms and speakers." } })
    expect(latest.milestoneGraph!.teamBranches[0].details).toBe("Books rooms and speakers.")
    expect((screen.getByRole("button", { name: "Delete team branch" }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText("Move its steps first.")).toBeTruthy()
    fireEvent.change(screen.getByLabelText("Team"), { target: { value: "marketing" } })
    expect(screen.getByText("No roles mapped to this team yet. Map roles in Teams.")).toBeTruthy()
  })
})
