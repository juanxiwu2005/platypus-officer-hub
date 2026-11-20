# Platypus Design token

Read this document before **changes any interface. The new style can only use token, and no dead values are allowed in CSS.** All tokens are defined in the `:root` (light colour) and two dark themes of `src/styles.css`; 6 status color exception, at `src/components/ui/statusDefaults.ts`.

All values are actually read from 2026-10-29 in both files; The contrast figure is calculated using the WCAG formula script (the "reverse" of N5 from the `docs/PROGRESS.md` log of N5. Text line 4.5:1, graphic (circles, lines, colour bars) line 3:1.

---

## 1. `--fs-*`

| token | Value | When? |
| --- | --- | --- |
| `--fs-xs` | 12px | Minimal helpwords: label, logo, corner note |
| `--fs-sm` | 13px | Tables, secondary information, small buttons |
| `--fs-md` | 14px | General Body, Input Box (AGENTS.md § 7.4: not less than 14px is the target and 12–13 only gives auxiliary text) |
| `--fs-base` | 15px | Page Basic Characters |
| `--fs-lg` | 18px | Subheading |
| `--fs-xl` | 21px | Block Title |
| `--fs-2xl` | 26px | Big number, emphasis |

Page header `h1` with fixed `var(--fs-2xl)` (26px) and `.page-head h1` on mobile phone with `var(--fs-xl)`; **no longer changes continuously with the width of the screen** (`clamp(26px, 3.2vw, 34px)`, as previously written in the document, is no longer in the code. DX-27 corrects the document by code; If you want a version of the clamp, you need Juanxi to decide separately. `font:`A short word. `body`It's... `15px/1.55`、`.board-col > header h2`It's... `600 13.5px/1.3`Not replaced by token is the known exception.

## 2. Corner `--r-*`

| token | Value | On what element? |
| --- | --- | --- |
| `--r-xs` | 4px | Small pieces: Gantt strips, tip of conversation bubbles, little labels |
| `--r-sm` | 8px | Input boxes, tabs, colour sections, menu items, focus boxes |
| `--r-md` | 12px | Buttons, navigation items, cards (taskcards, board cards, suspension cards, flowcharting cards), hints |
| `--r-lg` | 14px | The largest panel; Equivalent to old variable `--radius`(Reservation, don't delete) |
| `--r-pill` | 999px | The shape of the pill. |
| `--r-circle` | 50% | Positive circle (nodes, heads) |

`0` No token, direct to `0`.

## 3. Level `--z-*`.

From low to high:

| token | Value | Annotations |
| --- | --- | --- |
| `--z-base` | 0 | Base |
| `--z-raised` | 1 | Lift up a little bit. |
| `--z-sticky` | 2 | Tops. |
| `--z-sticky-hi` | 3 | Higher tops. |
| `--z-local` | 4 | Partial overlay (e.g. Gant) |
| `--z-dropdown` | 5 | Drop-down recommendation box (in form) `.owner-suggest`, M2b's choice of head) **New Reason:** It was written dead `z-index: 5`, there is no semantic closest in token ( `--z-local` 4 is the top of the watch, `--z-topbar` 20It's too high. 4It's going to be on the same level as it is. 20It'll cover things that shouldn't be covered up, so just stick to the original. 5I'll put it in a separate compartment. It doesn't look the same.  |
| `--z-topbar` | 20 | Top Bar |
| `--z-overlay` | 40 | Layer |
| `--z-fab` | 45 | Suspended Button (Ask) |
| `--z-toast` | 50 | Toast tip. |
| `--z-rail` | 55 | Right Bar |
| `--z-menu` | 60 | Menu |
| `--z-tip` | 70 | Suspended card (highest) |

## 4Spacing `--s*`

| token | Value | token | Value |
| --- | --- | --- | --- |
| `--s1` | 2px | `--s5` | 12px |
| `--s2` | 4px | `--s6` | 16px |
| `--s3` | 6px | `--s7` | 24px |
| `--s4` | 8px | | |

**is not the ideal 4px grid.** This 7 file is summarized from the values that are already most commonly used in interfaces, and it is more important to keep the existing look than to get the fence up. New style with these token; The old rules do not impose relocations (and the old 10px, 14px, 20px, 28px etc.).

## 5. Colour

### 5.1 brands and semantics (light ~ dark)

| token | Light | Dark | Annotations |
| --- | --- | --- | --- |
| `--bg` | #fbfaf7 | #0f1312 | Page Bottom Colour |
| `--surface` | #ffffff | #171c1b | Card Bottom |
| `--surface-2` | #f3f1ec | #1d2322 | Sub Background |
| `--lane` | #f6f4ef | #141918 | Swimming/orbiting bottom |
| `--ink` | #1b1f1d | #eceeed | Text |
| `--muted` | #5b625e | #a2aaa6 | Secondary Text |
| `--line` | #e5e2da | #2a312f | 1px border (deliberately light, **do not deepen**) |
| `--accent` | #0f766e | #3fb8a8 | Brand colour |
| `--accent-ink` | #0b5a54 | #7fd6ca | Brand Text |
| `--accent-soft` | #e4f1ef | #14302c | It's a low brand. |
| `--on-accent` | #ffffff | #06201d | Words on brand colour |
| `--warn` / `--warn-soft` | #8f5206 / #fbf0dc | #e7a74a / #33270f | Note (text/floor) |
| `--late` / `--late-soft` | #b42318 / #fbe7e5 | #f08a80 / #3a1c19 | Late/cracked (text/floor) |
| `--good` / `--good-soft` | #197d36 / #e3f4e7 | #6fcf8a / #15301d | Completed (text/floor) |
| `--edge` | #878f8b | #5f6965 | Blank, dotted head, side of Gant vertical. |
| `--risk-yellow` | #ba8306 | #e3a008 | Risked yellow spot, Team medium slot |
| `--mline-main` | #888e8b | #b9c0bc | Unfinished segment of flowchart mainline |
| `--warn-line` | #e8cf9c | Same light. | Amber Demo border (S6 added, original dead) |
| `--on-solid` | #ffffff | Same light. | Words pressed on solid color block: state colour, corner, board column (S6 added, original #fff) |
| `--on-dark-warn` | #ffb4ab | Same light. | It's always a dark S6 warning. |
| `--info` / `--info-glow` | #3a6fd8 / rgba(58,111,216,.18) | Same light. | Blue of the time axis, see 5.3 |

Contrast (text pair, light / dark):

| Match | Light | Dark |
| --- | --- | --- |
| `--ink` Match `--bg` | 15.96 | 16.06 |
| `--muted` Match `--bg` | 6.00 | 7.87 |
| `--accent` Match `--bg` | 5.24 | 7.69 |
| `--warn` Match `--warn-soft` | 5.51 | 6.97 |
| `--late` Match `--late-soft` | 5.53 | 6.36 |
| `--good` Match `--good-soft` | 4.56 | 7.45 |
| `--on-accent` Match `--accent` | 5.47 (white) | 7.01 |

The graphic contrast (N5) has been modified to take the lowest of `--bg`, `--surface` and `--lane`; Reaching line 3:1:

| Item | ♪ Before the light color changes ♪ | Dark (no change) |
| --- | --- | --- |
| `--good` Match `--good-soft`(Text) | #1a7f37 → #197d36，4.44 → **4.56** | #6fcf8a，7.45 |
| Risk Yellow `--risk-yellow` | #e3a008 → #ba8306，2.05 → **3.01** | #e3a008, 8.29 (with bg) |
| Flowchart Main Line `--mline-main` | #b9c0bc → #888e8b，1.69 → **3.04** | #b9c0bc, 10.1 (with bg) |
| `--edge` | #9aa39e → #878f8b，2.36 → **3.02** | #5f6965, 3.29 (with bg)/ 3.03 (with surface) |

Yellow and main lines were deliberately retained in the dark theme: they were already clear on the dark bottom, but deepening was worse.

### 5.2 6 status color (not styles. css, in `statusDefaults.ts`)

Here's the name and color that users can change from Settings to Board. **Default value**。 There is no dark version of each state coloured white word (which is user data and does not change subject).

| Status (interface text) | Default Color | The white word's on it. | ♪ It's the text that goes with it ♪ `--bg` | ♪ It's the text that goes with it ♪ `--surface` |
| --- | --- | --- | --- | --- |
| Not claimed | #5f6763 | 5.82 | 5.58 | 5.82 |
| To do | #3a6fd8 | 4.72 | 4.53 | 4.72 |
| Working on it | #b25c00 | 4.75 | 4.55 | 4.75 |
| Waiting | #8656cc | 4.98 | 4.77 | 4.98 |
| Stuck | #c0362f | 5.51 | 5.28 | 5.51 |
| Done | #237a42 | 5.34 | 5.11 | 5.34 |

The `PALETTE` (optional 10 colours) of `statusDefaults.ts` requires each to keep the white word 4.5:1 or more before adding a new color.

### 5.3 Important: `--late/--good/--warn` and status color are two systems, **not merge**

They appear to be repeated (both red, green, orange and slightly different colour values), but they are different:

| | `--late` / `--good` / `--warn` | 6 status color |
| --- | --- | --- |
| Where do you use it? | **text on light colour background**, and border, shallow bottom | **white word** on color plate |
| Dark Theme | **has** stand-alone values (#f08a80, #6fcf8a, #e7a74a) | **No**, data stored by the user |

Merge will cause the dark theme to collapse: Dark `--late` is #f08a80, with only **2.43:1** on it; There is no dark version of the state color, and it is not possible to change with the theme. For the full reason, see `docs/night-tasks/README.md` for "T4 why the task was wrong and not Agent failed."

Similarly, **`--info` blue is not the status color**. `.now` dots for flow charts and progress chains are derived from the chart status calculated by `nodeStop()` (done / now / todo / risk), which is rolled out by scheduling and risk; 6 user status is more than one-on-one on it, so there are no corresponding state colours, and don't let it change with Settings → Board. It intentionally has no dark colour cover value (underground shared #3a6fd8: with `--bg` 4.53, with deep color background 3.96, all of which are graphic 3:1).

> There is another outstanding: `src/pages/Handoff.tsx` line 61 connects 3 status colours (#237a42/#3a6fd8/#5f6763), should it follow the user's status color as a product issue and wait for Juanxi to decide.

---

## 6. Why these values?

These brackets are **, which is extracted from the existing interface, not to push back to**. The characters used to be 20, Corner 12, Tier 12 and odd spacing. They now yield a few rows, each of which is essentially within  ± 1px (the corner has two types of +2px: 6px → 8px, 10px → 12px); It has a 10px → 12px. The goal is that the interface **can be described and evaluated**, not the way it looks. The contrast round (N5) is the only one that intentionally changes its appearance to bring graphic and green text to WCAG AA.

## 7. Give it to someone who'll change the interface.

1. Only token can be used for **new styles.** colours, fonts, corneres, layers, spacing are all the same.
2. If **does require a new value, then use it in `:root` plus token (and decide whether to cover it in two dark segments); Don't write death.**
3. Colored token before contrast: text  ≥  4.5:1, graphics  ≥  3:1, light and dark colour separately, light-coloured bottom three (`--bg`, `--surface`, `--lane`), lowest.
4. Do not deepen `--line`, do not add color to the two colours in the merge 5.3, and do not add color to `--info`.
5. **Dark Color Mode:** now follows the system (`prefers-color-scheme: dark`). CSS already supports mandatory coverage with `data-theme="light"`/ `data-theme="dark"`, but no switch **has been switched on the** interface. Two dark colours (from `@media` and `:root[data-theme="dark"]`) need to be synchronized when new token is added.
6. Change the AGENTS. md running `npm run check`.

## 8. Autoguard (S6, 2026-10-29)

From now on, the rules are automatically checked by tools, and `npm run check` and GitHub CI run away.

| Inspection | Command | Stop what? |
| --- | --- | --- |
| Stylelint | `npm run lint:css`(THUNTING) `src/styles.css` and `src/styles/*.css`）| `font-size` It's just... `var(--fs-*)`(plus) `inherit`）；`border-radius` It's just... `0`、`inherit`、`var(--radius)`、`var(--r-*)`；`z-index` It's just... `var(--z-*)`；`:root` **is not allowed to write text colour**; **No repeat selection**; `font:` Briefly release only 3 (see below) |
| ESLint | `npm run lint:js`（`src/` (ts/tsx) | Inline `style={{...}}` Just put it on. CSS Variables（`--xxx`）It's based on data. `left/top/width/height`，The rest is written. `styles.css` Yeah. class |
| Words | `npm run words` | Only the **report** live words per page (including suspension cards, folding content) will not fail due to over-limits or require deletion; The upper limit is set by Juanxi. `--enforce` |
| Accessibility | `e2e/a11y.spec.ts`(desktop + cell phone) | WCAG 2.0/2.1/2.2 A/AA with touch target 24 x 24; Right Bar Focus Management |

**(a) Exceptions to the intentional release (article by article reason):**

1. `border-radius: 0`: A straight angle is not a "circle slot", and token has no meaning.
2. (Deleted, DX-27) `clamp` exception for `h1`: This is no longer used in the code and the rules of release in `.stylelintrc.json` are removed and it becomes red again.
3. `font-size: inherit`, `border-radius: inherit`: Inherit the fatherhood, no new values are introduced.
4. `font:` Shortcuts will be released only for `inherit`, `15px/1.55 var(--sans)` (`body`), `600 13.5px/1.3 var(--sans)` (`.board-col > header h2`): In both short words, the numbers are intentionally retained and the meetings will change their height and remain unified until later.
5. The definition of hex:token in `:root` is meant to write colour values.
6. This time **does not force** to use token (the old rules include 10 px, 14 px, etc.), so there is no space rule.
7. **does not check the CSS and line styles of** `src/organization/`, `src/phase1/`, `src/workspace/`: they are another older code (approximately 4,500 lines) which will be integrated later.

When **adds a new style:**, see where the `npm run lint` red is, token or glass, **does not want** bypassed by `stylelint-disable`/ `eslint-disable`; It is true that an exception should be added here, along with a justification.

## 9. Token `--dur-*` `--ease-*` `--spring-*` (v1. 6 interface and activation upgrade, DX-01)

Defined in `src/styles/dx-00-tokens.css` (only this document can be written at a specific time). **can only quote token and not write numbers like `150ms`.**

| token | Value | Where do you use it? |
| --- | --- | --- |
| `--dur-press` | 100ms | Press the feedback. "Now." |
| `--dur-fast` | 150ms | Suspend color, fade out, menus appear. |
| `--dur-base` | 220ms | Panel, drawer in |
| `--dur-slow` | 320ms | Something bigger is falling into place. |
| `--ease-out` | `cubic-bezier(.2, .8, .2, 1)` | : Start fast, end soft |
| `--ease-in-out` | `cubic-bezier(.4, 0, .2, 1)` | Move one place to the other. |
| `--spring-ui` + `--spring-ui-dur` | `linear(...)`，450ms | Drag Cards Down ( `src/lib/dragSort.ts`), flowchart node change (DX-22) |
| `--spring-pop` + `--spring-pop-dur` | `linear(...)`，480ms | Step to Done Dot. 25） |

- Two spring curves are generated by `scripts/spring-linear.mjs` (don't change the values manually).
- **Reduction effects: When the** system set-up started with `prefers-reduced-motion: reduce`, all of the time up there was changed to `1ms` and the spring to `linear`, so only reference to to token 's effect automatically became "almost instantaneous". It takes time to use in the script. `src/lib/motion.ts`It's... `tokenMs()`(read token) and `prefersReducedMotion()`Don't write your own numbers.
- Only `transform` and `opacity` (DX-08, style check stops: `transition: all`, time of writing, transition to `left/top/right/bottom/width/height/margin/padding`).

## 10. Shadow level `--elev-1/2/3` (DX-23)

Defined in `src/styles/dx-23-glass-topbar.css`, one set of light/deep colours (deeper weight, two dark synchronous):

| token | Light | Where do you use it? |
| --- | --- | --- |
| `--elev-1` | `0 1px 2px / .06` + `0 2px 6px / .05` | The lightest one. **has no place to use**. Keep it. `grep -rn "var(--elev-1" src`）|
| `--elev-2` | `0 4px 12px / .10` + `0 12px 28px / .08` | Menu (%1) `.menu`、`.m-menu`), recommendation box of the head(s), `.panel`, towed cards (Tasks, Partners) |
| `--elev-3` | `0 12px 40px / .18` | Toast. `.toast`；Width 1199px next to right bar on page |

Pick these three new lines before adding them here. Don't write `box-shadow: 0 8px ...` in the component.

## 11. Structure and attribution of small style files (DX-01 cases)

- `src/styles.css` is still the original; v1. Each work package of 6 has written its own style on **'s own little file** `src/styles/dx-NN-<name>.css` by `src/styles/index.css` after `styles.css` in order `@import` (`src/main.tsx` was introduced by `index.css`).
- **One file belongs to only one package**, the other one cannot change it. Wants to turn off the style of a package (R1 Quick Close): decrypt the `index.css` line `@import`.
- `styles.css` must adopt `npm run lint:css` (`font-size`/Circular/Standard/hex Rules), as well as several more after `dx-01`: `transition: all`, no time to write death, no transition to layout properties, **not `!important`**; `.hover-card` on the desktop is not allowed any delay (a sample of intentional violations in `src/test/dxStyleGuard.test.ts` proves that these guards are really red).
- `dx-00-tokens.css` is the exception: it's where token is defined and allowed to be written at a specific time.
- `docs/design-upgrade/README.md` and `docs/design-upgrade/ROLLBACK_LOG.md`.
- `styles.css` is step 3 of DX-27, **requires the explicit consent of Juanxi to**, and currently **does not do**; After metge, R1 can't close fast.
