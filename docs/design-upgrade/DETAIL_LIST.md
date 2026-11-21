# Detailed Checklist

Each item states **current behavior** (how we know), **recommendation**, **basis**, and **work package**.
Evidence confidence: **Measured** = measured in the browser; **Seen** = visible in screenshots; **Read** = found in code; **Unverified** = the implementation agent must measure before changing it.
Source abbreviations: `Apple` = apple-design-skill (Apple HIG pages, cited as `references/hig/<page>.md`); `Emil` = emilkowalski/skills apple-design (section number); `Judgment` = my assessment without a supporting Skill provision.

> Correction: my previous claim that "mobile content starts around 370px, taking 44%" was **wrong**: I treated 2× screenshot pixels as page pixels. Correct **measured** values: top bar 185px, navigation ends at 247px, body starts at **271px**, about 32% of screen height (D23).

## A. Feedback and interaction feel

| ID | Location | Current behavior | Recommendation | Basis | Package |
| --- | --- | --- | --- | --- | --- |
| D01 | All buttons, chips, navigation | No press feedback. **Measured:** `.btn`, `.sidenav a`, `.card`, `.pill` transitions all `all 0s`; no `:active` styles for them | Immediately shrink slightly on press (`scale(.97)`, ≤100ms), return on release; opacity for text buttons | Emil §1 "Respond on pointer-down"; Apple `motion.md › Providing feedback`: "Aim for brevity and precision" | DX-03 |
| D02 | Hover colors | `.btn:hover`, `.sidenav a:hover`, `.row-btn` backgrounds change instantly | 100–150ms background transition only on actual hover devices (`@media (hover: hover)`) | Judgment + Emil §1 | DX-03 |
| D03 | Circular Ask button (phone/tablet) | No hover/press state; appears/disappears instantly | Shrink on press; enter/exit with the rail | Emil §1, §7 | DX-09 |
| D04 | Mobile hit targets | **Measured:** `.icon-btn` height 32px; code suggests `.btn` about 33px, `.chip` about 28px. Apple's mobile default is 44, minimum 28 | Under `(pointer: coarse)`, primary controls ≥44px high; small table controls ≥32px; adjacent spacing ≥8px. Desktop unchanged | Apple `accessibility.md` (control sizes/spacing) | DX-04 |
| D05 | Tiny controls | `.swatch` 20px, `.owner-chip button` 24px, `.info` 16px (+2px hit area) | Touch hit areas at least 32px via transparent pseudo-elements, appearance unchanged | Same as above | DX-04 |
| D06 | Mobile tap highlight | No `-webkit-tap-highlight-color` or `touch-action: manipulation` | After DX-03 press feedback, remove native gray highlight and avoid double-tap zoom delay | Emil §1 "audit … the ~300ms tap delay" | DX-07 |

## B. Container entry/exit (spatial continuity)

| ID | Location | Current behavior | Recommendation | Basis | Package |
| --- | --- | --- | --- | --- | --- |
| D07 | Ask / Details rail | **Read:** `{rail.open && <Rail/>}` in `Layout.tsx`, immediate mount/unmount; fixed overlay below 1200px without sliding | Slide in from right, exit same way; interruption reverses from current position; desktop side-by-side mode fades with small movement | Emil §3 (interruptibility), §7 (same entry/exit path); Apple `motion.md`: "if someone reveals a view by sliding it down from the top, they don't expect to dismiss the view by sliding it to the side" | DX-09 |
| D08 | Rail dialog height | **Read:** `.rail { height: calc(100vh - …) }` misaligns as mobile address bar expands/collapses | Use `100dvh` | Judgment | DX-09 |
| D09 | Circular Ask position | **Read:** `bottom: 18px` ignores iPhone home indicator (`viewport-fit=cover` enabled) | `calc(18px + env(safe-area-inset-bottom))` | Apple `layout.md` (safe areas) | DX-09 |
| D10 | Demo/bell menus | **Read:** toggle `hidden`, no exit or growth from trigger | Fade + slight scale, `transform-origin` at trigger; faster 100ms exit | Emil §7 "Anchor interactions to their source" | DX-10 |
| D11 | Toast ("Demo data reset") | **Read:** fixed bottom center, instant entry/exit, no bottom safe area | Rise 8px and fade in, fade out; preserve `aria` behavior | Emil §7; Apple `layout.md` | DX-11 |
| D12 | Mobile tap-open hover card (bottom sheet) | **Read:** appears instantly when `data-open` changes | Slide/fade up; reverse on outside click/Escape. **No scrim** (explanation, not modal) | Emil §12 "Dim to focus, separate to keep flow" | DX-12 |
| D13 | `<details>` | **Read:** at least 11 files use it (TaskDetail, Settings, Handoff, etc.); instant expansion | Height transition through `::details-content`; unchanged fallback in unsupported browsers (progressive enhancement) | Judgment | DX-13 |
| D14 | Page navigation | No transition | 140ms fade-in only; **no slide or exit**, avoiding delay | Apple `motion.md`: "avoid adding motion to UI interactions that occur frequently" | DX-19 |
| D15 | Switching rail details (another task) | **Read:** replaces all `DetailView` content | 120ms crossfade without layout movement | Emil §3 | DX-19 |
| D16 | Lazy-loading placeholder | **Read:** `RouteLoading` is only "Loading…" | Show nothing for ≤150ms to avoid flashes; afterward use a page-shaped skeleton, retaining screen-reader text | Apple `loading.md`; Emil §1 | DX-14 |
| D17 | New Ask messages | Bubbles and AI wait cards appear instantly | New bubbles rise 6px + fade in, only for new messages; do not replay when reopening | Judgment | DX-17 |

