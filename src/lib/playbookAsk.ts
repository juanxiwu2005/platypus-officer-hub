import { compareAnswers, liveQuestion, PLAYBOOK_CATEGORIES, playbookOf } from "../data/playbook"
import { policySourceById } from "../data/policyCatalog"
import type { DemoState, PlaybookAnswer } from "../data/types"
import { sourceName } from "./sourceNames"
import { MAX_ASK_ITEMS } from "./playbookAskWire"

/**
 * What "Ask AI" on a Playbook question hands the Ask rail (Juanxi, 2026-11-26): the question and the club's answers to it, as
 * data a future AI harness can answer from. Interface: docs/feedback-fix/PLAYBOOK_ASK_INTERFACE.md.
 *
 * Pure and deterministic. It uses the page's ranking (`compareAnswers`, within each kind), full author names, vote counts only (never
 * who voted), no reads and nothing only the president or VP may see. Dates are copied from the stored answers (`verifiedOn ?? on`,
 * ISO); none is computed. Each list keeps at most MAX_ASK_ITEMS answers, best first.
 */
export interface PlaybookAskContext {
  kind: "playbook-question"
  questionId: string
  question: string
  /** The category's label, e.g. "Funding". */
  category: string
  /** School rule answers: the policy record they quote, its source name and official link. */
  rules: { policyId: string; sourceName: string; sourceUrl: string | null; text: string }[]
  /** The club's own standard (written by the president or VP). */
  clubRules: { answerId: string; text: string; author: string | null; on: string }[]
  /** Officers' personal advice. */
  tips: { answerId: string; text: string; author: string | null; on: string; likes: number; dislikes: number }[]
}

/** The Ask context for one question (followed through merges), or null when the question is not in the Playbook. */
export function playbookAskContext(s: DemoState, questionId: string): PlaybookAskContext | null {
  const p = playbookOf(s)
  const q = liveQuestion(p, questionId)
  if (!q || q.mergedInto) return null
  const answers = p.answers.filter(a => a.questionId === q.id)
  const ranked = (kind: PlaybookAnswer["kind"]) => answers.filter(a => a.kind === kind).sort(compareAnswers).slice(0, MAX_ASK_ITEMS)
  const author = (a: PlaybookAnswer) => (a.authorId && s.people.find(x => x.id === a.authorId)?.name) || null
  const category = [...PLAYBOOK_CATEGORIES, ...(p.categories ?? [])].find(c => c.id === q.category)?.label ?? q.category
  return {
    kind: "playbook-question",
    questionId: q.id,
    question: q.text,
    category,
    rules: ranked("rule").map(a => ({ policyId: a.policyId ?? "", sourceName: a.policyId ? sourceName(a.policyId) : "", sourceUrl: a.policyId ? policySourceById(a.policyId)?.sourceUrl ?? null : null, text: a.text })),
    clubRules: ranked("club").map(a => ({ answerId: a.id, text: a.text, author: author(a), on: a.verifiedOn ?? a.on })),
    tips: ranked("experience").map(a => ({ answerId: a.id, text: a.text, author: author(a), on: a.verifiedOn ?? a.on, likes: a.votes.up.length, dislikes: a.votes.down.length })),
  }
}
