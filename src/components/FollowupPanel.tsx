import { useState } from "react"
import { useStore, useViewer } from "../data/store"
import { recoveryPreview } from "../engine/followup"
import { Empty } from "./ui"

export function FollowupPanel() {
  const { state, dispatch } = useStore()
  const { canNudge } = useViewer()
  const [selected, setSelected] = useState("t-silence")
  if (!canNudge || (!state.extensionRequests.some(r => r.status === "pending") && !state.protocolLog.length)) return null
  const entries = state.protocolLog.filter(e => e.nodeId === selected)
  const pending = state.extensionRequests.filter(r => r.status === "pending")
  return <section className="card" aria-label="President review" data-testid="president-review">
    <header><h2>Approvals</h2><span className="small muted">Only you see this</span></header>
    <div className="review-queue">{pending.map(r => {
      const node = state.nodes.find(n => n.id === r.nodeId)!
      const stale = node.ownerId !== r.ownerId || node.clubDeadline !== r.previousDeadline || r.requestedDate < state.today
      return <article className="change-item" key={r.id} data-testid="extension-review"><b>{node.title}</b><p className="small">Requested: {r.requestedDate} · current: {node.clubDeadline}</p><a href={r.draftLink} target="_blank" rel="noreferrer">Review current draft</a>{r.reason && <p>{r.reason}</p>}{stale && <p className="small warn-text">This request is out of date. Ask the owner for a fresh request.</p>}<div className="action-row"><button className="btn btn-primary" disabled={stale} onClick={() => dispatch({ type: "reviewExtension", id: r.id, approve: true })}>Approve extension</button><button className="btn" onClick={() => dispatch({ type: "reviewExtension", id: r.id, approve: false })}>Decline extension</button></div></article>
    })}{!pending.length && <Empty>No requests waiting.</Empty>}</div>
    <details className="followup-details" open={entries.length > 0}>
      <summary>Follow-up walkthrough</summary>
      <p className="small muted">Move the Demo clock to see each private step. Nothing is sent.</p>
      <label className="composer-channel">Follow-up task<select aria-label="Follow-up task" value={selected} onChange={e => setSelected(e.target.value)}>{state.nodes.filter(n => !n.source.startsWith("SEO Ghost Owner Protocol")).map(n => <option key={n.id} value={n.id}>{n.title}</option>)}</select></label>
      <ol className="protocol-log" data-testid="protocol-log">{entries.map(e => {
        const c = state.silenceCases.find(c => c.id === e.caseId)
        const node = state.nodes.find(n => n.id === e.nodeId)
        const recovery = e.kind === "recovery" ? recoveryPreview(state, e.nodeId) : null
        return <li key={e.id}><b>Day {e.day} · {e.scheduledOn}</b><p>{e.text}</p><p className="small muted">Private recipients: {e.recipientIds.map(id => state.people.find(p => p.id === id)?.name).join(", ") || "none · limit reached"}{c?.closedOn ? ` · stopped ${c.closedOn}` : ""}</p>{e.kind === "suggest_owner" && e.suggestedOwnerId && !c?.closedOn && <button className="btn small" disabled={!!c?.temporaryOwnerId} onClick={() => dispatch({ type: "temporaryOwner", entryId: e.id })}>{c?.temporaryOwnerId ? "Temporary owner assigned" : "Approve suggested owner"}</button>}{recovery && !c?.closedOn && <div><p className="small">Current recovery proposal: start {recovery.latestStart}; club deadline {recovery.club}; ASU {recovery.official ?? "not applicable"}.</p><button className="btn small" disabled={!!node?.recoveryFrom} onClick={() => dispatch({ type: "approveRecovery", entryId: e.id })}>{node?.recoveryFrom ? "Recovery plan applied" : "Approve recovery timeline"}</button></div>}</li>
      })}{!entries.length && <li className="small muted">No follow-up stages reached yet for this task.</li>}</ol>
    </details>
  </section>
}
