import { useEffect, useId, useState, type FormEvent } from "react"
import type { MatchingRequirement } from "../contracts"
import { resolveMatchingAssignment } from "../resolve"
import type { MatchingSetupViewProps } from "../setupContracts"
import { candidateExplanation, resolutionLabels, setupId } from "./viewHelpers"

export function WorkflowPreview(props: MatchingSetupViewProps) {
  const requirements = props.document.matching.requirements
  const [selectedId, setSelectedId] = useState(() => requirements[0]?.id ?? setupId())
  const requirement = requirements.find(row => row.id === selectedId)
  return <section id="matching-preview" className="card matching-section" aria-labelledby="matching-preview-heading">
    <header><div><h2 id="matching-preview-heading">4. Preview an assignment</h2><p>Link each workflow step to one main responsibility. The same responsibility can serve different workflows.</p></div><button type="button" className="btn" disabled={!props.canEdit} onClick={() => setSelectedId(setupId())}>New workflow step</button></header>
    <div className="matching-bubbles" aria-label="Workflow steps">
      {requirements.map(row => <button key={row.id} type="button" className={`matching-bubble${selectedId === row.id ? " is-selected" : ""}`} aria-pressed={selectedId === row.id} onClick={() => setSelectedId(row.id)}>{row.title}{" "}<span>{row.workflowId}</span></button>)}
    </div>
    <StepEditor key={selectedId} {...props} requirement={requirement} requirementId={selectedId} />
  </section>
}

function stepFields(requirement: MatchingRequirement | undefined, requirementId: string) {
  return { workflowId: requirement?.workflowId ?? "", stepId: requirement?.stepId ?? requirementId, title: requirement?.title ?? "", responsibilityId: requirement?.responsibilityId ?? "", status: requirement?.status ?? "draft" as MatchingRequirement["status"] }
}

function StepEditor(props: MatchingSetupViewProps & { requirement?: MatchingRequirement; requirementId: string }) {
  const { document: workspace, requirement, requirementId, canEdit } = props
  const [fields, setFields] = useState(() => stepFields(requirement, requirementId))
  const id = useId()
  useEffect(() => setFields(stepFields(requirement, requirementId)), [requirement?.id, requirement?.revision])
  const dirty = JSON.stringify(fields) !== JSON.stringify(stepFields(requirement, requirementId))
  const save = (event: FormEvent) => {
    event.preventDefault()
    props.onCommand({ type: "requirement.upsert", value: {
      id: requirementId, workflowId: fields.workflowId.trim(), stepId: fields.stepId.trim(), title: fields.title.trim(),
      responsibilityId: fields.responsibilityId || null, status: fields.status, origin: requirement?.origin ?? "manual",
    } })
  }
  const result = requirement ? resolveMatchingAssignment(workspace.matching, workspace.references, { taskId: `setup-preview-${requirementId}`, workflowId: requirement.workflowId, stepId: requirement.stepId }) : null
  const name = (memberId: string) => workspace.references.members.find(member => member.id === memberId)?.name ?? memberId
  return <div className="matching-preview-grid">
    <form className="matching-form" onSubmit={save}>
      <h3>{requirement ? "Step responsibility" : "New workflow step"}</h3>
      <label htmlFor={`${id}-workflow`}>Workflow</label><input id={`${id}-workflow`} value={fields.workflowId} maxLength={200} required disabled={!canEdit || !!requirement} placeholder="e.g. Spring showcase" onChange={event => setFields({ ...fields, workflowId: event.target.value })} />
      <label htmlFor={`${id}-title`}>Step title</label><input id={`${id}-title`} value={fields.title} maxLength={180} required disabled={!canEdit} onChange={event => setFields({ ...fields, title: event.target.value })} />
      <label htmlFor={`${id}-duty`}>Main responsibility</label><select id={`${id}-duty`} value={fields.responsibilityId} disabled={!canEdit} onChange={event => setFields({ ...fields, responsibilityId: event.target.value })}><option value="">Not linked yet</option>{workspace.matching.responsibilities.map(duty => <option key={duty.id} value={duty.id} disabled={duty.status === "archived"}>{duty.title}{duty.status === "confirmed" ? "" : ` · ${duty.status}`}</option>)}</select>
      <label htmlFor={`${id}-status`}>Step review</label><select id={`${id}-status`} value={fields.status} disabled={!canEdit} onChange={event => setFields({ ...fields, status: event.target.value as MatchingRequirement["status"] })}><option value="draft">Draft · needs review</option><option value="confirmed">Confirmed link</option><option value="needs_split">Compound work · needs splitting or coordination</option></select>
      <button type="submit" className="btn btn-primary" disabled={!canEdit || !fields.workflowId.trim() || !fields.stepId.trim() || !fields.title.trim() || (fields.status === "confirmed" && !fields.responsibilityId) || (!!requirement && !dirty)}>Save step link</button>
      {dirty && requirement && <p className="matching-muted">Save the step link to update the preview.</p>}
    </form>
    <div className="matching-result" aria-live="polite" data-testid="matching-assignment-result">
      <h3>Assignment preview</h3>
      {!result ? <p className="matching-muted">Save a workflow step to see its candidates and suggested person.</p> : <>
        <p className="matching-result-title">{result.ownerId ? `Confirmed owner: ${name(result.ownerId)}` : result.suggestedOwnerId ? `Suggested: ${name(result.suggestedOwnerId)}` : "Needs a decision"}</p>
        <p>{resolutionLabels[result.reason]}</p>
        {result.existingOwnerId && !result.ownerId && <p className="matching-warning">Existing owner: {name(result.existingOwnerId)}. Review required; nobody has been substituted.</p>}
        <p className="matching-muted">This preview does not create a task or confirm that someone has accepted it.</p>
        <h4>Candidate check</h4>
        {result.candidates.length ? <ul className="matching-candidate-list">{result.candidates.map(candidate => <li key={candidate.memberId}><strong>{candidate.memberName ?? candidate.memberId}</strong><span>{candidateExplanation(candidate)}</span>{candidate.roleIds.length > 0 && <small>{candidate.roleIds.map(roleId => workspace.references.roles.find(role => role.id === roleId)?.title ?? roleId).join(" · ")}</small>}{candidate.via.includes("direct") && <small>Direct responsibility link</small>}</li>)}</ul> : <p className="matching-muted">No usable candidate list yet. Review the responsibility and people above.</p>}
      </>}
    </div>
  </div>
}
