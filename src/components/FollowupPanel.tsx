import { useState } from "react"
import { useStore, useViewer } from "../data/store"
import { recoveryPreview } from "../engine/followup"

export function FollowupPanel() {
  const { state, dispatch } = useStore()
  const { canNudge } = useViewer()
  const [selected, setSelected] = useState("t-silence")
  const entries = state.protocolLog.filter(e => e.nodeId === selected)
  if (!canNudge || !state.protocolLog.length) return null
  return <section className="card" aria-label="President review" data-testid="president-review">
    <header><h2>Follow-up</h2><span className="small muted">Only you see this</span></header>
    {canNudge && <details className="followup-details" open={entries.length > 0}>
      <summary>Follow-up walkthrough</summary>
      <label className="composer-channel">Follow-up task<select aria-label="Follow-up task" value={selected} onChange={e => setSelected(e.target.value)}>{state.nodes.filter(n => !n.source.startsWith("SEO Ghost Owner Protocol")).map(n => <option key={n.id} value={n.id}>{n.title}</option>)}</select></label>
      <ol className="protocol-log" data-testid="protocol-log">{entries.map(e => {
        const c = state.silenceCases.find(c => c.id === e.caseId)
        const node = state.nodes.find(n => n.id === e.nodeId)
        const recovery = e.kind === "recovery" ? recoveryPreview(state, e.nodeId) : null
        return <li key={e.id}><b>Day {e.day} · {e.scheduledOn}</b><p>{e.text}</p><p className="small muted">Private recipients: {e.recipientIds.map(id => state.people.find(p => p.id === id)?.name).join(", ") || "none · limit reached"}{c?.closedOn ? ` · stopped ${c.closedOn}` : ""}</p>{e.kind === "suggest_owner" && e.suggestedOwnerId && !c?.closedOn && <button className="btn small" disabled={!!c?.temporaryOwnerId} onClick={() => dispatch({ type: "temporaryOwner", entryId: e.id })}>{c?.temporaryOwnerId ? "Temporary owner assigned" : "Approve suggested owner"}</button>}{recovery && !c?.closedOn && <div><p className="small">Current recovery proposal: start {recovery.latestStart}; club deadline {recovery.club}; ASU {recovery.official ?? "not applicable"}.</p><button className="btn small" disabled={!!node?.recoveryFrom} onClick={() => dispatch({ type: "approveRecovery", entryId: e.id })}>{node?.recoveryFrom ? "Recovery plan applied" : "Approve recovery timeline"}</button></div>}</li>
      })}{!entries.length && <li className="small muted">No follow-up stages reached yet for this task.</li>}</ol>
    </details>}
  </section>
}
