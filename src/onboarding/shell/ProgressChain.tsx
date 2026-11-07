import { onboardingCopy } from "../copy"
import type { FlowStep } from "../engine/flows"

/** The product's own chain of connected dots, used as progress: the line to a finished step grows in, skipped steps are hollow and dashed. */
export function ProgressChain({ steps, index, skipped }: { steps: FlowStep[]; index: number; skipped: string[] }) {
  return <ol className="ob-chain" aria-label={onboardingCopy.progress}>
    {steps.map((s, i) => {
      const state = i === index ? "now" : skipped.includes(s.id) ? "skipped" : i < index ? "done" : "todo"
      return <li key={s.id} className={`ob-dot is-${state}`} aria-current={i === index ? "step" : undefined}>
        <span className="ob-dot-mark" aria-hidden="true" />
        <span className="sr-only">{s.label}{state === "skipped" ? ", skipped" : state === "done" ? ", done" : ""}{s.optional && state === "todo" ? ", optional" : ""}</span>
      </li>
    })}
  </ol>
}
