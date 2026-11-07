import { useEffect, useMemo, useRef, useState } from "react"
import { BUFFER_CHOICES, type FirstEvent as FirstEventFields } from "../../data/settings"
import { useStore } from "../../data/store"
import { prefersReducedMotion } from "../../lib/motion"
import { onboardingCopy } from "../copy"
import { useOnboardingDraft } from "../draft"
import { useFlow } from "../engine/useFlow"
import { bufferExample } from "./firstEvent/bufferExample"
import { fmtLong } from "../../lib/dates"
import { EventChain } from "./firstEvent/EventChain"
import { chainDots, prepareEvent, previewFor } from "./firstEvent/plan"

const c = onboardingCopy.founder.firstEvent
const TYPES: FirstEventFields["type"][] = ["social", "speaker", "workshop", "meeting", "fundraiser", "offcampus"]
const FUNDING: { value: FirstEventFields["funding"]; label: string }[] = [{ value: "none", label: "None" }, { value: "usg", label: "USG" }, { value: "college", label: "College" }, { value: "dues", label: "Dues" }, { value: "sponsor", label: "Sponsor" }]
const FOOD: { value: FirstEventFields["food"]; label: string }[] = [{ value: "none", label: "None" }, { value: "dining", label: "Sun Devil Dining" }, { value: "offsite", label: "Outside caterer" }, { value: "onsite", label: "Prepared on site" }, { value: "tbd", label: "Yes, decide how later" }]
const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

/**
 * Screen 5, the witness moment: one sentence becomes the first event, and its progress chain draws itself with dates from the rule engine.
 * Everything lives in the shared draft (event, date, source, buffer), so Back/Continue and a reload keep it. The chain plays once per press of
 * Plan it; turning the buffer or editing a field only changes the dates and never replays it. The screen is optional (Phase 3): Skip for now clears
 * the planned event and goes to Confirm, which then starts the club with no event. Plan it and Skip for now are equally one press; neither is chosen for the president.
 */
