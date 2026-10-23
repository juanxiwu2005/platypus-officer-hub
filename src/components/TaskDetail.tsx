import { useEffect, useRef } from "react"
import { useStore } from "../data/store"
import type { Node } from "../data/types"
import { fmtLong } from "../lib/dates"
import { RULES } from "../data/rules"
import { safeLink } from "../data/taskWorkflow"
import { statusOf } from "../pages/helpers"
import { TaskActions } from "./TaskActions"

export function TaskDetail({ node, actorId, token, initialReply }: { node: Node; actorId: string; token?: string; initialReply?: string | null }) {
  const { state } = useStore()
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus() }, [node.id])
  const status = statusOf(node)
  const upstream = state.nodes.filter(n => node.dependsOn.includes(n.id))
  const downstream = state.nodes.filter(n => n.dependsOn.includes(node.id))
  const pending = state.extensionRequests.find(r => r.nodeId === node.id && r.status === "pending")
  return <section className="card task-detail" aria-label="Linked task" data-testid="task-detail">
    <div className="action-row"><span className={`tag ${status.tone}`}>{status.text}</span><span className="small muted">{state.events.find(e => e.id === node.eventId)?.name ?? "Club task"}</span></div>
    <h2 ref={heading} tabIndex={-1}>{node.title}</h2>
    <p><b>Why it matters:</b> {node.why || "This step supports our club plan."}</p>
    <p className="small muted">Owner: {state.people.find(p => p.id === node.ownerId)?.name ?? "Not assigned"}</p>
    <div className="task-dates"><div><span className="small muted">Start by</span><b>{node.latestStart ? fmtLong(node.latestStart) : "Not set"}</b></div><div><span className="small muted">Club deadline</span><b>{node.clubDeadline ? fmtLong(node.clubDeadline) : "Not set"}</b></div><div><span className="small muted">ASU deadline</span><b>{node.officialDeadline ? fmtLong(node.officialDeadline) : "Not applicable"}</b></div></div>
    {node.waitingOn && <p className="small warn-text">Waiting on: {node.waitingOn}</p>}
    {!!upstream.length && <p className="small"><b>Before this:</b> {upstream.map(n => `${n.title} (${n.status === "done" ? "done" : "still open"})`).join("; ")}</p>}
    {!!downstream.length && <p className="small"><b>After this:</b> {downstream.map(n => n.title).join("; ")}</p>}
    {node.draftLink && safeLink(node.draftLink) && <a href={node.draftLink} target="_blank" rel="noreferrer">Open current draft</a>}
    <details><summary className="small">Sources and responsibilities</summary><p className="small muted">{node.source}. Dates come from the rule engine. Responsible: {state.people.find(p => p.id === node.ownerId)?.name ?? "not assigned"}; accountable: {state.roles.find(r => r.id === node.approverRoleId)?.displayName ?? "owner"}.</p><div className="action-row">{node.ruleIds.map(id => { const r = RULES.find(r => r.id === id); return r && <a key={id} href={r.sources[0].url} target="_blank" rel="noreferrer">{id}</a> })}</div></details>
    {pending && <p className="small warn-text">Extension awaiting review: {pending.requestedDate}. The current deadline still applies.</p>}
    <TaskActions node={node} actorId={actorId} token={token} initialReply={initialReply} />
  </section>
}
