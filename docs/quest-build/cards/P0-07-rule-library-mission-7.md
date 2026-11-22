# P0-07 Rule library: mission 7 rules and completion coverage

Phase: owner-requested P0 continuation · Work package: complete rule library · Estimated steps: 15–35 · New tests required: yes, one given completion guard

Depends on: P0-06; QUEST_RULES ends with rule "6.3".

## Goal

Append the three approved chapter-7 rules and guard the complete 33-rule/13-red-line contract.

## Read (only these)

- `docs/quest-build/AGENT_BRIEF.md`
- `src/quest/ruleLibrary.ts`
- `src/quest/ruleLibrary.test.ts`

## Do not read

`docs/PROGRESS.md`, `docs/PRODUCT_PLAN.md`, `docs/feedback-fix/*`, the source archive, `netlify/lib/policy-archive.mts`, unrelated source files or directories. The planner completed source investigation. Read the listed test file only if this card lists it above.

## Steps

1. Append exactly the three objects in "Exact data" after rule "6.3" at the end of QUEST_RULES. Preserve every earlier byte, type and entry.
2. In `src/quest/ruleLibrary.test.ts`, insert exactly the test in "Exact test append" before the final closing `})` of the existing describe block, with one blank line before it. Preserve all four existing tests, imports, assertions and helper bytes.
3. Run `npx vitest run src/quest`.
4. Run `npx tsc --noEmit -p tsconfig.json`.
5. Return the handoff and finish. The planner handles Git, lint and independent review; do not run Git or exploratory commands.

## Exact data

```ts
  {
    id: "7.1",
    mission: 7,
    redLine: true,
    summary: "Submit all itemized receipts to the Business Office within 10 days.",
    sources: [
      { record: "ASU-R-037", line: 5726, quote: "All itemized receipts need to be turned into the Business Office within 10 days", section: null },
    ],
    leads: ["all", "treasurer"],
    handoff: "payer → treasurer: itemized receipts for Business Office submission",
    hint: "Check the receipt deadline before putting paperwork aside.",
  },
  {
    id: "7.2",
    mission: 7,
    redLine: false,
    summary: "Unused funding cannot roll over; submit a new budget request each semester.",
    sources: [
      { record: "ASU-R-037", line: 5730, quote: "If funding was not used in a previous semester, it cannot be rolled over into the next semester. Therefore, a new budget request must be submitted each semester.", section: null },
    ],
    leads: ["treasurer", "president"],
    handoff: null,
    hint: "What happens to funding left from the previous semester?",
  },
  {
    id: "7.3",
    mission: 7,
    redLine: false,
    summary: "Missing required paperwork after approval causes the Business Office to revoke approved funding.",
    sources: [
      { record: "ASU-R-038", line: 6630, quote: "If a student, club, or organization fails to submit required paperwork following the approval of a Budget Request, the USG-T Business Office shall be required to rescind and deny the previously approved request.", section: null },
    ],
    leads: ["treasurer"],
    handoff: null,
    hint: "Does approval remove the obligation to submit the required paperwork?",
  },
```

## Exact test append

```ts
  it("contains all 33 approved rules and the 13 required red lines", () => {
    const missionCounts = [4, 6, 7, 6, 4, 3, 3] as const
    const expectedIds = missionCounts.flatMap((count, mission) =>
      Array.from({ length: count }, (_, index) => `${mission + 1}.${index + 1}`),
    )
    expect(QUEST_RULES.map(rule => rule.id)).toEqual(expectedIds)
    expect(QUEST_RULES.filter(rule => rule.redLine).map(rule => rule.id)).toEqual([
      "1.1", "2.1", "2.2", "2.5", "3.2", "3.3", "3.4",
      "3.5", "4.2", "4.4", "4.5", "6.2", "7.1",
    ])
  })
```

## Planner source and count verification

These are the existing numbered decisions in chapter 7 of the approved v2 specification. All quotes were verified against the correct record and one-based LF-delimited line of 03_Full_Rules_Archive.txt, with normalized whitespace. Archive text SHA-256: `36fc3a79323bcd92ae29e08349f5120a50ddf296fe77368d1b0e7de7262fa41f`. The 2026-11-22 owner clarification explicitly keeps all six remaining rules: 27 + 3 + 3 = 33. The old 32 total was a counting error; non-scored reflection 7.4 is not a rule and is excluded. No school rule is dropped or combined. No calendar dates, emergency feature, UI, dependency or user data are added.

## Done when

- `npx vitest run src/quest` passes (5 tests).
- `npx tsc --noEmit -p tsconfig.json` passes.
- QUEST_RULES has 33 entries in exact mission/id order; earlier entries and types are unchanged.
- Only `src/quest/ruleLibrary.ts` and `src/quest/ruleLibrary.test.ts` changed. Add only the one given completion test; preserve all existing tests. No protected file changed.

## If unsure

Leave uncertain work unchanged and explain it. Do not invent data, relax assertions or change the given card data.

## Handoff (at most 10 lines)

Files changed · both commands and results · anything left uncertain and why.
