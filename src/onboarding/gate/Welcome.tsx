import { useNavigate } from "react-router-dom"
import { finishAttempt, markWelcomeSeen, startAttempt } from "../../lib/onboardingRecord"
import { onboardingCopy as copy } from "../copy"
import { FLOW_VERSION } from "../record"
import { currentSession } from "../../lib/studySession"

export function Welcome() {
  const navigate = useNavigate()
  // "Start" goes through /welcome/start, the one place that begins (and records) a walkthrough; "Replay walkthrough" in the Demo menu uses it too.
  const start = () => navigate("/welcome/start")
  const explore = () => { const id = startAttempt("explore", FLOW_VERSION, currentSession()?.id); finishAttempt(id, "explored"); markWelcomeSeen(); navigate("/") }
  return <section className="ob-card ob-welcome" aria-labelledby="ob-welcome-h">
    <h1 id="ob-welcome-h">{copy.welcomeTitle}</h1>
    <p className="ob-lead">{copy.welcomeLead}</p>
    <p>{copy.welcomeBody}</p>
    <p className="small muted" data-testid="welcome-demo">{copy.welcomeDemo}</p>
    <div className="ob-actions">
      <button type="button" className="btn btn-primary" onClick={start}>{copy.start}</button>
      <button type="button" className="btn btn-quiet" onClick={explore}>{copy.explore}</button>
    </div>
  </section>
}
