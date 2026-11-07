import { Info } from "../../components/ui"
import { useStore } from "../../data/store"
import { onboardingCopy } from "../copy"
import { useOnboardingDraft } from "../draft"
import { useFlow } from "../engine/useFlow"

const text = onboardingCopy.founder.name
const MAX_NAME = 80

/** Screen 1 of the founder flow: the club's name (required). The school is fixed. The small preview shows the name as it will appear. */
export function Name() {
  const { draft, update } = useOnboardingDraft()
  const { state } = useStore()
  const flow = useFlow()
  const name = draft.club.name
  const ready = name.trim().length > 0
  const school = state.org.school
  return <section className="ob-card ob-name-grid ob-name" aria-labelledby="ob-name-h">
    <form className="ob-name-main" onSubmit={event => { event.preventDefault(); if (ready) flow?.next() }}>
      <h1 id="ob-name-h">{text.title}</h1>
      <label className="field">{text.field}
        <input value={name} maxLength={MAX_NAME} required autoComplete="off" onChange={event => update(d => ({ ...d, club: { ...d.club, name: event.target.value } }))} />
      </label>
      <p className="ob-name-school"><span className="sr-only">{text.schoolLabel}: </span><b>{school}</b><Info label={text.schoolLabel}>{text.schoolWhy}</Info></p>
      <div className="ob-actions"><button type="submit" className="btn btn-primary" disabled={!ready}>{onboardingCopy.next}</button></div>
    </form>
    <aside className="ob-name-preview" aria-hidden="true" data-testid="name-preview">
      <small>{text.preview}</small>
      <strong className={ready ? "" : "is-empty"}>{ready ? name.trim() : text.placeholder}</strong>
      <span>{school}</span>
    </aside>
  </section>
}
