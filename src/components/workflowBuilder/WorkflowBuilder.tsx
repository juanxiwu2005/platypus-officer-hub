import { useEffect, useId, useMemo, useState, type FormEvent } from "react"
import type { DemoState, StepTemplate, WorkflowBranch } from "../../data/types"
import { MAX_STEPS } from "../../engine/workflow"
import { isAsuStep } from "../../engine/workflowPolicy"
import { branchConditions, conditionLabel, placementOf, resolveBranches } from "../../engine/workflowBranches"
import { workflowStepKind } from "../../engine/workflowStepKind"
import { orderedWorkflowSteps, sequenceTeamStepsForDraft } from "../../engine/workflowSequence"
import { roleLabels } from "../../data/structure"
import { addDays } from "../../lib/dates"
import { useRail } from "../rail/RailContext"
import { WorkflowEffortInput } from "../setup/WorkflowEffortInput"
import { WorkflowBranchDialog, type BranchDraft } from "../setup/WorkflowBranchDialog"
import { builderDeletionReason, createBuilderStep, deleteBuilderStep, editError, graphError, insertTeamBuilderStep, newBuilderStepId, reorderTeamBuilderStep, type BuilderPolicy, type BuilderSnapshot } from "./model"
import { buildTimeline, HEADER_HEIGHT, LABEL_WIDTH, type BuilderTeam } from "./timeline"
import { TimelineTask } from "./TimelineTask"
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
export function WorkflowBuilder({ state, steps: inputSteps, branches, stepTeams, teams, policy, onChange }: WorkflowBuilderProps) {
  const steps = useMemo(() => sequenceTeamStepsForDraft(state, inputSteps, stepTeams, branches, policy), [inputSteps, stepTeams, branches, policy, state.today])
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
  const commit = (next: BuilderSnapshot): boolean => {
    const problem = graphError(next.steps) ?? editError(snapshot, { ...next, steps: sequenceTeamStepsForDraft(state, next.steps, next.stepTeams, next.branches, policy) }, policy, state.roles)
    if (problem) { setError(problem); return false }
    next = { ...next, steps: sequenceTeamStepsForDraft(state, next.steps, next.stepTeams, next.branches, policy) }
    if (JSON.stringify(snapshot) === JSON.stringify(next)) return true
    setHistory(previous => [...previous.slice(-29), structuredClone(snapshot)])
    setError(null)
    onChange(next.steps, next.branches, next.stepTeams)
    return true
  }
  const openTask = (key: string) => { setSelected(key); setConnectFrom(null); rail.show({ kind: "workflow" }) }
  const select = (key: string) => {
    if (connectFrom) {
      const target = steps.find(candidate => candidate.key === key)
      if (target && commit({ ...snapshot, steps: steps.map(candidate => candidate.key === key ? { ...candidate, dependsOn: [...new Set([...(candidate.dependsOn ?? []), connectFrom])] } : candidate) })) setConnectFrom(null)
      return
    }
    openTask(key)
  }
  const close = () => { setSelected(null); rail.closeDetail() }
  const insert = (position: "before" | "after") => {
    if (!step) return
    const next = insertTeamBuilderStep(snapshot, step.key, position)
    if (commit(next)) openTask(next.steps[next.steps.length - 1].key)
  }
  const makeBranch = (draft: BranchDraft) => {
    if (steps.length >= MAX_STEPS) return `A workflow can have up to ${MAX_STEPS} tasks.`
    const branch: WorkflowBranch = { id: `b-${newBuilderStepId()}`, title: draft.title, side: draft.side, conditions: draft.conditions, defaultRoleId: draft.defaultRoleId, order: Math.max(0, ...(branches ?? []).map(item => item.order)) + 1 }
    const role = state.roles.find(candidate => candidate.id === draft.defaultRoleId)
    const fresh = createBuilderStep(draft.firstStepTitle)
    fresh.placement = { branchId: branch.id, order: 0 }
    fresh.phase = draft.side === "after_event" ? "close" : "prepare"
    fresh.ownerRoleId = role?.id ?? null
    fresh.fn = role?.fn ?? "programs"
    fresh.stepKind = branch.conditions?.length ? "situation" : "core"
    if (draft.side === "after_event") fresh.anchor = { kind: "target", days: -2, unit: "calendar", label: "Workflow target" }
    const team = (role && state.org.workflowRoleTeams?.[role.id]) || teams[0]?.id
    const tail = orderedWorkflowSteps(steps).filter(step => stepTeams[step.key] === team).at(-1)
    if (tail) fresh.dependsOn = [tail.key]
    const next = { ...snapshot, steps: [...steps, fresh], branches: [...(branches ?? []), branch], stepTeams: { ...stepTeams, ...(team ? { [fresh.key]: team } : {}) } }
    if (!commit(next)) return "This branch would conflict with a protected workflow step."
    setAddBranch(false); openTask(fresh.key)
    return null
  }
  useEffect(() => {
    if (!step) { rail.setWorkflowDetail(null); return }
    rail.setWorkflowDetail(<BuilderTaskDetails key={step.key} step={step} snapshot={snapshot} state={state} teams={teams} policy={policy} onChange={commit} onInsert={insert} onClose={close} />)
    return () => rail.setWorkflowDetail(null)
    // The controlled definition refreshes Details after edits, restores and view changes.
  }, [step, snapshot, state.roles, teams, policy, onChange])

  const addTask = (teamId?: string) => {
    const team = teamId ?? (step && stepTeams[step.key]) ?? teams[0]?.id
    const reference = !teamId && step && stepTeams[step.key] === team ? step : orderedWorkflowSteps(steps).filter(item => stepTeams[item.key] === team).at(-1)
    if (reference) {
      const next = insertTeamBuilderStep(snapshot, reference.key, "after")
      if (commit(next)) openTask(next.steps[next.steps.length - 1].key)
    } else {
      const fresh = createBuilderStep("New task")
      const next = { ...snapshot, steps: [...steps, fresh], stepTeams: { ...stepTeams, ...(team ? { [fresh.key]: team } : {}) } }
      if (commit(next)) openTask(fresh.key)
    }
  }
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
        <button type="button" className="btn small primary" disabled={steps.length >= MAX_STEPS} onClick={() => addTask()}>+ Task</button>
      </div>
    </div>
    {error && <p className="small late-text" role="alert">{error}</p>}
    {connectFrom && <p className="small" role="status">Choose the task that waits for “{steps.find(candidate => candidate.key === connectFrom)?.title}”. <button type="button" className="link" onClick={() => setConnectFrom(null)}>Cancel connection</button></p>}
    {unmapped.length > 0 && <div className="wfb-unassigned" role="status"><span>{unmapped.length} task{unmapped.length === 1 ? " needs" : "s need"} a team:</span>{unmapped.map(candidate => <button type="button" className="link" key={candidate.key} onClick={() => select(candidate.key)}>{candidate.title || "Untitled task"}</button>)}</div>}
    {view === "quick" ? <QuickEntry state={state} snapshot={snapshot} teams={teams} onChange={commit} onSelect={select} selected={selected} /> : <>
      <p className="small muted wfb-hint">One team, one sequence. Teams can work in parallel. Drag to reorder; click for details. T0 = target day.</p>
      <label className="wfb-preview-date">Preview target day<input type="date" value={previewDate} onChange={event => { if (event.target.value) setPreviewDate(event.target.value) }} /></label>
      <div className="wfb-scroll" tabIndex={0} role="region" aria-label="Team timeline, scroll horizontally to explore">
        <div className="wfb-canvas" style={{ width: timeline.width, height: Math.max(HEADER_HEIGHT + 120, timeline.height) }}>
          <div className="wfb-time-axis" style={{ height: HEADER_HEIGHT }}><span className="wfb-axis-title">Team</span><span className="wfb-sequence-title" style={{ left: LABEL_WIDTH + 20 }}>Task order →</span></div>
          {timeline.rows.map(row => <div key={row.team.id} className="wfb-lane" data-testid={`workflow-team-${row.team.id}`} style={{ top: row.top, height: row.height }}><div className="wfb-lane-label" style={{ width: LABEL_WIDTH }}>{row.team.name}<button type="button" className="link" aria-label={`Add task to ${row.team.name}`} onClick={() => addTask(row.team.id)}>+ Task</button></div></div>)}
          <svg className="wfb-links" width={timeline.width} height={Math.max(HEADER_HEIGHT + 120, timeline.height)} aria-label="Task dependency connections" role="img">
            <title>Arrows connect prerequisites to the tasks that wait for them</title>
            <defs><marker id={markerId} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" /></marker></defs>
            {timeline.routes.map(route => <path key={`${route.from}:${route.to}`} data-testid="workflow-dependency" className={selected === route.from || selected === route.to ? "wfb-link is-selected" : "wfb-link"} d={route.path} markerEnd={`url(#${markerId})`}><title>{steps.find(item => item.key === route.from)?.title} → {steps.find(item => item.key === route.to)?.title}</title></path>)}
          </svg>
          {timeline.boxes.map(box => <TimelineTask key={box.step.key} box={box} branches={branches} selected={selected === box.step.key} connecting={!!connectFrom} onSelect={() => select(box.step.key)} onReorder={centerX => {
            const others = timeline.boxes.filter(candidate => candidate.step.key !== box.step.key && stepTeams[candidate.step.key] === stepTeams[box.step.key])
            const target = others.sort((a, b) => Math.abs(a.x + a.width / 2 - centerX) - Math.abs(b.x + b.width / 2 - centerX))[0]
            if (target) commit(reorderTeamBuilderStep(snapshot, box.step.key, target.step.key, centerX < target.x + target.width / 2))
          }} />)}
          {!teams.length && <p className="wfb-no-teams">Add teams from your organization settings to arrange tasks into lanes.</p>}
        </div>
      </div>
    </>}
    {addBranch && <WorkflowBranchDialog roles={state.roles} onClose={() => setAddBranch(false)} onAdd={makeBranch} />}
  </section>
}

