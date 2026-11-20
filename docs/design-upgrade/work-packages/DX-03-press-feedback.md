> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# DX-03 Press feedback and hover transitions

- Stage 1 · Size S · Low risk · Rollback **R1 available** · Depends on: DX-01 · Parallel partners: DX-04…08
- Branch: `design/dx-03-press-feedback` · Styles: `src/styles/dx-03-press-feedback.css` · Details: D01 D02

## Why
**Measured: ** button/navigation/card transitions are all `all 0s`, with no `:active` in the stylesheet. Presses give no feedback, making the interface feel unresponsive. Emil §1: respond at the instant of pressing, not on release.

## Tasks
1. Use `:active` press feedback (`transition: transform var(--dur-press) var(--ease-out)`):
   - Filled-button classes: `.btn`, `.chip`, `.icon-btn`, `.demo-pill`, `.seg button`, `.crm-seg button`, `.rail-tabs [role="tab"]`, `.settings-nav button`, `.event-nav button`, `.board-add-btn`, `.relay`, `.owner-chip button`: `transform: scale(.97)`.
   - Text controls: `.row-btn`, `.link`, `.group-btn`: `opacity: .7`, no scale (scaling a text row looks odd).
   - `.sidenav a`: background only on press (frequent action; no displacement).
   - Disabled elements (`[disabled]`, `aria-disabled="true"`) do not respond.
2. Hover transitions: background/color on `.btn`, `.sidenav a`, `.event-nav button`, `.settings-nav button`, `.crm-seg button`, `.tbl .row-btn` use `var(--dur-fast)`, all inside `@media (hover: hover)`.
3. Reduced motion: remove `transform` inside `@media (prefers-reduced-motion: reduce)`, retaining color changes.
4. **Do not touch** `.ask-fab` (DX-09), `.board-card` (DX-16/24), `.hover-card` (S3 decision).

## Allowed files
Only `src/styles/dx-03-press-feedback.css`.

## Acceptance
- New `e2e/dx-03-press.spec.ts`: after `mouse.down()` (without release), `.btn` computed `transform` is not `none`; after release it returns to `none`. Reduced motion keeps `transform` `none` throughout.
- Desktop/mobile: `today.spec.ts`, `tasks.spec.ts`, `touch.spec.ts`, `a11y.spec.ts` green.
- Juanxi: hold any preview button; it shrinks gently and springs back on release. Navigation clicks change background only, without shrinking.

## Rollback
R1: comment out the DX-03 line in `src/styles/index.css`. R2: `git revert -m 1 dx/dx-03-merged`.

## Notes
- Scaling `inline-flex` elements with `overflow: hidden` may clip shadows; inspect each.
- No `transition: all` (guard rejects it).
