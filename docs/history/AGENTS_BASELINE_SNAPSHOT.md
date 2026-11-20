# Historical agent guidance: complete English baseline snapshot

> This is the complete translated guidance found at both cleanup baselines, production `b9e7a02` and Preview 14 `13f4527`. Its dated facts, approvals, restrictions, and implementation descriptions belong to their original context. The current root `AGENTS.md` governs new work. In particular, all repository and GitHub writing must now be English, superseding the former Chinese-documentation instruction quoted below. Branch/preview behavior must be verified against GitHub before any action. This snapshot grants no new release, access, delegation, or paid-call authorization.

## Original introduction

AGENTS.md was addressed to any incoming AI, including Claude, ChatGPT, and DeepSeek.

This repository holds the code and plans for **Platypus**, a team AI chief of staff for student organizations, and the Phase 3 prototype for Juanxi (Steve) Wu's ASU Barrett honors thesis, STUDY00024727. Several AIs take turns here: **read this guidance at the beginning of every session and hand off under section 4 at the end.**

## 0. Repository and agent-workflow facts (main/PR facts rechecked November 1, 2026; Night Mode facts still dated October 29)

- Canonical GitHub repository: `juanxiwu2005/platypus-officer-hub`.
- `main` is Production. No AI may directly change, push, or merge it; merge only when Juanxi explicitly approves.
- **Main facts checked with Git/GitHub on November 1:** tip `c3c9394`, 107 commits. v1.0 was live: PR #8, `integration/v1.0`, merged November 1 at 02:10 UTC as `5b0eb96`, parents `4dc55ba` and `b7eb268`. `4dc55ba` was an ancestor, **no longer the current baseline**. PRs #4–#7 entered main through #8 and were closed. Recheck at every start with `git fetch origin main && git log origin/main -3 --format='%h %ad %s' --date=short`; do not reuse this snapshot as current fact.
- **Open PRs on November 1:**

| PR | Branch | Purpose |
| --- | --- | --- |
| #2 | `feat/ai-native-phase1` | Three-screen AI-native prototype; draft, base `v1` |
| #3 | `feat/organization-setup-ai` | DP3 Organization Setup v3 + workspace; draft, base `v1` |
| #10 | `claude/determined-johnson-yrdxwf` | v1.6 interface/motion preview, base main, titled “[Preview · Do not merge]”; https://deploy-preview-10--platypus-officer-hub.netlify.app . Replaced closed PR #9, `integration/v1.6`. Use **Create a merge commit**, not Squash, to retain work-package rollback under `docs/design-upgrade/`. |

PR #1, `v1` → main, had merged and closed October 23.

The original warning prohibited renaming/deleting these branches, including `v1`, the base for #2/#3. It described head/base deletion as closing the PR and losing the old preview number/URL. Treat that as the recorded warning and verify actual GitHub behavior before branch changes. Juanxi decides deletion of merged branches such as `integration/v1.0`; see `docs/LAUNCH_STEPS.md` section 5 and naming rules in section 8.

- **Night Mode paused October 28.** Development moved to human-operated sessions. Before resuming, fix the runbook section-1 problems: immediate post-push CI polling misclassifies failure, queue handling leaves unfinished edits, and macOS bash 3.2 mishandles a variable name. These Night Mode notes were written October 29 and **not individually rechecked November 1**.
- `scripts/night-mode.mjs` alone controls Night Mode commit/push/CI inspection/PR comments. The OpenCode agent cannot do those itself. `scripts/night-queue.sh` is the multi-task queue; runbook section 7d.
- **Primary coder: `backend-coder`, ASU `glm-5-3`.** `orchestrator` cannot edit/run commands and can only delegate, which failed with `Subagent session not found`. See runbook section-2 change history for rationale.
- Recorded budget: **300 steps, 45 minutes per command, 5 repair rounds**. Shell commands are allowlisted reads/project tests; arbitrary `node`, `curl`, `python`, and compound commands are denied. Read runbook **7b environment budget card before authoring a task**.
- Protected files: `.env*`, `.git/**`, `.gitignore`, `AGENTS.md`, `docs/NIGHT_MODE.md`, `package.json`, `package-lock.json`, `opencode.json`, `scripts/night-mode.mjs`, `.nightmode/**`, `.github/**`, `netlify.toml`. Dependency/CI changes require an ordinary session.
- Model mappings come from user-level OpenCode configuration; project `opencode.json` tightens permissions and sets `steps`. Check `opencode debug agents` each run rather than assuming availability.
- The Night Mode agent calls AIR through OpenCode; that does not provide arbitrary web access. Its controller separately uses GitHub CLI.
- Local `ASU_AIR_API_KEY` exists only in the terminal environment. Product Netlify `AI_*` variables are separate; neither belongs in the repository.
- **First complete end-to-end Night Mode success, October 28:** code → `npm run check` → independent Critic `APPROVED` → commit/push → passing GitHub CI → Deploy Preview → `READY_FOR_CLAUDE`. Five earlier attempts stopped during coding; runbook records causes/fixes. Future AIs must reverify.
- **Nobody may push `feat/ai-night-mode` while the queue runs, even documentation.** On October 27 all 7 tasks failed because Claude pushed a documentation commit during the queue, leaving local history behind remote and causing repeated push rejection. Cloud sessions cannot see local processes; tell them before starting. Runbook 7b-2.
- Recorded Night Mode head: `94e2882`, N6. `backup/2026-10-28-queue` and `wip/*` existed only on Juanxi's Mac, not GitHub. N1–N6 in `docs/night-tasks/` were complete.
- Before task authoring, also read runbook 7c items 7–9: factual correctness does not establish semantic feasibility; one task per work item; pure renaming must explicitly require no added tests.
- Resolve conflicting status by checking Git/PR/CI, then updating docs. Do not overwrite repository evidence with chat memory.

## 1. Reading order

1. `docs/PROGRESS.md`: status, owner, next step.
2. `docs/PRODUCT_PLAN.md`: approved canonical v1.0 plan; packages/acceptance in section 13, scope/cut order in section 12.
3. For automated development, `docs/NIGHT_MODE.md` and `.nightmode/TASK.md`. **Read 7b and 7c before writing a task**: four of five October 27 failures arose from instructions for an unmeasured environment.
4. As needed, `docs/RULES.md`, `docs/SEO_PLAYBOOK_REFERENCE.md`, `docs/AI_SETUP.md`.
5. For interface/motion packages beginning `DX-`, `docs/design-upgrade/README.md` and the package instructions. The newest PROGRESS entry determines plan status.

