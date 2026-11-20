# Night Mode V1 — More Agent Autodevelopment Manual

Night Mode allows a group of ASU AIR Agency to perform a **mission in the protected functional branch, which has been approved with a clear scope for** and is locally tested, independent and GitHub CI. It's not gonna merge `main`, it's not going to deploy.

## 1. Current state (2026-10-28 snapshot)

| Item | Verified facts |
| --- | --- |
| GitHub recall | `juanxiwu2005/platypus-officer-hub` |
| Process Branch | `main`, baseline `4dc55ba`(Any changes to this document have not yet been made) `main`）|
| Autodevelop Branch | `feat/ai-night-mode`, **has been merged into DP5** ( `integration/dp3-dp4-merge`So it contains all the results of S1/S2/S3 and M1 |
| Artificial gates. | Draft PR [ #7 ](https://github.com/juanxiwu2005/platypus-officer-hub/pull/7), Preview https://deploy-preview-7--platypus-officer-hub.netlify.app |
| controller | `scripts/night-mode.mjs`(single task), `scripts/night-queue.sh`(Queue, see 7d) |
| Projects | `opencode.json` |
| Operating environment | Node 22；GitHub CLI is registered; OpenCode；Local dependence installed |
| Encoding Main Force | `backend-coder`（ASU `glm-5-3`）。So it is. `orchestrator`, it's forbidden to edit the file, see 2 Change Record for details |
| Budget | 300 Step / 45 min / 5 Round, see **7b Operational Environment Budget Card** |
| **End-to-end**  | **2026-10-28First full run.**: Encoding  `npm run check` ♪ Independent Crime `APPROVED` *Submitting for transmission ** GitHub CI `pass`(7 minutes 3 seconds) `READY_FOR_CLAUDE` |
| Top of Branch | `55949b8`T1 z-index has landed, 2026-10-28 from that night's submission. |
| To-dos library | `docs/night-tasks/`Filename `N1`…`N6` That's the order of execution, see README there. |
| Accident backup | `backup/2026-10-28-queue` Keep the 2026-10-27 full deposit for that night; `wip/T2-radius`、`wip/T3-fontscale` It's an unverified semi-finished product. |

This is a snapshot with dates, not a permanent commitment. Every run must be re-executed for `--doctor`, rechecking PR and CI after completion.

### 2026-10-28 Two questions after the first-end success (not fixed)

1. **`review.patch` may not be complete.** Control generated if changes were submitted before the start of this round
   `review.patch` leaves only the new part of this round, and Critic will receive a missing diff.
   This time, Critic detected himself and changed to a direct reading area, so the conclusion is still correct -- **, but it's luck, not design**.
   Critic's original recommendation: The controller should ensure that `review.patch` always contains live code diff for audit purposes.

2. **may have a code implementation portal that bypasses the shell white list.** This running `code-critic` tries to pass one
   `execute` tool running `require('child_process').execSync(...)`, while `opencode.json`
   `bash`White list only. `shell`This action.  It then finished its work using Read/Grep.
   But... **Whether this path was actually stopped has not been verified.**。
   Next time check `opencode debug agents` output for anything other than `shell` to execute action
   (e.g. `execute`, `code`, `run`), together with peny.

### 2026-10-29 Recapitulation: N1 problems after success (records only, unrepaired); Juanxi approved maintainer modification, no change `scripts/`）

1. `waitForCi` of **`scripts/night-mode.mjs` will misjudge CI for failure.** run as soon as it is pushed.
   `gh pr checks --watch`, GitHub returns "no checks reported" when it is not registered.
   Concurrently, `latestCiFailure` will get **for the last successful running** when it fails (the log says "GitHub CI access.").
   N1 actually passed the CIA, and that's how he was misjudged and returned to work for nothing.
   • Legal orientation: waiting for the examination (at least one round of questioning) and watch; Reason for failure only takes conclusion to run for proof.
2. **`scripts/night-queue.sh`: Failed tasks will not address the remaining unsubmitted changes if they are submitted**，
   The workspace's dirty, the next job doctor's failed because it was "unclean."
3. **`scripts/night-queue.sh`Article 137Okay. `"$wip（"`：**macos self-carrying bash 3.2The infra-blank bytes are used as part of the variable name.
   `set -u` reports `wip?: unbound variable` and the whole queue exits. Reform: Written as `${wip}`.
4. The **code-critic operating environment often does not read the file**, which can only be given to `REJECTED` (not because there is a problem with the code).

## 2 who's in charge of what?

| Layer | Responsibility | Can't do anything. |
| --- | --- | --- |
| Juanxi | Approval of the terms of reference; Finally acceptance; I don't know, merge. | There's no need to write code. |
| Claude / Manual Reviewer | Yes. `READY_FOR_CLAUDE` Post-check diff, preview and risk | Could not close temporary folder: %s |
| Encoding `CODING_AGENT`Current `backend-coder`） | Read the task, change the source code and test itself, run the white list. | Unable to attach, push, merge, change protective files, cannot access the exterior directory, secret key, deploy or rely on configuration |
| `code-critic` | Read only Review, output `APPROVED` or `REJECTED` | Could not close temporary folder: %s |
| Night Mode controller | Self-censorship, complete testing, generation of review catch, maximum three rounds back to work, comemit, push, wait for CI, PR comments | Cannot merge or deploy |
| GitHub CI | Reinstallation and running of build, module and Playwright tests on Ubuntu 24.04/ Node 22 | Do not call live fee/ASU models, do not demonstrate the quality of model responses |

### 2026-10-28 Change: code main from `orchestrator` to `backend-coder`

**Reasons (actual, not speculative):** 2026-10-27 both running at night is suspended at the coding stage.

```
✗ Dead CSS cleanup + Empty swap failed
Error: Subagent session not found: ses
```

`opencode debug agents` displays `edit: * → deny`, `shell: * → deny` in `orchestrator` permissions,
Its system is also written by "you never write code, etc. or run companies yourself".
In other words, **, it's only designed to send**, and it must fail on this machine.
The wrong `ses` is the interdicted session ID. The change of mandate document cannot be bypassed.

**Changed what:** `scripts/night-mode.mjs` New Constant `CODING_AGENT`, initial encoding and back to work
(former 298, 353 row) to use it; Default value `backend-coder` (mode `all`), to be owned by Agent,
Model ASU `glm-5-3`). The word "delegate" in both prompts is changed to "do it yourself, don't assign it."

**Nothing changed:** `code-critic` is still called separately by the controller in line 341, and **independently reviews this gate to keep** intact.
Protecting documents, nine orders' white list, complete `npm run check`, three rounds of cap, GitHub CI,
Never merge/ deploy -- no change to all.

**Cost:** lost much of the Agent division of labour (it does not work in this environment); `backend-coder` System
Prompt is a backend, making the front end/CSS task is a wrong type of work and is made up by task document writing. This is a stopgap measure.
OpenCode assignment problems should be repaired over time, or a generic Primary code added to the user-level configuration.
Then just change `CODING_AGENT` a constant.

**Who approved it:** Juanxi, 2026-10-28, as requested in section 10 of this document.

### 2026-10-28 Change: Unleashing the budget and not opening secure borders

**Reason:**Change it to `backend-coder`Then the coding phase did run. `git status`、
**Budget** is not safe:

```
"backend-coder": { "steps": 15 }
```

The controller's prompt requires it to read `AGENTS.md`, `PROGRESS.md`, `PRODUCT_PLAN.md`, before starting work.
`RULES.md`, `NIGHT_MODE.md`, `TASK.md` -- six steps down, nine steps to work. And "Put the 14 out of handwriting."
Replace `<Empty>` with more than 20 steps for a single reading of each document. The **mission cannot be installed in the 15 step.**

**Changed what?**

| Documentation | Change | Why not safety? |
| --- | --- | --- |
| `opencode.json` | Five encoded by Agent `steps`：15 → **300** | The number of steps depends only on how much work you can do, not what you can do. |
| `opencode.json` | The new read-only and test command for the shell white list: `ls` `cat` `head` `tail` `wc` `grep` `rg` `find` `git grep` `git ls-files` `npx tsc` `npx vitest` `npm run lint` | It's all a read-only or run-on project, no document, no network, no system change. |
| `scripts/night-mode.mjs` | `COMMAND_TIMEOUT_MS`：20 → **45min**  | 300 paces 20 will be strangled by time, which means it won't let go. |
| `scripts/night-mode.mjs` | `MAX_CYCLES`：3 → **5** | Number of return hours, not missions |

**Unchanged (safe border, no movement):**

- Protection documents are prohibited: `.env*`, `.git/**`, `.gitignore`, `AGENTS.md`, `docs/NIGHT_MODE.md`,
  `package.json`、`package-lock.json`、`opencode.json`、`scripts/night-mode.mjs`、
  `.nightmode/**`、`.github/**`、`netlify.toml`
- Prohibition of arbitrary orders such as `node` / `curl` / `wget` / `brew` (the white list still defaults deny)
- `external_directory` Still Deny
- Agent cannot come, push, merge, deploy.
- Independent `code-critic` review
- Complete `npm run check`
- GitHub CI
- Never automatically merge `main`, never deploy

**retains the prompt for mandatory reading of documents.** considered cutting it down to save a few steps and was rejected by Juanxi for the correct reason:
Every time `opencode run` is a whole new session, the model has no memory of the last time and must read the rules itself.
The root of the disease is that the number of steps is too low, not too many reading documents.

**Cost:** 300 steps + 45 minutes means that single operations may consume more ASUs or run longer.
This is a deliberate trade-off — rather than being cut off repeatedly and without any output, let it be done once and for all.

**Who approved:** Juanxi, 2026-10-28.

---

The current Agent/Model Map is from the user level OpenCode configuration and may be replaced in the future. Projects rely only on role names and should not depend on the permanent existence of a model. The following command is used to view the actual map when running:

```bash
opencode debug agents
```

The main map of 2026-10-27 is recorded in the Root Catalogue `AGENTS.md` Section 0.

## 3. Complete process running at once

```text
Juanxi Approved  TASK.md
        ↓
doctor Check  / Branch  / Draft PR / Node / missions  / Dependence
        ↓
Encoding  Agent（backend-coder）→ Change code and test directly.  → Unsubmitted changes
        ↓
npm run check（build + unit + desktop/mobile Playwright）
        ↓
Independence  code-critic Read-only review  diff
        ↓
Could not close temporary folder: %s  AgentAt most.  3 Wheel
        ↓
Pass: controller  commit + push
        ↓
GitHub CI Recheck
        ↓
Adopted: PR Comments  READY_FOR_CLAUDE
        ↓
Claude + Juanxi Manual inspection; Only.  Juanxi Approved merge
```

Any failure of the link will stop or enter restricted return work. There is no automatic circumvention of testing, lowering assertions, switching branches, merges or deployments.

## 4. Networks and secret key exactly how to work

- OpenCode calls the ASU AIR model via local environment variable `ASU_AIR_API_KEY`. Set key value will never enter the task, prompt, log, Git or PR.
- The shell missions of Agent refused by default. They can only run the build, test, Playwright and read-only Git commands in the white list.
- Thus, Agent **cannot treat shell as an arbitrary network terminal**, cannot run `curl`, `wget`, `brew`, or have access to extra-project files.
- The controller is not Agent. It calls `git` and `gh` individually to complete the timescale, push, view PR and wait for CI.
- "Asu AIR can be called" does not mean "free access to the Internet." If the mission requires external information, the source and range must first be clearly approved by humans and verified input must be prepared outside Night Mode.
- The product website's own AI is controlled by variables like Netlify `AI_PRESET`, `AI_MODEL` and `AI_API_KEY`; Independent with Night Mode's local `ASU_AIR_API_KEY`.

## 5. Must be satisfied before starting

The controller rejects unsafe start-up conditions:

- The current directory must be this repository.
- The current branch must happen to be `feat/ai-night-mode`.
- The workspace must be clean.
- `origin` must be `juanxiwu2005/platypus-officer-hub`.
- There must be an Open Draw PR from this branch to `main`.
- The Node master version must be 22.
- `git`, `gh`, `node`, `npm`, `opencode` must be available and GitHub CLI must be registered.
- `node_modules` must already exist; Night Mode does not automatically install or upgrade dependent.
- `opencode.json` must reject the external directory and unknown shell command by default; Critical missions must pass dynamic check.

If OpenCode cannot be found in a non-interactive environment, the user terminal can use it to confirm that its executable directory is in `PATH`. The current installation location is `~/.opencode/bin/opencode`; Do not write API key into the command.

## 6. Secure borders

- Only repository `juanxiwu2005/platypus-officer-hub` and branch `feat/ai-night-mode` are allowed.
- Tasks can only use field presentation data; Research materials, participant information or live memory data are not allowed.
- Agent may not read or modify `.env*`, `.git/**`, `.github/**`, `.nightmode/**`, relying on files, Netlify settings or Night Mode own secure files.
- Protective documents include `AGENTS.md`, `docs/NIGHT_MODE.md`, `opencode.json`, `scripts/night-mode.mjs`, `package*.json` and `netlify.toml`.
- The controller will check the protection path again before coming in; If a change in the protective document is detected, the submission is refused.
- (a) maximum 20 minutes per round of orders; Could not close temporary folder: %s 3Round.
- Never AutoMerge, don't modify `main`, don't trigger implementation deployment.

## 7.

Execute in repository directory:

```bash
mkdir -p .nightmode
cp docs/NIGHT_MODE_TASK_TEMPLATE.md .nightmode/TASK.md
nano .nightmode/TASK.md
```

The mission must be clear about Goal, Files, Constraints and Done means. Do not write API key, research material or participant information.

Run read-only self-checks first:

```bash
node scripts/night-mode.mjs --doctor
```

Only when you see `DOCTOR PASS` begins:

```bash
node scripts/night-mode.mjs --task-file .nightmode/TASK.md
```

## 7b. Operational environmental budget card (2026-10-28 on-site)

**read this card before writing any task documents.** 2026-10-27. Four out of five failures in the evening.
"Creating instructions to an unquantified operating environment" -- the task requires things beyond what Agent actually can do.
This card is the measurement.

| Item | Current value | Where do I change it? |
| --- | --- | --- |
| Number of single running steps | **300** | `opencode.json` Each agent's `steps` |
| Single command timeout | **45min**  | `scripts/night-mode.mjs` `COMMAND_TIMEOUT_MS` |
| Number of return rounds | **5** | `scripts/night-mode.mjs` `MAX_CYCLES` |
| Encoding Main Force | **`backend-coder`**（ASU `glm-5-3`） | `scripts/night-mode.mjs` `CODING_AGENT` |
| Fixed expenses before start of work | **about 6 step** ( controller requires AGENTS/PROGRESS/ PRODUCT_PLAN/RULES/ NIGHT_MODE/ TASK) | Control |

**Agent's Runable Shell Command (all others rejected):**

```
git status*   git diff*   git log*   git show*   git branch --show-current*
git grep*     git ls-files*
npm test*     npm run build*   npm run e2e*   npm run check*   npm run lint*
npx playwright test*   npx tsc*   npx vitest*
ls*  cat*  head*  tail*  wc*  grep*  rg*  find*
```

**can't run** `node`, `npx` (except for the three above), `curl`, `wget`, `brew`, `python`,
Yeah. **You can't run a compound order.**♪ With `&&`They'll be rejected and they'll have to break it into a single piece.

**Agent cannot edit:** `.env*`, `.git/**`, `.gitignore`, `AGENTS.md`, `docs/NIGHT_MODE.md`,
`package.json`、`package-lock.json`、`opencode.json`、`scripts/night-mode.mjs`、
`.nightmode/**`、`.github/**`、`netlify.toml`。

Therefore, **cannot go on tasks that require the installation of dependence, modification of CI and AGENTS.md (e.g. styllint/eslint, etc.) Night Mode**
Release freeze changes the document). Those walk plain-talking.

