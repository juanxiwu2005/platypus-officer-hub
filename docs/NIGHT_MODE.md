# Night Mode V1 — Multi-agent automated development manual

Night Mode lets ASU AIR agents complete an **already approved, clearly scoped** task on a protected feature branch, with local tests, independent review, and GitHub CI. It does not merge `main` or deploy Production.

## 1. Current status (2026-10-28 snapshot)

| Item | Verified fact |
| --- | --- |
| GitHub repository | `juanxiwu2005/platypus-officer-hub` |
| Production branch | `main`, baseline `4dc55ba` (none of the changes covered here is in `main` yet) |
| Automated-development branch | `feat/ai-night-mode`, **with DP5 merged in** (`integration/dp3-dp4-merge`), so it includes all S1/S2/S3 and M1 work |
| Human gate | Draft PR [#7](https://github.com/juanxiwu2005/platypus-officer-hub/pull/7), preview https://deploy-preview-7--platypus-officer-hub.netlify.app |
| Controller | `scripts/night-mode.mjs` (single task), `scripts/night-queue.sh` (queue; see 7 d) |
| Project permissions | `opencode.json` |
| Runtime | Node 22; GitHub CLI authenticated; OpenCode; local dependencies installed |
| Main coder | `backend-coder` (ASU `glm-5-3`). Previously `orchestrator`, which cannot edit files; see the change log in section 2 |
| Budget | 300 steps / 45 minutes / 5 cycles; see **7 b Runtime budget card** |
| **End to end** | **First complete success on 2026-10-28**: coding → `npm run check` → independent Critic `APPROVED` → commit/push → GitHub CI `pass` (7 minutes 3 seconds) → Deploy Preview → PR comment `READY_FOR_CLAUDE` |
| Branch tip | `55949b8` (T1 z-index landed, recovered from that night's commit stack on 2026-10-28) |
| Task backlog | `docs/night-tasks/`; filenames `N1`…`N6` give execution order; see its README |
| Incident backup | `backup/2026-10-28-queue` retains the entire commit stack from the night of 2026-10-27; `wip/T2-radius` and `wip/T3-fontscale` are unverified partial work |

This is a dated snapshot, not a permanent promise. Run `--doctor` again before every run, and recheck the PR and CI afterward.

### Two problems found after the first end-to-end success on 2026-10-28 (neither fixed yet)

1. **`review.patch` may be incomplete.** If changes were committed before the current cycle began, the controller's
   `review.patch` contains only additions from this cycle, so Critic receives an incomplete diff.
   This time Critic noticed and read the workspace directly, so its conclusion remained correct—**but that was luck, not design**.
   Critic's own recommendation: the controller should ensure `review.patch` always contains the actual code diff for auditability.

2. **A code-execution entry point may bypass the shell allowlist.** During this run, `code-critic` tried to use an
   `execute` tool to run `require('child_process').execSync(...)`, while the `bash` allowlist in `opencode.json`
   governs only the `shell` action. It then completed the work with Read/Grep,
   but **whether this path was actually blocked has not been verified**.
   → Next time, inspect `opencode debug agents` for executable actions beyond `shell`
   (such as `execute`, `code`, `run`), and deny any found.

### 2026-10-29 addendum: problems found after N1 succeeded (recorded only, not fixed; Juanxi-approved maintainer changes, no `scripts/` changes)

1. **`waitForCi` in `scripts/night-mode.mjs` can falsely report CI failure.** It runs
   `gh pr checks --watch` immediately after pushing; before GitHub registers checks, "no checks reported" is treated as failure.
   Meanwhile `latestCiFailure` retrieves **the previous successful run** as the failure reason (logging "GitHub CI success.").
   N1 actually passed CI; this misclassification caused two needless rework cycles.
   → Fix direction: after pushing, wait until checks appear (poll until at least one exists), then watch; only use runs with conclusion failure as failure reasons.
2. **`scripts/night-queue.sh`: if a failed task already left a commit, remaining uncommitted changes are not handled**,
   leaving a dirty workspace that causes the next task's doctor to fail for an “unclean workspace.”
3. **`scripts/night-queue.sh` line 137, `"$wip\uff08"` (escaped original opening parenthesis):** macOS's built-in bash 3.2 treats the bytes of the Chinese parenthesis as part of the variable name,
   producing `wip?: unbound variable` under `set -u` and exiting the entire queue. Fix: use `${wip}`.
4. **The code-critic runtime often cannot read files**, forcing `REJECTED` (rather than indicating a real code defect).

## 2. Responsibilities

| Layer | Responsibility | Cannot do |
| --- | --- | --- |
| Juanxi | Approve task scope; final acceptance; decide whether to merge | No coding required |
| Claude / human reviewer | Check diff, preview, and risks after `READY_FOR_CLAUDE` | Treat automated passage as merge approval |
| Coding agent (`CODING_AGENT`, currently `backend-coder`) | Read task, edit source/tests itself, run allowlisted tests | Commit, push, merge, change protected files, or access outside-project directories, secrets, deployment or dependency configuration |
| `code-critic` | Independent read-only review; output `APPROVED` or `REJECTED` | Modify files |
| Night Mode controller | Self-check, full tests, review patch, at most three rework cycles, commit, push, wait for CI, PR comment | Merge or deploy Production |
| GitHub CI | Reinstall dependencies on Ubuntu 24.04 / Node 22 and run build, unit, and Playwright tests | Call real paid/ASU models or prove model-response quality |

### 2026-10-28 change: main coder switched from `orchestrator` to `backend-coder`

**Reason (measured, not inferred):** two runs on the night of 2026-10-27 stopped during coding with the same error:

```
✗ Dead CSS cleanup + Empty swap failed
Error: Subagent session not found: ses
```

`opencode debug agents` shows `orchestrator` permissions `edit: * → deny` and `shell: * → deny`,
and its system prompt explicitly says “you never write code, edit files or run commands yourself.”
In other words, **it is designed only to delegate**, and delegation always fails on this machine (subagent sessions cannot be created;
`ses` in the error is a truncated session ID). Task-file changes cannot work around this.

**Changed:** added constant `CODING_AGENT` in `scripts/night-mode.mjs`, used for initial coding and rework
(previously lines 298 and 353); default `backend-coder` (mode `all`, usable as a primary agent,
model ASU `glm-5-3`). Both prompts replace “delegate” with “do it yourself; do not delegate.”

**Unchanged:** the controller still invokes `code-critic` separately at line 341; **the independent-review gate remains intact**.
Protected-file restrictions, the nine-command shell allowlist, full `npm run check`, three-cycle limit, GitHub CI,
and never merging/deploying—all unchanged.

**Tradeoff:** no multi-agent division of labor (which did not work here anyway); `backend-coder` has a backend-focused system
prompt, so frontend/CSS tasks are outside its specialty, compensated for with specific task instructions. This is a workaround.
Long term, repair OpenCode delegation or add a general-purpose primary coding agent in user-level configuration;
then only the `CODING_AGENT` constant needs changing.

**Approved by:** Juanxi, 2026-10-28, explicitly requested by a human as required by section 10.

### 2026-10-28 change: expand budget without expanding safety boundaries

**Reason:** after switching to `backend-coder`, coding actually started (it read files, ran `git status`,
and used Grep itself), but two consecutive runs still stopped during coding because of **budget**, not safety:

```
"backend-coder": { "steps": 15 }
```

The controller prompt requires reading `AGENTS.md`, `PROGRESS.md`, `PRODUCT_PLAN.md`,
`RULES.md`, `NIGHT_MODE.md`, and `TASK.md` before starting—six steps gone, leaving nine for work. Simply replacing 14 handwritten empty states
with `<Empty>` requires over 20 steps to read and edit each file. **The task cannot fit into 15 steps.**

**Changed:**

| File | Change | Why it is not a safety issue |
| --- | --- | --- |
| `opencode.json` | Five coding agents' `steps`: 15 → **300** | Steps control how much work is possible, not which actions are allowed |
| `opencode.json` | Add read-only/test shell commands: `ls` `cat` `head` `tail` `wc` `grep` `rg` `find` `git grep` `git ls-files` `npx tsc` `npx vitest` `npm run lint` | All read-only or project tests; no file writes, networking, or system changes |
| `scripts/night-mode.mjs` | `COMMAND_TIMEOUT_MS`: 20 → **45 minutes** | 300 steps with 20 minutes would still time out, negating the increase |
| `scripts/night-mode.mjs` | `MAX_CYCLES`: 3 → **5** | Rework count, not permissions |

**Explicitly unchanged (every safety boundary preserved):**

- Protected-file prohibition: `.env*`, `.git/**`, `.gitignore`, `AGENTS.md`, `docs/NIGHT_MODE.md`,
  `package.json`, `package-lock.json`, `opencode.json`, `scripts/night-mode.mjs`,
  `.nightmode/**`, `.github/**`, `netlify.toml`
- Arbitrary commands such as `node` / `curl` / `wget` / `brew` prohibited (allowlist still defaults to deny)
- `external_directory` still deny
- Agents cannot commit, push, merge, or deploy
- Independent `code-critic` review
- Full `npm run check`
- GitHub CI
- Never automatically merge `main` or deploy Production

**Mandatory document-reading prompts were retained.** Removing them to save steps was considered and rejected by Juanxi, correctly:
every `opencode run` is a fresh session with no memory of the previous one, so the model must read the rules itself.
The root cause was too few steps, not too much documentation.

**Tradeoff:** 300 steps + 45 minutes may consume more ASU quota per run and run longer.
This is deliberate: let it finish once rather than repeatedly interrupting halfway with nothing produced.

**Approved by:** Juanxi, 2026-10-28.

---

Current agent/model mappings come from user-level OpenCode configuration and may change. The project relies only on role names, not permanent model availability. Inspect actual runtime mappings with:

```bash
opencode debug agents
```

The main mappings from 2026-10-27 are recorded in root `AGENTS.md` section 0.

## 3. Complete flow of one run

```text
Juanxi approves TASK.md
        ↓
doctor checks repository / branch / Draft PR / Node / permissions / dependencies
        ↓
Coding agent (backend-coder) → directly edits code and tests → uncommitted changes
        ↓
npm run check (build + unit + desktop/mobile Playwright)
        ↓
Independent code-critic reviews diff read-only
        ↓
Failure: actual errors returned to coding agent, at most 3 total cycles
        ↓
Pass: controller commit + push
        ↓
GitHub CI rechecks
        ↓
Pass: PR comment READY_FOR_CLAUDE
        ↓
Claude + Juanxi inspect manually; only Juanxi can approve merging
```

Failure at any stage stops the run or enters bounded rework. It never automatically bypasses tests, weakens assertions, changes branches, merges, or deploys.

## 4. How networking and secrets work

- OpenCode calls ASU AIR models through local environment variable `ASU_AIR_API_KEY`. The key value never enters tasks, prompts, logs, Git, or PRs.
- Agent shell permissions default to deny. Agents can run only allowlisted build, test, Playwright, and read-only Git commands.
- Therefore agents **cannot use shell as an arbitrary network terminal**, run `curl`, `wget`, or `brew` themselves, or access files outside the project.
- The controller is separate from the coding agent. It invokes `git` and `gh` to commit, push, inspect PRs, and wait for CI.
- “Can call ASU AIR” does not mean “can freely browse the internet.” If a task needs external material, a human must explicitly approve sources and scope first, and verified inputs must be prepared outside Night Mode.
- The product site's AI is controlled by Netlify `AI_PRESET`, `AI_MODEL`, `AI_API_KEY`, etc., independently of Night Mode's local `ASU_AIR_API_KEY`.

## 5. Startup requirements

The controller rejects unsafe startup conditions:

- Current directory must be this repository.
- Current branch must be exactly `feat/ai-night-mode`.
- Workspace must be clean.
- `origin` must be `juanxiwu2005/platypus-officer-hub`.
- An open Draft PR must exist from that branch to `main`.
- Node major version must be 22.
- `git`, `gh`, `node`, `npm`, and `opencode` must be available; GitHub CLI must be authenticated.
- `node_modules` must already exist; Night Mode does not install or upgrade dependencies automatically.
- `opencode.json` must default to denying external directories and unknown shell commands; key permissions must pass dynamic checks.

If OpenCode is unavailable noninteractively but works in the user's terminal, ensure its executable directory is on `PATH`. Current location: `~/.opencode/bin/opencode`; do not put the API key into commands.

## 6. Safety boundaries

- Only repository `juanxiwu2005/platypus-officer-hub` and branch `feat/ai-night-mode` are allowed.
- Tasks use fictional demo data only; no research materials, participant information, or real membership data.
- Agents must not read or modify `.env*`, `.git/**`, `.github/**`, `.nightmode/**`, dependency files, Netlify settings, or Night Mode's own safety files.
- Protected files include `AGENTS.md`, `docs/NIGHT_MODE.md`, `opencode.json`, `scripts/night-mode.mjs`, `package*.json`, and `netlify.toml`.
- The controller rechecks protected paths before committing; protected-file changes block the commit.
- Commands have a 20-minute limit per cycle; local verification or CI failures allow at most 3 total cycles.
- Never automatically merge, modify `main`, or trigger Production deployment.

## 7. Running each time

In the repository directory:

```bash
mkdir -p .nightmode
cp docs/NIGHT_MODE_TASK_TEMPLATE.md .nightmode/TASK.md
nano .nightmode/TASK.md
```

Tasks must clearly specify Goal, Files, Constraints, and Done means. Do not include API keys, research materials, or participant information.

First run the read-only self-check:

```bash
node scripts/night-mode.mjs --doctor
```

Start only after `DOCTOR PASS`:

```bash
node scripts/night-mode.mjs --task-file .nightmode/TASK.md
```

## 7 b. Runtime budget card (measured 2026-10-28)

**Read this card before writing any task file.** Four of five consecutive failures on the night of 2026-10-27 were caused by
“writing instructions for an unmeasured runtime”—the task required more than the agent could actually do.
This card records those measurements.

| Item | Current value | Where to change |
| --- | --- | --- |
| Steps per run | **300** | Each agent's `steps` in `opencode.json` |
| Command timeout | **45 minutes** | `scripts/night-mode.mjs`, `COMMAND_TIMEOUT_MS` |
| Rework cycles | **5** | `scripts/night-mode.mjs`, `MAX_CYCLES` |
| Main coder | **`backend-coder`** (ASU `glm-5-3`) | `scripts/night-mode.mjs`, `CODING_AGENT` |
| Fixed startup overhead | **About 6 steps** (controller requires AGENTS / PROGRESS / PRODUCT_PLAN / RULES / NIGHT_MODE / TASK first) | Controller prompt |

**Allowed agent shell commands (everything else denied):**

```
git status*   git diff*   git log*   git show*   git branch --show-current*
git grep*     git ls-files*
npm test*     npm run build*   npm run e2e*   npm run check*   npm run lint*
npx playwright test*   npx tsc*   npx vitest*
ls*  cat*  head*  tail*  wc*  grep*  rg*  find*
```

**Cannot run** `node`, `npx` (except the three above), `curl`, `wget`, `brew`, or `python`,
and **cannot run compound commands** (`&&` is rejected; split into individual commands).

**Agents cannot edit:** `.env*`, `.git/**`, `.gitignore`, `AGENTS.md`, `docs/NIGHT_MODE.md`,
`package.json`, `package-lock.json`, `opencode.json`, `scripts/night-mode.mjs`,
`.nightmode/**`, `.github/**`, `netlify.toml`.

→ Therefore **tasks requiring dependency installation, CI changes, or AGENTS.md edits cannot use Night Mode** (e.g., adding stylelint/eslint,
finalizing documentation). Use ordinary sessions for those.

---

## 7 b-2. ⚠️ Nobody should push this branch while the queue is running

**The 2026-10-28 lesson cost an entire night's seven tasks.**

T1 actually **succeeded completely** that night: 611 unit tests + 276 page tests passed,
`code-critic` returned `STATUS: APPROVED`, and the controller committed. Then:

```
! [rejected]  feat/ai-night-mode -> feat/ai-night-mode (fetch first)
NIGHT MODE STOPPED: git push origin feat/ai-night-mode failed with exit code 1
```

Cause: **Claude pushed a documentation commit to the same branch while the queue was running.** Local was behind remote,
so push was rejected; the controller treated that as fatal and failed the task. Every subsequent task hit the same wall.

### Accounting (after checking the local commit stack on 2026-10-28)

Of 7 tasks, **2 passed every gate** (T1 z-index, T6 spacing), both marked failed only because
push was rejected—`.nightmode/done/` was empty while their task files sat in `failed/`.
T2 and T3 completed their work but did not pass gates; T4's task itself was wrong (7 c item 7);
T5 and T7 were **correctly** skipped for unmet dependencies.

Recovery: those commits remained on the local branch; `cherry-pick` onto the updated remote tip,
rerun full checks, and push on passage. T1 was recovered this way (611 unit + 276 e2e, matching the original run).
T6's cherry-pick conflicted—its diff was based on unverified T2/T3 changes,
so removing that foundation made it inapplicable; it must be rerun.

**Thus the old queue script's practice of committing partial work to the working branch did more than contaminate the next task's foundation:
it also prevented successful tasks from being recovered independently.** The new version puts partial work on `wip/<task-name>` side branches.

### Rules

1. **Once the queue starts, push nothing to `feat/ai-night-mode`**, including documentation-only commits.
   Wait until the queue ends, or push to another branch.
2. Before starting, `git pull` so local matches the latest remote.
3. Cloud sessions (Claude) need particular care: they cannot see local activity. **Tell them before starting.**

### Controller hardened too (2026-10-28)

A rejected push no longer immediately fails. It now: `fetch` → `rebase` onto the new remote tip →
**rerun full checks** (tests passed on the old foundation; a changed foundation requires revalidation) → push again.

A rebase conflict or failed revalidation stops execution, **leaving commits in place for a human**, never force-pushing
or pushing code unverified at its final location.

---

## 7 c. Writing task files (lessons learned)

1. **Humans investigate; Night Mode makes mechanical changes.**
   “Find unused CSS, then delete it” spends all 300 steps investigating. Humans should investigate first
   and provide the list in the task. Two failures on the night of 2026-10-27 came from this.

2. **Do not describe files' current state in the task.**
   “styles.css has 718 lines” led the agent, after reducing it to 626, to reread the task, think something was wrong,
   and investigate git instead of continuing. State only the desired result.

3. **Explicitly prohibit going back to “verify the baseline” after making changes.** Put this directly in Constraints.

4. **Do not require reading unused large files.** If a task need not change `styles.css`, explicitly say “Do not read styles.css.”

5. **Human-provided lists can be wrong—allow the agent to question them.**
   My dead-code list incorrectly included `b1/b2/b3`: `Team.tsx` dynamically builds classes with `` `band b${BAND[...]}` ``,
   and literal `"b1"` appears 0 times in source, so text search misses it.
   `backend-coder` found and reported this before editing.
   → Retain an escape route such as “keep anything uncertain and note it in the handoff”; do not force blind obedience.

6. **Dynamically constructed class names are a recurring trap.** To check whether a class is used,
   search literals and also scan all `` `prefix${...}` `` templates to determine what they can generate.
   Known cases: `Team.tsx`'s `` band b${...} ``, `MetroChart.tsx`'s `` m-${key} `` and
   `` has-${severity} ``, `WorkDetail.tsx`'s `` aw-task-${status} ``.

7. **Before writing a task, verify semantic feasibility, not just factual accuracy.** (Added 2026-10-28)
   T4's facts were all verified (`--st-now` really was never defined; 5 hardcoded colors really existed),
   but two deliverables were semantically invalid; after running, the agent wrote one handoff line and stopped.

   - “Make flowchart dots follow Settings status colors”: `.now` comes from `nodeStop()`
     (`src/lib/phases.tsx:23`), which returns four **chart** states, `done/now/todo/risk`,
     into which 6 user statuses collapse many-to-one. There is no one-to-one status-color mapping.
   - “Eliminate different colors for synonymous brand and status colors”: these are systems with different constraints. Brand tokens
     appear as **text** on light backgrounds and have separate dark-theme values; status colors sit behind **white text**,
     with no dark variants (they are user data). Combining them drops white-text contrast to 2.43:1 in dark theme.

   → For every deliverable, ask first: **does this make sense in the current data model?**
     What computes a class, whether a token colors text or background, whether a dark variant exists.
     An agent cannot complete an invalid task, and stopping is the correct response.

8. **One task, one thing.** (Added 2026-10-28)
   T4 packed in 6 deliverables, 4 files, recalculating contrast for 6 colors, a new Playwright
   test, and 3 tradeoff decisions for the human. That violated this section's “estimate steps” rule below
   (split tasks over 100 steps)—a rule I wrote myself.
   → “While you're at it,” “also,” or “at the same time” signals a task should be split.

9. **Pure rename tasks must explicitly say “no new tests required.”** (Added 2026-10-28)
   Otherwise agents invent tests to fill deliverables, spending budget where no behavior changed to test.

---

## 7 d. Task queue: if one cannot proceed, try the next

A single `night-mode.mjs` run handles one task; failure otherwise stops the entire night. The queue solves that.

```bash
mkdir -p .nightmode/queue
# Place task files here; execution follows filename order
#   .nightmode/queue/01-fontscale.md
#   .nightmode/queue/02-spacing.md
#   .nightmode/queue/03-radius-z.md

caffeinate -dimsu bash scripts/night-queue.sh
```

`caffeinate` keeps the Mac awake and exits when the queue finishes.

**Failure isolation:** a failed task does not stop the queue; the next runs. Only tasks with **declared dependencies** are skipped:

```markdown
# Depends on: 01-fontscale.md
```

If a dependency fails or is skipped, this task is skipped too—no building on broken foundations. Tasks without declared dependencies still run.

**Result locations:**

| Directory | Contents |
| --- | --- |
| `.nightmode/done/` | Successful tasks |
| `.nightmode/failed/` | Failed (`.md`) and skipped (`.skipped.md`) tasks |
| `.nightmode/logs/` | Full output per task |
| `wip/<task-name>` branch | Unverified partial work from failed tasks |

**Partial work cannot contaminate the next task.** On failure, the queue saves uncommitted changes on a `wip/<task-name>` branch,
then **resets the working branch to its position before the task started**, so the next task starts from a known-good state.

> The first version on 2026-10-28 did not do this: it committed partial work directly to the working branch, making T2's unverified
> changes the foundation for T3, and T3's for T4. **One failure contaminated every subsequent task.** Fixed.

**The queue leaves controller commits whose pushes failed alone.** Those commits passed all gates;
they stay on the working branch and are listed separately at the end for a human to decide whether to push or revise in the morning.

**The queue bypasses no safety gates.** Every task still follows the entire doctor → coding → tests →
Critic → CI process. The queue only chooses what runs next.

**The queue also checks protected files.** The controller's protected-file check applies only to its own commits; the queue checks again
when saving WIP commits (below), and **stops the entire queue** if protected files changed, without secretly saving them to a branch.

---

## 7 e. Triage after interruption: what to keep and what to redo

The controller commits only after all gates pass. **On failure, changes remain in the workspace**—not lost, but not verified either.

The next task's doctor requires a clean workspace. The queue first saves partial work as a commit:

```
[WIP-UNVERIFIED][queue] <task-name> partial work at interruption
```

**This commit passed neither tests, Critic, nor CI. It only means “saved so it is not lost.”**

### Triage the next day

**Step 1: inspect what actually changed**

```bash
git log --oneline --grep='^\[WIP-UNVERIFIED\]'
git show --stat <that-commit>
```

**Step 2: assess each Done means item against the task file**

| Situation | Action |
| --- | --- |
| One item is fully complete and independent of the others | **Keep**. Extract it, add tests, commit normally |
| Half done (e.g., only 6 of 14 replacements) | **Keep as a starting point**, write a new task specifying “the remaining 8 locations in these files”; faster than starting over |
| Changes directly tied to the failure (e.g., breaking tests to bypass an error) | **Discard**. Their underlying premise is wrong |
| Intent is unclear | **Discard**. Incomprehensible partial work is not worth keeping—rerunning costs less than deciphering it |

**Step 3: execute**

```bash
# Keep all → turn WIP into a normal commit (add tests and run npm run check first)
npm run check && git commit --amend -m "[S4][Night Mode] <describe-what-changed>"

# Discard all → revert that commit, retaining recoverability through reflog
git revert --no-edit <that-commit>

# Keep some → return before that commit and select desired changes only
git reset --soft <that-commit>^    # Changes return to staging; select individually
```

⚠️ **Do not use `git checkout -- . ; git clean -fd` to “start over.”** That discards
all the previous work too. We nearly lost a completed CSS cleanup this way on the night of 2026-10-27.
**Commit to save progress; do not clear it.**

### A lesson

Interruption **does not mean** wasted work. The last “failed” run on the night of 2026-10-27 had actually completed all 14
`<Empty>` replacements—it merely became confused by files it had changed during wrap-up and ended its turn early.
Those changes remained intact in the workspace; after committing them, the next run found no remaining work and passed every gate directly.

**So after failure, inspect `git status` and `git diff` before deciding to redo anything.**

## 8. Interpreting results

1. `READY_FOR_CLAUDE`: full local checks, independent Critic, and GitHub CI passed; awaiting Claude and Juanxi's inspection. **Not merge permission.**
2. `NIGHT MODE STOPPED`: safety conditions unmet or no passage within three cycles. No merge or Production deployment attempted.
3. Safety-check failure: stops before coding; produces no application code.

Run logs live in Git-ignored `.nightmode/`, including `check.log`, `review.patch`, `review.txt`, `last-failure.log`, and `ready-comment.md`. They are local diagnostics and should not be committed.

## 9. Explicitly excluded

- Automatic Claude review.
- Automatic PR creation, Draft-to-Ready conversion, PR merging, or branch deletion.
- Automatic Production deployment.
- Automatic dependency installation or upgrades.
- Protected-file edits (`AGENTS.md`, `package.json`, `.github/**`, `netlify.toml`, etc.);
  tasks needing dependency installation or CI changes must use ordinary sessions, not Night Mode.
- GitHub Secrets, Netlify environment-variable, or system-setting changes.
- Arbitrary web browsing or automatic collection of external material.
- Testing with real research data.

## 10. Rules for changing this workflow

Night Mode cannot change its own safety boundaries. Only after an explicit human request may a trusted controller/maintainer change `AGENTS.md`, this file, `opencode.json`, `scripts/night-mode.mjs`, or `.github/**`. After every change, at minimum:

1. Rerun `node scripts/night-mode.mjs --doctor`.
2. Inspect `git diff` for secrets and out-of-scope files.
3. Push to the Draft PR and wait for GitHub CI.
4. Update the dated status snapshot; never portray one successful run as a permanent guarantee.
