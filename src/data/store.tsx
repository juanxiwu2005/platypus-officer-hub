import { changeHandoff, repairLegacyHandoff, type HandoffAction } from "./handoff"
import { changePlaybook, playbookOf, type PlaybookAction } from "./playbook"
import { changeCheers, withSanitizedCheers, type CheerAction } from "./cheers"
import { validDate } from "../lib/commands"
import type { ApplicationPackage } from "../lib/preflight"
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import type { BudgetLineItem, ChangeSet, DemoState, Event, LogEntry, Node, OnboardingChecklist, Phase, StepTemplate, WorkflowBranch, WorkflowTemplateDraft, WorkflowTeam } from "./types"
import { countItems, sameChecklist, sanitizeChecklist } from "../lib/checklist"
import { commandContext, isSmallOp, sanitizeOps } from "../lib/commands"
import { assignedNotice, canApplyOp, canChangeEvent, canLead, createTasks, newObjects, validateReview, type HumanInputs, type NewTask } from "./changeReview"
import { nudgeBlocked } from "../lib/nudges"
import type { Channel, NudgeVia } from "./types"
import { SCHEMA_VERSION, seedDemo } from "./seed"
import { clearLocalDocs } from "../lib/localDocs"
import { applySchedule, computeSchedule, topoOrder, type Schedule } from "../engine/schedule"
import { buildEventNodes, CORE_EVENT_STEP_KEYS, EVENT_STEPS, orgSteps } from "../engine/playbooks"
import { newWorkflowTemplate, saveWorkflowTemplateDraft, publishWorkflowTemplate, duplicateWorkflowTemplate, setDefaultWorkflowTemplate, discardWorkflowTemplateDraft, restoreWorkflowPreset } from "./workflowTemplates"
import { ensureWorkflowPresetTeams } from "./workflowTeamDefaults"
import { saveWorkflowTeams } from "./workflowTeamSettings"
import { nextCounter } from "../lib/ids"
import { PHASES, ancestorsOf, cleanPatch, createsLoop, phaseOrderOf, type StepEdit } from "../lib/stepOrder"
import { cannotDelete, insertFlowBranch, insertFlowStep, moveBetween, newStepNode, removalEdits, type FlowInsertionTarget } from "../lib/flowEdit"
import { DEFAULT_WORKFLOW_BRANCHES, branchConditions, conditionsOf, placementOf, resolveBranches, scopeKey, validateBranchDefinitions } from "../engine/workflowBranches"
import { isAsuStep, isCoreStep } from "../engine/workflowPolicy"
import { parseEffortDays } from "../lib/workflowEffort"
import { advanceClock } from "../engine/followup"
import { addNotices, claimTask, closeSilence, replyToTask, reviewExtension, type ReplyInput, type TaskReply } from "./taskWorkflow"
import { usableGrant } from "../lib/officerLinks"
import type { OfficerGrant } from "./types"
import { startWorkspace, resetWorkflow, saveClubSettings, saveProfile, saveWorkflow, type ClubDraft, type ProfilePatch } from "./settings"
import type { NodeStatus, OrgSettings, ReminderMode } from "./types"
import { canMoveTask, moveTask } from "./board"
import { addContact, addOrganization, deleteContact, deleteOrganization, logInteraction, updateContact, updateInteraction, updateOrganization, type ContactInput, type ContactPatch, type InteractionInput, type OrgPatch } from "./crm"
import { syncBudgetFlow } from "../engine/eventBudget"
import { attemptLastAt, firstEventChoice, loadOnboardingRecord, rearm, reminderModeChoice, type OnboardingAttempt, type OnboardingRecord } from "../lib/onboardingRecord"
import { azTime, currentSession, keeper, loadBook, onSessionStart, SITTING_MS, type Book, type Keep, type StudySession } from "../lib/studySession"
import { FLOW_VERSION } from "../onboarding/record"
import { onUi, type UiEvent } from "../lib/uiLog"
import { buildTimeline } from "../lib/timeline"
import { BUILD_INFO } from "../lib/buildInfo"
import { normalizeTerms } from "./roleTerms"
import { withActivity } from "./activity"
import { withActivityBackfill } from "./activityBackfill"
import { isOfficer } from "./permissions"
import { changeRole, type RoleChange } from "./roleChanges"
import { advancePlannedClock, afterReminderAction, confirmLegacyPlannedReminder, confirmPlannedReminder, enableReminderPlan, remindersEnabled, upgradeReminderPlan, reviewLegacyReminder } from "../reminders/adapter"
import { recordReminderBatch } from "../reminders/batch"
import type { ReminderBatch } from "../reminders/deliveryContracts"
import { applyReminderDigests, withoutEditedText, type ReminderDigestBatch } from "../reminders/digest"
import { useAutomaticReminders } from "../reminders/useAutomaticReminders"
import type { ReminderMailSnapshot, TaskAccessGrant, TaskAccessUpdate } from "../reminders/accessContracts"
import { taskAccessIssueValid, usableTaskAccessGrant } from "../reminders/taskAccess"
import { applyTaskAccessUpdate } from "../reminders/taskAccessActions"
import { validatedReminderMessage } from "../reminders/message"
import { saveTaskWork, taskDefinitionKey, validTaskLinks } from "../taskDetails/data"
import { taskWorkActor } from "../taskDetails/authorization"
import type { TaskAuthorization, TaskWorkInput } from "../taskDetails/contracts"
import { updateTaskTarget, type TaskTargetInput } from "../taskDetails/targetDates"

/**
 * Demo store (v1.0): all data lives in this browser only (plan §11, decision 3).
 * Each Phase 3 participant gets their own copy; "Reset demo" restores the seed.
 * Storage can be unavailable (private windows, blocked site data), so every access is guarded
 * and the app still works from memory.
 */
export const STORAGE_KEY = "platypus.v1.demo"

/** Repair only relationships that the stored identifiers prove. Older snapshots could
 * lose eventId while retaining a template node id such as `e-night:quotes`. */
function repairTaskLinks(state: DemoState): DemoState {
  const eventIds = new Set(state.events.map(event => event.id))
  let changed = false
  const nodes = state.nodes.map(node => {
    const candidate = !node.eventId && node.stepKey && typeof node.id === "string" ? node.id.split(":")[0] : null
    const eventId = candidate && eventIds.has(candidate) ? candidate : node.eventId
    const waitingOnPersonId = !node.waitingOnPersonId && node.status === "waiting" && node.waitingOn ? state.people.find(person => person.name === node.waitingOn)?.id ?? null : node.waitingOnPersonId
    if (eventId !== node.eventId || waitingOnPersonId !== node.waitingOnPersonId) { changed = true; return { ...node, eventId, waitingOnPersonId } }
    return node
  })
  return changed ? applySchedule({ ...state, nodes }) : state
}

/** Saved v2 events keep their existing history, then receive only the missing
 * invariant template steps. This repairs a previously condition-hidden core link. */
function repairCoreEventSteps(state: DemoState): DemoState {
  const additions = state.events.flatMap(event => {
    if (event.checks === undefined || event.workflowRun) return []
    const existing = new Set(state.nodes.filter(node => node.eventId === event.id).map(node => node.stepKey))
    return buildEventNodes(event, state.roles, { steps: orgSteps(state) })
      .filter(node => CORE_EVENT_STEP_KEYS.includes(node.stepKey as typeof CORE_EVENT_STEP_KEYS[number]) && !existing.has(node.stepKey))
      .map(node => ({ ...node, assignedOn: state.today, ownerVersion: 0 }))
  })
  // Check-in materials must be ready before the event, not on event day. This corrects
  // every saved v2 core node as well as the standard template used for future events.
  const checkinAnchor = { kind: "target" as const, days: 1, unit: "business" as const, label: "Check-in materials ready" }
  let repairedCheckin = false
  const nodes = state.nodes.map(node => {
    if (!node.eventId || node.stepKey !== "checkin" || state.events.find(event => event.id === node.eventId)?.workflowRun) return node
    if (node.anchor?.kind === "target" && node.anchor.days === 1 && node.anchor.unit === "business" && node.anchor.label === checkinAnchor.label) return node
    repairedCheckin = true
    return { ...node, anchor: checkinAnchor }
  })
  return additions.length || repairedCheckin ? applySchedule({ ...state, nodes: [...nodes, ...additions] }) : state
}

/** Run once during older-version migrations, including snapshots that skipped v19. */
function completeDemoSpeakerPlan(state: DemoState): DemoState {
  if (state.org?.id !== "dfs" || !state.events.some(event => event.id === "e-speaker" && event.name === "Spring Speaker Night" && event.checks !== undefined)) return state
  let changed = false
  const nodes = state.nodes.map(node => {
    if (node.id !== "e-speaker:plan" || node.eventId !== "e-speaker" || node.stepKey !== "plan" || node.status === "done") return node
    changed = true
    return { ...node, status: "done" as const, completedOn: state.today, lastUpdate: state.today, acceptedOn: node.acceptedOn ?? state.today, waitingOn: null, waitingOnPersonId: null }
  })
  return changed ? applySchedule({ ...state, nodes }) : state
}

/** Fields a person may edit on a node. Dates are not here: only the club deadline override, which the engine then applies. */
export type NodePatch = Partial<Pick<Node, "externalLinks" | "title" | "instructions" | "completionCriteria" | "tags" | "ownerId" | "clubDeadlineOverride" | "estDays" | "startPolicy" | "approverRoleId" | "consultedRoleIds" | "informedRoleIds" | "why" | "draftLink" | "tier" | "dependsOn" | "phase">>
export type EventPatch = Partial<Pick<Event, "date" | "name" | "headcount" | "details">>

export type Action =
  | { type: "handoffAction"; action:HandoffAction }
  | { type: "cheerAction"; action: CheerAction }
  | { type: "roleChange"; change: RoleChange }
  | { type: "reportOutput"; outputId:string; text:string }
  | { type: "resolveReport"; id:string }
  | { type: "startFunding"; eventId:string }
  | { type: "advanceFunding"; eventId:string }
  | { type: "fundingAmount"; eventId:string; amount:number }
  | { type: "fundingSpend"; eventId:string; spent:number }
  | { type: "fundingSpendBy"; eventId:string; date:string }
  | { type: "fundingPackage"; eventId:string; application:ApplicationPackage }
  | { type: "budgetLineAdd"; eventId: string }
  | { type: "budgetLineUpdate"; eventId: string; id: string; patch: Partial<Omit<BudgetLineItem, "id">> }
  | { type: "budgetLineDelete"; eventId: string; id: string }
  | { type: "contacted"; id:string }
  | { type: "contactCadence"; id:string; days:number }
  | { type: "reset" }
  | { type: "moveTask"; nodeId: string; status: NodeStatus; beforeId?: string | null }
  | ({ type: "addContact" } & ContactInput)
  | { type: "updateContact"; id: string; patch: ContactPatch }
  | { type: "deleteContact"; id: string }
  | { type: "addOrganization"; name: string; orgType: string }
  | { type: "updateOrganization"; id: string; patch: OrgPatch }
  | { type: "deleteOrganization"; id: string }
  | { type: "logInteraction"; input: InteractionInput }
  | { type: "updateInteraction"; id: string; nextDone?: boolean; delete?: boolean }
  | { type: "setViewer"; viewerId: string }
  | { type: "setAi"; enabled: boolean }
  | { type: "replace"; state: DemoState }
  | { type: "updateNode"; id: string; patch: NodePatch; expectedTask?: string }
  | { type: "saveTaskWork"; nodeId: string; input: TaskWorkInput; authorization?: TaskAuthorization }
  | { type: "updateTaskTarget"; nodeId: string; input: TaskTargetInput; authorization?: TaskAuthorization }
  /** The step editor (M3): a few steps' dependsOn / estDays / phase, and the display order of the phase groups. Never a date. */
  | { type: "applyStepEdits"; eventId: string; edits: StepEdit[]; phaseOrder?: Phase[] }
  | { type: "addEventStep"; eventId: string; id: string; uId: string | null; vId: string | null; target?: FlowInsertionTarget }
  | { type: "addEventBranch"; eventId: string; id: string; branch: WorkflowBranch; title: string }
  | { type: "removeEventStep"; eventId: string; nodeId: string }
  | { type: "restoreEventNodes"; eventId: string; nodes: Node[]; branches?: WorkflowBranch[] }
  | { type: "updateEvent"; id: string; patch: EventPatch }
  | { type: "draftChanges"; changeSet: ChangeSet }
  | { type: "aiAutoApply"; changeSet: ChangeSet }
  | { type: "undoAuto"; id: string }
  | { type: "createTasks"; id: string; sentence: string; tasks: NewTask[]; date: string; buffered: boolean; source?: string }
  | { type: "reviewChange"; id: string; index: number; decision: "applied" | "rejected"; op?: unknown; human?: HumanInputs }
  | { type: "confirmNudgeSent"; nodeId: string; channel: Channel; text: string; via?: NudgeVia; message?: ReminderMailSnapshot }
  | { type: "enableReminderPlan" }
  | { type: "upgradeReminderPlan" }
  | { type: "reviewLegacyReminder"; nodeId: string }
  | ({ type: "recordReminderBatch" } & ReminderBatch)
  /** Person digests (one email per person per day); each group all-or-nothing. */
  | ({ type: "recordReminderDigests" } & ReminderDigestBatch)
  | { type: "confirmPlannedReminder"; candidateId: string; via: "manual" | "platypus"; message?: ReminderMailSnapshot }
  | { type: "issueTaskAccessGrant"; grant: TaskAccessGrant }
  | { type: "taskAccessAction"; token: string; update: TaskAccessUpdate }
  | { type: "claimTask"; nodeId: string }
  | { type: "replyTask"; nodeId: string; reply: TaskReply; input?: ReplyInput }
  | { type: "reviewExtension"; id: string; approve: boolean }
  | { type: "advanceClock"; days: number }
  | { type: "markNoticeRead"; id: string }
  | { type: "temporaryOwner"; entryId: string }
  | { type: "approveRecovery"; entryId: string }
  | { type: "issueOfficerGrant"; grant: OfficerGrant }
  | { type: "officerAction"; token: string; reply: TaskReply | "claim"; input?: ReplyInput }
  | { type: "saveClubSettings"; draft: ClubDraft; defaults: OrgSettings }
  | { type: "saveProfile"; personId: string; patch: ProfilePatch; invite?: string }
  | { type: "completeSetup"; draft: ClubDraft; event: unknown; date: string; inviteCode: string; taskDueDays?: number; clubBufferBusinessDays?: number; workflow?: StepTemplate[]; workflowBranches?: WorkflowBranch[]; reminderMode?: ReminderMode | null }
  | { type: "saveWorkflow"; steps: StepTemplate[]; branches?: WorkflowBranch[] }
  | { type: "resetWorkflow" }
  | { type: "newWorkflowTemplate"; id: string; name: string }
  | { type: "saveWorkflowTemplateDraft"; id: string; draft: WorkflowTemplateDraft }
  | { type: "publishWorkflowTemplate"; id: string }
  | { type: "duplicateWorkflowTemplate"; sourceId: string; id: string; name: string }
  | { type: "setDefaultWorkflowTemplate"; id: string }
  | { type: "discardWorkflowTemplateDraft"; id: string }
  | { type: "restoreWorkflowPreset"; id: string }
  | { type: "saveWorkflowTeams"; teams: WorkflowTeam[]; roleTeams: Record<string, string> }
  /** Settings → Onboarding: the whole checklist template, sanitized against the current roles. Null removes it (start over). */
  | { type: "saveOnboardingChecklist"; checklist: OnboardingChecklist | null }
  | { type: "playbookAction"; action: PlaybookAction }

