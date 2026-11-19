import type { DemoState } from "../../data/types"
import { findWorkflowTemplateVersion, publishedWorkflowTemplates, STANDARD_WORKFLOW_TEMPLATE_ID } from "../../data/workflowTemplates"

export interface WorkflowChoice { templateId: string; templateVersion: number }

/** The default is resolved once when the form opens, so later template edits cannot silently change it. */
export function initialWorkflowChoice(state: DemoState, saved?: WorkflowChoice): WorkflowChoice | undefined {
  if (saved) return saved
  const published = publishedWorkflowTemplates(state)
  const template = published.find(item => item.id === (state.org.defaultWorkflowTemplateId ?? STANDARD_WORKFLOW_TEMPLATE_ID))
  return template ? { templateId: template.id, templateVersion: template.version } : undefined
}

/** Both event entry points use the same human-only, version-pinned selection. */
export function WorkflowTemplatePicker({ state, value, onChange }: { state: DemoState; value: WorkflowChoice | undefined; onChange: (choice: WorkflowChoice) => void }) {
  const options: (WorkflowChoice & { name: string })[] = publishedWorkflowTemplates(state).map(item => ({ name: item.name, templateId: item.id, templateVersion: item.version }))
  const selected = value && options.find(item => item.templateId === value.templateId && item.templateVersion === value.templateVersion)
  if (value && !selected && findWorkflowTemplateVersion(state, value.templateId, value.templateVersion)) {
    const version = findWorkflowTemplateVersion(state, value.templateId, value.templateVersion)!
    options.unshift({ name: version.name, ...value })
  }
  const optionValue = (choice: WorkflowChoice) => `${choice.templateId}@${choice.templateVersion}`
  const currentValue = value ? optionValue(value) : ""
  const available = !!value && options.some(item => optionValue(item) === currentValue)
  return <label>Workflow template<select aria-label="Workflow template" value={currentValue} onChange={event => {
    const next = options.find(item => optionValue(item) === event.target.value)
    if (next) onChange({ templateId: next.templateId, templateVersion: next.templateVersion })
  }}>
    {!available && <option value={currentValue}>{value ? "Saved version unavailable — choose a workflow" : "Choose a saved workflow"}</option>}
    {options.map(item => <option key={optionValue(item)} value={optionValue(item)}>{item.name} · v{item.templateVersion}</option>)}
  </select></label>
}
