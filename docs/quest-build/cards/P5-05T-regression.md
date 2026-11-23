# P5-05T Paired interaction regression gate

Phase P5. Tests only for the immediately preceding P5-05 implementation, authored as a separate small card before that proposal can be adopted. <=150 actual changed lines/one file, estimated30steps.

## Read only
- docs/quest-build/AGENT_BRIEF.md and this card
- src/quest/sample/OfficerScenes.tsx
- src/quest/sample/model.ts
- src/quest/sample/decisions.ts
- src/lib/dragSort.ts
- src/quest/Quest.tsx
- src/styles/quest-foundation.css
- src/engine/questSchedule.ts

## Write only
- src/quest/sample/OfficerScenes.test.tsx

No other source/docs/configuration/archives/directories, packages, delegation, commits or pushes. Use actual module exports and visible/accessibility labels from the listed component. Do not mock the component or judge to fake success. Keep all required test inputs/assertions; report a source defect for a separate bounded repair rather than weakening a test. Stub only unavailable browser platform APIs as specified.

## Required tests
Controlled wrapper over initialSample(questSchedule()). Test selecting paper then Dr. Lee vs Riley updates requestor but never auto-checks; paper remains unique/focused after move; keyboard picks/arrows/Enter and Escape; advisor range changes reach0..2 and keep bounds ordered. Checks call parent callback. Assert actual DOM input values/updates, not snapshots of markup. No fake pointer test; planner runs real browser drag/touch.


## Done when
`npx vitest run src/quest/sample/OfficerScenes.test.tsx` passes; only extra command `npx tsc --noEmit -p tsconfig.json`. Planner independently runs full lint/types and checks this test against original behavior before DeepSeek review. Handoff<=10English lines, truthful result and scope.

## Existing React test pattern
Use installed @testing-library/react render/fireEvent/cleanup with Vitest cleanup hooks. Fire separate user actions separately; do not batch pick and target clicks inside one act call, since the second would see stale selection. Do not manually createRoot or change the global React act environment. Keep genuine platform stubs minimal and restore them after each case.

## Concrete keyboard regression from independent review
After click placement on Dr.Lee or another noninitial desk, Enter picks and Enter again without any arrow must keep the paper on that current desk (cursor initializes from current requestor). Verify current-desk identity, unique paper and restored focus; then test arrows/Escape as required. No fake handler invocation or selection injection.

After clicking the paper and the SAME desk again, the unique paper stays on that desk, selection clears and focus returns to the paper even though requestor did not change.
