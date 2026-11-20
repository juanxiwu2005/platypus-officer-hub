> **Language policy update, November 19, 2026:** write documents, reports, comments, commits, and GitHub notes in English. This supersedes any earlier language instruction quoted in this historical file. Current `AGENTS.md` controls.

# Interface and dynamic upgrade plan (design-upgrade)

> **Status: Juanxi approved** at 2026-11-01 (see record of decision `docs/PROGRESS.md`). Integrated branch `claude/determined-johnson-yrdxwf` has been built. Approvals do not include "merge small style files" of 20b and DX-27 from metge to `main`, DX-20.
> Source: 2026-11-01 review of `main@c3c9394` (with two Skills in Apple Design: `dickwu/apple-design-skill` and `emilkowalski/skills` `apple-design`).
> Based on: live screenshots (desktop 1440, cell phone 390, dark colour), computational styles from browsers, line-by-line reading of `src/styles.css` and related components.

## Current branch status (2026-11-01, Juanxi decision)

- **Integrated branch = `claude/determined-johnson-yrdxwf`** (not `integration/v1.6`). Reason: The git certificate for this session can only push the branch and push the other branches and all labels back to 403 (see "Why couldn't it?" by `ROLLBACK_LOG.md`). Juanxi agrees to use it directly for v1. 6 previews. This is a violation of `AGENTS.md` 8.1's "branch name without an AI" which has been recorded in the record of the decision.
- The preview is **PR #10** (`claude/determined-johnson-yrdxwf`  →  `main`, Draft). PR #9 (`integration/v1.6`) is closed and GitHub cannot delete the PR, nor can he repeat the number.
- Because this branch is the only one that can be pushed, **work page (`design/dx-NN-…`) exists only in** of the worktree working. Their submission was submitted via `--no-ff` merge into `claude/determined-johnson-yrdxwf`, so GitHub has a complete history and can always be used for `git revert -m 1 <merge-commit>`. To have these branch names and `dx/*` tags appear on GitHub, execute the "creative order" in `ROLLBACK_LOG.md` with a account number of persons.
- Anything that says "integrated branch" below, now refers to this branch.

## Which file first?

| Documentation | Contents |
| --- | --- |
| `DETAIL_LIST.md` | The full list of details (58, each with the status quo, evidence, recommendations, work package) |
| `PHASES.md` | 7 stages, 27 work package, dependencies, file tabs, "start passwords" for each stage |
| `work-packages/DX-NN-*.md` | One note for each work package (agent only read your own copy + this document) |
| `ROLLBACK_LOG.md` | Rollback registration form: one work pack for every merge |
| `reports/` | Each work package is executed by an agent to write a short report (do what, evidence, known problems) |

## A word plan.

1. **Foundation** (Phase 0): Break the style into "each work package a small file" and open `Layout.tsx` to test ports. After that, the work package at the back will hardly change the same file and many people can start working simultaneously in their respective gitworktrees.
2. **Hands, space floors, cell phone casings, materials and gestures, shut down**. Work package at each stage is independent and can be launched once.
3. Each work package allows **alone to rollback**, without prejudice to other work package.

## Hard rules (inheritance) `AGENTS.md`Here's what I want to say.

