# DX-03 for feedback and suspension transition

- Stage 1 Size S Risk Low R Level **R1 Available** Dependence: DX-01 Parallel Partner: DX-04 ... 08
- Branch: `design/dx-03-press-feedback` Style File: `src/styles/dx-03-press-feedback.css` Corresponding Details: D01 D02

## Why?
**measured to**: Buttons, navigations, cards for translation are `all 0s` and there is no `:active` in the stylesheet. Press it without any feedback. The interface looks "no hands." Emil § 1: Press the moment to react and don't wait to let go.

## Something to do.
1. Press feedback using `:active` (`transition: transform var(--dur-press) var(--ease-out)`):
   - Buttons with background: `.btn`, `.chip`, `.icon-btn`, `.demo-pill`, `.seg button`, `.crm-seg button`, `.rail-tabs [role="tab"]`, `.settings-nav button`, `.event-nav button`, `.board-add-btn`, `.relay`, `.owner-chip button`: `transform: scale(.97)`.
   - Text types: `.row-btn`, `.link`, `.group-btn`: use `opacity: .7` without scaling (scaling text is odd).
   - `.sidenav a`: Click to change only the background (it is a high-frequency operation without displacement).
   - Disable elements (`[disabled]`, `aria-disabled="true"`) do not respond.
2. Suspended transition: `.btn`, `.sidenav a`, `.event-nav button`, `.settings-nav button`, `.crm-seg button`, `.tbl .row-btn` background/colour transition using `var(--dur-fast)`, all wrapped in `@media (hover: hover)`.
3. Reduction of kinetic effects: remove `transform` from `@media (prefers-reduced-motion: reduce)` and keep color changes.
4. **Don't touch** `.ask-fab` (DX-09), `.board-card` (DX-16/24), `.hover-card` (S3 Decision).

## Files that can be changed
Only `src/styles/dx-03-press-feedback.css`.

## Acceptance
- New Test `e2e/dx-03-press.spec.ts`：`mouse.down()`Read after (no loose hands) `.btn`, the calculation style, `transform`Not `none`； Released and returned to `none`. `transform` is always `none` in the action reduction mode.
- Desktops and mobile phones: `today.spec.ts`, `tasks.spec.ts`, `touch.spec.ts`, `a11y.spec.ts` green.
- Juanxi How to Test: Hold on to any button in the preview and narrow it slightly; Let go of me. Navigator bar clicks do not shrink. Only the background gets deeper.

## Rollback
R1: Comment on line DX-03 in `src/styles/index.css`. R2：`git revert -m 1 dx/dx-03-merged`。

## Attention.
- Scales the elements of `inline-flex` and `overflow: hidden` that may be condensed; Look at it one by one.
- Don't write `transition: all`.
