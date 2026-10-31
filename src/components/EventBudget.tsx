import type { BudgetCategory, BudgetItemStatus, BudgetLineItem, BudgetSource, Event } from "../data/types"
import { useStore } from "../data/store"
import { BUDGET_STATUSES, budgetTotal, lineTotal } from "../engine/eventBudget"
import { Bts, BtsRow } from "./Bts"

const categories: { id: BudgetCategory; label: string }[] = [{ id: "general", label: "General" }, { id: "food", label: "Food" }, { id: "speaker", label: "Speaker" }, { id: "travel", label: "Travel" }]
const sources: { id: BudgetSource; label: string }[] = [{ id: "usg", label: "USG" }, { id: "college", label: "College Funding" }, { id: "organization", label: "Organization Funding" }, { id: "sponsor", label: "Sponsor" }, { id: "none", label: "None" }]
const money = (value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export function EventBudget({ event }: { event: Event }) {
  const { state, dispatch } = useStore()
  const lines = event.budgetItems ?? []
  const editable = state.people.some(person => person.id === state.viewerId)
  const change = (line: BudgetLineItem, patch: Partial<Omit<BudgetLineItem, "id">>) => dispatch({ type: "budgetLineUpdate", eventId: event.id, id: line.id, patch })
  return <section className="card tbl-wrap event-budget" data-testid="event-budget">
    <div className="toolbar"><div><h3>Line Items</h3><p className="small muted">Budget progress drives the finance steps in this event’s Flow.</p></div>{editable && <button type="button" className="btn btn-primary small" onClick={() => dispatch({ type: "budgetLineAdd", eventId: event.id })}>+ Add line item</button>}</div>
    <table className="tbl event-budget-table">
      <thead><tr><th>Item</th><th>Category</th><th>Qty</th><th>Unit price</th><th>Total Price</th><th>Source</th><th>Status</th>{editable && <th><span className="sr-only">Actions</span></th>}</tr></thead>
      <tbody>{lines.map(line => <tr key={line.id}>
        <td><input aria-label={`${line.item} item`} value={line.item} disabled={!editable} onChange={e => change(line, { item: e.target.value })} /></td>
        <td><select aria-label={`${line.item} category`} value={line.category} disabled={!editable} onChange={e => change(line, { category: e.target.value as BudgetCategory })}>{categories.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></td>
        <td><input aria-label={`${line.item} quantity`} type="number" min="0" step="1" value={line.quantity} disabled={!editable} onChange={e => change(line, { quantity: Number(e.target.value) })} /></td>
        <td><input aria-label={`${line.item} price per unit`} type="number" min="0" step="0.01" value={line.pricePerUnit} disabled={!editable} onChange={e => change(line, { pricePerUnit: Number(e.target.value) })} /></td>
        <td className="num">{money(lineTotal(line))}</td>
        <td><select aria-label={`${line.item} funding source`} value={line.source} disabled={!editable} onChange={e => change(line, { source: e.target.value as BudgetSource })}>{sources.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></td>
        <td><select aria-label={`${line.item} status`} value={line.status} disabled={!editable} onChange={e => change(line, { status: e.target.value as BudgetItemStatus })}>{BUDGET_STATUSES.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></td>
        {editable && <td><button type="button" className="btn small" aria-label={`Delete ${line.item}`} onClick={() => dispatch({ type: "budgetLineDelete", eventId: event.id, id: line.id })}>Delete</button></td>}
      </tr>)}</tbody>
      <tfoot><tr><th colSpan={4}>Total requested</th><th className="num">{money(budgetTotal(lines))}</th><td colSpan={editable ? 3 : 2} /></tr></tfoot>
    </table>
    {!lines.length && <p className="small muted">Add at least one line item to begin the event’s budget workflow.</p>}
    <BtsRow><Bts label="Budget progress">Line-item status is the sole completion source for the finance steps in this event’s Flow. Food Exception Permit applies only to Food items.</Bts><Bts label="Calculation">Each Total Price is Quantity × Price per Unit; requested is the sum of every line item.</Bts></BtsRow>
  </section>
}
