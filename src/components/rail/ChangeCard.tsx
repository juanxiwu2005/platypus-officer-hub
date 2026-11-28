import { lazy, Suspense } from "react"
import { useStore } from "../../data/store"
import { commandContext, opLabel, type CommandOp } from "../../lib/commands"
import { useRail } from "./RailContext"

/** The review list (option B) loads on demand, so the startup bundle does not carry it. */
const ChangeReview = lazy(() => import("./ChangeReview"))

/** A change set inside the Ask panel: a list of ticked changes applied together with one button (plan §8, option B). */
export function ChangeCard({ id }: { id: string }) {
  const { state } = useStore()
  const rail = useRail()
  const change = state.changeSets.find(c => c.id === id)
  if (!change) return <p className="small muted">This draft was cleared by Reset demo.</p>
  return <Suspense fallback={<p className="small muted">Loading changes…</p>}><ChangeReview change={change} onNudge={nodeId => rail.show({ kind: "nudge", id: nodeId })} /></Suspense>
}

/** Small edits the assistant already made, with one Undo for the whole set. */
export function AppliedCard({ id }: { id: string }) {
  const { state, dispatch } = useStore()
  const change = state.changeSets.find(c => c.id === id)
  if (!change) return <p className="small muted">This change was cleared by Reset demo.</p>
  const ctx = commandContext(state)
  const done = change.reviews?.some(r => r === "applied")
  return <section className="change-set applied" aria-label="Changes made" data-testid="applied-set">
    <header><b>{change.undone ? "Undone" : done ? "Done" : "Not changed"}</b>{done && !change.undone && <button type="button" className="btn small" onClick={() => dispatch({ type: "undoAuto", id })} data-testid="undo-auto">Undo</button>}</header>
    <ul className="applied-list">{change.ops.map((op, i) => <li key={i} className={change.reviews?.[i] === "applied" ? "" : "muted"}>
      <span aria-hidden="true">{change.reviews?.[i] === "applied" ? (change.undone ? "↺" : "✓") : "–"}</span> {opLabel(op as CommandOp, ctx)}{change.notes?.[i] && <span className="small muted"> · {change.notes[i]}</span>}
    </li>)}</ul>
  </section>
}
