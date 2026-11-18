import type { Phase, StepCond, WorkflowBranch, WorkflowPlacement } from "../data/types"
import { EVENT_CHECKLIST } from "../data/eventChecklist"

export interface WorkflowBranchItem {
  key?: string
  id?: string
  stepKey?: string | null
  phase?: Phase | null
  placement?: WorkflowPlacement
  cond?: StepCond
}

export const WORKFLOW_CONDITION_LABELS: Record<StepCond, string> = {
  campus: "On-campus venue", offcampus: "Off-campus venue", speaker: "Guest speaker", externalGuest: "Speaker or partner",
  usgFood: "USG-funded food", usgSpeaker: "USG-funded speaker", offsite: "Outside caterer", dining: "Sun Devil Dining", onsite: "Food made on site", tbd: "Food provider undecided", food: "Food provided",
  funding: "Funding needed", externalFood: "Outside food", onsiteFood: "Food made on site", partner: "External partner", travel: "Travel", parking: "Parking",
  advisor: "Advisor participation", access: "Accessibility support", safety: "Safety review", outdoor: "Outdoor event", alcohol: "Alcohol", drone: "Drone",
  media: "Media", prize: "Prizes", schoolApproval: "School approval", content: "Content", rsvp: "RSVPs", large: "Large or elevated-risk event",
}
export const conditionLabel = (condition?: StepCond): string => condition ? WORKFLOW_CONDITION_LABELS[condition] ?? "Unknown condition" : "Every event"
export const WORKFLOW_CONDITION_OPTIONS: { value: StepCond | ""; label: string }[] = [
  { value: "", label: "Every event" },
  ...(Object.entries(WORKFLOW_CONDITION_LABELS) as [StepCond, string][]).map(([value, label]) => ({ value, label })),
]
export const isWorkflowCondition = (value: unknown): value is StepCond => typeof value === "string" && Object.hasOwn(WORKFLOW_CONDITION_LABELS, value)
export const isStepCondition = isWorkflowCondition
const maxBranchConditions = Object.keys(WORKFLOW_CONDITION_LABELS).length
// Kept outside the condition whitelist so an invalid stored requirement cannot enable a branch.
const invalidBranchCondition = "__invalid_branch_requirements__" as StepCond

/** Explicit [] clears the legacy condition; malformed requirements fail closed during generation. */
export function branchConditions(branch?: WorkflowBranch): StepCond[] {
  if (!branch) return []
  if (branch.conditions !== undefined) {
    const values = branch.conditions
    if (!Array.isArray(values) || values.length > maxBranchConditions || !values.every(isWorkflowCondition)) return [invalidBranchCondition]
    return [...new Set(values)]
  }
  if (branch.condition === undefined) return []
  return isWorkflowCondition(branch.condition) ? [branch.condition] : [invalidBranchCondition]
}

export function branchConditionLabel(branch?: WorkflowBranch): string {
  const conditions = branchConditions(branch)
  if (conditions.some(condition => !isWorkflowCondition(condition))) return "Invalid requirements"
  return conditions.length ? conditions.map(condition => conditionLabel(condition)).join(" and ") : "Every event"
}

/** Standard keys are only a compatibility fallback, never the order of an edited graph. */
export const DEFAULT_BRANCH_STEP_KEYS: Readonly<Record<string, readonly string[]>> = {
  "event-lead": ["plan", "backup", "venuechoice", "registry", "venue", "moderator", "materials", "draft", "approve", "offvenue", "ritm"],
  speaker: ["partner", "speakerPacket", "travel", "partnerReview", "parking", "sap"],
  marketing: ["marketingNeeds", "contentCreation", "promotionItems", "rsvp", "content", "reminder", "mktneeds", "flyer", "partnerreview", "promo"],
  finance: ["budget", "foodCompliance", "quotes", "budgetRequest", "budgetApproval", "purchaseRequest", "purchaseApproval", "orderPlaced", "quote", "foodex", "dining", "usg", "usgspeaker", "foodplan"],
  "special-event": ["advisor", "access", "security", "eams", "permit", "alcohol", "drone", "schoolApproval"],
  "close-event": ["thankyou", "feedback", "documentation", "archive"],
  "close-marketing": ["postmarketing", "photoBackup"],
  "close-finance": ["invoice", "attendance", "spending", "financeRecord", "closeout"],
}
export const DEFAULT_WORKFLOW_BRANCHES: readonly WorkflowBranch[] = [
  { id: "event-lead", title: "Event lead", order: 0, side: "before_event" },
  { id: "speaker", title: "Speaker and partner", order: 1, side: "before_event", condition: "externalGuest" },
  { id: "marketing", title: "Marketing", order: 2, side: "before_event" },
  { id: "finance", title: "Finance", order: 3, side: "before_event" },
  { id: "special-event", title: "Special event", order: 4, side: "before_event" },
  { id: "close-event", title: "Event close-out", order: 5, side: "after_event" },
  { id: "close-marketing", title: "Marketing close-out", order: 6, side: "after_event" },
  { id: "close-finance", title: "Finance close-out", order: 7, side: "after_event" },
]
const mainKeys = ["finalcheck", "review", "checkin", "runshow", "headcount"]
const validPlacement = (placement: unknown): placement is WorkflowPlacement => !!placement && typeof placement === "object"
  && typeof (placement as WorkflowPlacement).branchId === "string" && !!(placement as WorkflowPlacement).branchId
  && typeof (placement as WorkflowPlacement).order === "number" && Number.isFinite((placement as WorkflowPlacement).order)
