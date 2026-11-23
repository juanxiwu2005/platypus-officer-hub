import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react"
import { OrgChart } from "../../components/setup/OrgChart"
import { MAX_DUTIES, MAX_ROLES } from "../../data/structure"
import { useStore } from "../../data/store"
import { onboardingCopy } from "../copy"
import { useOnboardingDraft } from "../draft"
import { useFlow } from "../engine/useFlow"
import { recordSetup } from "../record"
import { ConstitutionImport } from "./Constitution"
import { finishSetup } from "./team/finish"
import { addRole, applyReading, bossChoices, removeRole, renameRole, roleDepth, setDuties, setPersonName, setReportsTo, validateTeam } from "./team/rows"

const c = onboardingCopy.founder.team

/**
 * A role title that wraps instead of being cut off ("Executive Vice Pr…" on a phone): a one-line text box that grows to fit its words, follows the
 * width it is given, and never takes a line break (Enter does nothing, pasted line breaks become spaces).
 */
function RoleTitle({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (title: string) => void }) {
  const box = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const fit = () => { el.style.height = "auto"; el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px` }
    fit()
    if (typeof ResizeObserver === "undefined" || !el.parentElement) return
    let width = el.parentElement.clientWidth
    const watch = new ResizeObserver(() => { const w = el.parentElement?.clientWidth ?? width; if (w !== width) { width = w; fit() } })
    watch.observe(el.parentElement)
    return () => watch.disconnect()
  }, [value])
  return <textarea ref={box} rows={1} className="ob-role-title" data-role-input={id} aria-label={label} value={value} maxLength={60}
    onKeyDown={e => { if (e.key === "Enter") e.preventDefault() }} onChange={e => onChange(e.target.value.replace(/[\r\n]+/g, " "))} />
}

/**
 * Screen 2 of 3 in the founder flow (ob-6, S6): a visibly indented reporting tree with Role, Person and Reports to always in view. Duties expand
 * independently, so changing hierarchy never unexpectedly opens a long text field. The organization chart under the list follows the rows.
 * "Import roles from your constitution" opens the constitution reading inline (it was its own screen up to ob-5).
 * Start workspace finishes setup, as Confirm's button did up to ob-5: the same completeSetup action and the same research record
 * (setupChoice "start-workspace"), then Invite. A ref stops a double click (or React's development double-run) from creating the club twice.
 * Only when a club was already set up in this browser does the screen warn that it will be replaced and offer Keep current demo.
 */
export function Team() {
  const { state, tryDispatch } = useStore()
  const { draft, update, clear } = useOnboardingDraft()
  const flow = useFlow()
  const { roles, people } = draft.club
  const [error, setError] = useState("")
  const [importing, setImporting] = useState(() => !!draft.doc)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [dutiesId, setDutiesId] = useState<string | null>(null)
  const addButton = useRef<HTMLButtonElement>(null)
  const started = useRef(false)
  useEffect(() => {
    if (!focusId) return
    document.querySelector<HTMLElement>(`[data-role-input="${focusId}"]`)?.focus()
    setFocusId(null)
  }, [focusId])
  if (!flow) return null

  const edit = (fn: (club: typeof draft.club) => typeof draft.club, structure = true) => { setError(""); update(d => ({ ...d, ...(structure ? { structureTouched: true } : {}), club: fn(d.club) })) }
  const holderName = (holderId: string | null) => people.find(p => p.id === holderId)?.name ?? ""
  const reading = draft.reading
  const replaces = state.org.setupCompletedOn !== null

  const start = () => {
    if (started.current) return
    const checked = validateTeam(draft.club)
    if (checked.error) { setError(checked.error); return }
    const plan = finishSetup(draft, checked, state.today)
    if (!plan.ok) { setError(plan.problem); return }
    started.current = true
    if (!tryDispatch({ type: "completeSetup", draft: plan.club, event: plan.event, date: plan.date, inviteCode: draft.inviteCode, clubBufferBusinessDays: draft.buffer, workflow: draft.steps, workflowBranches: draft.workflowBranches })) { started.current = false; setError(c.saveFailed); return }
    recordSetup("start-workspace")
    flow.next()
    clear()
  }
  // Back keeps valid rows (with their emails made).
  const back = () => { const checked = validateTeam(draft.club); if (!checked.error) update(d => ({ ...d, club: { ...d.club, people: checked.people } })); flow.back() }
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
    <div className="ob-team-import">
      <button type="button" className="btn btn-quiet small" aria-expanded={importing} aria-controls="ob-const-import" onClick={() => setImporting(open => !open)}>{onboardingCopy.founder.constitution.open}</button>
      {importing && <ConstitutionImport id="ob-const-import" />}
    </div>
    {!importing && reading.status === "reading" && <p className="notice ai-note" role="status"><span className="spin" aria-hidden="true" />{onboardingCopy.founder.constitution.reading}</p>}
    {reading.status === "ready" && !draft.applied && <p className="notice ai-note" role="status">{c.suggested}<button type="button" className="btn small" onClick={useSuggestions}>{c.use}</button></p>}
    <div className="ob-team-head" aria-hidden="true"><span>{c.role}</span><span>{c.person}</span><span>{c.reportsTo}</span><span /></div>
    <ul className="ob-role-list" data-testid="team-rows">{roles.map((r, i) => {
      const president = r.fn === "president"
      const depth = roleDepth(roles, r.id)
      return <li key={r.id} className="ob-role">
        <div className="ob-role-title-wrap" style={{ "--ob-depth": depth } as CSSProperties}>
          {depth > 0 && <span className="ob-role-branch" aria-hidden="true">↳</span>}
          <RoleTitle id={r.id} label={`${c.role} ${i + 1}`} value={r.displayName} onChange={title => edit(club => ({ ...club, roles: renameRole(club.roles, r.id, title) }))} />
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
    {replaces && <p className="ob-c9-warn" data-testid="replace-warning">{c.replaceWarning}</p>}
    {error && <p role="alert" className="ob-gt-error">{error}</p>}
    <div className="ob-gt-nav">
      <button type="button" className="btn" onClick={back}>{onboardingCopy.back}</button>
      <button type="button" className="btn btn-primary" onClick={start}>{c.start}</button>
      {replaces && <div className="ob-gt-skip"><button type="button" className="btn btn-quiet" onClick={() => { recordSetup("keep-demo"); flow.exit() }}>{c.keep}</button></div>}
    </div>
  </section>
}
