# P5-09A Source-backed Why dialog

PhaseP5. One readable source boundary, <=150 actual changed lines/three files, estimated35 steps. Paired regression card follows. All source values already exist; no research or new rule text.

## Read only
- docs/quest-build/AGENT_BRIEF.md and this card
- src/quest/ruleLibrary.ts
- src/quest/sample/venue.ts
- src/data/policyCatalog.ts
- src/engine/questSchedule.ts
- src/lib/dates.ts

## Write only
- src/quest/sample/SourceDialog.tsx
- src/styles/quest-sources.css

No other source/docs/configuration/archives/directories, dependencies, delegation, commits or pushes. Never alter the fixed rule data or source quotes. English UI, token CSS,44px controls, no motion needed.

## API and source selection
Default SourceDialog props `{ids:readonly string[];clock:QuestClock;onClose:()=>void}`. IDs are fixed scored rules or venue.capacity/exits/catering/theatre/accessibility/cables. Include an extra `venue.setup` choice with SETUP_SOURCE whenever venue IDs are present; it is setup context, not a seventh live check or new scored rule.
Scored entries come from QUEST_RULES; venue entries from VENUE_SOURCES/checkVenue(initialVenue()) labels; setup from SETUP_SOURCE. Source links are POLICY_CATALOG record.sourceUrl. No network/AI call.

## Readable quotation grouping
Do not strand a split form label or pretend disjoint clauses are contiguous:
- Consecutive sources with the SAME record and SAME line can be displayed together in a group, separated by a visible ellipsis, retaining both exact quote substrings and the one line citation (for example two Mazevo clauses at2143).
- If a quote has an odd number of literal double-quote characters AND the next source is the same record at line+1, join those two text fragments with a space and cite both lines (the Expense / Includes Logo label at9742/9743). Preserve both exact fragment strings in output; no paraphrase or change to stored data.
- All other quotes stay separate. Provide native Rule and Source quotation selects so EVERY source/group is available, but only one group is visible at once. Switching rule resets source index0. Decorative option numbers are not scores.

## Dialog behavior
- Native HTML dialog with showModal(), aria-labelledby the `Behind the moment` heading, Back button closes it; native Escape/close calls onClose. Cleanup closes an open dialog. Native focus trap and return-focus behavior; no custom browser alert/confirm.
- Selected group in blockquote with exact original quote text(s), record and line or line range, handbook section when present, Open in Handbook link target_blank rel=noreferrer. Do not duplicate all hidden quotation bodies in DOM.
- For timed rule2.1/2.4/2.5, show the corresponding clock.deadlines registry/room/ritm date using fmtShort and its existing engine explanation. `Closed days move earlier.` is the short calendar note. Never compute a date here.
- Venue choices show `Practice proposal. Venue staff confirm the reserved setup.` and allow selecting the exact2399 setup context. The room geometry/checklist facts stay distinguished from the33 scored rules.
- Invalid IDs cannot invent sources; if no known entries, show `No source text for this moment.` with Back.
- Import ../../styles/quest-sources.css. Responsive max-width, max-height/scroll, surface/border tokens and readable native controls. Parent hides the interaction while this modal is open; default source view should remain within120 visible words including the short parent header.

## Paired test gate
The following P5-09AT card adds all original regression cases. This implementation is a reviewed development proposal; no final adoption until that test card passes.

## Done when
Only allowed command `npx tsc --noEmit -p tsconfig.json` passes. No Vitest command until the paired test exists. Keep this implementation plus CSS <=150 actual lines; do not add tests here or omit required behavior. Handoff <=10 English lines.

## Existing guard and style isolation clarification
A JSX style prop must itself be an object literal with named CSS-variable keys (cast CSSProperties when necessary); never pass a style helper call or spread. The existing AST guard checks the attribute expression, even if a helper returns only variables. Keep shared quest-* classes unchanged; prefix new module classes with sample-source-. Do not redefine generic sample-scene/sample-paper/sample-tray from other modules. No guard exclusions.

Planner style-reference clarification: src/styles/quest-foundation.css is explicitly read-only allowed. Use its actual --s*/--fs*/--r*/--ink/--line tokens; no invented alias/fallback fonts/radii/colors. Native close and Escape must notify parent once, Back must use the same native close path.
