# Integrating responsibility matching with existing archives and rollback

> **Experience rollback is complete:** the new responsibility mechanism is withdrawn and the old Pause button hidden. The current app still reads/writes 23 and retains inactive archive fields without resetting tasks or downgrading archives. The original stage-3 compatibility design follows; current behavior is governed by the [rollback handoff](MATCHING_ROLLBACK_HANDOFF.md).

2026-11-16 (America/Phoenix) · Stage-1 design, implemented in stage 3 after Juanxi said "continue stage 3."

Stage-1 data operations/parser still read only injected member/role references, without importing the old store. Stage 3 integrates business through `organizationMatching.ts` and adapters, keeping real organizations separate from isolated practice. There is one canonical business matching record, without long-term dual writes.

## Current limitations

Main business uses `loadStateWithNotice`, `saveState`, and `buildExport` in `src/data/store.tsx`. Stage 3 raises outer `SCHEMA_VERSION` 22→**23**. `saveState` serializes the complete business object into one key; old readers supporting only 22 cannot serve as feature rollback.

`Org.id` often comes from demo seeds. Repeating onboarding may reuse that ID, so it alone cannot establish that new configuration belongs to the same organization workspace. `Role.holderId` and `Person.roleId` still support old permissions, handoff, and pages; do not mass-rewrite them to form eligibility pools.

## Implemented storage layout

The existing business object gains an optional matching namespace and a separately generated/persisted local workspace identity. Matching configuration references existing role/member/step/task IDs without copying complete rosters.

- `Org.matchingWorkspaceId`: stable local identity created on first explicit enablement; a new organization workspace gets a new identity. It is not a login or organization authorization credential.
- `DemoState.matching`: `MatchingState` for that identity, with independent `schemaVersion: 1`.
- `DemoState.matchingContext`: source review, constitution input/action history, member availability/qualifications, one-task manual exceptions, preview-import identity; no duplicate matching state or member names.
- `Node.matching`: this actual task's workflow/step/responsibility identity and pending reasons; enabling does not backfill historical nodes.
- Organization settings record whether matching mode is enabled; unset follows legacy compatibility. Responsibility parsing does not depend on `RoleFunction`; old `fn` remains only for unmigrated display, permission, and date code.
- Specific-task assignment receipts remain in `MatchingState.assignments`, located jointly by task/workflow/step; actual executor remains the task's `ownerId`. Generate task and receipt in one business operation and save together.

Stage-1 `platypus.matching.v1:<organization-identity>` and stage-2 `platypus.matching.setup.v1:<context>` remain isolated practice. Stage-2 preview can only explicitly import the current organization after checking context/role/member references; reject sample or other-organization references. Preview cannot overwrite a nonempty responsibility library. Import excludes hypothetical task receipts, preserves provenance, and does not append duplicates on repeat. Keep original preview keys; subsequent actual edits write only the canonical business record.

Before ordinary operations, confirmation operations requiring persistence, and app/log autosaves, Provider compares the actual main archive's complete raw value with the page's last read/write. Main-key storage events immediately pause stale tabs. On a completed external write, retain the in-memory copy for download and require reload to use latest data. This detects completed overwrite conflicts but cannot provide atomic cross-tab transactions; cross-device/real multi-user work needs server authorization and atomic revision control.

## Outer-version migration

Stage-2 baseline `dbfc47d` confirmed as 22; stage 3 uses 23. Commit compatibility-reader point **`e370361`** before feature-writing commits.

Migration has two layers:

1. Before upgrading an outer-22 archive, save original raw to `platypus.v1.demo.backup.v22`. Backup failure shows the reason and pauses business writes; downloading the original still requires reload/retry. Never overwrite first. Normal upgrade preserves organization, people, tasks, statuses, reminders, history without inferring responsibilities, reassigning tasks, or rebuilding event graphs. Version 23 only normalizes existing terms, without rebuilding graphs.
2. Matching migration validates independently by `MatchingState.schemaVersion`. Supported configuration integrates unchanged; corrupt, identity-mismatched, or higher-version configuration retains original data/recoverable copies, pauses new matching, and shows the reason; do not delete the organization or restore samples.

Each migration must be idempotent. Reopening must not duplicate responsibilities, membership relationships, or imported receipts. Preserve original recoverable copies before migration/import; save failure cannot report success or first delete originals/copies.

Initial responsibilities, role relationships, and member qualifications require user review. Old free text, template defaults, and old role names are not automatically constitution-confirmed facts. Required external qualifications default to unknown; role names do not prove school-system accounts.

## Existing and new tasks

| Situation | Integration behavior |
| --- | --- |
| Existing task without matching receipt | Preserve owner/status; identify legacy assignment as unlinked to responsibilities, without inventing past human confirmation |
| User explicitly connects an existing task | Show responsibility, candidates, current executor; append a genuine new receipt after confirmation |
| New event or standalone task | Resolve confirmed requirements; only explicitly confirmed assignments enter actual tasks; preselection/backup suggestions do not mean acceptance |
| Matching enabled but responsibility/candidates missing | Leave pending; do not fall back to nine functions or first-listed person |
| Template/default-person change | Affects future tasks; confirmed receipts remain; invalid candidates prompt review |
| Manual owner change on old pages | Record actual reassignment. Legacy unlinked tasks keep only a one-time manual exception, responsibility empty; workflow uses original event playbookId, otherwise task identity, never current-template inference. Existing tasks retain own links; distinguish valid confirmation receipts from unqualified manual exceptions |
| Same step in two workflows | Use explicit compound workflow/step identity, not titles or ambiguous delimiter concatenation |

Business logic still handles claiming. Assignments to others remain unclaimed; self-claiming checks matching grounds and existing permissions. Task buttons, core transitions, and Board dragging share protection. Reassignment uses the original owner-transfer core to advance ownerVersion, assignedOn, etc.; old signed links cannot revive after reassigning back to the same person. Budget steps, dates, existing role permissions remain unchanged.

## Organization reset, export, recovery

Recreating a workspace explicitly generates a new matching identity and provides retention/export for old configuration, preventing old receipts from matching reused task IDs. Ordinary role/responsibility renames retain stable IDs; role deactivation, member departure, responsibility archival show specific invalidation reasons without resetting data.

Full business export must include matching configuration, revisions, receipts. Standalone matching export represents only that configuration, not a full organization backup; validate current identity/external references before import. Higher-version exports remain downloadable verbatim; do not silently downgrade by deleting unknown fields.

## Rollback must retain compatible readers

Do not feed outer-23 archives to readers supporting only 22. Compatibility point **`e370361`** reads 23 and preserves matching, unknown nested fields, nodes, history unchanged; it must not be reverted with the feature. Full business export/explicit restore includes matching/context; back up current configuration before restore.

Prefer **Pause responsibility matching** on the responsibility-library page, retaining configuration/tasks. For code rollback, use compatibility point `e370361`. No lower-version projection/recovery tool was delivered; arbitrary return to 22 is unsupported. Do not lower version numbers directly, Reset demo, clear localStorage, or discard matching data as rollback.

Required regressions are in stage-3 creation/persistence/recovery UI/adapter cases: 22-backup failure protection, repeated migration, corrupt/higher nested-version preservation, workspace isolation, real enable/import without old-node edits, full export/restore, historical links surviving template switches, disabled mode, signed-link invalidation, completed cross-tab write conflicts. Itemized results/unverified scope: [stage-3 delivery](MATCHING_STAGE3_HANDOFF.md). These do not establish real power-loss, server-concurrency, or cross-device behavior.
