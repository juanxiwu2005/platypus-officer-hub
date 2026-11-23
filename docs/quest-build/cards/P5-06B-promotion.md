# P5-06B Promotion repair bench and stage adapter

PhaseP5, one workbench interaction plus a tiny typed adapter, <=150actual lines/three files, estimated40steps. Paired tests06AT/06BT must pass before final adoption. No functionality removed from original P5-06.

## Read only
- docs/quest-build/AGENT_BRIEF.md and this card
- src/quest/sample/model.ts
- src/quest/sample/decisions.ts
- src/lib/dragSort.ts
- src/styles/quest-foundation.css
- src/quest/sample/HandOff.tsx

## Write only
- src/quest/sample/Promotion.tsx
- src/quest/sample/CommsScenes.tsx
- src/styles/quest-promotion.css

No unlisted source/docs/configuration/archives/directories, installs/dependencies, delegation, commits or pushes. No scoring, dates, persistence, app state or network here. All English. JSX style must itself be an object literal with named CSS-variable keys, never a helper call/spread; tokens only for colors/type/radii/shadows/motion.44px controls, visible focus. Each paper/target is a sibling button in a position-relative drop wrapper, never nested. Reuse useDragSort for REAL pointer movement, plus tap and Enter/arrows/Enter/Escape. Validate paper IDs and targets, keep unique paper nodes, clear selection on placement. Cursor initializes from the selected paper's CURRENT destination. True reparent restores paper focus in a layout effect; same-destination placement focuses the existing paper immediately with pending flag cleared. Never assume parent check/rewind changes draft fields. Stable hook order. No mock gameplay or hidden pass.

## Promotion API and exact bench
Default Promotion. Props `{draft:SampleDraft;onEdit:(values:Partial<SampleDraft>)=>void;onCheck:()=>void}`; import types from model. Import ../../styles/quest-promotion.css. Prefix new classes sample-comms-promotion-. All updates onEdit({promotion:{...draft.promotion,...patch}}), never other draft fields. No new art or real university logos.
Instruction `Fix the poster. Prepare the merchandise folder.` Physical poster name button initially `Desert Founders Society @ ASU`, toggles namingFixed; correct text `Desert Founders Society at ASU®`. Generic rectangular text `Reserved university mark` toggles markRemoved ->`Original club mark`; no drawn look-alike. data-rewind-focus on name button. Native Print quantity range0..150 step1, actual count field, fictional$5each. Display `$<count*5> / $500`;101 remains selectable, no hidden100clamp.
Paper `Merchandise order` lives in tray/null, `Licensed vendor`/licensed or `Unverified vendor`/unverified physical outboxes. Paper `Artwork proof` lives in tray or `RFF folder`/rff; attached boolean. Give tray a real target too. All target/paper buttons siblings, both papers unique. Correct known drop mapping only: order->tray/licensed/unverified; proof->tray/rff. Keyboard cursor from current destination, arrows select applicable targets, Enter places, Escape cancels. Use actual pointer drag/tap/keyboard, return to tray allowed. A real `Expense Includes Logo` stamp toggles logoFlag, aria-pressed boolean. Primary `Send for review` always calls parent, no scoring. Caption/controls<=120visible words, responsive, tokens/44px/focus.

## Tiny adapter
Default CommsScenes(props {stage:"handoff"|"promotion";draft:SampleDraft;onEdit:(values:Partial<SampleDraft>)=>void;onCheck:()=>void}). Import default HandOff and Promotion, return the appropriate child with three forwarded props. Separate child types keep hooks stable across stages. No logic/CSS/state/validation in adapter. This preserves the API already specified for the final shell.

## Done
Only `npx tsc --noEmit -p tsconfig.json`. Paired regressions follow; no test file added here. Handoff<=10English lines, actual size and uncertainty, no omitted requirements.

Keyboard completeness: picking then Tab to a target supports target ArrowLeft/Right to focus/select applicable targets, native Enter/Space placement, and Escape from any focus inside the workbench cancels the active pick and returns to that paper. Do not stop propagation of Escape needed by the real drag hook. Keep ordinary focused-paper Enter/arrows/Enter/Escape too. Target pending selection is exposed with boolean aria-pressed/current.
