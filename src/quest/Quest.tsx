import { useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type CSSProperties, type KeyboardEvent } from "react"
import { Link } from "react-router-dom"
import { questSchedule, type QuestClock } from "../engine/questSchedule"
import { useDragSort } from "../lib/dragSort"
import { fmtShort } from "../lib/dates"
import { POLICY_CATALOG } from "../data/policyCatalog"
import { QUEST_RULES } from "./ruleLibrary"
import { SCENES, TASKS, initialQuest, loadPractice, positionOf, questReducer, savePractice, slotKey, task, type QuestAction, type QuestState, type TaskId } from "./foundation"
import hqArt from "./assets/club-hq.png"
import pipArt from "./assets/pip-guide.png"
import wallArt from "./assets/countdown-clean.png"
import consequenceArt from "./assets/consequence-clean.png"
import "../styles/quest-foundation.css"

function restore(clock: QuestClock) {
  try { return loadPractice(window.localStorage, clock) } catch { return { state: initialQuest(clock), writable: false, notice: "Practice stays in this tab. Saving is unavailable." } }
}
export default function Quest() {
  const clock = useMemo(() => questSchedule(), [])
  const [loaded] = useState(() => restore(clock))
  const [state, dispatch] = useReducer((value: QuestState, action: QuestAction) => questReducer(value, action, clock), loaded.state)
  const [storageNotice, setStorageNotice] = useState(loaded.notice)
  const writable = useRef(loaded.writable)
  const [hintOpen, setHintOpen] = useState(false)
  const [whyOpen, setWhyOpen] = useState(false)
  const [selected, setSelected] = useState<TaskId | null>(null)
  const [cursor, setCursor] = useState(0)
  const [announce, setAnnounce] = useState("")
  const [sound, setSound] = useState(false)
  const focusTask = useRef<TaskId | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const outcomeHeading = useRef<HTMLHeadingElement>(null)
  const scene = SCENES[state.scene]
  useEffect(() => {
    if (!writable.current) return
    let saved = false
    try { saved = savePractice(window.localStorage, state) } catch { /* Access itself may be revoked between renders. */ }
    if (!saved) { writable.current = false; setStorageNotice("Practice stays in this tab. Saving is unavailable.") }
  }, [state])
  useEffect(() => { heading.current?.focus(); setWhyOpen(false); setHintOpen(false); setSelected(null) }, [state.scene])
  useEffect(() => { if (state.outcome) outcomeHeading.current?.focus() }, [state.outcome])
  useLayoutEffect(() => {
    if (focusTask.current && !state.outcome) {
      document.querySelector<HTMLButtonElement>(`[data-quest-task="${focusTask.current}"]`)?.focus({ preventScroll: true })
      focusTask.current = null
    }
  }, [state.board, state.outcome])
  const soundContext = useRef<AudioContext | null>(null)
  useEffect(() => () => { void soundContext.current?.close() }, [])
  const chime = () => {
    if (!sound) return
    try {
      const audio = soundContext.current ?? new AudioContext(); soundContext.current = audio
      void audio.resume()
      const tone = audio.createOscillator(), gain = audio.createGain()
      tone.connect(gain); gain.connect(audio.destination); tone.frequency.value = 440
      gain.gain.setValueAtTime(0.025, audio.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.12)
      tone.start(); tone.stop(audio.currentTime + 0.12)
    } catch { /* Captions and interaction are identical when audio is unavailable. */ }
  }
  const place = (id: TaskId, dest: string, before: TaskId | null = null) => {
    dispatch({ type: "move", id, dest, before }); setSelected(null); focusTask.current = id
    setAnnounce(`${task(id).label}: ${dest === "tray" ? "not scheduled" : `${dest.slice(4)} days before the event`}.`)
    chime()
  }
  const drag = useDragSort({
    onDrop: (id, target) => { if (TASKS.some(t => t.id === id)) place(id as TaskId, target.dest, target.before as TaskId | null) },
    onNudge: (id, direction) => {
      const value = id as TaskId, from = positionOf(state.board, value)
      const index = from ? clock.slots.indexOf(from.day) : -1
      const next = Math.max(0, Math.min(clock.slots.length - 1, index + direction))
      place(value, slotKey(clock.slots[next]))
      return `${task(value).label}: ${clock.slots[next]} days before the event.`
    },
  })
  const activeTask = selected ?? drag.draggingId
  const deadline = activeTask === "registry" || activeTask === "room" || activeTask === "ritm" ? clock.deadlines[activeTask] : null
  const pick = (id: TaskId) => {
    setSelected(id); const position = positionOf(state.board, id)
    setCursor(position ? clock.slots.indexOf(position.day) : 0)
    setAnnounce(`${task(id).label} selected. Choose a day, or use arrows and Enter.`)
  }
  const key = (event: KeyboardEvent<HTMLButtonElement>, id: TaskId) => {
    if (event.altKey) { drag.cardProps(id).onKeyDown(event); return }
    if (event.key === "Escape") { setSelected(null); setAnnounce("Placement cancelled."); return }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      if (selected === id) place(id, slotKey(clock.slots[cursor])); else pick(id)
    } else if (selected === id && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
      event.preventDefault()
      const next = event.key === "Home" ? 0 : event.key === "End" ? clock.slots.length - 1 : Math.max(0, Math.min(clock.slots.length - 1, cursor + (["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1)))
      setCursor(next); setAnnounce(`${clock.slots[next]} days before the event. Enter to place.`)
      document.querySelector(`[data-drop-col="${slotKey(clock.slots[next])}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest" })
    }
  }
  const showRules = selected ? task(selected).rules : state.outcome?.failedRuleIds.length ? state.outcome.failedRuleIds : SCENES.countdown.ruleIds
  const hintRule = QUEST_RULES.find(rule => rule.id === showRules[0])
  const check = () => { setSelected(null); setWhyOpen(false); dispatch({ type: "check" }); chime() }
  const rewind = () => { const id = state.outcome?.taskId; dispatch({ type: "rewind" }); if (id) focusTask.current = id; setAnnounce("Plan restored. Change a task and try again."); setWhyOpen(false) }
  const renderTask = (id: TaskId) => <button key={id} type="button" {...drag.cardProps(id)} data-quest-task={id}
    className={`quest-task${selected === id ? " is-selected" : ""}${drag.draggingId === id ? " is-dragged" : ""}`}
    aria-pressed={selected === id} aria-describedby="quest-keys" onClick={() => pick(id)} onKeyDown={event => key(event, id)}>
    <span className="quest-task-mark" aria-hidden="true">{task(id).symbol}</span><span>{task(id).label}</span>
  </button>
  return <main id="main" className="quest" data-testid="quest" tabIndex={-1}>
    <header className="quest-header">
      <Link className="quest-exit" to="/" aria-label="Return to Platypus">← <span>Platypus</span></Link>
      <button type="button" className="quest-wordmark" onClick={() => dispatch({ type: "scene", scene: "hq" })}>Mission: Speaker Night</button>
      <div className="quest-header-controls"><button type="button" aria-pressed={sound} onClick={() => setSound(v => !v)}>{sound ? "Sound on" : "Sound off"}</button><span title="Dialogue captions always visible" aria-label="Captions on">CC</span></div>
    </header>
    <div className="quest-body">
      <div className="quest-scene-heading"><div><p className="quest-kicker">{state.scene === "hq" ? "Your next chapter" : "Mission 02 · Countdown Wall"}</p><h1 tabIndex={-1} ref={heading}>{scene.title}</h1></div>
        <nav aria-label="Quest scenes"><button type="button" aria-current={state.scene === "hq" ? "page" : undefined} onClick={() => dispatch({ type: "scene", scene: "hq" })}>HQ</button><button type="button" aria-current={state.scene === "countdown" ? "page" : undefined} onClick={() => dispatch({ type: "scene", scene: "countdown" })}>Countdown Wall</button></nav>
      </div>
      {storageNotice && <p className="quest-storage" role="status">{storageNotice}</p>}
      {state.scene === "hq" ? <section className="quest-hq" aria-label="Club headquarters">
        <div className="quest-hq-art"><img src={hqArt} alt="Alex, Taylor, Morgan, Riley, Sam and Dr. Lee in the approved warm teal Club HQ" /></div>
        <div className="quest-hq-caption"><div><span className="quest-kicker">{clock.horizon} days · One speaker night</span><h2>Meet your crew. Make the night happen.</h2><p>{scene.instruction}</p></div><button type="button" className="quest-primary" onClick={() => dispatch({ type: "scene", scene: "countdown" })}>{state.board.tray.length === TASKS.length ? "Start at the wall" : "Continue your plan"} <span aria-hidden="true">↗</span></button></div>
        <div className="quest-stations"><button type="button" onClick={() => dispatch({ type: "scene", scene: "countdown" })}><span>01 / Start here</span><strong>Countdown Wall</strong><span>Put the night in motion ↗</span></button>{["Money Desk", "Comms", "Venue Table"].map((label, index) => <div key={label}><span>0{index + 2} / Later mission</span><strong>{label}</strong><span>Part of the next chapter</span></div>)}</div>
      </section> : <section className="quest-countdown" aria-label="Countdown Wall interaction">
        {state.outcome ? <section className={`quest-outcome${state.outcome.passed ? " is-success" : ""}`} aria-label="Plan outcome">
          <div className={state.outcome.passed ? "quest-hq-art" : undefined}><img className="quest-outcome-art" src={state.outcome.passed ? hqArt : consequenceArt} alt={state.outcome.passed ? "The crew welcomes the successful plan" : "Riley and Morgan beside a cancelled room booking"} /></div>
          <div className="quest-outcome-caption">
            <p className="quest-kicker">{state.outcome.passed ? "The story moves forward" : "See what happens"}</p><h2 ref={outcomeHeading} tabIndex={-1}>{state.outcome.passed ? "Date locked." : "A night worth rewinding."}</h2><p role="status">{state.outcome.message}</p>
            <div className="quest-actions"><button type="button" className="quest-primary" onClick={state.outcome.passed ? () => dispatch({ type: "scene", scene: "hq" }) : rewind}>{state.outcome.passed ? "Back to HQ" : "↶ Rewind"}</button><button type="button" onClick={() => setWhyOpen(v => !v)} aria-expanded={whyOpen}>Why?</button><button type="button" onClick={() => { dispatch({ type: "restart" }); setAnnounce("A new rehearsal. Earlier attempts are kept.") }}>New rehearsal</button></div>
          </div>
        </section> : <>
          <div className="quest-wall-scene" style={{ "--quest-wall-art": `url("${wallArt}")` } as CSSProperties}>
            <div className="quest-board-surface">
              <div className="quest-board-title"><strong>{clock.horizon} DAYS <span aria-hidden="true">→</span> EVENT DAY</strong><span>{TASKS.length - state.board.tray.length}/{TASKS.length} placed</span></div>
              <p className="quest-instruction">{scene.instruction}</p>
              <div className="quest-timeline" data-drag-scroll aria-label="Days before the event">
                {clock.slots.map((day, index) => <div key={day} data-drop-col={slotKey(day)} className={`quest-day${drag.over?.dest === slotKey(day) ? " is-over" : ""}${selected && cursor === index ? " is-target" : ""}${deadline && day < deadline.daysBefore ? " is-late" : ""}`}>
                  <button type="button" className="quest-day-label" onClick={() => { if (selected) place(selected, slotKey(day)); else setAnnounce("Choose a task first.") }}><span className="sr-only">Place selected task</span>{" "}<strong>{day || "★"}</strong>{" "}<span>{day ? "days" : "Event"}</span>{" "}<span className="sr-only">before the event, {fmtShort(clock.dates[day])}</span></button>
                  <div className="quest-day-tasks">{state.board[slotKey(day)].map(renderTask)}</div>
                  {deadline && day < deadline.daysBefore && <span className="quest-day-warning">Too late</span>}
                </div>)}
              </div>
              <div data-drop-col="tray" className={`quest-tray${drag.over?.dest === "tray" ? " is-over" : ""}`} aria-label="Unscheduled tasks">{state.board.tray.map(renderTask)}{!state.board.tray.length && <span>Everyone has a place in the plan.</span>}</div>
            </div>
          </div>
          <div className="quest-plan-actions"><p id="quest-keys">{selected ? `${task(selected).label} selected. Choose a day.` : "Tap a task, then a day. Or drag."}<span className="quest-key-hint">Keyboard: Enter, arrows, Enter. Escape cancels.</span></p><div className="quest-actions"><button type="button" onClick={() => setWhyOpen(v => !v)} aria-expanded={whyOpen}>Why?</button><button type="button" className="quest-primary" disabled={state.board.tray.length > 0} onClick={check}>Run the night <span aria-hidden="true">↗</span></button></div></div>
        </>}
        {whyOpen && <aside className="quest-why" aria-label="Why this rule matters"><div><h2>Behind the moment</h2><button type="button" onClick={() => setWhyOpen(false)} aria-label="Close rule explanation">×</button></div>{QUEST_RULES.filter(rule => showRules.includes(rule.id)).map(rule => <section key={rule.id}><h3>{rule.summary}</h3>{rule.sources.map(source => { const record = POLICY_CATALOG.find(item => item.recordId === source.record); return <blockquote key={`${source.record}-${source.line}`}><p>{source.quote}</p><cite>{source.record} · line {source.line}{source.section ? ` · ${source.section}` : ""}{record?.sourceUrl && <> · <a href={record.sourceUrl} target="_blank" rel="noreferrer">Open source ↗</a></>}</cite></blockquote> })}</section>)}<p className="quest-calendar-note">Closed days move earlier. Dates follow the event calendar.</p></aside>}
      </section>}
      <div className="quest-guide"><div className="quest-hint" role="status" hidden={!hintOpen}>{state.scene === "hq" ? "Your crew is ready. Start with the wall." : hintRule?.hint}</div><button type="button" className="quest-pip" onClick={() => setHintOpen(v => !v)} aria-label="Pip's hint" aria-expanded={hintOpen}><img src={pipArt} alt="" /></button></div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">{announce || drag.announce}</p>
    </div>
  </main>
}
