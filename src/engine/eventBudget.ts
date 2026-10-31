import type { BudgetItemStatus, BudgetLineItem, DemoState, Node } from "../data/types"

export const BUDGET_STATUSES: { id: BudgetItemStatus; label: string }[] = [
  { id: "not_started", label: "Not Started" }, { id: "food_exception_permit", label: "Food Exception Permit" }, { id: "quote_gather", label: "Quote Gather" }, { id: "budget_request", label: "Budget Request" }, { id: "budget_approval", label: "Budget Approved" }, { id: "purchase_request", label: "Purchase Request" }, { id: "purchase_approval", label: "Purchase Approved" }, { id: "order_placed", label: "Order Placed" }, { id: "invoice", label: "Invoice" }, { id: "attendance_submit", label: "Attendance Submit" }, { id: "paid_reimbursed", label: "Paid or Reimbursed" }, { id: "finance_record", label: "Finance Record" },
]
const ORDER = new Map(BUDGET_STATUSES.map(({ id }, index) => [id, index]))
export const FINANCE_BUDGET_STEPS: Record<string, BudgetItemStatus | "has_items"> = { budget: "has_items", foodCompliance: "food_exception_permit", quotes: "quote_gather", budgetRequest: "budget_request", budgetApproval: "budget_approval", purchaseRequest: "purchase_request", purchaseApproval: "purchase_approval", orderPlaced: "order_placed", invoice: "invoice", attendance: "attendance_submit", spending: "paid_reimbursed", financeRecord: "finance_record" }

export const lineTotal = (line: BudgetLineItem) => line.quantity * line.pricePerUnit
export const budgetTotal = (lines: BudgetLineItem[] | undefined) => (lines ?? []).reduce((total, line) => total + lineTotal(line), 0)
export const isBudgetControlledNode = (node: Node) => !!node.eventId && !!node.stepKey && node.stepKey in FINANCE_BUDGET_STEPS

function applies(line: BudgetLineItem, key: string) { return key !== "foodCompliance" || line.category === "food" }
export function budgetStepComplete(lines: BudgetLineItem[] | undefined, key: string) {
  const target = FINANCE_BUDGET_STEPS[key]
  if (!target) return false
  if (!lines?.length) return false
  if (target === "has_items") return true
  const relevant = lines.filter(line => applies(line, key))
  // A Food Exception is not applicable when the event budget has no food item.
  if (!relevant.length) return key === "foodCompliance"
  return relevant.every(line => (ORDER.get(line.status) ?? -1) >= (ORDER.get(target) ?? Infinity))
}

/** Budget is the only completion authority for finance workflow steps. */
export function syncBudgetFlow(state: DemoState, eventId: string): DemoState {
  const event = state.events.find(e => e.id === eventId)
  if (!event) return state
  const lines = event.budgetItems ?? []
  let changed = false
  const nodes = state.nodes.map(node => {
    if (node.eventId !== eventId || !node.stepKey || !(node.stepKey in FINANCE_BUDGET_STEPS)) return node
    const complete = budgetStepComplete(lines, node.stepKey)
    const status: Node["status"] = complete ? "done" : node.status === "done" ? "unclaimed" : node.status
    if (status === node.status) return node
    changed = true
    return { ...node, status, completedOn: complete ? state.today : undefined, acceptedOn: complete ? node.acceptedOn : null, lastUpdate: state.today }
  })
  return changed ? { ...state, nodes } : state
}
