# P5-04 Reusable complete Countdown Wall view

PhaseP5, one reusable interaction copied from the approved P4 reference. <=150 changed lines in two files, estimated40 steps. New tests yes; concise existing project style.

## Read only
- docs/quest-build/AGENT_BRIEF.md and this card
- src/quest/Quest.tsx (approved wall interaction pattern)
- src/quest/foundation.ts
- src/engine/questSchedule.ts
- src/lib/dragSort.ts
- src/lib/dates.ts
- src/styles/quest-foundation.css

## Write only
- src/quest/sample/Timeline.tsx
- src/quest/sample/Timeline.test.tsx

No unlisted documents, source, configuration, archives, directory exploration, installs, delegation, commits or pushes. Preserve the original P4 files and tests.

## Exact API
Default export Timeline(props): `{board:Board;clock:QuestClock;onChange:(board:Board)=>void;onCheck:()=>void;focusId?:TaskId|null}`.

## Mechanical implementation
1. Copy the P4 board subtree and its selection/keyboard/drag behavior into this controlled view. It owns only selected task, cursor, announcement and focus refs. All board updates call onChange(moveTask(board,id,dest,before)); no localStorage, own reducer, scoring, date calculations, source quotes or audio. The parent handles those.
2. Reuse useDragSort for actual pointer/touch drag, over target, same-day before order and Alt+arrows. Use data-drop-col/data-drag-scroll/data-drag-id and position-relative existing CSS. Preserve click/tap task-then-day, Enter/arrows/Enter, Home/End, Escape, live announcements and focus restoration after reparenting. Optional focusId restores that task after Rewind using a layout effect.
3. Use existing wall plate ../assets/countdown-clean.png, class quest-wall-scene with CSS variable --quest-wall-art. Keep quest-board-surface, title/counter, instruction, scrollable timeline, tray and quest-plan-actions classes. Import ../../styles/quest-foundation.css. No CSS changes needed.
4. TASKS and task IDs/order remain unchanged. Display publicity as `Instagram teaser` (use that label consistently in visible text and announcements); other labels unchanged. Decorative numbers aria-hidden. Days/dates exclusively clock.slots/clock.dates and fmtShort.
5. Selected OR dragged registry/room/ritm marks days earlier than clock.deadlines[id].daysBefore as `quest-day is-late` with visible `Too late`. A late drop remains permitted, to rehearse consequences. Other tasks have no fabricated deadline. The selected cursor has is-target, drop-over is-over.
6. The instruction is exactly `Place tasks before their deadlines. Keep the handoffs in order.`. Keyboard help exactly `Enter, arrows, Enter. Escape cancels.`. Use native day button content with spaces and sr-only `Place selected task` / `before the event, <engine date>` (copy P4 accessible-name fix; do not replace visible content with a conflicting aria-label).
7. Primary `Rehearse timeline` button disabled while board.tray nonempty. On check clear selection then call onCheck. No hidden auto-pass, resets or completion claim.

## Tests
A React controlled wrapper with useState(emptyBoard(questSchedule())). Verify incomplete check disabled; click/tap all five including Instagram teaser at49, check fires only when complete; keyboard select/ArrowRight/Enter moves Registry to42 with focus, Escape cancels; selecting RITM shows day14 late but15 not late using the actual engine clock. Stub only scrollIntoView in jsdom. Do not fake pointer success in unit tests; real pointer/touch verification is a planner browser check.

## Done when
`npx vitest run src/quest/sample/Timeline.test.tsx` passes. Only additional allowed command: `npx tsc --noEmit -p tsconfig.json`. Handoff <=10 English lines, count actual file size honestly; if scope will exceed the cap, leave uncertain work for a split instead of deleting tests.
