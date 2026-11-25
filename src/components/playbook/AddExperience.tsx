import { useId, useRef, useState } from "react"
import { useStore } from "../../data/store"
import { liveQuestion, MAX_QUESTION_TEXT, newPlaybookId, playbookOf, type PlaybookAction } from "../../data/playbook"
import type { DemoState } from "../../data/types"
import { AnswerFields } from "./AnswerFields"
import { similarQuestions } from "../../lib/playbookMatch"
import { playbookDispatch, previewPlaybook } from "./shared"
import { CategorySelect } from "./QuestionRow"
import type { PlaybookViewer } from "./shared"

/**
 * "+ Add experience": a question (new, or an existing one picked from the live suggestions) and its answer. The duplicate check
 * comes first so the library grows by answers rather than by near-identical questions.
 */
export function AddExperience({ viewer, defaultCategory, roleIds, onSaved, onCancel }: {
  viewer: PlaybookViewer
  defaultCategory: string
  roleIds: string[] | "all"
  /** Called after a save the model accepted, with the state it leads to (so the page can place the list around the question). */
  onSaved: (questionId: string, category: string, next: DemoState) => void
  onCancel: () => void
}) {
  const { state, dispatch } = useStore()
  const id = useId()
  const form = useRef<HTMLFormElement>(null)
  const [question, setQuestion] = useState("")
  const [existingId, setExistingId] = useState<string | null>(null)
  const [category, setCategory] = useState(defaultCategory)
  const [kind, setKind] = useState<"club" | "experience">("experience")
  const [text, setText] = useState("")
  const existing = existingId ? liveQuestion(playbookOf(state), existingId) : undefined
  const suggestions = existing ? [] : similarQuestions(state, question, { category })
  const [error, setError] = useState<string | null>(null)
  const ready = !!text.trim() && (!!existing || !!question.trim())
  const save = () => {
    if (!ready) return
    const cat = existing?.category ?? category
    const questionId = existing?.id ?? newPlaybookId(state, "pq-")
    const actions: PlaybookAction[] = [
      ...(existing ? [] : [{ kind: "addQuestion", id: questionId, text: question, category: cat, roleIds } as const]),
      { kind: "addAnswer", id: newPlaybookId(state, "pa-"), questionId, answerKind: viewer.lead ? kind : "experience", text },
    ]
    // The model is pure: try the save first, and when it would be refused keep the form open (with the text) and say why.
    const check = previewPlaybook(state, actions)
    if (check.error !== null) { setError(check.error); return }
    for (const a of actions) dispatch(playbookDispatch(a))
    onSaved(questionId, cat, check.next)
  }
  return <form ref={form} className="card pb-add" aria-labelledby={`${id}-title`} data-testid="pb-add" onSubmit={e => { e.preventDefault(); save() }}>
    <h2 id={`${id}-title`} className="pb-add-title">Add experience</h2>
    {existing
      ? <p className="pb-existing" data-testid="pb-existing">Answering: <b>{existing.text}</b> <button type="button" className="link" onClick={() => setExistingId(null)}>Ask a new question</button></p>
      : <>
        <label className="field"><span>Question</span>
          <input value={question} maxLength={MAX_QUESTION_TEXT} onChange={e => setQuestion(e.target.value)} autoFocus aria-describedby={`${id}-similar`} />
        </label>
        <div id={`${id}-similar`} aria-live="polite">
          {suggestions.length > 0 && <div className="pb-similar" data-testid="pb-similar">
            <p className="small muted">Similar questions</p>
            <ul>{suggestions.map(q => <li key={q.id}>
              <span id={`${id}-${q.id}`}>{q.text}</span>
              <button type="button" className="btn small" aria-describedby={`${id}-${q.id}`} onClick={() => { setExistingId(q.id); requestAnimationFrame(() => form.current?.querySelector("textarea")?.focus()) }}>Answer this existing question instead</button>
            </li>)}</ul>
          </div>}
        </div>
        <CategorySelect state={state} value={category} onChange={setCategory} />
      </>}
    <AnswerFields lead={viewer.lead} kind={kind} setKind={setKind} text={text} setText={setText} />
    {error && <p className="small late-text pb-error" role="alert">{error}</p>}
    <div className="action-row"><button className="btn btn-primary small" disabled={!ready}>Save</button><button type="button" className="btn small" onClick={onCancel}>Cancel</button></div>
  </form>
}
