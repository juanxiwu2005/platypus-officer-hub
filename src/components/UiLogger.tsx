import { useEffect, useRef } from "react"
import { useLocation } from "react-router-dom"
import { emitUi, installUiCapture, publishUi } from "../lib/uiLog"

/**
 * Writes page changes, presses and choices into the interaction log (src/lib/uiLog.ts), on every screen —
 * the main app, the onboarding walkthrough (/welcome/…), the officer page. Renders nothing.
 * Mounted once, inside the router (it needs the location) and inside the store (which records the events).
 */
export function UiLogger() {
  const { pathname } = useLocation()
  const last = useRef<string | null>(null)
  useEffect(() => {
    if (last.current === pathname) return            // React's development double-run, or only the query changed
    emitUi("ui.navigate", { from: last.current, to: pathname })
    last.current = pathname
  }, [pathname])
  useEffect(() => installUiCapture(document, publishUi), [])
  return null
}
