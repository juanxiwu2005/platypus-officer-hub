import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render, screen, within } from "@testing-library/react"
import type { DemoState, Event, Node, WorkflowMilestoneGraph } from "../data/types"
import type { CommandOp } from "../lib/commands"
import { sanitizeOps } from "../lib/commands"
import { seedDemo } from "../data/seed"
import { EVENT_CHECKLIST } from "../data/eventChecklist"
import { ensureWorkflowPresetTeams } from "../data/workflowTeamDefaults"
import { newObjects, validateReview } from "../data/changeReview"
import { duplicateWorkflowTemplate, findWorkflowTemplateVersion, getWorkflowTemplate, getWorkflowTemplates, newWorkflowTemplate, publishWorkflowTemplate, restoreWorkflowPreset, saveWorkflowTemplateDraft, STANDARD_WORKFLOW_TEMPLATE_ID } from "../data/workflowTemplates"
import { WORKFLOW_DAY_ONE, WORKFLOW_DONE, WORKFLOW_START } from "../engine/workflowMilestones"
import { computeSchedule } from "../engine/schedule"
import { placementOf } from "../engine/workflowBranches"
import { draftOf } from "../components/workflowLibrary/WorkflowLibrary"
import { addMilestoneBranch, addMilestoneTask, moveMilestoneTask } from "../components/workflowBuilder/milestoneCommands"
import { buildLaneLayout } from "../components/workflowBuilder/laneLayout"
import { flowChartKind, projectMilestoneExecution } from "../components/flow/milestoneExecution"
import { MetroChart } from "../components/flow/MetroChart"
import { RailProvider } from "../components/rail/RailContext"

// The user-reported bug (November 28, 2026): an event made from "Speaker series · v1" drew as one row per team, with no
// main line, instead of the branch chart Settings shows for that template. Every saved template must now draw like Settings.
afterEach(cleanup)

const allChecks = Object.fromEntries(EVENT_CHECKLIST.map(item => [item.key, true]))
const raw: Extract<CommandOp, { op: "create_event" }> = { op: "create_event", name: "Template run", type: "speaker", headcount: 60, venue: "campus", food: "offsite", funding: "usg", speaker: true, checks: allChecks }

/** The application's state: the v2 seed with the preset teams the store adds on load. */
const appState = (workflow: "v2" | "legacy" = "v2") => ensureWorkflowPresetTeams(workflow === "v2" ? seedDemo(undefined, "v2") : seedDemo())

/** The Create event form's path: the approved change card validates, then the store adds newObjects. */
function createRun(state: DemoState, templateId: string, id = "run-1", checks: Record<string, boolean> = allChecks): { state: DemoState; event: Event; nodes: Node[] } {
  const version = findWorkflowTemplateVersion(state, templateId)!
  const human = { date: "2027-04-15", workflowTemplateId: templateId, workflowTemplateVersion: version.version }
  const op = sanitizeOps([{ ...raw, checks }], state)[0]
  expect(validateReview(state, op, human)).toBeNull()
  const created = newObjects(state, op, id, human)
  const next = { ...state, events: created.events!, nodes: created.nodes! }
  return { state: next, event: next.events.find(event => event.id === id)!, nodes: next.nodes.filter(node => node.eventId === id) }
}

/** The graph and steps Settings → Workflow draws for this template (WorkflowLibrary's draftOf). */
function settingsView(state: DemoState, templateId: string) {
  const draft = draftOf(getWorkflowTemplate(state, templateId)!, state)
  return { steps: draft.steps, graph: draft.milestoneGraph! }
}

const nonEmpty = (graph: WorkflowMilestoneGraph): WorkflowMilestoneGraph => ({ ...graph, teamBranches: graph.teamBranches.filter(branch => branch.stepIds.length) })
const shape = (layout: ReturnType<typeof buildLaneLayout>) => ({
  spine: layout.stations.map(station => station.id),
  lanes: layout.lanes.map(lane => ({ id: lane.branch.id, team: lane.branch.teamId, from: lane.branch.fromId, to: lane.branch.toId, side: lane.side, stack: lane.stack, steps: lane.points.map(point => point.step.key) })),
})

