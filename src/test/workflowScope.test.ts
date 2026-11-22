import { describe, expect, it } from "vitest"
import type { Event, StepTemplate, WorkflowBranch } from "../data/types"
import { seedDemo } from "../data/seed"
import { EVENT_STEPS, buildEventNodes, calibratedStep, stepsFor } from "../engine/playbooks"
import { checkWorkflow, presetSteps, removeStep, stepsAsNodes } from "../engine/workflow"
import { DEFAULT_WORKFLOW_BRANCHES, conditionsOf, placementOf, resolveBranches, validateBranchDefinitions } from "../engine/workflowBranches"
import { CORE_EVENT_STEP_KEYS, deletionReason } from "../engine/workflowPolicy"

const base = seedDemo(undefined, "v2")
const event = (patch: Partial<Event> = {}): Event => ({ id: "scope", name: "Fictional event", date: "2027-04-16", type: "social", headcount: 60, venue: "campus", food: "none", funding: "none", speaker: false, checks: {}, goalId: null, playbookId: "asu-event-v2", ...patch })
const localStep = (patch: Partial<StepTemplate> = {}): StepTemplate => ({ key: "local-step", title: "Local check", fn: "programs", phase: "prepare", estDays: 1, tier: "light", why: "A local check.", source: "Club workflow", custom: true, ...patch })
const keys = (ev: Event, steps: StepTemplate[], branches?: WorkflowBranch[]) => stepsFor(ev, steps, branches).map(step => step.key)
const blocked = (steps: StepTemplate[], branches?: WorkflowBranch[]) => checkWorkflow(steps, base.roles, undefined, branches).filter(issue => issue.level === "blocked")

describe("workflow branch compatibility and scope", () => {
  it("keeps explicit branch membership separate from roles and legacy key defaults", () => {
    expect(placementOf(EVENT_STEPS.find(step => step.key === "speakerPacket")!)).toEqual({ branchId: "speaker", order: 1 })
    expect(placementOf({ key: "speakerPacket", placement: { branchId: "custom-lane", order: -2 } })).toEqual({ branchId: "custom-lane", order: -2 })
    expect(placementOf(localStep())).toEqual({ branchId: "legacy-before", order: 0 })
    expect(placementOf(localStep({ phase: "close" }))).toEqual({ branchId: "legacy-after", order: 0 })
    expect(placementOf({ id: "old:local-step", stepKey: null, phase: "prepare" }).branchId).toBe("legacy-before")
  })

  it("never infers an old custom step's condition from its speaker neighbor", () => {
    const custom = localStep({ dependsOn: ["speakerPacket"] })
    const steps = [...EVENT_STEPS, custom]
    expect(conditionsOf(custom)).toEqual([])
    expect(keys(event(), steps)).toContain("local-step")
    expect(resolveBranches(steps).find(branch => branch.id === "legacy-before")?.condition).toBeUndefined()
  })

  it("filters newly placed speaker work for both speaker and partner intake without leaving ghost dependencies", () => {
    const custom = localStep({ placement: { branchId: "speaker", order: 1.5 }, dependsOn: ["speakerPacket"] })
    const steps = [...EVENT_STEPS.map(step => step.key === "travel" ? { ...step, dependsOn: [custom.key] } : step), custom]
    expect(keys(event(), steps)).not.toContain(custom.key)
    expect(keys(event({ speaker: true }), steps)).toContain(custom.key)
    expect(keys(event({ checks: { partner: true } }), steps)).toContain(custom.key)
    const included = stepsFor(event(), steps), ids = new Set(included.map(step => step.key))
    expect(included.every(step => step.dependsOn?.every(id => ids.has(id)) ?? true)).toBe(true)
  })

  it("keeps food and RSVP node conditions inside their always-on branches", () => {
    const food = localStep({ key: "food-check", cond: "externalFood", placement: { branchId: "finance", order: 1.5 } })
    const rsvp = localStep({ key: "rsvp-check", cond: "rsvp", phase: "marketing", placement: { branchId: "marketing", order: 3.5 } })
    const steps = [...EVENT_STEPS, food, rsvp]
    expect(keys(event(), steps)).toEqual(expect.arrayContaining(["budget", "quotes", "content"]))
    expect(keys(event(), steps)).not.toContain(food.key)
    expect(keys(event(), steps)).not.toContain(rsvp.key)
    expect(keys(event({ food: "offsite" }), steps)).toContain(food.key)
    expect(keys(event({ food: "offsite" }), steps)).not.toContain(rsvp.key)
    expect(keys(event({ checks: { rsvp: true } }), steps)).toContain(rsvp.key)
    expect(keys(event({ checks: { rsvp: true } }), steps)).not.toContain(food.key)
  })

  it("ANDs branch and individual scope and resolves skipped dependencies", () => {
    const branches: WorkflowBranch[] = [{ id: "speaker-access", title: "Speaker access", side: "before_event", order: 10, condition: "externalGuest" }]
    const custom = localStep({ placement: { branchId: "speaker-access", order: 0 }, cond: "access", dependsOn: ["plan"] })
    const steps = [...EVENT_STEPS.map(step => step.key === "backup" ? { ...step, dependsOn: [custom.key] } : step), custom]
    expect(keys(event({ speaker: true }), steps, branches)).not.toContain(custom.key)
    expect(keys(event({ checks: { access: true } }), steps, branches)).not.toContain(custom.key)
    expect(keys(event({ speaker: true, checks: { access: true } }), steps, branches)).toContain(custom.key)
    expect(stepsFor(event(), steps, branches).find(step => step.key === "backup")?.dependsOn).toEqual(["plan"])
  })

  it("copies creation metadata without mutating templates or default definitions", () => {
    const branches: WorkflowBranch[] = [{ id: "custom-lane", title: "Local", side: "before_event", order: 10 }]
    const custom = localStep({ placement: { branchId: "custom-lane", order: 4 }, startPolicy: "effort", cond: "rsvp" })
    const steps = [...EVENT_STEPS, custom], before = structuredClone(steps)
    const nodes = buildEventNodes(event({ checks: { rsvp: true }, workflowBranches: branches }), base.roles, { steps })
    const node = nodes.find(item => item.stepKey === custom.key)!
    expect(node).toMatchObject({ placement: custom.placement, startPolicy: "effort", cond: "rsvp" })
    node.placement!.order = 99
    expect(steps).toEqual(before)
    expect(stepsAsNodes([custom])[0]).toMatchObject({ placement: custom.placement, startPolicy: "effort", cond: "rsvp" })
    const resolved = resolveBranches(steps, branches)
    resolved[0].title = "Changed copy"
    expect(DEFAULT_WORKFLOW_BRANCHES[0].title).toBe("Event lead")
  })
})

