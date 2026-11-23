/** Readonly Club HQ hub for the Mission: Speaker Night sample. Parent owns all state; this component never writes history. */
import clubArt from "../assets/club-hq.png"
import "../../styles/quest-story.css"
import { canEnter, type SampleScene, type SampleState } from "./model"

export interface ClubHQProps {
  state: SampleState
  onGo: (scene: SampleScene) => void
  onDownload: () => void
  onRestart: () => void
}

interface Gauge { id: string; label: string; ready: string; pending: string; done: boolean }

/** Seven semantic chapters; only Date (after advisor) and Venue can light up in this sample. */
const CHAPTERS = ["Crew", "Date", "Budget", "Speaker", "Venue", "Showtime", "Handoff"] as const

export function ClubHQ({ state, onGo, onRestart, onDownload }: ClubHQProps) {
  /** Mission 2 is complete only with all three stage ids; advisor alone is necessary but insufficient. */
  const fullDate = (["booking", "timeline", "advisor"] as const).every(stage => state.completed.includes(stage))
  const venueDone = state.completed.includes("venue")
  const handoffOpen = canEnter(state, "handoff")
  const gauges: readonly Gauge[] = [
    { id: "turnout", label: "Turnout", ready: "Ready", pending: "Preparing", done: fullDate },
    { id: "budget", label: "Budget", ready: "Within cap", pending: "Planning", done: state.completed.includes("promotion") },
    { id: "safety", label: "Safety", ready: "Room ready", pending: "Checks pending", done: venueDone },
  ]
  return (
    <div className="sample-hq">
      <figure className="quest-hq">
        <div className="quest-hq-art"><img src={clubArt} alt="" /></div>
        <figcaption className="quest-hq-caption">
          <div>
            <p className="quest-kicker">Club HQ</p>
            <h2>Your crew. Your next move.</h2>
            {fullDate && venueDone ? <p>Date locked. Room ready. More chapters ahead.</p> : null}
          </div>
          <div className="quest-actions sample-hq-actions">
            <button type="button" className="quest-primary" onClick={() => onGo("prologue")}>Replay intro</button>
            <button type="button" onClick={onRestart}>New rehearsal</button>
            {state.plans.length > 0 ? <button type="button" onClick={onDownload}>Download saved plan</button> : null}
          </div>
        </figcaption>
      </figure>
      <div className="quest-stations">
        <button type="button" onClick={() => onGo("booking")}>
          <span>Workstation</span><strong>Countdown Wall</strong><span>Lock the date</span>
        </button>
        <button type="button" disabled={!handoffOpen} onClick={() => onGo("handoff")}>
          <span>Workstation</span><strong>Venue Table</strong><span>{handoffOpen ? "Open the handoff" : "Later chapter"}</span>
        </button>
        <div><span>Workstation</span><strong>Money Desk</strong><span>Later chapter</span></div>
        <div><span>Workstation</span><strong>Comms</strong><span>Later chapter</span></div>
      </div>
      <ul className="sample-hq-gauges">
        {gauges.map(gauge => (
          <li key={gauge.id}>
            <span>{gauge.label}</span>
            <span className={`sample-hq-fill${gauge.done ? " is-on" : ""}`} aria-hidden="true" />
            <span>{gauge.done ? gauge.ready : gauge.pending}</span>
          </li>
        ))}
      </ul>
      <ol className="sample-hq-rail" aria-label="Chapters">
        {CHAPTERS.map(chapter => {
          const lit = chapter === "Date" ? fullDate : chapter === "Venue" ? venueDone : false
          return <li key={chapter} className={lit ? "is-lit" : "is-later"}>{chapter}{lit ? " · Ready" : " · Later"}</li>
        })}
      </ol>
    </div>
  )
}