## C. Layout and information

| ID | Location | Current behavior | Recommendation | Basis | Package |
| --- | --- | --- | --- | --- | --- |
| D18 | Events at 1440px with rail open | **Seen:** four columns (navigation 196 + events 220 + content + rail 380), leaving about 550px for diagram and clipping right labels ("Mod…") | **Keep** event list (your 10-31 requirement); narrow it to about 168px when rail opens; add diagram scroll-edge fade hint | Apple `layout.md`; Emil §12 "Scroll edge effects" | DX-15 |
| D19 | Blank space above Events diagram | **Seen:** about 58px between view switch and diagram, plus internal top whitespace. **Read:** PROGRESS 2026-10-31 reserves this for hover cards | **Do not simply delete it.** Measure required hover-card height first, then remove excess | Judgment | DX-15 |
| D20 | Tasks board | **Seen:** at 1440 with rail open, sixth column Done is offscreen, hiding the most rewarding column; My tasks has mostly empty columns and extensive blank space | Collapse empty columns to narrow strips, expanding on click/drag-over/keyboard focus; keep enough minimum height for drop targets | Apple `layout.md` (emphasize important content) | DX-16 |
| D21 | Board cards | Only `cursor: grab`; no hover change | Accent border on hover to signal dragging | Judgment | DX-16 |
| D22 | Board headers | **Seen:** 6 saturated bands (gray, blue, orange, purple, red, green) compete with the signature metro lines | Subtle background + colored dot + dark text; StatusPill elsewhere unchanged. Recompute dark-mode contrast (DX-21) | Apple `color.md`; Craft lens "spend boldness in one place" | DX-21 |
| D23 | Mobile top bar | **Measured:** 185px top bar plus navigation; body begins at 271px (32%). Brand, Demo, View as, AI toggle, bell crowded in | Single row about 56px; move Demo/View as/AI into ⋯ (20a); move navigation to thumb-reachable bottom (20b, **Juanxi approval required**) | Apple `layout.md`; Apple `tab-bars.md` (borrow principles only for web) | DX-20 |
| D24 | Empty Ask rail | **Seen:** greeting at bottom with large empty area above | Group greeting/suggestions and center vertically | Apple `layout.md` (hierarchy/whitespace) | DX-17 |
| D25 | Empty states | Funding "Nothing needs action.", Partners "No contacts match." give state without next step | One next-step sentence and link where actionable (e.g. "Clear filters"), without increasing words | Apple `writing.md`; `feedback.md` | DX-18 |
| D26 | Today risk dots | **Seen:** `RiskDot` relies only on red/yellow/green; event-row dots unlabeled; mobile requires tapping for hover-card text | Different shape per state (circle/triangle/square), distinguishable in grayscale; retain colors | Apple Lens 1 "Nothing is conveyed by color alone" | DX-05 |
| D27 | At-risk progress dots | **Read:** only an extra thicker red outline; difficult with color blindness | Add shapes alongside DX-25 | Same as above | DX-25 |

## D. Typography and numbers

