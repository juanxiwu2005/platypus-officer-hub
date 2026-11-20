# Historical agent notes: snapshots and reading map

This English index replaces the duplicated implementation narrative formerly embedded in `AGENTS.md`. Detailed work records remain in the dated plans and `docs/PROGRESS.md`; the exact former instruction file remains in Git history at production baseline `b9e7a02` and preview baseline `13f4527`. Current `AGENTS.md`, the English collaboration policy, and later owner decisions take precedence. A historical approval is not authorization to repeat a deployment, paid evaluation, delegation workflow, or scope change.

## Repository and release snapshots

The former November 1 snapshot recorded `main` at `c3c9394`, 107 commits. v1.0 entered production through PR #8, merged November 1 at 02:10 UTC as `5b0eb96`, with parents `4dc55ba` and `b7eb268`. `4dc55ba` ceased to be the baseline. Work from PRs #4–#7 entered `main` with #8; their PRs closed. PR #1 (`v1` → `main`) merged October 23.

At the earlier October 29/November 1 snapshots:

| Branch | Recorded purpose |
| --- | --- |
| `v1` | Base for earlier PR #2 and #3; preserve its preview relationships |
| `feat/ai-native-phase1` | Preview 2, isolated AI-native Phase 1 screens |
| `feat/organization-setup-ai` | Preview 3, Organization Setup plus workspace |
| `integration/v1.1-fix` | Preview 4, S1 permissions, S2 safety, S3 responsiveness |
| `integration/dp3-dp4-merge` | Preview 5, DP3/DP4 M1 integration, AIR and hidden storage |
| `feat/m2b-ai-intake` | Preview 6, task/event intent, forms, Plan check |
| `feat/ai-night-mode` | Preview 7, Night Mode and N1–N6 design tokens; then recorded at `94e2882` |
| `integration/v1.0` | Preview 8 release integration: PRs #6/#7, S6–S9, M3, and DeepSeek removal |
| `integration/v1.6` | Closed PR #9, superseded by #10 |
| `claude/determined-johnson-yrdxwf` | PR #10, interface/motion upgrade preview, later merged with approval |

These names are records, not a current branch inventory. Do not rename/delete an active preview branch as a naming cleanup. Preview numbers derive from PR numbers; check actual GitHub behavior and branch relationships before acting. Use `docs/LAUNCH_STEPS.md` for the historical post-release cleanup plan and request explicit owner direction for deletions. Older redundant branches were reported absent on October 29, but that is not a fresh inventory.

## Night Mode incidents and constraints

Night Mode has been paused since October 28. The October 29 account described its first complete success on October 28: code → `npm run check` → independent Critic APPROVED → commit/push → GitHub CI → Deploy Preview → READY_FOR_CLAUDE, after five earlier coding-stage failures. This was an observed run, not a guarantee of future readiness.

The recorded implementation used `scripts/night-mode.mjs` as the sole controller for committing, pushing, CI inspection, and readiness comments, with `scripts/night-queue.sh` as the queue. OpenCode's `backend-coder` used ASU `glm-5-3`; `orchestrator` could neither edit nor run commands, and delegation failed with `Subagent session not found`. Model mappings came from user-level OpenCode settings; project `opencode.json` restricted permissions and steps. Recheck `opencode debug agents` instead of assuming availability.

The later recorded budget was 300 steps, 45 minutes per command, and 5 repair rounds. The agent had a shell allowlist of reads/project tests; arbitrary `node`, `curl`, `python`, and compound commands were denied. Protected paths included `.env*`, `.git/**`, `.gitignore`, AGENTS, NIGHT_MODE, package manifests/lock, OpenCode config, controller, `.nightmode/**`, `.github/**`, and Netlify config. Dependency/CI work required a normal session. These were Night Mode restrictions, not restrictions on an ordinary owner-authorized coding session.

Known restart work: CI polling immediately after push could misclassify pending runs; the queue's unfinished-work handling needed review; macOS bash 3.2 could parse a full-width parenthesis adjacent to a variable as part of its name. Read the current runbook before changing or running the queue. During an October 27 queue, a concurrent documentation push caused all 7 tasks to hit push rejection. Never push its branch while the queue runs without operator coordination. `backup/2026-10-28-queue` and `wip/*` were reported local to Juanxi's Mac, not GitHub. N1–N6 in `docs/night-tasks/` were reported complete.

The local `ASU_AIR_API_KEY` used for development agents is separate from product Netlify `AI_*` settings. Neither belongs in repository files or prompts. Before writing a Night Mode task, read runbook sections 7b/7c: measure actual environment limits, confirm semantic feasibility, keep one task per work item, and do not require artificial new tests for pure renaming.

## Main prototype implementation history

