import { useState } from "react"
import { useStore } from "../../data/store"
import { answerSet, MAX_ANSWER_TEXT, MAX_QUESTION_TEXT, newPlaybookId } from "../../data/playbook"
import { policySourceById } from "../../data/policyCatalog"
import { sourceName } from "../../lib/sourceNames"
import type { DemoState, PlaybookAnswer, PlaybookQuestion } from "../../data/types"
import { useRail } from "../rail/RailContext"
import { firstNameOf } from "../ui"
import { AnswerFields } from "./AnswerFields"
import { modelSupports, playbookStoreAction, type UiPlaybookAction } from "./compat"
import { canEditAnswer, categoriesOf, categoryLabel, Chevron, KIND_LABEL, monthLabel, Spark, ThumbDown, ThumbUp, type PlaybookViewer } from "./shared"

/**
 * One question (Playbook phase 1). The row is a button that expands in place (AGENTS.md §6 Playbook exception); the answers are
 * rendered only while it is open, so closed rows add no words to the page.
 */
export function QuestionRow({ q, read, open, onToggle, viewer }: { q: PlaybookQuestion; read: boolean; open: boolean; onToggle: () => void; viewer: PlaybookViewer }) {
  const { state } = useStore()
  const headId = `pb-q-${q.id}`
  return <li className={`pb-q${read ? " is-read" : ""}${open ? " is-open" : ""}`} data-testid="pb-question" data-question-id={q.id}>
    <button type="button" className="pb-q-btn" id={headId} aria-expanded={open} aria-controls={open ? `${headId}-answers` : undefined} onClick={onToggle}>
      <Chevron />
      <span className="pb-q-text">{q.text}</span>
      {!read && <span className="pb-new">New</span>}
      <span className="pb-q-cat">{categoryLabel(state, q.category)}</span>
    </button>
    {open && <Answers q={q} viewer={viewer} id={`${headId}-answers`} labelledBy={headId} />}
  </li>
}

function Answers({ q, viewer, id, labelledBy }: { q: PlaybookQuestion; viewer: PlaybookViewer; id: string; labelledBy: string }) {
  const { state, dispatch } = useStore()
  const rail = useRail()
  const set = answerSet(state, q.id)
  const [showAlternates, setShowAlternates] = useState(false)
  const [adding, setAdding] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState(false)
  const act = (a: UiPlaybookAction) => dispatch(playbookStoreAction(a))
  const primaries = [set.rule, set.club, set.experience].filter((a): a is PlaybookAnswer => !!a)
  const canChangeQuestion = viewer.officer && (viewer.lead || q.createdBy === viewer.id)
  const canEditQuestion = canChangeQuestion && modelSupports(state, { kind: "editQuestion", questionId: q.id })
  const canHideQuestion = viewer.lead && modelSupports(state, { kind: "hideQuestion", questionId: q.id, hidden: true })
  return <div className="pb-answers" id={id} role="region" aria-labelledby={labelledBy}>
    {editingQuestion && <EditQuestion q={q} onDone={() => setEditingQuestion(false)} />}
    {primaries.length === 0 && <p className="muted pb-none">No answer yet.</p>}
    {primaries.map(a => <Answer key={a.id} a={a} viewer={viewer} />)}
    {set.alternates.length > 0 && (showAlternates
      ? set.alternates.map(a => <Answer key={a.id} a={a} viewer={viewer} />)
      : <button type="button" className="link pb-more-answers" onClick={() => setShowAlternates(true)}>{set.alternates.length === 1 ? "1 more answer" : `${set.alternates.length} more answers`}</button>)}
    {adding
      ? <AddAnswer q={q} viewer={viewer} onDone={() => setAdding(false)} />
      : <div className="pb-row-actions">
        <button type="button" className="btn small pb-ask" onClick={() => rail.ask(q.text, false)}><Spark />Ask AI</button>
        {viewer.officer && <button type="button" className="btn small" onClick={() => setAdding(true)}>Add an answer</button>}
        {canEditQuestion && !editingQuestion && <button type="button" className="btn small btn-quiet" onClick={() => setEditingQuestion(true)}>Edit question</button>}
        {canHideQuestion && <button type="button" className="btn small btn-quiet" onClick={() => act({ kind: "hideQuestion", questionId: q.id, hidden: true })}>Hide question</button>}
      </div>}
  </div>
}

