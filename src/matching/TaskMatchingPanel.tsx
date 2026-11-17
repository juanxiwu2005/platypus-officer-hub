import { useEffect, useState } from "react"
import type { Node } from "../data/types"
import { useStore } from "../data/store"
import { canLead } from "../data/permissions"
import { matchingModeEnabled, organizationMatchingReferences, validOrganizationMatching } from "./adapters"
import { resolveMatchingAssignment } from "./resolve"
import { resolutionLabels } from "./ui/viewHelpers"
import { TaskMatchingFields, validateTaskSelection, type TaskMatchingSelection } from "./TaskMatchingFields"

export function TaskMatchingPanel({ node }: { node: Node }) {
  const { state, tryDispatch } = useStore(), matching = validOrganizationMatching(state)
  const [duty, setDuty] = useState(node.matching?.responsibilityId ?? "")
  const [choice, setChoice] = useState<TaskMatchingSelection>({ responsibilityId: node.matching?.responsibilityId ?? null, memberId: node.ownerId, manualOverride: false })
  const [error, setError] = useState("")
  useEffect(() => { setDuty(node.matching?.responsibilityId ?? ""); setChoice({ responsibilityId: node.matching?.responsibilityId ?? null, memberId: node.ownerId, manualOverride: false }) }, [node.id, node.matching?.responsibilityId, node.ownerId])
  if (!matchingModeEnabled(state) && !node.matching) return null
  const result = node.matching && matching ? resolveMatchingAssignment(matching, organizationMatchingReferences(state), { taskId: node.id, workflowId: node.matching.workflowId, stepId: node.matching.stepId }) : null
  const override = Array.isArray(state.matchingContext?.overrides) ? state.matchingContext.overrides.filter(r => r && r.taskId === node.id).at(-1) : undefined
  return <details className="td-zone" open={!node.ownerId} data-testid="task-matching"><summary>Responsibility & assignment</summary>
    <p className="small muted">{!node.matching ? "Previous assignment has no responsibility record. Its owner and status are retained." : node.matching.reason === "manual_override" && override ? "An explicit one-task manual assignment was recorded. Responsibility gaps remain visible." : result ? resolutionLabels[result.reason] : "The matching configuration needs recovery; its original data is retained."}</p>
    {canLead(state) && matching && node.status !== "done" && <div className="form-stack">
      <label>Task responsibility<select value={duty} onChange={event => setDuty(event.target.value)}><option value="">Not linked yet</option>{matching.responsibilities.filter(r => r.status !== "archived").map(r => <option key={r.id} value={r.id} disabled={r.status !== "confirmed"}>{r.title}</option>)}</select></label>
      <button type="button" className="btn small" onClick={() => { if (!tryDispatch({ type: "matchingLinkTask", nodeId: node.id, responsibilityId: duty || null })) setError("The responsibility link could not be saved. Reopen the task and try again."); else setError("") }}>Save task responsibility</button>
      {node.matching && <><TaskMatchingFields state={state} value={choice} onChange={setChoice} hideResponsibility />
        <button type="button" className="btn small" disabled={!matchingModeEnabled(state)} onClick={() => {
          const issue = validateTaskSelection(state, choice)
          if (issue) { setError(issue); return }
          if (!tryDispatch({ type: "matchingAssignTask", nodeId: node.id, choice, revision: matching.revision })) setError("The assignment could not be saved. Check the current candidates and try again.")
          else setError("")
        }}>Confirm assignment</button>
        {!matchingModeEnabled(state) && <p className="small muted">Resume responsibility matching to confirm a new assignee.</p>}</>}
      {error && <p role="alert" className="small late-text">{error}</p>}
    </div>}
  </details>
}
