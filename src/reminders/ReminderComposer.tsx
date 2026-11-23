import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { STORAGE_KEY, useStore } from "../data/store"
import type { Channel, DemoState } from "../data/types"
import { canLead } from "../data/permissions"
import { composeUrl, nudgeBlocked } from "../lib/nudges"
import { emitUi } from "../lib/uiLog"
import { buildReminderFacts, buildReminderInput, reminderPeople } from "./facts"
import { planReminders } from "./engine"
import { remindersEnabled } from "./adapter"
import { makeTaskAccessGrant, taskAccessToken, taskAccessUrl, usableTaskAccessGrant } from "./taskAccess"
import { buildReminderMail } from "./mail"
import type { ReminderMailSnapshot, TaskAccessGrant } from "./accessContracts"
import type { BlockedReminder } from "./contracts"
import "./reminder-composer.css"

const CHANNEL_LABEL: Record<Channel, string> = { email: "Gmail", whatsapp: "WhatsApp", sms: "Text message" }
const BLOCKED: Record<BlockedReminder["reason"], string> = {
  no_owner: "Assign an owner before preparing this reminder.",
  unavailable_recipient: "Choose an available person with a valid contact address.",
  unresolved_waiting: "Choose who this task is waiting on before preparing a follow-up.",
  task_limit: "This task has reached its reminder limit for this person.",
  weekly_limit: "This person has reached the weekly reminder limit.",
  weekly_reserved: "The remaining weekly slots are reserved for due and overdue reminders.",
  daily_limit: "This person has reached today's two-reminder limit.",
  daily_reserved: "Today's remaining slot is reserved for a due or overdue reminder.",
  already_sent_today: "A reminder for this task was already recorded today.",
  paused: "This task needs support. Review the current update before another reminder.",
  legacy_history: "Review this task's earlier reminders before sending another.",
}
const sameMessage = (saved: ReminderMailSnapshot | undefined, attempted: ReminderMailSnapshot | null) => !!saved && !!attempted
  && saved.accessId === attempted.accessId && saved.text === attempted.text && saved.channel === attempted.channel
  && saved.preparedOn === attempted.preparedOn && saved.recipientId === attempted.recipientId
const alreadySaved = (state: DemoState, token: string) => {
  try { return !!usableTaskAccessGrant(state, token) && localStorage.getItem(STORAGE_KEY) === JSON.stringify(state) }
  catch { return false }
}

