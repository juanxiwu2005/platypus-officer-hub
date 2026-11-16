import { useMemo } from "react"
import { REMINDER_MODES, reminderModeTestId } from "../../data/reminderMode"
import { useStore } from "../../data/store"
import type { ReminderMode as Mode } from "../../data/types"
import { onboardingCopy } from "../copy"
import { useOnboardingDraft } from "../draft"
import { useFlow } from "../engine/useFlow"
import { previewFor } from "./firstEvent/plan"
import { exampleReminder } from "./reminderMode/example"

const c = onboardingCopy.founder.reminders
const FIRST_EVENT = "founder.first-event"

/**
 * Founder screen "Reminders" (P3-H, Juanxi 2026-11-08), between First event and Confirm: how should reminders reach officers? It is a study
 * question, so nothing is chosen for the president: no option starts ticked, Continue waits for a choice, and Skip for now is the way not to
 * choose. The three options keep the fixed order of REMINDER_MODES. The answer lives in the draft (a reload keeps it) and Create my club stores
 * it as org.settings.reminderMode. Nothing is ever sent (IRB): the app's reminders stay drafts a person opens and sends.
 * The interaction log records every tick (`ui.change`, named by the option's title, with its data-testid) and the step events record time and skip.
 * FB-3 (docs/feedback-fix/PLAN.md 5.3, 12.5): an example reminder made from the president's own draft (dates from the rule engine), and under each
 * option its three steps, an analogy and what happens in Platypus. The option's old one-line text stays as the radio's screen-reader description.
 */
export function ReminderMode() {
  const { state } = useStore()
  const { draft, patch } = useOnboardingDraft()
  const flow = useFlow()
  const event = draft.skipped.includes(FIRST_EVENT) ? null : draft.event
  const example = useMemo(() => exampleReminder(draft.club, previewFor(state, draft.club, event, draft.date, draft.inviteCode, draft.steps, draft.buffer)),
    [state, draft.club, event, draft.date, draft.inviteCode, draft.steps, draft.buffer])
  const choose = (mode: Mode) => patch({ reminderMode: mode })
  // Skip for now: no answer. A choice made before is dropped, so the club starts without one and coming back shows nothing ticked.
  const skip = () => { patch({ reminderMode: null }); flow?.skip() }

  return <section className="ob-card ob-rm" aria-labelledby="ob-rm-h" data-testid="reminder-mode">
    <h1 id="ob-rm-h">{c.title}</h1>
    <p className="ob-why"><b>Why:</b> {c.why}</p>
    <figure className="fb3-rm-example" aria-label={c.exampleLabel} data-testid="reminder-example">
      <p>{example.text}</p>
    </figure>
    <div className="ob-rm-opts" role="radiogroup" aria-label={c.title}>
      {REMINDER_MODES.map(mode => <label key={mode} className="ob-rm-opt">
        <input type="radio" name="reminder-mode" value={mode} data-testid={reminderModeTestId(mode)} checked={draft.reminderMode === mode} onChange={() => choose(mode)}
          aria-labelledby={`ob-rm-${mode}`} aria-describedby={`ob-rm-${mode}-why`} />
        <span className="ob-rm-text">
          <span id={`ob-rm-${mode}`} className="ob-rm-title">{c.options[mode].title}</span>
          <span id={`ob-rm-${mode}-why`} hidden>{c.options[mode].body}</span>
          <span className="fb3-rm-steps" data-testid="reminder-steps">
            {/* An arrow stays with the step after it, so a narrow screen never leaves an arrow at the end of a line. */}
            {c.options[mode].steps.map((s, i) => i === 0
              ? <span key={s} className="fb3-rm-step">{s}</span>
              : <span key={s} className="fb3-rm-pair"><span className="fb3-rm-arrow" aria-hidden="true">→</span><span className="fb3-rm-step">{s}</span></span>)}
          </span>
          <span className="fb3-rm-like" data-testid="reminder-like">{c.options[mode].like}</span>
          <span className="fb3-rm-app" data-testid="reminder-in-app">{c.options[mode].inApp}</span>
        </span>
      </label>)}
    </div>
    <p className="small muted" data-testid="reminder-mode-demo">{c.demo}</p>
    <div className="ob-gt-nav">
      <button type="button" className="btn" onClick={() => flow?.back()}>{onboardingCopy.back}</button>
      <button type="button" className="btn btn-primary" disabled={!draft.reminderMode} onClick={() => flow?.next()}>{onboardingCopy.next}</button>
      <div className="ob-gt-skip"><button type="button" className="btn btn-quiet" onClick={skip}>{onboardingCopy.skip}</button></div>
    </div>
  </section>
}
