import { useEffect, useState } from "react"
import { useStore } from "../data/store"
import type { TaskAccessGrant } from "./accessContracts"
import { usableTaskAccessGrant, verifyTaskAccessGrant } from "./taskAccess"

/** A previous successful verification never authorizes a new token, workspace, or assignment. */
export function useTaskAccess(token: string) {
  const { state } = useStore()
  const current = usableTaskAccessGrant(state, token)
  const [verification, setVerification] = useState<{ token: string; grant: TaskAccessGrant; key: string; valid: boolean } | null>(null)
  useEffect(() => {
    let active = true
    if (current) verifyTaskAccessGrant(state, token)
      .then(valid => { if (active) setVerification({ token, grant: current, key: state.demoLinkKey, valid }) })
      .catch(() => { if (active) setVerification({ token, grant: current, key: state.demoLinkKey, valid: false }) })
    return () => { active = false }
  }, [token, current, state.demoLinkKey])
  const checked = !!current && verification?.token === token && verification.grant === current && verification.key === state.demoLinkKey
  return { grant: checked && verification?.valid ? current : undefined, checking: !!current && !checked }
}
