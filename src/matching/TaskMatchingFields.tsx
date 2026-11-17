import { useId } from "react"
import type { DemoState } from "../data/types"
import { isOfficer } from "../data/permissions"
import type { MatchingTaskChoice } from "./businessContracts"
import { organizationMatchingReferences, validOrganizationMatching } from "./adapters"
import { resolveMatchingAssignment } from "./resolve"
import { candidateExplanation, resolutionLabels } from "./ui/viewHelpers"

export interface TaskMatchingSelection extends MatchingTaskChoice { responsibilityId: string | null }
export const emptyTaskSelection: TaskMatchingSelection = { responsibilityId: null, memberId: null, manualOverride: false }

export function taskSelectionPreview(state: DemoState, responsibilityId: string | null) {
  const matching = validOrganizationMatching(state)
  if (!matching) return null
  const workflowId = "form-preview", stepId = "single-task"
  return resolveMatchingAssignment({ ...matching, requirements: [...matching.requirements.filter(r => r.workflowId !== workflowId || r.stepId !== stepId), {
    id: "form-preview-requirement", workflowId, stepId, title: "Task assignment preview", responsibilityId, status: responsibilityId ? "confirmed" : "draft", origin: "manual", revision: 1,
  }] }, organizationMatchingReferences(state), { taskId: "form-preview-task", workflowId, stepId })
}

export function validateTaskSelection(state: DemoState, value: TaskMatchingSelection): string | null {
  if (!value.memberId) return null
  if (!state.people.some(p => p.id === value.memberId && isOfficer(p))) return "Choose a current member."
  if (value.manualOverride) return null
  if (!taskSelectionPreview(state, value.responsibilityId)?.candidates.some(c => c.memberId === value.memberId && c.eligibility === "eligible")) return "Choose a qualified, available candidate, or explicitly make a one-task manual exception."
  return null
}

export function TaskMatchingFields({ state, value, onChange, disabled = false, hideResponsibility = false }: { state: DemoState; value: TaskMatchingSelection; onChange: (value: TaskMatchingSelection) => void; disabled?: boolean; hideResponsibility?: boolean }) {
  const id = useId(), matching = validOrganizationMatching(state), result = taskSelectionPreview(state, value.responsibilityId)
  return <div className="form-stack" data-testid="task-matching-fields">
    {!hideResponsibility && <><label htmlFor={`${id}-duty`}>Responsibility</label>
    <select id={`${id}-duty`} value={value.responsibilityId ?? ""} disabled={disabled} onChange={event => {
      const responsibilityId = event.target.value || null, next = taskSelectionPreview(state, responsibilityId)
      onChange({ responsibilityId, memberId: next && ["primary_candidate", "sole_candidate"].includes(next.reason) ? next.suggestedOwnerId : null, manualOverride: false })
    }}><option value="">Not linked yet</option>{matching?.responsibilities.filter(r => r.status !== "archived").map(r => <option key={r.id} value={r.id} disabled={r.status !== "confirmed"}>{r.title}{r.status === "confirmed" ? "" : " · needs confirmation"}</option>)}</select></>}
    <label htmlFor={`${id}-owner`}>Assign one person</label>
    <select id={`${id}-owner`} value={value.memberId ?? ""} disabled={disabled} onChange={event => onChange({ ...value, memberId: event.target.value || null })}>
      <option value="">Leave unassigned</option>{state.people.filter(isOfficer).map(member => {
        const candidate = result?.candidates.find(c => c.memberId === member.id)
        return <option key={member.id} value={member.id} disabled={!value.manualOverride && candidate?.eligibility !== "eligible"}>{member.name}{candidate ? candidate.eligibility === "eligible" ? "" : ` · ${candidateExplanation(candidate)}` : " · not linked"}</option>
      })}
    </select>
    <label className="check-label"><input type="checkbox" checked={!!value.manualOverride} disabled={disabled} onChange={event => onChange({ ...value, manualOverride: event.target.checked, memberId: !event.target.checked && !result?.candidates.some(c => c.memberId === value.memberId && c.eligibility === "eligible") ? null : value.memberId })} />Assign manually for this task</label>
    <p className="small muted">{value.manualOverride ? "This is a one-task exception. It does not add a responsibility or qualification to this person." : result ? resolutionLabels[result.reason] : "Matching configuration needs recovery. Leave the task unassigned until it is resolved."}</p>
    {result?.reason === "backup_requires_confirmation" && <p className="small muted">Select the backup explicitly to confirm this assignment.</p>}
    <p className="small muted">Submitting confirms the selected assignee. Someone else's task still waits for them to claim it.</p>
  </div>
}
