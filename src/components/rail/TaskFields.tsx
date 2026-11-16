import { useMemo, useRef, useState } from "react"
import { useStore } from "../../data/store"
import { fmtLong } from "../../lib/dates"
import { Bts, BtsRow } from "../Bts"
import { officers } from "../../data/permissions"

/**
 * The one date a new task has: Due (FB-5, PLAN 8.3). It starts at today + the club's usual task length (Settings),
 * computed by the engine; the person can pick another. The task's club deadline is this date itself: the club buffer
 * only moves event steps that have an ASU deadline.
 */
export function TaskDueFields({ due, onDue }: { due: string; onDue: (d: string) => void }) {
  const { state } = useStore()
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(due) && due >= state.today
  return <>
    <label>Due<input type="date" aria-label="Due" value={due} min={state.today} onChange={e => onDue(e.target.value)} /></label>
    {valid && <p className="small muted" data-testid="club-deadline">Due <b>{fmtLong(due)}</b></p>}
    {valid && <BtsRow>
      <Bts label="Rule engine">A new task has one date, its due date. The club buffer in Settings applies only to event steps with an ASU deadline.</Bts>
      <Bts label="Data">The due date is what you pick; the default is today plus the number of days set in Settings. The assistant never supplies a date.</Bts>
    </BtsRow>}
  </>
}

export interface OwnerOption { id: string; label: string; sub: string }
/** People first, then roles: "Maya Chen · Treasurer", "Treasurer · role (Maya Chen)". */
export function useOwnerOptions(): OwnerOption[] {
  const { state } = useStore()
  return useMemo(() => [
    ...officers(state).map(p => ({ id: p.id, label: p.name, sub: state.roles.find(r => r.id === p.roleId)?.displayName ?? "Officer" })),
    ...state.roles.map(r => ({ id: r.id, label: r.displayName, sub: `role · ${state.people.find(p => p.id === r.holderId)?.name ?? "open"}` })),
  ], [state.people, state.roles])
}

const norm = (t: string) => t.trim().toLowerCase()
function bestMatch(options: OwnerOption[], q: string): OwnerOption | undefined {
  const n = norm(q).replace(/^@/, "")
  if (!n) return undefined
  return options.find(o => norm(o.label) === n) ?? options.find(o => norm(o.label).split(" ")[0] === n) ?? options.find(o => norm(o.label).startsWith(n)) ?? options.find(o => norm(o.label).includes(n))
}

/**
 * Owners as tags: type names or roles separated by commas or semicolons (or pick from the list on the right).
 * Several owners make one task each, so every task keeps a single owner (plan §4, mechanism 2).
 */
export function OwnerPicker({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const options = useOwnerOptions()
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [miss, setMiss] = useState("")
  const input = useRef<HTMLInputElement>(null)
  const add = (ids: string[]) => onChange([...new Set([...value, ...ids])])
  function commit(parts: string[]) {
    const found: string[] = [], missing: string[] = []
    for (const p of parts.map(x => x.trim()).filter(Boolean)) { const o = bestMatch(options, p); if (o) found.push(o.id); else missing.push(p) }
    if (found.length) add(found)
    setMiss(missing.length ? `No one called “${missing.join("”, “")}”.` : "")
  }
  function type(text: string) {
    const parts = text.split(/[,;，；]/)
    if (parts.length > 1) { commit(parts.slice(0, -1)); setQuery(parts.at(-1)!) } else setQuery(text)
    setOpen(true)
  }
  const shown = options.filter(o => !value.includes(o.id) && (!query.trim() || norm(o.label).includes(norm(query).replace(/^@/, "")) || norm(o.sub).includes(norm(query))))
  return <div className="owner-field">
    <span className="owner-label" id="owners-label">Owners</span>
    <div className="owner-picker" onClick={() => input.current?.focus()}>
      {value.map(id => { const o = options.find(x => x.id === id); return o && <span key={id} className="owner-chip">{o.label}<button type="button" aria-label={`Remove ${o.label}`} onClick={e => { e.stopPropagation(); onChange(value.filter(v => v !== id)) }}>×</button></span> })}
      <input ref={input} aria-label="Owners" value={query} placeholder={value.length ? "" : "Names or roles, separated by commas"}
        onChange={e => type(e.target.value)} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === "Tab") { if (query.trim()) { e.preventDefault(); commit([query]); setQuery("") } }
          else if (e.key === "Backspace" && !query && value.length) onChange(value.slice(0, -1))
          else if (e.key === "Escape" && open) { e.preventDefault(); e.stopPropagation(); setOpen(false) }
        }} />
      <button type="button" className="owner-toggle" aria-label="Show everyone" aria-expanded={open} onMouseDown={e => e.preventDefault()} onClick={e => { e.stopPropagation(); setOpen(!open); input.current?.focus() }}>▾</button>
    </div>
    {open && shown.length > 0 && <ul className="owner-suggest" role="listbox" aria-label="People and roles">{shown.slice(0, 8).map(o => <li key={o.id}>
      <button type="button" role="option" aria-selected="false" onMouseDown={e => e.preventDefault()} onClick={() => { add([o.id]); setQuery(""); setMiss("") }}><span>{o.label}</span><span className="small muted">{o.sub}</span></button>
    </li>)}</ul>}
    {miss && <p className="small late-text" role="alert">{miss}</p>}
  </div>
}

/** Owner tags → one person per task (a role means whoever holds it; an empty role means no owner yet). */
export function ownersToPeople(ids: string[], people: { id: string }[], roles: { id: string; holderId: string | null }[]): (string | null)[] {
  const out = ids.map(id => people.some(p => p.id === id) ? id : roles.find(r => r.id === id)?.holderId ?? null)
  const unique = [...new Set(out.filter((x): x is string => !!x))]
  return unique.length ? unique : out.length ? [null] : []
}
