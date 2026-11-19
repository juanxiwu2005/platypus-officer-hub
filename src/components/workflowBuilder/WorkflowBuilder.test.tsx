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
  return <RailProvider><WorkflowBuilder state={seedDemo(undefined, "v2")} steps={snapshot.steps} branches={snapshot.branches} stepTeams={snapshot.stepTeams} teams={teams} policy="custom" onChange={(steps, branches, stepTeams) => setSnapshot({ steps, branches, stepTeams })} /><Details /></RailProvider>
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
    fireEvent.click(screen.getByRole("button", { name: "Timeline" }))
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

  it("keeps malformed work estimates out of the saved definition", () => {
    show()
    fireEvent.click(screen.getByRole("button", { name: "Edit B" }))
    fireEvent.change(screen.getByLabelText("Days of work"), { target: { value: "1.5" } })
    expect(latest.steps.find(step => step.key === "B")?.estDays).toBe(1)
    expect(screen.getByRole("alert").textContent).toContain("whole number")
  })
})
