# R0 contract: the activity record (2026-11-26)

Phase R0 of `CHEERS_TEAM_PROGRESS_PLAN.md`, approved by Juanxi on 2026-11-26. **Data only: no interface changes, no AI, no new action types.** Every meaningful action is recorded once with IDs and small facts, so a future growth record, handoff view or the R1/R2 features can rebuild what happened.

Baseline: branch `claude/fervent-thompson-e2j5u2` after the stage A commit that adds this file.

## 1. Already done in stage A (main agent; do not edit these files)

- `src/data/types.ts`: `DemoState.activity?: ActivityEvent[]`, `ActivityKind`, `ActivityFact`, `ActivityEvent`.
- `src/data/activityIds.ts`: `ACTIVITY_KINDS`, `nextActivitySeq`, `liveActivityId`, `backfillActivityId`, `isActivityFact`, `FACT_TEXT_MAX` (64), `ACTIVITY_WARN_AT`.
- `src/data/store.tsx`:
  - `reducer(state, action)` calls `coreReducer` (the former reducer), returns `state` when nothing changed, then:
    - `completeSetup`: removes `activity` and calls `withActivityBackfill` (a new club starts a new record);
    - `reset`, `replace`: `withActivityBackfill(next)`;
    - everything else: `withActivity(state, next, action, actorOf(state, action))`.
  - Nested calls inside the reducer use `coreReducer`, so an AI change card that assigns an owner is recorded once, by the outer call.
  - `loadStateWithNotice()` wraps the loaded state in `withActivityBackfill` (never for `migration_blocked`, which stays untouched).
  - `actorOf(state, action)` is exported (task-link holder, `system:reminders` for automatic reminders, otherwise the viewer).
- Placeholders: `src/data/activity.ts` and `src/data/activityBackfill.ts` with the frozen signatures below.

## 2. Event shape and rules (both agents)

```ts
interface ActivityEvent {
  id: string            // live: liveActivityId(seq); backfill: backfillActivityId(kind, subject)
  seq: number           // nextActivitySeq(record) and upward, in recording order
  on: string            // next.today (live) or the record's own date (backfill); never the real clock
  actorId: string | null // live: the actorId passed in, or "system:clock" for advanceClock; backfill: the known person or null
  kind: ActivityKind | string
  personIds: string[]   // the people the event is about
  nodeId?: string; eventId?: string
  facts?: Record<string, ActivityFact> // every value passes isActivityFact
  source: "live" | "backfill"
}
```

- **No free text.** Task titles, details, reasons, question and answer text, names and email addresses never enter the record; join by ID. Dates are demo dates. Lengths and counts are fine (`detailsChars`, `files`).
- Append only: a later event never edits an earlier one.
- Deterministic: the same `prev`, `next`, `action` and actor give the same events.
- Return the same object when nothing new is recorded (keeps `next === state` checks and Undo working).
- Former officers' events stay (club records). Nothing is capped or dropped (decision D7).

## 3. Kinds and when they are written (live)

Compare `prev` and `next` by ID. For nodes:

