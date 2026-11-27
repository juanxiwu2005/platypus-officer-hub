import { useEffect, useId, useMemo, useRef, useState } from "react"
import { Link, useLocation, useSearchParams } from "react-router-dom"
import { useStore, useViewer } from "../data/store"
import { isPresident } from "../data/permissions"
import { PageHead } from "../components/Page"
import { Bts, BtsRow } from "../components/Bts"
import { useRail } from "../components/rail/RailContext"
import { forecastFor } from "../engine/forecast"
import { fmtLong } from "../lib/dates"
import { digestCentre, PERSON_PARAM, reminderCentre, sendAllFeedback, type DigestPerson, type FixRow, type ReminderCentre as Centre } from "../reminders/centre"
import { sendReminderDigests } from "../reminders/digest"
import { loadedDraftModule, useSendAllBlocker } from "../reminders/draftLoader"
import { draftTitleOf } from "../reminders/draftLinks"
import type { PreparedDigest } from "../reminders/digestContracts"
import { PersonRow } from "../reminders/PersonRow"
import { ProblemChip } from "../reminders/ReasonChip"
import { YourReminders } from "../reminders/YourReminders"
import { isReminderRuntime } from "../reminders/runtime"
import { WeeklyLine } from "../components/cheers/WeeklyLine"
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
 * Rows keep the order of this visit's first render (step 0, 2026-11-27): a sent row is marked in place and never moves under
 * the pointer; someone new joins at the end. The data functions stay pure; only the page remembers the order.
 */
function useVisitOrder(list: DigestPerson[]): DigestPerson[] {
  const ids = list.map(p => p.recipientId)
  const [order, setOrder] = useState(ids)
  const merged = ids.every(id => order.includes(id)) ? order : [...order, ...ids.filter(id => !order.includes(id))]
  useEffect(() => { if (merged !== order) setOrder(merged) }, [merged, order])
  return [...list].sort((a, b) => merged.indexOf(a.recipientId) - merged.indexOf(b.recipientId))
}

/**
 * Concept F (Juanxi 2026-11-19), simplified in S2 (2026-11-22): one email per person. Each row expands in place to show
 * that person's email; the row's action follows the sending mode. History's Follow up opens a row here (`?person=`).
 * Step 0 (2026-11-27): one polite status line, always mounted, in the summary card (or the plan card when reminders cannot run).
 */
