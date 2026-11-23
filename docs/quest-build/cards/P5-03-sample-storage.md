# P5-03 Versioned sample persistence

Phase P5. One storage boundary. Estimated40 steps, <=150 changed lines/two files, new tests yes. Use concise existing code style, no verbose boilerplate.

## Read only
- docs/quest-build/AGENT_BRIEF.md and this card
- src/quest/sample/model.ts
- src/quest/sample/transitions.ts
- src/quest/sample/decisions.ts
- src/quest/sample/venue.ts
- src/quest/foundation.ts
- src/engine/questSchedule.ts

## Write only
- src/quest/sample/storage.ts
- src/quest/sample/storage.test.ts

No generic project docs, archives, directories/configuration, packages, delegation, commits or pushes. No production/app/P4 state writes.

## Exports
- `SAMPLE_KEY = "platypus.quest.sample.v1"`.
- `loadSample(storage: Pick<Storage,"getItem">, clock: QuestClock): {state:SampleState;writable:boolean;notice:string}`.
- `saveSample(storage: Pick<Storage,"setItem">, state:SampleState): boolean`.

## Exact validation and behavior
1. No stored value -> initialSample(clock), writable true, empty notice. Read exceptions, malformed JSON, unsupported version, >2000000 characters or any invalid field -> initialSample(clock), writable false, notice `Saved practice stays untouched. This visit will not save.`. Do not remove, replace, migrate, trim or write a stored original while loading.
2. Validate version===1; scene prologue/hq or one STAGES; shot integer0..3; seenIntro boolean; completed unique known stages in STAGES order; attempts array; outcome nullable; plans array.
3. Every SampleDraft (current and each attempt snapshot): requestor null or REQUESTORS id (advisor allowed as an attempted choice); advisorStart/end safe integers0..2 with start<=end; documents unique DOCUMENTS strings, max3; promotion fields namingFixed,markRemoved,logoFlag,artworkAttached boolean, printCount safe0..150, vendor null/licensed/unverified; venue passes validVenue.
4. Reuse foundation loadPractice to validate wall Board rather than duplicating board invariants: pass a read-only adapter whose getItem returns JSON.stringify({version:1,scene:"countdown",board:wall,attempts:[],outcome:null}); accept only if its writable is true. No P4 key or real storage passed to that adapter.
5. Each attempt: number=i+1, known stage, elapsedMs safe integer0..86400000, valid draft snapshot. Recompute judge(snapshot,stage,clock); its passed/rules/failed/message must exactly match recorded values. Do not trust a stored passed flag.
6. Every completed stage must currently pass judge(current,stage,clock) AND have a passed attempt whose relevant STAGE_FIELDS values match current values. The current scene must pass canEnter. This prevents a tampered completion unlock and preserves earlier completed stages when later fields differ.
7. Non-null outcome must equal the last attempt, match current scene and have the same draftOf(current) snapshot. All plans must match the passed venue attempts in order (number and deep-equal layout===attempt.snapshot.venue). No lost/fabricated saved plan history.
8. Valid data returns the actual saved object, writable true, notice empty. Save writes only SAMPLE_KEY with JSON.stringify and catches blocked/quota exceptions ->false. Never trim history or touch any other key.

## Tests
Use questSchedule. Cover empty/new and valid partial round-trip; unchanged original unknown version, malformed or oversized text; a valid advisor-account failed attempt roundtrip; corruption of a passed flag, completed unlock and plan entry rejected with original preserved; thrown read/write and quota; original P4 and existing club key remain byte-identical. No dates invented in product. Existing card model tests already cover progression; do not duplicate every reducer case.

## Done when
`npx vitest run src/quest/sample/storage.test.ts` passes. Only additional command allowed: `npx tsc --noEmit -p tsconfig.json`. Handoff <=10 English lines with truthful scope/check result.
