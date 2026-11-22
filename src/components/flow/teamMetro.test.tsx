import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import type { DemoState, Node } from "../../data/types"
import { seedDemo } from "../../data/seed"
import { computeSchedule } from "../../engine/schedule"
import { teamMetroLayout, executionTeamSnapshot, hasTeamExecutionTracks, type ExecutionTeamSnapshot } from "./teamMetro"
import { TeamMetroChart } from "./TeamMetroChart"

afterEach(cleanup)
function scenario(count = 5) {
  const state = seedDemo(undefined, "v2")
  const event = state.events[0]
  const base = state.nodes.find(node => node.eventId === event.id)!
  const snapshot: ExecutionTeamSnapshot = {
    teams: Array.from({ length: count }, (_, i) => ({ id: `team-${i}`, name: i === 0 ? "Operations" : `Team ${i}` })),
    teamMap: { stepTeams: { visit: "team-0", transport: "team-1", signup: "team-2", briefing: "team-0", thanks: "team-0" } },
  }
  const node = (key: string, dependsOn: string[], phase = "prepare"): Node => ({ ...base, id: `${event.id}:${key}`, stepKey: key, title: key, phase: phase as Node["phase"], dependsOn: dependsOn.map(id => `${event.id}:${id}`), ruleIds: [], anchor: { kind: "target", days: 7, unit: "calendar", label: "Club timing" } })
  const nodes = [node("visit", []), node("transport", ["visit"]), node("signup", ["visit"]), node("briefing", ["transport", "signup"]), node("thanks", ["briefing"], "close")]
  const next: DemoState = { ...state, events: [{ ...event, workflowRun: { id: "run-one", templateId: "template-one", templateVersion: 1, templateName: "Company visit", snapshot } } as typeof event], nodes }
  return { state: next, snapshot, eventId: event.id, nodes }
}

describe("task execution team tracks", () => {
  it.each([5, 7])("keeps exactly %i teams including empty ones and combines before/after work", count => {
    const { snapshot, nodes } = scenario(count)
    const original = structuredClone(nodes)
    const graph = teamMetroLayout(nodes, snapshot)
    expect(graph.lanes).toHaveLength(count)
    expect(graph.lanes[0].tasks.map(task => task.node.stepKey)).toEqual(["visit", "briefing", "thanks"])
    expect(graph.lanes.at(-1)!.tasks).toHaveLength(0)
    expect(graph.lanes.flatMap(lane => lane.tasks).map(task => task.node.id).sort()).toEqual(nodes.map(node => node.id).sort())
    expect(new Set([...graph.positions.values()].map(position => `${position.row}:${position.col}`)).size).toBe(nodes.length)
    expect(nodes).toEqual(original)
  })

  it("preserves the full fork and join by actual task IDs without requiring standard event milestones", () => {
    const { snapshot, nodes } = scenario()
    const graph = teamMetroLayout(nodes, snapshot)
    expect(graph.links).toEqual(nodes.flatMap(node => node.dependsOn.map(from => ({ from, to: node.id }))))
    for (const link of graph.links) expect(graph.positions.get(link.to)!.col).toBeGreaterThan(graph.positions.get(link.from)!.col)
    expect(graph.issues).toEqual([])
  })

  it("reports unresolved team membership without silently dropping tasks or adding a lane", () => {
    const { snapshot, nodes } = scenario()
    delete snapshot.teamMap!.stepTeams.signup
    const graph = teamMetroLayout(nodes, snapshot)
    expect(graph.lanes).toHaveLength(5)
    expect(graph.unassigned).toEqual([nodes[2]])
    expect(graph.lanes.flatMap(lane => lane.tasks).length + graph.unassigned.length).toBe(5)
    expect(graph.issues.join()).toContain("team assignment")
  })

  it("shows every task even in a malformed historical cycle", () => {
    const { snapshot, nodes } = scenario()
    nodes[0].dependsOn = [nodes.at(-1)!.id]
    const graph = teamMetroLayout(nodes, snapshot)
    expect(graph.positions.size).toBe(5)
    expect(graph.issues.join()).toContain("dependency loop")
  })

  it("draws real task dots, uses saved team names, and opens the actual task ID", () => {
    const { state, eventId } = scenario()
    const onSelect = vi.fn()
    const before = structuredClone(state)
    render(<TeamMetroChart state={state} eventId={eventId} sched={computeSchedule(state)} forecast={{ nodes: {}, events: {} }} selectedId={null} onSelect={onSelect} />)
    const chart = screen.getByTestId("flow-chart")
    expect(screen.getAllByTestId("team-execution-lane")).toHaveLength(5)
    expect(within(chart).getAllByRole("button")).toHaveLength(5)
    expect(screen.getByRole("group", { name: "Operations task track" })).toBeTruthy()
    const task = screen.getByTestId("flow-node-briefing")
    expect(task.classList.contains("m-dot")).toBe(true)
    expect(task.getAttribute("data-task-id")).toBe(`${eventId}:briefing`)
    fireEvent.click(task)
    expect(onSelect).toHaveBeenCalledWith(`${eventId}:briefing`)
    const links = screen.getAllByTestId("team-execution-link")
    expect(links).toHaveLength(5)
    fireEvent.doubleClick(links[0])
    expect(state).toEqual(before)
    expect(screen.queryByTestId("flow-menu")).toBeNull()
  })

  it("keeps unassigned tasks accessible outside the N team tracks", () => {
    const { state, snapshot, eventId } = scenario()
    delete snapshot.teamMap!.stepTeams.signup
    const onSelect = vi.fn()
    render(<TeamMetroChart state={state} eventId={eventId} sched={computeSchedule(state)} forecast={{ nodes: {}, events: {} }} selectedId={null} onSelect={onSelect} />)
    fireEvent.click(within(screen.getByRole("region", { name: "Tasks needing a team" })).getByRole("button", { name: "signup" }))
    expect(onSelect).toHaveBeenCalledWith(`${eventId}:signup`)
    expect(screen.getAllByTestId("team-execution-lane")).toHaveLength(5)
  })

  it("leaves events without an explicit execution team snapshot on the legacy path", () => {
    const state = seedDemo(undefined, "v2")
    expect(executionTeamSnapshot(state.events[0])).toBeNull()
    expect(executionTeamSnapshot(undefined)).toBeNull()
  })

  it("retains the standard legacy map until every task has confirmed team membership", () => {
    const { state, snapshot, nodes } = scenario()
    expect(hasTeamExecutionTracks(state.events[0], nodes)).toBe(true)
    snapshot.teams = []
    expect(hasTeamExecutionTracks(state.events[0], nodes)).toBe(false)
    snapshot.kind = "custom"
    expect(hasTeamExecutionTracks(state.events[0], nodes)).toBe(true)
  })
})
