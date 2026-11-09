import { useState } from "react"
import { Link } from "react-router-dom"
import { useStore, useViewer } from "../data/store"
import type { HandoffAction } from "../data/handoff"
import type { RoleHandoff } from "../data/types"
import { handoffQuestions, READBACK_PROMPTS } from "../lib/handoffQuestions"
import { handoffDates } from "../engine/schedule"
import { firstQuestions } from "../lib/firstQuestions"
import { fmtShort } from "../lib/dates"

/** Handoff stage 5 screens: the outgoing officer's questions, the new officer's reading and read-back, the shadow task and the day 7 / day 30 check-ins. */
const useAct = () => { const { dispatch } = useStore(); return (action: HandoffAction) => dispatch({ type: "handoffAction", action }) }

/** Questions the records raise for the outgoing officer. An answer becomes an interview line, so the handbook has to be drafted again. */
export function QuestionsList({ record }: { record: RoleHandoff }) {
  const { state } = useStore(); const { canNudge } = useViewer(); const act = useAct()
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const role = state.roles.find(r => r.id === record.roleId)
  const canAnswer = !record.completed && (state.viewerId === record.outgoingId || (canNudge && !role?.holderId))
  const questions = handoffQuestions(state, record)
  if (!questions.length) return null
  return <div data-testid="gap-questions">
    <p className="small"><b>Questions from the records</b> <span className="muted">({questions.filter(q => q.status === "open").length} open)</span></p>
    <ul className="small">{questions.map(q => <li key={q.id}>
      <span>{q.text}</span>
      {q.status === "answered" && <span className="good-text"> · answered: {q.answer}</span>}
      {q.status === "skipped" && <span className="muted"> · skipped (left unresolved)</span>}
      {q.status === "open" && canAnswer && <span className="field">
        <textarea aria-label={`Answer: ${q.text}`} rows={2} maxLength={1000} value={drafts[q.id] ?? ""} onChange={e => setDrafts({ ...drafts, [q.id]: e.target.value })} />
        <span className="action-row"><button type="button" className="btn small" disabled={!(drafts[q.id] ?? "").trim()} onClick={() => act({ kind: "answerQuestion", roleId: record.roleId, id: q.id, answer: drafts[q.id] })}>Save answer</button><button type="button" className="btn small" onClick={() => act({ kind: "answerQuestion", roleId: record.roleId, id: q.id, skip: true })}>Skip</button></span>
      </span>}
    </li>)}</ul>
    {canAnswer && <p className="small muted">Answers join the interview, so draft the handbook again afterwards.</p>}
  </div>
}

/** The new officer's side: read each section, say "Got it" or "Unclear", then answer three questions in their own words. */
export function NewOfficerCard({ record, sections }: { record: RoleHandoff; sections: string[] }) {
  const { state } = useStore(); const { canNudge } = useViewer(); const act = useAct()
  const role = state.roles.find(r => r.id === record.roleId)
  const mine = !!record.incomingId && record.incomingId === state.viewerId
  const [draft, setDraft] = useState<string[]>(() => record.readBack?.answers ?? READBACK_PROMPTS.map(() => ""))
  const speaks = state.viewerId === record.outgoingId || canNudge
  const predecessor = state.people.find(p => p.id === record.outgoingId)
  const shadow = state.nodes.find(n => n.id === record.shadowNodeId)
  if (!record.incomingId && !record.completed) return null
  return <article className="step-card" data-testid="new-officer">
    <header><span className="step-n">+</span><b>Next officer: read, read back, shadow</b></header>
    {mine && predecessor && <p className="small muted">Your predecessor: {predecessor.name}. Ask them when something is unclear.</p>}
    {record.entries.length > 0 && <>
      <p className="small"><b>Reading</b></p>
      {sections.map(name => <div key={name} className="action-row">
        <span className="small">{name}</span>
        <button type="button" className="btn small" aria-pressed={record.reading?.[name] === "got"} disabled={!mine} onClick={() => act({ kind: "readSection", roleId: record.roleId, section: name, mark: "got" })}>Got it</button>
        <button type="button" className="btn small" aria-pressed={record.reading?.[name] === "unclear"} disabled={!mine} onClick={() => act({ kind: "readSection", roleId: record.roleId, section: name, mark: "unclear" })}>Unclear</button>
      </div>)}
      {!mine && <p className="small muted">Only the next officer marks what they have read. “Unclear” becomes a question for the outgoing officer.</p>}
      <p className="small"><b>Read-back</b> <span className="muted">in your own words; nothing here is scored</span></p>
      {READBACK_PROMPTS.map((q, i) => <label key={q} className="field"><span className="small">{q}</span>
        <textarea rows={2} maxLength={500} disabled={!mine} value={draft[i] ?? ""} onChange={e => setDraft(draft.map((x, j) => j === i ? e.target.value : x))} />
        {record.readBack?.flags[i]?.flagged && <span className="small warn-text">Not found in the handbook{record.readBack.flags[i].resolved ? " · looked at" : ""}
          {speaks && !record.readBack.flags[i].resolved && <span className="action-row"><button type="button" className="btn small" disabled={record.completed} onClick={() => act({ kind: "resolveReadBack", roleId: record.roleId, index: i, add: true })}>Add to handbook</button><button type="button" className="btn small" onClick={() => act({ kind: "resolveReadBack", roleId: record.roleId, index: i, add: false })}>Fine as it is</button></span>}
        </span>}
      </label>)}
      {mine && <button type="button" className="btn small" disabled={draft.some(x => !x.trim())} onClick={() => act({ kind: "readBack", roleId: record.roleId, answers: draft })}>Save read-back</button>}
    </>}
    <p className="small"><b>Shadow task</b></p>
    {shadow ? <p className="small">Shadowing <Link to={`/tasks?node=${encodeURIComponent(shadow.id)}`}>{shadow.title}</Link>. The task stays with {predecessor?.name ?? "the outgoing officer"}.</p>
      : <p className="small muted">None yet. {canNudge && !record.completed ? "Pick a light task the outgoing officer is still doing." : ""}</p>}
    {canNudge && !record.completed && !shadow && <button type="button" className="btn small" onClick={() => act({ kind: "startShadow", roleId: record.roleId })}>Pick a task to shadow</button>}
    {role && <span className="sr-only">{role.displayName}</span>}
    {(mine || canNudge) && <AskedQuestions record={record} />}
  </article>
}

