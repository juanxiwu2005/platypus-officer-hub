import type { ReminderMail, ReminderMailInput } from "./accessContracts"
import { isPlanTaskHash } from "./planEntry"
import { daysBetween, fmtShort, fromISO, toISO } from "../lib/dates"
import { digestWordBudget, DIGEST_TASK_CAP, expectedInputOn } from "./policy"
import type { ReminderCandidate, ReminderPerson, ReminderTaskFacts, WaitingRequest } from "./contracts"

const words = (value: string) => value.trim().split(/\s+/).filter(Boolean)
const banned = [/is\s+it\s+done\s+yet/i, /\basap\b/i, /this\s+should\s+only\s+take\s+(?:an?|one|1)\s+hour/i, /just\s+use\s+ai/i, /\burgent\b/i, /@everyone|@here/i]
const urls = (value: string) => value.match(/https?:\/\/[^\s<>]+/g) ?? []
/**
 * Any web address in saved prose ("https://…", "ftp://…", "www.…"): the same shapes the edited-email check refuses
 * (WEB_ADDRESS in draftLinks.ts), so a title like "Book www.venue.org" never puts a refused address in the rule-written
 * email and blocks every edit of it. Run again after tags go, in case removing a tag joined an address back together.
 */
const ADDRESS = /(?:\b[a-z][a-z\d+.-]*:\/\/|\bwww\.)[^\s<>]*/gi
const clean = (value: string) => value.replace(/\[([^\]]+)\]\((?:https?:\/\/|www\.)[^)]+\)/gi, "$1")
  .replace(ADDRESS, "").replace(/<\/?[a-z][^>]*>/gi, "").replace(ADDRESS, "").replace(/\s+/g, " ").trim()
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

/** A person's first name from saved prose, or the fallback when it is missing or unusable. */
const firstName = (value: string | null | undefined, fallback: string) => safe(clean(value ?? "").split(" ")[0] ?? "", fallback) || fallback
/** The sign-off: the first name of the president or VP who prepares the email; none when nobody does (automatic sending). */
const signOff = (sender: string | null | undefined) => {
  const value = firstName(sender, "")
  return value ? `\n${value}` : ""
}
/** "Speaker Night: Reserve a room, due Mar 31"; the event and the due date are left out when there is none. */
const subjectFor = (eventName: string | null, title: string, due: string | null) =>
  `${eventName ? `${eventName}: ` : ""}${title}${due ? `, due ${due}` : ""}`

/**
 * Why this email is going out, in plain words a club officer would write (C2, 2026-11-27). Dates come only from the saved
 * facts and the engine; the wording never treats a missing update as proof that no work happened.
 */
function trigger(input: ReminderMailInput, waiting: boolean): string {
  const { facts, today } = input
  const requester = firstName(input.requesterName, "A teammate")
  if (waiting && input.candidate?.reason === "waiting_followup") return input.request?.response === "acknowledged"
    ? `${requester} is still waiting on your input, expected by ${fmtShort(expectedInputOn(input.request))}.`
    : `${requester} asked for help and hasn't heard back yet.`
  if (waiting) return `${requester} is waiting on your input.`
  if (input.candidate?.reason === "no_reply") return "Checking in again on this one. Could you share a quick update?"
  if (facts.status === "done") return "A completion update is recorded for this task."
  if (facts.status === "waiting") return "This task is marked as waiting. Let us know what would help."
  if (facts.status === "blocked") return "This task is marked as stuck. Let's work out the next step together."
  if (validDay(facts.due)) {
    const late = daysBetween(facts.due!, today)
    if (late > 0) return `It's ${late} day${late === 1 ? "" : "s"} past the due date. How's it going?`
    if (late === 0) return "This is due today. How's it going?"
  }
  if (facts.status === "in_progress") return "Good to see this is underway."
  if (validDay(facts.startOn) && facts.startOn === today) return "This is planned to start today. Need anything?"
  if (validDay(facts.startOn) && facts.startOn! < today) return `This was planned to start ${fmtShort(facts.startOn!)}. Need anything?`
  return "A quick note as we prepare for this task."
}

