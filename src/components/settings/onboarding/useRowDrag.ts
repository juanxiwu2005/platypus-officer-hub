import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react"

/**
 * Pointer drag for the onboarding matrix's handles (template v2, contract Section 8 item 1): mouse, touch and pen.
 * The handle has `touch-action: none`, so a finger drags from it at once while a swipe anywhere else still scrolls.
 * Rows do not move while dragging: the source row dims, a drop line shows where it will land, and a small label follows the
 * pointer. Near the top or bottom of the matrix frame (or of the window) the view scrolls. Escape, a cancelled pointer or
 * leaving the window cancels. The caller applies the drop as one change (one Undo step) through the pure moves in edit.ts.
 *
 * DOM contract: the matrix table's `tbody` elements carry `data-module-id`, item rows `data-item-id`.
 */
export type DragKind = "item" | "module"
/** Where a drop lands. Items: `index` in module `moduleId`, counted without the dragged item. Modules: `index` among the others. */
export interface RowDrop { moduleId: string | null; index: number; /** Line position inside the frame's scrolled content, px. */ line: number; width: number; full: boolean }
export interface DragView { kind: DragKind; id: string; label: string; drop: RowDrop | null }

const START = 4    // px a pointer moves before a drag starts (a press without movement stays a press)
const EDGE = 48    // px from an edge where the view starts to scroll
const STEP = 14    // px scrolled per frame near an edge

interface Session { kind: DragKind; id: string; label: string; pointerId: number; startX: number; startY: number; x: number; y: number; active: boolean; el: HTMLElement }
interface Options {
  wrap: RefObject<HTMLDivElement | null>
  ghost: RefObject<HTMLDivElement | null>
  /** True when the item cannot enter that (other) module: it is full. */
  isFull: (itemId: string, moduleId: string) => boolean
  onStart: () => void
  onDrop: (kind: DragKind, id: string, drop: RowDrop) => void
  onCancel: (kind: DragKind, id: string) => void
}

function hit(wrap: HTMLElement, s: Session, isFull: Options["isFull"]): RowDrop | null {
  const table = wrap.querySelector("table")
  if (!table) return null
  const frame = wrap.getBoundingClientRect()
  const toLine = (clientY: number) => clientY - frame.top - wrap.clientTop + wrap.scrollTop
  const width = table.offsetWidth
  const bodies = [...table.tBodies].filter(b => b.dataset.moduleId)
  const rect = (el: Element) => el.getBoundingClientRect()
  if (s.kind === "module") {
    const others = bodies.filter(b => b.dataset.moduleId !== s.id)
    if (!others.length) return null
    let index = others.findIndex(b => { const r = rect(b); return s.y < r.top + r.height / 2 })
    if (index < 0) index = others.length
    const y = index < others.length ? rect(others[index]).top : rect(others[others.length - 1]).bottom
    return { moduleId: null, index, line: toLine(y), width, full: false }
  }
  if (!bodies.length) return null
  // The module under the pointer, or the next one below a gap; below the last module, its end.
  const body = bodies.find(b => s.y < rect(b).bottom) ?? bodies[bodies.length - 1]
  const rows = [...body.querySelectorAll<HTMLElement>("tr[data-item-id]")].filter(r => r.dataset.itemId !== s.id)
  const head = rect(body.rows[0])
  let index = s.y < head.bottom ? 0 : rows.findIndex(r => { const b = rect(r); return s.y < b.top + b.height / 2 })
  if (index < 0) index = rows.length
  const y = index < rows.length ? rect(rows[index]).top : rows.length ? rect(rows[rows.length - 1]).bottom : head.bottom
  const moduleId = body.dataset.moduleId!
  return { moduleId, index, line: toLine(y), width, full: isFull(s.id, moduleId) }
}

const sameDrop = (a: RowDrop | null, b: RowDrop | null) => a === b || (!!a && !!b && a.moduleId === b.moduleId && a.index === b.index && a.line === b.line && a.full === b.full)