const NODE_FIELDS: (keyof NodePatch)[] = ["externalLinks", "title", "instructions", "completionCriteria", "tags", "ownerId", "clubDeadlineOverride", "estDays", "startPolicy", "approverRoleId", "consultedRoleIds", "informedRoleIds", "why", "draftLink", "tier", "dependsOn", "phase"]
const pick = <T extends object, K extends keyof T>(o: T, keys: K[]) => Object.fromEntries(keys.filter(k => k in o).map(k => [k, o[k]])) as unknown as Partial<T>

/**
 * The step editor's one action. Only dependsOn, estDays and phase are read from each edit (a date in an edit is
 * ignored), a change that would make a step wait for itself is refused as a whole, and the rule engine re-dates
 * everything afterwards. Unlike updateNode it does not touch lastUpdate, which is a date.
 */
function applyStepEdits(state: DemoState, eventId: string, edits: StepEdit[], phaseOrder?: Phase[]): DemoState {
  const ev = state.events.find(e => e.id === eventId)
  if (!ev || !Array.isArray(edits)) return state
  const inEvent = state.nodes.filter(n => n.eventId === eventId)
  const ids = new Set(inEvent.map(n => n.id))
  const clean: StepEdit[] = edits.filter(e => e && ids.has(e.id)).map(e => ({ id: e.id, patch: cleanPatch(e.patch, ids, e.id) })).filter(e => Object.keys(e.patch).length > 0)
  if (createsLoop(inEvent, clean)) return state
  const by = new Map(clean.map(e => [e.id, e.patch]))
  const graphEdit = ev.checks !== undefined || clean.some(edit => edit.patch.placement !== undefined)
  const branches = resolveBranches(inEvent, ev.workflowBranches)
  let changed = false
  const nodes = state.nodes.map(n => {
    const p = by.get(n.id)
    if (!p) return n
    const next: Node = { ...n, ...(p.dependsOn ? { dependsOn: p.dependsOn } : {}), ...(p.estDays !== undefined ? { estDays: p.estDays, startPolicy: "effort" as const } : {}), ...(p.startPolicy ? { startPolicy: p.startPolicy } : {}), ...(p.phase ? { phase: p.phase } : {}), ...(p.placement ? { placement: p.placement } : {}), ...(p.stepKind !== undefined ? { stepKind: p.stepKind ?? undefined } : {}), ...(p.cond !== undefined ? { cond: p.cond ?? undefined } : {}) }
    if (JSON.stringify(next) !== JSON.stringify(n)) changed = true
    return next
  })
  if (nodes.some(n => {
    if (n.eventId !== eventId || !by.has(n.id) || !graphEdit) return false
    const branch = branches.find(b => b.id === n.placement?.branchId)
    const original = inEvent.find(item => item.id === n.id)!
    if (placementOf(original).branchId === "main" && placementOf(n).branchId !== "main") return true
    if (ev.checks !== undefined && isCoreStep(n) && conditionsOf(n, branches).length) return true
    if (isAsuStep(original) && scopeKey(original, branches) !== scopeKey(n, branches)) return true
    return !!n.placement && n.placement.branchId !== "main" && (!branch || (n.phase === "close") !== (branch.side === "after_event"))
  })) return state
  const candidateNodes = nodes.filter(n => n.eventId === eventId)
  for (const n of graphEdit ? candidateNodes : []) {
    if (!isAsuStep(n)) continue
    const required = EVENT_STEPS.find(step => step.key === n.stepKey)?.dependsOn ?? []
    const previous = ancestorsOf(inEvent, n.id), after = ancestorsOf(candidateNodes, n.id)
    // Historical events can use the old rule graph; refuse newly broken requirements,
    // without silently imposing today's template on an unrelated legacy edit.
    if (required.some(key => { const dependency = candidateNodes.find(node => node.stepKey === key); return dependency && previous.has(dependency.id) && !after.has(dependency.id) })) return state
  }
  const order = Array.isArray(phaseOrder) && phaseOrder.length === PHASES.length && PHASES.every(p => phaseOrder.includes(p)) ? phaseOrder : undefined
  const orderChanged = !!order && phaseOrderOf(ev).join() !== order.join()
  if (!changed && !orderChanged) return state
  const events = orderChanged ? state.events.map(e => (e.id === eventId ? { ...e, phaseOrder: order } : e)) : state.events
  return applySchedule({ ...state, nodes, events })
}

/**
 * Add a step in the event's flow chart, between two neighbours (either can be missing). It starts with one day of work and no owner; the details panel
 * is where it gets a name, an owner and the rest. Its place comes from the same "waits for" links as every other step, so the rule engine dates it.
 */
function addEventStep(state: DemoState, eventId: string, id: string, uId: string | null, vId: string | null, target?: FlowInsertionTarget): DemoState {
  const ev = state.events.find(e => e.id === eventId)
  const inEvent = state.nodes.filter(n => n.eventId === eventId)
  const ref = inEvent.find(n => n.id === (target?.referenceId ?? uId ?? vId))
  if (!ev || typeof id !== "string" || !id.startsWith(`${eventId}:`) || state.nodes.some(n => n.id === id) || inEvent.length >= 80) return state
  if ((uId && !inEvent.some(n => n.id === uId)) || (vId && !inEvent.some(n => n.id === vId))) return state
  const fresh = newStepNode(ev, id, ref, state.today, resolveBranches(inEvent, ev.workflowBranches))
  const withNode: DemoState = { ...state, nodes: [...state.nodes, fresh] }
  const r = target ? insertFlowStep(inEvent, fresh, target, resolveBranches(inEvent, ev.workflowBranches)) : moveBetween(withNode.nodes.filter(n => n.eventId === eventId), id, uId, vId)
  if (r.error) return state
  const next = applyStepEdits(withNode, eventId, r.edits)
  if (next === withNode && target) return state
  return applySchedule(next === withNode || next === state ? withNode : next)
}

function addEventBranch(state: DemoState, eventId: string, id: string, branch: WorkflowBranch, title: string): DemoState {
  const ev = state.events.find(e => e.id === eventId)
  const nodes = state.nodes.filter(n => n.eventId === eventId)
  if (!ev || typeof id !== "string" || !id.startsWith(`${eventId}:`) || state.nodes.some(n => n.id === id) || nodes.length >= 80 || typeof title !== "string" || !title.trim() || title.length > 120) return state
  const existing = resolveBranches(nodes, ev.workflowBranches)
  if (!branch || existing.some(b => b.id === branch.id) || validateBranchDefinitions([...existing, branch])) return state
  const role = branch.defaultRoleId ? state.roles.find(r => r.id === branch.defaultRoleId && r.fn !== "advisor") : undefined
  if (branch.defaultRoleId && !role) return state
  const fresh: Node = { ...newStepNode(ev, id, undefined, state.today), stepKind: branchConditions(branch).length ? "situation" : "core", title: title.trim(), phase: branch.side === "after_event" ? "close" : "prepare", fn: role?.fn ?? "programs", ownerId: role?.holderId ?? null, status: role?.holderId ? "accepted" : "unclaimed", acceptedOn: role?.holderId ? state.today : null }
  const r = insertFlowBranch(nodes, fresh, branch, existing)
  if (r.error) return state
  const withNode = { ...state, events: state.events.map(e => e.id === eventId ? { ...e, workflowBranches: [...existing, structuredClone(branch)] } : e), nodes: [...state.nodes, fresh] }
  const next = applyStepEdits(withNode, eventId, r.edits)
  return next === withNode ? state : next
}

/** Delete a step the club added (or any step no ASU rule needs). Steps that waited for it wait for what it waited for. */
function removeEventStep(state: DemoState, eventId: string, nodeId: string): DemoState {
  const inEvent = state.nodes.filter(n => n.eventId === eventId)
  const node = inEvent.find(n => n.id === nodeId)
  if (!node || cannotDelete(node)) return state
  const patches = new Map(removalEdits(inEvent, nodeId).map(e => [e.id, e.patch.dependsOn!]))
  const gone = (x: { nodeId: string }) => x.nodeId !== nodeId
  const remaining = state.nodes.filter(n => n.id !== nodeId).map(n => (patches.has(n.id) ? { ...n, dependsOn: patches.get(n.id)! } : n))
  const defaults = new Set(DEFAULT_WORKFLOW_BRANCHES.map(b => b.id))
  return applySchedule({
    ...state,
    nodes: remaining,
    events: state.events.map(event => event.id === eventId && event.workflowBranches ? { ...event, workflowBranches: event.workflowBranches.filter(branch => defaults.has(branch.id) || !inEvent.some(n => placementOf(n).branchId === branch.id) || remaining.some(n => n.eventId === eventId && placementOf(n).branchId === branch.id)) } : event),
    nudges: state.nudges.filter(gone), extensionRequests: state.extensionRequests.filter(gone), notifications: state.notifications.filter(gone),
    silenceCases: state.silenceCases.filter(gone), protocolLog: state.protocolLog.filter(gone), officerGrants: state.officerGrants.filter(gone),
  })
}

