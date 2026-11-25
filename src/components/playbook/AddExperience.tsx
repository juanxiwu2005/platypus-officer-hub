import { useId, useRef, useState } from "react"
import { useStore } from "../../data/store"
import { liveQuestion, MAX_QUESTION_TEXT, newPlaybookId, playbookOf } from "../../data/playbook"
import { AnswerFields } from "./AnswerFields"
import { similarQuestions } from "../../lib/playbookMatch"
import { playbookDispatch } from "./shared"
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
  onSaved: (questionId: string, category: string) => void
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
  const ready = !!text.trim() && (!!existing || !!question.trim())
  const save = () => {
    if (!ready) return
    const cat = existing?.category ?? category
    let questionId = existing?.id
    if (!questionId) {
      questionId = newPlaybookId(state, "pq-")
      dispatch(playbookDispatch({ kind: "addQuestion", id: questionId, text: question, category: cat, roleIds }))
    }
    dispatch(playbookDispatch({ kind: "addAnswer", id: newPlaybookId(state, "pa-"), questionId, answerKind: viewer.lead ? kind : "experience", text }))
    onSaved(questionId, cat)
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
    <div className="action-row"><button className="btn btn-primary small" disabled={!ready}>Save</button><button type="button" className="btn small" onClick={onCancel}>Cancel</button></div>
  </form>
}
