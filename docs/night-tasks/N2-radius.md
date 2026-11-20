# Goal

Take the scattered corner values from src/ styles.css to 4 token, plus pills and square shapes.

# Files

- src/styles.css

# Constraints

- Only field presentation data are used.
- Do not modify dependencies, deployments, GitHub Actions, secret key, research data or Night Mode security files.
- Do not modify or mege main.
- Src/ styles.css only, without touching any.tsx/.ts files.
- Do not touch src/organisation/, src/phase1/, src/workspace/ under CSS.
- Do not change fonts, spacing, colours, z-index. This round only moves border-radius.
- **does not reread the document to "check the baseline".**
- Undetermined retention and writing in handoff records.

# Done means

## 1. In: root Riga, this 6 token

```
--r-xs: 4px;      --r-sm: 8px;      --r-md: 12px;     --r-lg: 14px;
--r-pill: 999px;  --r-circle: 50%;
```

The existing `--radius: 14px` remains static (many places are in use) and indicates next to it that it is equivalent to `--r-lg`.

## 2. Replace every place with this table

| Present value [p] | Change it to | Offset |
| --- | --- | --- |
| `0` | Hold `0`♪ Don't change token | — |
| `3px` | `var(--r-xs)` | +1px |
| `4px` | `var(--r-xs)` | 0 |
| `5px` | `var(--r-xs)` | −1px |
| `6px` | `var(--r-sm)` | **+2px** |
| `8px` | `var(--r-sm)` | 0 |
| `9px` | `var(--r-sm)` | −1px |
| `10px` | `var(--r-md)` | **+2px** |
| `12px` | `var(--r-md)` | 0 |
| `14px` | `var(--r-lg)` | 0 |
| `var(--radius)` | Stay where you are. | 0 |
| `999px` | `var(--r-pill)` | 0 |
| `50%` | `var(--r-circle)` | 0 |

⚠  Only two places in the table are offset by +2px (`6px` and `10px`). The rest is within  ± 1px, it's not clear.
**in the Handoff log shows how many**s have been changed by 6px and 10px separately to allow Juanxi to focus on these places.

## 3.

- `npm run check` must be passed and the original test article cannot be deleted or reduced.
- Writes in the handoff log: how many changes have been made to the original corner values, what are now, 6px and 10px.

# Out of scope

- Do not make letters, spacing, colours, z-index.
- Do not touch src/engine/, netlife/, src/data/, any.tsx.
