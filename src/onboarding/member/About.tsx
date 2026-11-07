import { useState } from "react"
import type { Person } from "../../data/types"
import { onboardingCopy } from "../copy"
import { useFlow } from "../engine/useFlow"
import { MAX_NOTE, readExtra, writeExtra } from "./finish/extra"
import { StepFooter } from "./invitation/StepFooter"
import { usePreview, type Preview } from "./invitation/usePreview"

const c = onboardingCopy.member.about
type Key = "careerGoal" | "interests" | "expectations"
const QUESTIONS: { key: Key; label: string; tags: readonly string[] }[] = [
  { key: "careerGoal", label: c.goal, tags: c.goalTags }, { key: "interests", label: c.interests, tags: c.interestTags }, { key: "expectations", label: c.expectations, tags: c.expectationTags },
]

/** Member screen 4 (can be skipped): three short questions on one screen. A suggestion chip adds its word; typing works too (up to 500 characters). */
export function About() {
  const preview = usePreview()
  if (!preview.person) return null
  return <AboutForm key={preview.person.id} preview={preview} person={preview.person} />
}

function AboutForm({ person }: { preview: Preview; person: Person }) {
  const flow = useFlow()
  const [values, setValues] = useState<Record<Key, string>>(() => { const x = readExtra(person.id); return { careerGoal: x?.careerGoal ?? person.careerGoal, interests: x?.interests ?? person.interests, expectations: x?.expectations ?? person.expectations } })
  const tooLong = QUESTIONS.some(q => values[q.key].length > MAX_NOTE)
  const set = (key: Key, value: string) => {
    setValues(v => ({ ...v, [key]: value }))
    // Only a value that fits is remembered; a too-long one waits for the visitor to shorten it.
    if (value.length <= MAX_NOTE) writeExtra(person.id, { [key]: value })
  }
  const add = (key: Key, tag: string) => {
    const now = values[key].trim()
    if (now.toLowerCase().split(/[,;]\s*/).includes(tag.toLowerCase())) return
    set(key, now ? `${now}, ${tag}` : tag)
  }
  return <form noValidate className="ob-m-page" onSubmit={event => {
    event.preventDefault()
    if (tooLong) return
    writeExtra(person.id, values); flow?.next()
  }}>
    <section className="ob-card ob-m-card">
      <h1>{c.title}</h1>
      <p className="muted">{c.why}</p>
      {QUESTIONS.map(q => <div className="ob-m-ask" key={q.key}>
        <label className="field" htmlFor={`ob-m-${q.key}`}>{q.label}</label>
        <textarea id={`ob-m-${q.key}`} rows={2} value={values[q.key]} aria-invalid={values[q.key].length > MAX_NOTE || undefined} aria-describedby={values[q.key].length > MAX_NOTE ? "ob-m-about-error" : undefined} onChange={e => set(q.key, e.target.value)} />
        <div className="ob-m-chips" role="group" aria-label={`${q.label} suggestions`}>
          {q.tags.map(t => <button key={t} type="button" className="ob-m-chip" onClick={() => add(q.key, t)}>{t}</button>)}
        </div>
      </div>)}
      {tooLong && <p id="ob-m-about-error" role="alert" className="ob-m-error">{c.tooLong}</p>}
      <p className="ob-m-skip"><button type="button" className="btn" onClick={() => { writeExtra(person.id, { careerGoal: undefined, interests: undefined, expectations: undefined }); flow?.skip() }}>{onboardingCopy.skip}</button> <span className="small muted">{onboardingCopy.skipHint}</span></p>
    </section>
    <StepFooter onBack={() => { flow?.back() }} />
  </form>
}
