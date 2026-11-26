import type { Cheer, DemoState } from "../data/types"

/**
 * Cheer email draft (R1, docs/feedback-fix/CHEERS_R1_CONTRACT.md §2). Signatures are frozen. Nothing here sends mail: the interface
 * opens a draft the sender sends themselves. The body is plain text, at most 80 words besides the note, with no running total.
 */

/** Words the body may use besides the note. */
const BODY_WORDS_MAX = 80
const words = (text: string) => text.split(/\s+/).filter(Boolean).length
const firstName = (s: DemoState, personId: string) => s.people.find(p => p.id === personId)?.name.trim().split(/\s+/)[0] || "there"
/** The first `n` words of `text`, with an ellipsis when cut. */
const clip = (text: string, n: number) => { const w = text.split(/\s+/).filter(Boolean); return w.length <= n ? w.join(" ") : `${w.slice(0, Math.max(1, n)).join(" ")}…` }

/** The link that opens the received card (F5) for its sender or recipient. */
export const cheerLink = (baseUrl: string, cheerId: string): string => `${baseUrl.replace(/#.*$/, "")}#/?cheer=${encodeURIComponent(cheerId)}`

export function cheerMail(s: DemoState, cheer: Cheer, recipientId: string, baseUrl: string): { subject: string; body: string; url: string } {
  const url = cheerLink(baseUrl, cheer.id)
  const sender = s.people.find(p => p.id === cheer.fromId)?.name.trim().split(/\s+/)[0] || "A teammate"
  const task = cheer.nodeId ? s.nodes.find(n => n.id === cheer.nodeId) : undefined
  const event = task?.eventId ? s.events.find(e => e.id === task.eventId) : undefined
  const compose = (title: string, eventName: string) => {
    const what = title ? ` for ${title}${eventName ? ` (${eventName})` : ""}` : ""
    return `Hi ${firstName(s, recipientId)},\n\n${sender} sent you ${cheer.points} points${what}.\n\nWhy: “${cheer.note}”\n\nSee your card:\n${url}`
  }
  const title = task?.title.trim() ?? "", eventName = event?.name.trim() ?? ""
  let body = compose(title, eventName)
  const over = words(body) - words(cheer.note) - BODY_WORDS_MAX
  if (over > 0) {
    // Long task or event names are shortened so the draft stays short; the note is never cut.
    const fixed = words(compose("", "")) - words(cheer.note) + 1 // "for" is one word
    const budget = BODY_WORDS_MAX - fixed
    const eventBudget = eventName ? Math.min(words(eventName), Math.max(1, Math.floor(budget / 3))) : 0
    body = compose(clip(title, Math.max(1, budget - eventBudget)), eventName ? clip(eventName, eventBudget) : "")
  }
  return { subject: `⭐ ${sender} sent you ${cheer.points} points`, body, url }
}