1. Do not touch `main`. No push, no more `main`. Only Juanxi said "approve the merge."
2. Use English for UI, documentation, comments, commits, and GitHub notes. Do not include secrets, research data, or real member records.
3. Only token **(`docs/DESIGN_TOKENS.md`) can be used for** colours, fonts, round angles and layers. Additional dynamic time and curves can only be phased 0Added `--dur-*`、`--ease-*`、`--spring-*`Token, CSS is not allowed to write naked milliseconds.
4. **No change in data structure**: do not move `SCHEMA_VERSION`, do not move the localStorage key. So the rollback never lets the old data in the browser go wrong. If some work package really needs to be changed, we have to stop and ask Juanxi.
5. Do not exceed the word limit of `npm run words`. Not by hiding text.
6. Do not touch `src/organization/`, `src/phase1/`, `src/workspace/` (old code, style check doesn't care about them).
7. **on the desktop with zero delay** (S3 decision, `e2e/feel.spec.ts` guarded). Events Left Activity Name List **Keep** (Juanxi 2026-10-31 request).
8. Only `transform` and `opacity` are animated. Do not do animations that can loop indefinitely (except for existing load points, and have a "reduce effect" version).
9. Every move must have a "reduce effect" version: shift and zoom to fade out, or simply remain silent.
10. Animation has to be interrupted: the user will order it at the middle of the animated and will have to move from the current position without having to finish broadcasting first.

## Step 0: Integrated branch (only once after approval)

The document of the plan is currently on branch `claude/determined-johnson-yrdxwf` (= `main` plus these documents without any code changes). After approval, allow a session to form an integrated branch:

```bash
git fetch origin
git switch -c claude/determined-johnson-yrdxwf origin/claude/determined-johnson-yrdxwf
git merge origin/main        # main There's always a new submission (programming data, etc.) that comes in first.
npm ci && npm run check      # The starting point must be all green.
git tag dx/baseline
git push -u origin claude/determined-johnson-yrdxwf --tags
```

All work packages are released from `origin/claude/determined-johnson-yrdxwf`. **Do not execute** on `claude/determined-johnson-yrdxwf`. `main` ALWAYS DON'T MOVE.

## Branch and Worktree

- Integrated branch: `claude/determined-johnson-yrdxwf` (from `origin/main`, **is not** `main`).
- Each work package has a branch from an integrated branch: `design/dx-NN-<short-english-name>`. Full lower case, no AI name, no random string (`AGENTS.md` section 8).
- Work package one worktree, directory next to repository:

```bash
git fetch origin
git worktree add ../platypus-dx-03 -b design/dx-03-press-feedback origin/claude/determined-johnson-yrdxwf
cd ../platypus-dx-03
npm ci
```

- **port staggers** (DX-01 for stage 0 after environmental variables are done): each worktree uses a different port, otherwise Playwright will "reuse" someone else's service and detect another person's code.

```bash
# Example: DX-03 Use  5103 Let's start.
PW_PORT=5103 PW_STORAGE_PORT=5203 WORDS_PORT=5303 npx playwright test e2e/feel.spec.ts --project=desktop
npx vite --port 5103   # When looking at the page manually
```

- `PW_CHROMIUM=<chromium path>` when no preview browser is available.
- We're going to have to do something about it. **Just run.**：`npm run lint`、`npm run build`、`npm test`, add the number of browsersertes listed in this work package note.  The complete `npm run check` is run by the integration person once at the end of each phase.
- **Parallel agent does not modify these files** (conflicting): `docs/PROGRESS.md`, `AGENTS.md`, `docs/DESIGN_TOKENS.md`, `src/styles.css`, `src/styles/index.css`. Progress and handoff are written by the integrated person.

## How to Play Styles (DX-01)

- The style of each work package is written in **'s own little file**: `src/styles/dx-NN-<name>.css` (DX-01 will build empty files in advance).
- These documents are from `src/styles/index.css`Introduction by Numbering, in `src/styles.css` **After**Load, so you can overwrite the old rules.
- **Do not change `src/styles.css`**. To change the rules, you have to overwrite them with the same selection in your own little file. So, rollback is "delete the contents of this little document."
- The same selection can be used to write a different **attribute,**, but the same **attribute belongs only to one work package** (belonging table at `PHASES.md`).
- After the adoption of acceptance, DX-27 can (with Juanxi 's consent) combine small files with the master files and the images must be aligned to pixels.

## Rollback (most important)

### Merge Method (let each work package alone rollback)

**has to** when integrating work packs into an integrated branch:

```bash
git switch claude/determined-johnson-yrdxwf
git tag dx/phase-N-before            # One fight before the stage begins. N It's phase number.
git merge --no-ff design/dx-NN-xxx -m "[DX-NN][Integration ] Merge.  xxx"
git tag dx/dx-NN-merged              # Point to this merge submission
git push origin claude/determined-johnson-yrdxwf --tags
```

- `--no-ff` leaves a "merge submission", and when rollback removes it, the whole work package is removed.
- Then register a row at `ROLLBACK_LOG.md` (work package, merge submission,tag, date).
- When the integrated branch merges to `main`, Juanxi selects **Create a new company** on GitHub and **does not choose Squash**. Squash will press all work package into one submission, and it won't be able to rollback alone.

### Juanxi, just say one thing.

> "rollback DX-12" or "rollback phase 2" or "never, go back before it's changed."

Angent executes as follows (Juanxi does not need to understand these orders).

| Yes. | Practice | Who can do it? |
| --- | --- | --- |
| **R0, I'm not satisfied yet.**  | No, merge, that branch, just throw it away. `git worktree remove ../platypus-dx-NN` | Integration of people |
| **R1 Quick Off (work package for pure style only)**  | Yes. `src/styles/index.css` It's the same line. `@import` Use `/* ... */` Comment dropped and submitted for push. One line changes and the page returns immediately. Work cardage says "R1" for use. | Integration of people |
| **R2 Undo a work package** | `git revert -m 1 dx/dx-NN-merged`And push. This will create a new "reverse submission", historical reservation, which can be withdrawn at any time. | Integration of people |
| **R3 Revocation of a phase**  | Do R2 for each tab at this stage, in the order of **and then forward** | Integration of people |
| **R4 The whole set is back before it's changed.**  | All `dx/dx-*-merged` Forward R2; Or (Juanxi is required to specify that "may be forced to reset") `git reset --hard dx/phase-1-before` Again. `git push --force-with-lease`。Default R2 without reset | Integration of people |
| **R5 on-line. `main`** | Select the previous version from the Deploys page of Netlify, punctuation deploy (required Juanxi personally in Netliffy); Then re-open the automatic release. Then we'll use R2 to cancel it in the code. | Juanxi |

**The repair package submitted has to be repaired:** metge then completed the restoration package (see table in `ROLLBACK_LOG.md`), which must be withdrawn before it is released, otherwise it will conflict.

**Reliance has to be withdrawn:**, look at the `PHASES.md` dependency table before withdrawing a work package. If the other work package depends on it, you have to withdraw those (from behind).

**Do it again:** wants to come back after it's withdrawn, just one more `git revert` for that "reverse submission."

### Why? Rollback is safe.

- All work packages do not change the data structure (rule 4), so rollback does not allow errors to be made in old data from the user browser.
- Each phase starts with a `dx/phase-N-before` label, each work package merge with a `dx/dx-NN-merged` tag.
- At the end of each phase, the integrater sends the results of a screenshot script "before/after" to Juanxi (available from `node scripts/dx-shots.mjs <label> <url>`, DX-01), which is viewed on the preview site.

## Common coverage for each work package (no repetition in the note)

1. `npm run lint`, `npm run build`, `npm test` All green.
2. The work package lists browser tests that are green, and **claims cannot weaken**; When a change is needed, it can only be replaced by the words "an equally rigorous detection of new behaviour" and clearly stated in the report.
3. In Playwright default "reduce effects" mode, page behaviour is exactly the same as before (DX-01 will set it as default, so old tests do not become unstable by animation).
4. There's another special test file. `e2e/dx-NN-*.spec.ts`Here. `test.use({ reducedMotion: "no-preference" })`Validate Dynamics **It does exist.**； Verify **downgrade version** with `reduce`. A small change in a pure style can be measured only by calculating the style.
5. Desktop 1440, cell phone 390, light color, dark colour with four combinations cutting one "front/ back" map (`scripts/dx-shots.mjs`). **Determines whether the image has changed to see the number of pixels that change, not just the bytes.**: The same construction takes twice and mobile phone maps have a noise of approximately 9,500 pixels ( ≈ 0.7%), with a ceiling of about 15,000 pixels already seen. The desktop map should change the 0 package.
6. Axis inspection: `npm run words` No increase; `e2e/a11y.spec.ts` No new violations; `noOverflow` is 0 (no horizontal rolling of mobile phones).
7. Write `reports/DX-NN.md`: What was changed, submitted to SHA, test results (live numbers), known problems, how rollback(Rs).

## Start password (template) for each workpackage agent

```
You are.  Platypus Execute repository  agent。Work package: DX-NN（<Name >）。
Read first: AGENTS.md、docs/design-upgrade/README.md、docs/design-upgrade/work-packages/DX-NN-*.md。
You're on your own.  git worktree Lee, branch.  design/dx-NN-<Short name >(from  origin/claude/determined-johnson-yrdxwf Open up.
Change only work package in the description "Files that can be changed "。No touching.  mainDon't change.  docs/PROGRESS.md / AGENTS.md / src/styles.css。
Finish: Run work checkout list, write  docs/design-upgrade/reports/DX-NN.md, submit (format)  [DX-NN][Claude] I don't know what to say.
Push your own branch, then stop and take a summary of the report and  R Level rollback is the way to tell integration people. No, merge, don't drive.  PR。
Report in simple Chinese. The interface text is in English.
```
