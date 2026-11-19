import { useEffect, useRef, useState, type CSSProperties } from "react"
import { Link, useLocation, useSearchParams } from "react-router-dom"
import { useSchedule, useStore, useViewer } from "../data/store"
import type { Node, NodeStatus } from "../data/types"
import { PageHead } from "../components/Page"
import { Bts, BtsTr } from "../components/Bts"
import { useRail } from "../components/rail/RailContext"
import { FollowupPanel } from "../components/FollowupPanel"
import { daysBetween, fmtShort, fromISO, toISO } from "../lib/dates"
import { isInActionHorizon } from "../engine/team"
import { canMoveTask, byRank, addTaskNotice, newTaskNotice } from "../data/board"
import { useDragSort } from "../lib/dragSort"
import { Avatar, Empty, NodePill, useStatusStyles } from "../components/ui"
import { canLead } from "../data/changeReview"
import { isOfficer, officers } from "../data/permissions"
import { TaskTypeIcon } from "../components/TaskTypeIcon"
import { defaultTaskDue } from "../engine/taskDates"
import { TaskDueFields } from "../components/rail/TaskFields"

import { resolvePlanEntry } from "../reminders/planEntry"
import { useTaskAccess } from "../reminders/useTaskAccess"

type View = "table" | "board" | "timeline"
const BOARD_STATUSES: NodeStatus[] = ["unclaimed", "accepted", "in_progress", "waiting", "blocked", "done"]

/** The Tasks page is an action horizon, not the whole semester's project plan. */
export function isInTaskHorizon(node: Node, today: string): boolean {
  if (node.status === "done") {
    const day = fromISO(today)
    day.setDate(day.getDate() - ((day.getDay() + 6) % 7) - 7) // Monday of last week
    return (node.completedOn ?? node.lastUpdate ?? "") >= toISO(day)
  }
  return isInActionHorizon(node, today)
}