The original frontend used React 18, TypeScript, Vite, and HashRouter (`/#/tasks`) to avoid intercepting `/api/*` and `/legacy/`. The v0.1 single-file prototype moved to `public/legacy/index.html`; later work removed legacy runtime entrypoints. Consult the current tree rather than restoring them from an old note.

| Work | Recorded implementation and evidence |
| --- | --- |
| WP0/domain | `src/routes.ts`, Layout, `src/pages/`, domain types/seed/store/rules. Browser key `platypus.v1.demo`; supported schema changes need versioned repair. Fictional Desert Founders Society. |
| WP1/scheduling | `calendar.ts` school/officer workdays, holidays, finals, term gaps/busy weeks; `playbooks.ts` SEO OA101/OA102/OA201, T-90/60/30/14, R01–R16; `schedule.ts` backward official/club/latest-start planning then forward dependency propagation and reasons. Fixed demo start `2026-10-22`. |
| WP1/events | Early React Flow lanes, Gantt/list, NodePanel owner/club-date/effort/RACI/Why/material edits. Later replaced by custom metro layout, not an instruction to restore React Flow. |
| WP2 | CommandBar, `commands.ts` double date filtering, five-part reminder drafting/checking in NudgeComposer/nudges and server adapters. |
| WP3 | `taskWorkflow.ts` claiming, status, draft-backed extension, contributions/RACI; `followup.ts` day simulation and 3/5/7/8/10 private escalation. Same-browser one-use signed officer links; random `demoLinkKey` is local and never AI context. Recorded schema 3, 146 units/62 browser cases; WP4 later superseded that schema. |
| WP4 | Setup/Join/Settings, `settings.ts` validation, `team.ts` workload/contributions/availability. `org.workspace` held fictional channels/links/notes/small attachments, without live accounts or AI attachment transfer. Renames retained role IDs. Schema 4, 174 units/76 browser cases. |
| WP5 | Seeded 1,000-run forecast, deterministic completion/transition/funding dates; top-three risks by probability with colors/reasons before percentages; gradual local personal buffers, private explanation/opt-out/reset. Rule answers select server R01–R16 and rebuild text; deterministic R11/R12 preflight; local feedback queue. Sourced handbooks require outgoing confirmation and president approval. Recorded schema 5, 233 units/90 browser cases. Mock 40/40 rule evaluation was not live AIR/DeepSeek acceptance; Netlify login attempts stopped at Juanxi's request. |

See `WP2_ACCEPTANCE.md` through `WP5_ACCEPTANCE.md`, `AI_TESTS.md`, `RULES.md`, and PROGRESS for detailed dated checks and limitations. Do not add those old counts to present-day test totals.

The v1.1 map introduced the rail (`RailContext`, Rail, AskPanel, ChangeCard), reusable UI primitives, `/api/chat`, viewer-scoped `aiContext.ts`, and small-change `aiAutoApply`/undo versus reviewed changes. Personal buffers, private messages, files, and demo keys stay filtered. The fictional shared pool was read-only; its `/api/pool` endpoint was later removed. Constitution reading used browser IndexedDB and server parsing without adopting the separate Organization Setup store. Workflow templates lived in `org.eventWorkflow`, with locked school-rule steps. Availability used `freeSlots`, `whoIsFree`, `cellsToSlots`, and `availabilityGrid`; Google Calendar remained future work.

Flow editing later used `metro.ts`, MetroChart, `flowEdit.ts`, and store operations for steps/dependencies/effort/phase/order, while `schedule.ts` retained date ownership. Desktop is horizontal; narrow screens use vertical flow. Board logic is in `src/data/board.ts`.

## Handoff redesign, November 8–9

Eight stages were developed on `claude/tender-gates-j8ztlr`, reviewed/fixed by Claude, and merged November 9 with Juanxi's approval. Recorded schema 22. `docs/HANDOFF_EXECUTION_PLAN.md` sections 10–13 record plan differences, merge checklist, rollback, and remaining issues.

