import { useState, type CSSProperties } from "react"
import { useStore } from "../data/store"
import type { BoardSettings, BoardTag } from "../data/types"
import { canLead } from "../data/changeReview"
import { Empty, PALETTE, STATUS_DEFAULTS, STATUS_ORDER, useStatusStyles } from "./ui"

const FIELDS: { id: NonNullable<BoardSettings["fields"]>[number]; label: string }[] = [
  { id: "owner", label: "Owner" }, { id: "due", label: "Due date" }, { id: "event", label: "Event" }, { id: "tags", label: "Tags" },
]

/** Rename statuses, pick colours, manage tags and card fields. Meanings never change (decision 4). Saves as you go. */
export function BoardSettingsPanel() {
  const { state, dispatch } = useStore()
  const styles = useStatusStyles()
  const board = state.org.board ?? {}
  const [tagName, setTagName] = useState("")
  const [tagColor, setTagColor] = useState(PALETTE[6])
  if (!canLead(state)) return <Empty>The president or VP customizes the board.</Empty>
  const save = (patch: Partial<BoardSettings>) => dispatch({ type: "saveBoard", board: { ...board, fields: board.fields ?? FIELDS.map(f => f.id), ...patch } })
  const tags = board.tags ?? []
  const fields = board.fields ?? FIELDS.map(f => f.id)
  return <section className="form-stack" aria-label="Customize the board" data-testid="board-settings">
    <h2>Customize the board</h2>
    <h3>Status names and colours</h3>
    {STATUS_ORDER.map(st => <div key={st} className="status-edit">
      <span className="pill sm" style={{ "--pill": styles[st].color } as CSSProperties}>{styles[st].label}</span>
      <div className="form-stack tight">
        <input aria-label={`Name for ${STATUS_DEFAULTS[st].label}`} defaultValue={board.labels?.[st] ?? ""} placeholder={STATUS_DEFAULTS[st].label} maxLength={24} onBlur={e => save({ labels: { ...board.labels, [st]: e.target.value } })} />
        <div className="swatches" role="group" aria-label={`Colour for ${STATUS_DEFAULTS[st].label}`}>{PALETTE.map(c => <button key={c} type="button" className="swatch" style={{ "--sw": c } as CSSProperties} aria-label={c} aria-pressed={styles[st].color === c} onClick={() => save({ colors: { ...board.colors, [st]: c } })} />)}</div>
      </div>
    </div>)}
    <p className="small muted">Names change; meanings stay, so reminders and follow-ups keep working.</p>
    <h3>Tags</h3>
    <div className="tag-row">{tags.map(t => <span key={t.id} className="tag-chip" style={{ "--tag": t.color } as CSSProperties}>{t.label} <button type="button" className="link" aria-label={`Remove tag ${t.label}`} onClick={() => save({ tags: tags.filter(x => x.id !== t.id) })}>×</button></span>)}{!tags.length && <span className="small muted">No tags yet.</span>}</div>
    <form className="board-add" onSubmit={e => { e.preventDefault(); if (!tagName.trim()) return; const t: BoardTag = { id: `tag-${Date.now().toString(36)}`, label: tagName.trim(), color: tagColor }; save({ tags: [...tags, t] }); setTagName("") }}>
      <input value={tagName} onChange={e => setTagName(e.target.value)} maxLength={20} placeholder="New tag, e.g. Food" aria-label="New tag name" />
      <button className="btn small" type="submit">Add tag</button>
    </form>
    <div className="swatches" role="group" aria-label="New tag colour">{PALETTE.map(c => <button key={c} type="button" className="swatch" style={{ "--sw": c } as CSSProperties} aria-label={c} aria-pressed={tagColor === c} onClick={() => setTagColor(c)} />)}</div>
    <h3>Show on cards</h3>
    <div className="checks">{FIELDS.map(f => <label key={f.id}><input type="checkbox" checked={fields.includes(f.id)} onChange={e => save({ fields: e.target.checked ? [...fields, f.id] : fields.filter(x => x !== f.id) })} /> {f.label}</label>)}</div>
    <button type="button" className="btn btn-quiet small" onClick={() => dispatch({ type: "saveBoard", board: { tags, fields: FIELDS.map(f => f.id) } })}>Restore default names and colours</button>
  </section>
}
