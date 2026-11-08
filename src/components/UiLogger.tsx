import { useEffect, useRef } from "react"
import { useLocation } from "react-router-dom"
import { saveLog, useStore } from "../data/store"
import { emitUi, installAwayCapture, installEditCapture, installUiCapture, publishUi, type UiEvent } from "../lib/uiLog"

/**
 * Writes page changes, presses and choices into the interaction log (src/lib/uiLog.ts), on every screen —
 * the main app, the onboarding walkthrough (/welcome/…), the officer page. Renders nothing.
 * Mounted once, inside the router (it needs the location) and inside the store (which records the events).
 * Also: starting to type in a field (`ui.edit`, never what was typed) and leaving the page (`ui.visibility`).
 */
export function UiLogger() {
  const { pathname } = useLocation()
  const { getLog, persistenceFailed } = useStore()
  const last = useRef<string | null>(null)
  // Read at event time, without re-installing the listeners when it changes.
  const store = useRef({ getLog, persistenceFailed })
  store.current = { getLog, persistenceFailed }
  useEffect(() => {
    if (last.current === pathname) return            // React's development double-run, or only the query changed
    emitUi("ui.navigate", { from: last.current, to: pathname })
    last.current = pathname
  }, [pathname])
  useEffect(() => installUiCapture(document, publishUi), [])
  // Edit capture first: on pagehide it closes an open field before the page's "hidden" entry is written and saved.
  useEffect(() => installEditCapture(document, publishUi), [])
  useEffect(() => installAwayCapture(window, document, (e: UiEvent) => {
    publishUi(e)
    // The page may be frozen or closed right after it is hidden, before React's save effect runs: save the log now.
    // Not while the store is holding old data it could not back up (it must not be overwritten then).
    if (e.payload.state === "hidden" && !store.current.persistenceFailed) saveLog(store.current.getLog())
  }), [])
  return null
}
