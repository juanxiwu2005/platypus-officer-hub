# P5-09AT Paired interaction regression gate

Phase P5. Tests only for the immediately preceding P5-09A implementation, authored as a separate small card before that proposal can be adopted. <=150 actual changed lines/one file, estimated30steps.

## Read only
- docs/quest-build/AGENT_BRIEF.md and this card
- src/quest/sample/SourceDialog.tsx
- src/quest/ruleLibrary.ts
- src/quest/sample/venue.ts
- src/data/policyCatalog.ts
- src/engine/questSchedule.ts
- src/lib/dates.ts

## Write only
- src/quest/sample/SourceDialog.test.tsx

No other source/docs/configuration/archives/directories, packages, delegation, commits or pushes. Use actual module exports and visible/accessibility labels from the listed component. Do not mock the component or judge to fake success. Keep all required test inputs/assertions; report a source defect for a separate bounded repair rather than weakening a test. Stub only unavailable browser platform APIs as specified.

## Required tests
Stub native dialog showModal/close only in jsdom. Verify2.3 displays both same-line clauses with ellipsis and correct citation/link; choose5.4 and the grouped RFF source, expect Expense Includes Logo and lines9742/9743 plus availability of the artwork source; timed2.5 uses engine-shifted date (no literal product date); venue.setup is available and displays exact setup quote; close calls parent. All original source bodies must remain unchanged. No waived a11y checks or paraphrased quotation.


## Done when
`npx vitest run src/quest/sample/SourceDialog.test.tsx` passes; only extra command `npx tsc --noEmit -p tsconfig.json`. Planner independently runs full lint/types and checks this test against original behavior before DeepSeek review. Handoff<=10English lines, truthful result and scope.

## Existing React test pattern
Use installed @testing-library/react render/fireEvent/cleanup with Vitest cleanup hooks. Fire separate user actions separately; do not batch pick and target clicks inside one act call, since the second would see stale selection. Do not manually createRoot or change the global React act environment. Keep genuine platform stubs minimal and restore them after each case.

Native dialog/jsdom clarification: platform stubs must mirror native state/events (showModal opens; close only when open clears open and dispatches one close event). For Escape simulate cancel then default nativeclose if not prevented; do not call component callback directly or fake full-browser focus trapping. Planner realChromium already verified Back/Escape/nativeclose once+returnfocus. Preserve all originally required quote/topic/date/callback assertions.
