import { useRef, useState, type PointerEvent } from "react"
import type { WorkflowBranch } from "../../data/types"
import { workflowStepKind } from "../../engine/workflowStepKind"
import { taskDragBlockReason, tLabel } from "./model"
import { TIMELINE_PIXELS_PER_DAY, type TaskBox } from "./timeline"

interface Drag { pointer: number; x: number; y: number; active: boolean; blocked: boolean }
const DRAG_THRESHOLD = 7

/** Pointer capture keeps a horizontal card drag intact while blank lanes retain native scrolling. */
export function TimelineTask({ box, branches, selected, roleLabel, connecting, onSelect, onShift, onBlocked }: { box: TaskBox; branches?: WorkflowBranch[]; selected: boolean; roleLabel: string; connecting: boolean; onSelect: () => void; onShift: (calendarDays: number) => void; onBlocked: (message: string) => void }) {
  const gesture = useRef<Drag | null>(null)
  const suppressClick = useRef(false)
  const [shift, setShift] = useState(0)
  const blocked = taskDragBlockReason(box.step)
  const reset = () => { gesture.current = null; setShift(0) }
  const down = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || connecting) return
    suppressClick.current = false
    gesture.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, active: false, blocked: false }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const drag = gesture.current
    if (!drag || drag.pointer !== event.pointerId) return
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y
    if (!drag.active) {
      if (Math.abs(dx) < DRAG_THRESHOLD || Math.abs(dx) <= Math.abs(dy)) return
      drag.active = true
      suppressClick.current = true
      if (blocked) { drag.blocked = true; onBlocked(blocked) }
    }
    event.preventDefault()
    if (!drag.blocked) setShift(Math.round(dx / TIMELINE_PIXELS_PER_DAY))
  }
  const up = (event: PointerEvent<HTMLDivElement>) => {
    const drag = gesture.current
    if (!drag || drag.pointer !== event.pointerId) return
    const days = Math.round((event.clientX - drag.x) / TIMELINE_PIXELS_PER_DAY)
    reset()
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (drag.active && !drag.blocked && days) onShift(days)
  }
  return <div data-testid={`workflow-task-${box.step.key}`}
    title={blocked ?? "Drag horizontally to move the target by calendar days, or click to edit."}
    className={`wfb-task ${workflowStepKind(box.step, branches) === "situation" ? "is-situation" : "is-core"} ${selected ? "is-selected" : ""} ${shift ? "is-dragging" : ""} ${blocked ? "is-date-locked" : ""}`}
    style={{ left: box.x + shift * TIMELINE_PIXELS_PER_DAY, top: box.y, width: box.width }}
    onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={reset} onLostPointerCapture={reset} onDragStart={event => event.preventDefault()}
    onClick={event => { if (suppressClick.current && event.detail !== 0) { suppressClick.current = false; event.preventDefault(); return }; suppressClick.current = false; onSelect() }}>
    <button type="button" className="wfb-task-hit" aria-label={`Edit ${box.step.title || "Untitled task"}`} aria-pressed={selected}><strong>{box.step.title || "Untitled task"}</strong></button><span>{roleLabel}</span><span>{shift ? `${shift > 0 ? "+" : ""}${shift} calendar day${Math.abs(shift) === 1 ? "" : "s"}` : `${box.step.estDays} workday${box.step.estDays === 1 ? "" : "s"} · ${tLabel(box.start)} → ${tLabel(box.finish)}`}</span>
  </div>
}
