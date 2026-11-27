# Playbook: phased multi-agent integration plan (2026-11-25)

**Decisions (Juanxi, 2026-11-25):** path 2 (a new **Playbook** page; handoff becomes a mode inside it; `/handoff` redirects); the navigation name is **Playbook**; questions **expand in place** (an approved exception to AGENTS.md §7 rule 3) with a small **Ask AI** button that opens the right-rail Ask with the question loaded; the Playbook word limit is acceptable for now but the design must stay bounded as experience grows and old experience is replaced; phase 4 (same-school community) keeps **interfaces and architecture only**, to be connected in a later conversation.

Background: `HANDOFF_INDUSTRY_BENCHMARK_2026-11-23.md`, `CHECKLIST_MATRIX_CONTRACT.md`, and the design pages listed in `docs/PROGRESS.md` (three-day analysis, experience library, question-first Q&A v2, community integration plan).

Branch: `claude/fervent-thompson-e2j5u2` (draft PR #20, preview only). Never `main` without Juanxi's approval.

---

## 1. How every phase runs

| Stage | Who | Output |
| --- | --- | --- |
| A. Contract | Main agent | `docs/feedback-fix/PLAYBOOK_P<n>_CONTRACT.md` with frozen types, function signatures, file ownership, copy, tests. The main agent also commits the **shared hotspot edits** itself (type definitions in `src/data/types.ts`, the action union stub in `src/data/store.tsx`, routes), so parallel agents never edit the same file. |
| B. Build | 2–3 worktree agents in parallel | One commit per agent, on disjoint files: model (pure logic, store reducer, tests), server (Netlify function, tests), interface (components, CSS, e2e). |
| C. Integrate | Main agent | One merge commit per agent (each revertible on its own); full gates (section 5). |
| D. Review | Independent read-only agent | Ranked P1/P2/P3 findings with reproductions. |
| E. Fix | Fix agent (worktree) | One commit; each finding gets a failing-then-passing test. |
| F. Deliver | Main agent | Verification, screenshots, `PROGRESS.md` and `PRODUCT_PLAN.md`, push; Juanxi accepts before the next phase starts. |

## 2. Phase 1: Playbook page and the club's Q&A library

**Goal:** the club's own question-first library, fully usable in the demo. Existing handoff features keep working, embedded in the new page unchanged.

**Stage A (main agent):**
- Types: `DemoState.playbook?: { questions, answers, categories?, asked? }`, `PlaybookQuestion`, `PlaybookAnswer` (as in the community plan; `kind: "club" | "experience"`, school-rule answers never stored), optional only, so `SCHEMA_VERSION` stays 23.
- Action stub: `{ type: "playbookAction"; action: PlaybookAction }`.
- Routes: nav item "Playbook" at `/playbook` replacing "Handoff"; `/handoff` redirects to `/playbook`; lazy route.

**Stage B agents:**

| Agent | Owns | Delivers |
| --- | --- | --- |
| P1-M model | `src/data/playbook.ts`, `src/lib/playbookMatch.ts`, `src/data/playbookSeed.ts`, store case, tests `src/test/playbook*.test.ts` | Reducer (add, edit, hide, vote, mark read, merge into, move category); permissions (all officers write experience; only president/VP write club practice; author or president/VP edit; president/VP hide); sanitize; seven universal categories; rule-based starter questions from the role dossier and `handoffHistory` (no AI); fictional demo content; rule-based similar-question matching (keywords, category, shared policy IDs); the research-log guard list extended to the new files. |
| P1-U interface | `src/pages/Playbook.tsx`, `src/components/playbook/*`, `src/styles/pb-01-*.css`, `e2e/playbook*.spec.ts` | Role filter and category chips; question rows that expand in place; answers labelled by text colour only (school rule, club practice, experience) with source names; like and dislike; "New" and read state; **Ask AI** button that opens the right-rail Ask with the question; "Add experience" with the duplicate check; the existing handoff panel embedded at the top while a handoff is active. |

**Bounded words (Juanxi's growth concern):** answers are not in the DOM until a row opens, so the page total does not grow with answers; each category shows at most 8 questions before "Show N more"; the default view shows "For your role" (at most 8). Replacing old experience does not add questions (one primary answer per type; alternates collapse), and duplicate checks keep questions growing slower than answers. New limit for `/playbook`: visible 200 / all 600, enforced by `npm run words` (replaces `/handoff` 120/120).

## 3. Phase 2: handoff becomes "top up and verify"

**Stage A:** `RoleHandoff` optional `prompts`, `verify`, `checklistRunId`; `ChecklistRun` type (personal checklist from the template); policy catalog `edition`.

| Agent | Owns | Delivers |
| --- | --- | --- |
| P2-M model | `src/data/handoff.ts`, `src/lib/handoffQuestions.ts`, `src/data/checklistRun.ts`, `src/engine/schedule.ts` (handoff dates only), tests | Four question layers (six universal, up to three from records, school-specific tied to policy IDs, president-added from the matrix); verification queue; personal checklist from the template when a successor is named; day 0–3 schedule; retire the handbook approval gate, the 7-step flow and `WEEK_ONE` (data kept for old saves). |
| P2-S server | `netlify/functions/playbook-split.mts`, `netlify/lib/*` additions, tests | `/api/playbook/split`: extractive only (returns sentence-span IDs per card, a suggested reader question, suggested category and policy IDs); no dates; AIR only; sanitizer like `sanitizeHandbook`. |
| P2-U interface | `src/components/playbook/handoff/*`, `src/components/settings/OnboardingChecklist.tsx` (questions mode), `e2e/playbook-handoff*.spec.ts` | Handoff bar inside Playbook; answer → card review (keep, edit, drop) with duplicate check; verify queue; president-added questions in the matrix; the new officer's personal checklist with "related questions". |

## 4. Phase 3: Ask and ask-a-person

| Agent | Owns | Delivers |
| --- | --- | --- |
| P3-A assistant | `src/lib/assistant.ts`, `netlify/functions/policy-answer.mts`, tests | Answer ladder: Playbook question match first (rules, then AI choosing among candidate IDs), then policy passages with source names, then "ask a person". |
| P3-U interface | `src/components/rail/*` (Ask cards), Playbook ask-a-person UI, notice kind not tied to a task, export view, e2e | Escalation to predecessor → president (two days), answer → "Save to Playbook"; 1–2 page handoff export. |

## 5. Phase 4: community interfaces only

One small agent. `src/community/` with a `CommunityAdapter` interface (`listShared`, `submit`, `vote`, `alerts`, `pointsBalance`), a `LocalDemoCommunity` implementation that reads the fictional `src/data/sharedPool.ts` converted to Q&A cards, the `share` field and `origin: "community"` wiring, a points-ledger type (launch period, diminishing value, per-club cap, bill credit). No server, accounts or real points. `docs/feedback-fix/COMMUNITY_INTERFACE.md` describes what a later conversation must implement (storage, accounts, same-school check, Platypus student-team review, alerts from real reports, billing credit).

## 6. Gates for every phase

- `npm run lint`, `npm run build` (entry ≤ 550,000 bytes; Playbook lazy), `npm run typecheck:netlify`, `CI=1 npx vitest run` (full), affected browser specs on desktop and mobile with `--trace off`, `npm run words`, axe with no serious or critical issues in light and dark.
- Research-log guard (`src/test/handoffStage7.test.ts`) covers every new Playbook file.
- AI: extractive only, IDs not prose for facts, dates dropped, AIR only, mocked provider in CI; phase 1 uses no AI.
- Privacy: leads-only contacts never appear in Playbook; no real data; attachments never shared.
- New record items (questions, answers, votes, asked questions) are logged as counts and IDs only; Juanxi confirms the IRB position before real participants.

## 7. Rollback

Each agent's work is one merge commit; `git revert -m 1 <merge>` removes it. The `/handoff` redirect and the embedded handoff panel keep old behaviour reachable until phase 2 is accepted.