---

## 7b-2.  ⚠  Do not send this branch while the queue is running

The lesson of **2026-10-28 is that the seven missions were wiped out all night long.**

T1 actually **was a complete success for**: 611 unit sets plus 276 breakers adopted,
`code-critic` gave it to `STATUS: APPROVED` and the controller submitted. Then:

```
! [rejected]  feat/ai-night-mode -> feat/ai-night-mode (fetch first)
NIGHT MODE STOPPED: git push origin feat/ai-night-mode failed with exit code 1
```

Reason: **Claude pushed a document to the same branch during the queue run.** is far behind.
The transport is rejected, the controller treats it as a fatal error and mission failure. Each mission in the back hit the same wall.

### Settlement (2026-10-28 check local submission post)

Of the 7 missions, **2 crossed all gates** (T1 z-index, T6 spacing), both of which were rejected for pushback.
The `.nightmode/done/` was empty, and the files for both missions were laid in `failed/`.
Also, T2 and T3 have finished their work without passing the gate, and T4 was miswritten by the mission itself (see Article 7c 7).
T5, T7 is correctly ****skip for non-satisfactory dependence.

The way to get it back: those submissions are still on the local branch, `cherry-pick` to the top of the updated far end.
Rerun the full check and push. T1 was saved this way (611 module + 276 e2e, numbers match the original run).
T6's chrry-nick conflict - its diff is calculated on unverified changes in T2/T3
Once the foundations had been withdrawn, they would not be right but would have to run again.

