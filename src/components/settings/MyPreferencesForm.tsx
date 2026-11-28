import { useState } from "react"
import type { Channel } from "../../data/types"
import type { ProfilePatch } from "../../data/settings"
import { mondayOf } from "../../engine/team"

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

/**
 * Settings → My preferences. Plain labelled fields, no numbered steps. Career goal, interests and expectations are not edited here or in
 * member setup any more (ob-6 dropped them); their stored values pass through the patch unchanged.
 * One name per thing: the personal buffer is "extra days" in every visible label (the club buffer is "days early").
 */
export function MyPreferencesForm({ value: p, onChange }: { value: ProfilePatch; onChange: (p: ProfilePatch) => void }) {
  const [busyDate, setBusyDate] = useState("")
  const set = (patch: Partial<ProfilePatch>) => onChange({ ...p, ...patch })
  return <div className="form-stack" data-testid="my-preferences-form">
    <div className="form-grid">
      <label>Fictional name<input value={p.name} maxLength={80} onChange={e => set({ name: e.target.value })} /></label>
      <label>Demo email (example.org)<input type="email" value={p.email} onChange={e => set({ email: e.target.value })} /></label>
      <label>Preferred channel<select value={p.channels[0]} onChange={e => set({ channels: [e.target.value as Channel] })}><option value="whatsapp">WhatsApp</option><option value="sms">SMS</option><option value="email">Gmail / email</option></select></label>
      <label>Demo phone (optional)<input placeholder="480-555-0100" value={p.phone} onChange={e => set({ phone: e.target.value })} /></label>
      <label>ASU ID (optional)<input inputMode="numeric" placeholder="9999000001" maxLength={10} value={p.asuId ?? ""} onChange={e => set({ asuId: e.target.value.replace(/\D/g, "") })} /></label>
      <label>Reminder preference<select value={p.remindAt} onChange={e => set({ remindAt: e.target.value as ProfilePatch["remindAt"] })}><option value="morning">Morning</option><option value="evening">Evening</option></select></label>
    </div>
    <p className="small muted">Quiet hours: 10 pm–8 am, Arizona time.</p>
    <div className="action-row"><label>A date in your busy week<input type="date" value={busyDate} onChange={e => setBusyDate(e.target.value)} /></label><button type="button" className="btn" disabled={!busyDate || p.busyWeeks.length >= 20} onClick={() => { set({ busyWeeks: [...new Set([...p.busyWeeks, mondayOf(busyDate)])].sort() }); setBusyDate("") }}>Add busy week</button></div>
    {p.busyWeeks.map(w => <div className="action-row" key={w}><span>Week of {w}</span><button type="button" className="btn small" onClick={() => set({ busyWeeks: p.busyWeeks.filter(x => x !== w) })}>Remove week {w}</button></div>)}
    <label className="check-label"><input type="checkbox" checked={p.personalBufferEnabled} onChange={e => set({ personalBufferEnabled: e.target.checked })} />Customize my extra days (private)</label>
    {p.personalBufferEnabled && <label>My extra days<input type="number" min="0" max="5" value={p.personalBufferDays} onChange={e => set({ personalBufferDays: Number(e.target.value) })} /></label>}
    <details className="more"><summary>Weekly free times for the meeting finder</summary><div className="form-stack">
      <p className="small muted">Only these entered times are used. Your calendar is not read.</p>
      {p.freeSlots.map((f, i) => <div className="slot-row" key={i}><label>Weekday<select value={f.day} onChange={e => set({ freeSlots: p.freeSlots.map((s, j) => j === i ? { ...s, day: Number(e.target.value) } : s) })}>{DAYS.map((d, j) => <option value={j} key={d}>{d}</option>)}</select></label><label>From<input type="time" value={f.from} onChange={e => set({ freeSlots: p.freeSlots.map((s, j) => j === i ? { ...s, from: e.target.value } : s) })} /></label><label>To<input type="time" value={f.to} onChange={e => set({ freeSlots: p.freeSlots.map((s, j) => j === i ? { ...s, to: e.target.value } : s) })} /></label><button type="button" className="btn small" onClick={() => set({ freeSlots: p.freeSlots.filter((_, j) => j !== i) })}>Remove slot {i + 1}</button></div>)}
      {p.freeSlots.length < 14 && <div><button type="button" className="btn" onClick={() => set({ freeSlots: [...p.freeSlots, { day: 4, from: "18:00", to: "20:00" }] })}>Add free slot</button></div>}
    </div></details>
  </div>
}
