import { useRef, useState } from "react"
import { useStore } from "../../data/store"
import { answerSet, canEditAnswer, canEditQuestion as modelCanEditQuestion, hiddenAnswers, MAX_ANSWER_TEXT, MAX_QUESTION_TEXT, newPlaybookId, type PlaybookAction } from "../../data/playbook"
import { policySourceById } from "../../data/policyCatalog"
import { sourceName } from "../../lib/sourceNames"
import type { DemoState, PlaybookAnswer, PlaybookQuestion } from "../../data/types"
import { useRail } from "../rail/RailContext"
import { firstNameOf } from "../ui"
import { AnswerFields } from "./AnswerFields"
import { categoriesOf, playbookDispatch, Chevron, focusSoon, KIND_LABEL, monthLabel, previewPlaybook, rowButton, rowCategoryLabel, Spark, ThumbDown, ThumbUp, type PlaybookViewer } from "./shared"

/**
 * One question (Playbook phase 1). The row is a button that expands in place (AGENTS.md §6 Playbook exception); the answers are
 * rendered only while it is open, so closed rows add no words to the page.
 *
 * Research log: the row's button carries `data-log-name`, so a press is logged as "Playbook question" and the club's question
 * text never enters the log (see data-log-name in the screen-event capture); its accessible name is still the question.
 *
 * Focus: after a save or an edit the focus returns to the row's button; after hiding an answer it moves to the next answer's first
 * action (else the row's button); hiding the question is handled by the page (`onHide`), which knows the neighbouring rows.
 */
export function QuestionRow({ q, read, open, onToggle, onHide, viewer }: { q: PlaybookQuestion; read: boolean; open: boolean; onToggle: () => void; onHide: () => void; viewer: PlaybookViewer }) {
  const { state } = useStore()
  const headId = `pb-q-${q.id}`
  return <li className={`pb-q${read ? " is-read" : ""}${open ? " is-open" : ""}`} data-testid="pb-question" data-question-id={q.id}>
    <button type="button" className="pb-q-btn" id={headId} data-log-name="Playbook question" aria-expanded={open} aria-controls={open ? `${headId}-answers` : undefined} onClick={onToggle}>
      <Chevron />
      <span className="pb-q-text">{q.text}</span>
      {!read && <span className="pb-new">New</span>}
      <span className="pb-q-cat">{rowCategoryLabel(state, q.category)}</span>
    </button>
    {open && <Answers q={q} viewer={viewer} id={`${headId}-answers`} labelledBy={headId} onHide={onHide} />}
  </li>
}

