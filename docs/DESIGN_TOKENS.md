# Platypus design tokens

**Read this document before changing any interface. New styles must use tokens; do not hardcode values in CSS.** All tokens are defined in `:root` (light) and the two dark-theme blocks in `src/styles.css`, except the 6 status colors in `src/components/ui/statusDefaults.ts`.

All values here were read directly from these two files on 2026-10-29. Contrast ratios were calculated by a script using the WCAG formula (N5's before/after figures come from its handoff record in `docs/PROGRESS.md`). Text requires 4.5:1; graphics (dots, lines, and color bars) require 3:1.

---

## 1. Font sizes `--fs-*`

| Token | Value | When to use |
| --- | --- | --- |
| `--fs-xs` | 12px | Smallest supporting text: labels, badges, footnotes |
| `--fs-sm` | 13px | Tables, secondary information, small buttons |
| `--fs-md` | 14px | Regular body text, inputs (AGENTS.md §7.4: at least 14px is the goal; 12–13 is only for supporting text) |
| `--fs-base` | 15px | Base page font size |
| `--fs-lg` | 18px | Small headings |
| `--fs-xl` | 21px | Section headings |
| `--fs-2xl` | 26px | Large numbers, emphasis |

Page titles `h1` use a fixed `var(--fs-2xl)` (26px); on mobile, `.page-head h1` uses `var(--fs-xl)`. **They no longer scale continuously with viewport width** (the previously documented `clamp(26px, 3.2vw, 34px)` has long differed from the code; DX-27 corrected the documentation to match. A clamp version requires a separate decision from Juanxi). Sizes in `font:` shorthands (`15px/1.55` on `body`, `600 13.5px/1.3` on `.board-col > header h2`) have not been tokenized and are known exceptions.

## 2. Corner radii `--r-*`

| Token | Value | Elements |
| --- | --- | --- |
| `--r-xs` | 4px | Very small blocks: Gantt bars, sharp corners of chat bubbles, small tags |
| `--r-sm` | 8px | Inputs, small tags, color swatches, menu items, focus outlines |
| `--r-md` | 12px | Buttons, navigation items, cards (task, Board, hover, flowchart), notification bars |
| `--r-lg` | 14px | Largest panels; equivalent to the old `--radius` variable (retain it; do not delete) |
| `--r-pill` | 999px | Pill shapes |
| `--r-circle` | 50% | Circles (dots, avatars) |

`0` needs no token; write `0` directly.

## 3. Layers `--z-*` (higher numbers appear in front)

Lowest to highest:

| Token | Value | Description |
| --- | --- | --- |
| `--z-base` | 0 | Base |
| `--z-raised` | 1 | Slightly raised |
| `--z-sticky` | 2 | Sticky |
| `--z-sticky-hi` | 3 | Higher sticky layer |
| `--z-local` | 4 | Local overlays (such as Gantt headers) |
| `--z-dropdown` | 5 | Form suggestion dropdown (`.owner-suggest`, M2b owner picker). **Why added:** it previously hardcoded `z-index: 5`, and no existing token was semantically close (`--z-local` 4 is for sticky headers; `--z-topbar` 20 is too high). Changing to 4 would put them on the same layer; 20 would cover elements it should not. A separate level retains the original 5 and the same appearance. |
| `--z-topbar` | 20 | Top bar |
| `--z-overlay` | 40 | Overlay |
| `--z-fab` | 45 | Floating action button (Ask) |
| `--z-toast` | 50 | Toast notification |
| `--z-rail` | 55 | Right rail |
| `--z-menu` | 60 | Menu |
| `--z-tip` | 70 | Hover card (highest) |

## 4. Spacing `--s*`

| Token | Value | Token | Value |
| --- | --- | --- | --- |
| `--s1` | 2px | `--s5` | 12px |
| `--s2` | 4px | `--s6` | 16px |
| `--s3` | 6px | `--s7` | 24px |
| `--s4` | 8px | | |

**This is not an ideal 4px grid.** These 7 levels were derived from the values most commonly used in the existing interface; retaining its appearance matters more than a regular grid. New styles use these tokens; existing rules are not required to migrate (even values such as 10px, 14px, 20px, and 28px remain in old rules).

## 5. Colors

### 5.1 Brand and semantic colors (light → dark)

| Token | Light | Dark | Description |
| --- | --- | --- | --- |
| `--bg` | #fbfaf7 | #0f1312 | Page background |
| `--surface` | #ffffff | #171c1b | Card background |
| `--surface-2` | #f3f1ec | #1d2322 | Secondary background |
| `--lane` | #f6f4ef | #141918 | Swimlane/track background |
| `--ink` | #1b1f1d | #eceeed | Body text |
| `--muted` | #5b625e | #a2aaa6 | Secondary text |
| `--line` | #e5e2da | #2a312f | 1px border (intentionally subtle; **do not darken**) |
| `--accent` | #0f766e | #3fb8a8 | Brand color |
| `--accent-ink` | #0b5a54 | #7fd6ca | Brand-colored text |
| `--accent-soft` | #e4f1ef | #14302c | Soft brand background |
| `--on-accent` | #ffffff | #06201d | Text on the brand color |
| `--warn` / `--warn-soft` | #8f5206 / #fbf0dc | #e7a74a / #33270f | Caution (text/background) |
| `--late` / `--late-soft` | #b42318 / #fbe7e5 | #f08a80 / #3a1c19 | Late/stuck (text/background) |
| `--good` / `--good-soft` | #197d36 / #e3f4e7 | #6fcf8a / #15301d | Done (text/background) |
| `--edge` | #878f8b | #5f6965 | Edges of hollow dots, dashed avatars, and Gantt vertical lines |
| `--risk-yellow` | #ba8306 | #e3a008 | Yellow risk dots, medium-level Team bars |
| `--mline-main` | #888e8b | #b9c0bc | Unfinished segments of the main flowchart line |
| `--warn-line` | #e8cf9c | Same as light | Border of the amber Demo badge (added in S6; previously hardcoded) |
| `--on-solid` | #ffffff | Same as light | Text on solid color blocks: status blocks, badges, Board column headers (added in S6; previously hardcoded #fff) |
| `--on-dark-warn` | #ffb4ab | Same as light | Warning text in hover cards that are always dark (added in S6) |
| `--info` / `--info-glow` | #3a6fd8 / rgba(58,111,216,.18) | Same as light | Timeline blue; see 5.3 |

Contrast (text pairs, light / dark):

| Pair | Light | Dark |
| --- | --- | --- |
| `--ink` on `--bg` | 15.96 | 16.06 |
| `--muted` on `--bg` | 6.00 | 7.87 |
| `--accent` on `--bg` | 5.24 | 7.69 |
| `--warn` on `--warn-soft` | 5.51 | 6.97 |
| `--late` on `--late-soft` | 5.53 | 6.36 |
| `--good` on `--good-soft` | 4.56 | 7.45 |
| `--on-accent` on `--accent` | 5.47 (white) | 7.01 |

Graphic contrast (after N5; minimum across the `--bg`, `--surface`, and `--lane` backgrounds; required ratio 3:1):

| Item | Light before → after | Dark (unchanged) |
| --- | --- | --- |
| `--good` on `--good-soft` (text) | #1a7f37 → #197d36, 4.44 → **4.56** | #6fcf8a, 7.45 |
| Risk yellow `--risk-yellow` | #e3a008 → #ba8306, 2.05 → **3.01** | #e3a008, 8.29 (on bg) |
| Main flowchart line `--mline-main` | #b9c0bc → #888e8b, 1.69 → **3.04** | #b9c0bc, 10.1 (on bg) |
| `--edge` | #9aa39e → #878f8b, 2.36 → **3.02** | #5f6965, 3.29 (on bg) / 3.03 (on surface) |

Yellow and the main line intentionally retain their original dark-theme values: they are already clear against dark backgrounds, and darkening would reduce clarity.

### 5.2 The 6 status colors (in `statusDefaults.ts`, not styles.css)

These are the **defaults** users can rename and recolor in Settings → Board. Each status color carries white text, with no dark variant (it is user data and does not change with the theme).

| Status (UI label) | Default color | White text on it | As text on `--bg` | As text on `--surface` |
| --- | --- | --- | --- | --- |
| Not claimed | #5f6763 | 5.82 | 5.58 | 5.82 |
| To do | #3a6fd8 | 4.72 | 4.53 | 4.72 |
| Working on it | #b25c00 | 4.75 | 4.55 | 4.75 |
| Waiting | #8656cc | 4.98 | 4.77 | 4.98 |
| Stuck | #c0362f | 5.51 | 5.28 | 5.51 |
| Done | #237a42 | 5.34 | 5.11 | 5.34 |

Every color in `PALETTE` in `statusDefaults.ts` (10 user-selectable colors) must maintain at least 4.5:1 with white text. Calculate contrast before adding a color.

### 5.3 Important: `--late/--good/--warn` and status colors are separate systems; **do not merge them**

They look redundant (two reds, greens, and oranges, with slightly different values), but their constraints differ:

| | `--late` / `--good` / `--warn` | 6 status colors |
| --- | --- | --- |
| Usage | **Text** on light backgrounds, plus borders and soft backgrounds | **White text** on color blocks |
| Dark theme | **Has** separate values (#f08a80, #6fcf8a, #e7a74a) | **None**; stored user data |

Merging breaks the dark theme: dark `--late` is #f08a80, giving white text only **2.43:1**. Status colors have no dark variants and cannot change with the theme. See "Why T4 was an incorrectly written task, not an agent failure" in `docs/night-tasks/README.md` for the full rationale.

Likewise, **`--info` blue is not a status color**. The `.now` dots in flowcharts and progress chains use the chart state calculated by `nodeStop()` (done / now / todo / risk), derived from scheduling and risk. The 6 user statuses map onto it many-to-one, so it has no corresponding status color and must not change with Settings → Board. It intentionally has no dark override (both themes use #3a6fd8: 4.53 against `--bg`, 3.96 against the dark background, both above the 3:1 graphics requirement).

> One question remains: line 61 of `src/pages/Handoff.tsx` inlines 3 status colors (#237a42 / #3a6fd8 / #5f6763). Whether these should follow user status colors is a product decision awaiting Juanxi.

---

## 6. Why these values

These levels were **derived from the existing interface, rather than designed from scratch**. Previously there were 20 font sizes, 12 radii, 12 layer levels, and various odd spacing values. They are now consolidated into a few levels, with almost every shift within ±1px (two radius categories increased by +2px: 6px→8px and 10px→12px; one font size changed 10px→12px). The goal is to make the interface **possible to describe and evaluate**, not to change its appearance. The contrast pass (N5) was the only deliberate visual change, bringing graphics and green text to WCAG AA.

## 7. For future interface changes

1. **New styles must use tokens.** This applies to colors, font sizes, radii, layers, and spacing.
2. **If a new value is truly needed, first add a token in `:root` (deciding whether to override it in both dark-theme blocks), then use it; do not hardcode it.**
3. Calculate contrast before adding color tokens: text ≥ 4.5:1, graphics ≥ 3:1. Calculate light and dark separately; check all three light backgrounds (`--bg`, `--surface`, `--lane`) and use the minimum.
4. Do not darken `--line`, merge the two color systems in 5.3, or give `--info` a user-status meaning.
5. **Dark mode:** currently follows the system (`prefers-color-scheme: dark`). CSS already supports forced overrides with `data-theme="light"` / `data-theme="dark"`, but **there is no UI toggle yet**. When adding tokens, update both dark blocks together (the `@media` block and `:root[data-theme="dark"]`).
6. After changes, run `npm run check` as directed by AGENTS.md.

## 8. Automated guardrails (S6, since 2026-10-29)

These rules are now checked automatically by both `npm run check` and GitHub CI; violations fail:

| Check | Command | What it blocks |
| --- | --- | --- |
| Stylelint | `npm run lint:css` (covers `src/styles.css` and `src/styles/*.css`) | `font-size` must be `var(--fs-*)` (or `inherit`); `border-radius` must be `0`, `inherit`, `var(--radius)`, or `var(--r-*)`; `z-index` must be `var(--z-*)`; **no hex colors** outside the three `:root` theme blocks; **no duplicate selectors**; only 3 `font:` shorthand forms allowed (see below) |
| ESLint | `npm run lint:js` (ts/tsx under `src/`) | Inline `style={{...}}` may contain only CSS variables (`--xxx`) and data-derived `left/top/width/height`; everything else must use a class in `styles.css` |
| Word count | `npm run words` | Only **reports** actual words per page (including hover cards and collapsed content); does not fail for exceeding a limit or require deleting words. Enable `--enforce` after Juanxi decides the limits. |
| Accessibility | `e2e/a11y.spec.ts` (desktop + mobile) | WCAG 2.0/2.1/2.2 A/AA, including 24×24 touch targets; right-rail focus management |

**Intentional exceptions (with individual reasons):**

1. `border-radius: 0`: a square corner is not a radius level; a token serves no purpose.
2. (Removed in DX-27) The `clamp` exception for `h1`: this form no longer exists in the code, and the allowance in `.stylelintrc.json` was also removed. Reintroducing it will fail.
3. `font-size: inherit`, `border-radius: inherit`: inherit the parent without introducing a new value.
4. `font:` shorthands allow only `inherit`, `15px/1.55 var(--sans)` (`body`), and `600 13.5px/1.3 var(--sans)` (`.board-col > header h2`): the sizes in these two shorthands are intentionally retained; splitting them changes line height, so consolidation is deferred.
5. Hex inside `:root`: token definitions necessarily contain color values.
6. Spacing tokens are **not enforced** in this pass (old rules still contain 10px, 14px, etc.), so there is no spacing rule.
7. CSS and inline styles in `src/organization/`, `src/phase1/`, and `src/workspace/` are **not checked**: these are a separate, older codebase (about 4,500 CSS lines), to be included during later consolidation.

**When adding styles:** first inspect the `npm run lint` failures and use tokens or classes. **Do not** bypass them with `stylelint-disable` / `eslint-disable`. If an exception is necessary, add it here with a reason.

## 9. Motion tokens `--dur-*` `--ease-*` `--spring-*` (v1.6 interface and motion upgrade, from DX-01)

Defined in `src/styles/dx-00-tokens.css` (the only file allowed to contain explicit durations). **Motion must reference tokens; do not write numbers such as `150ms`.**

| Token | Value | Usage |
| --- | --- | --- |
| `--dur-press` | 100ms | Press feedback, perceived as immediate |
| `--dur-fast` | 150ms | Hover color changes, small fades, menu appearance |
| `--dur-base` | 220ms | Panels and drawers sliding in |
| `--dur-slow` | 320ms | Larger elements settling into place |
| `--ease-out` | `cubic-bezier(.2, .8, .2, 1)` | Appearance: fast start, soft finish |
| `--ease-in-out` | `cubic-bezier(.4, 0, .2, 1)` | Movement between locations |
| `--spring-ui` + `--spring-ui-dur` | `linear(...)`, 450ms | Dragged cards settling (`src/lib/dragSort.ts`), flowchart node reordering (DX-22) |
| `--spring-pop` + `--spring-pop-dur` | `linear(...)`, 480ms | Dot "pop" when a step becomes Done (DX-25) |

- Both spring curves are generated by `scripts/spring-linear.mjs` (do not edit their values manually).
- **Reduced motion:** when the system's reduced-motion setting is enabled (`prefers-reduced-motion: reduce`), all durations above become `1ms` and springs become `linear`, so motion using only tokens automatically becomes almost instantaneous. Scripts needing durations must use `tokenMs()` (reads tokens) and `prefersReducedMotion()` from `src/lib/motion.ts`, rather than writing numbers themselves.
- Animate only `transform` and `opacity` (since DX-08, style checks block `transition: all`, hardcoded durations, and transitions on `left/top/right/bottom/width/height/margin/padding`).

## 10. Shadow levels `--elev-1/2/3` (DX-23)

Defined in `src/styles/dx-23-glass-topbar.css`, with light/dark variants (dark is stronger; keep both dark blocks synchronized):

| Token | Light | Usage |
| --- | --- | --- |
| `--elev-1` | `0 1px 2px / .06` + `0 2px 6px / .05` | Lightest level. **Currently unused**; retained for now (verify with `grep -rn "var(--elev-1" src`) |
| `--elev-2` | `0 4px 12px / .10` + `0 12px 28px / .08` | Menus (`.menu`, `.m-menu`), owner suggestions, `.panel`, lifted cards (Tasks, Partners) |
| `--elev-3` | `0 12px 40px / .18` | `.toast`; the right rail when floating over the page below 1199px width |

Choose among these three levels for new shadows. If they are insufficient, add a level here first; do not write `box-shadow: 0 8px ...` in components.

## 11. Structure and ownership of small style files (since DX-01)

- `src/styles.css` remains canonical. Each v1.6 work package writes its styles in **its own small file**, `src/styles/dx-NN-<name>.css`, imported in order after `styles.css` by `src/styles/index.css` (`src/main.tsx` imports `index.css`).
- **Each file belongs to one package**; other packages may not edit it. To disable a package's styles (R1 quick disable), comment out its `@import` line in `index.css`.
- Small files must pass `npm run lint:css` like `styles.css` (`font-size`/radius/layer/hex rules). Files after `dx-01` also prohibit `transition: all`, hardcoded durations, transitions on layout properties, and **`!important`**. Desktop `.hover-card` must have no delay (`src/test/dxStyleGuard.test.ts` contains intentionally invalid samples proving these guards fail as expected).
- `dx-00-tokens.css` is the exception: it defines tokens, so explicit durations are allowed.
- Package changes and rollback instructions: `docs/design-upgrade/README.md` and `docs/design-upgrade/ROLLBACK_LOG.md`.
- Merging these small files back into `styles.css` is step 3 of DX-27, **requires Juanxi's explicit agreement**, and **has not been done**. R1 quick disable will no longer work after consolidation.
