import { useState, type CSSProperties } from "react"
import { isOfficer } from "../data/permissions"
import type { Successor } from "../data/handoff"
import { Link } from "react-router-dom"
import { PageHead } from "../components/Page"
import { useStore, useViewer } from "../data/store"
import { useRail } from "../components/rail/RailContext"
import { handoffDates } from "../engine/schedule"
import { handbookSources, localHandbook, sourceFingerprint, sanitizeHandbook, WEEK_ONE } from "../lib/handbook"
import { AI_WAIT_MS, aiMiss, callApi } from "../lib/api"
import { Feedback } from "../components/Feedback"
import { Avatar, Chain, Empty, Hover, Info, Ring, useStatusStyles, useTouch, type Stop } from "../components/ui"
import { Bts, BtsRow } from "../components/Bts"
import { fmtShort } from "../lib/dates"
import type { RoleHandoff } from "../data/types"

const STEPS = ["Interview", "Handbook", "Confirmed", "Approved", "Handed over", "First week", "Day 30"]
/** Seven checkpoints per role; the ring shows how many are done. */
export function roleProgress(r: RoleHandoff | undefined): { done: number; stage: string } {
  if (!r) return { done: 0, stage: "Not started" }
  const flags = [r.interview.length > 0, r.entries.length > 0, r.confirmed, r.approved, r.completed, r.checks.length === WEEK_ONE.length, r.reviewed]
  const done = flags.filter(Boolean).length
  const next = flags.findIndex(f => !f)
  return { done, stage: next < 0 ? "Complete" : STEPS[next] }
}

