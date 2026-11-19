import type { DemoState, Event, Node, Role, WorkflowTemplate, WorkflowTemplateContent, WorkflowTemplateDraft, WorkflowTemplateVersion } from "./types"
import { canLead } from "./permissions"
import { EVENT_STEPS, buildEventNodes, orgSteps } from "../engine/playbooks"
import { MAX_STEPS, PHASE_LIST, checkWorkflow, withOwners } from "../engine/workflow"
import { DEFAULT_WORKFLOW_BRANCHES, branchOf, isWorkflowCondition, resolveBranches, scopeKey, validateBranchDefinitions } from "../engine/workflowBranches"
import { isAsuStep } from "../engine/workflowPolicy"
import { presetWorkflowStepTeams } from "./workflowTeamDefaults"
import { RULES } from "./rules"

/** This built-in identity is scoped by Org.id; user-created templates use generated IDs. */
export const STANDARD_WORKFLOW_TEMPLATE_ID = "standard-event"
export const MAX_WORKFLOW_TEMPLATES = 100

const copy = <T,>(value: T): T => structuredClone(value)
const text = (value: unknown, max: number, empty = false): value is string => typeof value === "string" && (empty || !!value.trim()) && value.length <= max
const contentOf = (value: WorkflowTemplateContent): WorkflowTemplateContent => copy({ name: value.name, ...(value.description !== undefined ? { description: value.description } : {}), kind: value.kind, steps: value.steps, ...(value.branches ? { branches: value.branches } : {}), ...(value.teamMap ? { teamMap: value.teamMap } : {}) })
const latestVersion = (template: WorkflowTemplate) => template.versions[template.versions.length - 1]
const knownRuleIds = new Set([...RULES.map(rule => rule.id), ...EVENT_STEPS.flatMap(step => step.ruleIds ?? [])])

/** Read compatibility only: opening Settings must not mutate data or recreate existing event tasks. */
export function getWorkflowTemplates(s: DemoState): WorkflowTemplate[] {
  const templates = s.org.workflowTemplates ?? []
  if (templates.some(template => template.id === STANDARD_WORKFLOW_TEMPLATE_ID)) return copy(templates)
  const steps = withOwners(copy(orgSteps(s)), s.roles)
  const stepTeams = presetWorkflowStepTeams(s, steps)
  const standard: WorkflowTemplate = {
    id: STANDARD_WORKFLOW_TEMPLATE_ID,
    updatedOn: s.org.eventWorkflow?.updatedOn ?? s.today,
    versions: [{ version: 1, savedOn: s.org.eventWorkflow?.updatedOn ?? s.today, name: "Speaker series", description: s.org.eventWorkflow?.summary ?? "Standard organization event workflow.", kind: "standard", steps, ...(steps.length && steps.every(step => !!stepTeams[step.key]) ? { teamMap: { version: 1, workflowId: STANDARD_WORKFLOW_TEMPLATE_ID, stepTeams } } : {}), ...(s.org.eventWorkflow?.branches ? { branches: copy(s.org.eventWorkflow.branches) } : {}) }],
  }
  return [standard, ...copy(templates)]
}

export function getWorkflowTemplate(s: DemoState, id: string): WorkflowTemplate | undefined {
  return getWorkflowTemplates(s).find(template => template.id === id)
}

export function publishedWorkflowTemplates(s: DemoState): { id: string; name: string; version: number }[] {
  return getWorkflowTemplates(s).flatMap(template => {
    const version = latestVersion(template)
    return version ? [{ id: template.id, name: version.name, version: version.version }] : []
  })
}

export function findWorkflowTemplateVersion(s: DemoState, id: string, version?: number): WorkflowTemplateVersion | undefined {
  const template = getWorkflowTemplate(s, id)
  return template ? version === undefined ? latestVersion(template) : template.versions.find(item => item.version === version) : undefined
}

/** New UUID keys stay unchanged when task names, owners, time or canvas positions change. */
export const newWorkflowStepId = (): string => crypto.randomUUID()
export const newWorkflowTemplateId = (): string => crypto.randomUUID()

