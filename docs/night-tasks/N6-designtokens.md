> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# Depends on: N2-radius.md
# Depends on: N3-fontscale.md
# Depends on: N4-infotoken.md

# Goal

Write docs/DESIGN_TOKENS.md explaining token rules established over previous rounds,
for people who do not code and as the sole reference for future UI-editing AIs.

This is the missing “design system deliverable.”

# Files

- docs/DESIGN_TOKENS.md (new)

# Constraints

- Fictional demo data only.
- Do not change dependencies, deployment, GitHub Actions, secrets, research data, Night Mode safety files.
- Do not modify/merge main.
- **Create this document only; no code/CSS changes.**
- Historical instruction: write documentation in Chinese (AGENTS.md section 3 rule 6: English UI, Chinese documentation). This is superseded by the current English policy.
- **After editing, do not reread the file to “check the baseline.”**

# Done means

Include in docs/DESIGN_TOKENS.md:

## 1. Opening sentence

Explain its authority: read before any UI change; new styles use tokens only, no hardcoded values.

## 2. Tables for each token group

**Read actual values** from `:root` in src/styles.css (do not rely on memory), then list:

- Font sizes (`--fs-*`): value/use of each level
- Radii (`--r-*`): value/target elements
- Layers (`--z-*`): value/stacking order low to high
- Spacing (`--s*`): value/explanation that derived from frequent values, not ideal grid
- Colors: brand plus 6 status colors, **contrast number for every status color**
  (from T4/T5 handoffs, never guess)

## 3. “Why these values” section

Briefly explain: levels derived from existing UI, not a redesign.
Goal: make UI describable/evaluable, not change appearance.

## 4. “For future UI editors” section

- New styles use tokens only
- If a new value is necessary, add token first, never hardcode
- Dark mode: currently follows system (`prefers-color-scheme`);
  CSS supports forced `data-theme="light"` / `"dark"`, but no UI switch yet

## 5. Acceptance

- `npm run check` must pass (no code changes this round, should pass directly).
- Handoff must say: values read from actual styles.css, not estimated.

# Out of scope

- No CSS/code changes.
- No other new documents.
