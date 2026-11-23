import { Fragment, useEffect, useMemo, useState } from "react"
import { useStore } from "../data/store"
import { canLead } from "../data/permissions"
import { prepareReminderDigest } from "./digest"
import type { PreparedDigest, ReminderDigestGroup } from "./digestContracts"
import type { ReminderDelivery } from "./contracts"
import { isReminderRuntime } from "./runtime"
import type { ReminderMode } from "../data/types"

/** Shared by the home page's inline preview and the right rail (S2, 2026-11-22). No AI request: rules write the text. */

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

export function Mail({ to, subject, body, label = "Email preview" }: { to: string | null; subject: string; body: string; label?: string }) {
  return <section className="dg-mail" aria-label={label} data-testid="digest-mail">
    <p className="dg-mail-to">To: {to ?? "no valid email address"}</p>
    <h3>{subject}</h3>
    <MailBody body={body} />
  </section>
}

/** How a lead's action records an email in each sending mode. */
export const digestVia = (mode: ReminderMode | null | undefined): ReminderDelivery["via"] =>
  mode === "review_then_auto" ? "platypus" : mode === "auto_email" ? "automatic" : "manual"

/**
 * Prepare one person's email for review while `group` is given. Preparing saves each task's link first,
 * so the email never carries a link that does not work. Re-prepares when anything the email shows changes.
 */
export function usePreparedDigest(group: ReminderDigestGroup | null, recipientId: string, via: ReminderDelivery["via"]) {
  const { state, getState, tryDispatch, persistenceFailed } = useStore()
  const allowed = canLead(state)
  const active = isReminderRuntime(state.reminderRuntime) && state.reminderRuntime.version === 2
  const [prepared, setPrepared] = useState<PreparedDigest | null>(null)
  const [problem, setProblem] = useState("")
  const [attempt, setAttempt] = useState(0)
  const people = state.people
  const contentKey = useMemo(() => JSON.stringify([group?.id, group?.candidates.map(c => { const n = state.nodes.find(x => x.id === c.nodeId); return [n?.title, n?.clubDeadline, n?.instructions, n?.why, n?.status] }),
    people.find(p => p.id === recipientId)]), [group, state.nodes, people, recipientId])
  useEffect(() => {
    setPrepared(null); setProblem("")
    if (!group || !allowed || !active || persistenceFailed) return
    let current = true
    prepareReminderDigest({ getState, tryDispatch }, group.id, window.location.origin, via)
      .then(result => { if (!current) return; if ("error" in result) setProblem(result.error); else setPrepared(result) })
      .catch(() => { if (current) setProblem("This email could not be prepared. Try again.") })
    return () => { current = false }
  }, [contentKey, attempt, allowed, active, persistenceFailed, via])
  const ready = !!prepared && !!group && prepared.groupId === group.id
  return { prepared: ready ? prepared : null, problem, retry: () => setAttempt(n => n + 1) }
}
