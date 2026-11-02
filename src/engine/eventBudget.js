export const BUDGET_STATUSES = [
    { id: "not_started", label: "Not Started" }, { id: "food_exception_permit", label: "Food Exception Permit" }, { id: "quote_gather", label: "Quote Gather" }, { id: "budget_request", label: "Budget Request" }, { id: "budget_approval", label: "Budget Approved" }, { id: "purchase_request", label: "Purchase Request" }, { id: "purchase_approval", label: "Purchase Approved" }, { id: "order_placed", label: "Order Placed" }, { id: "invoice", label: "Invoice" }, { id: "attendance_submit", label: "Attendance Submit" }, { id: "paid_reimbursed", label: "Paid or Reimbursed" }, { id: "finance_record", label: "Finance Record" },
];
const ORDER = new Map(BUDGET_STATUSES.map(({ id }, index) => [id, index]));
export const FINANCE_BUDGET_STEPS = { budget: "has_items", foodCompliance: "food_exception_permit", quotes: "quote_gather", budgetRequest: "budget_request", budgetApproval: "budget_approval", purchaseRequest: "purchase_request", purchaseApproval: "purchase_approval", orderPlaced: "order_placed", invoice: "invoice", attendance: "attendance_submit", spending: "paid_reimbursed", financeRecord: "finance_record" };
export const lineTotal = (line) => line.quantity * line.pricePerUnit;
export const budgetTotal = (lines) => (lines ?? []).reduce((total, line) => total + lineTotal(line), 0);
export const isBudgetControlledNode = (node) => !!node.eventId && !!node.stepKey && node.stepKey in FINANCE_BUDGET_STEPS;
function applies(line, key) { return key !== "foodCompliance" || line.category === "food"; }
export function budgetStepComplete(lines, key) {
    const target = FINANCE_BUDGET_STEPS[key];
    if (!target)
        return false;
    if (!lines?.length)
        return false;
    if (target === "has_items")
        return true;
    const relevant = lines.filter(line => applies(line, key));
    // A Food Exception is not applicable when the event budget has no food item.
    if (!relevant.length)
        return key === "foodCompliance";
    return relevant.every(line => (ORDER.get(line.status) ?? -1) >= (ORDER.get(target) ?? Infinity));
}
/** Budget is the only completion authority for finance workflow steps. */
export function syncBudgetFlow(state, eventId) {
    const event = state.events.find(e => e.id === eventId);
    if (!event)
        return state;
    const lines = event.budgetItems ?? [];
    let changed = false;
    const nodes = state.nodes.map(node => {
        if (node.eventId !== eventId || !node.stepKey || !(node.stepKey in FINANCE_BUDGET_STEPS))
            return node;
        const complete = budgetStepComplete(lines, node.stepKey);
        const status = complete ? "done" : node.status === "done" ? "unclaimed" : node.status;
        if (status === node.status)
            return node;
        changed = true;
        return { ...node, status, completedOn: complete ? state.today : undefined, acceptedOn: complete ? node.acceptedOn : null, lastUpdate: state.today };
    });
    return changed ? { ...state, nodes } : state;
}
