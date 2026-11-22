import type { DemoState } from "../data/types"
import { usableGrant } from "../lib/officerLinks"
import { usableTaskAccessGrant } from "../reminders/taskAccess"
import type { TaskAuthorization } from "./contracts"

export function taskWorkActor(state: DemoState, nodeId: string, authorization?: TaskAuthorization): string | null {
  if (!authorization) return state.viewerId
  if (authorization.kind === "access") {
    const grant = usableTaskAccessGrant(state, authorization.token)
    return grant?.scope === "owner" && grant.nodeId === nodeId ? grant.recipientId : null
  }
  if (authorization.kind === "legacy") {
    const grant = usableGrant(state, authorization.token)
    return grant?.nodeId === nodeId ? grant.ownerId : null
  }
  return null
}
