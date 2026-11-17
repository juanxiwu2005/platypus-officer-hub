import type { DemoState } from "../data/types"
import type { ReminderMailSnapshot } from "./accessContracts"
import { buildReminderMail } from "./mail"
import { buildReminderFacts, buildReminderInput, reminderPeople } from "./facts"
import { planReminders } from "./engine"
import { isReminderRuntime } from "./runtime"
import { taskAccessUrl, usableTaskAccessGrant } from "./taskAccess"

/** Validate a reviewed message against the latest facts and a registered, assignment-scoped task entry. */
export function validatedReminderMessage(s: DemoState, raw: ReminderMailSnapshot, nodeId: string, candidateId?: string): ReminderMailSnapshot | null {
  if (!raw || raw.preparedOn !== s.today || !["email", "sms", "whatsapp"].includes(raw.channel) || !raw.checked) return null
  try {
    const url = new URL(raw.taskUrl)
    const token = new URLSearchParams(url.hash.slice(url.hash.indexOf("?") + 1)).get("access") ?? ""
    const grant = usableTaskAccessGrant(s, token)
    if (!grant || grant.id !== raw.accessId || grant.nodeId !== nodeId || grant.recipientId !== raw.recipientId
      || !["http:", "https:"].includes(url.protocol) || url.pathname !== "/" || url.search || url.username || url.password
      || url.hash !== taskAccessUrl("", grant).slice(1)) return null
    const facts = buildReminderFacts(s, nodeId)
    const people = reminderPeople(s)
    const recipient = people.find(p => p.id === grant.recipientId)
    if (!facts || !recipient) return null
    const candidate = candidateId && isReminderRuntime(s.reminderRuntime)
      ? planReminders(buildReminderInput(s, s.reminderRuntime)).ready.find(c => c.id === candidateId && c.nodeId === nodeId) : undefined
    if (candidateId && !candidate) return null
    if (candidate && (candidate.recipientId !== grant.recipientId || candidate.waitingRequestId !== grant.waitingRequestId)) return null
    if (!candidate && grant.scope !== "owner") return null
    const request = grant.waitingRequestId ? s.reminderRuntime?.waitingRequests.find(r => r.id === grant.waitingRequestId) : undefined
    if ((request || s.org.settings.reminderMode === "auto_email" || s.org.settings.reminderMode === "review_then_auto") && (raw.channel !== "email" || !raw.intendedEmail)) return null
    const expected = buildReminderMail({ today: s.today, facts, recipient, taskUrl: raw.taskUrl, candidate, request, requesterName: people.find(p => p.id === facts.ownerId)?.name })
    if (!expected.checked || Object.entries(expected).some(([key, value]) => raw[key as keyof typeof raw] !== value)) return null
    return { ...expected, channel: raw.channel, preparedOn: raw.preparedOn, accessId: raw.accessId }
  } catch { return null }
}
