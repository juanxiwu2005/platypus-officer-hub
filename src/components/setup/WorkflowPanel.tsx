import { useState } from "react"
import type { Role, StepTemplate } from "../../data/types"
import type { WorkflowIssue } from "../../engine/workflow"
import { WorkflowChart } from "./WorkflowChart"
import { WorkflowEditor } from "./WorkflowEditor"
import { WorkflowIssues } from "./WorkflowReview"

/**
 * The workflow, checked first and edited only if needed: the engine's checks against ASU rules, then the chart (look), and under it the
 * step list (change). Clicking a card in the chart opens the list at that step.
 */
export function WorkflowPanel({ steps, roles, issues, onChange }: { steps: StepTemplate[]; roles: Role[]; issues: WorkflowIssue[]; onChange: (steps: StepTemplate[]) => void }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const select = (key: string) => {
    setSelected(key); setOpen(true)
    setTimeout(() => document.getElementById(`wf-row-${key}`)?.scrollIntoView({ block: "center" }), 60)
  }
  return <>
    <WorkflowIssues issues={issues} />
    <WorkflowChart steps={steps} roles={roles} issues={issues} selected={selected} onSelect={select} />
    <details className="more wf-edit" open={open} onToggle={e => setOpen(e.currentTarget.open)} data-testid="workflow-edit">
      <summary>Edit steps</summary>
      <p className="small muted">Look at the chart first. Change a step here only if the chart looks wrong: who does it, how many days, what it waits for.</p>
      <WorkflowEditor steps={steps} roles={roles} onChange={onChange} selected={selected} />
    </details>
  </>
}