/** What the next officer has asked Ask, read from the study log (the one record there is) when this is drawn. Not stored, not sent to the AI. */
function AskedQuestions({ record }: { record: RoleHandoff }) {
  const { getLog } = useStore()
  const [tick, setTick] = useState(0)
  void tick
  const asked = firstQuestions(getLog(), record)
  const gaps = asked.filter(q => !q.covered)
  return <div data-testid="asked-questions">
    <p className="small"><b>Questions asked in Ask</b> <span className="muted">{asked.length} asked · {gaps.length} not covered by the handbook</span> <button type="button" className="btn small" onClick={() => setTick(n => n + 1)}>Refresh</button></p>
    {gaps.length > 0 && <ul className="small">{gaps.slice(-8).map(q => <li key={q.at}>{q.text}</li>)}</ul>}
    <p className="small muted">Read from this browser's activity log each time you look. It is not saved anywhere else and is never sent to the AI.</p>
  </div>
}

/** Day 7 and day 30 check-ins by the new officer. Only they and the president see the answers. */
export function ReviewsPanel({ record, start }: { record: RoleHandoff; start: string }) {
  const { state } = useStore(); const { canNudge } = useViewer(); const act = useAct()
  const mine = !!record.incomingId && record.incomingId === state.viewerId
  const dates = handoffDates(start)
  const [form, setForm] = useState<Record<number, { clarity: number; confidence: number; welcome: number; missing: string }>>({})
  if (!record.completed) return null
  return <div data-testid="reviews">{([7, 30] as const).map(day => {
    const due = day === 7 ? dates.weekOne : dates.review
    const done = record.reviews?.find(r => r.day === day)
    const f = form[day] ?? { clarity: 3, confidence: 3, welcome: 3, missing: "" }
    const set = (patch: Partial<typeof f>) => setForm({ ...form, [day]: { ...f, ...patch } })
    return <div key={day}><p className="small"><b>Day {day} check-in</b></p>
      {done ? <>{(mine || canNudge) ? <p className="small">Clarity {done.clarity}/5 · confidence {done.confidence}/5 · welcome {done.welcome}/5{done.missing ? ` · missing: ${done.missing}` : ""}
        {canNudge && done.missing && (done.accepted ? <span className="good-text"> · in the dossier</span> : <> <button type="button" className="btn small" onClick={() => act({ kind: "acceptReview", roleId: record.roleId, day })}>Add to dossier</button></>)}</p>
        : <p className="small muted">Recorded.</p>}</>
        : state.today < due ? <p className="small muted">Opens {fmtShort(due)}.</p>
        : mine ? <div className="form-stack">
          {(["clarity", "confidence", "welcome"] as const).map(k => <label key={k} className="field"><span className="small">{k === "clarity" ? "How clear is the role?" : k === "confidence" ? "How confident do you feel?" : "How welcome do you feel on the team?"}</span>
            <select value={f[k]} onChange={e => set({ [k]: Number(e.target.value) })}>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}</select></label>)}
          <label className="field"><span className="small">What was missing from the handbook?</span><textarea rows={2} maxLength={500} value={f.missing} onChange={e => set({ missing: e.target.value })} /></label>
          <button type="button" className="btn small" onClick={() => act({ kind: "review", roleId: record.roleId, day, clarity: f.clarity, confidence: f.confidence, welcome: f.welcome, missing: f.missing })}>Save day {day} check-in</button></div>
        : <p className="small muted">The next officer fills this in.</p>}
    </div>
  })}
    {canNudge && !record.reviewed && state.today >= dates.review && <button type="button" className="btn small" onClick={() => act({ kind: "review", roleId: record.roleId })}>Record day-30 review without a check-in</button>}
    {record.reviewed && <p className="small good-text">Day-30 review recorded.</p>}
  </div>
}
