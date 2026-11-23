# P5-07 Venue editor controls and live checks

PhaseP5. One editor over the strong-planner geometry/3D boundary. <=150 actual changed lines/three files, estimated45 steps. Paired regression card follows. Keep concise project style.

## Read only
- docs/quest-build/AGENT_BRIEF.md and this card
- src/quest/sample/venue.ts
- src/quest/sample/RoomView.tsx
- src/styles/quest-foundation.css
- src/styles/quest-room.css

## Write only
- src/quest/sample/VenueEditor.tsx
- src/styles/quest-venue.css

Do not modify or duplicate geometry, renderer, source quotations, rules, dependencies, dates, global styling or app data. No unlisted docs/configuration/archives/directories, delegation, installs, commits or pushes.

## Exact API
Default VenueEditor props `{layout:VenueLayout;onChange:(layout:VenueLayout)=>void;onCheck:()=>void;onExplain:(id:VenueCheckId)=>void}`. Import RoomView, ROOM, PROP_NAMES, initial types, moveProp/addProp/checkVenue from the listed modules. Import ../../styles/quest-venue.css. Parent handles attempts, scoring, source dialog, persistence and outcomes.

## Required behavior
1. Instruction `Prepare a welcoming room. Keep every route clear.`. Caption `Practice proposal. Venue staff confirm the reserved setup.`. This is not an on-site furniture-rearrangement instruction.
2. Live checkVenue(layout) renders six source-backed check buttons in a compact grid. Visible labels from returned checks and Clear/Needs work, never color alone. Clicking calls onExplain(id). Identify the last two as checklist checks accessibly, not extra numbered scored rules. One live status reports `<n>/6 room checks clear`.
3. Native `Guests` number input min0/max120/step1, onChange clamp finite integer to0..120 (invalid ->0), never clamp to80; display `/ 80 capacity` from ROOM. Capacity judge remains geometry's job.
4. Native `Furniture` select over actual layout.items. Human option labels PROP_NAMES[kind] + one-based ordinal, never internal IDs. Selection is local state; data-rewind-focus on this select. Selecting clears the add tool. Selected prop has four move controls (previous/next column or row), Rotate, Remove. Use moveProp for coordinates, toggle turn0/1 with typed literal, remove only that item and clear selection. Never mutate received objects. Do not remove fixed exits/outlets/projection wall (not item props).
5. Native `Add furniture` select listing all PROP_NAMES kinds and a neutral Choose item placeholder. Selecting a kind sets a local tool and clears selection; do not create until a floor/model target is chosen. Caption `Place <prop name> in the room.`. `Done adding` clears tool. Enforce existing60-prop guard by disabling new additions at60; no hidden geometry workaround.
6. Mount RoomView with current layout/selected/tool and callbacks. onSelect stores ID; onMove calls onChange(moveProp(...)); onPlace calls addProp then onChange, selects the new item if created, clears tool. All pointer/touch/floor-plan/keyboard behavior is already in RoomView; do not replace it with fake DOM drag.
7. Collapsed `<details>` `Make it yours`: event name input max48, Theme Teal/Sunset/Sage, Lighting Warm/Cool/Stage, Backdrop Plain/Stripes/Dots, Tablecloth Teal/Cream/Sunset. Update only the chosen VenueLayout field, typed enum values. These creative choices have no invented correctness condition; no external request.
8. Primary `Lock layout` disabled unless all SIX checkVenue results pass. While any fail, secondary `Preview outcome` calls onCheck so the authored consequence/Rewind can be seen. OnCheck is the only outcome trigger; parent judge independently revalidates before storing a plan.
9. Responsive two-column model/inspector desktop, one column mobile; inspector details may collapse. Use token colors/font sizes/radii/shadows, existing focus rules and44px controls, no new animation. RoomView owns its canvas/floor CSS. At most120 visible words in the default venue stage (including parent header); native select option lists and collapsed creative fields are not all shown at once.

## Paired test gate
The following P5-07T card adds all original regression cases. This implementation is a reviewed development proposal; no final adoption until that test card passes.

## Done when
Only allowed command `npx tsc --noEmit -p tsconfig.json` passes. No Vitest command until the paired test exists. Keep this implementation plus CSS <=150 actual lines; do not add tests here or omit required behavior. Handoff <=10 English lines.

## Existing guard and style isolation clarification
A JSX style prop must itself be an object literal with named CSS-variable keys (cast CSSProperties when necessary); never pass a style helper call or spread. The existing AST guard checks the attribute expression, even if a helper returns only variables. Keep shared quest-* classes unchanged; prefix new module classes with sample-venue-. Do not redefine generic sample-scene/sample-paper/sample-tray from other modules. No guard exclusions.
