> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# DX-13 Expandable-section animation

- Stage 2 · Size S · Low risk · Rollback **R1 available** · Depends on: DX-01 · Parallel partners: DX-09–12,14
- Branch: `design/dx-13-details-motion` · Styles: `src/styles/dx-13-details-motion.css` · Detail: D13

## Tasks
1. Inventory first: `<details>` appears in `ChangeCard`, `NudgeComposer`, `OrgDetail`, `ContactDetail`, `FollowupPanel`, `SettingsForms`, `NodePanel`, `TaskDetail`, `Handoff`, `Setup`, `Funding`; list every class in the report.
2. Progressive enhancement (`@supports (selector(details::details-content))`):
   - `details::details-content { block-size: 0; overflow: clip; transition: block-size var(--dur-base) var(--ease-out), content-visibility var(--dur-base) allow-discrete; }`
   - `details[open]::details-content { block-size: auto; }`, with `interpolate-size: allow-keywords`.
   - Unsupported browsers retain instant expansion without errors.
3. Rotate the small arrow beside `summary`90° on expansion if drawn with a pseudo-element; leave browser-native triangles alone.
4. Reduced motion: no height transition.

## Allowed files
Only `src/styles/dx-13-details-motion.css`. No `.tsx` changes.

## Acceptance
- Expandable-section tests (`events`, `today`, `m2b`, "More" in `bts`) desktop/mobile green.
- Supported browser (bundled Playwright Chromium): opening `::details-content` has a transitioning `block-size`.
- Juanxi: open an Events step and select "More" in the rail; content expands smoothly.

## Rollback
R1 or R2.
