# Interface and Motion Upgrade Plan (design-upgrade)

> **Status: approved by Juanxi on 2026-11-01** (see `docs/PROGRESS.md` decision log). Integration branch `claude/determined-johnson-yrdxwf` created. Approval excludes merging `main`, DX-20 part 20b, and DX-27's stylesheet consolidation.
> Source: 2026-11-01 review of `main@c3c9394`, using Apple Design Skills `dickwu/apple-design-skill` and `emilkowalski/skills`'s `apple-design`.
> Evidence: actual screenshots (desktop 1440, phone 390, dark mode), browser-measured computed styles, line-by-line review of `src/styles.css` and related components.

## Current branch situation (2026-11-01, Juanxi's decision)

- **Integration branch = `claude/determined-johnson-yrdxwf`**, not `integration/v1.6`: this session's credentials can push only this branch; other branches and all tags return 403 (see ROLLBACK_LOG.md's "Why pushes fail"). Juanxi approved using it directly for the v1.6 preview. The exception to AGENTS.md 8.1's no-AI-name branch rule is recorded.
- Preview is **PR #10** (`claude/determined-johnson-yrdxwf` → `main`, Draft). PR #9 (`integration/v1.6`) is closed; GitHub cannot delete PRs or reuse numbers.
- Because only this branch is pushable, **package branches (`design/dx-NN-…`) exist only in working worktrees**. Their commits enter the integration branch via `--no-ff` merges, preserving complete GitHub history and enabling `git revert -m 1 <merge-commit>`. To publish those branch names and `dx/*` tags, an authorized account can run ROLLBACK_LOG.md's restoration commands.
- All references below to "integration branch" mean this branch.

## Reading map

| File | Contents |
| --- | --- |
| `DETAIL_LIST.md` | All 58 details, each with current state, evidence, recommendation, package |
| `PHASES.md` | 7 stages, 27 packages, dependencies, file ownership, stage start prompts |
| `work-packages/DX-NN-*.md` | One package description; agents read their own plus this file |
| `ROLLBACK_LOG.md` | One register row per package merge |
| `reports/` | Short report from each implementation agent: changes, evidence, known issues |

## Approach

1. Build the **foundation** first (stage 0): one small stylesheet per package, split `Layout.tsx`, configure test ports. Subsequent packages mostly avoid shared files and can run concurrently in separate worktrees.
2. Progress through **interaction feel → spatial continuity → layout → mobile shell → materials and gestures → closeout**. Packages within each stage are independent and can start together.
3. Every package supports **independent rollback** without affecting others.

## Hard rules (inherited from AGENTS.md and reiterated)

1. Do not touch, push, or merge `main`; merge only after Juanxi says "approve merge".
2. English interface text, Chinese documentation [historical language rule; superseded by the current English policy]. No keys, research data, or real member data.
3. **Use tokens only for colors, font sizes, radii, layers** (`docs/DESIGN_TOKENS.md`). Motion durations/curves also require stage-0 `--dur-*`, `--ease-*`, `--spring-*` tokens; no bare milliseconds in CSS.
4. **No schema changes:** leave `SCHEMA_VERSION` and localStorage keys untouched so rollback preserves old browser data. If a package truly needs changes, stop and ask Juanxi first.
5. Stay within `npm run words` budgets; do not hide text to pass.
6. Do not touch `src/organization/`, `src/phase1/`, `src/workspace/` (legacy code outside style guards).
7. Desktop hover cards **retain zero delay** (S3; `e2e/feel.spec.ts`). **Keep** Events' left event-name list (Juanxi, 2026-10-31).
8. Animate only `transform` and `opacity`. No infinite animations except existing loading dots with reduced-motion versions.
9. Every moving element needs reduced-motion behavior: replace movement/scaling with fades or no motion.
10. Motion must be interruptible: another click reverses from the current position rather than waiting for completion.

## Step 0: create integration branch (once, after approval)

These plan documents currently live on `claude/determined-johnson-yrdxwf` (= main plus docs, no code changes). After approval, have one session establish integration:

```bash
git fetch origin
git switch -c claude/determined-johnson-yrdxwf origin/claude/determined-johnson-yrdxwf
git merge origin/main        # Bring in frequent main updates such as demo data first
npm ci && npm run check      # Baseline must pass
git tag dx/baseline
git push -u origin claude/determined-johnson-yrdxwf --tags
```

Start every package from `origin/claude/determined-johnson-yrdxwf`. **Do not** implement work directly on integration. `main` remains untouched.

## Branch and worktree conventions

- Integration: `claude/determined-johnson-yrdxwf`, branched from `origin/main`, **not** main itself.
- One package branch from integration: `design/dx-NN-<short-english-name>`, lowercase, no AI names/random suffixes (AGENTS.md section 8).
- One adjacent worktree per package:

```bash
git fetch origin
git worktree add ../platypus-dx-03 -b design/dx-03-press-feedback origin/claude/determined-johnson-yrdxwf
cd ../platypus-dx-03
npm ci
```

- **Use distinct ports** after DX-01 adds environment variables; otherwise Playwright can reuse another agent's server and test their code.

```bash
# Example: DX-03 starts at 5103
PW_PORT=5103 PW_STORAGE_PORT=5203 WORDS_PORT=5303 npx playwright test e2e/feel.spec.ts --project=desktop
npx vite --port 5103   # Manual preview
```