/** Short mail and one reusable entry. No request to an AI service is made while preparing or recording it. */
export default function ReminderComposer({ nodeId, onClose }: { nodeId: string; onClose: () => void }) {
  const { state, tryDispatch, getState, persistenceFailed } = useStore()
  const node = state.nodes.find(n => n.id === nodeId)
  const facts = buildReminderFacts(state, nodeId)
  const [channel, setChannel] = useState<Channel>("email")
  const [grant, setGrant] = useState<TaskAccessGrant | null>(null)
  const [linkError, setLinkError] = useState("")
  const [openedText, setOpenedText] = useState<string | null>(null)
  const [attempted, setAttempted] = useState<ReminderMailSnapshot | null>(null)
  const [recordedEntry, setRecordedEntry] = useState<{ kind: "delivery" | "nudge"; id: string } | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const enabled = remindersEnabled(state)
  const needsUpgrade = state.reminderRuntime === undefined || (enabled && state.reminderRuntime!.version !== 2)
  const recordedDelivery = enabled && recordedEntry?.kind === "delivery"
    ? state.reminderRuntime!.deliveries.find(d => d.id === recordedEntry.id && sameMessage(d.message, attempted)) : undefined
  const recordedNudge = recordedEntry?.kind === "nudge"
    ? state.nudges.find(n => n.id === recordedEntry.id && sameMessage(n.message, attempted)) : undefined
  const recorded = !!recordedDelivery || !!recordedNudge
  const queue = enabled ? planReminders(buildReminderInput(state, state.reminderRuntime!)) : null
  const candidate = queue?.ready.find(c => c.nodeId === nodeId)
  const requestId = candidate?.waitingRequestId ?? (recorded ? recordedDelivery?.waitingRequestId : undefined)
  const request = requestId ? state.reminderRuntime!.waitingRequests.find(w => w.id === requestId) : null
  const recipient = reminderPeople(state).find(p => p.id === (recorded ? attempted?.recipientId : candidate?.recipientId ?? node?.ownerId))
  const platypusSends = state.org.settings.reminderMode === "review_then_auto" || state.org.settings.reminderMode === "auto_email"
  const fixedEmail = platypusSends || !!requestId
  const allowed = canLead(state)
  const recordedByPerson = recordedDelivery ? recordedDelivery.via === "manual" : recordedNudge?.via !== "platypus"
  const blocked = !allowed ? "Only the president or vice president can prepare reminders."
    : !node || !facts ? "This task is unavailable."
    : persistenceFailed ? "This browser could not save your changes. Restore saving before preparing a reminder."
    : !recipient?.active ? "Choose an available task owner before preparing a reminder."
    : needsUpgrade ? "Enable updated reminders in the reminder centre before preparing a message."
    : state.reminderRuntime !== undefined && !enabled ? "Review the saved reminder plan before preparing another message."
    : enabled && !candidate ? queue?.blocked.find(b => b.nodeId === nodeId) ? BLOCKED[queue.blocked.find(b => b.nodeId === nodeId)!.reason] : node.status === "done" ? "This task is complete. No reminder is needed." : "No reminder is due yet for this task."
    : !enabled ? nudgeBlocked(state, node) : null
  const token = grant ? taskAccessToken(grant) : ""
  const usable = !!grant && usableTaskAccessGrant(state, token)?.id === grant.id
  const draft = facts && recipient && grant ? buildReminderMail({ today: state.today, facts, recipient,
    taskUrl: taskAccessUrl(window.location.origin, grant, facts.eventId), candidate, request,
    requesterName: state.people.find(p => p.id === facts.ownerId)?.name,
  }) : null
  const mail = recorded ? attempted : draft
  const emailProblem = fixedEmail && mail && !mail.intendedEmail ? "Add a valid email address for this person before sending." : null
  const ready = !recorded && !blocked && !emailProblem && !!mail?.checked && usable

  useEffect(() => { heading.current?.focus() }, [])
  useEffect(() => { emitUi("ui.reminder", { action: "open", nodeId, channel }) }, [nodeId])
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose() }
    window.addEventListener("keydown", escape)
    return () => window.removeEventListener("keydown", escape)
  }, [onClose])
  useEffect(() => {
    setChannel(fixedEmail ? "email" : recipient?.channel ?? "email")
    setOpenedText(null)
    setAttempted(null)
    setRecordedEntry(null)
  }, [nodeId, node?.ownerId, node?.ownerVersion, recipient?.id, fixedEmail])
  useEffect(() => {
    if (recorded) return
    let current = true
    setGrant(null); setLinkError(""); setOpenedText(null)
    if (blocked || !node || !recipient) return
    makeTaskAccessGrant(state, nodeId, candidate?.waitingRequestId).then(value => {
      if (!current) return
      if (alreadySaved(getState(), taskAccessToken(value)) || tryDispatch({ type: "issueTaskAccessGrant", grant: value })) setGrant(value)
      else setLinkError("Could not save this task link in this browser. Close and reopen the reminder after restoring saving.")
    }).catch(() => { if (current) setLinkError("Could not prepare this task link. Close and reopen the reminder.") })
    return () => { current = false }
  }, [nodeId, node?.ownerId, node?.ownerVersion, recipient?.id, candidate?.id, state.today, state.demoLinkKey, blocked, recorded])

  function confirm() {
    if (!ready || !mail || !grant) return
    const snapshot: ReminderMailSnapshot = { ...mail, channel, preparedOn: state.today, accessId: grant.id }
    setAttempted(snapshot)
    setRecordedEntry(null)
    const before = getState()
    const oldNudges = new Set(before.nudges.map(n => n.id))
    const oldDeliveries = new Set(remindersEnabled(before) ? before.reminderRuntime!.deliveries.map(d => d.id) : [])
    const saved = enabled && candidate
      ? tryDispatch({ type: "confirmPlannedReminder", candidateId: candidate.id, via: platypusSends ? "platypus" : "manual", message: snapshot })
      : tryDispatch({ type: "confirmNudgeSent", nodeId, channel, text: mail.text, via: platypusSends ? "platypus" : "president", message: snapshot })
    if (!saved) return
    const after = getState()
    const delivery = remindersEnabled(after) ? after.reminderRuntime!.deliveries.find(d => !oldDeliveries.has(d.id) && sameMessage(d.message, snapshot)) : undefined
    const nudge = after.nudges.find(n => !oldNudges.has(n.id) && sameMessage(n.message, snapshot))
    if (delivery) setRecordedEntry({ kind: "delivery", id: delivery.id })
    else if (nudge) setRecordedEntry({ kind: "nudge", id: nudge.id })
  }

  const fullMessage = channel === "email" ? mail?.body ?? "" : mail?.text ?? ""
  const draftUrl = mail ? composeUrl(channel, fullMessage, mail.subject) : ""
  const preview = mail?.body.replace(`Open task: ${mail.taskUrl}`, "").trim()
  return <aside className="panel nudge-panel reminder-composer" role="dialog" aria-labelledby="nudge-heading" data-testid="nudge-panel">
    <div className="panel-head"><span className="eyebrow">Email preview</span><button type="button" className="btn btn-quiet" aria-label="Close reminder" onClick={onClose}>✕</button></div>
    <h2 id="nudge-heading" ref={heading} tabIndex={-1}>{recipient?.name ?? "Reminder"}</h2>
    {candidate?.waitingRequestId && <p className="small muted">A request for help with {facts?.title}.</p>}
    {mail ? <section className="rc-mail" aria-label="Reminder email">
      <h3>{mail.subject}</h3>
      <div className="rc-body" data-testid="nudge-body">{preview?.split("\n\n").map((part, index) => part.startsWith("Task due:") ? <p key={index} className="rc-due"><strong>{part}</strong></p> : <p key={index}>{part}</p>)}</div>
      {usable && <a className="btn rc-task-entry" href={mail.taskUrl} target="_blank" rel="noreferrer">Open task</a>}
    </section> : !blocked && !linkError ? <p className="small muted" role="status">Preparing your task link…</p> : null}
    {!recorded && <div className="rc-delivery">
      {fixedEmail ? <p className="small muted">Delivery: Email</p> : <label className="composer-channel">Preferred channel<select aria-label="Preferred channel" value={channel} onChange={event => { setChannel(event.target.value as Channel); setOpenedText(null) }}>{[...new Set([recipient?.channel ?? "email", "email", "whatsapp", "sms"] as Channel[])].map(c => <option key={c} value={c}>{CHANNEL_LABEL[c]}{c === recipient?.channel ? " · preferred" : ""}</option>)}</select></label>}
      {ready ? platypusSends ? <button type="button" className="btn btn-primary" data-testid="approve-send" onClick={confirm}>Send</button>
        : <><a className="btn btn-primary" href={draftUrl} target={channel === "sms" ? undefined : "_blank"} rel="noreferrer" onClick={() => setOpenedText(mail!.text)}>Open {CHANNEL_LABEL[channel]} draft</a>
          {openedText === mail?.text && <button type="button" className="btn" onClick={confirm}>I sent this reminder</button>}</>
        : <button type="button" className="btn" disabled>Reminder unavailable</button>}
    </div>}
    {recorded ? <p className="small good-text" role="status">{recordedByPerson ? "Recorded as sent by you. The app cannot verify delivery." : "Sent."}</p>
      : <>{(blocked || emailProblem || linkError) && <p className="small warn-text" role="status">{blocked ?? emailProblem ?? linkError}</p>}
        {mail && !mail.checked && !blocked && <p className="small warn-text" role="status">Review the task wording or details before preparing this message.</p>}
        {attempted && <p className="small warn-text" role="status">This reminder was not recorded. Review the latest task details before trying again.</p>}</>}
    {needsUpgrade && allowed && <Link className="btn small" to="/">Set up reminders</Link>}
  </aside>
}
