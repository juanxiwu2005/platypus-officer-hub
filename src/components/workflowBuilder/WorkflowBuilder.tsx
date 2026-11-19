import { useEffect, useId, useMemo, useState, type FormEvent } from "react"
import type { DemoState, StepTemplate, WorkflowBranch } from "../../data/types"
import { MAX_STEPS } from "../../engine/workflow"
import { isAsuStep } from "../../engine/workflowPolicy"
import { branchConditions, placementOf } from "../../engine/workflowBranches"
import { workflowStepKind } from "../../engine/workflowStepKind"
import { roleLabels } from "../../data/structure"
import { addDays } from "../../lib/dates"
import { useRail } from "../rail/RailContext"
import { WorkflowEffortInput } from "../setup/WorkflowEffortInput"
import { WorkflowBranchDialog, type BranchDraft } from "../setup/WorkflowBranchDialog"
import { builderDeletionReason, createBuilderStep, deleteBuilderStep, editError, graphError, insertBuilderStep, newBuilderStepId, tLabel, type BuilderPolicy, type BuilderSnapshot, type InsertPosition } from "./model"
import { buildTimeline, HEADER_HEIGHT, LABEL_WIDTH, type BuilderTeam } from "./timeline"
import "./workflowBuilder.css"

export interface WorkflowBuilderProps {
  state: DemoState
  steps: StepTemplate[]
  branches?: WorkflowBranch[]
  stepTeams: Record<string, string>
  teams: BuilderTeam[]
  policy: BuilderPolicy
  onChange: (steps: StepTemplate[], branches: WorkflowBranch[] | undefined, stepTeams: Record<string, string>) => void
}

