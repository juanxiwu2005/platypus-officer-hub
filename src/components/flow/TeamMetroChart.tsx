import { lazy, Suspense, useId, useMemo, useState, type CSSProperties } from "react"
import type { DemoState } from "../../data/types"
import type { Forecast } from "../../engine/forecast"
import type { Schedule } from "../../engine/schedule"
import { fmtShort } from "../../lib/dates"
import { nodeStop } from "../../lib/phases"
import { firstName, worstIssue } from "../../pages/helpers"
import { workflowStepKind } from "../../engine/workflowStepKind"
import { statusStyles } from "../ui"
import { executionTeamSnapshot, teamMetroLayout } from "./teamMetro"
import "./teamMetro.css"

interface Props { state: DemoState; sched: Schedule; forecast: Forecast; eventId: string; selectedId: string | null; onSelect: (id: string) => void }
const MilestoneExecutionChart = lazy(() => import("./MilestoneExecutionChart").then(module => ({ default: module.MilestoneExecutionChart })))
const LEFT = 194, COL = 144, ROW = 136, TOP = 154

/** Saved workflow definitions become actual tasks here; a dot never has separate state or a separate ID. */
export function TeamMetroChart({ state, sched, forecast, eventId, selectedId, onSelect }: Props) {
  const event = state.events.find(item => item.id === eventId)
  const snapshot = executionTeamSnapshot(event)
  const graph = useMemo(() => snapshot ? teamMetroLayout(state.nodes.filter(node => node.eventId === eventId), snapshot) : null, [state.nodes, eventId, snapshot])
  const styles = statusStyles(state)
  const marker = useId().replace(/:/g, "")
  const [hovered, setHovered] = useState<string | null>(null)
  const [focused, setFocused] = useState<string | null>(null)
  if (event?.workflowRun?.snapshot.milestoneGraph) return <Suspense fallback={<p className="small muted" role="status">Loading activity workflow…</p>}><MilestoneExecutionChart state={state} sched={sched} forecast={forecast} eventId={eventId} selectedId={selectedId} onSelect={onSelect} /></Suspense>
  if (!event || !graph) return null
  const width = Math.max(640, LEFT + graph.columns * COL + 48)
  const height = TOP + Math.max(1, graph.lanes.length) * ROW
  const point = (position: { col: number; row: number }) => ({ x: LEFT + position.col * COL, y: TOP + position.row * ROW })
  return <div className="team-metro-wrap" data-testid="team-execution-chart">
    <div className="metro team-metro" data-testid="flow-chart" tabIndex={0} role="region" aria-label="Task tracks by team">
      <div className="metro-canvas" style={{ width, height }}>
        <svg width={width} height={height} aria-hidden="true">
          <defs><marker id={marker} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7 Z" className="team-metro-arrow" /></marker></defs>
          {graph.lanes.map(lane => <path key={lane.team.id} className="team-metro-guide" d={`M${LEFT - 44} ${TOP + lane.row * ROW} H${width - 36}`} />)}
          {graph.links.map(link => {
            const a = point(graph.positions.get(link.from)!), b = point(graph.positions.get(link.to)!)
            const bend = a.x + (b.x - a.x) / 2
            const done = state.nodes.find(node => node.id === link.from)?.status === "done"
            return <path key={`${link.from}=>${link.to}`} data-testid="team-execution-link" data-from={link.from} data-to={link.to} className={`m-line team-metro-link${done ? " done" : ""}`} d={`M${a.x + 14} ${a.y} C${bend} ${a.y} ${bend} ${b.y} ${b.x - 20} ${b.y}`} markerEnd={`url(#${marker})`} />
          })}
        </svg>
        {graph.lanes.map(lane => <div key={lane.team.id} className="team-metro-lane" data-testid="team-execution-lane" data-team-id={lane.team.id} role="group" aria-label={`${lane.team.name} task track`} style={{ top: TOP + lane.row * ROW, height: ROW }}>
          <span className="team-metro-team"><b>{lane.team.name}</b><span>{lane.tasks.length} task{lane.tasks.length === 1 ? "" : "s"}</span></span>
          {!lane.tasks.length && <span className="team-metro-empty">No tasks in this workflow</span>}
          {lane.tasks.map(({ node, col }) => {
            const plan = sched.nodes[node.id]
            const issue = worstIssue(plan?.issues)
            const late = node.status !== "done" && (plan?.club ?? "9999") < state.today
            const status = nodeStop(node, state.today, issue?.severity === "error" || late || forecast.nodes[node.id]?.color === "red" || node.status === "blocked")
            const kind = workflowStepKind(node, event.workflowBranches) === "core" ? "baseline" : "situation"
            const owner = state.people.find(person => person.id === node.ownerId)?.name ?? "No owner"
            const tooltip = hovered === node.id || focused === node.id
            const tooltipId = `${marker}-${col}-${lane.row}`
            return <div key={node.id} className={`m-node below team-metro-task${selectedId === node.id ? " is-selected" : ""}`} style={{ "--x": `${LEFT + col * COL}px`, "--y": "0px" } as CSSProperties}
              onPointerEnter={event => { if (event.pointerType !== "touch") setHovered(node.id) }} onPointerLeave={() => setHovered(null)}>
              <button type="button" className={`m-dot ${kind} ${status}`} data-testid={`flow-node-${node.stepKey ?? node.id}`} data-task-id={node.id} aria-pressed={selectedId === node.id} aria-label={`${node.title}. ${styles[node.status].label}. Owner ${owner}. Due ${plan ? fmtShort(plan.club) : "pending"}. ${kind === "baseline" ? "Core event step." : "Situation-based step."}${issue ? ` ${issue.text}` : ""}`} aria-describedby={tooltip ? tooltipId : undefined} onFocus={() => setFocused(node.id)} onBlur={() => setFocused(null)} onClick={() => onSelect(node.id)} />
              <span className="m-label" aria-hidden="true"><b>{node.title}</b><span>{firstName(state, node.ownerId)}{plan ? ` · ${fmtShort(plan.club)}` : ""}</span></span>
              {tooltip && <span id={tooltipId} role="tooltip" className="m-card"><b>{node.title}</b><span>{owner} · {styles[node.status].label}</span>{plan && <span>Due {fmtShort(plan.club)}</span>}{issue && <span className="m-card-warn">{issue.text}</span>}</span>}
            </div>
          })}
        </div>)}
      </div>
      <div className="m-legend small" aria-label="Legend"><span><i className="m-dot done" />Done</span><span><i className="m-dot now" />Working on it</span><span><i className="m-dot todo" />To do</span><span><i className="m-dot risk" />At risk</span></div>
    </div>
    {!!graph.issues.length && <div className="team-metro-issues" role="status">{graph.issues.map(issue => <p className="small muted" key={issue}>{issue}</p>)}</div>}
    {!!graph.unassigned.length && <section className="team-metro-unassigned" aria-label="Tasks needing a team"><p className="small muted">No team yet</p>{graph.unassigned.map(node => <button type="button" className="btn small" key={node.id} onClick={() => onSelect(node.id)} data-task-id={node.id}>{node.title}</button>)}</section>}
  </div>
}
