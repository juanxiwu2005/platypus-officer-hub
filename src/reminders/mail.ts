import type { ReminderMail, ReminderMailInput } from "./accessContracts"
import { isPlanTaskHash } from "./planEntry"
import { daysBetween, fmtShort, fromISO, toISO } from "../lib/dates"
import { expectedInputOn } from "./policy"

const words = (value: string) => value.trim().split(/\s+/).filter(Boolean)
const banned = [/is\s+it\s+done\s+yet/i, /\basap\b/i, /this\s+should\s+only\s+take\s+(?:an?|one|1)\s+hour/i, /just\s+use\s+ai/i, /\burgent\b/i, /@everyone|@here/i]
const urls = (value: string) => value.match(/https?:\/\/[^\s<>]+/g) ?? []
const clean = (value: string) => value.replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g, "$1")
  .replace(/https?:\/\/[^\s<>]+/g, "").replace(/<\/?[a-z][^>]*>/gi, "").replace(/\s+/g, " ").trim()
const safe = (value: string, fallback: string) => banned.some(pattern => pattern.test(value)) ? fallback : value
const sentence = (value: string) => /[.!?…]$/.test(value) ? value : `${value}.`
const excerpt = (value: string, limit: number) => {
  const first = value.split(/(?<=[.!?])\s+(?=[A-Z])/)[0]
  const list = words(first)
  return list.length > limit ? `${list.slice(0, Math.max(1, limit)).join(" ")}…` : sentence(first)
}
const validDay = (value: string | null) => !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && toISO(fromISO(value)) === value
const email = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

function taskEntry(value: string) {
  try {
    const url = new URL(value)
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password
      && (/^#\/officer\?access=[\w.%~-]+$/.test(url.hash) || isPlanTaskHash(url.hash))
  } catch { return false }
}

/** Check the complete output, including link count; no unchecked source prose bypasses this. */
export function checkReminderMail(mail: ReminderMail): boolean {
  const links = urls(mail.body)
  return mail.source === "rules" && !!mail.recipientId && taskEntry(mail.taskUrl)
    && links.length === 1 && links[0] === mail.taskUrl && urls(mail.subject).length === 0
    && !/[\r\n]/.test(mail.subject) && !banned.some(pattern => pattern.test(`${mail.subject}\n${mail.body}`))
    && mail.body.startsWith("Hi ") && mail.body.includes("Task due:") && mail.body.includes("Thank you")
    && !/^(?:Why now|What|When|How|Why it matters|Start by|Latest start):/m.test(mail.body)
    && mail.wordCount === words(mail.body).length && mail.wordCount <= 100
    && mail.text === `${mail.subject}\n\n${mail.body}`
    && (mail.intendedEmail === null || email(mail.intendedEmail))
}

function trigger(input: ReminderMailInput, waiting: boolean): string {
  const { facts, today } = input
  if (waiting && input.candidate?.reason === "waiting_followup") return input.request?.response === "acknowledged"
    ? `Input was expected by ${fmtShort(expectedInputOn(input.request))}; it is not recorded as provided.`
    : `${clean(input.requesterName ?? "A teammate")} is still waiting; no reply to the help request is recorded.`
  if (waiting) return `${clean(input.requesterName ?? "A teammate")} is waiting for your input on this task.`
  if (input.candidate?.reason === "no_reply") return "No reply to the previous reminder is recorded. Could you share an update?"
  if (facts.status === "done") return "A completion update is recorded for this task."
  if (facts.status === "waiting") return "This task is marked as waiting. Let us know what would help."
  if (facts.status === "blocked") return "This task is marked as stuck. Let's work out the next step together."
  if (validDay(facts.due)) {
    const late = daysBetween(facts.due!, today)
    if (late > 0) return `${late} day${late === 1 ? "" : "s"} past due; no completion update is recorded.`
    if (late === 0) return "This task is due today; no completion update is recorded."
  }
  if (facts.status === "in_progress") return "Work is marked as in progress. Thank you for keeping us updated."
  if (validDay(facts.startOn) && facts.startOn === today) return "Today is our planned start date; no start update is recorded."
  if (validDay(facts.startOn) && facts.startOn! < today) return "The planned start has passed; no start update is recorded."
  return "A quick note as we prepare for this task."
}

/** Every fact and date comes from the supplied saved state. AI is not part of this path. */
export function buildReminderMail(input: ReminderMailInput): ReminderMail {
  const { facts, recipient, request } = input
  const waiting = input.candidate?.reason === "waiting_on" || !!request
  const activity = safe(clean(facts.eventName ?? "Club work"), "Club work") || "Club work"
  const title = safe(clean(facts.title), "Task update") || "Task update"
  const name = safe(clean(recipient.name).split(" ")[0], "there") || "there"
  const subject = `${activity} · ${title}`
  const due = validDay(facts.due) ? fmtShort(facts.due!) : "Not set"
  const rawRequest = clean(request?.waitingOn ?? "")
  const requestIsName = rawRequest.toLocaleLowerCase() === clean(recipient.name).toLocaleLowerCase()
    || rawRequest.toLocaleLowerCase() === name.toLocaleLowerCase()
  const requirement = waiting
    ? safe(rawRequest && !requestIsName ? rawRequest : "Could you share an update with the task's owner?", "Could you share an update with the task's owner?")
    : safe(clean(facts.requirement), "Please review the task details and share an update.") || "Please review the task details and share an update."
  const importance = waiting
    ? `Your input can help ${clean(input.requesterName ?? "the owner")} plan the next step.`
    : safe(clean(facts.importance), "This supports our club's shared plan.") || "This supports our club's shared plan."
  const intro = safe(trigger(input, waiting), "A quick check-in on this task.")
  const opening = `Hi ${name},\n\nTask due: ${due}\n\n${intro}`
  const closing = `If anything is in the way, share an update so we can help.\nThank you for your work on this.\n\nOpen task: ${input.taskUrl}`
  const available = Math.max(2, 100 - words(`${opening}\n${closing}`).length)
  const requirementBudget = Math.max(1, Math.min(words(requirement).length, Math.max(1, available - Math.min(18, words(importance).length))))
  const requirementLine = excerpt(requirement, requirementBudget)
  const importanceBudget = Math.max(1, available - words(requirementLine).length)
  const body = `${opening}\n\n${requirementLine}\n${excerpt(importance, importanceBudget)}\n\n${closing}`
  const mail: ReminderMail = {
    subject, body, text: `${subject}\n\n${body}`, taskUrl: input.taskUrl,
    recipientId: recipient.id, intendedEmail: email(recipient.email) ? recipient.email : null,
    wordCount: words(body).length, checked: false, source: "rules",
  }
  const scope = waiting
    ? !!request && !request.closedOn && request.recipientId === recipient.id && request.nodeId === facts.nodeId
      && request.ownerId === facts.ownerId && request.ownerVersion === facts.ownerVersion && recipient.id !== facts.ownerId
    : recipient.id === facts.ownerId
  let matchesTask = false
  try {
    const target = new URL(input.taskUrl)
    const path = new URLSearchParams(target.hash.slice(target.hash.indexOf("?") + 1))
    matchesTask = target.hash.startsWith("#/events?") ? (path.get("event") === facts.eventId || !path.has("event")) && path.get("node") === facts.nodeId
      : !target.hash.startsWith("#/tasks?") || path.get("node") === facts.nodeId
  } catch { /* The mail remains unchecked. */ }
  mail.checked = recipient.active && facts.status !== "done" && !!scope && matchesTask && checkReminderMail(mail)
  return mail
}
