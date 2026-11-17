import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { useStore, useViewer } from "../data/store"
import { PageHead } from "../components/Page"
import { Bts, BtsRow } from "../components/Bts"
import { useRail } from "../components/rail/RailContext"
import { forecastFor } from "../engine/forecast"
import { RiskDot } from "../components/ui"
import { fmtLong, fmtShort } from "../lib/dates"
import { reminderCentre, type CentreRow, type ReminderCentre as Centre } from "../reminders/centre"
import { isReminderRuntime } from "../reminders/runtime"
import "../reminders/centre.css"

export default function Today() {
  const { state } = useStore()
  const { canNudge } = useViewer()
  const q = useMemo(() => reminderCentre(state), [state])
  return <><PageHead path="/" />{canNudge ? <ReminderCentre q={q} /> : <YourReminders q={q} />}</>
}

function ReminderCentre({ q }: { q: Centre }) {
  const { state, tryDispatch, getState, persistenceFailed, automaticReminders } = useStore()
  const rail = useRail()
  const forecast = useMemo(() => forecastFor(state), [state])
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState("")
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const review = (nodeId: string) => rail.show({ kind: "nudge", id: nodeId })
  const activate = () => {
    const saved = tryDispatch({ type: "upgradeReminderPlan" })
    setFeedback(saved && reminderCentre(getState()).runtimeState === "active" ? "Updated reminders are enabled." : "The reminder plan was not saved. Restore saving and try again.")
  }
  const reviewLegacy = (nodeId: string) => {
    const saved = tryDispatch({ type: "reviewLegacyReminder", nodeId })
    const runtime = getState().reminderRuntime
    setFeedback(saved && isReminderRuntime(runtime) && !runtime.legacyUnresolvedNodeIds?.includes(nodeId)
      ? "Future reminders are enabled for the current assignment. Earlier history is unchanged."
      : "This review was not saved. Check the current assignment and browser saving.")
  }
  const approveAll = async () => {
    if (busy || !q.approvableCandidateIds.length) return
    setBusy(true); setFeedback("")
    try {
      const { sendReminderBatch } = await import("../reminders/delivery")
      const result = await sendReminderBatch({ getState, tryDispatch }, q.approvableCandidateIds, window.location.origin, "platypus", () => alive.current)
      if (alive.current) setFeedback(`${result.recordedIds.length} reminder${result.recordedIds.length === 1 ? "" : "s"} saved as a demo. Nothing was sent.${result.error ? ` ${result.error}` : ""}`)
    } catch { if (alive.current) setFeedback("These reminders were not recorded. Please try again.") }
    finally { if (alive.current) setBusy(false) }
  }
  const row = (x: CentreRow, action?: ReactNode, note?: ReactNode) => <Row key={x.id} x={x} action={action} note={note} risk={x.risk ? forecast.nodes[x.nodeId] : undefined} />
  const ready = q.runtimeState === "active"
  return <div className="rq" data-testid="reminder-centre" data-mode={q.mode ?? "none"} aria-busy={busy || automaticReminders.busy}>
    <BtsRow><Bts label="Rule engine">Checks use the rule engine's latest start and Task due; a final check is 3 days overdue. Sent lists saved records.</Bts></BtsRow>
    {!ready && <section className="card rc-plan" data-testid="reminder-plan-status" aria-label="Reminder plan">
      <h2>{q.runtimeState === "invalid" ? "Reminder plan needs review" : "Enable updated reminders"}</h2>
      <p>{q.runtimeState === "invalid" ? "The saved reminder plan is unavailable. It has been kept for recovery; no reminders will run."
        : "Your sending choice and limits stay the same. Earlier history is kept; records without recipient details need review."}</p>
      {q.runtimeState === "legacy" && <button type="button" className="btn btn-primary" disabled={persistenceFailed} onClick={activate}>Enable updated reminders</button>}
    </section>}
    {automaticReminders.busy && <p role="status" className="rq-note">Preparing automatic demo reminders…</p>}
    {automaticReminders.error && <div className="rc-save-error" role="alert"><p>{automaticReminders.error}</p><button type="button" className="btn small" disabled={automaticReminders.busy} onClick={automaticReminders.retry}>Retry automatic reminders</button></div>}
    {feedback && <p role="status" className="rq-note">{feedback}</p>}
    {persistenceFailed && <p role="alert" className="rq-note">This browser could not save changes. No new reminder can be recorded until saving is restored.</p>}
    <Section id="ok" title="Needs your OK" count={q.needsOk.length + q.blocked.length} testId="rq-needs-ok"
      bts="Only eligible candidates wait for review. Automatic demo records are saved before appearing in Sent."
      action={q.approvableCandidateIds.length > 0 && <button type="button" className="btn btn-primary small" data-testid="approve-all" disabled={busy || persistenceFailed} onClick={approveAll}>{busy ? "Preparing…" : `Approve all (${q.approvableCandidateIds.length})`}</button>}
      note={q.mode === null ? <Link to="/settings?reminders=1" data-testid="choose-mode">Choose how reminders go out</Link> : q.mode === "auto_email" ? "Automatic reminders are recorded only after their task link and email are saved. Demo: nothing is sent." : null}
      empty={ready ? "Nothing waits for you." : "Enable the updated plan to see current reminders."}>
      {q.needsOk.map(x => row(x, q.mode === "auto_email" ? <span className="rq-tag demo">Awaiting automatic preparation</span>
        : <button type="button" className="btn small" disabled={busy || persistenceFailed} onClick={() => review(x.nodeId)}>{q.mode === "review_then_auto" ? "Review" : "Review & open draft"}</button>))}
      {q.blocked.map(x => row(x, x.blockedReason === "legacy_history" ? <button type="button" className="btn small" disabled={persistenceFailed} onClick={() => reviewLegacy(x.nodeId)}>I checked · allow future reminders</button>
        : x.taskAvailable ? <button type="button" className="btn small" onClick={() => rail.show({ kind: "node", id: x.nodeId })}>Review task</button> : undefined))}
    </Section>
    <Section id="week" title="This week" count={q.thisWeek.length} testId="rq-this-week" empty="No reminders planned in the next 7 days." bts="Planned checks from tomorrow through the next 7 days.">
      {q.thisWeek.map(x => row(x, undefined, <>Planned reminder {fmtLong(x.scheduledOn!)}</>))}
    </Section>
    <Section id="sent" title="Sent" count={q.sent.length} testId="rq-sent" empty="No recorded reminders yet." note="A saved demo record is not proof of email delivery.">
      {q.sent.map(x => row(x, <span className={`rq-tag${x.outcome === "simulated" ? " demo" : ""}`}>{sentLabel(x)}</span>, <>Recorded {fmtShort(x.sentOn!)}</>))}
    </Section>
    <Section id="replies" title="Replies" count={q.replies.length} testId="rq-replies" empty="No replies recorded yet.">
      {q.replies.map(x => row(x, <span className="rq-reply">{x.reply}</span>, <>Reminder recorded {fmtShort(x.sentOn!)}</>))}
    </Section>
    <Section id="wait" title="No reply yet" count={q.noReply.length} testId="rq-no-reply" empty="Nobody needs a follow-up." note="At least 2 days since a recorded reminder, with no reply from that recipient.">
      {q.noReply.map(x => row(x, <button type="button" className="btn small" disabled={!x.candidateId || busy || persistenceFailed} title={x.blockedReason} onClick={() => review(x.nodeId)}>Follow up</button>, <>{x.days} days since reminder</>))}
    </Section>
  </div>
}

