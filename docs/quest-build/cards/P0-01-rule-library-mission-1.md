# P0-01 Rule library: type and mission 1 rules

Phase: P0 trial · Work package: rule library · Estimated steps: 25–40 · New tests required: yes (one file, given below)

## Goal

Create the game's rule library type and the four mission 1 rules, with a schema test.

## Read (only these)

- `docs/quest-build/AGENT_BRIEF.md`

## Do not read

`docs/PROGRESS.md`, `docs/PRODUCT_PLAN.md`, `docs/feedback-fix/*`, `src/styles.css`, `src/data/store.tsx`, `netlify/lib/policy-archive.mts`, anything under `src/` other than the two files you create.

## Steps

1. Create `src/quest/ruleLibrary.ts` with exactly the code in "Exact data: ruleLibrary.ts".
2. Create `src/quest/ruleLibrary.test.ts` with exactly the code in "Exact data: ruleLibrary.test.ts".
3. Run `npx vitest run src/quest`.
4. Run `npx tsc --noEmit -p tsconfig.json`.
5. Write the handoff.

## Exact data: ruleLibrary.ts

```ts
/**
 * Rule library for the onboarding game "Mission: Speaker Night".
 * Each rule quotes the ASU rules archive (03_Full_Rules_Archive.txt) verbatim.
 * `record` is the catalog ID (src/data/policyCatalog.ts); `line` is the archive line number.
 */
export type QuestRole = "all" | "president" | "treasurer" | "events" | "marketing" | "secretary"

export interface QuestRuleSource {
  record: string
  line: number
  quote: string
  /** Handbook section name for ASU-R-004; null for other records. */
  section: string | null
}

export interface QuestRule {
  /** "<mission>.<number>", for example "1.1". */
  id: string
  mission: number
  /** Red-line rules must be answered correctly before the game counts as finished. */
  redLine: boolean
  /** The rule in plain English, at most 15 words. */
  summary: string
  sources: QuestRuleSource[]
  /** Roles that act on this rule. */
  leads: QuestRole[]
  /** Cross-role handoff this rule implies, or null. */
  handoff: string | null
  /** Pip's hint, at most 12 words. Never the answer. */
  hint: string
}

export const QUEST_RULES: readonly QuestRule[] = [
  {
    id: "1.1",
    mission: 1,
    redLine: true,
    summary: "Only a top-three officer on the registration form submits budget requests.",
    sources: [
      {
        record: "ASU-R-026",
        line: 4521,
        quote: "Only the top three officers of an organization should submit a budget request since they should’ve taken the required Appropriations Training course. Submissions from advisors or general members will not be considered.",
        section: null,
      },
    ],
    leads: ["president", "treasurer"],
    handoff: "treasurer → top-three officer: a prepared budget request",
    hint: "Check who is listed on the registration form.",
  },
  {
    id: "1.2",
    mission: 1,
    redLine: false,
    summary: "Every officer and the advisor complete anti-hazing training during registration.",
    sources: [
      {
        record: "ASU-R-004",
        line: 800,
        quote: "All student organization officers and advisors will be required to complete anti-hazing training during the registration process.",
        section: "Hazing Prevention",
      },
      {
        record: "ASU-R-004",
        line: 484,
        quote: "These officers must complete the Student Organization Officer Training",
        section: "Registering and Reregistering a Student Organization",
      },
    ],
    leads: ["all"],
    handoff: null,
    hint: "One training applies to officers and advisors alike.",
  },
  {
    id: "1.3",
    mission: 1,
    redLine: false,
    summary: "A top-three officer must pass appropriations training with 100% before funding requests.",
    sources: [
      {
        record: "ASU-R-037",
        line: 5429,
        quote: "In order to pass the training, a top 3 officer (for student organizations) must receive a 100% on each quiz and affirm that you completed the course in all funding requests you submit.",
        section: null,
      },
    ],
    leads: ["president", "treasurer"],
    handoff: null,
    hint: "Funding training is tied to the person who submits.",
  },
  {
    id: "1.4",
    mission: 1,
    redLine: false,
    summary: "USG funding requires at least 10 members on the roster.",
    sources: [
      {
        record: "ASU-R-030",
        line: 4955,
        quote: "a minimum of 10 members is required for USG funding",
        section: null,
      },
    ],
    leads: ["secretary", "treasurer"],
    handoff: "secretary → treasurer: an accurate roster",
    hint: "Count the members on the roster.",
  },
]
```

## Exact data: ruleLibrary.test.ts

```ts
import { describe, expect, it } from "vitest"
import { QUEST_RULES } from "./ruleLibrary"

const words = (value: string) => value.trim().split(/\s+/).filter(Boolean).length

describe("quest rule library", () => {
  it("has unique ids that match their mission", () => {
    const ids = QUEST_RULES.map(rule => rule.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const rule of QUEST_RULES) {
      expect(rule.id).toMatch(/^[1-7]\.\d{1,2}$/)
      expect(Number(rule.id.split(".")[0])).toBe(rule.mission)
    }
  })

  it("keeps summaries and hints short", () => {
    for (const rule of QUEST_RULES) {
      expect(words(rule.summary)).toBeLessThanOrEqual(15)
      expect(words(rule.hint)).toBeLessThanOrEqual(12)
    }
  })

  it("cites at least one archive source per rule", () => {
    for (const rule of QUEST_RULES) {
      expect(rule.sources.length).toBeGreaterThan(0)
      for (const source of rule.sources) {
        expect(source.record).toMatch(/^ASU-R-0\d{2}$/)
        expect(source.line).toBeGreaterThan(0)
        expect(words(source.quote)).toBeGreaterThan(0)
        expect(words(source.quote)).toBeLessThanOrEqual(40)
        if (source.record !== "ASU-R-004") expect(source.section).toBeNull()
      }
    }
  })

  it("names at least one lead role per rule", () => {
    for (const rule of QUEST_RULES) expect(rule.leads.length).toBeGreaterThan(0)
  })
})
```

## Done when

- `npx vitest run src/quest` passes (4 tests).
- `npx tsc --noEmit -p tsconfig.json` passes.
- Only `src/quest/ruleLibrary.ts` and `src/quest/ruleLibrary.test.ts` are new; no other file changed.

## If unsure

Leave it unchanged and say so in the handoff.

## Handoff (≤ 10 lines)

Files changed · both commands and results · anything left unchanged and why.
