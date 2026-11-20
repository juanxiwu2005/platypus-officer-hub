# Three-stage duty-matching implementation plan

> **Status changed:** after trying it, Juanxi requested restoring main onboarding, removing the current matching experience, and redesigning from references/sketches after reading the proposal. All three stages rolled back this round; historical implementation `5e301d9` archived. Original plan/acceptance record retained below. Latest: [strategy for review](MATCHING_STRATEGY_FOR_REVIEW.md), [rollback handoff](MATCHING_ROLLBACK_HANDOFF.md). Do not continue the original UI without renewed interaction confirmation.

2026-11-16 (America/Phoenix) · Codex · Plan baseline `claude/fervent-thompson-e2j5u2@3a9fa94`

Juanxi selected A2/B2/C2: AI drafts duties from constitution for human confirmation; tasks link to duties; multiple people per duty use defaults/backups. Three independently reviewable stages quickly establish reusable matching architecture and connect existing creation flows.

**Execution gate is Juanxi's instruction: “Start each stage after I approve.” On 2026-11-16 Juanxi separately approved all three; latest “continue stage 3.”** Independent-worktree development/integration/review per stage; stage approval separate from `main` merge/formal release. Actual stage 3 results/gate limits: [handoff](MATCHING_STAGE3_HANDOFF.md).

## Selected scope/goals

| Option | Goal |
| --- | --- |
| A2 | Retain constitution upload/AI role extraction; promote duties to independent sourced/editable/confirmable records; always allow manual additions |
| B2 | Template steps link to organizational duties, then candidate members; same duties reusable across workflows |
| C2 | Default assignee/backup per duty; central handling of unqualified/unavailable/ambiguous people, never silently first in list |

First complete “task matching,” first of six automatic-reminder items. No concurrent new RACI rules, reminder plans, emails, email links, background sending, or organizational handoff. Existing deterministic date engine, production identity rules, and live site keep their boundaries.

Target flow: fictional constitution→review roles/duties→link members/default/backup→link workflow steps→resolve unassigned items→create actual tasks/save assignment provenance. Reusing confirmed templates requires no AI member selection.

## Stages/approval status

| Stage | Focus | Deliverables | Start status |
| --- | --- | --- | --- |
|1| Data contract/deterministic matching | Duty model, relations, candidates, explanations, offline scenarios | Technical checks/independent review complete, awaiting acceptance |
|2| Constitution AI/duty setup | Working library, source review, member links, defaults/backups UI | Development/desktop/mobile/independent review complete, awaiting acceptance |
|3| Actual tasks/integrated acceptance | Unified event/standalone adapter, compatibility, browser acceptance/review | Integration/review complete, awaiting acceptance; baseline full-gate timeouts in handoff |

Stages 1 and 2 may use isolated practice entry; stage 3 must reconnect actual creation. An isolated practice page alone is not all three stages complete.

## Shared data/rule agreements

### Independently stored relations

Stage 1 establishes shared `src/matching/` contract for later agents. Required concepts below; stage 1 lead commits/freezes actual TypeScript fields/operation signatures first.

| Data | Minimum | Purpose |
| --- | --- | --- |
| Duty | Stable ID, name, definition, deliverables, exclusions, source, confirmation, revision | No role-title guessing; rename preserves links |
| Role/duty relation | Existing role ID, duty ID, confirmation/source | Multiple duties/role, multiple roles/duty |
| Member eligibility | Existing member ID, duty/role relation, manual exceptions, required qualification confirmation, availability | Deduplicated qualified candidates; duties do not grant administration |
| Template-step requirements | Workflow ID, step ID, primary duty, unresolved composite-task marker | Shared duties across workflows, no same-name step crossover |
| Default rules | Duty ID, primary assignee ID, backup ID | Default arrangement checked separately from eligibility |
| Assignment result | Task ID, actual assignee, matching basis, rule revision, manual override/confirmation | Explainable, recalculation does not overwrite confirmed results |

Roles/members/tasks reference existing stable IDs; no duplicate full membership lists. Relations support multiple duties/person, multiple people/duty, leaving room for future full multiple-role appointments.

Version one reuses member input, prioritizing independent member/duty relations. `Role.holderId`/`Person.roleId` remain in legacy permission/handoff logic; duty eligibility is not role administration, and full member management is not rebuilt here.

### Deterministic C2 selection

1. Preserve valid confirmed manual assignments; invalid assignee prompts resolution, no silent replacement.
2. Current eligible members from confirmed duty relations, deduplicated by member ID; known unqualified, departed, unavailable people excluded from normally available candidates.
3. Qualified/available default preselected with explanation.
4. Unavailable default/available backup: suggest backup, await confirmation; never silently mark accepted.
5. No default but sole qualified/available candidate may be preselected; multiple await choice.
6. Missing/unconfirmed duty, no qualified candidates, unknown required qualifications, all unavailable: explicit unresolved state/reason; no `roles[0]`/president fallback.

External-action qualifications human-confirmed initially, distinguishing known qualified/unqualified/unknown; never pretend school-account verification. Assignment, preselection, claiming are distinct.

