import { useState, type CSSProperties } from "react"
import { Link } from "react-router-dom"
import { PageHead } from "../components/Page"
import { useStore, useViewer } from "../data/store"
import { useRail } from "../components/rail/RailContext"
import { handoffDates } from "../engine/schedule"
import { handbookSources, sourceFingerprint, sanitizeHandbook, WEEK_ONE } from "../lib/handbook"
import { callApi } from "../lib/api"
import { Feedback } from "../components/Feedback"
import { Avatar, Chain, Hover, Info, Ring, type Stop } from "../components/ui"
import { fmtShort } from "../lib/dates"
import type { RoleHandoff } from "../data/types"

const STEPS = ["Interview", "Handbook", "Confirmed", "Approved", "First week", "Handed over", "Day 30"]
/** Seven checkpoints per role; the ring shows how many are done. */
export function roleProgress(r: RoleHandoff | undefined): { done: number; stage: string } {
  if (!r) return { done: 0, stage: "Not started" }
  const flags = [r.interview.length > 0, r.entries.length > 0, r.confirmed, r.approved, r.checks.length === WEEK_ONE.length, r.completed, r.reviewed]
  const done = flags.filter(Boolean).length
  const next = flags.findIndex(f => !f)
  return { done, stage: next < 0 ? "Complete" : STEPS[next] }
}

/** Handoff as a relay (v1.1): one season track and one baton card per role. */
export default function Handoff() {
  const { state, dispatch } = useStore()
  const { canNudge } = useViewer()
  const rail = useRail()
  const [from, setFrom] = useState(state.handoff?.from ?? state.today), [to, setTo] = useState(state.handoff?.to ?? handoffDates(state.today).review)
  const start = state.handoff?.from ?? from
  const d = handoffDates(start)
  const marks = [["Start", start], ["Interview", d.interview], ["Handbook", d.weekOne], ["First week", d.weekTwo], ["Day 30", d.review]] as const
  const stops: Stop[] = marks.map(([label, date], i) => {
    const next = marks[i + 1]?.[1]
    const state_ = !state.handoff ? "todo" : next && state.today >= next ? "done" : state.today >= date ? "now" : "todo"
    return { key: label, label, state: state_, hint: <><b>{label}</b><span className="hc-line">{state.handoff ? fmtShort(date) : "Starts when the season starts"}</span></> }
  })
  return <>
    <PageHead path="/handoff" actions={canNudge && <form className="add-row" onSubmit={e => { e.preventDefault(); dispatch({ type: "handoffAction", action: { kind: "start", from, to } }) }}>
      <input type="date" aria-label="Season starts" value={from} onChange={e => setFrom(e.target.value)} />
      <span className="small muted">to</span>
      <input type="date" aria-label="Season ends" value={to} onChange={e => setTo(e.target.value)} />
      <button className="btn btn-primary small" disabled={!from || !to || from > to}>{state.handoff ? "Save dates" : "Start handoff season"}</button>
    </form>} />
    <section className="card season">
      <Chain label="Handoff season" stops={stops} />
    </section>
    <section className="relay-grid" data-testid="role-handbooks" aria-label="Role handbooks">
      {state.roles.map(role => {
        const r = state.handoffRoles.find(x => x.roleId === role.id)
        const out = state.people.find(p => p.id === (r?.outgoingId ?? role.holderId))
        const inc = state.people.find(p => p.id === r?.incomingId)
        const p = roleProgress(r)
        return <button type="button" key={role.id} className="relay" aria-label={`${role.displayName} handbook: ${p.stage}`} onClick={() => rail.show({ kind: "handoff", roleId: role.id })}>
          <span className="relay-role">{role.displayName}</span>
          <span className="relay-people">
            <Avatar name={out?.name} />
            <svg viewBox="0 0 40 12" aria-hidden="true"><path d="M2 6h32M28 1l6 5-6 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <Avatar name={inc?.name} title={inc?.name ?? "Incoming officer not named yet"} />
          </span>
          <span className="relay-foot"><Ring value={p.done} max={7} size={34} label={`${p.done} of 7 steps`} /><span className={`pill sm ${p.stage === "Complete" ? "" : "quiet"}`} style={{ "--pill": p.stage === "Complete" ? "#237a42" : p.done ? "#3a6fd8" : "#5f6763" } as CSSProperties}>{p.stage}</span></span>
        </button>
      })}
    </section>
  </>
}

