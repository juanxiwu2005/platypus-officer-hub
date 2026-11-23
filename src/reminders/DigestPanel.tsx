import { useEffect, useMemo, useRef, useState } from "react"
import { useStore } from "../data/store"
import { canLead } from "../data/permissions"
import { useRail } from "../components/rail/RailContext"
import { StatusPill } from "../components/ui"
import { composeUrl } from "../lib/nudges"
import { fmtLong, fmtShort } from "../lib/dates"
import { digestCentre, firstName, openTasksOf, reminderCentre, type CentreRow } from "./centre"
import { recordReminderDigests } from "./digest"
import type { ReminderDigestSnapshot } from "./digestContracts"
import type { ReminderDelivery } from "./contracts"
import { isReminderRuntime } from "./runtime"
import { Mail, digestVia, usePreparedDigest } from "./DigestMail"
import "./digest-centre.css"

/** Today's combined email for one person. No AI request: the text comes from the rules and the engine. */
export default function DigestPanel({ recipientId, onClose }: { recipientId: string; onClose: () => void }) {
  const { state, getState, tryDispatch, persistenceFailed } = useStore()
  const rail = useRail()
  const centre = useMemo(() => digestCentre(state), [state])
  const mode = state.org.settings.reminderMode ?? null
  const via = digestVia(mode)
  const allowed = canLead(state)
  const entry = centre.people.find(p => p.recipientId === recipientId) ?? null
  const group = entry?.group ?? null
  const name = entry?.name ?? state.people.find(p => p.id === recipientId)?.name ?? "Former member"
  const first = firstName(name)
  const { prepared, problem, retry } = usePreparedDigest(group, recipientId, via)
  const [status, setStatus] = useState("")
  const [opened, setOpened] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const keepStatus = useRef(false)
  const heading = useRef<HTMLHeadingElement>(null)
  // A new person starts clean; only the "sent" note from Send & next carries over.
  useEffect(() => { heading.current?.focus(); if (!keepStatus.current) setStatus(""); keepStatus.current = false }, [recipientId])
  useEffect(() => { setOpened(null) }, [prepared])
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && !event.defaultPrevented) onClose() }
    window.addEventListener("keydown", escape)
    return () => window.removeEventListener("keydown", escape)
  }, [onClose])

  const later = centre.groups.filter(g => g.recipientId !== recipientId)
  const after = later.find(g => centre.groups.indexOf(g) > centre.groups.indexOf(group!)) ?? later[0]
  const needsEmail = via !== "manual" && !!prepared && !prepared.digest.intendedEmail
  const disabled = busy || persistenceFailed || !prepared || needsEmail
  const record = (how: ReminderDelivery["via"], clicks = 1) => {
    // A double click must not approve the next person's email, which can appear under the pointer right away.
    if (disabled || !prepared || clicks > 1) return
    setBusy(true)
    const order = centre.groups.map(g => g.recipientId)
    const result = recordReminderDigests({ getState, tryDispatch }, [prepared], how)
    setBusy(false)
    if (!result.recordedGroupIds.includes(prepared.groupId)) {
      setStatus(result.error ?? "This email changed. Review the new version, then try again.")
      retry()
      return
    }
    const left = digestCentre(getState()).groups.map(g => g.recipientId)
    const at = order.indexOf(recipientId)
    const next = [...order.slice(at + 1), ...order.slice(0, at)].find(id => left.includes(id)) ?? left[0]
    if (next) { keepStatus.current = true; setStatus(`Sent to ${first}.`); rail.show({ kind: "reminderDigest", recipientId: next }) }
    else setStatus("All sent.")
  }

  const sent = entry?.sent ?? null
  const tasks = openTasksOf(state, recipientId).slice().sort((a, b) => (a.clubDeadline ?? "9999").localeCompare(b.clubDeadline ?? "9999"))
  return <section className="panel dg-panel" aria-labelledby="dg-heading" data-testid="digest-panel" data-recipient={recipientId} aria-busy={busy}>
    <div className="panel-head"><span className="eyebrow">{sent && !group ? "Sent" : "Email"}</span><button type="button" className="btn btn-quiet" aria-label="Close email" onClick={onClose}>✕</button></div>
    <h2 id="dg-heading" ref={heading} tabIndex={-1}>{name}</h2>
    {!allowed ? <p className="small warn-text" role="status">Only the president or vice president can review reminders.</p>
      : group ? <>
        {prepared ? <Mail to={prepared.digest.intendedEmail} subject={prepared.digest.subject} body={prepared.digest.body} />
          : !problem && !persistenceFailed && <p className="small muted" role="status">Preparing the email…</p>}
        {mode === "review_then_auto" ? <div className="dg-nav">
          <button type="button" className="btn" data-testid="digest-skip" disabled={busy || !after} onClick={() => after && rail.show({ kind: "reminderDigest", recipientId: after.recipientId })}>Skip</button>
          <button type="button" className="btn btn-primary" data-testid="digest-send-next" disabled={disabled} onClick={event => record("platypus", event.detail)}>{busy ? "Sending…" : "Send & next"}</button>
        </div>
          : mode === "auto_email" ? null
          : <div className="dg-nav">
            {prepared ? <a className="btn btn-primary" data-testid="digest-open-draft" href={composeUrl("email", prepared.digest.body, prepared.digest.subject)} target="_blank" rel="noreferrer" onClick={() => setOpened(prepared.groupId)}>Open in Gmail</a>
              : <button type="button" className="btn btn-primary" data-testid="digest-open-draft" disabled>Open in Gmail</button>}
            {prepared && opened === prepared.groupId && <button type="button" className="btn" data-testid="digest-sent-self" disabled={disabled} onClick={event => record("manual", event.detail)}>I sent this</button>}
          </div>}
      </> : sent ? <Mail to={sent.intendedEmail} subject={sent.subject} body={sent.body} />
      : <p className="small muted">Nothing to send to {first} today.</p>}
    {(status || problem || needsEmail || persistenceFailed) && <p className="small dg-status" role="status">{persistenceFailed ? "Can't save in this browser."
      : needsEmail ? "Add a valid email address for this person before sending." : [status, problem].filter(Boolean).join(" ")}</p>}
    <section className="dg-open" aria-labelledby="dg-open-h">
      <h3 id="dg-open-h">{first}’s open tasks <span className="dg-n">({tasks.length})</span></h3>
      {tasks.length ? <ul className="dg-open-list">{tasks.map(n => <li key={n.id} data-testid="digest-open-task" data-node={n.id}>
        <button type="button" className="row-btn dg-open-title" onClick={() => rail.show({ kind: "node", id: n.id })}>{n.title}</button>
        <StatusPill status={n.status} small />
        <span className="dg-due">{n.clubDeadline ? fmtShort(n.clubDeadline) : "No due date"}</span>
      </li>)}</ul> : <p className="small muted">No open tasks.</p>}
    </section>
  </section>
}

