import { describe, expect, it } from "vitest"
import { reducer } from "../data/store"
import { newObjects } from "../data/changeReview"
import { buildEventNodes } from "../engine/playbooks"
import { seedDemo } from "../data/seed"
import { getMatchingCandidates, resolveMatchingAssignment } from "./resolve"
import { organizationMatchingReferences } from "./adapters"
import { stage3Club, stage3Command, stage3CreateEvent, stage3References, stage3Requirement, STAGE3_EVENT_DATE, STAGE3_EVENT_OP, STAGE3_ROBOT_WORKFLOW } from "./stage3Fixtures"

describe("stage 3: actual event creation uses confirmed responsibility decisions", () => {
  it("keeps the existing graph untouched and makes new unconfirmed suggestions unassigned rather than invoking a role fallback", () => {
    const state = stage3Club(), previous = structuredClone(state.nodes)
    const next = stage3CreateEvent(state)
    expect(next.events).toHaveLength(state.events.length + 1)
    expect(next.nodes.filter(n => state.nodes.some(old => old.id === n.id))).toEqual(previous)
    const added = next.nodes.filter(n => n.eventId === "fixture-event:0")
    expect(added.length).toBeGreaterThan(20)
    expect(added.every(n => n.ownerId === null && n.status === "unclaimed" && n.acceptedOn === null)).toBe(true)
    expect(added.find(n => n.stepKey === "venue")?.matching).toMatchObject({ workflowId: "seo-event", responsibilityId: "fixture-space", reason: "primary_candidate" })
    expect(added.find(n => n.stepKey === "plan")?.matching?.reason).toBe("multiple_candidates")
    expect(next.matching!.assignments).toEqual([])
  })

  it("confirms the displayed primary exactly once and leaves a different member's task awaiting their claim", () => {
    const state = stage3Club()
    const next = stage3CreateEvent(state, "confirmed-primary", { revision: state.matching!.revision, choices: { venue: { memberId: "maya" } } })
    const node = next.nodes.find(n => n.id === "confirmed-primary:0:venue")!
    expect(node).toMatchObject({ ownerId: "maya", status: "unclaimed", acceptedOn: null })
    expect(next.matching!.assignments.filter(a => a.taskId === node.id)).toHaveLength(1)
    expect(next.matching!.assignments.find(a => a.taskId === node.id)).toMatchObject({ memberId: "maya", status: "confirmed", method: "default" })
    const repeated = reducer(next, { type: "reviewChange", id: "confirmed-primary", index: 0, decision: "applied", human: { date: STAGE3_EVENT_DATE, matching: { revision: state.matching!.revision, choices: { venue: { memberId: "maya" } } } } })
    expect(repeated).toBe(next)
  })

  it("requires an explicit backup choice when the default person becomes unavailable", () => {
    const state = stage3References(stage3Club(), references => ({ ...references, members: references.members.map(m => m.id === "maya" ? { ...m, availability: "unavailable" } : m) }))
    const suggested = stage3CreateEvent(state, "backup-suggestion")
    expect(suggested.nodes.find(n => n.id === "backup-suggestion:0:venue")).toMatchObject({ ownerId: null, matching: { reason: "backup_requires_confirmation" } })
    const confirmed = stage3CreateEvent(state, "backup-confirmed", { revision: state.matching!.revision, choices: { venue: { memberId: "jordan" } } })
    expect(confirmed.nodes.find(n => n.id === "backup-confirmed:0:venue")).toMatchObject({ ownerId: "jordan", status: "unclaimed" })
    expect(confirmed.matching!.assignments.find(a => a.taskId === "backup-confirmed:0:venue")?.method).toBe("backup")
  })

  it("does not count one member twice or turn an unknown external qualification into eligibility", () => {
    const state = stage3Club(), candidates = getMatchingCandidates(state.matching!, organizationMatchingReferences(state), "fixture-space")
    expect(candidates.filter(c => c.memberId === "maya")).toHaveLength(1)
    expect(candidates.find(c => c.memberId === "sam")).toMatchObject({ eligibility: "unknown", reasons: ["qualification_unknown"] })
    const linked = stage3Requirement(state, "seo-event", "drone", "fixture-flight")
    const result = resolveMatchingAssignment(linked.matching!, organizationMatchingReferences(linked), { taskId: "fictional-flight-task", workflowId: "seo-event", stepId: "drone" })
    expect(result).toMatchObject({ ownerId: null, suggestedOwnerId: null, reason: "qualification_unknown" })
  })

  it("rejects stale confirmation of a whole group, rather than partly assigning from an outdated preview", () => {
    const state = stage3Club(), stale = state.matching!.revision
    const changed = stage3Command(state, { type: "policy.upsert", value: { id: "fixture-space-policy", responsibilityId: "fixture-space", primaryMemberId: "jordan", backupMemberId: "maya" } })
    const next = stage3CreateEvent(changed, "stale-event", { revision: stale, choices: { venue: { memberId: "maya" }, plan: { memberId: "jordan" } } })
    expect(next.events).toEqual(changed.events)
    expect(next.nodes).toEqual(changed.nodes)
    expect(next.matching!.assignments).toEqual(changed.matching!.assignments)
  })

  it("accepts two decisions from one preview revision as one group without mistaking the first receipt for an external conflict", () => {
    const state = stage3Club()
    const next = stage3CreateEvent(state, "two-decisions", { revision: state.matching!.revision, choices: { venue: { memberId: "maya" }, plan: { memberId: "jordan" } } })
    expect(next.nodes.find(n => n.id === "two-decisions:0:venue")!.ownerId).toBe("maya")
    expect(next.nodes.find(n => n.id === "two-decisions:0:plan")!.ownerId).toBe("jordan")
    expect(next.matching!.assignments.filter(a => a.taskId.startsWith("two-decisions:0:"))).toHaveLength(2)
  })

  it("refuses confirmation of an unknown qualification unless a human explicitly chooses a one-task exception", () => {
    const state = stage3Club()
    const next = stage3CreateEvent(state, "unqualified-choice", { revision: state.matching!.revision, choices: { venue: { memberId: "sam" } } })
    expect(next.events).toEqual(state.events)
    expect(next.nodes).toEqual(state.nodes)
    expect(next.matching!.assignments).toEqual([])
  })

  it("reuses the same organization duty in a second actual custom template without taking its legacy ownerRoleId", () => {
    let state = stage3Club()
    state = reducer(state, { type: "saveWorkflow", steps: STAGE3_ROBOT_WORKFLOW })
    state = stage3Requirement(state, "club-event", "robot-demo", "fixture-space")
    const next = stage3CreateEvent(state, "robot-showcase", { revision: state.matching!.revision, choices: { "robot-demo": { memberId: "maya" } } })
    const added = next.nodes.filter(n => n.eventId === "robot-showcase:0")
    expect(added.filter(n => n.stepKey === "robot-demo")).toHaveLength(1)
    expect(added.find(n => n.stepKey === "robot-demo")).toMatchObject({ title: "Prepare the robot demonstration", ownerId: "maya", matching: { workflowId: "club-event", stepId: "robot-demo", responsibilityId: "fixture-space" } })
    expect(next.matching!.requirements.find(r => r.workflowId === "seo-event" && r.stepId === "venue")!.responsibilityId).toBe("fixture-space")
  })

  it("preserves date-engine inputs instead of adding AI or matching dates", () => {
    const state = stage3Club(), objects = newObjects(state, STAGE3_EVENT_OP, "date-check", { date: STAGE3_EVENT_DATE })
    const event = objects.events!.find(e => e.id === "date-check")!, nodes = objects.nodes!.filter(n => n.eventId === event.id)
    const normal = buildEventNodes(event, state.roles)
    for (const node of nodes) {
      const old = normal.find(n => n.stepKey === node.stepKey)!
      expect({ anchor: node.anchor, timing: node.timing, estDays: node.estDays, dependsOn: node.dependsOn, ruleIds: node.ruleIds }).toEqual({ anchor: old.anchor, timing: old.timing, estDays: old.estDays, dependsOn: old.dependsOn, ruleIds: old.ruleIds })
    }
  })
})

