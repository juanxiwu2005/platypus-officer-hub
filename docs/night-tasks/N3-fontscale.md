# Goal

Draw up scattered src/ styles.css to 7 token. Each location is moved within  ± 1px.
So the overall perception should not be seen to change.

# Files

- src/styles.css

# Constraints

- Only field presentation data are used.
- Do not modify dependencies, deployments, GitHub Actions, secret key, research data or Night Mode security files.
- Do not modify or mege main.
- Src/ styles.css only, without touching any.tsx/.ts files.
- Do not touch src/organisation/, src/phase1/, src/workspace/ under CSS.
- Do not change spacing, corner, color, z-index. This round only moves font-size.
- **does not reread the document to "check the baseline".**
- Undetermined retention and writing in handoff records.

# Done means

## 1. In: root Riga, this 7 token

```
--fs-xs: 12px;    --fs-sm: 13px;    --fs-md: 14px;    --fs-base: 15px;
--fs-lg: 18px;    --fs-xl: 21px;    --fs-2xl: 26px;
```

## 2. Replace every spot with this table

| Present value [p] | Change it to | Offset |
| --- | --- | --- |
| `10px` | `var(--fs-xs)` | +2px (only 1, and AGENTS.md § 7.4 requires not to be too small, right up) |
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
| `clamp(26px, 3.2vw, 34px)` | **Stay as it is** | — |

The `clamp(...)` is a responsive headline, don't change to token, keep it.

## 3.

- `npm run check` must be passed and the original test article cannot be deleted or reduced.
- In the handoff record: original characters, current ones, any values not listed in the table (list them and keep them).

# Out of scope

- Do not do spacing, round corners, colours, z-index.
- Do not touch src/engine/, netlife/, src/data/, any.tsx.
