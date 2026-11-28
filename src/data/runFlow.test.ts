import { describe, expect, it } from "vitest"
import type { DemoState } from "./types"
import type { CommandOp } from "../lib/commands"
import { sanitizeOps } from "../lib/commands"
import { seedDemo } from "./seed"
import { EVENT_CHECKLIST } from "./eventChecklist"
import { ensureWorkflowPresetTeams } from "./workflowTeamDefaults"
import { newObjects, validateReview } from "./changeReview"
import { findWorkflowTemplateVersion, getWorkflowTemplate, STANDARD_WORKFLOW_TEMPLATE_ID } from "./workflowTemplates"
import { editRunFlow, runFlowEditError, type RunFlowDefinition } from "./runFlow"
import { reducer } from "./store"
import { addMilestoneTask, moveMilestoneTask } from "../components/workflowBuilder/milestoneCommands"
import type { BuilderSnapshot } from "../components/workflowBuilder/model"
import { flowChartKind, projectMilestoneExecution, runMilestoneGraph } from "../components/flow/milestoneExecution"

// Edit flow for a saved-template event (Juanxi 2026-11-28): the event's own copy of the workflow changes, its tasks keep
// their work, and the template in Settings stays as it was.
const allChecks = Object.fromEntries(EVENT_CHECKLIST.map(item => [item.key, true]))
const raw: Extract<CommandOp, { op: "create_event" }> = { op: "create_event", name: "Template run", type: "speaker", headcount: 60, venue: "campus", food: "offsite", funding: "usg", speaker: true, checks: allChecks }

function templateEvent() {
  const base = ensureWorkflowPresetTeams(seedDemo(undefined, "v2"))
  const version = findWorkflowTemplateVersion(base, STANDARD_WORKFLOW_TEMPLATE_ID)!
  const human = { date: "2027-04-15", workflowTemplateId: STANDARD_WORKFLOW_TEMPLATE_ID, workflowTemplateVersion: version.version }
  const op = sanitizeOps([raw], base)[0]
  expect(validateReview(base, op, human)).toBeNull()
  const created = newObjects(base, op, "run-1", human)
  const state: DemoState = { ...base, events: created.events!, nodes: created.nodes! }
  return { state, event: state.events.find(event => event.id === "run-1")! }
}

const builderOf = (state: DemoState): BuilderSnapshot => {
  const snapshot = state.events.find(event => event.id === "run-1")!.workflowRun!.snapshot
  return { steps: snapshot.steps, branches: snapshot.branches, stepTeams: snapshot.teamMap?.stepTeams ?? {}, milestoneGraph: runMilestoneGraph(snapshot) }
}
const definitionOf = (snapshot: BuilderSnapshot): RunFlowDefinition => ({ steps: snapshot.steps, stepTeams: snapshot.stepTeams, graph: snapshot.milestoneGraph! })
const runNodes = (state: DemoState) => state.nodes.filter(node => node.eventId === "run-1")

describe("editRunFlow", () => {
  it("moves a task to another team branch and keeps its id, owner, status and work", () => {
    const { state } = templateEvent()
    const before = builderOf(state), graph = before.milestoneGraph!
    const from = graph.teamBranches.find(branch => branch.stepIds.length > 1)!
    const to = graph.teamBranches.find(branch => branch.teamId !== from.teamId && branch.fromId === from.fromId)!
    const key = from.stepIds[0]
    const node = runNodes(state).find(item => item.workflowSource?.templateStepId === key)!
    const worked: DemoState = { ...state, nodes: state.nodes.map(item => item.id === node.id ? { ...item, status: "in_progress", note: "Kept note" } : item) }
    const template = JSON.stringify(getWorkflowTemplate(worked, STANDARD_WORKFLOW_TEMPLATE_ID))

    const next = editRunFlow(worked, "run-1", definitionOf(moveMilestoneTask(before, key, to.id)))
    expect(next).not.toBe(worked)
    const moved = next.nodes.find(item => item.id === node.id)!
    expect(moved).toMatchObject({ status: "in_progress", note: "Kept note", ownerId: node.ownerId, teamId: to.teamId })
    expect(runNodes(next)).toHaveLength(runNodes(state).length)
    const event = next.events.find(item => item.id === "run-1")!
    expect(flowChartKind(event, runNodes(next))).toBe("template-graph")
    const projection = projectMilestoneExecution(event, next.nodes)
    expect(projection.issues).toEqual([])
    expect(projection.graph!.teamBranches.find(branch => branch.id === to.id)!.stepIds).toContain(key)
    expect(projection.graph!.teamBranches.find(branch => branch.id === from.id)!.stepIds).not.toContain(key)
    // The saved template in Settings is not changed.
    expect(JSON.stringify(getWorkflowTemplate(next, STANDARD_WORKFLOW_TEMPLATE_ID))).toBe(template)
  })

  it("adds a new task as a new activity task, and takes an untouched one out again", () => {
    const { state } = templateEvent()
    const before = builderOf(state), branch = before.milestoneGraph!.teamBranches[0]
    const added = addMilestoneTask(before, branch.id, "extra-step")
    const next = editRunFlow(state, "run-1", definitionOf(added))
    const fresh = next.nodes.find(node => node.workflowSource?.templateStepId === "extra-step")!
    expect(fresh).toBeTruthy()
    expect(fresh.id).toBe(`${state.events.find(event => event.id === "run-1")!.workflowRun!.id}:extra-step`)
    expect(fresh.teamId).toBe(branch.teamId)
    expect(runNodes(next)).toHaveLength(runNodes(state).length + 1)

    const back = editRunFlow(next, "run-1", definitionOf(before))
    expect(back.nodes.some(node => node.id === fresh.id)).toBe(false)
    expect(runNodes(back)).toHaveLength(runNodes(state).length)
  })

  it("refuses to take out a task that has work on it, and changes nothing", () => {
    const { state } = templateEvent()
    const before = builderOf(state)
    const added = editRunFlow(state, "run-1", definitionOf(addMilestoneTask(before, before.milestoneGraph!.teamBranches[0].id, "extra-step")))
    const id = added.nodes.find(node => node.workflowSource?.templateStepId === "extra-step")!.id
    const worked: DemoState = { ...added, nodes: added.nodes.map(node => node.id === id ? { ...node, status: "in_progress" } : node) }
    expect(runFlowEditError(worked, "run-1", definitionOf(before))).toMatch(/has work on it/)
    expect(editRunFlow(worked, "run-1", definitionOf(before))).toBe(worked)
  })

  it("is refused for an event not made from a saved workflow, and for a viewer who is not a lead", () => {
    const { state } = templateEvent()
    const definition = definitionOf(builderOf(state))
    const seeded = state.events.find(event => !event.workflowRun)!
    expect(runFlowEditError(state, seeded.id, definition)).toMatch(/not made from a saved workflow/)
    const added = definitionOf(addMilestoneTask(builderOf(state), builderOf(state).milestoneGraph!.teamBranches[0].id, "extra-step"))
    const lead = state.people.find(person => state.roles.some(role => role.holderId === person.id && role.fn === "president"))!
    const member = state.people.find(person => !state.roles.some(role => role.holderId === person.id && (role.fn === "president" || role.fn === "vice_president")))!
    const asLead = reducer({ ...state, viewerId: lead.id }, { type: "editRunFlow", eventId: "run-1", definition: added })
    expect(asLead.nodes.some(node => node.workflowSource?.templateStepId === "extra-step")).toBe(true)
    const asMember = { ...state, viewerId: member.id }
    expect(reducer(asMember, { type: "editRunFlow", eventId: "run-1", definition: added })).toBe(asMember)
  })
})
