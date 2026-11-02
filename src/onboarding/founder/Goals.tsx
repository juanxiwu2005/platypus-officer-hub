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

/** Screen 3 of the founder flow (skippable): switch on two or three suggested goals and set each target. Written to the draft on Continue. */
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
  // Back keeps the choices when they are valid; Skip never changes the standard goals.
  const back = () => { if (!goalsError(rows, draft.club.mission)) commit(); flow.back() }
  return <section className="ob-card ob-goals" aria-labelledby="ob-goals-h">
    <div className="ob-gt-head"><h1 id="ob-goals-h">{c.title}</h1><p className="ob-lead">{c.lead}</p></div>
    <ul className="ob-goal-list">{SUGGESTIONS.map(s => {
      const r = rows.find(x => x.id === s.id)!
      return <li key={s.id} className={`ob-goal${r.on ? " is-on" : ""}`}>
        <label className="ob-goal-name"><input type="checkbox" role="switch" className="ob-switch" checked={r.on} onChange={e => change(s.id, { on: e.target.checked })} /><span>{s.label}</span></label>
        <div className="ob-goal-set"><Stepper name={s.label} value={r.target} step={s.step} disabled={!r.on} onChange={n => change(s.id, { target: n })} /><span className="ob-gt-unit">{s.unit}</span></div>
      </li>
    })}</ul>
    <details className="ob-mission">
      <summary>{c.mission}</summary>
      <textarea aria-label={c.missionField} rows={3} maxLength={300} value={draft.club.mission} onChange={e => update(d => ({ ...d, missionTouched: true, club: { ...d.club, mission: e.target.value } }))} />
    </details>
    {error && <p role="alert" className="ob-gt-error">{error}</p>}
    <div className="ob-gt-nav">
      <button type="button" className="btn" onClick={back}>{onboardingCopy.back}</button>
      <button type="button" className="btn btn-primary" onClick={next}>{onboardingCopy.next}</button>
      <div className="ob-gt-skip"><button type="button" className="btn btn-quiet" onClick={flow.skip}>{onboardingCopy.skip}</button><p className="ob-gt-hint">{onboardingCopy.skipHint}</p></div>
    </div>
  </section>
}
