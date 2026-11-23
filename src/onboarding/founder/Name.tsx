import { Info } from "../../components/ui"
import { useStore } from "../../data/store"
import { onboardingCopy } from "../copy"
import { useOnboardingDraft } from "../draft"
import { useFlow } from "../engine/useFlow"
import { FirstEventPlan, useFirstEventPlanner } from "./FirstEvent"

const text = onboardingCopy.founder.name
const MAX_NAME = 80

/**
 * Screen 1 of 3 in the founder flow (ob-6, S6): the club's name (required; the school is fixed), then the first event (FirstEvent.tsx), so the
 * first useful workflow appears on the first screen. Continue needs the name and a current plan. Skip for now skips the event only: the name is
 * still needed, the planned event is dropped and the step records "skip" (firstEventChoice in src/lib/onboardingRecord.ts reads it).
 */
export function Name() {
  const { draft, update } = useOnboardingDraft()
  const { state } = useStore()
  const flow = useFlow()
  const planner = useFirstEventPlanner()
  const name = draft.club.name
  const named = name.trim().length > 0
  const school = state.org.school
  const skip = () => { if (!named) return; planner.drop(); flow?.skip() }
  return <section className="ob-card ob-name" aria-labelledby="ob-name-h">
    <form className="ob-name-main" onSubmit={event => { event.preventDefault(); if (named && planner.ready) flow?.next() }}>
      <h1 id="ob-name-h">{text.title}</h1>
      <label className="field">{text.field}
        <input value={name} maxLength={MAX_NAME} required autoComplete="off" placeholder={text.example} onChange={event => update(d => ({ ...d, club: { ...d.club, name: event.target.value } }))} />
      </label>
      <p className="ob-name-school"><span className="sr-only">{text.schoolLabel}: </span><b>{school}</b><Info label={text.schoolLabel}>{text.schoolWhy}</Info></p>
    </form>
    <FirstEventPlan planner={planner} />
    <div className="ob-gt-nav">
      <button type="button" className="btn btn-primary" disabled={!named || !planner.ready} onClick={() => flow?.next()}>{onboardingCopy.next}</button>
      <div className="ob-gt-skip"><button type="button" className="btn btn-quiet" disabled={!named} onClick={skip}>{onboardingCopy.skip}</button></div>
    </div>
  </section>
}
