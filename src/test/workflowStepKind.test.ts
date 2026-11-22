import { describe, expect, it } from "vitest"
import type { Event, StepTemplate, WorkflowBranch, WorkflowStepKind } from "../data/types"
import { seedDemo } from "../data/seed"
import { EVENT_STEPS, buildEventNodes, stepsFor } from "../engine/playbooks"
import { checkWorkflow, stepsAsNodes } from "../engine/workflow"
import { deletionReason } from "../engine/workflowPolicy"
import { workflowStepKind } from "../engine/workflowStepKind"

const roles = seedDemo(undefined, "v2").roles
const ev: Event = { id: "kind", name: "Fictional event", date: "2027-04-16", type: "social", headcount: 60, venue: "campus", food: "none", funding: "none", speaker: false, checks: {}, goalId: null, playbookId: "asu-event-v2" }

describe("workflow step categories", () => {
  it("preserves every original situation category, including required purchasing work with no predicate", () => {
    const oldKeys = ["partner", "speakerPacket", "travel", "partnerReview", "parking", "foodCompliance", "budgetRequest", "budgetApproval", "purchaseRequest", "purchaseApproval", "advisor", "access", "security", "eams", "permit", "alcohol", "drone", "schoolApproval", "rsvp"]
    for (const key of oldKeys) expect(workflowStepKind({ key })).toBe("situation")
    expect(workflowStepKind({ stepKey: "budgetRequest" })).toBe("situation")
    expect(deletionReason(EVENT_STEPS.find(item => item.key === "budgetRequest")!)).toBeTruthy()
  })

  it("uses explicit classification before old keys or conditions", () => {
    expect(workflowStepKind({ key: "partner", cond: "externalGuest", stepKind: "core" })).toBe("core")
    expect(workflowStepKind({ key: "plan", stepKind: "situation" })).toBe("situation")
    expect(deletionReason({ key: "plan" })).toBeTruthy()
    expect(deletionReason({ key: "local-core" })).toBeNull()
  })

  it("infers unclassified local work from the step or branch predicates without modifying them", () => {
    const branches: WorkflowBranch[] = [{ id: "local", title: "Local", order: 10, side: "before_event", conditions: ["speaker", "travel"] }]
    const item = { key: "local-step", placement: { branchId: "local", order: 0 } }, before = structuredClone({ branches, item })
    expect(workflowStepKind(item, branches)).toBe("situation")
    expect(workflowStepKind({ key: "local-step", cond: "access" })).toBe("situation")
    expect(workflowStepKind({ key: "local-step" })).toBe("core")
    expect(workflowStepKind({ key: "plan" })).toBe("core")
    expect({ branches, item }).toEqual(before)
  })

  it("retains a legacy core fallback when a branch explicitly clears an old condition", () => {
    const branches: WorkflowBranch[] = [{ id: "local", title: "Local", order: 10, side: "before_event", condition: "speaker", conditions: [] }]
    expect(workflowStepKind({ key: "local-step", placement: { branchId: "local", order: 0 } }, branches)).toBe("core")
  })

  it("never treats authored category as an intake predicate or deletion policy", () => {
    const partner = EVENT_STEPS.find(item => item.key === "partner")!
    const conditional = { ...partner, stepKind: "core" as const }
    const local: StepTemplate = { ...EVENT_STEPS[0], key: "local-situation", custom: true, stepKind: "situation" }
    const selected = stepsFor(ev, [...EVENT_STEPS.map(item => item.key === partner.key ? conditional : item), local])
    expect(selected.some(item => item.key === partner.key)).toBe(false)
    expect(selected.some(item => item.key === local.key)).toBe(true)
    expect(deletionReason(local)).toBeNull()
  })

  it("preserves authored metadata through serialization, the editor and generated tasks", () => {
    const steps = EVENT_STEPS.map(item => item.key === "plan" ? { ...item, stepKind: "situation" as const } : item.key === "partner" ? { ...item, stepKind: "core" as const } : item)
    const restored = JSON.parse(JSON.stringify(steps)) as StepTemplate[]
    const before = JSON.stringify(restored)
    expect(stepsAsNodes(restored).find(item => item.stepKey === "plan")?.stepKind).toBe("situation")
    const nodes = buildEventNodes({ ...ev, speaker: true }, roles, { steps: restored })
    expect(nodes.find(item => item.stepKey === "plan")?.stepKind).toBe("situation")
    expect(nodes.find(item => item.stepKey === "partner")?.stepKind).toBe("core")
    expect(JSON.stringify(restored)).toBe(before)
  })

  it("reads an unknown old category safely but refuses to save it", () => {
    const stepKind = "broken" as WorkflowStepKind
    expect(workflowStepKind({ key: "plan", stepKind })).toBe("core")
    expect(workflowStepKind({ key: "partner", stepKind })).toBe("situation")
    const steps = EVENT_STEPS.map(item => item.key === "plan" ? { ...item, stepKind } : item)
    expect(checkWorkflow(steps, roles).some(issue => issue.level === "blocked" && issue.key === "plan" && /step type/.test(issue.text))).toBe(true)
  })
})
