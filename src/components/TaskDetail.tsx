import { useCallback, useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { useSchedule, useStore } from "../data/store"
import type { Node } from "../data/types"
import { fmtShort } from "../lib/dates"
import { Avatar } from "./ui"
import { canLead, isOfficer } from "../data/permissions"
import { dueOf, isLate } from "../lib/taskDue"
import { buildReminderFacts } from "../reminders/facts"
import { taskLinks } from "../taskDetails/links"
import { TaskSubmission } from "../taskDetails/TaskSubmission"
import { TaskProgress } from "../taskDetails/TaskProgress"
import { TaskEditPanel } from "../taskDetails/TaskEditPanel"
import type { TaskAuthorization } from "../taskDetails/contracts"
import "../taskDetails/detail.css"

/** One task surface for every real node and email entry; templates never render this component. */
export function TaskDetail({ node, actorId, token, accessToken, standalone = false, initialReply, readOnly = false, eventLink = true }: { node: Node; actorId: string; token?: string; accessToken?: string; standalone?: boolean; initialReply?: string | null; readOnly?: boolean; /** False where the panel already has its own way back to the event (Plan task panel). */ eventLink?: boolean }) {
  const { state } = useStore()
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus() }, [node.id])
  const [editing, setEditing] = useState(false)
  const closeEditor = useCallback(() => setEditing(false), [])
  const schedule = useSchedule().nodes[node.id], due = dueOf(node, schedule)
  const event = state.events.find(e => e.id === node.eventId), owner = state.people.find(p => p.id === node.ownerId)
  const authorization: TaskAuthorization | undefined = accessToken ? { kind: "access", token: accessToken } : token ? { kind: "legacy", token } : undefined
  const canEdit = !readOnly && !authorization && actorId === state.viewerId && canLead(state) && state.people.some(p => p.id === actorId && isOfficer(p))
  const facts = buildReminderFacts(state, node.id), links = taskLinks(state, node)
  const issues = (schedule?.issues ?? []).filter(i => i.severity !== "info" && i.code !== "start_passed" && i.code !== "club_passed")
  const title = standalone ? <h1 id="single-task-heading" ref={heading} tabIndex={-1}>{node.title}</h1> : <h2 ref={heading} tabIndex={-1}>{node.title}</h2>
  return <section className={`task-detail task-detail-universal${standalone ? " task-detail-standalone" : ""}`} aria-label="Linked task" data-testid="task-detail">
    <header className="td-head">
      {event ? eventLink && <p className="td-event small"><Link to={`/events?event=${encodeURIComponent(event.id)}`}>← {event.name}</Link></p> : <p className="td-event small">Club task</p>}
      <div className="task-title-row">{title}{canEdit && <button type="button" className="btn small task-edit-trigger" onClick={() => setEditing(true)}><span aria-hidden="true">✎</span> Edit</button>}</div>
      <div className="task-identity">
        <span className={`task-compact-due${isLate(node, due, state.today) ? " late-text" : ""}`} data-testid={standalone ? "single-task-due" : "task-due"}>Due <strong>{due ? fmtShort(due) : "Not set"}</strong></span>
        <span className="who"><Avatar name={owner?.name} size="sm" /><span>{owner?.name ?? "No owner yet"}</span></span>
        <TaskProgress key={`${node.id}:${actorId}:${node.ownerVersion ?? 0}:${accessToken ?? token ?? "viewer"}`} node={node} actorId={actorId} authorization={authorization} initialReply={initialReply} readOnly={readOnly} />
      </div>
    </header>
    <p className="task-requirement">{facts?.requirement ?? node.instructions ?? node.title}</p>
    {links.length > 0 && <nav className="task-external-links" aria-label="External task links">{links.map(link => <a key={`${link.label}:${link.url}`} className="btn small" href={link.url} target="_blank" rel="noreferrer">{link.label} <span aria-hidden="true">↗</span></a>)}</nav>}
    <TaskSubmission key={`${node.id}:${actorId}`} node={node} actorId={actorId} authorization={authorization} readOnly={readOnly} />
    {issues.length > 0 && <details className="task-schedule-notes small"><summary>Schedule notes ({issues.length})</summary><ul>{issues.map(issue => <li key={issue.code}>{issue.text}</li>)}</ul></details>}
    {editing && canEdit && <TaskEditPanel node={node} due={due} onClose={closeEditor} />}
  </section>
}