/** Put the event's steps back as they were (the chart's Undo). Only this event's steps; nothing else changes. */
function restoreEventNodes(state: DemoState, eventId: string, nodes: Node[], branches?: WorkflowBranch[]): DemoState {
  if (!state.events.some(e => e.id === eventId) || !Array.isArray(nodes) || nodes.length > 80) return state
  const ids = new Set<string>()
  for (const n of nodes) { if (!n || typeof n.id !== "string" || n.eventId !== eventId || ids.has(n.id) || !Array.isArray(n.dependsOn)) return state; ids.add(n.id) }
  if (nodes.some(n => n.dependsOn.some(d => !ids.has(d)))) return state
  if (topoOrder(nodes).looped.length) return state
  if (validateBranchDefinitions(branches)) return state
  const existing = state.nodes.filter(n => n.eventId === eventId)
  if (existing.some(n => !ids.has(n.id) && cannotDelete(n))) return state
  const current = new Map(existing.map(n => [n.id, n]))
  const restored = nodes.map(n => {
    const live = current.get(n.id)
    return live ? { ...live, dependsOn: [...n.dependsOn], phase: n.phase, placement: n.placement ? { ...n.placement } : undefined, cond: n.cond, stepKind: n.stepKind, estDays: n.estDays, startPolicy: n.startPolicy } : structuredClone(n)
  })
  return applySchedule({ ...state, events: state.events.map(e => e.id === eventId && branches !== undefined ? { ...e, workflowBranches: structuredClone(branches) } : e), nodes: [...state.nodes.filter(n => n.eventId !== eventId), ...restored] })
}

function updateNode(state: DemoState, id: string, raw: NodePatch): DemoState {
  const patch = pick(raw, NODE_FIELDS)
  if (patch.externalLinks !== undefined && !validTaskLinks(patch.externalLinks)) return state
  for (const field of ["instructions", "completionCriteria"] as const) if (patch[field] !== undefined) patch[field] = String(patch[field]).trim().slice(0, 1200)
  if (patch.title !== undefined) { const t = String(patch.title).trim().slice(0, 100); if (t) patch.title = t; else delete patch.title }
  if (patch.tags !== undefined) patch.tags = Array.isArray(patch.tags) ? [...new Set(patch.tags.filter(t => (state.org.board?.tags ?? []).some(x => x.id === t)))] : []
  if (patch.estDays !== undefined) {
    const days = parseEffortDays(patch.estDays)
    if (days === null) delete patch.estDays
    else { patch.estDays = days; if (state.nodes.find(n => n.id === id)?.estDays !== days) patch.startPolicy = "effort" }
  }
  if (patch.startPolicy !== undefined && !["window", "effort"].includes(patch.startPolicy)) delete patch.startPolicy
  if (patch.phase !== undefined && !(PHASES as string[]).includes(patch.phase as string)) delete patch.phase
  let next: DemoState = {
    ...state,
    nodes: state.nodes.map(n => {
      if (n.id !== id) return n
      const next: Node = { ...n, ...patch, lastUpdate: state.today }
      // A president's normal workflow assignment is ready to do. Only deliberately
      // unassigned executive work stays in the Not claimed inbox.
      if ("ownerId" in patch && patch.ownerId !== n.ownerId && n.status !== "done") {
        next.status = patch.ownerId ? "accepted" : "unclaimed"
        next.acceptedOn = patch.ownerId ? state.today : null
        next.assignedOn = state.today
        next.ownerVersion = (n.ownerVersion ?? 0) + 1
      }
      return next
    }),
  }
  const old = state.nodes.find(n => n.id === id)
  if (old && "ownerId" in patch && patch.ownerId !== old.ownerId) {
    next = closeSilence(next, id)
    next.extensionRequests = next.extensionRequests.map(r => r.nodeId === id && r.status === "pending" ? { ...r, status: "cancelled" } : r)
    if (patch.ownerId) next = addNotices(next, id, [patch.ownerId], "info", `“${old.title}” is ready in To do.`, `assigned:${id}:${state.today}:${next.notifications.length}`)
  }
  return next
}

function canEditBudget(state: DemoState) {
  // A budget is part of the event's shared operating record. Every current officer may maintain its line items.
  return state.people.some(person => person.id === state.viewerId)
}

function withBudgetItems(state: DemoState, eventId: string, items: BudgetLineItem[]): DemoState {
  return syncBudgetFlow(applySchedule({ ...state, events: state.events.map(event => event.id === eventId ? { ...event, budgetItems: items } : event) }), eventId)
}

function cleanBudgetPatch(raw: Partial<Omit<BudgetLineItem, "id">>): Partial<Omit<BudgetLineItem, "id">> {
  const patch: Partial<Omit<BudgetLineItem, "id">> = {}
  if (raw.item !== undefined) patch.item = String(raw.item).trim().slice(0, 120)
  if (raw.quantity !== undefined && Number.isFinite(Number(raw.quantity))) patch.quantity = Math.max(0, Math.min(100000, Number(raw.quantity)))
  if (raw.pricePerUnit !== undefined && Number.isFinite(Number(raw.pricePerUnit))) patch.pricePerUnit = Math.max(0, Math.min(1000000, Number(raw.pricePerUnit)))
  if (raw.category && ["general", "food", "speaker", "travel"].includes(raw.category)) patch.category = raw.category
  if (raw.source && ["usg", "college", "organization", "sponsor", "none"].includes(raw.source)) patch.source = raw.source
  if (raw.status && ["not_started", "food_exception_permit", "quote_gather", "budget_request", "budget_approval", "purchase_request", "purchase_approval", "order_placed", "invoice", "attendance_submit", "paid_reimbursed", "finance_record"].includes(raw.status)) patch.status = raw.status
  return patch
}

/**
 * Every action, then the activity record (R0, docs/feedback-fix/CHEERS_R0_CONTRACT.md): one place compares the state before and after,
 * so every path that changes a task is recorded once. Reset, import and first-time setup start a new record from existing data instead.
 * Internal calls use coreReducer so a nested action is not recorded twice. Returns the same object when nothing changed.
 */
export function reducer(state: DemoState, action: Action): DemoState {
  const next = coreReducer(state, action)
  if (next === state) return state
  // First-time setup replaces the demo club with a new one, so its record starts again from the new club's data.
  if (action.type === "completeSetup") { const { activity: _old, cheers: _oldCheers, ...fresh } = next; void _old; void _oldCheers; return withActivityBackfill(fresh) }
  if (action.type === "reset" || action.type === "replace") return withActivityBackfill(withSanitizedCheers(next))
  return withActivity(state, next, action, actorOf(state, action))
}

/** Who an action is done by: the task-link holder, Platypus for automatic reminders, otherwise the viewer. */
export function actorOf(state: DemoState, action: Action): string {
  const grant = action.type === "officerAction" ? usableGrant(state, action.token) : undefined
  const access = action.type === "taskAccessAction" ? usableTaskAccessGrant(state, action.token) : undefined
  return (action.type === "saveTaskWork" || action.type === "updateTaskTarget") ? taskWorkActor(state, action.nodeId, action.authorization) ?? state.viewerId : (action.type === "recordReminderBatch" || action.type === "recordReminderDigests") && action.via === "automatic" ? "system:reminders" : access?.recipientId ?? grant?.ownerId ?? state.viewerId
}

/** Every action, then keep role terms in step with who holds what (src/data/roleTerms.ts). Returns the same object when nothing changed. */
function coreReducer(state: DemoState, action: Action): DemoState {
  if (!READ_ONLY_OK.has(action.type) && state.people.some(p => p.id === state.viewerId && !isOfficer(p))) return state
  const grant = action.type === "officerAction" ? usableGrant(state, action.token) : undefined
  const access = action.type === "taskAccessAction" ? usableTaskAccessGrant(state, action.token) : undefined
  const actorId = actorOf(state, action)
  let next = normalizeTerms(baseReducer(state, action))
  if (next === state) return state
  if (action.type === "completeSetup" && (next.reminderRuntime !== undefined || next.taskAccessGrants !== undefined)) {
    const { reminderRuntime: _previousReminders, taskAccessGrants: _previousAccess, ...workspace } = next
    void _previousReminders; void _previousAccess
    next = workspace
  }
  if (action.type === "completeSetup") return enableReminderPlan(next)
  // A reset demo or an imported file starts on the current reminder plan, like a loaded save (withCurrentReminders).
  if (action.type === "reset" || action.type === "replace") return withCurrentReminders(next)
  if (!remindersEnabled(state) || ["reset", "replace", "enableReminderPlan", "upgradeReminderPlan", "reviewLegacyReminder", "recordReminderBatch", "recordReminderDigests", "advanceClock"].includes(action.type)) return next
  const updated = action.type === "saveTaskWork" ? action.input.submit ? [action.nodeId] : [] : action.type === "claimTask" || action.type === "replyTask" || action.type === "updateTaskTarget" ? [action.nodeId]
    : action.type === "officerAction" && grant ? [grant.nodeId]
    : action.type === "taskAccessAction" && access?.scope === "owner" ? [access.nodeId]
    : action.type === "moveTask" && state.nodes.find(n => n.id === action.nodeId)?.status !== next.nodes.find(n => n.id === action.nodeId)?.status ? [action.nodeId] : []
  return afterReminderAction(state, next, actorId, updated)
}
/**
 * What someone who is not a current officer may do while viewed as (D-3a): a next officer who has not taken the role yet (or a former officer)
 * reads, works through their own handoff steps and switches view, but cannot claim, create or change tasks, contacts, events or settings.
 */
