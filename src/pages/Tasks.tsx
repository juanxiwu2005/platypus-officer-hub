import { useEffect, useRef, useState } from "react"
import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom"
import { useSchedule, useStore, useViewer } from "../data/store"
import type { Node } from "../data/types"
import { PageHead } from "../components/Page"
import { Bts, BtsTr } from "../components/Bts"
import { useRail } from "../components/rail/RailContext"
import { FollowupPanel } from "../components/FollowupPanel"
import { addDays, daysBetween, fmtShort } from "../lib/dates"
import { inMyTasks, isInTaskHorizon } from "../data/myWork"
import { newTaskNotice } from "../data/board"
import { Avatar, Empty, NodePill } from "../components/ui"
import { canLead } from "../data/changeReview"
import { isOfficer, officers } from "../data/permissions"
import { TaskTypeIcon } from "../components/TaskTypeIcon"
import { defaultTaskDue } from "../engine/taskDates"
import { TaskDueFields } from "../components/rail/TaskFields"
import { isClubTask, linkableEvents, linkBranch, linkError, taskKind } from "../data/clubTasks"

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
  const [kind, setKind] = useState("all")
  // The task just given to someone else: ask once whether to email them (Juanxi, 2026-11-28).
  const [emailAsk, setEmailAsk] = useState<string | null>(null)
  const linked = params.get("node")
  useEffect(() => { if (!params.has("access") && linked && state.nodes.some(n => n.id === linked)) rail.show({ kind: "task", id: linked, reply: params.get("reply") }) }, [linked, params.get("reply"), location.key])
  useEffect(() => { if (!notice) return; const t = setTimeout(() => { setNotice(""); setUndoId(null) }, undoId ? 8000 : 3200); return () => clearTimeout(t) }, [notice, undoId])
  const say = (text: string) => { setUndoId(null); setNotice(text) }

  // "My tasks" is the same list the Plan badge counts (src/data/myWork.ts): mine, tasks a teammate is waiting on me for,
  // and, for the president or VP, open work with no owner yet.
  const visible = state.nodes.filter(n => scope === "team" ? isInTaskHorizon(n, state.today) : inMyTasks(state, n, person.id)).filter(n => kind === "all" || taskKind(n) === kind)
  if (params.has("access")) {
    if (entry.checking) return <p role="status">Opening task…</p>
    if (entry.error || !entry.node) return <section className="card"><h1>Check your task link</h1><p role="alert">{entry.error ?? "This task is unavailable."}</p><Link to="/events">Open Plan</Link></section>
    return <Navigate to={planTaskPath(state.events.find(event => event.id === entry.node!.eventId)?.id, entry.node.id, params.get("access")!, entry.origin?.id)} replace />
  }
  return <>
    <PageHead path="/tasks" actions={<>
      <select className="select" aria-label="Task scope" value={scope} onChange={e => setScope(e.target.value)}><option value="mine">My tasks</option><option value="team">Team tasks</option></select>
      <select className="select" aria-label="Task type" value={kind} onChange={e => setKind(e.target.value)}><option value="all">All types</option><option value="club">Club tasks</option><option value="event">Event tasks</option></select>
      {/* S3 (2026-11-23): the Table is the only view; "+ New task" and Ask are the ways to create a task. */}
      <NewTask open={creating} onOpen={() => setCreating(true)} />
    </>} />
    {creating && <NewTaskForm onClose={() => setCreating(false)} onCreated={(text, id, nodeId, ownerId) => { setNotice(text); setUndoId(id); if (ownerId && ownerId !== state.viewerId) setEmailAsk(nodeId) }} />}
    {emailAsk && <EmailAsk nodeId={emailAsk} onDone={sent => { setEmailAsk(null); if (sent) setNotice(text => `${text} ${sent}`.trim()) }} />}
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
function NewTaskForm({ onClose, onCreated }: { onClose: () => void; onCreated: (text: string, changeSetId: string, nodeId: string, ownerId: string | null) => void }) {
  const { state, dispatch } = useStore()
  const lead = canLead(state)
  const [title, setTitle] = useState("")
  const [assignee, setAssignee] = useState(state.viewerId)
  const [due, setDue] = useState(() => defaultTaskDue(state))
  const [eventId, setEventId] = useState("")
  const [error, setError] = useState("")
  const others = officers(state).filter(p => p.id !== state.viewerId)
  const events = linkableEvents(state)
  const event = events.find(e => e.id === eventId)
  const ownerId = assignee === ANYONE ? null : assignee
  const branch = event ? linkBranch(state, event, ownerId) : null
  const owner = state.people.find(p => p.id === ownerId)
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
      const linkProblem = eventId ? linkError(state, eventId, due) : null
      if (linkProblem) return setError(linkProblem)
      const id = `tasks-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      dispatch({ type: "createTasks", id, sentence: name, tasks: [{ title: name, ownerId, eventId: null, ...(event ? { link: { eventId: event.id, branchId: branch?.branchId ?? "event-lead", order: branch?.order ?? 0, ...(branch?.teamId ? { teamId: branch.teamId } : {}) } } : {}) }], date: due, buffered: false, source: "Added on the Tasks page" })
      onCreated(newTaskNotice(state, ownerId), id, `${id}:0`, ownerId)
      close()
    }}>
    <label className="new-task-name">Task name<input id="new-task-name" autoFocus value={title} maxLength={100} placeholder="e.g. Order name tags" aria-label="New task name" onChange={e => { setTitle(e.target.value); setError("") }} /></label>
    <label>Assign to<select aria-label="Assign to" value={assignee} onChange={e => setAssignee(e.target.value)}>
      <option value={state.viewerId}>Me</option>
      {others.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      {lead && <option value={ANYONE}>Anyone (open)</option>}
    </select></label>
    <div className="new-task-due">
      <TaskDueFields due={due} onDue={d => { setDue(d); setError("") }} />
      {/* Quick dates (Juanxi, 2026-11-28): today plus 3, 5 or 7 calendar days. */}
      <div className="new-task-quick ctl-row ctl-sm" role="group" aria-label="Quick due dates">{[3, 5, 7].map(days => {
        const date = addDays(state.today, days)
        return <button key={days} type="button" className="btn" aria-pressed={due === date} disabled={!!event && date >= event.date} onClick={() => { setDue(date); setError("") }}>In {days} days</button>
      })}</div>
    </div>
    {/* Only the president or VP may put a task into an event's flow (Juanxi 2026-11-28); other officers make club tasks. */}
    {lead && <>
      <label className="new-task-link">Link to an event (optional)<select aria-label="Link to an event" value={eventId} onChange={e => { setEventId(e.target.value); setError("") }}>
        <option value="">No event: a club task</option>
        {events.map(e => <option key={e.id} value={e.id}>{e.name} · {fmtShort(e.date)}</option>)}
      </select></label>
      <p className="new-task-link-note small muted" data-testid="new-task-link-note">{event
        ? <>It stays in Club tasks and also goes last in {owner ? `${owner.name.split(" ")[0]}'s` : "the"} <b>{branch?.title ?? "event"}</b> branch before {event.name} ({fmtShort(event.date)}). To change the event's own steps, use Edit flow on <Link to={`/events?event=${encodeURIComponent(event.id)}`}>{event.name}</Link>.</>
        : "A club task. Linking it to an event also puts it in that event's flow."}</p>
    </>}
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
  const groups = [...state.events.map(e => ({ id: e.id, name: e.name })), { id: "", name: "Club tasks" }].map(g => ({ ...g, rows: open.filter(n => g.id ? n.eventId === g.id && !n.clubTask : isClubTask(n)) })).filter(g => g.rows.length)
  // Groups whose work is all more than three weeks away start folded, like monday's collapsed groups.
  const folded = (g: (typeof groups)[number]) => toggled[g.id] ?? g.rows.every(n => n.latestStart && daysBetween(state.today, n.latestStart) > 21)
  const cols = showOwner ? 4 : 3
  const row = (n: Node) => {
    const late = n.status !== "done" && n.clubDeadline && n.clubDeadline < state.today
    return [<tr key={n.id} data-testid="task-card">
      <td><button type="button" className="row-btn task-title" onClick={() => rail.show({ kind: "task", id: n.id })}><TaskTypeIcon node={n} /><span>{n.title}</span></button>{n.clubTask && n.eventId && <span className="task-link-tag small muted">{state.events.find(e => e.id === n.eventId)?.name}</span>}</td>
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

/**
 * Right after a task is given to someone else (Juanxi, 2026-11-28): email them about it? One ask, nothing is sent without "Send
 * email". Demo: the email is recorded (src/data/changeReview.ts sendTaskEmail), nothing leaves the app, and it is not a reminder.
 */
function EmailAsk({ nodeId, onDone }: { nodeId: string; onDone: (sent: string | null) => void }) {
  const { state, dispatch } = useStore()
  const node = state.nodes.find(n => n.id === nodeId)
  const to = state.people.find(p => p.id === node?.ownerId)
  const send = useRef<HTMLButtonElement | null>(null)
  // After the form hands focus back to "+ New task" (its own timeout), so the question gets it.
  useEffect(() => { const t = setTimeout(() => send.current?.focus(), 0); return () => clearTimeout(t) }, [])
  if (!node || !to) return null
  const close = (sent: string | null) => { onDone(sent); setTimeout(() => document.querySelector<HTMLElement>("[data-testid=new-task]")?.focus(), 0) }
  return <div className="email-ask-backdrop">
    <div className="card email-ask" role="alertdialog" aria-modal="true" aria-labelledby="email-ask-title" aria-describedby="email-ask-text" data-testid="email-ask"
      onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(null) } }}>
      <h2 id="email-ask-title">Email {to.name.split(" ")[0]} about this task?</h2>
      <p id="email-ask-text" className="small">“{node.title}” goes to {to.email || to.name} with a link to the task. They already see it in their task list.</p>
      <div className="email-ask-buttons ctl-row">
        <button ref={send} type="button" className="btn btn-primary" data-log-name="new-task-email-send" onClick={() => { dispatch({ type: "sendTaskEmail", nodeId }); close(`Emailed ${to.name.split(" ")[0]}.`) }}>Send email</button>
        <button type="button" className="btn" data-log-name="new-task-email-skip" onClick={() => close(null)}>Not now</button>
      </div>
    </div>
  </div>
}
