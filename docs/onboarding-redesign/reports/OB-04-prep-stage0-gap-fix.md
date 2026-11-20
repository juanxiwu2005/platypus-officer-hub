# Stage-0 completion report (OB-01 / OB-03 gaps)

> 2026-11-02, Claude. Codex delivered/merged OB-01, OB-02, OB-03 skeletons on 11-01. Review against `WORK_PACKAGES.md`/`PROMPTS.md` found acceptance gaps, filled below. **This fixes OB-01 and OB-03: revert this fix before OB-01 / OB-03 (ROLLBACK_LOG).**

## Findings (verified by running, not commit messages)

| # | Issue | Evidence |
| --- | --- | --- |
| 1 | **Entry URL fails (most severe):** documented `/?walkthrough=1#/` does not open welcome; only `/#/?walkthrough=1` works. HashRouter code reads only parameters after `#` | Local dev server/new browser, three URL variants: only second reached welcome |
| 2 | **Welcome does not return after Reset demo.** Reset immediately rewrites sample data; gate treats stored data as a returning visit | New test failed before fix on desktop/mobile |
| 3 | Draft context only 3 fields, but specification requires all Setup.tsx state at once for later parallel packages | Read `draft.tsx` |
| 4 | No progress chain/Demo strip; 1 copy-table row; no ob-04…09 empty styles/`@import`, `e2e/ob-helpers.ts`, or `e2e/ob-*` tests | File list; Codex's three reports also note full browser flow unverified |
| 5 | Replay walkthrough unrecorded; Start does not mark seen (refresh midway returns to welcome); step engine not wired to recording | Code reading |
| 6 | Shell around old Join produces two `<main>` elements | Code/new test |
| 7 | Nonexistent token `--space-4`, working only via fallback | `grep` |

## Changes

- **OB-01:** full president draft in `draft.tsx` (club, constitution, AI reading state, role-touch flags, workflow, buffer, first event, confirmation, invite code, skipped steps; separate IndexedDB `onboarding-draft`, 7 days, no overwrite of old `setup-draft`); `engine/flows.ts` step tables/route mapping; `engine/useFlow.ts` route-driven next/back/skip/exit state machine with skipped draft list/recorded events; `ProgressChain` scaleX-growing lines, hollow dashed skipped dots, immediate reduced motion; `DemoStrip`; Save & exit shell; complete `copy.ts`; ob-04…ob-09 empty styles/`@import`; `e2e/ob-helpers.ts`.
- **OB-03:** `enabled.ts` reads parameters before/after `#`, unit-tested; `/welcome/start` is sole recorded-walkthrough start for welcome Start/Demo Replay, immediately marking seen; `target.ts` constant `FOUNDER_START` controls destination until OB-10 switches it. **Reset rearms** via `isRearmed()`/new record-module flag without deleting records; welcome gains privacy sentence.
- **New tests:** `src/test/onboardingGate.test.ts`, one addition to `onboardingRecord.test.ts`; `e2e/ob-01-shell.spec.ts`, `e2e/ob-03-gate.spec.ts`, 14 each desktop/mobile: both URLs, no changes when disabled, remembered Explore, one Start record, Save & exit, reset rearm/preserved records, new Replay record, export `onboarding` without entered text, axe.

## Unchanged

Old Setup.tsx, Join.tsx, store.tsx (used only Codex's two existing changes), styles.css, all old tests.

## Unverified

Real fingers/Safari; complete `/welcome/classic` setup through final step (old unchanged page); dark/reduced-transparency shell (static axe only); progress-chain animation only structurally checked under reduced motion, no frame sampling (add with animated OB-04+ screens). Disabled-by-default gate proven in new tests; Netlify `VITE_ONBOARDING_WALKTHROUGH` never set.

## Rollback

First `git revert` this fix, then OB-03, OB-01, OB-02 under `ROLLBACK_LOG.md`. R1: leave flag unset to retain today's site appearance.
