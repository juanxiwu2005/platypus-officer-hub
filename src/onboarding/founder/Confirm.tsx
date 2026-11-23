import { useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { validateClub } from "../../data/settings"
import { fillEmails } from "../../data/structure"
import { useStore } from "../../data/store"
import { validDate } from "../../lib/commands"
import { onboardingCopy } from "../copy"
import { useOnboardingDraft } from "../draft"
import { useFlow } from "../engine/useFlow"
import { recordSetup } from "../record"
import { summaryLine } from "./confirm/summary"

const c = onboardingCopy.founder.confirm
const FIRST_EVENT = "founder.first-event"

/**
 * Screen 6 of 7 in the founder flow (required): one sentence says what will be created, then Start workspace creates it through the shared completeSetup action. The warning about replacing the demo only shows when a club was already set up. A ref stops a double click (or React's
 * development double-run) from creating it twice. Keep current demo leaves every piece of data as it is.
 * When the president pressed Skip for now on First event, the club starts with no new event (completeSetup gets a null event and an empty date).
 * Arriving here without planning and without skipping (an address typed by hand) still asks for the first event.
 * Since ob-5 (S2) the walkthrough no longer asks how reminders go out: completeSetup gets no reminder choice and the club starts with the default.
 */
export function Confirm() {
  const { state, tryDispatch } = useStore()
  const { draft, clear } = useOnboardingDraft()
  const flow = useFlow()
  const navigate = useNavigate()
  const started = useRef(false)
  const [problem, setProblem] = useState("")
  const noEvent = !draft.event && draft.skipped.includes(FIRST_EVENT)
  const planned = !!draft.event && validDate(draft.date) && draft.date >= state.today
  const ready = planned || noEvent
  // What Start passes on: the planned event and its date, or (after Skip for now) no event and no date.
  const event = noEvent ? null : draft.event, date = noEvent ? "" : draft.date
  const replaces = state.org.setupCompletedOn !== null
  if (!flow) return null

  const start = () => {
    if (started.current) return
    if (!ready) { setProblem(c.missing); return }
    const error = validateClub(draft.club)
    if (error) { setProblem(error); return }
    started.current = true
    if (!tryDispatch({ type: "completeSetup", draft: { ...draft.club, people: fillEmails(draft.club.people) }, event, date, inviteCode: draft.inviteCode, clubBufferBusinessDays: draft.buffer, workflow: draft.steps, workflowBranches: draft.workflowBranches })) { started.current = false; setProblem("Your club could not be saved. Export your current data and retry before leaving this page."); return }
    recordSetup("start-workspace")
    clear()
    navigate("/welcome/founder/invite")
  }

  return <section className="ob-card ob-c9" aria-labelledby="ob-c9-h">
    <h1 id="ob-c9-h">{c.title}</h1>
    {ready
      ? <p className="ob-lead" data-testid="confirm-summary">{summaryLine(draft.club, planned && event ? event.name : null, date)}</p>
      : <p className="ob-lead">{c.missing}</p>}
    {noEvent && <p className="small muted" data-testid="confirm-no-event">{c.noEvent}</p>}
    {ready && replaces && <p className="ob-c9-warn" data-testid="replace-warning">{c.replaceWarning}</p>}
    {problem && <p role="alert" className="ob-c9-error">{problem}</p>}
    <div className="ob-actions">
      {ready
        ? <button type="button" className="btn btn-primary" onClick={start}>{c.start}</button>
        : <button type="button" className="btn btn-primary" onClick={() => navigate("/welcome/founder/first-event")}>{c.backToEvent}</button>}
      <button type="button" className="btn" onClick={() => { recordSetup("keep-demo"); flow.exit() }}>{c.keep}</button>
    </div>
    <div className="ob-actions"><button type="button" className="btn small" onClick={() => flow.back()}>{onboardingCopy.back}</button></div>
  </section>
}
