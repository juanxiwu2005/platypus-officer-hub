import { useEffect, useId, useRef } from "react"
import { createPortal } from "react-dom"
import { isolateDialog, trapTabKey } from "../../lib/focus"
import "./workflowLibrary.css"

interface Props {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

/** Small modal confirmation: focus moves in, Tab stays inside, Escape cancels and focus returns to the opener. */
export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }: Props) {
  const box = useRef<HTMLDivElement>(null), cancelButton = useRef<HTMLButtonElement>(null)
  const id = useId()
  const cancel = useRef(onCancel)
  useEffect(() => { cancel.current = onCancel }, [onCancel])
  useEffect(() => {
    const dialog = box.current
    if (!dialog) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const restore = isolateDialog(dialog)
    cancelButton.current?.focus()
    const keys = (event: KeyboardEvent) => {
      trapTabKey(event, dialog)
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); cancel.current() }
    }
    document.addEventListener("keydown", keys, true)
    return () => { document.removeEventListener("keydown", keys, true); restore(); if (opener?.isConnected) opener.focus() }
  }, [])
  // Portalled to <body> so no transformed ancestor can trap the fixed backdrop.
  return createPortal(<div className="wfl-dialog-backdrop" onClick={event => { if (event.currentTarget === event.target) onCancel() }}>
    <div className="wfl-dialog card" ref={box} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-text`}>
      <h3 id={`${id}-title`}>{title}</h3>
      <p id={`${id}-text`}>{message}</p>
      <div className="action-row wfl-dialog-actions">
        <button type="button" className="btn btn-primary" onClick={onConfirm}>{confirmLabel}</button>
        <button type="button" className="btn" ref={cancelButton} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  </div>, document.body)
}
