import { useEffect, useState } from "react"
import type { DemoState, StepTemplate, WorkflowMilestoneGraph } from "../../data/types"
import { roleLabels } from "../../data/structure"
import { officers } from "../../data/permissions"
import { isAsuStep } from "../../engine/workflowPolicy"
import { EVENT_STEPS } from "../../engine/playbooks"
import { branchConditions, conditionLabel, placementOf, resolveBranches } from "../../engine/workflowBranches"
import { workflowStepKind } from "../../engine/workflowStepKind"
import { workflowMilestoneDates, workflowMilestoneTaskDate, WORKFLOW_START, WORKFLOW_DONE } from "../../engine/workflowMilestones"
import { fmtLong } from "../../lib/dates"
import { WorkflowEffortInput } from "../setup/WorkflowEffortInput"
import { builderDeletionReason, deleteBuilderStep, graphError, type BuilderPolicy, type BuilderSnapshot } from "./model"
import { addMilestoneBranch, assignMilestoneBranchTeam, moveMilestoneTask } from "./milestoneCommands"
import type { BuilderTeam } from "./timeline"

interface Props {
  selected: string; snapshot: BuilderSnapshot; state: DemoState; teams: BuilderTeam[]; policy: BuilderPolicy; eventDate: string
  onEventDate: (date: string) => void; onChange: (next: BuilderSnapshot) => boolean
  onInsert: (position: "before" | "after") => void; onSelect: (id: string) => void; onClose: () => void
  /** Bulk assignment for the selected team branch; the builder owns the checked set. */
  selectMode: boolean; checkedCount: number
  onStartSelect: (branchId: string) => void; onAssign: (branchId: string) => void; onCancelSelect: () => void
  /** Starts the canvas connect mode from the selected task. */
  onConnect: () => void
}
const stepCount = (count: number) => `${count} step${count === 1 ? "" : "s"}`
export function milestoneStationTitle(graph: WorkflowMilestoneGraph, steps: StepTemplate[], id: string): string {
  return id === WORKFLOW_START ? graph.start.title : id === WORKFLOW_DONE ? graph.done.title : graph.eventDays.find(day => day.id === id)?.title ?? steps.find(step => step.key === id)?.title ?? id
}

export function MilestoneDetails(props: Props) {
  const { selected, snapshot, onChange, onClose } = props
  const graph = snapshot.milestoneGraph!
  const patchGraph = (patch: Partial<WorkflowMilestoneGraph>) => onChange({ ...snapshot, milestoneGraph: { ...graph, ...patch } })
  const step = snapshot.steps.find(item => item.key === selected)
  const day = graph.eventDays.find(item => item.id === selected)
  const endpoint = selected === WORKFLOW_START ? "start" : selected === WORKFLOW_DONE ? "done" : null
  const branch = graph.teamBranches.find(item => `branch:${item.id}` === selected)
  const branchTeam = branch && props.teams.find(team => team.id === branch.teamId)
  const heading = step ? "Task details" : selected === "__new_branch__" ? "Add team branch" : branch ? branchTeam ? `${branchTeam.name} path` : "Team branch" : day ? "Event day" : "Workflow station"
  return <section className="form-stack wfb-details" data-testid="workflow-builder-details" aria-label={`Details: ${milestoneStationTitle(graph, snapshot.steps, selected)}`}>
    <header className="wfb-detail-header"><div className="wfb-detail-title"><h3>{heading}</h3>{branch && <span className="tag">{stepCount(branch.stepIds.length)}</span>}</div><button type="button" className="btn small btn-quiet" onClick={onClose}>Close</button></header>
    {endpoint && <>
      <label>Station name<input maxLength={120} value={graph[endpoint].title} onChange={event => patchGraph({ [endpoint]: { ...graph[endpoint], title: event.target.value } })} /></label>
      <label>Details<textarea aria-label="Details" rows={5} maxLength={2000} value={graph[endpoint].details} onChange={event => patchGraph({ [endpoint]: { ...graph[endpoint], details: event.target.value } })} /></label>
      <p className="small muted">This is the workflow boundary. It stays on the main line.</p>
    </>}
    {day && <>
      <label>Event day name<input maxLength={120} value={day.title} onChange={event => patchGraph({ eventDays: graph.eventDays.map(item => item.id === day.id ? { ...item, title: event.target.value } : item) })} /></label>
      <WholeNumber key={day.id} label="Days after Day 1" value={day.offsetDays} min={day === graph.eventDays[0] ? 0 : 1} max={365} disabled={day === graph.eventDays[0]} onCommit={offsetDays => patchGraph({ eventDays: graph.eventDays.map(item => item.id === day.id ? { ...item, offsetDays } : item) })} />
      <p className="small">{fmtLong(workflowMilestoneDates(graph, props.eventDate)[day.id])} · fixed date</p>
      {day === graph.eventDays[0] && <label>Preview event date<input type="date" value={props.eventDate} onChange={event => { if (/^\d{4}-\d{2}-\d{2}$/.test(event.target.value)) props.onEventDate(event.target.value) }} /><span className="small muted">Preview only. Each activity supplies its own Day 1 date.</span></label>}
      <label>Details<textarea aria-label="Details" rows={5} maxLength={2000} value={day.details} onChange={event => patchGraph({ eventDays: graph.eventDays.map(item => item.id === day.id ? { ...item, details: event.target.value } : item) })} /></label>
      <p className="small muted">Unfinished work is flagged as a risk; this date does not move.</p>
    </>}
    {(selected === "__new_branch__" || selected.startsWith("branch:")) && <BranchDetails {...props} graph={graph} />}
    {step && <TaskDetails {...props} step={step} graph={graph} />}
  </section>
}

