import type { Role, RoleFunction, StepTemplate, WorkflowBranch } from "../data/types"
import { roleFor } from "./playbooks"
import { checkWorkflow, ownerOfStep } from "./workflow"
import { branchOf, placementOf, resolveBranches, scopeKey, validateBranchDefinitions } from "./workflowBranches"

interface Reassignment { steps: StepTemplate[]; branches: WorkflowBranch[]; error?: string }
const standardRoleFunctions: Readonly<Record<string, RoleFunction>> = {
  "event-lead": "programs", speaker: "outreach", marketing: "marketing", finance: "finance", "special-event": "programs",
  "close-event": "secretary", "close-marketing": "marketing", "close-finance": "finance",
}
const issueKey = (issue: { key?: string; text: string }) => `${issue.key ?? ""}:${issue.text}`

/** Role routing preserves every business edge and predicate; this is not a drag/reorder operation. */
export function reassignWorkflowStep(steps: StepTemplate[], branches: WorkflowBranch[] | undefined, roles: Role[], stepKey: string, roleId: string): Reassignment {
  const failed = (error: string): Reassignment => ({ steps, branches: branches ?? [], error })
  const step = steps.find(item => item.key === stepKey), role = roles.find(item => item.id === roleId)
  if (!step || !role || role.fn === "advisor") return failed("Choose a workflow step and an event role that still exist.")
  const branchError = validateBranchDefinitions(branches)
  if (branchError) return failed(branchError)
  const definitions = resolveBranches(steps, branches)
  if (ownerOfStep(step, roles)?.id === role.id) return { steps: step.ownerRoleId === role.id && step.fn === role.fn ? steps : steps.map(item => item.key === stepKey ? { ...item, ownerRoleId: role.id, fn: role.fn } : item), branches: definitions }
  const source = placementOf(step)
  const canonical = placementOf({ key: step.key })
  const main = source.branchId === "main" || canonical.branchId === "main"
  let placement = main && source.branchId !== "main" ? canonical : source
  let nextBranches = definitions
  if (!main) {
    const side = step.phase === "close" ? "after_event" : "before_event"
    const sourceScope = scopeKey(step, definitions)
    const members = (branch: WorkflowBranch) => steps.filter(item => item.key !== stepKey && placementOf(item).branchId === branch.id)
    const candidates = definitions.flatMap(branch => {
      if (branch.side !== side || (branch.defaultRoleId && branch.defaultRoleId !== role.id)) return []
      const candidate = { ...step, placement: { branchId: branch.id, order: source.order } }
      if (scopeKey(candidate, definitions) !== sourceScope) return []
      const existing = members(branch)
      if (existing.some(item => ownerOfStep(item, roles)?.id !== role.id)) return []
      const standardFunction = standardRoleFunctions[branch.id]
      const matchesStandard = standardFunction === role.fn && roleFor(roles, standardFunction)?.id === role.id
      if (branch.defaultRoleId !== role.id && !existing.length && !matchesStandard) return []
      const priority = branch.defaultRoleId === role.id ? 0 : matchesStandard ? 1 : 2
      return [{ branch, priority }]
    }).sort((a, b) => a.priority - b.priority || a.branch.order - b.branch.order || a.branch.id.localeCompare(b.branch.id))

    let destination = candidates[0]?.branch
    if (!destination) {
      const sourceBranch = branchOf(step, definitions)
      const slug = role.id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 20) || "custom"
      const prefix = `role-${slug}-${side === "before_event" ? "before" : "after"}`
      const used = new Set(definitions.map(branch => branch.id))
      let id = prefix, suffix = 2
      while (used.has(id)) { id = `${prefix}-${suffix}`; suffix++ }
      destination = {
        id, title: role.displayName, order: Math.max(-1, ...definitions.map(branch => branch.order)) + 1, side, defaultRoleId: role.id,
        ...(sourceBranch?.conditions !== undefined ? { conditions: [...sourceBranch.conditions] } : sourceBranch?.condition !== undefined ? { condition: sourceBranch.condition } : {}),
      }
      nextBranches = [...definitions, destination]
    }
    const orders = members(destination).map(item => placementOf(item).order)
    placement = { branchId: destination.id, order: Math.max(-1, ...orders) + 1 }
  }
  const nextSteps = steps.map(item => item.key === stepKey ? { ...item, ownerRoleId: role.id, fn: role.fn, placement } : item)
  const previousErrors = new Set(checkWorkflow(steps, roles, undefined, branches).filter(issue => issue.level === "blocked").map(issueKey))
  const newError = checkWorkflow(nextSteps, roles, undefined, nextBranches).find(issue => issue.level === "blocked" && !previousErrors.has(issueKey(issue)))
  if (newError) return failed(newError.text)
  // TODO: use an explicit team/role branch map when that organization setting exists; do not infer member names or regroup old steps.
  return { steps: nextSteps, branches: nextBranches }
}
