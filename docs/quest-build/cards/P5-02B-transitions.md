# P5-02B Sample transitions and immutable attempts

PhaseP5. One journey transition contract, <=150 actual changed lines/two files. Estimated40 steps, new tests yes. Copy the compact foundation reducer pattern.

## Read only
- docs/quest-build/AGENT_BRIEF.md and this card
- src/quest/sample/model.ts
- src/quest/sample/decisions.ts
- src/quest/sample/venue.ts
- src/quest/foundation.ts
- src/engine/questSchedule.ts

## Write only
- src/quest/sample/transitions.ts
- src/quest/sample/transitions.test.ts

No other source/docs/configuration/archives/directories, packages, delegation, commits or pushes. No date calculations; receive QuestClock.

## Exact action type
Export SampleAction = {type:"go";scene:SampleScene} | {type:"shot";shot:number} | {type:"skipIntro"} | {type:"edit";values:Partial<SampleDraft>} | {type:"check";elapsedMs:number} | {type:"rewind"} | {type:"next"} | {type:"restart"}. Types, STAGES, STAGE_FIELDS, initialSample, draftOf, judge and canEnter already exist in model; do not redefine them.

## Exact reducer behavior
Export `sampleReducer(state:SampleState,action:SampleAction,clock:QuestClock):SampleState` without side effects.
1. go: only canEnter; set scene and outcome:null. Keep all drafts/history. shot: only safe integer0..3, set shot. skipIntro: seenIntro true, scene hq, shot3, outcome null.
2. edit: only in a stage and with no outcome. Filter patch to current stage fields: booking requestor; timeline wall; advisor advisorStart/advisorEnd; handoff documents; promotion promotion; venue venue. If filtered values equal current JSON, return unchanged. Otherwise apply a structuredClone of that patch and remove current/subsequent stages from completed, preserving prior completed stages, ALL attempts and plans. Other supplied keys must not change.
3. check: only in a stage allowed by canEnter, no existing outcome; incomplete timeline (tray not empty) returns unchanged. judge the draft, then append a structured snapshot attempt with global number attempts.length+1 and elapsedMs finite/nonnegative rounded, at most 86400000 (invalid ->0). Preserve all prior attempts. Set outcome to this attempt. A pass adds its stage to completed without duplicates; failure does not add it. Venue pass additionally appends an immutable PracticePlan with attempt number and venue snapshot. No real event writes.
4. rewind: clear outcome only; keep failed draft/history for repair.
5. next: only for passed outcome. booking->timeline, timeline->advisor, advisor->hq, handoff->promotion, promotion->venue, venue->hq; clear outcome.
6. restart: fresh sample in hq with seenIntro true; retain all previous attempts and plans. Never silently erase history.


## Tests
Use actual engine clock and helpers. Test advisor-account failure, no editing while outcome frozen, Rewind preserves draft/history, repair to Riley succeeds, next enters timeline; incomplete wall creates no attempt; NaN elapsed becomes0; snapshot independent from later edits. Build a correct journey by sequential go/edit/check/next through booking, timeline(all five ordered at49), advisor0..2, handoff three documents, promotion fully repaired at100 prints, venue valid fixture. Venue fixture: initialVenue with headcount80, move left-0 to1,3; welcome1,1; buffet9,1; round7,1; access4,2; front3,2; photo0,0; add cover5,4. All ten scored IDs must be represented, six stages complete, and one immutable plan saved. Editing an earlier completed stage invalidates it/downstream but retains all attempts/plans. Restart retains histories. A forged venue scene without preceding completion cannot save a plan. Reuse short helpers and compact test style, do not remove cases.

## Done when
`npx vitest run src/quest/sample/transitions.test.ts` passes; only extra command `npx tsc --noEmit -p tsconfig.json`. Handoff <=10 English lines, actual two-file line total<=150; leave uncertainty for a split.
