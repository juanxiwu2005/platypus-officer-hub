import type { DemoState, StepTemplate } from "../data/types"
import { seedDemo } from "../data/seed"
import { reducer } from "../data/store"
import type { CommandOp } from "../lib/commands"
import type { MatchingCommand, MatchingMember, MatchingReferences } from "./contracts"
import type { MatchingConfirmation } from "./businessContracts"
import { initializeOrganizationMatching, organizationSetupDocument, saveOrganizationSetup } from "./organizationMatching"
import { referenceSetup } from "./setupWorkspace"

/** Only the repository's fictional people are used; no network, model or research input is needed. */
export const STAGE3_EVENT_DATE = "2027-03-04"
export const STAGE3_EVENT_OP: Extract<CommandOp, { op: "create_event" }> = {
  op: "create_event", name: "Fictional robotics demonstration", type: "social", headcount: 30,
  venue: "campus", food: "none", funding: "none", speaker: false, checks: {},
}
export const STAGE3_ROBOT_WORKFLOW: StepTemplate[] = [{
  key: "robot-demo", title: "Prepare the robot demonstration", fn: "programs", phase: "prepare",
  estDays: 2, tier: "medium", dependsOn: [], anchor: { kind: "target", days: 7, unit: "calendar", label: "Fictional demonstration preparation" },
  why: "Prepare and inspect the demonstration robot.", source: "Fictional robot club process",
}]

export function stage3Command(state: DemoState, command: MatchingCommand): DemoState {
  const next = reducer(state, { type: "matchingCommand", command })
  if (next === state) throw new Error(`Stage 3 fixture command was refused: ${command.type}`)
  return next
}

export function stage3References(state: DemoState, patch: (references: MatchingReferences) => MatchingReferences): DemoState {
  const document = organizationSetupDocument(state)
  if (!document) throw new Error("An initialized stage 3 fixture needs an organization setup document.")
  return saveOrganizationSetup(state, referenceSetup(document, patch(document.references), state.viewerId), document.revision)
}

export function stage3Requirement(state: DemoState, workflowId: string, stepId: string, responsibilityId: string | null, status: "draft" | "confirmed" | "needs_split" = "confirmed"): DemoState {
  const existing = state.matching!.requirements.find(r => r.workflowId === workflowId && r.stepId === stepId)
  return stage3Command(state, { type: "requirement.upsert", value: {
    id: existing?.id ?? `fixture-requirement-${workflowId}-${stepId}`, workflowId, stepId,
    title: `Fictional ${stepId} work`, responsibilityId, status, origin: "manual",
  } })
}

export function stage3Club(): DemoState {
  let state = initializeOrganizationMatching(seedDemo(undefined, "v2"))
  state = stage3References(state, references => ({ ...references, members: references.members.map((member): MatchingMember => {
    const qualifications: MatchingMember["qualifications"] = {}
    if (member.id === "maya" || member.id === "jordan") qualifications["campus-room-access"] = "confirmed"
    return { ...member, availability: "available", qualifications }
  }) }))
  for (const [id, title, qualification] of [
    ["fixture-space", "Campus space coordination", "campus-room-access"],
    ["fixture-firmware", "Firmware inspection", null],
    ["fixture-flight", "Flight demonstration approval", "flight-authorization"],
    ["fixture-renewal", "Organization renewal", null],
  ] as const) {
    state = stage3Command(state, { type: "responsibility.create", value: {
      id, title, description: `Own the fictional ${title.toLowerCase()} process.`, deliverable: "A checked and recorded outcome.",
      exclusions: [], requiredQualificationIds: qualification ? [qualification] : [], origin: "manual", sources: [{ kind: "manual", sourceId: "fictional-stage3-planning" }],
    } })
    state = stage3Command(state, { type: "responsibility.confirm", id })
  }
  // Maya qualifies by role and a direct link. The resolver must count her once.
  state = stage3Command(state, { type: "roleBinding.upsert", value: { id: "fixture-space-role", roleId: "r-fin", responsibilityId: "fixture-space", confirmed: true } })
  for (const [memberId, responsibilityId] of [["maya", "fixture-space"], ["jordan", "fixture-space"], ["sam", "fixture-space"], ["maya", "fixture-firmware"], ["jordan", "fixture-firmware"], ["sam", "fixture-flight"]])
    state = stage3Command(state, { type: "memberBinding.upsert", value: { id: `fixture-${responsibilityId}-${memberId}`, memberId, responsibilityId, decision: "include", confirmed: true } })
  state = stage3Command(state, { type: "policy.upsert", value: { id: "fixture-space-policy", responsibilityId: "fixture-space", primaryMemberId: "maya", backupMemberId: "jordan" } })
  state = stage3Requirement(state, "seo-event", "venue", "fixture-space")
  state = stage3Requirement(state, "seo-event", "plan", "fixture-firmware")
  return state
}

/** Uses the real human-review reducer path, with exactly one actual event and its graph. */
export function stage3CreateEvent(state: DemoState, changeId = "fixture-event", confirmation?: MatchingConfirmation): DemoState {
  let next = reducer(state, { type: "draftChanges", changeSet: { id: changeId, sentence: "Create a fictional robotics demonstration.", ops: [STAGE3_EVENT_OP], status: "pending", source: "Fictional manual event form" } })
  next = reducer(next, { type: "reviewChange", id: changeId, index: 0, decision: "applied", human: { date: STAGE3_EVENT_DATE, ...(confirmation ? { matching: confirmation } : {}) } })
  return next
}
