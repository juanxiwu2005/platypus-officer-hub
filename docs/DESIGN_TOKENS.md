# Platypus design tokens

**Read this document before changing any interface. New styles must use tokens; do not hardcode values in CSS.** All tokens are defined in `:root` (light) and the two dark-theme blocks in `src/styles.css`, except the 6 status colors in `src/components/ui/statusDefaults.ts`.

All values here were read directly from these two files on 2026-10-29. Contrast ratios were calculated by a script using the WCAG formula (N5's before/after figures come from its handoff record in `docs/PROGRESS.md`). Text requires 4.5:1; graphics (dots, lines, and color bars) require 3:1.

---

## 1. Font sizes `--fs-*`

| Token | Value | When to use |
| --- | --- | --- |
| `--fs-xs` | 12px | Smallest supporting text: labels, badges, footnotes |
| `--fs-sm` | 13px | Tables, secondary information, small buttons |
| `--fs-md` | 14px | Regular body text, inputs on desktop (AGENTS.md §7.4: at least 14px is the goal; 12–13 is only for supporting text) |
| `--fs-base` | 15px | Base page font size |
| `--fs-lg` | 18px | Small headings |
| `--fs-xl` | 21px | Section headings |
| `--fs-2xl` | 26px | Large numbers, emphasis |
| `--fs-input` | 16px | Text fields, selects and text areas **on touch screens only** (`@media (pointer: coarse)` in `src/styles.css`). iPhone Safari zooms the page when it focuses a field under 16px; desktop keeps the component sizes (14–15px). Batch 1, audit V4 |

The touch-screen field rule lifts its specificity with `:not(#fs-input-guard, …)` (one id) so it beats every class-based component rule without `!important`; fields already larger than 16px (the workflow name field, `--fs-xl`) are excluded. `src/test/controlContrast.test.ts` fails if a component rule would win.

Page titles `h1` use a fixed `var(--fs-2xl)` (26px); on mobile, `.page-head h1` uses `var(--fs-xl)`. **They no longer scale continuously with viewport width** (the previously documented `clamp(26px, 3.2vw, 34px)` has long differed from the code; DX-27 corrected the documentation to match. A clamp version requires a separate decision from Juanxi). Sizes in `font:` shorthands (`15px/1.55` on `body`, `600 13.5px/1.3` on `.board-col > header h2`) have not been tokenized and are known exceptions.

## 2. Corner radii `--r-*`

| Token | Value | Elements |
| --- | --- | --- |
| `--r-xs` | 4px | Very small blocks: Gantt bars, sharp corners of chat bubbles, small tags |
| `--r-sm` | 8px | Small and medium controls (buttons, fields, selects) through `--control-r`, small tags, color swatches, menu items, focus outlines |
| `--r-md` | 12px | Large controls through `--control-r`, navigation items, cards (task, Board, hover, flowchart), notification bars |
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
| `--line` | #e5e2da | #2a312f | 1px border of cards and dividers (intentionally subtle; **do not darken**; never a form-control border) |
| `--control-line` | #848b87 | #6b7571 | Border of inputs, selects, text areas and other form controls, the hover border of borderless table cells, and the off track of `.switch` (Batch 1, audit V5/V6). Must stay ≥ 3:1 on every background (WCAG 1.4.11) |
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

Form controls (Batch 1; graphics, required 3:1; minimum across `--bg`, `--surface`, `--surface-2`, `--lane`):

| Item | Light | Dark |
| --- | --- | --- |
| `--line` as a control border (before) | 1.29 on surface | 1.30 on surface |
| `--control-line` | **3.09** (bg 3.34, surface 3.49, surface-2 3.09, lane 3.17) | **3.35** (bg 3.93, surface 3.62, surface-2 3.35, lane 3.73) |
| `.switch` thumb (`--surface`) on its off track (`--control-line`) | 3.49 | 3.62 |
| Focus halo `--accent-soft` alone (before) | 1.16 on surface | 1.22 on surface |
| Focus ring `--accent` (`--focus-ring`, and the inner ring of borderless cells) | **4.85** on surface-2, 4.72 on its halo | **6.56** on surface-2, 5.80 on its halo |

`--focus-ring` (`0 0 0 1px var(--accent), 0 0 0 4px var(--accent-soft)`) is the box-shadow of a focused text field: together with the field's `--accent` border it draws a solid 2px accent ring inside the soft halo. Borderless fields inside a clipping box (Settings › Roles & teams cells, the reminder email draft) use an inner `inset 0 0 0 2px var(--accent)` ring instead, because an outer ring would be clipped. `src/test/controlContrast.test.ts` recomputes these ratios from `src/styles.css` and fails if a form-control rule draws its border with `--line`.

Graphic contrast (after N5; minimum across the `--bg`, `--surface`, and `--lane` backgrounds; required ratio 3:1):

| Item | Light before → after | Dark (unchanged) |
| --- | --- | --- |
| `--good` on `--good-soft` (text) | #1a7f37 → #197d36, 4.44 → **4.56** | #6fcf8a, 7.45 |
| Risk yellow `--risk-yellow` | #e3a008 → #ba8306, 2.05 → **3.01** | #e3a008, 8.29 (on bg) |
| Main flowchart line `--mline-main` | #b9c0bc → #888e8b, 1.69 → **3.04** | #b9c0bc, 10.1 (on bg) |
| `--edge` | #9aa39e → #878f8b, 2.36 → **3.02** | #5f6965, 3.29 (on bg) / 3.03 (on surface) |

Yellow and the main line intentionally retain their original dark-theme values: they are already clear against dark backgrounds, and darkening would reduce clarity.

### 5.2 The 6 status colors (in `statusDefaults.ts`, not styles.css)

These six names and colors are **fixed (S3, 2026-11-23)**; they can no longer be renamed or recolored. Renamed statuses in an old save stay in its data but are not shown. Each status color carries white text, with no dark variant (it does not change with the theme).

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
4. Do not darken `--line` (use `--control-line` for form-control borders), merge the two color systems in 5.3, or give `--info` a user-status meaning.
5. **Dark mode:** follows the system (`prefers-color-scheme: dark`) unless the viewer picks Always light or Always dark in Settings (section 14). When adding tokens, update both dark blocks together (the `@media` block and `:root[data-theme="dark"]`).
6. After changes, run `npm run check` as directed by AGENTS.md.

## 8. Automated guardrails (S6, since 2026-10-29)

These rules are now checked automatically by both `npm run check` and GitHub CI; violations fail:

| Check | Command | What it blocks |
| --- | --- | --- |
| Stylelint | `npm run lint:css` (covers `src/styles.css` and `src/styles/*.css`) | `font-size` must be `var(--fs-*)` (or `inherit`); `border-radius` must be `0`, `inherit`, `var(--radius)`, or `var(--r-*)`; `z-index` must be `var(--z-*)`; **no hex colors** outside the three `:root` theme blocks; **no duplicate selectors**; only 3 `font:` shorthand forms allowed (see below) |
| ESLint | `npm run lint:js` (ts/tsx under `src/`) | Inline `style={{...}}` may contain only CSS variables (`--xxx`) and data-derived `left/top/width/height`; everything else must use a class in `styles.css` |
| Word count | `npm run words` | Only **reports** actual words per page (including hover cards and collapsed content); does not fail for exceeding a limit or require deleting words. Enable `--enforce` after Juanxi decides the limits. |
| Control sizing | `src/test/controlSizing.test.ts` (unit tests) | A rule that gives a button, text field or select its own padding, height, min-height, radius or line-height, or uses the `background` shorthand on a select, outside the reasoned allowlist in the test (section 12) |
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
- **Exception (CT-01, 2026-11-27):** the control-sizing pass in section 12 removed one-off control sizes from many package files in place (`fb-04`, `fb-05`, `ob-05`, `ob-06`, `ob-07`, `ch-01`) so that every control follows one rule. Each removed line is listed in `docs/PROGRESS.md`; rolling back one package's file does not restore its old sizes.
- Merging these small files back into `styles.css` is step 3 of DX-27, **requires Juanxi's explicit agreement**, and **has not been done**. R1 quick disable will no longer work after consolidation.

## 12. Controls: size tiers, rows, radius, selects, spacing (CT-01, since 2026-11-27)

Buttons, text fields and selects come in three sizes. A page never sizes one control by hand: it puts its controls in a container and, if it needs a size other than the default, sets the tier on that container. The base rules in `src/styles.css` (the "Controls" block) own every control's height, inline padding, border, radius and colors.

### 12.1 Tokens

| Token | Desktop | Touch (`pointer: coarse`) | Use |
| --- | --- | --- | --- |
| `--control-h-sm` | 28px | 32px | Small tier: tables, small cards, dense toolbars, the demo strip |
| `--control-h-md` | 36px | 44px | Medium tier, the default: pages, forms, panels, Task Details |
| `--control-h-lg` | 44px | 44px | Large tier: onboarding, the member walkthrough, the emailed one-task page |
| `--control-h` | md | md | The current tier's height; every button, field and select reads it |
| `--control-px` | `--s5` (md) | | Inline padding of a button (sm `--s4`, lg `--s6`) |
| `--field-px` | `--s4` (md) | | Inline padding of a text field or select (sm `--s3`, lg `--s5`) |
| `--control-r` | `--r-sm` | | One radius for every control of a tier (sm and md `--r-sm`, lg `--r-md`) |
| `--control-gap` | `--s4` (8px) | | Gap between controls in one row |
| `--select-arrow-w` | 28px | | Room on the right of a select for its drawn arrow |

Set a tier with a class (`.ctl-sm`, `.ctl-md`, `.ctl-lg`) or, in a package file, by setting the same four custom properties on the container: `--control-h: var(--control-h-lg); --control-px: var(--s6); --field-px: var(--s5); --control-r: var(--r-md);`. `.tbl`, `.mini-card`, `.crm-card` and `.task-card` are small-tier containers already.

### 12.2 Rules

1. **One tier per row and per pane.** Controls that sit next to each other have the same height. A select beside a button is the same height as the button; a field beside a field matches it. Mixing tiers in one row is the inconsistency this section exists to remove.
2. **The container sets the tier; the control does not.** A page rule may set layout (`width`, `flex`, `max-width`, grid placement) on a control. It may not set `padding`, `height`, `min-height`, `border-radius` or `line-height` on a button, field or select (the guard test fails). Use the tier instead.
3. **Fields and buttons share one height and one radius per tier.** Height comes from `--control-h`, radius from `--control-r`.
4. **Radius by size, and nested radius.** Small and medium controls use `--r-sm` (8px); large controls use `--r-md` (12px). A control is always less round than the card it sits in (cards use 12-14px), so a control's corner reads as inside the card's corner.
5. **Selects are drawn, not native.** Safari and Chrome on macOS ignore `height` and `padding` on a native `<select>`, so it rendered about 22px tall next to 36px buttons. Every select uses `appearance: none` and a chevron drawn with two `--muted` gradients. Set `background-color`, never the `background` shorthand, on a select: the shorthand erases the arrow. The menu that opens is still the system's own, so keyboard, screen-reader and touch behavior are unchanged.
6. **Touch.** On a touch screen the medium tier is 44px (Apple's 44pt minimum target) and the small tier 32px, matching the DX-04 touch rules. A desktop page that stays medium therefore needs no separate touch rule.
7. **Spacing.** Between controls in one row: `--control-gap` (8px). Label to its field: `--s3` or `--s4` (6-8px). Between stacked fields: `--s5`-`--s6` (12-16px). A row of controls is `.ctl-row` (flex, centred, wraps on a narrow screen).
8. **Optical alignment.** Align a row's items on their centres, not their text baselines, so a button, a select and an avatar line up. A quiet button (`btn-quiet`) at the start or end of a row may use a small negative margin so its text, not its invisible box, lines up with the text above. An icon-only button (`.icon-btn`) is a square as wide as the tier's height, with the icon centred.
9. **Badges, chips and avatars sit one step below the controls around them.** A chip is a pill at the small-tier height; an avatar is 20-26px. Both centre their content with flex or grid and `line-height: 1`, never with a tall line-height. The "no owner" avatar shows a centred person outline in its dashed ring, not a "?" character (a character's line box puts it off centre).
10. **Primary actions.** At most one primary button per group, as Primer advises; the large tier is for focus flows, used sparingly.

### 12.3 Allowed exceptions

These keep their own size, each for the reason given in `src/test/controlSizing.test.ts`: checkboxes, radios and the toggle switch; the Ask composer text areas (`.command`, `.ask-form`); the inner field of a composite field whose wrapper takes the field size (`.owner-picker`, `.ch-field`); editors inside a table or matrix cell (`.ck-table`); the invisible menu over a status chip (`.ck-select`); the workflow title edited at heading size (`.wfl-name`); the DX-04 touch floors. A text area may set its own `min-height` (its height is about how much text it holds). Add a new exception to the test's allowlist with a reason, and list it here.

### 12.4 Sources

- Apple, UI Design Dos and Don'ts (developer.apple.com/design/tips): "Create controls that measure at least 44 points x 44 points".
- Apple, SwiftUI `controlSize(_:)`: sets the control size for "controls in this view", which is the model for setting a tier on a container.
- Mario Guzman, a third-party summary of Apple's macOS layout guidelines (marioaguzman.github.io/design/layoutguidelines): "Avoid mixing different sizes of controls in the same window or pane"; similar controls have consistent widths; at least 6pt between stacked regular controls.
- Radix Themes, Text Field: "Use matching component sizes when composing Text Field with buttons"; ghost buttons use a negative margin "to optically align themselves against their siblings".
- Primer, Button: three sizes (small, medium as the default, large used sparingly) and at most one primary button per group.

The pixel heights above are Platypus's own choice; none of these pages gives pixel heights for its tiers or rules for focus rings. Material's pages could not be read (they load only with JavaScript) and are not cited.

### 12.5 Toggle chips (since 2026-11-28)

A short set of yes/no choices that most people scan at a glance (the New event form's "This event has…") may show as toggle chips instead of a checkbox list. Each chip is a `<label class="check-chip">` around a native checkbox, so the checkbox keeps its accessible name (the label text), keyboard behavior and the global focus ring; the group is a `<fieldset>` with a visible `<legend>`. The chip is a pill at the small-tier height (`--control-h-sm`, `--r-pill`, `--control-line` border, `--surface` background); a ticked chip takes `--accent-soft` with an `--accent` border and `--accent-ink` text, which work in both themes. The checkbox stays visible inside the chip (16px), so the state never depends on color alone. Keep chips to about six; longer lists stay checkbox rows, folded in a `<details>` whose summary gives the count and how many are ticked, and which opens when any of its items is ticked. Rules: `src/styles/fb-05-create.css`.

## 13. Icons (since 2026-11-28)

- **Source.** Every interface icon is a line icon in `src/components/icons.tsx`: a 24px grid, `fill: none`, `stroke: currentColor`, `strokeWidth` 1.8, round caps and joins, `aria-hidden="true"`. Add a new icon there in the same style, as one short path (`p("...")`) where possible, because the file ships in the entry bundle (budget: `e2e/bundle-performance.spec.ts`). Do not use emoji or a second icon set; reuse an existing icon before drawing a new one.
- **Size.** Inside a control or a row, the glyph follows the tier: 16px in the small tier and in chips (14px in a pill such as "Sent"), 18px in the medium tier, navigation and list rows, 20px in the large tier. A section icon beside a card heading is a 32px tile (the avatar size) with the glyph centred by `--s3` padding and `--r-sm` corners.
- **Colour.** The glyph is `currentColor`, so it takes the text colour around it, or a muted token (`--muted`) for a row icon. A tile pairs a soft background with its ink: `--accent-soft` / `--accent-ink` for ordinary sections, `--warn-soft` / `--warn` for a section that asks for attention (the reminder page's Fix first). Never a status colour for something that is not that status (section 5.3), and never a hex value.
- **Always with a label.** An icon is never the only signal: it sits beside visible text that says the same thing (a heading, a chip, a button label). An icon-only button (`.icon-btn`) has an accessible name instead.
- **Decorative.** Icons are `aria-hidden`; they never change an accessible name or a visible label. A heading's name stays its text (or its `aria-label`).
- **Where they are used on the reminder page.** Summary card: `mail`; Emails by person: `team`; Fix first: `alert` (warn tile); Fix first rows: `wait` (Waiting on whom?), `stuck` (Stuck), `person` (Not claimed), `mail` (No valid email), `alert` (anything else), chosen by `problemIcon` in `src/reminders/ReasonChip.tsx`; the "Sent" pill: `check`.

## 14. Appearance: light, dark and follow system (since 2026-11-28)

- **The setting.** Settings › My preferences › Appearance has three radios: **Follow system** (the default), **Always light** and **Always dark**. A choice applies at once, without a reload. Code: `src/lib/appearance.ts` and `src/components/settings/AppearanceSetting.tsx`, both loaded only with the Settings page, so the entry bundle does not grow.
- **Storage.** A per-browser viewer preference, not club data: localStorage key `platypus.v1.appearance` holds `light` or `dark`; Follow system removes the key. It is outside the demo state (`platypus.v1.demo`), so Export my data does not include it and the Demo menu's reset keeps it. The error page's Reset demo data clears every `platypus.*` key, so it returns to Follow system. Every read and write is wrapped in try/catch; with storage blocked the choice lasts until reload and Settings says so.
- **Before first paint.** A small classic inline script in the `<head>` of `index.html` (after the theme-color metas, before the app's module script) reads the key and, for `light` or `dark`, sets `data-theme` on `<html>`, sets the `color-scheme` meta to that scheme, and points the browser's chrome at the matching `theme-color` meta (each carries `data-scheme`; the chosen one gets `media="all"`, the other `media="not all"`). Nothing stored changes nothing. `applyAppearance()` does the same for later changes, and Follow system puts every meta back to its media query, so live OS changes take over again. `netlify.toml` sets no Content-Security-Policy, so the inline script runs; adding a CSP later needs a hash or nonce for it.
- **Rule for CSS.** Every dark rule exists twice: once as `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) ... }` and once as a top-level `:root[data-theme="dark"] ...` with the same declarations. Then Always light wins on a dark OS and Always dark wins on a light OS. A light-scheme media rule, if ever added, mirrors this (`:root:not([data-theme="dark"])` and `:root[data-theme="light"]`). Scripts do not read `prefers-color-scheme` themselves; style through tokens instead.
- **Guards.** `src/test/appearance.test.ts` checks the stored value (including broken storage), runs the inline script from `index.html` for all three values and compares it with `applyAppearance()`, fails if any `prefers-color-scheme` block in `src/**/*.css` is unguarded or lacks its forced twin, and fails if a script outside `src/lib/appearance.ts` reads the OS scheme. `src/test/dx-07-meta.test.ts` and `src/test/controlContrast.test.ts` keep checking the theme-color values and both dark blocks.

## 15. Stable page frame: sub-navigation and tabs (since 2026-11-28)

Juanxi (2026-11-28): in Settings the title and the section list jumped about 200px sideways when he switched from Workflow to Roles & teams, which felt dizzying, and he asked for the same fix everywhere. The cause was the page column: `main` was a centred 1180px column, and two rules widened it to 1600px and moved it against the navigation only while a wide view was on screen (`main:has(.wfl-root)` for the workflow chart, `main:has(> .events-layout)` for Events). So the frame depended on the open tab. Plan had the same fault between Events and Tasks, and its title also sat to the right of the event list on Events but at the left edge on Tasks.

**Rule: a page's frame (its title, its second-level navigation and the start of its content) never depends on which tab is open or how wide that tab's content is.** For one window width and one side-panel state, these are at the same place on every tab, and on every page of the app shell. Wide content (the workflow chart, flow charts, wide tables) scrolls or fits inside its own area and never moves the frame. Roles & teams, Workflow and Onboarding still hide the Ask panel when they open, as before; the column then widens to the right, but its left edge, the title, the sections and the content start stay put.

1. **One page column.** Every page in the shell uses `.shell:not(.single) > main`: full width of its grid column up to the cap (`width: 100%`; without it `justify-self: start` would let a wide tab such as the Roles & teams chart widen the column), next to the navigation (`justify-self: start`, as Juanxi asked on 2026-11-01 for Events: no empty strip beside the navigation) and at most `--page-max` (1600px) wide. Full width was chosen over one narrower centred width because the workflow and flow charts need the room, and a narrow tab then leaves no empty band between the navigation and the page. Below about 1430px with the side panel closed (1840px with it open) the column is narrower than 1180px anyway, so nothing changed there. The plain `main` rule (1180px, centred) is only for the few pages outside the shell: the error page and the single task opened from an email.
2. **Never size or place a frame by its content.** Do not write `main:has(...)`, `.settings:has(...)`, `.events-layout:has(...)` or similar to change a frame's width, max-width, margins, anchor or columns. A page that needs room gives its wide part its own scroll area (`overflow-x: auto`, `min-width: 0` on its grid or flex parents).
3. **Head, then sub-navigation, then content.** The page head comes first and spans the page; the second-level navigation (Settings' sections, Plan's event list) has a fixed width beside the content (Settings 170px; the event list 220px, or 176px with the side panel docked below 1500px). A sub-navigation's width may follow the window and the side panel, never the open tab. With a single event there is no event list, and the content takes the whole row on every view.
4. **Tabs in a row keep their width.** In a horizontal row of tabs or segments (`.seg`, Plan's `.plan-switch`, Playbook's category chips, Settings' sections on a phone) the chosen one changes background, colour and shadow, never its font weight: bold text is wider and would push the tabs after it sideways at every switch (same rule as Playbook's chips, Juanxi 2026-11-26). A vertical list (Settings' sections on a computer, the event list) may bold the current item, because nothing sits beside it.
5. **A title next to a switch keeps the longest title's width.** Plan's heading reserves the width of "Events" (an invisible, unread copy under it), so the Events | Tasks switch stays put on both halves. Keep that word in step with the longest label in `PLAN_PAGES`.
6. **Scroll bar.** On windows 1024px and wider, `html { scrollbar-gutter: stable; }` keeps room for a classic scroll bar, so a tab that is longer than the window does not make the page narrower than a short tab. Narrower windows (phones, tablets) keep their full width, so their pages never lose 15px to an empty gutter.

Checks: `e2e/stable-page-frame.spec.ts` (Settings at 1440px and 1780px with the side panel open and closed, every tab twice; Plan's event list, Flow and Budget, and Events against Tasks; the same column on every page; Rules' category row; Roles & teams' Chart and Contact list; Settings on a phone) and `src/test/stablePageFrame.test.ts` (no rule sizes the page column but the two above, no `:has()` rule sizes the Settings or Events frame, no chosen tab in a row turns bold, and the Plan heading reserves the longest label).

Checked and already stable: Reminders (one page, its Fix first column only adds a column on the right), Team, Rules (beyond rule 4), Playbook and Handoff (one column each), Settings → Roles & teams (the chart card keeps its left edge in Chart and Contact list; since its card is wider in Contact list, where no inspector sits beside it, the view switch and the add buttons follow the title instead of the card's right edge), Settings → Workflow's Flow | Quick entry and Onboarding (inside the content column). The onboarding walkthrough has no tabs: its progress header is a fixed 960px centred row; the Team screen's card is 720px wide where the others are 640px.
