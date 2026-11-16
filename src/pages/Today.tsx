import { useMemo, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { useStore, useViewer } from "../data/store"
import type { DemoState, ReminderMode } from "../data/types"
import { PageHead } from "../components/Page"
import { Bts, BtsRow } from "../components/Bts"
import { useRail } from "../components/rail/RailContext"
import { forecastFor } from "../engine/forecast"
import { approvable, reminderQueue, yourReminders, type QueueItem, type SentItem } from "../lib/reminderQueue"
import { buildNudge, messageText } from "../lib/nudges"
import { fmtLong, fmtShort } from "../lib/dates"
import { RiskDot } from "../components/ui"
import { firstName } from "./helpers"

/**
 * FB-8 (docs/feedback-fix/PLAN.md §12.2): the home page is the reminder centre. It answers one question:
 * "Who needs a reminder, and who hasn't answered?" Everything on it comes from reminderQueue(state); every date is the
 * rule engine's (send day = latestStart, Due = clubDeadline). The demo never sends anything.
 */
export default function Today() {
  const { canNudge } = useViewer()
  return <>
    <PageHead path="/" />
    {canNudge ? <ReminderCentre /> : <YourReminders />}
  </>
}

/** What the button on a send-day item says in each mode (no mode works like "I review, then I send"). */
const REVIEW_LABEL: Record<ReminderMode | "none", string> = { review_then_self: "Review & open draft", review_then_auto: "Review", auto_email: "Review", none: "Review & open draft" }

function sentLabel(s: DemoState, x: SentItem) {
  if (x.kind === "platypus") return "Sent by Platypus · demo"
  if (x.kind === "would") return "Would be sent · demo"
  if (x.kind === "followup") return "Follow-up · demo"
  return x.sentBy === s.viewerId ? "Sent by you" : `Sent by ${firstName(s, x.sentBy ?? null)}`
}

function ReminderCentre() {
  const { state, dispatch } = useStore()
  const rail = useRail()
  const q = useMemo(() => reminderQueue(state), [state])
  const ok = approvable(q)
  const remind = (id: string) => rail.show({ kind: "nudge", id })
  // Approve all: one confirmNudgeSent per item, recorded as sent by Platypus. Demo: nothing leaves the browser.
  const approveAll = () => {
    for (const x of ok) {
      const person = state.people.find(p => p.id === x.ownerId)
      dispatch({ type: "confirmNudgeSent", nodeId: x.node.id, channel: person?.channels[0] ?? "whatsapp", text: messageText(buildNudge(state, x.node), window.location.origin, x.node.id), via: "platypus" })
    }
  }
  const mode = q.mode ?? "none"
  return <div className="rq" data-testid="reminder-centre" data-mode={mode}>
    <Section id="ok" title="Needs your OK" count={q.needsOk.length} testId="rq-needs-ok"
      action={ok.length > 0 && <button type="button" className="btn btn-primary small" data-testid="approve-all" onClick={approveAll}>Approve all ({ok.length})</button>}
      note={q.mode === null ? <Link to="/settings?reminders=1" data-testid="choose-mode">Choose how reminders go out</Link> : q.mode === "auto_email" ? "Your club sends automatically, so nothing waits here." : null}
      empty={q.mode === "auto_email" ? null : "Nothing waits for you."}
      bts="Send day = the rule engine's latest start. An item waits here from its send day until a reminder goes out.">
      {q.needsOk.map(x => <Row key={x.node.id} x={x} meta={<>Due {due(x)}</>}
        act={<button type="button" className="btn small" disabled={!!x.blocked} title={x.blocked ?? undefined} onClick={() => remind(x.node.id)}>{REVIEW_LABEL[mode]}</button>} />)}
    </Section>
    <Section id="week" title="This week" count={q.thisWeek.length} testId="rq-this-week" empty="No reminders go out in the next 7 days."
      bts="Send days from tomorrow to 7 days ahead, from the rule engine.">
      {q.thisWeek.map(x => <Row key={x.node.id} x={x} meta={<>Goes out {fmtLong(x.sendDay!)}</>} />)}
    </Section>
    <Section id="sent" title="Sent" count={q.sent.length} testId="rq-sent" empty="None yet.">
      {q.sent.map(x => <Row key={x.id} x={x} meta={<>{fmtShort(x.on)}</>} act={<span className={`rq-tag${x.kind === "president" ? "" : " demo"}`}>{sentLabel(state, x)}</span>} />)}
    </Section>
    <Section id="replies" title="Replies" count={q.replies.length} testId="rq-replies" empty="None yet.">
      {q.replies.map(x => <Row key={x.node.id} x={x} meta={<>Sent {fmtShort(x.sentOn)}</>} act={<span className="rq-reply">{x.reply}</span>} />)}
    </Section>
    <Section id="wait" title="No reply yet" count={q.noReply.length} testId="rq-no-reply" empty="Nobody to follow up."
      bts="No update to the task for 2 days or more after the latest reminder.">
      {q.noReply.map(x => <Row key={x.node.id} x={x} meta={<>Sent {fmtShort(x.sentOn)} · {x.days} days</>}
        act={<button type="button" className="btn small" disabled={!!x.blocked} title={x.blocked ?? undefined} onClick={() => remind(x.node.id)}>Follow up</button>} />)}
    </Section>
  </div>
}

const due = (x: QueueItem) => x.node.clubDeadline ? fmtShort(x.node.clubDeadline) : "not set"

function Section({ id, title, count, testId, action, note, empty, bts, children }: { id: string; title: string; count: number; testId: string; action?: ReactNode; note?: ReactNode; empty: string | null; bts?: string; children: ReactNode[] }) {
  return <section className="card rq-section" aria-labelledby={`rq-${id}-h`} data-testid={testId}>
    <header><h2 id={`rq-${id}-h`}>{title}{count > 0 && <span className="rq-n">{count}</span>}</h2>{action}</header>
    {note && <p className="rq-note">{note}</p>}
    {children.length ? <ul className="rq-list">{children}</ul> : empty && <p className="rq-empty">{empty}</p>}
    {bts && <BtsRow><Bts label="Rule engine">{bts}</Bts></BtsRow>}
  </section>
}

function Row({ x, meta, act }: { x: QueueItem; meta: ReactNode; act?: ReactNode }) {
  const { state } = useStore()
  const rail = useRail()
  const result = forecastFor(state).nodes[x.node.id]
  return <li className="rq-row" data-testid="rq-row" data-node={x.node.id}>
    <span className="rq-mark">{x.risk && result && <RiskDot result={result} />}</span>
    <span className="rq-main">
      <button type="button" className="row-btn" onClick={() => rail.show({ kind: "node", id: x.node.id })}>{x.node.title}</button>
      <span className="rq-meta"><b>{firstName(state, x.ownerId)}</b> · {meta}</span>
    </span>
    {act && <span className="rq-act">{act}</span>}
  </li>
}

/** The soonest few: an officer with a whole semester of steps would otherwise get a list of every one. */
const UPCOMING_SHOWN = 5

/** An officer who is not the president or VP: read only. When their own reminders go out, and the ones they have had. */
function YourReminders() {
  const { state } = useStore()
  const rail = useRail()
  const mine = useMemo(() => yourReminders(state, state.viewerId), [state])
  const title = (id: string, text: string) => <button type="button" className="row-btn" onClick={() => rail.show({ kind: "node", id })}>{text}</button>
  return <section className="card rq-section" aria-labelledby="rq-yours-h" data-testid="your-reminders">
    <header><h2 id="rq-yours-h">Your reminders</h2></header>
    <h3 className="rq-sub">Coming up</h3>
    {mine.upcoming.length ? <ul className="rq-list">{mine.upcoming.slice(0, UPCOMING_SHOWN).map(x => <li key={x.node.id} className="rq-row" data-testid="rq-row" data-node={x.node.id}>
      <span className="rq-mark" />
      <span className="rq-main">{title(x.node.id, x.node.title)}<span className="rq-meta">{x.sendDay === state.today ? "Goes out today" : `Goes out ${fmtLong(x.sendDay!)}`} · Due {due(x)}</span></span>
    </li>)}</ul> : <p className="rq-empty">No reminders coming up for your tasks.</p>}
    {mine.upcoming.length > UPCOMING_SHOWN && <p className="rq-note"><Link to="/tasks">{mine.upcoming.length - UPCOMING_SHOWN} more later</Link> in your tasks.</p>}
    <h3 className="rq-sub">Received</h3>
    {mine.received.length ? <ul className="rq-list">{mine.received.map(x => <li key={x.id} className="rq-row" data-testid="rq-row" data-node={x.node.id}>
      <span className="rq-mark" />
      <span className="rq-main">{title(x.node.id, x.node.title)}<span className="rq-meta">{fmtShort(x.on)}</span></span>
      <span className="rq-act"><span className={`rq-tag${x.kind === "president" ? "" : " demo"}`}>{x.kind === "president" ? `From ${firstName(state, x.sentBy ?? null)}` : sentLabel(state, x)}</span></span>
    </li>)}</ul> : <p className="rq-empty">No reminders yet.</p>}
    <BtsRow><Bts label="Rule engine">Each reminder goes out on its task's latest start, from the rule engine.</Bts></BtsRow>
  </section>
}
