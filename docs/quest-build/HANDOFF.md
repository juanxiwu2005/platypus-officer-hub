# Handoff: building Mission: Speaker Night (written 2026-11-22 by Claude)

You are the **planner and reviewer** for this build. You split work into task cards, run or supervise ASU AIR coding agents through OpenCode on Juanxi's Mac, check their output, and report to Juanxi. Follow the phases below in order. Do not skip a gate.

Talk to Juanxi in simple Chinese, one step at a time; he does not write code. Write everything in the repository in English (see `CLAUDE.md`, `CONTRIBUTING.md`, `npm run lint:english`).

## 1. What has been decided

| Date | Decision (Juanxi) | Where |
| --- | --- | --- |
| 2026-11-21 | New officers get a game-based onboarding; the "40+ page document" is the 2026–27 Student Club and Organization Handbook (ASU-R-004) | [onboarding plan](../feedback-fix/ONBOARDING_QUEST_PLAN_2026-11-21.md) |
| 2026-11-21 | Store per-decision results and escalated questions; the president sees only an aggregate summary, possibly hidden | same |
| 2026-11-21 | Teach event planning through an interactive game inspired by Google AI Quests *Market Marshes*; teach the stricter rule when sources conflict (Event Registry 30 days, speaker paperwork 6 weeks) | same |
| 2026-11-21 | The game must be an interactive film with a mission-control HQ, strong interaction and little text; no multiple-choice cards, no stickers | [design v3](../feedback-fix/QUEST_GAME_DESIGN_V3_2026-11-21.md) |
| 2026-11-21 | Phase 3 data collection has ended; Preview 14 was merged into `main` | `docs/PROGRESS.md` top entry |
| 2026-11-22 | Use free ASU AIR models through OpenCode for most coding; split work small enough for their limits; start with a trial tonight | this kit |

**Design decisions approved by Juanxi on November 22, 2026:** all nine recommended choices, including the original names/cast, warm vector-style isometric direction, 55–60 minutes over two days with all 33 rules, both venue accessibility check groups, muted/captioned sound, untimed emergency by default, the prologue/HQ/missions-2-and-5 sample, later /quest-only 2–20-second cutscene tokens, and true 3D only for Venue Builder. See [decision register](P3_DESIGN_DECISIONS.md). Juanxi accepted the six [static storyboards](storyboards/p3-v1/README.md) on November 22 and explicitly authorized P4 foundation implementation in the same style/cast. No dependency, token or game code is implemented by P3.

The rule library content is fixed: 33 scored rules with exact archive quotes and line numbers in [v2 spec section 3](../feedback-fix/QUEST_GAME_SPEC_2026-11-21.md). Every quote was checked against `03_Full_Rules_Archive.txt`. Do not invent rules; add new ones only with an exact quote, record ID and line.

## 2. Roles

| Who | Does | Never does |
| --- | --- | --- |
| Juanxi | Approves scope, storyboards and merges; plays previews; starts runs on his Mac | Writes code |
| You (planner/reviewer) | Writes task cards with exact data; runs the checks; reviews diffs and screenshots; decides retry or re-split; reports | Hands an ASU AIR agent a task that needs investigation or design |
| ASU AIR coder (OpenCode `backend-coder`) | One card per run: edit the listed files, run the listed check, write a short handoff | Commit, push, edit protected files, read large project docs, install packages |
| ASU AIR critic (OpenCode `code-critic`, a different model family) | Read-only review of the diff against the card: `APPROVED` or `REJECTED` with reasons | Edit files |
| ASU AIR vision checker (later phases) | Look at Playwright screenshots against a checklist | Judge anything not on the checklist |

## 3. Phases and gates