const READ_ONLY_OK = new Set<Action["type"]>(["handoffAction", "cheerAction", "playbookAction", "setViewer", "setAi", "reset", "replace", "advanceClock", "markNoticeRead", "reportOutput", "taskAccessAction", "recordReminderBatch", "recordReminderDigests", "saveTaskWork", "updateTaskTarget"])
function baseReducer(state: DemoState, action: Action): DemoState {
  switch (action.type) {
    case "handoffAction": return changeHandoff(state,action.action)
    // Cheers (R1): who may send, withdraw or mark seen is checked in changeCheers (incoming officers may only mark their cards seen).
    case "cheerAction": return changeCheers(state, action.action, state.viewerId)
    case "roleChange": return changeRole(state,action.change)
    case "reportOutput": return state.feedback.some(f=>f.outputId===action.outputId&&f.reportedBy===state.viewerId)?state:{...state,feedback:[...state.feedback,{id:`report:${nextCounter(state.feedback.map(f=>f.id),/^report:(\d+)/)}`,outputId:action.outputId.slice(0,20000),text:action.text.slice(0,10000),reportedBy:state.viewerId,on:state.today,resolved:false}]}
    case "resolveReport":return canLead(state)?{...state,feedback:state.feedback.map(f=>f.id===action.id?{...f,resolved:true}:f)}:state
    case "contacted":
    case "contactCadence": {
      const contact=state.contacts.find(c=>c.id===action.id),role=state.roles.find(r=>r.id===contact?.ownerRoleId)
      if(!contact||(!canLead(state)&&role?.holderId!==state.viewerId))return state
      if(action.type==="contactCadence"&&(!Number.isInteger(action.days)||action.days<1||action.days>365))return state
      return {...state,contacts:state.contacts.map(c=>c.id===contact.id?{...c,...(action.type==="contacted"?{lastContact:state.today}:{cadenceDays:action.days})}:c)}
    }
    case "startFunding": {
      const role=state.roles.find(r=>r.holderId===state.viewerId),event=state.events.find(e=>e.id===action.eventId)
      if((!canLead(state)&&role?.fn!=="finance")||!event||event.funding==="none"||state.funding.some(f=>f.eventId===event.id))return state
      return {...state,funding:[...state.funding,{eventId:event.id,source:event.funding,amount:0,stage:"budget_request",spendBy:null,spent:0}]}
    }
    case "advanceFunding":
    case "fundingAmount":
    case "fundingSpend":
    case "fundingSpendBy":
    case "fundingPackage": {
      const role=state.roles.find(r=>r.holderId===state.viewerId),funding=state.funding.find(f=>f.eventId===action.eventId)
      if((!canLead(state)&&role?.fn!=="finance")||!funding)return state
      const ids=["budget_request","budget_approved","purchase_request","purchase_approved","ordered_or_reimbursed","attendance_submitted"] as const
      let patch:Partial<typeof funding>={}
      if(action.type==="advanceFunding"){const next=ids[ids.indexOf(funding.stage)+1];if(!next)return state;patch={stage:next}}
      if(action.type==="fundingAmount"){if(!Number.isFinite(action.amount)||action.amount<(funding.spent??0)||action.amount<0||action.amount>1000000)return state;patch={amount:action.amount}}
      if(action.type==="fundingSpend"){if(!Number.isFinite(action.spent)||action.spent<0||action.spent>funding.amount)return state;patch={spent:action.spent}}
      if(action.type==="fundingSpendBy"){if(action.date&&!validDate(action.date))return state;patch={spendBy:action.date||null}}
      if(action.type==="fundingPackage")patch={application:{...action.application}}
      return {...state,funding:state.funding.map(f=>f===funding?{...f,...patch}:f)}
    }
    case "budgetLineAdd": {
      const event = state.events.find(e => e.id === action.eventId)
      if (!event || !canEditBudget(state)) return state
      const number = nextCounter((event.budgetItems ?? []).map(item => item.id), /:budget:(\d+)$/)
      return withBudgetItems(state, event.id, [...(event.budgetItems ?? []), { id: `${event.id}:budget:${number}`, item: "New line item", quantity: 1, pricePerUnit: 0, source: "none", status: "not_started", category: "general" }])
    }
    case "budgetLineUpdate": {
      const event = state.events.find(e => e.id === action.eventId)
      if (!event || !canEditBudget(state) || !(event.budgetItems ?? []).some(item => item.id === action.id)) return state
      const patch = cleanBudgetPatch(action.patch)
      if (!Object.keys(patch).length) return state
      return withBudgetItems(state, event.id, (event.budgetItems ?? []).map(item => item.id === action.id ? { ...item, ...patch } : item))
    }
    case "budgetLineDelete": {
      const event = state.events.find(e => e.id === action.eventId)
      if (!event || !canEditBudget(state) || !(event.budgetItems ?? []).some(item => item.id === action.id)) return state
      return withBudgetItems(state, event.id, (event.budgetItems ?? []).filter(item => item.id !== action.id))
    }

    case "reset":
      return ensureWorkflowPresetTeams(seedDemo(undefined, "v2"))
    case "moveTask": return moveTask(state, action.nodeId, action.status, action.beforeId ?? null)
    case "addContact": return addContact(state, action)
    case "updateContact": return updateContact(state, action.id, action.patch)
    case "deleteContact": return deleteContact(state, action.id)
    case "addOrganization": return addOrganization(state, action.name, action.orgType)
    case "updateOrganization": return updateOrganization(state, action.id, action.patch)
    case "deleteOrganization": return deleteOrganization(state, action.id)
    case "logInteraction": return logInteraction(state, action.input)
    case "updateInteraction": return updateInteraction(state, action.id, { nextDone: action.nextDone, delete: action.delete })
    case "setViewer":
      return state.people.some(p => p.id === action.viewerId) ? { ...state, viewerId: action.viewerId } : state
    case "setAi":
      return { ...state, aiEnabled: action.enabled }
    case "replace":
      return action.state && [22, 23].includes(action.state.schemaVersion) && Array.isArray(action.state.nodes) && Array.isArray(action.state.people) && Array.isArray(action.state.roles) && action.state.org
        ? ensureWorkflowPresetTeams(applySchedule({ ...action.state, schemaVersion: SCHEMA_VERSION })) : state
    case "updateNode": {
      const node = state.nodes.find(n => n.id === action.id)
      if (!canLead(state) || !node || (action.expectedTask !== undefined && action.expectedTask !== taskDefinitionKey(node))) return state
      const next = updateNode(state, action.id, action.patch)
      return next === state ? state : applySchedule(next)
    }
    case "applyStepEdits": return canLead(state) ? applyStepEdits(state, action.eventId, action.edits, action.phaseOrder) : state
    case "addEventStep": return canLead(state) ? addEventStep(state, action.eventId, action.id, action.uId, action.vId, action.target) : state
    case "addEventBranch": return canLead(state) ? addEventBranch(state, action.eventId, action.id, action.branch, action.title) : state
    case "removeEventStep": return canLead(state) ? removeEventStep(state, action.eventId, action.nodeId) : state
    case "restoreEventNodes": return canLead(state) ? restoreEventNodes(state, action.eventId, action.nodes, action.branches) : state
    case "updateEvent": {
      // Event Details stay open to every officer; date, name and headcount follow who may create events.
      const patch = pick(action.patch, canChangeEvent(state) ? ["date", "name", "headcount", "details"] : ["details"])
      if (!Object.keys(patch).length) return state
      if (patch.date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(patch.date)) return state
      if (patch.details !== undefined) patch.details = String(patch.details).slice(0, 5000) || undefined
      return applySchedule({ ...state, events: state.events.map(e => (e.id === action.id ? { ...e, ...patch } : e)) })
    }
    case "draftChanges": {
      if (state.changeSets.some(c => c.id === action.changeSet.id)) return state
      const accepted = action.changeSet.ops.flatMap((raw, originalIndex) => {
        const op = sanitizeOps([raw], commandContext(state))[0]
        return op && !isSmallOp(op) ? [{ op, originalIndex }] : []
      })
      const ops = accepted.map(item => item.op)
      if (!ops.length) return state
      const workflowChoices = Object.fromEntries(accepted.flatMap(({ op, originalIndex }, index) => {
        const choice = action.changeSet.workflowChoices?.[originalIndex]
        return op.op === "create_event" && choice && typeof choice.templateId === "string" && Number.isInteger(choice.templateVersion) ? [[index, choice]] : []
      }))
      return { ...state, changeSets: [...state.changeSets, { ...action.changeSet, workflowChoices, ops, status: "pending", reviews: ops.map(() => "pending") }] }
    }
    case "aiAutoApply": return aiAutoApply(state, action.changeSet)
    case "undoAuto": {
      const change = state.changeSets.find(c => c.id === action.id)
      if (!change?.auto || change.undone || !change.before || (change.by !== state.viewerId && !canLead(state))) return state
      const nodes = new Map(change.before.nodes.map(n => [n.id, n])), contacts = new Map(change.before.contacts.map(c => [c.id, c]))
      // Tasks this change created are removed, along with any links and notices that point at them.
      const created = new Set(change.createdIds ?? [])
      const kept = state.nodes.filter(n => !created.has(n.id)).map(n => nodes.get(n.id) ?? n).map(n => n.dependsOn.some(d => created.has(d)) ? { ...n, dependsOn: n.dependsOn.filter(d => !created.has(d)) } : n)
      return applySchedule({ ...state, nodes: kept, notifications: state.notifications.filter(n => !created.has(n.nodeId ?? "")), contacts: state.contacts.map(c => contacts.get(c.id) ?? c), changeSets: state.changeSets.map(c => c.id === change.id ? { ...c, undone: true } : c) })
    }
    case "createTasks": return createTasks(state, action)
    case "reviewChange": {
      const change = state.changeSets.find(c => c.id === action.id)
      if (!change || change.status !== "pending" || !change.ops[action.index] || !canApplyOp(state, change.ops[action.index]) || (change.reviews?.[action.index] ?? "pending") !== "pending") return state
      let next = state
      let op = change.ops[action.index]
      if (action.decision === "applied") {
        const raw = action.op ?? op
        const choice = change.workflowChoices?.[action.index]
        const human = { ...(choice ? { workflowTemplateId: choice.templateId, workflowTemplateVersion: choice.templateVersion } : {}), ...action.human }
        // Editing may change fields, never the type of an already-reviewed operation.
        if ((raw as { op?: unknown })?.op !== op.op || validateReview(state, raw, human)) return state
        const clean = sanitizeOps([raw], commandContext(state))[0]
        op = clean
        switch (clean.op) {
          case "assign_owner": next = coreReducer(state, { type: "updateNode", id: clean.nodeId, patch: { ownerId: clean.ownerId } }); break
          case "set_tier": next = coreReducer(state, { type: "updateNode", id: clean.nodeId, patch: { tier: clean.tier } }); break
          case "link_dependency": next = coreReducer(state, { type: "updateNode", id: clean.nodeId, patch: { dependsOn: [...new Set([...state.nodes.find(n => n.id === clean.nodeId)!.dependsOn, clean.dependsOnId])] } }); break
          case "create_event":
          case "add_node": {
            const id = `${change.id}:${action.index}`
            const created = newObjects(state, clean, id, human)
            if (clean.op === "create_event" && !created.events?.some(event => event.id === id)) return state
            next = { ...state, ...created }
            if (clean.op === "add_node") next = assignedNotice(next, next.nodes.find(n => n.id === id)!)
            next = applySchedule(next)
            break
          }
          case "update_event": next = applySchedule({ ...state, events: state.events.map(e => e.id === clean.eventId ? { ...e, ...(clean.name ? { name: clean.name } : {}), ...(clean.headcount ? { headcount: clean.headcount } : {}) } : e) }); break
          case "add_contact": next = coreReducer(state, { type: "addContact", name: clean.name, organization: clean.organization, relation: clean.relation, ownerRoleId: clean.ownerRoleId, cadenceDays: clean.cadenceDays }); break
          case "set_funding_amount": next = coreReducer(state, { type: "fundingAmount", eventId: clean.eventId, amount: clean.amount }); break
          case "advance_funding": next = coreReducer(state, { type: "advanceFunding", eventId: clean.eventId }); break
        }
      }
      const reviews = change.ops.map((_, i) => i === action.index ? action.decision : change.reviews?.[i] ?? "pending")
      const ops = change.ops.map((old, i) => i === action.index ? op : old)
      const status = reviews.includes("pending") ? "pending" : reviews.every(r => r === "rejected") ? "rejected" : "applied"
      return { ...next, changeSets: next.changeSets.map(c => c.id === change.id ? { ...c, ops, reviews, status } : c) }
    }
    case "enableReminderPlan": return canLead(state) ? enableReminderPlan(state) : state
    case "upgradeReminderPlan": return canLead(state) ? upgradeReminderPlan(state) : state
    case "reviewLegacyReminder": return canLead(state) ? reviewLegacyReminder(state, action.nodeId) : state
    case "recordReminderBatch": return recordReminderBatch(state, action)
    case "recordReminderDigests": return applyReminderDigests(state, action)
    case "issueTaskAccessGrant": {
      const g = action.grant
      if ((state.taskAccessGrants !== undefined && !Array.isArray(state.taskAccessGrants)) || !taskAccessIssueValid(state, g) || state.taskAccessGrants?.some(old => old?.id === g.id)) return state
      return { ...state, taskAccessGrants: [...(state.taskAccessGrants ?? []), g] }
    }
    case "taskAccessAction": return applyTaskAccessUpdate(state, action.token, action.update)
    case "updateTaskTarget": {
      const actor = taskWorkActor(state, action.nodeId, action.authorization)
      if (!actor) return state
      const next = updateTaskTarget(state, action.nodeId, actor, action.input)
      if (next !== state && action.authorization?.kind === "legacy") {
        const grant = usableGrant(state, action.authorization.token)
        return { ...next, officerGrants: next.officerGrants.map(g => g.id === grant?.id ? { ...g, usedOn: state.today } : g) }
      }
      return next
    }
    case "saveTaskWork": {
      const actor = taskWorkActor(state, action.nodeId, action.authorization)
      if (!actor) return state
      const next = saveTaskWork(state, action.nodeId, actor, action.input)
      if (next !== state && action.input.submit && action.authorization?.kind === "legacy") {
        const grant = usableGrant(state, action.authorization.token)
        return { ...next, officerGrants: next.officerGrants.map(g => g.id === grant?.id ? { ...g, usedOn: state.today } : g) }
      }
      return next
    }
    case "confirmPlannedReminder": return canLead(state) ? confirmPlannedReminder(state, action.candidateId, action.via, action.message) : state
    case "confirmNudgeSent": {
      if (state.reminderRuntime !== undefined) return canLead(state) ? confirmLegacyPlannedReminder(state, action.nodeId, action.via, action.message) : state
      const n = state.nodes.find(n => n.id === action.nodeId)
      if (!canLead(state) || !n || nudgeBlocked(state, n)) return state
      const message = action.message ? validatedReminderMessage(state, action.message, n.id) : null
      if (action.message && (!message || message.channel !== action.channel)) return state
      if (message && (action.via ?? "president") !== (["auto_email", "review_then_auto"].includes(state.org.settings.reminderMode ?? "") ? "platypus" : "president")) return state
      return { ...state, nudges: [...state.nudges, { id: `nudge-${nextCounter(state.nudges.map(x => x.id), /^nudge-(\d+)-/)}-${n.id}`, nodeId: n.id, channel: action.channel, text: message?.text ?? action.text, sentBy: state.viewerId, sentOn: state.today, response: null, ...(message ? { message } : {}), ...(action.via === "president" || action.via === "platypus" ? { via: action.via } : {}) }] }
    }
    case "claimTask": return claimTask(state, action.nodeId, state.viewerId)
    case "replyTask": return replyToTask(state, action.nodeId, state.viewerId, action.reply, action.input)
    case "reviewExtension": return reviewExtension(state, action.id, action.approve)
    case "advanceClock": return canLead(state) ? state.reminderRuntime !== undefined ? advancePlannedClock(state, action.days) : advanceClock(state, action.days) : state
    case "markNoticeRead": return { ...state, notifications: state.notifications.map(n => n.id === action.id && n.recipientId === state.viewerId ? { ...n, read: true } : n) }
    case "temporaryOwner": {
      if (!canLead(state)) return state
      const entry = state.protocolLog.find(e => e.id === action.entryId && e.kind === "suggest_owner")
      const c = state.silenceCases.find(c => c.id === entry?.caseId && !c.closedOn)
      if (!entry?.suggestedOwnerId || !c || c.temporaryOwnerId || !state.people.some(p => p.id === entry.suggestedOwnerId)) return state
      const next = coreReducer(state, { type: "updateNode", id: entry.nodeId, patch: { ownerId: entry.suggestedOwnerId } })
      return { ...next, silenceCases: next.silenceCases.map(x => x.id === c.id ? { ...c, temporaryOwnerId: entry.suggestedOwnerId } : x) }
    }
    case "approveRecovery": {
      if (!canLead(state)) return state
      const entry = state.protocolLog.find(e => e.id === action.entryId && e.kind === "recovery")
      const c = state.silenceCases.find(c => c.id === entry?.caseId && !c.closedOn)
      const n = state.nodes.find(n => n.id === entry?.nodeId)
      if (!c || !n || n.status === "done" || n.recoveryFrom) return state
      return applySchedule({ ...state, nodes: state.nodes.map(x => x.id === n.id ? { ...x, recoveryFrom: state.today } : x) })
    }
    case "issueOfficerGrant": {
      const g = action.grant
      const n = state.nodes.find(n => n.id === g.nodeId)
      if (!canLead(state) || !n || !n.ownerId || n.status === "done" || g.ownerId !== n.ownerId || g.ownerVersion !== (n.ownerVersion ?? 0) || g.issuedOn !== state.today || g.usedOn || !/^[a-f0-9]{64}$/.test(g.signature) || state.officerGrants.some(x => x.id === g.id)) return state
      return { ...state, officerGrants: [...state.officerGrants, g] }
    }
    case "officerAction": {
      const grant = usableGrant(state, action.token)
      if (!grant) return state
      const next = action.reply === "claim" ? claimTask(state, grant.nodeId, grant.ownerId) : replyToTask(state, grant.nodeId, grant.ownerId, action.reply, action.input)
      if (next === state) return state
      return { ...next, officerGrants: next.officerGrants.map(g => g.id === grant.id ? { ...g, usedOn: state.today } : g) }
    }
    case "saveClubSettings": return saveClubSettings(state, action.draft, action.defaults)
    case "saveProfile": return saveProfile(state, action.personId, action.patch, action.invite)
    case "completeSetup": {
      const next = startWorkspace(state, action.draft, action.event, action.date, action.inviteCode, action.taskDueDays, action.clubBufferBusinessDays, action.workflow, action.reminderMode, action.workflowBranches)
      return next === state ? state : ensureWorkflowPresetTeams(next)
    }
    case "newWorkflowTemplate": return newWorkflowTemplate(state, action.id, action.name)
    case "saveWorkflowTemplateDraft": return saveWorkflowTemplateDraft(state, action.id, action.draft)
    case "publishWorkflowTemplate": return publishWorkflowTemplate(state, action.id)
    case "duplicateWorkflowTemplate": return duplicateWorkflowTemplate(state, action.sourceId, action.id, action.name)
    case "setDefaultWorkflowTemplate": return setDefaultWorkflowTemplate(state, action.id)
    case "discardWorkflowTemplateDraft": return discardWorkflowTemplateDraft(state, action.id)
    case "restoreWorkflowPreset": return restoreWorkflowPreset(state, action.id)
    case "saveWorkflowTeams": return saveWorkflowTeams(state, action.teams, action.roleTeams)
    case "saveOnboardingChecklist": return saveOnboardingChecklist(state, action.checklist)
    case "playbookAction": return changePlaybook(state, action.action)
    case "saveWorkflow": return saveWorkflow(state, action.steps, action.branches)
    case "resetWorkflow": return resetWorkflow(state)
  }
}

