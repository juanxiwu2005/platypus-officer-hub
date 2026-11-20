# Job matching access to existing archive and rollback

> **Currently completed experience fallback:** new mechanism has been removed and the old Pause button is no longer displayed; The application is still reading/writing 23 and retaining a non-run archive field, without resetting the task or downgrading it. The following are the compatible design records for phase 3, with current behaviour based on [ fallback handoff ](MATCHING_ROLLBACK_HANDOFF.md).

2026-11-16 (America/Phoenix) Phase 1 Design, phase 3 has been implemented in accordance with Juanxi “Continuing Stage 3”.

The first stage data operation and parser is still read-only for member and role references and does not import the old store. Stage 3 is connected by `organizationMatching.ts` and adaptations, which are physically organized separately from independent exercises. There is only one matching original in the operation, not two-time.

## Current actual limits

Main business use `src/data/store.tsx`It's... `loadStateWithNotice`、`saveState`and `buildExport`Phase 3Take the outer layer. `SCHEMA_VERSION`From 22Raise to **23**。 `saveState` sequences the full business object to one key; An old reader that only knows 22 cannot be used for functionality fallback.

`Org.id` is currently often from demonstration seeds. The same ID may still be used when re-completed onboarding, so it cannot alone prove that the new configuration belongs to the same organizational workspace. Personnel `Role.holderId`, `Person.roleId` continue to serve old missions, handoff and pages and cannot rewrite these fields in batches for the pool of qualifications.

## Implemented Storage Layouts

Existing clients add optional matching namespaces, as well as local workspace identities that are generated and saved separately. Match configurations refer only to existing roles, members, steps and task IDs and do not copy their complete list.

- `Org.matchingWorkspaceId`: a stable local identity created at the first visible launch of the new matching; Create a new identity when creating an organizational workspace. It's not a login or organisational documents.
- `DemoState.matching`: `MatchingState` corresponding to this identity, using its own `schemaVersion: 1`.
- `DemoState.matchingContext`: Source review, input/operation history, membership availability and qualifications, manual exceptions to a task, preview of import identity; Can not delete folder: %s: No such folder
- `Node.matching`: The actual task is its own worklow/step/responsibility identity and the reasons to be addressed; History nodes will not be completed by enabling them.
- Whether the organizational setting record matching mode is enabled; No old business compatibility is set to run. The function parser does not rely on `RoleFunction`, the old `fn` is reserved only for non-removable displays, missions and dates.
- The assignment of specific tasks remains with `MatchingState.assignments` and is co-located through tasks, workflows and steps; The actual executor is still included in the current task `ownerId`. In a single operation, tasks and returns are generated at the same time and stored uniformly.

`platypus.matching.v1:<organization identity>` for stage 1 and 2 for phase `platypus.matching.setup.v1:<context>` are still isolated exercises. Phase 2 preview can only import the current tissue in a visible way, checking references to context, rule and membership, examples or external references being rejected; Can not get folder: %s: %s Imports no copying of scenario tasks. Keeps the import source and repeats the import without repeating additions. The original preview key is kept, and subsequent actual changes are only written in the business original.

Provider compares the actual master archive with the last reading of this page by raw before normal operations, confirmation operations that need to be sustained and app/log autosave; The main key storage event also immediately suspends the old tab. Keeps a copy of the memory for download when an external write is finished and must reload before using the latest data. This check detects a conflict of coverage that has occurred and still fails to provide a cross-label atomic service; Cross-equipment and live multi-person collaboration requires server authorization and atom revision control.

## Outer version migration

Reconciled stage 2 baseline `dbfc47d` is 22 and phase 3 uses 23. Submits the compatible reading base **`e370361`** before submitting functional writing.

The actual migration was divided into two layers:

