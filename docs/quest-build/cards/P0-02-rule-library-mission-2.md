# P0-02 Rule library: mission 2 rules

Phase: P0 trial · Work package: rule library · Estimated steps: 20–35 · New tests required: no (the existing schema test covers the new entries)

Depends on: P0-01 (`src/quest/ruleLibrary.ts` exists).

## Goal

Add the six mission 2 rules to the rule library.

## Read (only these)

- `docs/quest-build/AGENT_BRIEF.md`
- `src/quest/ruleLibrary.ts`

## Do not read

`docs/PROGRESS.md`, `docs/PRODUCT_PLAN.md`, `docs/feedback-fix/*`, `src/styles.css`, `src/data/store.tsx`, `netlify/lib/policy-archive.mts`, anything else under `src/`.

## Steps

1. In `src/quest/ruleLibrary.ts`, append the six objects in "Exact data" to the end of the `QUEST_RULES` array, after rule "1.4", in the order given. Do not change anything else in the file.
2. Run `npx vitest run src/quest`.
3. Run `npx tsc --noEmit -p tsconfig.json`.
4. Write the handoff.

## Exact data

```ts
  {
    id: "2.1",
    mission: 2,
    redLine: true,
    summary: "Register the event in the Event Registry 30 days before the event.",
    sources: [
      {
        record: "ASU-R-004",
        line: 594,
        quote: "Events should be registered 30 days prior to the event.",
        section: "Event Registry",
      },
    ],
    leads: ["events"],
    handoff: "events → Mazevo account holder: the RITM number",
    hint: "Your room request will ask for a number.",
  },
  {
    id: "2.2",
    mission: 2,
    redLine: true,
    summary: "Publicize the event only after it is approved.",
    sources: [
      {
        record: "ASU-R-004",
        line: 598,
        quote: "Advertising the event prior to approval may result in event cancellation, event postponement, and/or referral for conduct review.",
        section: "Event Approval and Event Promotion",
      },
    ],
    leads: ["marketing", "events"],
    handoff: "events → marketing: the approval and RITM number",
    hint: "Has the event been approved yet?",
  },
  {
    id: "2.3",
    mission: 2,
    redLine: false,
    summary: "Up to three registered officers may request Mazevo accounts; advisors cannot.",
    sources: [
      {
        record: "ASU-R-013",
        line: 2143,
        quote: "User Accounts can be requested by up to three (3) elected officers",
        section: null,
      },
      {
        record: "ASU-R-013",
        line: 2143,
        quote: "Organization advisors are not eligible to serve as requestors for student organizations",
        section: null,
      },
    ],
    leads: ["president", "events"],
    handoff: null,
    hint: "Check who holds a Mazevo account.",
  },
  {
    id: "2.4",
    mission: 2,
    redLine: false,
    summary: "Request Memorial Union spaces at least 16 days before the event.",
    sources: [
      {
        record: "ASU-R-015",
        line: 2438,
        quote: "A minimum of sixteen (16) days is required to reserve all reservable spaces including conference rooms, ballroom, and other large and/or outdoor programming spaces.",
        section: null,
      },
    ],
    leads: ["events"],
    handoff: null,
    hint: "Count back from the event date.",
  },
  {
    id: "2.5",
    mission: 2,
    redLine: true,
    summary: "Send the RITM number at least 14 days ahead or the event is cancelled.",
    sources: [
      {
        record: "ASU-R-014",
        line: 2294,
        quote: "Failure to register an event and/or communicate a RITM Number (formerly Event Registry Number) 14 or more days in advance of the event will result in the cancellation of the event and applicable fees will be applied.",
        section: null,
      },
    ],
    leads: ["events"],
    handoff: "events → Mazevo account holder: the RITM number",
    hint: "Student Unions needs one number from the registry.",
  },
  {
    id: "2.6",
    mission: 2,
    redLine: false,
    summary: "The advisor must attend events with guest speakers or outside participants.",
    sources: [
      {
        record: "ASU-R-004",
        line: 453,
        quote: "Advisor attendance is required for events that include guest speakers, performers, vendors, external partners, travel, contracts, or other activities involving individuals or entities outside of the organization.",
        section: "Student Organization Advisor",
      },
    ],
    leads: ["events", "president"],
    handoff: "events → advisor: the event date",
    hint: "Who must attend when outsiders take part?",
  },
```

## Done when

- `npx vitest run src/quest` passes (4 tests).
- `npx tsc --noEmit -p tsconfig.json` passes.
- `QUEST_RULES` has 10 entries, ids 1.1–1.4 then 2.1–2.6; only `src/quest/ruleLibrary.ts` changed.

## If unsure

Leave it unchanged and say so in the handoff.

## Handoff (≤ 10 lines)

Files changed · both commands and results · anything left unchanged and why.
