import { useRef, useState, type PointerEvent } from "react"
import type { WorkflowBranch } from "../../data/types"
import { workflowStepKind } from "../../engine/workflowStepKind"
import { tLabel } from "./model"
import { taskShortTitle } from "./taskLabel"
import type { TaskBox } from "./timeline"

interface Drag { pointer: number; x: number; y: number; active: boolean }
const DRAG_THRESHOLD = 7

/** The parent validates a team-local reorder. This gesture never edits dates or dependencies. */
export function TimelineTask({ box, branches, selected, connecting, onSelect, onReorder }: { box: TaskBox; branches?: WorkflowBranch[]; selected: boolean; connecting: boolean; onSelect: () => void; onReorder: (dropCenterX: number) => void }) {
  const gesture = useRef<Drag | null>(null)
  const suppressClick = useRef(false)
  const [offset, setOffset] = useState(0)
  const reset = () => { gesture.current = null; setOffset(0) }
  const down = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || connecting) return
    suppressClick.current = false
    gesture.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, active: false }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const drag = gesture.current
    if (!drag || drag.pointer !== event.pointerId) return
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y
    if (!drag.active) {
      if (Math.abs(dx) < DRAG_THRESHOLD || Math.abs(dx) <= Math.abs(dy)) return
      drag.active = true; suppressClick.current = true
    }
    event.preventDefault(); setOffset(dx)
  }
  const up = (event: PointerEvent<HTMLDivElement>) => {
    const drag = gesture.current
    if (!drag || drag.pointer !== event.pointerId) return
    const center = box.x + box.width / 2 + event.clientX - drag.x
    reset()
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (drag.active) onReorder(center)
  }
  return <div data-testid={`workflow-task-${box.step.key}`} data-col={box.col} data-team-id={box.teamId}
    title="Drag horizontally to reorder this team's tasks, or click for details."
    className={`wfb-task ${workflowStepKind(box.step, branches) === "situation" ? "is-situation" : "is-core"} ${selected ? "is-selected" : ""} ${offset ? "is-dragging" : ""}`}
    style={{ left: box.x + offset, top: box.y, width: box.width, height: box.height }}
    onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={reset} onLostPointerCapture={reset} onDragStart={event => event.preventDefault()}
    onClick={event => { if (suppressClick.current && event.detail !== 0) { suppressClick.current = false; event.preventDefault(); return }; suppressClick.current = false; onSelect() }}>
    <button type="button" className="wfb-task-hit" aria-label={`Edit ${box.step.title || "Untitled task"}`} aria-pressed={selected}><strong data-testid="task-title">{taskShortTitle(box.step.title)}</strong></button><span data-testid="task-date">{tLabel(box.finish)}</span>
  </div>
}
