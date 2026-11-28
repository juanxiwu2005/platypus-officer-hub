import type { PlaybookAskContext } from "./playbookAsk"

/**
 * The Playbook Ask context as it travels to /api/chat (field `playbookQuestion`). Pure, no imports beyond the type, so the server
 * can use it without loading the Playbook model. docs/feedback-fix/PLAYBOOK_ASK_INTERFACE.md.
 */

/** At most this many answers of each kind (rules, club rules, tips). */
export const MAX_ASK_ITEMS = 10
/** The whole context, serialized, stays under this many characters (about 3 × 10 answers of 400 characters plus labels). */
export const MAX_ASK_CHARS = 16_000

const DATE = /^\d{4}-\d{2}-\d{2}$/
const text = (v: unknown, max: number) => typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : ""
const count = (v: unknown) => typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(10_000, Math.floor(v))) : 0
const list = (v: unknown) => Array.isArray(v) ? v.slice(0, MAX_ASK_ITEMS).filter((x): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x)) : []
const url = (v: unknown) => { const u = text(v, 300); return /^https:\/\/\S+$/.test(u) ? u : null }

/**
 * Checks a `playbookQuestion` from the browser: known fields only, strings trimmed and capped, at most MAX_ASK_ITEMS per list,
 * links https only, dates ISO or empty (they are copied, never computed). Returns null for anything that is not a usable
 * context, or one still larger than MAX_ASK_CHARS after capping.
 */
export function cleanPlaybookAsk(v: unknown): PlaybookAskContext | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null
  const x = v as Record<string, unknown>
  const questionId = text(x.questionId, 120), question = text(x.question, 100)
  if (x.kind !== "playbook-question" || !questionId || !question) return null
  const on = (d: unknown) => { const t = text(d, 10); return DATE.test(t) ? t : "" }
  const author = (a: unknown) => text(a, 80) || null
  const out: PlaybookAskContext = {
    kind: "playbook-question", questionId, question, category: text(x.category, 40),
    rules: list(x.rules).map(r => ({ policyId: text(r.policyId, 40), sourceName: text(r.sourceName, 200), sourceUrl: url(r.sourceUrl), text: text(r.text, 400) })).filter(r => r.text),
    clubRules: list(x.clubRules).map(r => ({ answerId: text(r.answerId, 120), text: text(r.text, 400), author: author(r.author), on: on(r.on) })).filter(r => r.text),
    tips: list(x.tips).map(r => ({ answerId: text(r.answerId, 120), text: text(r.text, 400), author: author(r.author), on: on(r.on), likes: count(r.likes), dislikes: count(r.dislikes) })).filter(r => r.text),
  }
  return JSON.stringify(out).length <= MAX_ASK_CHARS ? out : null
}
