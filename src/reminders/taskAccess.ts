import type { DemoState } from "../data/types"
import { canLead, isOfficer } from "../data/permissions"
import { addDays } from "../lib/dates"
import type { TaskAccessGrant } from "./accessContracts"
import { isReminderRuntime } from "./runtime"

const payload = (g: TaskAccessGrant) => JSON.stringify(["task-access-v1", g.id, g.nodeId, g.ownerId, g.ownerVersion, g.recipientId, g.scope, g.waitingRequestId ?? null, g.issuedOn, g.expiresOn])
async function signature(key: string, value: string): Promise<string> {
  const secret = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  const signed = await crypto.subtle.sign("HMAC", secret, new TextEncoder().encode(value))
  return Array.from(new Uint8Array(signed), x => x.toString(16).padStart(2, "0")).join("")
}
const active = (s: DemoState, id: string) => s.people.some(p => p.id === id && isOfficer(p))
const expiry = (s: DemoState, id: string) => addDays([s.today, s.nodes.find(n => n.id === id)?.clubDeadline ?? s.today].sort().at(-1)!, 30)
const shape = (g: TaskAccessGrant | null | undefined): g is TaskAccessGrant => !!g && g.version === 1
  && [g.id, g.nodeId, g.ownerId, g.recipientId].every(x => typeof x === "string" && !!x)
  && Number.isSafeInteger(g.ownerVersion) && g.ownerVersion >= 0
  && [g.issuedOn, g.expiresOn].every(x => typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x))
  && typeof g.signature === "string" && /^[a-f0-9]{64}$/.test(g.signature)
  && (g.scope === "owner" || g.scope === "waiting")

function current(s: DemoState, g: TaskAccessGrant): boolean {
  if (!shape(g) || s.today > g.expiresOn || g.issuedOn > s.today || !active(s, g.recipientId)) return false
  const n = s.nodes.find(n => n.id === g.nodeId)
  if (!n || n.ownerId !== g.ownerId || (n.ownerVersion ?? 0) !== g.ownerVersion) return false
  if (g.scope === "owner") return g.recipientId === g.ownerId && !g.waitingRequestId
  if (!isReminderRuntime(s.reminderRuntime)) return false
  const request = s.reminderRuntime.waitingRequests.find(r => r.id === g.waitingRequestId)
  return !!request && request.nodeId === n.id && request.ownerId === n.ownerId && request.ownerVersion === g.ownerVersion
    && request.recipientId === g.recipientId && g.recipientId !== n.ownerId
    && (!request.closedOn || request.closeReason === "completed" || request.closeReason === "resolved")
}

export const taskAccessToken = (g: TaskAccessGrant) => `${g.id}.${g.signature}`
export const taskAccessUrl = (origin: string, g: TaskAccessGrant) => `${origin}/#/officer?access=${encodeURIComponent(taskAccessToken(g))}`
export function usableTaskAccessGrant(s: DemoState, token: string): TaskAccessGrant | undefined {
  const grant = Array.isArray(s.taskAccessGrants) ? s.taskAccessGrants.find(g => shape(g) && taskAccessToken(g) === token) : undefined
  return grant && current(s, grant) ? grant : undefined
}
export async function verifyTaskAccessGrant(s: DemoState, token: string): Promise<boolean> {
  const grant = usableTaskAccessGrant(s, token)
  return !!grant && await signature(s.demoLinkKey, payload(grant)) === grant.signature
}
export function taskAccessIssueValid(s: DemoState, g: TaskAccessGrant): boolean {
  return canLead(s) && current(s, g) && g.issuedOn === s.today && g.expiresOn === expiry(s, g.nodeId)
}
/** Create or reuse an assignment-scoped entry. Viewing and legitimate repeat updates never consume it. */
export async function makeTaskAccessGrant(s: DemoState, nodeId: string, waitingRequestId?: string): Promise<TaskAccessGrant> {
  const n = s.nodes.find(n => n.id === nodeId)
  if (!canLead(s) || !n?.ownerId || !active(s, n.ownerId)) throw new Error("Choose an assigned task and a current sender.")
  const request = waitingRequestId && isReminderRuntime(s.reminderRuntime) ? s.reminderRuntime.waitingRequests.find(r => r.id === waitingRequestId && r.nodeId === nodeId && !r.closedOn) : undefined
  if (waitingRequestId && (!request?.recipientId || !active(s, request.recipientId) || request.recipientId === n.ownerId)) throw new Error("Choose a current person to follow up with.")
  if (s.taskAccessGrants !== undefined && !Array.isArray(s.taskAccessGrants)) throw new Error("The saved task links need review before creating another link.")
  for (const old of s.taskAccessGrants ?? []) {
    if (shape(old) && old.nodeId === nodeId && old.waitingRequestId === waitingRequestId && current(s, old) && await verifyTaskAccessGrant(s, taskAccessToken(old))) return old
  }
  const grant: TaskAccessGrant = { version: 1, id: crypto.randomUUID(), nodeId, ownerId: n.ownerId, ownerVersion: n.ownerVersion ?? 0, recipientId: request ? request.recipientId! : n.ownerId, scope: request ? "waiting" : "owner", ...(request ? { waitingRequestId: request.id } : {}), issuedOn: s.today, expiresOn: expiry(s, nodeId), signature: "" }
  grant.signature = await signature(s.demoLinkKey, payload(grant))
  return grant
}