/** Structural checks shared by both editor views; empty drafts are allowed, empty published templates are not. */
export function workflowTemplateDraftError(draft: WorkflowTemplateContent, roles: Role[], publishing = false): string | null {
  if (!draft || !text(draft.name, 100, !publishing) || (draft.description !== undefined && !text(draft.description, 1000, true))) return "Give the workflow a name of up to 100 characters."
  if (!["standard", "custom"].includes(draft.kind) || !Array.isArray(draft.steps) || draft.steps.length > MAX_STEPS || (publishing && !draft.steps.length)) return `A saved workflow needs 1 to ${MAX_STEPS} tasks.`
  const keys = new Set<string>()
  for (const step of draft.steps) {
    if (!step || !text(step.key, 40) || !/^[a-zA-Z0-9_-]+$/.test(step.key) || keys.has(step.key)) return "Every task needs a different stable ID."
    keys.add(step.key)
    if (!text(step.title, 120, !publishing) || !text(step.why, 400, true) || !text(step.source, 400, true) || !PHASE_LIST.includes(step.phase) || !["president", "vice_president", "finance", "programs", "marketing", "outreach", "secretary", "membership", "advisor"].includes(step.fn) || !Number.isInteger(step.estDays) || step.estDays < 0 || step.estDays > 30 || !["light", "medium", "heavy"].includes(step.tier)) return "Use a task name and 0 to 30 whole workdays."
    if (step.ownerRoleId && !roles.some(role => role.id === step.ownerRoleId && role.fn !== "advisor")) return `Choose an existing owner role for “${step.title || "this task"}”.`
    if (step.cond !== undefined && !isWorkflowCondition(step.cond)) return "Choose an existing situation for each conditional task."
    if (step.stepKind !== undefined && !["core", "situation"].includes(step.stepKind)) return "Choose a valid task type."
    if (step.startPolicy !== undefined && !["effort", "window"].includes(step.startPolicy)) return "Choose a valid task start policy."
    if (step.dependsOn !== undefined && (!Array.isArray(step.dependsOn) || step.dependsOn.some(id => typeof id !== "string"))) return "Select existing predecessor tasks."
    if (step.anchor && (step.anchor.kind !== "target" && step.anchor.kind !== "rule")) return "Template dates must be relative to the activity date."
    if (step.anchor && (!Number.isInteger(step.anchor.days) || Math.abs(step.anchor.days) > 365 || !["calendar", "business"].includes(step.anchor.unit))) return "Keep relative timing within one year."
    if (step.ruleIds !== undefined && (!Array.isArray(step.ruleIds) || step.ruleIds.some(id => !knownRuleIds.has(id)))) return "Use existing school rules."
    if (step.anchor?.kind === "rule" && !EVENT_STEPS.some(standard => JSON.stringify(standard.anchor) === JSON.stringify(step.anchor))) return "School deadlines come from the rule engine."
    if (step.timing && (!Number.isInteger(step.timing.startDays) || !Number.isInteger(step.timing.dueDays) || Math.abs(step.timing.startDays) > 365 || Math.abs(step.timing.dueDays) > 365 || step.timing.startDays < step.timing.dueDays || (step.timing.unit !== undefined && !["calendar", "business"].includes(step.timing.unit)))) return "The task window must start before its deadline."
  }
  const branchError = validateBranchDefinitions(draft.branches)
  if (branchError) return branchError
  const branchIds = new Set(["main", "legacy-before", "legacy-after", ...DEFAULT_WORKFLOW_BRANCHES.map(branch => branch.id), ...(draft.branches ?? []).map(branch => branch.id)])
  const definitions = resolveBranches(draft.steps, draft.branches)
  for (const branch of draft.branches ?? []) if (branch.defaultRoleId && !roles.some(role => role.id === branch.defaultRoleId)) return "Choose an existing default role for each branch."
  for (const step of draft.steps) {
    if (step.placement && (!branchIds.has(step.placement.branchId) || !Number.isFinite(step.placement.order))) return "Choose an existing workflow branch and position."
    const branch = branchOf(step, definitions)
    if (branch && (step.phase === "close") !== (branch.side === "after_event")) return "Keep a task and its branch on the same side of the activity date."
  }
  const byId = new Map(draft.steps.map(step => [step.key, step]))
  const complete = new Set<string>(), active = new Set<string>()
  const visit = (key: string): boolean => {
    if (active.has(key)) return false
    if (complete.has(key)) return true
    active.add(key)
    for (const dependency of byId.get(key)?.dependsOn ?? []) if (!keys.has(dependency) || !visit(dependency)) return false
    active.delete(key)
    complete.add(key)
    return true
  }
  if (draft.steps.some(step => !visit(step.key))) return "Dependencies need existing tasks and must not form a loop."
  if (draft.teamMap && (draft.teamMap.version !== 1 || !text(draft.teamMap.workflowId, 100) || !draft.teamMap.stepTeams || typeof draft.teamMap.stepTeams !== "object" || Array.isArray(draft.teamMap.stepTeams) || Object.entries(draft.teamMap.stepTeams).some(([key, team]) => !keys.has(key) || !text(team, 100)))) return "Assign teams only to tasks in this workflow."
  if (draft.kind === "standard") return checkWorkflow(draft.steps, roles, undefined, draft.branches).find(issue => issue.level === "blocked")?.text ?? null
  // Custom templates are independent workflows. They do not inherit the standard event's 31 lifecycle tasks.
  return null
}

