import { changeHandoff, type HandoffAction } from "./handoff"
import { validDate } from "../lib/commands"
import type { ApplicationPackage } from "../lib/preflight"
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from "react"
import type { BudgetLineItem, ChangeSet, DemoState, Event, LogEntry, Node, Phase, StepTemplate } from "./types"
import { commandContext, isSmallOp, sanitizeOps } from "../lib/commands"
import { assignedNotice, canApplyOp, canLead, createTasks, newObjects, validateReview, type HumanInputs, type NewTask } from "./changeReview"
import { nudgeBlocked } from "../lib/nudges"
import type { Channel } from "./types"
import { SCHEMA_VERSION, seedDemo } from "./seed"
import { clearLocalDocs } from "../lib/localDocs"
import { applySchedule, computeSchedule, type Schedule } from "../engine/schedule"
import { buildEventNodes, EVENT_STEPS } from "../engine/playbooks"
import { nextCounter } from "../lib/ids"
import { PHASES, cleanPatch, createsLoop, phaseOrderOf, type StepEdit } from "../lib/stepOrder"
import { cannotDelete, moveBetween, newStepNode, removalEdits } from "../lib/flowEdit"
import { advanceClock } from "../engine/followup"
import { addNotices, claimTask, closeSilence, replyToTask, reviewExtension, type ReplyInput, type TaskReply } from "./taskWorkflow"
import { usableGrant } from "../lib/officerLinks"
import type { OfficerGrant } from "./types"
import { completeSetup, resetWorkflow, saveClubSettings, saveProfile, saveWorkflow, type ClubDraft, type ProfilePatch } from "./settings"
import type { BoardSettings, NodeStatus, OrgSettings } from "./types"
import { addBoardTask, canMoveTask, moveTask, saveBoard } from "./board"
import { addContact, addOrganization, deleteContact, deleteOrganization, logInteraction, updateContact, updateInteraction, updateOrganization, type ContactInput, type ContactPatch, type InteractionInput, type OrgPatch } from "./crm"
import { syncBudgetFlow } from "../engine/eventBudget"

/**
 * Demo store (v1.0): all data lives in this browser only (plan §11, decision 3).
 * Each Phase 3 participant gets their own copy; "Reset demo" restores the seed.
 * Storage can be unavailable (private windows, blocked site data), so every access is guarded
 * and the app still works from memory.
 */
export const STORAGE_KEY = "platypus.v1.demo"

/** Fields a person may edit on a node. Dates are not here: only the club deadline override, which the engine then applies. */
export type NodePatch = Partial<Pick<Node, "title" | "tags" | "ownerId" | "clubDeadlineOverride" | "estDays" | "approverRoleId" | "consultedRoleIds" | "informedRoleIds" | "why" | "draftLink" | "tier" | "dependsOn" | "phase">>
export type EventPatch = Partial<Pick<Event, "date" | "name" | "headcount">>

export type Action =
  | { type: "handoffAction"; action:HandoffAction }
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
  | { type: "addTask"; title: string; status: NodeStatus }
  | { type: "saveBoard"; board: BoardSettings }
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
  | { type: "updateNode"; id: string; patch: NodePatch }
  /** The step editor (M3): a few steps' dependsOn / estDays / phase, and the display order of the phase groups. Never a date. */
  | { type: "applyStepEdits"; eventId: string; edits: StepEdit[]; phaseOrder?: Phase[] }
  | { type: "addEventStep"; eventId: string; id: string; uId: string | null; vId: string | null }
  | { type: "removeEventStep"; eventId: string; nodeId: string }
  | { type: "restoreEventNodes"; eventId: string; nodes: Node[] }
  | { type: "updateEvent"; id: string; patch: EventPatch }
  | { type: "draftChanges"; changeSet: ChangeSet }
  | { type: "aiAutoApply"; changeSet: ChangeSet }
  | { type: "undoAuto"; id: string }
  | { type: "createTasks"; id: string; sentence: string; tasks: NewTask[]; date: string; buffered: boolean; source?: string }
  | { type: "reviewChange"; id: string; index: number; decision: "applied" | "rejected"; op?: unknown; human?: HumanInputs }
  | { type: "confirmNudgeSent"; nodeId: string; channel: Channel; text: string }
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
  | { type: "completeSetup"; draft: ClubDraft; event: unknown; date: string; inviteCode: string; taskDueDays?: number; clubBufferBusinessDays?: number; workflow?: StepTemplate[] }
  | { type: "saveWorkflow"; steps: StepTemplate[] }
  | { type: "resetWorkflow" }

