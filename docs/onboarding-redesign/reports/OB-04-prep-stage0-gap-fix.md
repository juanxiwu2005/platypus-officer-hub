# Phase 0 Completion Report (shortfall repair of OB-01/ OB-03)

> 2026-11-02，Claude。Codex delivered bones and metges of OB-01, 02, 03 at 11-01; I reviewed the instructions of `WORK_PACKAGES.md` and `PROMPTS.md` and found that the skeletons did not reach the acceptance door, as follows. **This is the restoration of OB-01 and OB-03, submitted by rollback before OB-01/OB-03 (see ROLLBACK_LOG).**

## Review findings (verified with actual operation, not submission of information)

| # | Problem | Evidence |
| --- | --- | --- |
| 1 | **entry address is not valid (most serious): Preview site for Juanxi in** document `/?walkthrough=1#/` The page was not triggered; Only. `/#/?walkthrough=1` Just do it. The app is HashRouter. Code read only. `#` The parameters that follow.  | This machine develops servers, new browsers, each of the three sites is open: only the second one has entered a welcome page. |
| 2 | **Reet demo welcomes the page no longer appears.** Resets the sample data back to the browser immediately, and the entrance treats "data in the browser" as not the first time.  | New test failed before restoration (desktops and mobile phones) |
| 3 | There are only 3 fields in the context of the draft, and the instructions require that the `Setup.tsx` The full state is given at once (otherwise, the parallel packages behind them cannot be changed).  | Read it. `draft.tsx` |
| 4 | No progress chain, Demo bars; 1 rows; `ob-04…09` Styles empty files and `@import` Not built; Nothing. `e2e/ob-helpers.ts`Nothing. `e2e/ob-*` Browsertes.  | List of documents; Codex's three reports also say "full browser process not verified." |
| 5 | "Replay walkthrough" not recorded; When you select Start, do not mark "seen" (a midway update will be returned to the welcome page); Step engines are not recorded.  | Read Code |
| 6 | There's two of them on the page. `<main>`。 | Read the code; New Test Overwrite |
| 7 | Style uses non-existent token ( `--space-4`, the fallback value is not bad).  | `grep` |

## What did you do?

- **OB-01:** `draft.tsx` completes the full draft president (clubs, constitution, AI reading status, roll touch mark, workflow, buffer, first event, confirmation, invitation code, skip list; Save 7 days with a separate IndexedDB key `onboarding-draft`, without covering the old page `setup-draft`; `engine/flows.ts` (tables of steps and route mapping for two processes), `engine/useFlow.ts` (step machine driven by route: nett/back/skip/exit, skip list in draft, event sent to record); Progress chain `ProgressChain` (line growing with `scaleX`, skip is a dotted hollow point, direct by reduced kinetic effects); `DemoStrip`；Shell plus Save & exit; `copy.ts` completed full-text form; `ob-04…ob-09` style empty file and `@import`; `e2e/ob-helpers.ts`。
- **OB-03: Parameters before and after reading `#` at the** entrance (`enabled.ts`, with unittes); Add `/welcome/start` as the only entrance to "starting a recorded walkthrough" and use it on both the Start and Demo menus. Start is marked; `target.ts`, a constant `FOUNDER_START` decides where to go (OB-10 before it gets to the new process); **Reloaded** (`isRearmed()`, record module with a new mark and no records removed); Welcome to the page with a word of privacy.
- **Test (new):** `src/test/onboardingGate.test.ts`, `onboardingRecord.test.ts` plus one; `e2e/ob-01-shell.spec.ts`, `e2e/ob-03-gate.spec.ts`, desktop + cellular 14 articles, including: two web sites, zero change when closed, Excelore Remember, Start memorization only once, Save & exit, Reset re-light and record retention, Riplay new records, Export with `onboarding` without input text, axe accessibility.

## Nothing's changed.

Old `Setup.tsx`, `Join.tsx`, `store.tsx` (used only two of Codex's changed), `styles.css`, old tests (none moved).

## It's not verified.

Real fingers, Safari; The complete process of `/welcome/classic` from which old pages were created to the last step (carrying with the old page, unchanged); (a) Dark colour and shell under "Reducing Transparency" (only static axe checks); Progress chain animations have been measured only in the mode of reduction of kinetic effects, and no frame-by-frame sampling has taken place (OB-04 screens are supplemented when they have kinematic effects); The portal "Switch Default Close" is certified by a new test that the environmental variable `VITE_ONBOARDING_WALKTHROUGH` on Netlify has not been set.

## Rollback

`git revert` Submission of this restoration, then withdrawal by `ROLLBACK_LOG.md` OB-03, OB-01 and OB-02. R1: If you don't set the switch, you can return to what you are today.