function BranchDetails({ selected, snapshot, graph, teams, onChange, onSelect, onClose, state, selectMode, checkedCount, onStartSelect, onAssign, onCancelSelect }: Props & { graph: WorkflowMilestoneGraph }) {
  const branch = graph.teamBranches.find(item => `branch:${item.id}` === selected)
  const [teamId, setTeam] = useState(teams[0]?.id ?? "")
  const [fromId, setFrom] = useState(graph.spine[0])
  const [toId, setTo] = useState(graph.spine.find(id => id !== WORKFLOW_START) ?? WORKFLOW_DONE)
  const from = branch?.fromId ?? fromId, to = branch?.toId ?? toId
  const patch = (values: Partial<NonNullable<typeof branch>>) => onChange({ ...snapshot, milestoneGraph: { ...graph, teamBranches: graph.teamBranches.map(item => item.id === branch?.id ? { ...item, ...values } : item) } })
  const label = (id: string) => milestoneStationTitle(graph, snapshot.steps, id)
  const teamSelect = <label>Team<select value={branch?.teamId ?? teamId} onChange={event => { if (branch) onChange(assignMilestoneBranchTeam(snapshot, branch.id, event.target.value)); else setTeam(event.target.value) }}><option value="">Choose team</option>{teams.map(team => <option value={team.id} key={team.id}>{team.name}</option>)}</select></label>
  const interval = <>
    <label>Starts at<select value={from} onChange={event => { if (branch) patch({ fromId: event.target.value }); else { setFrom(event.target.value); if (graph.spine.indexOf(event.target.value) >= graph.spine.indexOf(to)) setTo(graph.spine[graph.spine.indexOf(event.target.value) + 1]) } }}>{graph.spine.slice(0, -1).filter(id => !branch || graph.spine.indexOf(id) < graph.spine.indexOf(to)).map(id => <option key={id} value={id}>{label(id)}</option>)}</select></label>
    <label>Joins at<select value={to} onChange={event => branch ? patch({ toId: event.target.value }) : setTo(event.target.value)}>{graph.spine.filter(id => graph.spine.indexOf(id) > graph.spine.indexOf(from)).map(id => <option key={id} value={id}>{label(id)}</option>)}</select></label>
  </>
  if (!branch) return <>
    {teamSelect}
    {interval}
    <p className="small muted">A branch belongs to an existing organization team. The same team can work in several parts of the workflow.</p>
    <button type="button" className="btn btn-primary" disabled={!teams.some(team => team.id === teamId)} onClick={() => { const next = addMilestoneBranch(snapshot, { teamId, fromId: from, toId: to }); if (onChange(next)) { const fresh = next.milestoneGraph?.teamBranches.at(-1); if (fresh) onSelect(`branch:${fresh.id}`) } }}>Add branch</button>
  </>
  // Roster: current officers whose role the organization grouped into this team (Settings → Teams).
  const people = new Map(officers(state).map(person => [person.id, person]))
  const roster = branch.teamId ? state.roles.filter(role => state.org.workflowRoleTeams?.[role.id] === branch.teamId && role.holderId && people.has(role.holderId)).map(role => ({ id: role.id, text: `${people.get(role.holderId!)!.name.trim().split(/\s+/)[0]} · ${role.displayName}` })) : []
  return <>
    {teamSelect}
    <div className="form-stack tight">
      <span className="small muted" id={`wfb-roster-${branch.id}`}>Team roster</span>
      {roster.length ? <ul className="wfb-roster" aria-labelledby={`wfb-roster-${branch.id}`}>{roster.map(item => <li key={item.id} className="wfb-roster-chip">{item.text}</li>)}</ul> : <p className="small muted wfb-roster-empty">No roles mapped to this team yet. Map roles in Teams.</p>}
    </div>
    {interval}
    <div className="wfb-assign" role="group" aria-label="Assign steps">
      {selectMode ? <>
        <span className="tag accent" aria-live="polite">{stepCount(checkedCount)} selected</span>
        <div className="action-row">
          <button type="button" className="btn small btn-primary" disabled={!checkedCount} onClick={() => onAssign(branch.id)}>Assign {stepCount(checkedCount)}</button>
          <button type="button" className="btn small" onClick={onCancelSelect}>Cancel</button>
        </div>
        <p className="small muted">Click steps on the canvas to add or remove them.</p>
      </> : <button type="button" className="btn small" onClick={() => onStartSelect(branch.id)}>+ Select steps</button>}
    </div>
    <label>Description<textarea aria-label="Description" rows={3} maxLength={400} value={branch.details ?? ""} placeholder="What this team does on this path" onChange={event => patch({ details: event.target.value })} /></label>
    <div className="form-stack tight">
      <button type="button" className="btn small wfb-danger" disabled={!!branch.stepIds.length} onClick={() => { if (onChange({ ...snapshot, milestoneGraph: { ...graph, teamBranches: graph.teamBranches.filter(item => item.id !== branch.id) } })) onClose() }}>Delete team branch</button>
      {!!branch.stepIds.length && <p className="small muted">Move its steps first.</p>}
    </div>
  </>
}

