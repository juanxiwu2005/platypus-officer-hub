import { useEffect, useId, useState } from "react"
import { effortEditPatch, parseEffortDays } from "../../lib/workflowEffort"

/** Editing a number must not turn a temporary empty value into a saved zero. */
export function WorkflowEffortInput({ value, onCommit }: { value: number; onCommit: (patch: { estDays: number; startPolicy: "effort" }) => void }) {
  const [draft, setDraft] = useState(String(value))
  const [touched, setTouched] = useState(false)
  const errorId = useId()
  useEffect(() => { setDraft(String(value)); setTouched(false) }, [value])
  const invalid = parseEffortDays(draft) === null
  const showError = invalid && (draft !== "" || touched)
  return <label>Days of work
    <input type="number" inputMode="numeric" min={0} max={30} step={1} value={draft} aria-label="Days of work"
      aria-invalid={showError || undefined} aria-describedby={showError ? errorId : undefined}
      onBlur={() => setTouched(true)} onChange={e => {
        const raw = e.target.value
        setDraft(raw)
        const patch = effortEditPatch(raw)
        if (patch) onCommit(patch)
      }} />
    {showError && <span id={errorId} className="small late-text" role="alert">Enter a whole number from 0 to 30.</span>}
  </label>
}
