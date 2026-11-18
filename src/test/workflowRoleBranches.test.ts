import { describe, expect, it } from "vitest"
import type { Event, Role, StepTemplate, WorkflowBranch } from "../data/types"
import { seedDemo } from "../data/seed"
import { EVENT_STEPS, buildEventNodes } from "../engine/playbooks"
import { placementOf, scopeKey } from "../engine/workflowBranches"
import { reassignWorkflowStep } from "../engine/workflowRoleBranches"

const roles = seedDemo(undefined, "v2").roles
const fresh = () => structuredClone(EVENT_STEPS)
const edgeSnapshot = (steps: StepTemplate[]) => steps.map(item => ({ key: item.key, dependsOn: item.dependsOn }))
const event: Event = { id: "role-test", name: "Fictional event", date: "2027-04-16", type: "social", headcount: 60, venue: "campus", food: "none", funding: "none", speaker: false, checks: {}, goalId: null, playbookId: "asu-event-v2" }
const local = (patch: Partial<StepTemplate> = {}): StepTemplate => ({ key: "local-task", title: "Local task", fn: "finance", ownerRoleId: "r-fin", phase: "prepare", estDays: 3, tier: "medium", dependsOn: ["plan"], why: "Local instructions.", source: "Organization", custom: true, stepKind: "core", ...patch })
const definition = (patch: Partial<WorkflowBranch> = {}): WorkflowBranch => ({ id: "local", title: "Local", order: 10, side: "before_event", ...patch })
const get = (steps: StepTemplate[], key: string) => steps.find(item => item.key === key)!

