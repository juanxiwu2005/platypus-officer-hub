import { useCallback, useEffect, useState, type ReactNode } from "react"

/** How long a design-upgrade token lasts, in milliseconds. The CSS is the one place the time is written. */
function tokenMs(name: string, fallback: number) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  const n = parseFloat(v)
  return Number.isFinite(n) ? (v.endsWith("ms") ? n : n * 1000) : fallback
}

/**
 * A short status message at the bottom of the screen: it rises in, stays 2.4 seconds, fades out, and is then removed.
 * A new message while one is showing replaces its text and starts the 2.4 seconds again (there is never a second one).
 * With Reduce Motion the CSS durations are 1ms, so it is there and gone almost at once.
 */
export function useToast(): [ReactNode, (message: string | null) => void] {
  const [text, setText] = useState<string | null>(null) // what is on screen, until the fade-out is over
  const [open, setOpen] = useState(false)               // false = leaving
  const [round, setRound] = useState(0)                 // changes with every new message, to restart the timer
  const show = useCallback((message: string | null) => {
    if (message === null) { setOpen(false); return }
    setText(message); setOpen(true); setRound(r => r + 1)
  }, [])
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => setOpen(false), 2400)
    return () => clearTimeout(t)
  }, [open, round])
  useEffect(() => {
    if (open || text === null) return
    const t = setTimeout(() => setText(null), tokenMs("--dur-fast", 150) + 40)
    return () => clearTimeout(t)
  }, [open, text])
  const node = text !== null ? <div className="toast" role="status" data-state={open ? "open" : "closed"}>{text}</div> : null
  return [node, show]
}