function retainedRuleError(before: WorkflowTemplateContent | undefined, after: WorkflowTemplateContent): string | null {
  const byKey = new Map(after.steps.map(step => [step.key, step]))
  const beforeBranches = before ? resolveBranches(before.steps, before.branches) : []
  const afterBranches = resolveBranches(after.steps, after.branches)
  const ancestors = (key: string, seen = new Set<string>()): Set<string> => {
    if (seen.has(key)) return seen
    seen.add(key)
    for (const parent of byKey.get(key)?.dependsOn ?? []) ancestors(parent, seen)
    return seen
  }
  for (const step of before?.steps.filter(isAsuStep) ?? []) {
    const next = after.steps.find(candidate => candidate.key === step.key)
    if (!next || JSON.stringify(next.anchor ?? null) !== JSON.stringify(step.anchor ?? null) || JSON.stringify(next.ruleIds ?? []) !== JSON.stringify(step.ruleIds ?? []) || next.cond !== step.cond || scopeKey(next, afterBranches) !== scopeKey(step, beforeBranches)) return "Keep school-required tasks, their conditions and their official deadlines."
    if ((step.dependsOn ?? []).some(id => !ancestors(next.key).has(id))) return "Keep the predecessors required by a school task."
  }
  return null
}

function replaceTemplate(s: DemoState, template: WorkflowTemplate): DemoState {
  return { ...s, org: { ...s.org, workflowTemplates: getWorkflowTemplates(s).map(old => old.id === template.id ? copy(template) : old) } }
}

export function newWorkflowTemplate(s: DemoState, id: string, name = "Untitled workflow"): DemoState {
  if (!canLead(s) || !text(id, 100) || !text(name, 100) || getWorkflowTemplate(s, id) || getWorkflowTemplates(s).length >= MAX_WORKFLOW_TEMPLATES) return s
  const template: WorkflowTemplate = { id, versions: [], draft: { name: name.trim(), kind: "custom", steps: [], baseVersion: 0, teamMap: { version: 1, workflowId: id, stepTeams: {} } }, updatedOn: s.today }
  return { ...s, org: { ...s.org, workflowTemplates: [...getWorkflowTemplates(s), template] } }
}

export function saveWorkflowTemplateDraft(s: DemoState, id: string, draft: WorkflowTemplateDraft): DemoState {
  if (!canLead(s)) return s
  const template = getWorkflowTemplate(s, id)
  if (!template || draft.baseVersion !== (latestVersion(template)?.version ?? 0) || workflowTemplateDraftError(draft, s.roles) || draft.kind !== (template.draft?.kind ?? latestVersion(template)?.kind) || (draft.teamMap && draft.teamMap.workflowId !== id)) return s
  // Draft-only inserts must remain undoable; required ancestry comes from the
  // immutable saved definition, never from the immediately preceding edit.
  if (retainedRuleError(latestVersion(template), draft)) return s
  if (JSON.stringify(template.draft) === JSON.stringify(draft)) return s
  return replaceTemplate(s, { ...template, draft: copy(draft), updatedOn: s.today })
}

