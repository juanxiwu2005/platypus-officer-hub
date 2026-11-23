import { useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react"
import type { QuestClock } from "../../engine/questSchedule"
import { useDragSort } from "../../lib/dragSort"
import { fmtShort } from "../../lib/dates"
import { TASKS, moveTask, positionOf, slotKey, task, type Board, type TaskId } from "../foundation"
import wallArt from "../assets/countdown-clean.png"
import "../../styles/quest-foundation.css"

/** Controlled reusable Countdown Wall: the parent owns the board, checks, dates and scoring; this view owns only selection, cursor and announcements. */
export interface TimelineProps { board: Board; clock: QuestClock; onChange: (board: Board) => void; onCheck: () => void; focusId?: TaskId | null }

const label = (id: TaskId) => (id === "publicity" ? "Instagram teaser" : task(id).label)

export default function Timeline({ board, clock, onChange, onCheck, focusId = null }: TimelineProps) {
  const [selected, setSelected] = useState<TaskId | null>(null)
  const [cursor, setCursor] = useState(0)
  const [announce, setAnnounce] = useState("")
  const focusTask = useRef<TaskId | null>(null)
  const place = (id: TaskId, dest: string, before: TaskId | null = null) => {
    onChange(moveTask(board, id, dest, before)); setSelected(null); focusTask.current = id
    setAnnounce(`${label(id)}: ${dest === "tray" ? "not scheduled" : `${dest.slice(4)} days before the event`}.`)
  }
  const drag = useDragSort({
    onDrop: (id, target) => { if (TASKS.some(t => t.id === id)) place(id as TaskId, target.dest, target.before as TaskId | null) },
    onNudge: (id, direction) => {
      const value = id as TaskId, from = positionOf(board, value)
      const index = from ? clock.slots.indexOf(from.day) : -1
      const next = Math.max(0, Math.min(clock.slots.length - 1, index + direction))
      place(value, slotKey(clock.slots[next]))
      return `${label(value)}: ${clock.slots[next]} days before the event.`
    },
  })
  const activeTask = selected ?? (drag.draggingId as TaskId | null)
  const deadline = activeTask === "registry" || activeTask === "room" || activeTask === "ritm" ? clock.deadlines[activeTask] : null
  const pick = (id: TaskId) => {
    setSelected(id); const position = positionOf(board, id)
    setCursor(position ? clock.slots.indexOf(position.day) : 0)
    setAnnounce(`${label(id)} selected. Choose a day, or use arrows and Enter.`)
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
  useLayoutEffect(() => {
    if (focusTask.current) { document.querySelector<HTMLButtonElement>(`[data-quest-task="${focusTask.current}"]`)?.focus({ preventScroll: true }); focusTask.current = null }
  }, [board])
  useLayoutEffect(() => { if (focusId) document.querySelector<HTMLButtonElement>(`[data-quest-task="${focusId}"]`)?.focus({ preventScroll: true }) }, [focusId])
  const renderTask = (id: TaskId) => <button key={id} type="button" {...drag.cardProps(id)} data-quest-task={id}
    className={`quest-task${selected === id ? " is-selected" : ""}${drag.draggingId === id ? " is-dragged" : ""}`}
    aria-pressed={selected === id} aria-describedby="quest-keys" onClick={() => pick(id)} onKeyDown={event => key(event, id)}>
    <span className="quest-task-mark" aria-hidden="true">{task(id).symbol}</span><span>{label(id)}</span>
  </button>
  return <section className="quest-countdown" aria-label="Countdown Wall interaction" data-testid="timeline">
    <div className="quest-wall-scene" style={{ "--quest-wall-art": `url("${wallArt}")` } as CSSProperties}>
      <div className="quest-board-surface">
        <div className="quest-board-title"><strong>{clock.horizon} DAYS <span aria-hidden="true">→</span> EVENT DAY</strong><span>{TASKS.length - board.tray.length}/{TASKS.length} placed</span></div>
        <p className="quest-instruction">Place tasks before their deadlines. Keep the handoffs in order.</p>
        <div className="quest-timeline" data-drag-scroll aria-label="Days before the event">
          {clock.slots.map((day, index) => <div key={day} data-drop-col={slotKey(day)} className={`quest-day${drag.over?.dest === slotKey(day) ? " is-over" : ""}${selected && cursor === index ? " is-target" : ""}${deadline && day < deadline.daysBefore ? " is-late" : ""}`}>
            <button type="button" className="quest-day-label" onClick={() => { if (selected) place(selected, slotKey(day)); else setAnnounce("Choose a task first.") }}><span className="sr-only">Place selected task</span>{" "}<strong>{day || "★"}</strong>{" "}<span>{day ? "days" : "Event"}</span>{" "}<span className="sr-only">before the event, {fmtShort(clock.dates[day])}</span></button>
            <div className="quest-day-tasks">{board[slotKey(day)].map(renderTask)}</div>
            {deadline && day < deadline.daysBefore && <span className="quest-day-warning">Too late</span>}
          </div>)}
        </div>
        <div data-drop-col="tray" className={`quest-tray${drag.over?.dest === "tray" ? " is-over" : ""}`} aria-label="Unscheduled tasks">{board.tray.map(renderTask)}{!board.tray.length && <span>Everyone has a place in the plan.</span>}</div>
      </div>
    </div>
    <div className="quest-plan-actions"><p id="quest-keys">{selected ? `${label(selected)} selected. Choose a day.` : "Tap a task, then a day. Or drag."}<span className="quest-key-hint">Keyboard: Enter, arrows, Enter. Escape cancels.</span></p><div className="quest-actions"><button type="button" className="quest-primary" disabled={board.tray.length > 0} onClick={() => { setSelected(null); onCheck() }}>Rehearse timeline <span aria-hidden="true">↗</span></button></div></div>
    <p className="sr-only" aria-live="polite" aria-atomic="true">{announce || drag.announce}</p>
  </section>
}
