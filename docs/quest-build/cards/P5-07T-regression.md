# P5-07T Paired interaction regression gate

Phase P5. Tests only for the immediately preceding P5-07 implementation, authored as a separate small card before that proposal can be adopted. <=150 actual changed lines/one file, estimated30steps.

## Read only
- docs/quest-build/AGENT_BRIEF.md and this card
- src/quest/sample/VenueEditor.tsx
- src/quest/sample/venue.ts
- src/quest/sample/RoomView.tsx
- src/styles/quest-foundation.css
- src/styles/quest-room.css

## Write only
- src/quest/sample/VenueEditor.test.tsx

No other source/docs/configuration/archives/directories, packages, delegation, commits or pushes. Use actual module exports and visible/accessibility labels from the listed component. Do not mock the component or judge to fake success. Keep all required test inputs/assertions; report a source defect for a separate bounded repair rather than weakening a test. Stub only unavailable browser platform APIs as specified.

## Required tests
Controlled layout wrapper. Simulate unavailable WebGL honestly with canvas getContext returning null and matchMedia stub; test actual RoomView floor-plan fallback, not a fake success. Initial room: six problems, Lock layout disabled. Choose Catering in Furniture and place via column10/row2 grid cell: Catering inside becomes Clear, other problems remain. Valid fixture: headcount80; move left-0->(1,3), welcome->(1,1), buffet->(9,1), round->(7,1), access->(4,2), front->(3,2), photo->(0,0); add cover at(5,4) using geometry helpers. Then all checks pass and Lock layout calls parent. Change guests81 -> lock disabled, return80 -> enabled. Creative name/theme does not add correctness requirements. No weakened/skipped tests, no injected browser gameplay acceptance.


## Done when
`npx vitest run src/quest/sample/VenueEditor.test.tsx` passes; only extra command `npx tsc --noEmit -p tsconfig.json`. Planner independently runs full lint/types and checks this test against original behavior before DeepSeek review. Handoff<=10English lines, truthful result and scope.

## Existing React test pattern
Use installed @testing-library/react render/fireEvent/cleanup with Vitest cleanup hooks. Fire separate user actions separately; do not batch pick and target clicks inside one act call, since the second would see stale selection. Do not manually createRoot or change the global React act environment. Keep genuine platform stubs minimal and restore them after each case.