/** Settings edits definitions; neither this component nor its preview creates executable Plan tasks. */
export function WorkflowBuilder({ state, steps, branches, stepTeams, teams, policy, onChange }: WorkflowBuilderProps) {
  const [view, setView] = useState<"timeline" | "quick">("timeline")
  const [selected, setSelected] = useState<string | null>(null)
  const [history, setHistory] = useState<BuilderSnapshot[]>([])
  const [error, setError] = useState<string | null>(null)
  const [connectFrom, setConnectFrom] = useState<string | null>(null)
  const [addBranch, setAddBranch] = useState(false)
  const [previewDate, setPreviewDate] = useState(() => addDays(state.today, 42))
  const rail = useRail()
  const markerId = useId().replace(/:/g, "")
  const snapshot = useMemo(() => ({ steps, branches, stepTeams }), [steps, branches, stepTeams])
  const timeline = useMemo(() => buildTimeline(state, snapshot, teams, policy, previewDate), [state, snapshot, teams, policy, previewDate])
  const teamIds = new Set(teams.map(team => team.id))
  const unmapped = steps.filter(step => !teamIds.has(stepTeams[step.key]))
  const step = steps.find(candidate => candidate.key === selected)
  const labels = useMemo(() => roleLabels(state.roles), [state.roles])
  const commit = (next: BuilderSnapshot): boolean => {
    const problem = editError(snapshot, next, policy, state.roles)
    if (problem) { setError(problem); return false }
    if (JSON.stringify(snapshot) === JSON.stringify(next)) return true
    setHistory(previous => [...previous.slice(-29), structuredClone(snapshot)])
    setError(null)
    onChange(next.steps, next.branches, next.stepTeams)
    return true
  }
  const select = (key: string) => {
    if (connectFrom) {
      const target = steps.find(candidate => candidate.key === key)
      if (target && commit({ ...snapshot, steps: steps.map(candidate => candidate.key === key ? { ...candidate, dependsOn: [...new Set([...(candidate.dependsOn ?? []), connectFrom])] } : candidate) })) setConnectFrom(null)
      return
    }
    setSelected(key)
    rail.show({ kind: "workflow" })
  }
  const close = () => { setSelected(null); rail.closeDetail() }
  const insert = (position: InsertPosition) => {
    if (!step) return
    const next = insertBuilderStep(snapshot, step.key, position)
    if (commit(next)) select(next.steps[next.steps.length - 1].key)
  }
  const makeBranch = (draft: BranchDraft) => {
    if (steps.length >= MAX_STEPS) return `A workflow can have up to ${MAX_STEPS} tasks.`
    const branch: WorkflowBranch = { id: newBuilderStepId(), title: draft.title, side: draft.side, conditions: draft.conditions, defaultRoleId: draft.defaultRoleId, order: Math.max(0, ...(branches ?? []).map(item => item.order)) + 1 }
    const role = state.roles.find(candidate => candidate.id === draft.defaultRoleId)
    const fresh = createBuilderStep(draft.firstStepTitle)
    fresh.placement = { branchId: branch.id, order: 0 }
    fresh.phase = draft.side === "after_event" ? "close" : "prepare"
    fresh.ownerRoleId = role?.id ?? null
    fresh.fn = role?.fn ?? "programs"
    fresh.stepKind = branch.conditions?.length ? "situation" : "core"
    if (draft.side === "after_event") fresh.anchor = { kind: "target", days: -2, unit: "calendar", label: "Workflow target" }
    const next = { ...snapshot, steps: [...steps, fresh], branches: [...(branches ?? []), branch] }
    if (!commit(next)) return "This branch would conflict with a protected workflow step."
    setAddBranch(false); select(fresh.key)
    return null
  }
  useEffect(() => {
    if (!step) { rail.setWorkflowDetail(null); return }
    rail.setWorkflowDetail(<BuilderTaskDetails key={step.key} step={step} snapshot={snapshot} state={state} teams={teams} policy={policy} onChange={commit} onInsert={insert} onClose={close} />)
    return () => rail.setWorkflowDetail(null)
    // The controlled definition refreshes Details after edits, restores and view changes.
  }, [step, snapshot, state.roles, teams, policy, onChange])

  const byKey = new Map(timeline.boxes.map(box => [box.step.key, box]))
  return <section className="wfb form-stack" data-testid="workflow-builder" aria-label="Workflow builder">
    <div className="wfb-toolbar">
      <div className="wfb-view" role="group" aria-label="Editor view">
        <button type="button" className="btn small" aria-pressed={view === "timeline"} onClick={() => setView("timeline")}>Timeline</button>
        <button type="button" className="btn small" aria-pressed={view === "quick"} onClick={() => setView("quick")}>Quick entry</button>
      </div>
      <div className="action-row">
        <button type="button" className="btn small" disabled={!history.length} onClick={() => {
          const previous = history[history.length - 1]
          if (!previous) return
          setHistory(items => items.slice(0, -1)); setError(null); setConnectFrom(null)
          onChange(previous.steps, previous.branches, previous.stepTeams)
          if (selected && !previous.steps.some(candidate => candidate.key === selected)) setSelected(null)
        }}>Undo edit</button>
        <button type="button" className="btn small" aria-pressed={!!connectFrom} disabled={!step && !connectFrom} onClick={() => setConnectFrom(connectFrom ? null : selected)}>Connect</button>
        <button type="button" className="btn small" onClick={() => setAddBranch(true)}>Add branch</button>
        <button type="button" className="btn small primary" disabled={steps.length >= MAX_STEPS} onClick={() => {
          const fresh = createBuilderStep("New task", step, branches)
          const next = { ...snapshot, steps: [...steps, fresh], stepTeams: { ...stepTeams, ...(step && stepTeams[step.key] ? { [fresh.key]: stepTeams[step.key] } : teams.length === 1 ? { [fresh.key]: teams[0].id } : {}) } }
          if (commit(next)) select(fresh.key)
        }}>+ Task</button>
      </div>
    </div>
    {error && <p className="small late-text" role="alert">{error}</p>}
    {connectFrom && <p className="small" role="status">Choose the task that waits for “{steps.find(candidate => candidate.key === connectFrom)?.title}”. <button type="button" className="link" onClick={() => setConnectFrom(null)}>Cancel connection</button></p>}
    {unmapped.length > 0 && <div className="wfb-unassigned" role="status"><span>{unmapped.length} task{unmapped.length === 1 ? " needs" : "s need"} a team:</span>{unmapped.map(candidate => <button type="button" className="link" key={candidate.key} onClick={() => select(candidate.key)}>{candidate.title || "Untitled task"}</button>)}</div>}
    {view === "quick" ? <QuickEntry state={state} snapshot={snapshot} teams={teams} onChange={commit} onSelect={select} selected={selected} /> : <>
      <p className="small muted wfb-hint">T0 = activity or target day. Arrows show prerequisites. Select a task to edit.</p>
      <label className="wfb-preview-date">Preview target day<input type="date" value={previewDate} onChange={event => { if (event.target.value) setPreviewDate(event.target.value) }} /></label>
      <div className="wfb-scroll" tabIndex={0} role="region" aria-label="Team timeline, scroll horizontally to explore">
        <div className="wfb-canvas" style={{ width: timeline.width, height: Math.max(HEADER_HEIGHT + 120, timeline.height) }}>
          <div className="wfb-time-axis" style={{ height: HEADER_HEIGHT }}><span className="wfb-axis-title">Team</span>{timeline.ticks.map(day => <span key={day} className="wfb-tick" style={{ left: timeline.xOf(day) }}>{tLabel(day)}</span>)}</div>
          <div className="wfb-zero" aria-hidden="true" style={{ left: timeline.xOf(0), top: HEADER_HEIGHT, height: Math.max(120, timeline.height - HEADER_HEIGHT) }} />
          {timeline.rows.map(row => <div key={row.team.id} className="wfb-lane" data-testid={`workflow-team-${row.team.id}`} style={{ top: row.top, height: row.height }}><div className="wfb-lane-label" style={{ width: LABEL_WIDTH }}>{row.team.name}<button type="button" className="link" aria-label={`Add task to ${row.team.name}`} onClick={() => {
            const fresh = createBuilderStep("New task")
            const next = { ...snapshot, steps: [...steps, fresh], stepTeams: { ...stepTeams, [fresh.key]: row.team.id } }
            if (commit(next)) select(fresh.key)
          }}>+ Task</button></div></div>)}
          <svg className="wfb-links" width={timeline.width} height={Math.max(HEADER_HEIGHT + 120, timeline.height)} aria-label="Task dependency connections" role="img">
            <title>Arrows connect prerequisites to the tasks that wait for them</title>
            <defs><marker id={markerId} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" /></marker></defs>
            {timeline.boxes.flatMap(target => (target.step.dependsOn ?? []).flatMap(id => {
              const source = byKey.get(id)
              if (!source) return []
              const sx = source.x + source.width, sy = source.y + 40, tx = target.x, ty = target.y + 40
              const middle = sx < tx ? (sx + tx) / 2 : Math.max(sx, tx + target.width) + 16
              const path = sx < tx ? `M${sx},${sy} H${middle} V${ty} H${tx - 3}` : `M${sx},${sy} H${middle} V${ty - 50} H${tx - 14} V${ty} H${tx - 3}`
              return <path key={`${id}:${target.step.key}`} data-testid="workflow-dependency" className={selected === id || selected === target.step.key ? "wfb-link is-selected" : "wfb-link"} d={path} markerEnd={`url(#${markerId})`}><title>{source.step.title} → {target.step.title}</title></path>
            }))}
          </svg>
          {timeline.boxes.map(box => <button key={box.step.key} type="button" data-testid={`workflow-task-${box.step.key}`} aria-label={`Edit ${box.step.title}`} aria-pressed={selected === box.step.key} className={`wfb-task ${workflowStepKind(box.step, branches) === "situation" ? "is-situation" : "is-core"} ${selected === box.step.key ? "is-selected" : ""}`} style={{ left: box.x, top: box.y, width: box.width }} onClick={() => select(box.step.key)}>
            <strong>{box.step.title || "Untitled task"}</strong><span aria-hidden="true">{box.step.ownerRoleId ? labels.get(box.step.ownerRoleId) ?? "Missing role" : "Unassigned role"}</span><span aria-hidden="true">{box.step.estDays} workday{box.step.estDays === 1 ? "" : "s"} · {tLabel(box.start)} → {tLabel(box.finish)}</span>
          </button>)}
          {!teams.length && <p className="wfb-no-teams">Add teams from your organization settings to arrange tasks into lanes.</p>}
        </div>
      </div>
    </>}
    {addBranch && <WorkflowBranchDialog roles={state.roles} onClose={() => setAddBranch(false)} onAdd={makeBranch} />}
  </section>
}

