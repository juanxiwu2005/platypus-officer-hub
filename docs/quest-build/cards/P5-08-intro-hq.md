# P5-08 Skippable prologue and Club HQ

PhaseP5. One story/presentation module. <=150 actual changed lines/three files; estimated40 steps. New integration tests are in the following shell card; this card's check is frontend types. Do not add a redundant prose test. Exact design below, no new creative decisions.

## Read only
- docs/quest-build/AGENT_BRIEF.md and this card
- src/quest/sample/model.ts
- src/engine/questSchedule.ts
- src/lib/motion.ts
- src/styles/quest-foundation.css
- src/styles/dx-00-tokens.css (read only, maintainer provides approved Quest tokens)

## Write only
- src/quest/sample/IntroHQ.tsx
- src/quest/sample/story.ts
- src/styles/quest-story.css

No unlisted source/docs/configuration/archives/directories, packages, delegation, commits or pushes. Do not change tokens/dependencies/default models. All CSS colors/fonts/radii/shadows/layers/motion use existing tokens; no explicit times outside the provided token file, no inline style except data-derived sizes/CSS variables.

## Story data exports
`PROLOGUE_SHOTS` readonly four objects `{image:"empty"|"crew";caption:string}`:
0 empty / `A quiet room. A night to build.`
1 empty / `Speaker Night. {days} days. It's yours.`
2 crew / `Meet the crew. Bring everyone together.`
3 crew / `Your first move: lock the date.`
The {days} placeholder uses clock.horizon, never a hardcoded date.
`SCENE_TITLES` Record<SampleScene,string>: prologue Mission: Speaker Night; hq Club HQ; booking Open the room request; timeline Lock the Date; advisor Invite the advisor; handoff The publicity handoff; promotion Make it official; venue Set the Stage.
`STAGE_RULES` Record<SampleStage,readonly string[]>: booking[2.3], timeline[2.1,2.2,2.4,2.5], advisor[2.6], handoff[5.1], promotion[5.2,5.3,5.4], venue[] (six separately sourced venue checks handled by parent).

## IntroHQ exports
`Prologue({shot,clock,onShot,onFinish})` props shot:number, clock:QuestClock, onShot:(n:number)=>void, onFinish:()=>void.
- Import ../assets/prologue-empty.png and ../assets/club-hq.png. Approved images unchanged. Four captioned still/image shots in letterbox frame; empty image full16:9, crew image cropped like quest-hq-art to hide baked HUD/controls. Caption is DOM, always visible and <=10 words.
- Starts paused with `Switch on HQ`. User starts, then each shot lasts tokenMs("--dur-quest-shot",10000) (four10-second shots nominal40 seconds). Play/pause button Pause/Resume, Next frame, Skip intro always available. At last shot Next/timer calls onFinish; do not pass shot4 to model. Timer cleanup on shot change/unmount/pause. Tab hiding pauses until explicit Resume.
- Reduced motion: still frames, no auto timer/camera push, Next/Skip remain functional. Listen for preference changes and pause if reduced mode activates. No audio logic here; parent keeps sound off by default. All motion only transform/opacity with tokens. Parent owns shot persistence.
- Counter1/4..4/4 reflects frame position, not scoring. No auto completion of any mission.
`ClubHQ({state,onGo,onDownload,onRestart})`: SampleState, onGo:(scene:SampleScene)=>void, onDownload:()=>void, onRestart:()=>void.
- Approved HQ image, same crop/classes as P4, greeting `Your crew. Your next move.`. Four workstations: real Countdown Wall button ->booking; Venue Table ->handoff disabled until canEnter(state,"handoff"); Money Desk and Comms are noninteractive Later chapter areas.
- Three readonly planning-readiness gauges: Turnout is Ready only when advisor completed, otherwise Preparing; Budget Within cap only when promotion completed, otherwise Planning; Safety Room ready only when venue completed, otherwise Checks pending. Decorative fill binary0/100, no invented metrics/points/badges.
- Seven-step semantic chapter rail Crew/Date/Budget/Speaker/Venue/Showtime/Handoff. Only Date and Venue light when respective sample missions complete; remaining chapters show Later. No full-seven-mission completion claim. Keep this rail isolated from live business workflow/store writes.
- Buttons Replay intro ->prologue (parent resets shot0), New rehearsal ->onRestart, and Download saved plan ->onDownload only when plans history nonempty (the latest saved plan, not unverified current edits). On sample completion caption `Date locked. Room ready. More chapters ahead.`.

## Styling
Import ../../styles/quest-story.css and reuse quest-hq/quest-hq-art/quest-stations. Responsive,44px controls, token colors, focus-visible. Station buttons remain real DOM; no baked screenshot control used. HQ/prologue default visible words <=120 each. Reduced-motion removes push/fade.

## Done when
`npx tsc --noEmit -p tsconfig.json` passes. No other shell command permitted. The following integration card must test start/pause/next/skip/reduced-motion and HQ gates before any final adoption. Handoff <=10 English lines with truthful scope/size.

## Existing guard and style isolation clarification
A JSX style prop must itself be an object literal with named CSS-variable keys (cast CSSProperties when necessary); never pass a style helper call or spread. The existing AST guard checks the attribute expression, even if a helper returns only variables. Keep shared quest-* classes unchanged; prefix new module classes with sample-story- or sample-hq-. Do not redefine generic sample-scene/sample-paper/sample-tray from other modules. No guard exclusions.

When reduced motion is active, keep playback paused/manual or clearly label the Play control as manual; do not show a running-playback state with no timer. Next/Skip always work.
