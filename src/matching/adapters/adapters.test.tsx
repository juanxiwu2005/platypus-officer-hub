import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { seedDemo } from "../../data/seed"
import { saveWorkflow } from "../../data/settings"
import type { DemoState, Node } from "../../data/types"
import { buildEventNodes, EVENT_STEPS } from "../../engine/playbooks"
import type { MatchingCommand, MatchingState } from "../contracts"
import { applyMatchingCommand } from "../library"
import { createSetupDocument } from "../setupWorkspace"
import {
  canClaimMatchingTask, eventMatchingWorkflowId, matchingModeEnabled, organizationMatchingReferences,
  prepareMatchingNodes, recordChangedMatchingOwners, STANDARD_MATCHING_STEPS,
  standardRequirementCommands, validOrganizationMatching, WorkflowResponsibilityMap,
} from "./index"

const at = "2026-11-16T18:00:00.000Z"
function command(state: DemoState, value: MatchingCommand): DemoState {
  return { ...state, matching: applyMatchingCommand(state.matching!, value, { operationId: crypto.randomUUID(), actorId: state.viewerId, at, expectedRevision: state.matching!.revision, references: organizationMatchingReferences(state) }) }
}
function world(): DemoState {
  let state = seedDemo()
  const references = { organizationId: state.org.id, roles: state.roles.map(r => ({ id: r.id, title: r.displayName })), members: state.people.map(p => ({ id: p.id, name: p.name, active: true, availability: "available" as const, qualifications: { "room-account": "confirmed" as const } })) }
  const document = createSetupDocument({ references, memberships: [], contextKey: "fictional-adapter-tests" })
  const { matching, references: _refs, ...setup } = document
  state = { ...state, org: { ...state.org, matchingWorkspaceId: document.id, settings: { ...state.org.settings, matchingMode: "responsibilities" } }, matching,
    matchingContext: { setup, overrides: [], memberSettings: Object.fromEntries(references.members.map(m => [m.id, { active: true, availability: m.availability, qualifications: m.qualifications }])) } }
  for (const value of [
    { type: "responsibility.create", value: { id: "room", title: "Custom space requests", description: "Submit a permitted reservation.", deliverable: "A confirmed reservation.", exclusions: ["Budget approval"], requiredQualificationIds: ["room-account"], origin: "manual", sources: [{ kind: "manual", sourceId: "fictional-discussion" }] } },
    { type: "responsibility.confirm", id: "room" },
    { type: "roleBinding.upsert", value: { id: "role-room", roleId: "r-events", responsibilityId: "room", confirmed: true } },
    { type: "membership.upsert", value: { id: "maya-room", roleId: "r-events", memberId: "maya", confirmed: true } },
    { type: "membership.upsert", value: { id: "sam-room", roleId: "r-events", memberId: "sam", confirmed: true } },
    { type: "memberBinding.upsert", value: { id: "direct-maya", memberId: "maya", responsibilityId: "room", decision: "include", confirmed: true } },
    { type: "requirement.upsert", value: { id: "venue-required", workflowId: "seo-event", stepId: "venue", title: "Book room", responsibilityId: "room", status: "confirmed", origin: "manual" } },
    { type: "policy.upsert", value: { id: "room-policy", responsibilityId: "room", primaryMemberId: "maya", backupMemberId: "sam" } },
  ] satisfies MatchingCommand[]) state = command(state, value)
  return state
}
function node(id = "adapter-event:venue", stepKey: string | null = "venue"): Node {
  return { ...seedDemo().nodes[0], id, stepKey, eventId: stepKey ? "adapter-event" : null, title: "A fictional test task", ownerId: "alex", status: "accepted", acceptedOn: "2026-10-31" }
}
const choose = (state: DemoState, memberId: string | null, key = "venue", manualOverride = false) => ({ revision: state.matching!.revision, choices: { [key]: { memberId, ...(manualOverride ? { manualOverride } : {}) } } })
function assigned(state = world()) {
  const prepared = prepareMatchingNodes(state, [node()], { confirmation: choose(state, "maya"), at })
  return { ...state, ...prepared, nodes: prepared.nodes }
}
afterEach(cleanup)

