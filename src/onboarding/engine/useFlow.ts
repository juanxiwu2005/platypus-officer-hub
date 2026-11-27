import { useCallback, useMemo } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { back as stepBack, forward as stepForward, skip as stepSkip, type OnEvent, type StepState } from "./steps"
import { FLOWS, stepAt, type FlowStep } from "./flows"
import { endWalkthrough, recordEvent } from "../record"
import { useOnboardingDraft } from "../draft"

export interface FlowApi {
  steps: FlowStep[]; index: number; current: FlowStep; skipped: string[]
  next: () => void; back: () => void; skip: () => void; exit: () => void
}

/**
 * The step machine for a flow screen, driven by the route. Screens call next/back/skip; this moves the route, keeps the skipped list in the
 * walkthrough draft, and reports enter/back/skip/complete/exit to the browser-only record (src/lib/onboardingRecord.ts). Returns null off a flow screen.
 */
export function useFlow(): FlowApi | null {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { draft, patch, clear } = useOnboardingDraft()
  const at = stepAt(pathname)
  const flow = at?.flow, index = at?.index ?? 0
  const steps = flow ? FLOWS[flow] : null
  const ids = useMemo(() => steps?.map(s => s.id) ?? [], [steps])
  const onEvent: OnEvent = useCallback((step, event) => recordEvent(step, event), [])
  const go = useCallback((state: StepState, done: boolean) => {
    if (done) { endWalkthrough("completed"); clear(); navigate("/", { replace: false }); return }
    const target = steps?.find(s => s.id === state.current)
    if (target) navigate(`/welcome/${target.path}`)
  }, [clear, navigate, steps])
  if (!steps || !flow) return null
  const state = (): StepState => ({ current: steps[index].id, visited: ids.slice(0, index + 1), skipped: draft.skipped, complete: false })
  return {
    steps, index, current: steps[index], skipped: draft.skipped,
    // Continuing from a step that was skipped earlier (Skip, then Back, then Continue) means it is no longer skipped: the chain and Start workspace follow.
    next: () => { const id = steps[index].id; if (draft.skipped.includes(id)) patch({ skipped: draft.skipped.filter(x => x !== id) }); const s = stepForward(state(), ids, onEvent); go(s, s.complete) },
    back: () => go(stepBack(state(), ids, onEvent), false),
    skip: () => { if (!steps[index].optional) return; const s = stepSkip(state(), ids, onEvent); patch({ skipped: s.skipped }); go(s, s.complete) },
    // Exit and Keep current demo end the attempt: the saved draft goes too, so the next visit starts fresh.
    exit: () => { recordEvent(steps[index].id, "exit"); endWalkthrough("exited"); clear(); navigate("/") },
  }
}
