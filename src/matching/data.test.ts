import { describe, expect, it } from "vitest"
import type { MatchingCommand, MatchingMutationContext, MatchingReferences, MatchingState, MatchingStorage } from "./contracts"
import { MatchingError } from "./errors"
import { applyMatchingCommand, createEmptyMatchingState } from "./library"
import { decodeMatchingState, encodeMatchingState, loadMatchingState, matchingStorageKey, parseMatchingState, saveMatchingState } from "./repository"

const references: MatchingReferences = {
  organizationId: "fictional-robotics",
  roles: [{ id: "mechanical", title: "Mechanical Integration" }, { id: "software", title: "Embedded Systems" }],
  members: ["alba", "bo", "cleo"].map(id => ({ id, name: id, active: true, availability: "available", qualifications: { "lab-access": "confirmed" } })),
}
const time = "2026-11-17T01:00:00Z"
const responsibility = (id: string) => ({
  id, title: `Custom ${id}`, description: `Own the ${id} process.`, deliverable: `A completed ${id} record.`,
  exclusions: [], requiredQualificationIds: [], origin: "manual" as const, sources: [{ kind: "manual" as const, sourceId: "fictional-notes", note: "Fictional demonstration only." }],
})
function context(state: MatchingState, extra: Partial<MatchingMutationContext> = {}): MatchingMutationContext {
  return { operationId: `operation-${state.revision + 1}`, actorId: "alba", at: time, expectedRevision: state.revision, references, ...extra }
}
function setup() {
  let current = createEmptyMatchingState(references.organizationId)
  return {
    get state() { return current },
    run(command: MatchingCommand, extra: Partial<MatchingMutationContext> = {}) { current = applyMatchingCommand(current, command, context(current, extra)); return current },
    duty(id: string) { this.run({ type: "responsibility.create", value: responsibility(id) }); return this.run({ type: "responsibility.confirm", id }) },
    requirement(id: string, duty = "venue", workflowId = "meeting", stepId = "reserve") {
      return this.run({ type: "requirement.upsert", value: { id, workflowId, stepId, title: "Reserve a space", responsibilityId: duty, status: "confirmed", origin: "manual" } })
    },
    policy(id: string, duty = "venue", primaryMemberId = "alba", backupMemberId: string | null = "bo") {
      return this.run({ type: "policy.upsert", value: { id, responsibilityId: duty, primaryMemberId, backupMemberId } })
    },
    receipt(id: string, duty = "venue", workflowId = "meeting", stepId = "reserve", memberId = "alba") {
      const req = current.requirements.find(row => row.workflowId === workflowId && row.stepId === stepId)!
      return this.run({ type: "assignment.record", value: { id, taskId: "task-1", workflowId, stepId, responsibilityId: duty, memberId, method: "manual", status: "confirmed", requirementRevision: req.revision, responsibilityRevision: current.responsibilities.find(row => row.id === duty)!.revision, policyRevision: current.policies.find(row => row.responsibilityId === duty)?.revision ?? null } })
    },
  }
}
function storage() {
  const rows = new Map<string, string>()
  let writes = 0
  return { rows, get writes() { return writes }, getItem(key: string) { return rows.get(key) ?? null }, setItem(key: string, value: string) { writes++; rows.set(key, value) } }
}
function errorCode(fn: () => unknown, code: MatchingError["code"]) {
  try { fn(); throw new Error("Expected the operation to fail.") } catch (error) { expect(error).toBeInstanceOf(MatchingError); expect((error as MatchingError).code).toBe(code) }
}

