import { useEffect, useMemo, useState, type FormEvent } from "react"
import type { DemoState, StepTemplate, WorkflowBranch, WorkflowMilestoneGraph } from "../../data/types"
import { MAX_STEPS } from "../../engine/workflow"
import { createWorkflowMilestoneGraph, workflowMilestoneGraphError, workflowMilestoneSteps, WORKFLOW_START, WORKFLOW_DAY_ONE } from "../../engine/workflowMilestones"
import { orderedWorkflowSteps } from "../../engine/workflowSequence"
import { addDays } from "../../lib/dates"
import { roleLabels } from "../../data/structure"
import { useRail } from "../rail/RailContext"
import { createBuilderStep, editError, graphError, insertTeamBuilderStep, type BuilderPolicy, type BuilderSnapshot } from "./model"
import { addMilestoneBranch, addMilestoneCheck, addMilestoneTask, moveMilestoneTask, setMilestoneDayCount, syncMilestoneSnapshot } from "./milestoneCommands"
import type { BuilderTeam } from "./timeline"
import { MilestoneWorkflowCanvas } from "./MilestoneWorkflowCanvas"
import { MilestoneDetails } from "./MilestoneDetails"
import "./workflowBuilder.css"

export interface WorkflowBuilderProps {
  state: DemoState
  steps: StepTemplate[]
  branches?: WorkflowBranch[]
  stepTeams: Record<string, string>
  graph?: WorkflowMilestoneGraph
  teams: BuilderTeam[]
  policy: BuilderPolicy
  onChange: (steps: StepTemplate[], branches: WorkflowBranch[] | undefined, stepTeams: Record<string, string>, graph?: WorkflowMilestoneGraph) => void
}

