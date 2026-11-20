> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# Goal

Fix failing contrast in src/styles.css for readability with low vision/color-vision deficiency.

# Files

- src/styles.css

# Constraints

- Fictional demo data only.
- Do not modify dependencies, deployment, GitHub Actions, keys, research data, or Night Mode safety files.
- Do not modify or merge main.
- Edit src/styles.css only; no .tsx/.ts files.
- Do not touch CSS under src/organization/, src/phase1/, src/workspace/.
- No layout/font-size/spacing/radius changes.
- **Do not reread the file afterward to "verify the baseline."**
- Preserve uncertain cases and record them in handoff.

# Done means

## 1. Text contrast (WCAG AA requires 4.5:1)

--good on --good-soft is **4.44:1**, short by 0.06.
Used by .tag.good (change-card Approved) and .save-status.ok (Settings Saved).

→ **Fix the token itself**, not individual hardcoded patches.
→ Remove styles.css's hardcoded dark-green .days.good patch afterward.

## 2. Non-text contrast (WCAG 1.4.11 requires 3:1)

| Element | Current | Target |
| --- | --- | --- |
| Yellow risk dot #e3a008 on white | 2.26:1 | ≥3:1 |
| Team medium-workload bar (.band.b2 i yellow) | 1.74:1 | ≥3:1 |
| Unfinished diagram main line .m-line.main | 1.85:1 | ≥3:1 |
| Hollow progress/diagram dot border --edge | 2.59:1 | ≥3:1 |

⚠️ Yellow is the only failing tier in the three-color risk system, and the one color-deficient users most rely on; fix first.

## 3. Leave global 1px border --line unchanged for now

Only 1.29:1 on white, but darkening would make the whole interface visibly heavier,
contrary to Juanxi's desired clean/refined style.

→ **Do not change --line.** Where borders must convey state/clickability,
record the case and suggest weight/background distinctions for Juanxi to decide.

## 4. Acceptance

- npm run check and existing a11y tests pass.
- List numeric before/after contrast for every item in handoff.

# Out of scope

- Do not change --line.
- No font-size/spacing/radius/z-index work.
- No src/engine/, netlify/, src/data/, or .tsx changes.