/** Every fact and date comes from the supplied saved state. AI is not part of this path. */
export function buildReminderMail(input: ReminderMailInput): ReminderMail {
  const { facts, recipient, request } = input
  const waiting = input.candidate?.reason === "waiting_on" || !!request
  const activity = facts.eventName ? safe(clean(facts.eventName), "") || null : null
  const title = safe(clean(facts.title), "Task update") || "Task update"
  const name = firstName(recipient.name, "there")
  const dueDay = validDay(facts.due) ? fmtShort(facts.due!) : null
  const subject = subjectFor(activity, title, dueDay)
  const due = dueDay ?? "Not set"
  const rawRequest = clean(request?.waitingOn ?? "")
  const requestIsName = rawRequest.toLocaleLowerCase() === clean(recipient.name).toLocaleLowerCase()
    || rawRequest.toLocaleLowerCase() === name.toLocaleLowerCase()
  const requirement = waiting
    ? safe(rawRequest && !requestIsName ? rawRequest : "Could you share an update with the task's owner?", "Could you share an update with the task's owner?")
    : safe(clean(facts.requirement), "Please review the task details and share an update.") || "Please review the task details and share an update."
  const importance = waiting
    ? `Your input will help ${firstName(input.requesterName, "the owner")} plan the next step.`
    : safe(clean(facts.importance), "This supports our club's shared plan.") || "This supports our club's shared plan."
  const intro = safe(trigger(input, waiting), "A quick check-in on this task.")
  const opening = `Hi ${name},\n\nTask due: ${due}\n\n${intro}`
  const closing = `If anything is in the way, share an update so we can help.\nThank you for your work on this.${signOff(input.senderName)}\n\nOpen task: ${input.taskUrl}`
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

/* ---------- Person digest: several tasks for one person in ONE email (2026-11-19). Rules only, no AI. ---------- */

export interface ReminderDigestMailItem {
  facts: ReminderTaskFacts
  candidate: ReminderCandidate
  request?: WaitingRequest | null
  requesterName?: string
  /** This task's own entry URL (taskAccessUrl for this task's grant). */
  taskUrl: string
}
export interface ReminderDigestMailInput {
  today: string; recipient: ReminderPerson; items: ReminderDigestMailItem[]
  /** Who signs the email: the president or VP preparing it (reminderSenderName); none for automatic sending. */
  senderName?: string | null
}
export interface ReminderDigestMail {
  subject: string
  /** Plain text with exactly one task entry URL per item, in item order. */
  body: string
  text: string
  taskUrls: string[]
  nodeIds: string[]
  recipientId: string
  intendedEmail: string | null
  wordCount: number
  checked: boolean
  source: "rules"
}

const cut = (value: string, limit: number) => {
  const list = words(value)
  return list.length > limit ? `${list.slice(0, limit).join(" ")}…` : list.join(" ")
}
/** The URL is a canonical Plan task entry for exactly this task (and this activity when one is known). */
function entryFor(value: string, nodeId: string, eventId?: string | null): boolean {
  try {
    const url = new URL(value)
    if (!taskEntry(value) || !isPlanTaskHash(url.hash)) return false
    const params = new URLSearchParams(url.hash.slice(url.hash.indexOf("?") + 1))
    return params.get("node") === nodeId && (eventId === undefined || !params.has("event") || params.get("event") === eventId)
  } catch { return false }
}

/** Check the complete digest output: one valid entry link per task, no banned wording, a word budget that scales with items. */
export function checkReminderDigestMail(mail: ReminderDigestMail): boolean {
  const n = Array.isArray(mail.taskUrls) ? mail.taskUrls.length : -1
  if (mail.source !== "rules" || !mail.recipientId || n < 1 || n > DIGEST_TASK_CAP || !Array.isArray(mail.nodeIds) || mail.nodeIds.length !== n) return false
  if (new Set(mail.nodeIds).size !== n || new Set(mail.taskUrls).size !== n) return false
  if (!mail.taskUrls.every((url, index) => typeof url === "string" && typeof mail.nodeIds[index] === "string" && !!mail.nodeIds[index] && entryFor(url, mail.nodeIds[index]))) return false
  const links = urls(mail.body)
  return typeof mail.subject === "string" && typeof mail.body === "string"
    && links.length === n && links.every((link, index) => link === mail.taskUrls[index]) && urls(mail.subject).length === 0
    && !/[\r\n]/.test(mail.subject) && !banned.some(pattern => pattern.test(`${mail.subject}\n${mail.body}`))
    && mail.body.startsWith("Hi ") && (mail.body.match(/^Task due: /gm) ?? []).length === n && mail.body.includes("Thank you")
    && !/^(?:Why now|What|When|How|Why it matters|Start by|Latest start):/m.test(mail.body)
    && mail.wordCount === words(mail.body).length && mail.wordCount <= digestWordBudget(n)
    && mail.text === `${mail.subject}\n\n${mail.body}`
    && (mail.intendedEmail === null || email(mail.intendedEmail))
}

/** Every fact and date comes from the supplied saved state, in the supplied (engine priority) order. */
export function buildReminderDigestMail(input: ReminderDigestMailInput): ReminderDigestMail {
  const { recipient, items, today } = input
  const name = firstName(recipient.name, "there")
  const one = items.length === 1
  const label = (facts: ReminderTaskFacts) => cut(safe(clean(facts.title), "Task update") || "Task update", 12)
  const event = (facts: ReminderTaskFacts) => facts.eventName ? cut(safe(clean(facts.eventName), ""), 8) || null : null
  const dueOf = (facts: ReminderTaskFacts) => validDay(facts.due) ? fmtShort(facts.due!) : null
  // Every task in the email is ready today (the engine's ready list), so a combined email names today.
  const subject = one ? subjectFor(event(items[0].facts), label(items[0].facts), dueOf(items[0].facts)) : `${items.length} club tasks for today`
  const lines = items.map((item, index) => {
    const waiting = item.candidate.reason === "waiting_on" || !!item.request
    const single: ReminderMailInput = { today, facts: item.facts, recipient, taskUrl: item.taskUrl, candidate: item.candidate, request: item.request, requesterName: item.requesterName, senderName: input.senderName }
    const reason = cut(safe(trigger(single, waiting), "A quick check-in on this task."), 18)
    const due = dueOf(item.facts) ?? "Not set"
    const eventName = event(item.facts)
    const title = eventName ? `${label(item.facts)} · ${eventName}` : label(item.facts)
    return `${index + 1}. ${title}\nTask due: ${due}\n${reason}\nOpen task: ${item.taskUrl}`
  })
  const intro = one ? "One task could use an update today." : `${items.length} tasks could use an update today.`
  const body = `Hi ${name},\n\n${intro}\n\n${lines.join("\n\n")}\n\nIf anything is in the way, share an update so we can help.\nThank you for your work on ${one ? "this" : "these"}.${signOff(input.senderName)}`
  const mail: ReminderDigestMail = {
    subject, body, text: `${subject}\n\n${body}`, taskUrls: items.map(item => item.taskUrl), nodeIds: items.map(item => item.facts.nodeId),
    recipientId: recipient.id, intendedEmail: email(recipient.email) ? recipient.email : null,
    wordCount: words(body).length, checked: false, source: "rules",
  }
  const scoped = items.every(item => {
    const { facts, candidate, request } = item
    const waiting = candidate.reason === "waiting_on" || !!request
    const scope = waiting
      ? !!request && !request.closedOn && request.recipientId === recipient.id && request.nodeId === facts.nodeId
        && request.ownerId === facts.ownerId && request.ownerVersion === facts.ownerVersion && recipient.id !== facts.ownerId
        && candidate.waitingRequestId === request.id
      : recipient.id === facts.ownerId && !candidate.waitingRequestId
    return scope && facts.status !== "done" && candidate.nodeId === facts.nodeId && candidate.recipientId === recipient.id
      && entryFor(item.taskUrl, facts.nodeId, facts.eventId)
  })
  mail.checked = recipient.active && items.length > 0 && scoped && checkReminderDigestMail(mail)
  return mail
}
