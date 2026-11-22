import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react"
import "./workflowLibrary.css"

export interface MenuButtonItem {
  label: string
  onSelect: () => void
  disabled?: boolean
  /** Shown as the item's tooltip and accessible description, e.g. why it is disabled. */
  hint?: string
}

interface Props {
  /** Visible trigger text. It must stay inside the accessible name. */
  label: ReactNode
  items: MenuButtonItem[]
  /** Extra classes for the trigger button (defaults to a secondary small button). */
  className?: string
  /** Accessible name when the visible label is not plain text. */
  ariaLabel?: string
  /** Which edge of the trigger the menu lines up with. */
  align?: "start" | "end"
}

/** Small disclosure menu: Escape, outside click and choosing an item close it; focus returns to the trigger. */
export function MenuButton({ label, items, className = "btn small", ariaLabel, align = "end" }: Props) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), list = useRef<HTMLDivElement>(null)
  const id = useId()
  const enabled = () => [...(list.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]:not([disabled])") ?? [])]
  const close = (refocus: boolean) => { setOpen(false); if (refocus) trigger.current?.focus() }
  useEffect(() => {
    if (!open) return
    enabled()[0]?.focus()
    const outside = (event: PointerEvent) => { if (!wrap.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener("pointerdown", outside)
    return () => document.removeEventListener("pointerdown", outside)
  }, [open])
  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(true); return }
    if (event.key === "Tab") { setOpen(false); return }
    const buttons = enabled()
    if (!buttons.length) return
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement)
    const next = event.key === "ArrowDown" ? (at + 1) % buttons.length : event.key === "ArrowUp" ? (at - 1 + buttons.length) % buttons.length : event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : -1
    if (next < 0) return
    event.preventDefault(); buttons[next].focus()
  }
  return <div className="mb-wrap" ref={wrap}>
    <button ref={trigger} type="button" className={className} aria-label={ariaLabel} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(!open)} onKeyDown={event => { if (event.key === "ArrowDown" && !open) { event.preventDefault(); setOpen(true) } }}>{label}<span className="mb-caret" aria-hidden="true">▾</span></button>
    {open && <div ref={list} id={id} role="menu" className={`mb-menu mb-${align}`} onKeyDown={onKey}>
      {items.map(item => <button key={item.label} type="button" role="menuitem" className="mb-item" disabled={item.disabled} title={item.hint} onClick={() => { close(true); item.onSelect() }}>{item.label}</button>)}
    </div>}
  </div>
}
