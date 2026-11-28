import { useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { dutiesOf } from "../../data/structure"
import type { Person } from "../../data/types"
import { onboardingCopy } from "../copy"
import { useFlow } from "../engine/useFlow"
import { fill, inviteProblem } from "./invitation/choice"
import { MemberStrip } from "./invitation/MemberStrip"
import { previewPatch, previewProblem } from "./invitation/profile"
import { StepFooter } from "./invitation/StepFooter"
import { usePreview, type Preview } from "./invitation/usePreview"

const c = onboardingCopy.member.invitation

/**
 * Member screen 1 of 4: the landing page of an invitation, also for a shared link (/join?invite=… comes here). Who invited you, to be what,
 * and what you get; then the name and email, filled in from the officer's record, to confirm or edit (the You screen up to ob-5).
 * A preview: the officer shown is chosen in the Demo strip.
 */
export function Invitation() {
  const [params] = useSearchParams()
  const preview = usePreview(params.get("person"))
  const { state, person, role } = preview
  const problem = inviteProblem(state.people, state.org.inviteCode, params.get("invite"), params.get("person"))
  if (problem || !person || !role) return <section className="ob-card ob-m-card" data-testid="invalid-invite">
    <h1>{onboardingCopy.invalidInvite}</h1>
    <p className="muted">{c.invalidTip}</p>
    <div className="ob-actions">
      <Link className="btn btn-primary" to="/welcome/member/invitation">{c.invalidRetry}</Link>
      <Link className="btn" to="/">{c.invalidHome}</Link>
    </div>
  </section>
  return <InvitationForm key={person.id} preview={preview} person={person} />
}

function InvitationForm({ preview, person }: { preview: Preview; person: Person }) {
  const flow = useFlow()
  const { state, role, boss, president, stored, save } = preview
  const [name, setName] = useState(stored?.name ?? person.name)
  const [email, setEmail] = useState(stored?.email ?? person.email)
  const [error, setError] = useState("")
  const edit = (next: { name?: string; email?: string }) => {
    const n = next.name ?? name, e = next.email ?? email
    setName(n); setEmail(e); setError("")
    save({ name: n, email: e === person.email ? undefined : e })
  }
  const [before, after = ""] = c.lead.split("{role}").map(part => fill(part, { president: president?.name ?? c.president }))
  return <form noValidate className="ob-m-page" onSubmit={event => {
    event.preventDefault()
    const problem = previewProblem(state.people, person, previewPatch(person, stored, { name, email }))
    if (problem) { setError(problem); return }
    save({ name: name.trim(), email: email.trim() === person.email ? undefined : email.trim() }); flow?.next()
  }}>
    <section className="ob-card ob-m-card">
      <MemberStrip preview={preview} />
      <h1>{state.org.name}</h1>
      <p className="ob-lead" data-testid="invite-line">{before}<b>{role?.displayName}</b>{after}</p>
      {role && <section className="ob-m-role" aria-label="Your role" data-testid="role-card">
        <p className="ob-m-role-name">{role.displayName}</p>
        {boss && <p className="muted">{fill(c.boss, { boss: boss.displayName })}</p>}
        <p className="ob-m-duties">{dutiesOf(role)}</p>
      </section>}
      <ul className="ob-m-gets">{c.gets.map(line => <li key={line}>{line}</li>)}</ul>
      <div className="ob-m-fields">
        <label className="field">{c.name}<input value={name} maxLength={80} autoComplete="off" aria-invalid={Boolean(error) || undefined} aria-describedby={error ? "ob-m-you-error" : undefined} onChange={e => edit({ name: e.target.value })} /></label>
        <label className="field">{c.email}<input type="email" value={email} autoComplete="off" aria-invalid={Boolean(error) || undefined} aria-describedby={error ? "ob-m-you-error" : undefined} onChange={e => edit({ email: e.target.value })} /></label>
      </div>
      {error && <p id="ob-m-you-error" role="alert" className="ob-m-error">{error}</p>}
      <p className="muted">{c.trust}</p>
    </section>
    <StepFooter label={c.cta} />
  </form>
}
