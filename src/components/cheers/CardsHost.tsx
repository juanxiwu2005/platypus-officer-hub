import { lazy, Suspense, useRef } from "react"
import { useLocation } from "react-router-dom"
import { useStore } from "../../data/store"
import { unseenFor } from "../../data/cheers"
import type { OfferedCards } from "./ReceivedCards"

const ReceivedCards = lazy(() => import("./ReceivedCards"))

/**
 * Mounted once in Layout. The received-card overlay (F5) loads only when the viewer has an unseen card or the address
 * carries `?cheer=`, so the entry bundle stays small. What was already offered lives here, across the overlay's loads.
 */
export function CardsHost() {
  const { state } = useStore()
  const location = useLocation()
  const offered = useRef<OfferedCards>(new Map())
  const linked = new URLSearchParams(location.search).has("cheer")
  const known = offered.current.get(state.viewerId)
  const waiting = unseenFor(state, state.viewerId).some(c => !known?.has(c.id))
  const loaded = useRef(false)
  if (linked || waiting) loaded.current = true
  if (!loaded.current) return null
  return <Suspense fallback={null}><ReceivedCards offered={offered.current} /></Suspense>
}
