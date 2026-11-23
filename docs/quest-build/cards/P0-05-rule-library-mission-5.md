# P0-05 Rule library: mission 5 rules

Phase: owner-requested P0 continuation · Work package: fixed rule library · Estimated steps: 15–30 · New tests required: no (existing schema tests cover the entries)

Depends on: P0-04; QUEST_RULES ends with rule "4.6".

## Goal

Append the 4 approved mission 5 rules to the existing library.

## Read (only these)

- `docs/quest-build/AGENT_BRIEF.md`
- `src/quest/ruleLibrary.ts`

## Do not read

`docs/PROGRESS.md`, `docs/PRODUCT_PLAN.md`, `docs/feedback-fix/*`, `src/styles.css`, `src/data/store.tsx`, `netlify/lib/policy-archive.mts`, the source archive, tests, or other source files. The planner has completed source investigation.

## Steps

1. Append exactly the objects in "Exact data" immediately after rule "4.6" at the end of QUEST_RULES. Preserve every existing byte, type and previous rule. Only `src/quest/ruleLibrary.ts` may change.
2. Run `npx vitest run src/quest`.
3. Run `npx tsc --noEmit -p tsconfig.json`.
4. Write the handoff and finish. The planner handles Git, lint and independent review; do not run exploratory or Git commands.

## Exact data

```ts
  {
    id: "5.1",
    mission: 5,
    redLine: false,
    summary: "Obtain approval, the RITM number and confirmed room before promoting the event.",
    sources: [
      { record: "ASU-R-004", line: 598, quote: "Once an event has been approved through the appropriate university processes, including the Event Registry, student organizations can advertise, promote, and/or publish events", section: "Event Approval and Event Promotion" },
    ],
    leads: ["events", "marketing"],
    handoff: "events → marketing: event approval, RITM number and confirmed room",
    hint: "Which confirmation does marketing need from the events lead?",
  },
  {
    id: "5.2",
    mission: 5,
    redLine: false,
    summary: "Place “at ASU®” after the club name; avoid @, sunburst logos and seals.",
    sources: [
      { record: "ASU-R-004", line: 390, quote: "Student organizations may use the geographical designation “at Arizona State University®”, “at ASU®”, or “at (ASU® College/School/Campus name)” at the end of their name with the appropriate licensing symbol included.", section: "Organization Name and Logo" },
      { record: "ASU-R-004", line: 390, quote: "The word “at” must be used and not the @ symbol.", section: "Organization Name and Logo" },
      { record: "ASU-R-004", line: 396, quote: "Students and student groups may not use the ASU sunburst logo or the seal.", section: "Organization Name and Logo" },
    ],
    leads: ["marketing"],
    handoff: null,
    hint: "Check the naming convention and which university marks are reserved.",
  },
  {
    id: "5.3",
    mission: 5,
    redLine: false,
    summary: "Printed marketing materials must not exceed $500 per event.",
    sources: [
      { record: "ASU-R-038", line: 6552, quote: "Printed marketing materials (e.g., flyers, posters) must not exceed $500 per event.", section: null },
    ],
    leads: ["marketing", "treasurer"],
    handoff: null,
    hint: "Check the printed-marketing cap before placing the order.",
  },
  {
    id: "5.4",
    mission: 5,
    redLine: false,
    summary: "Use licensed merchandise vendors; flag logos and attach artwork to the RFF.",
    sources: [
      { record: "ASU-R-009", line: 1530, quote: "Student clubs must use a licensed vendor for all merchandise.", section: null },
      { record: "ASU-R-047", line: 9742, quote: "For any printed material or item containing an ASU logo, image, trademark, mascot, or branded content, \"Expense", section: null },
      { record: "ASU-R-047", line: 9743, quote: "Includes Logo\" must be selected on the RFF.", section: null },
      { record: "ASU-R-047", line: 9744, quote: "A copy of the artwork, design proof, mockup, screenshot, or image being used must be attached to the RFF for review.", section: null },
    ],
    leads: ["marketing", "treasurer"],
    handoff: "marketing → treasurer: licensed vendor, Expense Includes Logo selection, and artwork",
    hint: "Check the vendor and the form’s artwork fields.",
  },
```

## Planner source verification

These entries implement the existing chapter 5 decisions in QUEST_GAME_SPEC_2026-11-21 section 3. Every quote was verified as a whitespace-normalized substring of its cited, one-based LF-delimited line in 03_Full_Rules_Archive.txt, with the matching record ID. PDF form feeds and Unicode line separators are not counted as new LF lines. The source archive SHA-256 is `36fc3a79323bcd92ae29e08349f5120a50ddf296fe77368d1b0e7de7262fa41f`. Compact source objects keep this task to 53 appended lines; the type and data structure match the established reference. No new rule, scene, dependency, date calculation or design decision is delegated to the coder.

## Done when

- `npx vitest run src/quest` passes (4 existing tests).
- `npx tsc --noEmit -p tsconfig.json` passes.
- QUEST_RULES has 27 entries in mission/id order; every earlier entry is unchanged.
- Only `src/quest/ruleLibrary.ts` changed. No test or protected file changed.

## If unsure

Leave uncertain work unchanged and explain it. Do not guess, change the exact data or weaken a test.

## Handoff (at most 10 lines)

Files changed · both commands and results · anything left unchanged and why.
