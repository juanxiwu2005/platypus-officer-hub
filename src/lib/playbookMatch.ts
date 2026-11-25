import type { DemoState, PlaybookQuestion } from "../data/types"
import { playbookOf } from "../data/playbook"

/**
 * Similar Playbook questions (phase 1, contract item 6): rules only, no AI. Used by "Add experience" to suggest answering an
 * existing question instead of adding a near-duplicate. Pure and deterministic.
 *
 * Score = word overlap (Dice coefficient of the content words: lowercase, stop words removed, a trailing "s" stemmed)
 * + a bonus for the same category + a bonus for a shared policy ID. A question needs at least one shared word and
 * MIN_SIMILARITY in total, so a category or policy match alone never suggests an unrelated question.
 */

export const MAX_SIMILAR = 3
export const MIN_SIMILARITY = 0.5
export const CATEGORY_BONUS = 0.15
export const POLICY_BONUS = 0.15

const STOP = new Set(("a an the and or but if of to in on at by for from with about into over after before up down out off as is are was were be been being am "
  + "do does did done have has had can could will would shall should may might must i me my we us our you your he she it its they them their "
  + "this that these those there here what which who whom whose when where why how not no yes so than too very just also any some all each "
  + "every more most other another such get got go goes going club").split(" "))

/** The content words of a text: lowercase, split on anything but letters and digits, stop words removed, a trailing "s" dropped. */
export function questionWords(text: string): Set<string> {
  const out = new Set<string>()
  for (const raw of String(text ?? "").toLowerCase().split(/[^a-z0-9]+/)) {
    if (!raw || STOP.has(raw) || (raw.length === 1 && !/[0-9]/.test(raw))) continue
    const word = raw.length > 3 && raw.endsWith("s") && !raw.endsWith("ss") ? raw.slice(0, -1) : raw
    if (!STOP.has(word)) out.add(word)
  }
  return out
}

export interface SimilarOptions {
  /** The category the writer picked: same-category questions get CATEGORY_BONUS. */
  category?: string | null
  /** Policy IDs tied to the new question: a shared one gets POLICY_BONUS. */
  policyIds?: string[]
  /** A question to leave out (for example the one being edited). */
  excludeId?: string
  /** At most this many results (default and maximum MAX_SIMILAR). */
  limit?: number
}

/** How similar `text` (with its options) is to an existing question; 0 when they share no content word. */
export function similarityScore(words: Set<string>, q: PlaybookQuestion, opts: SimilarOptions = {}): number {
  const other = questionWords(q.text)
  let shared = 0
  for (const w of words) if (other.has(w)) shared++
  if (!shared) return 0
  const overlap = (2 * shared) / (words.size + other.size)
  const category = opts.category && q.category === opts.category ? CATEGORY_BONUS : 0
  const policy = opts.policyIds?.some(id => q.policyIds.includes(id)) ? POLICY_BONUS : 0
  return Math.round((overlap + category + policy) * 1e6) / 1e6
}

/** Up to three live questions (not merged) most like `text`, best first; ties keep the Playbook's order. */
export function similarQuestions(s: DemoState, text: string, opts: SimilarOptions = {}): PlaybookQuestion[] {
  const words = questionWords(text)
  if (!words.size) return []
  const limit = Math.max(0, Math.min(MAX_SIMILAR, opts.limit ?? MAX_SIMILAR))
  return playbookOf(s).questions
    .filter(q => !q.mergedInto && q.id !== opts.excludeId)
    .map((q, i) => ({ q, i, score: similarityScore(words, q, opts) }))
    .filter(x => x.score >= MIN_SIMILARITY)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, limit)
    .map(x => x.q)
}
