import { useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { forgetWalkthrough } from "../record"

/** Opens the walkthrough for testing from the Demo menu. It starts no attempt and records nothing, even if an earlier attempt was still open. */
export function TestWalkthrough({ to }: { to: string }) {
  const navigate = useNavigate()
  const done = useRef(false)
  useEffect(() => {
    if (done.current) return
    done.current = true
    forgetWalkthrough()
    navigate(to, { replace: true })
  }, [navigate, to])
  return null
}
