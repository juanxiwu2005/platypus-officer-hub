> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# DX-06 typography details: spacing, tabular numbers, mobile small text, wrapping

- Stage 1 · SizeS · Low risk · R level **R1 available** · Dependency: DX-01 · Parallel: DX-03–05/07/08
- Branch: `design/dx-06-type-details` · Styles: `src/styles/dx-06-type-details.css` · Details: D28 D29 D30 D31

## Why
Heading letter-spacing is uniformly `-.01em`. Emil §15/Apple `typography.md`: spacing should vary with size—tighter for large text, near 0 for small. The serif/sans pairing is the product's most recognizable feature; refine details, do not replace fonts.

## Work
1. Letter-spacing: `h1`26 px about `-.02em`; `h2`18 px about `-.015em`; `h3`15 px `0`; `.panel h2`/`.funding-detail h2` by their sizes. Selector overrides; do not change `styles.css`.
2. Tabular numbers: add `font-variant-numeric: tabular-nums` to dates, amounts, counts, percentages. Inventory Today/Events/Team/Funding/Handoff elements first (beyond `.num`, e.g. dates in `td.nowrap`, `.stat-row b`, `.days`, `.timing`, `.count`), then override consistently.
3. Mobile (`max-width: 600px`): raise 12–13 px small text such as `.chain-label`, `.m-tick`, `.m-label span`, `.gantt-tick` to `var(--fs-md)`. **Tokens only**; style checks forbid raw pixels; after raising to 14 px verify no overlapping labels/horizontal scrolling.
4. `p`, `.small`, `.muted`, `.empty`, `.hover-card`: `text-wrap: pretty`.
5. Do not change font family, weight, line height, or h1 size (D32, DX-27).

## Allowed files
Only `src/styles/dx-06-type-details.css`.

## Acceptance
- New `e2e/dx-06-type.spec.ts`: computed h1/h2/h3 `letter-spacing` all distinct, h1<h2<h3 (tighter); Today date-cell computed style contains `tabular-nums`.
- Mobile 390: `word-budgets.spec.ts`, `noOverflow`0, `a11y.spec.ts` green.
- Juanxi checks: more compact/refined headings; aligned table dates/amounts; more readable mobile chain labels.

## Rollback
R1 or R2.

## Note
- If 14 px labels wrap to two lines, tighten layout spacing before reducing text size.
