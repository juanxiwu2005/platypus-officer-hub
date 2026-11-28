import { useState } from "react"
import { useStore } from "../../data/store"
import { runFlowEditError, type RunFlowDefinition } from "../../data/runFlow"
import { createWorkflowMilestoneGraph } from "../../engine/workflowMilestones"
import { WorkflowBuilder } from "../workflowBuilder/WorkflowBuilder"
import { runMilestoneGraph } from "./milestoneExecution"

/**
 * Edit flow for an event made from a saved workflow template (Juanxi 2026-11-28). It is the Settings → Workflow editor,
 * opened on this event's own copy of the workflow; every change is saved to the event at once (editRunFlow), so the
 * chart shows it after Done editing. The saved template in Settings is not changed. Loaded only when Edit flow opens.
 */
export function RunFlowEditor({ eventId }: { eventId: string }) {
  const { state, tryDispatch, getState } = useStore()
  const [error, setError] = useState("")
  const event = state.events.find(item => item.id === eventId)
  const run = event?.workflowRun
  if (!event || !run) return null
  const snapshot = run.snapshot
  const save = (steps: RunFlowDefinition["steps"], stepTeams: Record<string, string>, graph = createWorkflowMilestoneGraph(steps, stepTeams)) => {
    const definition: RunFlowDefinition = { steps, stepTeams, graph }
    const problem = runFlowEditError(getState(), eventId, definition)
    if (problem) { setError(problem); return }
    setError(tryDispatch({ type: "editRunFlow", eventId, definition }) ? "" : "Could not save this change. Try again.")
  }
  return <div className="form-stack" data-testid="run-flow-editor">
    <p className="small muted">Changes apply to this event only and keep every task's owner, status and work. The saved workflow in Settings stays as it is.</p>
    {error && <p className="small late-text" role="alert">{error}</p>}
    <WorkflowBuilder state={state} steps={snapshot.steps} branches={snapshot.branches} stepTeams={snapshot.teamMap?.stepTeams ?? {}} teams={snapshot.teams} policy={snapshot.kind} graph={runMilestoneGraph(snapshot)} eventDate={event.date} onChange={(steps, _branches, stepTeams, graph) => save(steps, stepTeams, graph)} />
  </div>
}
