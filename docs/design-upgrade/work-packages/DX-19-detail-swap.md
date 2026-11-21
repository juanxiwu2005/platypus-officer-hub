> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# DX-19 Detail-Switch Crossfade + Page Fade-In

- Stage 3; size S; medium risk; R2; depends DX-01, **DX-09** (same files; must follow it); parallel DX-15–18
- Branch `design/dx-19-detail-swap`; CSS `src/styles/dx-19-detail-swap.css`; details D14 D15

## Work
1. **Rail detail changes** (Rail.tsx DetailView): key changes fade new content in over 120ms, opacity only; no exit/layout change; preserve scrollTo/focus() logic and scroll resets.
2. **Page fade-in** (Layout.tsx `<main>`): direct main children fade in over 140ms on route changes. **Fade-in only, no slide/exit**; navigation must not slow (Apple motion.md: do not make frequent actions wait).
   - Key remount by path, or add a class only on route changes. **Do not permanently animate all main > ***; conditional in-page cards would flash too.
3. Reduced motion: neither animates.
4. Preserve `<main id="main" tabIndex={-1}>`, skip-to-main focus, and lastPath rail-closing logic.

## Allowed files
`src/components/Layout.tsx`, `src/components/rail/Rail.tsx` (DetailView only), `src/styles/dx-19-detail-swap.css`.

## Acceptance
- smoke/today/tasks/events/a11y/recovery desktop/phone pass; rapid navigation stays responsive without white flashes.
- New `e2e/dx-19-swap.spec.ts`: new page opacity passes through an intermediate value and reaches 1 within 300ms; different Today tasks fade rail details in.
- Juanxi: sidebar navigation softly reveals pages, without sliding; task switches fade rail contents.

## Rollback
R2.
