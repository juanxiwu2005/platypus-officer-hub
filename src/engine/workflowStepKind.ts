import type { StepCond, WorkflowBranch, WorkflowPlacement, WorkflowStepKind } from "../data/types"
import { conditionsOf } from "./workflowBranches"

interface KindItem {
  stepKind?: WorkflowStepKind
  key?: string
  stepKey?: string | null
  cond?: StepCond
  placement?: WorkflowPlacement
}

/** Preserve the original chart's categories, including required purchasing steps without a predicate. */
const legacySituationKeys = new Set(["partner", "speakerPacket", "travel", "partnerReview", "parking", "foodCompliance", "budgetRequest", "budgetApproval", "purchaseRequest", "purchaseApproval", "advisor", "access", "security", "eams", "permit", "alcohol", "drone", "schoolApproval", "rsvp"])

/** Authored classification is presentation metadata, independent of required-step protection and intake predicates. */
export function workflowStepKind(item: KindItem, branches?: readonly WorkflowBranch[]): WorkflowStepKind {
  if (item.stepKind === "core" || item.stepKind === "situation") return item.stepKind
  if (legacySituationKeys.has(item.key ?? item.stepKey ?? "")) return "situation"
  // TODO: connect the authored category to a future reviewed event-intake mapping; never rewrite cond here.
  return conditionsOf(item, branches).length ? "situation" : "core"
}
