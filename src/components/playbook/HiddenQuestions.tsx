import { useId, useState } from "react"
import { useStore } from "../../data/store"
import { QUESTIONS_PER_VIEW } from "../../data/playbook"
import type { PlaybookQuestion } from "../../data/types"
import { focusSoon, playbookDispatch, rowButton } from "./shared"

/**
 * "Hidden questions (N)": a quiet control for the president or VP only, listing the hidden questions with "Unhide". The list is
 * shown only on request and grows by QUESTIONS_PER_VIEW at a time, so it never adds many words to the page.
 * After an unhide the focus moves to the next hidden question's Unhide (else the previous one), else to the question's row,
 * else to `fallback` (the "Add experience" button).
 */
export function HiddenQuestions({ questions, fallback }: { questions: PlaybookQuestion[]; fallback: () => HTMLElement | null }) {
  const { dispatch } = useStore()
  const id = useId()
  const [open, setOpen] = useState(false)
  const [limit, setLimit] = useState(QUESTIONS_PER_VIEW)
  if (!questions.length) return null
  const shown = questions.slice(0, limit), more = Math.min(questions.length - shown.length, QUESTIONS_PER_VIEW)
  const unhide = (q: PlaybookQuestion) => {
    const i = questions.indexOf(q), next = questions[i + 1] ?? questions[i - 1]
    dispatch(playbookDispatch({ kind: "hideQuestion", questionId: q.id, hidden: false }))
    focusSoon(() => (next ? document.getElementById(`${id}-unhide-${next.id}`) : null) ?? rowButton(q.id) ?? fallback())
  }
  return <div className="pb-hidden-qs">
    <button type="button" className="link pb-more-answers" aria-expanded={open} aria-controls={open ? `${id}-list` : undefined} onClick={() => setOpen(!open)}>Hidden questions ({questions.length})</button>
    {open && <>
      <ul id={`${id}-list`} data-testid="pb-hidden-questions">
        {shown.map(q => <li key={q.id}>
          <span id={`${id}-text-${q.id}`} className="muted">{q.text}</span>
          <button type="button" id={`${id}-unhide-${q.id}`} className="btn small btn-quiet" aria-describedby={`${id}-text-${q.id}`} onClick={() => unhide(q)}>Unhide</button>
        </li>)}
      </ul>
      {more > 0 && <button type="button" className="link pb-more-answers" onClick={() => setLimit(limit + QUESTIONS_PER_VIEW)}>Show {more} more</button>}
    </>}
  </div>
}
