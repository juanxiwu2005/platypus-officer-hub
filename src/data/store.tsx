import { changeHandoff, type HandoffAction } from "./handoff"
import { validDate } from "../lib/commands"
import type { ApplicationPackage } from "../lib/preflight"
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react"
import type { ChangeSet, DemoState, Event, Node } from "./types"
import { commandContext, isSmallOp, sanitizeOps } from "../lib/commands"
import { canLead, newObjects, validateReview, type HumanInputs } from "./changeReview"
import { nudgeBlocked } from "../lib/nudges"
import type { Channel } from "./types"
import { SCHEMA_VERSION, seedDemo } from "./seed"
import { applySchedule, computeSchedule, type Schedule } from "../engine/schedule"
import { advanceClock } from "../engine/followup"
import { addNotices, claimTask, closeSilence, replyToTask, reviewExtension, type ReplyInput, type TaskReply } from "./taskWorkflow"
import { usableGrant } from "../lib/officerLinks"
import type { OfficerGrant } from "./types"
import { completeSetup, saveClubSettings, saveProfile, type ClubDraft, type ProfilePatch } from "./settings"
import type { BoardSettings, NodeStatus, OrgSettings } from "./types"
import { addBoardTask, canMoveTask, moveTask, saveBoard } from "./board"
import { addContact, addOrganization, deleteContact, deleteOrganization, logInteraction, updateContact, updateInteraction, updateOrganization, type ContactInput, type ContactPatch, type InteractionInput, type OrgPatch } from "./crm"

/**
 * Demo store (v1.0): all data lives in this browser only (plan §11, decision 3).
 * Each Phase 3 participant gets their own copy; "Reset demo" restores the seed.
 * Storage can be unavailable (private windows, blocked site data), so every access is guarded
 * and the app still works from memory.
 */
export const STORAGE_KEY = "platypus.v1.demo"

/** Fields a person may edit on a node. Dates are not here: only the club deadline override, which the engine then applies. */
export type NodePatch = Partial<Pick<Node, "title" | "tags" | "ownerId" | "clubDeadlineOverride" | "estDays" | "approverRoleId" | "consultedRoleIds" | "informedRoleIds" | "why" | "draftLink" | "tier" | "dependsOn">>
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
  | { type: "updateEvent"; id: string; patch: EventPatch }
  | { type: "draftChanges"; changeSet: ChangeSet }
  | { type: "aiAutoApply"; changeSet: ChangeSet }
  | { type: "undoAuto"; id: string }
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
  | { type: "completeSetup"; draft: ClubDraft; event: unknown; date: string; inviteCode: string }

const NODE_FIELDS: (keyof NodePatch)[] = ["title", "tags", "ownerId", "clubDeadlineOverride", "estDays", "approverRoleId", "consultedRoleIds", "informedRoleIds", "why", "draftLink", "tier", "dependsOn"]
const pick = <T extends object, K extends keyof T>(o: T, keys: K[]) => Object.fromEntries(keys.filter(k => k in o).map(k => [k, o[k]])) as unknown as Partial<T>

function updateNode(state: DemoState, id: string, raw: NodePatch): DemoState {
  const patch = pick(raw, NODE_FIELDS)
  if (patch.title !== undefined) { const t = String(patch.title).trim().slice(0, 100); if (t) patch.title = t; else delete patch.title }
  if (patch.tags !== undefined) patch.tags = Array.isArray(patch.tags) ? [...new Set(patch.tags.filter(t => (state.org.board?.tags ?? []).some(x => x.id === t)))] : []
  if (patch.estDays !== undefined) patch.estDays = Math.max(0, Math.min(30, Math.round(Number(patch.estDays) || 0)))
  let next: DemoState = {
    ...state,
    nodes: state.nodes.map(n => {
      if (n.id !== id) return n
      const next: Node = { ...n, ...patch, lastUpdate: state.today }
      // Claim handshake (plan §4 mechanism 2): a new owner has to accept the task again.
      if ("ownerId" in patch && patch.ownerId !== n.ownerId && n.status !== "done") {
        next.status = "unclaimed"
        next.acceptedOn = null
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
    if (patch.ownerId) next = addNotices(next, id, [patch.ownerId], "claim", `Please claim “${old.title}” to confirm the handover.`, `assigned:${id}:${state.today}:${next.notifications.length}`)
  }
  return next
}

export function reducer(state: DemoState, action: Action): DemoState {
  switch (action.type) {
    case "handoffAction": return changeHandoff(state,action.action)
    case "reportOutput": return state.feedback.some(f=>f.outputId===action.outputId&&f.reportedBy===state.viewerId)?state:{...state,feedback:[...state.feedback,{id:`report:${state.feedback.length}`,outputId:action.outputId.slice(0,20000),text:action.text.slice(0,10000),reportedBy:state.viewerId,on:state.today,resolved:false}]}
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

    case "reset":
      return seedDemo()
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
      return applySchedule({ ...state, nodes: state.nodes.map(n => nodes.get(n.id) ?? n), contacts: state.contacts.map(c => contacts.get(c.id) ?? c), changeSets: state.changeSets.map(c => c.id === change.id ? { ...c, undone: true } : c) })
    }
    case "reviewChange": {
      const change = state.changeSets.find(c => c.id === action.id)
      if (!change || !canLead(state) || change.status !== "pending" || !change.ops[action.index] || (change.reviews?.[action.index] ?? "pending") !== "pending") return state
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
          case "add_node": next = applySchedule({ ...state, ...newObjects(state, clean, `${change.id}:${action.index}`, action.human ?? {}) }); break
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
      return { ...state, nudges: [...state.nudges, { id: `nudge-${state.nudges.length}-${n.id}`, nodeId: n.id, channel: action.channel, text: action.text, sentBy: state.viewerId, sentOn: state.today, response: null }] }
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
    case "completeSetup": return completeSetup(state, action.draft, action.event, action.date, action.inviteCode)
  }
}

export function loadState(): DemoState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState
      if (parsed && parsed.schemaVersion === SCHEMA_VERSION) return parsed
    }
  } catch {
    /* storage unavailable or corrupt: fall back to the seed */
  }
  return seedDemo()
}

export function saveState(state: DemoState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* storage unavailable: keep working in memory */
  }
}

interface StoreValue {
  state: DemoState
  dispatch: (a: Action) => void
  reset: () => void
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children, initial }: { children: ReactNode; initial?: DemoState }) {
  const [state, dispatch] = useReducer(reducer, initial ?? null, s => s ?? loadState())
  useEffect(() => saveState(state), [state])
  const reset = useCallback(() => dispatch({ type: "reset" }), [])
  const value = useMemo(() => ({ state, dispatch, reset }), [state, reset])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
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
