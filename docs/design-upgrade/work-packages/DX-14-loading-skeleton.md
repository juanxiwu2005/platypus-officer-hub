> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# DX-14 skeleton loading + delayed display

- Stage 2 · SizeS · Low risk · R levelR 2 · Dependency: DX-01 · Parallel: DX-09–13
- Branch: `design/dx-14-loading-skeleton` · Styles: `src/styles/dx-14-loading-skeleton.css` · Detail: D16

## Work
1. `src/components/RouteLoading.tsx`:
   - Show nothing for loads under 150 ms (avoid flash); show only after 150 ms.
   - Gray skeleton matching page structure (one heading bar +3 card bars), no text. Make screen-reader `role="status"` text (`label`) visually hidden (existing `.sr-only`); **screen readers must still read "Loading…"**.
   - Static skeleton (no shimmer; Apple cautions against slow loops). For liveliness, allow only opacity changes with period ≥ 1.2 s, stopped with reduced motion.
2. Preserve `fullPage`, `aria-label`, both uses (full-page lazy loading, right-rail "Loading details…").

## Allowed files
`src/components/RouteLoading.tsx`, `src/styles/dx-14-loading-skeleton.css`.

## Acceptance
- Desktop `e2e/bundle-performance.spec.ts`/`e2e/bundle-organization-setup.spec.ts` (lazy loading) green; first check for visible "Loading…" assertions and rewrite for continued screen-reader accessibility, **without loosening other assertions**.
- Manually verify throttled network (Playwright `route` delayed 800 ms): blank 150 ms, then skeleton; fast loads never flash.
- Juanxi checks: open Events on mobile network/browser throttling, see gray skeleton instead of text line.

## Rollback
R2.
