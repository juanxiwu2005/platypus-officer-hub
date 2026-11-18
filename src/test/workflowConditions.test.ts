import { describe, expect, it } from "vitest"
import type { Event, StepCond, StepTemplate, WorkflowBranch } from "../data/types"
import { seedDemo } from "../data/seed"
import { CONDITIONS, EVENT_STEPS, branchMatchesEvent, buildEventNodes, stepsFor } from "../engine/playbooks"
import { DEFAULT_WORKFLOW_BRANCHES, branchConditionLabel, branchConditions, conditionsOf, resolveBranches, scopeKey, validateBranchDefinitions } from "../engine/workflowBranches"

const branch = (patch: Partial<WorkflowBranch> = {}): WorkflowBranch => ({ id: "local-checks", title: "Local requirements", order: 12, side: "before_event", ...patch })
const event = (patch: Partial<Event> = {}): Event => ({ id: "conditions", name: "Fictional event", date: "2027-04-16", type: "social", headcount: 60, venue: "campus", food: "none", funding: "none", speaker: false, checks: {}, goalId: null, playbookId: "asu-event-v2", ...patch })
const step = (patch: Partial<StepTemplate> = {}): StepTemplate => ({ key: "local-step", title: "Local check", fn: "programs", phase: "prepare", estDays: 1, tier: "light", dependsOn: ["plan"], why: "Confirm local requirements.", source: "Club workflow", custom: true, placement: { branchId: "local-checks", order: 0 }, ...patch })
const includes = (ev: Event, definition: WorkflowBranch, item = step()) => stepsFor(ev, [...EVENT_STEPS, item], [definition]).some(candidate => candidate.key === item.key)
const invalid = (conditions: unknown) => branch({ conditions: conditions as StepCond[] })
const flags = [false, true]

describe("multiple workflow branch requirements", () => {
  it.each(flags.flatMap(speaker => flags.map(travel => ({ speaker, travel }))))("requires speaker=$speaker and travel=$travel together", ({ speaker, travel }) => {
    const definition = branch({ conditions: ["speaker", "travel"] })
    const ev = event({ speaker, checks: { travel } })
    expect(branchMatchesEvent(ev, definition)).toBe(speaker && travel)
    expect(includes(ev, definition)).toBe(speaker && travel)
  })

  it.each(flags.flatMap(speaker => flags.flatMap(travel => flags.map(rsvp => ({ speaker, travel, rsvp })))))("ANDs branch requirements and existing step scope: speaker=$speaker travel=$travel rsvp=$rsvp", ({ speaker, travel, rsvp }) => {
    const definition = branch({ conditions: ["speaker", "travel"] })
    const item = step({ cond: "rsvp" })
    expect(conditionsOf(item, [definition])).toEqual(["speaker", "travel", "rsvp"])
    expect(includes(event({ speaker, checks: { travel, rsvp } }), definition, item)).toBe(speaker && travel && rsvp)
  })

  it("keeps legacy single requirements readable and uses the explicit new list in preference", () => {
    const legacy = branch({ condition: "speaker" })
    expect(branchConditions(legacy)).toEqual(["speaker"])
    expect(includes(event(), legacy)).toBe(false)
    expect(includes(event({ speaker: true }), legacy)).toBe(true)
    const changed = { ...legacy, conditions: ["travel"] as StepCond[] }
    expect(branchConditions(changed)).toEqual(["travel"])
    expect(includes(event({ speaker: false, checks: { travel: true } }), changed)).toBe(true)
    expect(includes(event({ speaker: true, checks: { travel: false } }), changed)).toBe(false)
  })

  it("uses an explicit empty list for every event, clearing a legacy condition without removing step scope", () => {
    const definition = branch({ condition: "speaker", conditions: [] })
    expect(branchConditions(definition)).toEqual([])
    expect(branchConditionLabel(definition)).toBe("Every event")
    expect(includes(event(), definition)).toBe(true)
    expect(includes(event(), definition, step({ cond: "rsvp" }))).toBe(false)
    expect(branchConditions()).toEqual([])
    expect(branchConditionLabel()).toBe("Every event")
    expect(branchMatchesEvent(event())).toBe(true)
  })

  it("deduplicates selection order without mutating the stored list and uses order-independent scope keys", () => {
    const definition = branch({ conditions: ["speaker", "travel", "speaker"] })
    expect(branchConditions(definition)).toEqual(["speaker", "travel"])
    expect(definition.conditions).toEqual(["speaker", "travel", "speaker"])
    expect(validateBranchDefinitions([definition])).toBeNull()
    expect(branchConditionLabel(definition)).toBe("Guest speaker and Travel")
    expect(scopeKey(step(), [definition])).toBe(scopeKey(step(), [branch({ conditions: ["travel", "speaker"] })]))
  })

  it("keeps default single-condition branches unchanged and lets a saved explicit empty list override them", () => {
    const speaker = DEFAULT_WORKFLOW_BRANCHES.find(item => item.id === "speaker")!
    expect(branchConditions(speaker)).toEqual(["externalGuest"])
    expect(branchConditionLabel(speaker)).toBe("Speaker or partner")
    const resolved = resolveBranches([], [{ ...speaker, conditions: [] }])
    expect(branchConditions(resolved.find(item => item.id === "speaker"))).toEqual([])
    expect(branchConditions(speaker)).toEqual(["externalGuest"])
  })

  it("preserves all requirements through snapshots, serialization and node inheritance", () => {
    const definition = branch({ condition: "externalGuest", conditions: ["speaker", "travel"] })
    const item = step({ cond: "rsvp" }), raw = JSON.stringify({ branches: [definition], steps: [...EVENT_STEPS, item] })
    const restored = JSON.parse(raw) as { branches: WorkflowBranch[]; steps: StepTemplate[] }
    const before = JSON.stringify(restored)
    const cloned = resolveBranches(restored.steps, restored.branches)
    const inherited = step({ key: "local-next", placement: { branchId: item.placement!.branchId, order: 1 }, cond: item.cond })
    expect(conditionsOf(inherited, cloned)).toEqual(["speaker", "travel", "rsvp"])
    const ev = event({ speaker: true, checks: { travel: true, rsvp: true }, workflowBranches: cloned })
    const nodes = buildEventNodes(ev, seedDemo(undefined, "v2").roles, { steps: [...restored.steps, inherited] })
    expect(nodes.find(node => node.stepKey === inherited.key)).toMatchObject({ cond: "rsvp", placement: inherited.placement })
    cloned.find(candidate => candidate.id === definition.id)!.conditions!.push("access")
    expect(JSON.stringify(restored)).toBe(before)
    expect(definition.conditions).toEqual(["speaker", "travel"])
  })

  it("passes dependencies through an inactive multi-condition branch", () => {
    const definition = branch({ conditions: ["speaker", "travel"] }), item = step()
    const steps = [...EVENT_STEPS.map(candidate => candidate.key === "backup" ? { ...candidate, dependsOn: [item.key] } : candidate), item]
    const inactive = stepsFor(event({ speaker: true, checks: { travel: false } }), steps, [definition])
    expect(inactive.some(candidate => candidate.key === item.key)).toBe(false)
    expect(inactive.find(candidate => candidate.key === "backup")?.dependsOn).toEqual(["plan"])
    const active = stepsFor(event({ speaker: true, checks: { travel: true } }), steps, [definition])
    expect(active.find(candidate => candidate.key === "backup")?.dependsOn).toEqual([item.key])
    const keys = new Set(inactive.map(candidate => candidate.key))
    expect(inactive.every(candidate => candidate.dependsOn?.every(key => keys.has(key)) ?? true)).toBe(true)
  })
})

