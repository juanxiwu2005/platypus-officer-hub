import type { DemoState, HandbookSource, RoleHandoff } from "../data/types"
import { roleDossier } from "./roleDossier"

/**
 * Handoff stage 5: the questions that fill a role's gaps, and the new officer's read-back. All plain rules, no AI: every question names the
 * record it is about, and nothing here writes a date or any text the club did not write (Q2: no AI-written lead sentences).
 */
export interface Candidate { id: string; text: string }
export const MAX_QUESTIONS = 6

const clip = (s: string, n = 90) => s.length > n ? s.slice(0, n - 1) + "…" : s
const titleOf = (s: DemoState, id: string | undefined) => clip(s.nodes.find(n => n.id === id)?.title ?? "this task")

/** Questions for the outgoing officer, worked out from the role's dossier. Specific ones (a record with a hole) come first, then the few every handoff should answer. */
export function questionCandidates(s: DemoState, roleId: string): Candidate[] {
  const role = s.roles.find(r => r.id === roleId)
  if (!role) return []
  const d = roleDossier(s, roleId, { publicOnly: true })
  const out: Candidate[] = []
  for (const row of d.blocks.inFlight) if (row.gap) out.push({ id: `q:purpose:${row.nodeId}`, text: `What is the purpose of “${titleOf(s, row.nodeId)}”? Nothing is recorded.` })
  for (const row of d.blocks.lessons) {
    if (row.id.startsWith("lesson:ext:") && row.gap) out.push({ id: `q:${row.id.slice(7)}`.replace("q:ext:", "q:reason:"), text: `“${titleOf(s, row.nodeId)}” got an extension but no reason was recorded. What held it up?` })
    if (row.id.startsWith("lesson:quiet:")) out.push({ id: `q:quiet:${row.id.slice(13)}`, text: `“${titleOf(s, row.nodeId)}” went quiet. What happened, and what should the next officer do differently?` })
  }
  for (const row of d.blocks.people) if (row.gap && row.contactId) out.push({ id: `q:contact:${row.contactId}`, text: `Nobody has spoken to ${clip(s.contacts.find(c => c.id === row.contactId)?.name ?? "this contact")} yet. What should the next officer know before reaching out?` })
  const record = s.handoffRoles.find(r => r.roleId === roleId)
  const generic: Candidate[] = [
    ...(record && record.interview.length === 0 ? [{ id: "q:generic:first", text: `What are the three things the next ${role.displayName} must do in the first month?` }] : []),
    { id: "q:generic:wrong", text: "What usually goes wrong in this role, and how do you avoid it?" },
    { id: "q:generic:help", text: "Who do you go to for help, and about what?" },
  ]
  return [...out, ...generic].slice(0, MAX_QUESTIONS)
}

/** What the outgoing officer sees: this round's candidates (answered or skipped ones marked), plus questions the new officer raised. */
export function handoffQuestions(s: DemoState, record: RoleHandoff) {
  const saved = new Map((record.questions ?? []).map(q => [q.id, q]))
  const fresh = questionCandidates(s, record.roleId).map(c => saved.get(c.id) ?? { ...c, kind: "gap" as const, status: "open" as const, answer: "" })
  // A question that was answered or skipped stays in the list even when the hole it came from has since filled (an answer fills it).
  const kept = (record.questions ?? []).filter(q => q.kind === "unclear" || !fresh.some(f => f.id === q.id))
  return [...fresh, ...kept]
}

export const READBACK_PROMPTS = [
  "What is the most important thing to do in your first 30 days?",
  "If something goes wrong, who would you go to first, and why?",
  "What is the easiest thing to get wrong in this role?",
] as const

const STOP = new Set(["the", "and", "for", "that", "this", "with", "from", "have", "will", "your", "what", "when", "would", "first", "they", "them", "then", "there", "about", "into", "should", "could", "which", "their", "because", "role", "thing", "things", "make", "sure", "need", "needs"])
export const words = (t: string) => (t.toLowerCase().match(/[a-z][a-z'-]{3,}/g) ?? []).filter(w => !STOP.has(w))

/**
 * Which read-back answers the handbook does not seem to cover: an answer is flagged when none of its meaningful words (four letters or more)
 * appears in any handbook line. This is a rough "is it in there?" check, not a score; the outgoing officer decides what it means.
 */
export function readBackFlags(answers: string[], sources: HandbookSource[], entryIds: string[]): boolean[] {
  const book = new Set(entryIds.flatMap(id => words(sources.find(s => s.id === id)?.text ?? "")))
  return answers.map(a => { const w = words(a); return w.length > 0 && !w.some(x => book.has(x)) })
}
