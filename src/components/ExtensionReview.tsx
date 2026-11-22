import { useState } from "react"
import { Link } from "react-router-dom"
import { useStore } from "../data/store"
import type { ExtensionRequest } from "../data/types"
import { canReviewExtension, safeLink } from "../data/taskWorkflow"
import { fmtShort } from "../lib/dates"

/** The inbox opens this same review on the task; saving must succeed before reporting a decision. */
export function ExtensionReview({ request, showTaskLink = false }: { request: ExtensionRequest; showTaskLink?: boolean }) {
  const { state, tryDispatch, getState } = useStore(), [error, setError] = useState("")
  const node = state.nodes.find(n => n.id === request.nodeId)
  if (!node || request.status !== "pending" || !canReviewExtension(state, request)) return null
  const stale = node.status === "done" || node.ownerId !== request.ownerId || node.clubDeadline !== request.previousDeadline || request.requestedDate < state.today
  function decide(approve: boolean) {
    const accepted = tryDispatch({ type: "reviewExtension", id: request.id, approve })
    if (!accepted || getState().extensionRequests.find(r => r.id === request.id)?.status !== (approve ? "approved" : "rejected")) setError("Your decision was not saved. Please restore saving or check for newer changes, then try again.")
  }
  return <article className="change-item" data-testid="extension-review" aria-label="Deadline request">
    <b>{state.people.find(p => p.id === (request.requestedBy ?? request.ownerId))?.name ?? "A teammate"} requested a new deadline</b>
    <p className="small">{node.title} · Requested {fmtShort(request.requestedDate)}{node.clubDeadline ? ` · Current ${fmtShort(node.clubDeadline)}` : ""}</p>
    {request.reason && <p className="small task-extension-message">{request.reason}</p>}
    {request.draftLink && safeLink(request.draftLink) && <a href={request.draftLink} target="_blank" rel="noreferrer">Review current draft</a>}
    {showTaskLink && <Link to={`/tasks?node=${encodeURIComponent(node.id)}`}>Open task details</Link>}
    {stale && <p className="small warn-text">This request is out of date. Ask the owner for a fresh request.</p>}
    <div className="action-row"><button type="button" className="btn btn-primary" disabled={stale} onClick={() => decide(true)}>Approve extension</button><button type="button" className="btn" onClick={() => decide(false)}>Decline extension</button></div>
    {error && <p role="alert" className="small late-text">{error}</p>}
  </article>
}
