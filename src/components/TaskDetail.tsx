import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useStore } from "../data/store"
import type { Node } from "../data/types"
import { fmtLong } from "../lib/dates"
import { RULES } from "../data/rules"
import { safeLink } from "../data/taskWorkflow"
import { TaskActions } from "./TaskActions"
import { StatusPill } from "./ui"
import { canLead } from "../data/changeReview"
import { officialLabel } from "../engine/taskDates"
import type { CSSProperties } from "react"
import { isBudgetControlledNode } from "../engine/eventBudget"

export function TaskDetail({ node, actorId, token, initialReply }: { node: Node; actorId: string; token?: string; initialReply?: string | null }) {
  const { state, dispatch } = useStore()
  const navigate = useNavigate()
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus() }, [node.id])
  const pending = state.extensionRequests.find(r => r.nodeId === node.id && r.status === "pending")
  const event = state.events.find(e => e.id === node.eventId)
  const [copied, setCopied] = useState(false)
  const copyEventDetails = async () => { try { await navigator.clipboard.writeText(event?.details ?? ""); setCopied(true) } catch { setCopied(false) } }
  return <section className="card task-detail" aria-label="Linked task" data-testid="task-detail">
    <div className="action-row"><StatusPill status={node.status} /><span className="small muted">{state.events.find(e => e.id === node.eventId)?.name ?? "Club task"}</span></div>
    <h2 ref={heading} tabIndex={-1}>{node.title}</h2>
    <p>{node.why || "This step supports our club plan."}</p>
    <p className="small muted">Owner: {state.people.find(p => p.id === node.ownerId)?.name ?? "Not assigned"}</p>
    <div className="task-dates"><div><span className="small muted">Start by</span><b>{node.latestStart ? fmtLong(node.latestStart) : "Not set"}</b></div><div><span className="small muted">Club deadline</span><b>{node.clubDeadline ? fmtLong(node.clubDeadline) : "Not set"}</b></div><div><span className="small muted">{officialLabel(node)}</span><b>{node.officialDeadline ? fmtLong(node.officialDeadline) : "N/A"}</b></div></div>
    {node.waitingOn && <p className="small warn-text">Waiting on: {node.waitingOn}</p>}
    {node.draftLink && safeLink(node.draftLink) && <a href={node.draftLink} target="_blank" rel="noreferrer">Open current draft</a>}
    {node.eventId && isBudgetControlledNode(node) && <button type="button" className="btn" onClick={() => navigate(`/events?event=${encodeURIComponent(node.eventId!)}&view=budget`)}>Open Event Budget</button>}
    {event && <div className="event-copy"><button type="button" className="btn" disabled={!event.details?.trim()} onClick={copyEventDetails}>{copied ? "Event details copied" : "Copy All Event Details"}</button>{!event.details?.trim() && <span className="small muted">Add Event Details first.</span>}</div>}
    <details><summary className="small">Sources and responsibilities</summary><p className="small muted">{node.source}. Dates come from the rule engine. Responsible: {state.people.find(p => p.id === node.ownerId)?.name ?? "not assigned"}; accountable: {state.roles.find(r => r.id === node.approverRoleId)?.displayName ?? "owner"}.</p><div className="action-row">{node.ruleIds.map(id => { const r = RULES.find(r => r.id === id); return r && <a key={id} href={r.sources[0].url} target="_blank" rel="noreferrer">{id}</a> })}</div></details>
    {pending && <p className="small warn-text">Extension awaiting review: {pending.requestedDate}. The current deadline still applies.</p>}
    <TaskActions node={node} actorId={actorId} token={token} initialReply={initialReply} />
    {!token && canLead(state) && <details className="more"><summary>Edit</summary><div className="form-stack">
      <label className="field"><span>Task name</span><input defaultValue={node.title} maxLength={100} onBlur={e => e.target.value.trim() && e.target.value !== node.title && dispatch({ type: "updateNode", id: node.id, patch: { title: e.target.value } })} /></label>
      {!!state.org.board?.tags?.length && <div className="field"><span>Tags</span><div className="tag-row">{state.org.board.tags.map(t => { const on = node.tags?.includes(t.id); return <button key={t.id} type="button" className="tag-chip tag-toggle" aria-pressed={on} style={{ "--tag": t.color } as CSSProperties} onClick={() => dispatch({ type: "updateNode", id: node.id, patch: { tags: on ? (node.tags ?? []).filter(x => x !== t.id) : [...(node.tags ?? []), t.id] } })}>{t.label}</button> })}</div></div>}
      <p className="small muted">Owner and due date can be changed in the task table; dates still come from the rule engine.</p>
    </div></details>}
  </section>
}
