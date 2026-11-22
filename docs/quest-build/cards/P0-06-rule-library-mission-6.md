# P0-06 Rule library: mission 6 rules

Phase: owner-requested P0 continuation · Work package: complete rule library · Estimated steps: 15–35 · New tests required: no, existing schema coverage applies

Depends on: P0-05; QUEST_RULES ends with rule "5.4".

## Goal

Append the three approved chapter-6 rules.

## Read (only these)

- `docs/quest-build/AGENT_BRIEF.md`
- `src/quest/ruleLibrary.ts`

## Do not read

`docs/PROGRESS.md`, `docs/PRODUCT_PLAN.md`, `docs/feedback-fix/*`, the source archive, `netlify/lib/policy-archive.mts`, unrelated source files or directories. The planner completed source investigation. Read the listed test file only if this card lists it above.

## Steps

1. Append exactly the three objects in "Exact data" after rule "5.4" at the end of QUEST_RULES. Preserve every earlier byte, type and entry.
2. Run `npx vitest run src/quest`.
3. Run `npx tsc --noEmit -p tsconfig.json`.
4. Return the handoff and finish. The planner handles Git, lint and independent review; do not run Git or exploratory commands.

## Exact data

```ts
  {
    id: "6.1",
    mission: 6,
    redLine: false,
    summary: "Weekday evening sound ends by 9 p.m.; maximum 75 dB measured at 30 feet.",
    sources: [
      { record: "ASU-R-015", line: 2376, quote: "Amplification is only permitted between the hours of 11:30am and 1:00pm and 5:00pm and 9:00pm Monday through Friday and 9:00am-9:00pm Saturday.", section: null },
      { record: "ASU-R-015", line: 2376, quote: "Amplification may not exceed 75 decibels at a distance of 30 feet from the source of the amplification.", section: null },
    ],
    leads: ["events"],
    handoff: null,
    hint: "Which venue limits apply to the time and sound level?",
  },
  {
    id: "6.2",
    mission: 6,
    redLine: true,
    summary: "Call 911 for campus emergencies, identify ASU, then notify the Dean after medical transport.",
    sources: [
      { record: "ASU-R-004", line: 905, quote: "call 911 and tell the dispatchers you are on an ASU Campus and need to be connected to the ASU Police Department", section: "Medical Emergency Procedures" },
      { record: "ASU-R-004", line: 914, quote: "If anyone is transported to a hospital or medical facility for treatment, please notify the ASU Dean of Students Office via this form.", section: "Medical Emergency Procedures" },
    ],
    leads: ["all"],
    handoff: null,
    hint: "Who can dispatch emergency help to the campus?",
  },
  {
    id: "6.3",
    mission: 6,
    redLine: false,
    summary: "Do not sell raffle tickets; free door prizes require equal chances for everyone.",
    sources: [
      { record: "ASU-R-004", line: 780, quote: "ASU and its departments and administrative units are NOT permitted to conduct raffles.", section: "Raffles" },
      { record: "ASU-R-004", line: 780, quote: "Using an actual raffle ticket for a door prize is permitted, as long as attendees are not required to pay for the raffle ticket and everyone has an equal chance of receiving the prize.", section: "Raffles" },
    ],
    leads: ["marketing", "events"],
    handoff: null,
    hint: "Does anyone have to pay for a chance to win?",
  },
```

## Planner source and count verification

These are the existing numbered decisions in chapter 6 of the approved v2 specification. All quotes were verified against the correct record and one-based LF-delimited line of 03_Full_Rules_Archive.txt, with normalized whitespace. Archive text SHA-256: `36fc3a79323bcd92ae29e08349f5120a50ddf296fe77368d1b0e7de7262fa41f`. The 2026-11-22 owner clarification explicitly keeps all six remaining rules: 27 + 3 + 3 = 33. The old 32 total was a counting error; non-scored reflection 7.4 is not a rule and is excluded. No school rule is dropped or combined. No calendar dates, emergency feature, UI, dependency or user data are added.

## Done when

- `npx vitest run src/quest` passes (4 tests).
- `npx tsc --noEmit -p tsconfig.json` passes.
- QUEST_RULES has 30 entries in exact mission/id order; earlier entries and types are unchanged.
- Only `src/quest/ruleLibrary.ts` changed. Do not change any test file. No protected file changed.

## If unsure

Leave uncertain work unchanged and explain it. Do not invent data, relax assertions or change the given card data.

## Handoff (at most 10 lines)

Files changed · both commands and results · anything left uncertain and why.