## 2. Project owner

- Juanxi does not code. Explain plainly in Chinese, one step at a time, without jargon; give exact click instructions when he must act. Private conversation may still follow his language preference under the current English repository policy.
- He accepts packages through preview URLs, answering “OK” or specifying changes.
- Obtain his agreement for plan changes and record them in PROGRESS's decision record.

## 3. Hard rules

1. **No research data:** no raw survey answers, interview transcripts/recordings, participant names/quotes, or disclosure to AI. Repository examples use fictional organizations only.
2. **No secrets:** product API keys only in Netlify environment variables (`docs/AI_SETUP.md`); Night Mode key only in local terminal environment. Never in code, docs, tasks, prompts, or commits.
3. **Only the rule engine computes dates.** AI uses whitelisted changes (plan section 11) and drafts reminders/answers/handbooks; discard all AI date fields. v1.2, approved October 23: retain dates in AI prose only when exactly matching stored organization dates; mask others. Small status/name/tag/difficulty/contact-history changes apply with viewer permissions and undo; other changes require president/VP approval. M2b, approved October 27: **anyone may create tasks** for self/others immediately with undo; recipients claim assigned tasks. **Event creation** defaults to president/VP, who may enable selected/all officers in Settings. Task deadlines come from today + configured days and club buffer in `src/engine/taskDates.ts`; AI supplies no date. See `docs/PROMPT_STRATEGY.md` section 0.
4. **Main is production:** the source described pushes as automatic Netlify release. Night Mode worked only on `feat/ai-night-mode`; other work used Juanxi-approved feature branches. **Explicit approval is required to merge main.**
5. **AI provider, October 27 update with later October 29 removal:** product calls use server-side ASU AIR, keys only in Netlify. Routing v3: Gemma 4 31B for longer structured setup, Muse for short conversation/editing and main Ask/rules/reminders/handbooks, GLM 5.3 only for requested Deeper review. **DeepSeek removed October 29**; `AI_PRESET=deepseek` rejected. AIR failure uses built-in local replies, not another provider. Model roles are design choices, not verified rankings. Night Mode also uses AIR with its separate local key and actual OpenCode mappings. Real-participant Phase 3 sessions require AIR or an IRB-approved provider.
6. Original language rule: English interface for US students, Chinese documentation. **The Chinese-documentation requirement is superseded: all repository/GitHub content now uses English.**
7. Do not implement plan-section-12 exclusions, such as inventory/member rosters.

## 4. Alternating-session handoff

Before work:

1. Read-only `git status --short --branch`, `git remote -v`, then confirm the approved target. Never switch to main automatically.
2. Night Mode stays on `feat/ai-night-mode`, reads its runbook, and uses its controller; agent does not commit/push.
3. Ordinary sessions fetch the approved feature branch and read PROGRESS. Do not touch another AI's in-progress task.
4. Mark task in progress with assistant/date in PROGRESS, then commit/push on the approved branch.

During work: commit in small steps; translated example `[WP1][ChatGPT] Rule engine: add three deadlines`. Add tests for behavior; change RULES and code rule arrays together.

At finish: record work, remaining items, preview/click acceptance, known issues; mark awaiting acceptance/complete and add a handoff row; push. Product-plan changes require a pending-local-backup note.

An AI without repository access, such as chat-only DeepSeek, receives these relevant sections from Juanxi and outputs complete files or patches. An authorized AI submits them and credits the source in the handoff.

## 5. Local backup

GitHub is canonical. Juanxi's Honors Thesis `05_Phase3_Prototype/Plan/` contains `Platypus_\u4ea7\u54c1\u8ba1\u5212_v1.0.md`, PROGRESS, RULES, and `AGENTS_repo.md`. The escape sequences identify the original Unicode filename, without renaming it. An AI with authorized access to his computer (Claude at that time) synchronizes after each package; others record synchronization pending.

## 6. Code at the time

The following map originally described `v1` after WP0; later dated entries supersede earlier descriptions.

