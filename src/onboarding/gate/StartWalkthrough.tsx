import { useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { beginWalkthrough, recordEvent } from "../record"
import { FOUNDER_START } from "../target"
import { useOnboardingDraft } from "../draft"

/** Begins a recorded walkthrough, then moves on. Used by Start walkthrough and by Demo menu → Replay walkthrough. */
export function StartWalkthrough() {
  const navigate = useNavigate()
  const { reset } = useOnboardingDraft()
  const began = useRef(false)
  useEffect(() => {
    if (began.current) return   // React runs effects twice in development; one visit is one attempt
    began.current = true
    beginWalkthrough()
    reset()   // a new attempt starts from a fresh draft, never the one a reload would restore
    if (FOUNDER_START.includes("/founder/")) recordEvent("founder.name", "enter")   // the first screen of the founder flow
    navigate(FOUNDER_START, { replace: true })
  }, [navigate, reset])
  return null
}