function TaskDetails({ step, graph, snapshot, state, teams, policy, eventDate, onChange, onInsert, onClose, onConnect }: Props & { step: StepTemplate; graph: WorkflowMilestoneGraph }) {
  const { steps, branches } = snapshot
  const patch = (value: Partial<StepTemplate>) => onChange({ ...snapshot, steps: steps.map(item => item.key === step.key ? { ...item, ...value } : item) })
  const labels = roleLabels(state.roles), locked = isAsuStep(step), cannotDelete = builderDeletionReason(step, policy, steps)
  // A step that came with the preset can be brought back by Versions → Restore Platypus preset.
  const restorable = policy === "standard" && !cannotDelete && !step.custom && EVENT_STEPS.some(original => original.key === step.key)
  const waits = step.dependsOn ?? []
  const candidates = steps.filter(candidate => candidate.key !== step.key && !waits.includes(candidate.key) && !graphError(steps.map(item => item.key === step.key ? { ...item, dependsOn: [...waits, candidate.key] } : item)))
  const definitions = resolveBranches(steps, branches).filter(item => policy === "standard" || branches?.some(authored => authored.id === item.id) || steps.some(candidate => placementOf(candidate).branchId === item.id))
  const business = definitions.find(item => item.id === placementOf(step).branchId)
  const route = graph.teamBranches.find(item => item.stepIds.includes(step.key)), anchor = graph.taskAnchors[step.key]
  const anchorPatch = (value: Partial<typeof anchor>) => onChange({ ...snapshot, milestoneGraph: { ...graph, taskAnchors: { ...graph.taskAnchors, [step.key]: { ...anchor, ...value } } } })
  const due = workflowMilestoneTaskDate(graph, step.key, eventDate)
  return <>
    <label>Task name<input value={step.title} maxLength={120} onChange={event => patch({ title: event.target.value })} /></label>
    <label>Step type<select value={workflowStepKind(step, branches)} onChange={event => patch({ stepKind: event.target.value as "core" | "situation" })}><option value="core">Core event step</option><option value="situation">Situation-based step</option></select></label>
    <label>Team branch<select value={route?.id ?? "__main__"} onChange={event => onChange(moveMilestoneTask(snapshot, step.key, event.target.value))}><option value="__main__">Main line</option>{graph.teamBranches.map(branch => <option key={branch.id} value={branch.id}>{teams.find(team => team.id === branch.teamId)?.name ?? "Choose team"} · {milestoneStationTitle(graph, steps, branch.fromId)} → {milestoneStationTitle(graph, steps, branch.toId)}</option>)}</select></label>
    <label>Team<select value={route?.teamId ?? snapshot.stepTeams[step.key] ?? ""} onChange={event => { if (route) { onChange(assignMilestoneBranchTeam(snapshot, route.id, event.target.value)); return } const mapping = { ...snapshot.stepTeams }; if (event.target.value) mapping[step.key] = event.target.value; else delete mapping[step.key]; onChange({ ...snapshot, stepTeams: mapping }) }}><option value="">Choose team</option>{teams.map(team => <option value={team.id} key={team.id}>{team.name}</option>)}</select></label>
    {route && <p className="small muted">Team applies to every task in this branch.</p>}
    <label>Done by<select value={step.ownerRoleId ?? ""} onChange={event => { const role = state.roles.find(candidate => candidate.id === event.target.value); patch({ ownerRoleId: role?.id ?? null, ...(role ? { fn: role.fn } : {}) }) }}><option value="">Unassigned</option>{state.roles.filter(role => role.fn !== "advisor").map(role => <option value={role.id} key={role.id}>{labels.get(role.id)}</option>)}</select></label>
    <WorkflowEffortInput value={step.estDays} onCommit={patch} />
    <label>Event day<select disabled={locked} value={anchor.eventDayId} onChange={event => anchorPatch({ eventDayId: event.target.value })}>{graph.eventDays.map((day, index) => <option value={day.id} key={day.id}>Day {index + 1} · {day.title}</option>)}</select></label>
    <WholeNumber label="Finish by (T±)" value={anchor.offsetDays} min={-365} max={365} disabled={locked} onCommit={offsetDays => anchorPatch({ offsetDays })} />
    <label>Target unit<select disabled={locked} value={anchor.unit ?? "calendar"} onChange={event => anchorPatch({ unit: event.target.value as "calendar" | "business" })}><option value="calendar">Calendar days</option><option value="business">Business days</option></select></label>
    <p className="small muted">−7 is before the selected event day; +2 is after. {due ? `Preview target: ${fmtLong(due)}.` : ""} Start is calculated from workdays, buffers and prerequisites.</p>
    <label>Details<textarea aria-label="Details" rows={4} maxLength={400} value={step.why} onChange={event => patch({ why: event.target.value })} /></label>
    {!!definitions.length && <label>Include with<select disabled={locked || (policy === "standard" && ["finalcheck", "checkin", "headcount"].includes(step.key))} value={placementOf(step).branchId} onChange={event => {
      const definition = definitions.find(item => item.id === event.target.value)
      patch({ placement: { branchId: event.target.value, order: placementOf(step).order }, ...(definition ? { phase: definition.side === "after_event" ? "close" : "prepare" } : {}) })
    }}><option value="main">Main</option>{definitions.filter(item => item.id !== "main").map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>}
    {business && branchConditions(business).length > 0 && <p className="small muted">Included when: {branchConditions(business).map(conditionLabel).join(", ")}.</p>}
    {locked && <p className="small muted">School rule deadlines and required prerequisites are protected and stay anchored to Day 1.</p>}
    <div className="form-stack"><span className="small muted">Waits for · all must finish</span>{!waits.length && <span className="small">Nothing</span>}{waits.map(id => <div className="wfb-prerequisite small" key={id}><span>{steps.find(candidate => candidate.key === id)?.title ?? "Missing task"}</span><button type="button" className="link" aria-label={`Remove prerequisite ${steps.find(candidate => candidate.key === id)?.title ?? id}`} onClick={() => patch({ dependsOn: waits.filter(key => key !== id) })}>Remove</button></div>)}
      <label className="sr-only" htmlFor={`wfb-prerequisite-${step.key}`}>Add prerequisite</label><select id={`wfb-prerequisite-${step.key}`} aria-label="Add prerequisite" value="" onChange={event => { if (event.target.value) patch({ dependsOn: [...waits, event.target.value] }) }}><option value="">+ Prerequisite</option>{candidates.map(candidate => <option value={candidate.key} key={candidate.key}>{candidate.title}</option>)}</select>
    </div>
    <div className="action-row"><button type="button" className="btn small" onClick={onConnect}>Connect on canvas</button></div>
    <div className="action-row"><button type="button" className="btn small" onClick={() => onInsert("before")}>Add before</button><button type="button" className="btn small" onClick={() => onInsert("after")}>Add next</button></div>
    <button type="button" className="btn small" disabled={!!cannotDelete} title={cannotDelete ?? undefined} onClick={() => { if (!cannotDelete && onChange(deleteBuilderStep(snapshot, step.key))) onClose() }}>Delete task</button>
    {cannotDelete && <p className="small muted">{cannotDelete}</p>}
    {restorable && <p className="small muted">Restore Platypus preset brings it back.</p>}
  </>
}

function WholeNumber({ label, value, min, max, disabled, onCommit }: { label: string; value: number; min: number; max: number; disabled?: boolean; onCommit: (value: number) => boolean }) {
  const [raw, setRaw] = useState(String(value)), [invalid, setInvalid] = useState(false)
  useEffect(() => { setRaw(String(value)); setInvalid(false) }, [value])
  return <label>{label}<input aria-label={label} type="number" inputMode="numeric" step={1} min={min} max={max} disabled={disabled} value={raw} aria-invalid={invalid || undefined} onChange={event => {
    const text = event.target.value; setRaw(text)
    const next = Number(text)
    if (!text || !Number.isInteger(next) || next < min || next > max) { setInvalid(true); return }
    setInvalid(!onCommit(next))
  }} onBlur={() => { if (invalid) { setRaw(String(value)); setInvalid(false) } }} />{invalid && <span className="small late-text" role="alert">Enter a whole number from {min} to {max}.</span>}</label>
}