/** Recorded emails (one row per person email), replies and people with no reply yet. */
export function ReminderHistoryPanel() {
  const { state, persistenceFailed } = useStore()
  const rail = useRail()
  const q = useMemo(() => reminderCentre(state), [state])
  const centre = useMemo(() => digestCentre(state, q), [state, q])
  const runtime = isReminderRuntime(state.reminderRuntime) ? state.reminderRuntime : null
  const digests: ReminderDigestSnapshot[] = [...(runtime?.digests ?? [])].reverse()
  const single = q.sent.filter(x => !x.digestId)
  const titleOf = (digestId: string, nodeId: string) => runtime?.deliveries.find(d => d.digestId === digestId && d.nodeId === nodeId)?.taskTitle
    ?? state.nodes.find(n => n.id === nodeId)?.title ?? "Earlier task"
  const followUp = (x: CentreRow) => x.candidateId && x.recipientId && centre.groups.some(g => g.recipientId === x.recipientId)
    ? rail.show({ kind: "reminderDigest", recipientId: x.recipientId }) : rail.show({ kind: "node", id: x.nodeId })
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus() }, [])
  const total = digests.length + single.length
  return <section className="panel dg-panel dg-history" aria-labelledby="dg-history-h" data-testid="reminder-history">
    <h2 id="dg-history-h" ref={heading} tabIndex={-1}>History</h2>
    {total > 0 && <section aria-labelledby="dg-sent-h" data-testid="rq-sent">
      <h3 id="dg-sent-h">Recorded <span className="dg-n">{total}</span></h3>
      <ul className="dg-hist-list">
        {digests.map(d => <li key={d.id} className="dg-hist" data-testid="rq-row" data-digest={d.id}>
          <span className="dg-hist-line">To <b>{firstName(d.recipientName)}</b> · {d.nodeIds.length} task{d.nodeIds.length === 1 ? "" : "s"} · {fmtLong(d.sentOn)}</span>
          <details className="rc-snapshot"><summary>Recorded email</summary>
            <ul className="dg-hist-tasks">{d.nodeIds.map(id => <li key={id} data-node={id}>{titleOf(d.id, id)}</li>)}</ul>
            <pre>{d.text}</pre>
          </details>
        </li>)}
        {single.map(x => <li key={x.id} className="dg-hist" data-testid="rq-row" data-node={x.nodeId}>
          <span className="dg-hist-line"><b>{x.taskTitle}</b> · {x.recipientName ? <>To {x.recipientName}</> : x.legacy ? "Recipient not recorded" : "Earlier reminder"} · {fmtShort(x.sentOn!)} <span className="rq-tag">Sent</span></span>
          <span className="dg-hist-note">{x.explanation}</span>
          {x.message && <details className="rc-snapshot"><summary>Recorded email</summary><pre>{x.message.text}</pre></details>}
        </li>)}
      </ul>
    </section>}
    {q.replies.length > 0 && <section aria-labelledby="dg-replies-h" data-testid="rq-replies">
      <h3 id="dg-replies-h">Replied <span className="dg-n">{q.replies.length}</span></h3>
      <ul className="dg-hist-list">{q.replies.map(x => <li key={x.id} className="dg-hist" data-testid="rq-row" data-node={x.nodeId}>
        <span className="dg-hist-line"><b>{x.taskTitle}</b> · {x.recipientName} · <span className="rq-reply">{x.reply}</span></span>
      </li>)}</ul>
    </section>}
    {q.noReply.length > 0 && <section aria-labelledby="dg-wait-h" data-testid="rq-no-reply">
      <h3 id="dg-wait-h">No reply <span className="dg-n">{q.noReply.length}</span></h3>
      <ul className="dg-hist-list">{q.noReply.map(x => <li key={x.id} className="dg-hist dg-hist-act" data-testid="rq-row" data-node={x.nodeId}>
        <span className="dg-hist-line"><b>{x.taskTitle}</b> · {x.recipientName} · No reply · {x.days} days{!x.candidateId && x.blockedReason && <> · {x.blockedReason}</>}</span>
        <button type="button" className="btn small" disabled={persistenceFailed || !x.taskAvailable} onClick={() => followUp(x)}>{x.candidateId ? "Follow up" : "Review task"}</button>
      </li>)}</ul>
    </section>}
    {!total && !q.replies.length && !q.noReply.length && <p className="small muted">No recorded reminders yet.</p>}
  </section>
}