- **Frontend:** React 18/TypeScript/Vite, `src/main.tsx`, HashRouter URLs such as `/#/tasks`, avoiding a Netlify wildcard that would intercept `/api/*` or `/legacy/`. `src/routes.ts` defined 10 pages and each page's question; `src/components/Layout.tsx` held View as/AI controls, Reset demo, and navigation. Each `src/pages/*.tsx` file was one page; unfinished areas used `<Coming wp="WPx">`, removed on completion. `src/data/types.ts` matched plan section 11; `seed.ts` held fictional Desert Founders Society; `store.tsx` used only localStorage key `platypus.v1.demo`, with a `SCHEMA_VERSION` increment for structural changes; `rules.ts` R01–R16 changed with RULES. Date helpers: `src/lib/dates.ts`.
- **WP1 engine, `src/engine/`:** date computation belongs here, never AI. `calendar.ts` covers ASU business days/holidays/finals/terms, sourced at the end of RULES; officer workdays additionally exclude finals, semester gaps, and personal busy weeks. `playbooks.ts` derives from SEO OA101/OA102/OA201, T-90/60/30/14, and R01–R16. Each step has owner function, anchor (`rule` = official ASU deadline, `target` = club convention), effort, dependencies, applicability; `buildEventNodes()` instantiates nodes. `schedule.ts`'s `computeSchedule(state)` first schedules backward using the earliest official-minus-buffer, club target, or workday before downstream latest start; then propagates forward using manually set club deadlines and pushes downstream work if upstream is unfinished. Red means missing an ASU deadline or scheduling after the event; yellow means passing club due/latest start, upstream delay, or no owner. Every date has a Why. `applySchedule()` writes dates, called after store changes. Demo starts at fixed **Thursday, 2026-10-22**, `DEMO_TODAY`; WP3's clock advances from it, keeping examples identical across viewers.
- **WP1 Events:** `src/pages/Events.tsx` offered flow (`src/components/flow/FlowChart.tsx`, React Flow lanes by role/date axis), `Gantt.tsx`, and list. `src/components/NodePanel.tsx` edited owner, club due, effort, RACI, Why, materials.
- **Tests:** `npm test` = Vitest in `src/test/`; `npm run e2e` = desktop/mobile Playwright in `e2e/`; the then-described `npm run check` combined all three checks. `.github/workflows/ci.yml` runs on pushes.
- **Legacy:** v0.1 single-file prototype moved to `public/legacy/index.html`, `/legacy/`, originally retained unchanged.
- **WP2 Today:** `CommandBar.tsx` reviews whitelisted operations individually; `src/lib/commands.ts` filters AI dates twice. `NudgeComposer.tsx` / `src/lib/nudges.ts` generate/check five-part reminders; `command.mts` / `nudge-draft.mts` reuse the provider adapter.
- **WP3 tasks/officers:** `src/data/taskWorkflow.ts` handles claiming, four statuses, draft-backed extensions, contributions, RACI notices; `src/engine/followup.ts` handles daily simulation and private day-3/5/7/8/10 follow-up. Schedule recovery still belongs to `schedule.ts`. Tasks has list/board/Gantt; notifications show only the current actor's records. `src/lib/officerLinks.ts` / `src/pages/Officer.tsx` implement **same-browser, single-use signed demo links**, one task/owner, invalid after one operation. Random runtime `demoLinkKey` is local, not a provider key, never AI context; cross-device/real authentication deferred to v1.5. Recorded schema 3, later WP4 schema 4; older saves reseeded. Reset clears state/notices/requests/links. `docs/WP3_ACCEPTANCE.md`: 146 unit/62 page tests passed, old tests retained.
- **WP4 setup/team:** `Setup.tsx` five steps, `Join.tsx` five same-browser invitation questions, `Settings.tsx` club/personal preferences. `src/data/settings.ts` validates/writes; `src/engine/team.ts` computes workload/contributions/meeting overlap. `org.workspace` stores only demo channels/links/notes/small fictional attachments; no real accounts and no AI attachment transfer. Disabling personal buffer uses one day; only the person sees its value/reason. Renaming preserves role ID and updates lanes/handbook directory; full handbook/transition remained WP5. Schema **4**, **174 unit + 76 page tests** passed with earlier tests retained; see `docs/WP4_ACCEPTANCE.md`.
- **WP5 funding/rules/handoff/relationships/forecast:** `src/engine/forecast.ts` is a fixed-seed, 1,000-sample pure function. `schedule.ts` still supplies forecast completion dates, handoff dates, funding decision day. Today ranks top three by predicted probability, color/two reasons first, percentage on expansion. `personalBuffer()` learns gradually only from this organization's dated completions, explained only to the person in Settings, opt-out supported, reset at transition by default. `/api/ask` lets AI select server R01–R16, rebuilding text from stored rules; `RuleQuestion` is shared by Rules/Today. `/api/preflight` and browser share deterministic R11/R12 in `src/lib/preflight.ts`. `Feedback` stays in this browser, reviewable in Rules' admin queue. `src/data/handoff.ts` / `src/lib/handbook.ts`: AI selects task/interview IDs, shows original extracts, retains source snapshots and requires renewed review after changes, outgoing confirmation before president approval. Only newly fabricated interviews; never research files. Handoff transfers unfinished tasks; contacts retain role ID; personal buffer does not transfer.

### Handoff redesign overview, November 9

Eight stages were developed on `claude/tender-gates-j8ztlr`; **after Claude's November 9 review/fixes, Juanxi approved direct integration into main**, schema 22. `docs/HANDOFF_EXECUTION_PLAN.md`: section 10 differences, 11 merge checklist, 12 rollback, 13 known issues.

File map: actions `src/data/handoff.ts`; term alignment `roleTerms.ts`; work transfer/role closure/start answers `roleChanges.ts`; `permissions.ts`'s `isOfficer` / `officers`. Pure helpers: `src/lib/handbook.ts`, `roleDossier.ts`, `handoffQuestions.ts`; page-only `handbookDraft.ts`, `handoffRisk.ts`, `firstQuestions.ts` **must not enter the store dependency graph**, which would enlarge startup. UI: `src/pages/Handoff.tsx`, `HandoffNewOfficer.tsx`, `HandoffRoleChanges.tsx`; server: `netlify/functions/handbook-draft.mts`. Tests: `src/test/handoffStage1–7.test.ts`, `e2e/handoff-stage1–7.spec.ts`. Research-log reads stay only in `firstQuestions.ts`, guarded by `handoffStage7.test.ts`; engine owns dates; AI returns IDs only.

