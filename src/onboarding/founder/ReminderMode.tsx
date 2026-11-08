import { REMINDER_MODES, reminderModeTestId } from "../../data/reminderMode"
import type { ReminderMode as Mode } from "../../data/types"
import { onboardingCopy } from "../copy"
import { useOnboardingDraft } from "../draft"
import { useFlow } from "../engine/useFlow"

const c = onboardingCopy.founder.reminders

/**
 * Founder screen "Reminders" (P3-H, Juanxi 2026-11-08), between First event and Confirm: how should reminders reach officers? It is a study
 * question, so nothing is chosen for the president: no option starts ticked, Continue waits for a choice, and Skip for now is the way not to
 * choose. The three options keep the fixed order of REMINDER_MODES. The answer lives in the draft (a reload keeps it) and Start workspace stores
 * it as org.settings.reminderMode. Nothing is ever sent (IRB): the app's reminders stay drafts a person opens and sends.
 * The interaction log records every tick (`ui.change`, named by the option's title, with its data-testid) and the step events record time and skip.
 */
export function ReminderMode() {
  const { draft, patch } = useOnboardingDraft()
  const flow = useFlow()
  const choose = (mode: Mode) => patch({ reminderMode: mode })
  // Skip for now: no answer. A choice made before is dropped, so the club starts without one and coming back shows nothing ticked.
  const skip = () => { patch({ reminderMode: null }); flow?.skip() }

  return <section className="ob-card ob-rm" aria-labelledby="ob-rm-h" data-testid="reminder-mode">
    <h1 id="ob-rm-h">{c.title}</h1>
    <p className="ob-lead">{c.lead}</p>
    <div className="ob-rm-opts" role="radiogroup" aria-label={c.title}>
      {REMINDER_MODES.map(mode => <label key={mode} className="ob-rm-opt">
        <input type="radio" name="reminder-mode" value={mode} data-testid={reminderModeTestId(mode)} checked={draft.reminderMode === mode} onChange={() => choose(mode)}
          aria-labelledby={`ob-rm-${mode}`} aria-describedby={`ob-rm-${mode}-why`} />
        <span className="ob-rm-text"><span id={`ob-rm-${mode}`} className="ob-rm-title">{c.options[mode].title}</span><span id={`ob-rm-${mode}-why`} className="ob-rm-why">{c.options[mode].body}</span></span>
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
