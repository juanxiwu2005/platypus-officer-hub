import { useEffect, useRef, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { isolateDialog, trapTabKey } from "../../lib/focus"
import "../../styles/ch-01-cheers.css"

/**
 * A centered modal for the Cheers history (F3) and received cards (F5): the page underneath is switched off, Tab stays
 * inside, Escape closes, and focus returns to whatever had it before. Escape is handled before the rail's own Escape.
 */
export function CheerDialog({ labelledBy, onClose, narrow, testId, children }: { labelledBy: string; onClose: () => void; narrow?: boolean; testId?: string; children: ReactNode }) {
  const backdrop = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null
    const release = backdrop.current ? isolateDialog(backdrop.current) : () => {}
    const first = box.current?.querySelector<HTMLElement>("[data-autofocus]")
    ;(first ?? box.current)?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (!box.current) return
      trapTabKey(e, box.current)
      if (e.key === "Escape" && !e.defaultPrevented) { e.preventDefault(); close.current() }
    }
    document.addEventListener("keydown", onKey, true)
    return () => {
      document.removeEventListener("keydown", onKey, true)
      release()
      if (opener?.isConnected) opener.focus()
    }
  }, [])
  return createPortal(<div className="ch-backdrop" ref={backdrop}>
    <div className={`ch-modal${narrow ? " narrow" : ""}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy} ref={box} tabIndex={-1} data-testid={testId}>{children}</div>
  </div>, document.body)
}