| ID | Location | Current behavior | Recommendation | Basis | Package |
| --- | --- | --- | --- | --- | --- |
| D28 | Heading tracking | **Read:** h1/h2/h3 all `letter-spacing: -.01em` | By size: 26px about `-.02em`, 18px about `-.015em`, 15px `0` | Emil §15; Apple `typography.md` (size-dependent tracking) | DX-06 |
| D29 | Date/amount numeral widths | Tabular `.num` only on some elements | Tabular numerals for all dates, amounts, counts to align columns | Emil §15 | DX-06 |
| D30 | 12–13px text | `--fs-xs` 12px, `--fs-sm` 13px for progress labels, chart ticks, small pills; own target ≥14px (`AGENTS.md` 7.4) | Mobile progress/chart labels use `--fs-md`. **Tokens only**; lint forbids bare pixels | Apple `typography.md` (minimum text size) | DX-06 |
| D31 | Paragraph wrapping | Headings already `text-wrap: balance` | `text-wrap: pretty` on body/small text to reduce orphans | Judgment | DX-06 |
| D32 | h1 docs/code mismatch | `docs/DESIGN_TOKENS.md` says `clamp(26px, 3.2vw, 34px)`; **Read:** `styles.css` actually fixed `var(--fs-2xl)` 26px | Default **docs-only fix**, no visual change; larger wide-screen headings await Juanxi | Judgment | DX-27 |
| D33 | Platform serif differences | `--serif: ui-serif, "New York", …, Georgia`: New York on Mac, Georgia/Times on Windows/Android, different character | **Unscheduled.** Consider self-hosted fonts later if needed (loading/size/licensing) | Judgment | Undecided |

## E. Materials and layering

| ID | Location | Current behavior | Recommendation | Basis | Package |
| --- | --- | --- | --- | --- | --- |
| D34 | Top bar | **Read:** solid `--surface` + 1px bottom border | Translucent blur with content beneath, border only after scroll; **do not stack** translucent overlays | Emil §12 "Build nav/toolbars/sheets as translucent layers"; Apple `materials.md` | DX-23 |
| D35 | Shadows | **Read:** at least 6 hand-written rgba shadows (panels, menus, hover cards, Ask, lists, toast); one `--shadow` token | Three elevation tokens `--elev-1/2/3`, deeper for larger surfaces | Emil §12 "Bigger surfaces should read as thicker" | DX-23 |
| D36 | Reduced transparency/increased contrast | **Read:** no `prefers-reduced-transparency` or `prefers-contrast` handling | Solid surfaces with clear borders for both, and solid fallback without `backdrop-filter` support | Emil §14 | DX-23 |

## F. Accessibility and motion safeguards

| ID | Location | Current behavior | Recommendation | Basis | Package |
| --- | --- | --- | --- | --- | --- |
| D37 | `.typing i`, `.ai-wait-mark i` | **Read:** infinite `blink`, **no** reduced-motion protection. Main CSS has only 2 `prefers-reduced-motion` cases (`.spin`, `.m-node`) | Static under reduced motion; test no infinitely repeating animation in this mode | Apple `accessibility.md › Be cautious with fast-moving and blinking animations`; Emil §14 | DX-08 |
| D38 | Test environment | **Read:** no `reducedMotion` in `playwright.config.ts`; new motion can destabilize tests while elements move | Default `reducedMotion: "reduce"`; separate motion tests | Judgment | DX-01 |
| D39 | Parallel test ports | **Read:** Playwright fixed 4173/4174, `reuseExistingServer` true outside CI; words fixed 4177. **Concurrent worktrees can reuse another server and test another agent's code** | Environment-configurable ports with unchanged defaults (CI unaffected) | Judgment | DX-01 |
| D40 | Motion durations | Handwritten .1s/.12s/.15s/.3s transitions | Tokens `--dur-press/fast/base/slow`, `--ease-out`, `--spring-ui`, `--spring-pop`; guard against bare milliseconds in new files | Judgment | DX-01 |
| D41 | Page metadata | **Read:** no `color-scheme`/`theme-color` in `index.html`; browser chrome/refresh may flash white in dark mode | Add both matching `--bg`, with a consistency unit test | Judgment | DX-07 |
| D42 | Scroll chaining | `.ask-list`, `.detail-scroll` scroll boundaries move background page | `overscroll-behavior: contain` | Judgment | DX-07 |

## G. Gestures and dragging

| ID | Location | Current behavior | Recommendation | Basis | Package |
| --- | --- | --- | --- | --- | --- |
| D43 | Task-board dragging | **Read:** native `draggable`, translucent ghost, no landing animation or card displacement; mobile support **unverified** | Pointer events: 1:1 tracking with grab offset, 8px threshold, other cards move aside, spring landing, Esc cancel, edge autoscroll, touch long-press, keyboard Alt+arrows | Emil §2, §10; Apple `gestures.md` | DX-24 |
| D44 | Board keyboard use | Dragging mouse-only (status buttons are a separate path) | Keyboard moves and `aria-live` "Moved X to Y" | Apple Lens 1 (keyboard access) | DX-24 |
| D45 | Partners board dragging | **Read:** same native dragging, no drop highlight | Reuse DX-24 drag utility | Same as above | DX-26 |
| D46 | Diagram-node movement | **Read:** `.metro .m-node { transition: left .3s ease, top .3s ease }` animates layout properties with ordinary easing while edges jump, out of sync | Transform-based movement, spring landing, brief edge crossfade for consistency | Emil §11 (transform/opacity only), §3 | DX-22 |
| D47 | Existing diagram strengths | **Read:** `setPointerCapture`, 6px threshold, edge autoscroll, Alt+arrows, context menu, undo | **Preserve; do not rewrite** | Emil §2, §10 | — |