/**
 * Leads only (not in READ_ONLY_OK). The checklist is sanitized with the current role ids, so unknown or archived roles are
 * dropped. The same state comes back when the input is not a checklist, when nothing but `updatedOn` would change, or
 * when there is nothing to remove, so Undo and the log never record an empty save.
 */
function saveOnboardingChecklist(state: DemoState, raw: unknown): DemoState {
  if (!canLead(state)) return state
  const current = state.org.onboardingChecklist
  if (raw === null) {
    if (!current) return state
    const { onboardingChecklist: _removed, ...org } = state.org
    void _removed
    return { ...state, org }
  }
  const next = sanitizeChecklist(raw, state.roles.map(r => r.id), state.today)
  if (!next || (current && sameChecklist(current, next))) return state
  return { ...state, org: { ...state.org, onboardingChecklist: next } }
}

/* ───────────── Storage: load, back up, save ───────────── */

/** Where the interaction log lives. A separate key, so "Reset demo" and version changes never touch it. */
export const LOG_KEY = "platypus.v1.log"
/** The log keeps the newest entries only (localStorage is small). The cap covers the whole log kept in this browser (one sitting, possibly several study sessions). */
export const LOG_LIMIT = 2000
const BACKUP_PREFIX = `${STORAGE_KEY}.backup.`

export type StorageNotice =
  /** The saved data could not be used (older version or damaged), so the demo was restored. The old data is kept in `backupKey`. */
  | { kind: "restored_demo"; why: "version" | "unreadable"; fromVersion: number | null; backupKey: string | null; raw: string }
  /** Saving to this browser failed (storage full or blocked). Work since the last good save exists only on screen. */
  | { kind: "save_failed" }
  | { kind: "migration_blocked"; fromVersion: 22; backupKey: null; raw: string }
  | { kind: "storage_conflict" }

const store = () => window.localStorage

/**
 * Copy `raw` to a key of its own, named after what it is (e.g. `platypus.v1.demo.backup.v4`).
 * The same text is never stored twice (React may call this twice in development); different text gets `.2`, `.3` …
 * Returns the key, or null if the browser would not take it.
 */
function backUp(raw: string, tag: string): string | null {
  const base = BACKUP_PREFIX + tag
  try {
    for (let i = 1; i <= 50; i++) {
      const key = i === 1 ? base : `${base}.${i}`
      const existing = store().getItem(key)
      if (existing === raw) return key
      if (existing === null) { store().setItem(key, raw); return key }
    }
  } catch { /* storage full or blocked */ }
  return null
}

/**
 * Load the saved demo. Nothing the person typed is ever thrown away silently: if the saved data is from another
 * structure version, or cannot be read, it is first copied to a backup key, and the notice says where.
 */
export function loadStateWithNotice(): { state: DemoState; notice: StorageNotice | null } {
  const loaded = readStateWithNotice()
  // Data held back for download (migration_blocked) is kept exactly as it was read.
  if (loaded.notice?.kind === "migration_blocked") return { ...loaded, state: ensureWorkflowPresetTeams(loaded.state) }
  return { ...loaded, state: withActivityBackfill(withSanitizedCheers(withCurrentReminders(ensureWorkflowPresetTeams(loaded.state)))) }
}

/**
 * S2 (Juanxi, 2026-11-22; supersedes the 2026-11-16 rule that an old save upgrades only when a lead presses "Enable updated reminders"):
 * every loaded, reset or imported state runs on the current reminder plan. A legacy plan (none yet, or a valid version 1) is upgraded by
 * the same pure logic as the upgradeReminderPlan action, keeping every setting and all history; an invalid runtime is kept for recovery.
 * It is not a user action, so it is not logged, and it does not depend on the viewer. Returns the same object when nothing changes.
 */
export function withCurrentReminders(s: DemoState): DemoState {
  return upgradeReminderPlan(s)
}

function readStateWithNotice(): { state: DemoState; notice: StorageNotice | null } {
  let raw: string | null = null
  try { raw = store().getItem(STORAGE_KEY) } catch { return { state: seedDemo(undefined, "v2"), notice: null } } // storage blocked: nothing to protect; a failed save will say so
  if (!raw) return { state: seedDemo(undefined, "v2"), notice: null }
  let parsed: DemoState | null = null
  try { parsed = JSON.parse(raw) as DemoState } catch { parsed = null }
  // Matching S3 rollback checkpoint: retain v23 fields verbatim. Keep this reader when rolling back feature writes.
  if (parsed && typeof parsed === "object" && parsed.schemaVersion === 23 && Array.isArray(parsed.people) && Array.isArray(parsed.roles) && Array.isArray(parsed.events) && Array.isArray(parsed.nodes)) return { state: normalizeTerms(parsed), notice: null }
  if (parsed && typeof parsed === "object" && parsed.schemaVersion === 22 && Array.isArray(parsed.people) && Array.isArray(parsed.roles) && Array.isArray(parsed.events) && Array.isArray(parsed.nodes)) {
    if (!backUp(raw, "v22")) return { state: parsed, notice: { kind: "migration_blocked", fromVersion: 22, backupKey: null, raw } }
    // S3 only adds optional matching fields; all existing tasks, people and history stay intact.
    return { state: normalizeTerms({ ...parsed, schemaVersion: SCHEMA_VERSION }), notice: null }
  }
  if (parsed && typeof parsed === "object" && parsed.schemaVersion === SCHEMA_VERSION) return { state: normalizeTerms(repairTaskLinks(parsed)), notice: null }
  // Keep all supported saved versions on the same one-time demo-update path.
  // v20 and v21 (the live site during Phase 3) only gain the Handoff fields: no demo-plan update, so a participant's saved club is not changed.
  if (parsed && typeof parsed === "object" && [20, 21].includes(parsed.schemaVersion) && Array.isArray(parsed.events) && Array.isArray(parsed.nodes)) {
    return { state: normalizeTerms(repairLegacyHandoff(repairCoreEventSteps(repairTaskLinks({ ...parsed, schemaVersion: SCHEMA_VERSION })))), notice: null }
  }
  if (parsed && typeof parsed === "object" && [14, 15, 17, 18, 19].includes(parsed.schemaVersion) && Array.isArray(parsed.events) && Array.isArray(parsed.nodes)) {
    return { state: normalizeTerms(repairLegacyHandoff(completeDemoSpeakerPlan(repairCoreEventSteps(repairTaskLinks({ ...parsed, schemaVersion: SCHEMA_VERSION }))))), notice: null }
  }
  // v12 makes assigned workflow work actionable immediately. Keep every saved
  // event, budget line and history; only move owner-backed Not claimed cards to To do.
  if (parsed && typeof parsed === "object" && parsed.schemaVersion === 12 && Array.isArray(parsed.events) && Array.isArray(parsed.nodes)) {
    const promoted = { ...parsed, schemaVersion: SCHEMA_VERSION, nodes: parsed.nodes.map(node => node.ownerId && node.status === "unclaimed" ? { ...node, status: "accepted" as const, acceptedOn: node.assignedOn ?? parsed.today } : node) }
    const state = promoted.events.reduce((next, event) => syncBudgetFlow(next, event.id), repairCoreEventSteps(repairTaskLinks(applySchedule(promoted))))
    return { state: normalizeTerms(repairLegacyHandoff(completeDemoSpeakerPlan(state))), notice: null }
  }
  // v6 used the former fixed event graph. Preserve existing activities and their recognizable progress while
  // rebuilding them from the approved baseline + selected situation routes.
  if (parsed && typeof parsed === "object" && Array.isArray(parsed.events) && Array.isArray(parsed.nodes) && Array.isArray(parsed.roles) && (parsed.schemaVersion === 6 || parsed.schemaVersion === 7 || parsed.schemaVersion === 8 || parsed.schemaVersion === 9 || parsed.schemaVersion === 10 || parsed.schemaVersion === 11)) {
    const legacy = parsed
    const byNewKey: Record<string, string> = { plan: "draft", registry: "registry", venue: "venue", quotes: "quote", foodCompliance: "foodex", budgetRequest: "usg", budgetApproval: "usg", content: "flyer", finalcheck: "review", headcount: "headcount", feedback: "feedback", financeRecord: "closeout", documentation: "archive" }
    const stageToStatus = { budget_request: "budget_request", budget_approved: "budget_approval", purchase_request: "purchase_request", purchase_approved: "purchase_approval", ordered_or_reimbursed: "paid_reimbursed", attendance_submitted: "attendance_submit" } as const
    const events = legacy.events.map(event => {
      const funding = legacy.funding.find(entry => entry.eventId === event.id)
      const budgetItems = event.budgetItems ?? (funding ? [{ id: `${event.id}:budget:1`, item: "Migrated funding request", quantity: 1, pricePerUnit: funding.amount, source: funding.source === "dues" ? "organization" : funding.source, status: stageToStatus[funding.stage], category: "general" }] : [])
      return { ...event, budgetItems, checks: event.checks ?? { food: event.food !== "none", externalFood: event.food === "offsite", onsiteFood: event.food === "onsite", funding: event.funding !== "none", speaker: event.speaker, partner: event.speaker } }
    })
    const rebuilt = events.flatMap(event => {
      const old = new Map(legacy.nodes.filter(n => n.eventId === event.id).map(n => [n.stepKey, n]))
      const generated = buildEventNodes(event, legacy.roles, { steps: EVENT_STEPS }).map(node => {
        const prior = old.get(byNewKey[node.stepKey ?? ""])
        return prior ? { ...node, status: prior.status, ownerId: prior.ownerId, acceptedOn: prior.acceptedOn, waitingOn: prior.waitingOn, lastUpdate: prior.lastUpdate, assignedOn: prior.assignedOn, ownerVersion: prior.ownerVersion } : node
      })
      return [...generated, ...legacy.nodes.filter(n => n.eventId === event.id && n.stepKey === null)]
    })
    const state = events.reduce((next, event) => syncBudgetFlow(next, event.id), applySchedule({ ...legacy, schemaVersion: SCHEMA_VERSION, org: { ...legacy.org, eventWorkflow: undefined }, events, nodes: [...legacy.nodes.filter(n => n.eventId === null), ...rebuilt] }))
    return { state: normalizeTerms(repairLegacyHandoff(completeDemoSpeakerPlan(state))), notice: null }
  }
  const fromVersion = parsed && typeof parsed === "object" && typeof parsed.schemaVersion === "number" ? parsed.schemaVersion : null
  const backupKey = backUp(raw, fromVersion === null ? "unreadable" : `v${fromVersion}`)
  return { state: seedDemo(undefined, "v2"), notice: { kind: "restored_demo", why: fromVersion === null ? "unreadable" : "version", fromVersion, backupKey, raw } }
}

