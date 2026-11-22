# P0-04 Rule library: mission 4 rules

Phase: owner-requested P0 continuation · Work package: fixed rule library · Estimated steps: 15–30 · New tests required: no (existing schema tests cover the entries)

Depends on: P0-03; QUEST_RULES ends with rule "3.7".

## Goal

Append the 6 approved mission 4 rules to the existing library.

## Read (only these)

- `docs/quest-build/AGENT_BRIEF.md`
- `src/quest/ruleLibrary.ts`

## Do not read

`docs/PROGRESS.md`, `docs/PRODUCT_PLAN.md`, `docs/feedback-fix/*`, `src/styles.css`, `src/data/store.tsx`, `netlify/lib/policy-archive.mts`, the source archive, tests, or other source files. The planner has completed source investigation.

## Steps

1. Append exactly the objects in "Exact data" immediately after rule "3.7" at the end of QUEST_RULES. Preserve every existing byte, type and previous rule. Only `src/quest/ruleLibrary.ts` may change.
2. Run `npx vitest run src/quest`.
3. Run `npx tsc --noEmit -p tsconfig.json`.
4. Write the handoff and finish. The planner handles Git, lint and independent review; do not run exploratory or Git commands.

## Exact data

```ts
  {
    id: "4.1",
    mission: 4,
    redLine: false,
    summary: "USG-T event funding covers external speakers, panelists or performers up to $5,000 per event.",
    sources: [
      { record: "ASU-R-038", line: 6556, quote: "Maximum funding for external speakers, panelists, or performers is $5,000 per event.", section: null },
    ],
    leads: ["treasurer", "events"],
    handoff: null,
    hint: "Check the per-event cap before promising the full fee.",
  },
  {
    id: "4.2",
    mission: 4,
    redLine: true,
    summary: "Students must not sign contracts; send agreements through the university process.",
    sources: [
      { record: "ASU-R-037", line: 5676, quote: "Students do not have signature authority.", section: null },
      { record: "ASU-R-037", line: 5677, quote: "DO NOT SIGN any contracts with vendors.", section: null },
      { record: "ASU-R-004", line: 602, quote: "Any agreement signed by a student or student organization may result in personal liability for the individual and/or the organization.", section: "Contracts for Vendors, Guest Speakers, or Performers" },
    ],
    leads: ["events", "treasurer"],
    handoff: "events → Business Office: the unsigned speaker or vendor agreement",
    hint: "Who has authority to sign for the university?",
  },
  {
    id: "4.3",
    mission: 4,
    redLine: false,
    summary: "Vendor invoices must be made out to Arizona State University.",
    sources: [
      { record: "ASU-R-029", line: 4891, quote: "The USG-T business office is unable to remit payment for invoices made out to anyone other than \"Arizona State University.\"", section: null },
    ],
    leads: ["events", "treasurer"],
    handoff: null,
    hint: "Check the bill-to name before requesting an invoice.",
  },
  {
    id: "4.4",
    mission: 4,
    redLine: true,
    summary: "Use Sun Devil Hospitality at Memorial Union; request food exceptions 14 days ahead.",
    sources: [
      { record: "ASU-R-015", line: 2392, quote: "ASU Student Unions and Centers have an exclusive catering service with Sun Devil Hospitality. No other off-site catering services or third party food and beverage are permitted.", section: null },
      { record: "ASU-R-004", line: 648, quote: "A food waiver must be submitted 14 days in advance of the event.", section: "Food Exception Request" },
    ],
    leads: ["events"],
    handoff: null,
    hint: "Does this venue have an exclusive caterer?",
  },
  {
    id: "4.5",
    mission: 4,
    redLine: true,
    summary: "Do not serve home-prepared food or drink at student organization campus events.",
    sources: [
      { record: "ASU-R-004", line: 633, quote: "No home-prepared food or drink is allowed at campus events sponsored by student organizations.", section: "Food at Events" },
    ],
    leads: ["all"],
    handoff: null,
    hint: "Where was the food prepared?",
  },
  {
    id: "4.6",
    mission: 4,
    redLine: false,
    summary: "Food purchases require a Business Meals Form, attendee list, and officer and advisor signatures.",
    sources: [
      { record: "ASU-R-037", line: 5655, quote: "Any purchase involving edible products must include a Business Meals Form and a list of every attendee.", section: null },
      { record: "ASU-R-037", line: 5718, quote: "must be signed by a club officer and your advisor", section: null },
    ],
    leads: ["treasurer", "secretary"],
    handoff: "secretary → treasurer: the complete attendee list",
    hint: "What records and signatures does a food purchase need?",
  },
```

## Planner source verification

These entries implement the existing chapter 4 decisions in QUEST_GAME_SPEC_2026-11-21 section 3. Every quote was verified as a whitespace-normalized substring of its cited, one-based LF-delimited line in 03_Full_Rules_Archive.txt, with the matching record ID. PDF form feeds and Unicode line separators are not counted as new LF lines. The source archive SHA-256 is `36fc3a79323bcd92ae29e08349f5120a50ddf296fe77368d1b0e7de7262fa41f`. Compact source objects keep this task to 76 appended lines; the type and data structure match the established reference. No new rule, scene, dependency, date calculation or design decision is delegated to the coder.

## Done when

- `npx vitest run src/quest` passes (4 existing tests).
- `npx tsc --noEmit -p tsconfig.json` passes.
- QUEST_RULES has 23 entries in mission/id order; every earlier entry is unchanged.
- Only `src/quest/ruleLibrary.ts` changed. No test or protected file changed.

## If unsure

Leave uncertain work unchanged and explain it. Do not guess, change the exact data or weaken a test.

## Handoff (at most 10 lines)

Files changed · both commands and results · anything left unchanged and why.
