import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { useStore, useViewer } from "../data/store"
import { PageHead } from "../components/Page"
import { Bts, BtsRow } from "../components/Bts"
import { useRail } from "../components/rail/RailContext"
import { forecastFor } from "../engine/forecast"
import { RiskDot } from "../components/ui"
import { fmtLong, fmtShort } from "../lib/dates"
import { onboardingCopy } from "../onboarding/copy"
import { digestCentre, reminderCentre, type CentreRow, type ReminderCentre as Centre } from "../reminders/centre"
import { sendReminderDigests } from "../reminders/digest"
import { isReminderRuntime } from "../reminders/runtime"
import "../reminders/centre.css"
import "../reminders/digest-centre.css"

export default function Today() {
  const { state } = useStore()
  const { canNudge } = useViewer()
  const q = useMemo(() => reminderCentre(state), [state])
  const mode = state.org.settings.reminderMode
  const modeTitle = canNudge && q.runtimeState === "active" && mode ? onboardingCopy.founder.reminders.options[mode]?.title : undefined
  const actions = modeTitle && <span className="dg-mode" data-testid="reminder-mode-chip"><span className="dg-mode-dot" aria-hidden="true" />{modeTitle}<Link to="/settings?reminders=1" data-testid="change-mode" aria-label="Change how reminders go out">Change</Link></span>
  return <><PageHead path="/" actions={actions || undefined} />{canNudge ? <ReminderCentre q={q} /> : <YourReminders q={q} />}</>
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

/** Concept F (Juanxi 2026-11-19): one email per person, reviewed one by one in the right rail or sent all at once. */
function ReminderCentre({ q }: { q: Centre }) {
  const { state, tryDispatch, getState, persistenceFailed, automaticReminders } = useStore()
  const rail = useRail()
  const forecast = useMemo(() => forecastFor(state), [state])
  const dc = useMemo(() => digestCentre(state, q), [state, q])
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState("")
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
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
  const sendAll = async () => {
    if (busy || persistenceFailed || !dc.groups.length) return
    setBusy(true); setFeedback("")
    try {
      const result = await sendReminderDigests({ getState, tryDispatch }, dc.groups.map(g => g.id), window.location.origin, "platypus", () => alive.current)
      if (alive.current) setFeedback(`${plural(result.recordedGroupIds.length, "email")} recorded. Demo: nothing is sent.${result.error ? ` ${result.error}` : ""}`)
    } catch { if (alive.current) setFeedback("These emails were not recorded. Please try again.") }
    finally { if (alive.current) setBusy(false) }
  }
  const openPerson = (recipientId: string) => rail.show({ kind: "reminderDigest", recipientId })
  const reviewing = rail.open && rail.tab === "details" && rail.detail?.kind === "reminderDigest" ? rail.detail.recipientId : null
  const ready = q.runtimeState === "active"
  const n = dc.groups.length
  const history = q.sent.length + q.replies.length + q.noReply.length > 0
  const action = !ready || !n ? null
    : q.mode === "review_then_auto" ? <button type="button" className="btn btn-primary small" data-testid="send-all-digests" disabled={busy || persistenceFailed} onClick={sendAll}>{busy ? "Recording…" : `Send all ${plural(n, "email")}`}</button>
    : q.mode === "review_then_self" ? <button type="button" className="btn btn-primary small" data-testid="open-first-draft" disabled={persistenceFailed} onClick={() => openPerson(dc.groups[0].recipientId)}>Open draft 1 of {n}</button>
    : null
  return <div className="rq dg" data-testid="reminder-centre" data-mode={q.mode ?? "none"} aria-busy={busy || automaticReminders.busy}>
    <BtsRow><Bts label="Rule engine">Checks use the rule engine's latest start and Task due; a final check is 3 days overdue. One email per person per day.</Bts></BtsRow>
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
    {ready && <section className="card dg-top" data-testid="rq-summary" aria-label="Today's reminder emails">
      <div className="dg-top-row">
        <p className="dg-top-text">{n ? <><b>{q.mode === "auto_email" ? `${plural(n, "email")} today` : `Review ${plural(n, "email")}`}</b><span className="dg-quiet"> · {plural(dc.tasks, "task")} · {dc.sentToday} sent today</span></>
          : <><b>Nothing to send today.</b>{dc.sentToday > 0 && <span className="dg-quiet"> · {dc.sentToday} sent today</span>}</>}</p>
        {dc.people.length > 1 && <span className="dg-steps" aria-hidden="true">{dc.people.map(p => <i key={p.recipientId} className={p.sent && !p.group ? "on" : undefined} />)}</span>}
        {action}
      </div>
      {q.mode === null ? <p className="dg-top-note"><Link to="/settings?reminders=1" data-testid="choose-mode">Choose how reminders go out</Link></p>
        : q.mode === "auto_email" && n > 0 ? <p className="dg-top-note">Platypus sends these automatically. Demo: nothing is sent.</p> : null}
      {dc.nextCheck && <p className="dg-top-note" data-testid="rq-next">Next check: {fmtLong(dc.nextCheck.on)} · {dc.nextCheck.count} planned this week</p>}
      {dc.held > 0 && <p className="dg-top-note" data-testid="rq-held">{plural(dc.held, "task")} wait for the next email (reminder limit).</p>}
    </section>}
    {ready && dc.people.length > 0 && <section className="card dg-people" aria-labelledby="dg-people-h" data-testid="rq-people">
      <h2 id="dg-people-h" className="sr-only">Emails by person</h2>
      <ul className="dg-list">{dc.people.map(p => {
        const status = p.group ? reviewing === p.recipientId ? "reviewing" : "next" : "sent"
        return <li key={p.recipientId} className="dg-person" data-testid="rq-person" data-recipient={p.recipientId} data-state={status}>
          <button type="button" className="dg-person-head" onClick={() => openPerson(p.recipientId)}>
            <span className="avatar dg-av" aria-hidden="true">{p.initials}</span>
            <span className="dg-name">{p.name}</span>
            <span className={`dg-state ${status}`}>{status === "sent" ? "Sent ✓" : status === "reviewing" ? "Reviewing" : "Up next"}</span>
          </button>
          <ul className="dg-tasks">{p.tasks.map(t => <li key={t.id} className="dg-task" data-testid="rq-person-task" data-node={t.nodeId}>
            <span className="rq-mark">{t.risk && forecast.nodes[t.nodeId] && <RiskDot result={forecast.nodes[t.nodeId]} />}</span>
            <span className="dg-task-title">{t.title}</span>
            {t.chip && <span className={`dg-chip ${t.tone}`}>{t.chip}</span>}
          </li>)}</ul>
          {p.otherOpen > 0 && <button type="button" className="dg-more" onClick={() => openPerson(p.recipientId)}>Also has {plural(p.otherOpen, "other open task")}</button>}
        </li>
      })}</ul>
      <BtsRow><Bts label="Rule engine">Tasks keep the rule engine's order: overdue, due, past due, then starts and follow-ups.</Bts></BtsRow>
    </section>}
    {ready && dc.fix.length > 0 && <section className="card rq-section dg-fix" aria-labelledby="dg-fix-h" data-testid="rq-fix">
      <header><h2 id="dg-fix-h">Fix first<span className="rq-n">{dc.fix.length}</span></h2></header>
      <ul className="rq-list">{dc.fix.map(x => <li key={x.id} className="dg-fix-row" data-testid="rq-row" data-node={x.nodeId}>
        <span className="dg-task-title">{x.title}</span>
        <span className={`dg-chip ${x.tone}`}>{x.problem}</span>
        {x.legacy ? <button type="button" className="btn small" disabled={persistenceFailed} onClick={() => reviewLegacy(x.nodeId)}>{x.action}</button>
          : x.taskAvailable ? <button type="button" className="btn small" aria-label={`${x.action}: ${x.title}`} onClick={() => rail.show({ kind: "node", id: x.nodeId })}>{x.action}</button> : <span />}
      </li>)}</ul>
    </section>}
    {history && <section className="card dg-history-line" data-testid="rq-history" aria-label="Reminder history">
      <p>{dc.sentWeek} sent this week · {q.replies.length} replied · {q.noReply.length} no reply</p>
      <button type="button" className="btn small" data-testid="open-history" onClick={() => rail.show({ kind: "reminderHistory" })}>History</button>
    </section>}
  </div>
}

const sentLabel = (x: CentreRow) => x.legacy ? "Earlier record" : x.outcome === "recorded_by_sender" ? "Recorded by sender" : x.via === "automatic" ? "Automatic demo" : "Approved demo"

function Row({ x, action, note }: { x: CentreRow; action?: ReactNode; note?: ReactNode }) {
  const rail = useRail()
  return <li className="rq-row rc-row" data-testid="rq-row" data-node={x.nodeId}>
    <span className="rq-mark" />
    <div className="rq-main rc-main">
      {x.eventName && <span className="rc-event">{x.eventName}</span>}
      {x.taskAvailable ? <button type="button" className="row-btn" onClick={() => rail.show({ kind: "node", id: x.nodeId })}>{x.taskTitle}</button> : <strong>{x.taskTitle}</strong>}
      <span className="rq-meta">{x.recipientName ? <>To <b>{x.recipientName}</b> · </> : x.legacy ? "Recipient not recorded · " : ""}<strong>{x.due ? `Task due ${fmtShort(x.due)}` : x.legacy ? "Earlier reminder" : "Task due not set"}</strong></span>
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
    <BtsRow><Bts label="Rule engine">Planned checks use the stored task dates. Recorded reminders follow the saved recipient; this demo sends no email.</Bts></BtsRow>
    {q.runtimeState !== "active" && <p className="rq-note">{q.runtimeState === "legacy" ? "Ask your president or VP to enable updated reminders." : "The saved reminder plan needs review. No reminders will run."}</p>}
    {automaticReminders.error && <p role="alert" className="rq-note">Automatic reminders could not be saved. Please let your president or VP know.</p>}
    <h3 className="rq-sub">Coming up</h3>
    {upcoming.length ? <ul className="rq-list">{upcoming.slice(0, 5).map(x => <Row key={x.id} x={x} note={<>Planned reminder {fmtLong(x.scheduledOn!)}</>} />)}</ul> : <p className="rq-empty">No reminders coming up for you this week.</p>}
    <h3 className="rq-sub">Recorded for you</h3>
    {received.length ? <ul className="rq-list">{received.map(x => <Row key={x.id} x={x} action={<span className="rq-tag">{sentLabel(x)}</span>} note={<>Recorded {fmtShort(x.sentOn!)}</>} />)}</ul> : <p className="rq-empty">No recorded reminders yet.</p>}
  </section>
}
