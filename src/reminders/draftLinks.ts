import type { DigestEdit } from "./digestContracts"

/**
 * Task-link tokens and the limits of an edited reminder email (R-S0 §4): the small part that both the editor and the
 * recording reducer use, so the page and the record apply the same rule. The editor itself, its history and the in-memory
 * drafts are in draft.ts, which loads only when a person's email is first opened.
 */

export const SUBJECT_LIMIT = 120
export const BODY_LIMIT = 2000
/** Longer task titles are shortened inside the token (the full title stays in the missing-link list). */
export const TOKEN_TITLE_LIMIT = 60

export interface DraftTask { nodeId: string; title: string; url: string }
export interface DraftLink extends DraftTask { token: string }

const swap = (text: string, from: string, to: string) => text.split(from).join(to)
const count = (text: string, part: string) => part ? text.split(part).length - 1 : 0
const shorten = (value: string, limit: number) => value.length > limit ? `${value.slice(0, limit - 1).trimEnd()}…` : value
/** Square brackets would end the token early; they become round ones. Empty titles read "Task". */
const label = (title: string) => title.replace(/\[/g, "(").replace(/\]/g, ")").replace(/\s+/g, " ").trim() || "Task"
export const TOKEN_LIKE = /\[Open task:[^\]\n]*\]/g
const WEB_ADDRESS = /(?:\b[a-z][a-z\d+.-]*:\/\/|\bwww\.)\S/i
const LINK_PREFIX = "Open task: "

/** One token per task, in task order. Tokens are unique: colliding titles are numbered "(2)", "(3)". */
export function draftLinks(tasks: DraftTask[]): DraftLink[] {
  const used = new Set<string>()
  return tasks.map(task => {
    const base = shorten(label(task.title), TOKEN_TITLE_LIMIT)
    let token = `[Open task: ${base}]`
    for (let n = 2; used.has(token); n++) token = `[Open task: ${shorten(base, TOKEN_TITLE_LIMIT - String(n).length - 3)} (${n})]`
    used.add(token)
    return { ...task, token }
  })
}

/** Rule-written body → body with tokens: each "Open task: <url>" (or a bare <url>) becomes that task's token. */
export function toTokens(body: string, links: DraftLink[]): string {
  // Longest first, so no address can be replaced inside a longer one.
  return [...links].sort((a, b) => b.url.length - a.url.length)
    .reduce((text, link) => swap(swap(text, `${LINK_PREFIX}${link.url}`, link.token), link.url, link.token), body)
}

/**
 * Body with tokens → body with the exact signed URLs ("Open task: <url>"). A token written straight against other text gets
 * a space on that side, so no character can stick to the address and break the link.
 */
export function fromTokens(body: string, links: DraftLink[]): string {
  return links.reduce((text, link) => text.split(link.token).reduce((out, part, index) => index === 0 ? part
    : `${out}${out && !/\s$/.test(out) ? " " : ""}${LINK_PREFIX}${link.url}${part && !/^\s/.test(part) ? " " : ""}${part}`, ""), body)
}

export const missingLinks = (body: string, links: DraftLink[]) => links.filter(link => !body.includes(link.token))

/** Text that looks like a task link but is not one of this email's tokens (an altered token). */
export const strayTokens = (body: string, links: DraftLink[]) => {
  const known = new Set(links.map(link => link.token))
  return [...new Set(body.match(TOKEN_LIKE) ?? [])].filter(token => !known.has(token))
}

export type DraftProblemCode = "subject_empty" | "subject_long" | "subject_line" | "body_long" | "web_address" | "missing_link" | "repeated_link" | "stray_link"
/** One reason an edited email cannot go out: `link` names the task, `token` an altered token, `size` a length over its limit. */
export interface DraftIssue { code: DraftProblemCode; link?: DraftLink; token?: string; size?: number }

/**
 * Everything that stops an edited email from going out, in display order (draft.ts words them). The body is measured as the
 * box shows it (tokens, not addresses). The reducer runs the same check on the email it records, so the page and the record
 * cannot disagree.
 */
export function draftIssues(subject: string, body: string, links: DraftLink[]): DraftIssue[] {
  const out: DraftIssue[] = []
  for (const link of links) {
    const n = count(body, link.token)
    if (n !== 1) out.push({ code: n ? "repeated_link" : "missing_link", link })
  }
  for (const token of strayTokens(body, links)) out.push({ code: "stray_link", token })
  if (!subject.trim()) out.push({ code: "subject_empty" })
  else if (subject.length > SUBJECT_LIMIT) out.push({ code: "subject_long", size: subject.length })
  if (/[\r\n]/.test(subject)) out.push({ code: "subject_line" })
  const shown = toTokens(fromTokens(body, links), links)
  if (shown.length > BODY_LIMIT) out.push({ code: "body_long", size: shown.length })
  const rest = links.reduce((text, link) => swap(text, link.token, " "), `${subject}\n${body}`)
  if (WEB_ADDRESS.test(rest)) out.push({ code: "web_address" })
  return out
}

/**
 * Check an edit as it is recorded (the reducer's half of the rule): every task URL appears exactly once, as "Open task: <url>"
 * followed by a space, a line break or the end; no other address; and the same limits as the box. Returns the edit, "same"
 * when it equals the rule-written email, or null when it must not be recorded.
 */
export function checkDigestEdit(edit: unknown, rule: { subject: string; body: string }, tasks: DraftTask[]): DigestEdit | "same" | null {
  // Exactly { subject, body }: nothing else can ride along into the saved record.
  if (!edit || typeof edit !== "object" || Array.isArray(edit) || Object.keys(edit).sort().join() !== "body,subject") return null
  const { subject, body } = edit as Record<string, unknown>
  if (typeof subject !== "string" || typeof body !== "string") return null
  if (subject === rule.subject && body === rule.body) return "same"
  if (!tasks.length) return null
  for (const task of tasks) {
    if (!task.url || count(body, task.url) !== 1 || count(body, `${LINK_PREFIX}${task.url}`) !== 1) return null
    const after = body.split(task.url)[1]
    if (after && !/^\s/.test(after)) return null
  }
  const links = draftLinks(tasks)
  return draftIssues(subject, toTokens(body, links), links).length ? null : { subject, body }
}

/** The title a token uses. The page and the reducer must name tasks the same way. */
export const draftTitleOf = (state: { nodes: { id: string; title: string }[] }) => (nodeId: string) => state.nodes.find(n => n.id === nodeId)?.title ?? "Task"
