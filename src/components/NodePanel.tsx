import { useEffect, useRef, useState } from "react"
import { useStore, useSchedule, type NodePatch } from "../data/store"
import { RULES } from "../data/rules"
import { PHASE_LABEL } from "../engine/playbooks"
import { fmtLong } from "../lib/dates"
import { SEVERITY_TONE } from "../pages/helpers"
import { StatusPill, useTouch } from "./ui"
import { useOptionalRail } from "./rail/RailContext"
import { canLead } from "../data/changeReview"
import { officialLabel } from "../engine/taskDates"

const RULE_BY_ID = Object.fromEntries(RULES.map(r => [r.id, r]))
const TIER_LABEL = { light: "Light", medium: "Medium", heavy: "Heavy" } as const

/** Side panel for one step: owner, three deadlines with their sources, effort, links, RACI, why. */
export function NodePanel({ nodeId, onClose, onSelect }: { nodeId: string; onClose: () => void; onSelect: (id: string) => void }) {
  // On a phone the card with the ASU deadline and rule IDs does not exist, so the panel shows that part already open.
  const touch = useTouch()
  const { state, dispatch } = useStore()
  const sched = useSchedule()
  const n = state.nodes.find(x => x.id === nodeId)
  const p = sched.nodes[nodeId]
  const heading = useRef<HTMLHeadingElement>(null)
  const rail = useOptionalRail()

  useEffect(() => {
    heading.current?.focus()
  }, [nodeId])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  if (!n || !p) return null
  // store.updateNode drops the patch unless the viewer leads, so the controls say so instead of
  // swallowing the edit. Same wording and shape as ChangeCard, the one place that already did this.
  const lead = canLead(state)
  const update = (patch: NodePatch) => dispatch({ type: "updateNode", id: n.id, patch })
  const upstream = state.nodes.filter(x => n.dependsOn.includes(x.id))
  const downstream = state.nodes.filter(x => x.dependsOn.includes(n.id))
  const owner = state.people.find(x => x.id === n.ownerId)
  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter(x => x !== id) : [...list, id])

  return (
    <aside className="panel" role="dialog" aria-labelledby="panel-title" data-testid="node-panel">
      <div className="panel-head">
        <div className="eyebrow">{n.phase ? PHASE_LABEL[n.phase] : "Task"}</div>
        <button type="button" className="btn btn-quiet panel-close" onClick={onClose} aria-label="Close panel">✕</button>
      </div>
      <h2 id="panel-title" ref={heading} tabIndex={-1}>{n.title}</h2>
      {p.issues.length > 0 && (
        <ul className="issues" data-testid="node-issues">
          {p.issues.map(i => <li key={i.code} className={`issue ${SEVERITY_TONE[i.severity]}`}>{i.text}</li>)}
        </ul>
      )}
      <div className="kv">
        <span>Owner</span>
        <select value={n.ownerId ?? ""} disabled={!lead} onChange={e => update({ ownerId: e.target.value || null })} data-testid="owner-select" aria-label="Owner (R)">
          <option value="">No owner</option>
          {state.people.map(x => <option key={x.id} value={x.id}>{x.name} · {state.roles.find(r => r.id === x.roleId)?.displayName}</option>)}
        </select>
        <span>Status</span>
        <span><StatusPill status={n.status} />{n.waitingOn && <span className="small muted"> · {n.waitingOn}</span>}</span>
        <span>Start by</span>
        <b data-testid="dl-start">{fmtLong(p.latestStart)}</b>
        <label htmlFor="club-date">Club deadline</label>
        <span className="dl-date">
          <input id="club-date" type="date" value={p.club} disabled={!lead} data-testid="club-input" onChange={e => /^\d{4}-\d{2}-\d{2}$/.test(e.target.value) && update({ clubDeadlineOverride: e.target.value })} />
          {n.clubDeadlineOverride && <button type="button" className="btn btn-quiet small" disabled={!lead} onClick={() => update({ clubDeadlineOverride: null })}>Use recommended ({fmtLong(p.recommendedClub)})</button>}
        </span>
        <span>{officialLabel(n)}</span>
        <b data-testid="dl-official">{p.official ? fmtLong(p.official) : "None"}</b>
        <span>Materials</span>
        <span>{n.draftLink && /^https?:\/\//.test(n.draftLink) ? <a href={n.draftLink} target="_blank" rel="noreferrer">Open link ↗</a> : <span className="muted small">None yet</span>}</span>
      </div>
      {!lead && <p className="small muted">The president or VP approves changes.</p>}
      {owner && n.status === "unclaimed" && <p className="small muted">{owner.name.split(" ")[0]} confirms with “I've got it”.</p>}
      {rail && <button type="button" className="btn" onClick={() => rail.ask("Explain this step: what should happen next?", true)}>Ask AI about this step</button>}

      <details className="more" open={touch || undefined}>
        <summary>More</summary>
        <section className="panel-sec" aria-labelledby="dl-h">
          <h3 id="dl-h">Why these dates</h3>
          <p className="small"><b>Start by:</b> {n.ownerId === state.viewerId ? p.explain.latestStart : "Working days before the club deadline, allowing for effort and private planning preferences; skips ASU nonworking days."}</p>
          <p className="small"><b>Club deadline:</b> {p.explain.club}</p>
          <p className="small"><b>ASU deadline:</b> {p.explain.official ?? "No ASU rule sets a deadline for this step. Its dates come from the club's timing and the steps after it."}</p>
        </section>
        <section className="panel-sec" aria-labelledby="who-h">
          <h3 id="who-h">Who else</h3>
          <label className="field">
            <span>Approver (A)</span>
            <select value={n.approverRoleId ?? ""} disabled={!lead} onChange={e => update({ approverRoleId: e.target.value || null })}>
              <option value="">Nobody</option>
              {state.roles.map(r => <option key={r.id} value={r.id}>{r.displayName}</option>)}
            </select>
          </label>
          <fieldset className="field">
            <legend>Consulted (C)</legend>
            <div className="checks">{state.roles.map(r => <label key={r.id}><input type="checkbox" checked={n.consultedRoleIds.includes(r.id)} disabled={!lead} onChange={() => update({ consultedRoleIds: toggle(n.consultedRoleIds, r.id) })} /> {r.displayName}</label>)}</div>
          </fieldset>
          <fieldset className="field">
            <legend>Informed (I)</legend>
            <div className="checks">{state.roles.map(r => <label key={r.id}><input type="checkbox" checked={n.informedRoleIds.includes(r.id)} disabled={!lead} onChange={() => update({ informedRoleIds: toggle(n.informedRoleIds, r.id) })} /> {r.displayName}</label>)}</div>
          </fieldset>
        </section>
        <section className="panel-sec" aria-labelledby="work-h">
          <h3 id="work-h">Work</h3>
          <label className="field">
            <span>Effort (working days) · {TIER_LABEL[n.tier]}</span>
            <input type="number" min={0} max={30} value={n.estDays} disabled={!lead} onChange={e => update({ estDays: Number(e.target.value) })} data-testid="effort-input" />
          </label>
          <DeferredText label="Why it matters" value={n.why} multiline disabled={!lead} onCommit={v => update({ why: v })} />
          <DeferredText label="Draft or materials link" value={n.draftLink ?? ""} type="url" placeholder="https://drive.google.com/…" disabled={!lead} onCommit={v => update({ draftLink: v.trim() || null })} />
          <p className="small muted">Source: {n.source}</p>
        </section>
        {(upstream.length > 0 || downstream.length > 0) && (
          <section className="panel-sec" aria-labelledby="links-h">
            <h3 id="links-h">Links</h3>
            {upstream.length > 0 && <div className="small muted">Waits for</div>}
            <ul className="link-list">{upstream.map(u => <li key={u.id}><button type="button" className="link" onClick={() => onSelect(u.id)}>{u.title}</button></li>)}</ul>
            {downstream.length > 0 && <div className="small muted">Then</div>}
            <ul className="link-list">{downstream.map(u => <li key={u.id}><button type="button" className="link" onClick={() => onSelect(u.id)}>{u.title}</button></li>)}</ul>
          </section>
        )}
        {n.ruleIds.length > 0 && (
          <section className="panel-sec" aria-labelledby="rules-h">
            <h3 id="rules-h">ASU rules</h3>
            <ul className="list">
              {n.ruleIds.map(id => {
                const r = RULE_BY_ID[id]
                return r ? (
                  <li key={id} className="block">
                    <span className="rule-id">{id}</span> <span className="small">{r.text}</span>
                    <div className="small muted">{r.sources.map((s, i) => <span key={s.url}>{i > 0 && " · "}<a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></span>)}</div>
                  </li>
                ) : null
              })}
            </ul>
          </section>
        )}
      </details>
    </aside>
  )
}

/** A text field that saves when you leave it, so typing does not reschedule on every key. */
function DeferredText({ label, value, onCommit, multiline, type = "text", placeholder, disabled }: { label: string; value: string; onCommit: (v: string) => void; multiline?: boolean; type?: string; placeholder?: string; disabled?: boolean }) {
  const [v, setV] = useState(value)
  useEffect(() => setV(value), [value])
  const commit = () => v !== value && onCommit(v)
  return (
    <label className="field">
      <span>{label}</span>
      {multiline
        ? <textarea value={v} rows={3} disabled={disabled} onChange={e => setV(e.target.value)} onBlur={commit} />
        : <input type={type} value={v} placeholder={placeholder} disabled={disabled} onChange={e => setV(e.target.value)} onBlur={commit} />}
    </label>
  )
}