| Kind | When | personIds | facts |
| --- | --- | --- | --- |
| `task.created` | a node ID appears | owner if any | `status`, `eventId` (also on the event) |
| `task.removed` | a node ID disappears | former owner if any | `status` |
| `task.assigned` | `ownerId` changes to a person, or a node is created with an owner (not when a removed step is restored) | new owner | `from` (old owner or null) |
| `task.claimed` | `unclaimed` → any other status with `acceptedOn` set by this change, **and the actor is the new owner** (the owner accepted it, in the app or through their task link). A lead assigning a task records `task.assigned` and `task.status` only (amended after review, 2026-11-26) | owner | none |
| `task.status` | `status` changes (always, in addition to claimed/done/reopened) | owner | `from`, `to` |
| `task.waiting_on` | `waitingOnPersonId` becomes a person | the person waited on | `ownerId` |
| `task.target_changed` | `clubDeadlineOverride` changes, or the `targetDates` log grows | owner | `from`, `to` (club deadline before and after) |
| `task.submitted` | `taskWork.submissions` grows | the submitting author | `detailsChars`, `files`, `revision` |
| `task.done` | `status` becomes `done` | owner | `onTime` (completedOn ≤ clubDeadline, true when no deadline), `daysEarly` (calendar days from completedOn to clubDeadline, may be negative, null without a deadline), `detailsChars` and `files` of the latest submission (0 when none), `viaBudget` (true when the action was a budget action) |
| `task.reopened` | `status` leaves `done` | owner | `to` |
| `reminder.recorded` | a nudge ID appears, or a `reminderRuntime.deliveries` ID appears (reminder plan v2) | the task owner, plus the recipient when different | `via`, `channel`, `recipientId` |
| `event.created` | an event ID appears | none | `date` |
| `playbook.answer_added` | a Playbook answer ID appears | author | `questionId`, `answerKind` |
| `playbook.voted` | a person is added to an answer's `votes.up` or `votes.down` | the voter | `answerId`, `vote` ("up" or "down") |
| `handoff.step` | a `handoffRoles` entry's `confirmed`, `approved`, `completed` or `reviewed` turns true | outgoing and incoming officer IDs present | `roleId`, `step` (the flag name) |

Order within one action: by node order in `next.nodes`, then the table order above. `cheer.sent` and `progress.milestone` are reserved for R1 and R2; R0 never writes them.

## 4. Agent R0-M (model): live events

**Owns:** `src/data/activity.ts`, `src/lib/activityQuery.ts`, `src/test/activity.test.ts`, `src/test/activityQuery.test.ts`.