describe("role-based workflow branches", () => {
  it("routes a new default role to its existing standard branch without rewriting any dependencies", () => {
    const steps = fresh(), before = structuredClone(steps)
    const result = reassignWorkflowStep(steps, undefined, roles, "budget", "r-mkt")
    expect(result.error).toBeUndefined()
    expect(get(result.steps, "budget")).toMatchObject({ ownerRoleId: "r-mkt", fn: "marketing", placement: { branchId: "marketing" } })
    expect(edgeSnapshot(result.steps)).toEqual(edgeSnapshot(before))
    expect(get(result.steps, "budget")).toEqual({ ...get(before, "budget"), ownerRoleId: "r-mkt", fn: "marketing", placement: get(result.steps, "budget").placement })
    expect(steps).toEqual(before)
    expect(result.steps.filter(item => item.key !== "budget")).toEqual(before.filter(item => item.key !== "budget"))
  })

  it("uses role identity rather than merging two distinct roles with the same function", () => {
    const second: Role = { id: "r-campaign", displayName: "Campaign chair", fn: "marketing", holderId: null }
    const team = [...roles, second], steps = fresh()
    const result = reassignWorkflowStep(steps, undefined, team, "budget", second.id)
    expect(result.error).toBeUndefined()
    const destination = result.branches.find(branch => branch.id === get(result.steps, "budget").placement?.branchId)!
    expect(destination).toMatchObject({ defaultRoleId: second.id, title: second.displayName, side: "before_event" })
    expect(destination.id).not.toBe("marketing")
    const repeated = reassignWorkflowStep(fresh(), undefined, team, "budget", second.id)
    expect(get(repeated.steps, "budget").placement?.branchId).toBe(destination.id)
    const next = reassignWorkflowStep(result.steps, result.branches, team, "quotes", second.id)
    expect(get(next.steps, "quotes").placement?.branchId).toBe(destination.id)
    expect(next.branches).toHaveLength(result.branches.length)
  })

  it("permits a vacant role without guessing a member and creates unclaimed tasks for that role", () => {
    const vacant = roles.map(role => role.id === "r-fin" ? { ...role, holderId: null } : role)
    const result = reassignWorkflowStep(fresh(), undefined, vacant, "marketingNeeds", "r-fin")
    expect(result.error).toBeUndefined()
    expect(get(result.steps, "marketingNeeds").placement?.branchId).toBe("finance")
    const node = buildEventNodes(event, vacant, { steps: result.steps, branches: result.branches }).find(item => item.stepKey === "marketingNeeds")!
    expect(node.ownerId).toBeNull()
    expect(node.status).toBe("unclaimed")
  })

  it("returns to the original standard branch and reuses a prior role branch", () => {
    const extra: Role = { id: "r-campaign", displayName: "Campaign chair", fn: "marketing", holderId: null }
    const team = [...roles, extra]
    const moved = reassignWorkflowStep(fresh(), undefined, team, "contentCreation", extra.id)
    const branchId = get(moved.steps, "contentCreation").placement?.branchId
    const back = reassignWorkflowStep(moved.steps, moved.branches, team, "contentCreation", "r-mkt")
    expect(get(back.steps, "contentCreation").placement?.branchId).toBe("marketing")
    const again = reassignWorkflowStep(back.steps, back.branches, team, "contentCreation", extra.id)
    expect(get(again.steps, "contentCreation").placement?.branchId).toBe(branchId)
    expect(again.branches).toHaveLength(moved.branches.length)
  })

  it("keeps structure on the main line while allowing its accountable role to change", () => {
    for (const key of ["finalcheck", "checkin", "headcount"]) {
      const steps = fresh(), result = reassignWorkflowStep(steps, undefined, roles, key, "r-fin")
      expect(result.error).toBeUndefined()
      expect(get(result.steps, key)).toMatchObject({ ownerRoleId: "r-fin", fn: "finance", placement: { branchId: "main" } })
      expect(edgeSnapshot(result.steps)).toEqual(edgeSnapshot(steps))
    }
  })

  it("routes close-out work only to an after-event branch", () => {
    const result = reassignWorkflowStep(fresh(), undefined, roles, "photoBackup", "r-fin")
    expect(result.error).toBeUndefined()
    const moved = get(result.steps, "photoBackup")
    expect(moved).toMatchObject({ phase: "close", placement: { branchId: "close-finance" } })
    expect(result.branches.find(branch => branch.id === moved.placement?.branchId)?.side).toBe("after_event")
  })

  it("keeps a conditional step's predicates and authored category when a role's existing branch is equivalent", () => {
    const steps = fresh().map(item => item.key === "partnerReview" ? { ...item, stepKind: "core" as const } : item)
    const result = reassignWorkflowStep(steps, undefined, roles, "partnerReview", "r-mkt")
    expect(result.error).toBeUndefined()
    const moved = get(result.steps, "partnerReview")
    expect(moved).toMatchObject({ cond: "externalGuest", stepKind: "core", placement: { branchId: "marketing" } })
    expect(scopeKey(moved, result.branches)).toBe(scopeKey(get(steps, "partnerReview")))
    expect(edgeSnapshot(result.steps)).toEqual(edgeSnapshot(steps))
  })

  it("copies a legacy branch predicate when no existing role branch has the same scope", () => {
    const source = definition({ condition: "externalFood" })
    const item = local({ placement: { branchId: source.id, order: 0 } })
    const steps = [...fresh(), item]
    const result = reassignWorkflowStep(steps, [source], roles, item.key, "r-mkt")
    expect(result.error).toBeUndefined()
    const moved = get(result.steps, item.key), destination = result.branches.find(branch => branch.id === moved.placement?.branchId)!
    expect(destination.condition).toBe("externalFood")
    expect(destination.conditions).toBeUndefined()
    expect(scopeKey(moved, result.branches)).toBe(scopeKey(item, [source]))
    const node = buildEventNodes({ ...event, food: "offsite" }, roles, { steps: result.steps, branches: result.branches }).find(candidate => candidate.stepKey === item.key)
    expect(node).toBeTruthy()
  })

  it("preserves AND checklist provenance instead of broadening a branch to derived rules", () => {
    const source = definition({ condition: "speaker", conditions: ["externalFood", "travel"] })
    const item = local({ placement: { branchId: source.id, order: 0 }, cond: "rsvp", stepKind: "situation" })
    const before = structuredClone({ source, item }), steps = [...fresh(), item]
    const result = reassignWorkflowStep(steps, [source], roles, item.key, "r-mkt")
    expect(result.error).toBeUndefined()
    const moved = get(result.steps, item.key), destination = result.branches.find(branch => branch.id === moved.placement?.branchId)!
    expect(destination.conditions).toEqual(["externalFood", "travel"])
    expect(scopeKey(moved, result.branches)).toBe(scopeKey(item, [source]))
    const inactive = buildEventNodes({ ...event, food: "offsite", checks: { externalFood: false, travel: true, rsvp: true } }, roles, { steps: result.steps, branches: result.branches })
    expect(inactive.some(candidate => candidate.stepKey === item.key)).toBe(false)
    destination.conditions!.push("access")
    expect({ source, item }).toEqual(before)
  })

  it("uses a unique stable ID when the role branch's existing scope is different", () => {
    const source = definition({ condition: "externalFood" })
    const item = local({ placement: { branchId: source.id, order: 0 } })
    const occupied = definition({ id: "role-r-mkt-before", title: "Marketing", defaultRoleId: "r-mkt", conditions: [] })
    const result = reassignWorkflowStep([...fresh(), item], [source, occupied], roles, item.key, "r-mkt")
    expect(result.error).toBeUndefined()
    expect(get(result.steps, item.key).placement?.branchId).toBe("role-r-mkt-before-2")
    expect(new Set(result.branches.map(branch => branch.id)).size).toBe(result.branches.length)
  })

  it("does not silently add work to a branch occupied by a different custom role", () => {
    const campaign: Role = { id: "r-campaign", displayName: "Campaign chair", fn: "marketing", holderId: null }
    const source = definition({ defaultRoleId: "r-mkt" })
    const other = local({ key: "other-role", placement: { branchId: source.id, order: 0 }, ownerRoleId: campaign.id, fn: "marketing" })
    const result = reassignWorkflowStep([...fresh(), other], [source], [...roles, campaign], "budget", "r-mkt")
    expect(result.error).toBeUndefined()
    expect(get(result.steps, "budget").placement?.branchId).toBe("marketing")
    expect(get(result.steps, other.key).placement?.branchId).toBe(source.id)
  })

  it("rejects unknown roles, advisors and corrupt branch definitions without changing the source", () => {
    const steps = fresh(), branches = [definition()], before = structuredClone({ steps, branches })
    const advisor: Role = { id: "advisor", displayName: "Advisor", fn: "advisor", holderId: null }
    for (const [key, roleId] of [["missing", "r-fin"], ["budget", "missing"], ["budget", advisor.id]]) {
      const result = reassignWorkflowStep(steps, branches, [...roles, advisor], key, roleId)
      expect(result.error).toBeTruthy()
      expect(result.steps).toBe(steps)
      expect(result.branches).toBe(branches)
    }
    const bad = [definition({ conditions: null as unknown as [] })]
    expect(reassignWorkflowStep(steps, bad, roles, "budget", "r-mkt").error).toBeTruthy()
    expect({ steps, branches }).toEqual(before)
  })

  it("makes an implicit default role explicit without moving or reordering an unchanged assignment", () => {
    const steps = fresh(), result = reassignWorkflowStep(steps, undefined, roles, "budget", "r-fin")
    expect(result.error).toBeUndefined()
    expect(get(result.steps, "budget")).toMatchObject({ ownerRoleId: "r-fin", fn: "finance" })
    expect(get(result.steps, "budget").placement).toEqual(get(steps, "budget").placement)
    expect(edgeSnapshot(result.steps)).toEqual(edgeSnapshot(steps))
    expect(placementOf(get(result.steps, "budget")).branchId).toBe("finance")
  })
})