describe("organization matching adapter: no implicit legacy executor", () => {
  it("keeps legacy generation unchanged while unassigned generation keeps schedule and RACI metadata", () => {
    const state = seedDemo(), event = state.events[0]
    const legacy = buildEventNodes(event, state.roles, { steps: EVENT_STEPS })
    const unassigned = buildEventNodes(event, state.roles, { steps: EVENT_STEPS, ownerMode: "unassigned" })
    expect(unassigned).toHaveLength(legacy.length)
    unassigned.forEach((entry, i) => expect(entry).toEqual({ ...legacy[i], ownerId: null, status: "unclaimed", acceptedOn: null }))
    expect(prepareMatchingNodes(state, legacy).nodes).toBe(legacy)
    expect(matchingModeEnabled(state)).toBe(false)
  })

  it("turns a qualified default into a suggestion only until a person confirms", () => {
    const state = world(), before = JSON.stringify(state)
    const prepared = prepareMatchingNodes(state, [node()])
    expect(prepared.nodes[0]).toMatchObject({ ownerId: null, status: "unclaimed", acceptedOn: null, matching: { responsibilityId: "room", reason: "primary_candidate" } })
    expect(prepared.matching).toBeUndefined()
    expect(JSON.stringify(state)).toBe(before)
  })

  it("records confirmed assignment separately from the teammate accepting the task", () => {
    const state = world(), next = prepareMatchingNodes(state, [node()], { confirmation: choose(state, "maya"), at })
    expect(next.nodes[0]).toMatchObject({ ownerId: "maya", status: "unclaimed", acceptedOn: null })
    expect(next.matching!.assignments.at(-1)).toMatchObject({ memberId: "maya", status: "confirmed", method: "default", at })
    expect(next.matchingContext!.setup.revision).toBe(state.matchingContext!.setup.revision + 1)
    expect(next.matchingContext!.setup.audit.at(-1)!.kind).toBe("commands")
    const mine = { ...state, viewerId: "maya" }
    expect(prepareMatchingNodes(mine, [node()], { confirmation: choose(mine, "maya"), at }).nodes[0]).toMatchObject({ ownerId: "maya", status: "accepted", acceptedOn: state.today })
  })

  it("suggests the backup without assigning, then records it only after explicit confirmation", () => {
    const state = world(); state.matchingContext!.memberSettings.maya.availability = "unavailable"
    expect(prepareMatchingNodes(state, [node()]).nodes[0]).toMatchObject({ ownerId: null, matching: { reason: "backup_requires_confirmation" } })
    const next = prepareMatchingNodes(state, [node()], { confirmation: choose(state, "sam"), at })
    expect(next.matching!.assignments.at(-1)!.method).toBe("backup")
    expect(next.nodes[0].status).toBe("unclaimed")
  })

  it("checks the input revision once for a batch, not against revisions generated by its own first receipt", () => {
    let state = world()
    state = command(state, { type: "requirement.upsert", value: { id: "registry-required", workflowId: "seo-event", stepId: "registry", title: "Registry", responsibilityId: "room", status: "confirmed", origin: "manual" } })
    const next = prepareMatchingNodes(state, [node(), node("adapter-event:registry", "registry")], { confirmation: { revision: state.matching!.revision, choices: { venue: { memberId: "maya" }, registry: { memberId: "sam" } } }, at })
    expect(next.matching!.assignments).toHaveLength(2)
    expect(next.nodes.map(row => row.ownerId)).toEqual(["maya", "sam"])
    expect(next.matchingContext!.setup.revision).toBe(state.matchingContext!.setup.revision + 1)
  })

  it("rejects a stale or malformed confirmation atomically without using its legacy owner", () => {
    const state = world(), before = JSON.stringify(state)
    expect(() => prepareMatchingNodes(state, [node()], { confirmation: { ...choose(state, "maya"), revision: state.matching!.revision - 1 } })).toThrow(/changed/)
    expect(() => prepareMatchingNodes(state, [node()], { confirmation: choose(state, "maya", "wrong-step") })).toThrow(/does not match/)
    expect(() => prepareMatchingNodes(state, [node()], { confirmation: choose(state, "alex") })).toThrow(/qualified/)
    expect(JSON.stringify(state)).toBe(before)
  })

  it("does not publish a first valid receipt when a later choice in the same creation group fails", () => {
    let state = world()
    state = command(state, { type: "requirement.upsert", value: { id: "registry-group", workflowId: "seo-event", stepId: "registry", title: "Registry", responsibilityId: "room", status: "confirmed", origin: "manual" } })
    const before = JSON.stringify(state)
    expect(() => prepareMatchingNodes(state, [node(), node("adapter-event:registry", "registry")], { confirmation: { revision: state.matching!.revision, choices: { venue: { memberId: "maya" }, registry: { memberId: "alex" } } }, at })).toThrow(/qualified/)
    expect(JSON.stringify(state)).toBe(before)
    expect(state.matching!.assignments).toHaveLength(0)
  })

  it.each(["qualification_unknown", "no_available_candidates", "multiple_candidates", "requirement_missing", "compound_requirement"])("keeps %s unresolved rather than choosing the first role", reason => {
    let state = world()
    if (reason === "qualification_unknown") for (const person of ["maya", "sam"]) state.matchingContext!.memberSettings[person].qualifications = {}
    if (reason === "no_available_candidates") for (const person of ["maya", "sam"]) state.matchingContext!.memberSettings[person].availability = "unavailable"
    if (reason === "multiple_candidates") state = command(state, { type: "policy.upsert", value: { id: "room-policy", responsibilityId: "room", primaryMemberId: null, backupMemberId: null } })
    if (reason === "requirement_missing") state = { ...state, matching: { ...state.matching!, requirements: [] } }
    if (reason === "compound_requirement") {
      const { revision: _revision, ...value } = state.matching!.requirements[0]
      state = command(state, { type: "requirement.upsert", value: { ...value, status: "needs_split" } })
    }
    const prepared = prepareMatchingNodes(state, [node()])
    expect(prepared.nodes[0]).toMatchObject({ ownerId: null, matching: { reason } })
  })

  it("fails closed for corrupt or future configuration while the mode remains explicitly enabled", () => {
    const state = world()
    state.matching = { ...state.matching!, schemaVersion: 99 } as unknown as MatchingState
    expect(matchingModeEnabled(state)).toBe(true)
    expect(validOrganizationMatching(state)).toBeNull()
    expect(prepareMatchingNodes(state, [node()]).nodes[0]).toMatchObject({ ownerId: null, matching: { reason: "invalid_reference" } })
    expect(state.matching.schemaVersion).toBe(99)
    expect(() => prepareMatchingNodes(state, [node()], { confirmation: choose(state, "maya") })).toThrow()
  })

  it("never promotes former or incoming members through a local eligibility checkbox", () => {
    const state = world()
    state.people = state.people.map(p => p.id === "maya" ? { ...p, leftOn: state.today } : p.id === "sam" ? { ...p, incomingFor: "r-events" } : p)
    expect(organizationMatchingReferences(state).members.filter(p => ["maya", "sam"].includes(p.id)).every(p => !p.active)).toBe(true)
    expect(() => prepareMatchingNodes(state, [node()], { confirmation: choose(state, "maya", "venue", true) })).toThrow(/current/)
  })
})