function Answers({ q, viewer, id, labelledBy, onHide }: { q: PlaybookQuestion; viewer: PlaybookViewer; id: string; labelledBy: string; onHide: () => void }) {
  const { state, dispatch } = useStore()
  const rail = useRail()
  const set = answerSet(state, q.id)
  const [showAlternates, setShowAlternates] = useState(false)
  const [adding, setAdding] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState(false)
  const addButton = useRef<HTMLButtonElement>(null)
  const act = (a: PlaybookAction) => dispatch(playbookDispatch(a))
  const toRow = () => focusSoon(() => rowButton(q.id))
  const primaries = [set.rule, set.club, set.experience].filter((a): a is PlaybookAnswer => !!a)
  const canEditQuestion = modelCanEditQuestion(state, q)
  const canHideQuestion = viewer.lead
  // Hidden answers are listed only for the president or VP (hiddenAnswers returns none for anyone else), so they can be restored.
  const hidden = hiddenAnswers(state, q.id)
  const [showHidden, setShowHidden] = useState(false)
  const unhide = (answerId: string) => {
    act({ kind: "hideAnswer", answerId, hidden: false })
    focusSoon(() => document.querySelector<HTMLElement>(`[data-answer-id="${answerId}"] button`) ?? rowButton(q.id))
  }
  return <div className="pb-answers" id={id} role="region" aria-labelledby={labelledBy}>
    {editingQuestion && <EditQuestion q={q} onDone={() => { setEditingQuestion(false); focusSoon(() => rowButton(q.id) ?? document.querySelector<HTMLElement>("[data-testid=pb-add-open]")) }} />}
    {primaries.length === 0 && <p className="muted pb-none">No answer yet.</p>}
    {primaries.map(a => <Answer key={a.id} a={a} viewer={viewer} questionId={q.id} />)}
    {set.alternates.length > 0 && (showAlternates
      ? set.alternates.map(a => <Answer key={a.id} a={a} viewer={viewer} questionId={q.id} />)
      : <button type="button" className="link pb-more-answers" onClick={() => setShowAlternates(true)}>{set.alternates.length === 1 ? "1 more answer" : `${set.alternates.length} more answers`}</button>)}
    {hidden.length > 0 && (showHidden
      ? hidden.map(a => <p key={a.id} className="pb-hidden muted" data-testid="pb-hidden-answer"><span>{a.text}</span> <button type="button" className="btn small btn-quiet" onClick={() => unhide(a.id)}>Unhide</button></p>)
      : <button type="button" className="link pb-more-answers" onClick={() => setShowHidden(true)}>{hidden.length === 1 ? "1 hidden answer" : `${hidden.length} hidden answers`}</button>)}
    {adding
      ? <AddAnswer q={q} viewer={viewer} onSaved={() => { setAdding(false); toRow() }} onCancel={() => { setAdding(false); focusSoon(() => addButton.current) }} />
      : <div className="pb-row-actions">
        <button type="button" className="btn small pb-ask" onClick={() => rail.ask(q.text, false)}><Spark />Ask AI</button>
        {viewer.officer && <button ref={addButton} type="button" className="btn small" onClick={() => setAdding(true)}>Add an answer</button>}
        {canEditQuestion && !editingQuestion && <button type="button" className="btn small btn-quiet" onClick={() => setEditingQuestion(true)}>Edit question</button>}
        {canHideQuestion && <button type="button" className="btn small btn-quiet" onClick={onHide}>Hide question</button>}
      </div>}
  </div>
}

