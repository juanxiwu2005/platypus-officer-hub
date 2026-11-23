import { useEffect, useRef } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { forgetWalkthrough } from "../record"
import { stopReading } from "../founder/constitution/useReading"

/**
 * Old and outside addresses into the walkthrough (see src/App.tsx): each replaces its history entry with the screen that now does its job.
 * `keepQuery` carries ?invite=…&person=… on, so invitation links that were already shared keep working.
 * `outside` marks a setup door that is not the study link (/setup, Settings → Replay setup): like the former SetupEntry page it records nothing
 * into an attempt that may still be open in this tab and stops a constitution reading that belongs to it. It keeps the tab's saved draft.
 */
export function Redirect({ to, keepQuery = false, outside = false }: { to: string; keepQuery?: boolean; outside?: boolean }) {
  const navigate = useNavigate()
  const { search } = useLocation()
  const done = useRef(false)
  useEffect(() => {
    if (done.current) return   // React runs effects twice in development
    done.current = true
    if (outside) { forgetWalkthrough(); stopReading() }
    navigate(`${to}${keepQuery ? search : ""}`, { replace: true })
  }, [keepQuery, navigate, outside, search, to])
  return null
}
