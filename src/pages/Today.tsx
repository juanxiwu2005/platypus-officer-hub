import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { useStore, useViewer } from "../data/store"
import type { ReminderMode } from "../data/types"
import { PageHead } from "../components/Page"
import { Bts, BtsRow } from "../components/Bts"
import { useRail } from "../components/rail/RailContext"
import { forecastFor, type Forecast } from "../engine/forecast"
import { RiskDot } from "../components/ui"
import { fmtLong, fmtShort } from "../lib/dates"
import { composeUrl } from "../lib/nudges"
import { digestCentre, firstName, reminderCentre, type CentreRow, type DigestPerson, type ReminderCentre as Centre } from "../reminders/centre"
import { prepareReminderDigest, recordReminderDigests, sendReminderDigests } from "../reminders/digest"
import type { ReminderDelivery } from "../reminders/contracts"
import { Mail, digestVia, usePreparedDigest } from "../reminders/DigestMail"
import { isReminderRuntime } from "../reminders/runtime"
import "../reminders/centre.css"
import "../reminders/digest-centre.css"

export default function Today() {
  const { state } = useStore()
  const { canNudge } = useViewer()
  const q = useMemo(() => reminderCentre(state), [state])
  return <><PageHead path="/" />{canNudge ? <ReminderCentre q={q} /> : <YourReminders q={q} />}</>
}

const people = (n: number) => n === 1 ? "1 person" : `${n} people`

/**
 * Concept F (Juanxi 2026-11-19), simplified in S2 (2026-11-22): one email per person. Each row expands in place to show
 * that person's email; the row's action follows the sending mode. The right rail still opens from History's Follow up.
 */
function ReminderCentre({ q }: { q: Centre }) {
  const { state, tryDispatch, getState, persistenceFailed, automaticReminders } = useStore()
  const rail = useRail()
  const forecast = useMemo(() => forecastFor(state), [state])
  const dc = useMemo(() => digestCentre(state, q), [state, q])
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState("")
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
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
      const sent = result.recordedGroupIds.length
      if (alive.current) setFeedback([sent ? `Sent to ${people(sent)}.` : "", result.error ?? ""].filter(Boolean).join(" ") || "These emails were not sent. Please try again.")
    } catch { if (alive.current) setFeedback("These emails were not sent. Please try again.") }
    finally { if (alive.current) setBusy(false) }
  }
  const reviewing = rail.open && rail.tab === "details" && rail.detail?.kind === "reminderDigest" ? rail.detail.recipientId : null
  const ready = q.runtimeState === "active"
  const n = dc.groups.length
  const history = q.sent.length + q.replies.length + q.noReply.length > 0
  // With no sending mode chosen, the next step is to choose one; it only navigates, so saving failures do not block it.
  const action = !ready ? null
    : q.mode === null ? <Link to="/settings?reminders=1" className="btn btn-primary small" data-testid="choose-mode">Choose how reminders go out</Link>
    : q.mode === "review_then_auto" && n > 0 ? <button type="button" className="btn btn-primary small" data-testid="send-all-digests" disabled={busy || persistenceFailed} onClick={sendAll}>{busy ? "Sending…" : "Send all"}</button>
    : q.mode === "auto_email" && dc.sentToday > 0 ? <span className="dg-state sent" data-testid="rq-auto-status">Sent automatically</span>
    : null
  return <div className="rq dg" data-testid="reminder-centre" data-mode={q.mode ?? "none"} aria-busy={busy || automaticReminders.busy}>
    <BtsRow><Bts label="Rule engine">Checks use each task's Start by and Due dates; a final check is 3 days overdue. One email per person per day.</Bts></BtsRow>
    {q.runtimeState === "invalid" && <section className="card rc-plan" data-testid="reminder-plan-status" aria-label="Reminder plan">
      <h2>Reminder plan needs review</h2>
      <p>The saved reminder plan is unavailable. It has been kept for recovery; no reminders will run.</p>
    </section>}
    {automaticReminders.busy && <p role="status" className="rq-note">Preparing automatic reminders…</p>}
    {automaticReminders.error && <div className="rc-save-error" role="alert"><p>{automaticReminders.error}</p><button type="button" className="btn small" disabled={automaticReminders.busy} onClick={automaticReminders.retry}>Retry automatic reminders</button></div>}
    {feedback && <p role="status" className="rq-note">{feedback}</p>}
    {persistenceFailed && <p role="alert" className="rq-note">Can't save in this browser.</p>}
    {ready && <section className="card dg-top" data-testid="rq-summary" aria-label="Today's reminder emails">
      <div className="dg-top-row">
        <p className="dg-top-text"><b>{n ? `${people(n)} to remind` : "Nothing to send today."}</b></p>
        {action}
      </div>
      {!n && dc.nextCheck && <p className="dg-top-note" data-testid="rq-next">Next check: {fmtLong(dc.nextCheck.on)} · {dc.nextCheck.count} planned this week</p>}
    </section>}
    {ready && dc.people.length > 0 && <section className="card dg-people" aria-labelledby="dg-people-h" data-testid="rq-people">
      <h2 id="dg-people-h" className="sr-only">Emails by person</h2>
      <ul className="dg-list">{dc.people.map(p => <PersonRow key={p.recipientId} p={p} mode={q.mode} reviewing={reviewing === p.recipientId} forecast={forecast} sendingAll={busy} />)}</ul>
      <BtsRow><Bts label="Rule engine">Tasks keep the rule engine's order: overdue, due, past due, then starts and follow-ups.</Bts></BtsRow>
    </section>}
    {ready && dc.fix.length > 0 && <section className="card rq-section dg-fix" aria-labelledby="dg-fix-h" data-testid="rq-fix">
      <header><h2 id="dg-fix-h">Fix first<span className="rq-n">{dc.fix.length}</span></h2></header>
      <ul className="rq-list">{dc.fix.map(x => <li key={x.id} className="dg-fix-row" data-testid="rq-row" data-node={x.nodeId}>
        <span className="dg-task-title">{x.title}</span>
        {x.problem ? <span className={`dg-chip ${x.tone}`}>{x.problem}</span> : <span />}
        {x.legacy ? <button type="button" className="btn small" disabled={persistenceFailed} onClick={() => reviewLegacy(x.nodeId)}>{x.action}</button>
          : x.taskAvailable ? <button type="button" className="btn small" aria-label={`${x.action}: ${x.title}`} onClick={() => rail.show({ kind: "node", id: x.nodeId })}>{x.action}</button> : <span />}
      </li>)}</ul>
    </section>}
    {history && <p className="dg-history-link" data-testid="rq-history">
      <button type="button" className="btn btn-quiet small" data-testid="open-history" onClick={() => rail.show({ kind: "reminderHistory" })}>History</button>
    </p>}
  </div>
}