**, so the old Queue Script submitted semi-finished products to the branch of work at a cost not just to pollute the foundations of the next mission.
It also prevents successful missions from recovering on their own. ** New edition puts semi-finished products on the `wip/<task-name>` side branch.

### Rules.

1. **Don't go any further after the line runs. `feat/ai-night-mode`Push anything.**— Includes the submission of re-document only.
   You have to wait for the queue to end or move to another branch.
2. `git pull` before running, make sure the locals are up to date.
3. The cloud session is especially important: it can't see what you are running locally. **Tell it before running.**

### The controller has been reinforced. 2026-10-28）

He was pushed to refuse a direct sentence of death. Now will: `fetch`  →  `rebase` to the new remote top
**reruns the full check** (tested on an old basis and must be re-examined) and then push.

If the conflict or re-test fails, it will stop. **Submit it and leave it to the people.**Never force-push,
And never send the code that has not been verified at the landing position.

---

## 7c. How do you write the mission documents?

1. The **investigation was handed over, and Night Mode only made mechanical changes.**
   "Find which CSS is empty and then delete" will cost 300 all the steps. The right thing to do is check it out first.
   The task is to give the list directly. 2026-10-27 twice a night failed with this.

2. **Do not describe the current status of files in the task.**
   "Styles.css, all 718 lines" is written, and Agent changed to 626 line, and then went back to the first reading and thought something was wrong.
   So stop looking for git instead of continuing to work. Just write about what results are to be achieved.

