import { useState } from "react"
import type { DemoState, Goal, WorkspaceConfig, Channel } from "../data/types"
import { validateWorkspace, type ProfilePatch } from "../data/settings"
import { documentSource, readDocumentFile } from "../lib/readDocument"
import { dutiesOf } from "../data/structure"
import { mondayOf } from "../engine/team"

export function GoalsEditor({ goals, onChange, progress = false }: { goals: Goal[]; onChange: (g: Goal[]) => void; progress?: boolean }) {
  const change = (i: number, patch: Partial<Goal>) => onChange(goals.map((g, j) => j === i ? { ...g, ...patch } : g))
  return <div className="form-stack tight"><div className="tbl-wrap"><table className="tbl goal-tbl"><thead><tr><th>Goal</th><th>Target</th><th>Unit</th>{progress && <th>Now</th>}<th><span className="sr-only">Remove</span></th></tr></thead><tbody>{goals.map((g, i) => <tr key={g.id}>
    <td><input type="text" aria-label="Goal name" value={g.label} maxLength={100} onChange={e => change(i, { label: e.target.value })} /></td>
    <td><input type="number" aria-label="Target" min="1" max="1000000" value={g.target} onChange={e => change(i, { target: Number(e.target.value) })} /></td>
    <td><input type="text" aria-label="Unit" value={g.unit} maxLength={20} onChange={e => change(i, { unit: e.target.value })} /></td>
    {progress && <td><input type="number" aria-label="Current progress" min="0" value={g.current} onChange={e => change(i, { current: Number(e.target.value) })} /></td>}
    <td><button type="button" className="btn small btn-quiet" aria-label={`Remove goal ${i + 1}`} title={`Remove goal ${i + 1}`} onClick={() => onChange(goals.filter((_, j) => j !== i))}>✕</button></td>
  </tr>)}</tbody></table></div>{goals.length < 3 && <div><button type="button" className="btn small" onClick={() => onChange([...goals, { id: crypto.randomUUID(), label: "New semester goal", unit: "completed", target: 3, current: 0 }])}>Add goal</button></div>}</div>
}

