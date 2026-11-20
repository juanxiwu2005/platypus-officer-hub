# DX-10 menu access (Demo menu, bell)

- Phase 2 size S Risk Low R Level R2 Dependence: DX-01, DX-02 Parallel Partners: DX-09, 11 - 14
- Branch: `design/dx-10-menu-motion` Style File: `src/styles/dx-10-menu-motion.css` Corresponding Details: D10

## Something to do.
1. `src/components/chrome/DemoMenu.tsx`, `Bell.tsx`: replace `hidden={!open}` with `data-state="open|closed"`; The `hidden` will be installed after the end of the exit (`transitionend` or the bottom timer) so that `display: none` will keep the reading screen and Tab order as usual.
2. Style: `.menu` enters `opacity 0→1` + `scale(.96)→1` + `translateY(-4px)→0`, `var(--dur-fast)` + `var(--ease-out)`; Stand down. `var(--dur-press)`(Quicker than entering)  `transform-origin: top right` (trigger button); The menu on the cell phone is a fixed line (`max-width: 600px`) full of width, using `top center`.
3. Reduction of kinetic effects: Fade out only, not scalable.
4. No change: 3 seconds timeout and `data-testid` for clicking on external closures, Escape closes, "Reset demo point twice".

## Files that can be changed
`src/components/chrome/DemoMenu.tsx`、`Bell.tsx`、`src/styles/dx-10-menu-motion.css`。`.menu`、`.menu-wrap`It's... **Activate Properties**Only this bag (shadowed by DX-) 23）。

## Acceptance
- `smoke`, `today`, `touch`, `a11y`, `bts` desktop + mobile phones green (they use `demo-menu` and `reset-demo` heavily).
- New test `e2e/dx-10-menu.spec.ts`: `opacity` at the moment of opening between 0 and 1; Close 200ms after `hidden` is true; Quick dots don't get stuck in the middle.
- Juanxi, how to test: "Demo..." small sign and bell at the top of the bar, the menu grows lightly from under the button.

## Rollback
R2。DX-20 Depends on it, first withdraws DX-20.
