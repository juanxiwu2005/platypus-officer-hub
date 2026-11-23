# P5-08B Club HQ and stable story exports

Replacement for ONLY the HQ portion of oversized P5-08. One readonly hub, <=150actual lines/three new files, estimated30steps.08A supplies Prologue and story data.

## Read only
AGENT_BRIEF,this card, src/quest/sample/model.ts, src/quest/sample/Prologue.tsx, src/quest/sample/story.ts, src/styles/quest-foundation.css, src/styles/dx-00-tokens.css.
## Write only
- src/quest/sample/ClubHQ.tsx
- src/quest/sample/IntroHQ.tsx
- src/styles/quest-story.css

No unlisted source/docs/configuration/directories/archives, installs/dependencies, delegation, commits/pushes or global defaults. English. Only allowed frontend typecheck; planner runs complete lint. JSX styles must be literal objects with named CSS variables only. All type/color/radii/layer/shadow/motion use EXISTING tokens.44px controls, visible focus, responsive. Reuse existing quest-* classes without globally redefining them; prefix new CSS with this module's sample-story-/sample-hq- classes. Keep concise readable project style, <=150TOTAL actual changed lines for this card, not per file. Do not omit requirements or minify a whole file to meet size. All source begins as an unadopted proposal; final10integration regressions and full browser acceptance remain required.

## Club HQ exact named export
`ClubHQ({state,onGo,onDownload,onRestart})`: SampleState, onGo:(scene:SampleScene)=>void, onDownload:()=>void, onRestart:()=>void.
- Approved HQ image, same crop/classes as P4, greeting `Your crew. Your next move.`. Four workstations: real Countdown Wall button ->booking; Venue Table ->handoff disabled until canEnter(state,"handoff"); Money Desk and Comms are noninteractive Later chapter areas.
- Three readonly planning-readiness gauges: Turnout is Ready only when advisor completed, otherwise Preparing; Budget Within cap only when promotion completed, otherwise Planning; Safety Room ready only when venue completed, otherwise Checks pending. Decorative fill binary0/100, no invented metrics/points/badges.
- Seven-step semantic chapter rail Crew/Date/Budget/Speaker/Venue/Showtime/Handoff. Only Date and Venue light when respective sample missions complete; remaining chapters show Later. No full-seven-mission completion claim. Keep this rail isolated from live business workflow/store writes.
- Buttons Replay intro ->prologue (parent resets shot0), New rehearsal ->onRestart, and Download saved plan ->onDownload only when plans history nonempty (the latest saved plan, not unverified current edits). On sample completion caption `Date locked. Room ready. More chapters ahead.`.


## Critical completion and readonly boundary
The Date chapter/mission is complete ONLY after state.completed includes advisor (booking+timeline+advisor), not merely timeline. Use advisor for Date rail readiness. Venue only after venue. Venue Table uses canEnter(state,"handoff"), never a direct unlock. Do not create any successful history/state in this component. New rehearsal/download/replay call only provided callbacks. Existing business workflow/store remains untouched.

## Stable adapter
IntroHQ.tsx contains only named reexports Prologue from ./Prologue and ClubHQ from ./ClubHQ (optional exported prop types). No state, hooks, timer, styles, logic or duplicate implementation here. This preserves the existing future Sample integration API. ClubHQ imports ../../styles/quest-story.css and approved ../assets/club-hq.png. This CSS contains ONLY new HQstyles, namespaced sample-hq-, and scoped descendants of that new root if needed. Do not redefine .quest-hq-caption globally or include Prologue CSS; Prologue imports its own stylesheet. Reuse P4 quest-hq/quest-hq-art/quest-stations crop and styling; decorative fill0/100has no animation/score.

Keep all original station/gauge/chapter/replay/download behaviors, responsive and<=120defaultvisible words including future header. Do not add unrequested business adapters.

## Done
Only npx tsc --noEmit -p tsconfig.json. Final10tests and planner real-browser HQgates/replay/mobile/word checks before adoption. Short truthful English handoff.
