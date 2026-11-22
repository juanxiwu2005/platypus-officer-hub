import { useEffect, useId, useMemo, useState } from "react"
import type { DemoState, Event, Role, StepTemplate, WorkflowBranch } from "../../data/types"
import { addDays } from "../../lib/dates"
import { computeSchedule } from "../../engine/schedule"
import type { Forecast } from "../../engine/forecast"
import { MAX_STEPS, checkWorkflow, isLocked, newStepKey, ownerOfStep, removeStep, ruleList, stepsAsNodes, type WorkflowIssue } from "../../engine/workflow"
import { roleLabels } from "../../data/structure"
import { MetroChart, type EditPort } from "../flow/MetroChart"
import { insertFlowBranch, insertFlowStep } from "../../lib/flowEdit"
import { descendantsOf, type StepEdit } from "../../lib/stepOrder"
import type { Node } from "../../data/types"
import { WorkflowIssues } from "./WorkflowReview"
import { useRail } from "../rail/RailContext"
import { DEFAULT_WORKFLOW_BRANCHES, branchConditions, placementOf, resolveBranches } from "../../engine/workflowBranches"
import { deletionReason } from "../../engine/workflowPolicy"
import { WorkflowEffortInput } from "./WorkflowEffortInput"
import { workflowStepKind } from "../../engine/workflowStepKind"
import { reassignWorkflowStep } from "../../engine/workflowRoleBranches"

/**
 * The club's event workflow on the same chart as a real event's Flow tab: five
 * pre-event routes fan out from Start and meet at Full Check, left to right.
 * Drag a step onto a ◆, double-click a step to add or delete a task. Selecting a step opens its details
 * beside the chart, so workflow timing can be adjusted without losing the graph.
 * Everything is checked by the engine (engine/workflow.ts): steps and links ASU rules need cannot be removed, and a change that breaks one is
 * marked on the chart and has to be fixed before setup continues.
 */
const withEdits = (steps: StepTemplate[], edits: StepEdit[]): StepTemplate[] => {
  const by = new Map(edits.map(e => [e.id, e.patch]))
  return steps.map(s => { const p = by.get(s.key); return p ? { ...s, ...(p.dependsOn ? { dependsOn: p.dependsOn } : {}), ...(p.estDays !== undefined ? { estDays: p.estDays } : {}), ...(p.phase ? { phase: p.phase } : {}), ...(p.placement ? { placement: p.placement } : {}), ...(p.cond !== undefined ? { cond: p.cond ?? undefined } : {}), ...(p.startPolicy ? { startPolicy: p.startPolicy } : {}), ...(p.stepKind !== undefined ? { stepKind: p.stepKind ?? undefined } : {}) } : s })
}
const NO_FORECAST: Forecast = { nodes: {}, events: {} }

