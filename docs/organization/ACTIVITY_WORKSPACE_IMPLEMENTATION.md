# Activity Workspace implementation handoff

2026-10-26 · Codex · Based on `1815be0`; user approved A1/B1/C2, multiple-agent worktrees, and two final additions: priorities select existing tasks directly; global AI queries/adjusts/creates business objects through unified commands.

## Current structure

- New `/#/phase1`: Home, My tasks, Activities, Organization setup. Recent activities lists actual member events only, at most five, excluding setup templates/Executive Board work.
- Home deterministically ranks existing personal tasks (three by default, expandable): owned/collaborative, explicitly awaiting their approval, manager's unassigned work. No padding with future tasks offering no current action; no AI summary. Two overviews: Member Programs and Executive Board.
- Activities searchable/filterable/sortable instance list. Four-position short chain projects task DAG/phases, showing parallelism/real counts/blockers. Personal-board sorting does not alter workflow; phase-collapse cycles rejected.
- Details defaults Timeline, dates from same scheduling function; tasks/approvals/Funding inside event. My tasks defaults three active columns; Done enters collapsed history through completion button; reopen checks downstream impact.
- Separate Funding applications link task/Gate/version/source/fixed funds-needed deadline. Submission is not approval; reservation/spend/release recorded separately, cumulative limits encoded. Existing financial history cannot change source attribution.
- Five clickable/savable Setup chapters. Activity Workflow has 8/7/6-week preferences, relative bands, node labels; select-line delete/undo/keyboard-touch alternatives. Central affected-item review replaces per-node Connections/all-any/Mark reviewed. Organization documents under Constitution.

## Shared data and time

`src/workspace/contracts/` defines stable IDs/status/tasks/approvals/funds/commands. Templates/instances versioned separately; preview before adopting new template/default timing, preserving completed history/manual edits. Names are labels, references IDs; current org name/department colors/roles share one source, history unchanged.

`netlify/lib/workspace/` and `/api/workspace` persist runtime data. Forms/AI share allowlisted commands. One workspace JSON CAS write commits command's tasks/approvals/funds/audit outbox; 409 never overwrites, command IDs/persistent receipts support replay. AI proposals for different objects approved separately, no arbitrary cross-platform transaction promise.

Product combines Waiting/Stuck as Stuck, retaining multiple precise reasons/targets internally and clearing only satisfied conditions. Prerequisite-unready tasks stay To Do, independent branches continue. Ordinary approval requires explicit Gate/approver, never title or RACI A inference; old Gates/applications cannot approve current tasks.

8/7/6 weeks are organizational preferences (56/49/42 calendar-day completion targets), separate from school rules. Official deadlines use university business days; officer duration uses personal workdays. Explicit USG food/services use R09, guests R10; no indiscriminate College/other application. R01 covers on-campus and university-funded off-campus member events. Funds-needed deadlines do not shift on event reschedule. Reliable student calendar currently 2026-08-20–2027-05-08; outside, explicitly refuse fabricated schedules.

## Global AI and saving

`src/workspace/assistant/` is sole visible right-side chat, retaining conversation across pages; collapsed by default on narrow screens, entry always present. Setup bridge saves current edits before requesting/adopting org proposals, preventing stale drafts overwriting.

`netlify/lib/workspaceAssistant/` plus two assistant functions provide persistent background jobs, current-object context, ID/search pagination, org/business proposals/creation forms. Can draft dedicated member-event/Executive Board workflows, creating via same form. Humans enter dates, engine computes; org changes enter drafts, update approved config only after confirmation. Models cannot change permissions/system time/archive/historical approvals or fabricate external approval evidence.

Route synchronizes selected task deep-link ID; central nonmodal task details do not cover AI. Check unsent forms before applying proposals; sync server changes only into fields untouched manually, retain conflicts/request review, never restore submitted progress as unsent content.

Archive raw replies/failure metrics before parsing. Phase grouping cached by structure, not regenerated for status/order changes. Lost response after business submission recovers from operation receipt, avoiding duplicate business actions/paid calls.

Runtime state server-side; local storage protects only unsent input, never copies new org into old demo localStorage. Members/creation/tasks-events/funds-approvals/AI input isolated by workspace/object; recovery requires latest saved-version review. Global shell/Setup share navigation coordinator, leaving/replaying history only after all checks pass.

Still private test sessions. Fictional members/roles support binding/multiple roles/shared ownership and explicit demo identities; cookie proves workspace access, not real membership. Production accounts/invites/cross-device multiuser authorization excluded.

## Verification and local environment

Final product `3e9c69a`. One complete sequential post-integration run passed:

- `npm run build`: TypeScript/Vite passed.
- `npm test -- --maxWorkers=2 --minWorkers=1`: 36 files/548 passed.
- `npm run e2e -- --workers=2`: 272 scenarios, 256 passed/16 conditional skips/0 failed; final `.last-run.json` passed, failedTests empty.
- 16 skips: 12 duplicate old mobile a11y/keyboard, 1 hover inapplicable to touch, 3 desktop-pointer/extra-history scenarios. New mobile Back/Forward/recovery/task sync/AI task targeting/form protection/axe actually passed; not physical-phone/Safari evidence.
- Real local HTTP: 7 groups/34 requests, including same-version concurrency one success/one 409; direct local-storage CAS probes, 3 rounds ×8 concurrent, each one success/seven 412 after fix.
- Independent Review through `3e9c69a`, no known open P0/P1; final 19 targeted checks passed, [independent record](REVIEW_ACTIVITY_WORKSPACE.md).

Integration-workspace logs `.scratch/activity-final-build.log`, `activity-final-unit.log`, `activity-final-e2e.log`, `workspace-http-smoke-report.json`. 0 real AI generations, no model-quality/actual-speed acceptance; local success is not remote CI/deployment success. Later commits documentation only.

Actual local Functions/Blobs simulation verified initialization/draft-role binding/template confirmation/funding instances/task-approval interaction/refresh/replay/limits/401/409/concurrent conditional writes. Final results above exclude online storage/real AI.

Local `@netlify/blobs@11.1.6` emulator lacks GET/HEAD ETag and atomic PUT-condition locking: first integration caused product 503; direct concurrency probe found repeated same-version writes. Fixed only external development simulator's content ETag/per-key serial write queue, preserving strict product CAS. Reproducible `/workspace/.cloud-tools/platypus/patch-local-blobs-etag.mjs --serialize-put`, no node_modules/lockfile commits. Local simulation success is not online Blobs acceptance.

## Collaboration/boundaries

Independent worktrees activity-integration/data/schedule/ui/assistant/setup/review. Unique Data/Schedule/Workspace UI/AI/Setup UI file ownership; lead owns contracts/shell/members/docs/integration, independent Review checks plan/code/recovery.

Old pages/examples/`/#/phase1?example=1`/setup-legacy retained for reference, no automatic fictional-seed migration. Continued PR #3; main/production unchanged. Remote CI/deploy/real-AI quality need separate verification, never replaced by local results. Product docs need user's local backup sync.