- `export function withActivity(prev: DemoState, next: DemoState, action: { type: string }, actorId: string): DemoState` (frozen) and `export function deriveActivity(prev, next, action, actorId): Omit<ActivityEvent, "id" | "seq">[]` (pure, used by the former).
- `withActivity` appends to `next.activity ?? []` with `nextActivitySeq` and `liveActivityId`, `source: "live"`, `on: next.today`. When `prev.activity` is undefined (a state that was never backfilled, such as a unit-test fixture), record only the new events; never backfill here.
- Query helpers (pure, tested, not used by any page yet): `eventsForPerson(s, personId)`, `eventsForTask(s, nodeId)`, `firstResponse(s, nodeId)` (the first `task.claimed` or `task.status` event after the task's latest `task.assigned` or `reminder.recorded`, with the day difference), `deliveredWithDetails(s, personId, from, to)` (`task.done` events in range with `detailsChars > 0 || files > 0`).
- Tests through the real `reducer` (not only `deriveActivity`): claim → submit → done on the seed adds `task.claimed`, `task.status` ×2, `task.submitted`, `task.done` with correct facts; reopen; waiting on a person; target date change; AI change card owner assignment recorded once (nested `coreReducer`); automatic reminder digest actor `system:reminders`; an action that changes nothing leaves `state` identical; no event contains any task title, details text or person name (scan every string fact against the seed's titles and names).

## 5. Agent R0-P (persistence): backfill and sanitizing

**Owns:** `src/data/activityBackfill.ts`, `src/test/activityPersistence.test.ts`.

- `export function withActivityBackfill(s: DemoState): DemoState` (frozen):
  - `s.activity` is an array → `{ ...s, activity: sanitizeActivity(s.activity) }`, or `s` itself when sanitizing changes nothing;
  - `s.activity` is undefined → build events from existing records and return `{ ...s, activity }` (an empty array when there is nothing).
- `export function sanitizeActivity(raw: unknown): ActivityEvent[]` (frozen): keep objects with a string `id` (at most 128 characters; an `act:<n>` ID must have n equal to its `seq`), a safe integer `seq` ≥ 1, ISO `on`, string or null `actorId` (at most 128 characters), string `kind` (at most 64), string-array `personIds` (each at most 128; longer entries dropped), optional `nodeId`/`eventId` (at most 128), `source` "live" or "backfill"; drop facts that fail `isActivityFact`; drop duplicate IDs (first wins); keep unknown kinds; sort by `seq`.
- Backfill sources, each with `source: "backfill"`, `backfillActivityId(kind, subject)`, `actorId` when the record names the person (else null):
  - nodes: `assignedOn` → `task.assigned`; `acceptedOn` → `task.claimed` **only when `acceptedOn` differs from `assignedOn`** (on the same day a lead's assignment and an owner's claim cannot be told apart, so no claim is invented); each `taskWork.submissions` entry → `task.submitted` (subject `<nodeId>:<submission id>`); `status === "done"` with `completedOn` → `task.done` (facts as in §3, with `onTime` from the matching contribution when one exists);
  - nudges and `reminderRuntime.deliveries` → `reminder.recorded` (deliveries: subject the delivery ID, `on` its `sentOn`, actor `system:reminders` for automatic sends, otherwise the lead who sent it when recorded, else null; personIds and facts as live); events → `event.created` (no date known: `on` = `s.today`, fact `date`);
  - Playbook answers → `playbook.answer_added` (`on` = the answer's `on`);
  - cheers (added in R1): each cheer → `cheer.sent` on its `on`, actor the sender, personIds the recipients, the live facts; a withdrawn cheer also → `cheer.withdrawn` on its `withdrawnOn`;
  - nothing else (votes and handoff steps have no dates).
  - Order: by `on`, then kind order in §3, then subject; `seq` 1…n.
- Tests: the seed backfills deterministically (same result twice; running it on its own output changes nothing); a v23 save without `activity` gains it on load through `loadStateWithNotice`; a save with `activity` keeps it (sanitized); `migration_blocked` data is untouched; `reset` and `replace` (import) paths; an imported record with malformed events keeps the valid ones; the full export (`buildExport`) contains `state.activity`; `src/lib/aiContext.ts` output never contains `activity` or any event ID; size: a synthetic semester of 3,000 events serializes under 700 KB. (Corrected during integration: the plan's first estimate of 500 KB was too low; with this event shape an event averages about 200 bytes, so 3,000 events are about 640 KB. The seeded demo state itself is about 127 KB with 131 tasks, a typical semester is about 1,000 events or 200 KB, and browser storage allows about 5 MB per site, so 700 KB keeps a wide margin.)

## 5a. Review amendments (2026-11-26)

An independent review of the merged R0 found no P1 and three P2 issues; the rows above were amended. Also: `firstResponse` treats a reminder as a trigger only when its recipient is the task owner; backfilled `task.done` takes `onTime` from a contribution only when that contribution's `completedOn` equals the task's; `startWorkspace` (`src/data/settings.ts`) drops `activity` itself, not only the reducer wrapper. Restoring a removed step records `task.created` again with fact `restored: true`, so counts of created tasks can skip it. Known remaining differences between live and rebuilt records (documented, not bugs): a retro task opened by the clock keeps its stalled case's `assignedOn`, so the rebuild dates its assignment earlier; claiming an unowned task keeps its earlier `assignedOn` (`claimTask`), so the rebuild dates the assignment on the posting day; a lead assigning a task to themselves counts as a live claim but not a rebuilt one on the same day; status replies are not rebuilt. `seq` values above 1,000,000,000 and empty `nodeId`/`eventId` are dropped by sanitizing.

## 6. Gates (main agent after merging)

`npm run lint`, `npm run build`, `npm run typecheck:netlify`, `CI=1 npx vitest run` (full), browser specs `smoke`, `a11y`, `store`/storage-related specs and `research*` on desktop and mobile with `--trace off`, `npm run words` (no change expected). `SCHEMA_VERSION` stays 23. The data dictionary (`docs/PHASE3_DATA_DICTIONARY.md`) gains an activity-record section.

## 7. Rollback

One merge commit per agent. If reverted, older builds read a v23 save verbatim, so `activity` stays in the saved file untouched (`readStateWithNotice` returns v23 data as parsed) and is used again when R0 returns.