describe("requirements match the visible event checklist", () => {
  it("does not infer a checked funding requirement from a dues field", () => {
    const definition = branch({ conditions: ["funding", "travel"] })
    expect(includes(event({ funding: "dues", checks: { funding: false, travel: true } }), definition)).toBe(false)
    expect(includes(event({ funding: "dues", checks: { travel: true } }), definition)).toBe(false)
    expect(includes(event({ funding: "none", checks: { funding: true, travel: true } }), definition)).toBe(true)
  })

  it("does not infer outside food, onsite food, or school approval checkboxes from derived event facts", () => {
    const cases: { condition: StepCond; patch: Partial<Event> }[] = [
      { condition: "externalFood", patch: { food: "offsite", checks: { externalFood: false } } },
      { condition: "onsiteFood", patch: { food: "onsite", checks: { onsiteFood: false } } },
      { condition: "schoolApproval", patch: { headcount: 300, checks: { schoolApproval: false } } },
    ]
    for (const { condition, patch } of cases) {
      expect(CONDITIONS[condition](event(patch))).toBe(true)
      expect(includes(event(patch), branch({ conditions: [condition] }))).toBe(false)
      expect(includes(event(patch), branch({ condition }))).toBe(true)
      expect(includes(event(patch), branch({ conditions: [] }), step({ cond: condition }))).toBe(true)
    }
  })

  it("uses canonical food and speaker inputs instead of stale checklist copies", () => {
    const definition = branch({ conditions: ["speaker", "food"] })
    expect(includes(event({ speaker: true, food: "dining", checks: { speaker: false, food: false } }), definition)).toBe(true)
    expect(includes(event({ speaker: false, food: "none", checks: { speaker: true, food: true } }), definition)).toBe(false)
  })

  it("retains derived semantics for old events with no checklist map", () => {
    const ev = event({ checks: undefined, funding: "dues", food: "offsite" })
    expect(includes(ev, branch({ conditions: ["funding", "externalFood"] }))).toBe(true)
    expect(includes(ev, branch({ condition: "funding" }))).toBe(true)
  })
})

describe("invalid branch requirements never enable work", () => {
  it.each([null, "speaker", 1, {}, ["speaker", "unknown"], ["__proto__"], [false], [null], Array.from({ length: 1000 }, () => "speaker")])("rejects malformed requirements %j without broadening generation", value => {
    const definition = invalid(value), ev = event({ speaker: true, checks: { travel: true } })
    expect(validateBranchDefinitions([definition])).toBeTruthy()
    expect(branchConditions(definition)).not.toEqual([])
    expect(branchConditionLabel(definition)).toBe("Invalid requirements")
    expect(includes(ev, definition)).toBe(false)
  })

  it("validates only the authoritative list when an obsolete legacy condition remains", () => {
    const definition = branch({ condition: "unknown" as StepCond, conditions: [] })
    expect(validateBranchDefinitions([definition])).toBeNull()
    expect(branchConditions(definition)).toEqual([])
    expect(includes(event(), definition)).toBe(true)
    expect(includes(event({ speaker: true }), branch({ condition: "unknown" as StepCond }))).toBe(false)
  })
})
