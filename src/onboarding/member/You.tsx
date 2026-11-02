import { useState } from "react"
import { onboardingCopy } from "../copy"
import { useFlow } from "../engine/useFlow"
import { MemberStrip } from "./invitation/MemberStrip"
import { previewPatch, previewProblem } from "./invitation/profile"
import { StepFooter } from "./invitation/StepFooter"
import type { Person } from "../../data/types"
import { usePreview, type Preview } from "./invitation/usePreview"

const c = onboardingCopy.member.you

/** Member screen 1: the name and email are filled in from the officer's record; the visitor only confirms them, or edits. */
export function You() {
  const preview = usePreview()
  if (!preview.person) return null
  return <YouForm key={preview.person.id} preview={preview} person={preview.person} />
}

function YouForm({ preview, person }: { preview: Preview; person: Person }) {
  const flow = useFlow()
  const { state, stored, save, setPicking } = preview
  const [name, setName] = useState(stored?.name ?? person.name)
  const [email, setEmail] = useState(stored?.email ?? person.email)
  const [error, setError] = useState("")
  const edit = (next: { name?: string; email?: string }) => {
    const n = next.name ?? name, e = next.email ?? email
    setName(n); setEmail(e); setError("")
    save({ name: n, email: e === person.email ? undefined : e })
  }
  return <form noValidate className="ob-m-page" onSubmit={event => {
    event.preventDefault()
    const problem = previewProblem(state.people, person, previewPatch(person, stored, { name, email }))
    if (problem) { setError(problem); return }
    save({ name: name.trim(), email: email.trim() === person.email ? undefined : email.trim() }); flow?.next()
  }}>
    <section className="ob-card ob-m-card">
      <MemberStrip preview={preview} note />
      <h1>{c.title}</h1>
      <div className="ob-m-fields">
        <label className="field">{c.name}<input value={name} maxLength={80} autoComplete="off" aria-invalid={Boolean(error) || undefined} aria-describedby={error ? "ob-m-you-error" : undefined} onChange={e => edit({ name: e.target.value })} /></label>
        <label className="field">{c.email}<input type="email" value={email} autoComplete="off" aria-invalid={Boolean(error) || undefined} aria-describedby={error ? "ob-m-you-error" : undefined} onChange={e => edit({ email: e.target.value })} /></label>
      </div>
      {error && <p id="ob-m-you-error" role="alert" className="ob-m-error">{error}</p>}
      <p className="muted"><button type="button" className="link" onClick={() => setPicking(true)}>{c.notYou}</button></p>
    </section>
    <StepFooter onBack={() => { flow?.back() }} />
  </form>
}