export function useRowDrag(options: Options) {
  const opts = useRef(options)
  opts.current = options
  const [view, setView] = useState<DragView | null>(null)
  const session = useRef<Session | null>(null)
  const drop = useRef<RowDrop | null>(null)
  const raf = useRef(0)
  const stop = useRef<() => void>(() => {})

  const place = () => {
    const s = session.current, wrap = opts.current.wrap.current
    if (!s?.active || !wrap) return
    const g = opts.current.ghost.current
    if (g) { g.style.setProperty("--ck-gx", `${s.x}px`); g.style.setProperty("--ck-gy", `${s.y}px`) }
    const next = hit(wrap, s, opts.current.isFull)
    if (sameDrop(drop.current, next)) return
    drop.current = next
    setView(v => v && { ...v, drop: next })
  }

  const finish = (dropped: boolean) => {
    const s = session.current
    if (!s) return
    stop.current()
    window.cancelAnimationFrame(raf.current)
    session.current = null
    if (!s.active) { if (dropped) s.el.focus(); return }
    const d = drop.current
    drop.current = null
    setView(null)
    if (dropped && d) opts.current.onDrop(s.kind, s.id, d)
    else opts.current.onCancel(s.kind, s.id)
  }

  /** Scrolls the frame (or, past its ends, the window) while the pointer rests near an edge, and keeps the drop line under it. */
  const tick = () => {
    const s = session.current, wrap = opts.current.wrap.current
    if (!s?.active) return
    let scrolled = false
    if (wrap) {
      const r = wrap.getBoundingClientRect(), head = wrap.querySelector("thead")?.getBoundingClientRect()
      const top = Math.max(r.top, head?.bottom ?? r.top)
      if (s.y < top + EDGE && wrap.scrollTop > 0) { wrap.scrollTop -= STEP; scrolled = true }
      else if (s.y > r.bottom - EDGE && s.y <= r.bottom + EDGE && wrap.scrollTop + wrap.clientHeight < wrap.scrollHeight - 1) { wrap.scrollTop += STEP; scrolled = true }
    }
    if (!scrolled) {
      const bar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--topbar-h")) || 0
      if (s.y < bar + EDGE) window.scrollBy(0, -STEP)
      else if (s.y > window.innerHeight - EDGE) window.scrollBy(0, STEP)
    }
    place()
    raf.current = window.requestAnimationFrame(tick)
  }

  const activate = (s: Session) => {
    s.active = true
    opts.current.onStart()
    drop.current = null
    setView({ kind: s.kind, id: s.id, label: s.label, drop: null })
    place()
    raf.current = window.requestAnimationFrame(tick)
  }

  const handleProps = (kind: DragKind, id: string, label: string) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      if (e.button !== 0 || session.current) return
      // No text selection and no focus ring flash while dragging; a plain press focuses the handle on release.
      e.preventDefault()
      const el = e.currentTarget
      const s: Session = { kind, id, label, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, active: false, el }
      session.current = s
      el.setPointerCapture?.(e.pointerId)
      const move = (ev: PointerEvent) => {
        if (ev.pointerId !== s.pointerId || session.current !== s) return
        s.x = ev.clientX; s.y = ev.clientY
        if (!s.active) { if (Math.hypot(s.x - s.startX, s.y - s.startY) < START) return; activate(s) }
        place()
      }
      const up = (ev: PointerEvent) => { if (ev.pointerId === s.pointerId) finish(true) }
      const cancel = (ev: PointerEvent) => { if (ev.pointerId === s.pointerId) finish(false) }
      const key = (ev: KeyboardEvent) => { if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); finish(false) } }
      const blur = () => finish(false)
      window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", cancel)
      window.addEventListener("keydown", key, true); window.addEventListener("blur", blur)
      stop.current = () => {
        window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", cancel)
        window.removeEventListener("keydown", key, true); window.removeEventListener("blur", blur)
        if (el.hasPointerCapture?.(s.pointerId)) el.releasePointerCapture(s.pointerId)
        stop.current = () => {}
      }
    },
    onDragStart: (e: { preventDefault: () => void }) => e.preventDefault(),
  })

  useEffect(() => () => { stop.current(); window.cancelAnimationFrame(raf.current); session.current = null }, [])

  return { view, handleProps }
}