describe("matching library: stable organization-owned records", () => {
  it("starts with a versioned isolated state and accepts custom responsibility names", () => {
    const world = setup()
    expect(world.state).toMatchObject({ schemaVersion: 1, revision: 0, updatedAt: null, organizationId: references.organizationId })
    const previous = structuredClone(world.state)
    world.run({ type: "responsibility.create", value: { ...responsibility("soldering"), title: "焊接与传感器装配" } })
    expect(previous.responsibilities).toEqual([])
    expect(world.state.responsibilities[0]).toMatchObject({ title: "焊接与传感器装配", revision: 1, status: "draft" })
    expect(world.state.events[0]).toMatchObject({ operationId: "operation-1", actorId: "alba", at: time, revision: 1, command: { type: "responsibility.create" } })
  })

  it("edits invalidate confirmation while ID, links, sources and input snapshots remain intact", () => {
    const world = setup(); world.duty("venue")
    world.run({ type: "roleBinding.upsert", value: { id: "role-duty", roleId: "mechanical", responsibilityId: "venue", confirmed: true } })
    const previous = world.state, serialized = JSON.stringify(previous)
    world.run({ type: "responsibility.update", id: "venue", patch: { title: "Lab space coordination" } })
    expect(JSON.stringify(previous)).toBe(serialized)
    expect(world.state.responsibilities[0]).toMatchObject({ id: "venue", title: "Lab space coordination", status: "draft", revision: 2 })
    expect(world.state.roleResponsibilities[0].responsibilityId).toBe("venue")
    expect(world.state.responsibilities[0].sources).toEqual(previous.responsibilities[0].sources)
    expect(world.state.events).toHaveLength(previous.events.length + 1)
  })

  it("repeat confirmation and unchanged edits are identity-preserving no-ops", () => {
    const world = setup(); world.duty("venue")
    const previous = world.state
    expect(world.run({ type: "responsibility.confirm", id: "venue" })).toBe(previous)
    expect(world.run({ type: "responsibility.update", id: "venue", patch: { title: previous.responsibilities[0].title } })).toBe(previous)
    expect(world.run({ type: "responsibility.update", id: "venue", patch: {} })).toBe(previous)
  })

  it("requires a meaningful description and deliverable before confirmation", () => {
    const world = setup()
    world.run({ type: "responsibility.create", value: { ...responsibility("venue"), deliverable: "" } })
    const previous = world.state
    errorCode(() => world.run({ type: "responsibility.confirm", id: "venue" }), "invalid_input")
    expect(world.state).toBe(previous)
  })

  it("rejects protected and unknown input fields instead of applying arbitrary patches", () => {
    const world = setup(); world.duty("venue")
    const previous = world.state
    for (const patch of [{ id: "different" }, { revision: 100 }, { status: "confirmed" }, { requiredQualificationIds: ["x", "x"] }]) {
      errorCode(() => world.run({ type: "responsibility.update", id: "venue", patch } as MatchingCommand), "invalid_input")
      expect(world.state).toBe(previous)
    }
    errorCode(() => world.run({ type: "responsibility.create", value: { ...responsibility("new"), status: "confirmed" } } as unknown as MatchingCommand), "invalid_input")
  })

  it("checks revisions before mutation and supports same-command transport replay", () => {
    const world = setup()
    const command: MatchingCommand = { type: "responsibility.create", value: responsibility("venue") }
    const before = world.state
    const firstContext = context(before, { operationId: "request-once" })
    world.run(command, firstContext)
    const after = world.state
    expect(world.run(command, { ...firstContext, at: "2026-11-17T01:01:00Z" })).toBe(after)
    errorCode(() => world.run({ ...command, value: responsibility("other") }, firstContext), "conflict")
    errorCode(() => world.run(command, { ...firstContext, actorId: "bo" }), "conflict")
    errorCode(() => world.run({ type: "responsibility.confirm", id: "venue" }, { expectedRevision: 0 }), "conflict")
    expect(world.state).toBe(after)
  })

  it("rejects foreign references and unknown current roles/members", () => {
    const world = setup(); world.duty("venue")
    const before = world.state
    errorCode(() => world.run({ type: "membership.upsert", value: { id: "m", roleId: "mechanical", memberId: "alba", confirmed: true } }, { references: { ...references, organizationId: "foreign" } }), "organization_mismatch")
    errorCode(() => world.run({ type: "membership.upsert", value: { id: "m", roleId: "ghost", memberId: "alba", confirmed: true } }), "not_found")
    errorCode(() => world.run({ type: "memberBinding.upsert", value: { id: "m", memberId: "ghost", responsibilityId: "venue", confirmed: true, decision: "include" } }), "not_found")
    expect(world.state).toBe(before)
  })

  it("supports same-role multiple members and one member in multiple roles, without duplicate pairs", () => {
    const world = setup()
    for (const [id, roleId, memberId] of [["one", "mechanical", "alba"], ["two", "mechanical", "bo"], ["three", "software", "alba"]])
      world.run({ type: "membership.upsert", value: { id, roleId, memberId, confirmed: true } })
    expect(world.state.memberships).toHaveLength(3)
    const before = world.state
    errorCode(() => world.run({ type: "membership.upsert", value: { id: "duplicate-pair", roleId: "mechanical", memberId: "alba", confirmed: true } }), "invalid_input")
    errorCode(() => world.run({ type: "membership.upsert", value: { id: "one", roleId: "mechanical", memberId: "cleo", confirmed: true } }), "invalid_input")
    expect(world.state).toBe(before)
  })

  it("lets confirmation and an inclusion/exclusion change without reusing its relationship identity", () => {
    const world = setup(); world.duty("venue"); world.duty("design")
    world.run({ type: "memberBinding.upsert", value: { id: "person-duty", memberId: "alba", responsibilityId: "venue", decision: "include", confirmed: false } })
    world.run({ type: "memberBinding.upsert", value: { id: "person-duty", memberId: "alba", responsibilityId: "venue", decision: "exclude", confirmed: true } })
    expect(world.state.memberResponsibilities).toHaveLength(1)
    expect(world.state.memberResponsibilities[0]).toMatchObject({ decision: "exclude", confirmed: true })
    errorCode(() => world.run({ type: "memberBinding.upsert", value: { id: "person-duty", memberId: "alba", responsibilityId: "design", decision: "include", confirmed: true } }), "invalid_input")
  })

  it("keys requirements by the full workflow and step tuple", () => {
    const world = setup(); world.duty("venue")
    world.requirement("r1", "venue", "a:b", "c")
    world.requirement("r2", "venue", "a", "b:c")
    expect(world.state.requirements).toHaveLength(2)
    const before = world.state
    errorCode(() => world.requirement("r3", "venue", "a:b", "c"), "invalid_input")
    errorCode(() => world.requirement("r1", "venue", "another", "c"), "invalid_input")
    expect(world.state).toBe(before)
  })

  it("requires responsibility for confirmed requirements and maintains requirement revisions", () => {
    const world = setup(); world.duty("venue"); world.requirement("r1")
    const old = world.state.requirements[0]
    const unchanged = world.state
    world.run({ type: "requirement.upsert", value: { id: old.id, workflowId: old.workflowId, stepId: old.stepId, title: old.title, responsibilityId: old.responsibilityId, status: old.status, origin: old.origin } })
    expect(world.state).toBe(unchanged)
    world.run({ type: "requirement.upsert", value: { id: old.id, workflowId: old.workflowId, stepId: old.stepId, title: "Different wording", responsibilityId: "venue", status: "draft", origin: "manual" } })
    expect(world.state.requirements[0].revision).toBe(old.revision + 1)
    errorCode(() => world.run({ type: "requirement.upsert", value: { id: "unmapped", workflowId: "meeting", stepId: "new", title: "Unknown work", responsibilityId: null, status: "confirmed", origin: "manual" } }), "invalid_input")
  })

  it("validates default and backup identities without pretending to verify external qualifications", () => {
    const world = setup(); world.duty("venue"); world.duty("design")
    world.policy("policy")
    const first = world.state
    world.policy("policy")
    expect(world.state).toBe(first)
    world.policy("policy", "venue", "bo", "cleo")
    expect(world.state.policies[0]).toMatchObject({ revision: 2, primaryMemberId: "bo", backupMemberId: "cleo" })
    for (const [primaryMemberId, backupMemberId] of [["alba", "alba"], [null, "bo"]])
      errorCode(() => world.run({ type: "policy.upsert", value: { id: "policy", responsibilityId: "venue", primaryMemberId, backupMemberId } }), "invalid_input")
    errorCode(() => world.policy("policy", "design"), "invalid_input")
    errorCode(() => world.policy("different-policy"), "invalid_input")
    errorCode(() => world.policy("new-policy", "design", "ghost"), "not_found")
  })
})

