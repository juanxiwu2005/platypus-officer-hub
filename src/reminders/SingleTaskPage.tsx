import { useEffect, useRef, useState } from "react"
import { Link, Navigate } from "react-router-dom"
import { useStore } from "../data/store"
import type { Node } from "../data/types"
import { TaskDetail } from "../components/TaskDetail"
import { fmtLong } from "../lib/dates"
import { buildReminderFacts } from "./facts"
import { useTaskAccess } from "./useTaskAccess"
import { hasPlanMember, planTaskPath } from "./planEntry"
import { isReminderRuntime } from "./runtime"
import type { TaskAccessGrant } from "./accessContracts"
import type { WaitingRequest } from "./contracts"
import "./single-task.css"

const optionalText = (value: object, key: string): string => {
  const text = (value as Record<string, unknown>)[key]
  return typeof text === "string" ? text.trim() : ""
}

/** The URL selects an issued authorization; it never supplies a trusted actor or task owner. */
export default function SingleTaskPage({ token, preferPlan = false }: { token: string; preferPlan?: boolean }) {
  const { state } = useStore()
  const { grant, checking } = useTaskAccess(token)
  const node = state.nodes.find(n => n.id === grant?.nodeId)
  const request = grant?.scope === "waiting" && isReminderRuntime(state.reminderRuntime) ? state.reminderRuntime.waitingRequests.find(r => r.id === grant.waitingRequestId) : undefined
  const available = !checking && node && (grant?.scope !== "waiting" || !!request)
  if (preferPlan && available && grant && node.eventId && state.events.some(event => event.id === node.eventId) && hasPlanMember(state)) return <Navigate to={planTaskPath(node.eventId, node.id, token)} replace />
  return <main className="single-task" aria-labelledby="single-task-heading">
    <div className="single-task-shell">
      <header className="single-task-brand"><Link to="/" aria-label="Platypus home">Platypus</Link><span>Your task</span></header>
      {available && grant ? <TaskContent key={grant.id} node={node} grant={grant} request={request} token={token} />
        : <Unavailable checking={checking} token={token} />}
      <p className="single-task-demo">Local demo: use the browser where this link was created.</p>
    </div>
  </main>
}

function Unavailable({ checking, token }: { checking: boolean; token: string }) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { if (!checking) heading.current?.focus() }, [checking, token])
  return <section className="single-task-card">
    <h1 id="single-task-heading" ref={heading} tabIndex={-1}>{checking ? "Opening your task…" : "Check your task link"}</h1>
    <p role="status">{checking ? "Checking this task link." : "This link is unavailable, expired, or the task has been reassigned. Ask your club lead for a fresh link."}</p>
  </section>
}

function TaskContent(props: { node: Node; grant: TaskAccessGrant; request?: WaitingRequest; token: string }) {
  return props.grant.scope === "owner" ? <div data-testid="single-task-page"><TaskDetail node={props.node} actorId={props.grant.recipientId} accessToken={props.token} standalone /></div> : <WaitingContent {...props} />
}

export function WaitingContent({ node, grant, request, token, embedded = false }: { node: Node; grant: TaskAccessGrant; request?: WaitingRequest; token: string; embedded?: boolean }) {
  const { state, tryDispatch, getState } = useStore()
  const facts = buildReminderFacts(state, node.id)!
  const heading = useRef<HTMLHeadingElement>(null)
  const [notice, setNotice] = useState(""), [error, setError] = useState("")
  useEffect(() => { heading.current?.focus() }, [])
  const ownerName = state.people.find(p => p.id === node.ownerId)?.name ?? "Your teammate"
  const closed = !!request?.closedOn || node.status === "done"
  const response = request && optionalText(request, "responseBy") === grant.recipientId ? optionalText(request, "response") : ""
  function respond(kind: "acknowledge" | "provided") {
    setError(""); setNotice("")
    const accepted = tryDispatch({ type: "taskAccessAction", token, update: { kind } })
    const runtime = getState().reminderRuntime
    const saved = isReminderRuntime(runtime) && runtime.waitingRequests.find(r => r.id === grant.waitingRequestId)
    if (!accepted || !saved || saved.responseBy !== grant.recipientId || saved.response !== (kind === "provided" ? "provided" : "acknowledged")) { setError("Your update was not saved. Please restore browser saving or check for newer changes, then try again."); return }
    setNotice("Your update is saved. Thank you.")
    heading.current?.focus()
  }
  const title = embedded ? <h2 ref={heading} tabIndex={-1}>{node.title}</h2> : <h1 id="single-task-heading" ref={heading} tabIndex={-1}>{node.title}</h1>
  return <article className="single-task-card" data-testid="single-task-page">
    <header className="single-task-head"><p className="single-task-event">{facts.eventName ?? "Club work"}</p>{title}<p className="single-task-current"><span data-testid="single-task-status">{closed ? "Request closed" : response === "provided" ? "Update provided" : response === "acknowledged" ? "Acknowledged" : "Help requested"}</span><span>{ownerName}'s task</span></p><p data-testid="single-task-due">Task due {facts.due ? fmtLong(facts.due) : "Not set"}</p></header>
    <section className="single-task-section" aria-label="Your help is requested"><h2>Your help is requested</h2><p>{ownerName} is waiting for your input. This task remains with {ownerName}.</p><p className="single-task-copy">{request?.waitingOn || `Could you share an update with ${ownerName}?`}</p></section>
    <section className="single-task-section" aria-label="Task context"><h2>Task context</h2><p className="single-task-copy">{facts.requirement}</p></section>
    <section className="single-task-section" aria-label="Respond to the request"><h2>Respond to the request</h2>{closed ? <p>This request is closed. Thank you.</p> : response === "provided" ? <p>Your update is recorded. {ownerName} can continue from here. Thank you.</p> : <div className="single-task-actions" role="group" aria-label="Respond to help request"><button type="button" className="btn" disabled={response === "acknowledged"} onClick={() => respond("acknowledge")}>Acknowledge</button><button type="button" className="btn" onClick={() => respond("provided")}>Update provided</button></div>}{notice && <p role="status">{notice}</p>}{error && <p role="alert">{error}</p>}</section>
  </article>
}
