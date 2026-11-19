import { Link, useSearchParams } from "react-router-dom"
import { useStore } from "../data/store"
import { useRail } from "../components/rail/RailContext"
import { TaskDetail } from "../components/TaskDetail"
import { WaitingContent } from "./SingleTaskPage"
import { planTaskPath, resolvePlanEntry } from "./planEntry"
import { useTaskAccess } from "./useTaskAccess"
import "./planTask.css"

/** The same task form lives beside the actual workflow. Other tasks expose submitted work only. */
export default function PlanTaskPanel({ nodeId }: { nodeId: string }) {
  const { state } = useStore()
  const rail = useRail()
  const [params, setParams] = useSearchParams()
  const token = params.get("access") ?? ""
  const access = useTaskAccess(token)
  const entry = resolvePlanEntry(state, params, access.grant, access.checking)
  if (entry.checking || params.get("node") !== nodeId) return <p role="status">Opening your task…</p>
  if (entry.error || !entry.node || !entry.event) return <p role="alert">{entry.error ?? "This task is unavailable."}</p>
  const { node, event, origin, grant } = entry
  const original = grant?.nodeId === node.id
  const request = grant?.scope === "waiting" ? state.reminderRuntime?.waitingRequests.find(item => item.id === grant.waitingRequestId) : undefined
  return <>
    <nav className="plan-task-nav" aria-label="Event task navigation">
      <div className="plan-task-nav-row"><button type="button" className="btn btn-quiet small" onClick={() => { rail.setOpen(false); requestAnimationFrame(() => { const dot = document.querySelector<HTMLElement>(".metro .is-selected .m-dot"); dot?.focus({ preventScroll: true }); dot?.scrollIntoView?.({ block: "nearest", inline: "center" }) }) }}>← Back to Plan</button>
        {origin && origin.id !== node.id && <Link className="small" to={planTaskPath(event.id, origin.id, token || undefined, origin.id)}>← {origin.title}</Link>}
      </div>
      <label><span className="sr-only">View task in this event</span><select className="select" aria-label="View task in this event" value={node.id} onChange={e => { const next = new URLSearchParams(params); next.set("node", e.target.value); if (origin) next.set("from", origin.id); setParams(next) }}>{state.nodes.filter(item => item.eventId === event.id).map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
    </nav>
    {original && grant.scope === "waiting" && request ? <WaitingContent node={node} grant={grant} request={request} token={token} embedded />
      : <TaskDetail key={`${node.id}:${original ? grant?.id : state.viewerId}`} node={node} actorId={original ? grant.recipientId : state.viewerId} accessToken={original ? token : undefined} readOnly={entry.readOnly} />}
  </>
}
