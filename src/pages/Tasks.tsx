import { useEffect, useState, type CSSProperties } from "react"
import { useSearchParams } from "react-router-dom"
import { useStore, useViewer } from "../data/store"
import type { Node, NodeStatus } from "../data/types"
import { PageHead } from "../components/Page"
import { useRail } from "../components/rail/RailContext"
import { FollowupPanel } from "../components/FollowupPanel"
import { daysBetween, fmtShort } from "../lib/dates"
import { canMoveTask, byRank } from "../data/board"
import { Avatar, NodePill, STATUS_ORDER, useStatusStyles } from "../components/ui"
import { canLead } from "../data/changeReview"

type View = "table" | "board" | "timeline"

export default function Tasks() {
  const { state } = useStore()
  const { person } = useViewer()
  const rail = useRail()
  const [params] = useSearchParams()
  const [view, setView] = useState<View>("table")
  const [scope, setScope] = useState("mine")
  const lead = canLead(state)
  const linked = params.get("node")
  useEffect(() => { if (linked && state.nodes.some(n => n.id === linked)) rail.show({ kind: "task", id: linked, reply: params.get("reply") }) }, [linked, params.get("reply")])

  const visible = state.nodes.filter(n => scope === "team" || n.ownerId === person.id || (n.status === "unclaimed" && !n.ownerId))
  return <>
    <PageHead path="/tasks" actions={<>
      <div className="seg" role="group" aria-label="Task view">{(["table", "board", "timeline"] as View[]).map(v => <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>{v === "table" ? "Table" : v === "board" ? "Board" : "Timeline"}</button>)}</div>
      <select className="select" aria-label="Task scope" value={scope} onChange={e => setScope(e.target.value)}><option value="mine">My tasks</option><option value="team">Team tasks</option></select>
      {lead && view === "board" && <button type="button" className="btn" onClick={() => rail.show({ kind: "board" })}>Customize</button>}
    </>} />
    {view === "table" && <TaskTable nodes={visible} editable={lead} showOwner={scope === "team"} />}
    {view === "board" && <Board nodes={visible} />}
    {view === "timeline" && <TaskTimeline nodes={visible.filter(n => n.status !== "done")} onSelect={n => rail.show({ kind: "task", id: n.id })} />}
    <FollowupPanel />
  </>
}

/** monday-style table grouped by event; owner and due date are edited right in the row. */
function TaskTable({ nodes, editable, showOwner }: { nodes: Node[]; editable: boolean; showOwner: boolean }) {
  const { state, dispatch } = useStore()
  const rail = useRail()
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
          return <tr key={n.id} data-testid="task-card">
            <td><button type="button" className="row-btn" onClick={() => rail.show({ kind: "task", id: n.id })}>{n.title}</button></td>
            {showOwner && <td>{editable
              ? <span className="who"><Avatar name={state.people.find(p => p.id === n.ownerId)?.name} size="sm" /><select aria-label={`Owner of ${n.title}`} value={n.ownerId ?? ""} onChange={e => dispatch({ type: "updateNode", id: n.id, patch: { ownerId: e.target.value || null } })}><option value="">None</option>{state.people.map(p => <option key={p.id} value={p.id}>{p.name.split(" ")[0]}</option>)}</select></span>
              : <span className="who"><Avatar name={state.people.find(p => p.id === n.ownerId)?.name} size="sm" />{state.people.find(p => p.id === n.ownerId)?.name.split(" ")[0] ?? ""}</span>}</td>}
            <td><NodePill node={n} small /></td>
            <td className={late ? "late-text" : ""}>{editable && n.clubDeadline
              ? <input type="date" aria-label={`Due date of ${n.title}`} value={n.clubDeadline} onChange={e => /^\d{4}-\d{2}-\d{2}$/.test(e.target.value) && dispatch({ type: "updateNode", id: n.id, patch: { clubDeadlineOverride: e.target.value } })} />
              : <span className="small">{n.clubDeadline ? fmtShort(n.clubDeadline) : ""}</span>}</td>
          </tr>
        }),
      ])}</tbody>
    </table>
    {!open.length && <p className="empty">Nothing open.</p>}
  </section>
}