const sentLabel = (x: CentreRow) => x.legacy ? "Earlier record" : x.outcome === "recorded_by_sender" ? "Recorded by sender" : x.via === "automatic" ? "Automatic demo" : "Approved demo"

function Section({ id, title, count, testId, action, note, empty, children, bts }: { id: string; title: string; count: number; testId: string; action?: ReactNode; note?: ReactNode; empty: string; children: ReactNode; bts?: string }) {
  return <section className="card rq-section" aria-labelledby={`rq-${id}-h`} data-testid={testId}>
    <header><h2 id={`rq-${id}-h`}>{title}{count > 0 && <span className="rq-n">{count}</span>}</h2>{action}</header>
    {note && <p className="rq-note">{note}</p>}
    {count ? <ul className="rq-list">{children}</ul> : <p className="rq-empty">{empty}</p>}
    {bts && <BtsRow><Bts label="Rule engine">{bts}</Bts></BtsRow>}
  </section>
}

function Row({ x, action, note, risk }: { x: CentreRow; action?: ReactNode; note?: ReactNode; risk?: ReturnType<typeof forecastFor>["nodes"][string] }) {
  const rail = useRail()
  return <li className="rq-row rc-row" data-testid="rq-row" data-node={x.nodeId}>
    <span className="rq-mark">{risk && <RiskDot result={risk} />}</span>
    <div className="rq-main rc-main">
      {x.eventName && <span className="rc-event">{x.eventName}</span>}
      {x.taskAvailable ? <button type="button" className="row-btn" onClick={() => rail.show({ kind: "node", id: x.nodeId })}>{x.taskTitle}</button> : <strong>{x.taskTitle}</strong>}
      <span className="rq-meta">{x.recipientName ? <>To <b>{x.recipientName}</b> · </> : x.legacy ? "Recipient not recorded · " : ""}<strong>{x.due ? `Task due ${fmtShort(x.due)}` : x.legacy ? "Earlier reminder" : "Task due not set"}</strong></span>
      <span className="rc-explanation">{x.explanation}</span>
      {note && <span className="rq-meta">{note}</span>}
      {x.message && <details className="rc-snapshot"><summary>Recorded email</summary><pre>{x.message.text}</pre></details>}
    </div>
    {action && <span className="rq-act">{action}</span>}
  </li>
}

function YourReminders({ q }: { q: Centre }) {
  const { state, automaticReminders } = useStore()
  const upcoming = q.thisWeek.filter(x => x.recipientId === state.viewerId)
  const received = q.sent.filter(x => x.recipientId === state.viewerId)
  return <section className="card rq-section" aria-labelledby="rq-yours-h" data-testid="your-reminders">
    <header><h2 id="rq-yours-h">Your reminders</h2></header>
    {q.runtimeState !== "active" && <p className="rq-note">{q.runtimeState === "legacy" ? "Ask your president or VP to enable updated reminders." : "The saved reminder plan needs review. No reminders will run."}</p>}
    {automaticReminders.error && <p role="alert" className="rq-note">Automatic reminders could not be saved. Please let your president or VP know.</p>}
    <h3 className="rq-sub">Coming up</h3>
    {upcoming.length ? <ul className="rq-list">{upcoming.slice(0, 5).map(x => <Row key={x.id} x={x} note={<>Planned reminder {fmtLong(x.scheduledOn!)}</>} />)}</ul> : <p className="rq-empty">No reminders coming up for you this week.</p>}
    <h3 className="rq-sub">Recorded for you</h3>
    {received.length ? <ul className="rq-list">{received.map(x => <Row key={x.id} x={x} action={<span className="rq-tag">{sentLabel(x)}</span>} note={<>Recorded {fmtShort(x.sentOn!)}</>} />)}</ul> : <p className="rq-empty">No recorded reminders yet.</p>}
  </section>
}
