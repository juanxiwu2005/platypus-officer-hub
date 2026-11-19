import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react"
import { useStore } from "../../data/store"
import type { StepTemplate, WorkflowBranch, WorkflowTemplate, WorkflowTemplateDraft, DemoState } from "../../data/types"
import { getWorkflowTemplates, STANDARD_WORKFLOW_TEMPLATE_ID, workflowTemplatePublishError } from "../../data/workflowTemplates"
import { WorkflowBuilder } from "../workflowBuilder/WorkflowBuilder"
import { presetWorkflowStepTeams } from "../../data/workflowTeamDefaults"
import { useRail } from "../rail/RailContext"
import { WorkflowTeams } from "./WorkflowTeams"
import "./workflowLibrary.css"

const rawDraftOf = (template: WorkflowTemplate): WorkflowTemplateDraft => {
  if (template.draft) return structuredClone(template.draft)
  const version = template.versions[template.versions.length - 1]
  return { name: version.name, description: version.description, kind: version.kind, teamExecution: version.teamExecution, steps: structuredClone(version.steps), branches: structuredClone(version.branches), teamMap: structuredClone(version.teamMap), baseVersion: version.version }
}

const draftOf = (template: WorkflowTemplate, state: DemoState): WorkflowTemplateDraft => {
  const draft = rawDraftOf(template)
  const stepTeams = draft.kind === "standard" ? presetWorkflowStepTeams(state, draft.steps, draft.teamMap?.stepTeams) : draft.teamMap?.stepTeams ?? {}
  return { ...draft, teamExecution: "dependencies", steps: draft.steps, teamMap: { version: 1, workflowId: template.id, stepTeams } }
}

export default function WorkflowLibrary() {
  const { state, tryDispatch } = useStore()
  const templates = getWorkflowTemplates(state)
  const rail = useRail()
  // Authoring starts with the timeline in focus. Selecting a task still opens
  // Details explicitly; background draft saves never reopen the generic Ask.
  useEffect(() => { if (rail.tab === "ask") rail.setOpen(false) }, [])
  const [selected, setSelected] = useState(state.org.defaultWorkflowTemplateId ?? STANDARD_WORKFLOW_TEMPLATE_ID)
  const flush = useRef<() => boolean>(() => true)
  const [teamsOpen, setTeamsOpen] = useState(false)
  const [error, setError] = useState("")
  const template = templates.find(item => item.id === selected) ?? templates[0]
  const create = () => {
    if (!flush.current()) return
    const id = crypto.randomUUID()
    if (!tryDispatch({ type: "newWorkflowTemplate", id, name: "Untitled workflow" })) { setError("Could not create. Try again."); return }
    setSelected(id); setError("")
  }
  return <section className="form-stack" data-testid="workflow-settings">
    <header className="action-row"><h2>Workflow templates</h2><button type="button" className="btn small" onClick={() => setTeamsOpen(!teamsOpen)}>Teams</button></header>
    <div className="action-row"><label>Saved workflow<select aria-label="Saved workflow" value={template?.id ?? ""} onChange={e => { if (flush.current()) { setSelected(e.target.value); setError("") } }}>{templates.map(item => <option key={item.id} value={item.id}>{item.draft?.name ?? item.versions[item.versions.length - 1]?.name ?? "Untitled workflow"}{item.draft ? " · Draft" : ""}</option>)}</select></label><button type="button" className="btn" onClick={create}>New workflow</button></div>
    {teamsOpen && <WorkflowTeams onClose={() => setTeamsOpen(false)} />}
    {error && <p role="alert">{error}</p>}
    {template && <TemplateEditor key={template.id} template={template} flush={flush} onDuplicate={id => setSelected(id)} />}
  </section>
}

