import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { useStore } from "../data/store"
import type { Node } from "../data/types"
import { TaskDetail } from "../components/TaskDetail"
import { fmtLong } from "../lib/dates"
import { buildReminderFacts } from "./facts"
import { usableTaskAccessGrant, verifyTaskAccessGrant } from "./taskAccess"
import { isReminderRuntime } from "./runtime"
import type { TaskAccessGrant } from "./accessContracts"
import type { WaitingRequest } from "./contracts"
import "./single-task.css"

const optionalText = (value: object, key: string): string => {
  const text = (value as Record<string, unknown>)[key]
  return typeof text === "string" ? text.trim() : ""
}

/** The URL selects an issued authorization; it never supplies a trusted actor or task owner. */
export default function SingleTaskPage({ token }: { token: string }) {
  const { state } = useStore()
  const grant = usableTaskAccessGrant(state, token)
  const [verification, setVerification] = useState<{ token: string; grant: TaskAccessGrant; key: string; valid: boolean } | null>(null)
  useEffect(() => {
    let current = true
    if (grant) verifyTaskAccessGrant(state, token)
      .then(valid => { if (current) setVerification({ token, grant, key: state.demoLinkKey, valid }) })
      .catch(() => { if (current) setVerification({ token, grant, key: state.demoLinkKey, valid: false }) })
    return () => { current = false }
  }, [token, grant, state.demoLinkKey])
  // The previous token's successful promise cannot expose controls while the next token is being checked.
  const checked = !!grant && verification?.token === token && verification.grant === grant && verification.key === state.demoLinkKey
  const node = state.nodes.find(n => n.id === grant?.nodeId)
  const request = grant?.scope === "waiting" && isReminderRuntime(state.reminderRuntime) ? state.reminderRuntime.waitingRequests.find(r => r.id === grant.waitingRequestId) : undefined
  const available = checked && verification?.valid && node && (grant?.scope !== "waiting" || !!request)
  return <main className="single-task" aria-labelledby="single-task-heading">
    <div className="single-task-shell">
      <header className="single-task-brand"><Link to="/" aria-label="Platypus home">Platypus</Link><span>Your task</span></header>
      {available && grant ? <TaskContent key={grant.id} node={node} grant={grant} request={request} token={token} />
        : <Unavailable checking={!!grant && !checked} token={token} />}
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

function WaitingContent({ node, grant, request, token }: { node: Node; grant: TaskAccessGrant; request?: WaitingRequest; token: string }) {
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
  return <article className="single-task-card" data-testid="single-task-page">
    <header className="single-task-head"><p className="single-task-event">{facts.eventName ?? "Club work"}</p><h1 id="single-task-heading" ref={heading} tabIndex={-1}>{node.title}</h1><p className="single-task-current"><span data-testid="single-task-status">{closed ? "Request closed" : response === "provided" ? "Update provided" : response === "acknowledged" ? "Acknowledged" : "Help requested"}</span><span>{ownerName}'s task</span></p><p data-testid="single-task-due">Task due {facts.due ? fmtLong(facts.due) : "Not set"}</p></header>
    <section className="single-task-section" aria-label="Your help is requested"><h2>Your help is requested</h2><p>{ownerName} is waiting for your input. This task remains with {ownerName}.</p><p className="single-task-copy">{request?.waitingOn || `Could you share an update with ${ownerName}?`}</p></section>
    <section className="single-task-section" aria-label="Task context"><h2>Task context</h2><p className="single-task-copy">{facts.requirement}</p></section>
    <section className="single-task-section" aria-label="Respond to the request"><h2>Respond to the request</h2>{closed ? <p>This request is closed. Thank you.</p> : response === "provided" ? <p>Your update is recorded. {ownerName} can continue from here. Thank you.</p> : <div className="single-task-actions" role="group" aria-label="Respond to help request"><button type="button" className="btn" disabled={response === "acknowledged"} onClick={() => respond("acknowledge")}>Acknowledge</button><button type="button" className="btn" onClick={() => respond("provided")}>Update provided</button></div>}{notice && <p role="status">{notice}</p>}{error && <p role="alert">{error}</p>}</section>
  </article>
}