/** One role's handbook, Trainual-style: steps with a progress bar, sources on hover. */
export function HandoffRoleDetail({ roleId }: { roleId: string }) {
  const { state } = useStore()
  const role = state.roles.find(r => r.id === roleId)
  const record = state.handoffRoles.find(r => r.roleId === roleId)
  if (!role) return <p className="empty">This role no longer exists.</p>
  if (!record) return <section className="form-stack"><h2>{role.displayName} handbook</h2><p className="small muted">Start the handoff season to draft this handbook. It will draw on these records:</p><ul className="small">{handbookSources(state, role.id).slice(0, 8).map(s => <li key={s.id}>{s.text}</li>)}</ul></section>
  return <RolePanel record={record} title={`${role.displayName} handbook`} />
}

function RolePanel({ record: r, title }: { record: RoleHandoff; title: string }) {
  const { state, dispatch } = useStore(); const { canNudge } = useViewer(); const self = state.viewerId === r.outgoingId
  const [interview, setInterview] = useState(r.interview.join("\n")), [name, setName] = useState(`Incoming ${state.roles.find(x => x.id === r.roleId)?.displayName} (example)`), [busy, setBusy] = useState(false), [notice, setNotice] = useState("")
  const sources = r.completed ? r.sources : handbookSources(state, r.roleId), fresh = r.fingerprint === sourceFingerprint(sources)
  const act = (action: import("../data/handoff").HandoffAction) => dispatch({ type: "handoffAction", action })
  const p = roleProgress(r)
  const start = r.startDate ?? state.handoff!.from
  async function draft() { setBusy(true); setNotice(""); const fingerprint = sourceFingerprint(sources); try { if (!state.aiEnabled) throw new Error("AI off"); const result = await callApi<{ entries: unknown; model: string; provider: string }>("/handbook/draft", { sources: sources.map(({ id, kind, text }) => ({ id, kind, text })) }); const entries = sanitizeHandbook(result, sources); if (!entries.length) throw new Error("No sources"); act({ kind: "draft", roleId: r.roleId, raw: { entries }, fingerprint, model: result.model, source: `AI-selected source extracts · ${result.provider}` }) } catch { act({ kind: "draft", roleId: r.roleId, raw: { entries: sources.slice(0, 6).map(s => ({ sourceId: s.id })).concat(sources.filter(s => s.kind === "interview").map(s => ({ sourceId: s.id }))) }, fingerprint, model: null, source: "Example extract draft · live AI unavailable or off" }); setNotice("Live AI was unavailable or off. This is a labelled example draft.") } finally { setBusy(false) } }
  return <section className="form-stack handbook" aria-label={title}>
    <h2>{title}</h2>
    <div className="progress-line"><div style={{ width: `${(p.done / 7) * 100}%` }} /></div>
    <p className="small muted">{p.done} of 7 · next: {p.stage} · outgoing {state.people.find(x => x.id === r.outgoingId)?.name ?? "—"}</p>

    <article className="step-card">
      <header><span className="step-n">1</span><b>Outgoing interview</b><Info>Fictional example only. One point per line. Never paste research transcripts or real participant details.</Info></header>
      <textarea aria-label="Outgoing interview · fictional example only" maxLength={12000} rows={4} value={interview} disabled={!self || r.completed} onChange={e => setInterview(e.target.value)} />
      <button className="btn small" disabled={!self || r.completed} onClick={() => act({ kind: "interview", roleId: r.roleId, lines: interview.split("\n") })}>Save example interview</button>
    </article>

    <article className="step-card">
      <header><span className="step-n">2</span><b>Handbook</b></header>
      <button className="btn btn-primary" disabled={busy || r.completed || (!self && !canNudge) || interview !== r.interview.join("\n")} onClick={draft}>{busy ? "Drafting from sources…" : "Draft role handbook"}</button>
      {notice && <p role="status" className="small">{notice}</p>}
      {!!r.entries.length && <div data-testid="handbook-draft" className="form-stack">
        <p className="small muted">{r.source}{r.model ? ` · ${r.model}` : ""}</p>
        {!fresh && !r.completed && <p className="warn-text small">Sources changed. Draft again before confirming.</p>}
        <ol className="entries">{r.entries.map((entry, i) => { const source = sources.find(s => s.id === entry.sourceId); return <li key={entry.sourceId}><span>{entry.text}</span> <details className="src"><summary>Source {i + 1}: {entry.sourceId}</summary><blockquote>{source?.text ?? entry.text}</blockquote>{source?.nodeId && <Link to={`/tasks?node=${encodeURIComponent(source.nodeId)}`}>Open task record</Link>}</details></li> })}</ol>
        <Feedback id={`handbook:${r.roleId}:${r.fingerprint}`} text={r.entries.map(e => e.text).join("\n")} />
      </div>}
    </article>

    <article className="step-card">
      <header><span className="step-n">3</span><b>Sign-off</b></header>
      <div className="action-row"><button className="btn" disabled={!self || !fresh || r.confirmed || !r.entries.length} onClick={() => act({ kind: "confirm", roleId: r.roleId })}>{r.confirmed ? "Outgoing officer confirmed" : "Confirm as outgoing officer"}</button><button className="btn" disabled={!canNudge || !r.confirmed || !fresh || r.approved} onClick={() => act({ kind: "approve", roleId: r.roleId })}>{r.approved ? "President approved" : "Approve as president"}</button></div>
    </article>

    <article className="step-card">
      <header><span className="step-n">4</span><b>First week</b><span className="small muted">{r.checks.length}/{WEEK_ONE.length}</span></header>
      {WEEK_ONE.map(item => <label key={item.id} className="check-label"><input type="checkbox" disabled={r.completed || !r.approved || (!self && !canNudge && state.viewerId !== r.incomingId)} checked={r.checks.includes(item.id)} onChange={() => act({ kind: "check", roleId: r.roleId, itemId: item.id })} /><Hover card={item.source}><span className="small">{item.text}</span></Hover></label>)}
    </article>

    <article className="step-card">
      <header><span className="step-n">5</span><b>Hand over</b></header>
      {!r.completed ? <>
        <label className="field"><span>Incoming fictional officer name</span><input maxLength={80} value={name} onChange={e => setName(e.target.value)} /></label>
        <button className="btn btn-primary" disabled={!canNudge || !r.approved || r.checks.length !== WEEK_ONE.length || !name.trim()} onClick={() => act({ kind: "complete", roleId: r.roleId, incomingName: name })}>Finish role handoff</button>
        <p className="small muted">Moves the role, open tasks and contacts to the new fictional officer. Nothing is sent.</p>
      </> : <p className="good-text small">Handed to {state.people.find(p => p.id === r.incomingId)?.name}.</p>}
      <label className="field"><span>Role handoff starts</span><input type="date" disabled={!canNudge || r.completed} value={start} onChange={e => act({ kind: "roleDate", roleId: r.roleId, date: e.target.value })} /></label>
      <button className="btn" disabled={!r.completed || r.reviewed || state.today < handoffDates(start).review || (!canNudge && state.viewerId !== r.incomingId)} onClick={() => act({ kind: "review", roleId: r.roleId })}>{r.reviewed ? "Day-30 review recorded" : `Record day-30 review (${fmtShort(handoffDates(start).review)})`}</button>
    </article>
  </section>
}
