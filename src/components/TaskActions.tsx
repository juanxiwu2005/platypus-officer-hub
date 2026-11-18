import { useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import type { Node } from "../data/types"
import { useStore } from "../data/store"
import { validateReply, type ReplyInput, type TaskReply } from "../data/taskWorkflow"
import { isPresident, officers } from "../data/permissions"
import { isBudgetControlledNode } from "../engine/eventBudget"
import { TaskTargetForm } from "../taskDetails/TaskTargetForm"

const waitingTarget = (node: Node) => node.waitingOnPersonId ?? (node.waitingOn?.trim() ? "other" : "")

/** The store retains owner/president and finance authority; success requires a persisted update. */
export function TaskActions({ node, actorId, token, initialReply }: { node: Node; actorId: string; token?: string; initialReply?: string | null }) {
  const { state, tryDispatch, getState } = useStore()
  const navigate = useNavigate()
  const root = useRef<HTMLDivElement>(null)
  const [form, setForm] = useState(initialReply === "waiting" || initialReply === "extension" ? initialReply : "")
  const [waitingPerson, setWaitingPerson] = useState(waitingTarget(node))
  const [input, setInput] = useState<ReplyInput>({ waitingOn: node.waitingOn ?? "", waitingOnPersonId: node.waitingOnPersonId ?? null, requestedDate: "", reason: "" })
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  const failed = () => setError("Your update was not saved. Your entered details are kept here. Please try again, or reload if this page reports a conflict.")
  function send(reply: Exclude<TaskReply, "extension">, value: ReplyInput = input) {
    setNotice(""); setError("")
    const before = getState(), current = before.nodes.find(n => n.id === node.id)
    if (!current) { failed(); return }
    const problem = validateReply(before, current, actorId, reply, value)
    if (problem) { setError(problem); return }
    const accepted = token ? tryDispatch({ type: "officerAction", token, reply, input: value }) : tryDispatch({ type: "replyTask", nodeId: node.id, reply, input: value })
    const after = getState(), savedNode = after.nodes.find(n => n.id === node.id)
    const expected = reply === "todo" ? "accepted" : reply === "done" ? "done" : reply === "waiting" ? "waiting" : reply === "help" ? "blocked" : "in_progress"
    const saved = accepted && savedNode?.status === expected
      && (reply !== "waiting" || (savedNode.waitingOn === value.waitingOn?.trim().slice(0, 180) && (savedNode.waitingOnPersonId ?? null) === (value.waitingOnPersonId ?? null)))
    if (!saved) { failed(); return }
    setForm("")
    setNotice("Your update is saved. Thank you.")
    root.current?.focus()
  }
  function claim() {
    setNotice(""); setError("")
    const accepted = token ? tryDispatch({ type: "officerAction", token, reply: "claim" }) : tryDispatch({ type: "claimTask", nodeId: node.id })
    const saved = getState().nodes.find(n => n.id === node.id)
    if (!accepted || saved?.status !== "accepted" || saved.ownerId !== actorId) { failed(); return }
    setNotice("Claimed. Thank you for taking this task.")
    root.current?.focus()
  }
  function toggleForm(next: "waiting" | "extension") {
    if (form !== next && next === "waiting") {
      const current = getState().nodes.find(n => n.id === node.id) ?? node
      setWaitingPerson(waitingTarget(current))
      setInput(value => ({ ...value, waitingOn: current.waitingOn ?? "", waitingOnPersonId: current.waitingOnPersonId ?? null }))
    }
    setForm(form === next ? "" : next)
    setNotice(""); setError("")
  }
  function saveWaiting() {
    const person = officers(getState()).find(p => p.id === waitingPerson && p.id !== actorId && p.id !== node.ownerId)
    if (!waitingPerson || (waitingPerson !== "other" && !person)) { setError("Choose a current teammate or another dependency."); return }
    if (!input.waitingOn?.trim()) { setError("Describe the help or input you are waiting for."); return }
    send("waiting", { waitingOn: input.waitingOn, waitingOnPersonId: person?.id ?? null })
  }
  const budgetControlled = isBudgetControlledNode(node)
  const openBudget = node.eventId && budgetControlled
    ? <button type="button" className="btn small" onClick={() => navigate(`/events?event=${encodeURIComponent(node.eventId!)}&view=budget`)}>Open Event Budget</button> : null
  const canUpdate = node.ownerId === actorId || isPresident(state, actorId)
  const editable = node.status !== "done" && (!node.ownerId || canUpdate)
  return <div className="task-actions" ref={root} tabIndex={-1}>
    {node.status === "done" ? <><p className="small good-text">Completed{node.completedOn ? ` on ${node.completedOn}` : ""}. Thank you.</p>{openBudget}</>
      : node.ownerId && !canUpdate ? <><p className="small muted">Only the owner or president can update this task.</p>{openBudget}</>
        : node.status === "unclaimed" ? <>
          <div className="td-primary"><button type="button" className="btn btn-primary" onClick={claim}>I've got it</button><span className="small muted">Confirm that you are taking this task.</span></div>
          {openBudget}
        </> : <>
          <div className="td-primary"><button type="button" className="btn btn-primary" disabled={budgetControlled} onClick={() => send("done", {})}>Mark done</button>{budgetControlled && <><span className="small muted">Complete this step in Event Budget.</span>{openBudget}</>}</div>
          <div className="td-secondary" role="group" aria-label="Update task status">
            <button type="button" className={`btn small${initialReply === "working" ? " is-suggested" : ""}`} onClick={() => send("working", {})}>Working on it</button>
            <button type="button" className={`btn small${initialReply === "help" ? " is-suggested" : ""}`} onClick={() => send("help", {})}>Stuck</button>
            <button type="button" className={`btn small${initialReply === "waiting" ? " is-suggested" : ""}`} aria-expanded={form === "waiting"} onClick={() => toggleForm("waiting")}>Waiting on</button>
          </div>
          <button type="button" className="btn btn-quiet small" aria-expanded={form === "extension"} onClick={() => toggleForm("extension")}>Need more time</button>
        </>}
    {editable && node.status !== "unclaimed" && form === "waiting" && <form className="task-form td-waiting-form" onSubmit={e => { e.preventDefault(); saveWaiting() }}>
      <label>Waiting on<select value={waitingPerson} onChange={e => setWaitingPerson(e.target.value)}><option value="">Choose a person or dependency</option>{officers(state).filter(p => p.id !== actorId && p.id !== node.ownerId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}<option value="other">Someone outside the team or another dependency</option></select></label>
      <label>What help or input is needed?<textarea value={input.waitingOn} onChange={e => setInput({ ...input, waitingOn: e.target.value })} maxLength={180} required /></label>
      <p className="small muted">The reminder plan can follow up with a named teammate. Other dependencies are saved without guessing an email address. This task keeps its current owner.</p>
      <button className="btn btn-primary" type="submit">Save waiting status</button>
    </form>}
    {editable && node.status !== "unclaimed" && form === "extension" && <TaskTargetForm node={node} actorId={actorId} authorization={token ? { kind: "legacy", token } : undefined} onCancel={() => setForm("")} onSaved={text => { setForm(""); setNotice(text) }} />}

    {editable && form && form !== "extension" && <button type="button" className="btn btn-quiet small" onClick={() => { setForm(""); setError("") }}>Cancel</button>}
    {notice && <p className="small good-text" role="status">{notice}</p>}
    {error && <p className="small late-text" role="alert">{error}</p>}
  </div>
}