export function FirstEvent() {
  const { state } = useStore()
  const { draft, patch } = useOnboardingDraft()
  const flow = useFlow()
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState("")
  const [stale, setStale] = useState(false)          // the sentence changed after the last plan
  const [play, setPlay] = useState(0)                // a new number remounts the chain, which restarts the drawing
  const [drawing, setDrawing] = useState<number | null>(null)
  const [open, setOpen] = useState(false)
  const request = useRef(0)
  const played = useRef(0)
  useEffect(() => () => { request.current = -1 }, [])   // an answer that arrives after leaving the screen is dropped

  const { event, date, buffer } = draft
  const example = useMemo(() => bufferExample(state.today, buffer), [state.today, buffer])
  const preview = useMemo(() => previewFor(state, draft.club, event, date, draft.inviteCode, draft.steps, buffer), [state, draft.club, event, date, draft.inviteCode, draft.steps, buffer])
  const dots = useMemo(() => chainDots(preview), [preview])
  const needsDate = !!event && !preview
  useEffect(() => { if (needsDate) setOpen(true) }, [needsDate])

  async function plan() {
    const sentence = draft.sentence.trim()
    if (!sentence) return
    const id = ++request.current
    setBusy(true); setNotice("")
    const result = await prepareEvent(state, draft.club, sentence)
    if (id !== request.current) return           // a newer press (or leaving the screen) owns the answer
    setBusy(false)
    if (!result.ok) { setNotice(result.notice); return }
    patch({ event: result.event, date: result.date, source: result.source, confirmed: false })
    setStale(false)
    const n = ++played.current
    setPlay(n); setDrawing(prefersReducedMotion() ? null : n)
  }
  const edit = (sentence: string) => { patch({ sentence }); setStale(true) }
  const eventPatch = (next: Partial<FirstEventFields>) => { if (event) patch({ event: { ...event, ...next }, confirmed: false }) }
  // Skip for now: no first event. The sentence stays, so Back from Confirm and Plan it brings the plan back in one press. A plan still on its way is dropped.
  const skip = () => { request.current++; setBusy(false); patch({ event: null, date: "", source: "", confirmed: false }); flow?.skip() }

  return <section className="ob-card ob6" data-testid="first-event">
    <h1>{c.title}</h1>
    <textarea className="ob6-sentence" aria-label={c.sentenceLabel} placeholder={c.sentenceExample} maxLength={1000} rows={3} value={draft.sentence} onChange={e => edit(e.target.value)} />
    <div className="ob6-examples" role="group" aria-label={c.examplesLabel}>
      {c.examples.map(x => <button key={x.label} type="button" className="chip" onClick={() => edit(x.sentence)}>{x.label}</button>)}
    </div>
    <div className="ob-actions">
      <button type="button" className="btn btn-primary" disabled={!draft.sentence.trim()} onClick={() => void plan()}>{busy ? c.planning : c.cta}</button>
    </div>
    <p className="small muted ob6-note" role="status">{notice || (stale && preview ? c.stale : "")}</p>

    {needsDate && <p className="ob6-warn" role="alert">{c.dateError}</p>}
    {preview && event && <>
      <EventChain key={play} dots={dots} today={state.today} drawing={drawing === play && play > 0} stale={stale} onDrawn={() => setDrawing(null)} />
      <div className="ob6-buffer">
        <span id="ob6-buffer-label" className="ob6-buffer-label">{c.buffer} · {c.days}</span>
        <div className="seg ob6-seg" role="group" aria-labelledby="ob6-buffer-label">
          {BUFFER_CHOICES.map(n => <button key={n} type="button" aria-pressed={buffer === n} aria-label={`${n} ${n === 1 ? c.day : c.days}`} onClick={() => patch({ buffer: n })}>{n}</button>)}
        </div>
        <p className="small ob6-example" data-testid="buffer-example">{c.bufferExample.replace("{official}", fmtLong(example.official)).replace("{club}", fmtLong(example.club))}</p>
      </div>
    </>}

    {event && <details className="ob6-details" open={open} onToggle={e => setOpen(e.currentTarget.open)}>
      <summary>{c.details}</summary>
      <p className="small muted">{c.fields.source}: {draft.source}</p>
      <div className="form-grid">
        <label>{c.fields.name}<input maxLength={80} value={event.name} onChange={e => eventPatch({ name: e.target.value })} /></label>
        <label>{c.fields.date}<input type="date" min={state.today} value={date} aria-invalid={needsDate} onChange={e => patch({ date: e.target.value, confirmed: false })} /></label>
        <label>{c.fields.type}<select value={event.type} onChange={e => eventPatch({ type: e.target.value as FirstEventFields["type"] })}>{TYPES.map(t => <option key={t} value={t}>{cap(t)}</option>)}</select></label>
        <label>{c.fields.headcount}<input type="number" min="1" max="5000" value={event.headcount} onChange={e => eventPatch({ headcount: Number(e.target.value) })} /></label>
        <label>{c.fields.venue}<select value={event.venue} onChange={e => eventPatch({ venue: e.target.value as FirstEventFields["venue"] })}><option value="campus">Campus</option><option value="offcampus">Off campus</option></select></label>
        <label>{c.fields.food}<select value={event.food} onChange={e => eventPatch({ food: e.target.value as FirstEventFields["food"] })}>{FOOD.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}</select></label>
        <label>{c.fields.funding}<select value={event.funding} onChange={e => eventPatch({ funding: e.target.value as FirstEventFields["funding"] })}>{FUNDING.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}</select></label>
        <label className="check-label"><input type="checkbox" checked={event.speaker} onChange={e => eventPatch({ speaker: e.target.checked })} />{c.fields.speaker}</label>
      </div>
    </details>}

    {/* The same footer as Goals and Team: Back, Continue, and the optional step's Skip for now. Like Constitution, the "later" hint shows only
        until something is chosen (here: a plan), which also keeps the planned screen within its 60-word budget. */}
    <div className="ob-gt-nav">
      <button type="button" className="btn" onClick={() => flow?.back()}>{onboardingCopy.back}</button>
      <button type="button" className="btn btn-primary" disabled={!preview || stale || busy} onClick={() => flow?.next()}>{onboardingCopy.next}</button>
      <div className="ob-gt-skip"><button type="button" className="btn btn-quiet" onClick={skip}>{onboardingCopy.skip}</button>{!event && <p className="ob-gt-hint">{c.skipHint}</p>}</div>
    </div>
  </section>
}
