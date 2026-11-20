# Detailed list

Each article states: **Status** (How do you know), **recommends**, **based on** and **for work package**.
The column "evidence" shows the level of credibility: **to** = the number in the browser; **saw** = seen in screenshots; **reads** = read code read; **to be measured** = not verified.
Based on abbreviations: `Apple` = apple-design-kill (Apple HIG page, quoted `references/hig/<page>.md`); `Emil` = apple-design (chapter number) of emilkowalski/kills; `judgment` = My judgment, no Skyl text supports.

> Corrigendum: The last round I said, "The content of the cell phone is about 370 px and it's about 44%," **was wrong** -- that's using 2 times pixels as page pixels. The correct number of **to** is: top bar 185px, navigation bar to 247px, the text starting with **271px**, about 32% (D23) of screen height.

## A. Feedback and touch

| ID | Location | Status | Recommendations | Basis | Bag. |
| --- | --- | --- | --- | --- | --- |
| D01 | All buttons, Chips, Navigators | Press no change. **to**: `.btn`、`.sidenav a`、`.card`、`.pill` It's all about... `all 0s`；These elements are not written in the stylesheet `:active` | Click immediately to narrow it down ( `scale(.97)`~ 100ms, let go of your hand. ~ Transparency for text-type buttons | Emil §1 "Respond on pointer-down"；Apple `motion.md › Providing feedback`："Aim for brevity and precision" | DX-03 |
| D02 | Suspend Colour | `.btn:hover`、`.sidenav a:hover`、`.row-btn` The background is the instant jump. | Add 100– 150ms for background transition only on equipment with real mouse ( `@media (hover: hover)`）| ♪ Emil ♪ 1 | DX-03 |
| D03 | Ask Circle Button (Phone, Flat) | There's no suspension, there's no buttoning, there's both the moment and the moment. | (a) Zoom out by clicking; Link in and out with the right bar. | Emil §1、§7 | DX-09 |
| D04 | Cell phone click area | **to**: `.icon-btn` High 32px; Code extrapolation `.btn` About 33 px, `.chip` About 28 px. Apple Moveend Default 44, Minimum 28 | Yes. `(pointer: coarse)` , the minimum height of the primary control 44px; Small controls in tables not less than 32px; Neighbor control spacing ~8px. Desktop is completely unchanged | Apple `accessibility.md`(Control size and spacing) | DX-04 |
| D05 | Very Small Controls | `.swatch` 20px、`.owner-chip button` 24px、`.info` 16px (plus 2px hot zone) | Extend the hot zone to at least 32px under touch screen (no change in appearance, use transparency pseudo-factors) | Same source as above | DX-04 |
| D06 | Cell phone clicks highlight. | No Settings `-webkit-tap-highlight-color`Not really. `touch-action: manipulation` | After pressing feedback (DX-03), remove the gray and bright system and avoid double-click scaling delays | Emil §1 "audit … the ~300ms tap delay" | DX-07 |

## B. In and out of containers (space sense)

| ID | Location | Status | Recommendations | Basis | Bag. |
| --- | --- | --- | --- | --- | --- |
| D07 | Right Bar Ask / Details | **Read**：`Layout.tsx` Lee. `{rail.open && <Rail/>}`，Mount and Unmount Directly。less than 1200px It's a fixed layer.，There's no slide. | To slide from the right, to slip out of the way; (a) A little more in the middle to go backwards and move from the current position; Desktop side by side + small bit shift | Emil § 3 (interruptible), § 7 (in and out of the same path); Apple `motion.md`："if someone reveals a view by sliding it down from the top, they don't expect to dismiss the view by sliding it to the side" | DX-09 |
| D08 | Dialog height of the right bar | **Read**：`.rail { height: calc(100vh - …) }`，The mobile browser's address bar is shrugged. | Change to `100dvh` | Judgement | DX-09 |
| D09 | Circle Ask Button Position | **read**: `bottom: 18px`, without considering the iPhone bottom crossbar ( `viewport-fit=cover` Open) | `calc(18px + env(safe-area-inset-bottom))` | Apple `layout.md`(Safe zone) | DX-09 |
| D10 | Demo menu, bell menu | **Read to**: Use `hidden` Properties switch, no exit; It doesn't grow out of the button that triggers it. | Fade + slightly scaled, `transform-origin` is placed on the button; Get out faster (100ms) | Emil §7 "Anchor interactions to their source" | DX-10 |
| D11 | Toast（"Demo data reset"）| **Read**: Stay in the middle of the bottom and appear and disappear as instantaneously; The security zone is not considered at the bottom. | Up and down from the bottom of 8px; `aria` No change in behaviour. | Emil §7；Apple `layout.md` | DX-11 |
| D12 | The suspense card on the phone. | **read**: `data-open` It just happens. There's no animation. | (a) Sliding from below, faded; Dots elsewhere/ Escape Reverse. **without mask** | Emil §12 "Dim to focus, separate to keep flow" | DX-12 |
| D13 | Collapse Zone `<details>` | **Read**: At least 11 files are in use (TaskDetail, Settings, Handoff, etc.), and they start instantaneously | Use `::details-content` Maintain the status quo (progressive enhancement) when high transition is not supported by browsers | Judgement | DX-13 |
| D14 | Page Switch | No transition | Just do 140ms fade in, **No slides, no exits.**(no slow action)  | Apple `motion.md`："avoid adding motion to UI interactions that occur frequently" | DX-19 |
| D15 | Right bar details to switch (point another task) | **read**: `DetailView` Contents in Block Replace | 120ms Cross-fade, do not move layout | Emil §3 | DX-19 |
| D16 | Places on laziness load | **read**: `RouteLoading` There's only one line of "Loading..." | 150ms do not show (avoid a flash) within, followed by bones similar to the page structure; Save Text to Read Screen | Apple `loading.md`；Emil §1 | DX-14 |
| D17 | Ask New Message | No animation of bubbles; AI Waiting for cards to appear directly | New bubble 6px rises + faded (only for new messages, reopen panel without replaying) | Judgement | DX-17 |

## C. Coverage and information

| ID | Location | Status | Recommendations | Basis | Bag. |
| --- | --- | --- | --- | --- | --- |
| D18 | Events page 1440px, right bar open | **See**: Four rows in parallel (navigation 196 + active list 220 + content + right column 380), with flowchart only about 550 px and right tab cut ("Mod...") | **Keeps a list of activities for** (you request 10-31). narrows the list to about 168px when it opens in the right bar; The flowchart with the "and more" edges. | Apple `layout.md`；Emil §12 "Scroll edge effects" | DX-15 |
| D19 | Cannot initialise Evolution's mail component. | **See**: Between the switch and the map about 58px, there's a big gap at the top of the figure. **Read** PROGRESS 2026-10-31: Top white left for suspension card | **cannot simply delete**. Agent, let's see how high it needs to be when the suspense cards come out and then take away the extra. | Judgement | DX-15 |
| D20 | Tasks board | **Seeing the opening of**: 1440+ right bar, column 6 (Done) is squeezed out of the screen and users do not see one of the most rewarding columns; Most of the columns under "My tasks" are empty. | An empty column harvest narrows (click, drag to top, play on keyboard focus); The minimum height of the column makes the drop target big enough. | Apple `layout.md`(To make important points even more prominent) | DX-16 |
| D21 | Board Card | Only. `cursor: grab`, the mouse has moved without change | The border becomes an emphasis of color when suspended and the hint drags | Judgement | DX-16 |
| D22 | board | **See**: 6 saturated colours (grey, blue, orange, purple, red, green) across the top of the page and the "millecial line" sign. | Change to a low bottom + colour dot + dark letter. Status block (StatusPill) remains unchanged elsewhere. Recalculate contrasts under dark mode (see DX-21) | Apple `color.md`；Craft, mirror. "Courage is only one." | DX-21 |
| D23 | Cellular topbar | **to**: Top bar 185px+ Navigator bar, starting with 271px (32%). The top bars are brands, Demo minibars, View ass, AI switches, bells. | The top bar harvests a line (approximately 56px) where Demo, View ass, AI switches are added to the  ⋯ 20a menu. Position of navigation to the bottom thumb (20b, **requires Juanxi approval**) | Apple `layout.md`；Apple `tab-bars.md`(Web-only principles) | DX-20 |
| D24 | Ask Right Bar Empty | **See**: greeting sunk at the bottom of the panel, and there's a lot of empty up there. | Queries and suggestions are organized, vertically centered | Apple `layout.md`(hierarchical and white) | DX-17 |
| D25 | Empty status of pages | Funding "Noting needs action." Partners "No contacts match." | Each empty state says the next step with an action to a link (e.g. "Clear filters". No word increase | Apple `writing.md`；`feedback.md` | DX-18 |
| D26 | Today's risk point | **See**: Red and yellow dots are only color-based `RiskDot`）；No tag on the right point of the active line. You can't see what's on your phone until you order it. | Each state has a different shape (round / triangle / square), which can also be divided under greyscale; Keep the original color | Apple Lens 1 "Nothing is conveyed by color alone" | DX-05 |
| D27 | "Risk-at-risk" in the progress chain. | **Read**: Only a circle of red edges and thicker edges more than normal dots, with color blind users hard to divide | Add shapes to DX-25 | Same source as above | DX-25 |

## D. Fonts and numbers

| ID | Location | Status | Recommendations | Basis | Bag. |
| --- | --- | --- | --- | --- | --- |
| D28 | Title word length | **read**:h1/ h2/h3 unified `letter-spacing: -.01em` | Symbol: 26px Title approximation `-.02em`18 px approximation `-.015em`15 px `0` | Emil §15；Apple `typography.md`(Log length changes with the word number) | DX-06 |
| D29 | Digital width of date and amount | `.num`Use only part of the element. | All station dates, amounts, numbers and all other wide figures before the columns are aligned | Emil §15 | DX-06 |
| D30 | 12– 13px Small | `--fs-xs` 12px、`--fs-sm` 13px used in progress chain labels, chart scales, small colour blocks. Your own goal is #14px. `AGENTS.md` 7.4）| On the phone, mention the progress chain labels and chart tags. `--fs-md`。**Only token** (style check does not allow nudity pixels) | Apple `typography.md`(Minimum code) | DX-06 |
| D31 | Wrap Paragraph | Title used `text-wrap: balance` | Text and little words added `text-wrap: pretty`, reduce the number of lonely | Judgement | DX-06 |
| D32 | H1 documents do not match code | `docs/DESIGN_TOKENS.md` Write h1 Yes `clamp(26px, 3.2vw, 34px)`；**Read to** `styles.css` It's actually fixed. `var(--fs-2xl)` 26px | Default **changes only the document** (no change image). Are you really going to make the big screen headline bigger, waiting for Juanxi to decide | Judgement | DX-27 |
| D33 | Platform differences in line fonts | `--serif: ui-serif, "New York", …, Georgia`: Mac up to New York, Windows/Andre into Georgia/Times. Personality changes. | **does not schedule**. Re-assess self-hosting fonts (to load, size, authorization) if any later | Judgement | To be decided |

## E. Materials and levels

| ID | Location | Status | Recommendations | Basis | Bag. |
| --- | --- | --- | --- | --- | --- |
| D34 | Top Bar | **Read**: Solid `--surface` + 1px Underline | Semi-transparent + fuzzy, content slips from below; Scroll before the bottom line appears. **No overlap** semi-transparent | Emil §12 "Build nav/toolbars/sheets as translucent layers"；Apple `materials.md` | DX-23 |
| D35 | Shadow | **Read**: At least 6 handwritten rgba shadows (Panel, menu, suspense card, Ask button, list, toast); Only one. `--shadow` token | Create 3 tier token: `--elev-1/2/3`It's bigger and deeper. | Emil §12 "Bigger surfaces should read as thicker" | DX-23 |
| D36 | Reduce transparency and enhance contrasts | **Read**: No `prefers-reduced-transparency` or `prefers-contrast` Processing | Semi-transparent layers become solid + visible border under both settings; Not supported `backdrop-filter` The browser will also be fallback. | Emil §14 | DX-23 |

## F. Accessibility and protection of effects

| ID | Location | Status | Recommendations | Basis | Bag. |
| --- | --- | --- | --- | --- | --- |
| D37 | `.typing i`、`.ai-wait-mark i` | **read**: `blink` Infinite loops, **doesn't have** "reduce action" protection. Only 2 places in the master stylesheet `prefers-reduced-motion`（`.spin`、`.m-node`）| (a) Static at the time of reduction; Add a test: there can be no infinite loop of animation on the next page in this mode | Apple `accessibility.md › Be cautious with fast-moving and blinking animations`；Emil §14 | DX-08 |
| D38 | Test Environment | **read**: `playwright.config.ts` No Settings `reducedMotion`。After the animation, the test becomes unstable because the elements are still moving. | Default `reducedMotion: "reduce"`；There's another special test for the effect. | Judgement | DX-01 |
| D39 | Parallel Test Port | **reads**: Playwright fix 4173/4174, `reuseExistingServer` is true under non-CI; `words` Script fixed 4177. **multiple worktree running at the same time to re-use other people's services,**. | Port to environment variable with default unchanged (CI not affected) | Judgement | DX-01 |
| D40 | How long does it last? | Existing transpositions are handwritten (1s, 12s, 15s, 3s) | Build token: `--dur-press/fast/base/slow`、`--ease-out`、`--spring-ui`、`--spring-pop`；Plus style check. No nudity in new files. | Judgement | DX-01 |
| D41 | Page Meta Info | **read**: `index.html` Nothing. `color-scheme` and `theme-color`, the top color of the browser in dark mode and a refreshing moment may be white. | Add both, colour values and `--bg` And write an unit tess to keep the same. | Judgement | DX-07 |
| D42 | Scroll through | The scrolling area in the right bar ( `.ask-list`、`.detail-scroll`) Roll to the head will drive back pages | `overscroll-behavior: contain` | Judgement | DX-07 |

## G. Motions and drags

| ID | Location | Status | Recommendations | Basis | Bag. |
| --- | --- | --- | --- | --- | --- |
| D43 | Task board drag | **Read**: Drag and drop by browser `draggable`(a) There is only a half-transparent shadow, falling without animation, and the rest of the cards remain unattractive; Is it working on the phone? **To be measured**  | Changed to a pointer event: card 1:1, follow hand and remember the grab point. 8px is a drag; Other card concessions; (a) Springs for falling position; Esc cancels; Automatic scrolling of edges; (a) Long touch screen press; Keyboard Alt+Arrow | Emil §2、§10；Apple `gestures.md` | DX-24 |
| D44 | Board keyboard operations | Drag is currently only available (state buttons are another path) | Keyboard Moves and uses `aria-live` "Moved X to Y" | Apple Lens 1 (keyboard available) | DX-24 |
| D45 | Partners board drag | **Read**: The same browser drags and drags itself and does not put a highlight | Drag with DX-24 | Same source as above | DX-26 |
| D46 | Flowchart Node Move | **Read**：`.metro .m-node { transition: left .3s ease, top .3s ease }`——It uses properties that trigger the reprogramming.，It's a normal buffer.；And the connection was a direct jump.，They're not synchronized. | Change Node `transform`, use a spring to drop the position. The line fades short enough to keep it consistent. | Emil § 11 (transform/option only), § 3 | DX-22 |
| D47 | The advantages of the flow chart already available | **Read to**: Used `setPointerCapture`6px tow threshold, edge autorolling, Alt+ arrow key, right-click menu, undo | **Keep**, don't rewrite | Emil §2、§10 | — |

## H. Surprises (only one)

| ID | Location | Status | Recommendations | Basis | Bag. |
| --- | --- | --- | --- | --- | --- |
| D48 | The moment the mission was completed. | There's no feedback. It's just green. | The part of the progress chain that grows from the left to the right and plays a dot. (Only when there is a real change in the session, but not when the page is loaded) | Apple `design-principles.md`（Delight）；Emil §4 | DX-25 |
| D49 | Progress rings `Ring` | Jump directly when the value changes | Time of change 400ms transition, first-time rendering inactive | Judgement | DX-25 |
| D50 | Tasks corner for navigation bar | Change numbers directly when they change | It's a little "playing" when it changes. | Judgement | DX-25 |

## I. Engineering and documentation

| ID | Location | Status | Recommendations | Basis | Bag. |
| --- | --- | --- | --- | --- | --- |
| D51 | `src/styles.css` | 919 Line Document. More than one agent at the same time, there's gotta be a conflict. Rollback can't cut by function. | One small file for each work package, the master file remains intact; Extension of style check to smaller files | Judgement | DX-01 |
| D52 | `Layout.tsx` | **Read**: Include topbars, menus, bells, Toast, right bar mount, navigation, circle buttons | It's a clean move. It's broken down. `chrome/TopBar.tsx`、`SideNav.tsx`、`DemoMenu.tsx`、`Bell.tsx`、`Toast.tsx`。Behavior and test numbers remain unchanged | Judgement | DX-02 |
| D53 | `AGENTS.md` Section 0 | **Read**: Write `main` The baseline remains `4dc55ba`0 hasn't been online yet. **Actual**  `main` already contains v1. 0 publisher( `5b0eb96`and subsequent presentation of data (update) `c3c9394`）| Updated by DX-27 verified (not changed directly in this plan) | Judgement | DX-27 |
| D54 | `docs/DESIGN_TOKENS.md` | No action token, level shadow token | Fill and indicate the structure of the small style file | Judgement | DX-27 |
| D55 | Rules of action | `AGENTS.md` Section 7 deals only with text and components, with no dynamic rules | Add a subsection: time token, must be downgraded, only transform/opacity, interruptable, common operation without animation | Judgement | DX-27 |
| D56 | Style Guard | There's nothing to stop it. `transition: all` Or nudity. | It's forbidden in small files. `transition: all`, ban on transition to left/top/width/night, ban on nudity | Judgement | DX-01 |
| D57 | Screenshot Comparison | There's no uniform "go/go" screenshot. | `scripts/dx-shots.mjs`: 1440/ 390 x shallow/ deep x 8 pages | Judgement | DX-01 |
| D58 | Rollback Registration | Nothing. | `ROLLBACK_LOG.md` + `dx/*` Label | Judgement | DX-01 |

## J. Clear not to do (and why)

| Ideas | Why not? |
| --- | --- |
| Desktop suspension card plus delay | **S3 has decided on a zero delay.**（ `e2e/feel.spec.ts` Hold on. My last suggestion is over. |
| Pull down the left-hand active list of Evans. | **Juanxi 10-31 is explicitly required to keep the list**. It's narrow. It won't be taken off. |
| Slide a switch between pages | Apple `motion.md`: The usual operation is not animated. Just fade in. |
| Table Line, Card Entry Animation | Ibid. I've seen it many times a day. |
| The "ongoing" dots are always pulsed. | Apple `accessibility.md`: avoid blinking and repeating animations; Emil § 14: Avoid slow circulation |
| View deviation, page-wide dynamic background | Emil §14 |
| Sound, vibration. | Apple `playing-haptics.md`: Give only meaningful moments. iOS Safari on the web does not support vibration interfaces and benefits are low |
| Manual dark mode switch | Apple `dark-mode.md`: Do not single-looking switch in App. `DESIGN_TOKENS.md` I've decided to follow the system. |
| Introduction `motion` / `framer-motion` Library | The entrance JS has a volume threshold (approximately 364KB). CSS first `linear()` Springs. If it's not enough, put it alone. Juanxi decides. |

## K. Something that requires a Juanxi decision (the default value is written in work package, can be done first if you do not decide)

| # | Problem | Default | Impact packs |
| --- | --- | --- | --- |
| 1 | Do you want to do the bottom of your phone?  | **does not do**, DX-20 only 20a. 20b. You can't drive until you approve. | DX-20 |
| 2 | Do you want the board column to be narrowed automatically?  | **Do** (it also solves the problem of Done column being squeezed out). Rollback DX-16 if you don't like it. | DX-16 |
| 3 | Events, do you want the right bar to close by default while it's narrow?  | **don't do**. Only a narrow list of activities | DX-15 |
| 4 | Do you want the large screen captions to be larger (compatible with document clamp)?  | **No change**, only document changes | DX-27 |
| 5 | The power of the action. | **Restraint**: Only feedback + container entry and exit + completion three times | All |
