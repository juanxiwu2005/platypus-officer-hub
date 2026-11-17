import { useEffect, useRef, type CSSProperties } from "react"
import { useSchedule, useStore, type NodePatch } from "../data/store"
import type { Node } from "../data/types"
import { fmtShort } from "../lib/dates"
import { RULES } from "../data/rules"
import { safeLink } from "../data/taskWorkflow"
import { TaskActions } from "./TaskActions"
import { Avatar, StatusPill } from "./ui"
import { canLead, isOfficer, officers } from "../data/permissions"
import { useOptionalRail } from "./rail/RailContext"
import { nudgeBlocked } from "../lib/nudges"
import { asuSentence, dueOf, isLate, reminderSentence } from "../lib/taskDue"
import { SEVERITY_TONE } from "../pages/helpers"
import { TaskMatchingPanel } from "../matching/TaskMatchingPanel"

type QuickLink = { label: string; url: string }
const SUBMIT_LINKS: Record<string, QuickLink[]> = {
  venue: [
    { label: "Submit a Space Request", url: "https://eoss.asu.edu/student-unions/submit-a-space-request" },
    { label: "Mazevo", url: "https://mymazevo.com/" },
    { label: "ASU Space Reservations", url: "https://azstateu.aaiscloud.com/AZStateU/Default.aspx?home" },
  ],
  purchaseRequest: [{ label: "Sun Devil Central", url: "https://sundevilcentral.eoss.asu.edu/" }],
  budgetRequest: [{ label: "Sun Devil Central", url: "https://sundevilcentral.eoss.asu.edu/" }],
  budgetApproval: [{ label: "Sun Devil Central", url: "https://sundevilcentral.eoss.asu.edu/" }],
  purchaseApproval: [{ label: "Sun Devil Central", url: "https://sundevilcentral.eoss.asu.edu/" }],
  sap: [{ label: "Speaker, Artist & Performer Agreements", url: "https://cfo.asu.edu/speaker-artist-performer-agreements" }],
  speakerPacket: [{ label: "Speaker, Artist & Performer Agreements", url: "https://cfo.asu.edu/speaker-artist-performer-agreements" }],
  usgspeaker: [{ label: "Speaker, Artist & Performer Agreements", url: "https://cfo.asu.edu/speaker-artist-performer-agreements" }],
  foodCompliance: [{ label: "Sun Devil Hospitality Catering", url: "https://sundevilhospitality.asu.edu/catering" }],
  quotes: [{ label: "Sun Devil Hospitality Catering", url: "https://sundevilhospitality.asu.edu/catering" }],
  dining: [{ label: "Sun Devil Hospitality Catering", url: "https://sundevilhospitality.asu.edu/catering" }],
  permit: [{ label: "Sun Devil Hospitality Catering", url: "https://sundevilhospitality.asu.edu/catering" }],
  attendance: [{ label: "Business Meals Form", url: "https://eoss.asu.edu/sites/g/files/litvpz141/files/business-meals-form.pdf" }],
}

