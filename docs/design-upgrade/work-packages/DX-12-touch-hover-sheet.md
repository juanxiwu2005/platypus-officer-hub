> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# DX-12 mobile hover-card bottom-sheet animation

- Stage 2 · SizeS · Low risk · R level **R1 available** · Dependency: DX-01 · Parallel: DX-09–11/13/14
- Branch: `design/dx-12-touch-hover-sheet` · Styles: `src/styles/dx-12-touch-hover-sheet.css` · Detail: D12

## Why
Tapping hover cards on mobile opens a bottom sheet (S8), but abruptly. **Desktop hover cards must remain untouched:** S3 (2026-10-27) established zero delay, guarded by `e2e/feel.spec.ts`.

## Work
1. **Only within `@media (hover: none)`**, animate `.hover[data-open="true"] > .hover-card` entry: `translateY(12px)→0` + fade-in, `var(--dur-fast)`, `var(--ease-out)`; reverse for exit.
2. No backdrop (explanation, not modal; Emil §12 "separate to keep flow").
3. Reduced motion: fade only.
4. Do not change `Hover` logic (`ui/index.tsx`). If necessary (e.g., to enable exit animation), record requirement for integrator in report, without editing yourself.

## Allowed files
Only `src/styles/dx-12-touch-hover-sheet.css`.

## Acceptance
- `touch.spec.ts` mobile, `feel.spec.ts` desktop (especially zero-delay hover), `bts.spec.ts` green.
- Desktop `.hover-card` computed `transition-delay` remains `0s, 0s`.
- Juanxi checks: mobile progress-chain dots open explanation card sliding from bottom.

## Rollback
R1 or R2.
