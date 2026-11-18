import { useEffect, useRef, useState, type FormEvent } from "react"
import type { Role, StepCond, WorkflowBranch } from "../../data/types"
import { WORKFLOW_CONDITION_OPTIONS } from "../../engine/workflowBranches"
import { isolateDialog, trapTabKey } from "../../lib/focus"
import "./workflow-branch.css"

export interface BranchDraft {
  title: string
  side: WorkflowBranch["side"]
  condition?: StepCond
  defaultRoleId: string | null
  firstStepTitle: string
}

export function WorkflowBranchDialog({ roles, onAdd, onClose }: { roles: Role[]; onAdd: (draft: BranchDraft) => string | null; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null)
  const [title, setTitle] = useState("")
  const [side, setSide] = useState<WorkflowBranch["side"]>("before_event")
  const [condition, setCondition] = useState<StepCond | "">("")
  const [roleId, setRoleId] = useState(() => roles.find(role => role.fn === "programs")?.id ?? roles.find(role => role.fn !== "advisor")?.id ?? "")
  const [firstStepTitle, setFirstStepTitle] = useState("")
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const dialog = box.current
    if (!dialog) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const restore = isolateDialog(dialog)
    dialog.querySelector<HTMLInputElement>("input")?.focus()
    const keys = (event: KeyboardEvent) => {
      trapTabKey(event, dialog)
      if (event.key === "Escape" && !event.defaultPrevented) { event.preventDefault(); event.stopPropagation(); onClose() }
    }
    document.addEventListener("keydown", keys)
    return () => { document.removeEventListener("keydown", keys); restore(); if (opener?.isConnected) opener.focus() }
  }, [onClose])
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim() || !firstStepTitle.trim()) { setError("Name the branch and its first task."); return }
    setError(onAdd({ title: title.trim(), side, ...(condition ? { condition } : {}), defaultRoleId: roleId || null, firstStepTitle: firstStepTitle.trim() }))
  }
  return <div className="workflow-branch-backdrop" onClick={e => { if (e.currentTarget === e.target) onClose() }}>
    <div className="workflow-branch-dialog card" ref={box} role="dialog" aria-modal="true" aria-labelledby="workflow-branch-title">
      <form className="form-stack" onSubmit={submit}>
        <h3 id="workflow-branch-title">Add branch</h3>
        <label>Branch name<input value={title} maxLength={80} onChange={e => setTitle(e.target.value)} required /></label>
        <label>When<select value={side} onChange={e => setSide(e.target.value as WorkflowBranch["side"])}><option value="before_event">Before event</option><option value="after_event">After event</option></select></label>
        <label>Applies to<select value={condition} onChange={e => setCondition(e.target.value as StepCond | "")}>{WORKFLOW_CONDITION_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label>Default role<select value={roleId} onChange={e => setRoleId(e.target.value)}>{!roleId && <option value="">No matching role</option>}{roles.filter(role => role.fn !== "advisor").map(role => <option key={role.id} value={role.id}>{role.displayName}</option>)}</select></label>
        <label>First task<input value={firstStepTitle} maxLength={120} onChange={e => setFirstStepTitle(e.target.value)} required /></label>
        {error && <p role="alert" className="small late-text">{error}</p>}
        <div className="action-row"><button type="submit" className="btn">Add branch</button><button type="button" className="btn btn-quiet" onClick={onClose}>Cancel</button></div>
      </form>
    </div>
  </div>
}