export default function Tasks() {
  const { state, dispatch } = useStore()
  const { person } = useViewer()
  const rail = useRail()
  const [params, setParams] = useSearchParams()
  const access = useTaskAccess(params.get("access") ?? "")
  const entry = resolvePlanEntry(state, params, access.grant, access.checking, "tasks")
  const location = useLocation()
  const [view, setView] = useState<View>("board")
  const [scope, setScope] = useState(() => params.has("access") ? "team" : "mine")
  const [notice, setNotice] = useState("")
  // FB-5: the last task the page-head form created, so the notice can offer Undo (the same undo as the Ask form).
  const [undoId, setUndoId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const lead = canLead(state)
  const linked = params.get("node")
  useEffect(() => {
    if (params.has("access") && (entry.error || entry.checking)) { if (rail.detail?.kind === "task") rail.closeDetail(); return }
    if (linked && state.nodes.some(n => n.id === linked)) rail.show({ kind: "task", id: linked, reply: params.get("reply") })
  }, [linked, params.get("reply"), location.key, entry.error, entry.checking])
  const openTask = (id: string) => {
    if (params.has("access")) {
      const next = new URLSearchParams(params); next.set("node", id)
      if (entry.origin) next.set("from", entry.origin.id)
      setParams(next)
    }
    rail.show({ kind: "task", id })
  }
  useEffect(() => { if (!notice) return; const t = setTimeout(() => { setNotice(""); setUndoId(null) }, undoId ? 8000 : 3200); return () => clearTimeout(t) }, [notice, undoId])
  const say = (text: string) => { setUndoId(null); setNotice(text) }

  // The board's quick "+ Add task" goes through here, so the card never lands somewhere without saying why (audit §6.4).
  const addTask = (title: string, status: NodeStatus) => {
    if (!title.trim()) return
    say(addTaskNotice(state, status) ?? "")
    dispatch({ type: "addTask", title, status })
  }
  // A teammate who is explicitly holding up a task sees it in To do as well as
  // receiving an Update. Ownership stays with the original task owner.
  const visible = state.nodes.filter(n => (scope === "team" || n.ownerId === person.id || n.waitingOnPersonId === person.id || (n.status === "unclaimed" && !n.ownerId)) && isInTaskHorizon(n, state.today))
  if (params.has("access") && entry.checking) return <p role="status">Opening your task in Plan…</p>
  if (params.has("access") && entry.error) return <section className="card"><h1>Check your task link</h1><p role="alert">{entry.error}</p><Link to="/tasks">Open Plan</Link></section>
  return <>
    <PageHead path="/tasks" actions={<>
      <div className="seg" role="group" aria-label="Task view">{(["board", "table", "timeline"] as View[]).map(v => <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>{v === "table" ? "Table" : v === "board" ? "Board" : "Timeline"}</button>)}</div>
      <select className="select" aria-label="Task scope" value={scope} onChange={e => setScope(e.target.value)}><option value="mine">My tasks</option><option value="team">Team tasks</option></select>
      {/* The only create entry used to sit at the foot of one board column, so the page looked read-only (audit §6.1). */}
      <NewTask open={creating} onOpen={() => setCreating(true)} />
    </>} />
    {creating && <NewTaskForm onClose={() => setCreating(false)} onCreated={(text, id) => { setNotice(text); setUndoId(id) }} />}
    {notice && <p className="board-notice" role="status">{notice}{undoId && <button type="button" className="link" data-testid="new-task-undo" onClick={() => { dispatch({ type: "undoAuto", id: undoId }); say("Task removed.") }}>Undo</button>}</p>}
    {view === "table" && <TaskTable nodes={visible} editable={lead} showOwner={scope === "team"} onSelect={openTask} />}
    {view === "board" && <Board nodes={visible} onAdd={addTask} onNotice={say} onSelect={openTask} />}
    {view === "timeline" && <TaskTimeline nodes={visible.filter(n => n.status !== "done")} onSelect={n => openTask(n.id)} />}
    <FollowupPanel />
  </>
}

/**
 * "+ New task" in the page head, in all three views (FB-5). It opens the small form below the head; incoming and
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

/** monday-style table grouped by event; owner and due date are edited right in the row. */
function TaskTable({ nodes, editable, showOwner, onSelect }: { nodes: Node[]; editable: boolean; showOwner: boolean; onSelect: (id: string) => void }) {
  const { state, dispatch } = useStore()
  const sched = useSchedule()
  const [toggled, setToggled] = useState<Record<string, boolean>>({})
  const open = nodes.filter(n => n.status !== "done").sort((a, b) => (a.latestStart ?? "9999").localeCompare(b.latestStart ?? "9999"))
  const groups = [...state.events.map(e => ({ id: e.id, name: e.name })), { id: "", name: "Club tasks" }].map(g => ({ ...g, rows: open.filter(n => (n.eventId ?? "") === g.id) })).filter(g => g.rows.length)
  // Groups whose work is all more than three weeks away start folded, like monday's collapsed groups.
  const folded = (g: (typeof groups)[number]) => toggled[g.id] ?? g.rows.every(n => n.latestStart && daysBetween(state.today, n.latestStart) > 21)
  const cols = showOwner ? 4 : 3
  return <section className="card tbl-wrap" data-testid="my-tasks">
    <table className="tbl">
      <thead><tr><th>Task</th>{showOwner && <th>Owner</th>}<th>Status</th><th>Due</th></tr></thead>
      <tbody>{groups.map(g => [
        <tr key={`g-${g.id}`} className="group"><td colSpan={cols}><button type="button" className="group-btn" aria-expanded={!folded(g)} onClick={() => setToggled({ ...toggled, [g.id]: folded(g) ? false : true })}><span className="caret" aria-hidden="true">{folded(g) ? "▸" : "▾"}</span>{g.name}<span className="count">{g.rows.length}</span></button></td></tr>,
        ...(folded(g) ? [] : g.rows).map(n => {
          const late = n.clubDeadline && n.clubDeadline < state.today
          return [<tr key={n.id} data-testid="task-card">
            <td><button type="button" className="row-btn task-title" onClick={() => onSelect(n.id)}><TaskTypeIcon node={n} /><span>{n.title}</span></button></td>
            {showOwner && <td>{editable
              ? <span className="who"><Avatar name={state.people.find(p => p.id === n.ownerId)?.name} size="sm" /><select aria-label={`Owner of ${n.title}`} value={n.ownerId ?? ""} onChange={e => dispatch({ type: "updateNode", id: n.id, patch: { ownerId: e.target.value || null } })}><option value="">None</option>{officers(state).map(p => <option key={p.id} value={p.id}>{p.name.split(" ")[0]}</option>)}{state.people.filter(p => p.id === n.ownerId && !isOfficer(p)).map(p => <option key={p.id} value={p.id} disabled>{p.name.split(" ")[0]} (former)</option>)}</select></span>
              : <span className="who"><Avatar name={state.people.find(p => p.id === n.ownerId)?.name} size="sm" />{state.people.find(p => p.id === n.ownerId)?.name.split(" ")[0] ?? ""}</span>}</td>}
            <td><NodePill node={n} small /></td>
            <td className={late ? "late-text" : ""}>{editable && n.clubDeadline
              ? <input type="date" aria-label={`Due for ${n.title}`} value={n.clubDeadline} onChange={e => /^\d{4}-\d{2}-\d{2}$/.test(e.target.value) && dispatch({ type: "updateNode", id: n.id, patch: { clubDeadlineOverride: e.target.value } })} />
              : <span className="small">{n.clubDeadline ? fmtShort(n.clubDeadline) : ""}</span>}</td>
          </tr>,
          <BtsTr key={`${n.id}-bts`} cols={cols}>
            <Bts label="Rule engine">{sched.nodes[n.id]?.explain.club}</Bts>
          </BtsTr>]
        }),
      ])}</tbody>
    </table>
    {!open.length && <Empty>Nothing open.</Empty>}
  </section>
}

/** Board: drag a card to change its status or order; details handle explicit status updates. */
function Board({ nodes, onAdd, onNotice, onSelect }: { nodes: Node[]; onAdd: (title: string, status: NodeStatus) => void; onNotice: (text: string) => void; onSelect: (id: string) => void }) {
  const { state, dispatch } = useStore()
  const styles = useStatusStyles()
  const [adding, setAdding] = useState<NodeStatus | null>(null)
  const [title, setTitle] = useState("")
  // An empty column folds into a narrow strip so the others have room (DX-16). These are the empty ones the person opened by hand.
  const [opened, setOpened] = useState<ReadonlySet<NodeStatus>>(new Set())
  const toggleOpened = (st: NodeStatus) => setOpened(prev => { const next = new Set(prev); if (next.has(st)) next.delete(st); else next.add(st); return next })
  const fields = state.org.board?.fields ?? ["owner", "due", "event", "tags"]
  const tags = state.org.board?.tags ?? []
  /** Move a card, if the rules allow it (they say why if not). Returns whether it moved. */
  const move = (id: string, status: NodeStatus, before: string | null): boolean => {
    const n = state.nodes.find(x => x.id === id)
    if (!n) return false
    const why = canMoveTask(state, n, status)
    if (why) { onNotice(why); return false }
    dispatch({ type: "moveTask", nodeId: id, status, beforeId: before })
    return true
  }
  const columnOf = (n: Node): NodeStatus => n.status === "waiting" && n.waitingOnPersonId === state.viewerId && n.ownerId !== state.viewerId ? "accepted" : n.status
  // Dragging with a pointer (and Alt + ← / → from the keyboard): see src/lib/dragSort.ts. Moving a card still goes through `move` above.
  const dnd = useDragSort({
    onDrop: (id, t) => { move(id, t.dest as NodeStatus, t.before) },
    onNudge: (id, direction) => {
      const n = state.nodes.find(x => x.id === id)
      if (!n) return null
      const to = BOARD_STATUSES[BOARD_STATUSES.indexOf(columnOf(n)) + direction]
      if (!to) return null
      return move(id, to, null) ? `Moved “${n.title}” to ${styles[to].label}.` : null
    },
  })
  const drag = dnd.draggingId
  const over = dnd.over ? { status: dnd.over.dest as NodeStatus, before: dnd.over.before } : null
  return <>
    <div className="board" data-testid="task-board" data-drag-scroll style={{ "--drag-h": `${dnd.dragHeight}px` } as CSSProperties}>
      {BOARD_STATUSES.map(st => {
        const statusForViewer = (n: Node): NodeStatus => n.status === "waiting" && n.waitingOnPersonId === state.viewerId && n.ownerId !== state.viewerId ? "accepted" : n.status
        const cards = nodes.filter(n => statusForViewer(n) === st).sort(byRank)
        // Folded: nothing in it, not opened by hand, no card resting over it, and nobody typing a new task into it.
        const folded = cards.length === 0 && !opened.has(st) && dnd.dwell !== st && adding !== st
        // Where a dragged card would go in this column: the cards from there on move down to make room.
        const insertAt = over?.status === st ? (over.before ? cards.findIndex(c => c.id === over.before) : cards.length) : -1
        return <section key={st} className={`board-col ${over?.status === st ? "over" : ""} ${folded ? "is-folded" : ""}`} aria-label={styles[st].label} data-drop-col={st}>
          <header style={{ "--pill": styles[st].color } as CSSProperties}><h2>{styles[st].label}</h2><span className="count">{cards.length}</span></header>
          {cards.length === 0 && <button type="button" className="board-col-toggle" aria-expanded={!folded} aria-label={`${styles[st].label}, no tasks. ${folded ? "Show" : "Hide"} column`} onClick={() => toggleOpened(st)} />}
          {cards.map((n, index) => {
            const ev = state.events.find(e => e.id === n.eventId)
            const late = n.status !== "done" && n.clubDeadline && n.clubDeadline < state.today
            const shifted = drag !== null && drag !== n.id && insertAt >= 0 && index >= insertAt
            return <article key={n.id} className={`board-card ${drag === n.id ? "is-dragging" : ""} ${shifted ? "is-shifted" : ""}`} data-testid="board-card" {...dnd.cardProps(n.id)}>
              {/* A span, not a <button>: Chrome will not start a drag from inside a button. */}
              <span role="button" tabIndex={0} className="row-btn board-title task-title" onClick={() => onSelect(n.id)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(n.id) } }}><TaskTypeIcon node={n} /><span>{n.title}</span></span>
              {fields.includes("tags") && !!n.tags?.length && <div className="tag-row">{n.tags.map(id => { const t = tags.find(x => x.id === id); return t && <span key={id} className="tag-chip" style={{ "--tag": t.color } as CSSProperties}>{t.label}</span> })}</div>}
              <div className="board-meta">
                {fields.includes("owner") && <Avatar name={state.people.find(p => p.id === n.ownerId)?.name} size="sm" />}
                {fields.includes("due") && n.clubDeadline && <span className={`small ${late ? "late-text" : "muted"}`}>{fmtShort(n.clubDeadline)}</span>}
                {ev && <span className="small muted ev-name">{ev.name}</span>}
                {n.status === "waiting" && n.waitingOnPersonId === state.viewerId && n.ownerId !== state.viewerId && <span className="small wait-for-you">Waiting on you</span>}
              </div>
            </article>
          })}
          {adding === st
            ? <form className="board-add" onSubmit={e => { e.preventDefault(); onAdd(title, st); setTitle(""); setAdding(null) }}><input autoFocus value={title} maxLength={100} placeholder="Task name" aria-label="New task name" onChange={e => setTitle(e.target.value)} onBlur={() => { if (!title.trim()) setAdding(null) }} /><button className="btn small btn-primary" type="submit">Add</button></form>
            : <button type="button" className="board-add-btn" aria-label="+ Add task" onClick={() => { setAdding(st); setTitle("") }}>+ Add task</button>}
        </section>
      })}
    </div>
    <div className="sr-only" aria-live="polite" data-testid="board-announce">{dnd.announce}</div>
  </>
}