3. **explicitly forbids retrenchment of the baseline.** written directly into Constraints.

4. **Don't let it read the big files that don't work.** does not need to change the task for `styles.css` to say "don't read styles.css".

5. The list given by the **people could also be wrong -- let it have the right to question.**
   In the list of dead codes I gave you. `b1/b2/b3`Wrong: `Team.tsx`Use `` `band b${BAND[...]}` ``
   Dynamic spell names, string `"b1"` appears in the source code 0. Text search is not available.
   It's `backend-coder` found and reported before he did it.
   • Keep exports such as "unsurely always keep and write down the handoff record" in the mission, and do not force it to follow.

6. The **dynamic synthing is a recurring trap.** checks out "some class and no one else."
   In addition to the literal search, we'll clean up all `` ` prefix ${} ` `` templates in the source code and see what you can spell out.
   Known point: `Team.tsx`It's... `` band b${...} ``、`MetroChart.tsx`It's... `` m-${key} ``and
   `` has-${severity} ``, `WorkDetail.tsx` `` aw-task-${status} ``.

7. **confirms before writing a mission that it can do semanticly -- not just facts, right?** (2026-10-28 plus)
   The fact that T4 is fully verified as true (the `--st-now` has never been defined and the 5 hard code colours do exist)
   But it had two deliveries that were not semantic, and Agent stopped writing a line of books.

   - "Let flowchart dots follow Settings' state colour": `.now` from `nodeStop()`
     (`src/lib/phases.tsx:23`), returns `done/now/todo/risk` 4 **Chart**,
     6 user status one-on-one press on top of it. There is no equivalent status color.
   - "Delete the synonyms of brand colour and state colour": these are two different systems that are bound differently. Brand token
     It's in light color. **Text**Top, with stand-alone dark thematic values;  State colour is used to press **white words**,
     No dark version (user data). Merge causes white contrasts under dark themes to drop to 2.43:1.

   * Let's ask each delivery before we go: **, is this happening in the current data model?**
     A catch from what, a token in text or background, no dark version.
     The wrong task Agent couldn't do, and it stopped right.

