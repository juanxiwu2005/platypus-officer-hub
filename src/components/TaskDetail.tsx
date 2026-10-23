import { useEffect, useRef } from "react"
import { useStore } from "../data/store"
import type { Node } from "../data/types"
import { fmtLong } from "../lib/dates"
import { RULES } from "../data/rules"
import { safeLink } from "../data/taskWorkflow"
import { TaskActions } from "./TaskActions"
import { StatusPill } from "./ui"
import { canLead } from "../data/changeReview"
import type { CSSProperties } from "react"

export function TaskDetail({ node, actorId, token, initialReply }: { node: Node; actorId: string; token?: string; initialReply?: string | null }) {
  const { state, dispatch } = useStore()
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus() }, [node.id])
  const upstream = state.nodes.filter(n => node.dependsOn.includes(n.id))
  const downstream = state.nodes.filter(n => n.dependsOn.includes(node.id))
  const pending = state.extensionRequests.find(r => r.nodeId === node.id && r.status === "pending")
  return <section className="card task-detail" aria-label="Linked task" data-testid="task-detail">
    <div className="action-row"><StatusPill status={node.status} /><span className="small muted">{state.events.find(e => e.id === node.eventId)?.name ?? "Club task"}</span></div>
    <h2 ref={heading} tabIndex={-1}>{node.title}</h2>
    <p>{node.why || "This step supports our club plan."}</p>
    <p className="small muted">Owner: {state.people.find(p => p.id === node.ownerId)?.name ?? "Not assigned"}</p>
    <div className="task-dates"><div><span className="small muted">Start by</span><b>{node.latestStart ? fmtLong(node.latestStart) : "Not set"}</b></div><div><span className="small muted">Club deadline</span><b>{node.clubDeadline ? fmtLong(node.clubDeadline) : "Not set"}</b></div><div><span className="small muted">ASU deadline</span><b>{node.officialDeadline ? fmtLong(node.officialDeadline) : "Not applicable"}</b></div></div>
    {node.waitingOn && <p className="small warn-text">Waiting on: {node.waitingOn}</p>}
    {!!upstream.length && <p className="small"><b>Before this:</b> {upstream.map(n => `${n.title} (${n.status === "done" ? "done" : "still open"})`).join("; ")}</p>}
    {!!downstream.length && <p className="small"><b>After this:</b> {downstream.map(n => n.title).join("; ")}</p>}
    {node.draftLink && safeLink(node.draftLink) && <a href={node.draftLink} target="_blank" rel="noreferrer">Open current draft</a>}
    <details><summary className="small">Sources and responsibilities</summary><p className="small muted">{node.source}. Dates come from the rule engine. Responsible: {state.people.find(p => p.id === node.ownerId)?.name ?? "not assigned"}; accountable: {state.roles.find(r => r.id === node.approverRoleId)?.displayName ?? "owner"}.</p><div className="action-row">{node.ruleIds.map(id => { const r = RULES.find(r => r.id === id); return r && <a key={id} href={r.sources[0].url} target="_blank" rel="noreferrer">{id}</a> })}</div></details>
    {pending && <p className="small warn-text">Extension awaiting review: {pending.requestedDate}. The current deadline still applies.</p>}
    <TaskActions node={node} actorId={actorId} token={token} initialReply={initialReply} />
    {!token && canLead(state) && <details className="more"><summary>Edit</summary><div className="form-stack">
      <label className="field"><span>Task name</span><input defaultValue={node.title} maxLength={100} onBlur={e => e.target.value.trim() && e.target.value !== node.title && dispatch({ type: "updateNode", id: node.id, patch: { title: e.target.value } })} /></label>
      {!!state.org.board?.tags?.length && <div className="field"><span>Tags</span><div className="tag-row">{state.org.board.tags.map(t => { const on = node.tags?.includes(t.id); return <button key={t.id} type="button" className="tag-chip" aria-pressed={on} style={{ "--tag": t.color, opacity: on ? 1 : .45, border: 0, cursor: "pointer" } as CSSProperties} onClick={() => dispatch({ type: "updateNode", id: node.id, patch: { tags: on ? (node.tags ?? []).filter(x => x !== t.id) : [...(node.tags ?? []), t.id] } })}>{t.label}</button> })}</div></div>}
      <p className="small muted">Owner and due date can be changed in the task table; dates still come from the rule engine.</p>
    </div></details>}
  </section>
}