describe("stage 3: actual standalone tasks and historical owners", () => {
  it("uses one task in a real 12-person organization even when many custom positions share a duty", () => {
    const seed = seedDemo(undefined, "v2")
    const extra = Array.from({ length: 7 }, (_, index) => ({ ...seed.people[1], id: `fictional-builder-${index + 1}`, roleId: `r-fictional-builder-${index + 1}`, name: `Fictional Builder ${index + 1}`, email: `builder-${index + 1}@example.org` }))
    let state = stage3Club({ ...seed, people: [...seed.people, ...extra], roles: [...seed.roles, ...extra.map(person => ({ id: person.roleId, holderId: person.id, displayName: `Fabrication Specialist ${person.id.at(-1)}`, fn: "programs" as const, reportsToId: "r-pres" }))] })
    state = stage3References(state, references => ({ ...references, members: references.members.map(member => ({ ...member, qualifications: { "campus-room-access": "confirmed" } })) }))
    for (const person of extra) state = stage3Command(state, { type: "memberBinding.upsert", value: { id: `direct-${person.id}`, memberId: person.id, responsibilityId: "fixture-space", decision: "include", confirmed: true } })
    expect(state.people).toHaveLength(12)
    expect(getMatchingCandidates(state.matching!, organizationMatchingReferences(state), "fixture-space").filter(c => c.eligibility === "eligible").length).toBeGreaterThan(2)
    const next = reducer(state, { type: "createTasks", id: "large-team-task", sentence: "Reserve the robot lab.", tasks: [{ title: "Reserve the robot lab", ownerId: "maya", responsibilityId: "fixture-space", eventId: null }], matchingRevision: state.matching!.revision, date: STAGE3_EVENT_DATE, buffered: false })
    expect(next.nodes).toHaveLength(state.nodes.length + 1)
    expect(next.nodes.find(n => n.id === "large-team-task:0")!.ownerId).toBe("maya")
    expect(next.matching!.assignments.filter(a => a.taskId === "large-team-task:0")).toHaveLength(1)
  })

  it("creates one qualified task, records the duty and requires the selected member to claim", () => {
    const state = stage3Club()
    const next = reducer(state, { type: "createTasks", id: "qualified-task", sentence: "Reserve the lab.", tasks: [{ title: "Reserve the lab", ownerId: "maya", eventId: null, responsibilityId: "fixture-space" }], date: STAGE3_EVENT_DATE, buffered: false, matchingRevision: state.matching!.revision })
    const added = next.nodes.filter(n => n.id.startsWith("qualified-task:"))
    expect(added).toHaveLength(1)
    expect(added[0]).toMatchObject({ ownerId: "maya", status: "unclaimed", matching: { workflowId: "standalone", responsibilityId: "fixture-space" } })
    const other = reducer({ ...next, viewerId: "sam" }, { type: "claimTask", nodeId: added[0].id })
    expect(other.nodes.find(n => n.id === added[0].id)!.status).toBe("unclaimed")
    const claimed = reducer({ ...next, viewerId: "maya" }, { type: "claimTask", nodeId: added[0].id })
    expect(claimed.nodes.find(n => n.id === added[0].id)).toMatchObject({ ownerId: "maya", status: "accepted" })
  })

  it("does not turn a non-leader's missing duty and owner into an automatic self-assignment", () => {
    const state = { ...stage3Club(), viewerId: "sam" }
    const next = reducer(state, { type: "createTasks", id: "missing-duty", sentence: "Check an unclassified process.", tasks: [{ title: "Check an unclassified process", ownerId: null, eventId: null }], date: STAGE3_EVENT_DATE, buffered: false })
    const node = next.nodes.find(n => n.id === "missing-duty:0")!
    expect(node).toMatchObject({ ownerId: null, status: "unclaimed" })
    expect(node.matching?.responsibilityId).toBeNull()
    const attemptedClaim = reducer(next, { type: "claimTask", nodeId: node.id })
    expect(attemptedClaim.nodes.find(n => n.id === node.id)!.ownerId).toBeNull()
  })

  it("records an explicit one-task manual exception without granting a global duty or concealing the gap", () => {
    const state = stage3Club()
    const next = reducer(state, { type: "createTasks", id: "manual-exception", sentence: "Prepare a one-off record.", tasks: [{ title: "Prepare a one-off record", ownerId: "sam", eventId: null, manualOverride: true }], date: STAGE3_EVENT_DATE, buffered: false, matchingRevision: state.matching!.revision })
    expect(next.nodes.find(n => n.id === "manual-exception:0")).toMatchObject({ ownerId: "sam", status: "unclaimed", matching: { responsibilityId: null, reason: "manual_override" } })
    expect(next.matchingContext!.overrides.at(-1)).toMatchObject({ taskId: "manual-exception:0", memberId: "sam", responsibilityId: null, actorId: "alex" })
    expect(next.matching!.memberResponsibilities).toEqual(state.matching!.memberResponsibilities)
  })

  it("keeps a confirmed owner and receipt after defaults change, then appends an explicit real owner change", () => {
    let state = stage3CreateEvent(stage3Club(), "history-event")
    state = reducer(state, { type: "updateNode", id: "history-event:0:venue", patch: { ownerId: "maya" } })
    const receipt = structuredClone(state.matching!.assignments.find(a => a.taskId === "history-event:0:venue")!)
    expect(receipt).toMatchObject({ memberId: "maya", status: "confirmed" })
    state = stage3Command(state, { type: "policy.upsert", value: { id: "fixture-space-policy", responsibilityId: "fixture-space", primaryMemberId: "jordan", backupMemberId: "maya" } })
    expect(state.nodes.find(n => n.id === "history-event:0:venue")!.ownerId).toBe("maya")
    expect(state.matching!.assignments.find(a => a.id === receipt.id)).toEqual(receipt)
    const next = reducer(state, { type: "updateNode", id: "history-event:0:venue", patch: { ownerId: "jordan" } })
    expect(next.nodes.find(n => n.id === "history-event:0:venue")!.ownerId).toBe("jordan")
    expect(next.nodes.find(n => n.id === "history-event:0:venue")!.status).toBe("unclaimed")
    expect(next.matching!.assignments.find(a => a.id === receipt.id)).toEqual(receipt)
    expect(next.matching!.assignments.filter(a => a.taskId === "history-event:0:venue")).toHaveLength(2)
  })

  it("retains prior receipts when a human clears an owner and does not restore them on a later default change", () => {
    const original = stage3Club()
    let state = stage3CreateEvent(original, "clear-owner", { revision: original.matching!.revision, choices: { venue: { memberId: "maya" } } })
    const receipts = structuredClone(state.matching!.assignments)
    state = reducer(state, { type: "updateNode", id: "clear-owner:0:venue", patch: { ownerId: null } })
    expect(state.matching!.assignments).toEqual(receipts)
    expect(state.matchingContext!.overrides.at(-1)).toMatchObject({ taskId: "clear-owner:0:venue", memberId: null })
    state = stage3Command(state, { type: "policy.upsert", value: { id: "fixture-space-policy", responsibilityId: "fixture-space", primaryMemberId: "jordan", backupMemberId: "maya" } })
    expect(state.nodes.find(n => n.id === "clear-owner:0:venue")!.ownerId).toBeNull()
  })

  it("keeps budget-controlled completion blocked even when a matching task has an owner", () => {
    const original = stage3Club(), controlled = original.nodes.find(n => n.stepKey === "budgetRequest")!
    const state = { ...original, viewerId: "maya", nodes: original.nodes.map(n => n.id === controlled.id ? { ...n, ownerId: "maya", status: "accepted" as const } : n) }
    const next = reducer(state, { type: "replyTask", nodeId: controlled.id, reply: "done" })
    expect(next.nodes.find(n => n.id === controlled.id)!.status).toBe("accepted")
  })
})