describe("matching library: archive, merge and immutable assignment history", () => {
  it("archives responsibilities without deleting configured work or receipts", () => {
    const world = setup(); world.duty("venue"); world.requirement("r"); world.receipt("assigned")
    const receipts = structuredClone(world.state.assignments)
    world.run({ type: "responsibility.archive", id: "venue" })
    expect(world.state.requirements).toHaveLength(1)
    expect(world.state.assignments).toEqual(receipts)
    expect(world.state.responsibilities[0]).toMatchObject({ status: "archived", revision: 2 })
    const before = world.state
    expect(world.run({ type: "responsibility.archive", id: "venue" })).toBe(before)
    errorCode(() => world.run({ type: "responsibility.confirm", id: "venue" }), "invalid_input")
    errorCode(() => world.run({ type: "responsibility.update", id: "venue", patch: { title: "Reopen" } }), "invalid_input")
  })

  it("merges aliases, reattaches configuration and requires review without rewriting assignment receipts", () => {
    const world = setup(); world.duty("venue"); world.duty("room")
    world.requirement("old-requirement"); world.requirement("target-requirement", "room", "competition", "reserve")
    world.policy("source-policy"); world.policy("target-policy", "room")
    world.run({ type: "roleBinding.upsert", value: { id: "source-binding", roleId: "mechanical", responsibilityId: "venue", confirmed: true } })
    world.run({ type: "roleBinding.upsert", value: { id: "target-binding", roleId: "mechanical", responsibilityId: "room", confirmed: false } })
    world.run({ type: "memberBinding.upsert", value: { id: "source-person", memberId: "alba", responsibilityId: "venue", decision: "include", confirmed: true } })
    world.receipt("before-merge")
    const before = world.state, receipts = structuredClone(before.assignments)
    world.run({ type: "responsibility.merge", sourceId: "venue", targetId: "room" })
    expect(before.responsibilities.find(row => row.id === "venue")!.status).toBe("confirmed")
    expect(world.state.responsibilities.find(row => row.id === "venue")).toMatchObject({ status: "archived", mergedIntoId: "room" })
    expect(world.state.responsibilities.find(row => row.id === "room")).toMatchObject({ status: "draft", revision: 2 })
    expect(world.state.requirements.every(row => row.responsibilityId === "room" && row.status === "draft" && row.revision === 2)).toBe(true)
    expect(world.state.roleResponsibilities).toEqual([{ id: "target-binding", roleId: "mechanical", responsibilityId: "room", confirmed: false }])
    expect(world.state.memberResponsibilities[0].responsibilityId).toBe("room")
    expect(world.state.policies).toEqual([{ id: "target-policy", responsibilityId: "room", primaryMemberId: "alba", backupMemberId: "bo", revision: 2 }])
    expect(world.state.assignments).toEqual(receipts)
    expect(decodeMatchingState(encodeMatchingState(world.state))).toEqual(world.state)
  })

  it("rejects the whole merge when configured default members conflict", () => {
    const world = setup(); world.duty("venue"); world.duty("room"); world.policy("p1"); world.policy("p2", "room", "bo", "cleo")
    const before = world.state, raw = JSON.stringify(before)
    errorCode(() => world.run({ type: "responsibility.merge", sourceId: "venue", targetId: "room" }), "merge_conflict")
    expect(world.state).toBe(before)
    expect(JSON.stringify(world.state)).toBe(raw)
  })

  it("rejects include/exclude merge conflicts even if one side is unconfirmed", () => {
    const world = setup(); world.duty("venue"); world.duty("room")
    world.run({ type: "memberBinding.upsert", value: { id: "m1", memberId: "alba", responsibilityId: "venue", decision: "include", confirmed: true } })
    world.run({ type: "memberBinding.upsert", value: { id: "m2", memberId: "alba", responsibilityId: "room", decision: "exclude", confirmed: false } })
    const before = world.state
    errorCode(() => world.run({ type: "responsibility.merge", sourceId: "venue", targetId: "room" }), "merge_conflict")
    expect(world.state).toBe(before)
  })

  it("keeps compound requirements unresolved through a merge", () => {
    const world = setup(); world.duty("venue"); world.duty("room")
    world.run({ type: "requirement.upsert", value: { id: "compound", workflowId: "meeting", stepId: "mixed", title: "Write and design", responsibilityId: "venue", status: "needs_split", origin: "manual" } })
    world.run({ type: "responsibility.merge", sourceId: "venue", targetId: "room" })
    expect(world.state.requirements[0].status).toBe("needs_split")
    errorCode(() => world.run({ type: "responsibility.merge", sourceId: "room", targetId: "room" }), "invalid_input")
  })

  it("appends receipts and checks exact requirement, duty and policy revisions", () => {
    const world = setup(); world.duty("venue"); world.requirement("r"); world.policy("p"); world.receipt("receipt-1")
    const original = structuredClone(world.state.assignments[0])
    world.receipt("receipt-2", "venue", "meeting", "reserve", "bo")
    expect(world.state.assignments[0]).toEqual(original)
    expect(world.state.assignments[1]).toMatchObject({ memberId: "bo", stateRevision: world.state.revision, actorId: "alba", at: time })
    errorCode(() => world.receipt("receipt-1"), "duplicate")
    const baseCommand = world.state.events.find(event => event.command.type === "assignment.record")!.command as Extract<MatchingCommand, { type: "assignment.record" }>
    for (const field of ["responsibilityRevision", "requirementRevision", "policyRevision"] as const)
      errorCode(() => world.run({ type: "assignment.record", value: { ...baseCommand.value, id: `stale-${field}`, [field]: 100 } }), "conflict")
    errorCode(() => world.run({ type: "assignment.record", value: { ...baseCommand.value, id: "wrong-flow", workflowId: "different" } }), "invalid_input")
  })
})