function expectRunMatchesSettings(before: DemoState, templateId: string, checks: Record<string, boolean> = allChecks) {
  const { state, event, nodes } = createRun(before, templateId, "run-1", checks)
  const settings = settingsView(before, templateId)
  const keys = nodes.map(node => node.workflowSource!.templateStepId)
  expect(nodes.length).toBeGreaterThan(0)
  // Same set of steps: every task is a template step, once.
  expect(new Set(keys).size).toBe(keys.length)
  expect(keys.every(key => settings.steps.some(step => step.key === key))).toBe(true)
  // The chart is the template graph, never the team-row tracks or the placement-based branch metro.
  expect(flowChartKind(event, nodes)).toBe("template-graph")
  const projection = projectMilestoneExecution(event, state.nodes)
  expect(projection.issues).toEqual([])
  expect(projection.unplaced).toEqual([])
  expect(projection.nodeByStep.size).toBe(nodes.length)
  const run = projection.graph!
  const generated = new Set(keys)
  // Main line: the same stations in the same order, minus tasks this event's checklist did not generate.
  expect(run.spine).toEqual(settings.graph.spine.filter(id => [WORKFLOW_START, WORKFLOW_DONE, ...settings.graph.eventDays.map(day => day.id)].includes(id) || generated.has(id)))
  expect(run.spine[0]).toBe(WORKFLOW_START)
  expect(run.spine.at(-1)).toBe(WORKFLOW_DONE)
  expect(run.spine).toContain(WORKFLOW_DAY_ONE)
  // Same branch for every step, same order inside each branch, same team and the same side of the event day.
  const eventAt = (graph: WorkflowMilestoneGraph, id: string) => graph.spine.indexOf(id) - graph.spine.indexOf(WORKFLOW_DAY_ONE)
  for (const branch of settings.graph.teamBranches) {
    const actual = run.teamBranches.find(item => item.id === branch.id)!
    expect(actual.stepIds).toEqual(branch.stepIds.filter(key => generated.has(key)))
    expect(actual.teamId).toBe(branch.teamId)
    if (actual.stepIds.length) expect(Math.sign(eventAt(run, actual.toId)) <= 0).toBe(Math.sign(eventAt(settings.graph, branch.toId)) <= 0)
  }
  // With every checklist box ticked, every template step is generated and the activity's geometry is exactly the
  // Settings geometry (Settings also shows empty branches for authoring; Plan does not).
  if (checks === allChecks) {
    expect(generated.size).toBe(settings.steps.length)
    expect(shape(buildLaneLayout(projection.steps, nonEmpty(run)))).toEqual(shape(buildLaneLayout(settings.steps, nonEmpty(settings.graph))))
  }
  return { state, event, nodes, projection, settings }
}

