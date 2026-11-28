import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { OrgChart } from "../../components/setup/OrgChart"
import { fmtLong } from "../../lib/dates"
import { onboardingCopy } from "../copy"
import { useFlow } from "../engine/useFlow"
import { endWalkthrough, recordEvent } from "../record"
import { clearStaged, readExtra } from "./finish/extra"
import { fill } from "./invitation/choice"
import { MemberStrip } from "./invitation/MemberStrip"
import { previewPatch, previewProblem } from "./invitation/profile"
import { StepFooter } from "./invitation/StepFooter"
import { usePreview } from "./invitation/usePreview"
import { useStore } from "../../data/store"

const c = onboardingCopy.member.done

/**
 * Member screen 4 of 4 (ob-6): the one place the preview is saved. On arrival the choices made on the earlier screens are checked with the same rules as
 * Settings (validateProfile) and saved once with saveProfile; if they do not pass, nothing is saved and the screen says why.
 * Since ob-6 this is also where a shared invitation link (/join) ends, so a save the browser refuses is said too (as the classic Join page did):
 * the staged choices are kept and Try again saves them. An invitation link records nothing (gate/Redirect.tsx `outside`), so here endWalkthrough
 * only completes an attempt when the member screens were reached from Invite inside a recorded walkthrough.
 * Open my tasks ends the walkthrough and goes to Tasks. It never changes who is viewing: the person walking through is the president.
 */
export function Done() {
  const preview = usePreview()
  const { tryDispatch } = useStore()
  const flow = useFlow()
  const navigate = useNavigate()
  const { state, person, role, stored } = preview
  const saved = useRef(false)
  const [failed, setFailed] = useState(false)
  const chart = useRef<HTMLDivElement>(null)

  // What would be saved (null when nothing was staged, for example when this page is opened directly).
  const plan = useMemo(() => {
    if (!person || !stored) return null
    const extra = readExtra(person.id)
    const patch = previewPatch(person, stored, {
      busyWeeks: extra?.busyWeeks ?? person.busyWeeks, careerGoal: extra?.careerGoal ?? person.careerGoal,
      interests: extra?.interests ?? person.interests, expectations: extra?.expectations ?? person.expectations,
    })
    return { patch, problem: previewProblem(state.people, person, patch) }
  }, [person, stored, state.people])

  const save = useCallback(() => {
    if (!person || !plan || plan.problem) return
    const ok = tryDispatch({ type: "saveProfile", personId: person.id, patch: plan.patch, invite: state.org.inviteCode })
    setFailed(!ok)
    if (ok) clearStaged()
  }, [tryDispatch, person, plan, state.org.inviteCode])
  // Save once. The ref also stops React's development double-run from saving twice.
  useEffect(() => {
    if (saved.current || !person || !plan || plan.problem) return
    saved.current = true
    save()
  }, [person, plan, save])

  // The chosen officer's box in the chart appears once (opacity and scale only; see the stylesheet).
  useEffect(() => {
    if (!role) return
    const card = [...(chart.current?.querySelectorAll<HTMLElement>(".org-card") ?? [])].find(el => el.getAttribute("title") === role.displayName)
    card?.classList.add("is-joined")
    return () => card?.classList.remove("is-joined")
  }, [role])

  const first = useMemo(() => {
    if (!person) return null
    const mine = state.nodes.filter(n => n.ownerId === person.id && n.status !== "done")
    return [...mine].sort((a, b) => (a.clubDeadline ?? "9999-12-31").localeCompare(b.clubDeadline ?? "9999-12-31"))[0] ?? null
  }, [person, state.nodes])

  if (!person) return null
  const open = () => { if (flow) recordEvent(flow.current.id, "complete"); endWalkthrough("completed"); navigate("/tasks") }
  return <div className="ob-m-page">
    <section className="ob-card ob-m-card">
      <MemberStrip preview={preview} />
      <h1>{c.title}</h1>
      {plan?.problem && <p role="alert" className="ob-m-error" data-testid="save-problem">{fill(c.saveFailed, { problem: plan.problem })}</p>}
      {failed && <p role="alert" className="ob-m-error" data-testid="save-refused">{c.storageFailed} <button type="button" className="btn small" onClick={save}>{c.retry}</button></p>}
      <div ref={chart} className="ob-m-chart" data-testid="join-chart"><OrgChart roles={state.roles} /></div>
      <div className="ob-m-first" data-testid="first-task">
        <h2 className="ob-m-first-h">{c.first}</h2>
        {first
          ? <article className="ob-m-task"><p className="ob-m-task-title">{first.title}</p>{first.clubDeadline && <p className="small muted">{c.due} <time dateTime={first.clubDeadline} data-date={first.clubDeadline}>{fmtLong(first.clubDeadline)}</time></p>}</article>
          : <article className="ob-m-task"><p>{c.empty}</p><p className="small muted">{c.emptyPreview}</p></article>}
      </div>
    </section>
    <StepFooter onBack={plan?.problem ? () => { flow?.back() } : undefined} onNext={open} label={c.cta} />
  </div>
}
