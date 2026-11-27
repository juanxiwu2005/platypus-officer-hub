import { useEffect, useRef, useState } from "react"
import { useStore } from "../data/store"
import type { ReminderMode } from "../data/types"
import type { Forecast } from "../engine/forecast"
import { RiskDot } from "../components/ui"
import { composeUrl } from "../lib/nudges"
import { firstName, type DigestPerson } from "./centre"
import { prepareReminderDigest, recordReminderDigests } from "./digest"
import type { ReminderDelivery } from "./contracts"
import { Mail, digestVia, usePreparedDigest } from "./DigestMail"

/**
 * One person's row: their tasks, a disclosure with the full email, and the mode's one action. Nothing is really sent.
 * Button rule: the summary card's action (Send all, or Choose how reminders go out) is the screen's one filled button, so
 * row actions are outlined. Only "I review, then I send" has no summary action; there Open in Gmail stays filled.
 * Row actions are disabled while Send all runs.
 *
 * Step 0 (2026-11-27): the name is an h3 holding the disclosure button. A recorded email is announced once through the page's
 * one polite status line (`onSent`), not on the row, so no stale "Sent to …" stays beside "Sent". Row errors stay on the row.
 * `reveal` (a counter) opens the row, scrolls it into view and focuses its toggle (History → Follow up).
 */
export function PersonRow({ p, mode, forecast, sendingAll, reveal = 0, onAction, onSent }: { p: DigestPerson; mode: ReminderMode | null; forecast: Forecast; sendingAll: boolean
  reveal?: number; onAction?: () => void; onSent?: (text: string) => void }) {
  const { getState, tryDispatch, persistenceFailed } = useStore()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState("")
  const [opened, setOpened] = useState<string | null>(null)
  const toggle = useRef<HTMLButtonElement>(null)
  // With no mode chosen yet, a lead sends the email themselves.
  const via = digestVia(mode)
  const { prepared, problem, retry } = usePreparedDigest(open ? p.group : null, p.recipientId, via)
  useEffect(() => { setOpened(null) }, [prepared])
  useEffect(() => {
    if (!reveal || !(p.group || p.sent)) return
    setOpen(true)
    // After this render and after the rail returned focus to its own trigger (closeDetail does that on a timer).
    const t = setTimeout(() => { toggle.current?.scrollIntoView?.({ block: "center" }); toggle.current?.focus() }, 0)
    return () => clearTimeout(t)
  }, [reveal])
  // "held": no email today, only tasks that wait for this person's next email.
  const status = p.group ? "next" : p.sent ? "sent" : "held"
  const first = firstName(p.name)
  const region = `dg-email-${p.recipientId.replace(/[^\w-]/g, "_")}`
  /** One recordReminderDigests action for this person's email (the same path as Send all, for one group). */
  const record = async (how: ReminderDelivery["via"], clicks: number) => {
    if (busy || sendingAll || persistenceFailed || !p.group || clicks > 1) return
    setBusy(true); setNote(""); onAction?.()
    try {
      const ready = prepared ?? await prepareReminderDigest({ getState, tryDispatch }, p.group.id, window.location.origin, how)
      if ("error" in ready) { setNote(ready.error); return }
      if (how !== "manual" && !ready.digest.intendedEmail) { setNote("Add a valid email address for this person before sending."); return }
      const result = recordReminderDigests({ getState, tryDispatch }, [ready], how)
      if (!result.recordedGroupIds.includes(ready.groupId)) { setNote(result.error ?? "This email changed. Review the new version, then try again."); retry(); return }
      onSent?.(`Sent to ${first}.`)
      toggle.current?.focus()
    } catch { setNote("This email was not sent. Please try again.") }
    finally { setBusy(false) }
  }
  const shown = open ? [note, problem].filter(Boolean).join(" ") : note
  const gmailBtn = mode === "review_then_self" ? "btn btn-primary small" : "btn small"
  return <li className="dg-person" data-testid="rq-person" data-recipient={p.recipientId} data-state={status} data-open={open || undefined}>
    <div className="dg-person-head">
      <h3 className="dg-person-h">{status === "held"
        ? <span className="dg-person-toggle dg-person-static"><span className="avatar dg-av" aria-hidden="true">{p.initials}</span><span className="dg-name">{p.name}</span></span>
        : <button ref={toggle} type="button" className="dg-person-toggle" aria-expanded={open} aria-controls={region} data-testid="rq-person-toggle" onClick={() => setOpen(o => !o)}>
          <span className="avatar dg-av" aria-hidden="true">{p.initials}</span>
          <span className="dg-name"><span className="sr-only">Email to</span>{" "}{p.name}</span>
          <span className="dg-caret" aria-hidden="true" />
        </button>}
      </h3>
      {p.held > 0 && <span className="dg-state" data-testid="rq-person-held">+{p.held} in the next email</span>}
      {status === "sent" ? <span className="dg-state sent">Sent</span>
        : status === "next" && mode === "review_then_auto" ? <button type="button" className="btn small" data-testid="rq-person-send" aria-label={`Send to ${first}`} disabled={busy || sendingAll || persistenceFailed} onClick={event => record("platypus", event.detail)}>{busy ? "Sending…" : "Send"}</button>
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
    {/* A problem with this row's email, beside its action. Success is announced by the page's one status line instead. */}
    <p className="small dg-row-note" role={shown ? "alert" : undefined}>{shown}</p>
  </li>
}

