> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# Goal

Consolidate scattered font sizes in src/styles.css into 7 token tiers. Each shift stays within ±1px,
so the overall appearance should look unchanged.

# Files

- src/styles.css

# Constraints

- Fictional demo data only.
- Do not modify dependencies, deployment, GitHub Actions, keys, research data, or Night Mode safety files.
- Do not modify or merge main.
- Edit src/styles.css only; no .tsx/.ts files.
- Do not touch CSS under src/organization/, src/phase1/, src/workspace/.
- No spacing, radius, color, z-index changes; font-size only.
- **Do not reread the file afterward to "verify the baseline."**
- Preserve uncertain cases and record them in handoff.

# Done means

## 1. Add these 7 tokens in :root

```
--fs-xs: 12px;    --fs-sm: 13px;    --fs-md: 14px;    --fs-base: 15px;
--fs-lg: 18px;    --fs-xl: 21px;    --fs-2xl: 26px;
```

## 2. Replace every font-size according to this table

| Current | Replacement | Shift |
| --- | --- | --- |
| `10px` | `var(--fs-xs)` | +2px (one occurrence; AGENTS.md §7.4 prohibits excessively small text, so increasing is appropriate) |
| `11px` | `var(--fs-xs)` | +1px |
| `11.5px` | `var(--fs-xs)` | +0.5px |
| `12px` | `var(--fs-xs)` | 0 |
| `12.5px` | `var(--fs-sm)` | +0.5px |
| `13px` | `var(--fs-sm)` | 0 |
| `13.5px` | `var(--fs-md)` | +0.5px |
| `14px` | `var(--fs-md)` | 0 |
| `14.5px` | `var(--fs-base)` | +0.5px |
| `15px` | `var(--fs-base)` | 0 |
| `.95rem` | `var(--fs-base)` | ≈0 |
| `16px` | `var(--fs-base)` | −1px |
| `17px` | `var(--fs-lg)` | +1px |
| `18px` | `var(--fs-lg)` | 0 |
| `19px` | `var(--fs-lg)` | −1px |
| `20px` | `var(--fs-xl)` | +1px |
| `21px` | `var(--fs-xl)` | 0 |
| `22px` | `var(--fs-xl)` | −1px |
| `26px` | `var(--fs-2xl)` | 0 |
| `clamp(26px, 3.2vw, 34px)` | **Keep unchanged** | — |

⚠️ Keep responsive heading clamp(...); do not replace with token.

## 3. Acceptance

- npm run check must pass; no existing test deletion or weakening.
- Handoff states old/new number of sizes and any unlisted values (list them and preserve unchanged).

# Out of scope

- Spacing, radii, colors, z-index.
- src/engine/, netlify/, src/data/, any .tsx.
