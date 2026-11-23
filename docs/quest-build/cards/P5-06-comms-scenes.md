# P5-06 Publicity handoff and repair bench

PhaseP5. One marketing-workbench scene module. <=150 actual changed lines, three files, estimated45 steps. Paired regression card follows. Use concise P4-style JSX and shared helpers; no loss of cases for a line cap.

## Read only
- docs/quest-build/AGENT_BRIEF.md and this card
- src/quest/sample/model.ts
- src/quest/sample/decisions.ts
- src/lib/dragSort.ts
- src/styles/quest-foundation.css

## Write only
- src/quest/sample/CommsScenes.tsx
- src/styles/quest-comms.css

No unlisted source/docs/config, archives, directories, exploratory shell, packages, delegation, commits or pushes. No rule/date/scoring/persistence logic here. Parent handles those.

## API
Default CommsScenes props `{stage:"handoff"|"promotion";draft:SampleDraft;onEdit:(values:Partial<SampleDraft>)=>void;onCheck:()=>void}`. Import ../assets/club-hq.png and ../../styles/quest-comms.css. No multiple-choice question cards or real university graphics.

## Handoff stage
- Instruction `Hand Morgan the confirmed event details.` Caption from Morgan: `I need the confirmation before the teaser.`
- Three physical paper buttons with IDs approval/ritm/room and labels Approval/RITM number/Confirmed room. Use DOCUMENTS from decisions for IDs; received IDs are in draft.documents.
- Papers begin on Riley's tray, move to Morgan's desk when received, and can return. Two position-relative data-drop-col wrappers tray/morgan, each with a real target button and sibling paper buttons (never nested buttons). Morgan portrait uses approved HQ art cropped with background-size600% auto, position20%33%; decorative only.
- Reuse useDragSort for actual pointer movement; click/tap picks a document then target button drops it. Keyboard Enter pick, ArrowLeft tray/ArrowRight Morgan, Enter drop, Escape cancel; announce selection/placement. Restore moved paper focus. Drop adds/removes a known ID without duplicates. No auto-check.
- Primary `Hand over` always calls onCheck, even when documents are missing, so the parent can show the consequence and Rewind. data-rewind-focus on first available paper.

## Promotion stage
A physical poster, print order and merchandise/RFF folder; no question/answer cards.
- Instruction `Fix the poster. Prepare the merchandise folder.`
- Poster-name button initially `Desert Founders Society @ ASU`, toggles namingFixed; corrected visible text `Desert Founders Society at ASU®`. Use native text for accessible name. A generic rectangular text placeholder `Reserved university mark` toggles markRemoved and then displays `Original club mark`. Never draw a real sunburst/seal, look-alike logo or branded artwork. data-rewind-focus on name button.
- Native range input label `Print quantity`, min0/max150/step1, draft.promotion.printCount. A fictional print costs $5. Show `$<count*5> / $500` as real DOM; onChange updates numeric count only. Parent judge owns the limit; do not silently clamp to100.
- Paper `Merchandise order` goes to physical outboxes `Licensed vendor` / `Unverified vendor` via pointer drag or pick-then-target; keyboard Enter/arrows/Enter and Escape equivalent. Store only the vendor string in the draft. The order remains unique.
- A real button-stamp `Expense Includes Logo`, aria-pressed reflecting logoFlag; toggles it.
- Paper `Artwork proof` can be dragged/picked into target `RFF folder`; artworkAttached true. Drag/drop back to tray removes it. Keep real paper/folder buttons as siblings, not nested. Accessible naming must include actual visible text.
- All promotion updates use onEdit({promotion:{...draft.promotion,...patch}}); no other draft field touched. `Send for review` calls onCheck, never scores locally. The parent requires all 5.2/5.3/5.4 gates.

## Styling/accessibility
Use quest-task/quest-primary/quest-actions and scoped sample-* styles. Position-relative drop containers, token colors/fonts/radii/shadows; visible focus, minimum44px controls, responsive single-column mobile. Existing motion tokens only if needed; no new animation required. <=120 visible words per stage; rule quotes remain in the parent dialog. Decorative portrait is a CSS crop, original PNG unchanged.

## Paired test gate
The following P5-06T card adds all original regression cases. This implementation is a reviewed development proposal; no final adoption until that test card passes.

## Done when
Only allowed command `npx tsc --noEmit -p tsconfig.json` passes. No Vitest command until the paired test exists. Keep this implementation plus CSS <=150 actual lines; do not add tests here or omit required behavior. Handoff <=10 English lines.

## Existing guard and style isolation clarification
A JSX style prop must itself be an object literal with named CSS-variable keys (cast CSSProperties when necessary); never pass a style helper call or spread. The existing AST guard checks the attribute expression, even if a helper returns only variables. Keep shared quest-* classes unchanged; prefix new module classes with sample-comms-. Do not redefine generic sample-scene/sample-paper/sample-tray from other modules. No guard exclusions.

## Established handoff details
Initialize each keyboard placement cursor from the paper's CURRENT destination on pick, not a stale first target. For actual reparent, restore that moved paper in a layout effect; for a same-destination click, focus the existing paper immediately and clear pending focus. Clear selection on all placements, validate drag IDs/known targets, keep one copy of each paper, and make target buttons siblings. No parent check/rewind may be assumed to change a document/vendor value.

Keep React hook order stable across handoff/promotion changes, using separate stage subcomponents if their hooks differ. Do not conditionally call hooks in one component.

## Planner supersession
Unadopted combined implementation run was interrupted after about11minutes without source writes. This scope is replaced by P5-06A HandOff, P5-06B Promotion+adapter, and paired P5-06AT/P5-06BT regressions; every original behavior/case retained.