describe("events created from saved workflow templates draw like the template in Settings", () => {
  it("drops only the conditional tasks an event does not need, keeping every other task in its Settings branch", () => {
    const { nodes, projection, settings } = expectRunMatchesSettings(appState(), STANDARD_WORKFLOW_TEMPLATE_ID, {})
    expect(nodes.length).toBeLessThan(settings.steps.length)
    expect(projection.graph!.spine).toEqual([WORKFLOW_START, "finalcheck", "checkin", WORKFLOW_DAY_ONE, "headcount", WORKFLOW_DONE])
  })

  it("covers every template the default application seed offers", () => {
    const state = appState()
    const templates = getWorkflowTemplates(state)
    expect(templates.map(template => template.versions.at(-1)?.name)).toEqual(["Speaker series"])
    for (const template of templates) expectRunMatchesSettings(state, template.id)
  })

  it("draws Speaker series v1 with its main line, before-event branches and after-event close-out branches", () => {
    const { nodes, projection } = expectRunMatchesSettings(appState(), STANDARD_WORKFLOW_TEMPLATE_ID)
    const graph = projection.graph!
    expect(graph.spine).toEqual([WORKFLOW_START, "finalcheck", "checkin", WORKFLOW_DAY_ONE, "headcount", WORKFLOW_DONE])
    const branches = graph.teamBranches.filter(branch => branch.stepIds.length)
    const before = branches.filter(branch => branch.toId === "finalcheck"), after = branches.filter(branch => branch.fromId === "headcount")
    expect(before.length + after.length).toBe(branches.length)
    expect(before.every(branch => branch.fromId === WORKFLOW_START)).toBe(true)
    expect(after.every(branch => branch.toId === WORKFLOW_DONE)).toBe(true)
    expect(after.flatMap(branch => branch.stepIds)).toEqual(expect.arrayContaining(["thankyou", "feedback", "invoice", "attendance"]))
    expect(before.flatMap(branch => branch.stepIds)).not.toContain("feedback")
    // The data under the chart is unchanged: the same placements and dependencies as the seeded speaker event.
    // (This run ticks every checklist box, so it may hold extra conditional tasks; compare the shared ones.)
    const seeded = appState().nodes.filter(node => node.eventId === "e-speaker")
    const shared = new Set(seeded.map(node => node.stepKey))
    const keysOf = (ids: string[]) => ids.map(id => id.split(":").pop()!).filter(key => shared.has(key)).sort()
    expect(nodes.filter(node => shared.has(node.stepKey))).toHaveLength(seeded.length)
    for (const node of nodes) {
      const twin = seeded.find(item => item.stepKey === node.stepKey)
      if (!twin) continue
      expect(placementOf(node)).toEqual(placementOf(twin))
      expect(keysOf(node.dependsOn)).toEqual(keysOf(twin.dependsOn))
    }
  })

  it("covers the legacy seed's standard template", () => {
    const state = appState("legacy")
    for (const template of getWorkflowTemplates(state)) expectRunMatchesSettings(state, template.id)
  })

  it("covers the restored Platypus preset, which saves its own graph", () => {
    const restored = publishWorkflowTemplate(restoreWorkflowPreset(appState(), STANDARD_WORKFLOW_TEMPLATE_ID), STANDARD_WORKFLOW_TEMPLATE_ID)
    expect(findWorkflowTemplateVersion(restored, STANDARD_WORKFLOW_TEMPLATE_ID)?.milestoneGraph).toBeTruthy()
    expectRunMatchesSettings(restored, STANDARD_WORKFLOW_TEMPLATE_ID)
  })

  it("follows a task moved to another team branch in Settings, not the task's stored placement", () => {
    let state = duplicateWorkflowTemplate(appState(), STANDARD_WORKFLOW_TEMPLATE_ID, "speaker-copy", "Speaker copy")
    const draft = getWorkflowTemplate(state, "speaker-copy")!.draft!
    const view = settingsView(state, "speaker-copy")
    const operations = view.graph.teamBranches.find(branch => branch.stepIds.includes("plan"))!
    const moved = moveMilestoneTask({ steps: view.steps, branches: draft.branches, stepTeams: draft.teamMap!.stepTeams, milestoneGraph: view.graph }, "rsvp", operations.id)
    state = saveWorkflowTemplateDraft(state, "speaker-copy", { ...draft, steps: moved.steps, teamMap: { version: 1, workflowId: "speaker-copy", stepTeams: moved.stepTeams }, milestoneGraph: moved.milestoneGraph })
    state = publishWorkflowTemplate(state, "speaker-copy")
    expect(findWorkflowTemplateVersion(state, "speaker-copy")?.version).toBe(1)
    const { nodes, projection } = expectRunMatchesSettings(state, "speaker-copy")
    expect(projection.graph!.teamBranches.find(branch => branch.id === operations.id)!.stepIds).toContain("rsvp")
    expect(placementOf(nodes.find(node => node.stepKey === "rsvp")!).branchId).toBe("marketing")
  })

  it("covers a custom workflow authored on the Settings canvas", () => {
    let state = newWorkflowTemplate(appState(), "visit", "Company visit")
    const draft = getWorkflowTemplate(state, "visit")!.draft!
    const team = state.org.workflowTeams![1].id
    let snapshot = addMilestoneBranch({ steps: draft.steps, branches: draft.branches, stepTeams: draft.teamMap!.stepTeams, milestoneGraph: draft.milestoneGraph }, { teamId: team, fromId: WORKFLOW_START, toId: WORKFLOW_DAY_ONE }, "visit-route")
    for (const key of ["agree", "transport", "briefing"]) snapshot = addMilestoneTask(snapshot, "visit-route", key)
    state = saveWorkflowTemplateDraft(state, "visit", { ...draft, steps: snapshot.steps, teamMap: { version: 1, workflowId: "visit", stepTeams: snapshot.stepTeams }, milestoneGraph: snapshot.milestoneGraph })
    state = publishWorkflowTemplate(state, "visit")
    const { projection } = expectRunMatchesSettings(state, "visit")
    expect(projection.graph!.teamBranches.find(branch => branch.id === "visit-route")!.stepIds).toEqual(["agree", "transport", "briefing"])
  })

  it("covers a custom version saved without a graph, the way older custom templates were stored", () => {
    const base = appState(), team = base.org.workflowTeams![1].id
    const step = (key: string, dependsOn: string[] = []) => ({ key, title: `Visit ${key}`, dependsOn, ownerRoleId: "r-events", fn: "programs" as const, phase: "prepare" as const, tier: "light" as const, estDays: 1, anchor: { kind: "target" as const, days: 7, unit: "calendar" as const, label: "Visit planning" }, why: "Fictional visit task.", source: "Fictional fixture" })
    const state: DemoState = { ...base, org: { ...base.org, workflowTemplates: [...getWorkflowTemplates(base), { id: "old-visit", updatedOn: base.today, versions: [{ version: 1, savedOn: base.today, name: "Old visit", kind: "custom", steps: [step("agree"), step("transport", ["agree"])], teamMap: { version: 1, workflowId: "old-visit", stepTeams: { agree: team, transport: team } } }] }] } }
    expectRunMatchesSettings(state, "old-visit")
  })
})

