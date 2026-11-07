import { useEffect, useRef, useState, type CSSProperties } from "react"
import { OrgChart } from "../../components/setup/OrgChart"
import { MAX_DUTIES, MAX_ROLES } from "../../data/structure"
import { onboardingCopy } from "../copy"
import { useOnboardingDraft } from "../draft"
import { useFlow } from "../engine/useFlow"
import { addRole, applyReading, bossChoices, removeRole, renameRole, roleDepth, setDuties, setPersonName, setReportsTo, validateTeam } from "./team/rows"

const c = onboardingCopy.founder.team

/**
 * Screen 4 of the founder flow (skippable): a visibly indented reporting tree with Role, Person and Reports to always in view. Duties expand
 * independently, so changing hierarchy never unexpectedly opens a long text field. The organization chart under the list follows the rows.
 */
export function Team() {
  const { draft, update } = useOnboardingDraft()
  const flow = useFlow()
  const { roles, people } = draft.club
  // What the screen started with: Skip restores it if the rows were left in a state the rest of the app would refuse.
  const start = useRef({ roles, people })
  const [error, setError] = useState("")
  const [focusId, setFocusId] = useState<string | null>(null)
  const [dutiesId, setDutiesId] = useState<string | null>(null)
  const addButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!focusId) return
    document.querySelector<HTMLInputElement>(`[data-role-input="${focusId}"]`)?.focus()
    setFocusId(null)
  }, [focusId])
  if (!flow) return null

  const edit = (fn: (club: typeof draft.club) => typeof draft.club, structure = true) => { setError(""); update(d => ({ ...d, ...(structure ? { structureTouched: true } : {}), club: fn(d.club) })) }
  const holderName = (holderId: string | null) => people.find(p => p.id === holderId)?.name ?? ""
  const reading = draft.reading

  const next = () => {
    const checked = validateTeam(draft.club)
    setError(checked.error ?? "")
    if (checked.error) return
    update(d => ({ ...d, club: { ...d.club, people: checked.people } })); flow.next()
  }
  // Back keeps valid rows (with their emails made); Skip keeps them too, or puts back what the screen started with if they are not valid.
  const back = () => { const checked = validateTeam(draft.club); if (!checked.error) update(d => ({ ...d, club: { ...d.club, people: checked.people } })); flow.back() }
  const skip = () => {
    const checked = validateTeam(draft.club)
    update(d => ({ ...d, club: checked.error ? { ...d.club, roles: start.current.roles, people: start.current.people } : { ...d.club, people: checked.people } }))
    flow.skip()
  }
  const add = () => {
    const made = addRole(roles)
    if (!made) return
    edit(club => ({ ...club, roles: made.roles })); setFocusId(made.id)
  }
  const remove = (id: string) => { edit(club => { const x = removeRole(club.roles, club.people, id); return { ...club, ...x } }); addButton.current?.focus() }
  const useSuggestions = () => {
    if (reading.status !== "ready") return
    const read = reading.read
    update(d => ({ ...d, applied: true, structureTouched: false, club: applyReading(d.club, read, d.missionTouched) })); setError("")
  }

  return <section className="ob-card ob-team" aria-labelledby="ob-team-h">
    <div className="ob-gt-head"><h1 id="ob-team-h">{c.title}</h1><p className="ob-lead">{c.invited}</p></div>
    {reading.status === "reading" && <p className="notice ai-note" role="status"><span className="spin" aria-hidden="true" />{onboardingCopy.founder.constitution.reading}</p>}
    {reading.status === "ready" && !draft.applied && <p className="notice ai-note" role="status">{c.suggested}<button type="button" className="btn small" onClick={useSuggestions}>{c.use}</button></p>}
    <div className="ob-team-head" aria-hidden="true"><span>{c.role}</span><span>{c.person}</span><span>{c.reportsTo}</span><span /></div>
    <ul className="ob-role-list" data-testid="team-rows">{roles.map((r, i) => {
      const president = r.fn === "president"
      const depth = roleDepth(roles, r.id)
      return <li key={r.id} className="ob-role">
        <div className="ob-role-title-wrap" style={{ "--ob-depth": depth } as CSSProperties}>
          {depth > 0 && <span className="ob-role-branch" aria-hidden="true">↳</span>}
          <input type="text" className="ob-role-title" data-role-input={r.id} aria-label={`${c.role} ${i + 1}`} value={r.displayName} maxLength={60}
            onChange={e => edit(club => ({ ...club, roles: renameRole(club.roles, r.id, e.target.value) }))} />
        </div>
        <input type="text" className="ob-role-person" aria-label={`${c.person} ${i + 1}`} placeholder={c.open} value={holderName(r.holderId)} maxLength={80}
          onChange={e => edit(club => ({ ...club, ...setPersonName(club.roles, club.people, r.id, e.target.value) }))} />
        {president ? <span className="ob-role-top">{c.top}</span> : <select className="ob-role-boss" aria-label={`${c.reportsTo} ${i + 1}`} value={r.reportsToId ?? ""} onChange={e => edit(club => ({ ...club, roles: setReportsTo(club.roles, r.id, e.target.value || null) }))}>
          <option value="">{c.nobody}</option>
          {bossChoices(roles, r.id).map(x => <option key={x.id} value={x.id}>{x.displayName}</option>)}
        </select>}
        {!president && <button type="button" className="btn btn-quiet ob-role-x" aria-label={`${c.remove} ${r.displayName || c.role}`} onClick={() => remove(r.id)}>✕</button>}
        <button type="button" className="btn btn-quiet ob-role-duties-toggle" aria-expanded={dutiesId === r.id} aria-controls={`ob-duties-${r.id}`} onClick={() => setDutiesId(current => current === r.id ? null : r.id)}>{c.editDuties}</button>
        {dutiesId === r.id && <label id={`ob-duties-${r.id}`} className="ob-role-duties"><span className="cap">{c.duties}</span>
          <textarea aria-label={`${c.duties} ${i + 1}`} rows={3} maxLength={MAX_DUTIES} value={r.duties ?? ""} onChange={e => edit(club => ({ ...club, roles: setDuties(club.roles, r.id, e.target.value) }), false)} />
        </label>}
      </li>
    })}</ul>
    <div><button type="button" ref={addButton} className="btn small" disabled={roles.length >= MAX_ROLES} onClick={add}>{c.add}</button></div>
    <OrgChart roles={roles} />
    {error && <p role="alert" className="ob-gt-error">{error}</p>}
    <div className="ob-gt-nav">
      <button type="button" className="btn" onClick={back}>{onboardingCopy.back}</button>
      <button type="button" className="btn btn-primary" onClick={next}>{onboardingCopy.next}</button>
      <div className="ob-gt-skip"><button type="button" className="btn btn-quiet" onClick={skip}>{onboardingCopy.skip}</button><p className="ob-gt-hint">{onboardingCopy.skipHint}</p></div>
    </div>
  </section>
}
