# DX-06 font details: word length, square number, cell phone small, folding

- Stage 1 Size S Risk Low R Level **R1 Available** Dependence: DX-01 Parallel Partners: DX-03 ~ 05, 07, 08
- Branch: `design/dx-06-type-details` Style File: `src/styles/dx-06-type-details.css` Corresponding Details: D28D29D30D31

## Why?
Title spacing is now harmonized with `-.01em`. Emil § 15 and Apple `typography.md`: Word spacing changes with the word number - bigger word is tighter, smaller word close to 0. The combination of line and unlined lines is the most recognizable part of this product.

## Something to do.
1. Word length: `h1` (26px) about `-.02em`; `h2` (18px) approximately `-.015em`; `h3`（15px）`0`；`.panel h2`, `.funding-detail h2` by their respective names. Write as selector overwrite, no `styles.css`.
2. Equivalent: Date, amount, count, percentage unified plus `font-variant-numeric: tabular-nums`. Today, Events, Team, Funding, Handoff lists all these elements (other than `.num`, e.g. dates in `td.nowrap`, `.stat-row b`, `.days`, `.timing`, `.count`) and then covers them uniformly.
3. Cell phone (`max-width: 600px`): `.chain-label`, `.m-tick`, `.m-label span`, `.gantt-tick`, etc. 12– 13px refers to `var(--fs-md)`. **can only use token**, which is not allowed to write nudity pixels; The check refers to a 14px label that does not overlap and does not support horizontal rolling.
4. `p`、`.small`、`.muted`、`.empty`、`.hover-card`：`text-wrap: pretty`。
5. Do not change fonts, characters, row heights. Do not change the name of h1 (see details D32 for DX-27).

## Files that can be changed
Only `src/styles/dx-06-type-details.css`.

## Acceptance
- New test `e2e/dx-06-type.spec.ts`: read the calculation of h1/h2/h3 `letter-spacing`, with three values different and h1 < h2 < h3 (tighter); The date cell calculation style in Today contains `tabular-nums`.
- Mobile phone 390 wide: `word-budgets.spec.ts`, `noOverflow` green for 0 and `a11y.spec.ts`.
- Juanxi How to Test: The title looks more compact and precise. (a) The date, amount and downward alignment of the matrix; The progress chain tag on the phone is better read.

## Rollback
R1 or R2.

## Attention.
- The label referring to 14px reduces layout spacing instead of narrowing the word if it causes a two-line break.
