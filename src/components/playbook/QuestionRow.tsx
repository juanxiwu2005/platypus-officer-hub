import { useRef, useState } from "react"
import { useStore } from "../../data/store"
import { answerSet, canDeleteAnswer, canDeleteQuestion, canEditAnswer, canEditQuestion, MAX_ANSWER_TEXT, MAX_QUESTION_TEXT, newPlaybookId, playbookOf, type PlaybookAction } from "../../data/playbook"
import { policySourceById } from "../../data/policyCatalog"
import { sourceName } from "../../lib/sourceNames"
import { playbookAskContext } from "../../lib/playbookAsk"
import type { DemoState, PlaybookAnswer, PlaybookQuestion } from "../../data/types"
import { useRail } from "../rail/RailContext"
import { MenuButton } from "../workflowLibrary/MenuButton"
import { AnswerFields } from "./AnswerFields"
import { categoriesOf, playbookDispatch, Chevron, Dots, focusSoon, KIND_LABEL, monthLabel, previewPlaybook, rowButton, rowTag, Spark, ThumbDown, ThumbUp, type PlaybookViewer } from "./shared"

/**
 * One question (Playbook, redesigned 2026-11-26): a compact row, left to right the category tag, the question, an Ask AI icon
 * button and the chevron. The row expands in place (AGENTS.md §6 Playbook exception); its answers are rendered only while it is
 * open, so closed rows add no words to the page.
 *
 * Research log: the row's button and its Ask AI button carry `data-log-name`, so a press is logged by a fixed name and the club's
 * question text never enters the log (see data-log-name in the screen-event capture); their accessible names still name the question.
 *
 * Focus: after a save or an edit the focus returns to the row's button; after deleting an answer it moves to the next answer's
 * first control (else the row's button); deleting the question is handled by the page (`onDelete`), which knows the neighbouring rows.
 */
export function QuestionRow({ q, read, open, onToggle, onDelete, viewer }: { q: PlaybookQuestion; read: boolean; open: boolean; onToggle: () => void; onDelete: () => void; viewer: PlaybookViewer }) {
  const { state } = useStore()
  const rail = useRail()
  const headId = `pb-q-${q.id}`
  const tag = rowTag(state, q.category)
  const askAi = () => {
    const context = playbookAskContext(state, q.id)
    if (context) rail.askAbout(context)
    else rail.ask(q.text, false)
  }
  return <li className={`pb-q${read ? " is-read" : ""}${open ? " is-open" : ""}`} data-testid="pb-question" data-question-id={q.id}>
    <div className="pb-q-head">
      <button type="button" className="pb-q-btn" id={headId} data-log-name="Playbook question" aria-expanded={open} aria-controls={open ? `${headId}-answers` : undefined} onClick={onToggle}>
        <span className="pb-q-text">{q.text}</span>
        {!read && <span className="pb-new">New</span>}
        <span className={`pb-tag pb-tag-${tag.tone}`}>{tag.label}</span>
        <Chevron />
      </button>
      <button type="button" className="btn small icon-btn pb-ask" data-log-name="Playbook Ask AI" aria-label={`Ask AI about ${q.text}`} title="Ask AI" onClick={askAi}><Spark /></button>
    </div>
    {open && <Answers q={q} viewer={viewer} id={`${headId}-answers`} labelledBy={headId} onDelete={onDelete} />}
  </li>
}

