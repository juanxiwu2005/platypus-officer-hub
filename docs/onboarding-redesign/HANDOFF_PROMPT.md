# Prompt for another AI (Onboarding redesign)

> **Usage:** before sending, change only the two "[FILL BEFORE SENDING]" fields at the top, then paste the entire code block unchanged into the other AI.
> **Assign one stage at a time.** After completion/your acceptance, change "This time only" and send the next stage.
> **Never have two AIs edit the same stage concurrently** (including me): they overwrite on the same branch. I stop editing assigned stages.
> No secrets/research data in this prompt. Assumes repository read/write, Node 22, Playwright; if unavailable, the recipient must report under stop conditions.

```
Hello. You are taking over Onboarding redesign in the Platypus repository. Everything needed follows. You cannot see my chat with previous AI (Claude), so do not guess; repository documents are authoritative.

[FILL BEFORE SENDING 1] This time only: stage 1 (or stage 2 / stage 3)
[FILL BEFORE SENDING 2] Juanxi's answers to strategy Section 9 Q2–Q6: follow recommendations / change to: ________

## 0. Who you are and whom you serve
- Owner Juanxi does not code. Speak simple Chinese, one step at a time, no jargon; specify where to click when he must act.
- Interface English; documents/reports/messages to Juanxi Chinese; identifiers English. Historical language requirements: current policy supersedes Chinese repository/GitHub documentation and reporting with English.
- GitHub repository juanxiwu2005/platypus-officer-hub.
- Working branch (PR behind preview): claude/determined-johnson-yrdxwf. Preview: https://deploy-preview-10--platypus-officer-hub.netlify.app .
  Branch includes AI name, against normal conventions, but Juanxi approved it for this preview only; **do not rename/delete** (deletion invalidates preview).
- **Never** modify/push/merge main, force-push (--force), rewrite others' history. Only explicit "approved to merge" permits main merge, and that is not your task.

## 1. Read in order before editing
1. AGENTS.md (full; especially Section 3 hard rules, Section 4 alternating-work handoff, Sections 7/7.1 interface/motion).
2. Top docs/PROGRESS.md entries, especially two with Onboarding in title.
3. docs/DESIGN_TOKENS.md.
4. docs/ONBOARDING_REDESIGN_STRATEGY.md (design basis Sections 0,2,2b,3,4,5,6,7).
5. docs/onboarding-redesign/WORK_PACKAGES.md (division/ownership/logging/rollback).
6. docs/onboarding-redesign/PROMPTS.md (**each package's execution prompt is your task specification**; integrator prompts define merging/acceptance).
Design is decided: **do not redesign** or edit strategy/work-packages/prompts documents. Suspected errors: stop, explain in report, await Juanxi.

## 2. Task in one sentence
Build two new onboarding flows: president founding an organization; invited member experience. Phase 3 participants **are all presidents**; first entry shows welcome with Start walkthrough (president then member preview) or Explore the sample club. Record onboarding **in participant's own browser** (separate new key, behavior only/no content, only participant exports). Reference date 11/6, final freeze undecided.

## 3. Workflow (this section overrides PROMPTS.md)
PROMPTS.md assumes integrator + parallel worktree subagents. You are **one** AI:
- Execute and integrate **one package at a time in order**:
  Stage 1: OB-01 → OB-02 → OB-03
  Stage 2: OB-06 → OB-05 → OB-04 → OB-07 → OB-08 (OB-06 largest/hardest, first)
  Stage 3: OB-09 → OB-10
- For each, branch locally from working branch as design/ob-NN-<short-name> (lowercase, no AI name), commit as "[OB-NN][YourAIName] What changed" (Chinese under historical instruction, superseded by current English commit policy).
  After completion/self-check, return to working branch, git merge --no-ff (retain merge commit for individual rollback), push working branch.
  No squash or rebasing pushed commits.
- Rejected push (remote advanced): git fetch, then put your commits after remote (git rebase origin/<branch> only for your unpushed commits), never force.
  Others (Juanxi/AI) may have pushed fixes; preserve them.
- First action: mark corresponding Onboarding stage "in progress" in docs/PROGRESS.md with AI/date (AGENTS.md Section 4), commit/push. If another AI marked in progress, **stop and ask Juanxi**.
- Parallel ownership rules still apply sequentially: **edit only each package's allowed files**; needed unauthorized shared files (beyond App.tsx/store.tsx/styles.css/PROGRESS.md authorization in PROMPTS.md) require stop/report.
- Before package commits/merges inspect git diff --stat for files outside allowlist.

## 4. Hard rules (violation fails; full AGENTS.md)
1. No study data/surveys/interviews/participant details; fictional demo only. No keys in code/docs/prompts/commits.
2. Dates computed only by rule engine (src/engine/), never AI.
3. No /api/org/* or /api/workspace*, no new AI endpoints; existing /api/setup/constitution and /api/command only. ORG_SETUP_ENABLED remains unset.
4. No SCHEMA_VERSION/DemoState/existing localStorage or IndexedDB key changes. Logging uses **new** key (WORK_PACKAGES.md Section 4).
5. Style color/type/radius/stack/duration/easing use tokens only; new styles only owned src/styles/ob-*.css; no !important, transition: all, raw milliseconds;
   animations only transform/opacity, interruptible, reduced-motion version mandatory; npm run lint enforces.
6. Old src/pages/Setup.tsx/Join.tsx unchanged; delete no old tests/weaken no assertions. Switch off means site identical to today.
7. Each new violation guard includes deliberately invalid failing sample.
8. No skipping/deleting/weakening tests for green. Find cause or stop/report.
9. Each package report has Unverified (physical touch, Safari, etc.); never label untested as verified.

## 5. Proving package completion (each package)
Node 22: npm ci; npm run lint; npm run build; npm test; own e2e (npx playwright test e2e/ob-NN-*.spec.ts).
Ports PW_PORT=52NN PW_STORAGE_PORT=53NN WORDS_PORT=54NN (NN package number, avoid collisions).
Without preinstalled browser: PW_CHROMIUM=<chromium executable path>.
After each merge run full npm run check (lint/build/unit/all page tests/words); stage must finish fully green.
First run baseline npm run check: if not green, **stop** and tell Juanxi; no incidental fixes.

## 6. Mandatory stops (no bypass)
- Baseline npm run check not green.
- Need unauthorized files, SCHEMA_VERSION/existing keys/data-structure changes, dependencies.
- Only weakened tests produce green.
- Conflicting docs or code mismatch.
- Another AI doing same task.
- Repeated push failure (no force; report exact blocked command/output).
When stopped, record progress/blocker/recommendation and tell Juanxi in simple Chinese.

## 7. Delivery
1. Per package docs/onboarding-redesign/reports/OB-NN.md (changes / acceptance clicks / unverified / issues / rollback).
2. Record each merge SHA in docs/onboarding-redesign/ROLLBACK_LOG.md (OB-01 creates).
3. Top docs/PROGRESS.md stage handoff: changes, preview/acceptance clicks in 3–5 sentences, tests (commands/counts), unverified, next Juanxi decisions;
   mark packages awaiting acceptance, include "Local backup sync required".
4. Push working branch. **No new PR, no main merge.**
5. Final simple Chinese summary to Juanxi: 3–5 sentences on completion, URL/clicks, unfinished/risky items. **Then stop for acceptance**, no automatic next stage.

Start now: read Section 1, restate packages/order and intended file scope, then edit.
```