function QuickEntry({ state, snapshot, teams, onChange, onSelect, selected }: { state: DemoState; snapshot: BuilderSnapshot; teams: BuilderTeam[]; onChange: (next: BuilderSnapshot) => boolean; onSelect: (id: string) => void; selected: string | null }) {
  const [names, setNames] = useState("")
  const [order, setOrder] = useState("sequential")
  const [team, setTeam] = useState(teams[0]?.id ?? "")
  const [role, setRole] = useState("")
  const [error, setError] = useState<string | null>(null)
  const labels = roleLabels(state.roles)
  const add = (event: FormEvent) => {
    event.preventDefault()
    const titles = names.split(/\r?\n/).map(name => name.trim()).filter(Boolean)
    if (!titles.length) { setError("Enter at least one task name."); return }
    if (titles.some(title => title.length > 120)) { setError("Keep task names to 120 characters."); return }
    if (titles.length + snapshot.steps.length > MAX_STEPS) { setError(`A workflow can have up to ${MAX_STEPS} tasks.`); return }
    const reference = snapshot.steps.find(step => step.key === selected)
    const chosenRole = state.roles.find(candidate => candidate.id === role)
    const fresh = titles.map(title => createBuilderStep(title, reference, snapshot.branches))
    fresh.forEach((step, index) => {
      if (chosenRole) { step.ownerRoleId = chosenRole.id; step.fn = chosenRole.fn }
      step.dependsOn = order === "sequential" && index > 0 ? [fresh[index - 1].key] : reference ? [reference.key] : []
    })
    const stepTeams = { ...snapshot.stepTeams }
    const assignedTeam = team || (reference ? snapshot.stepTeams[reference.key] : "")
    if (assignedTeam) fresh.forEach(step => { stepTeams[step.key] = assignedTeam })
    if (onChange({ ...snapshot, steps: [...snapshot.steps, ...fresh], stepTeams })) { setNames(""); setError(null) }
  }
  return <div className="wfb-quick form-stack">
    <form className="form-stack" onSubmit={add}>
      <label>Task names<textarea aria-label="Task names" rows={4} value={names} onChange={event => setNames(event.target.value)} placeholder={"Agree visit\nConfirm transport\nShare briefing"} /></label>
      <div className="wfb-quick-fields">
        <label>Add as<select value={order} onChange={event => setOrder(event.target.value)}><option value="sequential">Sequential</option><option value="parallel">Parallel</option></select></label>
        <label>Assign team<select value={team} onChange={event => setTeam(event.target.value)}><option value="">Choose later</option>{teams.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <label>Assign role<select value={role} onChange={event => setRole(event.target.value)}><option value="">{selected ? "Use selected task's role" : "Choose later"}</option>{state.roles.filter(item => item.fn !== "advisor").map(item => <option value={item.id} key={item.id}>{labels.get(item.id)}</option>)}</select></label>
      </div>
      <p className="small muted">One task per line. {selected ? "New tasks follow the selected task and inherit its branch and type." : "Start with a short list; add details as needed."}</p>
      {error && <p className="small late-text" role="alert">{error}</p>}
      <div><button type="submit" className="btn primary">Add tasks</button></div>
    </form>
    <div className="wfb-table-scroll"><table className="tbl wfb-table"><caption className="sr-only">Workflow tasks and prerequisites</caption><thead><tr><th>Task</th><th>Team</th><th>Owner role</th><th>Workdays</th><th>Waits for</th></tr></thead><tbody>{snapshot.steps.map(step => <tr key={step.key}><td><button type="button" className="link" onClick={() => onSelect(step.key)}>{step.title || "Untitled task"}</button></td><td>{teams.find(item => item.id === snapshot.stepTeams[step.key])?.name ?? "Choose team"}</td><td>{step.ownerRoleId ? labels.get(step.ownerRoleId) ?? "Missing role" : "Choose role"}</td><td>{step.estDays}</td><td>{(step.dependsOn ?? []).map(id => snapshot.steps.find(candidate => candidate.key === id)?.title ?? "Missing task").join(", ") || "None"}</td></tr>)}</tbody></table></div>
  </div>
}

function BuilderTaskDetails({ step, snapshot, state, teams, policy, onChange, onInsert, onClose }: { step: StepTemplate; snapshot: BuilderSnapshot; state: DemoState; teams: BuilderTeam[]; policy: BuilderPolicy; onChange: (next: BuilderSnapshot) => boolean; onInsert: (position: InsertPosition) => void; onClose: () => void }) {
  const { steps, branches, stepTeams } = snapshot
  const patch = (value: Partial<StepTemplate>) => onChange({ ...snapshot, steps: steps.map(candidate => candidate.key === step.key ? { ...candidate, ...value } : candidate) })
  const labels = roleLabels(state.roles)
  const locked = isAsuStep(step)
  const cannotDelete = builderDeletionReason(step, policy)
  const waits = step.dependsOn ?? []
  const candidates = steps.filter(candidate => candidate.key !== step.key && !waits.includes(candidate.key) && !graphError(steps.map(item => item.key === step.key ? { ...item, dependsOn: [...waits, candidate.key] } : item)))
  const branch = branches?.find(candidate => candidate.id === placementOf(step).branchId)
  return <section className="form-stack wfb-details" data-testid="workflow-builder-details" aria-label={`Details: ${step.title}`}>
    <header className="wfb-detail-header"><h3>Task details</h3><button type="button" className="btn small btn-quiet" onClick={onClose}>Close</button></header>
    {/* TODO: Step classification is separate from activation. Future event intake changes must map reviewed facts to cond/branch conditions. */}
    <label>Step type<select value={workflowStepKind(step, branches)} onChange={event => patch({ stepKind: event.target.value as "core" | "situation" })}><option value="core">Core event step</option><option value="situation">Situation-based step</option></select></label>
    <label>Task name<input value={step.title} maxLength={120} onChange={event => patch({ title: event.target.value })} /></label>
    {/* Team grouping and accountable role intentionally remain independent. Moving lanes cannot rewrite business branches. */}
    <label>Team<select value={stepTeams[step.key] ?? ""} onChange={event => {
      const next = { ...stepTeams }
      if (event.target.value) next[step.key] = event.target.value
      else delete next[step.key]
      onChange({ ...snapshot, stepTeams: next })
    }}><option value="">Choose team</option>{teams.map(team => <option value={team.id} key={team.id}>{team.name}</option>)}</select></label>
    <label>Done by<select value={step.ownerRoleId ?? ""} onChange={event => { const role = state.roles.find(candidate => candidate.id === event.target.value); patch({ ownerRoleId: role?.id ?? null, ...(role ? { fn: role.fn } : {}) }) }}><option value="">Unassigned</option>{state.roles.filter(role => role.fn !== "advisor").map(role => <option value={role.id} key={role.id}>{labels.get(role.id)}</option>)}</select></label>
    <WorkflowEffortInput value={step.estDays} onCommit={patch} />
    <TargetInput step={step} locked={locked} onChange={patch} />
    <label>Details<textarea rows={4} maxLength={400} value={step.why} onChange={event => patch({ why: event.target.value })} /></label>
    {!!branches?.length && <label>Branch<select disabled={locked || (policy === "standard" && ["finalcheck", "checkin", "headcount"].includes(step.key))} value={placementOf(step).branchId} onChange={event => {
      const next = branches.find(candidate => candidate.id === event.target.value)
      patch({ placement: { branchId: event.target.value, order: placementOf(step).order }, ...(next ? { phase: next.side === "after_event" ? "close" : "prepare" } : {}) })
    }}><option value="main">Main</option>{branches.filter(candidate => candidate.id !== "main").map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.title}</option>)}</select></label>}
    {branch && branchConditions(branch).length > 0 && <p className="small muted">Included when all branch conditions match: {branchConditions(branch).join(", ")}.</p>}
    {locked && <p className="small muted">School rule deadlines and required prerequisites are protected.</p>}
    <div className="form-stack"><span className="small muted">Waits for · all must finish</span>{!waits.length && <span className="small">Nothing</span>}{waits.map(id => <div className="wfb-prerequisite small" key={id}><span>{steps.find(candidate => candidate.key === id)?.title ?? "Missing task"}</span><button type="button" className="link" aria-label={`Remove prerequisite ${steps.find(candidate => candidate.key === id)?.title ?? id}`} onClick={() => patch({ dependsOn: waits.filter(key => key !== id) })}>Remove</button></div>)}
      <label className="sr-only" htmlFor={`wfb-prerequisite-${step.key}`}>Add prerequisite</label><select id={`wfb-prerequisite-${step.key}`} aria-label="Add prerequisite" value="" onChange={event => { if (event.target.value) patch({ dependsOn: [...waits, event.target.value] }) }}><option value="">+ Prerequisite</option>{candidates.map(candidate => <option value={candidate.key} key={candidate.key}>{candidate.title}</option>)}</select>
    </div>
    <div className="action-row"><button type="button" className="btn small" onClick={() => onInsert("before")}>Add before</button><button type="button" className="btn small" onClick={() => onInsert("after")}>Add next</button><button type="button" className="btn small" onClick={() => onInsert("parallel")}>Add parallel</button></div>
    <div><button type="button" className="btn small" disabled={!!cannotDelete} title={cannotDelete ?? undefined} onClick={() => { if (!cannotDelete && onChange(deleteBuilderStep(snapshot, step.key))) onClose() }}>Delete task</button></div>
    {cannotDelete && <p className="small muted">{cannotDelete}</p>}
  </section>
}

