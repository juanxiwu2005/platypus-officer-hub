import { useMemo, useState } from "react"
import type { Person } from "../../data/types"
import { fmtShort } from "../../lib/dates"
import { onboardingCopy } from "../copy"
import { useFlow } from "../engine/useFlow"
import { MAX_BUSY_WEEKS, readExtra, writeExtra } from "./finish/extra"
import { monthName, weeksFrom, type Week, type WeekKind } from "./finish/weeks"
import { fill } from "./invitation/choice"
import { StepFooter } from "./invitation/StepFooter"
import { usePreview, type Preview } from "./invitation/usePreview"

const c = onboardingCopy.member.busyWeeks
const KIND_TEXT: Record<Exclude<WeekKind, null>, string> = { finals: c.finals, break: c.brk, between: c.between, holiday: c.holiday }

/** Member screen 3 of 4 (can be skipped): a strip of the coming weeks. Tap the ones that are busy. Finals, breaks and holidays are already marked. */
export function BusyWeeks() {
  const preview = usePreview()
  if (!preview.person) return null
  return <BusyForm key={preview.person.id} preview={preview} person={preview.person} />
}

function BusyForm({ preview, person }: { preview: Preview; person: Person }) {
  const flow = useFlow()
  const [busy, setBusy] = useState<string[]>(() => readExtra(person.id)?.busyWeeks ?? person.busyWeeks)
  const weeks = useMemo(() => weeksFrom(preview.state.today), [preview.state.today])
  const months = useMemo(() => {
    const groups: { name: string; weeks: Week[] }[] = []
    for (const w of weeks) {
      const name = monthName(w.monday), last = groups[groups.length - 1]
      if (last?.name === name) last.weeks.push(w); else groups.push({ name, weeks: [w] })
    }
    return groups
  }, [weeks])
  const full = busy.length >= MAX_BUSY_WEEKS
  const toggle = (monday: string) => {
    const next = busy.includes(monday) ? busy.filter(d => d !== monday) : full ? busy : [...busy, monday].sort()
    setBusy(next); writeExtra(person.id, { busyWeeks: next })
  }
  const label = (w: Week, on: boolean) => [fill(c.weekOf, { date: fmtShort(w.monday) }), w.kind ? `${KIND_TEXT[w.kind]}, ${c.autoAvoided}` : null, on ? c.busy : null].filter(Boolean).join(", ")
  return <div className="ob-m-page">
    <section className="ob-card ob-m-card">
      <h1 id="ob-m-weeks-title">{c.title}</h1>
      <p className="muted">{c.effect}</p>
      <div className="ob-m-weeks" role="group" aria-label={c.group} data-testid="week-strip">
        {months.map(m => <div className="ob-m-month" key={m.weeks[0].monday}>
          <span className="ob-m-month-name" aria-hidden="true">{m.name}</span>
          <div className="ob-m-cells">
            {m.weeks.map(w => {
              const on = busy.includes(w.monday)
              return <button key={w.monday} type="button" className={`ob-m-week${w.kind ? ` is-${w.kind}` : ""}`} aria-pressed={on} aria-label={label(w, on)}
                title={fill(c.weekOf, { date: fmtShort(w.monday) })} data-week={w.monday} data-kind={w.kind ?? "plain"} disabled={full && !on} onClick={() => toggle(w.monday)}>
                <span aria-hidden="true">{on ? "✓" : ""}</span>
              </button>
            })}
          </div>
        </div>)}
      </div>
      <p className="small muted ob-m-legend">{c.legend}</p>
      <p className="small muted" aria-live="polite" data-testid="week-count">{busy.length ? fill(c.count, { n: String(busy.length) }) : ""}{full ? ` ${c.limit}` : ""}</p>
      <p><button type="button" className="btn" onClick={() => { writeExtra(person.id, { busyWeeks: undefined }); flow?.skip() }}>{c.skip}</button></p>
    </section>
    <StepFooter onBack={() => { flow?.back() }} onNext={() => { writeExtra(person.id, { busyWeeks: busy }); flow?.next() }} />
  </div>
}
