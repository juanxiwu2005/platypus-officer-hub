import { Link, useSearchParams } from "react-router-dom"
import { dutiesOf } from "../../data/structure"
import { onboardingCopy } from "../copy"
import { useFlow } from "../engine/useFlow"
import { fill, inviteProblem } from "./invitation/choice"
import { MemberStrip } from "./invitation/MemberStrip"
import { StepFooter } from "./invitation/StepFooter"
import { usePreview } from "./invitation/usePreview"

const c = onboardingCopy.member.invitation

/** Member screen 0: the landing page of an invitation. Who invited you, to be what, and what you get. A preview: the officer shown is chosen in the Demo strip. */
export function Invitation() {
  const [params] = useSearchParams()
  const flow = useFlow()
  const preview = usePreview(params.get("person"))
  const { state, person, role, boss, president } = preview
  const problem = inviteProblem(state.people, state.org.inviteCode, params.get("invite"), params.get("person"))
  if (problem || !person || !role) return <section className="ob-card ob-m-card" data-testid="invalid-invite">
    <h1>{onboardingCopy.invalidInvite}</h1>
    <p className="muted">{c.invalidTip}</p>
    <div className="ob-actions">
      <Link className="btn btn-primary" to="/welcome/member/invitation">{c.invalidRetry}</Link>
      <Link className="btn" to="/">{c.invalidHome}</Link>
    </div>
  </section>
  const [before, after = ""] = c.lead.split("{role}").map(part => fill(part, { president: president?.name ?? c.president }))
  return <div className="ob-m-page">
    <section className="ob-card ob-m-card">
      <MemberStrip preview={preview} />
      <h1>{state.org.name}</h1>
      <p className="ob-lead" data-testid="invite-line">{before}<b>{role.displayName}</b>{after}</p>
      <section className="ob-m-role" aria-label="Your role" data-testid="role-card">
        <p className="ob-m-role-name">{role.displayName}</p>
        {boss && <p className="muted">{fill(c.boss, { boss: boss.displayName })}</p>}
        <p className="ob-m-duties">{dutiesOf(role)}</p>
      </section>
      <ul className="ob-m-gets">{c.gets.map(line => <li key={line}>{line}</li>)}</ul>
      <p className="muted">{c.trust}</p>
    </section>
    <StepFooter label={c.cta} onNext={() => { preview.save(); flow?.next() }} />
  </div>
}