export function workflowTemplatePublishError(s: DemoState, id: string): string | null {
  if (!canLead(s)) return "Only the president or vice president can save workflow templates."
  const template = getWorkflowTemplate(s, id)
  if (!template) return "This workflow no longer exists."
  const draft = template.draft
  if (!draft) return latestVersion(template) ? null : "Add a task before saving this workflow."
  if (draft.baseVersion !== (latestVersion(template)?.version ?? 0)) return "This workflow has a newer saved version. Reopen it before saving."
  const problem = workflowTemplateDraftError(draft, s.roles, true) ?? retainedRuleError(latestVersion(template), draft)
  if (problem) return problem
  const teams = new Set((s.org.workflowTeams ?? []).map(team => team.id))
  if (draft.steps.some(step => !teams.has(draft.teamMap?.stepTeams[step.key] ?? ""))) return "Choose an organization team for every task before saving."
  return null
}

export function publishWorkflowTemplate(s: DemoState, id: string): DemoState {
  if (workflowTemplatePublishError(s, id)) return s
  const template = getWorkflowTemplate(s, id)!
  if (!template.draft) return s
  const content = contentOf(template.draft), latest = latestVersion(template)
  const { draft: _draft, ...rest } = template
  // A repeated Save is idempotent: do not manufacture a new version for unchanged definitions.
  const versions = latest && JSON.stringify(contentOf(latest)) === JSON.stringify(content) ? template.versions : [...template.versions, { ...content, version: (latest?.version ?? 0) + 1, savedOn: s.today }]
  const saved = replaceTemplate(s, { ...rest, versions, updatedOn: s.today })
  if (id !== STANDARD_WORKFLOW_TEMPLATE_ID) return saved
  // The classic onboarding and older integrations still read the standard singleton.
  // Synchronize that definition only; custom templates never replace it or touch existing executions.
  return { ...saved, org: { ...saved.org, eventWorkflow: { ...saved.org.eventWorkflow, steps: copy(content.steps), ...(content.branches ? { branches: copy(content.branches) } : { branches: undefined }), updatedOn: s.today, summary: content.description ?? saved.org.eventWorkflow?.summary } } }
}

export function duplicateWorkflowTemplate(s: DemoState, sourceId: string, id: string, name: string, keyFactory: () => string = newWorkflowStepId): DemoState {
  if (!canLead(s) || !text(id, 100) || !text(name, 100) || getWorkflowTemplate(s, id) || getWorkflowTemplates(s).length >= MAX_WORKFLOW_TEMPLATES) return s
  const source = getWorkflowTemplate(s, sourceId)
  const original = source?.draft ?? (source ? latestVersion(source) : undefined)
  if (!source || !original) return s
  // Standard keys carry school/purchasing semantics. Their identity is (templateId,key); keep that meaning.
  const keys = new Map(original.steps.map(step => [step.key, original.kind === "standard" ? step.key : keyFactory()]))
  const steps = original.steps.map(step => ({ ...copy(step), key: keys.get(step.key)!, dependsOn: (step.dependsOn ?? []).map(key => keys.get(key)!).filter(Boolean) }))
  const stepTeams = Object.fromEntries(Object.entries(original.teamMap?.stepTeams ?? {}).flatMap(([key, team]) => keys.has(key) ? [[keys.get(key)!, team]] : []))
  const draft: WorkflowTemplateDraft = { ...contentOf(original), name: name.trim(), steps, baseVersion: 0, teamMap: { version: 1, workflowId: id, stepTeams } }
  if (workflowTemplateDraftError(draft, s.roles)) return s
  const template: WorkflowTemplate = { id, versions: [], draft, updatedOn: s.today, copiedFrom: { templateId: sourceId, templateVersion: latestVersion(source)?.version ?? 0 } }
  return { ...s, org: { ...s.org, workflowTemplates: [...getWorkflowTemplates(s), template] } }
}

export function setDefaultWorkflowTemplate(s: DemoState, id: string): DemoState {
  if (!canLead(s) || !findWorkflowTemplateVersion(s, id) || s.org.defaultWorkflowTemplateId === id) return s
  return { ...s, org: { ...s.org, defaultWorkflowTemplateId: id } }
}