export function WorkspaceEditor({ value, onChange, showPlanningMaterials = true }: { value: WorkspaceConfig; onChange: (w: WorkspaceConfig) => void; showPlanningMaterials?: boolean }) {
  const [error, setError] = useState("")
  const set = (patch: Partial<WorkspaceConfig>) => onChange({ ...value, ...patch })
  return <div className="form-stack"><p className="notice">Demo configuration only. Links open when you choose. No Calendar, Gmail, WhatsApp or Drive account is connected or read.</p><div className="form-grid"><label>Calendar link<input type="url" value={value.calendarUrl} onChange={e => set({ calendarUrl: e.target.value })} /></label><label>Club messaging channel<select value={value.messaging} onChange={e => set({ messaging: e.target.value as WorkspaceConfig["messaging"] })}><option value="whatsapp">WhatsApp</option><option value="email">Gmail / email</option></select></label><label>Club Google Drive folder (optional)<input type="url" placeholder="https://drive.google.com/drive/folders/…" value={value.driveLink} onChange={e => set({ driveLink: e.target.value })} /></label></div>{showPlanningMaterials && <><label>Planning notes (how your club runs events)<textarea maxLength={2000} rows={3} value={value.planningNotes} onChange={e => set({ planningNotes: e.target.value })} /></label><label>Fictional planning files<input type="file" multiple accept=".txt,.md,.csv,.pdf,.docx,.xlsx" onChange={async e => {
    const files = Array.from(e.target.files ?? []); e.target.value = ""; setError("")
    if (files.some(f => !f.size || f.size > 512000) || files.length + value.files.length > 3 || files.reduce((n, f) => n + f.size, value.files.reduce((n, f) => n + f.size, 0)) > 1000000) { setError("Use up to three small files, 512 KB each and 1 MB total."); return }
    try {
      const added = await Promise.all(files.map(async file => {
        const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file) })
        // The text is read here, in this browser, so the AI can compare it with the standard workflow in setup. Scanned or unsupported files stay unread.
        let text = ""
        try { text = (await documentSource(/\.csv$/i.test(file.name) ? await file.text() : await readDocumentFile(file), file.name)).text.slice(0, 40_000) } catch { text = "" }
        return { id: crypto.randomUUID(), name: file.name, type: file.type, size: file.size, dataUrl, ...(text ? { text } : {}) }
      }))
      const next = { ...value, files: [...value.files, ...added] }; const err = validateWorkspace(next)
      if (err) setError(err); else onChange(next)
    } catch { setError("This file could not be saved. Try a smaller file.") }
  }} /></label><p className="small muted">Up to 3 files, 512 KB each, 1 MB total. Stored in this browser; reset removes them. In setup, AI compares the text of PDF, Word and text files, and your planning notes, with the standard event workflow. Use fictional material only.</p>{value.files.map(f => <div className="action-row" key={f.id}><a href={f.dataUrl} download={f.name}>{f.name}</a><span className="small muted">{Math.ceil(f.size / 1000)} KB{f.text ? ` · ${f.text.split(/\s+/).length.toLocaleString("en-US")} words read` : " · not read"}</span><button type="button" className="btn small" aria-label={`Remove ${f.name}`} onClick={() => set({ files: value.files.filter(x => x.id !== f.id) })}>Remove</button></div>)}{error && <p role="alert">{error}</p>}</>}</div>
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
export function ProfileForm({ value: p, roleName, onChange }: { value: ProfilePatch; roleName: string; onChange: (p: ProfilePatch) => void }) {
  const [busyDate, setBusyDate] = useState("")
  const set = (patch: Partial<ProfilePatch>) => onChange({ ...p, ...patch })
  return <div className="form-stack"><fieldset><legend>1 · Confirm your name and role</legend><p>{roleName}</p><div className="form-grid"><label>Fictional name<input value={p.name} maxLength={80} onChange={e => set({ name: e.target.value })} /></label><label>Demo email (example.org)<input type="email" value={p.email} onChange={e => set({ email: e.target.value })} /></label></div></fieldset><fieldset><legend>2 · Where should reminders open?</legend><div className="form-grid"><label>Preferred channel<select value={p.channels[0]} onChange={e => set({ channels: [e.target.value as Channel] })}><option value="whatsapp">WhatsApp</option><option value="sms">SMS</option><option value="email">Gmail / email</option></select></label><label>Demo phone (optional)<input placeholder="480-555-0100" value={p.phone} onChange={e => set({ phone: e.target.value })} /></label><label>ASU ID (optional)<input inputMode="numeric" placeholder="9999000001" maxLength={10} value={p.asuId ?? ""} onChange={e => set({ asuId: e.target.value.replace(/\D/g, "") })} /></label></div><p className="small muted">Use a fictional 555-01xx number and a fictional ASU ID starting 9999, or leave blank. No message is sent here.</p></fieldset><fieldset><legend>3 · When do reminders work best?</legend><label>Reminder preference<select value={p.remindAt} onChange={e => set({ remindAt: e.target.value as ProfilePatch["remindAt"] })}><option value="morning">Morning</option><option value="evening">Evening</option></select></label><p className="small muted">Quiet hours: 10 pm–8 am, Arizona time.</p></fieldset><fieldset><legend>4 · Which weeks are busy?</legend><p className="small muted">Busy weeks and your personal planning buffer stay in your own settings. Scheduling skips these weeks and ASU finals/breaks.</p><div className="action-row"><label>A date in your busy week<input type="date" value={busyDate} onChange={e => setBusyDate(e.target.value)} /></label><button type="button" className="btn" disabled={!busyDate || p.busyWeeks.length >= 20} onClick={() => { set({ busyWeeks: [...new Set([...p.busyWeeks, mondayOf(busyDate)])].sort() }); setBusyDate("") }}>Add busy week</button></div>{p.busyWeeks.map(w => <div className="action-row" key={w}><span>Week of {w}</span><button type="button" className="btn small" onClick={() => set({ busyWeeks: p.busyWeeks.filter(x => x !== w) })}>Remove week {w}</button></div>)}<label className="check-label"><input type="checkbox" checked={p.personalBufferEnabled} onChange={e => set({ personalBufferEnabled: e.target.checked })} />Customize my private planning buffer</label>{p.personalBufferEnabled ? <label>My extra working days<input type="number" min="0" max="5" value={p.personalBufferDays} onChange={e => set({ personalBufferDays: Number(e.target.value) })} /></label> : <p className="small muted">Using the standard one-day personal buffer. This never affects contributions.</p>}</fieldset><fieldset><legend>5 · What would make this role worthwhile?</legend><label>Career goal<textarea rows={2} maxLength={500} value={p.careerGoal} onChange={e => set({ careerGoal: e.target.value })} /></label><label>Interests<textarea rows={2} maxLength={500} value={p.interests} onChange={e => set({ interests: e.target.value })} /></label><label>Expectations for this role<textarea rows={2} maxLength={500} value={p.expectations} onChange={e => set({ expectations: e.target.value })} /></label><details><summary>Share weekly free times for the meeting finder</summary><p className="small muted">Only these entered times are used. Your calendar is not read.</p>{p.freeSlots.map((f, i) => <div className="slot-row" key={i}><label>Weekday<select value={f.day} onChange={e => set({ freeSlots: p.freeSlots.map((s, j) => j === i ? { ...s, day: Number(e.target.value) } : s) })}>{DAYS.map((d, j) => <option value={j} key={d}>{d}</option>)}</select></label><label>From<input type="time" value={f.from} onChange={e => set({ freeSlots: p.freeSlots.map((s, j) => j === i ? { ...s, from: e.target.value } : s) })} /></label><label>To<input type="time" value={f.to} onChange={e => set({ freeSlots: p.freeSlots.map((s, j) => j === i ? { ...s, to: e.target.value } : s) })} /></label><button type="button" className="btn small" onClick={() => set({ freeSlots: p.freeSlots.filter((_, j) => j !== i) })}>Remove slot {i + 1}</button></div>)}{p.freeSlots.length < 14 && <button type="button" className="btn" onClick={() => set({ freeSlots: [...p.freeSlots, { day: 4, from: "18:00", to: "20:00" }] })}>Add free slot</button>}</details></fieldset></div>
}

/** What a member's role is, in the club's own words: who it reports to and its duties. Everyone sees the same text the president set. */
export function RoleCard({ state, personId }: { state: DemoState; personId: string }) {
  const person = state.people.find(p => p.id === personId)
  const role = state.roles.find(r => r.id === person?.roleId)
  if (!role) return null
  const boss = state.roles.find(r => r.id === role.reportsToId)
  return <section className="role-card" data-testid="role-card" aria-label="Your role">
    <p><b>{role.displayName}</b>{boss ? ` · reports to ${boss.displayName}` : ""}</p>
    <p className="small muted">{dutiesOf(role)}</p>
  </section>
}
