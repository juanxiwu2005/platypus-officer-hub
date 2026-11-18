import { useEffect, useRef, useState, type FormEvent } from "react"
import type { Role, StepCond, WorkflowBranch } from "../../data/types"
import { EVENT_CHECKLIST } from "../../data/eventChecklist"
import { isolateDialog, trapTabKey } from "../../lib/focus"
import "./workflow-branch.css"

export interface BranchDraft {
  title: string
  side: WorkflowBranch["side"]
  conditions: StepCond[]
  defaultRoleId: string | null
  firstStepTitle: string
}

export function WorkflowBranchDialog({ roles, onAdd, onClose }: { roles: Role[]; onAdd: (draft: BranchDraft) => string | null; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null)
  const [title, setTitle] = useState("")
  const [side, setSide] = useState<WorkflowBranch["side"]>("before_event")
  const [conditions, setConditions] = useState<StepCond[]>([])
  const [roleId, setRoleId] = useState(() => roles.find(role => role.fn === "programs")?.id ?? roles.find(role => role.fn !== "advisor")?.id ?? "")
  const [firstStepTitle, setFirstStepTitle] = useState("")
  const [error, setError] = useState<string | null>(null)
  const close = useRef(onClose)
  useEffect(() => { close.current = onClose }, [onClose])
  const toggleCondition = (condition: StepCond, checked: boolean) => setConditions(previous => {
    if (!checked) return previous.filter(value => value !== condition)
    return previous.includes(condition) ? previous : [...previous, condition]
  })
  useEffect(() => {
    const dialog = box.current
    if (!dialog) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const restore = isolateDialog(dialog)
    dialog.querySelector<HTMLInputElement>("input")?.focus()
    const keys = (event: KeyboardEvent) => {
      trapTabKey(event, dialog)
      if (event.key === "Escape" && !event.defaultPrevented) { event.preventDefault(); event.stopPropagation(); close.current() }
    }
    document.addEventListener("keydown", keys)
    return () => { document.removeEventListener("keydown", keys); restore(); if (opener?.isConnected) opener.focus() }
  }, [])
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim() || !firstStepTitle.trim()) { setError("Name the branch and its first task."); return }
    setError(onAdd({ title: title.trim(), side, conditions: [...conditions], defaultRoleId: roleId || null, firstStepTitle: firstStepTitle.trim() }))
  }
  return <div className="workflow-branch-backdrop" onClick={e => { if (e.currentTarget === e.target) onClose() }}>
    <div className="workflow-branch-dialog card" ref={box} role="dialog" aria-modal="true" aria-labelledby="workflow-branch-title">
      <form className="form-stack" onSubmit={submit}>
        <h3 id="workflow-branch-title">Add branch</h3>
        <label>Branch name<input value={title} maxLength={80} onChange={e => setTitle(e.target.value)} required /></label>
        <label>When<select value={side} onChange={e => setSide(e.target.value as WorkflowBranch["side"])}><option value="before_event">Before event</option><option value="after_event">After event</option></select></label>
        <fieldset className="workflow-branch-conditions" aria-describedby="workflow-branch-conditions-description">
          <legend>Include this branch when</legend>
          <p id="workflow-branch-conditions-description" className="small muted">This branch is included only when every selected item is checked for the event. Leave all unchecked for every event.</p>
          <div className="workflow-branch-conditions-list">
            {EVENT_CHECKLIST.map(item => <label key={item.key} className="check-label"><input type="checkbox" checked={conditions.includes(item.key)} onChange={event => toggleCondition(item.key, event.target.checked)} /><span>{item.label}</span></label>)}
          </div>
          <div className="workflow-branch-condition-summary"><p className="small" role="status" aria-live="polite">{conditions.length ? `${conditions.length === 1 ? "1 selected item must" : `All ${conditions.length} selected items must`} be checked.` : "Every event"}</p>{conditions.length > 0 && <button type="button" className="btn small btn-quiet" onClick={() => setConditions([])}>Clear selection</button>}</div>
        </fieldset>
        <label>Default role<select value={roleId} onChange={e => setRoleId(e.target.value)}>{!roleId && <option value="">No matching role</option>}{roles.filter(role => role.fn !== "advisor").map(role => <option key={role.id} value={role.id}>{role.displayName}</option>)}</select></label>
        <label>First task<input value={firstStepTitle} maxLength={120} onChange={e => setFirstStepTitle(e.target.value)} required /></label>
        {error && <p role="alert" className="small late-text">{error}</p>}
        <div className="action-row workflow-branch-actions"><button type="submit" className="btn">Add branch</button><button type="button" className="btn btn-quiet" onClick={onClose}>Cancel</button></div>
      </form>
    </div>
  </div>
}