function Answers({ q, viewer, id, labelledBy, onDelete }: { q: PlaybookQuestion; viewer: PlaybookViewer; id: string; labelledBy: string; onDelete: () => void }) {
  const { state } = useStore()
  const set = answerSet(state, q.id)
  const [showAlternates, setShowAlternates] = useState(false)
  const [adding, setAdding] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const addButton = useRef<HTMLButtonElement>(null)
  const footer = useRef<HTMLDivElement>(null)
  const toRow = () => focusSoon(() => rowButton(q.id))
  const toMenu = () => focusSoon(() => footer.current?.querySelector<HTMLElement>("[aria-haspopup=menu]") ?? rowButton(q.id))
  const primaries = [set.rule, set.club, set.experience].filter((a): a is PlaybookAnswer => !!a)
  const answerCount = playbookOf(state).answers.filter(a => a.questionId === q.id).length
  const moreLink = set.alternates.length > 0 && !showAlternates
  const menu = [
    ...(canEditQuestion(state, q) ? [{ label: "Edit question", onSelect: () => setEditingQuestion(true) }] : []),
    ...(canDeleteQuestion(state, q) ? [{ label: "Delete question", onSelect: () => { setConfirming(true); focusSoon(() => footer.current?.querySelector<HTMLElement>("[data-confirm]")) } }] : []),
  ]
  return <div className="pb-answers" id={id} role="region" aria-labelledby={labelledBy}>
    {editingQuestion && <EditQuestion q={q} onDone={() => { setEditingQuestion(false); toRow() }} />}
    {primaries.length === 0 && <p className="muted pb-none">No answer yet.</p>}
    {primaries.map(a => <Answer key={a.id} a={a} viewer={viewer} questionId={q.id} />)}
    {showAlternates && set.alternates.map(a => <Answer key={a.id} a={a} viewer={viewer} questionId={q.id} />)}
    {adding && <AddAnswer q={q} viewer={viewer} onSaved={() => { setAdding(false); toRow() }} onCancel={() => { setAdding(false); focusSoon(() => addButton.current) }} />}
    {/* One quiet line at the end of the row: "N more answers", "Add an answer" and the question's ⋯ menu. */}
    {!adding && (moreLink || viewer.officer || menu.length > 0) && <div className="pb-row-foot" ref={footer}>
      {confirming
        ? <Confirm text={answerCount ? `Delete this question and its ${answerCount === 1 ? "answer" : `${answerCount} answers`}?` : "Delete this question?"} onYes={onDelete} onNo={() => { setConfirming(false); toMenu() }} />
        : <>
          {moreLink && <button type="button" className="link pb-more-answers" onClick={() => {
            // The link goes away: the focus moves to the first answer it showed that has a control, else to "Add an answer" or the row.
            const first = set.alternates[0]?.id
            setShowAlternates(true)
            focusSoon(() => document.querySelector<HTMLElement>(`[data-answer-id="${first}"] button`) ?? addButton.current ?? rowButton(q.id))
          }}>{set.alternates.length === 1 ? "1 more answer" : `${set.alternates.length} more answers`}</button>}
          {viewer.officer && <button ref={addButton} type="button" className="link pb-add-answer" onClick={() => setAdding(true)}>Add an answer</button>}
          {menu.length > 0 && <MenuButton label={<Dots />} ariaLabel="More actions for this question" className="pb-icon pb-more" items={menu} />}
        </>}
    </div>}
  </div>
}

/** The inline "Delete …? Delete / Cancel" (no dialog). The Delete button gets the focus when it appears. */
function Confirm({ text, onYes, onNo }: { text: string; onYes: () => void; onNo: () => void }) {
  return <div className="pb-confirm" role="group" aria-label={text} data-testid="pb-confirm" onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); onNo() } }}>
    <span>{text}</span>
    <button type="button" className="btn small pb-delete" data-confirm onClick={onYes}>Delete</button>
    <button type="button" className="btn small btn-quiet" onClick={onNo}>Cancel</button>
  </div>
}

