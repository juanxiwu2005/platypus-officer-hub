# P0-03 Rule library: mission 3 rules

Phase: owner-requested P0 continuation · Work package: fixed rule library · Estimated steps: 15–30 · New tests required: no (existing schema tests cover the entries)

Depends on: P0-02; QUEST_RULES ends with rule "2.6".

## Goal

Append the 7 approved mission 3 rules to the existing library.

## Read (only these)

- `docs/quest-build/AGENT_BRIEF.md`
- `src/quest/ruleLibrary.ts`

## Do not read

`docs/PROGRESS.md`, `docs/PRODUCT_PLAN.md`, `docs/feedback-fix/*`, `src/styles.css`, `src/data/store.tsx`, `netlify/lib/policy-archive.mts`, the source archive, tests, or other source files. The planner has completed source investigation.

## Steps

1. Append exactly the objects in "Exact data" immediately after rule "2.6" at the end of QUEST_RULES. Preserve every existing byte, type and previous rule. Only `src/quest/ruleLibrary.ts` may change.
2. Run `npx vitest run src/quest`.
3. Run `npx tsc --noEmit -p tsconfig.json`.
4. Write the handoff and finish. The planner handles Git, lint and independent review; do not run exploratory or Git commands.

## Exact data

```ts
  {
    id: "3.1",
    mission: 3,
    redLine: false,
    summary: "Include item quotes, vendor details, tax and shipping in budget requests.",
    sources: [
      { record: "ASU-R-037", line: 5544, quote: "make sure to include screenshots and quotes for the items you are requesting", section: null },
      { record: "ASU-R-037", line: 5544, quote: "Don’t forget to add tax or shipping if needed for your request.", section: null },
      { record: "ASU-R-037", line: 5544, quote: "Include the vendor name, description of the item(s), and the total of the items.", section: null },
    ],
    leads: ["events", "marketing", "treasurer"],
    handoff: "events and marketing → treasurer: item details, quotes, tax and shipping",
    hint: "What evidence would the person submitting your budget need?",
  },
  {
    id: "3.2",
    mission: 3,
    redLine: true,
    summary: "Submit funding requests four weeks before items are needed; allow six weeks for speakers.",
    sources: [
      { record: "ASU-R-037", line: 5476, quote: "the budget request is due at least 4 weeks prior to the items needed unless the request includes a speaker agreement, then the paperwork is due 6 weeks out from the event.", section: null },
      { record: "ASU-R-038", line: 6580, quote: "Events that fail to meet the required submission deadlines are automatically ineligible for funding.", section: null },
    ],
    leads: ["treasurer", "events"],
    handoff: null,
    hint: "Which part of this event needs the longer lead time?",
  },
  {
    id: "3.3",
    mission: 3,
    redLine: true,
    summary: "Purchase totals must match approved amounts; ask Appropriations before changing them.",
    sources: [
      { record: "ASU-R-037", line: 5594, quote: "The total estimated amount MUST match the amount approved from your Budget Request.", section: null },
      { record: "ASU-R-026", line: 4540, quote: "Contact the USG-T Appropriations Committee.", section: null },
    ],
    leads: ["treasurer"],
    handoff: null,
    hint: "Compare the approved amount with the final purchase total.",
  },
  {
    id: "3.4",
    mission: 3,
    redLine: true,
    summary: "Stay within each approved budget line; savings on one cannot increase another.",
    sources: [
      { record: "ASU-R-029", line: 4849, quote: "Your awarded funds can only be spent on the items included in your approved budget request at the amounts requested.", section: null },
      { record: "ASU-R-029", line: 4849, quote: "You will not be able to spend $150 on fliers even if you only spent $50 on pens.", section: null },
    ],
    leads: ["treasurer", "marketing"],
    handoff: null,
    hint: "Does an unchanged overall total keep each line within its limit?",
  },
  {
    id: "3.5",
    mission: 3,
    redLine: true,
    summary: "Wait for approval before purchasing; earlier expenses will not be reimbursed.",
    sources: [
      { record: "ASU-R-025", line: 4363, quote: "Purchases made before approval will not be reimbursed.", section: null },
      { record: "ASU-R-038", line: 6625, quote: "Budget requests for expenses already purchased or partially purchased prior to approval will be automatically denied and not reimbursed.", section: null },
    ],
    leads: ["all"],
    handoff: null,
    hint: "Check whether approval came before the purchase.",
  },
  {
    id: "3.6",
    mission: 3,
    redLine: false,
    summary: "USG funds cannot cover expedited shipping, production or processing fees.",
    sources: [
      { record: "ASU-R-028", line: 4768, quote: "Expedited shipping, production, or processing fees", section: null },
      { record: "ASU-R-028", line: 4792, quote: "ASU cannot pay for these items, even if they have been approved to be funded by USG.", section: null },
    ],
    leads: ["treasurer"],
    handoff: null,
    hint: "Check the prohibited-expense list before paying for speed.",
  },
  {
    id: "3.7",
    mission: 3,
    redLine: false,
    summary: "Attach event flyers to purchase requests; wait 24 hours after budget approval.",
    sources: [
      { record: "ASU-R-029", line: 4881, quote: "All clubs and organizations MUST attach the flyer/advertisement used to promote an event to all purchase requests.", section: null },
      { record: "ASU-R-037", line: 5585, quote: "You must wait 24-hours since your bill has been approved in order to submit a purchase request.", section: null },
      { record: "ASU-R-035", line: 5194, quote: "Be sure your purchase request is submitted by a top three officer", section: null },
    ],
    leads: ["treasurer", "marketing"],
    handoff: "marketing → treasurer: final event flyer or advertisement",
    hint: "What promotional material does the purchase request need?",
  },
```

## Planner source verification

These entries implement the existing chapter 3 decisions in QUEST_GAME_SPEC_2026-11-21 section 3. Every quote was verified as a whitespace-normalized substring of its cited, one-based LF-delimited line in 03_Full_Rules_Archive.txt, with the matching record ID. PDF form feeds and Unicode line separators are not counted as new LF lines. The source archive SHA-256 is `36fc3a79323bcd92ae29e08349f5120a50ddf296fe77368d1b0e7de7262fa41f`. Compact source objects keep this task to 93 appended lines; the type and data structure match the established reference. No new rule, scene, dependency, date calculation or design decision is delegated to the coder.

## Done when

- `npx vitest run src/quest` passes (4 existing tests).
- `npx tsc --noEmit -p tsconfig.json` passes.
- QUEST_RULES has 17 entries in mission/id order; every earlier entry is unchanged.
- Only `src/quest/ruleLibrary.ts` changed. No test or protected file changed.

## If unsure

Leave uncertain work unchanged and explain it. Do not guess, change the exact data or weaken a test.

## Handoff (at most 10 lines)

Files changed · both commands and results · anything left unchanged and why.
