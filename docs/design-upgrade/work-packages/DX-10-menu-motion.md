> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# DX-10 Menu entrance/exit (Demo menu, bell)

- Stage 2 · Size S · Low risk · Rollback R2 · Depends on: DX-01, DX-02 · Parallel partners: DX-09,11–14
- Branch: `design/dx-10-menu-motion` · Styles: `src/styles/dx-10-menu-motion.css` · Detail: D10

## Tasks
1. `src/components/chrome/DemoMenu.tsx`, `Bell.tsx`: replace `hidden={!open}` with `data-state="open|closed"`; set `hidden` only after exit (`transitionend` or fallback timer), preserving `display: none` control over screen readers and Tab order.
2. Styles: `.menu` enters with `opacity 0→1` + `scale(.96)→1` + `translateY(-4px)→0`, `var(--dur-fast)` + `var(--ease-out)`; exits using faster `var(--dur-press)`. `transform-origin: top right` near trigger; mobile menu is a full-width fixed strip (`max-width: 600px`), using `top center`.
3. Reduced motion: fade only, no scaling/translation.
4. Preserve outside-click close, Escape close, 3-second "Reset demo requires two clicks" timeout, `data-testid`.

## Allowed files
`src/components/chrome/DemoMenu.tsx`, `Bell.tsx`, `src/styles/dx-10-menu-motion.css`. Only this package owns `.menu`/`.menu-wrap` **motion properties** (shadows belong to DX-23).

## Acceptance
- `smoke`, `today`, `touch`, `a11y`, `bts`, desktop/mobile green (heavy `demo-menu`/`reset-demo` use).
- New `e2e/dx-10-menu.spec.ts`: opening `opacity` between 0 and 1; 200ms after close, `hidden` true; rapid double-click does not leave it half-open.
- Juanxi: click top-bar "Demo · …" and bell; menus grow gently below the trigger.

## Rollback
R2. DX-20 depends on it; revert DX-20 first.
