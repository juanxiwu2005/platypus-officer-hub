# P5-06A Confirmed publicity handoff

PhaseP5, one physical paper interaction, <=150 actual lines/two files, estimated30steps. Paired tests follow after the promotion adapter, before any final adoption. This replaces only the handoff portion of oversized P5-06; all original behavior retained.

## Read only
- docs/quest-build/AGENT_BRIEF.md and this card
- src/quest/sample/model.ts
- src/quest/sample/decisions.ts
- src/lib/dragSort.ts
- src/styles/quest-foundation.css

## Write only
- src/quest/sample/HandOff.tsx
- src/styles/quest-handoff.css

No unlisted source/docs/configuration/archives/directories, installs/dependencies, delegation, commits or pushes. No scoring, dates, persistence, app state or network here. All English. JSX style must itself be an object literal with named CSS-variable keys, never a helper call/spread; tokens only for colors/type/radii/shadows/motion.44px controls, visible focus. Each paper/target is a sibling button in a position-relative drop wrapper, never nested. Reuse useDragSort for REAL pointer movement, plus tap and Enter/arrows/Enter/Escape. Validate paper IDs and targets, keep unique paper nodes, clear selection on placement. Cursor initializes from the selected paper's CURRENT destination. True reparent restores paper focus in a layout effect; same-destination placement focuses the existing paper immediately with pending flag cleared. Never assume parent check/rewind changes draft fields. Stable hook order. No mock gameplay or hidden pass.

## Exact component
Default HandOff. Props `{draft:SampleDraft;onEdit:(values:Partial<SampleDraft>)=>void;onCheck:()=>void}`; import types from model. Import DOCUMENTS from decisions, ../assets/club-hq.png and ../../styles/quest-handoff.css. Prefix ALL new classes sample-comms-handoff- (shared quest-* unchanged).
Instruction `Hand Morgan the confirmed event details.` Morgan caption `I need the confirmation before the teaser.` Three papers approval/ritm/room with labels Approval/RITM number/Confirmed room. The received IDs are draft.documents, initially empty. Papers live in Riley's tray or Morgan's desk; two data-drop-col wrappers tray/morgan, each with a real target button and sibling papers. Decorative Morgan crop from approved HQ, background600%auto, position20%33%, literal CSS-variable style; unchanged PNG.
Drop/click/key to Morgan adds a known ID without duplicates; tray removes it. Never mutate received arrays; preserve stable order on no-op. Pick before target, arrows choose tray/Morgan, Enter places, Escape cancels; announced status and focus as above. data-rewind-focus on approval paper. Primary `Hand over` always calls parent even with missing docs; no auto-check. Keep default visible words<=120, responsive desktop/touch, token CSS.

## Done
Only `npx tsc --noEmit -p tsconfig.json`. No test file yet;06AT must pass actual controlled regressions before adoption. Handoff<=10English lines, truthful size/checks.
