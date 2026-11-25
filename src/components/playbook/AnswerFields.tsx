import { useId } from "react"
import { MAX_ANSWER_TEXT } from "../../data/playbook"

/** The answer part shared by "Add an answer" (in a row) and "Add experience" (toolbar): kind (president/VP only), text, demo note. */
export function AnswerFields({ lead, kind, setKind, text, setText, autoFocus }: {
  lead: boolean
  kind: "club" | "experience"
  setKind: (k: "club" | "experience") => void
  text: string
  setText: (t: string) => void
  autoFocus?: boolean
}) {
  const id = useId()
  return <>
    {lead && <fieldset className="field pb-kind">
      <legend>Answer type</legend>
      <div className="pb-radios">
        {(["experience", "club"] as const).map(k => <label key={k} className="pb-radio">
          <input type="radio" name={`${id}-kind`} value={k} checked={kind === k} onChange={() => setKind(k)} />
          {k === "club" ? "Club practice" : "Experience"}
        </label>)}
      </div>
    </fieldset>}
    <label className="field">
      <span>Answer</span>
      <textarea rows={3} maxLength={MAX_ANSWER_TEXT} value={text} onChange={e => setText(e.target.value)} autoFocus={autoFocus} aria-describedby={`${id}-note`} />
    </label>
    <p className="small muted pb-note" id={`${id}-note`}>{text.length}/{MAX_ANSWER_TEXT} · Demo: use fictional names only.</p>
  </>
}
