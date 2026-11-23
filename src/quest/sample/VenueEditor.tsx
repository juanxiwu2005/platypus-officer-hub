import "../../styles/quest-venue.css"
import { useState } from "react"
import RoomView from "./RoomView"
import { addProp, checkVenue, moveProp, PROP_NAMES, ROOM, type PropKind, type VenueCheckId, type VenueItem, type VenueLayout } from "./venue"

/** P5 venue stage editor: plan the room, watch the six source-backed checks, then lock or preview. */
export interface VenueEditorProps { layout: VenueLayout; onChange: (layout: VenueLayout) => void; onCheck: () => void; onExplain: (id: VenueCheckId) => void }

const KINDS = Object.keys(PROP_NAMES) as PropKind[]

export default function VenueEditor({ layout, onChange, onCheck, onExplain }: VenueEditorProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [tool, setTool] = useState<PropKind | null>(null)
  const checks = checkVenue(layout)
  const clear = checks.filter(check => check.passed).length
  const allClear = checks.every(check => check.passed)
  const item = layout.items.find(current => current.id === selected) ?? null
  const put = (part: Partial<VenueLayout>) => onChange({ ...layout, ...part })
  const move = (x: number, z: number) => { if (item) onChange(moveProp(layout, item.id, x, z)) }
  const guests = (raw: string) => { const value = Math.floor(Number(raw)); put({ headcount: Number.isFinite(value) ? Math.max(0, Math.min(120, value)) : 0 }) }
  const place = (kind: PropKind, x: number, z: number) => {
    const next = addProp(layout, kind, x, z)
    onChange(next)
    if (next.items.length > layout.items.length) setSelected(next.items.find(created => !layout.items.some(old => old.id === created.id))!.id)
    setTool(null)
  }
  return <div className="sample-venue">
    <div className="sample-venue-heading">
      <h2>Prepare a welcoming room. Keep every route clear.</h2>
      <p className="sample-venue-note">Practice proposal. Venue staff confirm the reserved setup.</p>
      <p className="sample-venue-status" role="status">{clear}/6 room checks clear</p>
    </div>
    <div className="sample-venue-grid">
      <div className="sample-venue-model">
        <RoomView layout={layout} selected={selected} tool={tool} onSelect={setSelected} onMove={(id, x, z) => onChange(moveProp(layout, id, x, z))} onPlace={place} />
      </div>
      <div className="sample-venue-panel">
        <div className="sample-venue-checks" role="group" aria-label="Room checks">
          {checks.map(check => <button key={check.id} type="button" className={`sample-venue-check${check.passed ? " is-clear" : " is-blocked"}`} onClick={() => onExplain(check.id)} aria-label={`${check.label}${check.checklist ? " (checklist check)" : ""}: ${check.passed ? "clear" : "needs work"}`}>
            <span>{check.label}{check.checklist ? " (checklist check)" : ""}:</span> <span>{check.passed ? "Clear" : "Needs work"}</span>
          </button>)}
        </div>
        <div className="sample-venue-field">
          <label htmlFor="sample-venue-guests">Guests</label>
          <input id="sample-venue-guests" type="number" min={0} max={120} step={1} value={layout.headcount} onChange={event => guests(event.target.value)} />
          <span>/ {ROOM.capacity} capacity</span>
        </div>
        <div className="sample-venue-field">
          <label htmlFor="sample-venue-item">Furniture</label>
          <select id="sample-venue-item" data-rewind-focus="" value={selected ?? ""} onChange={event => { setSelected(event.target.value || null); setTool(null) }}>
            <option value="">None</option>
            {layout.items.map((current, index) => <option key={current.id} value={current.id}>{PROP_NAMES[current.kind]} {layout.items.slice(0, index).filter(other => other.kind === current.kind).length + 1}</option>)}
          </select>
        </div>
        {item && <div className="sample-venue-controls">
          <button type="button" aria-label="Previous column" onClick={() => move(item.x - .5, item.z)}>Column −</button>
          <button type="button" aria-label="Next column" onClick={() => move(item.x + .5, item.z)}>Column +</button>
          <button type="button" aria-label="Previous row" onClick={() => move(item.x, item.z - .5)}>Row −</button>
          <button type="button" aria-label="Next row" onClick={() => move(item.x, item.z + .5)}>Row +</button>
          <button type="button" onClick={() => put({ items: layout.items.map((current): VenueItem => current.id === item.id ? { ...current, turn: current.turn === 0 ? 1 : 0 } : current) })}>Rotate</button>
          <button type="button" onClick={() => { onChange({ ...layout, items: layout.items.filter(current => current.id !== item.id) }); setSelected(null) }}>Remove</button>
        </div>}
        <div className="sample-venue-field">
          <label htmlFor="sample-venue-add">Add furniture</label>
          <select id="sample-venue-add" value={tool ?? ""} disabled={layout.items.length >= 60} onChange={event => { const value = event.target.value; setTool(value ? value as PropKind : null); if (value) setSelected(null) }}>
            <option value="">Choose item</option>
            {KINDS.map(kind => <option key={kind} value={kind}>{PROP_NAMES[kind]}</option>)}
          </select>
        </div>
        {tool && <div className="sample-venue-controls">
          <p className="sample-venue-tool-note">Place {PROP_NAMES[tool]} in the room.</p>
          <button type="button" onClick={() => setTool(null)}>Done adding</button>
        </div>}
        <details className="sample-venue-yours">
          <summary>Make it yours</summary>
          <label className="sample-venue-field" htmlFor="sample-venue-name">Event name
            <input id="sample-venue-name" type="text" maxLength={48} value={layout.name} onChange={event => put({ name: event.target.value })} />
          </label>
          <label className="sample-venue-field" htmlFor="sample-venue-theme">Theme
            <select id="sample-venue-theme" value={layout.theme} onChange={event => put({ theme: event.target.value as VenueLayout["theme"] })}>
              <option value="teal">Teal</option><option value="sunset">Sunset</option><option value="sage">Sage</option>
            </select>
          </label>
          <label className="sample-venue-field" htmlFor="sample-venue-lighting">Lighting
            <select id="sample-venue-lighting" value={layout.lighting} onChange={event => put({ lighting: event.target.value as VenueLayout["lighting"] })}>
              <option value="warm">Warm</option><option value="cool">Cool</option><option value="stage">Stage</option>
            </select>
          </label>
          <label className="sample-venue-field" htmlFor="sample-venue-pattern">Backdrop
            <select id="sample-venue-pattern" value={layout.pattern} onChange={event => put({ pattern: event.target.value as VenueLayout["pattern"] })}>
              <option value="plain">Plain</option><option value="stripes">Stripes</option><option value="dots">Dots</option>
            </select>
          </label>
          <label className="sample-venue-field" htmlFor="sample-venue-tablecloth">Tablecloth
            <select id="sample-venue-tablecloth" value={layout.tablecloth} onChange={event => put({ tablecloth: event.target.value as VenueLayout["tablecloth"] })}>
              <option value="teal">Teal</option><option value="cream">Cream</option><option value="sunset">Sunset</option>
            </select>
          </label>
        </details>
        <div className="sample-venue-actions">
          {!allClear && <button type="button" onClick={onCheck}>Preview outcome</button>}
          <button type="button" className="quest-primary" disabled={!allClear} onClick={onCheck}>Lock layout</button>
        </div>
      </div>
    </div>
  </div>
}
