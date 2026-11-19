import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import type { DemoState, Node } from "../../data/types"
import type { Forecast } from "../../engine/forecast"
import type { Schedule } from "../../engine/schedule"
import { WORKFLOW_START } from "../../engine/workflowMilestones"
import { fmtShort } from "../../lib/dates"
import { nodeStop } from "../../lib/phases"
import { firstName, worstIssue } from "../../pages/helpers"
import { workflowStepKind } from "../../engine/workflowStepKind"
import { statusStyles } from "../ui"
import { useRail } from "../rail/RailContext"
import { buildMilestoneLayout } from "../workflowBuilder/milestoneLayout"
import { taskShortTitle } from "../workflowBuilder/taskLabel"
import { projectMilestoneExecution } from "./milestoneExecution"
import "../workflowBuilder/milestone-editor.css"
import "./milestoneExecution.css"

interface Props { state: DemoState; sched: Schedule; forecast: Forecast; eventId: string; selectedId: string | null; onSelect: (id: string) => void }

/** Execution reuses the authored geometry but every work action still targets its real activity task. */
export function MilestoneExecutionChart({ state, sched, forecast, eventId, selectedId, onSelect }: Props) {
  const event = state.events.find(item => item.id === eventId)
  const projection = useMemo(() => event ? projectMilestoneExecution(event, state.nodes) : null, [event, state.nodes])
  const graph = projection?.graph ?? null
  const layout = useMemo(() => graph && projection ? buildMilestoneLayout(projection.steps, graph) : null, [graph, projection])
  const [stationId, setStationId] = useState<string | null>(null)
  const viewport = useRef<HTMLDivElement>(null), [available, setAvailable] = useState(940)
  const rail = useRail(), styles = statusStyles(state)
  const station = layout?.stations.find(item => item.id === stationId && item.kind !== "task")
  useEffect(() => {
    const element = viewport.current
    if (!element) return
    const measure = () => setAvailable(element.clientWidth || 940)
    measure()
    if (typeof ResizeObserver !== "undefined") { const observer = new ResizeObserver(measure); observer.observe(element); return () => observer.disconnect() }
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [])
  useEffect(() => {
    if (!station || !event || !graph || !projection) return
    const day = graph.eventDays.find(item => item.id === station.id)
    const description = day?.details ?? (station.id === WORKFLOW_START ? graph.start.details : graph.done.details)
    const date = projection.dates[station.id]
    rail.setWorkflowDetail(<section className="form-stack" data-testid="execution-milestone-details" aria-label="Activity station details">
      <header className="action-row"><h3>{station.title}</h3><button type="button" className="btn small" onClick={() => { setStationId(null); rail.closeDetail() }}>Close</button></header>
      <p className="small muted">{day ? "Event day · fixed date" : "Workflow boundary"}</p>
      <p>{event.name}</p>
      {date && <p>Event date <strong><time dateTime={date}>{fmtShort(date)}</time></strong></p>}
      {description && <p>{description}</p>}
      <p className="small muted">From {event.workflowRun?.templateName} · v{event.workflowRun?.templateVersion}. {day ? "This date is fixed by the activity date and the saved day offset. It is not moved by incomplete tasks." : "This station marks the workflow boundary."}</p>
      <p className="small muted">This station is not a task. Task progress and submitted work stay on the task dots.</p>
    </section>)
    return () => rail.setWorkflowDetail(null)
  }, [station, event, graph, projection, rail.setWorkflowDetail])
  const selectTask = (node: Node) => { setStationId(null); onSelect(node.id) }
  const renderTask = (key: string, x: number, y: number, shared = false) => {
    const node = projection?.nodeByStep.get(key)
    if (!node) return null
    const plan = sched.nodes[node.id], issue = worstIssue(plan?.issues)
    const late = node.status !== "done" && (plan?.club ?? "9999") < state.today
    const status = nodeStop(node, state.today, issue?.severity === "error" || late || forecast.nodes[node.id]?.color === "red" || node.status === "blocked")
    const kind = workflowStepKind(node, event?.workflowBranches) === "core" ? "baseline" : "situation"
    const owner = state.people.find(person => person.id === node.ownerId)?.name ?? "No owner"
    return <button key={key} type="button" className={`m-dot mxe-task ${kind} ${status}${shared ? " is-shared" : ""}`} data-testid={`flow-node-${node.stepKey ?? node.id}`} data-task-id={node.id} data-step-id={key} aria-pressed={!stationId && selectedId === node.id} aria-label={`${node.title}. ${styles[node.status].label}. Owner ${owner}. Due ${plan ? fmtShort(plan.club) : "pending"}.`} title={`${node.title} · ${owner}${plan ? ` · Due ${fmtShort(plan.club)}` : ""}`} style={{ left: x, top: y }} onClick={() => selectTask(node)}>
      <i aria-hidden="true" /><strong>{taskShortTitle(node.title)}</strong><span>{firstName(state, node.ownerId)}{plan ? ` · ${fmtShort(plan.club)}` : ""}</span>
    </button>
  }
  if (!event || !projection) return null
  const scale = layout ? Math.min(1, Math.max(0.86, (available - 4) / layout.width)) : 1
  return <div className="team-metro-wrap wfm mxe" data-testid="milestone-execution-chart">
    <p className="small muted">Select a task to work on it. Event-day stations show the fixed activity dates.</p>
    {layout && graph && <div className="wfm-scroll mxe-scroll" data-testid="flow-chart" ref={viewport} tabIndex={0} role="region" aria-label="Activity milestone workflow">
      <div className="wfm-size" style={{ width: layout.width * scale, height: layout.height * scale }}><div className="wfm-stage" style={{ width: layout.width, height: layout.height, "--wfm-scale": scale } as CSSProperties}>
        {layout.segments.map((segment, index) => <div key={segment.branch.id} className={`wfm-segment wfm-tone-${index % 4} mxe-segment`} data-testid="milestone-execution-branch" data-branch-id={segment.branch.id} data-team-id={segment.branch.teamId} style={{ left: segment.x, top: segment.y, width: segment.width, height: segment.height }}><b>{projection.teams.find(team => team.id === segment.branch.teamId)?.name ?? "Team unavailable"}</b><span>{segment.points.length} task{segment.points.length === 1 ? "" : "s"}</span></div>)}
        <svg className="wfm-lines" width={layout.width} height={layout.height} aria-hidden="true"><path className="wfm-main-track" d={`M${layout.stations[0]?.x ?? 44} ${layout.mainY} H${layout.stations.at(-1)?.x ?? layout.width - 44}`} />{layout.segments.map(segment => <path key={segment.branch.id} data-testid="milestone-execution-track" data-branch-id={segment.branch.id} className="wfm-branch-track" d={segment.path} />)}{layout.stations.filter(item => item.kind === "day").map(item => <path key={item.id} className="wfm-date-guide" d={`M${item.x} 24 V${layout.height - 20}`} />)}</svg>
        {layout.stations.map(item => item.kind === "task" ? renderTask(item.id, item.x, item.y, true) : <button key={item.id} type="button" className={`wfm-station is-${item.kind}${stationId === item.id ? " is-selected" : ""}`} data-testid={item.kind === "day" ? `flow-event-day-${(item.dayIndex ?? 0) + 1}` : item.id === WORKFLOW_START ? "flow-start" : "flow-done"} data-station-id={item.id} aria-label={`View ${item.title}${projection.dates[item.id] ? `, ${fmtShort(projection.dates[item.id])}` : ""}`} aria-pressed={stationId === item.id} style={{ left: item.x, top: item.y }} onClick={() => { setStationId(item.id); rail.show({ kind: "workflow" }) }}><i aria-hidden="true" /><strong>{item.title}</strong>{item.kind === "day" && <span>{fmtShort(projection.dates[item.id])}</span>}</button>)}
        {layout.points.map(point => renderTask(point.step.key, point.x, point.y))}
      </div></div>
    </div>}
    {!!projection.issues.length && <div role="status">{projection.issues.map(issue => <p className="small muted" key={issue}>{issue}</p>)}</div>}
    {!!projection.unplaced.length && <section className="mxe-unplaced" aria-label="Other activity tasks">{projection.unplaced.map(node => <button type="button" className="btn small" data-task-id={node.id} key={node.id} onClick={() => selectTask(node)}>{node.title}</button>)}</section>}
  </div>
}
