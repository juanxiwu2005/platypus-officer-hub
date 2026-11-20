# v1.6 interface and motion upgrade: summary (27 work packages)

- Date: 2026-11-01 · Integration branch: `claude/determined-johnson-yrdxwf` (PR #10, preview https://deploy-preview-10--platypus-officer-hub.netlify.app )
- **All 27 packages: 26 merged; DX-20 includes only 20a, while 20b (mobile bottom navigation) awaits Juanxi approval.** DX-27 step 3 (consolidating small stylesheets) also awaits approval, not done.
- No package changed data structures or `SCHEMA_VERSION`; rollback preserves old browser data. **`main` untouched.**

## Package status

| Package | Changes | Merge commit | Rollback | Report |
| --- | --- | --- | --- | --- |
| DX-01 | Foundation: split stylesheets, motion tokens, test port, screenshot script, style guard | `9d5a9f0` | `git revert -m 1 dx/dx-01-merged` | `reports/DX-01.md` |
| DX-02 | Split `Layout.tsx` (relocation only) | `f1dbd24` | `git revert -m 1 dx/dx-02-merged` | `reports/DX-02.md` |
| DX-03 | Press feedback/hover transitions | `055af30` | `git revert -m 1 dx/dx-03-merged` | `reports/DX-03.md` |
| DX-04 | Touch targets ≥44 px | `39aab5a` | `git revert -m 1 dx/dx-04-merged` | `reports/DX-04.md` |
| DX-05 | Risk shapes (beyond color alone) | `b5ee333` | `git revert -m 1 dx/dx-05-merged` | `reports/DX-05.md` |
| DX-06 | Typography details | `0187d36` | `git revert -m 1 dx/dx-06-merged` | `reports/DX-06.md` |
| DX-07 | Page metadata, tap highlight, scroll bleed | `775264a` | `git revert -m 1 dx/dx-07-merged` | `reports/DX-07.md` |
| DX-08 | Reduced-motion guards for existing animations | `eb55e5a` | `git revert -m 1 dx/dx-08-merged` | `reports/DX-08.md` |
| DX-09 | Rail entry/exit, Ask button, safe area, `dvh` | `d419447` | `git revert -m 1 dx/dx-09-merged` | `reports/DX-09.md` |
| DX-10 | Menu entry/exit (Demo, bell) | `5a32bf7` | **First** `git revert --no-edit 6f62b17`, then `git revert -m 1 dx/dx-10-merged` | `reports/DX-10.md` |
| DX-11 | Toast entry/exit | `b54de9b` | `git revert -m 1 dx/dx-11-merged` | `reports/DX-11.md` |
| DX-12 | Mobile hover-card bottom sheet | `e8ff3ec` | `git revert -m 1 dx/dx-12-merged` | `reports/DX-12.md` |
| DX-13 | Disclosure expansion animation | `4b118e7` | `git revert -m 1 dx/dx-13-merged` | `reports/DX-13.md` |
| DX-14 | Skeleton loading/delayed display | `d83af1f` | `git revert -m 1 dx/dx-14-merged` | `reports/DX-14.md` |
| DX-15 | Events layout | `d89d959` | **First** `git revert --no-edit a8775e6`, then `git revert -m 1 dx/dx-15-merged` | `reports/DX-15.md` |
| DX-16 | Tasks Board layout | `e6618b8` | **First** `3972412`, then `a8775e6`, then `git revert -m 1 dx/dx-16-merged` | `reports/DX-16.md` |
| DX-17 | Ask panel | `8613954` | `git revert -m 1 dx/dx-17-merged` | `reports/DX-17.md` |
| DX-18 | Empty-state copy/next actions | `12f079e` | `git revert -m 1 dx/dx-18-merged` | `reports/DX-18.md` |
| DX-19 | Detail-switch crossfade/page fade-in | `a5fcff5` | `git revert -m 1 dx/dx-19-merged` | `reports/DX-19.md` |
| DX-20 | **20a only:** slimmer mobile header (20b bottom navigation not done, approval needed) | `cc6a3d6` | `git revert -m 1 dx/dx-20-merged` | `reports/DX-20.md` |
| DX-21 | Desaturated Board-column headers | `f6bd79a` | `git revert -m 1 dx/dx-21-merged` | `reports/DX-21.md` |
| DX-22 | Flowchart nodes use `transform` + spring | `bfafc89` | **DX-24/DX-25 depend on its `src/lib/motion.ts`: revert DX-25, DX-24, then DX-22** | `reports/DX-22.md` |
| DX-23 | Translucent header/shadow layer tokens | `0e93cd6` | `git revert -m 1 dx/dx-23-merged` | `reports/DX-23.md` |
| DX-24 | Board pointer dragging, displacement, spring, keyboard | `8ac5b82` | `git revert -m 1 dx/dx-24-merged` (**revert DX-26 first**, which uses `dragSort.ts`) | `reports/DX-24.md` |
| DX-25 | Completion moments: chain growth, dot spring, progress ring, badges | `7ef5a87` | `git revert -m 1 dx/dx-25-merged` | `reports/DX-25.md` |
| DX-26 | Partners Board dragging | `255c009` | `git revert -m 1 dx/dx-26-merged` | `reports/DX-26.md` |
| DX-27 | Documentation/style-guard completion (step 3 not done) | `7c27bea` | `git revert -m 1 dx/dx-27-merged` | `reports/DX-27.md` |

Stage rollback: `git revert -m 1` each stage's merge commits in reverse; rehearsals in `ROLLBACK_LOG.md`, “Rollback rehearsal records” (after complete rollback of stages 0–5, **byte-for-byte identical** to `dx/phase-N-before`; stage 6 below).

## Known issues and unverified items (accurately recorded)
1. **Real phones/physical touch** untested: touch logic tested only with synthetic events (DX-24/26 drag, DX-12 bottom sheet, DX-04 targets).
2. **Safari/older browsers:** unsupported `@starting-style`, `::details-content`, scroll-driven fade (DX-19/13/…) fall back to instant appearance; functionality intact, no animation; Safari not tested.
3. **DX-22:** node positions rarely change (layout preserves approximate time positions), so springs rarely appear; tests separately verify style presence/rule correctness.
4. **DX-25:** no recording of the full “mark Done → chain growth” flow, only component tests.
5. **DX-20b** mobile bottom navigation not done; Juanxi approval required.
6. **DX-27 step 3** (merge `dx-*.css` into `styles.css`) not done; Juanxi approval required; afterward R1 quick-disable unavailable, only R2.
7. `dx/*` tags/`design/dx-NN-*` branches **local only** (session credentials get 403 on push). Recreation commands in `ROLLBACK_LOG.md`; merge SHAs (column 3) support rollback without tags.
8. `engine.test.ts` occasionally exceeds 5 seconds under heavy machine load (preexisting fragility, not introduced here; 15-second timeout suggested).
9. Container Playwright browser path changed; local runs require `PW_CHROMIUM=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome`.

## Juanxi's decisions
- Implement DX-20b mobile bottom navigation?
- Implement DX-27 step 3 consolidating small stylesheets? This removes one-line `@import` commenting as a package-disable method.
- After accepting preview (PR #10), merge to `main` with **Create a merge commit** (not Squash), or per-package rollback is lost. Merge only when Juanxi explicitly says “merge approved.”
- Delete old branches such as `integration/v1.0`? Juanxi decides (this session lacks permission).

## Full checks (after stage 6 merge)
- Node 22, `npm run check` (lint/build/unit/page/word counts, run alone with no other tasks): **839 unit tests passed** (stage 5: 834, 5 new guard tests); **619 page tests passed/93 intentional skips/0 failed** (stage 5: 613 / 87; 6 additions are DX-26 desktop tests, skipped 6 on mobile); all word budgets met.
- Visual comparison (pre-stage 6 build vs current, 64 images): **62 pixel-identical**; 2 (`events-mobile-light-rail-open`, `team-mobile-light-rail-open`) differ, but reshooting proves random noise—three shots of identical old code show Team varying 0–8,629 pixels; three shots of identical new code show Events varying 0–699. Neither difference relates to this stage (Partners Board/documentation/style checks only).
- Rollback rehearsal: last row of “Rollback rehearsal records” in `ROLLBACK_LOG.md` (revert DX-27/DX-26 restores pre-stage 6 byte-for-byte).
