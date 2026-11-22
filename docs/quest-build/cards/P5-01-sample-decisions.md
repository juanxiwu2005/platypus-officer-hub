# P5-01 Typed sample decisions

Phase P5. Work package: deterministic decision contract. Estimated 35 steps, at most 150 changed lines across two files. New tests required: yes.

## Read only
- docs/quest-build/AGENT_BRIEF.md
- this card
- src/quest/ruleLibrary.ts (rules 2.3, 2.6, 5.1 through 5.4 only)

## Write only
- src/quest/sample/decisions.ts
- src/quest/sample/decisions.test.ts

Do not read AGENTS.md, docs/PROGRESS.md, docs/PRODUCT_PLAN.md, src/styles.css, src/data/store.tsx, archives, directories, configuration or any unlisted file. The planner has investigated them. No delegation, shell exploration, packages, commits or pushes.

## Goal
Export the pure typed decision boundary used by the complete sample, with boundary regressions. No UI or dates.

## Exact contract
- `DecisionResult`: `{ passed: boolean; rules: string[]; failed: string[]; message: string }`. Successful rules are explicit; failure returns rules:[] and one failed rule ID.
- `REQUESTORS` readonly array of `{id,name,role,eligible}`: riley/Riley/Events/true, alex/Alex/President/true, sam/Sam/Secretary/true, advisor/Dr. Lee/Advisor/false. These are the sample's three elected, registered account holders, not live authentication.
- `decideRequestor(id: string | null): DecisionResult`: only riley/alex/sam pass 2.3. Others fail 2.3 with `The request cannot move. Use a registered officer account.` Success: `Riley can start the room request.` (use the selected eligible person's name, not always Riley).
- `decideAdvisor(start: number, end: number)`: indices 0/1/2 = Arrivals/Talk/Closing. Pass 2.6 only for start=0/end=2. Require safe integers; all other values fail. Failure `Dr. Lee missed part of the night. Invite the whole shift.` Success `Dr. Lee is with the crew for the whole night.` Full-shift coverage is the authored sample staging of advisor attendance, not a newly quoted policy duration.
- `DOCUMENTS` readonly `["approval", "ritm", "room"]`. `decideHandoff(documents: readonly string[])`: pass 5.1 only when all three known documents are present (duplicates add no credit; unknown documents fail). Failure `Morgan is waiting for the approval, number and room.` Success `Morgan has the confirmed event details.`
- `PromotionDraft`: `{ namingFixed: boolean; markRemoved: boolean; printCount: number; vendor: "licensed" | "unverified" | null; logoFlag: boolean; artworkAttached: boolean }`.
- `initialPromotion(): PromotionDraft`: false,false,120,null,false,false in that field order. A print costs a fictional $5; 120 starts at $600. Values are fictional practice data, not a vendor quote.
- `decidePromotion(draft: PromotionDraft)` validates in this order: missing name fix or retained restricted mark -> fail 5.2, `The poster needs a name and mark fix.`; printCount not safe integer in 0..100 -> fail 5.3, `The print order is outside the $500 limit.`; vendor not licensed, missing logoFlag, or missing artworkAttached -> fail 5.4, `The merchandise folder is not ready for review.`. Otherwise pass rules ["5.2","5.3","5.4"], message `The poster and merchandise folder are ready.`
- Do not change the 33-rule library, add a rule, invent quotations or add numeric dates.

## Steps
1. Implement exactly these exports with strict TypeScript, small shared result helpers if useful; no dependencies or side effects.
2. Add meaningful Vitest tests for eligible/advisor/unknown requestor; partial/full advisor shift and invalid integer; missing/duplicate/unknown documents; all three promotion failure gates; $500 boundary and one-print-over; all fields needed for promotion success. Assert exact failed rule IDs and full successful rule IDs.
3. Run the command below, then give an English handoff of at most 10 lines. Leave anything uncertain unchanged.

## Done when
`npx vitest run src/quest/sample/decisions.test.ts` passes. No other files changed.
