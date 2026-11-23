import { useEffect, useRef } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { forgetWalkthrough } from "../record"
import { stopReading } from "../founder/constitution/useReading"

/**
 * Old and outside addresses into the walkthrough (see src/App.tsx): each replaces its history entry with the screen that now does its job.
 * `keepQuery` carries ?invite=…&person=… on, so invitation links that were already shared keep working.
 * `outside` marks a door that is not the study link: setup (/setup, Settings → Replay setup) and invitation links (/join, /welcome/classic-join,
 * Settings → Try officer setup). Like the former SetupEntry and Join pages it records nothing into an attempt that may still be open in this tab
 * (so the member screens cannot write into, or complete, a founder attempt) and stops a constitution reading that belongs to it. It keeps the tab's saved draft.
 * The member preview reached from Invite ("See what your officers will see") navigates directly, so it still records into the founder's attempt.
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