function ReminderCentre({ q }: { q: Centre }) {
  const { state, tryDispatch, getState, persistenceFailed, automaticReminders, exportData } = useStore()
  const rail = useRail()
  const forecast = useMemo(() => forecastFor(state), [state])
  const dc = useMemo(() => digestCentre(state, q), [state, q])
  const rows = useVisitOrder(dc.people)
  const draftBlocker = useSendAllBlocker(dc.groups, state.today)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState("")
  const summary = useRef<HTMLParagraphElement>(null)
  const statusId = useId()
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  // History → Follow up: open that person's row, then drop the parameter so a reload does not reopen it.
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const wanted = params.get(PERSON_PARAM)
  const [reveal, setReveal] = useState<{ id: string; n: number } | null>(null)
  useEffect(() => {
    if (!wanted) return
    setReveal(r => ({ id: wanted, n: (r?.n ?? 0) + 1 }))
    setParams(p => { p.delete(PERSON_PARAM); return p }, { replace: true })
  }, [wanted, location.key, setParams])
  const reviewLegacy = (nodeId: string) => {
    const saved = tryDispatch({ type: "reviewLegacyReminder", nodeId })
    const runtime = getState().reminderRuntime
    setFeedback(saved && isReminderRuntime(runtime) && !runtime.legacyUnresolvedNodeIds?.includes(nodeId)
      ? "Future reminders are enabled for the current assignment. Earlier history is unchanged."
      : "This review was not saved. Check the current assignment and browser saving.")
  }
  const sendAll = async () => {
    if (busy || persistenceFailed || !dc.groups.length) return
    const earlier = dc.people.filter(p => p.sent && !p.group).length
    // R-S0: Send all is disabled while a draft cannot go out (sendBlocker); this click-time check is only a guard.
    const stop = loadedDraftModule()?.sendAllBlocker(dc.groups, state.today)
    if (stop) { setFeedback(stop); return }
    setBusy(true); setFeedback("")
    // Each person's current draft is resolved against the email just prepared for them, never against an older one.
    const resolve = (prepared: PreparedDigest[]) => loadedDraftModule()?.resolveDrafts(prepared, draftTitleOf(getState())) ?? { edits: {}, blocker: null }
    try {
      const result = await sendReminderDigests({ getState, tryDispatch }, dc.groups.map(g => g.id), window.location.origin, "platypus", () => alive.current, resolve)
      loadedDraftModule()?.dropDrafts(result.recordedGroupIds)
      if (alive.current) setFeedback(sendAllFeedback(result.recordedGroupIds.length, earlier, result.error))
    } catch { if (alive.current) setFeedback("These emails were not sent. Please try again.") }
    finally {
      if (alive.current) { setBusy(false); summary.current?.focus() }   // Send all may disappear: focus never falls to the page body
    }
  }
  // Task Details opens at its waiting form (reply "waiting") for the president or the task's owner; others get the task itself.
  const canChooseWaiting = (x: FixRow) => isPresident(state) || state.nodes.find(n => n.id === x.nodeId)?.ownerId === state.viewerId
  const openFix = (x: FixRow) => rail.show(x.opens === "waiting" && canChooseWaiting(x) ? { kind: "task", id: x.nodeId, reply: "waiting" } : { kind: "node", id: x.nodeId })
  const ready = q.runtimeState === "active"
  const n = dc.groups.length
  const history = q.sent.length + q.replies.length + q.noReply.length > 0
  const auto = q.mode === "auto_email"
  const autoSent = dc.people.filter(p => p.sent?.via === "automatic").length
  const notSent = auto && automaticReminders.error ? dc.people.filter(p => p.group).map(p => p.name) : []
  // R-S0 §4: Send all is disabled while a draft has a missing link, a limit or an edit waiting for review, and says why here.
  const sendBlocker = q.mode === "review_then_auto" && n > 0 && !busy ? draftBlocker : null
  const said = feedback && feedback !== sendBlocker ? [feedback, sendBlocker].filter(Boolean).join(" ") : sendBlocker ?? feedback
  const status = <p role="status" id={statusId} className="dg-top-note dg-feedback" data-testid="rq-feedback">{automaticReminders.busy ? "Preparing automatic reminders…" : said}</p>
  // With no sending mode chosen, the next step is to choose one; it only navigates, so saving failures do not block it.
  const action = !ready ? null
    : q.mode === null ? <Link to="/settings?reminders=1" className="btn btn-primary small" data-testid="choose-mode">Choose how reminders go out</Link>
    : q.mode === "review_then_auto" && n > 0 ? <button type="button" className="btn btn-primary small" data-testid="send-all-digests" disabled={busy || persistenceFailed || !!sendBlocker} aria-describedby={sendBlocker ? statusId : undefined} onClick={sendAll}>{busy ? "Sending…" : `Send ${n} email${n === 1 ? "" : "s"}`}</button>
    : null
  const headline = auto && autoSent > 0 ? `Sent automatically to ${people(autoSent)} today.` : n ? `${people(n)} to remind` : "Nothing to send today."
  return <div className="rq dg" data-testid="reminder-centre" data-mode={q.mode ?? "none"} data-busy={busy || automaticReminders.busy}>
    <BtsRow><Bts label="Rule engine">Checks use each task's Start by and Due dates; a final check is 3 days overdue. One email per person per day.</Bts></BtsRow>
    {q.runtimeState === "invalid" && <section className="card rc-plan" data-testid="reminder-plan-status" aria-label="Reminder plan">
      <h2>Reminder plan needs review</h2>
      <p>The saved reminder plan can't be read, so no reminders run. It is kept unchanged for recovery.</p>
      <button type="button" className="btn small" onClick={exportData}>Download saved data</button>
      {status}
    </section>}
    {q.runtimeState === "legacy" && <section className="card rc-plan" data-testid="reminder-plan-status" aria-label="Reminder plan">
      <h2>Reminders are paused</h2>
      <p>This saved data still uses an older reminder plan. Reloading updates it and keeps all history.</p>
      <button type="button" className="btn small" onClick={() => window.location.reload()}>Reload</button>
      {status}
    </section>}
    {automaticReminders.error && <div className="rc-save-error" role="alert"><p>{automaticReminders.error}</p><button type="button" className="btn small" disabled={automaticReminders.busy} onClick={automaticReminders.retry}>Retry automatic reminders</button></div>}
    {persistenceFailed && <p role="alert" className="rq-note">Can't save in this browser.</p>}
    {/* Cheers (R1, F7): president and VP, Monday to Wednesday. */}
    <WeeklyLine />
    {ready && <section className="card dg-top" data-testid="rq-summary" aria-label="Today's reminder emails">
      <div className="dg-top-row">
        <p className="dg-top-text" ref={summary} tabIndex={-1} data-testid="rq-summary-line"><b>{headline}</b></p>
        {action}
      </div>
      {notSent.length > 0 && <p className="dg-top-note" data-testid="rq-auto-failed">Not sent: {notSent.join(", ")}</p>}
      {!n && dc.nextCheck && <p className="dg-top-note" data-testid="rq-next">Next check: {fmtLong(dc.nextCheck.on)} · {dc.nextCheck.count} planned this week</p>}
      {status}
    </section>}
    {ready && rows.length > 0 && <section className="card dg-people" aria-labelledby="dg-people-h" data-testid="rq-people">
      <h2 id="dg-people-h" className="sr-only">Emails by person</h2>
      <ul className="dg-list" aria-busy={busy || automaticReminders.busy}>{rows.map(p => <PersonRow key={p.recipientId} p={p} mode={q.mode} forecast={forecast} sendingAll={busy}
        reveal={reveal?.id === p.recipientId ? reveal.n : 0} onAction={() => setFeedback("")} onSent={setFeedback} />)}</ul>
      <BtsRow><Bts label="Rule engine">Order: overdue, due, other late tasks, then starts and follow-ups.</Bts></BtsRow>
    </section>}
    {ready && dc.fix.length > 0 && <section className="card rq-section dg-fix" aria-labelledby="dg-fix-h" data-testid="rq-fix">
      {/* Read as "Fix first, 8", not "Fix first8". */}
      <header><h2 id="dg-fix-h" aria-label={`Fix first, ${dc.fix.length}`}>Fix first<span className="rq-n">{dc.fix.length}</span></h2></header>
      <ul className="rq-list">{dc.fix.map(x => <li key={x.id} className="dg-fix-row" data-testid="rq-row" data-node={x.nodeId}>
        <span className="dg-task-title">{x.title}</span>
        {x.problem ? <ProblemChip problem={x.problem} /> : <span />}
        {x.opens === "legacy" ? <button type="button" className="btn small" disabled={persistenceFailed} onClick={() => { setFeedback(""); reviewLegacy(x.nodeId) }}>{x.action}</button>
          : x.taskAvailable ? x.opens === "waiting" && canChooseWaiting(x)
            ? <button type="button" className="btn small" aria-label={`Choose who this waits on: ${x.title}`} onClick={() => openFix(x)}>{x.action}</button>
            : <button type="button" className="btn small" aria-label={`Open task: ${x.title}`} onClick={() => openFix(x)}>{x.opens === "waiting" ? "Open task" : x.action}</button>
          : <span />}
      </li>)}</ul>
    </section>}
    {history && <p className="dg-history-link" data-testid="rq-history">
      <button type="button" className="btn btn-quiet small" data-testid="open-history" onClick={() => rail.show({ kind: "reminderHistory" })}>History</button>
    </p>}
  </div>
}
