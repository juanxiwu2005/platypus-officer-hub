import type { Channel, DemoState, Node } from "../data/types"
import { daysBetween, fmtShort } from "./dates"
import type { OfficerGrant } from "../data/types"
import { officerUrl } from "./officerLinks"

export const STATUS_ACTIONS = [
  { key: "done", label: "Done" }, { key: "waiting", label: "Waiting on…" },
  { key: "help", label: "Need help" }, { key: "extension", label: "Need more time" },
] as const
export interface NudgeDraft { subject: string; body: string; source: string; checked: boolean; wordCount: number }
export type NudgeContext = Pick<DemoState, "today" | "nodes" | "people">
const banned = [/is\s+it\s+done\s+yet/i, /\basap\b/i, /this\s+should\s+only\s+take\s+(?:an?|one|1)\s+hour/i, /just\s+use\s+ai/i, /\bURGENT\b/, /@everyone|@here/i]
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean)
const short = (s: string, cap: number) => words(s.replace(/[\r\n]+/g, " ")).slice(0, cap).join(" ")
export function nudgeCheck(subject: string, body: string): { ok: boolean; wordCount: number } {
  const wordCount = words(body).length
  const labels = ["Why now:", "What:", "When:", "How:", "Why it matters:"]
  const indexes = labels.map(l => body.indexOf(l))
  const steps = body.match(/^\d\. /gm) ?? []
  return { ok: wordCount <= 100 && !banned.some(r => r.test(subject + "\n" + body)) && indexes.every((x, i) => x >= 0 && (!i || x > indexes[i - 1])) && steps.length >= 1 && steps.length <= 3, wordCount }
}

export function nudgeBlocked(state: DemoState, n: Node): string | null {
  if (n.status === "done") return "This task is complete. No reminder is needed."
  if (!n.ownerId) return "Assign an owner first."
  const sent = state.nudges.filter(x => x.nodeId === n.id)
  const simulated = state.protocolLog.filter(e => e.nodeId === n.id && e.kind === "reminder" && e.recipientIds.length).length
  if (sent.some(x => x.response !== null)) return "The owner has replied. Review their update before reminding again."
  if (sent.some(x => n.lastUpdate && n.lastUpdate > x.sentOn)) return "The task has a newer update. Review it before reminding again."
  if (sent.length + simulated >= Math.min(3, state.org.settings.maxRemindersPerTask)) return "This task has reached its reminder limit."
  const weeklySimulated = state.protocolLog.filter(e => e.kind === "reminder" && e.recipientIds.includes(n.ownerId!) && daysBetween(e.scheduledOn, state.today) >= 0 && daysBetween(e.scheduledOn, state.today) < 7).length
  const weeklySent = state.nudges.filter(x => state.nodes.find(t => t.id === x.nodeId)?.ownerId === n.ownerId && daysBetween(x.sentOn, state.today) >= 0 && daysBetween(x.sentOn, state.today) < 7).length
  if (weeklySent + weeklySimulated >= 6) return "This owner has reached the weekly reminder limit."
  return null
}

/** All dates and dependency claims come from current, scheduled state, never AI text. */
export function buildNudge(state: NudgeContext, n: Node, aiMeaning?: unknown): NudgeDraft {
  const p = state.people.find(p => p.id === n.ownerId)
  const downstream = state.nodes.find(x => x.dependsOn.includes(n.id) && x.status !== "done")
  const stale = !n.lastUpdate || daysBetween(n.lastUpdate, state.today) > 3
  const why = downstream ? `We need this before “${short(downstream.title, 6)}”${downstream.latestStart ? ` starts ${fmtShort(downstream.latestStart)}` : " can start"}.` : "We can keep our club plan moving with this step."
  const slot = p?.remindAt === "evening" ? "7 pm" : "9 am"
  const timing = `Suggested: ${slot}; start by ${n.latestStart ? fmtShort(n.latestStart) : "the task's start date"}; club deadline ${n.clubDeadline ? fmtShort(n.clubDeadline) : "in task details"}${n.officialDeadline ? `; ASU ${fmtShort(n.officialDeadline)}` : ""}.`
  const meaning = typeof aiMeaning === "string" && aiMeaning.trim() && !/\d|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow)\b/i.test(aiMeaning) ? short(aiMeaning, 10) : "Together, we make our club's plans happen."
  const body = `• Why now: ${stale ? "If already done, tell us here. " : ""}${why}\n• What: ${short(n.title, 10)}.\n• When: ${timing}\n• How:\n1. Open the task details.\n2. Check materials and share an update.\n• Why it matters: ${meaning}`
  const effort = `~${Math.max(1, n.estDays || 1)} workday${n.estDays > 1 ? "s" : ""}`
  const subject = `${short(n.title, 8)} · ${effort} · due ${n.clubDeadline ? fmtShort(n.clubDeadline) : "in task details"}`
  const check = nudgeCheck(subject, body)
  if (!check.ok) {
    // Unsafe task titles/AI prose are replaced, never sent through as-is.
    const safeBody = `• Why now: ${stale ? "If already done, tell us here. " : ""}We can keep our next step moving.\n• What: Update the task linked below.\n• When: ${timing}\n• How:\n1. Open the task details.\n2. Check materials and share an update.\n• Why it matters: Together, we make our club's plans happen.`
    const safeSubject = `Task update · ${effort} · due ${n.clubDeadline ? fmtShort(n.clubDeadline) : "in task details"}`
    const checked = nudgeCheck(safeSubject, safeBody)
    return { subject: safeSubject, body: safeBody, checked: checked.ok, wordCount: checked.wordCount, source: "Checked template" }
  }
  return { subject, body, checked: true, wordCount: check.wordCount, source: aiMeaning ? "AI + checked template" : "Checked template" }
}

export function taskReplyUrl(origin: string, nodeId: string, action?: string): string {
  return `${origin}/#/tasks?node=${encodeURIComponent(nodeId)}${action ? `&reply=${encodeURIComponent(action)}` : ""}`
}
export function messageText(draft: NudgeDraft, origin: string, nodeId: string, grant?: OfficerGrant): string {
  const url = (action?: string) => grant ? officerUrl(origin, grant, action) : taskReplyUrl(origin, nodeId, action)
  return `${draft.subject}\n\n${draft.body}\n\nTask: ${url()}\n${STATUS_ACTIONS.map(a => `${a.label}: ${url(a.key)}`).join("\n")}`
}
/** Demo recipients are intentionally blank: the sender chooses a fictional/demo destination. */
export function composeUrl(channel: Channel, message: string, subject: string): string {
  if (channel === "whatsapp") return `https://wa.me/?text=${encodeURIComponent(message)}`
  if (channel === "sms") return `sms:?body=${encodeURIComponent(message)}`
  return `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`
}
