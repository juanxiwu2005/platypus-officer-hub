import { describe, expect, it } from "vitest"
import type { DemoState, PlaybookQuestion } from "../data/types"
import { seedDemo } from "../data/seed"
import { changePlaybook } from "../data/playbook"
import { CATEGORY_BONUS, MIN_SIMILARITY, POLICY_BONUS, questionWords, similarityScore, similarQuestions } from "../lib/playbookMatch"

const base = () => seedDemo(undefined, "v2")
const ids = (qs: PlaybookQuestion[]) => qs.map(q => q.id)
const question = (id: string, text: string, patch: Partial<PlaybookQuestion> = {}): PlaybookQuestion => ({ id, text, category: "tools", roleIds: "all", policyIds: [], checklistItemIds: [], origin: "club", createdOn: "2026-10-29", createdBy: null, ...patch })
const withQuestions = (questions: PlaybookQuestion[]): DemoState => ({ ...base(), playbook: { questions, answers: [] } })

describe("questionWords", () => {
  it("lowercases, drops stop words and punctuation, and stems a trailing s", () => {
    expect([...questionWords("How far AHEAD must the funding requests go in?")]).toEqual(["far", "ahead", "funding", "request"])
    expect([...questionWords("Who keeps the club's rosters?")]).toEqual(["keep", "roster"])
    // Short words and double s are not stemmed.
    expect([...questionWords("bus pass process")]).toEqual(["bus", "pass", "process"])
    expect([...questionWords("$700 was approved, we spent $701")]).toEqual(["700", "approved", "spent", "701"])
    expect(questionWords("   ").size).toBe(0)
  })
})

describe("similarityScore", () => {
  it("is the Dice overlap of content words plus the category and policy bonuses", () => {
    const words = questionWords("How far ahead is a funding request due?")
    const q = question("pq-1", "How far ahead must an event funding request go in?", { category: "funding", policyIds: ["ASU-R-038"] })
    // words: far, ahead, funding, request, due (5); q: far, ahead, event, funding, request (5); shared 4.
    expect(similarityScore(words, q)).toBeCloseTo(0.8, 6)
    expect(similarityScore(words, q, { category: "funding" })).toBeCloseTo(0.8 + CATEGORY_BONUS, 6)
    expect(similarityScore(words, q, { category: "funding", policyIds: ["ASU-R-038"] })).toBeCloseTo(0.8 + CATEGORY_BONUS + POLICY_BONUS, 6)
  })

  it("is 0 without a shared word, whatever the bonuses", () => {
    const q = question("pq-1", "Who keeps the member roster?", { category: "funding", policyIds: ["ASU-R-004"] })
    expect(similarityScore(questionWords("Where is the banner?"), q, { category: "funding", policyIds: ["ASU-R-004"] })).toBe(0)
  })
})

describe("similarQuestions (contract item 6)", () => {
  it("finds the sample question a writer is about to duplicate", () => {
    const s = base()
    expect(ids(similarQuestions(s, "How far ahead must a funding request go in?"))[0]).toBe("pq-1")
    expect(ids(similarQuestions(s, "How do we hand over the Instagram account?"))[0]).toBe("pq-10")
    expect(ids(similarQuestions(s, "Can members bring homemade food?"))).toEqual(["pq-7"])
  })

  it("suggests nothing for an unrelated or empty question", () => {
    const s = base()
    expect(similarQuestions(s, "What color should the new hoodies be?")).toEqual([])
    expect(similarQuestions(s, "")).toEqual([])
    expect(similarQuestions(s, "the a of and?")).toEqual([])
  })

  it("does not suggest on a weak single-word overlap unless the category also matches", () => {
    const s = withQuestions([question("pq-1", "How do we hand over the club Instagram admin and recovery email?", { category: "tools" })])
    // "email" alone: 2*1/(1+5) ≈ 0.33, below the minimum; with the same category ≈ 0.48, still below.
    expect(similarQuestions(s, "email")).toEqual([])
    expect(similarQuestions(s, "email", { category: "tools" })).toEqual([])
    // Two shared words pass.
    expect(ids(similarQuestions(s, "Instagram admin"))).toEqual(["pq-1"])
    expect(MIN_SIMILARITY).toBeGreaterThan(CATEGORY_BONUS + POLICY_BONUS)
  })

  it("returns at most three, best first; ties keep the Playbook's order; bonuses break ties", () => {
    const s = withQuestions([
      question("pq-1", "Where is the banner stored?"),
      question("pq-2", "Where is the banner stored now?"),
      question("pq-3", "Banner stored where?", { category: "promotion" }),
      question("pq-4", "Banner stored where?"),
      question("pq-5", "Where is the old banner stored?"),
    ])
    // pq-1, pq-3 and pq-4 match exactly (1.0); pq-2 ("now") and pq-5 ("old") have one extra word (0.8).
    expect(ids(similarQuestions(s, "banner stored"))).toEqual(["pq-1", "pq-3", "pq-4"])
    expect(ids(similarQuestions(s, "banner stored", { category: "promotion" }))).toEqual(["pq-3", "pq-1", "pq-4"])
    expect(ids(similarQuestions(s, "banner stored", { limit: 1 }))).toEqual(["pq-1"])
    expect(ids(similarQuestions(s, "banner stored", { limit: 10 }))).toHaveLength(3)
    expect(ids(similarQuestions(s, "banner stored", { excludeId: "pq-1" }))).toEqual(["pq-3", "pq-4", "pq-2"])
  })

  it("a shared policy ID adds a bonus", () => {
    const s = withQuestions([question("pq-1", "Can we start promoting early?"), question("pq-2", "Can we start promoting early?", { policyIds: ["ASU-R-004"] })])
    expect(ids(similarQuestions(s, "When can promoting start?", { policyIds: ["ASU-R-004"] }))).toEqual(["pq-2", "pq-1"])
  })

  it("leaves out merged and deleted questions", () => {
    let s = base()
    s = changePlaybook(s, { kind: "mergeQuestion", fromId: "pq-1", intoId: "pq-3" })
    expect(ids(similarQuestions(s, "How far ahead must a funding request go in?"))).not.toContain("pq-1")
    s = changePlaybook(s, { kind: "deleteQuestion", questionId: "pq-7" })
    expect(similarQuestions(s, "Can members bring homemade food?")).toEqual([])
  })

  it("is deterministic", () => {
    const s = base()
    expect(similarQuestions(s, "When must the RITM number reach Student Unions?")).toEqual(similarQuestions(s, "When must the RITM number reach Student Unions?"))
    expect(ids(similarQuestions(s, "When must the RITM number reach Student Unions?"))[0]).toBe("pq-4")
  })
})