1. **Stage 1, November 8:** outgoing person gains `Person.leftOn` and stays in `people` for history. All officer listings/validation—View as, Team, assignments, Settings, `aiSnapshot`, `commandContext`—use `officers(s)` from `src/data/permissions.ts`. New people receive example.org email. `syncSeasonRoles()` adds new roles to an open full season. New interviews are empty, no prefilled examples. Optional fields only; no schema increment.
2. **Stage 2, November 8:** `Successor` in `src/data/handoff.ts` supports a new person, existing current/former officer without duplication, or nobody yet. Existing person's old role becomes vacant, but the president role cannot be taken away or left vacant. Transferred open tasks become **Not claimed**, assigned to the successor or unassigned if vacant; successor must click **I've got it** and receives a notice. President interviews/confirms for vacant roles (`speaks`). `startRole` creates a one-role `HandoffSeason.partial`; Start handoff season converts it to full; `syncSeasonRoles` does not auto-add roles to partial seasons. Hand over to someone reopens a vacant role retaining interviews/handbook. `handbookSources` no longer includes every unassigned task for vacant roles. No schema increment.
3. **Stage 3, November 8, schema 21:** separate people from role terms. `RoleTerm` in `src/data/types.ts` tracks incoming/active/former. `src/data/roleTerms.ts`'s `normalizeTerms` runs **after every action** outside `reducer`, and on load, aligning terms with `Role.holderId`, `RoleHandoff.incomingId`, `Person.leftOn`; returns the same object if unchanged, so other code need not write terms. President may appoint before completion using `setIncoming` / `clearIncoming`. A new person is created immediately with `Person.incomingFor`; `isOfficer` is false: absent from officer/assignment lists and role permissions, present in View as, can read handbook/open tasks but cannot edit tasks. Existing people gain only an incoming term. Finish uses the appointed person and rejects a different successor. **First-week checklist moves after transfer**, completed by incoming person/president, no longer a transfer prerequisite. Saves v14–v20 gain terms on load. The original stage note prohibited merging before Phase 3 collection because this violated its no-`SCHEMA_VERSION`-change boundary; the later explicit approval above records the actual integration.
4. **Stage 4, November 8:** pure, non-AI `src/lib/roleDossier.ts`, no schema change. Four parts: Calendar (deadlines within 30 days of transfer plus standard role steps in each event), In flight (open work), People (role contacts without email/phone), Lessons (extension reasons, silence, late completion). Rows link source IDs to originals. `handbookSources` = tasks + `deadline:` / `step:` / `contact:` / `lesson:` dossier rows + interviews. Restricted contacts are excluded from shared handbooks via `publicOnly`, keeping content/freshness viewer-independent; dossier itself follows viewer permissions. Six handbook sections, `HANDBOOK_SECTIONS` / `sectionOf`; AI returns IDs; `localHandbook` rotates one source per section. `/api/handbook/draft` accepts new source types. `handoffRisk()` simply counts open work, ASU deadlines, lateness, blocks, evidence gaps; role cards sort by risk with red/yellow/green graphics and screen-reader reasons, details show top three reasons. **Deferred:** mixing role risk into Today's Needs a nudge, whose meaning remains the three steps most likely to miss; Juanxi must decide because it changes Phase 3 screens.
5. **Stage 5, November 9:** rule-based incoming flow/gap questions, **no AI**. Q2 declined AI guide sentences; AI-written gap questions were not implemented. `src/lib/handoffQuestions.ts`'s `questionCandidates` uses missing task purpose, unexplained extensions, silence, never-contacted relationships plus 2–3 generic prompts; at most 6 stable-ID questions, excluding restricted contacts. Outgoing answers become `Q: … A: …` interview lines, invalidate existing handbook for redrafting, or are skipped as unresolved; president answers vacant roles. `record.incomingId` marks each actual section Got it/Unclear; Unclear becomes a predecessor question. Three fixed read-back prompts use rough keyword coverage in `readBackFlags`, **not scoring**; outgoing chooses Add to handbook/Fine as it is. President may `startShadow` a small task; outgoing remains owner and incoming receives notice. Day-7/day-30 `review` with `day` records clarity/confidence/inclusion 1–5 and missing knowledge. **Only president, VP, incoming person see scores**, Q5. Add to dossier turns feedback into `lesson:review:` for next succession. Legacy unscored review still allows president day-30 record. Optional `RoleHandoff` fields `questions`, `reading`, `readBack`, `shadowNodeId`, `reviews`, `completedOn`; no schema change. UI `src/pages/HandoffNewOfficer.tsx`. Startup-entry budget rose to 520,000 in the November 9 decision record.
6. **Stage 6, November 9, schema 22:** role changes. `Role.formerNames` stores old names/end dates plus `renamedOn`; `saveClubSettings` preserves only the first true old name across same-day autosave renames, removes it on reversion, and never trusts form-supplied history. `Role.startNotes` stores president answers to 3 `ROLE_START_PROMPTS`; dossier adds `step:duties` original constitution/duties and `lesson:start:` answers; history-free role details expand prompts automatically. Leader-only `roleChange` in `src/data/roleChanges.ts`: `moveWork` transfers selected open tasks (Not claimed for target current holder, unassigned if none) and contacts. `closeRole` requires no current holder (first hand over to Nobody yet), excludes president, transfers remaining tasks/contacts/RACI role IDs/workflow `ownerRoleId`, reconnects subordinates to its superior, and **moves roles into `archivedRoles`**, with closure date/`closedInto`. **Archive, never delete**, D-6a: retain name/terms/handoffs/renames; names may be reused. Split = add in Settings + moveWork; merge = move all + closeRole. UI Change this role/Settings Closed roles in `src/pages/HandoffRoleChanges.tsx`. Saves v14–v21 gain `archivedRoles: []`.
7. **Stage 7, November 9, Q3:** product questions and research log remain one record stream. **No new question record type or logged item**, so no new IRB notice for a new record. At Handoff render time only, `src/lib/firstQuestions.ts` uses `getLog()` to **read** incoming person's existing `ui.ask` questions after the role's latest logged `setIncoming`, fallback `complete`. Same keyword coverage as read-back flags uncovered questions, displayed as Questions asked in Ask. **President/VP/incoming only.** Results never enter organization data, handbook, dossier, or **AI context**. Guard `src/test/handoffStage7.test.ts` rejects `getLog`, `interactionLog`, `LogEntry`, or `"ui.ask"` in `handoff.ts`, `roleChanges.ts`, `roleTerms.ts`, `handbook.ts`, `handbookDraft.ts`, `roleDossier.ts`, `handoffQuestions.ts`, `handoffRisk.ts`, `netlify/functions/handbook-draft.mts`; only `HandoffNewOfficer.tsx` may use `firstQuestions`. The no-research-data-in-prompts rule remains. **Deferred:** per-View-as Ask chat storage (`platypus.v1.chat` remains shared, last 60 messages; changing Phase 3 Ask needs a separate decision), and role FAQ aggregation.

**Claude's November 9 pre-merge fixes:** (1) previous succession moves to optional `DemoState.handoffHistory`; (2) `leaders()` counts current president/VP holders only and `suggestedOwner` selects from `officers()`; (3) incoming/former View as actors are read-only, outer reducer permits only `READ_ONLY_OK` handoff/view/AI-toggle/reset/clock/read/feedback actions and rejects claiming/creating/editing tasks, D-3a; (4) `repairLegacyHandoff` adds `leftOn`/example.org email for old completed handoffs in v14–v21, while v20/v21 skip `completeDemoSpeakerPlan`; (5) `dossierOwner` follows the new holder; (6) repeated same-day renames preserve original; (7) changing successor clears shadow/reading/read-back and never reuses incoming IDs; (8) approved `handbookFresh` marks stale only when cited records change/disappear, not on new records; (9) `draftPayload` prioritizes interviews within the server's 100-source limit, repeated silence for one task counts one Lesson; (10) Tasks/change cards/Plan check/local who-is-busy/meetings list current officers; (11) incoming can acknowledge actual sections only; (12) Q4 shows predecessor name/email/phone on incoming card, page only, never AI. Tests `src/test/handoffReview.test.ts`.

The original WP5 paragraph then recorded **schema 5**, **233 unit + 90 page tests**, retained earlier tests, a 40-question `evals/rules.json`, and live-interface support in `scripts/eval-rules.mjs` with mocks in CI. These older counts/schema are retained in their original context. **Live AI acceptance incomplete:** Netlify access blocked; Juanxi asked to stop logins and they stopped. Mock 40/40/local handbook is not DeepSeek/AIR acceptance; see `docs/AI_TESTS.md`, `docs/WP5_ACCEPTANCE.md`.