function QuickEntry({ state, snapshot, teams, onChange, onSelect, selected }: { state: DemoState; snapshot: BuilderSnapshot; teams: BuilderTeam[]; onChange: (next: BuilderSnapshot) => boolean; onSelect: (id: string) => void; selected: string | null }) {
  const [names, setNames] = useState("")
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
    const chosen = snapshot.steps.find(step => step.key === selected)
    const assignedTeam = team || (chosen ? snapshot.stepTeams[chosen.key] : "")
    const reference = chosen && snapshot.stepTeams[chosen.key] === assignedTeam ? chosen : orderedWorkflowSteps(snapshot.steps).filter(step => snapshot.stepTeams[step.key] === assignedTeam).at(-1)
    const chosenRole = state.roles.find(candidate => candidate.id === role)
    const fresh = titles.map(title => createBuilderStep(title, reference, snapshot.branches))
    fresh.forEach((step, index) => {
      if (chosenRole) { step.ownerRoleId = chosenRole.id; step.fn = chosenRole.fn }
      step.dependsOn = index > 0 ? [fresh[index - 1].key] : reference ? [reference.key] : []
    })
    const stepTeams = { ...snapshot.stepTeams }
    if (assignedTeam) fresh.forEach(step => { stepTeams[step.key] = assignedTeam })
    const following = snapshot.steps.map(step => reference && snapshot.stepTeams[step.key] === assignedTeam && step.dependsOn?.includes(reference.key) ? { ...step, dependsOn: step.dependsOn.map(id => id === reference.key ? fresh[fresh.length - 1].key : id) } : step)
    if (onChange({ ...snapshot, steps: [...following, ...fresh], stepTeams })) { setNames(""); setError(null) }
  }
  return <div className="wfb-quick form-stack">
    <form className="form-stack" onSubmit={add}>
      <label>Task names<textarea aria-label="Task names" rows={4} value={names} onChange={event => setNames(event.target.value)} placeholder={"Agree visit\nConfirm transport\nShare briefing"} /></label>
      <div className="wfb-quick-fields">
        <label>Assign team<select value={team} onChange={event => setTeam(event.target.value)}><option value="">Choose later</option>{teams.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <label>Assign role<select value={role} onChange={event => setRole(event.target.value)}><option value="">{selected ? "Use selected task's role" : "Choose later"}</option>{state.roles.filter(item => item.fn !== "advisor").map(item => <option value={item.id} key={item.id}>{labels.get(item.id)}</option>)}</select></label>
      </div>
      <p className="small muted">One task per line. Tasks follow the chosen team’s sequence and inherit the preceding task’s type.</p>
      {error && <p className="small late-text" role="alert">{error}</p>}
      <div><button type="submit" className="btn primary">Add tasks</button></div>
    </form>
    <div className="wfb-table-scroll"><table className="tbl wfb-table"><caption className="sr-only">Workflow tasks and prerequisites</caption><thead><tr><th>Task</th><th>Team</th><th>Owner role</th><th>Workdays</th><th>Waits for</th></tr></thead><tbody>{snapshot.steps.map(step => <tr key={step.key}><td><button type="button" className="link" onClick={() => onSelect(step.key)}>{step.title || "Untitled task"}</button></td><td>{teams.find(item => item.id === snapshot.stepTeams[step.key])?.name ?? "Choose team"}</td><td>{step.ownerRoleId ? labels.get(step.ownerRoleId) ?? "Missing role" : "Choose role"}</td><td>{step.estDays}</td><td>{(step.dependsOn ?? []).map(id => snapshot.steps.find(candidate => candidate.key === id)?.title ?? "Missing task").join(", ") || "None"}</td></tr>)}</tbody></table></div>
  </div>
}

