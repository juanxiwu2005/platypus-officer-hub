> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# DX-02 Split Layout.tsx into Files (Move Only)

- Stage 0; size M; medium risk; R2; no dependencies; parallel partner DX-01
- Branch: `design/dx-02-split-layout`; detail D52

## Why
Layout.tsx contains top bar, Demo menu, bell, Toast, navigation, rail mounting, and circular button. At least 6 later packages edit different parts, causing conflicts unless split. **Move only, without behavior changes.**

## Work
Move to new files, leaving composition in Layout.tsx:
- `src/components/chrome/TopBar.tsx`: entire `<header className="topbar">…</header>` (brand + controls), data passed via props.
- `src/components/chrome/SideNav.tsx`: `<nav className="sidenav">…</nav>`, including Tasks unread count.
- `src/components/chrome/DemoMenu.tsx`: existing DemoMenu function unchanged.
- `src/components/chrome/Bell.tsx`: existing Bell function unchanged.
- `src/components/chrome/Toast.tsx`: export `useToast()`, returning `[toastNode, showToast]`; preserve 2400ms timing and role="status" markup.
- Keep in Layout.tsx: Layout, Frame, rail mounting, circular Ask, page-change rail-closing effect.

## Allowed files
`src/components/Layout.tsx`, new `src/components/chrome/*`.
**Do not touch:** styles, any data-testid/aria-label/className, or copy.

## Acceptance
- `npm run lint`, build, and test pass; `e2e/smoke.spec.ts`, `today.spec.ts`, `touch.spec.ts`, `a11y.spec.ts`, `feel.spec.ts` pass desktop/phone.
- dx-shots PNG bytes identical before/after (if DX-01 unmerged, manually compare dist renderings in worktree around npm run build).
- New-file contents in git diff --stat are almost entirely cut from Layout.tsx; report evidence of no behavior change, e.g. moved-code proportion from git diff --color-moved.

## Rollback
R2; revert dependents first (dependency table).

## Notes
- No incidental optimization; it complicates rollback/review.
- Preserve Demo armed 3-second timeout, outside/Escape dismissal, and platypus:reset event exactly.