/**
 * One task, in three zones (FB-4, docs/feedback-fix/PLAN.md §6.2): who and when (one Due), your next step (one
 * primary button), notices only when there are any, then folded reference sections. This is the screen an officer
 * lands on from a reminder. Dates come from the rule engine; who may do what is decided by TaskActions and the store.
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
  const directLinks = node.stepKey ? SUBMIT_LINKS[node.stepKey] ?? [] : []
  const quickLinks = (directLinks.length ? directLinks : node.ruleIds.flatMap(id => RULES.find(rule => rule.id === id)?.sources ?? [])).filter((source, index, all) => all.findIndex(other => other.url === source.url) === index)
  // Reminding is the president's or VP's job (the store refuses anyone else), and never yourself.
  const blocked = nudgeBlocked(state, node)
  const canRemind = !!rail && !token && !!owner && owner.id !== actorId && canLead(state)
  const issues = plan?.issues ?? []
  const draft = node.draftLink && safeLink(node.draftLink) ? node.draftLink : null
  const lists = (ids: string[]) => ids.map(roleName).filter(Boolean).join(", ") || "Nobody"

  return <section className="card task-detail" aria-label="Linked task" data-testid="task-detail">
    <header className="td-head">
      <p className="small muted td-event">{event?.name ?? "Club task"}</p>
      <h2 ref={heading} tabIndex={-1}>{node.title}</h2>
      <div className="td-meta">
        <StatusPill status={node.status} />
        <span className="who"><Avatar name={owner?.name} size="sm" /><span>{owner?.name ?? "No owner yet"}</span></span>
        <span className={`td-due${late ? " late-text" : ""}`} data-testid="task-due">{due ? <>Due <b>{fmtShort(due)}</b>{late ? " · overdue" : ""}</> : "No Due yet"}</span>
      </div>
      {canRemind && <div className="td-remind"><button type="button" className="btn small" disabled={!!blocked} title={blocked ?? "Prepare a reminder"} aria-describedby={blocked ? "td-remind-why" : undefined} onClick={() => rail!.show({ kind: "nudge", id: node.id })}>Remind {owner!.name.split(" ")[0]}</button>{blocked && <span id="td-remind-why" className="small muted">{blocked}</span>}</div>}
    </header>

    <TaskMatchingPanel node={node} />
    <section className="td-zone" aria-labelledby={`td-next-${node.id}`}>
      <h3 id={`td-next-${node.id}`}>Your next step</h3>
      <TaskActions node={node} actorId={actorId} token={token} initialReply={initialReply} />
      {quickLinks.length > 0 && <div className="task-quick-links" role="group" aria-label="Where to submit">
        <b>Where to submit</b>
        <div className="action-row">{quickLinks.map(source => <a key={source.url} className="btn small" href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a>)}</div>
      </div>}
      {draft && <a href={draft} target="_blank" rel="noreferrer">Open current draft</a>}
    </section>

    {(issues.length > 0 || node.waitingOn || pending) && <ul className="issues td-notices" aria-label="Notices" data-testid="task-notices">
      {issues.map(i => <li key={i.code} className={`issue ${SEVERITY_TONE[i.severity]}`}>{i.text}</li>)}
      {node.waitingOn && <li className="issue warn">Waiting on: {node.waitingOn}</li>}
      {pending && <li className="issue warn">Extension awaiting review: {pending.requestedDate}. The current deadline still applies.</li>}
    </ul>}

    <div className="td-folds">
      <details className="more" data-testid="why-date">
        <summary>Why this date</summary>
        {/* The engine's own reason, unless it only restates the club buffer that the ASU sentence already explains. */}
        {due && plan && !(asu && plan.explain.club.endsWith("(club buffer)")) && <p className="small">Due {fmtShort(due)}: {plan.explain.club}.</p>}
        {asu && <p className="small" data-testid="asu-sentence">{asu}</p>}
        <p className="small">{reminderSentence(node, plan, actorId)}{plan && node.ownerId === actorId ? <span className="muted"> {plan.explain.latestStart}.</span> : null}</p>
        <p className="small"><b>Why it matters:</b> {node.why || "This step supports our club plan."}</p>
      </details>
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
        {node.ruleIds.length > 0 && <div className="action-row">{node.ruleIds.map(id => { const r = RULES.find(r => r.id === id); return r && <a key={id} href={r.sources[0].url} target="_blank" rel="noreferrer">{id}</a> })}</div>}
      </details>
    </div>
  </section>
}

/** Edit (president and VP only, as before): name, owner, Due and tags, all through the store's updateNode. */
function TaskEdit({ node, recommended, due }: { node: Node; recommended: string; due: string | null }) {
  const { state, dispatch } = useStore()
  const update = (patch: NodePatch) => dispatch({ type: "updateNode", id: node.id, patch })
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
  </details>
}
