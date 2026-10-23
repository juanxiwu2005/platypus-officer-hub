import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useStore, useViewer } from "../data/store"
import type { Node } from "../data/types"
import { PageHead } from "../components/Page"
import { TaskDetail } from "../components/TaskDetail"
import { NudgeComposer } from "../components/NudgeComposer"
import { PrivateInbox } from "../components/PrivateInbox"
import { FollowupPanel } from "../components/FollowupPanel"
import { daysBetween, fmtShort } from "../lib/dates"
import { nudgeBlocked } from "../lib/nudges"
import { statusOf } from "./helpers"

const COLUMNS = ["Unclaimed", "In progress", "Waiting", "Need help", "Done"]
const column = (n: Node) => n.status === "unclaimed" ? "Unclaimed" : n.status === "done" ? "Done" : n.status === "waiting" ? "Waiting" : n.status === "blocked" ? "Need help" : "In progress"

export default function Tasks() {
  const { state } = useStore()
  const { person, canNudge } = useViewer()
  const [params, setParams] = useSearchParams()
  const linked = state.nodes.find(n => n.id === params.get("node"))
  const [view, setView] = useState("list")
  const [scope, setScope] = useState("mine")
  const [nudge, setNudge] = useState<string | null>(null)
  const mine = state.nodes.filter(n => n.ownerId === person.id && n.status !== "done").sort((a, b) => (a.latestStart ?? "").localeCompare(b.latestStart ?? ""))
  const unclaimed = state.nodes.filter(n => n.status === "unclaimed" && !n.ownerId)
  const visible = state.nodes.filter(n => scope === "team" || n.ownerId === person.id)
  const select = (n: Node) => setParams({ node: n.id })
  const item = (n: Node) => <article key={n.id} className="task-card" data-testid="task-card"><button className="row-btn" onClick={() => select(n)}><b>{n.title}</b><span className="small muted">{state.people.find(p => p.id === n.ownerId)?.name ?? "No owner"} · {state.events.find(e => e.id === n.eventId)?.name ?? "Club task"}</span><span className="small muted">{n.latestStart ? `start by ${fmtShort(n.latestStart)}` : ""}{n.clubDeadline ? ` · due ${fmtShort(n.clubDeadline)}` : ""}</span></button><div className="action-row"><span className={`tag ${statusOf(n).tone}`}>{statusOf(n).text}</span>{canNudge && n.status !== "done" && <button className="btn small" disabled={!!nudgeBlocked(state, n)} title={nudgeBlocked(state, n) ?? "Review a private reminder"} onClick={() => setNudge(n.id)}>Draft reminder</button>}</div></article>
  return <>
    <PageHead path="/tasks" lead="Your own tasks first. Claim a handover, share an update, or ask for help." />
    <div className="action-row task-toolbar"><div className="view-switch" aria-label="Task view">{["list", "board", "gantt"].map(v => <button key={v} className={`btn ${view === v ? "btn-primary" : ""}`} aria-pressed={view === v} onClick={() => setView(v)}>{v === "list" ? "List" : v === "board" ? "Board" : "Gantt"}</button>)}</div><label className="field-inline">Show<select aria-label="Task scope" value={scope} onChange={e => setScope(e.target.value)}><option value="mine">My tasks</option><option value="team">Team tasks</option></select></label></div>
    {linked && <TaskDetail key={`${linked.id}:${state.viewerId}`} node={linked} actorId={person.id} initialReply={params.get("reply")} />}
    {view === "list" ? <>
      <section className="card" aria-labelledby="mine-h"><header><h2 id="mine-h">{scope === "mine" ? "Mine" : "Team tasks"}</h2><span className="small muted">{scope === "mine" ? mine.length : visible.filter(n => n.status !== "done").length} open</span></header><div className="task-list" data-testid="my-tasks">{(scope === "mine" ? mine : visible.filter(n => n.status !== "done")).map(item)}{scope === "mine" && !mine.length && <p className="muted">Nothing open in your assigned tasks. Sources: this browser's task records.</p>}</div></section>
      {!!unclaimed.length && <section className="card"><header><h2>Available to claim</h2></header><div className="task-list">{unclaimed.map(item)}</div></section>}
    </> : view === "board" ? <div className="task-board" data-testid="task-board">{COLUMNS.map(label => <section key={label} className="board-column"><header><h2>{label}</h2><span className="tag">{visible.filter(n => column(n) === label).length}</span></header>{visible.filter(n => column(n) === label).map(item)}</section>)}</div> : <TaskGantt nodes={visible} onSelect={select} />}
    <FollowupPanel />
    <PrivateInbox />
    {nudge && <NudgeComposer key={nudge} nodeId={nudge} onClose={() => setNudge(null)} />}
  </>
}

function TaskGantt({ nodes, onSelect }: { nodes: Node[]; onSelect: (n: Node) => void }) {
  const starts = nodes.map(n => n.latestStart).filter((d): d is string => !!d).sort()
  const ends = nodes.map(n => n.clubDeadline).filter((d): d is string => !!d).sort()
  const from = starts[0], to = ends.at(-1)
  if (!from || !to) return <section className="card"><p>No dated tasks in this view.</p></section>
  const span = Math.max(1, daysBetween(from, to) + 1)
  return <section className="card task-gantt" data-testid="task-gantt"><header><h2>Task timeline</h2><span className="small muted">{fmtShort(from)} → {fmtShort(to)} · start to club deadline</span></header>{nodes.map(n => <div key={n.id} className="task-gantt-row"><button className="row-btn small" onClick={() => onSelect(n)}>{n.title}</button><div className="task-gantt-track">{n.latestStart && n.clubDeadline && <button className={`task-gantt-bar ${n.status === "done" ? "done" : ""}`} aria-label={`${n.title}: ${fmtShort(n.latestStart)} to ${fmtShort(n.clubDeadline)}`} style={{ left: `${daysBetween(from, n.latestStart) / span * 100}%`, width: `${Math.max(1, (daysBetween(n.latestStart, n.clubDeadline) + 1) / span * 100)}%` }} onClick={() => onSelect(n)} />}</div><span className="small muted">{n.clubDeadline ? fmtShort(n.clubDeadline) : "—"}</span></div>)}</section>
}