export function loadState(): DemoState {
  return loadStateWithNotice().state
}

/** Returns false when the browser refused the write (storage full or blocked). */
export function saveState(state: DemoState): boolean {
  try {
    store().setItem(STORAGE_KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

export function loadLog(): LogEntry[] {
  let raw: string | null = null
  try { raw = store().getItem(LOG_KEY) } catch { return [] }
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed) && parsed.every(e => e && typeof e === "object" && Number.isInteger((e as LogEntry).seq) && typeof (e as LogEntry).type === "string")) return parsed.slice(-LOG_LIMIT) as LogEntry[]
  } catch { /* fall through to the backup */ }
  backUp(raw, "log-unreadable")
  return []
}

export function saveLog(log: LogEntry[]): boolean {
  try {
    store().setItem(LOG_KEY, JSON.stringify(log))
    return true
  } catch {
    return false
  }
}

/* ───────────── Interaction log (A7b) ───────────── */

const SECRET_KEY = /token|signature|secret|password|dataurl|invitecode/i

/** Shorten a value for the log: long text cut, deep or long structures trimmed, secret-looking fields left out. */
function slim(v: unknown, depth = 0): unknown {
  if (typeof v === "string") return v.length > 200 ? `${v.slice(0, 200)}…` : v
  if (v === null || typeof v === "number" || typeof v === "boolean") return v
  if (depth >= 4) return "[…]"
  if (Array.isArray(v)) {
    const out = v.slice(0, 20).map(x => slim(x, depth + 1))
    if (v.length > 20) out.push(`[+${v.length - 20} more]`)
    return out
  }
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).filter(([k, x]) => !SECRET_KEY.test(k) && x !== undefined).slice(0, 40).map(([k, x]) => [k, slim(x, depth + 1)]))
  return undefined
}

/** The action's arguments as they go into the log. */
function payloadOf(a: Action): unknown {
  switch (a.type) {
    case "updateTaskTarget": return { nodeId: a.nodeId, date: a.input.date, message: a.input.message, notifyPersonIds: a.input.notifyPersonIds }
    case "saveTaskWork": return { nodeId: a.nodeId, submit: a.input.submit, revision: a.input.expectedRevision, detailsLength: a.input.details?.length, attachments: a.input.attachments?.map(f => ({ id: f.id, name: f.name, size: f.size })) }
    case "recordReminderBatch": return { via: a.via, candidateIds: a.entries.map(e => e.candidateId), count: a.entries.length }
    case "recordReminderDigests": { const digests = Array.isArray(a.digests) ? a.digests : []; return { via: a.via, count: digests.length, taskCount: digests.reduce((n, d) => n + (Array.isArray(d?.entries) ? d.entries.length : 0), 0), groupIds: digests.map(d => d?.groupId), recipientIds: digests.map(d => d?.recipientId), candidateIds: digests.map(d => Array.isArray(d?.entries) ? d.entries.map(e => e?.candidateId) : []), accessIds: digests.map(d => Array.isArray(d?.entries) ? d.entries.map(e => e?.grant?.id) : []) } }
    case "issueTaskAccessGrant": return { nodeId: a.grant.nodeId, recipientId: a.grant.recipientId, scope: a.grant.scope, issuedOn: a.grant.issuedOn }
    case "taskAccessAction": return { update: slim(a.update) }
    case "confirmPlannedReminder": return { candidateId: a.candidateId, via: a.via, ...(a.message ? { message: { source: a.message.source, wordCount: a.message.wordCount, accessId: a.message.accessId } } : {}) }
    case "confirmNudgeSent": return a.message ? { nodeId: a.nodeId, channel: a.channel, via: a.via, message: { source: a.message.source, wordCount: a.message.wordCount, accessId: a.message.accessId } } : slim(Object.fromEntries(Object.entries(a).filter(([k]) => k !== "type")))
    case "replace": return { nodes: a.state.nodes.length, events: a.state.events.length }
    // IDs and numbers only: a cheer's note never enters the log, and of the people let know (R1.1) only how many. Every cheer is emailed since R1.1.
    case "cheerAction": { const x = a.action; return x.kind === "send" ? { kind: x.kind, recipients: Array.isArray(x.toIds) ? x.toIds.length : 0, points: x.points, noteLength: typeof x.note === "string" ? x.note.trim().length : 0, nodeId: x.nodeId ?? null, card: x.card, email: true, cc: Array.isArray(x.ccIds) ? x.ccIds.length : 0 } : x.kind === "markSeen" ? { kind: x.kind, ids: Array.isArray(x.ids) ? x.ids.slice(0, 20) : [] } : x.kind === "withdraw" ? { kind: x.kind, id: x.id } : { kind: x.kind } }
    // Counts only, like its "before" value: the default would copy (truncated) checklist titles on every debounced save.
    // Counts and IDs only: question and answer text never enters the log.
    case "playbookAction": { const x = a.action; return { kind: x.kind, ...("questionId" in x ? { questionId: x.questionId } : {}), ...("answerId" in x ? { answerId: x.answerId } : {}), ...("vote" in x ? { vote: x.vote } : {}), ...(x.kind === "addQuestion" ? { category: x.category } : {}), ...(x.kind === "addAnswer" ? { answerKind: x.answerKind } : {}) } }
    case "saveOnboardingChecklist": { const modules = Array.isArray(a.checklist?.modules) ? a.checklist.modules : []; return { cleared: a.checklist === null, modules: modules.length, items: modules.reduce((n, m) => n + (Array.isArray(m?.items) ? m.items.length : 0), 0) } }
    case "officerAction": return { reply: a.reply, input: slim(a.input) }
    case "issueOfficerGrant": return { nodeId: a.grant.nodeId, ownerId: a.grant.ownerId, issuedOn: a.grant.issuedOn }
    case "fundingPackage": return { eventId: a.eventId, application: "[application package]" }
    case "draftChanges":
    case "aiAutoApply": return { changeSetId: a.changeSet.id, source: a.changeSet.source ?? null, sentence: slim(a.changeSet.sentence), ops: a.changeSet.ops.map(o => o.op) }
    case "reviewChange": return { id: a.id, index: a.index, decision: a.decision, op: slim(a.op), human: slim(a.human) }
    case "addEventStep": return { eventId: a.eventId, id: a.id, uId: a.uId, vId: a.vId, target: a.target }
    case "addEventBranch": return { eventId: a.eventId, id: a.id, branch: a.branch, title: a.title }
    case "removeEventStep": return { eventId: a.eventId, nodeId: a.nodeId }
    case "restoreEventNodes": return { eventId: a.eventId, steps: Array.isArray(a.nodes) ? a.nodes.length : 0, branches: a.branches?.map(b => b.id) }
    case "applyStepEdits": return { eventId: a.eventId, edits: (Array.isArray(a.edits) ? a.edits : []).map(e => ({ id: e?.id, dependsOn: e?.patch?.dependsOn, estDays: e?.patch?.estDays, phase: e?.patch?.phase })), phaseOrder: a.phaseOrder }
    default: return slim(Object.fromEntries(Object.entries(a).filter(([k]) => k !== "type")))
  }
}

const hasValue = (o: object | undefined) => !!o && Object.keys(o).length > 0

/** Values the action is about to overwrite, read from the state before it ran. Undefined for actions that only create something. */
function beforeOf(s: DemoState, a: Action): unknown {
  const fields = (o: object | undefined, keys: string[]) => o ? Object.fromEntries(keys.filter(k => k in o).map(k => [k, (o as Record<string, unknown>)[k]])) : undefined
  const node = (id: string) => s.nodes.find(n => n.id === id)
  let out: object | undefined
  switch (a.type) {
    case "taskAccessAction": { const g = usableTaskAccessGrant(s, a.token); out = g ? fields(node(g.nodeId), ["status", "ownerId"]) : undefined; break }
    case "enableReminderPlan": out = { reminderVersion: s.reminderRuntime?.version }; break
    case "confirmPlannedReminder": out = { reminderDeliveryCount: remindersEnabled(s) ? s.reminderRuntime!.deliveries.length : undefined }; break
    case "recordReminderDigests": out = remindersEnabled(s) ? { reminderDeliveryCount: s.reminderRuntime!.deliveries.length, reminderDigestCount: s.reminderRuntime!.digests?.length ?? 0 } : undefined; break
    case "updateTaskTarget": out = fields(node(a.nodeId), ["clubDeadline", "clubDeadlineOverride", "targetDates"]); break
    case "updateNode": out = fields(node(a.id), Object.keys(a.patch).filter(k => (NODE_FIELDS as string[]).includes(k))); break
    case "updateEvent": out = fields(s.events.find(e => e.id === a.id), Object.keys(a.patch).filter(k => ["date", "name", "headcount", "details"].includes(k))); break
    case "moveTask": out = fields(node(a.nodeId), ["status", "ownerId"]); break
    case "claimTask":
    case "replyTask": out = fields(node(a.nodeId), ["status", "ownerId"]); break
    case "officerAction": { const g = usableGrant(s, a.token); out = g ? fields(node(g.nodeId), ["status", "ownerId"]) : undefined; break }
    case "contacted": out = fields(s.contacts.find(c => c.id === a.id), ["lastContact"]); break
    case "contactCadence": out = fields(s.contacts.find(c => c.id === a.id), ["cadenceDays"]); break
    case "advanceFunding":
    case "fundingAmount":
    case "fundingSpend":
    case "fundingSpendBy":
    case "fundingPackage": out = fields(s.funding.find(f => f.eventId === a.eventId), ["stage", "amount", "spent", "spendBy"]); break
    case "setViewer": out = { viewerId: s.viewerId }; break
    case "setAi": out = { aiEnabled: s.aiEnabled }; break
    case "advanceClock": out = { today: s.today }; break
    case "removeEventStep": out = fields(node(a.nodeId), ["title", "dependsOn", "status", "estDays", "ownerId"]); break
    case "newWorkflowTemplate": case "saveWorkflowTemplateDraft": case "publishWorkflowTemplate": case "duplicateWorkflowTemplate": case "setDefaultWorkflowTemplate": case "discardWorkflowTemplateDraft": case "restoreWorkflowPreset": out = { templateIds: s.org.workflowTemplates?.map(template => template.id), defaultWorkflowTemplateId: s.org.defaultWorkflowTemplateId }; break
    case "saveWorkflowTeams": out = { workflowTeams: s.org.workflowTeams, workflowRoleTeams: s.org.workflowRoleTeams }; break
    // Counts only: checklist titles are club text the log does not need. Guarded: an imported state may hold a damaged checklist.
    case "playbookAction": { const p = playbookOf(s); out = { playbookQuestions: p.questions.length, playbookAnswers: p.answers.length }; break }
    case "saveOnboardingChecklist": { const c = s.org.onboardingChecklist, ok = Array.isArray(c?.modules) && c!.modules.every(m => Array.isArray(m?.items)); out = { onboardingModules: ok ? c!.modules.length : 0, onboardingItems: ok ? countItems(c!) : 0 }; break }
    case "saveWorkflow": case "resetWorkflow": out = { eventWorkflow: s.org.eventWorkflow }; break
    case "saveClubSettings": out = { name: s.org.name, mission: s.org.mission, settings: s.org.settings }; break
    case "saveProfile": out = fields(s.people.find(p => p.id === a.personId), Object.keys(a.patch)); break
    case "markNoticeRead": out = fields(s.notifications.find(n => n.id === a.id), ["read"]); break
    case "resolveReport": out = fields(s.feedback.find(f => f.id === a.id), ["resolved"]); break
    case "reviewExtension": out = fields(s.extensionRequests.find(r => r.id === a.id), ["status"]); break
    case "undoAuto": out = fields(s.changeSets.find(c => c.id === a.id), ["undone"]); break
    case "applyStepEdits": out = { steps: (Array.isArray(a.edits) ? a.edits : []).map(e => ({ id: e?.id, ...fields(node(e?.id), ["dependsOn", "estDays", "phase"]) })), ...(a.phaseOrder ? { phaseOrder: phaseOrderOf(s.events.find(e => e.id === a.eventId)) } : {}) }; break
    case "reviewChange": { const c = s.changeSets.find(x => x.id === a.id); out = c ? { review: c.reviews?.[a.index] ?? "pending", status: c.status } : undefined; break }
  }
  return hasValue(out) ? slim(out) : undefined
}

