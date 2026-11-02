import type { AnimationEvent, CSSProperties } from "react"
import { fmtShort } from "../../../lib/dates"
import { onboardingCopy } from "../../copy"
import type { ChainDot } from "./plan"

/**
 * The witness chain: connected dots, a step name and a rule-engine date under each (the same look as the Chain in the product). When `drawing`
 * is set the dots appear one after another and each line grows from the left (src/styles/ob-06-first-event.css); the parent remounts this
 * list with a new key to play it again, so a second press restarts it at once instead of queueing. Without `drawing` it is simply there.
 */
export function EventChain({ dots, today, drawing, stale, onDrawn }: { dots: ChainDot[]; today: string; drawing: boolean; stale: boolean; onDrawn: () => void }) {
  const last = dots.length - 1
  const done = (e: AnimationEvent<HTMLElement>) => { if (e.animationName === "ob6-dot-in" && e.currentTarget.dataset.last === "true") onDrawn() }
  return <div className="ob6-scroll" role="region" aria-label={onboardingCopy.founder.firstEvent.chainLabel} tabIndex={0}>
    <ol className={`ob6-chain${drawing ? " is-drawing" : ""}${stale ? " is-stale" : ""}`} data-testid="first-event-chain">
      {dots.map((d, i) => <li key={d.id} className={`ob6-node${d.date < today ? " is-past" : ""}`} style={{ "--i": i } as CSSProperties} data-last={i === last} onAnimationEnd={done}>
        <span className="ob6-dot" aria-hidden="true" />
        <span className="ob6-name">{d.title}</span>
        <time className="ob6-date" dateTime={d.date}>{fmtShort(d.date)}</time>
      </li>)}
    </ol>
  </div>
}