export interface WorkflowTemplateSelection { templateId: string; templateVersion?: number; runId?: string }
export interface WorkflowInstantiation { event: Event; nodes: Node[]; error?: string }

function executionTeamSnapshot(s: DemoState, version: WorkflowTemplateVersion) {
  const teams = copy(s.org.workflowTeams ?? [])
  const teamIds = new Set(teams.map(team => team.id))
  const stepTeams = version.kind === "standard" ? presetWorkflowStepTeams(s, version.steps, version.teamMap?.stepTeams) : { ...version.teamMap?.stepTeams }
  // Only explicit organization metadata supplies grouping. No role-name/function guessing.
  for (const step of version.steps) if (!stepTeams[step.key] && step.ownerRoleId) {
    const team = s.org.workflowRoleTeams?.[step.ownerRoleId]
    if (team && teamIds.has(team)) stepTeams[step.key] = team
  }
  return { teams, teamIds, stepTeams }
}

/** Approval and execution share the same fresh-state checks, including teams changed since publication. */
export function workflowTemplateRunError(s: DemoState, version: WorkflowTemplateVersion): string | null {
  const problem = workflowTemplateDraftError(version, s.roles, true)
  if (problem) return problem
  const { teamIds, stepTeams } = executionTeamSnapshot(s, version)
  if ((version.kind === "custom" || version.teamMap) && version.steps.some(step => !teamIds.has(stepTeams[step.key]))) return "An organization team used by this workflow is missing. Update and save the workflow before creating an activity."
  return null
}

/** A single batch projection. No date arithmetic, no AI, and never another execution's progress or work. */
export function instantiateWorkflowTemplate(s: DemoState, event: Event, selection: WorkflowTemplateSelection): WorkflowInstantiation {
  const fail = (error: string): WorkflowInstantiation => ({ event, nodes: [], error })
  const existing = s.events.find(candidate => candidate.id === event.id)
  const runId = selection.runId ?? event.id
  if (!text(runId, 180)) return fail("Choose a valid workflow execution ID.")
  if (existing) {
    const run = existing.workflowRun
    if (run?.id === runId && run.templateId === selection.templateId && (selection.templateVersion === undefined || run.templateVersion === selection.templateVersion)) return { event: existing, nodes: [] }
    return fail("This activity already exists. Its tasks were not replaced.")
  }
  if (s.events.some(candidate => candidate.workflowRun?.id === runId)) return fail("This workflow execution already belongs to another activity.")
  const version = findWorkflowTemplateVersion(s, selection.templateId, selection.templateVersion)
  if (!version) return fail("That saved workflow version is no longer available. Choose a saved workflow.")
  const problem = workflowTemplateRunError(s, version)
  if (problem) return fail(problem)
  const { teams, teamIds, stepTeams } = executionTeamSnapshot(s, version)
  const snapshot = { ...copy(version), teams, teamMap: { version: 1 as const, workflowId: selection.templateId, stepTeams } }
  const withRun: Event = { ...event, ...(snapshot.branches ? { workflowBranches: copy(snapshot.branches) } : {}), workflowRun: { id: runId, templateId: selection.templateId, templateVersion: version.version, templateName: version.name, snapshot } }
  const generated = buildEventNodes(withRun, s.roles, { steps: snapshot.steps, branches: snapshot.branches, mode: snapshot.kind, explicitOwnersOnly: true })
  const ids = new Map(generated.map(node => [node.id, `${runId}:${node.stepKey}`]))
  const nodes = generated.map(node => ({ ...node, id: ids.get(node.id)!, dependsOn: node.dependsOn.map(id => ids.get(id)!).filter(Boolean), workflowSource: { runId, templateId: selection.templateId, templateVersion: version.version, templateStepId: node.stepKey! }, ...(stepTeams[node.stepKey!] && teamIds.has(stepTeams[node.stepKey!]) ? { teamId: stepTeams[node.stepKey!] } : {}), assignedOn: s.today, ownerVersion: 0, acceptedOn: node.ownerId ? s.today : null }))
  if (nodes.some(node => s.nodes.some(old => old.id === node.id))) return fail("A task with this execution ID already exists. No tasks were added.")
  return { event: withRun, nodes }
}