export function WorkflowPanel({ state, steps, branches, roles, issues, onChange }: { state: DemoState; steps: StepTemplate[]; branches?: WorkflowBranch[]; roles: Role[]; issues: WorkflowIssue[]; onChange: (steps: StepTemplate[], branches?: WorkflowBranch[]) => void }) {
  const [selected, setSelected] = useState<string | null>(null)
  const rail = useRail()
  const label = useMemo(() => roleLabels(roles), [roles])
  const currentBranches = useMemo(() => resolveBranches(steps, branches), [steps, branches])
  const change = (next: StepTemplate[], nextBranches = currentBranches) => {
    const previous = new Set(steps.map(step => placementOf(step).branchId))
    const remaining = new Set(next.map(step => placementOf(step).branchId))
    const defaults = new Set(DEFAULT_WORKFLOW_BRANCHES.map(branch => branch.id))
    // A custom branch disappears with its final task; unrelated old metadata is preserved.
    onChange(next, nextBranches.filter(branch => defaults.has(branch.id) || !previous.has(branch.id) || remaining.has(branch.id)))
  }
  const graphChange = (next: StepTemplate[], nextBranches = currentBranches) => {
    const blocked = (items: StepTemplate[], definitions: WorkflowBranch[]) => checkWorkflow(items, roles, undefined, definitions).filter(issue => issue.level === "blocked").map(issue => `${issue.key ?? ""}:${issue.text}`)
    const existing = new Set(blocked(steps, currentBranches))
    if (blocked(next, nextBranches).some(issue => !existing.has(issue))) return false
    change(next, nextBranches)
    return true
  }
  // The workflow shown as a sample event, so the same chart (and the same layout) draws it. Its dates are never shown.
  const sample = useMemo(() => {
    const ev: Event = { id: "wf", name: "Sample event", date: addDays(state.today, 56), type: "social", headcount: 30, venue: "campus", food: "none", funding: "none", speaker: false, checks: {}, goalId: null, playbookId: "asu-event-v2", workflowBranches: currentBranches }
    const s: DemoState = { ...state, roles, people: [], events: [ev], nodes: stepsAsNodes(steps, "wf") }
    return { s, sched: computeSchedule(s) }
  }, [state.today, steps, roles, currentBranches])
  const marks = useMemo(() => Object.fromEntries(issues.filter(i => i.key).map(i => [i.key!, i.level === "blocked" ? "error" as const : "warn" as const])), [issues])
  const byKey = new Map(steps.map(s => [s.key, s]))
  const ownerName = (key: string) => { const r = byKey.get(key) && ownerOfStep(byKey.get(key)!, roles); return r ? label.get(r.id) ?? r.displayName : "No owner" }
  const port: EditPort = {
    snapshot: () => structuredClone({ steps, branches: currentBranches }),
    restore: snap => { const previous = snap as { steps: StepTemplate[]; branches: WorkflowBranch[] }; change(previous.steps, previous.branches); setSelected(null) },
    applyEdits: edits => graphChange(withEdits(steps, edits)),
    addStep: (key, uId, vId, target) => {
      if (!target || steps.length >= MAX_STEPS) return false
      const ref = byKey.get(target.referenceId ?? uId ?? vId ?? "")
      const fresh: StepTemplate = { key, title: "New step", fn: ref?.fn ?? "programs", ownerRoleId: ref?.ownerRoleId ?? null, phase: ref?.phase ?? "prepare", stepKind: workflowStepKind(ref ?? {}, currentBranches), estDays: 1, tier: "light", dependsOn: [], why: "Added by the club.", source: "Added in the workflow chart", custom: true }
      const existing = stepsAsNodes(steps, "wf")
      const r = insertFlowStep(existing, stepsAsNodes([fresh], "wf")[0], target, currentBranches)
      if (r.error) return false
      return graphChange(withEdits([...steps, fresh], r.edits))
    },
    addBranch: (branch, key, title) => {
      if (steps.length >= MAX_STEPS) return false
      const role = roles.find(candidate => candidate.id === branch.defaultRoleId)
      const fresh: StepTemplate = { key, title, fn: role?.fn ?? "programs", ownerRoleId: role?.id ?? null, phase: branch.side === "after_event" ? "close" : "prepare", stepKind: branchConditions(branch).length ? "situation" : "core", estDays: 1, tier: "light", dependsOn: [], why: "Added by the club.", source: "Added in the workflow chart", custom: true }
      const r = insertFlowBranch(stepsAsNodes(steps, "wf"), stepsAsNodes([fresh], "wf")[0], branch, currentBranches)
      if (r.error) return false
      return graphChange(withEdits([...steps, fresh], r.edits), [...currentBranches, branch])
    },
    removeStep: key => { const step = byKey.get(key); if (!step || deletionReason(step) || !graphChange(removeStep(steps, key))) return false; setSelected(null); return true },
    newId: () => newStepKey(steps, "new step"),
    template: {
      sublabel: n => ownerName(n.id),
      lines: n => { const s = byKey.get(n.id); return [s?.title ?? n.title, s?.why ?? n.why, `Done by ${ownerName(n.id)}`, `${s?.estDays ?? 0} day${s?.estDays === 1 ? "" : "s"} of work`] },
      marks,
    },
  }
  const step = selected ? byKey.get(selected) : undefined
  const selectStep = (id: string) => { setSelected(id); rail.show({ kind: "workflow" }) }
  const closeStep = () => { setSelected(null); rail.closeDetail() }
  useEffect(() => {
    if (!step) return
    rail.setWorkflowDetail(<StepPanel key={step.key} step={step} steps={steps} branches={currentBranches} roles={roles} label={label} onChange={change} onClose={closeStep} />)
    return () => rail.setWorkflowDetail(null)
  // The content deliberately refreshes whenever the editable template changes.
  }, [step, steps, roles, label, onChange, currentBranches])
  return <>
    <WorkflowIssues issues={issues} />
    <p className="small muted">Look at the chart first: it reads left to right in the order the work happens. Drag a step onto a ◆ to move it, double-click a step to add or delete one. Click a step for its details.</p>
    <div className="workflow-editor"><div className="workflow-editor-flow"><MetroChart key="wf" state={sample.s} sched={sample.sched} forecast={NO_FORECAST} eventId="wf" selectedId={selected} onSelect={selectStep} canEdit alwaysEdit port={port} /></div></div>
  </>
}

