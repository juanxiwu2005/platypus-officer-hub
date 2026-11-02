import { useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { beginWalkthrough } from "../record"
import { FOUNDER_START } from "../target"

/** Begins a recorded walkthrough, then moves on. Used by Start walkthrough and by Demo menu → Replay walkthrough. */
export function StartWalkthrough() {
  const navigate = useNavigate()
  const began = useRef(false)
  useEffect(() => {
    if (began.current) return   // React runs effects twice in development; one visit is one attempt
    began.current = true
    beginWalkthrough()
    navigate(FOUNDER_START, { replace: true })
  }, [navigate])
  return null
}
