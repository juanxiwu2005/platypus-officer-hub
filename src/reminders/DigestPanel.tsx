import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import { useStore } from "../data/store"
import { canLead } from "../data/permissions"
import { useRail } from "../components/rail/RailContext"
import { StatusPill } from "../components/ui"
import { composeUrl } from "../lib/nudges"
import { fmtLong, fmtShort } from "../lib/dates"
import { digestCentre, firstName, openTasksOf, reminderCentre, type CentreRow } from "./centre"
import { prepareReminderDigest, recordReminderDigests, sendReminderDigests } from "./digest"
import type { PreparedDigest, ReminderDigestSnapshot } from "./digestContracts"
import type { ReminderDelivery } from "./contracts"
import { isReminderRuntime } from "./runtime"
import "./digest-centre.css"

/** Rule-written email text; every task address becomes an "Open task" link. */
function MailLine({ line }: { line: string }) {
  const only = line.match(/^\s*(?:Open (?:task|my tasks):?\s*)?(https?:\/\/\S+)\s*$/)
  const pieces = only ? ["", only[1]] : line.split(/(https?:\/\/\S+)/)
  return <>{pieces.map((piece, k) => k % 2 ? <a key={k} href={piece} target="_blank" rel="noreferrer">Open task</a> : <Fragment key={k}>{piece}</Fragment>)}</>
}
function MailBody({ body }: { body: string }) {
  return <div className="dg-mail-body" data-testid="digest-body">{body.split(/\n{2,}/).map((part, i) => <p key={i}>{part.split("\n").map((line, j) =>
    <Fragment key={j}>{j > 0 && <br />}<MailLine line={line} /></Fragment>)}</p>)}</div>
}

function Mail({ to, subject, body }: { to: string | null; subject: string; body: string }) {
  return <section className="dg-mail" aria-label="Email preview" data-testid="digest-mail">
    <p className="dg-mail-to">To: {to ?? "no valid email address"}</p>
    <h3>{subject}</h3>
    <MailBody body={body} />
  </section>
}

