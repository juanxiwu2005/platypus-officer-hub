# DX-02 Dismantling `Layout.tsx` into stand-alone documents (pure moving)

- Stage 0 size M Risk Medium R Level R2 Dependence: No Parallel Partner: DX-01
- Branch: `design/dx-02-split-layout` Corresponding Details: D52

## Why?
`Layout.tsx` contains both the top bar, the Demo menu, the bell, Toast, navigation, right-bar mount and circle buttons. At least 6 bags have to be changed in different parts of it, and they'll crash if you don't open them. **just move and don't change anything.**

## Something to do.
Move the following to a new file, leaving only "combined" in `Layout.tsx`:
- `src/components/chrome/TopBar.tsx`: `<header className="topbar">…</header>` whole block (brand + control area). The required data is passed through the props.
- `src/components/chrome/SideNav.tsx`: `<nav className="sidenav">…</nav>`, including the unread number of Tasks.
- `src/components/chrome/DemoMenu.tsx`: Original `DemoMenu` function, moved as it is.
- `src/components/chrome/Bell.tsx`: Original `Bell` function, moved as it is.
- `src/components/chrome/Toast.tsx`: Export `useToast()`, returns `[toastNode, showToast]`; Keeps the markings as they are for hours (2400ms) and `role="status"`.
- `Layout.tsx` Reservation: `Layout`, `Frame`, mount and round Ask button in the right bar, the "right bar closes on page change" segment.

## Files that can be changed
`src/components/Layout.tsx`, `src/components/chrome/*` (new).
**Do not touch**: any style file; Any `data-testid`, `aria-label`, `className`; Any text.

## Acceptance
- `npm run lint`, `build`, `test` All green; `e2e/smoke.spec.ts`, `today.spec.ts`, `touch.spec.ts`, `a11y.spec.ts` and `feel.spec.ts` are green on the desktop and mobile phone items.
- The PNG byte is consistent before and after the `dx-shots` (dX-01 script, if not yet met, manually compares `dist` rendering before and after `npm run build`).
- `git diff --stat`, the content of almost all new documents is cut from `Layout.tsx`; The report contains evidence of "no change in behaviour" (e.g., the percentage of movers seen with `git diff --color-moved`).

## Rollback
R2。The package that depends on it has to be withdrawn (see the dependency table).

## Attention.
- Don't "optimize" the code. The change will make it difficult for rollback and review.
- The 3 seconds for `armed` in the Demo menu are timed out, click on external shutdown, Escape closed, `platypus:reset` events kept as they were.
