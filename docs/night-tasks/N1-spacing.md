# Goal

Take the odd spacing values of src/stryles.css, which are clearly handwritten, to adjacent commonly used values.
Only odd values are moved and the usual even value (4/8/12/16/20/24) is not touched, so moving to a maximum of 1 px.

# Files

- src/styles.css

# Constraints

- Only field presentation data are used.
- Do not modify dependencies, deployments, GitHub Actions, secret key, research data or Night Mode security files.
- Do not modify or mege main.
- Src/ styles.css only, without touching any.tsx/.ts files.
- Do not touch src/organisation/, src/phase1/, src/workspace/ under CSS.
- Do not change character, corner, colour, z-index. This round only moves padding / margin / Gap.
- **does not reread the document to "check the baseline".**
- Undetermined retention and writing in handoff records.

# Done means

## 1. Just these replacements, the rest of the space remains intact.

| Present value [p] | Change it to | Offset |
| --- | --- | --- |
| `1px` | `2px` | +1 |
| `3px` | `2px` | −1 |
| `5px` | `4px` | −1 |
| `7px` | `6px` | −1 |
| `9px` | `8px` | −1 |
| `11px` | `12px` | +1 |
| `18px` | `16px` | −2 |
| `22px` | `24px` | +2 |

**Hold still**: `2px` `4px` `6px` `8px` `10px` `12px` `14px` `16px` `20px` `24px`
`28px` `40px` `48px`。They're high-frequency, they move to look.

The `18px` and the `22px` are  — 2px shifts, each with only a few. Lists separately which selections have been changed in the Handoff record.

## 2. Add a set of spacing token (defined only, this round is not mandatory for full station replacement)

```
--s1: 2px;   --s2: 4px;   --s3: 6px;   --s4: 8px;
--s5: 12px;  --s6: 16px;  --s7: 24px;
```

Add a line above to explain that this is the result of an existing high frequency value, not the ideal 4px grid --
The choice of a retentionist perception over the pureness of the grid. The new writing style should use these tokens.

## 3.

- `npm run check` must be passed and the original test article cannot be deleted or reduced.
- In the handoff record, how many changes have been made to each odd value and which selections have been changed in 18px/ 22px.

# Out of scope

- There is no obligation to exchange all spacing for token (high risk, low return).
- Do not make word numbers, round corners, colours, z-index.
- Do not touch src/engine/, netlife/, src/data/, any.tsx.