| Phase | Goal | Done by | Exit gate |
| --- | --- | --- | --- |
| **P0 Trial (tonight)** | Prove one card can go card → coder → checks → critic → commit on Juanxi's Mac; compare 2–3 coder models on the same card | You + ASU AIR | `TRIAL_LOG.md` filled; Juanxi sees the result; best coder/critic pair chosen |
| P1 Pipeline fixes | Fix the known Night Mode controller problems (section 6) and point it at a short brief and a configurable branch | A strong model in a normal session (needs Juanxi's OK to change `scripts/` and `opencode.json`) | `--doctor` passes; one card runs end to end through the controller |
| P2 Rule library | All 33 scored rules as typed data with tests (owner-requested cards P0-01 through P0-07; pipeline work stays separately gated) | ASU AIR | Tests pass; every quote matches the archive |
| P3 Storyboards | Six static storyboard images (design v3 section 10 step 1) | Strong model | Juanxi approves the look |
| P4 Foundation | `/quest` route, scene and interaction interfaces, one complete reference interaction (Countdown Wall), art style kit | Strong model | Reference interaction playable on a preview; tests pass |
| P5 Playable sample | Prologue, HQ, Mission 2, Mission 5 (Venue Builder) | ASU AIR cards copying the reference, plus a strong model for the Venue Builder geometry and any 3D | 3–5 real officers play it; Juanxi accepts |
| P6 Full game | Missions 1, 3, 4, 6, 7, credits, day-3 retest, president summary | Mostly ASU AIR | Juanxi accepts on a preview |
| P7 Sequels and polish | Five sequels, accessibility pass, motion review | Mostly ASU AIR | Juanxi accepts; merge needs his explicit approval |

**November 22, 2026 status:** P1 passed its exit gate on `feat/onboarding-quest` (Draft PR #19): doctor passed, one GLM 5.3 / DeepSeek card completed through exact-SHA CI at `a9bee77`. See [P1_PIPELINE.md](P1_PIPELINE.md) and [TRIAL_LOG.md](TRIAL_LOG.md). The 33-rule typed library is complete; all nine design choices are approved, and the six P3 frames have owner visual acceptance and the P4 reference is implemented and locally playable with passing local tests. Draft PR #19 has a successful Netlify deployment, but hosted browser acceptance requires an invited account because Team protection is enabled. Final exact-head CI receipts are kept in the local delivery; see P4_FOUNDATION.md and TRIAL_LOG.md. Juanxi accepted the P4 local play and explicitly authorized P5 on November 22. P5 is in progress under GLM 5.3 coding / DeepSeek review with a strong planner for native venue geometry. The P5 officer-play and owner sample acceptance gates remain pending. No merge is authorized.

Use branch `feat/onboarding-quest-trial` for P0 and `feat/onboarding-quest` from P1 on (AGENTS.md naming). Open a draft PR only when there is something to preview.

## 4. Tonight: P0 runbook

Run on Juanxi's Mac, in the repository, with OpenCode and `ASU_AIR_API_KEY` already set up in his terminal. Do not use the Night Mode controller tonight: it is locked to the old branch and has the problems in section 6.

1. **Prepare.**
   `git fetch origin` → `git switch -c feat/onboarding-quest-trial origin/claude/fervent-thompson-e2j5u2` → `npm ci` → `npx vitest run src/reminders` (sanity check, must pass).
2. **Check the agents.** `opencode debug agents` and `opencode models`. Record which model `backend-coder` and `code-critic` use and the exact model IDs (with any provider prefix). Confirm no agent has a code-execution tool other than the shell allowlist (Night Mode §1 problem 2); if one does, stop and tell Juanxi.
3. **Confirm the flags.** `opencode run --help`. You need a way to choose the model per run (usually `--model <provider>/<model-id>`). If there is none, switch models in the user-level OpenCode config between runs.
4. **Run card P0-01 with the first coder model.** Build the prompt from [prompts/coder.md](prompts/coder.md) with the card path filled in, then run
   `opencode run --auto --agent backend-coder --model <id> --title "P0-01 <model>" "<prompt>"`.
   Time it. If OpenCode shows step or token counts, record them.
5. **Check it yourself.** `npx vitest run src/quest`, `npx tsc --noEmit -p tsconfig.json`, `npm run lint`. Compare the data against the card line by line.
6. **Critic.** `git add -N src/quest` → save `git diff` → run [prompts/critic.md](prompts/critic.md) with the diff pasted in, using `code-critic` on a model from a different family than the coder.
7. **Record** everything in `TRIAL_LOG.md`. If all checks pass and the critic approves, commit with an English message, for example `[Quest P0][ASU AIR glm-5-3] Add rule library for mission 1`, and push the trial branch.
8. **Bake-off (if time allows).** For each extra coder candidate: `git worktree add ../pq-<model> origin/claude/fervent-thompson-e2j5u2`, `npm ci` there, run P0-01 with that model, check, record, then remove the worktree. Do not push bake-off copies. Suggested candidates in [DECOMPOSITION.md](DECOMPOSITION.md) section 5.
9. **If time remains**, run card P0-02 on the trial branch with the winning model.
10. **Report to Juanxi in Chinese**: which models worked, how long each took, what failed and why, what you recommend for P1.

**Stop at once and report** if an agent tries to edit a protected file, reads `docs/PROGRESS.md`, runs more than 20 minutes on one card, or the checks fail twice on the same card. Never "fix" a failing run by loosening a test.

## 5. Hard rules (summary; AGENTS.md wins on any conflict)

- Never change, push to, merge or deploy `main` without Juanxi's explicit approval.
- No secrets, research data, participant information or real member data in cards, prompts or commits. Repository code and the public ASU rule text may be sent to ASU AIR.
- Dates in the product come only from the rule engine (`src/engine/schedule.ts`); AI never writes a date into product data.
- Agents may not edit: `.env*`, `.git/**`, `.gitignore`, `AGENTS.md`, `docs/NIGHT_MODE.md`, `package.json`, `package-lock.json`, `opencode.json`, `scripts/night-mode.mjs`, `.nightmode/**`, `.github/**`, `netlify.toml`.
- New dependencies (for example Three.js) are added only in a normal session by a strong model, with Juanxi's OK.
- UI copy is English, uses design tokens only, and follows the motion rules in AGENTS.md; new cutscene duration tokens need Juanxi's approval.
- Keep the rule library exact: a quote is a verbatim substring of the archive line it cites (compare with whitespace normalized; the archive contains non-breaking spaces, for example line 2143).

## 6. Known pipeline problems (fix in P1)

1. **Context overload (new, 2026-11-22):** the controller tells every agent to read `AGENTS.md`, `docs/PROGRESS.md`, `docs/PRODUCT_PLAN.md`, `docs/RULES.md` and `docs/NIGHT_MODE.md` first. `docs/PROGRESS.md` alone is about 356 KB (roughly 90K tokens); the set is roughly 118K tokens, nearly all of GLM 5.3's 128K window. Replace that list with [AGENT_BRIEF.md](AGENT_BRIEF.md) plus the card.
2. `NIGHT_BRANCH` is hard-coded to `feat/ai-night-mode`; make it configurable.
3. CI wait can report failure before GitHub registers checks (Night Mode §1, 2026-10-29 item 1).
4. `review.patch` may miss earlier commits (Night Mode §1 item 1); new untracked files also need `git add -N` before diffing.
5. The queue leaves a dirty workspace after a failed task with a commit (2026-10-29 item 2).
6. `night-queue.sh` breaks on macOS bash 3.2 at the `${wip}` variable (2026-10-29 item 3).
7. The critic sometimes cannot read files and rejects by default; pass the diff inline.
8. A code-execution tool may bypass the shell allowlist; verify with `opencode debug agents` and deny it.

## 7. When you finish a session

Add a short English entry at the top of `docs/PROGRESS.md` (task, assistant, date, baseline, result, next step) and fill `TRIAL_LOG.md`. Note that the thesis backup synchronization is pending unless you synced it.
