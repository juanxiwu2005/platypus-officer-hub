import type { Anchor } from "../data/types"
import { ruleSourceNames } from "../data/rules"

/** Organization lifecycle steps already required by the event generator. */
export const CORE_EVENT_STEP_KEYS = [
  "plan", "backup", "venuechoice", "registry", "venue", "moderator", "materials", "checkin", "headcount", "thankyou", "feedback", "postmarketing", "photoBackup", "invoice", "attendance", "spending", "financeRecord", "documentation",
  "budget", "quotes", "budgetRequest", "budgetApproval", "purchaseRequest", "purchaseApproval", "orderPlaced",
  "marketingNeeds", "contentCreation", "promotionItems", "content", "reminder", "finalcheck",
] as const

interface PolicyItem {
  key?: string
  id?: string
  stepKey?: string | null
  title?: string
  ruleIds?: readonly string[]
  anchor?: Pick<Anchor, "kind"> | null
  status?: string
}
const core = new Set<string>(CORE_EVENT_STEP_KEYS)
const structure = new Set(["finalcheck", "review", "checkin", "runshow", "headcount"])
const virtual = new Set(["__start__", "__event__", "__end__", "__premerge__", "__poststart__"])
const keyOf = (item: PolicyItem) => item.key ?? item.stepKey ?? ""

export const isCoreStep = (item: PolicyItem): boolean => core.has(keyOf(item)) || structure.has(keyOf(item))
export const isAsuStep = (item: PolicyItem): boolean => !!item.ruleIds?.length || item.anchor?.kind === "rule"

/** One deletion rule for the menu, template validator and event reducer. */
export function deletionReason(item: PolicyItem): string | null {
  if (virtual.has(item.id ?? item.key ?? "")) return "This is a workflow station, not a removable task."
  if (isAsuStep(item)) return `An ASU rule requires this step${item.ruleIds?.length ? ` (${ruleSourceNames(item.ruleIds).join("; ")})` : ""}.`
  if (isCoreStep(item)) return structure.has(keyOf(item)) ? "This step connects the event workflow and must stay." : "This step is part of the required organization event workflow."
  if (item.status === "done") return "It is already done and counts toward the contribution board."
  return null
}