/** Board: drag a card to change its status or order. Keyboard users use the status menu on the card. */
function Board({ nodes }: { nodes: Node[] }) {
  const { state, dispatch } = useStore()
  const rail = useRail()
  const styles = useStatusStyles()
  const [drag, setDrag] = useState<string | null>(null)
  const [over, setOver] = useState<{ status: NodeStatus; before: string | null } | null>(null)
  const [notice, setNotice] = useState("")
  const [adding, setAdding] = useState<NodeStatus | null>(null)
  const [title, setTitle] = useState("")
  const fields = state.org.board?.fields ?? ["owner", "due", "event", "tags"]
  const tags = state.org.board?.tags ?? []
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(""), 3200); return () => clearTimeout(t) }, [notice])
  const move = (id: string, status: NodeStatus, before: string | null) => {
    const n = state.nodes.find(x => x.id === id)
    if (!n) return
    const why = canMoveTask(state, n, status)
    if (why) { setNotice(why); return }
    dispatch({ type: "moveTask", nodeId: id, status, beforeId: before })
  }
  return <>
    {notice && <p className="board-notice" role="status">{notice}</p>}
    <div className="board" data-testid="task-board">
      {STATUS_ORDER.map(st => {
        const cards = nodes.filter(n => n.status === st).sort(byRank)
        return <section key={st} className={`board-col ${over?.status === st ? "over" : ""}`} aria-label={styles[st].label}
          onDragOver={e => { e.preventDefault(); if (!over || over.status !== st) setOver({ status: st, before: null }) }}
          onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as globalThis.Node)) setOver(null) }}
          onDrop={e => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain") || drag; if (id) move(id, st, over?.before ?? null); setDrag(null); setOver(null) }}>
          <header style={{ "--pill": styles[st].color } as CSSProperties}><h2>{styles[st].label}</h2><span className="count">{cards.length}</span></header>
          {cards.map(n => {
            const ev = state.events.find(e => e.id === n.eventId)
            const late = n.status !== "done" && n.clubDeadline && n.clubDeadline < state.today
            return <article key={n.id} className={`board-card ${drag === n.id ? "dragging" : ""} ${over?.before === n.id ? "drop-before" : ""}`} draggable data-testid="board-card"
              onDragStart={e => { e.dataTransfer.setData("text/plain", n.id); e.dataTransfer.effectAllowed = "move"; setDrag(n.id) }}
              onDragEnd={() => { setDrag(null); setOver(null) }}
              onDragOver={e => { e.preventDefault(); e.stopPropagation(); setOver({ status: st, before: n.id }) }}
              onDrop={e => { e.preventDefault(); e.stopPropagation(); const id = e.dataTransfer.getData("text/plain") || drag; if (id && id !== n.id) move(id, st, n.id); setDrag(null); setOver(null) }}>
              {/* A span, not a <button>: Chrome will not start a drag from inside a button. */}
              <span role="button" tabIndex={0} className="row-btn board-title" onClick={() => rail.show({ kind: "task", id: n.id })} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); rail.show({ kind: "task", id: n.id }) } }}>{n.title}</span>
              {fields.includes("tags") && !!n.tags?.length && <div className="tag-row">{n.tags.map(id => { const t = tags.find(x => x.id === id); return t && <span key={id} className="tag-chip" style={{ "--tag": t.color } as CSSProperties}>{t.label}</span> })}</div>}
              <div className="board-meta">
                {fields.includes("owner") && <Avatar name={state.people.find(p => p.id === n.ownerId)?.name} size="sm" />}
                {fields.includes("due") && n.clubDeadline && <span className={`small ${late ? "late-text" : "muted"}`}>{fmtShort(n.clubDeadline)}</span>}
                {fields.includes("event") && ev && <span className="small muted ev-name">{ev.name}</span>}
                <select className="move-menu" aria-label={`Move ${n.title}`} value={st} onChange={e => move(n.id, e.target.value as NodeStatus, null)}>{STATUS_ORDER.map(s => <option key={s} value={s}>{styles[s].label}</option>)}</select>
              </div>
            </article>
          })}
          {adding === st
            ? <form className="board-add" onSubmit={e => { e.preventDefault(); if (title.trim()) dispatch({ type: "addTask", title, status: st }); setTitle(""); setAdding(null) }}><input autoFocus value={title} maxLength={100} placeholder="Task name" aria-label="New task name" onChange={e => setTitle(e.target.value)} onBlur={() => { if (!title.trim()) setAdding(null) }} /><button className="btn small btn-primary" type="submit">Add</button></form>
            : <button type="button" className="board-add-btn" onClick={() => { setAdding(st); setTitle("") }}>+ Add task</button>}
        </section>
      })}
    </div>
  </>
}

function TaskTimeline({ nodes, onSelect }: { nodes: Node[]; onSelect: (n: Node) => void }) {
  const starts = nodes.map(n => n.latestStart).filter((d): d is string => !!d).sort()
  const ends = nodes.map(n => n.clubDeadline).filter((d): d is string => !!d).sort()
  const from = starts[0], to = ends.at(-1)
  if (!from || !to) return <section className="card"><p className="empty">No dated tasks in this view.</p></section>
  const span = Math.max(1, daysBetween(from, to) + 1)
  return <section className="card task-gantt" data-testid="task-gantt"><header><h2>Timeline</h2><span className="small muted">{fmtShort(from)} → {fmtShort(to)}</span></header>{nodes.sort((a, b) => (a.latestStart ?? "").localeCompare(b.latestStart ?? "")).map(n => <div key={n.id} className="task-gantt-row"><button className="row-btn small" onClick={() => onSelect(n)}>{n.title}</button><div className="task-gantt-track">{n.latestStart && n.clubDeadline && <button className="task-gantt-bar" style={{ left: `${daysBetween(from, n.latestStart) / span * 100}%`, width: `${Math.max(1, (daysBetween(n.latestStart, n.clubDeadline) + 1) / span * 100)}%` }} aria-label={`${n.title}: ${fmtShort(n.latestStart)} to ${fmtShort(n.clubDeadline)}`} onClick={() => onSelect(n)} />}</div><span className="small muted">{n.clubDeadline ? fmtShort(n.clubDeadline) : "—"}</span></div>)}</section>
}
