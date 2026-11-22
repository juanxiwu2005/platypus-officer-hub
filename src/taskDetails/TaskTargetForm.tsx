import { useId, useMemo, useState } from "react"
import type { Node } from "../data/types"
import { useStore } from "../data/store"
import { officers } from "../data/permissions"
import { validDate } from "../lib/commands"
import { taskWorkActor } from "./authorization"
import { targetImpact, targetLog, taskTargetKey } from "./targetDates"
import { suggestedTargetPeople } from "./targetPeople"
import { fmtShort } from "../lib/dates"
import type { TaskAuthorization } from "./contracts"

export function TaskTargetForm({ node, actorId, authorization, onSaved, onCancel }: { node: Node; actorId: string; authorization?: TaskAuthorization; onSaved: (message: string) => void; onCancel: () => void }) {
  const { state, tryDispatch, getState } = useStore(), heading = useId()
  const old = state.extensionRequests.find(r => r.nodeId === node.id && r.ownerId === node.ownerId && r.previousDeadline === node.clubDeadline && r.status === "pending")
  const [date, setDate] = useState(old?.requestedDate ?? ""), [message, setMessage] = useState(old?.reason ?? "")
  const [baseline] = useState({ workspace: state.demoLinkKey, task: taskTargetKey(node), revision: targetLog(node)?.revision })
  const [choices, setChoices] = useState<Record<string, boolean>>({}), [added, setAdded] = useState<string[]>([])
  const [adding, setAdding] = useState(false), [teammate, setTeammate] = useState("")
  const [error, setError] = useState("")
  const suggested = useMemo(() => suggestedTargetPeople(state, node.id, validDate(date) ? date : node.clubDeadline ?? state.today), [state, node.id, node.clubDeadline, date])
  const candidates = [...suggested, ...officers(state).filter(p => added.includes(p.id) && !suggested.some(x => x.person.id === p.id)).map(person => ({ person, lead: false, tasks: [] as Node[] }))]
    .sort((a, b) => Number(b.lead) - Number(a.lead) || Number(a.person.id === actorId) - Number(b.person.id === actorId))
  const selected = candidates.filter(c => choices[c.person.id] ?? (suggested.some(x => x.person.id === c.person.id) && c.person.id !== actorId)).map(c => c.person.id)
  const available = officers(state).filter(p => !candidates.some(c => c.person.id === p.id))
  function save() {
    setError("")
    if (!validDate(date) || date < state.today || date === node.clubDeadline) { setError("Choose a different target date, no earlier than today."); return }
    const current = getState()
    if (current.demoLinkKey !== baseline.workspace || taskWorkActor(current, node.id, authorization) !== actorId) { setError("The workspace or task entry changed. Your message is kept; reopen the task to continue."); return }
    const planned = targetImpact(current, node.id, date).after.nodes[node.id]
    if (planned && planned.club !== date) { setError(`Connected tasks place this target on ${fmtShort(planned.club)}. Choose that date or review the connected tasks.`); return }
    const accepted = tryDispatch({ type: "updateTaskTarget", nodeId: node.id, authorization, input: { date, message, notifyPersonIds: selected, expectedTask: baseline.task } })
    const saved = getState().nodes.find(n => n.id === node.id), record = saved && targetLog(saved)?.changes.at(-1)
    if (!accepted || saved?.clubDeadline !== date || saved.targetDates?.revision !== (baseline.revision ?? -1) + 1 || record?.actorId !== actorId || JSON.stringify(record.notifiedPersonIds) !== JSON.stringify(selected)) { setError("Your date update was not saved. Your message and selections are kept. Check for newer changes or unavailable teammates, restore saving, then try again."); return }
    onSaved(`Target date updated. ${selected.length ? `${selected.length} ${selected.length === 1 ? "person" : "people"} notified.` : "No one selected for notification."}`)
  }
  return <form className="task-progress-form task-target-form" aria-labelledby={heading} onSubmit={e => { e.preventDefault(); save() }}>
    <h3 id={heading}>Update the team</h3>
    <label>New target date<input type="date" required min={state.today} value={date} onChange={e => setDate(e.target.value)} /></label>
    <p className="small muted">Official school deadlines stay unchanged.</p>
    <label>Message (optional)<textarea value={message} rows={2} maxLength={300} onChange={e => setMessage(e.target.value)} /></label>
    <fieldset className="task-target-people"><legend>Notify others</legend>
      {candidates.map(({ person, lead, tasks }) => <label className="task-target-person" key={person.id}>
        <input type="checkbox" checked={selected.includes(person.id)} onChange={e => setChoices({ ...choices, [person.id]: e.target.checked })} />
        <span><span>{person.name}{person.id === actorId ? " (you)" : ""}</span><span className="small muted">{[lead ? "Club lead" : "", tasks.length ? `${tasks[0].dependsOn.includes(node.id) ? "Next" : "Connected"}: ${tasks.slice(0, 2).map(n => n.title).join(" · ")}${tasks.length > 2 ? ` +${tasks.length - 2} tasks` : ""}` : !lead ? "Teammate" : ""].filter(Boolean).join(" · ")}</span></span>
      </label>)}
      {!candidates.length && <p className="small muted">No connected teammates found. You can add someone.</p>}
      {!adding && <button type="button" className="btn small" disabled={!available.length} onClick={() => setAdding(true)}>+ Add teammate</button>}
      {adding && <div className="task-target-add"><label>Teammate<select value={teammate} onChange={e => setTeammate(e.target.value)}><option value="">Choose a teammate</option>{available.map(p => <option key={p.id} value={p.id}>{p.name}{p.id === actorId ? " (you)" : ""}</option>)}</select></label><div className="task-inline-actions"><button type="button" className="btn small" disabled={!available.some(p => p.id === teammate)} onClick={() => { setAdded([...added, teammate]); setChoices({ ...choices, [teammate]: true }); setTeammate(""); setAdding(false) }}>Add</button><button type="button" className="btn btn-quiet small" onClick={() => setAdding(false)}>Cancel adding</button></div></div>}
      <p className="small muted">One update per person.</p>
    </fieldset>
    <div className="task-inline-actions"><button type="submit" className="btn btn-primary" disabled={date === node.clubDeadline || !targetLog(node)}>Update date &amp; notify</button><button type="button" className="btn btn-quiet small" onClick={onCancel}>Cancel</button></div>
    {error && <p className="small late-text" role="alert">{error}</p>}
    {!targetLog(node) && <p role="alert" className="small late-text">This saved date history needs recovery before it can be changed.</p>}
  </form>
}
