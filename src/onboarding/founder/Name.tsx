import { useState } from "react"
import { Info } from "../../components/ui"
import { useStore } from "../../data/store"
import { onboardingCopy } from "../copy"
import { useOnboardingDraft } from "../draft"
import { useFlow } from "../engine/useFlow"
import { MAX_MISSION, missionError } from "./name/mission"

const text = onboardingCopy.founder.name
const MAX_NAME = 80

/**
 * Screen 1 of the founder flow: the club's name and mission (both required; FB-2 moved the mission here from the old Goals screen). The school is
 * fixed. The small preview shows the name as it will appear. Continue waits for a name; a missing mission is said next to the button.
 */
export function Name() {
  const { draft, update } = useOnboardingDraft()
  const { state } = useStore()
  const flow = useFlow()
  const [error, setError] = useState("")
  const name = draft.club.name
  const mission = draft.club.mission
  const ready = name.trim().length > 0
  const school = state.org.school
  const submit = () => {
    if (!ready) return
    const problem = missionError(mission)
    setError(problem ?? "")
    if (!problem) flow?.next()
  }
  return <section className="ob-card ob-name-grid ob-name" aria-labelledby="ob-name-h">
    <form className="ob-name-main" noValidate onSubmit={event => { event.preventDefault(); submit() }}>
      <div className="ob-name-head"><h1 id="ob-name-h">{text.title}</h1><p className="ob-why"><b>Why:</b> {text.why}</p></div>
      <label className="field">{text.field}
        <input value={name} maxLength={MAX_NAME} required autoComplete="off" placeholder={text.example} onChange={event => update(d => ({ ...d, club: { ...d.club, name: event.target.value } }))} />
      </label>
      <div className="ob-name-mission">
        <label className="field">{text.mission}
          <input value={mission} maxLength={MAX_MISSION} required aria-required="true" autoComplete="off" placeholder={text.missionExample} aria-describedby="ob-mission-why"
            onChange={event => { setError(""); update(d => ({ ...d, missionTouched: true, club: { ...d.club, mission: event.target.value } })) }} />
        </label>
        <p id="ob-mission-why" className="ob-why"><b>Why:</b> {text.missionWhy}</p>
      </div>
      <p className="ob-name-school"><span className="sr-only">{text.schoolLabel}: </span><b>{school}</b><Info label={text.schoolLabel}>{text.schoolWhy}</Info></p>
      {error && <p role="alert" className="ob-name-error">{error}</p>}
      <div className="ob-actions"><button type="submit" className="btn btn-primary" disabled={!ready}>{onboardingCopy.next}</button></div>
    </form>
    <aside className="ob-name-preview" aria-hidden="true" data-testid="name-preview">
      <small>{text.preview}</small>
      <strong className={ready ? "" : "is-empty"}>{ready ? name.trim() : text.placeholder}</strong>
      <span>{school}</span>
    </aside>
  </section>
}
