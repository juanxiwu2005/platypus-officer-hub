# P5-02A Sample state and pure judgments

Phase P5. One deterministic state transition contract; estimated 45 steps. New tests: yes. At most three files and 150 changed lines total. Match the concise interfaces/helpers of foundation.ts, without omitting any behavior or assertion to meet the size budget.

## Read only
- docs/quest-build/AGENT_BRIEF.md and this card
- src/quest/foundation.ts
- src/quest/sample/decisions.ts
- src/quest/sample/venue.ts
- src/engine/questSchedule.ts

## Write only
- src/quest/sample/model.ts
- src/quest/sample/model.test.ts

No generic project documents, archives, directories, configuration, dependencies, delegation, commits or pushes. No date calculations in UI/model; receive QuestClock from the engine.

## Exact types and data
- `STAGES` readonly ["booking","timeline","advisor","handoff","promotion","venue"]. `SampleStage` from it. `SampleScene` = SampleStage | "prologue" | "hq".
- `SampleDraft` fields: requestor:string|null; advisorStart:number; advisorEnd:number; wall:Board (foundation); documents:string[]; promotion:PromotionDraft; venue:VenueLayout.
- `SampleAttempt extends DecisionResult`: stage:SampleStage; number:number; elapsedMs:number; snapshot:SampleDraft.
- `PracticePlan`: number:number; layout:VenueLayout.
- `SampleState extends SampleDraft`: version:1; scene:SampleScene; shot:number; seenIntro:boolean; completed:SampleStage[]; attempts:SampleAttempt[]; outcome:SampleAttempt|null; plans:PracticePlan[].
- `initialSample(clock)` starts version1/prologue/shot0/seenIntro false, requestor null, advisorStart1/advisorEnd1, emptyBoard(clock), documents[], initialPromotion(), initialVenue(), completed/attempts/plans[] and outcome null.
- Export `draftOf(state: SampleDraft): SampleDraft`, which structuredClones ONLY the seven draft fields (requestor, advisorStart, advisorEnd, wall, documents, promotion, venue), never captures attempts/plans recursively.
- Export `judge(draft,stage,clock): DecisionResult`: booking -> decideRequestor; advisor -> decideAdvisor; handoff -> decideHandoff; promotion -> decidePromotion. Timeline -> evaluateWall(draft.wall,clock,1), map passed to all four rules ["2.1","2.2","2.4","2.5"] or [] and failedRuleIds to failed, retain its message. Venue -> checkVenue, all six must pass, rules always[], failed = failed check IDs prefixed "venue.", message success `The room is ready for the crew.` or failure `Room staff cannot confirm this layout yet.`.
- `canEnter(state,scene)`: prologue/hq/booking true. timeline needs booking completed; advisor needs booking+timeline; handoff needs booking+timeline+advisor; promotion needs all four preceding stages; venue needs all five preceding stages. Reject unknown runtime scenes.

- Export `STAGE_FIELDS`, the readonly stage-to-draft-key map given in edit behavior below, so persistence can validate a completed stage against its own relevant snapshot fields.


## Exact STAGE_FIELDS data
Export a typed readonly stage-to-draft-key map: booking:[requestor], timeline:[wall], advisor:[advisorStart,advisorEnd], handoff:[documents], promotion:[promotion], venue:[venue]. Each key is keyof SampleDraft, so downstream transition/storage code can reuse it without duplication.

Do not implement the reducer or UI in this card. The paired transition card does that.

## Tests
Use questSchedule and existing moveTask/emptyBoard; test fresh state defaults and no completion; canEnter denies jumping to timeline/advisor/venue, accepts hq/prologue/booking and rejects an unknown runtime scene; correct completed prefixes unlock only their next stage; judge timeline returns all four exact rule IDs when the five tasks are ordered at49, and fails a late registry; judge initial venue returns venue-prefixed failed IDs and no scored rules; draftOf is independent and contains only seven draft keys, not histories. Other decision/geometry boundary tests already exist; do not duplicate every case.

## Done when
`npx vitest run src/quest/sample/model.test.ts` and optional `npx tsc --noEmit -p tsconfig.json` pass. <=150 actual changed lines in the two files, compact project style. Handoff <=10 English lines, no guessed line count.
