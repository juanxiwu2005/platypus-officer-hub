import { changePlaybook, questionsFor, type PlaybookAction } from "../../data/playbook"
import type { DemoState, PlaybookQuestion } from "../../data/types"

/**
 * TEMPORARY (Playbook phase 1, interface agent P1-U). Stand-ins for two pieces the model agent (P1-M) delivers in parallel.
 * Remove this file at integration (docs/feedback-fix/PLAYBOOK_P1_CONTRACT.md §2):
 * 1. import `similarQuestions` from `src/lib/playbookMatch.ts` instead of the word-overlap fallback below;
 * 2. dispatch `editQuestion`, `hideQuestion` and `importStarter` as ordinary `PlaybookAction`s, and drop `modelSupports`,
 *    `PendingPlaybookAction` and `playbookStoreAction`.
 */

/** The three actions P1-M adds to `PlaybookAction`; typed here so the page compiles before they exist. */
export type PendingPlaybookAction =
  | { kind: "editQuestion"; questionId: string; text?: string; category?: string; roleIds?: string[] | "all" }
  | { kind: "hideQuestion"; questionId: string; hidden: boolean }
  | { kind: "importStarter" }
export type UiPlaybookAction = PlaybookAction | PendingPlaybookAction

const PENDING = new Set<string>(["editQuestion", "hideQuestion", "importStarter"])

/**
 * True when the model handles this action. The Stage A reducer has no case for the pending kinds and returns undefined,
 * so the interface only offers them (and only dispatches them) once the model answers with a state.
 */
export function modelSupports(s: DemoState, a: UiPlaybookAction): boolean {
  if (!PENDING.has(a.kind)) return true
  try { return changePlaybook(s, a as unknown as PlaybookAction) !== undefined } catch { return false }
}

/** The store action for any Playbook action, frozen or pending. */
export const playbookStoreAction = (a: UiPlaybookAction) => ({ type: "playbookAction" as const, action: a as unknown as PlaybookAction })

const STOP = new Set("a an and are as at be by can could do does for from had has have how i if in is it its many may me might must my no not of on or our should so than that the their them then there they this to us was we were what when where which who why will with would you your".split(" "))
const words = (text: string) => new Set(text.toLowerCase().replace(/[^a-z0-9$]+/g, " ").split(" ")
  .filter(w => w && !STOP.has(w)).map(w => w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w))

/**
 * Fallback for `similarQuestions(s, text, opts?)` (P1-M, src/lib/playbookMatch.ts): up to 3 live questions, best first, by
 * shared words, with a small bonus for the same category or a shared policy ID. Same signature; replaced at integration.
 */
export function similarQuestions(s: DemoState, text: string, opts: { category?: string | null; policyIds?: string[] } = {}): PlaybookQuestion[] {
  const mine = words(text)
  if (mine.size < 2) return []
  return questionsFor(s)
    .map(q => {
      const theirs = words(q.text)
      const shared = [...mine].filter(w => theirs.has(w)).length
      const bonus = (opts.category && q.category === opts.category ? 0.1 : 0) + (opts.policyIds?.some(id => q.policyIds.includes(id)) ? 0.1 : 0)
      return { q, shared, score: shared / Math.max(2, Math.min(mine.size, theirs.size)) + bonus }
    })
    .filter(x => x.shared >= 2 && x.score >= 0.4)
    .sort((a, b) => b.score - a.score || a.q.id.localeCompare(b.q.id))
    .slice(0, 3)
    .map(x => x.q)
}
