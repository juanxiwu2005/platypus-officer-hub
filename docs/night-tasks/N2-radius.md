> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# Goal

Consolidate scattered src/styles.css radii into 4 token levels plus pill/circle shapes.

# Files

- src/styles.css

# Constraints

- Fictional demo data only.
- No dependencies/deployment/GitHub Actions/secrets/research-data/Night Mode safety-file changes.
- Do not modify/merge main.
- Only src/styles.css; no .tsx/.ts.
- No CSS under src/organization/, src/phase1/, src/workspace/.
- No typography/spacing/color/z-index changes; border-radius only.
- **After editing, do not reread to “verify baseline.”**
- Retain uncertainties and note in handoff.

# Done means

## 1. Add these 6 tokens in `:root`

```
--r-xs: 4px;      --r-sm: 8px;      --r-md: 12px;     --r-lg: 14px;
--r-pill: 999px;  --r-circle: 50%;
```

Keep existing `--radius: 14px` (widely used), comment beside it that it equals `--r-lg`.

## 2. Replace every border-radius by table

| Current | Replacement | Change |
| --- | --- | --- |
| `0` | Keep `0`, no token | — |
| `3px` | `var(--r-xs)` | +1 px |
| `4px` | `var(--r-xs)` |0|
| `5px` | `var(--r-xs)` | −1 px |
| `6px` | `var(--r-sm)` | **+2 px** |
| `8px` | `var(--r-sm)` |0|
| `9px` | `var(--r-sm)` | −1 px |
| `10px` | `var(--r-md)` | **+2 px** |
| `12px` | `var(--r-md)` |0|
| `14px` | `var(--r-lg)` |0|
| `var(--radius)` | Unchanged |0|
| `999px` | `var(--r-pill)` |0|
| `50%` | `var(--r-circle)` |0|

⚠️ Only `6px`/`10px` move+2 px; others within±1 px, imperceptible.
**Separately count changed `6px` / `10px` locations** in handoff for Juanxi's focused review.

## 3. Acceptance

- `npm run check` passes; no existing test deletion/weakening.
- Handoff: original/current distinct radius counts, 6px/10px replacement counts.

# Out of scope

- Typography/spacing/color/z-index.
- src/engine/, netlify/, src/data/, any .tsx.