function Answer({ a, viewer, questionId }: { a: PlaybookAnswer; viewer: PlaybookViewer; questionId: string }) {
  const { state, dispatch } = useStore()
  const act = (x: PlaybookAction) => dispatch(playbookDispatch(x))
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [text, setText] = useState(a.text)
  const self = useRef<HTMLElement>(null)
  const author = a.authorId ? state.people.find(p => p.id === a.authorId) : null
  const source = a.kind === "rule" && a.policyId ? { name: sourceName(a.policyId), url: policySourceById(a.policyId)?.sourceUrl ?? null } : null
  const up = a.votes.up.includes(viewer.id), down = a.votes.down.includes(viewer.id)
  const toMenu = () => focusSoon(() => self.current?.querySelector<HTMLElement>("[aria-haspopup=menu]") ?? rowButton(questionId))
  const save = () => { if (text.trim() && text.trim() !== a.text) act({ kind: "editAnswer", answerId: a.id, text }); setEditing(false); focusSoon(() => rowButton(questionId)) }
  const remove = () => {
    // The next answer below this one that has a control; it keeps its place when this one leaves the page.
    let next: Element | null = self.current?.nextElementSibling ?? null
    while (next && !(next.matches("[data-answer-id]") && next.querySelector("button"))) next = next.nextElementSibling
    const nextId = next?.getAttribute("data-answer-id")
    act({ kind: "deleteAnswer", answerId: a.id })
    focusSoon(() => (nextId ? document.querySelector<HTMLElement>(`[data-answer-id="${nextId}"] button`) : null) ?? rowButton(questionId))
  }
  const menu = [
    ...(canEditAnswer(state, a) ? [{ label: "Edit", onSelect: () => { setText(a.text); setEditing(true) } }] : []),
    ...(canDeleteAnswer(state, a) ? [{ label: "Delete", onSelect: () => { setConfirming(true); focusSoon(() => self.current?.querySelector<HTMLElement>("[data-confirm]")) } }] : []),
  ]
  // A former officer only reads: no like or dislike at all (not even disabled ones). School rules take no votes.
  const votes = a.kind !== "rule" && viewer.canVote
  return <article ref={self} className={`pb-ans pb-ans-${a.kind}`} data-testid="pb-answer" data-kind={a.kind} data-answer-id={a.id}>
    <div className="pb-ans-main">
      <p className="pb-ans-meta">
        <span className="pb-label">{KIND_LABEL[a.kind]}</span>
        {source
          ? <> · {source.url ? <a href={source.url} target="_blank" rel="noreferrer" title={source.name}>{source.name} <span aria-hidden="true">↗</span></a> : <span>{source.name}</span>}</>
          : <> · {author ? author.name : "Club"} · {monthLabel(a.verifiedOn ?? a.on)}</>}
      </p>
      {editing
        ? <form className="pb-form" onSubmit={e => { e.preventDefault(); save() }}>
          <label className="field"><span>Edit answer</span><textarea rows={3} maxLength={MAX_ANSWER_TEXT} value={text} onChange={e => setText(e.target.value)} autoFocus /></label>
          <div className="action-row"><button className="btn btn-primary small" disabled={!text.trim()}>Save</button><button type="button" className="btn small" onClick={() => { setText(a.text); setEditing(false); toMenu() }}>Cancel</button></div>
        </form>
        : <p className="pb-ans-text">{a.text}</p>}
      {confirming && <Confirm text="Delete this answer?" onYes={remove} onNo={() => { setConfirming(false); toMenu() }} />}
    </div>
    {(votes || menu.length > 0) && !editing && <div className="pb-ans-tools">
      {votes && <>
        <button type="button" className="pb-icon pb-vote" aria-pressed={up} title="Like" onClick={() => act({ kind: "vote", answerId: a.id, vote: up ? 0 : 1 })}>
          <ThumbUp /><span className="sr-only">Like</span><span data-testid="pb-likes">{a.votes.up.length}</span>
        </button>
        <button type="button" className="pb-icon pb-vote" aria-pressed={down} title="Dislike" onClick={() => act({ kind: "vote", answerId: a.id, vote: down ? 0 : -1 })}>
          <ThumbDown /><span className="sr-only">Dislike</span><span>{a.votes.down.length}</span>
        </button>
      </>}
      {menu.length > 0 && <MenuButton label={<Dots />} ariaLabel="More actions for this answer" className="pb-icon pb-more" items={menu} />}
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