- Without a preinstalled browser, set `PW_CHROMIUM=<chromium-path>`.
- Package agents run **only** `npm run lint`, `npm run build`, `npm test`, plus their listed browser tests. Integrator runs full `npm run check` once per stage.
- **Parallel agents do not edit** shared files: `docs/PROGRESS.md`, `AGENTS.md`, `docs/DESIGN_TOKENS.md`, `src/styles.css`, `src/styles/index.css`. Integrator records progress/handoffs centrally.

## Styles after DX-01

- Each package writes **its own small file**: `src/styles/dx-NN-<name>.css` (empty files prepared by DX-01).
- `src/styles/index.css` imports them numerically **after** `src/styles.css`, allowing overrides.
- **Do not edit `src/styles.css`.** Override old rules with the same selectors in your file, making rollback equivalent to clearing that file.
- Different packages may set **different properties** on one selector, but **each property has one owner** (`PHASES.md`).
- After acceptance, DX-27 may consolidate files into main CSS with Juanxi's agreement; output must be pixel-identical.

## Rollback (most important)

### Merge method for independent package rollback

Integrator **must** merge as follows:

```bash
git switch claude/determined-johnson-yrdxwf
git tag dx/phase-N-before            # Once before stage N
git merge --no-ff design/dx-NN-xxx -m "[DX-NN][Integration] Merge xxx"
git tag dx/dx-NN-merged              # Points to this merge commit
git push origin claude/determined-johnson-yrdxwf --tags
```

- `--no-ff` retains a merge commit whose reversal removes the whole package.
- Add a ROLLBACK_LOG.md row with package, merge commit, tag, date.
- When integrating to main, Juanxi selects GitHub **Create a merge commit**, **never Squash**; squashing combines packages and prevents independent rollback.

### Juanxi needs only one sentence

> "Roll back DX-12", "Roll back stage 2", or "Discard the whole upgrade and return to the previous version."

The agent follows the table; Juanxi need not understand the commands.

| Request | Method | Actor |
| --- | --- | --- |
| **R0 Reject before merge** | Do not merge; remove worktree: `git worktree remove ../platypus-dx-NN` | Integrator |
| **R1 Quick disable (CSS-only packages)** | Comment the relevant `@import` in `src/styles/index.css` with `/* ... */`, commit/push. One-line change immediately restores appearance. Only where package explicitly says R1 supported | Integrator |
| **R2 Revert a package** | `git revert -m 1 dx/dx-NN-merged`, push. Creates a reverse commit, preserving history and allowing reversal of the revert | Integrator |
| **R3 Revert a stage** | Apply R2 to every stage tag in **reverse order** | Integrator |
| **R4 Restore everything** | R2 all `dx/dx-*-merged` in reverse order; alternatively, only with Juanxi's explicit "force reset allowed", `git reset --hard dx/phase-1-before` then `git push --force-with-lease`. Default is R2, not reset | Integrator |
| **R5 Production emergency after main release** | Netlify Deploys → pre-change version → Publish deploy (Juanxi personally, then re-enable automatic publishing). Follow with formal R2 code reversal | Juanxi |

**Revert fixes first:** packages with post-merge fix commits (ROLLBACK_LOG.md) require reversing those fixes before the merge, to avoid conflicts.

**Revert dependents first:** consult PHASES.md; reverse dependent packages before their prerequisites, in reverse order.

**Restore a reverted package:** `git revert` its reverse commit.

### Why rollback is safe

- No package changes schema (rule 4), protecting existing browser data.
- Each stage has `dx/phase-N-before`; each merged package has `dx/dx-NN-merged`.
- At each stage end, integrator sends before/after screenshot results (`node scripts/dx-shots.mjs <tag> <url>`, provided by DX-01); Juanxi reviews the preview.

## Shared package acceptance

1. `npm run lint`, `npm run build`, `npm test` all pass.
2. Listed browser tests pass; **never weaken assertions**. Updates must test new behavior equally strictly and be explained in the report.
3. Behavior under Playwright's default reduced-motion mode stays identical (DX-01 sets this default so old tests remain stable).
4. Separate `e2e/dx-NN-*.spec.ts` with `test.use({ reducedMotion: "no-preference" })` verifies motion **exists**; `reduce` verifies **fallbacks**. Small CSS changes may check computed styles only.
5. Capture before/after for desktop 1440, phone 390, light/dark (four combinations, `scripts/dx-shots.mjs`). **Assess changed pixels, not merely byte equality**: repeated captures of the same build can produce up to about 9,500 mobile noise pixels (≈0.7%), observed maximum about 15,000. Packages requiring no change should have 0 changed desktop images.
6. Cross-cutting checks: no `npm run words` increase, no new `e2e/a11y.spec.ts` violations, `noOverflow` = 0 (no mobile horizontal scrolling).
7. Write `reports/DX-NN.md`: changes, commit SHA, actual test counts, known issues, rollback R level.

## Package-agent start prompt template

```
You are an implementation agent in the Platypus repository. Package: DX-NN (<name>).
Read AGENTS.md, docs/design-upgrade/README.md, and docs/design-upgrade/work-packages/DX-NN-*.md first.
Use your own git worktree, branch design/dx-NN-<short-name>, from origin/claude/determined-johnson-yrdxwf.
Edit only the package's allowed files. Do not touch main or edit docs/PROGRESS.md / AGENTS.md / src/styles.css.
Finish by running listed checks, writing docs/design-upgrade/reports/DX-NN.md, committing as [DX-NN][Claude] One sentence,
pushing your branch, and stopping. Give the integrator a report summary and R-level rollback method. Do not merge or open a PR.
Report in simple Chinese [historical instruction; superseded by current English policy]. Interface text is English.
```
