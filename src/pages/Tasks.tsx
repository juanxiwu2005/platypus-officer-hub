import { useEffect, useRef, useState } from "react"
import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom"
import { useSchedule, useStore, useViewer } from "../data/store"
import type { Node } from "../data/types"
import { PageHead } from "../components/Page"
import { Bts, BtsTr } from "../components/Bts"
import { useRail } from "../components/rail/RailContext"
import { FollowupPanel } from "../components/FollowupPanel"
import { daysBetween, fmtShort } from "../lib/dates"
import { inMyTasks, isInTaskHorizon } from "../data/myWork"
import { newTaskNotice } from "../data/board"
import { Avatar, Empty, NodePill } from "../components/ui"
import { canLead } from "../data/changeReview"
import { isOfficer, officers } from "../data/permissions"
import { TaskTypeIcon } from "../components/TaskTypeIcon"
import { defaultTaskDue } from "../engine/taskDates"
import { TaskDueFields } from "../components/rail/TaskFields"

import { planTaskPath, resolvePlanEntry } from "../reminders/planEntry"
import { useTaskAccess } from "../reminders/useTaskAccess"

/** The Tasks page is an action horizon, not the whole semester's project plan (src/data/myWork.ts). */
export { isInTaskHorizon }

export default function Tasks() {
  const { state, dispatch } = useStore()
  const { person } = useViewer()
  const rail = useRail()
  const [params] = useSearchParams()
  const access = useTaskAccess(params.get("access") ?? "")
  const entry = resolvePlanEntry(state, params, access.grant, access.checking, "tasks")
  const location = useLocation()
  const [scope, setScope] = useState("mine")
  const [notice, setNotice] = useState("")
  // FB-5: the last task the page-head form created, so the notice can offer Undo (the same undo as the Ask form).
  const [undoId, setUndoId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const linked = params.get("node")
  useEffect(() => { if (!params.has("access") && linked && state.nodes.some(n => n.id === linked)) rail.show({ kind: "task", id: linked, reply: params.get("reply") }) }, [linked, params.get("reply"), location.key])
  useEffect(() => { if (!notice) return; const t = setTimeout(() => { setNotice(""); setUndoId(null) }, undoId ? 8000 : 3200); return () => clearTimeout(t) }, [notice, undoId])
  const say = (text: string) => { setUndoId(null); setNotice(text) }

  // "My tasks" is the same list the Plan badge counts (src/data/myWork.ts): mine, tasks a teammate is waiting on me for,
  // and, for the president or VP, open work with no owner yet.
  const visible = state.nodes.filter(n => scope === "team" ? isInTaskHorizon(n, state.today) : inMyTasks(state, n, person.id))
  if (params.has("access")) {
    if (entry.checking) return <p role="status">Opening task…</p>
    if (entry.error || !entry.node) return <section className="card"><h1>Check your task link</h1><p role="alert">{entry.error ?? "This task is unavailable."}</p><Link to="/events">Open Plan</Link></section>
    return <Navigate to={planTaskPath(state.events.find(event => event.id === entry.node!.eventId)?.id, entry.node.id, params.get("access")!, entry.origin?.id)} replace />
  }
  return <>
    <PageHead path="/tasks" actions={<>
      <select className="select" aria-label="Task scope" value={scope} onChange={e => setScope(e.target.value)}><option value="mine">My tasks</option><option value="team">Team tasks</option></select>
      {/* S3 (2026-11-23): the Table is the only view; "+ New task" and Ask are the ways to create a task. */}
      <NewTask open={creating} onOpen={() => setCreating(true)} />
    </>} />
    {creating && <NewTaskForm onClose={() => setCreating(false)} onCreated={(text, id) => { setNotice(text); setUndoId(id) }} />}
    {notice && <p className="board-notice" role="status">{notice}{undoId && <button type="button" className="link" data-testid="new-task-undo" onClick={() => { dispatch({ type: "undoAuto", id: undoId }); say("Task removed.") }}>Undo</button>}</p>}
    <TaskTable nodes={visible} showOwner={scope === "team"} />
    <FollowupPanel />
  </>
}

/**
 * "+ New task" in the page head (FB-5). It opens the small form below the head; incoming and
 * former officers viewed as can read but not create (store.tsx READ_ONLY_OK), so for them it is off and says why.
 */
function NewTask({ open, onOpen }: { open: boolean; onOpen: () => void }) {
  const { state } = useStore()
  const readOnly = state.people.some(p => p.id === state.viewerId && !isOfficer(p))
  return <span className="new-task">
    <button type="button" className="btn btn-primary" data-testid="new-task" aria-expanded={open} aria-controls="new-task-form" disabled={readOnly} aria-describedby={readOnly ? "new-task-why" : undefined}
      onClick={() => { if (open) document.getElementById("new-task-name")?.focus(); else onOpen() }}>+ New task</button>
    {readOnly && <span className="small muted" id="new-task-why">Only current officers can add tasks.</span>}
  </span>
}

const ANYONE = "__anyone"
/**
 * The page-head form (FB-5, M2b rules): Task name, Assign to, Due. For yourself it is To do at once; for someone else it
 * waits in Not claimed until they press "I've got it", and they get a notice; "Anyone" (president or VP) has no owner.
 * The one date is the task's due date, from the rule engine's default (AGENTS.md rule 3); it goes through createTasks.
 */
function NewTaskForm({ onClose, onCreated }: { onClose: () => void; onCreated: (text: string, changeSetId: string) => void }) {
  const { state, dispatch } = useStore()
  const lead = canLead(state)
  const [title, setTitle] = useState("")
  const [assignee, setAssignee] = useState(state.viewerId)
  const [due, setDue] = useState(() => defaultTaskDue(state))
  const [error, setError] = useState("")
  const others = officers(state).filter(p => p.id !== state.viewerId)
  const opener = useRef<HTMLElement | null>(null)
  useEffect(() => { opener.current = document.querySelector<HTMLElement>("[data-testid=new-task]") }, [])
  const close = () => { onClose(); setTimeout(() => opener.current?.focus(), 0) }
  return <form id="new-task-form" className="card new-task-form" data-testid="new-task-form" autoComplete="off" aria-label="New task"
    onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close() } }}
    onSubmit={e => {
      e.preventDefault()
      const name = title.trim()
      if (!name) return setError("Give the task a name.")
      if (!/^\d{4}-\d{2}-\d{2}$/.test(due) || due < state.today) return setError("Pick a due date from today on.")
      const ownerId = assignee === ANYONE ? null : assignee
      const id = `tasks-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      dispatch({ type: "createTasks", id, sentence: name, tasks: [{ title: name, ownerId, eventId: null }], date: due, buffered: false, source: "Added on the Tasks page" })
      onCreated(newTaskNotice(state, ownerId), id)
      close()
    }}>
    <label className="new-task-name">Task name<input id="new-task-name" autoFocus value={title} maxLength={100} placeholder="e.g. Order name tags" aria-label="New task name" onChange={e => { setTitle(e.target.value); setError("") }} /></label>
    <label>Assign to<select aria-label="Assign to" value={assignee} onChange={e => setAssignee(e.target.value)}>
      <option value={state.viewerId}>Me</option>
      {others.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      {lead && <option value={ANYONE}>Anyone (open)</option>}
    </select></label>
    <div className="new-task-due"><TaskDueFields due={due} onDue={d => { setDue(d); setError("") }} /></div>
    {error && <p className="small late-text" role="alert">{error}</p>}
    <div className="new-task-buttons">
      <button className="btn btn-primary" type="submit">Add</button>
      <button className="btn" type="button" onClick={close}>Cancel</button>
    </div>
  </form>
}

/**
 * monday-style table grouped by event. Owner and due are read-only here; a row opens Task Details, whose Edit changes them (S3).
 * With the Board gone (S3), the finished tasks in the current scope sit in one "Done (N)" group at the bottom, folded by
 * default, so a finished task (and its Undo mark done or reopen) can still be reached from this page.
 */
function TaskTable({ nodes, showOwner }: { nodes: Node[]; showOwner: boolean }) {
  const { state } = useStore()
  const sched = useSchedule()
  const rail = useRail()
  const [toggled, setToggled] = useState<Record<string, boolean>>({})
  const [doneOpen, setDoneOpen] = useState(false)
  const open = nodes.filter(n => n.status !== "done").sort((a, b) => (a.latestStart ?? "9999").localeCompare(b.latestStart ?? "9999"))
  const done = nodes.filter(n => n.status === "done").sort((a, b) => (b.completedOn ?? b.lastUpdate ?? "").localeCompare(a.completedOn ?? a.lastUpdate ?? "") || a.id.localeCompare(b.id))
  const groups = [...state.events.map(e => ({ id: e.id, name: e.name })), { id: "", name: "Club tasks" }].map(g => ({ ...g, rows: open.filter(n => (n.eventId ?? "") === g.id) })).filter(g => g.rows.length)
  // Groups whose work is all more than three weeks away start folded, like monday's collapsed groups.
  const folded = (g: (typeof groups)[number]) => toggled[g.id] ?? g.rows.every(n => n.latestStart && daysBetween(state.today, n.latestStart) > 21)
  const cols = showOwner ? 4 : 3
  const row = (n: Node) => {
    const late = n.status !== "done" && n.clubDeadline && n.clubDeadline < state.today
    return [<tr key={n.id} data-testid="task-card">
      <td><button type="button" className="row-btn task-title" onClick={() => rail.show({ kind: "task", id: n.id })}><TaskTypeIcon node={n} /><span>{n.title}</span></button></td>
      {showOwner && <td><span className="who"><Avatar name={state.people.find(p => p.id === n.ownerId)?.name} size="sm" />{state.people.find(p => p.id === n.ownerId)?.name.split(" ")[0] ?? ""}</span></td>}
      <td><NodePill node={n} small /></td>
      <td className={late ? "late-text" : ""}><span className="small">{n.clubDeadline ? fmtShort(n.clubDeadline) : ""}</span></td>
    </tr>,
    <BtsTr key={`${n.id}-bts`} cols={cols}>
      <Bts label="Rule engine">{sched.nodes[n.id]?.explain.club}</Bts>
    </BtsTr>]
  }
  return <section className="card tbl-wrap" data-testid="my-tasks">
    <table className="tbl">
      <thead><tr><th>Task</th>{showOwner && <th>Owner</th>}<th>Status</th><th>Due</th></tr></thead>
      <tbody>{groups.map(g => [
        <tr key={`g-${g.id}`} className="group"><td colSpan={cols}><button type="button" className="group-btn" aria-expanded={!folded(g)} onClick={() => setToggled({ ...toggled, [g.id]: folded(g) ? false : true })}><span className="caret" aria-hidden="true">{folded(g) ? "▸" : "▾"}</span>{g.name}<span className="count">{g.rows.length}</span></button></td></tr>,
        ...(folded(g) ? [] : g.rows).map(row),
      ])}</tbody>
      {done.length > 0 && <tbody data-testid="done-tasks">
        <tr className="group"><td colSpan={cols}><button type="button" className="group-btn" data-testid="done-group" aria-expanded={doneOpen} onClick={() => setDoneOpen(!doneOpen)}><span className="caret" aria-hidden="true">{doneOpen ? "▾" : "▸"}</span>Done ({done.length})</button></td></tr>
        {doneOpen && done.map(row)}
      </tbody>}
    </table>
    {!open.length && <Empty>Nothing open.</Empty>}
  </section>
}
