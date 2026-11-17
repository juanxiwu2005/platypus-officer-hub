import { useEffect, useRef, useState, type CSSProperties } from "react"
import { Link } from "react-router-dom"
import { useSchedule, useStore, type NodePatch } from "../data/store"
import type { Node } from "../data/types"
import { daysBetween, fmtShort } from "../lib/dates"
import { RULES } from "../data/rules"
import { safeLink } from "../data/taskWorkflow"
import { TaskActions } from "./TaskActions"
import { Avatar, StatusPill } from "./ui"
import { canLead, isOfficer, officers } from "../data/permissions"
import { useOptionalRail } from "./rail/RailContext"
import { asuSentence, dueOf, isLate } from "../lib/taskDue"
import { SEVERITY_TONE } from "../pages/helpers"
import { TaskMatchingPanel } from "../matching/TaskMatchingPanel"
import { buildReminderFacts } from "../reminders/facts"
import { taskReminderSummary } from "../reminders/centre"
import "../reminders/task-detail.css"

/**
 * Three readable zones: task and due, concrete work and updates, then the actual reminder plan.
 * Scheduling, recipients and authorization remain in the shared selectors and business actions.
 */
export function TaskDetail({ node, actorId, token, initialReply }: { node: Node; actorId: string; token?: string; initialReply?: string | null }) {
  const { state } = useStore()
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus() }, [node.id])
  const rail = useOptionalRail()
  const plan = useSchedule().nodes[node.id]
  const due = dueOf(node, plan)
  const late = isLate(node, due, state.today)
  const asu = asuSentence(node, plan)
  const pending = state.extensionRequests.find(r => r.nodeId === node.id && r.status === "pending")
  const event = state.events.find(e => e.id === node.eventId)
  const owner = state.people.find(p => p.id === node.ownerId)
  const roleName = (id: string | null | undefined) => state.roles.find(r => r.id === id)?.displayName
  const facts = buildReminderFacts(state, node.id)
  const reminder = taskReminderSummary(state, node.id)
  const canRemind = !!rail && !token && !!reminder.recipientId && reminder.recipientId !== actorId && canLead(state)
  const issues = (plan?.issues ?? []).filter(i => i.severity !== "info" && i.code !== "start_passed" && i.code !== "club_passed")
  const overdue = late && due ? daysBetween(due, state.today) : 0
  const draft = node.draftLink && safeLink(node.draftLink) ? node.draftLink : null
  const lists = (ids: string[]) => ids.map(roleName).filter(Boolean).join(", ") || "Nobody"

  return <section className="card task-detail" aria-label="Linked task" data-testid="task-detail">
    <header className="td-head">
      <p className="small muted td-event">{event?.name ?? "Club task"}</p>
      <h2 ref={heading} tabIndex={-1}>{node.title}</h2>
      <div className="td-meta">
        <StatusPill status={node.status} />
        <span className="who"><Avatar name={owner?.name} size="sm" /><span>{owner?.name ?? "No owner yet"}</span></span>
      </div>
      <div className={`td-due td-focus-due${late ? " late-text" : ""}`} data-testid="task-due"><span>Task due</span><strong>{due ? fmtShort(due) : "Not set"}</strong>{overdue > 0 && <span>{overdue} day{overdue === 1 ? "" : "s"} overdue</span>}</div>
      {issues.length > 0 && <ul className="issues td-notices" aria-label="Schedule risks" data-testid="task-notices">{issues.map(i => <li key={i.code} className={`issue ${SEVERITY_TONE[i.severity]}`}>{i.text}</li>)}</ul>}
    </header>

    <section className="td-zone" aria-labelledby={`td-next-${node.id}`}>
      <h3 id={`td-next-${node.id}`}>Your next step</h3>
      <div className="td-work-copy"><p>{facts?.requirement ?? node.instructions ?? node.title}</p>
        {facts?.completionCriteria && <p><b>Complete when: </b>{facts.completionCriteria}</p>}
        <p><b>Why it matters: </b>{facts?.importance ?? node.why}</p>
      </div>
      {facts?.actionLink && <div className="td-action-entry" role="group" aria-label="Where to submit">
        <a className="btn small" href={facts.actionLink.url} target="_blank" rel="noreferrer">{facts.actionLink.label} ↗</a><p className="small muted">{facts.actionLink.explanation}</p>
      </div>}
      <TaskActions key={node.id} node={node} actorId={actorId} token={token} initialReply={initialReply} />
      {pending && <p className="issue warn">Extension awaiting review: {pending.requestedDate}. The current deadline still applies.</p>}
    </section>

    <section className="td-zone td-reminder-plan" aria-labelledby={`td-plan-${node.id}`}>
      <h3 id={`td-plan-${node.id}`}>Reminder plan</h3>
      {reminder.recipientName && <p className="small"><b>To: </b>{reminder.recipientName}</p>}
      <p data-testid="task-reminder-explanation">{reminder.explanation}</p>
      {node.status === "waiting" && node.waitingOn && <p className="td-work-copy"><b>Waiting for: </b>{node.waitingOn}</p>}
      {reminder.runtimeState === "active" && <p className="small muted">{state.org.settings.reminderMode === "auto_email" ? "Automatic email (demo)." : state.org.settings.reminderMode === "review_then_auto" ? "Review before Platypus sends (demo)." : state.org.settings.reminderMode === "review_then_self" ? "Review, then send personally." : "Choose a reminder approach in Settings."}</p>}
      {reminder.blockedReason && <p id={`td-remind-why-${node.id}`} className="small muted">{reminder.blockedReason}</p>}
      {canRemind && <div className="td-remind"><button type="button" className="btn small" disabled={!reminder.canPrepare} aria-describedby={reminder.blockedReason ? `td-remind-why-${node.id}` : undefined} onClick={() => rail!.show({ kind: "nudge", id: node.id })}>Remind {reminder.recipientName?.split(" ")[0] ?? "teammate"}</button></div>}
      {!token && canLead(state) && <Link className="small" to="/">{reminder.runtimeState === "active" ? "Open reminder centre" : "Review reminder setup"}</Link>}
      {reminder.history.length > 0 && <details className="more td-history"><summary>Reminder history ({reminder.history.length})</summary><ol>{reminder.history.map(row => <li key={row.id}>
        <p><b>{row.recipientName ?? "Recipient not recorded"}</b>{row.sentOn ? ` · ${fmtShort(row.sentOn)}` : ""}</p>
        <p className="small">{row.eventName ? `${row.eventName} · ` : ""}{row.taskTitle}</p>
        <p className="small muted">{row.explanation} {row.outcome === "simulated" ? "Demo: no email was sent." : row.outcome === "recorded_by_sender" ? "Recorded by sender; delivery is not verified." : ""}</p>{row.reply && <p className="small">{row.reply}</p>}
        {row.message && <details><summary>Saved message</summary><p><b>{row.message.subject}</b></p><p className="td-work-copy">{row.message.body}</p></details>}
      </li>)}</ol></details>}
    </section>

    <div className="td-folds">
      <details className="more" data-testid="why-date">
        <summary>Why this date</summary>
        {/* The engine's own reason, unless it only restates the club buffer that the ASU sentence already explains. */}
        {due && plan && !(asu && plan.explain.club.endsWith("(club buffer)")) && <p className="small">Due {fmtShort(due)}: {plan.explain.club}.</p>}
        {asu && <p className="small" data-testid="asu-sentence">{asu}</p>}
        {plan && node.ownerId === actorId ? <p className="small">Personal planning start: {fmtShort(plan.latestStart)}. <span className="muted">{plan.explain.latestStart}.</span></p> : <p className="small muted">The owner's private planning preferences stay private.</p>}
        {(plan?.issues ?? []).filter(i => i.severity === "info").map(i => <p className="small" key={i.code}>{i.text}</p>)}
      </details>
      {!token && <TaskMatchingPanel node={node} />}
      <details className="more">
        <summary>People</summary>
        <dl className="td-people small">
          <dt>Owner</dt><dd>{owner?.name ?? "Not assigned"}</dd>
          <dt>Approver</dt><dd>{roleName(node.approverRoleId) ?? "The owner"}</dd>
          <dt>Consulted</dt><dd>{lists(node.consultedRoleIds)}</dd>
          <dt>Informed</dt><dd>{lists(node.informedRoleIds)}</dd>
        </dl>
      </details>
      {!token && canLead(state) && plan && <TaskEdit node={node} recommended={plan.recommendedClub} due={due} />}
      <details className="more">
        <summary>Sources</summary>
        <p className="small muted">{node.source}. Dates come from the rule engine.</p>
        {draft && <p><a href={draft} target="_blank" rel="noreferrer">Open current draft</a></p>}
        {node.ruleIds.length > 0 && <div className="action-row">{node.ruleIds.map(id => { const r = RULES.find(r => r.id === id); return r && <a key={id} href={r.sources[0].url} target="_blank" rel="noreferrer">{id}</a> })}</div>}
      </details>
    </div>
  </section>
}