- **Server:** `netlify/functions/*.mts`, `/api/health`, `/api/ask`, `/api/parse-brief`, `/api/plan/draft`, `/api/replies/classify`; adapter `netlify/lib/ai.mts`, provider changes via environment.
- **Deploy:** `netlify.toml`, `npm run build`, `dist`, Node 22.
- Production https://platypus-officer-hub.netlify.app ; recorded main head in section 0. Night Mode draft PR #7 preview https://deploy-preview-7--platypus-officer-hub.netlify.app ; recheck PR/preview before using.

## 6b. v1.1 code map, October 23 (supersedes earlier page descriptions)

- Shell: `src/components/Layout.tsx` top bar/Demo/bell/navigation plus `src/components/rail/`: `RailContext.tsx` state, `Rail.tsx` two tabs/detail routing, `AskPanel.tsx` chat, `ChangeCard.tsx` review.
- Primitives `src/components/ui/`. AI: browser `src/lib/assistant.ts`, shared filtering `src/lib/chatCards.ts`, `netlify/functions/chat.mts` at `/api/chat`. v1.2 `src/lib/aiContext.ts` compiles viewer-visible data, excluding others' personal buffers/private messages, files, demo keys. Fictional read-only `src/data/sharedPool.ts`; `/api/pool` later removed in S2. Small changes use store `aiAutoApply` / `undoAuto`; larger use `reviewChange`. `/api/command`, `/api/ask`, `/api/nudge/draft` remain used.
- M4 setup: `src/pages/Setup.tsx`, Your club → Semester goals → Officer roles → Invite & workspace → First event. No departments; role-based task assignment and AI reads all role duties. `src/components/setup/ConstitutionStep.tsx` upload/paste/example constitution; `src/lib/constitution.ts`: `CONSTITUTION_SYSTEM`, `sanitizeRead`, browser rules `readLocally`, roles via `structureFromRead`. Pure `src/data/structure.ts` reporting/duty templates/role-name-to-function. `src/engine/orgChart.ts` / `src/components/setup/OrgChart.tsx` automatic role-name/reporting-line chart. `src/lib/localDocs.ts` stores constitution text in IndexedDB, cleared on Reset. `netlify/functions/constitution.mts`, `/api/setup/constitution`, no storage/`serverStorage`. Fields `Role.reportsToId/duties`, fictional `Person.asuId` beginning 9999, never AI context.
- Club workflows, setup step 5 and Settings → Workflow: pure `src/engine/workflow.ts` apply/undo/check ASU constraints/assign roles; `src/lib/workflowAi.ts` prompts/sanitization; non-storing `netlify/functions/workflow.mts`, `/api/setup/workflow`; `src/components/setup/WorkflowPanel.tsx` template-mode `MetroChart` plus step details, `WorkflowReview.tsx`. Stored `org.eventWorkflow`; new events use `orgSteps(state)`. AI proposes only; ASU rule steps are `isLocked`.
- Team meetings: `src/components/MeetingFinder.tsx`, When2meet-style weekly free-time painting stored in `freeSlots`, colored by count/selectable on right. `src/engine/team.ts`: `whoIsFree`, `cellsToSlots`, `availabilityGrid`. Calendar connection deferred.
- Events → Flow → Edit flow: pure `src/lib/flowEdit.ts` inserts between steps, disconnects/deletes, changes dependencies only; edit mode `MetroChart.tsx`; store `addEventStep`, `removeEventStep`, `restoreEventNodes`. No React Flow.
- Flow layout: pure/tested `src/components/flow/metro.ts` + `MetroChart.tsx`; board `src/data/board.ts`.
- Page helpers `e2e/helpers.ts`: `resetDemo`, `demoClock`, `ask`. If downloaded browser is absent use `PW_CHROMIUM=<chromium-path>`.

## 6c. v1.0 additions, October 29, integration/v1.0

- Tokens in `src/styles.css` `:root`, documented DESIGN_TOKENS. `.stylelintrc.json` scopes to styles.css; `eslint.config.js` prohibits inline styles except CSS-variable injection/data-driven left/top/width/height. CSS/inline styles in `src/organization/`, `src/phase1/`, `src/workspace/` were temporarily excluded. `npm run check` = lint + build + unit + page tests + `npm run words`; budgets section 7 item 5.
- Behind the scenes: `src/components/Bts.tsx`, Demo-menu toggle persisted in localStorage; off removes source explanations from DOM. `e2e/bts.spec.ts`.
- Touch: `Hover` in `src/components/ui/index.tsx` opens on tap without a mouse. `e2e/touch.spec.ts`.
- M2b task/event distinction: `src/components/rail/AskPanel.tsx`, `TaskFields.tsx`; task due in `src/engine/taskDates.ts`; Plan check `src/lib/eventReview.ts` / `netlify/functions/event-review.mts`, `/api/event/review`; prompt `src/lib/chatCards.ts`, strategy `docs/PROMPT_STRATEGY.md`.
- Former M3 Edit steps was removed; edit metro directly with drag/double-click node/edge/context menu/Undo via `MetroChart` / `src/lib/flowEdit.ts`. UI writes only `dependsOn`, `estDays`, `phase`, `phaseOrder` through `applyStepEdits`, `addEventStep`, `removeEventStep`, `restoreEventNodes`, logged as interactions. Dates remain in schedule. Desktop left-to-right; only viewport ≤700px vertical. `e2e/flow-edit.spec.ts`, `src/test/flowEdit.test.ts`.
- New IDs use `src/lib/ids.ts`, not array length. AIR only, DeepSeek preset rejected in `netlify/lib/ai.mts`. `docs/M4_ONBOARDING_PLAN.md`'s combined-onboarding proposal **was still awaiting Juanxi's review, unimplemented**, at this entry's date.

## 6c. v1.3 club CRM, Partners, October 29, approved by Juanxi

The repeated section number is retained from the source.

- Inspired by Twenty's separate people/organizations, timeline, tags, board; **no Twenty code imported**, an AGPL full backend.
- `src/data/types.ts`, schema **6**: `Organization`, `Contact` (position, contact details, Cold/Warm/Active/Dormant stage, source, introducer, tags, visibility), `Interaction` (who/when/action/outcome/next step/date/event). Contacts belong to roles via `ownerRoleId` and follow transitions. **No Deal/sponsorship pipeline** until the core stabilizes.
- Pure `src/data/crm.ts`, `src/test/crm.test.ts`; permissions `src/data/permissions.ts`. `canLead` moved from `changeReview.ts`, which retains re-export compatibility.
- Anyone adds contacts/organizations/interactions; owner/president/VP edits details; only president/VP deletes or reassigns owning role. `visibility: "leads"` is visible to president/VP/owner/creator; **same AI visibility**, `visibleContacts` in `aiContext.ts` / `commandContext`. No ordinary-member demo accounts, so the source's restricted-contact label effectively means president/VP + owner.
- `src/pages/Partners.tsx`: People/Board/Organizations, All/Mine/Overdue, type/owner/tag filters, tag/email search. Rail `src/components/crm/ContactDetail.tsx`, `OrgDetail.tsx`, `useRail().show({ kind: "partner" | "org", id })`. Shared `crm/parts.tsx`: blur-autosave Field, interaction form, timeline.
- AI `add_contact` / `mark_contacted` retained; organization found/created by name.

