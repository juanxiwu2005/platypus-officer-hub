import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react"
import { useStore } from "../../data/store"
import type { StepTemplate, WorkflowBranch, WorkflowTemplate, WorkflowTemplateDraft, WorkflowMilestoneGraph, DemoState } from "../../data/types"
import { getWorkflowTemplates, STANDARD_WORKFLOW_TEMPLATE_ID, workflowTemplatePublishError } from "../../data/workflowTemplates"
import { WorkflowBuilder } from "../workflowBuilder/WorkflowBuilder"
import { createWorkflowMilestoneGraph } from "../../engine/workflowMilestones"
import { presetWorkflowStepTeams } from "../../data/workflowTeamDefaults"
import { useRail } from "../rail/RailContext"
import { WorkflowTeams } from "./WorkflowTeams"
import "./workflowLibrary.css"

const rawDraftOf = (template: WorkflowTemplate): WorkflowTemplateDraft => {
  if (template.draft) return structuredClone(template.draft)
  const version = template.versions[template.versions.length - 1]
  return { name: version.name, description: version.description, kind: version.kind, teamExecution: version.teamExecution, steps: structuredClone(version.steps), branches: structuredClone(version.branches), teamMap: structuredClone(version.teamMap), milestoneGraph: structuredClone(version.milestoneGraph), baseVersion: version.version }
}

const draftOf = (template: WorkflowTemplate, state: DemoState): WorkflowTemplateDraft => {
  const draft = rawDraftOf(template)
  const stepTeams = draft.kind === "standard" ? presetWorkflowStepTeams(state, draft.steps, draft.teamMap?.stepTeams) : draft.teamMap?.stepTeams ?? {}
  return { ...draft, teamExecution: "dependencies", steps: draft.steps, milestoneGraph: draft.milestoneGraph ?? createWorkflowMilestoneGraph(draft.steps, stepTeams), teamMap: { version: 1, workflowId: template.id, stepTeams } }
}

export default function WorkflowLibrary() {
  const { state, tryDispatch } = useStore()
  const templates = getWorkflowTemplates(state)
  const rail = useRail()
  // Authoring starts with the dot canvas in focus. Selecting a task still opens
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
  return <section className="form-stack wfl-root" data-testid="workflow-settings">
    <header className="action-row wfl-header"><h2>Workflow templates</h2><label><span className="sr-only">Saved workflow</span><select aria-label="Saved workflow" value={template?.id ?? ""} onChange={e => { if (flush.current()) { setSelected(e.target.value); setError("") } }}>{templates.map(item => <option key={item.id} value={item.id}>{item.draft?.name ?? item.versions[item.versions.length - 1]?.name ?? "Untitled workflow"}{item.draft ? " · Draft" : ""}</option>)}</select></label><button type="button" className="btn" onClick={create}>New workflow</button><button type="button" className="btn small" onClick={() => setTeamsOpen(!teamsOpen)}>Teams</button></header>
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
  const update = useCallback((steps: StepTemplate[], branches?: WorkflowBranch[], stepTeams = draft.teamMap?.stepTeams ?? {}, milestoneGraph?: WorkflowMilestoneGraph) => {
    setDraft({ ...draft, teamExecution: "dependencies", steps, branches, milestoneGraph, teamMap: { version: 1, workflowId: template.id, stepTeams } })
  }, [draft, template.id])
  const groupRoles = () => {
    const mappings = { ...draft.teamMap?.stepTeams }
    const legal = new Set((state.org.workflowTeams ?? []).map(team => team.id))
    const roleTeam = (step: StepTemplate) => step.ownerRoleId ? state.org.workflowRoleTeams?.[step.ownerRoleId] : undefined
    const graph = draft.milestoneGraph
    const teamBranches = graph?.teamBranches.map(branch => {
      const candidates = new Set(branch.stepIds.map(key => draft.steps.find(step => step.key === key)).filter((step): step is StepTemplate => !!step).map(roleTeam).filter((id): id is string => !!id && legal.has(id)))
      const teamId = legal.has(branch.teamId) ? branch.teamId : candidates.size === 1 ? [...candidates][0] : branch.teamId
      for (const key of branch.stepIds) { if (teamId) mappings[key] = teamId; else delete mappings[key] }
      return { ...branch, teamId }
    })
    const routed = new Set(teamBranches?.flatMap(branch => branch.stepIds) ?? [])
    for (const step of draft.steps) { const id = roleTeam(step); if (!routed.has(step.key) && !legal.has(mappings[step.key]) && id && legal.has(id)) mappings[step.key] = id }
    setDraft({ ...draft, ...(graph ? { milestoneGraph: { ...graph, teamBranches: teamBranches! } } : {}), teamMap: { version: 1, workflowId: template.id, stepTeams: mappings } })
    setStatus("Role teams applied where one team owns the branch. Choose any remaining branch teams in Flow.")
  }
  const latest = template.versions[template.versions.length - 1]
  return <div className="form-stack wfl-editor" data-testid="workflow-template-editor">
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
    <p className="small" role="status">{persistenceFailed ? "Saving failed. Keep this page open and retry." : pending ? "Saving draft…" : status}</p>
    {error && <p role="alert">{error}</p>}
    <WorkflowBuilder state={state} steps={draft.steps} branches={draft.branches} stepTeams={draft.teamMap?.stepTeams ?? {}} teams={state.org.workflowTeams ?? []} policy={draft.kind} graph={draft.milestoneGraph} onChange={update} />
  </div>
}