describe("one-task links, exceptions and ownership history", () => {
  it("links a standalone task only to its chosen responsibility and confirms one candidate once", () => {
    const state = world(), entry = node("standalone-test", null)
    const next = prepareMatchingNodes(state, [entry], { workflowId: "club-event", responsibilityIds: { [entry.id]: "room" }, confirmation: choose(state, "maya", entry.id), at })
    expect(next.nodes[0].matching).toMatchObject({ workflowId: "standalone", stepId: entry.id, responsibilityId: "room" })
    expect(next.matching!.requirements.find(row => row.workflowId === "standalone")).toMatchObject({ stepId: entry.id, responsibilityId: "room", status: "confirmed" })
    expect(next.matching!.assignments).toHaveLength(1)
    expect(next.matching!.requirements.find(row => row.id === "venue-required")).toEqual(state.matching!.requirements[0])
  })

  it("preserves an explicitly relinked event task identity and gives a node-specific choice priority", () => {
    let state = world()
    state = command(state, { type: "requirement.upsert", value: { id: "single-task-link", workflowId: "task:adapter-event:venue", stepId: "work", title: "One task", responsibilityId: "room", status: "confirmed", origin: "manual" } })
    const entry = { ...node(), matching: { workflowId: "task:adapter-event:venue", stepId: "work", responsibilityId: "room", reason: "multiple_candidates" as const } }
    const next = prepareMatchingNodes(state, [entry], { confirmation: { revision: state.matching!.revision, choices: { [entry.id]: { memberId: "maya" }, venue: { memberId: "sam" } } }, at })
    expect(next.nodes[0]).toMatchObject({ ownerId: "maya", matching: { workflowId: "task:adapter-event:venue", stepId: "work" } })
    expect(next.matching!.assignments.at(-1)).toMatchObject({ workflowId: "task:adapter-event:venue", stepId: "work" })
  })

  it("keeps a one-task manual exception visible without granting the responsibility globally", () => {
    const state = world(), next = prepareMatchingNodes(state, [node()], { confirmation: choose(state, "alex", "venue", true), at })
    expect(next.nodes[0]).toMatchObject({ ownerId: "alex", status: "accepted", matching: { reason: "manual_override", responsibilityId: "room" } })
    expect(next.matching!.assignments).toHaveLength(0)
    expect(next.matchingContext!.overrides).toHaveLength(1)
    expect(next.matching!.memberResponsibilities).toEqual(state.matching!.memberResponsibilities)
    expect(canClaimMatchingTask({ ...state, ...next, nodes: next.nodes }, next.nodes[0], "alex")).toBe(true)
  })

  it("permits an explicit unlinked manual exception but does not invent a confirmed responsibility", () => {
    const state = world(), entry = node("unlinked-task", null)
    const next = prepareMatchingNodes(state, [entry], { confirmation: { revision: state.matching!.revision, choices: { [entry.id]: { memberId: "maya", manualOverride: true, responsibilityId: null } } }, at })
    expect(next.nodes[0].matching).toMatchObject({ responsibilityId: null, reason: "manual_override" })
    expect(next.matching!.responsibilities).toEqual(state.matching!.responsibilities)
    expect(next.matching!.assignments).toHaveLength(0)
    expect(next.matchingContext!.overrides[0]).toMatchObject({ taskId: entry.id, memberId: "maya", responsibilityId: null })
  })

  it("audits a manual owner change while disabled, retaining every prior receipt", () => {
    const before = assigned(), oldReceipts = structuredClone(before.matching!.assignments)
    const after = { ...before, org: { ...before.org, settings: { ...before.org.settings, matchingMode: "legacy" as const } }, nodes: before.nodes.map(n => ({ ...n, ownerId: "sam" })) }
    const result = recordChangedMatchingOwners(before, after, "alex", at)
    expect(result.nodes[0].ownerId).toBe("sam")
    expect(result.matching!.assignments.slice(0, oldReceipts.length)).toEqual(oldReceipts)
    expect(result.matching!.assignments.at(-1)).toMatchObject({ memberId: "sam", method: "manual" })
  })

  it("records explicit unassignment without deleting history or silently assigning a replacement", () => {
    const before = assigned(), after = { ...before, nodes: before.nodes.map(n => ({ ...n, ownerId: null, status: "unclaimed" as const })) }
    const result = recordChangedMatchingOwners(before, after, "alex", at)
    expect(result.matchingContext!.overrides.at(-1)).toMatchObject({ taskId: before.nodes[0].id, memberId: null })
    expect(result.matching!.assignments).toEqual(before.matching!.assignments)
    expect(result.nodes[0].ownerId).toBeNull()
  })

  it("does not duplicate a newly prepared receipt or manual exception during central reconciliation", () => {
    const before = assigned()
    for (const choice of [{ memberId: "sam" }, { memberId: "alex", manualOverride: true }]) {
      const prepared = prepareMatchingNodes(before, before.nodes, { confirmation: { revision: before.matching!.revision, choices: { [before.nodes[0].id]: choice } }, at })
      const after = { ...before, ...prepared, nodes: prepared.nodes }
      expect(recordChangedMatchingOwners(before, after, "alex", at)).toBe(after)
    }
  })

  it("leaves historical legacy nodes alone until an explicit change creates a new decision", () => {
    const state = world(), after = { ...state, org: { ...state.org, settings: { ...state.org.settings, matchingMode: "legacy" as const } } }
    expect(recordChangedMatchingOwners(state, after, "alex", at)).toBe(after)
    const moved = { ...after, nodes: after.nodes.map((n, i) => i ? n : { ...n, ownerId: "sam" }) }
    expect(recordChangedMatchingOwners(after, moved, "alex", at)).toBe(moved)
  })

  it("refuses a legacy editor's invalid owner value rather than legitimizing it as a manual exception", () => {
    const before = assigned()
    expect(() => recordChangedMatchingOwners(before, { ...before, nodes: before.nodes.map(n => ({ ...n, ownerId: "missing-person" })) }, "alex", at)).toThrow(/current/)
    expect(before.nodes[0].ownerId).toBe("maya")
  })

  it("does not borrow the newly selected custom workflow when reassigning an old unlinked standard-event node", () => {
    let before = world()
    const original = before.events[0]
    expect(original.playbookId).toBe("seo-event")
    const switched = saveWorkflow(before, [...EVENT_STEPS, { ...EVENT_STEPS[0], key: "robot-check", title: "Fictional robot check" }])
    expect(switched).not.toBe(before)
    expect(eventMatchingWorkflowId(switched)).toBe("club-event")
    before = command(switched, { type: "requirement.upsert", value: { id: "custom-room", workflowId: "club-event", stepId: "venue", title: "Custom room", responsibilityId: "room", status: "confirmed", origin: "manual" } })
    const legacy = { ...node(), id: `${original.id}:venue`, eventId: original.id }
    before = { ...before, nodes: [legacy] }
    const result = recordChangedMatchingOwners(before, { ...before, nodes: [{ ...legacy, ownerId: "sam" }] }, "alex", at)
    expect(result.nodes[0]).toMatchObject({ ownerId: "sam", matching: { workflowId: "seo-event", stepId: "venue", responsibilityId: null, reason: "manual_override" } })
    expect(result.matching!.assignments).toHaveLength(0)
    expect(result.matchingContext!.overrides).toHaveLength(1)
    expect(result.matchingContext!.overrides[0]).toMatchObject({ memberId: "sam", responsibilityId: null })
    expect(result.matching!.requirements).toEqual(before.matching!.requirements)
  })

  it("uses a per-task namespace for unknown event provenance instead of the current workflow", () => {
    const state = world(), legacy = { ...node(), eventId: "event-no-longer-present" }
    const before = { ...state, nodes: [legacy] }
    const result = recordChangedMatchingOwners(before, { ...before, nodes: [{ ...legacy, ownerId: "maya" }] }, "alex", at)
    expect(result.nodes[0].matching).toEqual({ workflowId: `task:${legacy.id}`, stepId: "work", responsibilityId: null, reason: "manual_override" })
    expect(result.matching!.assignments).toHaveLength(0)
    expect(result.matchingContext!.overrides[0].responsibilityId).toBeNull()
  })

  it("retains an existing standard-workflow matching basis when the organization's current template switches", () => {
    const original = assigned()
    const before = saveWorkflow(original, [...EVENT_STEPS, { ...EVENT_STEPS[0], key: "robot-check", title: "Fictional robot check" }])
    expect(eventMatchingWorkflowId(before)).toBe("club-event")
    const result = recordChangedMatchingOwners(before, { ...before, nodes: before.nodes.map(row => ({ ...row, ownerId: "sam" })) }, "alex", at)
    expect(result.nodes[0].matching).toMatchObject({ workflowId: "seo-event", stepId: "venue", responsibilityId: "room", reason: "manual_assignment_preserved" })
    expect(result.matching!.assignments.at(-1)).toMatchObject({ workflowId: "seo-event", stepId: "venue", memberId: "sam", method: "manual" })
    expect(result.matchingContext!.overrides).toHaveLength(0)
  })

  it("does not fill a previously explicit empty responsibility from a template that was later completed", () => {
    const state = world(), entry = { ...node(), matching: { workflowId: "seo-event", stepId: "venue", responsibilityId: null, reason: "responsibility_missing" as const } }
    const before = { ...state, nodes: [entry] }
    const result = recordChangedMatchingOwners(before, { ...before, nodes: [{ ...entry, ownerId: "sam" }] }, "alex", at)
    expect(result.nodes[0].matching!.responsibilityId).toBeNull()
    expect(result.matching!.assignments).toHaveLength(0)
    expect(result.matchingContext!.overrides[0].responsibilityId).toBeNull()
  })
})

