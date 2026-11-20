# Goal

Repairs to src/stryles.css where contrasts are below the standards so that colours can be read under weak vision and color.

# Files

- src/styles.css

# Constraints

- Only field presentation data are used.
- Do not modify dependencies, deployments, GitHub Actions, secret key, research data or Night Mode security files.
- Do not modify or mege main.
- Src/ styles.css only, without touching any.tsx/.ts files.
- Do not touch src/organisation/, src/phase1/, src/workspace/ under CSS.
- Do not change layout, fonts, spacing, corner.
- **does not reread the document to "check the baseline".**
- Undetermined retention and writing in handoff records.

# Done means

## 1. Text contrast (WCAG AA requires 4.5:1)

`--good` is attached to `--good-soft` in the context of **4.44:1**, which is met by 0.06.
Use `.tag.good` (Approved tag for changing cards) and `.save-status.ok` (Saved hint for Settings).

**Change token itself**, do not fill a place with hard code value as it is now.
→  Delete the patch in the styles.css that fixed `.days.good` alone with a hard code.

## 2. Non-text contrast (WCAG 1.4.11 requires 3:1)

| Elements | Now. | Objective |
| --- | --- | --- |
| Yellow risk point `#e3a008` With white bottom | 2.26:1 | ≥3:1 |
| Team Medium Workload (%1) `.band.b2 i` (Yellow) | 1.74:1 | ≥3:1 |
| Unfinished segment of flowchart mainline `.m-line.main` | 1.85:1 | ≥3:1 |
| Progress chain/flow chart empty-minded border `--edge` | 2.59:1 | ≥3:1 |

Yellow is the only part of the three-colour risk system that does not meet the standards, while yellow happens to be the most relied upon and prioritized by weak users.

## 3. Full Station 1px Borders `--line`Don't move.

It's only got 1.29:1 on the white bottom, but deepening will make the interface obviously "heavy" and what Juanxi wants.
"Simple, advanced" is the opposite.

**Don't change `--line`.** If you think that somewhere must be bordered to convey state or clickability,
  Write it down in the Handoff record and suggest a rough or background distinction to Juanxi for decision.

## 4.

- `npm run check` must pass, a11y test must continue to pass.
- List the contrast figures (numbers for each item) that have been changed before the change in the Handoff record.

# Out of scope

- Do not change `--line`.
- Do not spell, spacing, corner, z-index.
- Do not touch src/engine/, netlife/, src/data/, any.tsx.
