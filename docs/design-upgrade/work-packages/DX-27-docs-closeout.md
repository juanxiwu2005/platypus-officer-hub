> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# DX-27 Documentation Closeout + Style Guards + Stylesheet Consolidation (Approval Required)

- Stage 6; size M; low risk; R2; depends all; no parallel partner (last)
- Branch `design/dx-27-docs-closeout`; details D32 D53 D54 D55

## Work
1. **Documentation** (only package allowed to edit these files):
   - `docs/DESIGN_TOKENS.md`: add motion tokens (--dur-*, --ease-*, --spring-*), elevation (--elev-*), small-stylesheet structure/ownership; align h1 documentation (default fixed --fs-2xl matching code; clamp only by separate Juanxi decision).
   - `AGENTS.md`: section 7 motion subsection (duration tokens, reduced motion, transform/opacity only, interruptibility, no routine-action animation, desktop zero-delay hover); section 1 reading list links docs/design-upgrade/README.md; update section-0 stale main facts **after verifying every commit with git**.
   - `docs/PROGRESS.md`: overall closeout and "local backup sync required".
2. **Complete guards:** add forbidden patterns found by packages (e.g. !important in small files, desktop .hover-card delay), with an intentionally failing sample per guard.
3. **Consolidate styles only with Juanxi's explicit agreement, in a separate commit:** accepted src/styles/dx-*.css into src/styles.css under `/* ===== v1.2 design upgrade ===== */`; remove src/styles/, index.css, and its main.tsx import. dx-shots PNGs must be **byte-identical** before/after. **R1 quick disable is unavailable afterward; rollback becomes R2 only.** Explain this in report; consolidate only after full acceptance.
4. `reports/SUMMARY.md`: status of all 27 packages, preview URL, known issues, final ROLLBACK_LOG.md state.

## Allowed files
`docs/DESIGN_TOKENS.md`, `AGENTS.md`, `docs/PROGRESS.md`, `docs/design-upgrade/**`, `.stylelintrc.json`, `src/styles/*` (step 3 only), `src/styles.css` (step 3 only).

## Acceptance
- npm run check all green; byte-identical dx-shots for step 3; every documented commit/number reproducible by commands.

## Rollback
R2.
