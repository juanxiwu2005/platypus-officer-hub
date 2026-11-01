import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react"
import { prefersReducedMotion, tokenMs } from "./motion"

/**
 * Drag a card between columns with a pointer (DX-24). It replaces the browser's own drag and drop, which shows only a see-through
 * picture, gives other cards no room, and lands without any motion.
 *
 *  - The card follows the pointer one to one, keeping the spot you grabbed it by (it is moved with a transform, so the page does
 *    not re-layout while you drag).
 *  - It starts after 8px of movement (a mouse or pen), or after a 250ms press that stays still (a finger, so a swipe still scrolls).
 *  - Cards at and after the spot you are over move down to make room. A folded column opens only if you rest over it (`dwell`).
 *  - Let go: the card settles into its place with the spring; Escape, or letting go over nothing, sends it back.
 *  - Keyboard: Alt + ← / → asks `onNudge` to move the card to the next column, and the result is announced.
 *
 * The page marks its columns with `data-drop-col="<name>"` and cards with the props from `cardProps(id)`; `onDrop` receives the column
 * and the card it was dropped in front of (null = the end of the column). Nothing here knows about tasks.
 */
export interface DropTarget { dest: string; before: string | null }
interface Options {
  onDrop: (id: string, target: DropTarget) => void
  /** Alt + ← / → on a focused card. Return the sentence to announce, or null when it could not move. */
  onNudge?: (id: string, direction: -1 | 1) => string | null
}
const HOLD_MS = 250        // a finger must rest this long before a drag starts
const MOUSE_START = 8      // pixels a mouse or pen moves before a drag starts
const TOUCH_SLOP = 10      // pixels a finger may drift during the hold before it is a scroll
const EDGE = 40            // how close to the side of the board the pointer must be to scroll it
const DWELL_MS = 350       // resting this long over a folded column opens it (passing over does not: the board would keep moving under you)
const INTERACTIVE = "input, select, textarea, a, button, [contenteditable='true']"

interface Session { id: string; pointerId: number; type: string; startX: number; startY: number; grabX: number; grabY: number; el: HTMLElement; active: boolean; hold: number | null; x: number; y: number; height: number }