/** Handoff as a relay (v1.1): one season track and one baton card per role. */
export default function Handoff() {
  const { state, dispatch } = useStore()
  const { canNudge } = useViewer()
  const rail = useRail()
  const statusStyles = useStatusStyles()
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
      <button className="btn btn-primary small" disabled={!from || !to || from > to}>{state.handoff && !state.handoff.partial ? "Save dates" : "Start handoff season"}</button>
    </form>} />
    <section className="card season">
      <Chain label="Handoff season" stops={stops} />
      <BtsRow><Bts label="Rule engine">Five checkpoints from the season start date: the interview, handbook, first-week and day-30 dates are worked out from it (handoffDates). A checkpoint is done once the next one's date has come, now once its own date has come.</Bts></BtsRow>
    </section>
    <section className="relay-grid" data-testid="role-handbooks" aria-label="Role handbooks">
      {state.roles.map(role => {
        const r = state.handoffRoles.find(x => x.roleId === role.id)
        const out = state.people.find(p => p.id === (r?.outgoingId ?? role.holderId))
        const inc = state.people.find(p => p.id === r?.incomingId)
        const p = roleProgress(r)
        return <button type="button" key={role.id} className="relay" onClick={() => rail.show({ kind: "handoff", roleId: role.id })}>
          <span className="relay-role">{role.displayName}</span><span className="sr-only"> handbook </span>
          <span className="relay-people">
            <Avatar name={out?.name} />
            <svg viewBox="0 0 40 12" aria-hidden="true"><path d="M2 6h32M28 1l6 5-6 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <Avatar name={inc?.name} title={inc?.name ?? "Incoming officer not named yet"} />
          </span>
          <span className="relay-foot"><Ring value={p.done} max={7} size={34} label={`${p.done} of 7 steps`} /><span className={`pill sm ${p.stage === "Complete" ? "" : "quiet"}`} style={{ "--pill": (p.stage === "Complete" ? statusStyles.done : p.done ? statusStyles.accepted : statusStyles.unclaimed).color } as CSSProperties}>{p.stage}</span></span>
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
  if (!role) return <Empty>This role no longer exists.</Empty>
  if (!record) return <section className="form-stack"><h2>{role.displayName} handbook</h2><p className="small muted">Hand this role over to draft its handbook. It will draw on these records:</p><ul className="small">{handbookSources(state, role.id).slice(0, 8).map(s => <li key={s.id}>{s.text}</li>)}</ul><StartRole roleId={role.id} /></section>
  return <RolePanel record={record} title={`${role.displayName} handbook`} />
}

/** Starts the handoff for one role, without a club-wide season (a president action). */
function StartRole({ roleId, label = "Hand over this role" }: { roleId: string; label?: string }) {
  const { dispatch } = useStore(); const { canNudge } = useViewer()
  if (!canNudge) return null
  return <button type="button" className="btn btn-primary" onClick={() => dispatch({ type: "handoffAction", action: { kind: "startRole", roleId } })}>{label}</button>
}

function RolePanel({ record: r, title }: { record: RoleHandoff; title: string }) {
  const touch = useTouch()
  const { state, dispatch } = useStore(); const { canNudge } = useViewer(); const role = state.roles.find(x => x.id === r.roleId)
  // A role nobody holds has nobody to interview, so the president answers for it.
  const open = !role?.holderId
  const self = state.viewerId === r.outgoingId || (canNudge && open)
  const [interview, setInterview] = useState(r.interview.join("\n")), [name, setName] = useState(`Incoming ${state.roles.find(x => x.id === r.roleId)?.displayName} (example)`), [who, setWho] = useState("new"), [busy, setBusy] = useState(false), [notice, setNotice] = useState("")
  const sources = r.completed ? r.sources : handbookSources(state, r.roleId), fresh = r.fingerprint === sourceFingerprint(sources)
  const act = (action: import("../data/handoff").HandoffAction) => dispatch({ type: "handoffAction", action })
  const p = roleProgress(r)
  const successor: Successor = who === "new" ? { kind: "new", name } : who === "open" ? { kind: "vacant" } : { kind: "existing", personId: who }
  const named = !r.completed && r.incomingId ? state.people.find(p => p.id === r.incomingId) : undefined
  const takesOver = who !== "new" && who !== "open"
  const vacated = takesOver ? state.roles.find(x => x.holderId === who && x.id !== r.roleId) : undefined
  const start = r.startDate ?? state.handoff!.from
  /**
   * The AI picks and orders source records; if it is off, too slow or fails, the app builds the handbook from the same
   * records itself (interview points, then open tasks), so the step never ends in a dead end. Both are labelled.
   */
  async function draft() {
    setBusy(true); setNotice("")
    const fingerprint = sourceFingerprint(sources)
    try {
      if (!state.aiEnabled) throw new Error("AI off")
      const result = await callApi<{ entries: unknown; model: string; provider: string; partial?: boolean }>("/handbook/draft", { sources: sources.map(({ id, kind, text }) => ({ id, kind, text })) }, AI_WAIT_MS)
      const entries = sanitizeHandbook(result, sources)
      if (!entries.length) throw new Error("No sources")
      act({ kind: "draft", roleId: r.roleId, raw: { entries }, fingerprint, model: result.model, source: `AI-selected source extracts · ${result.provider}${result.partial ? " · reply was cut short, complete picks kept" : ""}` })
    } catch (e) {
      const why = !state.aiEnabled ? "off" : aiMiss(e)
      act({ kind: "draft", roleId: r.roleId, raw: localHandbook(sources), fingerprint, model: null, source: `Built from your sources · ${why === "off" ? "AI off" : why === "timeout" ? "AI didn't answer in time" : "AI unavailable"}` })
      setNotice(why === "off" ? "AI is off, so the app built this handbook from your sources." : `${why === "timeout" ? "The AI didn't answer in time" : "The AI couldn't draft it right now"}, so the app built this handbook from your sources. You can draft again later.`)
    } finally { setBusy(false) }
  }
  return <section className="form-stack handbook" aria-label={title}>
    <h2>{title}</h2>
    <div className="progress-line"><div style={{ width: `${(p.done / 7) * 100}%` }} /></div>
    <p className="small muted">{p.done} of 7 · next: {p.stage} · outgoing {state.people.find(x => x.id === r.outgoingId)?.name ?? "—"}</p>

    <article className="step-card">
      <header><span className="step-n">1</span><b>Outgoing interview</b><Info>Fictional example only. One point per line. Never paste research transcripts or real participant details.</Info></header>
      <textarea aria-label="Outgoing interview · fictional example only" placeholder="One point per line. Fictional examples only." maxLength={12000} rows={4} value={interview} disabled={!self || r.completed} onChange={e => setInterview(e.target.value)} />
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
      <header><span className="step-n">4</span><b>Hand over</b></header>
      {!r.completed ? <>
        {named ? <>
          <p className="small">Next officer: <b>{named.name}</b>. They can read this handbook and the open tasks now; the tasks stay with {state.people.find(p => p.id === r.outgoingId)?.name ?? "the role"} until you finish.</p>
          {canNudge && <button type="button" className="btn small" onClick={() => act({ kind: "clearIncoming", roleId: r.roleId })}>Change next officer</button>}
        </> : <>
          <label className="field"><span>Who takes over?</span><select value={who} onChange={e => setWho(e.target.value)}>
            <option value="new">A new person</option>
            {state.people.filter(p => p.id !== r.outgoingId && p.id !== role?.holderId && !p.incomingFor).map(p => <option key={p.id} value={p.id}>{p.name} · {isOfficer(p) ? state.roles.find(x => x.id === p.roleId)?.displayName : "former officer"}</option>)}
            {role?.fn !== "president" && !open && <option value="open">Nobody yet (leave it open)</option>}
          </select></label>
          {who === "new" && <label className="field"><span>Incoming fictional officer name</span><input maxLength={80} value={name} onChange={e => setName(e.target.value)} /></label>}
          {takesOver && vacated && <p className="small warn-text">{vacated.displayName} will be open until someone takes it.</p>}
          {who !== "open" && <button type="button" className="btn small" disabled={!canNudge || (who === "new" && !name.trim())} onClick={() => act({ kind: "setIncoming", roleId: r.roleId, successor: who === "new" ? { kind: "new", name } : { kind: "existing", personId: who } })}>Name as next officer</button>}
        </>}
        <button className="btn btn-primary" disabled={!canNudge || !r.approved || (!named && who === "new" && !name.trim())} onClick={() => act(named ? { kind: "complete", roleId: r.roleId } : { kind: "complete", roleId: r.roleId, successor })}>Finish role handoff</button>
        <p className="small muted">Moves the role and its open tasks, which wait for the new officer to tap “I've got it”. Contacts stay with the role. Nothing is sent.</p>
      </> : r.incomingId ? <p className="good-text small">Handed to {state.people.find(p => p.id === r.incomingId)?.name}.</p> : <><p className="small">Left open: {role?.displayName} has no officer yet.</p><StartRole roleId={r.roleId} label="Hand over to someone" /></>}
      <label className="field"><span>Role handoff starts</span><input type="date" disabled={!canNudge || r.completed} value={start} onChange={e => act({ kind: "roleDate", roleId: r.roleId, date: e.target.value })} /></label>
    </article>

    <article className="step-card">
      <header><span className="step-n">5</span><b>First week</b><span className="small muted">{r.checks.length}/{WEEK_ONE.length}</span></header>
      {WEEK_ONE.map(item => <label key={item.id} className="check-label"><input type="checkbox" disabled={!r.completed || (!canNudge && state.viewerId !== r.incomingId)} checked={r.checks.includes(item.id)} onChange={() => act({ kind: "check", roleId: r.roleId, itemId: item.id })} />{touch ? <><span className="small">{item.text}</span><Info label={`Where "${item.text}" comes from`}>{item.source}</Info></> : <Hover card={item.source}><span className="small">{item.text}</span></Hover>}</label>)}
      {!r.completed && <p className="small muted">Opens for the new officer once the role is handed over.</p>}
      <BtsRow><Bts label="Source">{[...new Set(WEEK_ONE.map(item => item.source))].join(" · ")}</Bts></BtsRow>
      <button className="btn" disabled={!r.completed || r.reviewed || state.today < handoffDates(start).review || (!canNudge && state.viewerId !== r.incomingId)} onClick={() => act({ kind: "review", roleId: r.roleId })}>{r.reviewed ? "Day-30 review recorded" : `Record day-30 review (${fmtShort(handoffDates(start).review)})`}</button>
    </article>

  </section>
}
