> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# Goal

Remove never-defined CSS variable `--st-now` and consolidate the same blue hardcoded in 4 places
into two tokens. **No visual changes**; all final rendered colors identical.

# Files

- src/styles.css

**Do not read** files in src/components/, src/pages/, src/organization/, src/phase1/, src/workspace/.
Only src/styles.css changes.

# Constraints

- Fictional demo data only.
- No dependencies/deployment/GitHub Actions/secrets/research-data/Night Mode safety-file changes.
- Do not modify/merge `main`.
- Only src/styles.css, no .tsx/.ts.
- **Do not edit src/components/ui/statusDefaults.ts.** Its 6 status colors/PALETTE
  are user-editable data; literals must stay unchanged.
- **Do not touch either dark-theme section** (`@media (prefers-color-scheme: dark)`,
  `:root[data-theme="dark"]`). No dark variants for new tokens; rationale in 1 below.
- No font-size/spacing/radius/layout/z-index changes.
- **After editing do not reread to “verify baseline.”** Files differing from task description is normal—you just changed them.
- Retain uncertainties/note in handoff.

# Done means

## 1. Add two tokens in `:root`

```
--info: #3a6fd8;
--info-glow: rgba(58,111,216,.18);
```

Comment above, preserving all three points (own wording allowed):

- **Timeline/chart** blue means “currently here.”
- **Not** a status color. Chain/flowchart `.now` dots use chart states
  (`done`/`now`/`todo`/`risk`) from `nodeStop()`, inferred from schedule/risk;
  6 user statuses map many-to-one. Therefore **no** corresponding status color,
  and no following user Settings→Board colors.
- Intentionally no dark override: current light/dark share blue.
  Rename only, no appearance change.

## 2. Replace these 4 locations, identical rendered colors

| Location | Current | Replacement |
| --- | --- | --- |
| `.chain .dot.now` `background` | `var(--st-now, #3a6fd8)` | `var(--info)` |
| `.chain .dot.now` `border-color` | `var(--st-now, #3a6fd8)` | `var(--info)` |
| `.chain .dot.now` `box-shadow` color | `rgba(58,111,216,.18)` | `var(--info-glow)` |
| `.m-dot.now` `background`/`border-color` | `#3a6fd8` | `var(--info)` |
| `.m-dot.now` `box-shadow` color | `rgba(58,111,216,.18)` | `var(--info-glow)` |
| `.m-dot.now.risk` `background` | `#3a6fd8` | `var(--info)` |

`.m-dot.now.risk` `border-color: var(--late)` **unchanged**.

⚠️ `--st-now` in `var(--st-now, #3a6fd8)` has never been defined anywhere,
so always falls back to `#3a6fd8`. `var(--info)` renders identically,
removing a variable that pretends configurability but never works.

## 3. Afterward `--st-now` must occur 0 times throughout src/

## 4. Acceptance

- `npm run check` passes.
- **No new tests needed.** Pure rename, no changed behavior to test.
  Do not invent tests for deliverables or alter/weaken existing tests.
- Handoff records:
  - Changed lines
  - `--st-now` entirely absent from src/
  - `statusDefaults.ts`, both dark sections, `Handoff.tsx` untouched

# Out of scope

- **No `src/pages/Handoff.tsx` changes.** Line 61 inlines `#237a42`/`#3a6fd8`/`#5f6763`.
  Whether they should follow user status colors is a product-semantics decision for Juanxi,
  outside this round.
- **No “eliminating synonymous different colors.”** `--late/--good/--warn` and blocked/done/in_progress
  seem duplicated but obey different constraints: brand tokens are **text** on light backgrounds,
  with separate dark values; status colors back **white text**, without dark variants.
  Merging ruins dark-theme contrast (white on `#f08a80` only 2.43:1).
  **Do not do this.**
- No typography/spacing/radius/z-index.
- No src/engine/, netlify/, src/data/, any .tsx.

---

## Budget estimate

One file, about 6 replacements/comment. Read/edit/check,
normally under 20 steps; 300 budget ample.