## H. Delight (one place only)

| ID | Location | Current behavior | Recommendation | Basis | Package |
| --- | --- | --- | --- | --- | --- |
| D48 | Task completion | Only turns green, no feedback | Grow that chain segment left-to-right and pop its dot, only for an actual change during this session, never initial load | Apple `design-principles.md` (Delight); Emil §4 | DX-25 |
| D49 | `Ring` progress | Values jump | 400ms transition on changes, static initial render | Judgment | DX-25 |
| D50 | Tasks navigation badge | Number replaced instantly | Subtle pop on changes | Judgment | DX-25 |

## I. Engineering and documentation

| ID | Location | Current behavior | Recommendation | Basis | Package |
| --- | --- | --- | --- | --- | --- |
| D51 | `src/styles.css` | One 919-line file; concurrent changes conflict and feature rollback is difficult | Small CSS file per package, main file untouched; extend lint scope | Judgment | DX-01 |
| D52 | `Layout.tsx` | **Read:** top bar, menus, bell, Toast, rail mounting, navigation, circular button combined | Move only: `chrome/TopBar.tsx`, `SideNav.tsx`, `DemoMenu.tsx`, `Bell.tsx`, `Toast.tsx`; behavior/test IDs unchanged | Judgment | DX-02 |
| D53 | `AGENTS.md` section 0 | **Read:** still says `main` baseline `4dc55ba`, v1.0 unreleased. **Actual:** `main` includes v1.0 release merge `5b0eb96` and later demo-data commits, latest `c3c9394` | DX-27 verifies/updates, no direct change in this plan | Judgment | DX-27 |
| D54 | `docs/DESIGN_TOKENS.md` | No motion/elevation tokens | Add them and small-stylesheet structure | Judgment | DX-27 |
| D55 | Motion rules | AGENTS section 7 covers words/components only | Add subsection: duration tokens, fallbacks, transform/opacity only, interruptibility, no animation for routine actions | Judgment | DX-27 |
| D56 | Style guards | Nothing blocks `transition: all`/bare milliseconds | Ban `transition: all`, left/top/width/height transitions, bare durations in small files | Judgment | DX-01 |
| D57 | Screenshot comparison | No shared before/after approach | `scripts/dx-shots.mjs`: 1440 / 390 × light / dark × 8 pages | Judgment | DX-01 |
| D58 | Rollback register | None | `ROLLBACK_LOG.md` + `dx/*` tags | Judgment | DX-01 |

## J. Explicitly excluded, with reasons

| Idea | Why excluded |
| --- | --- |
| Desktop hover-card delay | **S3 already decided zero delay**, guarded by `e2e/feel.spec.ts`; my previous suggestion is withdrawn |
| Replace Events list with dropdown | **Juanxi explicitly required retaining it on 10-31**; narrow only, never remove |
| Sliding page transitions | Apple `motion.md`: no animation for frequent actions; fade-in only |
| Table-row/card entry animations | Same; seen many times daily |
| Continuously pulsing in-progress dots | Apple `accessibility.md`: avoid flashing/repetition; Emil §14: avoid slow loops |
| Parallax/full-page animated backgrounds | Emil §14 |
| Sound/haptics | Apple `playing-haptics.md`: meaningful moments only; iOS Safari lacks vibration API, limited benefit |
| Manual dark-mode toggle | Apple `dark-mode.md`: no separate in-app appearance toggle; DESIGN_TOKENS already chose system theme |
| Add `motion` / `framer-motion` | Entry-JS budget about 364KB; use CSS `linear()` springs first. If insufficient, propose separately for Juanxi's decision |

## K. Decisions for Juanxi (defaults already in packages allow work to start)

| # | Question | Default | Package |
| --- | --- | --- | --- |
| 1 | Mobile bottom navigation? | **No**; DX-20 only does 20a top-bar slimming. 20b requires approval | DX-20 |
| 2 | Automatically narrow empty board columns? | **Yes**, also prevents Done going offscreen; roll back DX-16 if disliked | DX-16 |
| 3 | Default rail closed on narrow Events? | **No**, preserves your AI rail design; only narrow event list | DX-15 |
| 4 | Larger wide-screen headings to match documented clamp? | **No visual change**, docs only | DX-27 |
| 5 | Overall motion intensity | **Restrained:** feedback + container entry/exit + completion only | All |