/** Append one entry, dropping the oldest when the log is full. Pure: the caller supplies the real time and the study session (if any). */
export function appendLog(log: LogEntry[], before: DemoState, after: DemoState, action: Action, at: number, session?: string | null): LogEntry[] {
  const prior = beforeOf(before, action)
  const entry: LogEntry = {
    seq: (log[log.length - 1]?.seq ?? 0) + 1, at, actor: (action.type === "saveTaskWork" || action.type === "updateTaskTarget") ? taskWorkActor(before, action.nodeId, action.authorization) ?? before.viewerId : (action.type === "recordReminderBatch" || action.type === "recordReminderDigests") && action.via === "automatic" ? "system:reminders" : action.type === "taskAccessAction" ? usableTaskAccessGrant(before, action.token)?.recipientId ?? before.viewerId : before.viewerId, type: action.type,
    payload: payloadOf(action), ...(prior !== undefined ? { before: prior } : {}), applied: after !== before, ...(session ? { session } : {}),
  }
  return log.length >= LOG_LIMIT ? [...log.slice(log.length - LOG_LIMIT + 1), entry] : [...log, entry]
}

/** The entries a new study session keeps (src/lib/studySession.ts: the last 6 hours); `cleared` = how many others there were. */
export function keepSitting(log: LogEntry[], keep: Keep): { log: LogEntry[]; cleared: number } {
  const kept = log.filter(e => keep(e.at, e.session))
  return { log: kept.length === log.length ? log : kept, cleared: log.length - kept.length }
}

interface Root { app: DemoState; log: LogEntry[] }
/** `session`: the study session the entry belongs to (none when no session is running). */
type Msg = { action: Action; at: number; session?: string | null }

/** The app reducer plus the log: every action goes through here, so every action leaves a line. */
export function loggedReducer(root: Root, msg: Msg): Root {
  const app = reducer(root.app, msg.action)
  return { app, log: appendLog(root.log, root.app, app, msg.action, msg.at, msg.session) }
}

/** The same press or event twice within this time is one thing (a double event, React's development double-run). */
export const UI_REPEAT_MS = 600
/** A link click already says where it went; the page change that follows within this time is not written again. */
const LINK_NAV_MS = 2000

/**
 * Append one screen event (src/lib/uiLog.ts) to the same log, same entry shape and numbering.
 * UI entries have no `before` (they change no data) and `applied` is true unless the control was switched off
 * or the answer failed. Noise is folded: an identical event right after the last one is dropped, except a
 * repeated click, which is counted in `payload.repeat` on the first entry. Pure: the caller supplies the time.
 */
export function appendUiLog(log: LogEntry[], actor: string, ev: UiEvent, at: number, session?: string | null): LogEntry[] {
  const payload = slim(ev.payload) as Record<string, unknown>
  const last = log[log.length - 1]
  if (last && last.type === ev.type && at - last.at <= UI_REPEAT_MS && last.applied === (ev.applied ?? true)) {
    const { repeat, ...rest } = (last.payload ?? {}) as Record<string, unknown>
    if (JSON.stringify(rest) === JSON.stringify(payload)) {
      if (ev.type !== "ui.click") return log
      return [...log.slice(0, -1), { ...last, payload: { ...rest, repeat: (typeof repeat === "number" ? repeat : 1) + 1 } }]
    }
  }
  if (ev.type === "ui.navigate" && last?.type === "ui.click" && at - last.at <= LINK_NAV_MS) {
    const pressed = (last.payload ?? {}) as Record<string, unknown>
    if (pressed.to === payload.to) return log
    // A button that changed the page ("Continue"): the click entry gets where it led, instead of a second entry.
    if (pressed.to === undefined && !pressed.external) return [...log.slice(0, -1), { ...last, payload: { ...pressed, to: payload.to } }]
  }
  const entry: LogEntry = { seq: (last?.seq ?? 0) + 1, at, actor, type: ev.type, payload, applied: ev.applied ?? true, ...(session ? { session } : {}) }
  return log.length >= LOG_LIMIT ? [...log.slice(log.length - LOG_LIMIT + 1), entry] : [...log, entry]
}

/* ───────────── Export (A7c) ───────────── */

const iso = (ms: number | undefined) => (typeof ms === "number" && Number.isFinite(ms) ? new Date(ms).toISOString() : null)

/**
 * One session in the export: when it began, when setup ended and how, how many of the file's entries are from it, and what its start removed (counts only).
 * `log` is the file's entries (the Reminders answer is read from them); `stored` is the saved org.settings.reminderMode, passed only for the latest session.
 */
function sessionItem(session: StudySession, walk: OnboardingAttempt | undefined, entries: number, log: LogEntry[], stored?: unknown) {
  return {
    id: session.id,
    startedAt: iso(session.startedAt),
    startedAtMs: session.startedAt,
    startedAtAz: azTime(session.startedAt),
    attempt: walk?.id ?? null,
    outcome: walk?.outcome ?? null,
    setupCompletedAt: iso(walk?.setupCompletedAt),
    setupCompletedAtMs: walk?.setupCompletedAt ?? null,
    setupCompletedAtAz: azTime(walk?.setupCompletedAt) || null,
    setupChoice: walk?.setupChoice ?? null,
    firstEventChoice: firstEventChoice(walk),
    // P3-H: the Reminders screen's answer ("auto_email" | "review_then_self" | "review_then_auto" | "skipped"), or null. Start workspace's saved value is a fallback only.
    reminderModeChoice: reminderModeChoice(walk, log, walk?.setupChoice === "start-workspace" ? stored : undefined),
    entries,
    previousEntriesCleared: session.previousEntriesCleared,
    previousAttemptsCleared: session.previousAttemptsCleared,
  }
}

/**
 * Everything the person has done and the state they ended up with, as one JSON-able object.
 * formatVersion 2 (Phase 3 logging) kept every version-1 field and added `build`, `demoToday`, `onboardingFlowVersion` and the merged `timeline`.
 * formatVersion 3 (study sessions) adds `sessions` (each study session in the file) and `session` (the latest, with counts of what is not in the
 * file), tags entries with their session, and gives timeline rows `timeAz` and `session`. The log and attempts are those of the last sitting
 * (src/lib/studySession.ts); everything, as before, when no session has begun in this browser. See docs/PHASE3_DATA_DICTIONARY.md.
 */
export function buildExport(state: DemoState, log: LogEntry[], exportedAt: number, onboarding: OnboardingRecord = loadOnboardingRecord(), book: Book = loadBook()) {
  const latest = book.sessions[book.sessions.length - 1] ?? null
  // The same rule the latest session start applied, so a stale tab's older entries cannot slip in.
  const keep = latest ? keeper(book.sessions, latest.startedAt) : () => true
  const entries = keepSitting(log, keep).log
  const attempts = onboarding.attempts.filter(a => keep(attemptLastAt(a), a.sessionId))
  const record: OnboardingRecord = attempts.length === onboarding.attempts.length ? onboarding : { attempts }
  const listed = book.sessions.filter(s => s === latest || entries.some(e => e.session === s.id) || attempts.some(a => a.sessionId === s.id))
  const sessions = listed.map(s => sessionItem(s, attempts.find(a => a.sessionId === s.id && a.entry === "start"), entries.filter(e => e.session === s.id).length, entries, s === latest ? state.org.settings.reminderMode : undefined))
  const sum = (k: "previousEntriesCleared" | "previousAttemptsCleared") => listed.reduce((n, s) => n + s[k], 0)
  const firstSeq = entries[0]?.seq ?? null
  // Numbers missing before the first entry, minus those the 6-hour clean-up removed: what the 2,000-entry cap dropped.
  const capDropped = log.length ? Math.max(0, log[0].seq - 1 - (latest ? book.seqCleared : 0)) : 0
  return {
    format: "platypus-export",
    formatVersion: 3,
    exportedAt: new Date(exportedAt).toISOString(),
    schemaVersion: state.schemaVersion,
    storageKey: STORAGE_KEY,
    build: BUILD_INFO,
    demoToday: state.today,
    onboardingFlowVersion: FLOW_VERSION,
    session: latest ? { ...sessions[sessions.length - 1], olderEntriesLeftOut: sum("previousEntriesCleared") + log.length - entries.length, olderAttemptsLeftOut: sum("previousAttemptsCleared") + onboarding.attempts.length - attempts.length } : null,
    sessions,
    // R-S0: an edited reminder email is counted (`edited: true`), never exported with what the lead typed.
    state: { ...withoutEditedText(state), demoLinkKey: "[omitted]" },
    onboarding: record,
    interactionLog: { limit: LOG_LIMIT, count: entries.length, firstSeq, lastSeq: entries[entries.length - 1]?.seq ?? null, droppedEarlier: capDropped, entries },
    timeline: buildTimeline(entries, record, listed),
  }
}

export function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }))
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Download the person's current data and interaction log as a JSON file. */
export async function downloadExport(state: DemoState, log: LogEntry[]): Promise<{ complete: boolean }> {
  const at = Date.now()
  const name = `platypus-export-${new Date(at).toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`
  let archive: { state: DemoState; taskDrafts: unknown[] } | null = null
  try {
    const { taskWorkArchive } = await import("../taskDetails/archive")
    archive = await taskWorkArchive(state)
  } catch { /* Task files or drafts could not be read (blocked IndexedDB, missing file). Export everything else. */ }
  downloadText(name, JSON.stringify({ ...buildExport(archive?.state ?? state, log, at), taskDrafts: archive?.taskDrafts ?? [] }, null, 2))
  return { complete: !!archive }
}

/* ───────────── Provider ───────────── */

interface StoreValue {
  state: DemoState
  automaticReminders: { busy: boolean; error: string | null; retry: () => void }
  /** The current on-screen state has not been persisted to this browser. */
  persistenceFailed: boolean
  dispatch: (a: Action) => void
  /** Configuration/AI prerequisites: persist before publishing the state; false leaves current business state intact. */
  tryDispatch: (a: Action) => boolean
  /**
   * Why the last tryDispatch could not save, read at call time (so a handler can ask right after a refused tryDispatch):
   * "other-tab" when another tab changed the saved data, "storage" when this browser refused or blocked the write
   * (or saving is held back), null when nothing is known to be wrong.
   */
  saveProblem: () => SaveProblem
  getState: () => DemoState
  reset: () => void
  /** The interaction log as it is right now, oldest first (read at call time, so it is never stale). */
  getLog: () => LogEntry[]
  /** Record one screen event into the log (the page listener and components use `emitUi`, which ends up here). */
  logUi: (e: UiEvent) => void
  /** "Export my data": record the export, then download the file with everything up to and including it. */
  exportData: () => void
}

