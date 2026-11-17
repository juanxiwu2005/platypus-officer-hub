import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { useSchedule, useStore } from "../data/store"
import type { Node, NodeStatus } from "../data/types"
import { officers } from "../data/permissions"
import { isBudgetControlledNode } from "../engine/eventBudget"
import { canClaimMatchingTask } from "../matching/adapters"
import { daysBetween, fmtLong } from "../lib/dates"
import { buildReminderFacts } from "./facts"
import { usableTaskAccessGrant, verifyTaskAccessGrant } from "./taskAccess"
import { isReminderRuntime } from "./runtime"
import type { TaskAccessGrant, TaskAccessUpdate } from "./accessContracts"
import type { WaitingRequest } from "./contracts"
import "./single-task.css"

const STATUS: Record<NodeStatus, string> = { unclaimed: "Not claimed", accepted: "Ready to begin", in_progress: "Working on it", waiting: "Waiting on", blocked: "Stuck", done: "Done" }
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

function TaskContent({ node, grant, request, token }: { node: Node; grant: TaskAccessGrant; request?: WaitingRequest; token: string }) {
  const { state, tryDispatch, getState } = useStore()
  const schedule = useSchedule().nodes[node.id]
  const facts = buildReminderFacts(state, node.id)!
  const heading = useRef<HTMLHeadingElement>(null)
  const updateHeading = useRef<HTMLHeadingElement>(null)
  const [waitingForm, setWaitingForm] = useState(false)
  const [waitingPerson, setWaitingPerson] = useState(node.waitingOnPersonId ?? "")
  const [waitingDetail, setWaitingDetail] = useState("")
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  useEffect(() => { heading.current?.focus() }, [])
  function send(update: TaskAccessUpdate) {
    setNotice(""); setError("")
    // Persistence precedes the state commit: an in-memory transition alone is not a saved update.
    const accepted = tryDispatch({ type: "taskAccessAction", token, update })
    const stored = getState()
    const storedNode = stored.nodes.find(n => n.id === node.id)
    const storedRequest = grant.scope === "waiting" && isReminderRuntime(stored.reminderRuntime) ? stored.reminderRuntime.waitingRequests.find(r => r.id === request?.id) : undefined
    const expected = update.kind === "done" ? "done" : update.kind === "working" ? "in_progress" : update.kind === "stuck" ? "blocked" : update.kind === "waiting" ? "waiting" : "accepted"
    const saved = accepted && (grant.scope === "waiting"
      ? storedRequest?.responseBy === grant.recipientId && storedRequest.response === (update.kind === "provided" ? "provided" : "acknowledged")
      : storedNode?.status === expected)
    if (!saved) { setError("Your update was not saved. Your entered details are kept here. Please try again, or reload if this page reports a conflict."); return }
    setNotice("Your update is saved. Thank you.")
    setWaitingForm(false)
    if (["claim", "done", "provided"].includes(update.kind)) updateHeading.current?.focus()
  }
  function saveWaiting() {
    const person = officers(state).find(p => p.id === waitingPerson && p.id !== grant.recipientId)
    const detail = waitingDetail.trim() || person?.name
    if (!waitingPerson || !detail || (waitingPerson !== "other" && !person)) { setError("Choose who or what you are waiting on."); return }
    send({ kind: "waiting", waitingOn: detail, waitingOnPersonId: person?.id ?? null })
  }
  const owner = state.people.find(p => p.id === node.ownerId)
  const ownerName = owner?.name ?? "Your teammate"
  const waiting = grant.scope === "waiting"
  const closed = !!request?.closedOn || node.status === "done"
  const response = request && optionalText(request, "responseBy") === grant.recipientId ? optionalText(request, "response") : ""
  const responseLabel = response === "provided" ? "Update provided" : response === "acknowledged" ? "Acknowledged" : "Help requested"
  const due = schedule?.club ?? facts.due
  const overdue = due && node.status !== "done" ? Math.max(0, daysBetween(due, state.today)) : 0
  const criteria = optionalText(facts, "completionCriteria") || optionalText(node, "completionCriteria")
  const risks = (schedule?.issues ?? []).filter(i => i.severity === "error" || (i.severity === "warn" && i.code !== "start_passed" && i.code !== "club_passed"))
  const budget = isBudgetControlledNode(node)
  const budgetUrl = `/events?event=${encodeURIComponent(node.eventId ?? "")}&view=budget`
  const actionable = node.status !== "done" && !waiting
  return <article className="single-task-card" data-testid="single-task-page">
    <header className="single-task-head">
      <p className="single-task-event">{facts.eventName ?? "Club work"}</p>
      <h1 id="single-task-heading" ref={heading} tabIndex={-1}>{facts.title}</h1>
      <p className="single-task-current"><span className={`single-task-badge${node.status === "done" ? " is-done" : ""}`} data-testid="single-task-status">{waiting ? closed ? "Request closed" : responseLabel : STATUS[node.status]}</span><span>{waiting ? `${ownerName}'s task` : "Your task"}</span></p>
      <div className={`single-task-due${overdue ? " is-late" : ""}`} data-testid="single-task-due"><span>Task due</span><strong>{due ? fmtLong(due) : "Not set"}</strong>{overdue > 0 && <span>{overdue} day{overdue === 1 ? "" : "s"} overdue</span>}</div>
    </header>

    {waiting && request && <section className="single-task-section" aria-labelledby="single-task-request">
      <h2 id="single-task-request">Your help is requested</h2>
      <p>{ownerName} is waiting for your input. This task remains with {ownerName}.</p>
      <p className="single-task-copy">{request.waitingOn.trim() && request.waitingOn.trim() !== state.people.find(p => p.id === grant.recipientId)?.name ? request.waitingOn : `Could you share an update with ${ownerName}?`}</p>
    </section>}

    <section className="single-task-section" aria-labelledby="single-task-requirement">
      <h2 id="single-task-requirement">{waiting ? "Task context" : "What to do"}</h2>
      <p className="single-task-copy">{facts.requirement}</p>
      {criteria && <p className="single-task-copy"><strong>Complete when: </strong>{criteria}</p>}
      {!waiting && facts.actionLink && <div className="single-task-action"><a className="btn btn-primary" href={facts.actionLink.url} target="_blank" rel="noreferrer">{facts.actionLink.label} ↗</a><p>{facts.actionLink.explanation}</p></div>}
    </section>

    <section className="single-task-section" aria-labelledby="single-task-importance"><h2 id="single-task-importance">Why it matters</h2><p className="single-task-copy">{facts.importance}</p></section>
    {risks.length > 0 && <aside className="single-task-risk" aria-label="Schedule notes"><ul>{risks.map(i => <li key={i.code}>{i.text}</li>)}</ul></aside>}

    <section className="single-task-section" aria-labelledby="single-task-update">
      <h2 id="single-task-update" ref={updateHeading} tabIndex={-1}>{waiting ? "Respond to the request" : "Keep us in the loop"}</h2>
      {waiting ? <>
        {closed ? <p>This request is closed. No further update is needed. Thank you.</p> : response === "provided" ? <p>Your update is recorded. {ownerName} can continue from here. Thank you.</p> : <div className="single-task-actions" role="group" aria-label="Respond to help request"><button type="button" className="btn" disabled={response === "acknowledged"} onClick={() => send({ kind: "acknowledge" })}>Acknowledge</button><button type="button" className="btn" onClick={() => send({ kind: "provided" })}>Update provided</button></div>}
      </> : node.status === "done" ? <p>This task is complete. Thank you for your work.</p> : node.status === "unclaimed" ? <>
        <p>Confirm that you are taking this task before updating its progress.</p>
        <button type="button" className="btn btn-primary" disabled={!canClaimMatchingTask(state, node, grant.recipientId)} onClick={() => send({ kind: "claim" })}>I've got it</button>
        {!canClaimMatchingTask(state, node, grant.recipientId) && <p className="single-task-hint">This assignment needs review before it can be claimed.</p>}
      </> : <>
        <p>Let us know where things stand so we can help with the next step.</p>
        <div className="single-task-actions" role="group" aria-label="Update task status">
          <button type="button" className="btn" disabled={budget} aria-describedby={budget ? "single-task-budget" : undefined} onClick={() => send({ kind: "done" })}>Done</button>
          <button type="button" className="btn" onClick={() => send({ kind: "working" })}>Working on it</button>
          <button type="button" className="btn" onClick={() => send({ kind: "stuck" })}>Stuck</button>
          <button type="button" className="btn" aria-expanded={waitingForm} aria-controls="single-task-waiting-form" onClick={() => { setWaitingForm(v => !v); setError(""); setNotice("") }}>Waiting on</button>
        </div>
      </>}
      {actionable && budget && <p id="single-task-budget" className="single-task-hint">Completion is managed in Event Budget. <Link to={budgetUrl}>Open Event Budget</Link></p>}
      {actionable && waitingForm && <form id="single-task-waiting-form" className="single-task-waiting" onSubmit={e => { e.preventDefault(); saveWaiting() }}>
        <label>Waiting on<select value={waitingPerson} onChange={e => setWaitingPerson(e.target.value)}><option value="">Choose a person or dependency</option>{officers(state).filter(p => p.id !== grant.recipientId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}<option value="other">Someone outside the team or another dependency</option></select></label>
        <label>What would help?{waitingPerson !== "other" ? " (optional)" : ""}<textarea value={waitingDetail} onChange={e => setWaitingDetail(e.target.value)} maxLength={180} required={waitingPerson === "other"} placeholder="For example, confirm the room requirements" /></label>
        <p className="single-task-hint">A named teammate receives a separate request. Your task stays with you. Other dependencies are saved without guessing an email address.</p>
        <div className="single-task-form-actions"><button className="btn btn-primary" type="submit">Save waiting status</button><button className="btn" type="button" onClick={() => setWaitingForm(false)}>Cancel</button></div>
      </form>}
      {notice && <p role="status" className="single-task-saved">{notice}</p>}
      {error && <p role="alert" className="single-task-error">{error}</p>}
    </section>
  </article>
}
