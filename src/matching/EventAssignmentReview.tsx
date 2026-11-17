import { useEffect, useMemo, useState } from "react"
import type { DemoState, Event } from "../data/types"
import type { CommandOp } from "../lib/commands"
import { buildEventNodes, orgSteps } from "../engine/playbooks"
import type { MatchingConfirmation } from "./businessContracts"
import { eventMatchingWorkflowId, organizationMatchingReferences, validOrganizationMatching } from "./adapters"
import { resolveMatchingAssignment } from "./resolve"
import { candidateExplanation, resolutionLabels } from "./ui/viewHelpers"

export function EventAssignmentReview({ state, op, eventId, date, onChange }: { state: DemoState; op: Extract<CommandOp, { op: "create_event" }>; eventId: string; date: string; onChange: (value: MatchingConfirmation | undefined) => void }) {
  const model = useMemo(() => {
    const matching = validOrganizationMatching(state)
    if (!matching) return null
    const { op: _op, ...fields } = op
    const workflowId = eventMatchingWorkflowId(state), event: Event = { ...fields, id: eventId, date, goalId: null, playbookId: workflowId }
    const references = organizationMatchingReferences(state)
    return { revision: matching.revision, rows: buildEventNodes(event, state.roles, { steps: orgSteps(state), ownerMode: "unassigned" }).map(node => ({ node,
      result: resolveMatchingAssignment(matching, references, { taskId: node.id, workflowId, stepId: node.stepKey ?? node.id }),
    })) }
  }, [state, op, eventId, date])
  const [choices, setChoices] = useState<Record<string, string>>({})
  useEffect(() => {
    if (!model) { onChange(undefined); return }
    const initial = Object.fromEntries(model.rows.map(({ node, result }) => [node.stepKey ?? node.id, ["primary_candidate", "sole_candidate"].includes(result.reason) ? result.suggestedOwnerId ?? "" : ""]))
    setChoices(initial)
    onChange({ revision: model.revision, choices: Object.fromEntries(Object.entries(initial).map(([key, value]) => [key, { memberId: value || null }])) })
  }, [model, onChange])
  return <details open data-testid="matching-event-assignments"><summary>Review task assignments</summary>
    <p className="small muted">Applying this plan confirms the selected assignees. Others stay unassigned. A person must still claim work assigned to them.</p>
    {!model ? <p className="small muted">Matching settings need recovery. These tasks will remain unassigned.</p> : model.rows.map(({ node, result }) => {
      const key = node.stepKey ?? node.id
      return <div className="form-stack" key={key}>
        <label>Assignee for {node.title}<select aria-label={`Assignee for ${node.title}`} value={choices[key] ?? ""} onChange={event => {
          const next = { ...choices, [key]: event.target.value }; setChoices(next)
          onChange({ revision: model.revision, choices: Object.fromEntries(Object.entries(next).map(([id, memberId]) => [id, { memberId: memberId || null }])) })
        }}><option value="">Leave unassigned</option>{result.candidates.map(candidate => <option key={candidate.memberId} value={candidate.memberId} disabled={candidate.eligibility !== "eligible"}>{candidate.memberName ?? candidate.memberId}{candidate.eligibility === "eligible" ? "" : ` · ${candidateExplanation(candidate)}`}</option>)}</select></label>
        <p className="small muted">{resolutionLabels[result.reason]}</p>
      </div>
    })}
  </details>
}