const keyOf = (item: WorkflowBranchItem) => item.key ?? item.stepKey ?? ""

/** Never guesses a legacy custom step's scope from its neighbors. */
export function placementOf(item: WorkflowBranchItem): WorkflowPlacement {
  if (validPlacement(item.placement)) return { ...item.placement }
  const key = keyOf(item)
  const main = mainKeys.indexOf(key)
  if (main >= 0) return { branchId: "main", order: main }
  for (const [branchId, keys] of Object.entries(DEFAULT_BRANCH_STEP_KEYS)) {
    const index = keys.indexOf(key)
    if (index >= 0) return { branchId, order: index }
  }
  return { branchId: item.phase === "close" ? "legacy-after" : "legacy-before", order: 0 }
}

/** Missing/broken old branch metadata stays visible; validation controls new writes. */
export function resolveBranches(items: readonly WorkflowBranchItem[], savedBranches?: readonly WorkflowBranch[]): WorkflowBranch[] {
  const clone = (branch: WorkflowBranch): WorkflowBranch => ({ ...branch, ...(Array.isArray(branch.conditions) ? { conditions: [...branch.conditions] } : {}) })
  const branches = new Map(DEFAULT_WORKFLOW_BRANCHES.map(branch => [branch.id, clone(branch)]))
  for (const branch of Array.isArray(savedBranches) ? savedBranches : []) if (branch && typeof branch.id === "string" && branch.id !== "main") branches.set(branch.id, clone(branch))
  for (const item of items) {
    const { branchId } = placementOf(item)
    if (branchId === "main" || branches.has(branchId)) continue
    const after = item.phase === "close"
    branches.set(branchId, { id: branchId, title: branchId === "legacy-before" || branchId === "legacy-after" ? "Legacy custom steps" : "Unrecognized branch", order: branches.size, side: after ? "after_event" : "before_event" })
  }
  return [...branches.values()].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
}

export function branchOf(item: WorkflowBranchItem, branches?: readonly WorkflowBranch[]): WorkflowBranch | undefined {
  const id = placementOf(item).branchId
  return (branches ?? DEFAULT_WORKFLOW_BRANCHES).find(branch => branch?.id === id)
}
export function conditionsOf(item: WorkflowBranchItem, branches?: readonly WorkflowBranch[]): StepCond[] {
  return [...new Set([...branchConditions(branchOf(item, branches)), ...(item.cond === undefined ? [] : [item.cond])])]
}
const checklistKeys = new Set<string>(EVENT_CHECKLIST.map(item => item.key))
// Legacy rules for these checks also accept derived event facts; explicit selections require the checked box.
const derivedRuleChecks = new Set<StepCond>(["funding", "externalFood", "onsiteFood", "schoolApproval"])
const predicateKey = (condition: StepCond, explicit: boolean): string => {
  const usesCheckbox = checklistKeys.has(condition) && condition !== "food" && condition !== "speaker" && (explicit || !derivedRuleChecks.has(condition))
  return `${usesCheckbox ? "check" : "rule"}:${condition}`
}
/** Encode predicates before deduplication: a checked box and a derived rule can share a name but differ in scope. */
export function scopeKey(item: WorkflowBranchItem, branches?: readonly WorkflowBranch[]): string {
  const branch = branchOf(item, branches)
  const predicates = branchConditions(branch).map(condition => predicateKey(condition, branch?.conditions !== undefined))
  if (item.cond !== undefined) predicates.push(predicateKey(item.cond, false))
  return [...new Set(predicates)].sort().join("&") || "always"
}

/** Validate authored definitions; compatibility rendering remains deliberately forgiving. */
export function validateBranchDefinitions(branches: readonly WorkflowBranch[] | undefined): string | null {
  if (branches === undefined) return null
  if (!Array.isArray(branches) || branches.length > 60) return "Use at most 60 workflow branches."
  const ids = new Set<string>()
  for (const branch of branches) {
    if (!branch || typeof branch.id !== "string" || !/^[a-z][a-z0-9-]{0,39}$/.test(branch.id) || branch.id === "main" || ids.has(branch.id)) return "Each branch needs a unique valid ID."
    ids.add(branch.id)
    if (typeof branch.title !== "string" || !branch.title.trim() || branch.title.length > 80 || !Number.isFinite(branch.order) || !["before_event", "after_event"].includes(branch.side)) return "Give each branch a name, a side and a finite order."
    if (branch.conditions !== undefined) {
      if (!Array.isArray(branch.conditions) || branch.conditions.length > maxBranchConditions) return `Choose up to ${maxBranchConditions} supported branch requirements.`
      if (!branch.conditions.every(isWorkflowCondition)) return "Choose supported branch requirements."
    } else if (branch.condition !== undefined && !isWorkflowCondition(branch.condition)) return "Choose a supported branch condition."
    if (branch.defaultRoleId !== undefined && branch.defaultRoleId !== null && typeof branch.defaultRoleId !== "string") return "Choose a valid default role for the branch."
  }
  return null
}
