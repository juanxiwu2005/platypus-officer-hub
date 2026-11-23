# P5-10 Route and playable-sample regression gate

Phase P5. Integrate the approved modules into the existing lazy Quest route and add meaningful React regressions. <=150 actual changed lines, at most3 files, estimated45 steps.

## Read only
- docs/quest-build/AGENT_BRIEF.md and this card
- src/quest/sample/model.ts, transitions.ts, storage.ts, decisions.ts, IntroHQ.tsx, story.ts, OfficerScenes.tsx, CommsScenes.tsx, SourceDialog.tsx, Timeline.tsx, VenueEditor.tsx, venue.ts
- src/engine/questSchedule.ts
- src/quest/foundation.ts
- src/lib/motion.ts
- src/quest/Quest.test.tsx

## Write only
- src/App.tsx (change ONLY lazy Quest import from ./quest/Quest to ./quest/sample/Sample; keep paths/lazy boundary/live app intact)
- src/quest/sample/Sample.test.tsx
- src/quest/sample/Sample.tsx (only actual minimal integration defects found by these tests, no redesign)

No other source/docs/configuration/archives/directories, installs/dependencies, delegation, commits or pushes. Do not modify P4 files/tests/keys, rule data, engine or production UI. No skipped/loosened tests.

## Tests
Use existing test library/MemoryRouter conventions; read actual exported components and labels before writing assertions. Stub native dialog methods, scrollIntoView, matchMedia, ResizeObserver/canvas only as required by jsdom; do not fake gameplay progression success. Clean localStorage/timers per test.
1. Fresh Sample begins prologue paused with Switch on HQ, initial caption. Next frame advances, Skip intro opens HQ. Sound off default. Replay intro restarts shot0. Venue station gated initially; Countdown Wall opens booking.
2. Prologue isolated fake-timer test: click Switch on HQ, after10000ms onShot(1); Pause prevents advance; visibilitychange hidden pauses; reduced-motion true never auto-advances but Next/Skip work. Use controlled wrapper for persisted shot; no infinite timers.
3. Shell wrong advisor account request produces exact failure outcome from decideRequestor, Rewind preserves selection and failed attempt, then select eligible account and check passes; Continue opens timeline. Read actual OfficerScenes labels and do not weaken UI assertions merely to pass. Opening Why shows only one source quotation, close returns focus to Why; hidden interaction not accessible underneath modal.
4. Unknown stored version remains byte-identical after mount + interaction; visible readonly notice, state stays in memory. Quota failure switches to memory notice. P4 key and arbitrary club key remain byte-identical after normal practice. A reload restores actual valid booking progress/attempts via storage boundary.
5. HQ native button gating verified; no direct venue unlock. Include one new-rehearsal test retaining attempt history via reducer/state storage (do not inject fake passed history).
Tests may combine parallel assertions, keep meaningful coverage concise. Existing per-module suites cover full reducer journey/venue/transitions; don't repeat their implementation or mock every module.

## Done when
Allowed commands only `npx vitest run src/quest/sample/Sample.test.tsx`, `npx tsc --noEmit -p tsconfig.json`. Planner then independently runs full offline gates and real browser journey/pointer/keyboard/mobile/word/a11y checks. Handoff<=10 English lines, actual scope/checks. An integration defect outside scope must be reported for a separate card, never hidden by mocks.

Story module split clarification: IntroHQ is a tiny named reexport adapter; actual Prologue.tsx and ClubHQ.tsx are explicitly allowed read dependencies. Public props/labels remain the original card API. Date chapter completion requires full Mission2 through advisor.
