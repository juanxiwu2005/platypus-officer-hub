# P5-05 Officer desks and advisor shift

PhaseP5. One officer-handoff scene module, <=150 actual changed lines/three files. Estimated40 steps. Paired regression card follows. Copy the P4 interaction patterns; no research/design decisions.

## Read only
- docs/quest-build/AGENT_BRIEF.md and this card
- src/quest/sample/model.ts
- src/quest/sample/decisions.ts
- src/lib/dragSort.ts
- src/quest/Quest.tsx (drag/tap/focus pattern)
- src/styles/quest-foundation.css

## Write only
- src/quest/sample/OfficerScenes.tsx
- src/styles/quest-officers.css

No other source/docs/configuration, archives, shell exploration, dependencies, delegation, commits or pushes. Existing P4 and fixed rule data stay unchanged. All colors, font sizes, radii, shadows/layers/durations use existing tokens; no raw colors/times or inline style except CSS variables/data-derived sizes.

## API
Default OfficerScenes props `{stage:"booking"|"advisor";draft:SampleDraft;onEdit:(values:Partial<SampleDraft>)=>void;onCheck:()=>void}`. Import types from model and REQUESTORS from decisions. Import ../assets/club-hq.png and ../../styles/quest-officers.css. No scoring, persistence or date logic here.

## Booking scene
- Instruction `Hand the room request to an account holder.`
- A paper button `Room request`, initially on a tray and then on the chosen desk, based on draft.requestor. Three registered elected account holders are Riley, Alex, Sam; Dr. Lee is the advisor (use REQUESTORS, not a duplicated eligibility judgment). Caption `Three registered officer accounts. One room request.`
- Four physical desk wrappers with data-drop-col matching IDs and position:relative. Each has a native target button showing person's name and role; when chosen, the paper button is its sibling, never a nested button. Use approved HQ art as a cropped portrait with CSS background-size:600% auto and CSS variables for position: Riley 31%/19%, Alex47%/40%, Sam80%/24%, advisor100%/29%. The art is decorative; names remain real DOM. Keep original PNG bytes unchanged.
- Paper uses useDragSort with data-drag-id=request. Actual pointer drop to known desk/tray calls onEdit requestor ID/null; no duplicate paper. Click/tap first picks paper, then desk target drops it; clicking a desk before picking only announces `Pick up the request first.`. Enter picks, arrows select desk, Enter drops, Escape cancels. Keep paper focus after reparent using a ref/layout effect. Alt+arrows may nudge through desks via the same drag helper.
- Live announcement for pick/place/cancel. Selected paper aria-pressed. data-rewind-focus on paper.
- Primary `Send request` calls onCheck; parent provides consequence/Why/Rewind. Do not silently pass an advisor choice.

## Advisor scene
- Approved Dr. Lee portrait and caption `I need the whole evening in my calendar.`
- Instruction `Extend Dr. Lee's invitation across the whole night.`
- Three visible timeline segments Arrivals/Talk/Closing, highlight indices between draft.advisorStart and advisorEnd inclusive.
- Native range inputs (min0/max2/step1), labels `Dr. Lee joins` and `Dr. Lee leaves`. Start change beyond end moves end with it; end change below start moves start with it, so stored range remains ordered. onEdit both numeric fields in one patch. Native keyboard/touch works; no invented calendar dates.
- data-rewind-focus on start range. Primary `Invite Dr. Lee` calls onCheck. Parent's pure judge decides 2.6; do not score locally or mark the whole mission complete yourself.

## Layout
Use quest-primary/quest-task/quest-actions and scoped sample-* CSS. Desks grid4 desktop/2 mobile; minimum44px button targets; clear focus-visible. Keep each stage's visible text <=120 words (sources live in parent dialog). No animations needed. No multiple-choice question cards.

## Paired test gate
The following P5-05T card adds all original regression cases. This implementation is a reviewed development proposal; no final adoption until that test card passes.

## Done when
Only allowed command `npx tsc --noEmit -p tsconfig.json` passes. No Vitest command until the paired test exists. Keep this implementation plus CSS <=150 actual lines; do not add tests here or omit required behavior. Handoff <=10 English lines.