## 6d. Onboarding entry/records, November 2, approved

Design: `docs/ONBOARDING_REDESIGN_STRATEGY.md`; packages `docs/onboarding-redesign/`.

- First visit with no saved demo data, or reset before seeing welcome, routes `/` to `/#/welcome`: Start walkthrough (president then member preview) or Explore the sample club (Today). **Off by default**; enable build `VITE_ONBOARDING_WALKTHROUGH=true` or `?walkthrough=1`, before or after hash, parsed in `src/onboarding/gate/enabled.ts`. HashRouter means router search alone is insufficient. Off preserves old behavior.
- Demo Replay walkthrough logs activity. Test Onboarding Page President/Invite **do not log**, need no walkthrough query, at `/welcome/test/president`, `/welcome/test/invite`, `src/onboarding/gate/TestWalkthrough.tsx`. Use these for acceptance/debugging to avoid polluting study records.
- President 8 screens in `src/onboarding/founder/`: Name, Constitution, Goals, Team, FirstEvent, Reminders, Confirm, Invite; member 6 in `member/`. `engine/flows.ts` step/route map; `engine/useFlow.ts` route-driven next/back/skip/exit and recording. Entire president draft `draft.tsx`, independent IndexedDB `onboarding-draft`, not old `setup-draft`; copy in `copy.ts`. `/welcome/classic` retains old setup in focused shell. Start destination is `FOUNDER_START` in `src/onboarding/target.ts`.
- **All participants are presidents**, Juanxi November 1. Member flow previews the just-created club, no identity validation. **Only Done persists preview profile** via `saveProfile`; earlier choices remain sessionStorage `platypus.v1.onboarding.member` / `.extra`. No ASU ID in member flow, no president phone/ASU ID/email input; generated email.
- Behavioral records only, no content: `src/lib/onboardingRecord.ts`, new local key `platypus.v1.onboarding`, `.seen` / `.rearmed` flags and current attempt in sessionStorage. Per attempt: entry choice, `FLOW_VERSION` then `ob-4` (ob-3 optional First event, ob-4 Reminders), per-screen entry/back/skip/complete/exit times, outcome. Change version when flow changes. Reset **does not erase records**, only rearms entry. Export my data JSON top-level `onboarding`; no automatic upload. **Ask Juanxi before adding logged items**, as study/IRB scope.
- **Phase 3 entry/data, November 7 approval:** `https://platypus-officer-hub.netlify.app/#/start`; unhashed `/start` redirects through `public/start/index.html`; old `?walkthrough=1#/welcome/start` supported. Starts president flow and attempt; First event may Skip for now. Same-attempt refresh restores draft, new attempt blank. No example Name prefills; fictional officer names retained to avoid sending real names to AI. `startWorkspace`, `src/data/settings.ts` / `src/data/sampleScenario.ts`, builds participant club plus 3 fictional events/tasks/risks/funding/contacts/handoff season, mapped by role function. `src/lib/uiLog.ts` adds `ui.*` navigation/click/select/Ask question/answer-type/citations/source-link/export; no keystrokes or AI answer text. Export `formatVersion: 2` and `timeline`; see `docs/PHASE3_DATA_DICTIONARY.md`, `docs/PHASE3_SESSION_RUNBOOK.md`.
- **Reminders screen, November 8 approval:** after First event/before Confirm, optional/no preselection; fixed order Send automatically / I review, then I send / I review, Platypus sends; footer “Demo: no email is ever sent.” No reminders delivered in study. Optional `org.settings.reminderMode`: `auto_email`, `review_then_self`, `review_then_auto`; export `session.reminderModeChoice`. No actual email anywhere. `src/data/reminderMode.ts`, `src/onboarding/founder/Reminders.tsx`.
- Boundaries: no `/api/org/*` / `/api/workspace*`, no new AI endpoints, only `/api/setup/constitution` / `/api/command`; engine dates; no changing existing storage keys. Juanxi approved `SCHEMA_VERSION` / `DemoState` 22 with November 9 Handoff merge; later changes still require agreement. New `src/styles/ob-NN-*.css` guarded against `!important`, `transition: all`, bare milliseconds.
- Limits: standard-flow targets precede official-minus-buffer, so buffer controls do not change chain dates; adjacent example is engine-calculated. Refresh restores same-attempt draft; refreshing during constitution read rereads. Today one-time tip cut per priority order. No identity verification; invite works same browser, real accounts deferred to v1.5.

## 7. Interface rules, October 23 approved simplification

Read this section, then `docs/DESIGN_TOKENS.md`, before page changes; font/radius/layer/color use tokens only. Run `npm run lint`; Stylelint styles.css, ESLint inline styles, also CI. Source plan: https://claude.ai/artifact/QhCthf71crEC62bBua5zJD .

1. Three columns: left navigation, center, right **Ask** (only AI entry, `src/components/rail/`) / **Details**. No extra page AI composer.
2. Five primitives only, `src/components/ui/`: `StatusPill`, `Chain`, `.tbl`, `Hover` / `Info`, rail `useRail().open(...)`.
3. Glance color → hover up to 3 lines → click rail. No additional triangle expanders/tabs.
4. Titles 1–2 words; card at most one title line + one information line + status pill. Reasons/assumptions/sources in hover/Help; font size at least 14px.
5. Two main-area budgets, first-glance/total including hover/collapsed, measured by `npm run words`, approved October 29; either over fails CI. Today **160/450**, Events **180/420**, Rules **340/1700** (November 1 requirement: desktop all 64 sources without pagination; mobile 6/page), Tasks **130/130**, Team **130/290**, Funding **160/160**, Handoff **120/120**, Partners **120/120**, Settings **150/150**. Remove other copy before adding beyond limits; hiding text does not evade total budget.
6. Six consistent statuses: Not claimed gray, To do blue, Working on it orange, Waiting purple, Stuck red, Done green. Settings → Board may rename/recolor without changing meanings.

