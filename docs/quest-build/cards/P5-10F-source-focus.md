# P5-10F Restore source-dialog focus to an internal venue trigger

Normal bounded repair, <=150 actual changed lines, two files. GLM5.3 code, read-only DeepSeek review. The final compiled browser reproduced: click Capacity: needs work in venue, close native dialog via Back, activeElement becomes BODY. Sample hides the entire stage during a source dialog, so browser native focus restoration attempts a still-hidden trigger before React unhides it. Header Why already works.

## Exact change
Write only src/quest/sample/Sample.tsx and src/quest/sample/Sample.test.tsx. Preserve all existing assertions, imports/routes/storage/audio/history/quotes/controls. Keep native dialog close/Escape behavior and the hidden-stage boundary. No custom focus trap, timers, global listener, CSS, dependency or fake successful history.

In Sample capture the actual active HTMLElement in a ref when opening a source dialog, for BOTH header Why and VenueEditor onExplain. Reuse a small callback to record the trigger and set source IDs. In useLayoutEffect after sourceDialog becomes null and React unhides the stage, restore focus to the captured trigger only if it isConnected, then clear the ref. A disconnected trigger must not steal focus on scene change. Do not restore on first mount without a recorded trigger, do not change native SourceDialog.

Add one meaningful regression to existing Sample.test.tsx. Use actual rendered controls from fresh prologue through booking, valid engine-dated timeline, complete advisor invite, handoff and promotion to reach VenueEditor. Existing mount/hq/book helpers may be reused. Do not inject fake passed state/localStorage history. For the timeline use questSchedule() deadlines/slot values, not guessed calendar dates. Fire real control events. Focus the actual Capacity: needs work button before opening; assert stage is hidden during dialog, one quotation, Back removes dialog, stage visible and focus EXACTLY returns to that same button. Also retain existing header-Why focus assertion and all five original tests. Platform dialog stubs may be corrected to remove open before dispatching close, guard already-closed, and restore originals in afterEach if needed; this must model native behavior without providing the application focus fix itself.

Read-only dependencies are explicitly listed in active configuration. No directories/config/docsPROGRESS/commits/push/delegation. Allowed shell only the two listed checks. Handoff <=10 English lines.

## Validation
npx vitest run src/quest/sample/Sample.test.tsx
npx tsc --noEmit -p tsconfig.json
Planner full lint, actual compiled Back and native Escape internal-trigger focus, recheck genuine full journey; DeepSeek complete diff review.