describe("chart selection", () => {
  it("keeps seeded events and template runs without teams on the branch metro", () => {
    const state = appState()
    for (const event of state.events) expect(flowChartKind(event, state.nodes.filter(node => node.eventId === event.id))).toBe("branch-metro")
    // Before an organization has teams, a run's tasks carry none; the complete branch metro stays.
    const { event, nodes } = createRun(seedDemo(undefined, "v2"), STANDARD_WORKFLOW_TEMPLATE_ID)
    expect(flowChartKind(event, nodes)).toBe("branch-metro")
  })

  it("renders the Speaker series run in Plan with every task, the main line stations and one labelled pill per branch", async () => {
    const { state, event, nodes, projection } = expectRunMatchesSettings(appState(), STANDARD_WORKFLOW_TEMPLATE_ID)
    // Plan's MetroChart picks the chart; before this fix it drew the team-row tracks here.
    render(<RailProvider><MetroChart state={state} sched={computeSchedule(state)} forecast={{ nodes: {}, events: {} }} eventId={event.id} selectedId={null} onSelect={() => {}} canEdit /></RailProvider>)
    await screen.findByTestId("milestone-execution-chart")
    const chart = screen.getByTestId("flow-chart")
    expect(within(chart).getAllByTestId(/^flow-node-/)).toHaveLength(nodes.length)
    for (const id of ["flow-start", "flow-event-day-1", "flow-done", "flow-node-finalcheck", "flow-node-checkin", "flow-node-headcount"]) expect(within(chart).getByTestId(id)).toBeTruthy()
    const lanes = within(chart).getAllByTestId("milestone-execution-branch")
    expect(lanes).toHaveLength(projection.graph!.teamBranches.filter(branch => branch.stepIds.length).length)
    for (const lane of lanes) expect(lane.textContent).toMatch(/^(Club leadership|Operations|Marketing|Finance) · \d+ steps?$/)
    expect(screen.queryByTestId("team-execution-chart")).toBeNull()
  })
})
