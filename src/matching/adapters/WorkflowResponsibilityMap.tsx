import { useEffect, useId, useState } from "react"
import type { DemoState, StepTemplate } from "../../data/types"
import { EVENT_STEPS } from "../../engine/playbooks"
import { canLead, isOfficer } from "../../data/permissions"
import type { MatchingCommand, MatchingRequirement, MatchingState } from "../contracts"
import { eventMatchingWorkflowId, validOrganizationMatching } from "./organization"
import { STANDARD_MATCHING_STEPS, standardRequirementCommands } from "./steps"

export function WorkflowResponsibilityMap({ state, onCommand }: { state: DemoState; onCommand: (command: MatchingCommand) => void }) {
  const [workflow, setWorkflow] = useState(() => eventMatchingWorkflowId(state))
  const matching = validOrganizationMatching(state)
  const id = useId()
  const editable = canLead(state) && state.people.some(person => person.id === state.viewerId && isOfficer(person))
  const steps = workflow === "club-event" && state.org.eventWorkflow ? state.org.eventWorkflow.steps : EVENT_STEPS
  useEffect(() => { if (workflow === "club-event" && !state.org.eventWorkflow) setWorkflow("seo-event") }, [workflow, state.org.eventWorkflow])
  if (!matching) return <section className="card matching-section"><h2>Workflow responsibilities</h2><p>Initialize or recover this organization's responsibility settings before linking workflow steps.</p></section>
  const missing = standardRequirementCommands(matching, workflow, steps)
  return <section className="card matching-section" aria-labelledby={`${id}-heading`} data-testid="workflow-responsibility-map">
    <header><div><h2 id={`${id}-heading`}>Workflow responsibilities</h2><p>Review each step's main responsibility. Missing and compound links stay visible; no job-title fallback is used.</p></div></header>
    <label htmlFor={`${id}-workflow`}>Workflow to link</label><select id={`${id}-workflow`} value={workflow} onChange={event => setWorkflow(event.target.value)}>
      <option value="seo-event">Standard event · {EVENT_STEPS.length} possible steps</option>
      {state.org.eventWorkflow && <option value="club-event">Your custom event · {state.org.eventWorkflow.steps.length} possible steps</option>}
    </select>
    <p>{steps.length - missing.length} of {steps.length} steps have a saved review record. A saved record may still be unresolved.</p>
    <button type="button" className="btn" disabled={!editable || missing.length === 0} onClick={() => missing.forEach(onCommand)}>Add missing step links</button>
    <div className="matching-role-list">{steps.map(step => <StepMapping key={`${workflow}-${step.key}`} matching={matching} step={step} workflowId={workflow} onCommand={onCommand} editable={editable} />)}</div>
  </section>
}

function StepMapping({ matching, step, workflowId, onCommand, editable }: { matching: MatchingState; step: StepTemplate; workflowId: string; onCommand: (command: MatchingCommand) => void; editable: boolean }) {
  const requirement = matching.requirements.find(row => row.workflowId === workflowId && row.stepId === step.key)
  const standard = STANDARD_MATCHING_STEPS.find(row => row.stepId === step.key)
  const [responsibilityId, setResponsibilityId] = useState(requirement?.responsibilityId ?? "")
  const [status, setStatus] = useState<MatchingRequirement["status"]>(requirement?.status ?? standard?.status ?? "draft")
  const id = useId()
  useEffect(() => { setResponsibilityId(requirement?.responsibilityId ?? ""); setStatus(requirement?.status ?? standard?.status ?? "draft") }, [requirement?.revision, requirement?.id])
  const dirty = responsibilityId !== (requirement?.responsibilityId ?? "") || status !== (requirement?.status ?? standard?.status ?? "draft")
  const confirmed = matching.responsibilities.some(row => row.id === responsibilityId && row.status === "confirmed")
  return <details className="matching-details">
    <summary>{step.title}<span className="matching-muted"> · {requirement?.status === "confirmed" ? "Confirmed link" : requirement?.status === "needs_split" || !requirement && standard?.status === "needs_split" ? "Needs splitting or coordination" : "Needs review"}</span></summary>
    <p>{standard?.description ?? step.why}</p><p className="matching-muted">Source: {step.source}</p>
    <form className="matching-form" onSubmit={event => { event.preventDefault(); onCommand({ type: "requirement.upsert", value: { id: requirement?.id ?? crypto.randomUUID(), workflowId, stepId: step.key, title: step.title, responsibilityId: responsibilityId || null, status, origin: requirement?.origin ?? "manual" } }) }}>
      <label htmlFor={`${id}-duty`}>Main responsibility</label><select id={`${id}-duty`} value={responsibilityId} disabled={!editable} onChange={event => setResponsibilityId(event.target.value)}><option value="">Not linked yet</option>{matching.responsibilities.map(row => <option key={row.id} value={row.id} disabled={row.status === "archived"}>{row.title}{row.status === "confirmed" ? "" : ` · ${row.status}`}</option>)}</select>
      <label htmlFor={`${id}-status`}>Review outcome</label><select id={`${id}-status`} value={status} disabled={!editable} onChange={event => setStatus(event.target.value as MatchingRequirement["status"])}><option value="draft">Needs review</option><option value="confirmed">Confirmed main responsibility</option><option value="needs_split">Split or clarify coordination first</option></select>
      <button type="submit" className="btn" disabled={!editable || status === "confirmed" && !confirmed || !!requirement && !dirty}>Save workflow link</button>
    </form>
  </details>
}
