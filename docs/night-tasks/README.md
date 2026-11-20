# Night Mode Task Library

This is a task document that has been written and can be put into the queue at any time. The map and the list are all done first.
(`docs/NIGHT_MODE.md` 7c Article 1: Investigation handed over, Night Mode only made mechanical changes).

The file name `N1`... `N6` is the order of execution -- queue to run by filename.

Usage:

```bash
cd /Users/Dirofs/AI-Projects/platypus-night-mode
git pull
mkdir -p .nightmode/queue
cp docs/night-tasks/N*.md .nightmode/queue/     # Or just trying to run.
caffeinate -dimsu bash scripts/night-queue.sh
```

No one (including Claude) will push `feat/ai-night-mode` after the **queues have come up.**
2026-10-27, that night, 7 was over for the only reason Claude pushed one during the lineup.
The document is submitted and each task then hits the same wall. See `docs/NIGHT_MODE.md` 7b-2.

## Current Queue (2026-10-29 Update: Night Mode Pause, N2–N6 by Human Union Talk)

| Tasks | Do what? | Visual risk | Projected | Dependence |
| --- | --- | --- | --- | --- |
| N1 | Spacing (only odd values) | Low (max.  ± 2px) | **Completed** ( `720680a`,CI passing) | — |
| N2 | Round corner to 4 | Low (two places +2px) | Man-union speech execution (expected 40 points) | — |
| N3 | It's coming in. 7Queu  | Low (max. ~1px) | Man-union speech execution (expected 50 points) | — |
| N4 | Remove Death Variables `--st-now`, take the chart blue | **Zero** | Man-union speech execution (expected 20 points) | — |
| N5 | Contrast restoration | Juanxi access | Man-union speech execution (expected 40 points) | — |
| N6 | Write. `docs/DESIGN_TOKENS.md` | nil (writing documents only) | Man-union speech execution (expected 30 points) | N2 N3 N4 |

**N1's on purpose.**: It's... 2026-10-27The entire gate (then called T6) was passed that night.
It's just a push block, so it's the one that's known to run. It's used to verify that the queue itself works.

## 2026-10-27 The result of that night.

7 missions, actual success of 2, all dead on push, not code.

| Original task | Results | Where are we now? |
| --- | --- | --- |
| T1 z-index | Passed all gates (module 611 + 276 e2e + Critic approval) | **Landed** `55949b8` |
| T2 Corner | I've finished my work, but I haven't crossed the gate. | Half-finished. `wip/T2-radius`Rewrite to N2 |
| T3 | I've finished my work, but I haven't crossed the gate. | Half-finished. `wip/T3-fontscale`Rewrite to N3 |
| T4 Status Color | **The mission itself was wrong.**See you later.  | Deleted, part of which can be rewrite to N4 |
| T5 Contrast | Reliance on T4 failed, skip correct | Undepend dependency becomes N5. |
| T6 spacing | It's past all the gates. | Cherry-Pick Conflict Rerun to N1 |
| T7 Documentation | Reliance not satisfied, right krip | Reliance to N2/N3/N4 becomes N6 |

Backup: None of the full filings were lost on branch `backup/2026-10-28-queue` that night.

## T4 why the mission was wrong, not Agent failed.

T4 ran only to `docs/PROGRESS.md` with one line, `styles.css` without a word moving. The reason is not that the budget has run out.
Nor is the information obsolete (the 5 hard code colours cited and `--st-now` undefined **are all verified as true**).
The reason for this is that two of its deliveries are not semantic:

**"Let flowchart dots follow Settings  → Board's colour" -- unable to do so.**
`.now` This catch from `nodeStop()` (`src/lib/phases.tsx:23`) returns
`StopState = "done" | "now" | "todo" | "risk"` Four **Chart** Status by scheduling date and risk
Count it out. 6 user status is more than one-on-one on top of it (`in_progress`, `waiting`, `blocked`).
Even `accepted`, as long as `latestStart` is passed, it's all mapd into `now`. So it doesn't exist.
"The corresponding state colour." And the value of the flow chart is to show the time-axis position and to show the status set by the person in charge
It'll lose its most useful information.

**"remove the synonyms of brand colour and state color" -- shouldn't be done.**
That's not a double definition. It's two different systems of restraint:

| | `--late / --good / --warn` | 6 status color |
| --- | --- | --- |
| Where do you use it? | **text on light colour background** (place 5) + border + background | **white word** on color plate |
| Dark Theme | **has** standalone value ( `#f08a80` `#6fcf8a` `#e7a74a`）| **No** is user data |

Actual contrast (white presses on colour / when text with rice `#fbfaf7`):

| Meaning | Brand token | White words on it. | It's a text. | Status Color | White words on it. | It's a text. |
| --- | --- | --- | --- | --- | --- | --- |
| It's late. | `#b42318` | 6.57 | 6.30 | `#c0362f` | 5.51 | 5.28 |
| Completed | `#1a7f37` | 5.08 | 4.87 | `#237a42` | 5.34 | 5.11 |
| Note/ongoing | `#8f5206` | 6.22 | 5.96 | `#b25c00` | 4.75 | 4.55 |

Merge will break down the dark theme: `--late` for the dark theme is `#f08a80`, with white on it only.
**2.43:1**。The status color does not have a dark version available -- they are values stored by the user and cannot be changed with the theme.

**Lessons have been written in `docs/NIGHT_MODE.md` 7c Article 5.**

## We're not in line yet.

| Matters | Why aren't you in line? |
| --- | --- |
| `Handoff.tsx:61` 3 status color of the inner connection | Shouldn't you follow the user's status color is a semantic matter? |
| Clear the unenabled DeepSeek vendor path | Touch AI route, IRB key code for real estate during submission |
| S6 / S9 / M3 | You need to change your file, install your dependency or do your merge. **Night Mode**  |
| M2b of PR #6 returns | `e2e/today.spec.ts:8` Hanging on desktops and mobile phones; Night Mode locked in `feat/ai-night-mode`I can't fix it. |