function Answer({ a, viewer }: { a: PlaybookAnswer; viewer: PlaybookViewer }) {
  const { state, dispatch } = useStore()
  const act = (x: UiPlaybookAction) => dispatch(playbookStoreAction(x))
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(a.text)
  const author = a.authorId ? state.people.find(p => p.id === a.authorId) : null
  const source = a.kind === "rule" && a.policyId ? { name: sourceName(a.policyId), url: policySourceById(a.policyId)?.sourceUrl ?? null } : null
  const up = a.votes.up.includes(viewer.id), down = a.votes.down.includes(viewer.id)
  const save = () => { if (text.trim() && text.trim() !== a.text) act({ kind: "editAnswer", answerId: a.id, text }); setEditing(false) }
  return <article className={`pb-ans pb-ans-${a.kind}`} data-testid="pb-answer" data-kind={a.kind}>
    <p className="pb-ans-meta">
      <span className="pb-label">{KIND_LABEL[a.kind]}</span>
      {source
        ? <> · {source.url ? <a href={source.url} target="_blank" rel="noreferrer">{source.name}</a> : <span>{source.name}</span>}</>
        : <> · {author ? firstNameOf(author.name) : "Club"} · {monthLabel(a.verifiedOn ?? a.on)}</>}
    </p>
    {editing
      ? <form className="pb-form" onSubmit={e => { e.preventDefault(); save() }}>
        <label className="field"><span>Edit answer</span><textarea rows={3} maxLength={MAX_ANSWER_TEXT} value={text} onChange={e => setText(e.target.value)} autoFocus /></label>
        <div className="action-row"><button className="btn btn-primary small" disabled={!text.trim()}>Save</button><button type="button" className="btn small" onClick={() => { setText(a.text); setEditing(false) }}>Cancel</button></div>
      </form>
      : <p className="pb-ans-text">{a.text}</p>}
    {a.kind !== "rule" && !editing && <div className="pb-ans-actions">
      <button type="button" className="pb-vote" aria-pressed={up} disabled={!viewer.canVote} onClick={() => act({ kind: "vote", answerId: a.id, vote: up ? 0 : 1 })}>
        <ThumbUp /><span className="sr-only">Like</span><span data-testid="pb-likes">{a.votes.up.length}</span>
      </button>
      <button type="button" className="pb-vote" aria-pressed={down} disabled={!viewer.canVote} onClick={() => act({ kind: "vote", answerId: a.id, vote: down ? 0 : -1 })}>
        <ThumbDown /><span className="sr-only">Dislike</span><span>{a.votes.down.length}</span>
      </button>
      {canEditAnswer(viewer, a) && <button type="button" className="btn small btn-quiet" onClick={() => { setText(a.text); setEditing(true) }}>Edit</button>}
      {viewer.lead && <button type="button" className="btn small btn-quiet" onClick={() => act({ kind: "hideAnswer", answerId: a.id, hidden: true })}>Hide</button>}
    </div>}
  </article>
}

function AddAnswer({ q, viewer, onDone }: { q: PlaybookQuestion; viewer: PlaybookViewer; onDone: () => void }) {
  const { state, dispatch } = useStore()
  const [kind, setKind] = useState<"club" | "experience">("experience")
  const [text, setText] = useState("")
  return <form className="pb-form" aria-label="Add an answer" onSubmit={e => {
    e.preventDefault()
    if (!text.trim()) return
    dispatch(playbookStoreAction({ kind: "addAnswer", id: newPlaybookId(state, "pa-"), questionId: q.id, answerKind: viewer.lead ? kind : "experience", text }))
    onDone()
  }}>
    <AnswerFields lead={viewer.lead} kind={kind} setKind={setKind} text={text} setText={setText} autoFocus />
    <div className="action-row"><button className="btn btn-primary small" disabled={!text.trim()}>Save answer</button><button type="button" className="btn small" onClick={onDone}>Cancel</button></div>
  </form>
}

function EditQuestion({ q, onDone }: { q: PlaybookQuestion; onDone: () => void }) {
  const { state, dispatch } = useStore()
  const [text, setText] = useState(q.text)
  const [category, setCategory] = useState(q.category)
  return <form className="pb-form" aria-label="Edit question" onSubmit={e => {
    e.preventDefault()
    if (text.trim()) dispatch(playbookStoreAction({ kind: "editQuestion", questionId: q.id, text, category }))
    onDone()
  }}>
    <label className="field"><span>Question</span><input maxLength={MAX_QUESTION_TEXT} value={text} onChange={e => setText(e.target.value)} autoFocus /></label>
    <CategorySelect state={state} value={category} onChange={setCategory} />
    <div className="action-row"><button className="btn btn-primary small" disabled={!text.trim()}>Save</button><button type="button" className="btn small" onClick={onDone}>Cancel</button></div>
  </form>
}

export function CategorySelect({ state, value, onChange }: { state: DemoState; value: string; onChange: (v: string) => void }) {
  return <label className="field"><span>Category</span>
    <select value={value} onChange={e => onChange(e.target.value)}>{categoriesOf(state).map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
  </label>
}