function TaskTimeline({ nodes, onSelect }: { nodes: Node[]; onSelect: (n: Node) => void }) {
  const starts = nodes.map(n => n.latestStart).filter((d): d is string => !!d).sort()
  const ends = nodes.map(n => n.clubDeadline).filter((d): d is string => !!d).sort()
  const from = starts[0], to = ends.at(-1)
  if (!from || !to) return <section className="card"><Empty>No dated tasks in this view.</Empty></section>
  const span = Math.max(1, daysBetween(from, to) + 1)
  return <section className="card task-gantt" data-testid="task-gantt"><header><h2>Timeline</h2><span className="small muted">{fmtShort(from)} → {fmtShort(to)}</span></header>{nodes.sort((a, b) => (a.latestStart ?? "").localeCompare(b.latestStart ?? "")).map(n => <div key={n.id} className="task-gantt-row"><button className="row-btn small task-title" onClick={() => onSelect(n)}><TaskTypeIcon node={n} /><span>{n.title}</span></button><div className="task-gantt-track">{n.latestStart && n.clubDeadline && <button className="task-gantt-bar" style={{ left: `${daysBetween(from, n.latestStart) / span * 100}%`, width: `${Math.max(1, (daysBetween(n.latestStart, n.clubDeadline) + 1) / span * 100)}%` }} aria-label={`${n.title}: ${fmtShort(n.latestStart)} to ${fmtShort(n.clubDeadline)}`} onClick={() => onSelect(n)} />}</div><span className="small muted">{n.clubDeadline ? fmtShort(n.clubDeadline) : "—"}</span></div>)}</section>
}
