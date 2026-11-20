> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# Goal

Consolidate obviously ad hoc odd spacing values in src/styles.css into adjacent common values.
Change only odd values; common even values (4/8/12/16/20/24) remain, so shifts are at most 1px.

# Files

- src/styles.css

# Constraints

- Fictional demo data only.
- No dependency, deployment, GitHub Actions, secrets, research-data, Night Mode safety-file changes.
- Do not modify or merge main.
- Only src/styles.css, no .tsx/.ts.
- No CSS under src/organization/, src/phase1/, src/workspace/.
- No font-size/radius/color/z-index changes; padding / margin / gap only.
- **After editing, do not reread files to verify the baseline.**
- Preserve uncertain cases and record them in handoff.

# Done means

## 1. Only these replacements; all other spacing unchanged

| Current | Replacement | Shift |
| --- | --- | --- |
| `1px` | `2px` | +1 |
| `3px` | `2px` | −1 |
| `5px` | `4px` | −1 |
| `7px` | `6px` | −1 |
| `9px` | `8px` | −1 |
| `11px` | `12px` | +1 |
| `18px` | `16px` | −2 |
| `22px` | `24px` | +2 |

**Do not change:** `2px` `4px` `6px` `8px` `10px` `12px` `14px` `16px` `20px` `24px`
`28px` `40px` `48px`. They are frequent values; changing them changes appearance.

⚠️ `18px`/`22px` shift ±2px, only a few occurrences each. List their changed selectors separately in the handoff.

## 2. Add spacing tokens (definitions only, no forced global replacement)

```
--s1: 2px;   --s2: 4px;   --s3: 6px;   --s4: 8px;
--s5: 12px;  --s6: 16px;  --s7: 24px;
```

Add a comment above: derived from frequent existing values, not an ideal 4px grid;
appearance takes priority over grid purity. New styles should use these tokens.

## 3. Acceptance

- `npm run check` must pass; no existing test removal/weakening.
- Handoff lists counts per odd value and changed 18px/22px selectors.

# Out of scope

- No mandatory global spacing-token migration (high risk/low benefit).
- No font sizes, radii, colors, z-index.
- Do not touch src/engine/, netlify/, src/data/, any .tsx.