1. Save original raw to `platypus.v1.demo.backup.v22` before the outer layer 22 is upgraded. Shows the reasons for failure of backup and suspends writing, and reloads after downloading the original; Do not overwrite the old archive. Regular upgrades retain organizational, personnel, tasks, status, reminders and history, do not give rise to responsibilities, do not reassign tasks and do not rebuild activity maps. The 23 archive only regulates the existing term and does not recreate the map.
2. Match profile migration: independently authenticated on `MatchingState.schemaVersion`. Supported configuration access; In the event of damage, inconsistent organizational identity or a higher version, retain original configurations and recoverable copies, suspend new matches, show reasons, do not delete the whole organization or restore examples.

Every layer of migration should be idmmotency. Opens again. You cannot repeat duties, create members relationships or import returns. Save original recoverable copies before moving and importing; You cannot report success when saving failed, nor can you delete source text or copy first.

The duties, role relationships and membership qualifications for the first time must be checked by the user. Old free text, template default duties and old role names cannot automatically be taken as confirmed facts in the context. The default for necessary external qualifications is unknown; A school system account is not extrapolated by the name of the post.

## _Other Organiser

| Situation | Access behaviour |
| --- | --- |
| Tasks in progress, no returns. | Keep existing owner and status; Indicate that the old assignment has not been linked to duties and do not falsify past manual confirmations |
| Users clearly connect existing tasks to new mechanisms | Show duties, candidates and existing executors with confirmation of additional live returns |
| New activity or stand-alone task | Resolution of confirmed requests; Only clearly identified assignments are included in the actual tasks; Preselection and backup advice not disguised as taken over |
| New matching enabled but missing duties or candidates | Leave to process, not revert nine functions or list first person |
| Change template or change default | (b) To influence future tasks; Confirmation of retention and review of failed candidate |
| Old page manual changes | Record actual reassignments. Old unconnected tasks leave only one-time manual exceptions and responsibilities remain empty; Workstreams the original activity playbookId, while this task identity is used unknown and not based on the current template. (a) The task has been undertaken to retain its own connection; Effective confirmation of return is separated from unqualified manual exceptions |
| One step in two streams. | Use a clear workflow/step composite identity that is not combined by title or simple separator |

Mission recognition continues to be handled by business processes. Assigning to others is still unclamed; My own claim matches with the existing mandates. The same protection is used for task buttons, kernels and board drags. The old signature link cannot be re-activated once the same person has been restored. Budget steps, dates and existing roles maintained.

## Reset Organisation Export and Restore

Creates a new matching identity when the workspace is recreated and provides a retention or export path for the old configuration to avoid reading back to the old when the old task ID is repeated. (b) The ordinary role change name and the change of duties keep stable ID; Role deactivates, members departs and the job archive displays specific reasons for failure and does not reset data.

Existing complete business exports need to include matching configurations, revisions and returns. The separate matching profile export represents only that configuration and does not amount to an organization ' s full backup; Verifys the current identity and external references before import. The higher version is exported to keep downloadable source text without deleting an unknown field.

## Rollback must keep compatible readings

The archive of the outer layer 23 cannot be sent directly to an old reader that only knows 22. Compatibility base **`e370361`** can read 23 and keep matching and unknown sub-fields, nodes and history as they are; It can't be removed with functionality. Full Business Export/Recovery contains Matching and context, backups the current configuration before restoring it.

Priority is given to **Pause responsibility matchping**, which retains configuration and existing tasks. Back to Compatibility Base Point `e370361` if fallback code is required. This round did not deliver a low-form projectile recovery tool and does not claim to be free to return to 22. The lower version number must not be changed directly, without Reset demo, clean localStorage or discarding matching data as rollback.

The necessary returns have been incorporated into the 3 creation, durability, restoration of UI and adapters for example: 22 backup failed to protect, duplicated migration, damaged/higher sub-version retention, separate workspaces, live enabled/inbound non-changed nodes, full export re-restoration, template switching unmodified historical association, closing mode, signature link failure, cross-label page writing conflict. The results of the check-by-check and the undetected range can be found in [ stage 3 delivery ](MATCHING_STAGE3_HANDOFF.md). These inspections do not amount to live power outages, service end simultaneous or cross-equipment validation.
