import { useMemo, type ReactNode } from "react"
import { useStore } from "../data/store"
import { useRail } from "../components/rail/RailContext"
import { Bts, BtsRow } from "../components/Bts"
import { fmtLong, fmtShort } from "../lib/dates"
import type { CentreRow, ReminderCentre as Centre } from "./centre"
import { planReminderDigests } from "./digest"

/** One reminder line. There is no mark column (R-S0 W2: no empty indent), and no "To <name>" when the viewer is the recipient. */
function Row({ x, viewerId, action, note }: { x: CentreRow; viewerId: string; action?: ReactNode; note?: ReactNode }) {
  const rail = useRail()
  const to = x.recipientName && x.recipientId !== viewerId ? <>To <b>{x.recipientName}</b> · </> : null
  return <li className="rq-row rc-row" data-testid="rq-row" data-node={x.nodeId}>
    <div className="rq-main rc-main">
      {x.eventName && <span className="rc-event">{x.eventName}</span>}
      {x.taskAvailable ? <button type="button" className="row-btn" onClick={() => rail.show({ kind: "node", id: x.nodeId })}>{x.taskTitle}</button> : <strong>{x.taskTitle}</strong>}
      <span className="rq-meta">{to ?? (!x.recipientName && x.legacy ? "Recipient not recorded · " : "")}<strong>{x.due ? `Task due ${fmtShort(x.due)}` : x.legacy ? "Earlier reminder" : "Task due not set"}</strong></span>
      {note && <span className="rq-meta">{note}</span>}
      {x.message && <details className="rc-snapshot"><summary>Recorded email</summary><pre>{x.message.text}</pre></details>}
    </div>
    {action && <span className="rq-act">{action}</span>}
  </li>
}

export function YourReminders({ q }: { q: Centre }) {
  const { state, automaticReminders } = useStore()
  const viewerId = state.viewerId
  const upcoming = q.thisWeek.filter(x => x.recipientId === viewerId)
  const received = q.sent.filter(x => x.recipientId === viewerId)
  // Today's email for the viewer, read from the same rule-engine digest plan the lead's page shows (read-only; one email per person per day).
  const today = useMemo(() => {
    if (q.runtimeState !== "active") return []
    const group = planReminderDigests(state).groups.find(g => g.recipientId === viewerId)
    return group ? group.candidates.map(c => state.nodes.find(n => n.id === c.nodeId)?.title ?? "Earlier task") : []
  }, [q.runtimeState, state, viewerId])
  return <section className="card rq-section rc-yours" aria-labelledby="rq-yours-h" data-testid="your-reminders">
    <header><h2 id="rq-yours-h">Your reminders</h2></header>
    <BtsRow><Bts label="Rule engine">Planned checks use the stored task dates. Recorded reminders follow the saved recipient.</Bts></BtsRow>
    {q.runtimeState === "invalid" && <p className="rq-note">The saved reminder plan needs review. No reminders will run.</p>}
    {automaticReminders.error && <p role="alert" className="rq-note">Automatic reminders could not be saved. Please let your president or VP know.</p>}
    {today.length > 0 && <p className="rc-today" data-testid="your-today">Today you get 1 email about: {today.join(", ")}</p>}
    <h3 className="rq-sub">Coming up</h3>
    {upcoming.length ? <ul className="rq-list">{upcoming.slice(0, 5).map(x => <Row key={x.id} x={x} viewerId={viewerId} note={<>Planned reminder {fmtLong(x.scheduledOn!)}</>} />)}</ul> : <p className="rq-empty">Nothing this week.</p>}
    <h3 className="rq-sub">Recorded for you</h3>
    {received.length ? <ul className="rq-list">{received.map(x => <Row key={x.id} x={x} viewerId={viewerId} action={<span className="rq-tag">Sent</span>} note={<>Recorded {fmtShort(x.sentOn!)}</>} />)}</ul> : <p className="rq-empty">No recorded reminders yet.</p>}
  </section>
}
