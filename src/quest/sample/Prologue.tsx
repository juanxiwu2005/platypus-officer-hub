/** Skippable captioned prologue for the Mission: Speaker Night sample. Parent persists shot and owns sound. */
import { useEffect, useRef, useState } from "react"
import type { QuestClock } from "../../engine/questSchedule"
import { prefersReducedMotion, tokenMs } from "../../lib/motion"
import emptyArt from "../assets/prologue-empty.png"
import crewArt from "../assets/club-hq.png"
import "../../styles/quest-prologue.css"
import { PROLOGUE_SHOTS } from "./story"

export interface PrologueProps { shot: number; clock: QuestClock; onShot: (n: number) => void; onFinish: () => void }

/** Last shot index; advancing past it finishes the prologue instead of calling onShot(4). */
const LAST_SHOT = PROLOGUE_SHOTS.length - 1

export function Prologue({ shot, clock, onShot, onFinish }: PrologueProps) {
  const [started, setStarted] = useState(false)
  const [paused, setPaused] = useState(true)
  const [reduced, setReduced] = useState(prefersReducedMotion)
  const nextRef = useRef(() => {})
  nextRef.current = () => (shot < LAST_SHOT ? onShot(shot + 1) : onFinish())

  // Nominal 10s auto-advance; cleaned up on pause, reduced motion, hidden tab, shot change and unmount.
  useEffect(() => {
    if (!started || paused || reduced) return
    const id = window.setTimeout(() => nextRef.current(), tokenMs("--dur-quest-shot", 10000))
    return () => window.clearTimeout(id)
  }, [started, paused, reduced, shot])

  // A hidden tab pauses and stays paused until an explicit Resume.
  useEffect(() => {
    const onHide = () => { if (document.hidden) setPaused(true) }
    document.addEventListener("visibilitychange", onHide)
    return () => document.removeEventListener("visibilitychange", onHide)
  }, [])

  // Activating reduced motion forces paused so switching back never auto-resumes.
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const onChange = () => { setReduced(query.matches); if (query.matches) setPaused(true) }
    query.addEventListener("change", onChange)
    return () => query.removeEventListener("change", onChange)
  }, [])

  const advance = () => (shot < LAST_SHOT ? onShot(shot + 1) : onFinish())
  const toggle = () => {
    if (reduced) { setStarted(true); return } // manual stills; no timer ever runs
    if (!started || paused) { setStarted(true); setPaused(false) } else setPaused(true)
  }
  const current = PROLOGUE_SHOTS[Math.min(Math.max(shot, 0), LAST_SHOT)]
  const running = started && !paused && !reduced
  const label = reduced ? (started ? "Manual frames" : "Play") : running ? "Pause" : started ? "Resume" : "Play"

  return (
    <div>
      <figure className={`sample-story-frame${current.image === "crew" ? " is-crew" : ""}${running ? " is-running" : ""}`}>
        <img key={shot} src={current.image === "empty" ? emptyArt : crewArt} alt="" className="sample-story-still" />
        <figcaption className="sample-story-caption">
          <p>{current.caption.replace("{days}", String(clock.horizon))}</p>
          <span className="sample-story-counter">{Math.min(Math.max(shot, 0), LAST_SHOT) + 1}/{PROLOGUE_SHOTS.length}</span>
        </figcaption>
      </figure>
      <div className="quest-actions">
        <button type="button" className="quest-primary" onClick={toggle}>{label}</button>
        <button type="button" onClick={advance}>Next frame</button>
        <button type="button" onClick={onFinish}>Skip intro</button>
      </div>
    </div>
  )
}