### 7.1. Motion, v1.6 plan approved November 1

Details DESIGN_TOKENS sections 9–11.

1. Durations/easing only `--dur-press/fast/base/slow`, `--ease-*`, `--spring-*`; no bare `150ms`, lint rejects.
2. Reduced-motion version always. Tokens become 1ms under `prefers-reduced-motion: reduce`. Script animation checks `prefersReducedMotion()` then reads `tokenMs()` from `src/lib/motion.ts`.
3. Animate only transform/opacity; no `left/top/width/height/margin/padding`, `transition: all`, or `!important`.
4. Interruptible, responds immediately to another action, no queue/UI lock.
5. Frequent page/row/button actions get at most `--dur-press` feedback or pure fade, no displacement.
6. Zero-delay desktop hover, S3 `e2e/feel.spec.ts`. Mobile bottom cards under `@media (hover: none)` may animate in/out but start immediately.
7. New work in package-specific `src/styles/dx-NN-*.css`; do not alter another package's files. New guards need a deliberate-violation regression check.

## 8. Branch names and Deploy Previews, October 27, approved

Read before changing branches. Earlier names such as `claude/platypus-perf-ui-polish-74k1ul`, `fix/setup-v3-completion`, and the two names `feat/activity-workspace-v1` / `feat/organization-setup-ai` for one commit made previews confusing.

### 8.1. Format

`<type>/<short-hyphenated-english-description>`

| Type | Purpose | Example |
| --- | --- | --- |
| `feat/` | Feature | `feat/organization-setup-ai` |
| `fix/` | Bug fix | `fix/task-create-entry` |
| `design/` | Visuals/design system/tokens | `design/token-scale` |
| `docs/` | Documentation only | `docs/audit-report` |
| `chore/` | Dependencies/CI/scripts | `chore/stylelint` |
| `integration/` | Combined work with preview PR | `integration/v1.1-fix` |
| `release/` | Release candidate | `release/v1.0` |
| `archive/` | Frozen archive | `archive/v0.1-2026-10-21` |

Lowercase/hyphens only, no underscores/Chinese/capitals. No AI names/random suffixes; `claude/xxx-74k1ul` was the counterexample. One purpose per branch, then merge/delete when authorized and safe. Noun/verb description, 3–5 words.

### 8.2. Preserve branches used by open PRs

The historical guidance equated `deploy-preview-3` with PR #3. It described rename as create+delete, head/base deletion as closing associated PRs, and closing/reopening as losing the old preview URL/number. **Those statements are retained as the historical explanation, not a fresh assertion of GitHub behavior.** Verify before acting. Its operative precaution was to merge/close affected PRs before changing branches and inspect open head/base references first:

```bash
gh api "repos/juanxiwu2005/platypus-officer-hub/pulls?state=open" \
  --jq '.[] | "PR #\(.number): head=\(.head.ref)  base=\(.base.ref)"'
```

### 8.3. Recorded branches, October 29

| Branch | Recorded purpose | Recorded restriction |
| --- | --- | --- |
| `main` | Production, push releases | Merge only with Juanxi approval, rule 3.4 |
| `v1` | Then same content as main | Preserve as #2/#3 base and Preview 3 dependency |
| `integration/v1.1-fix` | Preview 4, #4, main + S1/S2/S3 | Preserve DP4 |
| `feat/organization-setup-ai` | Preview 3, #3, v1 + `src/phase1/`, `src/organization/`, `src/workspace/` | Preserve DP3 |
| `feat/ai-native-phase1` | Preview 2, #2 | Preserve DP2 |
| `feat/ai-night-mode` | Preview 7, #7, DP5 + Night Mode + N1–N6 tokens | Preserve DP7 |
| `integration/dp3-dp4-merge` | Preview 5, #5, DP4+DP3 M1, AIR/hidden storage | Preserve DP5 |
| `feat/m2b-ai-intake` | Preview 6, #6, base main, DP5+M2a/M2b task/event/form/Plan check | Preserve DP6 |
| `integration/v1.0` | Preview 8, #8, base main, #7+#6 + S6–S9/M3/DeepSeek removal; https://deploy-preview-8--platypus-officer-hub.netlify.app | Preserve DP8 |

By November 1 v1.0/DP8 had merged into main; DP4–DP8 content was in main, leaving PR history. Post-release PR closures/branch cleanup: LAUNCH_STEPS section 5.

October 29 found these former redundant branches already absent: `fix/s1-ux-bugs`, `fix/s2-safety`, `fix/s3-perf`, `claude/platypus-perf-ui-polish-74k1ul`, `fix/setup-v3-completion`, `feat/activity-workspace-v1`, `docs/m2a-prompt-strategy`. No further action was needed then.

### 8.4. New work at that time

After v1.0 merged, create from freshly fetched main, not stale local main:

```bash
git fetch origin main
git checkout -b fix/<description> origin/main
```

The v1.6 exception integrated packages into `claude/determined-johnson-yrdxwf`, #10; see design-upgrade README for branches/rollback. Push your branch; **do not merge it yourself**. Juanxi reviews in GitHub first.

## 9. AI-native Phase 1 design gate, October 25, explicitly confirmed

AI-native, Activity-centered, Organization Context driven. Latest owner request overrides old section-7 UI rules only for `/phase1/*`; old pages retain behavior. The new shell allows central AI composer/content blocks/progressive disclosure; visual references only Apple HIG, monday, Notion Projects.

`feat/ai-native-phase1` began at latest v1. Scope: three clickable high-fidelity screens, fictional constitution-suggestion review, custom-role capability mapping, two workflow previews, architecture notes. `src/phase1/` is an isolated frontend demo, not the business model. Preserve deterministic engine/all existing tests/old pages/main.

**Stop after screens for Juanxi acceptance; no automatic real API/model integration, full planner, production database/accounts, long-lived Conversation storage, or real Handoff.** See `docs/phase1/ARCHITECTURE.md`, HANDOFF. Legacy standalone tasks/fixed RoleFunction/chat storage remain design debt; new-shell checks do not establish migration of the old application.

## 10. Organization Setup AI increment, October 25 (superseded section-9 stop for this increment)

After prototype review Juanxi explicitly requested continued implementation/deployment of constitution/role/duty-driven AI onboarding; PDF/Word/paste/fictional sample; department-grouped multi-role matrix; hidden RACI; editable Member/Exec Board workflows; real AI/per-step online saving; organization guide/prompt review. Approval covered this increment's APIs/storage, **not main merge, real identity, full planner, persistent conversation, or Handoff**.