8. **One task only for one thing.** (2026-10-28 plus)
   T4 One task plugged in 6 deliveries, 4 files, 6 contrasts, a new Playwright
   Tests, and make 3 trade-offs. That's a violation of the step estimate under this section.
   (over) 100And I wrote that rule myself.
   • The fact that the mission was accompanied by an "other" is a signal to be deactivated.

9. The **task with a purely renaming is to state that "no additional tests are required".** (2026-10-28 plus)
   Otherwise, Agent would have spent his budget on inventive testing to make it happen, where no behavioral changes could be measured.

---

## 7d. Task Queuing: one down, next

Run alone `night-mode.mjs` do only one job at a time and stop there all night. Queue this.

```bash
mkdir -p .nightmode/queue
# Put the task files in and sort them by file name
#   .nightmode/queue/01-fontscale.md
#   .nightmode/queue/02-spacing.md
#   .nightmode/queue/03-radius-z.md

caffeinate -dimsu bash scripts/night-queue.sh
```

`caffeinate` to keep Mac up; Queue after it's out.

**Failed Separation: The** mission failed constantly queued to continue next. Only **declares that the task of relying on** will be skip:

```markdown
# Depends on: 01-fontscale.md
```

When a dependent task fails or is skiped, the job also sskip -- it doesn't continue on bad foundations. There is no stated reliance on running as usual.

