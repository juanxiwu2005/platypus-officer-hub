import { useEffect, useState } from "react"
import { AI_WAIT_MS, aiBudgetMs } from "../lib/api"

/** After this many seconds the wait card adds how long a complex question can take. */
export const AI_WAIT_SLOW_S = 10

/**
 * FB-1: a visible wait for one AI request (docs/feedback-fix/PLAN.md 3.3). A spinner, "Thinking… 12 s" counting up every
 * second, and a button that stops waiting at once (Stop in Ask, Skip AI line in the reminder composer). After 10 s it adds
 * "Complex questions can take up to N s.", N being the server's budget from /api/health (30 s while unknown).
 * Screen readers hear one sentence when it appears; the counter and the later line are hidden from them, so nothing is
 * announced every second. Reusable: the constitution reader, handbook draft and "Plan it" can use it next.
 */
export function AiWait({ onStop, stopLabel = "Stop", stopTestId, label = "Thinking…", testId = "ai-wait" }: {
  onStop: () => void
  stopLabel?: string
  stopTestId?: string
  label?: string
  testId?: string
}) {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const started = Date.now()
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000)
    return () => clearInterval(timer)
  }, [])
  const upTo = Math.round((aiBudgetMs() ?? AI_WAIT_MS) / 1000)
  return <div className="ai-wait fb-ai-wait" data-testid={testId}>
    <span className="spin" aria-hidden="true" />
    <span className="fb-ai-wait-text">
      <span className="sr-only" role="status">{`Platypus is thinking. This can take up to ${upTo} seconds. You can ${stopLabel.toLowerCase()} at any time.`}</span>
      <b aria-hidden="true">{label} <span className="fb-ai-wait-time" data-testid="ai-wait-seconds">{seconds} s</span></b>
      {seconds >= AI_WAIT_SLOW_S && <small aria-hidden="true" data-testid="ai-wait-slow">Complex questions can take up to {upTo} s.</small>}
    </span>
    <button type="button" className="btn small" onClick={onStop} data-testid={stopTestId}>{stopLabel}</button>
  </div>
}