function BuilderTaskDetails({ step, snapshot, state, teams, policy, onChange, onInsert, onClose }: { step: StepTemplate; snapshot: BuilderSnapshot; state: DemoState; teams: BuilderTeam[]; policy: BuilderPolicy; onChange: (next: BuilderSnapshot) => boolean; onInsert: (position: "before" | "after") => void; onClose: () => void }) {
  const { steps, branches, stepTeams } = snapshot
  const patch = (value: Partial<StepTemplate>) => onChange({ ...snapshot, steps: steps.map(candidate => candidate.key === step.key ? { ...candidate, ...value } : candidate) })
  const labels = roleLabels(state.roles)
  const definitions = resolveBranches(steps, branches).filter(candidate => policy === "standard" || branches?.some(authored => authored.id === candidate.id) || steps.some(item => placementOf(item).branchId === candidate.id))
  const locked = isAsuStep(step)
  const cannotDelete = builderDeletionReason(step, policy)
  const waits = step.dependsOn ?? []
  const previousInTeam = waits.find(id => !!stepTeams[step.key] && stepTeams[id] === stepTeams[step.key])
  const candidates = steps.filter(candidate => candidate.key !== step.key && !waits.includes(candidate.key) && !graphError(steps.map(item => item.key === step.key ? { ...item, dependsOn: [...waits, candidate.key] } : item)))
  const branch = definitions.find(candidate => candidate.id === placementOf(step).branchId)
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
    {!!definitions.length && <label>Branch<select disabled={locked || (policy === "standard" && ["finalcheck", "checkin", "headcount"].includes(step.key))} value={placementOf(step).branchId} onChange={event => {
      const next = definitions.find(candidate => candidate.id === event.target.value)
      patch({ placement: { branchId: event.target.value, order: placementOf(step).order }, ...(next ? { phase: next.side === "after_event" ? "close" : "prepare" } : {}) })
    }}><option value="main">Main</option>{definitions.filter(candidate => candidate.id !== "main").map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.title}</option>)}</select></label>}
    {branch && branchConditions(branch).length > 0 && <p className="small muted">Included when all branch conditions match: {branchConditions(branch).map(conditionLabel).join(", ")}.</p>}
    {locked && <p className="small muted">School rule deadlines and required prerequisites are protected.</p>}
    <div className="form-stack"><span className="small muted">Waits for · all must finish</span>{!waits.length && <span className="small">Nothing</span>}{waits.map(id => <div className="wfb-prerequisite small" key={id}><span>{steps.find(candidate => candidate.key === id)?.title ?? "Missing task"}</span><button type="button" className="link" disabled={id === previousInTeam} title={id === previousInTeam ? "Previous task in this team. Drag tasks to change the order." : undefined} aria-label={`Remove prerequisite ${steps.find(candidate => candidate.key === id)?.title ?? id}`} onClick={() => patch({ dependsOn: waits.filter(key => key !== id) })}>Remove</button></div>)}
      <label className="sr-only" htmlFor={`wfb-prerequisite-${step.key}`}>Add prerequisite</label><select id={`wfb-prerequisite-${step.key}`} aria-label="Add prerequisite" value="" onChange={event => { if (event.target.value) patch({ dependsOn: [...waits, event.target.value] }) }}><option value="">+ Prerequisite</option>{candidates.map(candidate => <option value={candidate.key} key={candidate.key}>{candidate.title}</option>)}</select>
    </div>
    <div className="action-row"><button type="button" className="btn small" onClick={() => onInsert("before")}>Add before</button><button type="button" className="btn small" onClick={() => onInsert("after")}>Add next</button></div>
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