/** Today's combined email for one person. No AI request: the text comes from the rules and the engine. */
export default function DigestPanel({ recipientId, onClose }: { recipientId: string; onClose: () => void }) {
  const { state, getState, tryDispatch, persistenceFailed } = useStore()
  const rail = useRail()
  const centre = useMemo(() => digestCentre(state), [state])
  const mode = state.org.settings.reminderMode ?? null
  const via: ReminderDelivery["via"] = mode === "review_then_auto" ? "platypus" : mode === "auto_email" ? "automatic" : "manual"
  const allowed = canLead(state)
  const active = isReminderRuntime(state.reminderRuntime) && state.reminderRuntime.version === 2
  const index = centre.people.findIndex(p => p.recipientId === recipientId)
  const entry = index >= 0 ? centre.people[index] : null
  const group = entry?.group ?? null
  const name = entry?.name ?? state.people.find(p => p.id === recipientId)?.name ?? "Former member"
  const first = firstName(name)
  const [prepared, setPrepared] = useState<PreparedDigest | null>(null)
  const [problem, setProblem] = useState("")
  const [status, setStatus] = useState("")
  const [opened, setOpened] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const alive = useRef(true)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => { heading.current?.focus() }, [recipientId])
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && !event.defaultPrevented) onClose() }
    window.addEventListener("keydown", escape)
    return () => window.removeEventListener("keydown", escape)
  }, [onClose])
  // Preparing saves each task's link first, so the email never carries a link that does not work.
  useEffect(() => {
    setPrepared(null); setProblem(""); setOpened(null)
    if (!group || !allowed || !active || persistenceFailed) return
    let current = true
    prepareReminderDigest({ getState, tryDispatch }, group.id, window.location.origin, via)
      .then(result => { if (!current) return; if ("error" in result) setProblem(result.error); else setPrepared(result) })
      .catch(() => { if (current) setProblem("This email could not be prepared. Close it and try again.") })
    return () => { current = false }
  }, [group?.id, allowed, active, persistenceFailed, via])

  const ready = !!prepared && !!group && prepared.groupId === group.id
  const later = centre.groups.filter(g => g.recipientId !== recipientId)
  const after = later.find(g => centre.groups.indexOf(g) > centre.groups.indexOf(group!)) ?? later[0]
  const needsEmail = via !== "manual" && ready && !prepared!.digest.intendedEmail
  const disabled = busy || persistenceFailed || !ready || needsEmail
  const record = (how: ReminderDelivery["via"]) => {
    if (disabled || !prepared) return
    setBusy(true)
    const order = centre.groups.map(g => g.recipientId)
    const result = recordReminderDigests({ getState, tryDispatch }, [prepared], how)
    setBusy(false)
    if (!result.recordedGroupIds.includes(prepared.groupId)) { setStatus(result.error ?? "This email was not recorded. Review the latest tasks and try again."); return }
    const left = digestCentre(getState()).groups.map(g => g.recipientId)
    const at = order.indexOf(recipientId)
    const next = [...order.slice(at + 1), ...order.slice(0, at)].find(id => left.includes(id)) ?? left[0]
    if (next) { setStatus(`Email to ${first} recorded. Demo: nothing is sent.`); rail.show({ kind: "reminderDigest", recipientId: next }) }
    else setStatus("All emails recorded. Demo: nothing is sent.")
  }
  const sendAll = async () => {
    if (busy || persistenceFailed || !centre.groups.length) return
    setBusy(true); setStatus("")
    try {
      const result = await sendReminderDigests({ getState, tryDispatch }, centre.groups.map(g => g.id), window.location.origin, "platypus", () => alive.current)
      if (alive.current) setStatus(`${result.recordedGroupIds.length} email${result.recordedGroupIds.length === 1 ? "" : "s"} recorded. Demo: nothing is sent.${result.error ? ` ${result.error}` : ""}`)
    } catch { if (alive.current) setStatus("These emails were not recorded. Please try again.") }
    finally { if (alive.current) setBusy(false) }
  }

  const sent = entry?.sent ?? null
  const tasks = openTasksOf(state, recipientId).slice().sort((a, b) => (a.clubDeadline ?? "9999").localeCompare(b.clubDeadline ?? "9999"))
  const eyebrow = group && index >= 0 ? `Email ${index + 1} of ${centre.people.length} · to ${first}` : sent ? `Sent ✓ · to ${first}` : `Reminders · ${first}`
  return <section className="panel dg-panel" aria-labelledby="dg-heading" data-testid="digest-panel" data-recipient={recipientId} aria-busy={busy}>
    <div className="panel-head"><span className="eyebrow">{eyebrow}</span><button type="button" className="btn btn-quiet" aria-label="Close email" onClick={onClose}>✕</button></div>
    <h2 id="dg-heading" ref={heading} tabIndex={-1}>{name}</h2>
    {!allowed ? <p className="small warn-text" role="status">Only the president or vice president can review reminders.</p>
      : group ? <>
        {ready ? <Mail to={prepared!.digest.intendedEmail} subject={prepared!.digest.subject} body={prepared!.digest.body} />
          : !problem && !persistenceFailed && <p className="small muted" role="status">Preparing the email…</p>}
        {mode === "review_then_auto" ? <>
          <div className="dg-nav">
            <button type="button" className="btn" data-testid="digest-skip" disabled={busy || !after} onClick={() => after && rail.show({ kind: "reminderDigest", recipientId: after.recipientId })}>Skip</button>
            <button type="button" className="btn btn-primary" data-testid="digest-send-next" disabled={disabled} onClick={() => record("platypus")}>{busy ? "Recording…" : "Send & next"}</button>
          </div>
          {centre.groups.length > 1 && <button type="button" className="btn btn-quiet dg-send-all" data-testid="digest-send-all" disabled={busy || persistenceFailed} onClick={sendAll}>Send all {centre.groups.length} without reviewing</button>}
        </> : mode === "auto_email" ? <p className="small muted">Platypus sends these automatically. Demo: nothing is sent.</p>
          : <div className="dg-nav">
            {ready ? <a className="btn btn-primary" data-testid="digest-open-draft" href={composeUrl("email", prepared!.digest.body, prepared!.digest.subject)} target="_blank" rel="noreferrer" onClick={() => setOpened(prepared!.groupId)}>Open Gmail draft</a>
              : <button type="button" className="btn btn-primary" data-testid="digest-open-draft" disabled>Open Gmail draft</button>}
            {ready && opened === prepared!.groupId && <button type="button" className="btn" data-testid="digest-sent-self" disabled={disabled} onClick={() => record("manual")}>I sent this email</button>}
          </div>}
        {mode !== "review_then_auto" && mode !== "auto_email" && <p className="small muted">The draft recipient is blank. Choose a fictional test destination yourself.</p>}
      </> : sent ? <Mail to={sent.intendedEmail} subject={sent.subject} body={sent.body} />
      : <p className="small muted">Nothing to send to {first} today.</p>}
    {(status || problem || needsEmail || persistenceFailed) && <p className="small dg-status" role="status">{persistenceFailed ? "This browser could not save changes. No email can be recorded until saving is restored."
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

const sentLabel = (x: CentreRow) => x.legacy ? "Earlier record" : x.outcome === "recorded_by_sender" ? "Recorded by sender" : x.via === "automatic" ? "Automatic demo" : "Approved demo"

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
    <p className="small muted">A saved demo record is not proof of email delivery.</p>
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
          <span className="dg-hist-line"><b>{x.taskTitle}</b> · {x.recipientName ? <>To {x.recipientName}</> : x.legacy ? "Recipient not recorded" : "Earlier reminder"} · {fmtShort(x.sentOn!)} <span className={`rq-tag${x.outcome === "simulated" ? " demo" : ""}`}>{sentLabel(x)}</span></span>
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
        <span className="dg-hist-line"><b>{x.taskTitle}</b> · {x.recipientName} · {x.days} days since reminder{!x.candidateId && x.blockedReason && <> · {x.blockedReason}</>}</span>
        <button type="button" className="btn small" disabled={persistenceFailed || !x.taskAvailable} onClick={() => followUp(x)}>{x.candidateId ? "Follow up" : "Review task"}</button>
      </li>)}</ul>
    </section>}
    {!total && !q.replies.length && !q.noReply.length && <p className="small muted">No recorded reminders yet.</p>}
  </section>
}
