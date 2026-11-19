import { useState } from "react"
import type { Node } from "../data/types"
import { useStore, type Action } from "../data/store"
import { isOfficer, isPresident, officers } from "../data/permissions"
import { validateReply, type ReplyInput, type TaskReply } from "../data/taskWorkflow"
import type { TaskAuthorization } from "./contracts"
import { isBudgetControlledNode } from "../engine/eventBudget"
import { taskWorkActor } from "./authorization"
import { TaskTargetForm } from "./TaskTargetForm"

export const TASK_STATUS = { unclaimed: "Not claimed", accepted: "To do", in_progress: "Working on it", waiting: "Waiting on", blocked: "Stuck", done: "Done" }
export function TaskProgress({ node, actorId, authorization, initialReply, readOnly = false }: { node: Node; actorId: string; authorization?: TaskAuthorization; initialReply?: string | null; readOnly?: boolean }) {
  const { state, tryDispatch, getState } = useStore()
  const [form, setForm] = useState(initialReply === "waiting" || initialReply === "extension" ? initialReply : "")
  const [person, setPerson] = useState(node.waitingOnPersonId ?? "other")
  const [input, setInput] = useState<ReplyInput>({ waitingOn: node.waitingOn ?? "",  })
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const editable = !readOnly && taskWorkActor(state, node.id, authorization) === actorId && state.people.some(p => p.id === actorId && isOfficer(p)) && (!node.ownerId || node.ownerId === actorId || isPresident(state, actorId)) && !(node.status === "done" && isBudgetControlledNode(node))
  function update(reply: Exclude<TaskReply, "extension"> | "claim", value: ReplyInput = {}) {
    setError(""); setNotice("")
    const before = getState(), current = before.nodes.find(n => n.id === node.id)
    if (!current) return
    const problem = reply === "claim" ? null : validateReply(before, current, actorId, reply, value)
    if (problem) { setError(problem); return }
    let action: Action
    if (authorization?.kind === "access") {
      action = { type: "taskAccessAction", token: authorization.token, update: { kind: reply === "help" ? "stuck" : reply, ...value } }
    } else if (authorization?.kind === "legacy") action = { type: "officerAction", token: authorization.token, reply, input: value }
    else action = reply === "claim" ? { type: "claimTask", nodeId: node.id } : { type: "replyTask", nodeId: node.id, reply, input: value }
    const accepted = tryDispatch(action)
    const after = getState(), saved = after.nodes.find(n => n.id === node.id)
    const expected = reply === "claim" || reply === "todo" ? "accepted" : reply === "waiting" ? "waiting" : reply === "help" ? "blocked" : reply === "done" ? "done" : "in_progress"
    if (!accepted || saved?.status !== expected || (reply === "waiting" && (saved.waitingOn !== value.waitingOn?.trim() || (saved.waitingOnPersonId ?? null) !== (value.waitingOnPersonId ?? null)))) { setError("Your update was not saved. Your entered details are kept here. Please restore saving or check for newer changes, then try again."); return }
    setForm(""); setNotice(current.status === "done" ? "Task reopened. Your details and attachments are kept." : "Your update is saved. Thank you.")
  }
  function openForm(value: string) {
    if (value === "waiting" || value === "waiting-edit") {
      const current = getState().nodes.find(n => n.id === node.id) ?? node
      setPerson(current.waitingOnPersonId ?? "other")
      setInput(v => ({ ...v, waitingOn: current.waitingOn ?? "" }))
    }
    setForm(value === "waiting-edit" ? "waiting" : value); setError(""); setNotice("")
  }
  return <div className="task-progress" data-testid="single-task-status">
    {!editable || (node.status === "unclaimed" && !!node.ownerId && node.ownerId !== actorId) ? <span className={`task-status-label${node.status === "done" ? " good-text" : ""}`}>{TASK_STATUS[node.status]}</span> : node.status === "unclaimed" ? <button type="button" className="btn small" onClick={() => update("claim")}>I've got it</button> : <label><span className="sr-only">Task status</span><select aria-label="Task status" value={node.status} onChange={e => { const v = e.target.value; if (v === "waiting" || v === "waiting-edit" || v === "extension") { openForm(v) } else update(v === "blocked" ? "help" : v === "accepted" ? "todo" : "working") }}>
      {node.status === "done" && <option value="done" disabled>Done</option>}<option value="accepted">To do</option><option value="in_progress">Working on it</option><option value="blocked">Stuck</option><option value="waiting">Waiting on</option>{node.status === "waiting" && <option value="waiting-edit">Update waiting details…</option>}{node.status !== "done" && <option value="extension">Need more time…</option>}
    </select></label>}
    {editable && form === "waiting" && <form className="task-progress-form" onSubmit={e => { e.preventDefault(); const recipient = officers(getState()).find(p => p.id === person && p.id !== actorId && p.id !== node.ownerId); if (!input.waitingOn?.trim() || (person !== "other" && !recipient)) { setError("Choose a current teammate or another dependency and describe the help needed."); return }; update("waiting", { waitingOn: input.waitingOn, waitingOnPersonId: recipient?.id ?? null }) }}>
      <label>Waiting on<select value={person} onChange={e => setPerson(e.target.value)}>{officers(state).filter(p => p.id !== actorId && p.id !== node.ownerId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}<option value="other">Another dependency</option></select></label><label>What help or input is needed?<textarea aria-label="What help or input is needed?" value={input.waitingOn} maxLength={180} required onChange={e => setInput({ ...input, waitingOn: e.target.value })} /></label><div className="task-inline-actions"><button type="submit" className="btn small">Save waiting status</button><button type="button" className="btn btn-quiet small" onClick={() => setForm("")}>Cancel</button></div>
    </form>}
    {editable && node.status !== "done" && form === "extension" && <TaskTargetForm node={node} actorId={actorId} authorization={authorization} onCancel={() => setForm("")} onSaved={text => { setForm(""); setNotice(text) }} />}
    {node.status === "waiting" && node.waitingOn && !form && <p className="small muted task-waiting-summary">Waiting for: {node.waitingOn}</p>}
    {notice && <p role="status" className="small good-text">{notice}</p>}{error && <p role="alert" className="small late-text">{error}</p>}
  </div>
}