/** Edit (president and VP only, as before): name, owner, Due and tags, all through the store's updateNode. */
function TaskEdit({ node, recommended, due }: { node: Node; recommended: string; due: string | null }) {
  const { state, tryDispatch } = useStore()
  const [error, setError] = useState("")
  const update = (patch: NodePatch) => { const saved = tryDispatch({ type: "updateNode", id: node.id, patch }); setError(saved ? "" : "This change was not saved. Keep your text and try again after restoring saving.") }
  const tags = state.org.board?.tags ?? []
  return <details className="more" data-testid="task-edit">
    <summary>Edit</summary>
    <div className="form-stack tight">
      <label className="field"><span>Task name</span><input key={`${node.id}:${node.title}`} defaultValue={node.title} maxLength={100} onBlur={e => { const t = e.target.value.trim(); if (t && t !== node.title) update({ title: t }); else e.target.value = node.title }} onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur() }} /></label>
      <label className="field"><span>Task instructions</span><textarea key={`${node.id}:instructions:${node.instructions ?? ""}`} defaultValue={node.instructions ?? ""} maxLength={1200} onBlur={e => { if (e.target.value.trim() !== (node.instructions ?? "")) update({ instructions: e.target.value }) }} /></label>
      <label className="field"><span>Completion criteria</span><textarea key={`${node.id}:criteria:${node.completionCriteria ?? ""}`} defaultValue={node.completionCriteria ?? ""} maxLength={1200} onBlur={e => { if (e.target.value.trim() !== (node.completionCriteria ?? "")) update({ completionCriteria: e.target.value }) }} /></label>
      <label className="field"><span>Why it matters</span><textarea key={`${node.id}:why:${node.why}`} defaultValue={node.why} maxLength={400} onBlur={e => { if (e.target.value.trim() !== node.why) update({ why: e.target.value.trim() }) }} /></label>
      <label className="field"><span>Owner</span>
        <select value={node.ownerId ?? ""} onChange={e => update({ ownerId: e.target.value || null })} data-testid="owner-select">
          <option value="">No owner</option>
          {officers(state).map(x => <option key={x.id} value={x.id}>{x.name} · {state.roles.find(r => r.id === x.roleId)?.displayName}</option>)}
          {state.people.filter(x => x.id === node.ownerId && !isOfficer(x)).map(x => <option key={x.id} value={x.id} disabled>{x.name} · former officer</option>)}
        </select>
      </label>
      <div className="field"><label htmlFor={`td-due-${node.id}`}>Due</label>
        <div className="td-due-edit">
          <input id={`td-due-${node.id}`} type="date" value={due ?? ""} data-testid="due-input" onChange={e => /^\d{4}-\d{2}-\d{2}$/.test(e.target.value) && update({ clubDeadlineOverride: e.target.value })} />
          {node.clubDeadlineOverride && <button type="button" className="btn btn-quiet small" onClick={() => update({ clubDeadlineOverride: null })}>Use recommended ({fmtShort(recommended)})</button>}
        </div>
      </div>
      {tags.length > 0 && <div className="field"><span>Tags</span><div className="tag-row">{tags.map(t => { const on = node.tags?.includes(t.id); return <button key={t.id} type="button" className="tag-chip tag-toggle" aria-pressed={on} style={{ "--tag": t.color } as CSSProperties} onClick={() => update({ tags: on ? (node.tags ?? []).filter(x => x !== t.id) : [...(node.tags ?? []), t.id] })}>{t.label}</button> })}</div></div>}
    </div>
    {error && <p role="alert" className="small late-text">{error}</p>}
  </details>
}
