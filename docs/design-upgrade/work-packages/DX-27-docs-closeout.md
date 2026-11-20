# DX-27 Document Close + Style Guard Completion + Small Style File (subject to approval)

- Phase 6 size M Risk Low R Level R2 Dependence: All Parallel Partners: None (final)
- Branch: `design/dx-27-docs-closeout` Corresponding Details: D32 D53 D54 D55

## Something to do.
1. **Document** (this is the only package that allows these files to be changed):
   - `docs/DESIGN_TOKENS.md`: Add "activities token" (`--dur-*`, `--ease-*`, `--spring-*`), "shading level" (`--elev-*`), "structure of small style files and rules of belonging". Align the h1 description (default: change the document to a fixed `--fs-2xl` that corresponds to the code); Juanxi will do it alone if changed to clamp.
   - `AGENTS.md`: Section 7 plus a sub-section "Rules of action" (time token); There must be a less dynamic version; Only `transform`/ `opacity`; May be interrupted; (c) A common operation without animation; Zero delay for desktop suspension cards; Add a row to the list of reading documents in section 1 pointing to `docs/design-upgrade/README.md`; After **verification,** updates the outdated `main` facts in section 0 (every submission written is actually checked with a git).
   - `docs/PROGRESS.md`: Write a general record of the closing; "Need to synchronise local backup."
2. **Guards complete**: add to style check the "don't show up again" found in previous packages (e.g. no `!important` in small files, no delay for `.hover-card` (desktop). Each plus one must have a sample of "intentional violation" to verify that it's gonna be red.
3. **Merge Small Style File (Juanxi is required to do it with explicit consent and a single submission)**_Other Organiser `src/styles/dx-*.css`Together. `src/styles.css`♪ With a piece `/* ===== v1.2 design upgrade ===== */`Delete `src/styles/`and `index.css`、`main.tsx`That line was introduced.  Request: Convergence of **bytes before and after `dx-shots` PNG**. After **metge, R1 can't use** (rollback only R2); This has to be written in the report, so merge only does it after the whole package of acceptance.
4. Write `reports/SUMMARY.md`: 27 packages of their respective status, preview of web sites, known problems, final state of `ROLLBACK_LOG.md`.

## Files that can be changed
`docs/DESIGN_TOKENS.md`, `AGENTS.md`, `docs/PROGRESS.md`, `docs/design-upgrade/**`, `.stylelintrc.json`, `src/styles/*` (3 only), `src/styles.css` (3 only).

## Acceptance
- `npm run check` Full green; `dx-shots` bytes consistent (step 3); Each submission number in the document can be repeated with an order.

## Rollback
R2。
