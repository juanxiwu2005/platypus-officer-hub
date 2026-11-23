/** P5-09B isolated playable shell for the "Mission: Speaker Night" complete sample. No real app state, network, AI or business mutation. */
import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { questSchedule } from "../../engine/questSchedule"
import { evaluateWall, type TaskId } from "../foundation"
import { QUEST_RULES } from "../ruleLibrary"
import { ClubHQ, Prologue } from "./IntroHQ"
import OfficerScenes from "./OfficerScenes"
import CommsScenes from "./CommsScenes"
import Timeline from "./Timeline"
import VenueEditor from "./VenueEditor"
import SourceDialog from "./SourceDialog"
import RoomView from "./RoomView"
import { loadSample, saveSample } from "./storage"
import { SCENE_TITLES, STAGE_RULES } from "./story"
import { sampleReducer, type SampleAction } from "./transitions"
import { initialSample, STAGES, type SampleDraft, type SampleScene, type SampleStage, type SampleState } from "./model"
import pipArt from "../assets/pip-guide.png"
import hqArt from "../assets/club-hq.png"
import consequenceArt from "../assets/consequence-clean.png"
import "../../styles/quest-foundation.css"
import "../../styles/quest-sample.css"
/** The six venue source topics shown for the venue stage's Why button. */
const VENUE_SOURCE_IDS: readonly string[] = ["venue.capacity", "venue.exits", "venue.catering", "venue.theatre", "venue.accessibility", "venue.cables"]
const MEMORY_NOTICE = "Practice stays in this tab. Saving is unavailable."
export default function Sample() {
  const clock = useMemo(() => questSchedule(), [])
  const [loaded] = useState(() => {
    try { return loadSample(window.localStorage, clock) } catch { return { state: initialSample(clock), writable: false, notice: MEMORY_NOTICE } }
  })
  const [state, dispatch] = useReducer((value: SampleState, action: SampleAction) => sampleReducer(value, action, clock), loaded.state)
  const [storageNotice, setStorageNotice] = useState(loaded.notice)
  const writable = useRef(loaded.writable)
  const [sound, setSound] = useState(false)
  const [hintOpen, setHintOpen] = useState(false)
  const [sourceDialog, setSourceDialog] = useState<readonly string[] | null>(null)
  const [timelineFocus, setTimelineFocus] = useState<TaskId | null>(null)
  const heading = useRef<HTMLHeadingElement>(null), outcomeHeading = useRef<HTMLHeadingElement>(null), mainRef = useRef<HTMLElement>(null)
  const attemptStart = useRef(performance.now()), restoreFocus = useRef(false), chimed = useRef(0), soundContext = useRef<AudioContext | null>(null)
  useEffect(() => {
    if (!writable.current) return
    let saved = false
    try { saved = saveSample(window.localStorage, state) } catch { /* Access may be revoked mid-visit. */ }
    if (!saved) { writable.current = false; setStorageNotice(MEMORY_NOTICE) }
  }, [state])
  useEffect(() => { heading.current?.focus(); setHintOpen(false); setSourceDialog(null); setTimelineFocus(null); attemptStart.current = performance.now() }, [state.scene])
  useEffect(() => () => { void soundContext.current?.close() }, [])
  const stage: SampleStage | null = (STAGES as readonly string[]).includes(state.scene) ? state.scene as SampleStage : null
  const outcome = state.outcome
  const sourceIds = stage === null ? [] : stage === "venue" ? VENUE_SOURCE_IDS : STAGE_RULES[stage]
  const kicker = stage === null ? "Your next chapter" : stage === "booking" || stage === "timeline" || stage === "advisor" ? "Mission 02 · Speaker Night" : "Mission 05 · Speaker Night"
  let hint = ""
  if (state.scene === "prologue") hint = "Play, pause, or skip. Your progress stays yours."
  else if (state.scene === "hq") hint = "Your crew is ready. Start at the wall."
  else if (stage === "venue") hint = "Choose furniture, then a place. Clear all six room checks."
  else if (stage) hint = QUEST_RULES.find(rule => rule.id === (outcome && !outcome.passed && outcome.failed.length ? outcome.failed[0] : STAGE_RULES[stage][0]))?.hint ?? ""
  // Opt-in local oscillator chime: two rising tones on pass, one low drop on failure. Identical captions when audio is unavailable.
  const chime = useCallback((passed: boolean) => {
    if (!sound) return
    try {
      const audio = soundContext.current ?? new AudioContext(); soundContext.current = audio
      void audio.resume()
      const tone = (frequency: number, at: number) => { const osc = audio.createOscillator(), gain = audio.createGain(); osc.connect(gain); gain.connect(audio.destination); osc.frequency.value = frequency; gain.gain.setValueAtTime(0.025, audio.currentTime + at); gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + at + 0.12); osc.start(audio.currentTime + at); osc.stop(audio.currentTime + at + 0.12) }
      if (passed) { tone(660, 0); tone(880, 0.12) } else tone(220, 0)
    } catch { /* Audio unavailable; the outcome text is unchanged. */ }
  }, [sound])
  useEffect(() => {
    if (!outcome || chimed.current === outcome.number) return
    chimed.current = outcome.number
    outcomeHeading.current?.focus()
    chime(outcome.passed)
  }, [outcome, chime])
  useLayoutEffect(() => {
    if (restoreFocus.current && !state.outcome) { restoreFocus.current = false; mainRef.current?.querySelector<HTMLElement>("[data-rewind-focus]")?.focus({ preventScroll: true }) }
  }, [state.outcome])
  const go = useCallback((scene: SampleScene) => { if (scene === "prologue") dispatch({ type: "shot", shot: 0 }); dispatch({ type: "go", scene }) }, [])
  const onShot = useCallback((shot: number) => dispatch({ type: "shot", shot }), [])
  const finishIntro = useCallback(() => dispatch({ type: "skipIntro" }), [])
  const edit = useCallback((values: Partial<SampleDraft>) => dispatch({ type: "edit", values }), [])
  const next = useCallback(() => dispatch({ type: "next" }), [])
  const restart = useCallback(() => dispatch({ type: "restart" }), [])
  const check = useCallback(() => {
    setTimelineFocus(null); setSourceDialog(null); setHintOpen(false)
    dispatch({ type: "check", elapsedMs: performance.now() - attemptStart.current })
    attemptStart.current = performance.now()
  }, [])
  const rewind = useCallback(() => {
    if (state.scene === "timeline") setTimelineFocus(evaluateWall(state.wall, clock, 1).taskId)
    else restoreFocus.current = true
    dispatch({ type: "rewind" }); attemptStart.current = performance.now(); setSourceDialog(null)
  }, [state.scene, state.wall, clock])
  // Exports only the latest saved venue plan; no real event or app mutation.
  const download = useCallback(() => {
    const plan = state.plans.at(-1)
    if (!plan) return
    const url = URL.createObjectURL(new Blob([JSON.stringify({ practiceOnly: true, title: "Speaker Night practice proposal", eventDate: clock.eventDate, attempt: plan.number, layout: plan.layout, notice: "Venue staff confirm the reserved setup." })], { type: "application/json" }))
    const anchor = document.createElement("a")
    anchor.href = url; anchor.download = "speaker-night-practice-plan.json"; document.body.append(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url)
  }, [state.plans, clock.eventDate])
  return <main id="main" className="quest" data-testid="quest-sample" ref={mainRef} tabIndex={-1}>
    <header className="quest-header"><Link className="quest-exit" to="/" aria-label="Return to Platypus">← <span>Platypus</span></Link>
      <button type="button" className="quest-wordmark" onClick={() => go("hq")}>Mission: Speaker Night</button>
      <div className="quest-header-controls"><button type="button" aria-pressed={sound} onClick={() => setSound(value => !value)}>{sound ? "Sound on" : "Sound off"}</button><span title="Dialogue captions always visible" aria-label="Captions on">CC</span></div>
    </header><div className="quest-body"><div className="quest-scene-heading"><div><p className="quest-kicker">{kicker}</p><h1 tabIndex={-1} ref={heading}>{SCENE_TITLES[state.scene]}</h1></div>
        <nav aria-label="Quest scenes"><button type="button" aria-current={state.scene === "hq" ? "page" : undefined} onClick={() => go("hq")}>HQ</button>{sourceIds.length > 0 && <button type="button" onClick={() => setSourceDialog(sourceIds)} aria-expanded={sourceDialog !== null}>Why?</button>}</nav>
      </div>
      {storageNotice && <p className="quest-storage" role="status">{storageNotice}</p>}
      {state.scene === "prologue" && <section className="sample-shell-scene" aria-label="Story prologue"><Prologue shot={state.shot} clock={clock} onShot={onShot} onFinish={finishIntro} /></section>}
      {state.scene === "hq" && <ClubHQ state={state} onGo={go} onDownload={download} onRestart={restart} />}
      {stage && <section className="sample-shell-scene" aria-label={SCENE_TITLES[state.scene]} hidden={!!outcome || sourceDialog !== null}>
        {stage === "booking" || stage === "advisor" ? <OfficerScenes stage={stage} draft={state} onEdit={edit} onCheck={check} />
          : stage === "timeline" ? <Timeline board={state.wall} clock={clock} onChange={wall => edit({ wall })} onCheck={check} focusId={timelineFocus} />
          : stage === "handoff" || stage === "promotion" ? <CommsScenes stage={stage} draft={state} onEdit={edit} onCheck={check} />
          : <VenueEditor layout={state.venue} onChange={venue => edit({ venue })} onCheck={check} onExplain={id => setSourceDialog([`venue.${id}`])} />}
      </section>}
      {stage && outcome && (stage === "venue" ? <section className="sample-shell-outcome" aria-label="Practice outcome" hidden={sourceDialog !== null}>
        <RoomView layout={outcome.snapshot.venue} selected={null} tool={null} onSelect={() => { }} onMove={() => { }} onPlace={() => { }} arrivals={outcome.passed} />
        <div className="sample-shell-caption">
          <h2 tabIndex={-1} ref={outcomeHeading}>{outcome.passed ? "The story moves forward." : "A moment to rewind."}</h2>
          <p role="status">{outcome.message}</p>
          {outcome.passed && <p>A room ready for everyone.</p>}
          <div className="quest-actions"><button type="button" className="quest-primary" onClick={outcome.passed ? next : rewind}>{outcome.passed ? "Continue" : "Rewind"}</button></div>
        </div>
      </section> : <section className={`quest-outcome${outcome.passed ? " is-success" : ""}`} aria-label="Practice outcome" hidden={sourceDialog !== null}>
        <div className="quest-hq-art"><img className="sample-shell-art" src={stage === "timeline" && !outcome.passed ? consequenceArt : hqArt} alt={stage === "timeline" && !outcome.passed ? "Riley and Morgan beside a cancelled room booking" : "The crew together in Club HQ"} /></div>
        <div className="quest-outcome-caption">
          <h2 tabIndex={-1} ref={outcomeHeading}>{outcome.passed ? "The story moves forward." : "A moment to rewind."}</h2>
          <p role="status">{outcome.message}</p>
          <div className="quest-actions"><button type="button" className="quest-primary" onClick={outcome.passed ? next : rewind}>{outcome.passed ? "Continue" : "Rewind"}</button></div>
        </div>
      </section>)}
      {sourceDialog && <SourceDialog ids={sourceDialog} clock={clock} onClose={() => setSourceDialog(null)} />}
      <div className="quest-guide"><div className="quest-hint" role="status" hidden={!hintOpen}>{hint}</div><button type="button" className="quest-pip" onClick={() => setHintOpen(value => !value)} aria-label="Pip's hint" aria-expanded={hintOpen}><img src={pipArt} alt="" /></button></div>
    </div>
  </main>
}
