# P5-03K Reject inconsistent saved completion prefixes

Supervised correctness repair, <=150CHANGEDlines/two existing files. Root independent pure probe built real booking/timeline successes via sampleReducer, went HQ, removed booking from completed, and loadSample still returned writabletrue/no notice. A completed later stage without every prior completion cannot be produced by normal transitions, so this is malformed saved state. No browser gameplay success is inferred from this boundary probe.

## Read only
AGENT_BRIEF,this card,src/quest/sample/model.ts,transitions.ts,src/quest/foundation.ts,src/engine/questSchedule.ts.
## Write only
src/quest/sample/storage.ts
src/quest/sample/storage.test.ts

In loadSample require completed to be an EXACT prefix of STAGES, including empty and all-six. Current comparison to STAGES.filter(includes) allows arbitrary ordered subsets. Replace only that condition, e.g. equality to STAGES.slice(0,completed.length), keeping Array.isArray short-circuit guard. No other validator/history/verdict/snapshot/plan/date/storage/key/model behavior. Missing prefix/unknown/duplicate/out-of-order/oversizecompletedsets use existing readonlyfreshfallback+same rejection notice; preserve every original raw byte. No newmigration/reset/writes.

Add a meaningful regression using the EXISTING valid two-stage booking/timeline helper/fixture and actual snapshots: valid full prefix accepted; make a copy removing booking from completed while retaining genuine successful history/current wall, sceneHQ and outcomenull ->readonlyfresh/no notice suppression/original raw unchanged. Cover a gap if an existing complete fixture permits, without inventing passed assertions or altering any previous test/input. Preserve all current empty/malformed/quota/P4/club/history/plan tests and all assertions. Do not mock loadSample/judge or remove full-valid-prefix coverage. This is boundary testing, not injected full-browser acceptance.

No unlisted source/docs/config/archive/directory, dependencies, delegation, commits/pushes/defaults. Only allowed commands npx vitest run src/quest/sample/storage.test.ts and npx tsc --noEmit -p tsconfig.json. Planner independent full lint plus rerun of genuine reducer corruption probe and DeepSeek before adoption. Short truthful handoff.