**The result goes to:**

| Contents | Contents |
| --- | --- |
| `.nightmode/done/` | Run-through mission. |
| `.nightmode/failed/` | Failed ( `.md`) and by the sskip ( `.skipped.md`） |
| `.nightmode/logs/` | Full output of each task |
| `wip/<task-name>`  Branch | Uncertified semi-finished from failed task |

**semi-finished products will not pollute the next mission.** failed by queued unsubmitted changes to the `wip/<task-name>` branch.
And then put the branch of work, **revert, the position before this mission runs,**, and the next one starts with what's known to be good.

> The first version of 2026-10-28 is not like this: it submits semi-finished products directly to the branch, so T2 is unverified.
> Changed to T3 base, T3 to T4. **a failure will contaminate every mission behind.** has been repaired.

The **controller was submitted but did not push, and the queue won't move it.**'s kind of submitted through all the gates.
It will remain in the branch and be listed separately at the end, and it will be decided whether to push or change in the morning.

The **queue will not bypass any security gates.** Each task still has a complete doctor * encoding  →  Test
Critic → CI。Queuing only determines which to run next.

**queues itself to search for protective files.** control protection document checks only take effect when it itself is submitted; Queue WIP
When submitted, it will be checked again (see below) and the protective file has been changed to **to stop the entire queue of** without sneaking into the branch.

---

## 7e. Progress stream after interruption: which to leave and which to redecorate

Controls are submitted only after all gates have passed. **So if you fail, leave it in the workspace** -- it's not lost, but it hasn't been verified.

And the next task doctor requires a clean workspace. The choreography is based on the deposit of semi-finished products into one submission:

```
[WIP-UNVERIFIED][queue] <Task Name > Half-finished at break
```

**This submission hasn't been tested, critic or CI. It's just "save and don't lose."**

### How do you split the next day?

**Step one: Let's see what it changes.**

```bash
git log --oneline --grep='^\[WIP-UNVERIFIED\]'
git show --stat <The submission. >
```

**Step two:** by Article against Tasks

| Situation | What should we do? |
| --- | --- |
| One article is complete and not dependent on the other. | **Leave**. Pick it out separately, take the test and submit as you wish. |
| Make half of it. (For example, 14 has been replaced by 6) | **Keep it as a starting point.**♪ Write a new job ♪ 8We're in these files." Make it fast.  |
| The change is directly related to the cause of failure (e.g., it changed the test in order to bypass reporting errors) | **Drop**. The premise of such changes is inherently wrong. |
| Can't see what it wants. | **Drop**. A half-finished product that you can't read is not worth saving -- it's cheaper to rerun than to read it. |

**Step 3: Implementing**

```bash
# All of them.  → Put it on.  WIP Submitting to normal submission (test first, run first)  npm run check）
npm run check && git commit --amend -m "[S4][Night Mode] <Tell me what you did. >"

# Discard All  → Fallback, that submission. Keep it on.  reflog Retrieve it.
git revert --no-edit <The submission. >

# Partially retained  → Go back to that submission and pick the changes you want. The rest don't.
git reset --soft <The submission. >^    # Change back to the reserve, one by one.
```

⚠️ **Don't use it. `git checkout -- . ; git clean -fd`Here's to a "new start".**. It'll be the last time.
All the results are thrown out together. 2026-10-27 Lately we almost threw away the CSS cleanup that was already done.
**saves progress by submitting, not emptying.**

### An experience.

Disruption of **does not amount to** for nothing. 2026-10-27 The last "failure" run at night has actually taken 14
The `<Empty>` replacement is all done -- it's only finished with the file that was changed by itself and ended early.
Those changes were kept in their entirety in the work area, and the next round of operations after submission found that no work was done and went straight through all the gates.

**So, when you fail, look at `git status` and `git diff` and decide whether to redo it.**

## 8. How to understand the results

1. `READY_FOR_CLAUDE`: Local integrity checks, independent critic and GitHub CI passed; Wait for Claude and Juanxi to check. **is not a merge license.**
2. `NIGHT MODE STOPPED`: Unsatisfactory security conditions or three failed rounds. There is no attempt on merge or implementation deployment.
3. Security check failed: stop before encoding and no application code is generated.

The running logs are stored in `.nightmode/`, which is ignored by Git, including `check.log`, `review.patch`, `review.txt`, `last-failure.log` and `ready-comment.md`. They are used for local diagnostic purposes and should not be submitted.

## 9. Exactly not included at present

- Claude AutoReview.
- Automatically creates PR, converts Draft to Ready, merge PR or deletes branches.
- AutoProduction deployment.
- Auto-installation or upgrade dependent.
- `AGENTS.md`, `package.json`, `.github/**`, `netlify.toml`, etc.)
  So the task that needs to be dependent on or modified for CI must go into plain language and not go Night Mode.
- Modifys GitHubSecrets, Netlify environment variables or system settings.
- Any page viewing or automatic collection of external information.
- Test using live research data.

## 10. Modifying the rules for working streams

Night Mode cannot modify its own secure borders. The trusted controller/maintainer can modify `AGENTS.md`, this document, `opencode.json`, `scripts/night-mode.mjs` or `.github/**` only if the humans so request. At least after each modification:

1. Rerun `node scripts/night-mode.mjs --doctor`.
2. Checks `git diff` and confirms that there are no secret key files.
3. Push to Draft PR, waiting for GitHub CI.
4. Update the status snapshot with date; Don't write one through as a permanent guarantee.