function Answer({ a, viewer, questionId }: { a: PlaybookAnswer; viewer: PlaybookViewer; questionId: string }) {
  const { state, dispatch } = useStore()
  const act = (x: PlaybookAction) => dispatch(playbookDispatch(x))
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(a.text)
  const self = useRef<HTMLElement>(null)
  const editButton = useRef<HTMLButtonElement>(null)
  const author = a.authorId ? state.people.find(p => p.id === a.authorId) : null
  const source = a.kind === "rule" && a.policyId ? { name: sourceName(a.policyId), url: policySourceById(a.policyId)?.sourceUrl ?? null } : null
  const up = a.votes.up.includes(viewer.id), down = a.votes.down.includes(viewer.id)
  const save = () => { if (text.trim() && text.trim() !== a.text) act({ kind: "editAnswer", answerId: a.id, text }); setEditing(false); focusSoon(() => rowButton(questionId)) }
  const hide = () => {
    // The next answer below this one that has an action; it keeps its place when this one leaves the page.
    let next: Element | null = self.current?.nextElementSibling ?? null
    while (next && !(next.matches("[data-answer-id]") && next.querySelector("button"))) next = next.nextElementSibling
    const nextId = next?.getAttribute("data-answer-id")
    act({ kind: "hideAnswer", answerId: a.id, hidden: true })
    focusSoon(() => (nextId ? document.querySelector<HTMLElement>(`[data-answer-id="${nextId}"] button`) : null) ?? rowButton(questionId))
  }
  const showActions = a.kind !== "rule" && !editing && (viewer.canVote || canEditAnswer(state, a) || viewer.lead)
  return <article ref={self} className={`pb-ans pb-ans-${a.kind}`} data-testid="pb-answer" data-kind={a.kind} data-answer-id={a.id}>
    <p className="pb-ans-meta">
      <span className="pb-label">{KIND_LABEL[a.kind]}</span>
      {source
        ? <> · {source.url ? <a href={source.url} target="_blank" rel="noreferrer">{source.name}</a> : <span>{source.name}</span>}</>
        : <> · {author ? firstNameOf(author.name) : "Club"} · {monthLabel(a.verifiedOn ?? a.on)}</>}
    </p>
    {editing
      ? <form className="pb-form" onSubmit={e => { e.preventDefault(); save() }}>
        <label className="field"><span>Edit answer</span><textarea rows={3} maxLength={MAX_ANSWER_TEXT} value={text} onChange={e => setText(e.target.value)} autoFocus /></label>
        <div className="action-row"><button className="btn btn-primary small" disabled={!text.trim()}>Save</button><button type="button" className="btn small" onClick={() => { setText(a.text); setEditing(false); focusSoon(() => editButton.current) }}>Cancel</button></div>
      </form>
      : <p className="pb-ans-text">{a.text}</p>}
    {showActions && <div className="pb-ans-actions">
      {/* A former officer only reads: no like or dislike at all (not even disabled ones). */}
      {viewer.canVote && <>
        <button type="button" className="pb-vote" aria-pressed={up} onClick={() => act({ kind: "vote", answerId: a.id, vote: up ? 0 : 1 })}>
          <ThumbUp /><span className="sr-only">Like</span><span data-testid="pb-likes">{a.votes.up.length}</span>
        </button>
        <button type="button" className="pb-vote" aria-pressed={down} onClick={() => act({ kind: "vote", answerId: a.id, vote: down ? 0 : -1 })}>
          <ThumbDown /><span className="sr-only">Dislike</span><span>{a.votes.down.length}</span>
        </button>
      </>}
      {canEditAnswer(state, a) && <button ref={editButton} type="button" className="btn small btn-quiet" onClick={() => { setText(a.text); setEditing(true) }}>Edit</button>}
      {viewer.lead && <button type="button" className="btn small btn-quiet" onClick={hide}>Hide</button>}
    </div>}
  </article>
}

function AddAnswer({ q, viewer, onSaved, onCancel }: { q: PlaybookQuestion; viewer: PlaybookViewer; onSaved: () => void; onCancel: () => void }) {
  const { state, dispatch } = useStore()
  const [kind, setKind] = useState<"club" | "experience">("experience")
  const [text, setText] = useState("")
  const [error, setError] = useState<string | null>(null)
  return <form className="pb-form" aria-label="Add an answer" onSubmit={e => {
    e.preventDefault()
    if (!text.trim()) return
    const action: PlaybookAction = { kind: "addAnswer", id: newPlaybookId(state, "pa-"), questionId: q.id, answerKind: viewer.lead ? kind : "experience", text }
    // A save the model would refuse keeps the form (and the text) with a short reason.
    const check = previewPlaybook(state, [action])
    if (check.error !== null) { setError(check.error); return }
    dispatch(playbookDispatch(action))
    onSaved()
  }}>
    <AnswerFields lead={viewer.lead} kind={kind} setKind={setKind} text={text} setText={setText} autoFocus />
    {error && <p className="small late-text pb-error" role="alert">{error}</p>}
    <div className="action-row"><button className="btn btn-primary small" disabled={!text.trim()}>Save answer</button><button type="button" className="btn small" onClick={onCancel}>Cancel</button></div>
  </form>
}

function EditQuestion({ q, onDone }: { q: PlaybookQuestion; onDone: () => void }) {
  const { state, dispatch } = useStore()
  const [text, setText] = useState(q.text)
  const [category, setCategory] = useState(q.category)
  return <form className="pb-form" aria-label="Edit question" onSubmit={e => {
    e.preventDefault()
    if (text.trim()) dispatch(playbookDispatch({ kind: "editQuestion", questionId: q.id, text, category }))
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
