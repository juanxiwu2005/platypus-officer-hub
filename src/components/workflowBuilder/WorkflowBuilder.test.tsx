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
  const [directory, setDirectory] = useState(teams)
  latest = snapshot
  return <RailProvider><WorkflowBuilder state={seedDemo(undefined, "v2")} steps={snapshot.steps} branches={snapshot.branches} stepTeams={snapshot.stepTeams} teams={directory} policy="custom" onAddTeam={() => { const id = `team-${directory.length + 1}`; setDirectory([...directory, { id, name: `Team ${directory.length + 1}` }]); return id }} onChange={(steps, branches, stepTeams) => setSnapshot({ steps, branches, stepTeams })} /><Details /></RailProvider>
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
    expect(screen.getAllByTestId("workflow-dependency")).toHaveLength(2)
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
    expect(latest.steps.find(step => step.key === "B")).toMatchObject({ title: "Confirm transport", estDays: 2, startPolicy: "effort", dependsOn: ["A"], anchor: { kind: "target", days: 14 }, why: "Confirm seats and pickup point." })
  })

  it("moves a task between team lanes without changing its owner, branch or dependency", () => {
    show()
    fireEvent.click(screen.getByRole("button", { name: "Edit B" }))
    const before = structuredClone(latest.steps)
    fireEvent.change(screen.getByLabelText("Team"), { target: { value: "marketing" } })
    expect(latest.stepTeams.B).toBe("marketing")
    expect(latest.steps).toEqual(before)
    expect(within(screen.getByTestId("workflow-team-marketing")).queryByText("B")).toBeNull()
    expect(screen.getAllByTestId(/^workflow-team-/)).toHaveLength(2)
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
    fireEvent.doubleClick(screen.getByTestId("workflow-dependency"))
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
    expect(fresh).toMatchObject({ placement: { branchId: "main" }, dependsOn: ["Marketing task"], stepKind: "core" })
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

  it("adds an empty parallel team branch immediately without changing any existing task", () => {
    show()
    const before = structuredClone(latest)
    fireEvent.click(screen.getByRole("button", { name: "Add branch" }))
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(screen.getAllByTestId(/^workflow-team-/)).toHaveLength(3)
    expect(screen.getByTestId("workflow-team-team-3")).toBeTruthy()
    expect(latest).toEqual(before)
    fireEvent.click(screen.getByRole("button", { name: "+ Task" }))
    const fresh = latest.steps.find(step => !before.steps.some(previous => previous.key === step.key))!
    expect(latest.stepTeams[fresh.key]).toBe("team-3")
    expect(fresh.dependsOn).toEqual([])
  })

  it("has fixed Start and Done stations with no task and supports duplicate Event day presets", () => {
    show([])
    expect(screen.getByTestId("workflow-start")).toBeTruthy()
    expect(screen.getByTestId("workflow-done")).toBeTruthy()
    expect(screen.queryAllByTestId(/^workflow-task-/)).toHaveLength(0)
    fireEvent.click(screen.getByRole("button", { name: "Event day" }))
    fireEvent.click(screen.getByRole("button", { name: "Event day" }))
    expect(latest.steps.map(step => step.title)).toEqual(["Event day", "Event day"])
    expect(new Set(latest.steps.map(step => step.key)).size).toBe(2)
    expect(latest.steps.every(step => step.anchor?.kind === "target" && step.anchor.days === 0)).toBe(true)
    fireEvent.click(screen.getByRole("button", { name: "Undo edit" }))
    expect(latest.steps).toHaveLength(1)
  })

  it("does not silently chain independent same-team tasks when editing their definitions", () => {
    show([task("A"), task("B")])
    fireEvent.click(screen.getByRole("button", { name: "Edit B" }))
    fireEvent.change(screen.getByLabelText("Task name"), { target: { value: "Updated B" } })
    expect(latest.steps.map(step => step.dependsOn)).toEqual([[], []])
    expect(latest.steps.map(step => step.key)).toEqual(["A", "B"])
  })
})