describe("claim checks preserve qualification and confirmed assignment boundaries", () => {
  it("allows a normal assigned owner to claim, then blocks unknown qualifications or changed responsibility semantics", () => {
    const state = assigned(), entry = state.nodes[0]
    expect(canClaimMatchingTask(state, entry, "maya")).toBe(true)
    expect(canClaimMatchingTask(state, entry, "sam")).toBe(false)
    const unknown = structuredClone(state); unknown.matchingContext!.memberSettings.maya.qualifications = {}
    expect(canClaimMatchingTask(unknown, entry, "maya")).toBe(false)
    let changed = command(state, { type: "responsibility.update", id: "room", patch: { description: "A newly expanded scope." } })
    changed = command(changed, { type: "responsibility.confirm", id: "room" })
    expect(canClaimMatchingTask(changed, entry, "maya")).toBe(false)
  })

  it("limits unassigned matching work to eligible candidates and leaves old legacy claim rules intact", () => {
    const state = world(), entry = prepareMatchingNodes(state, [node()]).nodes[0]
    expect(canClaimMatchingTask(state, entry, "maya")).toBe(true)
    expect(canClaimMatchingTask(state, entry, "alex")).toBe(false)
    const noDuty = { ...entry, matching: { ...entry.matching!, responsibilityId: null } }
    expect(canClaimMatchingTask(state, noDuty, "maya")).toBe(false)
    expect(canClaimMatchingTask(seedDemo(), node(), "maya")).toBe(true)
  })

  it("does not let corrupt context metadata turn an ordinary assigned owner into a manual exception", () => {
    const state = assigned(), entry = { ...state.nodes[0], matching: { ...state.nodes[0].matching!, reason: "manual_override" as const } }
    state.matchingContext!.overrides = [{ taskId: entry.id, memberId: "maya" }] as unknown as NonNullable<DemoState["matchingContext"]>["overrides"]
    expect(validOrganizationMatching(state)).toBeNull()
    expect(canClaimMatchingTask(state, entry, "maya")).toBe(false)
  })
})