export function useDragSort({ onDrop, onNudge }: Options) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [over, setOverState] = useState<DropTarget | null>(null)
  const [dwell, setDwell] = useState<string | null>(null)
  const dwellTimer = useRef(0)
  const [announce, setAnnounce] = useState("")
  const [dragHeight, setDragHeight] = useState(0)
  const [settleTick, setSettleTick] = useState(0)
  const session = useRef<Session | null>(null)
  const overRef = useRef<DropTarget | null>(null)
  const settle = useRef<{ id: string; from: DOMRect; focus?: boolean } | null>(null)
  const justDragged = useRef(false)
  const raf = useRef(0)
  const handlers = useRef({ onDrop, onNudge })
  handlers.current = { onDrop, onNudge }

  const setOver = (t: DropTarget | null) => {
    const a = overRef.current
    if (a?.dest === t?.dest && a?.before === t?.before) return
    overRef.current = t
    setOverState(t)
    if (a?.dest !== t?.dest) {
      window.clearTimeout(dwellTimer.current)
      setDwell(null)
      if (t) dwellTimer.current = window.setTimeout(() => setDwell(t.dest), DWELL_MS)
    }
  }

  /** The column under the pointer (inside it both ways: below the board is "nowhere"), and the card in it that the dragged card would go in front of. Uses layout positions, not the shifted ones, so it cannot flicker. */
  const hit = (x: number, y: number, draggedId: string): DropTarget | null => {
    const col = [...document.querySelectorAll<HTMLElement>("[data-drop-col]")].find(c => { const r = c.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom })
    if (!col) return null
    const top = col.getBoundingClientRect().top + col.clientTop
    let before: string | null = null
    for (const card of col.querySelectorAll<HTMLElement>("[data-drag-id]")) {
      if (card.dataset.dragId === draggedId) continue
      if (y < top + card.offsetTop + card.offsetHeight / 2) { before = card.dataset.dragId ?? null; break }
    }
    return { dest: col.dataset.dropCol!, before }
  }

  const stopListening = useRef<() => void>(() => {})

  const finish = useCallback((drop: boolean) => {
    const s = session.current
    if (!s) return
    stopListening.current()
    if (s.hold) window.clearTimeout(s.hold)
    window.cancelAnimationFrame(raf.current)
    window.clearTimeout(dwellTimer.current)
    setDwell(null)
    session.current = null
    document.body.classList.remove("is-dragging-card")
    if (!s.active) return
    justDragged.current = true
    window.setTimeout(() => { justDragged.current = false }, 0)
    const target = overRef.current
    const from = s.el.getBoundingClientRect()
    setDraggingId(null)
    setOver(null)
    if (drop && target) {
      settle.current = { id: s.id, from }
      handlers.current.onDrop(s.id, target)
      setSettleTick(n => n + 1)
    } else {
      // Back where it came from.
      const el = s.el
      el.style.transform = ""
      if (!prefersReducedMotion() && el.isConnected) {
        const back = el.getBoundingClientRect()
        el.animate([{ transform: `translate(${from.left - back.left}px, ${from.top - back.top}px)` }, { transform: "none" }], { duration: tokenMs("--spring-ui-dur", 450), easing: getComputedStyle(document.documentElement).getPropertyValue("--spring-ui").trim() || "ease-out" })
      }
    }
  }, [])

  const update = useCallback(() => {
    const s = session.current
    if (!s?.active) return
    s.el.style.transform = `translate3d(${s.x - s.startX}px, ${s.y - s.startY}px, 0)`
    setOver(hit(s.x, s.y, s.id))
  }, [])

  // Folded columns open under the pointer, which moves the other columns. The pointer has not moved, so look again from where it is,
  // until nothing changes: otherwise the last answer is about a board that is no longer there.
  useLayoutEffect(() => {
    const s = session.current
    if (s?.active) setOver(hit(s.x, s.y, s.id))
  }, [over])

  const activate = useCallback(() => {
    const s = session.current
    if (!s || s.active) return
    s.active = true
    s.height = s.el.offsetHeight + 8
    setDragHeight(s.height)
    setDraggingId(s.id)
    document.body.classList.add("is-dragging-card")
    // Keep the page from scrolling under a finger that is now dragging.
    const block = (e: TouchEvent) => { if (session.current?.active) e.preventDefault() }
    window.addEventListener("touchmove", block, { passive: false })
    const prev = stopListening.current
    stopListening.current = () => { prev(); window.removeEventListener("touchmove", block) }
    update()
    const scroll = () => {
      const cur = session.current
      if (!cur?.active) return
      const board = cur.el.closest<HTMLElement>("[data-drag-scroll]")
      if (board) { const r = board.getBoundingClientRect(); if (cur.x > r.right - EDGE) board.scrollLeft += 18; else if (cur.x < r.left + EDGE) board.scrollLeft -= 18 }
      raf.current = window.requestAnimationFrame(scroll)
    }
    raf.current = window.requestAnimationFrame(scroll)
  }, [update])

  const cardProps = useCallback((id: string) => ({
    "data-drag-id": id,
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      if (e.button !== 0 || session.current) return
      const t = e.target as Element
      if (t.closest(INTERACTIVE) && t.closest(INTERACTIVE) !== e.currentTarget) return
      const el = e.currentTarget
      const r = el.getBoundingClientRect()
      const s: Session = { id, pointerId: e.pointerId, type: e.pointerType, startX: e.clientX, startY: e.clientY, grabX: e.clientX - r.left, grabY: e.clientY - r.top, el, active: false, hold: null, x: e.clientX, y: e.clientY, height: 0 }
      session.current = s
      const move = (ev: PointerEvent) => {
        if (ev.pointerId !== s.pointerId || session.current !== s) return
        s.x = ev.clientX; s.y = ev.clientY
        const moved = Math.hypot(s.x - s.startX, s.y - s.startY)
        if (!s.active) {
          if (s.type === "touch") { if (moved > TOUCH_SLOP) finish(false); return }   // a swipe, not a drag
          if (moved < MOUSE_START) return
          activate()
        }
        update()
      }
      const up = (ev: PointerEvent) => { if (ev.pointerId === s.pointerId) finish(true) }
      const cancel = (ev: PointerEvent) => { if (ev.pointerId === s.pointerId) finish(false) }
      const key = (ev: KeyboardEvent) => { if (ev.key === "Escape" && session.current?.active) { ev.preventDefault(); finish(false) } }
      window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", cancel); window.addEventListener("keydown", key)
      stopListening.current = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", cancel); window.removeEventListener("keydown", key); stopListening.current = () => {} }
      if (s.type === "touch") s.hold = window.setTimeout(() => { if (session.current === s) activate() }, HOLD_MS)
    },
    onClickCapture: (e: ReactMouseEvent) => { if (justDragged.current) { e.stopPropagation(); e.preventDefault() } },
    onKeyDown: (e: ReactKeyboardEvent) => {
      if (!e.altKey || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return
      e.preventDefault()
      const from = e.currentTarget.getBoundingClientRect()
      const said = handlers.current.onNudge?.(id, e.key === "ArrowRight" ? 1 : -1)
      setAnnounce(said ?? "It cannot move that way.")
      // The card is rebuilt in its new column: slide it there from where it was, and keep the keyboard on it so the next Alt + arrow works.
      if (said) { settle.current = { id, from, focus: true }; setSettleTick(n => n + 1) }
    },
  }), [activate, finish, update])

  // The card has been put in its new place (usually in another column, so a new element): let it slide there from where it was let go.
  useLayoutEffect(() => {
    const st = settle.current
    if (!st) return
    settle.current = null
    const el = document.querySelector<HTMLElement>(`[data-drag-id="${CSS.escape(st.id)}"]`)
    if (el && st.focus) el.querySelector<HTMLElement>("[tabindex='0'], button")?.focus({ preventScroll: true })
    if (!el || prefersReducedMotion()) return
    const to = el.getBoundingClientRect()
    el.animate([{ transform: `translate(${st.from.left - to.left}px, ${st.from.top - to.top}px)` }, { transform: "none" }], { duration: tokenMs("--spring-ui-dur", 450), easing: getComputedStyle(document.documentElement).getPropertyValue("--spring-ui").trim() || "ease-out" })
  }, [settleTick])

  useEffect(() => () => { stopListening.current(); window.cancelAnimationFrame(raf.current); document.body.classList.remove("is-dragging-card") }, [])

  return { draggingId, over, dwell, dragHeight, announce, cardProps }
}