function TargetInput({ step, locked, onChange }: { step: StepTemplate; locked: boolean; onChange: (patch: Partial<StepTemplate>) => void }) {
  const target = step.anchor?.kind === "target" || step.anchor?.kind === "rule" ? -step.anchor.days : step.timing ? -step.timing.dueDays : null
  const [raw, setRaw] = useState(target === null ? "" : String(target))
  const [invalid, setInvalid] = useState(false)
  useEffect(() => { setRaw(target === null ? "" : String(target)); setInvalid(false) }, [target])
  return <label>Finish by (T±)<input aria-label="Finish by (T±)" type="number" inputMode="numeric" step={1} min={-180} max={180} value={raw} disabled={locked} placeholder="From dependencies" aria-invalid={invalid || undefined} onChange={event => {
    const value = event.target.value
    setRaw(value)
    if (value === "") { setInvalid(false); onChange({ anchor: undefined, timing: undefined, startPolicy: "effort" }); return }
    const number = Number(value)
    if (!Number.isInteger(number) || number < -180 || number > 180) { setInvalid(true); return }
    setInvalid(false)
    onChange({ anchor: { kind: "target", days: -number, unit: "calendar", label: "Workflow target" }, timing: undefined, startPolicy: "effort" })
  }} /><span className="small muted">−7 means 7 calendar days before T0; +2 means 2 days after. Start is calculated from workdays and prerequisites.</span>{invalid && <span className="small late-text" role="alert">Enter a whole number from −180 to 180.</span>}</label>
}