/** Definitions are edited here; the preview never creates executable activity tasks. */
export function WorkflowBuilder({ state, steps, branches, stepTeams, graph: inputGraph, teams, policy, onChange }: WorkflowBuilderProps) {
  const [view, setView] = useState<"flow" | "quick">("flow")
  const [selected, setSelected] = useState<string | null>(null)
  const [history, setHistory] = useState<BuilderSnapshot[]>([])
  const [error, setError] = useState<string | null>(null)
  const [connectFrom, setConnectFrom] = useState<string | null>(null)
  const [eventDate, setEventDate] = useState(() => addDays(state.today, 90))
  const rail = useRail()
  const graph = useMemo(() => inputGraph ?? createWorkflowMilestoneGraph(steps, stepTeams), [inputGraph, steps, stepTeams])
  const snapshot = useMemo(() => ({ steps, branches, stepTeams, milestoneGraph: graph }), [steps, branches, stepTeams, graph])
  const teamIds = new Set(teams.map(team => team.id))
  const unmapped = steps.filter(step => !teamIds.has(stepTeams[step.key]))
  const step = steps.find(candidate => candidate.key === selected)
  const commit = (value: BuilderSnapshot): boolean => {
    const next = syncMilestoneSnapshot(snapshot, value)
    const invalid = graphError(next.steps) ?? (next.milestoneGraph ? workflowMilestoneGraphError(next.milestoneGraph, next.steps) ?? graphError(workflowMilestoneSteps(next.steps, next.milestoneGraph)) : "Keep the workflow stations and team branches.")
    if (invalid) { setError(invalid); return false }
    const problem = editError(snapshot, next, policy, state.roles)
    if (problem) { setError(problem); return false }
    if (JSON.stringify(snapshot) === JSON.stringify(next)) return true
    setHistory(previous => [...previous.slice(-29), structuredClone(snapshot)])
    setError(null)
    onChange(next.steps, next.branches, next.stepTeams, next.milestoneGraph)
    return true
  }
  const openNode = (key: string) => { setSelected(key); setConnectFrom(null); rail.show({ kind: "workflow" }) }
  const select = (key: string) => {
    if (connectFrom) {
      const target = steps.find(candidate => candidate.key === key)
      if (target && commit({ ...snapshot, steps: steps.map(candidate => candidate.key === key ? { ...candidate, dependsOn: [...new Set([...(candidate.dependsOn ?? []), connectFrom])] } : candidate) })) setConnectFrom(null)
      return
    }
    openNode(key)
  }
  const close = () => { setSelected(null); rail.closeDetail() }
  const insert = (position: "before" | "after") => {
    if (!step) return
    const next = insertTeamBuilderStep(snapshot, step.key, position)
    if (commit(next)) openNode(next.steps[next.steps.length - 1].key)
  }
  useEffect(() => {
    if (!selected || selected === "__new_branch__") return
    const exists = steps.some(item => item.key === selected) || graph.spine.includes(selected) || graph.teamBranches.some(item => `branch:${item.id}` === selected)
    if (!exists) setSelected(WORKFLOW_DAY_ONE)
  }, [selected, steps, graph])
  useEffect(() => {
    if (!selected) { rail.setWorkflowDetail(null); return }
    rail.setWorkflowDetail(<MilestoneDetails key={selected} selected={selected} snapshot={snapshot} state={state} teams={teams} policy={policy} eventDate={eventDate} onEventDate={setEventDate} onChange={commit} onInsert={insert} onSelect={openNode} onClose={close} />)
    return () => rail.setWorkflowDetail(null)
  }, [selected, snapshot, state.roles, teams, policy, onChange, eventDate])

  const addTask = (branchId?: string, check = false) => {
    let base: BuilderSnapshot = snapshot
    const chosenBranch = branchId ?? graph.teamBranches.find(item => item.id === selected?.slice(7) || item.stepIds.includes(selected ?? ""))?.id ?? graph.teamBranches[0]?.id
    let target: string | undefined = chosenBranch
    if (!target && !check) {
      const teamId = teams[0]?.id
      if (!teamId) { setError("Create your organization teams in Teams before adding a team task."); return }
      base = addMilestoneBranch(base, { teamId, fromId: WORKFLOW_START, toId: graph.spine.find(id => id !== WORKFLOW_START) ?? WORKFLOW_DAY_ONE })
      target = base.milestoneGraph?.teamBranches.at(-1)?.id
    }
    let next = check ? addMilestoneCheck(base) : addMilestoneTask(base, target)
    const fresh = next.steps.find(candidate => !steps.some(previous => previous.key === candidate.key))
    if (fresh && check && !next.stepTeams[fresh.key] && teams[0]) next = { ...next, stepTeams: { ...next.stepTeams, [fresh.key]: teams[0].id } }
    if (commit(next) && fresh) openNode(fresh.key)
  }
  return <section className="wfb form-stack" data-testid="workflow-builder" aria-label="Workflow builder">
    <div className="wfb-toolbar">
      <div className="wfb-view" role="group" aria-label="Editor view">
        <button type="button" className="btn small" aria-pressed={view === "flow"} onClick={() => setView("flow")}>Flow</button>
        <button type="button" className="btn small" aria-pressed={view === "quick"} onClick={() => setView("quick")}>Quick entry</button>
      </div>
      <div className="action-row">
        <label>Workflow length<select aria-label="Workflow length" value={graph.eventDays.length} onChange={event => commit(setMilestoneDayCount(snapshot, Number(event.target.value) as 1 | 2))}><option value={1}>1-day event</option><option value={2}>2-day event</option></select></label>
        <button type="button" className="btn small" disabled={!history.length} onClick={() => {
          const previous = history[history.length - 1]
          if (!previous) return
          setHistory(items => items.slice(0, -1)); setError(null); setConnectFrom(null)
          onChange(previous.steps, previous.branches, previous.stepTeams, previous.milestoneGraph)
        }}>Undo edit</button>
        <button type="button" className="btn small" aria-pressed={!!connectFrom} disabled={!step && !connectFrom} onClick={() => setConnectFrom(connectFrom ? null : selected)}>Connect</button>
        <button type="button" className="btn small" disabled={!teams.length || graph.teamBranches.length >= 60} onClick={() => openNode("__new_branch__")}>Add branch</button>
        <button type="button" className="btn small primary" disabled={steps.length >= MAX_STEPS} onClick={() => addTask()}>+ Task</button>
        <span className="small muted">Presets</span>
        <button type="button" className="btn small" disabled={steps.length >= MAX_STEPS} onClick={() => addTask(undefined, true)}>Full check</button>
        <button type="button" className="btn small" disabled={graph.eventDays.length >= 2} onClick={() => { if (commit(setMilestoneDayCount(snapshot, 2))) openNode("__event2__") }}>Event day</button>
      </div>
    </div>
    {error && <p className="small late-text" role="alert">{error}</p>}
    {connectFrom && <p className="small" role="status">Choose the task that waits for “{steps.find(candidate => candidate.key === connectFrom)?.title}”. <button type="button" className="link" onClick={() => setConnectFrom(null)}>Cancel connection</button></p>}
    {unmapped.length > 0 && <div className="wfb-unassigned" role="status"><span>{unmapped.length} task{unmapped.length === 1 ? " needs" : "s need"} a team:</span>{unmapped.map(candidate => <button type="button" className="link" key={candidate.key} onClick={() => select(candidate.key)}>{candidate.title || "Untitled task"}</button>)}</div>}
    {view === "quick" ? <QuickEntry state={state} snapshot={snapshot} teams={teams} onChange={commit} onSelect={select} selected={selected} /> : <MilestoneWorkflowCanvas steps={steps} graph={graph} teams={teams} eventDate={eventDate} selected={selected} onSelect={select} onAddTask={addTask} /* integration stub (Agent A) */ selectMode={false} checked={new Set()} onToggleCheck={() => {}} onMove={(key, branchId, targetId, before) => commit(moveMilestoneTask(snapshot, key, branchId, targetId, before))} />}
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
      <p className="small muted">One task per line, in order. Existing tasks keep their prerequisites.</p>
      {error && <p className="small late-text" role="alert">{error}</p>}
      <div><button type="submit" className="btn primary">Add tasks</button></div>
    </form>
    <div className="wfb-table-scroll"><table className="tbl wfb-table"><caption className="sr-only">Workflow tasks and prerequisites</caption><thead><tr><th>Task</th><th>Team</th><th>Owner role</th><th>Workdays</th><th>Waits for</th></tr></thead><tbody>{snapshot.steps.map(step => <tr key={step.key}><td><button type="button" className="link" onClick={() => onSelect(step.key)}>{step.title || "Untitled task"}</button></td><td>{teams.find(item => item.id === snapshot.stepTeams[step.key])?.name ?? "Choose team"}</td><td>{step.ownerRoleId ? labels.get(step.ownerRoleId) ?? "Missing role" : "Choose role"}</td><td>{step.estDays}</td><td>{(step.dependsOn ?? []).map(id => snapshot.steps.find(candidate => candidate.key === id)?.title ?? "Missing task").join(", ") || "None"}</td></tr>)}</tbody></table></div>
  </div>
}
