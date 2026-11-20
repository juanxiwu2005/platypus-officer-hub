# Animation of the DX-13 folding area

- Stage 2 Size S Risk Low R Level **R1 Available** Dependence: DX-01 Parallel Partners: DX-09 ~ 12, 14
- Branch: `design/dx-13-details-motion` Style File: `src/styles/dx-13-details-motion.css` Corresponding Details: D13

## Something to do.
1. `<details>` currently appears in `ChangeCard`, `NudgeComposer`, `OrgDetail`, `ContactDetail`, `FollowupPanel`, `SettingsForms`, `NodePanel`, `TaskDetail`, `Handoff`, `Setup`, `Funding`; Put every one of them in the report.
2. Progressively enhanced (`@supports (selector(details::details-content))`):
   - `details::details-content { block-size: 0; overflow: clip; transition: block-size var(--dur-base) var(--ease-out), content-visibility var(--dur-base) allow-discrete; }`
   - `details[open]::details-content { block-size: auto; }` and set `interpolate-size: allow-keywords`.
   - The unsupported browser keeps the current "simultaneous" without misinforming.
3. Rotates the little arrow next to the caption (`summary`) when it is expanded 90° (if it is painted with a false element); If the browser carries its own triangle, don't move.
4. Reducing kinetic effects: No high transition.

## Files that can be changed
Only `src/styles/dx-13-details-motion.css`. Do not change any `.tsx`.

## Acceptance
- Opens the test of the folding area ( "More" in `events`, `today`, `m2b` and `bts`) desktop + mobile phone green.
- In the supported browser (Playwright self-titling chromium): Expanding `::details-content` for instantaneous `block-size` in transition.
- Juanxi How to Test: Events point a step, right column "More" opens and the content is smooth.

## Rollback
R1 or R2.
