# How to split the work for ASU AIR models

ASU AIR models are free for ASU students but smaller and less reliable than the strongest commercial models. The plan gets the most from them by giving them **many small, fully specified, mechanical tasks** and keeping design, investigation and review with a strong model.

## 1. The limits we design around

| Limit | Value | Source |
| --- | --- | --- |
| Context window | 128K (`glm-5-3`, `gpt-oss-120b`); 256K for the other six configured models | ASU AIR model list, 2026-11-22 |
| Steps per run | 300 | `opencode.json`, Night Mode §7b |
| Time per command | 45 minutes | `scripts/night-mode.mjs` |
| Shell | Allowlist only: read-only git, `ls/cat/head/tail/wc/grep/rg/find`, `npm test/run build/run e2e/run check/run lint`, `npx playwright test/tsc/vitest`. No `node`, `curl`, `python`, no `&&` | Night Mode §7b |
| Protected files | See HANDOFF §5 | `opencode.json` |
| Delegation | Sub-agent delegation fails ("Subagent session not found"); runs are sequential | Night Mode §2 |
| Required reading | Today ~118K tokens of project docs (fix: read only `AGENT_BRIEF.md`) | HANDOFF §6 |

The practical limit is not the window size but **how much the model can keep straight**. Long contexts make smaller models lose instructions, re-read files and drift. So we budget context far below the window.

## 2. Five levels

| Level | Example | Size limit | Who plans it | Gate |
| --- | --- | --- | --- | --- |
| L0 Program | Mission: Speaker Night | — | Juanxi + strong model | — |
| L1 Phase | P5 Playable sample | 1–2 weeks | Strong model | Juanxi accepts on a preview |
| L2 Work package | "Mission 2 interactions" | One night's queue: 4–8 cards | Strong model | All cards pass; reviewer checks the preview |
| L3 Task card | "Add the Handoff Tray component" | One run: ≤ 3 files, ≤ 150 changed lines, ≤ 60 estimated steps, ≤ 20 minutes, one verification command | Strong model writes it with exact data | Checks pass + critic `APPROVED` |
| L4 Step | "Create `src/quest/ruleLibrary.ts` with this type" | One action group: read one file region, or edit one file, or run one command | Written into the card as a numbered list | The next step can start |

**Split rule:** if a card needs the word "also", touches a fourth file, needs the agent to decide a design question, or is estimated over 60 steps (20% of the 300-step budget, leaving room for one repair), split it.

## 3. Context budget per run

Keep everything the agent must read under **25% of its window**: about 30K tokens for 128K models and 60K for 256K models. In practice:

| Item | Budget |
| --- | --- |
| `AGENT_BRIEF.md` | ≤ 2K tokens |
| The card (including exact data) | ≤ 4K tokens |
| Files the card lists under "Read" (prefer line ranges) | ≤ 15K tokens |
| Everything else | Forbidden; the card lists large files under "Do not read" |

Tactics:
- **Give data, not research.** Put exact values, quotes, types and file paths in the card. The agent copies; it never searches the archive or the docs.
- **Pattern first.** A strong model writes one complete reference implementation; later cards say "copy the structure of `X.tsx`, lines A–B".
- **Data over code.** Story scripts, rule cards and sequel variations live in typed data files, so most cards are data entry with a schema test.
- **Test as the contract.** Each card names the one command that proves it is done (for example `npx vitest run src/quest`).
- **Short handoff.** The agent ends with at most 10 lines: files changed, command result, anything it was unsure of and left alone.

## 4. Card rules (from Night Mode §7c plus new ones)

1. Investigation and design are done before the card is written; the card is mechanical.
2. State only the desired result, not the file's current state.
3. Do not ask the agent to verify the baseline after it edits.
4. List large files the agent must not read (always: `docs/PROGRESS.md`, `docs/PRODUCT_PLAN.md`, `src/styles.css`, `src/data/store.tsx`, the policy archive).
5. Allow an escape route: anything uncertain is left unchanged and noted in the handoff.
6. Check semantic feasibility before writing the card: does the deliverable make sense in the current data model?
7. One card, one thing.
8. For renames or data-only cards, say whether new tests are required.
9. **New:** every quote copied into data must be a verbatim substring of the cited archive line (whitespace-normalized).
10. **New:** retry policy: one repair run with the failure log; if it fails again, the planner re-splits the card instead of retrying.

## 5. Model routing (configured models; validate in the P0 bake-off)

| Role | First choice | Alternatives to test | Why |
| --- | --- | --- | --- |
| Coder | `glm-5-3` (the only model with an end-to-end Night Mode success, 2026-10-28) | `north-mini-code`, `deepseek-v4-1-flash` | 256K context and code focus may hold instructions better; measure, don't assume |
| Critic | a different family from the coder: `deepseek-v4-1-flash` if the coder is GLM | `gpt-oss-120b`, `beam-1-0` | Independent errors; read-only |
| Vision checker (screenshots) | `glm-5-3-flash` | `qwen38-27b` | Both declare native image input |
| Short English copy within word budgets | `muse-spark-open` | — | Already the product's choice for short text |

Not yet configured but worth a later bake-off for coding: `qwen3-coder-next`, `kimi-k2-7-code`, `devstral2-123b`, `minimax-m3`. Add them to the user-level OpenCode config only after P0, one at a time.

Special-purpose models (outside OpenCode; need a separate, reviewed script in a normal session):

| Model | Possible use | Condition |
| --- | --- | --- |
| `flux-2`, `qwen-image-21` | Painted scene backgrounds or storyboard drafts | Every image reviewed; no real logos or identifiable people; record prompts |
| `trellis-2` | Image-to-3D furniture for a 3D Venue Builder | Experimental; check output size and quality first |
| `wan-2-2` | Short video cutscene experiments | Only if Juanxi chooses video cutscenes; character consistency is a known risk |
| `chatterbox`, `orpheus-3b`, `qwen3-tts-*` | Optional voice lines (sound is off by default) | Captions always present |
| `qwen3-embedding-*`, `embeddinggemma-2` | Later: retrieval for Pip over the handbook | Product AI rules apply (Pip answers only from cited sources) |

## 6. Getting the most out of free runs

- **Measure every run** in `TRIAL_LOG.md`: model, card, minutes, steps/tokens if shown, pass/fail, critic verdict, rework count. After ten cards, keep the model pair with the best pass rate per minute.
- **Batch similar cards** in one night (all data cards, then all component cards) so a failure pattern shows up once and the planner fixes the card template, not each card.
- **Run while asleep, review in the morning.** Free models are slower; the queue runs overnight and the strong model's time is spent only on review and new cards.
- **Escalate early.** A card that fails twice goes back to the planner. A design question in a handoff goes to Juanxi.

## 7. Card template

```markdown
# <ID> <short title>

Phase: P_ · Work package: _ · Estimated steps: _ · New tests required: yes/no

## Goal
One sentence.

## Read (only these)
- docs/quest-build/AGENT_BRIEF.md
- <file>:<line range>

## Do not read
docs/PROGRESS.md, docs/PRODUCT_PLAN.md, src/styles.css, src/data/store.tsx, netlify/lib/policy-archive.mts, <others>

## Steps
1. …
2. …

## Exact data
<types, values, quotes, copy text>

## Done when
- `<one command>` passes
- <observable result>

## If unsure
Leave it unchanged and say so in the handoff.

## Handoff (write at the end, ≤ 10 lines)
Files changed · command and result · anything left unchanged and why
```