- Preserve outgoing people with `leftOn` for history; active-officer lists filter them. Keep term alignment and incoming identity separate from the current role holder.
- Role dossiers (`roleDossier.ts`) provide Calendar, In flight, People, and Lessons, with source IDs and links rather than invented content. Calendar includes 30-day deadlines and the role's standard steps. Sources can include tasks, dossier rows, and fictional interviews. Leader-only contacts are excluded from shared handbooks, while dossiers honor viewer visibility.
- Handbooks use six sections and local fallback rotates among sections. AI returns IDs only. Freshness depends on changes/removal of cited records, not every newly added record. Draft requests prioritize interviews within the server's 100-source limit.
- Risk is a simple count-based score for open work, school deadlines, lateness, blocks, and evidence gaps. It orders role cards with accessible reasons; adding role risks to Today's task-risk queue was explicitly deferred.
- Rule-based gap questions ask at most 6 questions, including 2–3 generic ones, with stable IDs and no hidden-contact disclosure. Answers become interview evidence and invalidate an existing handbook draft; skips stay unresolved. Unfilled roles are answered by the president.
- Incoming officers acknowledge actual handbook sections, mark uncertainty, and answer 3 read-back questions. Keyword coverage is a rough flag, not a score. The outgoing officer may add the answer to the handbook or accept it as-is. A shadow task remains owned by the outgoing officer.
- Day-7/day-30 reviews rate clarity, confidence, and inclusion from 1–5 plus missing knowledge. Scores are visible only to president, VP, and incoming officer. A president can add a lesson to the dossier for the next handoff. Legacy unscored day-30 review remains supported.
- Same-day autosave renames preserve the first actual old name; reverting the name removes the rename entry. Never accept rename history from the form. New roles collect three `ROLE_START_PROMPTS` answers as source-backed starting notes.
- Leader-only `moveWork` transfers selected open tasks, resets them to Not claimed for the receiving current officer or leaves unassigned, and moves contacts. `closeRole` requires no current holder and excludes the president role; transfer remaining work/contacts/RACI/workflow ownership, reconnect subordinate reports, and archive rather than delete the role with `archivedOn`/`closedInto` history. Split means add role plus move work; merge means move all then close. Legacy schema 14–21 gains archived-role storage during repair.
- `firstQuestions.ts` reads existing Ask study-log questions after the incoming appointment, or completion fallback, only at Handoff render time. It does not create a new record type, save questions into organization/handbook/dossier state, or send them to AI. Only leaders and the incoming person can see them. `handoffStage7.test.ts` guards imports/identifiers in domain/server files. Shared last-60 Ask chat storage was not redesigned by person; role FAQ aggregation remained deferred.

Pre-merge fixes also retained earlier handoff rounds in optional `handoffHistory`, restricted leaders/suggested owners to current officers, made incoming/former View as actors read-only outside the explicit allowed actions, repaired legacy people with `leftOn` and fictional email, avoided obsolete speaker migration for v20/v21, cleared shadow/reading/read-back when changing the incoming person, never reused incoming IDs, counted repeated silence once, and showed outgoing contact information only on the page. See `handoffReview.test.ts`. Keep page-only draft/risk/question helpers out of the startup store bundle.

## Later feature and experiment reading map

- v1.0 design tokens/lint/word/accessibility work, Behind the scenes, touch interaction, M2b intent/forms, and metro step editing: `DESIGN_TOKENS.md`, `PROMPT_STRATEGY.md`, and release-readiness evidence. DeepSeek removal was approved October 29.
- CRM v1.3: schema 6 split organizations, contacts, and interactions; role-owned contacts survive transition. Inspired by Twenty's data design without importing its AGPL backend. No sponsorship-deal module. `crm.ts` and `permissions.ts` centralize behavior; `visibility: "leads"` also filters AI. Partners' later archival is branch-specific.
- Onboarding and Phase 3: `onboarding-redesign/`, the data dictionary, session runbook, and current PROGRESS entries. Feature flags, query/hash handling, recorded flow versions, and study entry changed over time; use current code.
- Phase 1, approved October 25: three isolated high-fidelity screens, source-backed constitution suggestions, custom-role capabilities, fictional workflows, and architecture only; stop after screen acceptance. The later explicit Organization Setup increment authorized its own AI/API/storage work without approving production, real accounts, a full planner, or migration of old business pages.
- Organization Setup v3 and data foundation: five chapters, server-side prompts, stable IDs/manual-field protection, deterministic server compilation, private revision/ETag conflict handling, source/request/result archives before parsing, and explicit AI proposals. No-op Back/Next makes no new AI call. Preserve local work on 409 for a person's decision. Native schema rejection permits only the documented bounded fallback; do not invent missing duties.
- F1–F7 and Activity Workspace, October 26: package-specific parallel-work approvals, shared contracts/file ownership/review, validated actions, approved compiled configuration rather than drafts, current-task-derived top-three items, and private test actors rather than real authentication. These historical approvals do not authorize unrelated future delegation. See `organization/F1_F7_IMPLEMENTATION.md`, `ACTIVITY_WORKSPACE_PLAN.md`, and `ACTIVITY_WORKSPACE_IMPLEMENTATION.md`.

The owner's historical thesis backup holds PRODUCT_PLAN, PROGRESS, RULES, and AGENTS_repo under `05_Phase3_Prototype/Plan/`. GitHub remains canonical. Only an assistant with authorized access to that machine can synchronize it; otherwise record synchronization pending.