/**
 * One person's row: their tasks, a disclosure with the full email, and the mode's one action. Nothing is really sent.
 * Button rule: the summary card's action (Send all, or Choose how reminders go out) is the screen's one filled button, so
 * row actions are outlined. Only "I review, then I send" has no summary action; there Open in Gmail stays filled.
 * Row actions are disabled while Send all runs.
 */
function PersonRow({ p, mode, reviewing, forecast, sendingAll }: { p: DigestPerson; mode: ReminderMode | null; reviewing: boolean; forecast: Forecast; sendingAll: boolean }) {
  const { getState, tryDispatch, persistenceFailed } = useStore()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState("")
  const [opened, setOpened] = useState<string | null>(null)
  const toggle = useRef<HTMLButtonElement>(null)
  // With no mode chosen yet, a lead sends the email themselves, as in the rail.
  const via = digestVia(mode)
  const { prepared, problem, retry } = usePreparedDigest(open ? p.group : null, p.recipientId, via)
  useEffect(() => { setOpened(null) }, [prepared])
  const status = p.group ? reviewing ? "reviewing" : "next" : "sent"
  const first = firstName(p.name)
  const region = `dg-email-${p.recipientId.replace(/[^\w-]/g, "_")}`
  /** The same prepare-and-record path as the rail's Send & next: one recordReminderDigests action for this person's email. */
  const record = async (how: ReminderDelivery["via"], clicks: number) => {
    if (busy || sendingAll || persistenceFailed || !p.group || clicks > 1) return
    setBusy(true); setNote("")
    try {
      const ready = prepared ?? await prepareReminderDigest({ getState, tryDispatch }, p.group.id, window.location.origin, how)
      if ("error" in ready) { setNote(ready.error); return }
      if (how !== "manual" && !ready.digest.intendedEmail) { setNote("Add a valid email address for this person before sending."); return }
      const result = recordReminderDigests({ getState, tryDispatch }, [ready], how)
      if (!result.recordedGroupIds.includes(ready.groupId)) { setNote(result.error ?? "This email changed. Review the new version, then try again."); retry(); return }
      setNote(`Sent to ${first}.`)
      toggle.current?.focus()
    } catch { setNote("This email was not sent. Please try again.") }
    finally { setBusy(false) }
  }
  const shown = open ? [note, problem].filter(Boolean).join(" ") : note
  const gmailBtn = mode === "review_then_self" ? "btn btn-primary small" : "btn small"
  return <li className="dg-person" data-testid="rq-person" data-recipient={p.recipientId} data-state={status} data-open={open || undefined}>
    <div className="dg-person-head">
      <button ref={toggle} type="button" className="dg-person-toggle" aria-expanded={open} aria-controls={region} data-testid="rq-person-toggle" onClick={() => setOpen(o => !o)}>
        <span className="avatar dg-av" aria-hidden="true">{p.initials}</span>
        <span className="dg-name"><span className="sr-only">Email to</span>{" "}{p.name}</span>
        <span className="dg-caret" aria-hidden="true" />
      </button>
      {status === "sent" ? <span className="dg-state sent">Sent</span>
        : mode === "review_then_auto" ? <button type="button" className="btn small" data-testid="rq-person-send" aria-label={`Send to ${first}`} disabled={busy || sendingAll || persistenceFailed} onClick={event => record("platypus", event.detail)}>{busy ? "Sending…" : "Send"}</button>
        : null}
    </div>
    <ul className="dg-tasks">{p.tasks.map(t => <li key={t.id} className="dg-task" data-testid="rq-person-task" data-node={t.nodeId}>
      <span className="rq-mark">{t.risk && forecast.nodes[t.nodeId] && <RiskDot result={forecast.nodes[t.nodeId]} />}</span>
      <span className="dg-task-title">{t.title}</span>
      {t.chip && <span className={`dg-chip ${t.tone}`}>{t.chip}</span>}
    </li>)}</ul>
    <div id={region} className="dg-inline" data-testid="rq-person-email" hidden={!open}>
      {open && (p.group ? <>
        {prepared ? <Mail label={`Email to ${p.name}`} to={prepared.digest.intendedEmail} subject={prepared.digest.subject} body={prepared.digest.body} />
          : !problem && !persistenceFailed && <p className="small muted" role="status">Preparing the email…</p>}
        {via === "manual" && <div className="dg-nav">
          {prepared ? <a className={gmailBtn} data-testid="rq-person-gmail" href={composeUrl("email", prepared.digest.body, prepared.digest.subject)} target="_blank" rel="noreferrer" onClick={() => setOpened(prepared.groupId)}>Open in Gmail</a>
            : <button type="button" className={gmailBtn} data-testid="rq-person-gmail" disabled>Open in Gmail</button>}
          {prepared && opened === prepared.groupId && <button type="button" className="btn small" data-testid="rq-person-sent-self" disabled={busy || sendingAll || persistenceFailed} onClick={event => record("manual", event.detail)}>I sent this</button>}
        </div>}
      </> : p.sent && <Mail label={`Email to ${p.name}`} to={p.sent.intendedEmail} subject={p.sent.subject} body={p.sent.body} />)}
    </div>
    {/* Always mounted so screen readers announce "Sent to …" and other notes when they appear. */}
    <p className="small dg-row-note" role="status">{shown}</p>
  </li>
}

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
    <BtsRow><Bts label="Rule engine">Planned checks use the stored task dates. Recorded reminders follow the saved recipient.</Bts></BtsRow>
    {q.runtimeState === "invalid" && <p className="rq-note">The saved reminder plan needs review. No reminders will run.</p>}
    {automaticReminders.error && <p role="alert" className="rq-note">Automatic reminders could not be saved. Please let your president or VP know.</p>}
    <h3 className="rq-sub">Coming up</h3>
    {upcoming.length ? <ul className="rq-list">{upcoming.slice(0, 5).map(x => <Row key={x.id} x={x} note={<>Planned reminder {fmtLong(x.scheduledOn!)}</>} />)}</ul> : <p className="rq-empty">Nothing this week.</p>}
    <h3 className="rq-sub">Recorded for you</h3>
    {received.length ? <ul className="rq-list">{received.map(x => <Row key={x.id} x={x} action={<span className="rq-tag">Sent</span>} note={<>Recorded {fmtShort(x.sentOn!)}</>} />)}</ul> : <p className="rq-empty">No recorded reminders yet.</p>}
  </section>
}