describe("workflow lifecycle protection", () => {
  it("protects every generated core step and Full Check before mutation and validation", () => {
    for (const key of CORE_EVENT_STEP_KEYS) {
      const steps = presetSteps(), step = steps.find(item => item.key === key)!
      expect(deletionReason(step)).toBeTruthy()
      expect(removeStep(steps, key)).toBe(steps)
      expect(blocked(steps.filter(item => item.key !== key)).some(issue => issue.key === key)).toBe(true)
    }
  })

  it("does not mislabel organization standards as school rules, and keeps custom deletion reconnecting dependencies", () => {
    expect(deletionReason(EVENT_STEPS.find(step => step.key === "finalcheck")!)).toMatch(/connects/)
    expect(deletionReason(EVENT_STEPS.find(step => step.key === "photoBackup")!)).not.toMatch(/ASU/)
    const custom = localStep({ dependsOn: ["plan"] })
    const steps = [...EVENT_STEPS.map(step => step.key === "backup" ? { ...step, dependsOn: [custom.key] } : step), custom]
    expect(removeStep(steps, custom.key).find(step => step.key === "backup")?.dependsOn).toEqual(["plan"])
    expect(deletionReason({ id: "__start__" })).toMatch(/station/)
    expect(deletionReason({ status: "done" })).toMatch(/already done/)
  })

  it("rejects attempts to hide core or ASU work in a conditional branch", () => {
    const branches: WorkflowBranch[] = [{ id: "local-rsvp", title: "RSVP tasks", side: "before_event", order: 10, condition: "rsvp" }]
    expect(blocked(EVENT_STEPS.map(step => step.key === "budget" ? { ...step, placement: { branchId: "local-rsvp", order: 0 } } : step), branches).some(issue => issue.key === "budget")).toBe(true)
    expect(blocked(EVENT_STEPS.map(step => step.key === "foodCompliance" ? { ...step, placement: { branchId: "local-rsvp", order: 0 } } : step), branches).some(issue => issue.key === "foodCompliance")).toBe(true)
    expect(blocked(EVENT_STEPS.map(step => step.key === "finalcheck" ? { ...step, placement: { branchId: "finance", order: 0 } } : step)).some(issue => issue.key === "finalcheck")).toBe(true)
  })

  it("rejects unknown branch references and mismatched sides while accepting unchanged standards", () => {
    expect(blocked(presetSteps())).toEqual([])
    expect(blocked([...EVENT_STEPS, localStep({ placement: { branchId: "missing", order: 0 } })]).some(issue => issue.key === "local-step")).toBe(true)
    expect(blocked([...EVENT_STEPS, localStep({ placement: { branchId: "close-event", order: 0 } })]).some(issue => issue.key === "local-step")).toBe(true)
    expect(validateBranchDefinitions([{ id: "main", title: "Bad", order: 0, side: "before_event" }])).toMatch(/unique valid/)
  })

  it("does not overwrite a deliberately entered old-default effort during calibration", () => {
    const legacy = { ...EVENT_STEPS.find(step => step.key === "marketingNeeds")!, estDays: 1, timing: undefined, startPolicy: "effort" as const }
    expect(calibratedStep(legacy)).toMatchObject({ estDays: 1, startPolicy: "effort", timing: { startDays: 60, dueDays: 58 } })
    expect(calibratedStep({ ...legacy, startPolicy: undefined }).estDays).toBe(2)
  })
})
