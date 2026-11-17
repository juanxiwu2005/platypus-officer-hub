import { useState } from "react"
import { useNavigate } from "react-router-dom"
import type { Node } from "../data/types"
import { useStore } from "../data/store"
import { validateReply, type ReplyInput, type TaskReply } from "../data/taskWorkflow"
import { STATUS_ACTIONS } from "../lib/nudges"
import { isPresident } from "../data/permissions"
import { isBudgetControlledNode } from "../engine/eventBudget"

/** The reminder's reply links keep their keys; on the screen "done" is the one primary button, the rest sit in a row of small ones. */
const SECONDARY = STATUS_ACTIONS.filter(a => a.key !== "done")

/**
 * "Your next step" (FB-4, PLAN.md §6.2): exactly one primary button — "I've got it" for a Not claimed task, otherwise
 * "Mark done" — and the other status replies as small buttons with their existing forms. Who may do what is unchanged:
 * the owner or the president updates; anyone may claim an open task; validateReply and the store check again.
 */
export function TaskActions({ node, actorId, token, initialReply }: { node: Node; actorId: string; token?: string; initialReply?: string | null }) {
  const { state, dispatch } = useStore()
  const navigate = useNavigate()
  const [form, setForm] = useState(initialReply === "waiting" || initialReply === "extension" ? initialReply : "")
  const [input, setInput] = useState<ReplyInput>({ waitingOn: "", waitingOnPersonId: null, draftLink: node.draftLink ?? "", requestedDate: "", reason: "" })
  const [notice, setNotice] = useState("")
  function send(reply: TaskReply, value = input) {
    const error = validateReply(state, node, actorId, reply, value)
    if (error) { setNotice(error); return }
    if (token) dispatch({ type: "officerAction", token, reply, input: value })
    else dispatch({ type: "replyTask", nodeId: node.id, reply, input: value })
    setForm(""); setNotice(reply === "extension" ? "Extension requested. The deadline stays unchanged until approval." : "Update saved. This round of follow-up has stopped.")
  }
  const budgetControlled = isBudgetControlledNode(node)
  const openBudget = node.eventId && budgetControlled
    ? <button type="button" className="btn small" onClick={() => navigate(`/events?event=${encodeURIComponent(node.eventId!)}&view=budget`)}>Open Event Budget</button>
    : null
  const canUpdate = node.ownerId === actorId || isPresident(state, actorId)

  if (node.status === "done") return <div className="task-actions"><p className="small good-text">Completed{node.completedOn ? ` on ${node.completedOn}` : ""}. Thank you.</p>{openBudget}</div>
  if (node.ownerId && !canUpdate) return <div className="task-actions"><p className="small muted">Only the owner or president can update this task.</p>{openBudget}</div>
  if (node.status === "unclaimed") return <div className="task-actions">
    <div className="td-primary"><button type="button" className="btn btn-primary" onClick={() => {
      if (token) dispatch({ type: "officerAction", token, reply: "claim" })
      else dispatch({ type: "claimTask", nodeId: node.id })
      setNotice("Claimed. The handover is confirmed.")
    }}>I've got it</button><span className="small muted">Tap to confirm that you own this task.</span></div>
    {openBudget}
    {notice && <p className="small" role="status">{notice}</p>}
  </div>
  return <div className="task-actions">
    <div className="td-primary">
      <button type="button" className="btn btn-primary" disabled={budgetControlled} onClick={() => send("done", {})}>Mark done</button>
      {budgetControlled && <><span className="small muted">Complete this step in Event Budget.</span>{openBudget}</>}
    </div>
    <div className="td-secondary" role="group" aria-label="Update task status">{SECONDARY.map(a => <button key={a.key} type="button" className={`btn small${initialReply === a.key ? " is-suggested" : ""}`} aria-expanded={a.key === "waiting" || a.key === "extension" ? form === a.key : undefined} onClick={() => a.key === "waiting" || a.key === "extension" ? setForm(a.key) : send(a.key, {})}>{a.label}</button>)}</div>
    {form === "waiting" && <form className="task-form" onSubmit={e => { e.preventDefault(); send("waiting") }}>
      <label>Waiting on<select aria-label="Waiting on" value={input.waitingOnPersonId ?? input.waitingOn} onChange={e => { const person = state.people.find(p => p.id === e.target.value); setInput({ ...input, waitingOn: person?.name ?? e.target.value, waitingOnPersonId: person?.id ?? null }) }}><option value="">Choose a person or dependency</option>{state.people.filter(p => p.id !== actorId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}<option value="School or vendor approval">School or vendor approval</option><option value="Materials from another task">Materials from another task</option></select></label>
      <button className="btn btn-primary" type="submit">Save waiting status</button>
    </form>}
    {form === "extension" && <form className="task-form" onSubmit={e => { e.preventDefault(); send("extension") }}>
      <p className="small muted">Share your current draft so we can decide together.</p>
      <label>Current draft link<input aria-label="Current draft link" type="url" value={input.draftLink} onChange={e => setInput({ ...input, draftLink: e.target.value })} placeholder="https://…" /></label>
      <label>Requested club deadline<input aria-label="Requested club deadline" type="date" value={input.requestedDate} onChange={e => setInput({ ...input, requestedDate: e.target.value })} /></label>
      <label>What would help? (optional)<textarea maxLength={300} value={input.reason} onChange={e => setInput({ ...input, reason: e.target.value })} /></label>
      <button className="btn btn-primary" type="submit">Request extension</button>
    </form>}
    {form && <button type="button" className="btn btn-quiet small" onClick={() => setForm("")}>Cancel</button>}
    {notice && <p className="small" role="status">{notice}</p>}
  </div>
}
