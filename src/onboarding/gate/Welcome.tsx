import { useNavigate } from "react-router-dom"
import { finishAttempt, markWelcomeSeen, startAttempt } from "../../lib/onboardingRecord"
import { onboardingCopy } from "../copy"

const FLOW_VERSION = "ob-1"

export function Welcome() {
  const navigate = useNavigate()
  const start = () => { startAttempt("start", FLOW_VERSION); navigate("/welcome/classic") }
  const explore = () => { const id = startAttempt("explore", FLOW_VERSION); finishAttempt(id, "explored"); markWelcomeSeen(); navigate("/") }
  return <section className="ob-card"><p className="eyebrow">Fictional sample club</p><h1>{onboardingCopy.welcomeTitle}</h1><p>Take a short walkthrough to see how your club can get organized.</p><div className="actions"><button type="button" className="btn btn-primary" onClick={start}>{onboardingCopy.start}</button><button type="button" className="btn" onClick={explore}>{onboardingCopy.explore}</button></div></section>
}