### Duty/workflow boundaries

- One primary duty per ordinary execution step; composite steps remain “split or define coordination,” not declared fully executable by matching one specialty.
- Individually map all 46 standard step types or mark unresolved; unresolved cannot autoassign via legacy functions. No full policy-duty coverage claim without itemwise review.
- Second different editable example validates extension; no complete freeform generator/canvas rebuild.
- Confirmed template links apply to future tasks; template/default changes never automatically reassign existing tasks.

## Stage 1: data contract/matching rules

### Changes

1. Lead establishes sole shared contract, input validation, exports: duties/candidates/defaults/backups/unresolved/provenance.
2. Pure create/edit/merge/deactivate/reference-check operations; humans decide synonym merges; stable references retained or explicitly reconnected.
3. Shared candidate resolver/C2 selector independent of nine `RoleFunction` categories.
4. Versioned configuration read/write/import validation; practice isolated from business saves, no premature rewrite.
5. Readable scenarios with 10–20 fictional members/two workflows; rules testable without AI.
6. Stage 3 compatibility design—field locations, defaults, provenance, snapshots, necessary outer-version migration—document with stage 1, not improvised during integration.

### Worktree split

| Package | Scope | Example ownership | Dependency |
| --- | --- | --- | --- |
| Lead contract | Shared types/exports/fixtures/docs | Planned `src/matching/contracts.ts`, `index.ts`; lead alone edits shared files | Complete/compile first |
| S1 Data | Duty operations/source-confirmation protection/configuration/version validation | Planned `src/matching/library.ts`, `repository.ts`, tests | Worktree from frozen contract |
| S1 Resolver | Eligibility/default/backup/unresolved/manual-choice preservation | Planned `src/matching/resolve.ts`, tests | Same frozen commit |

Lead integrates both, then independent read-only review; original owner/lead fixes issues, reviewer does not simultaneously edit shared files.

### Acceptance

- Arbitrary duty/role names; two workflows reuse duty ID.
- Two eligible members' results independent of array order; same person eligible through multiple roles appears once.
- Deterministic valid-default/backup/no-availability/unknown-qualification/missing-duty results.
- Manual decisions protected; archived duties/invalid members prompt rather than silent use.
- Save/restore consistent; old saves lacking configuration retain tasks/people.
- Readable fictional inputs/assignment table, test results, stage 3 compatibility design for noncoders.

Report after stage 1; await ungranted stage 2 approval, no early AI/UI work.

## Stage 2: constitution AI/duty setup UI

### User flow

Reuse constitution upload/role extraction. Duty bubbles below roles open definition/deliverables/source. Users create/edit/merge/confirm duties, select eligible existing members, defaults/backups. Manual continuation on AI failure/no constitution/partial extraction.

### Changes

1. Reuse PDF/docx/text reading/ASU AIR adapter; structured duty extraction, not short current `duties` strings as complete catalog.
2. Compatible extension/internal branch of existing constitution endpoint; old structure/duties requests remain; lead owns public request/result contract.
3. Match quotes to original; unmatched cannot be verified source; distinguish manual additions/AI suggestions.
4. Retain manual-field protection; local retries/confirmed-content preservation/stale-request cancellation/no repeat requests without changes.
5. Duty/member/default/backup/assignment-preview UI consumes stage 1 resolver.
6. Prefer independent matching entry for UI acceptance; lead wires Team/Settings consistently.

### Worktree split

| Package | Scope | Example ownership |
| --- | --- | --- |
| S2 Constitution AI | Extraction/client/source validation/mocked endpoint tests | Planned `netlify/lib/matching/`, `src/matching/constitutionClient.ts`; compatible `netlify/functions/constitution.mts` extension |
| S2 UI | Library/source review/member/default/backup components | Planned `src/matching/ui/`, dedicated styles/component tests; no others' AI/shared contracts |
| Lead | Request contract/legacy entries/shared style imports/config | `src/App.tsx`, `src/onboarding/`, Settings wiring; read design tokens first |

Both worktrees from same stage 1 integration commit; UI starts with frozen mocked results, then joint verification.

### Acceptance

- Fictional specialist club roles/duties accurately shown without programs/marketing classification requirements.
- AI output has checkable sources or explicit suggestion labels; edit/merge/confirm/refresh persistence works.
- Timeout/format/partial failure/stop preserves manual content; setup works without AI.
- Invalid/duplicate defaults, ineligible backups, unknown qualifications/unavailability detected.
- Desktop/mobile setup, keyboard/basic accessibility passed.
- Report mocks separately from real model results; no automatic large live evaluation by default.

Acceptance uses feature preview; if initial Draft PR needed, include creation in stage 2 approval and lead posts it here, leaving unmerged. Report after stage 2; wait for ungranted stage 3 approval.

## Stage 3: actual creation/integrated acceptance

### Changes

