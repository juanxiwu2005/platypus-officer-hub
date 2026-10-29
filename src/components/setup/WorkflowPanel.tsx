import { useMemo, useState } from "react"
import type { DemoState, Event, Role, StepTemplate } from "../../data/types"
import { addDays } from "../../lib/dates"
import { computeSchedule } from "../../engine/schedule"
import type { Forecast } from "../../engine/forecast"
import { PHASE_LABEL } from "../../engine/playbooks"
import { MAX_STEPS, isLocked, newStepKey, ownerOfStep, removeStep, ruleList, stepsAsNodes, type WorkflowIssue } from "../../engine/workflow"
import { roleLabels } from "../../data/structure"
import { MetroChart, type EditPort } from "../flow/MetroChart"
import { moveBetween } from "../../lib/flowEdit"
import { MAX_DAYS, PHASES, descendantsOf, type StepEdit } from "../../lib/stepOrder"
import type { Node, Phase } from "../../data/types"
import { WorkflowIssues } from "./WorkflowReview"

/**
 * The club's event workflow on the same chart as a real event's Flow tab: one main line, parallel work on branches, left to right.
 * Drag a step onto a ◆, double-click a step or a line to add, delete or cut a link. A step's details are under the chart.
 * Everything is checked by the engine (engine/workflow.ts): steps and links ASU rules need cannot be removed, and a change that breaks one is
 * marked on the chart and has to be fixed before setup continues.
 */
const withEdits = (steps: StepTemplate[], edits: StepEdit[]): StepTemplate[] => {
  const by = new Map(edits.map(e => [e.id, e.patch]))
  return steps.map(s => { const p = by.get(s.key); return p ? { ...s, ...(p.dependsOn ? { dependsOn: p.dependsOn } : {}), ...(p.estDays !== undefined ? { estDays: p.estDays } : {}), ...(p.phase ? { phase: p.phase } : {}) } : s })
}
const NO_FORECAST: Forecast = { nodes: {}, events: {} }

export function WorkflowPanel({ state, steps, roles, issues, onChange }: { state: DemoState; steps: StepTemplate[]; roles: Role[]; issues: WorkflowIssue[]; onChange: (steps: StepTemplate[]) => void }) {
  const [selected, setSelected] = useState<string | null>(null)
  const label = useMemo(() => roleLabels(roles), [roles])
  // The workflow shown as a sample event, so the same chart (and the same layout) draws it. Its dates are never shown.
  const sample = useMemo(() => {
    const ev: Event = { id: "wf", name: "Sample event", date: addDays(state.today, 56), type: "social", headcount: 30, venue: "campus", food: "none", funding: "none", speaker: false, goalId: null, playbookId: "seo-event" }
    const s: DemoState = { ...state, roles, people: [], events: [ev], nodes: stepsAsNodes(steps, "wf") }
    return { s, sched: computeSchedule(s) }
  }, [state.today, steps, roles])
  const marks = useMemo(() => Object.fromEntries(issues.filter(i => i.key).map(i => [i.key!, i.level === "blocked" ? "error" as const : "warn" as const])), [issues])
  const byKey = new Map(steps.map(s => [s.key, s]))
  const ownerName = (key: string) => { const r = byKey.get(key) && ownerOfStep(byKey.get(key)!, roles); return r ? label.get(r.id) ?? r.displayName : "No owner" }
  const port: EditPort = {
    snapshot: () => structuredClone(steps),
    restore: snap => { onChange(snap as StepTemplate[]); setSelected(null) },
    applyEdits: edits => onChange(withEdits(steps, edits)),
    addStep: (key, uId, vId) => {
      const ref = byKey.get(uId ?? vId ?? "")
      const fresh: StepTemplate = { key, title: "New step", fn: ref?.fn ?? "programs", ownerRoleId: ref?.ownerRoleId ?? null, phase: ref?.phase ?? "prepare", estDays: 1, tier: "light", dependsOn: [], why: "Added by the club.", source: "Added in the workflow chart", custom: true }
      const nodes = stepsAsNodes([...steps, fresh], "wf")
      const r = moveBetween(nodes, key, uId, vId)
      onChange(withEdits([...steps, fresh], r.edits))
    },
    removeStep: key => { onChange(removeStep(steps, key)); setSelected(null) },
    newId: () => newStepKey(steps, "new step"),
    template: {
      sublabel: n => ownerName(n.id),
      lines: n => { const s = byKey.get(n.id); return [s?.title ?? n.title, `Done by ${ownerName(n.id)}`, `${s?.estDays ?? 0} day${s?.estDays === 1 ? "" : "s"} of work`, ...(s && isLocked(s) ? [`Needed by ASU rule ${ruleList(s) || "deadlines"}`] : [])] },
      marks,
    },
  }
  const step = selected ? byKey.get(selected) : undefined
  return <>
    <WorkflowIssues issues={issues} />
    <p className="small muted">Look at the chart first: it reads left to right in the order the work happens. Drag a step onto a ◆ to move it, double-click a step to add or delete one, double-click a line to cut a link. Click a step for its details.</p>
    <MetroChart key="wf" state={sample.s} sched={sample.sched} forecast={NO_FORECAST} eventId="wf" selectedId={selected} onSelect={setSelected} canEdit alwaysEdit port={port} />
    {step && <StepPanel step={step} steps={steps} roles={roles} label={label} onChange={onChange} onClose={() => setSelected(null)} />}
  </>
}