describe("matching repository: validate, preserve and protect snapshots", () => {
  it("round-trips data and accepts snapshots after external members have left", () => {
    const world = setup(); world.duty("venue"); world.requirement("r"); world.receipt("receipt")
    expect(decodeMatchingState(encodeMatchingState(world.state), references.organizationId)).toEqual(world.state)
    const read = parseMatchingState(world.state)
    read.responsibilities[0].title = "Only changed in returned clone"
    expect(world.state.responsibilities[0].title).not.toBe(read.responsibilities[0].title)
    // No current roster is required to preserve immutable historical member IDs.
    expect(parseMatchingState(world.state).assignments[0].memberId).toBe("alba")
  })

  it("uses an organization-encoded key and performs no writes on missing data", () => {
    const store = storage()
    const loaded = loadMatchingState(store, "robotics:one/two")
    expect(loaded).toMatchObject({ status: "empty", raw: null, state: { organizationId: "robotics:one/two", revision: 0 } })
    expect(matchingStorageKey("robotics:one/two")).toBe("platypus.matching.v1:robotics%3Aone%2Ftwo")
    expect(store.writes).toBe(0)
  })

  it.each([
    ["not-json", "invalid"],
    [JSON.stringify({ schemaVersion: 2 }), "unsupported"],
    [JSON.stringify({ ...createEmptyMatchingState("different-organization") }), "organization_mismatch"],
    [JSON.stringify({ ...createEmptyMatchingState(references.organizationId), extra: "not trusted" }), "invalid"],
  ])("preserves unreadable, unsupported and foreign raw snapshots (%s)", (raw, status) => {
    const store = storage(), key = matchingStorageKey(references.organizationId)
    store.rows.set(key, raw)
    expect(loadMatchingState(store, references.organizationId)).toMatchObject({ status, state: null, raw })
    expect(store.writes).toBe(0)
    expect(() => saveMatchingState(store, createEmptyMatchingState(references.organizationId), null)).toThrow(MatchingError)
    expect(store.rows.get(key)).toBe(raw)
  })

  it("surfaces read/write failures without falling back to another storage key", () => {
    const blocked: MatchingStorage = { getItem() { throw new Error("blocked") }, setItem() { throw new Error("blocked") } }
    expect(loadMatchingState(blocked, references.organizationId)).toMatchObject({ status: "unavailable", state: null, raw: null })
    errorCode(() => saveMatchingState(blocked, createEmptyMatchingState(references.organizationId), null), "storage_unavailable")
    const full: MatchingStorage = { getItem() { return null }, setItem() { throw new Error("quota") } }
    errorCode(() => saveMatchingState(full, createEmptyMatchingState(references.organizationId), null), "storage_unavailable")
  })

  it("protects newer saves from stale tabs and treats an exact retry as a no-write success", () => {
    const world = setup(), store = storage()
    world.duty("venue")
    saveMatchingState(store, world.state, null)
    const saved = world.state
    world.run({ type: "responsibility.update", id: "venue", patch: { title: "Updated after first save" } })
    saveMatchingState(store, world.state, saved.revision)
    const writes = store.writes
    saveMatchingState(store, world.state, saved.revision)
    expect(store.writes).toBe(writes)
    errorCode(() => saveMatchingState(store, saved, saved.revision), "conflict")
    errorCode(() => saveMatchingState(store, saved, world.state.revision), "conflict")
    expect(loadMatchingState(store, references.organizationId).state).toEqual(world.state)
  })

  it("requires explicit expected revision for existing storage, even if the data is equal", () => {
    const store = storage(), state = createEmptyMatchingState(references.organizationId)
    saveMatchingState(store, state, null)
    errorCode(() => saveMatchingState(store, state, null), "conflict")
    errorCode(() => saveMatchingState(storage(), state, 0), "conflict")
  })

  it("rejects broken internal references, aliases, duplicate pairs and impossible audit heads", () => {
    const world = setup(); world.duty("venue")
    const state = world.state
    const invalid = [
      { ...state, roleResponsibilities: [{ id: "broken", roleId: "mechanical", responsibilityId: "missing", confirmed: true }] },
      { ...state, responsibilities: [{ ...state.responsibilities[0], mergedIntoId: "venue", status: "archived" }] },
      { ...state, events: [state.events[1], state.events[0]] },
      { ...state, revision: 100 },
      { ...state, policies: [{ id: "p1", responsibilityId: "venue", primaryMemberId: "alba", backupMemberId: "alba", revision: 1 }] },
      { ...state, events: [...state.events, state.events[1]] },
      { ...state, responsibilities: [{ ...state.responsibilities[0], deliverable: "" }] },
      { ...state, requirements: [{ id: "unmapped", workflowId: "meeting", stepId: "reserve", title: "Unmapped", responsibilityId: null, status: "confirmed", origin: "manual", revision: 1 }] },
    ]
    for (const value of invalid) errorCode(() => parseMatchingState(value), "invalid_input")
  })

  it("rejects imported receipts that cite missing workflow steps or future requirement revisions", () => {
    const world = setup(); world.duty("venue"); world.requirement("r"); world.receipt("a")
    for (const patch of [{ workflowId: "not-this-workflow" }, { responsibilityRevision: 999 }, { requirementRevision: 999 }, { stateRevision: 999 }])
      errorCode(() => parseMatchingState({ ...world.state, assignments: [{ ...world.state.assignments[0], ...patch }] }), "invalid_input")
  })
})