1. New events, first-setup events, standalone tasks share stage 1 resolution/assignment, including `newObjects`, `completeSetup`, template save/forms.
2. Store config/actual provenance in organization data, referencing existing role/member/task IDs; explicit import of isolated practice only, no second long-term business source.
3. Implement stage 1 compatibility; exact `DemoState`/schema/export/restore changes listed in prior handoff before stage start, within approved stage 3. Save recoverable snapshot first, no data reset.
4. Explicit new-mode entry: legacy organizations without config remain compatible; enabled mode missing duties/candidates returns unresolved, never silently legacy `roleFor`.
5. Keep `fn` for old pages/dates/compatibility, no new eligibility constraints from it. Rule engine still calculates dates.
6. Separate assignment/claim confirmation in new mode; do not mass-rewrite existing states; new claims match selected flow, controlled budget steps preserve rules.
7. Review primary duties/composite deliverables/unresolved reasons for all 46 standard steps. Standalone explicit manual assignment allowed as one-time decision, duty gap visible, not hidden by reassignment.
8. Validate same library/resolver with second workflow, no second name-guessing allocator.

### Worktree split

| Package | Scope | Example ownership |
| --- | --- | --- |
| S3 Workflow Adapter | Template requirements/mapping/existing graph-creation adapter | Planned `src/matching/adapters/`; assignment-only changes in `src/engine/playbooks.ts`, `workflow.ts`, no date rules |
| S3 Integration Test | Multiple workflows/candidates/legacy saves/claims/browser regressions | Dedicated matching tests/fictional fixtures/`e2e/`; explain related old-test behavior updates |
| Lead | Business state/schema/creation/UI wiring | `src/data/types.ts`, `store.tsx`, `settings.ts`, `changeReview.ts`, `seed.ts`; exclusive shared-file edits |

After integration, independent Review worktree from final candidate, read-only; review integrated result, not individual branches alone. Findings separately fixed/retested.

### Acceptance

- Actual creation through existing entries, assignee agrees with preview/duty basis; multiple candidates do not duplicate tasks.
- Creation/reopen/refresh/export-restore preserve confirmed links/assignment; old tasks/people/history retained.
- Browser cases for invalid default/available backup/all unavailable/no duty/manual reassignment.
- Two workflows share duties; template edits do not alter history.
- No fixed-function fallback without candidates; incomplete setup explicitly unresolved.
- Relevant date/permissions/claim/budget/handoff regressions passed; baseline/new failures distinguished with evidence.
- Final preview, simple steps, changes, tests, limits, rollback. Local practice not represented as formal multiuser service without real cross-device organizational permissions.

Three stages passing means feature complete on branch; await acceptance/release arrangements, no automatic RACI (second of six items).

## Worktree collaboration/integration

- After each approval, verify remote/workspace/prior results, then create worktrees/delegate; no early unapproved stages.
- Retain target `claude/fervent-thompson-e2j5u2` name/preview identity; no rename/delete.
- At most two coding subagents, independent worktrees/branches/exclusive scopes; lead commits shared contract first, no competing data shapes.
- Descriptive subbranches, e.g., `feat/matching-library`, `feat/matching-resolver`, `feat/matching-constitution`, `feat/matching-ui`; check collisions/other-session use first. Do not borrow existing setup worktree.
- Subagents commit own branches, never push target; lead reviews/integrates preserving commits, owns docs/conflicts/shared files/final push; no force-push/main merge.
- Reviewer follows development delivery, respecting concurrency budget; final commit/interfaces/data protection/no-match behavior reviewed.
- Separate browser ports/generated directories for tests/builds; reuse existing dependency versions; explain exact reason/scope before necessary new dependency/build-config change.
- Record baseline/package commits/files/commands/results/limits each stage. Commit/push does not itself verify preview or real AI.

## Checks/rollback

Stage 1 emphasizes behavior unit/types/compatibility-design review; stage 2 adds mocked services/components/desktop/mobile; stage 3 integration/related regressions/one full release gate. Use relevant `npm run lint`, `npm run build`, `npm run typecheck:netlify`, `npm test`, Playwright; full `npm run check` after final integration, not repeated by every agent.

No live-model batch regressions. Necessary small fictional diagnostics/manual online acceptance recorded separately; mocks are not provider performance. Preserve same-baseline reproduction for preexisting failures; no deleted assertions/resets/weaker gates to manufacture passage.

Preserve commits per package/stage. Snapshot before stage 3; prefer disabling entry/mode then code rollback, retaining config/tasks; never Reset demo as rollback. Concrete version-recovery path required in stage 1 and tested stage 3.

## Status/next

All three implemented under individual approvals. Stage 3 connects library to business source/actual tasks, 22→23 migration, 46-step review catalog, cross-tab overwrite protection. [Stage 1 practice](MATCHING_STAGE1_HANDOFF.md) · [Stage 2 operation/delivery](MATCHING_STAGE2_HANDOFF.md) · [Stage 3 operation/checks/limits](MATCHING_STAGE3_HANDOFF.md) · [Implemented compatibility/rollback](MATCHING_COMPATIBILITY.md). Await Juanxi acceptance; no automatic RACI/reminder plans/email/newcomer onboarding/main merge. Local backup needs synchronization.