export type SaveProblem = "other-tab" | "storage" | null
const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children, initial, initialLog }: { children: ReactNode; initial?: DemoState; initialLog?: LogEntry[] }) {
  const [boot] = useState(() => (initial ? { state: initial, notice: null } : loadStateWithNotice()))
  // The data and the log advance together, synchronously, in a ref: a screen event written in the click's capture phase
  // is already in the log when the button's own handler runs (Export reads it). React state follows for rendering.
  const [root, setRoot] = useState<Root>(() => ({ app: boot.state, log: initialLog ?? (initial ? [] : loadLog()) }))
  const rootRef = useRef<Root | null>(null)
  if (rootRef.current === null) rootRef.current = root
  const commit = useCallback((next: Root) => { if (next !== rootRef.current) { rootRef.current = next; setRoot(next) } }, [])
  // If the old data could not be backed up, keep it in place (do not overwrite it) until the person has downloaded it.
  const [held, setHeld] = useState(boot.notice?.kind === "migration_blocked" || (boot.notice?.kind === "restored_demo" && boot.notice.backupKey === null))
  const [notice, setNotice] = useState<StorageNotice | null>(boot.notice)
  const [saveFailed, setSaveFailed] = useState(false)
  const [exportError, setExportError] = useState(false)
  const [exportPartial, setExportPartial] = useState(false)
  // Data and log are saved separately: a click changes only the log, so the (larger) demo data is not rewritten for it.
  const saved = useRef({ app: true, log: true })
  const savedApp = useRef<DemoState | null>(null)
  const persistedRaw = useRef<{ raw: string | null } | null>(null)
  const conflict = useRef(false)
  if (!persistedRaw.current) {
    try { persistedRaw.current = { raw: store().getItem(STORAGE_KEY) } } catch { /* Saving will report unavailable storage. */ }
  }
  // A revision in memory cannot detect another tab's completed write. Check the actual business key before every write.
  // This detects stale tabs; localStorage still provides no atomic cross-tab compare-and-swap.
  // When storage cannot even be read (blocked cookies/site data), there is no other tab to protect: ordinary actions
  // may continue in memory (allowUnavailable) while the save-failed notice stays visible. tryDispatch stays strict.
  const storageUnchanged = useCallback((allowUnavailable = false) => {
    if (conflict.current) return false
    try {
      const raw = store().getItem(STORAGE_KEY)
      if (persistedRaw.current && raw !== persistedRaw.current.raw) {
        conflict.current = true; setHeld(true); setNotice({ kind: "storage_conflict" }); return false
      }
      persistedRaw.current = { raw }
      return true
    } catch { saved.current.app = false; setSaveFailed(true); return allowUnavailable }
  }, [])
  const persistApp = useCallback((app: DemoState) => {
    if (!storageUnchanged() || !saveState(app)) return false
    persistedRaw.current = { raw: JSON.stringify(app) }
    return true
  }, [storageUnchanged])
  useEffect(() => {
    const changed = (event: StorageEvent) => { if (event.key === STORAGE_KEY || event.key === null) storageUnchanged() }
    window.addEventListener("storage", changed)
    return () => window.removeEventListener("storage", changed)
  }, [storageUnchanged])
  useEffect(() => {
    if (held) return
    if (savedApp.current === root.app) return
    saved.current.app = persistApp(root.app)
    if (saved.current.app) savedApp.current = root.app
    setSaveFailed(!(saved.current.app && saved.current.log))
  }, [root.app, held, persistApp])
  useEffect(() => {
    if (held || !storageUnchanged()) return
    saved.current.log = saveLog(root.log)
    setSaveFailed(!(saved.current.app && saved.current.log))
  }, [root.log, held, storageUnchanged])
  // The study session new entries belong to. A session runs for one sitting: after 6 hours new entries carry none, until a new one begins.
  const [bootSession] = useState(currentSession)
  const sessionRef = useRef<StudySession | null>(bootSession)
  const sessionAt = useCallback((at: number) => { const s = sessionRef.current; return s && at - s.startedAt <= SITTING_MS ? s.id : null }, [])
  // A new study session (a recorded walkthrough begins): entries from an earlier sitting go (counted); the last 6 hours stay.
  useEffect(() => onSessionStart((s, keep) => {
    sessionRef.current = s
    const r = rootRef.current!
    const { log, cleared } = keepSitting(r.log, keep)
    if (log !== r.log) commit({ app: r.app, log })
    return { cleared, kept: log.length }
  }), [commit])
  // The real clock is read here, once per action, and travels with it into the log.
  const dispatch = useCallback((action: Action) => {
    if ((held && boot.notice?.kind === "migration_blocked") || !storageUnchanged(true)) return
    const before = rootRef.current!
    if (["completeSetup", "replace"].includes(action.type) && before.app.matching && !backUp(JSON.stringify(before.app), `matching-${before.app.org.matchingWorkspaceId ?? "prior"}`)) { setSaveFailed(true); return }
    const at = Date.now(); commit(loggedReducer(before, { action, at, session: sessionAt(at) }))
  }, [commit, sessionAt, held, boot.notice, storageUnchanged])
  const tryDispatch = useCallback((action: Action) => {
    if (held || !storageUnchanged()) return false
    const before = rootRef.current!, at = Date.now(), next = loggedReducer(before, { action, at, session: sessionAt(at) })
    if (["completeSetup", "replace"].includes(action.type) && before.app.matching && !backUp(JSON.stringify(before.app), `matching-${before.app.org.matchingWorkspaceId ?? "prior"}`)) { setSaveFailed(true); return false }
    if (next.app === before.app) return false
    if (!persistApp(next.app)) { saved.current.app = false; setSaveFailed(true); return false }
    savedApp.current = next.app; saved.current.app = true
    commit(next); setSaveFailed(!saved.current.log)
    return true
  }, [held, commit, sessionAt, storageUnchanged, persistApp])
  const getState = useCallback(() => rootRef.current!.app, [])
  const saveProblem = useCallback((): SaveProblem => conflict.current ? "other-tab" : held || !saved.current.app ? "storage" : null, [held])
  const logUi = useCallback((e: UiEvent) => {
    const r = rootRef.current!
    const at = Date.now()
    const log = appendUiLog(r.log, r.app.viewerId, e, at, sessionAt(at))
    if (log !== r.log) commit({ app: r.app, log })
  }, [commit, sessionAt])
  useEffect(() => onUi(logUi), [logUi])
  const getLog = useCallback(() => rootRef.current!.log, [])
  const downloadCurrent = useCallback(() => {
    setExportError(false); setExportPartial(false)
    void downloadExport(rootRef.current!.app, rootRef.current!.log).then(r => { if (!r.complete) setExportPartial(true) }).catch(() => setExportError(true))
  }, [])
  const exportData = useCallback(() => {
    logUi({ type: "ui.export", payload: { entries: rootRef.current!.log.length + 1 } })
    downloadCurrent()
  }, [logUi, downloadCurrent])
  const reset = useCallback(() => { if (!held && storageUnchanged(true)) { void clearLocalDocs(); rearm(); dispatch({ type: "reset" }) } }, [dispatch, held, storageUnchanged])
  const persistenceFailed = saveFailed || held
  const automaticReminders = useAutomaticReminders(root.app, held, getState, tryDispatch)
  // The log is left out of the value on purpose: a click must not re-render every screen that reads the store.
  const value = useMemo(() => ({ state: root.app, persistenceFailed, automaticReminders, dispatch, tryDispatch, saveProblem, getState, reset, getLog, logUi, exportData }), [root.app, persistenceFailed, automaticReminders, dispatch, tryDispatch, saveProblem, getState, reset, getLog, logUi, exportData])
  const shown: StorageNotice | null = notice?.kind === "storage_conflict" ? notice : saveFailed ? { kind: "save_failed" } : notice
  return <StoreContext.Provider value={value}>
    {exportPartial && <div role="status" className="save-status err">Exported without task files and private drafts; this browser could not read them. <button type="button" className="btn small" onClick={downloadCurrent}>Retry export</button></div>}
    {exportError && <div role="alert" className="save-status err">Your full export could not be downloaded. Your saved data is kept here. <button type="button" className="btn small" onClick={downloadCurrent}>Retry export</button></div>}
    {shown && <StorageBanner notice={shown} onDownload={() => {
      if (shown.kind === "save_failed" || shown.kind === "storage_conflict") downloadCurrent()
      else { downloadText(`platypus-previous-data-${shown.fromVersion === null ? "unreadable" : `v${shown.fromVersion}`}.json`, shown.raw); if (shown.kind !== "migration_blocked") setHeld(false) }
    }} onRetry={shown.kind === "save_failed" && !held ? () => {
      const current = rootRef.current!
      saved.current.app = persistApp(current.app)
      if (saved.current.app) { savedApp.current = current.app; saved.current.log = saveLog(current.log) }
      setSaveFailed(!(saved.current.app && saved.current.log))
    } : undefined} onDismiss={shown.kind === "restored_demo" && !held ? () => setNotice(null) : undefined} />}
    {children}
  </StoreContext.Provider>
}

/** Says out loud that data was restored or could not be saved. Uses existing classes only. */
function StorageBanner({ notice, onDownload, onDismiss, onRetry }: { notice: StorageNotice; onDownload: () => void; onDismiss?: () => void; onRetry?: () => void }) {
  if (notice.kind === "storage_conflict") return <div role="alert" className="save-status err" data-testid="storage-banner">This organization changed in another tab. Changes here are paused to protect both copies. Download this tab's copy if needed, then reload to use the latest saved data. <button type="button" className="btn small" onClick={onDownload}>Download this tab's copy</button></div>
  if (notice.kind === "migration_blocked") return <div role="alert" className="save-status err" data-testid="storage-banner">Your saved organization is intact. Its upgrade could not be backed up, so changes are paused. Download the original data, then reload to retry the upgrade. <button type="button" className="btn small" onClick={onDownload}>Download original data</button></div>
  if (notice.kind === "save_failed")
    return <div role="alert" className="save-status err" data-testid="storage-banner">Your latest changes could not be saved in this browser (storage is full or blocked). They will be lost if you close this tab. {onRetry && <button type="button" className="btn small" onClick={onRetry}>Retry browser saving</button>}<button type="button" className="btn small" onClick={onDownload}>Download my data</button></div>
  const what = notice.why === "version" ? `This demo was updated, so your earlier data (version ${notice.fromVersion}) could not be opened and the example club was restored.` : "Your saved data could not be read, so the example club was restored."
  const kept = notice.backupKey ? `Your earlier data is kept in this browser as "${notice.backupKey}".` : "Your earlier data could NOT be backed up in this browser, and nothing new is saved until you download it."
  return <div role="alert" className={notice.backupKey ? "notice" : "save-status err"} data-testid="storage-banner">{what} {kept} <button type="button" className="btn small" onClick={onDownload}>Download previous data</button>{onDismiss && <button type="button" className="btn small" onClick={onDismiss}>Dismiss</button>}</div>
}

export function useStore(): StoreValue {
  const v = useContext(StoreContext)
  if (!v) throw new Error("useStore must be used inside <StoreProvider>")
  return v
}

/** The engine's full result (dates, explanations, issues). Recomputed only when the state changes. */
export function useSchedule(): Schedule {
  const { state } = useStore()
  return useMemo(() => computeSchedule(state), [state])
}

/** Convenience selectors */
export function useViewer() {
  const { state } = useStore()
  const person = state.people.find(p => p.id === state.viewerId) ?? state.people[0]
  const role = state.roles.find(r => r.id === person.roleId)
  const canNudge = role?.holderId === person.id && (role?.fn === "president" || role?.fn === "vice_president")
  return { person, role, canNudge }
}


/**
 * Small AI edits apply at once, as the viewer: the same permission checks as clicking in the page.
 * Anything the viewer may not do is skipped with a note. The touched records are kept for Undo.
 */
function aiAutoApply(state: DemoState, set: ChangeSet): DemoState {
  if (state.changeSets.some(c => c.id === set.id)) return state
  const ops = sanitizeOps(set.ops, commandContext(state)).filter(isSmallOp)
  if (!ops.length) return state
  const lead = canLead(state)
  const touchedNodes = new Set<string>(), touchedContacts = new Set<string>()
  const reviews: ("applied" | "rejected")[] = [], notes: string[] = []
  let next = state
  for (const op of ops) {
    let note = ""
    const before = next
    switch (op.op) {
      case "set_status": {
        const n = next.nodes.find(x => x.id === op.nodeId)!
        if (n.status === op.status) { note = "Already there."; break }
        note = canMoveTask(next, n, op.status) ?? ""
        if (!note) { next = moveTask(next, n.id, op.status, null); touchedNodes.add(n.id) }
        break
      }
      case "rename_task":
      case "set_tags":
      case "set_tier":
        if (!lead) { note = "Only the president or VP can edit task details."; break }
        next = coreReducer(next, { type: "updateNode", id: op.nodeId, patch: op.op === "rename_task" ? { title: op.title } : op.op === "set_tags" ? { tags: op.tags } : { tier: op.tier } })
        touchedNodes.add(op.nodeId)
        break
      case "mark_contacted":
        next = coreReducer(next, { type: "contacted", id: op.contactId })
        if (next === before) note = "Only the partner's owner or a lead can log contact."
        else touchedContacts.add(op.contactId)
        break
    }
    if (!note && next === before) note = "Nothing changed."
    reviews.push(note ? "rejected" : "applied"); notes.push(note)
  }
  const record: ChangeSet = {
    ...set, ops, reviews, notes, auto: true, by: state.viewerId,
    status: reviews.includes("applied") ? "applied" : "rejected",
    before: { nodes: state.nodes.filter(n => touchedNodes.has(n.id)), contacts: state.contacts.filter(c => touchedContacts.has(c.id)) },
  }
  return { ...next, changeSets: [...next.changeSets, record] }
}