describe("standard step coverage and human mapping", () => {
  it("covers exactly all 46 step keys, including explicit compound markers and source boundaries", () => {
    expect(STANDARD_MATCHING_STEPS).toHaveLength(46)
    expect(new Set(STANDARD_MATCHING_STEPS.map(row => row.stepId))).toEqual(new Set(EVENT_STEPS.map(row => row.key)))
    expect(STANDARD_MATCHING_STEPS.every(row => row.description.length > 35 && row.source)).toBe(true)
    expect(STANDARD_MATCHING_STEPS.filter(row => row.status === "needs_split").map(row => row.stepId)).toContain("contentCreation")
    expect(STANDARD_MATCHING_STEPS.find(row => row.stepId === "reminder")!.description).toContain("does not configure")
  })

  it("initializes only missing tuples, preserving user links and keeping another workflow independent", () => {
    let state = world()
    const commands = standardRequirementCommands(state.matching!)
    expect(commands).toHaveLength(45)
    for (const value of commands) state = command(state, value)
    expect(state.matching!.requirements.find(row => row.id === "venue-required")!.responsibilityId).toBe("room")
    expect(standardRequirementCommands(state.matching!)).toHaveLength(0)
    expect(standardRequirementCommands(state.matching!, "club-event")).toHaveLength(46)
    expect(state.matching!.requirements.filter(row => row.id !== "venue-required").every(row => row.responsibilityId === null && row.status !== "confirmed")).toBe(true)
    expect(eventMatchingWorkflowId({ ...state, org: { ...state.org, eventWorkflow: { steps: EVENT_STEPS.slice(0, 2), updatedOn: state.today, summary: "Fictional custom workflow" } } })).toBe("club-event")
  })

  it("renders editable standard/custom mappings without assigning owners or requesting AI", () => {
    const state = world(), onCommand = vi.fn()
    render(<WorkflowResponsibilityMap state={state} onCommand={onCommand} />)
    fireEvent.click(screen.getByText("Book Room & Layout", { selector: "summary" }))
    const row = screen.getByText("Book Room & Layout", { selector: "summary" }).closest("details")!
    fireEvent.change(within(row).getByLabelText("Review outcome"), { target: { value: "draft" } })
    fireEvent.click(within(row).getByRole("button", { name: "Save workflow link" }))
    expect(onCommand).toHaveBeenCalledWith(expect.objectContaining({ type: "requirement.upsert", value: expect.objectContaining({ workflowId: "seo-event", stepId: "venue", status: "draft" }) }))
  })
})