const NODE_FIELDS: (keyof NodePatch)[] = ["title", "tags", "ownerId", "clubDeadlineOverride", "estDays", "approverRoleId", "consultedRoleIds", "informedRoleIds", "why", "draftLink", "tier", "dependsOn", "phase"]
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
  let changed = false
  const nodes = state.nodes.map(n => {
    const p = by.get(n.id)
    if (!p) return n
    const next: Node = { ...n, ...(p.dependsOn ? { dependsOn: p.dependsOn } : {}), ...(p.estDays !== undefined ? { estDays: p.estDays } : {}), ...(p.phase ? { phase: p.phase } : {}) }
    if (next.dependsOn.join() !== n.dependsOn.join() || next.estDays !== n.estDays || next.phase !== n.phase) changed = true
    return next
  })
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
function addEventStep(state: DemoState, eventId: string, id: string, uId: string | null, vId: string | null): DemoState {
  const ev = state.events.find(e => e.id === eventId)
  const inEvent = state.nodes.filter(n => n.eventId === eventId)
  const ref = inEvent.find(n => n.id === (uId ?? vId))
  if (!ev || typeof id !== "string" || !id.startsWith(`${eventId}:`) || state.nodes.some(n => n.id === id) || inEvent.length >= 80) return state
  if ((uId && !inEvent.some(n => n.id === uId)) || (vId && !inEvent.some(n => n.id === vId))) return state
  const withNode: DemoState = { ...state, nodes: [...state.nodes, newStepNode(ev, id, ref, state.today)] }
  const r = moveBetween(withNode.nodes.filter(n => n.eventId === eventId), id, uId, vId)
  if (r.error) return state
  const next = applyStepEdits(withNode, eventId, r.edits)
  return applySchedule(next === withNode || next === state ? withNode : next)
}

/** Delete a step the club added (or any step no ASU rule needs). Steps that waited for it wait for what it waited for. */
function removeEventStep(state: DemoState, eventId: string, nodeId: string): DemoState {
  const inEvent = state.nodes.filter(n => n.eventId === eventId)
  const node = inEvent.find(n => n.id === nodeId)
  if (!node || cannotDelete(node)) return state
  const patches = new Map(removalEdits(inEvent, nodeId).map(e => [e.id, e.patch.dependsOn!]))
  const gone = (x: { nodeId: string }) => x.nodeId !== nodeId
  return applySchedule({
    ...state,
    nodes: state.nodes.filter(n => n.id !== nodeId).map(n => (patches.has(n.id) ? { ...n, dependsOn: patches.get(n.id)! } : n)),
    nudges: state.nudges.filter(gone), extensionRequests: state.extensionRequests.filter(gone), notifications: state.notifications.filter(gone),
    silenceCases: state.silenceCases.filter(gone), protocolLog: state.protocolLog.filter(gone), officerGrants: state.officerGrants.filter(gone),
  })
}

/** Put the event's steps back as they were (the chart's Undo). Only this event's steps; nothing else changes. */
function restoreEventNodes(state: DemoState, eventId: string, nodes: Node[]): DemoState {
  if (!state.events.some(e => e.id === eventId) || !Array.isArray(nodes) || nodes.length > 80) return state
  const ids = new Set<string>()
  for (const n of nodes) { if (!n || typeof n.id !== "string" || n.eventId !== eventId || ids.has(n.id) || !Array.isArray(n.dependsOn)) return state; ids.add(n.id) }
  if (nodes.some(n => n.dependsOn.some(d => !ids.has(d)))) return state
  return applySchedule({ ...state, nodes: [...state.nodes.filter(n => n.eventId !== eventId), ...nodes.map(n => structuredClone(n))] })
}