/** One step's details: name, who does it, days of work, what it waits for. */
function StepPanel({ step, steps, branches, roles, label, onChange, onClose }: { step: StepTemplate; steps: StepTemplate[]; branches: WorkflowBranch[]; roles: Role[]; label: Map<string, string>; onChange: (steps: StepTemplate[], branches?: WorkflowBranch[]) => void; onClose: () => void }) {
  const nodes: Node[] = stepsAsNodes(steps, "wf")
  const set = (p: Partial<StepTemplate>) => onChange(steps.map(s => s.key === step.key ? { ...s, ...p } : s), branches)
  const [roleError, setRoleError] = useState<string | null>(null)
  const roleErrorId = useId()
  const assignRole = (roleId: string) => {
    const result = reassignWorkflowStep(steps, branches, roles, step.key, roleId)
    if (result.error) { setRoleError(result.error); return }
    setRoleError(null)
    onChange(result.steps, result.branches)
  }
  const doers = roles.filter(r => r.fn !== "advisor")
  const owner = ownerOfStep(step, roles)
  const locked = isLocked(step)
  const cannotRemove = deletionReason(step)
  const waits = (step.dependsOn ?? []).map(k => steps.find(s => s.key === k)).filter((x): x is StepTemplate => !!x)
  const blocked = descendantsOf(nodes, step.key)
  const addable = steps.filter(x => x.key !== step.key && !(step.dependsOn ?? []).includes(x.key) && !blocked.has(x.key))
  return <section className="card form-stack wf-detail" data-testid="workflow-step-panel" aria-label={`Details: ${step.title}`}>
    <header><h3 className="org-h">Step details</h3><button type="button" className="btn small btn-quiet" onClick={onClose}>Close</button></header>
    <div className="form-grid">
      {/* TODO: Connect saved step kinds to event intake choices in a later change; current activation conditions stay unchanged. */}
      <label>Step type<select value={workflowStepKind(step, branches)} onChange={event => { const stepKind = event.target.value; if (stepKind === "core" || stepKind === "situation") set({ stepKind }) }}><option value="core">Core event step</option><option value="situation">Situation-based step</option></select></label>
      <label>Step name<input type="text" value={step.title} maxLength={120} onChange={e => set({ title: e.target.value })} /></label>
      <label>Done by<select value={owner?.id ?? ""} aria-invalid={!!roleError || undefined} aria-describedby={roleError ? roleErrorId : undefined} onChange={e => assignRole(e.target.value)}>
        {!owner && <option value="">No owner</option>}
        {doers.map(r => <option key={r.id} value={r.id} title={r.displayName}>{label.get(r.id)}</option>)}
      </select></label>
      {roleError && <p id={roleErrorId} role="alert" className="small late-text">{roleError}</p>}
      <WorkflowEffortInput value={step.estDays} onCommit={set} />
      {!locked && step.phase !== "close" && <label>Target timing (days before event)<input type="number" inputMode="numeric" min={0} max={180} value={step.anchor?.kind === "target" ? step.anchor.days : ""} placeholder="From dependencies" onChange={e => { const days = e.target.value === "" ? null : Math.max(0, Math.min(180, Math.round(Number(e.target.value) || 0))); set({ anchor: days === null ? undefined : { kind: "target", days, unit: "calendar", label: "Club workflow timing" } }) }} /></label>}
    </div>
    <label>Task description<textarea rows={3} maxLength={400} value={step.why} onChange={e => set({ why: e.target.value })} placeholder="Explain what this step accomplishes." /></label>
    {locked && <p className="small muted">This step comes from ASU rule {ruleList(step) || "deadlines"}: it stays, in this phase, with its deadline. You can rename it and change who does it and how long it takes.</p>}
    <div className="step-links small">
      <span className="muted">Waits for:</span>{" "}
      {waits.length === 0 && <span className="muted">nothing</span>}
      {waits.map(w => <span key={w.key} className="tag-chip step-chip">{w.title} <button type="button" className="link" aria-label={`Remove: ${step.title} no longer waits for ${w.title}`} onClick={() => set({ dependsOn: (step.dependsOn ?? []).filter(d => d !== w.key) })}>×</button></span>)}
      <select className="step-add" aria-label={`Add a step that ${step.title} waits for`} value="" onChange={e => { if (e.target.value) set({ dependsOn: [...(step.dependsOn ?? []), e.target.value] }) }}>
        <option value="">+ Waits for…</option>
        {addable.map(x => <option key={x.key} value={x.key}>{x.title}</option>)}
      </select>
    </div>
    {!locked && <div className="action-row"><button type="button" className="btn small" title={cannotRemove ?? undefined} onClick={() => { if (cannotRemove) return; onChange(removeStep(steps, step.key)); onClose() }} disabled={!!cannotRemove || steps.length <= 1 || steps.length > MAX_STEPS + 1}>Delete this step</button>{cannotRemove && <span className="small muted">{cannotRemove}</span>}</div>}
  </section>
}