- `feat/organization-setup-ai`, draft #3, base v1; preserve main/old branches.
- `/phase1/setup`: `src/organization/`, `/api/org/setup`, `/api/org/ai`; `/phase1/setup-legacy` preserves prior setup; do not migrate/reset old keys.
- Netlify Blobs isolated test workspaces; random HttpOnly cookie, revision/ETag conflict protection; drafts separate from approved snapshots. Fictional data only. Session lifetime separate from archive retention; expiry does not erase history. No cross-device organization accounts.
- Then-canonical `src/organization/prompts.ts`, five versioned stages, exact prompt visible in frontend and final Review reminder. Details `docs/organization/PROMPTS.md`; later v3 supersedes webpage prompts.
- Preserve tests; previous Phase 1 setup checks move to setup-legacy, new behavior separate. Distinguish mocks, real-file parsing, live-model results.
- Detailed verified limits `docs/organization/HANDOFF.md`. Never call onboarding storage a migration of the entire old app.
- **M1 October 27 decision:** hide this server storage including Activity Workspace by default, `ORG_SETUP_ENABLED` unset = off. Endpoints 404 without executing storage; `/#/phase1/` local examples only. Keep code/tests; AI_SETUP section 4.

## 11. Data foundation first; restraint in testing, October 26

**Data recording/management/governance underlies organization configuration; AI reads/proposes above it.** Persist inputs/actions before AI. Archive actions/originals/interactions/conversation/AI requests/results/adoption/rejection/errors/configuration history with server timestamps/provenance. Current snapshot is not history; session expiry does not erase archives. Sharing is controlled; private workspaces do not automatically share externally/across organizations.

Scope then: new Organization Setup, append-only `org-archive.mts` / `storage.mts`, client `archive.ts`, AI jobs/input/results, chunked originals/SHA-256, exports/original downloads. Old business pages were references, not fully migrated. Real accounts/organization membership permissions/cross-organization sharing/analysis/formal handoff needed later work; do not claim shipped.

Speed-first `muse-glimmer-30b`, `glm-5-3` only explicit Deep review/stronger model, routing v2 at this date. No automatic slow-model upgrade/additional AI evaluation. Juanxi stopped extra live tests and performs hands-on acceptance; necessary builds/small offline mocks consume no AIR quota. Keep GitHub CI, avoid unnecessary full-suite repetition. Latest handoff then: organization HANDOFF/DATA_FOUNDATION.

## 12. Organization Setup v3, October 26 feedback

- Five chapters: Constitution → Your team (departments/org chart) → Responsibilities (department/role duties, Check) → Activity workflow → Review. Remove Board work chapter, retain old fields/history. Right AI proposes whitelisted changes for approval before apply.
- Prompts outside product UI, server canonical `netlify/lib/organization/prompts.mts`, reviewed with Juanxi in development chat. `src/organization/prompts.ts` is legacy compatibility; never reimport into webpage.
- `setupLogic.ts`: stable IDs, manual-field protection, local reference repair, deterministic JSON compilation. JSON is machine-readable/Python-readable; never execute model-generated Python. Server recompiles on confirmation; distrust client compiled data.
- No-change Back/Next: zero AI calls. Do not clear entire duties/workflow. Upstream duty changes mark only related nodes. Role deletion prompts and removes invalid references only. Archive changes/requests/errors/approvals/originals.
- Separate output-limit/empty/incomplete stream/syntax errors. Archive raw output plus finish reason/characters/tokens/first-output/total time before parsing/validation. Never silently invent missing semantics or automatically repeat paid requests. Explicit native-schema rejection allows at most one fallback.
- Limited renewed approval: a few fictional-data live smoke calls to diagnose formatting, not a full evaluation. Muse default, GLM only Deeper review. Distinguish tests from inferred queuing; first-output wait alone does not prove provider queue.

### v3.1 measured addendum

AIR accepting json_schema does not ensure correct shape; prompt exact fields and validate locally. Muse requested none but returned low; configuration is not execution. Routing v3: Gemma long structure, Muse short edits, GLM explicit depth. Observed aliases organization/name/department_id/duties/quotes may be strictly translated, never fabricate missing duties. See V3_CHANGELOG.

## 13. F1–F7 audit fixes, October 26 approved execution

Owner authorized separate-worktree multi-agent audit implementation from `feat/organization-setup-ai@54e5823`, integrated on `fix/setup-v3-completion`, no main changes. Data/AI/UI each had one file owner; coordinator owned contracts/docs/consumption of approved workspace configuration; independent review. Current facts then in organization F1_F7_IMPLEMENTATION; six-chapter/page-prompt/v2-routing descriptions historical.

- Preserve unsaved full draft privately in workspace-local protection; internal navigation waits for save. On 409 keep local copy for human choice; do not overwrite remote with a new revision automatically. Operation events are not a directly restorable full draft.
- Hierarchy reparent/disconnect is a human decision. Display-only edits do not invalidate duties checks unnecessarily; semantic changes review only related nodes. Explicitly resolve needsReview before confirmation. Unassigned steps allowed only with unresolved items recorded.
- Reuse Check by semantic inputs, including empty risk. Run once automatically on entry. Skip must not claim to cancel an already billable request. AI changes still require approval.
- selection is server-validated screen/entityType/entityId, never authorization. requestId identifies one explicit user action; replay reuses it, new ID means active retry.
- Archive originals/failure transport metrics before parsing. Separate site job waiting from provider waiting; first-output latency alone proves neither. No automatic live regression calls/paid comparisons.
- `/phase1` consumes server approved.compiled, never unconfirmed draft or old localPreviewRepository. Examples only explicit `?example=1` or setup-legacy. Old Today/Tasks remain separate business pages.
- Full Board planner/accounts/cross-organization sharing/old-business database migration excluded; template names do not establish a working planner. Production merge/release still requires approval.

## 14. Activity Workspace, October 26 implementation approval

Owner chose A1 home/B1 event list/C2 timeline and authorized the full separate-worktree multi-agent plan in organization ACTIVITY_WORKSPACE_PLAN. Coordinator owns shared schema/routes; Data/Schedule/UI/AI/Setup have unique files; independent review, contracts before parallel work. Home priorities deterministically rank existing tasks, default 3 expandable, no AI summary. AI uses the same validated commands to change business data/forms/create Member/Executive work items; never direct database writes. Private test actors are not real login. Preserve old demo/main, no automatic live AI evaluation.