function TemplateEditor({ template, onDuplicate, flush }: { template: WorkflowTemplate; onDuplicate: (id: string) => void; flush: MutableRefObject<() => boolean> }) {
  const { state, tryDispatch, persistenceFailed, getState } = useStore()
  const [draft, setDraft] = useState(() => draftOf(template, state))
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  const saved = rawDraftOf(template)
  const pending = JSON.stringify(draft) !== JSON.stringify(saved)
  const save = (value = draft) => {
    const fresh = getWorkflowTemplates(getState()).find(item => item.id === template.id)
    if (fresh && JSON.stringify(value) === JSON.stringify(rawDraftOf(fresh))) return true
    if (!tryDispatch({ type: "saveWorkflowTemplateDraft", id: template.id, draft: value })) { setError("Could not save. Your draft is kept here. Try Save draft."); return false }
    setStatus("Draft saved"); setError(""); return true
  }
  flush.current = save
  const lastSave = useRef(save)
  lastSave.current = save
  useEffect(() => () => { lastSave.current() }, [])
  useEffect(() => {
    if (!pending) return
    const timer = setTimeout(() => save(), 500)
    return () => clearTimeout(timer)
  }, [JSON.stringify(draft), pending])
  // Save the latest controlled draft before switching templates or leaving Settings.
  // A failed save stays visible; the explicit Save draft action can retry.
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (pending || persistenceFailed) { event.preventDefault(); event.returnValue = "" } }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [pending, persistenceFailed])
  // Rail details refresh the library. A stable callback prevents the child effect feeding that context forever.
  const update = useCallback((steps: StepTemplate[], branches?: WorkflowBranch[], stepTeams = draft.teamMap?.stepTeams ?? {}) => {
    const previousKeys = new Set(draft.steps.map(step => step.key))
    const mappings = { ...stepTeams }
    for (const step of steps) if (!previousKeys.has(step.key) && !mappings[step.key] && step.ownerRoleId && state.org.workflowRoleTeams?.[step.ownerRoleId]) mappings[step.key] = state.org.workflowRoleTeams[step.ownerRoleId]
    setDraft({ ...draft, teamExecution: "dependencies", steps, branches, teamMap: { version: 1, workflowId: template.id, stepTeams: mappings } })
  }, [draft, state.org.workflowRoleTeams, template.id])
  const groupRoles = () => {
    const current = draft.teamMap?.stepTeams ?? {}
    const mappings = { ...current }
    for (const step of draft.steps) if (!mappings[step.key] && step.ownerRoleId && state.org.workflowRoleTeams?.[step.ownerRoleId]) mappings[step.key] = state.org.workflowRoleTeams[step.ownerRoleId]
    setDraft({ ...draft, steps: draft.steps, teamMap: { version: 1, workflowId: template.id, stepTeams: mappings } })
  }
  const addTeam = () => {
    if (!save()) return null
    const current = getState()
    const teams = current.org.workflowTeams ?? []
    let number = teams.length + 1
    while (teams.some(team => team.name.toLowerCase() === `team ${number}`)) number++
    const id = crypto.randomUUID()
    if (!tryDispatch({ type: "saveWorkflowTeams", teams: [...teams, { id, name: `Team ${number}` }], roleTeams: current.org.workflowRoleTeams ?? {} })) {
      setError("Could not save the new team. Try again."); return null
    }
    setError(""); return id
  }
  const renameTeam = (id: string, name: string) => {
    const current = getState(), clean = name.trim()
    if (!clean || clean.length > 80 || current.org.workflowTeams?.some(team => team.id !== id && team.name.toLowerCase() === clean.toLowerCase())) {
      setError("Give each team a distinct name."); return false
    }
    if (!tryDispatch({ type: "saveWorkflowTeams", teams: (current.org.workflowTeams ?? []).map(team => team.id === id ? { ...team, name: clean } : team), roleTeams: current.org.workflowRoleTeams ?? {} })) {
      setError("The team name was not saved. Try again."); return false
    }
    setError(""); return true
  }
  const latest = template.versions[template.versions.length - 1]
  return <div className="form-stack" data-testid="workflow-template-editor">
    <div className="action-row"><label className="wfl-name">Workflow name<input value={draft.name} maxLength={80} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label><span className="small muted">{latest ? `Version ${latest.version}` : "Unpublished"}</span></div>
    <div className="action-row">
      <button type="button" className="btn small" onClick={() => save()}>Save draft</button>
      <button type="button" className="btn btn-primary" onClick={() => {
        if (!save()) return
        const fresh = getWorkflowTemplates(getState()).find(item => item.id === template.id)!
        if (!fresh.draft && fresh.versions.length) { setStatus(`Version ${fresh.versions[fresh.versions.length - 1].version} saved`); setError(""); return }
        const problem = workflowTemplatePublishError(getState(), template.id)
        if (problem) { setError(problem); return }
        if (!tryDispatch({ type: "publishWorkflowTemplate", id: template.id })) { setError("Could not save version. Your draft is kept."); return }
        const entry = getWorkflowTemplates(getState()).find(item => item.id === template.id)!
        setDraft(draftOf(entry, getState())); setStatus(`Version ${entry.versions[entry.versions.length - 1].version} saved`); setError("")
      }}>Save version</button>
      <button type="button" className="btn small" onClick={() => {
        if (!save()) return
        const id = crypto.randomUUID()
        if (tryDispatch({ type: "duplicateWorkflowTemplate", sourceId: template.id, id, name: `${draft.name} copy` })) onDuplicate(id)
        else setError("Could not duplicate. Save your draft and try again.")
      }}>Duplicate workflow</button>
      <button type="button" className="btn small" disabled={!latest || state.org.defaultWorkflowTemplateId === template.id || (!state.org.defaultWorkflowTemplateId && template.id === STANDARD_WORKFLOW_TEMPLATE_ID)} onClick={() => {
        if (tryDispatch({ type: "setDefaultWorkflowTemplate", id: template.id })) { setStatus("Default workflow saved"); setError("") }
        else setError("Could not set the default.")
      }}>Use by default</button>
      {!!state.org.workflowTeams?.length && <button type="button" className="btn small" onClick={groupRoles}>Apply role teams</button>}
    </div>
    <p className="small muted">Edit here. Saved versions create independent tasks in Plan.</p>
    <p className="small" role="status">{persistenceFailed ? "Saving failed. Keep this page open and retry." : pending ? "Saving draft…" : status}</p>
    {error && <p role="alert">{error}</p>}
    <WorkflowBuilder state={state} steps={draft.steps} branches={draft.branches} stepTeams={draft.teamMap?.stepTeams ?? {}} teams={state.org.workflowTeams ?? []} policy={draft.kind} onChange={update} onAddTeam={addTeam} onRenameTeam={renameTeam} />
  </div>
}
