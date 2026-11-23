# P5-05K Complete the booking target keyboard path

Normal supervised P5 repair, <=150actual changed lines/three existing files. GLM5.3 coding, DeepSeek independent review. The full M2 sample needs consistent keyboard cancel/placement. Real Chromium reproduced: pick Room request, Tab to Riley, ArrowRight leaves focus on Riley, Escape leaves paper picked/focus on desk. Paper-focus keyboard and mouse/tap already work; preserve them.

## Read only
- AGENT_BRIEF and this card
- src/quest/sample/model.ts, decisions.ts, HandOff.tsx
- src/lib/dragSort.ts
- src/engine/questSchedule.ts
- src/styles/quest-officers.css

## Write only
- src/quest/sample/OfficerScenes.tsx
- src/quest/sample/OfficerScenes.test.tsx
- src/quest/sample/HandOff.test.tsx (test native-activation helper only)

No other source/CSS/config/defaults, dependency, delegation, commit/push or research. Keep all previous tests/assertions/inputs, portraits, labels and mouse/tap/Alt-nudge behavior. No redesign, scoring, dates or storage.

## Exact repair
In Booking only, add component-local root ref (existing useRef import), and a stable data attribute for each officer target. When a paper is picked: target onFocus syncs keyboard cursor to its own index; targets expose pending picked/cursor with boolean aria-pressed; target Left/Right (Up/Down equivalent if retained) chooses the adjacent clamped officer, updates cursor/status and focuses that actual target using the local root/ref. Native Enter/Space then clicks the focused target and uses existing place() so true reparent and same-destination focus work. No edits on focus/arrows alone. Preserve focused-paper Enter/arrows/Enter and Alt+nudge.

Escape from ANY focus inside Booking, when a pick is active and no real pointer drag is active, clears pick, announces Placement cancelled., and returns focus to Room request; do not stop propagation needed by useDragSort global pointer Escape. Paper Escape may bubble idempotently or use the same handler. No advisor changes, no new interaction/station/tray design. Invalid/unpicked target actions remain unchanged.

Add a concise controlled regression to existing test file: pick paper, focus Riley, target Right focuses Alex and selects its pending target without editing draft; native Enter places at Alex with focus/unique paper/clear pick. Pick again, focus another target or Send request, Escape keeps the draft and restores paper focus/clears selection with no auto-check. Include same-destination target Enter after pick. In jsdom simulate native Enter by fireEvent.keyDown then ONLY if its boolean return is true (default not prevented), fireEvent.click the actual button; never choose activation using a supplied flag. This supplements real-browser checks and must not fake state/progress or drop previous assertions.

## Done
Allowed commands only npx vitest run src/quest/sample/OfficerScenes.test.tsx src/quest/sample/HandOff.test.tsx and npx tsc --noEmit -p tsconfig.json. Planner reruns full lint and actual Tab/arrow/Enter/Escape/pointer/no-op checks before critic. Truthful short English handoff. Existing files must remain readable; changed-lines cap150, not total full file length.

## Connected native-keyboard test quality
The existing HandOff.test.tsx enter(el, activate:boolean) helper chooses browser activation from a caller flag. Replace only that helper/calls with activation derived from the actual fireEvent.keyDown return (click if true/default not prevented). Preserve all7tests, every input/assertion and semantics, remove flag arguments/update inaccurate comments only. This ensures a future missing preventDefault cannot be masked. Do not modify HandOff component. Run both existing component test suites and types.
