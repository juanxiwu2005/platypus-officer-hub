# P5-09B Isolated playable sample shell

Phase P5. One integration shell, <=150 actual changed lines/two files, estimated45 steps. Following integration card adds behavior tests before final adoption. No new design decisions.

## Read only
- docs/quest-build/AGENT_BRIEF.md and this card
- src/quest/sample/model.ts, transitions.ts, storage.ts, decisions.ts, venue.ts, RoomView.tsx, Timeline.tsx, OfficerScenes.tsx, CommsScenes.tsx, VenueEditor.tsx, IntroHQ.tsx, story.ts, SourceDialog.tsx
- src/quest/foundation.ts
- src/quest/ruleLibrary.ts
- src/quest/Quest.tsx (reference focus/audio/storage only)
- src/engine/questSchedule.ts
- src/styles/quest-foundation.css
- src/lib/motion.ts

## Write only
- src/quest/sample/Sample.tsx
- src/styles/quest-sample.css

No App or other unlisted edits, packages, archives, generic docs/configuration, directory investigation, delegation, commits or pushes. Reuse the exact listed APIs. English UI, existing tokens,44px controls, at most120 default visible words per scene. No real app state, UI logger, network, AI or business mutation.

## Shell
Default export Sample. Mount main.quest, data-testid quest-sample; import foundation and sample CSS. questSchedule() memo supplies ALL dates. Load storage once with loadSample; access exceptions same readonly fresh fallback notice. useReducer sampleReducer(value,action,clock). Save with saveSample only if writable; permanently switch this visit to memory on failure, show `Practice stays in this tab. Saving is unavailable.`. Never overwrite unsupported original. No useStore or P4 storage change.
Use existing header style: Link to / with accessible Return to Platypus; Mission: Speaker Night wordmark goes HQ; Sound off/on button defaultfalse and CC alwayson. Header h1 SCENE_TITLES[state.scene], HQ nav, Why? button only when current stage has sources. Mission02 or05 kicker based on stage; prologue/HQ `Your next chapter`. Sources IDs STAGE_RULES or six venue.* IDs. SourceDialog mounted only when Why opens; hide active stage/outcome with HTML hidden while modal open (do not unmount/reset it), leave header opener available for native focus return. A venue source button opens exactly that ID plus setup as SourceDialog specifies.
One active scene: Prologue; ClubHQ; OfficerScenes booking/advisor; Timeline; CommsScenes handoff/promotion; VenueEditor. Parent edits dispatch edit patch (inspect exact reducer field). Check dispatch includes elapsed since this scene/attempt entry, finite cap enforced reducer. Every outcome attempt remains in state. HQ resets elapsed on return. Rewind retains current draft/history, clears outcome; reset per-attempt clock and focus underlying `[data-rewind-focus]` or Timeline focusId from evaluateWall(current wall,clock,1).taskId. Clear Timeline focusId on each check/new scene so repeated failures of the same task can restore focus on every Rewind. Scene h1 receives focus on entry, outcome h2 on check; no focusable hidden overlay. Add scoped `.quest [hidden] { display: none; }` so author layout rules cannot reveal hidden interaction/outcome content.
Pip button with approved ../assets/pip-guide.png toggles hint. For stages use first applicable fixed QUEST_RULES.hint (failed rule first if any, otherwise first stage rule). Venue hint `Choose furniture, then a place. Clear all six room checks.`; HQ `Your crew is ready. Start at the wall.`; prologue `Play, pause, or skip. Your progress stays yours.`. Do not invent rule text. Hide hint except on request.

## Consequence and continuation
Keep active interaction mounted hidden under outcome so Rewind restores local selected furniture/focus. Passed venue outcome uses RoomView with layout=outcome.snapshot.venue, arrivals=true, callbacks no-op; caption `A room ready for everyone.`. Failed venue uses same model without arrivals plus exact judge message, no fake successful layout. Timeline failure may use ../assets/consequence-clean.png (actual authored cancellation). Other stages and passed timeline use approved ../assets/club-hq.png cropped to avoid baked HUD; do NOT imply automatic cancellation for wrong account/advisor/promotion.
Outcome h2 `The story moves forward.` onpass, `A moment to rewind.` onfailure; exact outcome.message, primary Continue->next onpass / Rewind onfailure. Header Why stays available, failure no auto-correct. Keep outcomes <=120 visible words. No New rehearsal button outside HQ needed.
Sound toggles per visit only. Reuse P4 local oscillator short success/drop chime pattern after check, opt-in; no audio dependency/music/network. Cleanup AudioContext on unmount. Captions/messages identical with soundoff, audioexceptions neutral.

## Download
ClubHQ download exports ONLY latest state.plans saved layout (not unverified current edits), JSON Blob with `{practiceOnly:true,title:"Speaker Night practice proposal",eventDate:clock.eventDate,attempt:plan.number,layout:plan.layout,notice:"Venue staff confirm the reserved setup."}`. Use a temporary anchor filename speaker-night-practice-plan.json, revoke object URL/remove anchor; no real event/app mutation. onRestart dispatch restart (retains attempts/plans). Replay intro resets shot0 then goes prologue.

## Done when
Only allowed command `npx tsc --noEmit -p tsconfig.json` passes. The following card must test shell/intro/HQ/storage/outcomes before final adoption. Handoff<=10 English lines, actual size, report uncertainty rather than silently discarding requirements.

## Existing guard and style isolation clarification
A JSX style prop must itself be an object literal with named CSS-variable keys (cast CSSProperties when necessary); never pass a style helper call or spread. The existing AST guard checks the attribute expression, even if a helper returns only variables. Keep shared quest-* classes unchanged; prefix new module classes with sample-shell-. Do not redefine generic sample-scene/sample-paper/sample-tray from other modules. No guard exclusions.

Use stable Prologue timer callback props (for example useCallback around dispatch actions) so unrelated sound/hint/storage-notice rerenders cannot restart the current frame timer.

Story module split clarification: IntroHQ is a tiny named reexport adapter; actual Prologue.tsx and ClubHQ.tsx are explicitly allowed read dependencies. Public props/labels remain the original card API. Date chapter completion requires full Mission2 through advisor.
