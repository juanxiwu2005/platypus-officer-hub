# P5-08A Skippable captioned prologue and story data

Replacement for ONLY the prologue/data portion of oversized P5-08 (269lines, never adopted). One controlled presentation module, <=150actual lines/three new files. Estimated30steps.

## Read only
AGENT_BRIEF, this card, src/quest/sample/model.ts, src/engine/questSchedule.ts, src/lib/motion.ts, src/styles/quest-foundation.css, src/styles/dx-00-tokens.css.
## Write only
- src/quest/sample/Prologue.tsx
- src/quest/sample/story.ts
- src/styles/quest-prologue.css

No unlisted source/docs/configuration/directories/archives, installs/dependencies, delegation, commits/pushes or global defaults. English. Only allowed frontend typecheck; planner runs complete lint. JSX styles must be literal objects with named CSS variables only. All type/color/radii/layer/shadow/motion use EXISTING tokens.44px controls, visible focus, responsive. Reuse existing quest-* classes without globally redefining them; prefix new CSS with this module's sample-story-/sample-hq- classes. Keep concise readable project style, <=150TOTAL actual changed lines for this card, not per file. Do not omit requirements or minify a whole file to meet size. All source begins as an unadopted proposal; final10integration regressions and full browser acceptance remain required.

## Exact shared story data
`PROLOGUE_SHOTS` readonly four objects `{image:"empty"|"crew";caption:string}`:
0 empty / `A quiet room. A night to build.`
1 empty / `Speaker Night. {days} days. It's yours.`
2 crew / `Meet the crew. Bring everyone together.`
3 crew / `Your first move: lock the date.`
The {days} placeholder uses clock.horizon, never a hardcoded date.
`SCENE_TITLES` Record<SampleScene,string>: prologue Mission: Speaker Night; hq Club HQ; booking Open the room request; timeline Lock the Date; advisor Invite the advisor; handoff The publicity handoff; promotion Make it official; venue Set the Stage.
`STAGE_RULES` Record<SampleStage,readonly string[]>: booking[2.3], timeline[2.1,2.2,2.4,2.5], advisor[2.6], handoff[5.1], promotion[5.2,5.3,5.4], venue[] (six separately sourced venue checks handled by parent).


## Exact named export
Prologue({shot,clock,onShot,onFinish}), with exported PrologueProps: shot:number, clock:QuestClock, onShot:(n:number)=>void, onFinish:()=>void. Parent persists shot and owns sound. Import ../assets/prologue-empty.png and ../assets/club-hq.png unchanged, ../../styles/quest-prologue.css, story data and existing motion helpers.

Four captioned stills in a letterbox, empty full16:9, crew crop exactly like existing quest-hq-art to hide baked controls. DOM caption substitutes clock.horizon for{days}, always visible, counter1/4..4/4. No new art/roles/data or scoring. Named CSSprefixsample-story-. Reuse existing quest-primary for start button rather than inventing a new on-accent color token. No global quest-* selector overrides.

Initially paused with Switch on HQ. **Next frame AND Skip intro are ALWAYS available, INCLUDING before Switch on HQ.** Starting enables nominal10second/tokenMs("--dur-quest-shot",10000)auto-advance. Next/timer atshot3calls onFinish, neveronShot4. Pause/Resume and cleanup when shot changes, pause/unmount. Stable parent callbacks will be provided. Tab visibility hidden sets paused and stays paused until explicitResume. Optional transform/opacity-only subtle camera push must pause immediately; no layout animation.

Reduced motion: manual stills, NO timer/push. Listen for media preference changes, activating reduced mode MUST set paused true, so switching preference off does not automatically resume. Keep Next/Skip functional even before start. A Play button in reduced mode must remain honestly manual/paused; never show running Pause state when no timer. Initial Switch on HQ may enter manual mode, labelledManual frames if appropriate, while Next/Skip always accessible.

## Done
Only npx tsc --noEmit -p tsconfig.json. Handoff<=10English lines, truthful scope/checks. No HQstation/gauge/rail implementation in this card; next08B does that and reexports this component for existing shell API. Final integration10tests start/pause/hidden/reduced/Next/Skip/replay.
