import { useCallback, useEffect, useRef, useState, type MutableRefObject, type ReactNode } from "react"
import { useStore } from "../../data/store"
import type { StepTemplate, WorkflowBranch, WorkflowTemplate, WorkflowTemplateDraft, WorkflowMilestoneGraph, DemoState } from "../../data/types"
import { getWorkflowTemplates, STANDARD_WORKFLOW_TEMPLATE_ID, workflowTemplatePublishError } from "../../data/workflowTemplates"
import { WorkflowBuilder } from "../workflowBuilder/WorkflowBuilder"
import { createWorkflowMilestoneGraph } from "../../engine/workflowMilestones"
import { presetWorkflowStepTeams } from "../../data/workflowTeamDefaults"
import { useRail } from "../rail/RailContext"
import { WorkflowTeams } from "./WorkflowTeams"
import { MenuButton } from "./MenuButton"
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

const templateName = (template: WorkflowTemplate) => template.draft?.name ?? template.versions[template.versions.length - 1]?.name ?? "Untitled workflow"

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
  const preset = templates.find(item => item.id === STANDARD_WORKFLOW_TEMPLATE_ID)
  const own = templates.filter(item => item.id !== STANDARD_WORKFLOW_TEMPLATE_ID)
  const defaultId = state.org.defaultWorkflowTemplateId ?? STANDARD_WORKFLOW_TEMPLATE_ID
  const latest = template?.versions[template.versions.length - 1]
  const create = () => {
    if (!flush.current()) return
    const id = crypto.randomUUID()
    if (!tryDispatch({ type: "newWorkflowTemplate", id, name: "Untitled workflow" })) { setError("Could not create. Try again."); return }
    setSelected(id); setError("")
  }
  const copyPreset = () => {
    if (!flush.current()) return
    const id = crypto.randomUUID()
    const name = `${preset ? templateName(preset) : "Speaker series"} copy`
    if (!tryDispatch({ type: "duplicateWorkflowTemplate", sourceId: STANDARD_WORKFLOW_TEMPLATE_ID, id, name })) { setError("Could not copy the preset. Try again."); return }
    setSelected(id); setError("")
  }
  const option = (item: WorkflowTemplate) => <option key={item.id} value={item.id}>{templateName(item)}{item.draft ? " · Draft" : ""}</option>
  return <section className="form-stack wfl-root" data-testid="workflow-settings">
    <header className="wfl-header">
      <h2>Workflow templates</h2>
      <label className="wfl-picker"><span className="sr-only">Saved workflow</span><select aria-label="Saved workflow" value={template?.id ?? ""} onChange={e => { if (flush.current()) { setSelected(e.target.value); setError("") } }}>
        {preset && <optgroup label="Platypus preset">{option(preset)}</optgroup>}
        {!!own.length && <optgroup label="Your organization">{own.map(option)}</optgroup>}
      </select></label>
      {template && <ul className="wfl-badges" aria-label="Template status">
        {template.id === STANDARD_WORKFLOW_TEMPLATE_ID && <li className="tag accent">Preset</li>}
        {template.id === defaultId && <li className="tag good">Default</li>}
        {template.draft && <li className="tag warn">Draft</li>}
        <li className="tag">{latest ? `Version ${latest.version}` : "Unpublished"}</li>
      </ul>}
      <div className="wfl-header-end"><MenuButton label="New workflow" items={[{ label: "Blank workflow", onSelect: create }, { label: "Copy of preset", onSelect: copyPreset, disabled: !preset }]} /></div>
    </header>
    {error && <p role="alert">{error}</p>}
    {template && <TemplateEditor key={template.id} template={template} flush={flush} onDuplicate={id => setSelected(id)} teamsOpen={teamsOpen} onTeams={() => setTeamsOpen(!teamsOpen)} teams={teamsOpen && <WorkflowTeams onClose={() => setTeamsOpen(false)} />} />}
  </section>
}

function TemplateEditor({ template, onDuplicate, flush, teamsOpen, onTeams, teams }: { template: WorkflowTemplate; onDuplicate: (id: string) => void; flush: MutableRefObject<() => boolean>; teamsOpen: boolean; onTeams: () => void; teams: ReactNode }) {
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
  const saveVersion = () => {
    if (!save()) return
    const fresh = getWorkflowTemplates(getState()).find(item => item.id === template.id)!
    if (!fresh.draft && fresh.versions.length) { setStatus(`Version ${fresh.versions[fresh.versions.length - 1].version} saved`); setError(""); return }
    const problem = workflowTemplatePublishError(getState(), template.id)
    if (problem) { setError(problem); return }
    if (!tryDispatch({ type: "publishWorkflowTemplate", id: template.id })) { setError("Could not save version. Your draft is kept."); return }
    const entry = getWorkflowTemplates(getState()).find(item => item.id === template.id)!
    setDraft(draftOf(entry, getState())); setStatus(`Version ${entry.versions[entry.versions.length - 1].version} saved`); setError("")
  }
  const duplicate = () => {
    if (!save()) return
    const id = crypto.randomUUID()
    if (tryDispatch({ type: "duplicateWorkflowTemplate", sourceId: template.id, id, name: `${draft.name} copy` })) onDuplicate(id)
    else setError("Could not duplicate. Save your draft and try again.")
  }
  const useByDefault = () => {
    if (tryDispatch({ type: "setDefaultWorkflowTemplate", id: template.id })) { setStatus("Default workflow saved"); setError("") }
    else setError("Could not set the default.")
  }
  const isDefault = state.org.defaultWorkflowTemplateId === template.id || (!state.org.defaultWorkflowTemplateId && template.id === STANDARD_WORKFLOW_TEMPLATE_ID)
  return <div className="form-stack wfl-editor" data-testid="workflow-template-editor">
    <div className="wfl-bar">
      <label className="wfl-name"><span className="sr-only">Workflow name</span><input value={draft.name} placeholder="Untitled workflow" maxLength={80} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label>
      <p className="small muted wfl-autosave" role="status">{persistenceFailed ? "Saving failed. Keep this page open and retry." : pending ? "Saving draft…" : status}</p>
      <div className="wfl-actions">
        <button type="button" className="btn small" onClick={() => save()}>Save draft</button>
        <button type="button" className="btn small btn-primary" onClick={saveVersion}>Save version</button>
        <MenuButton label="More" items={[
          { label: "Duplicate workflow", onSelect: duplicate },
          { label: "Use by default", onSelect: useByDefault, disabled: !latest || isDefault, hint: !latest ? "Save a version first." : isDefault ? "Already the default." : undefined },
          ...(state.org.workflowTeams?.length ? [{ label: "Apply role teams", onSelect: groupRoles }] : []),
          { label: teamsOpen ? "Hide teams" : "Teams", onSelect: onTeams },
        ]} />
      </div>
    </div>
    {teams}
    {error && <p role="alert">{error}</p>}
    <WorkflowBuilder state={state} steps={draft.steps} branches={draft.branches} stepTeams={draft.teamMap?.stepTeams ?? {}} teams={state.org.workflowTeams ?? []} policy={draft.kind} graph={draft.milestoneGraph} onChange={update} />
  </div>
}