/** One step's details: name, who does it, days of work, what it waits for. */
function StepPanel({ step, steps, roles, label, onChange, onClose }: { step: StepTemplate; steps: StepTemplate[]; roles: Role[]; label: Map<string, string>; onChange: (s: StepTemplate[]) => void; onClose: () => void }) {
  const nodes: Node[] = stepsAsNodes(steps, "wf")
  const set = (p: Partial<StepTemplate>) => onChange(steps.map(s => s.key === step.key ? { ...s, ...p } : s))
  const doers = roles.filter(r => r.fn !== "advisor")
  const owner = ownerOfStep(step, roles)
  const locked = isLocked(step)
  const waits = (step.dependsOn ?? []).map(k => steps.find(s => s.key === k)).filter((x): x is StepTemplate => !!x)
  const blocked = descendantsOf(nodes, step.key)
  const addable = steps.filter(x => x.key !== step.key && !(step.dependsOn ?? []).includes(x.key) && !blocked.has(x.key))
  return <section className="card form-stack wf-detail" data-testid="workflow-step-panel" aria-label={`Details: ${step.title}`}>
    <header><h3 className="org-h">Step details</h3><button type="button" className="btn small btn-quiet" onClick={onClose}>Close</button></header>
    <div className="form-grid">
      <label>Step name<input type="text" value={step.title} maxLength={120} onChange={e => set({ title: e.target.value })} /></label>
      <label>Done by<select value={owner?.id ?? ""} onChange={e => set({ ownerRoleId: e.target.value, fn: roles.find(r => r.id === e.target.value)?.fn ?? step.fn })}>
        {!owner && <option value="">No owner</option>}
        {doers.map(r => <option key={r.id} value={r.id} title={r.displayName}>{label.get(r.id)}</option>)}
      </select></label>
      <label>Days of work<input type="number" inputMode="numeric" min={0} max={MAX_DAYS} value={step.estDays} onChange={e => set({ estDays: Math.max(0, Math.min(MAX_DAYS, Math.round(Number(e.target.value) || 0))) })} /></label>
      <label>Phase<select value={step.phase} disabled={locked} onChange={e => set({ phase: e.target.value as Phase })}>{PHASES.map(p => <option key={p} value={p}>{PHASE_LABEL[p]}</option>)}</select></label>
    </div>
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
    {!locked && <div className="action-row"><button type="button" className="btn small" onClick={() => { onChange(removeStep(steps, step.key)); onClose() }} disabled={steps.length <= 1 || steps.length > MAX_STEPS + 1}>Delete this step</button></div>}
  </section>
}
