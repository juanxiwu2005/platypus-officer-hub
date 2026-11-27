import { useEffect, useMemo, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useStore } from "../data/store"
import { railBesidePage, useRail } from "../components/rail/RailContext"
import { fmtLong, fmtShort } from "../lib/dates"
import { digestCentre, firstName, personRowPath, reminderCentre, type CentreRow } from "./centre"
import type { ReminderDigestSnapshot } from "./digestContracts"
import { isReminderRuntime } from "./runtime"
import "./digest-centre.css"

/**
 * Step 0 (2026-11-27): the rail keeps History only. The former per-person email panel with its own Send & next and Skip was a
 * second send flow; Follow up now opens that person's row on the home page, where the email and its one action already are.
 */

/** Recorded emails (one row per person email), replies and people with no reply yet. */
export function ReminderHistoryPanel() {
  const { state, persistenceFailed } = useStore()
  const rail = useRail()
  const navigate = useNavigate()
  const q = useMemo(() => reminderCentre(state), [state])
  const centre = useMemo(() => digestCentre(state, q), [state, q])
  const runtime = isReminderRuntime(state.reminderRuntime) ? state.reminderRuntime : null
  const digests: ReminderDigestSnapshot[] = [...(runtime?.digests ?? [])].reverse()
  const single = q.sent.filter(x => !x.digestId)
  const titleOf = (digestId: string, nodeId: string) => runtime?.deliveries.find(d => d.digestId === digestId && d.nodeId === nodeId)?.taskTitle
    ?? state.nodes.find(n => n.id === nodeId)?.title ?? "Earlier task"
  /** The person's row on the home page when today's email has the follow-up; otherwise the task. A covering rail closes so the row shows. */
  const followUp = (x: CentreRow) => {
    if (!x.candidateId || !x.recipientId || !centre.groups.some(g => g.recipientId === x.recipientId)) { rail.show({ kind: "node", id: x.nodeId }); return }
    navigate(personRowPath(x.recipientId))
    if (!railBesidePage()) rail.closeDetail()
  }
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
