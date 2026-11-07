import { onboardingCopy } from "../../copy"

/** The bottom bar: Back on the left, the main button on the right (full width on a phone). It floats over the content and stays in reach. */
export function StepFooter({ onBack, onNext, label = onboardingCopy.next }: { onBack?: () => void; onNext?: () => void; label?: string }) {
  return <div className="ob-m-foot"><div className="ob-m-foot-in">
    {onBack && <button type="button" className="btn" onClick={onBack}>{onboardingCopy.back}</button>}
    <button type={onNext ? "button" : "submit"} className="btn btn-primary" onClick={onNext}>{label}</button>
  </div></div>
}
