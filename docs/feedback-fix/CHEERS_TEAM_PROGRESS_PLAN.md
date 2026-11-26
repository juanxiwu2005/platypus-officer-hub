# Cheers, team progress and the activity record: phased multi-agent plan (2026-11-26)

**Status:** proposal, awaiting Juanxi's review and approval. No code is written until he approves; decisions D1–D8 (section 8) are open.

**Decisions so far (Juanxi, 2026-11-26):** keep time on the platform as short as possible (each action takes seconds, at most a few minutes); do not build option D (self-set dates): without consequences it relies on self-discipline most members do not have; build option B as **Cheers**: voluntary peer recognition between any two officers (upstream, downstream or another team), sent as an in-app card or a short email ("You received 50 points because …"), never tied to reviewing someone's work, so nobody can be asked "why didn't you give me points"; build option C as **team progress** per event; for the competence record (option E) build only the data layer now: every action is recorded so a growth record or handoff view can be built later, with nothing shown in the interface yet. Earlier review: the first reward plan and the five options in `docs/PROGRESS.md` (November 25 entries).

Branch: `claude/fervent-thompson-e2j5u2` (draft PR #20, preview only). Never `main` without Juanxi's approval.

---

## 1. How every phase runs

Same method as `PLAYBOOK_INTEGRATION_PLAN.md`:

| Stage | Who | Output |
| --- | --- | --- |
| A. Contract | Main agent | `docs/feedback-fix/CHEERS_R<n>_CONTRACT.md` with frozen types, function signatures, file ownership, copy and tests. The main agent commits the shared hotspot edits itself (`src/data/types.ts`, the action union and reducer wrapper in `src/data/store.tsx`), so parallel agents never edit the same file. |
| B. Build | 2 worktree agents in parallel | One commit per agent on disjoint files: model (pure logic, reducer case, unit tests) and interface (components, CSS, browser tests). |
| C. Integrate | Main agent | One merge commit per agent (each revertible on its own); full gates (section 6). |
| D. Review | Independent read-only agent | Ranked P1/P2/P3 findings with reproductions. |
| E. Fix | Fix agent (worktree) | One commit; each finding gets a failing-then-passing test. |
| F. Deliver | Main agent | Verification, screenshots, `PROGRESS.md` and `PRODUCT_PLAN.md`, push; Juanxi accepts before the next phase starts. |

Order: **R0 activity record → R1 Cheers → R2 team progress.** R0 comes first because R1's weekly suggestions and R2's milestones read from it.

## 2. Time-on-platform budget (applies to every phase)

- No new required step anywhere: claiming, submitting and marking done keep their current clicks; nothing blocks completion.
- Sending a cheer: at most 3 presses with the defaults (open, pick points, Send), under 10 seconds; a browser test counts the presses.
- Receiving a cheer: one card or toast, one press to close; nothing to answer.
- Team progress: read-only; no input from anyone.
- The activity record has no interface and costs no time.

## 3. Phase R0: activity record (data only, no interface)

**Goal:** every meaningful action is recorded once, with IDs and small facts, so a future growth record, handoff view or analysis can be rebuilt from it. Nothing is shown.

**Stage A (main agent):**
- `DemoState.activity?: ActivityEvent[]` (optional, so `SCHEMA_VERSION` stays 23).
- `ActivityEvent { id; seq; on /* demo date */; actorId | null; kind; personIds: string[]; nodeId?; eventId?; facts?: Record<string, string | number | boolean>; source: "live" | "backfill" }`.
- Kinds (first set): `task.assigned`, `task.claimed`, `task.status`, `task.waiting_on`, `task.target_changed`, `task.submitted`, `task.done`, `task.reopened`, `reminder.recorded`, `event.created`, `cheer.sent` (R1), `progress.milestone` (R2), `playbook.answer_added`, `playbook.voted`, `handoff.step`.
- In `reducer()` (`src/data/store.tsx`), after `baseReducer`, one call: `next = withActivity(state, next, action, actorId)`. Recording compares the state before and after, so every path that changes a task (Ask change cards, officer links, task access tokens, Budget completion) is covered without touching each reducer case.

**Stage B agents:**

| Agent | Owns | Delivers |
| --- | --- | --- |
| R0-M model | `src/data/activity.ts`, `src/lib/activityQuery.ts`, `src/test/activity*.test.ts` | `deriveActivity(prev, next, action, actorId)`: pure, deterministic, idempotent; facts are IDs, enums and numbers only (status, on time, days before the club deadline, details length, attachment count), never free text, so task titles, details and reasons stay in their original records and are joined by ID. Query helpers for later use, tested but not called by any page: `eventsForPerson`, `eventsForTask`, `firstResponse(nodeId)`, `deliveredWithDetails(personId, from, to)`. |
| R0-P persistence | `src/data/activityBackfill.ts`, load/import/export paths named in the contract, `src/test/activityPersistence.test.ts` | One-time backfill on load from existing records (`assignedOn`, `acceptedOn`, `completedOn`, task submissions, nudges, contributions) marked `source: "backfill"` with deterministic IDs; import sanitizer (malformed events dropped, unknown kinds kept as data); full export includes the record; reset clears it; `migration_blocked` saves untouched; a seeded-semester size test (target under 500 KB); a test that `src/lib/aiContext.ts` never includes it. |

**Main agent also:** data dictionary section in `docs/PHASE3_DATA_DICTIONARY.md` (the activity record is product data in the browser, separate from the research interaction log; the research log records only action types).

**Acceptance:** nothing changes on screen; a full export of the demo contains `activity` with backfilled and live events; doing a task (claim → submit → done) adds three events.

## 4. Phase R1: Cheers (voluntary peer recognition)

**Goal:** any current officer can thank any other officer in seconds, with points and a reason; recognition is public and positive; the president gets a weekly prompt to thank the team.

**Stage A:**
- `DemoState.cheers?: Cheer[]`; `Cheer { id; fromId; toIds: string[] /* 1–5 */; points: 10 | 25 | 50 | 100; reason: string /* 1–140 chars */; nodeId?: string; eventId?: string; card: "thanks" | "star" | "teamwork"; email?: { draftedOn: string }; on: string }`.
- Action stub `{ type: "cheerAction"; action: CheerAction }`.
- `Notice` gains kind `"cheer"` and `nodeId` becomes optional; every reader of notices handles a notice without a task (the open item from the Playbook plan).

**Rules (deterministic, in the reducer):** only current officers send (former and incoming officers read only; incoming officers may receive, see D8); no cheering yourself; weekly allowance per D1 (default 200 points, 500 for president and VP, resetting Monday by the demo clock, unused points expire); receiving is never limited; a cheer cannot be edited, only withdrawn by its sender on the same day; no AI.

**Stage B agents:**

| Agent | Owns | Delivers |
| --- | --- | --- |
| R1-M model | `src/data/cheers.ts`, `src/lib/cheerMail.ts`, store case, `src/test/cheers*.test.ts` | Reducer (send, withdraw), allowance, validation and sanitizing; notice to each recipient; `cheer.sent` activity; rule-template email text ("You received 50 points from Alex because: …", subject and body, at most 60 words), opened as a Gmail draft through the existing `composeUrl` in `src/lib/nudges.ts` (nothing is sent by the app); quick reasons built from facts (for a task: "Delivered on time", "Clear details", "Helped me out"); weekly suggestions for the president from the R0 record (people who delivered on time with details this week). |
| R1-U interface | `src/components/cheers/*`, the Team card, the Task Details and Reminders entry points named in the contract, `src/styles/ch-01-*.css`, `e2e/cheers*.spec.ts` | **Cheer** sheet in the right rail (recipient preselected, points chips, three quick reasons, optional text, card style, "Also email" toggle, Send, allowance left); entry points: a Cheer button beside each person on Team and beside the owner in Task Details; received card shown once with a toast; Team's Contributions card becomes **Cheers** (term totals without rank numbers and the five latest cheers with reasons, per D2); on the president's Reminders home, one Monday line "Cheers this week" with **Thank the team**, which opens the sheet with the suggested people preselected. |

**Acceptance:** as Maya, cheer Jordan 25 for a task in three presses; Jordan's bell shows the card; Team shows the cheer; with "Also email" on, a Gmail draft opens with the rule-template text; as Alex on Monday, Thank the team preselects this week's on-time deliverers.

## 5. Phase R2: team progress per event

**Goal:** the team pushes each event to fully claimed and fully delivered together; no individual comparison.

**Stage B agents:**

| Agent | Owns | Delivers |
| --- | --- | --- |
| R2-M model | `src/engine/eventProgress.ts`, `src/test/eventProgress*.test.ts` | `eventProgress(state, eventId)`: claimed count, delivered count (done with submitted details or an attachment; steps completed through Event Budget count as delivered, per D6), done without details (listed for the president), total. Milestones (all claimed; half delivered; all delivered) recorded once each as `progress.milestone` activity with deterministic IDs, so they never repeat after reload or reopen. "Clean delivery": every step of a finished event done on time with details; term count per club. |
| R2-U interface | Events head progress bar, the celebration, the Team season line, CSS, `e2e/event-progress*.spec.ts` | A thin two-tone bar in the Events head ("Delivered 9/18"; hover lists claimed and done-without-details for president and VP); at a new milestone, a short celebration for the viewer (opacity/transform only, none with reduced motion) and a bell notice to everyone with a step in the event; at "all delivered", the president sees **Cheer the team** (opens the R1 sheet with every step owner); a line on the Team Cheers card: "2 clean events this term". |

**Acceptance:** finish the last open step of an event: the bar fills, the celebration plays once, the owners get a notice, reloading does not repeat it; Events stays within its word limit.

## 6. Gates for every phase

- `npm run lint`, `npm run build` (entry ≤ 550,000 bytes), `npm run typecheck:netlify`, `CI=1 npx vitest run` (full), affected browser specs on desktop and mobile with `--trace off`, `npm run words`, axe with no serious or critical issues in light and dark, reduced-motion check for R2.
- Word limits measured before and after (current: Events 169/180, Team 117/130, "/" 127/200, Tasks 57/130); no limit is raised.
- Old saves load unchanged; `SCHEMA_VERSION` stays 23; import, export and reset covered by tests.
- No product AI calls; no real email; fictional data only; dates only from the demo clock and the rule engine.
- Research log: new actions are logged by type and IDs only; cheer reasons never enter the research log (guard test, like `src/test/handoffStage7.test.ts`); activity and cheers are not sent to AI.

## 7. Rollback

Each agent's work is one merge commit; `git revert -m 1 <merge>` removes it. All new state fields are optional; the R0 contract confirms whether a reverted build keeps unknown saved fields or drops them, and the restore note records which.

## 8. Decisions for Juanxi

| # | Question | Recommendation |
| --- | --- | --- |
| D1 | Weekly allowance for sending cheers? | Yes: 200 points a week per officer, 500 for president and VP, unused points expire. Keeps points meaningful and stops inflation. |
| D2 | Team's Contributions card (public rank, Impact, Reliability "Watch") | Replace it with the Cheers card; the old system points stay in the data and the activity record. |
| D3 | Point amounts | 10 / 25 / 50 / 100. |
| D4 | Who sees cheers | The whole club (praise is public); the allowance left is private. |
| D5 | Email | Sender opens a Gmail draft (demo); real sending waits for accounts and server email (v1.5). |
| D6 | What counts as "delivered" | Done with details or at least one attachment; Event Budget completion counts. |
| D7 | Activity record size | Keep every event (estimated under 500 KB a semester); warn in Settings → Admin above 15,000 events. |
| D8 | Can incoming officers receive cheers? | Yes; former officers neither send nor receive. |