function updateNode(state: DemoState, id: string, raw: NodePatch): DemoState {
  const patch = pick(raw, NODE_FIELDS)
  if (patch.title !== undefined) { const t = String(patch.title).trim().slice(0, 100); if (t) patch.title = t; else delete patch.title }
  if (patch.tags !== undefined) patch.tags = Array.isArray(patch.tags) ? [...new Set(patch.tags.filter(t => (state.org.board?.tags ?? []).some(x => x.id === t)))] : []
  if (patch.estDays !== undefined) patch.estDays = Math.max(0, Math.min(30, Math.round(Number(patch.estDays) || 0)))
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
  return canLead(state) || state.roles.find(role => role.holderId === state.viewerId)?.fn === "finance"
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

export function reducer(state: DemoState, action: Action): DemoState {
  switch (action.type) {
    case "handoffAction": return changeHandoff(state,action.action)
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
      return seedDemo(undefined, "v2")
    case "moveTask": return moveTask(state, action.nodeId, action.status, action.beforeId ?? null)
    case "addTask": return addBoardTask(state, action.title, action.status)
    case "saveBoard": return saveBoard(state, action.board)
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
      return applySchedule(action.state)
    case "updateNode":
      return canLead(state) && state.nodes.some(n => n.id === action.id) ? applySchedule(updateNode(state, action.id, action.patch)) : state
    case "applyStepEdits": return canLead(state) ? applyStepEdits(state, action.eventId, action.edits, action.phaseOrder) : state
    case "addEventStep": return canLead(state) ? addEventStep(state, action.eventId, action.id, action.uId, action.vId) : state
    case "removeEventStep": return canLead(state) ? removeEventStep(state, action.eventId, action.nodeId) : state
    case "restoreEventNodes": return canLead(state) ? restoreEventNodes(state, action.eventId, action.nodes) : state
    case "updateEvent": {
      const patch = pick(action.patch, ["date", "name", "headcount"])
      if (patch.date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(patch.date)) return state
      return applySchedule({ ...state, events: state.events.map(e => (e.id === action.id ? { ...e, ...patch } : e)) })
    }
    case "draftChanges": {
      if (state.changeSets.some(c => c.id === action.changeSet.id)) return state
      const ops = sanitizeOps(action.changeSet.ops, commandContext(state)).filter(op => !isSmallOp(op))
      if (!ops.length) return state
      return { ...state, changeSets: [...state.changeSets, { ...action.changeSet, ops, status: "pending", reviews: ops.map(() => "pending") }] }
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
        // Editing may change fields, never the type of an already-reviewed operation.
        if ((raw as { op?: unknown })?.op !== op.op || validateReview(state, raw, action.human)) return state
        const clean = sanitizeOps([raw], commandContext(state))[0]
        op = clean
        switch (clean.op) {
          case "assign_owner": next = reducer(state, { type: "updateNode", id: clean.nodeId, patch: { ownerId: clean.ownerId } }); break
          case "set_tier": next = reducer(state, { type: "updateNode", id: clean.nodeId, patch: { tier: clean.tier } }); break
          case "link_dependency": next = reducer(state, { type: "updateNode", id: clean.nodeId, patch: { dependsOn: [...new Set([...state.nodes.find(n => n.id === clean.nodeId)!.dependsOn, clean.dependsOnId])] } }); break
          case "create_event":
          case "add_node": {
            const id = `${change.id}:${action.index}`
            next = { ...state, ...newObjects(state, clean, id, action.human ?? {}) }
            if (clean.op === "add_node") next = assignedNotice(next, next.nodes.find(n => n.id === id)!)
            next = applySchedule(next)
            break
          }
          case "update_event": next = applySchedule({ ...state, events: state.events.map(e => e.id === clean.eventId ? { ...e, ...(clean.name ? { name: clean.name } : {}), ...(clean.headcount ? { headcount: clean.headcount } : {}) } : e) }); break
          case "add_contact": next = reducer(state, { type: "addContact", name: clean.name, organization: clean.organization, relation: clean.relation, ownerRoleId: clean.ownerRoleId, cadenceDays: clean.cadenceDays }); break
          case "set_funding_amount": next = reducer(state, { type: "fundingAmount", eventId: clean.eventId, amount: clean.amount }); break
          case "advance_funding": next = reducer(state, { type: "advanceFunding", eventId: clean.eventId }); break
        }
      }
      const reviews = change.ops.map((_, i) => i === action.index ? action.decision : change.reviews?.[i] ?? "pending")
      const ops = change.ops.map((old, i) => i === action.index ? op : old)
      const status = reviews.includes("pending") ? "pending" : reviews.every(r => r === "rejected") ? "rejected" : "applied"
      return { ...next, changeSets: next.changeSets.map(c => c.id === change.id ? { ...c, ops, reviews, status } : c) }
    }
    case "confirmNudgeSent": {
      const n = state.nodes.find(n => n.id === action.nodeId)
      if (!canLead(state) || !n || nudgeBlocked(state, n)) return state
      return { ...state, nudges: [...state.nudges, { id: `nudge-${nextCounter(state.nudges.map(x => x.id), /^nudge-(\d+)-/)}-${n.id}`, nodeId: n.id, channel: action.channel, text: action.text, sentBy: state.viewerId, sentOn: state.today, response: null }] }
    }
    case "claimTask": return claimTask(state, action.nodeId, state.viewerId)
    case "replyTask": return replyToTask(state, action.nodeId, state.viewerId, action.reply, action.input)
    case "reviewExtension": return reviewExtension(state, action.id, action.approve)
    case "advanceClock": return canLead(state) ? advanceClock(state, action.days) : state
    case "markNoticeRead": return { ...state, notifications: state.notifications.map(n => n.id === action.id && n.recipientId === state.viewerId ? { ...n, read: true } : n) }
    case "temporaryOwner": {
      if (!canLead(state)) return state
      const entry = state.protocolLog.find(e => e.id === action.entryId && e.kind === "suggest_owner")
      const c = state.silenceCases.find(c => c.id === entry?.caseId && !c.closedOn)
      if (!entry?.suggestedOwnerId || !c || c.temporaryOwnerId || !state.people.some(p => p.id === entry.suggestedOwnerId)) return state
      const next = reducer(state, { type: "updateNode", id: entry.nodeId, patch: { ownerId: entry.suggestedOwnerId } })
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
    case "completeSetup": return completeSetup(state, action.draft, action.event, action.date, action.inviteCode, action.taskDueDays, action.clubBufferBusinessDays, action.workflow)
    case "saveWorkflow": return saveWorkflow(state, action.steps)
    case "resetWorkflow": return resetWorkflow(state)
  }
}

/* ───────────── Storage: load, back up, save ───────────── */

/** Where the interaction log lives. A separate key, so "Reset demo" and version changes never touch it. */
export const LOG_KEY = "platypus.v1.log"
/** The log keeps the newest entries only (localStorage is small). */
export const LOG_LIMIT = 2000
const BACKUP_PREFIX = `${STORAGE_KEY}.backup.`

export type StorageNotice =
  /** The saved data could not be used (older version or damaged), so the demo was restored. The old data is kept in `backupKey`. */
  | { kind: "restored_demo"; why: "version" | "unreadable"; fromVersion: number | null; backupKey: string | null; raw: string }
  /** Saving to this browser failed (storage full or blocked). Work since the last good save exists only on screen. */
  | { kind: "save_failed" }

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
  let raw: string | null = null
  try { raw = store().getItem(STORAGE_KEY) } catch { return { state: seedDemo(undefined, "v2"), notice: null } } // storage blocked: nothing to protect; a failed save will say so
  if (!raw) return { state: seedDemo(undefined, "v2"), notice: null }
  let parsed: DemoState | null = null
  try { parsed = JSON.parse(raw) as DemoState } catch { parsed = null }
  if (parsed && typeof parsed === "object" && parsed.schemaVersion === SCHEMA_VERSION) return { state: parsed, notice: null }
  // v12 makes assigned workflow work actionable immediately. Keep every saved
  // event, budget line and history; only move owner-backed Not claimed cards to To do.
  if (parsed && typeof parsed === "object" && parsed.schemaVersion === 12 && Array.isArray(parsed.events) && Array.isArray(parsed.nodes)) {
    const promoted = { ...parsed, schemaVersion: SCHEMA_VERSION, nodes: parsed.nodes.map(node => node.ownerId && node.status === "unclaimed" ? { ...node, status: "accepted" as const, acceptedOn: node.assignedOn ?? parsed.today } : node) }
    const state = promoted.events.reduce((next, event) => syncBudgetFlow(next, event.id), applySchedule(promoted))
    return { state, notice: null }
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
    return { state, notice: null }
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
    case "replace": return { nodes: a.state.nodes.length, events: a.state.events.length }
    case "officerAction": return { reply: a.reply, input: slim(a.input) }
    case "issueOfficerGrant": return { nodeId: a.grant.nodeId, ownerId: a.grant.ownerId, issuedOn: a.grant.issuedOn }
    case "fundingPackage": return { eventId: a.eventId, application: "[application package]" }
    case "draftChanges":
    case "aiAutoApply": return { changeSetId: a.changeSet.id, source: a.changeSet.source ?? null, sentence: slim(a.changeSet.sentence), ops: a.changeSet.ops.map(o => o.op) }
    case "reviewChange": return { id: a.id, index: a.index, decision: a.decision, op: slim(a.op), human: slim(a.human) }
    case "addEventStep": return { eventId: a.eventId, id: a.id, uId: a.uId, vId: a.vId }
    case "removeEventStep": return { eventId: a.eventId, nodeId: a.nodeId }
    case "restoreEventNodes": return { eventId: a.eventId, steps: Array.isArray(a.nodes) ? a.nodes.length : 0 }
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
    case "updateNode": out = fields(node(a.id), Object.keys(a.patch).filter(k => (NODE_FIELDS as string[]).includes(k))); break
    case "updateEvent": out = fields(s.events.find(e => e.id === a.id), Object.keys(a.patch).filter(k => ["date", "name", "headcount"].includes(k))); break
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
    case "saveBoard": out = { board: s.org.board }; break
    case "removeEventStep": out = fields(node(a.nodeId), ["title", "dependsOn", "status", "estDays", "ownerId"]); break
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

/** Append one entry, dropping the oldest when the log is full. Pure: the caller supplies the real time. */
export function appendLog(log: LogEntry[], before: DemoState, after: DemoState, action: Action, at: number): LogEntry[] {
  const prior = beforeOf(before, action)
  const entry: LogEntry = {
    seq: (log[log.length - 1]?.seq ?? 0) + 1, at, actor: before.viewerId, type: action.type,
    payload: payloadOf(action), ...(prior !== undefined ? { before: prior } : {}), applied: after !== before,
  }
  return log.length >= LOG_LIMIT ? [...log.slice(log.length - LOG_LIMIT + 1), entry] : [...log, entry]
}

interface Root { app: DemoState; log: LogEntry[] }
type Msg = { action: Action; at: number }

/** The app reducer plus the log: every action goes through here, so every action leaves a line. */
export function loggedReducer(root: Root, msg: Msg): Root {
  const app = reducer(root.app, msg.action)
  return { app, log: appendLog(root.log, root.app, app, msg.action, msg.at) }
}

/* ───────────── Export (A7c) ───────────── */

/** Everything the person has done and the state they ended up with, as one JSON-able object. */
export function buildExport(state: DemoState, log: LogEntry[], exportedAt: number) {
  const firstSeq = log[0]?.seq ?? null
  return {
    format: "platypus-export",
    formatVersion: 1,
    exportedAt: new Date(exportedAt).toISOString(),
    schemaVersion: state.schemaVersion,
    storageKey: STORAGE_KEY,
    state: { ...state, demoLinkKey: "[omitted]" },
    interactionLog: { limit: LOG_LIMIT, count: log.length, firstSeq, lastSeq: log[log.length - 1]?.seq ?? null, droppedEarlier: firstSeq === null ? 0 : firstSeq - 1, entries: log },
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
export function downloadExport(state: DemoState, log: LogEntry[]) {
  const at = Date.now()
  downloadText(`platypus-export-${new Date(at).toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`, JSON.stringify(buildExport(state, log, at), null, 2))
}

/* ───────────── Provider ───────────── */

interface StoreValue {
  state: DemoState
  dispatch: (a: Action) => void
  reset: () => void
  /** The interaction log, oldest first. */
  log: LogEntry[]
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children, initial, initialLog }: { children: ReactNode; initial?: DemoState; initialLog?: LogEntry[] }) {
  const [boot] = useState(() => (initial ? { state: initial, notice: null } : loadStateWithNotice()))
  const [root, send] = useReducer(loggedReducer, null, (): Root => ({ app: boot.state, log: initialLog ?? (initial ? [] : loadLog()) }))
  // If the old data could not be backed up, keep it in place (do not overwrite it) until the person has downloaded it.
  const [held, setHeld] = useState(boot.notice?.kind === "restored_demo" && boot.notice.backupKey === null)
  const [notice, setNotice] = useState<StorageNotice | null>(boot.notice)
  const [saveFailed, setSaveFailed] = useState(false)
  useEffect(() => {
    if (held) return
    setSaveFailed(!(saveState(root.app) && saveLog(root.log)))
  }, [root, held])
  // The real clock is read here, once per action, and travels with it into the log.
  const dispatch = useCallback((action: Action) => send({ action, at: Date.now() }), [])
  const reset = useCallback(() => { void clearLocalDocs(); dispatch({ type: "reset" }) }, [dispatch])
  const value = useMemo(() => ({ state: root.app, dispatch, reset, log: root.log }), [root, dispatch, reset])
  const shown: StorageNotice | null = saveFailed ? { kind: "save_failed" } : notice
  return <StoreContext.Provider value={value}>
    {shown && <StorageBanner notice={shown} onDownload={() => {
      if (shown.kind === "save_failed") downloadExport(root.app, root.log)
      else { downloadText(`platypus-previous-data-${shown.fromVersion === null ? "unreadable" : `v${shown.fromVersion}`}.json`, shown.raw); setHeld(false) }
    }} onDismiss={shown.kind === "restored_demo" && !held ? () => setNotice(null) : undefined} />}
    {children}
  </StoreContext.Provider>
}

/** Says out loud that data was restored or could not be saved. Uses existing classes only. */
function StorageBanner({ notice, onDownload, onDismiss }: { notice: StorageNotice; onDownload: () => void; onDismiss?: () => void }) {
  if (notice.kind === "save_failed")
    return <div role="alert" className="save-status err" data-testid="storage-banner">Your latest changes could not be saved in this browser (storage is full or blocked). They will be lost if you close this tab. <button type="button" className="btn small" onClick={onDownload}>Download my data</button></div>
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
        next = reducer(next, { type: "updateNode", id: op.nodeId, patch: op.op === "rename_task" ? { title: op.title } : op.op === "set_tags" ? { tags: op.tags } : { tier: op.tier } })
        touchedNodes.add(op.nodeId)
        break
      case "mark_contacted":
        next = reducer(next, { type: "contacted", id: op.contactId })
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
