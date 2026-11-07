import { useState } from "react"
import { onboardingCopy } from "../copy"
import { useOnboardingDraft } from "../draft"
import { useFlow } from "../engine/useFlow"
import { MAX_TARGET, MIN_TARGET, SUGGESTIONS, clampTarget, goalsError, goalsFrom, rowsFrom, type GoalRow } from "./goals/suggestions"

const c = onboardingCopy.founder.goals

/** A number with - and + buttons, 44px tall. Typing works too; an empty box falls back to the last number when you leave it. */
function Stepper({ name, value, step, disabled, onChange }: { name: string; value: number; step: number; disabled: boolean; onChange: (n: number) => void }) {
  const [text, setText] = useState<string | null>(null)
  return <div className="ob-stepper" role="group" aria-label={`${name} ${c.target}`}>
    <button type="button" className="btn ob-step-btn" aria-label={`${c.decrease} ${name}`} disabled={disabled || value <= MIN_TARGET} onClick={() => onChange(clampTarget(value - step))}>−</button>
    <input type="number" inputMode="numeric" min={MIN_TARGET} max={MAX_TARGET} aria-label={`${name} ${c.target}`} disabled={disabled} value={text ?? String(value)}
      onChange={e => { setText(e.target.value); if (e.target.value !== "" && Number.isFinite(Number(e.target.value))) onChange(Math.round(Number(e.target.value))) }}
      onBlur={() => setText(null)} />
    <button type="button" className="btn ob-step-btn" aria-label={`${c.increase} ${name}`} disabled={disabled || value >= MAX_TARGET} onClick={() => onChange(clampTarget(value + step))}>+</button>
  </div>
}

/** Screen 3 of the founder flow: optional, editable goals plus a required club mission. */
export function Goals() {
  const { draft, update } = useOnboardingDraft()
  const flow = useFlow()
  const [rows, setRows] = useState<GoalRow[]>(() => rowsFrom(draft.club.goals))
  const [error, setError] = useState("")
  if (!flow) return null
  const change = (id: string, patch: Partial<GoalRow>) => { setError(""); setRows(rs => rs.map(r => r.id === id ? { ...r, ...patch } : r)) }
  const commit = () => update(d => ({ ...d, club: { ...d.club, goals: goalsFrom(rows) } }))
  const next = () => {
    const problem = goalsError(rows, draft.club.mission)
    setError(problem ?? "")
    if (problem) return
    commit(); flow.next()
  }
  // Back keeps valid choices. Skip means no goals yet, but does not bypass the required mission.
  const back = () => { if (!goalsError(rows, draft.club.mission)) commit(); flow.back() }
  const skip = () => {
    const noGoals = rows.map(r => ({ ...r, on: false }))
    const problem = goalsError(noGoals, draft.club.mission)
    setError(problem ?? "")
    if (problem) return
    update(d => ({ ...d, club: { ...d.club, goals: [] } })); flow.skip()
  }
  return <section className="ob-card ob-goals" aria-labelledby="ob-goals-h">
    <div className="ob-gt-head"><h1 id="ob-goals-h">{c.title}</h1><p className="ob-lead">{c.lead}</p></div>
    <ul className="ob-goal-list">{SUGGESTIONS.map((s, index) => {
      const r = rows.find(x => x.id === s.id)!
      const name = r.label || `Goal ${index + 1}`
      return <li key={s.id} className={`ob-goal${r.on ? " is-on" : ""}`}>
        <div className="ob-goal-name">
          <label><input type="checkbox" role="switch" className="ob-switch" aria-label={name} checked={r.on} onChange={e => change(s.id, { on: e.target.checked })} /></label>
          <input type="text" aria-label={`${name} ${c.goalName}`} maxLength={100} disabled={!r.on} value={r.label} onChange={e => change(s.id, { label: e.target.value })} />
        </div>
        <div className="ob-goal-set"><Stepper name={name} value={r.target} step={r.step} disabled={!r.on} onChange={n => change(s.id, { target: n })} /><label className="ob-gt-unit"><span className="sr-only">{`${name} ${c.unit}`}</span><input type="text" maxLength={20} disabled={!r.on} value={r.unit} onChange={e => change(s.id, { unit: e.target.value })} /></label></div>
      </li>
    })}</ul>
    <label className="ob-mission"><span>{c.mission} <span aria-hidden="true">*</span></span><textarea aria-label={c.missionField} aria-required="true" required rows={3} maxLength={300} value={draft.club.mission} onChange={e => update(d => ({ ...d, missionTouched: true, club: { ...d.club, mission: e.target.value } }))} /></label>
    {error && <p role="alert" className="ob-gt-error">{error}</p>}
    <div className="ob-gt-nav">
      <button type="button" className="btn" onClick={back}>{onboardingCopy.back}</button>
      <button type="button" className="btn btn-primary" onClick={next}>{onboardingCopy.next}</button>
      <div className="ob-gt-skip"><button type="button" className="btn btn-quiet" onClick={skip}>{onboardingCopy.skip}</button><p className="ob-gt-hint">{onboardingCopy.skipHint}</p></div>
    </div>
  </section>
}
