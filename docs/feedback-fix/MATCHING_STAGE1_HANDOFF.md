# Responsibility matching stage 1 handoff

2026-11-16 (America/Phoenix) · Codex · Target branch `claude/fervent-thompson-e2j5u2`

> **Historical code links:** responsibility matching was later rolled back. The code links below point to the preserved stage-1 commit `3ad168d`, rather than claiming those files remain in the current tree.

## What was built

Clubs can maintain responsibility records stating “what to do, what to deliver, what is excluded, and sources.” Roles and responsibilities are separate; a role may carry several responsibilities, and one responsibility may belong to multiple roles/members. Workflow steps reference responsibilities; the resolver identifies suitable people. The module does not require preset role names such as Secretary or Marketing.

Responsibilities support manual creation, editing, confirmation, merge, and archive. Edits require reconfirmation; merge preserves old-ID destinations, returns affected steps to awaiting confirmation, and retains assignment history. Overlap and complete coverage still require later AI checks/human review; this stage does not claim automatic mutual exclusivity or coverage of every policy.

For multiple members with a responsibility: retain valid confirmed assignment → check primary → suggest backup awaiting confirmation → if no primary and exactly one eligible available candidate, preselect → otherwise explain and await action. A member linked via both role and direct association appears once.

**“Preselected” is not yet the task owner; “confirmed” does not mean the member has claimed it.** When primary becomes invalid or responsibility changes, retain original owner in records and request review; no automatic reassignment. Existing production task entry points still use old logic; actual integration belongs to stage 3.

## Readable exercise inputs

Entirely fictional robotics club: 12 members, 7 responsibilities, two workflows (regular meeting, competition). Built step by step with actual data operations, 45 revisions; an additional revision 46 snapshot checks that changing primary does not reassign existing tasks. [Input code](https://github.com/juanxiwu2005/platypus-officer-hub/blob/3ad168d2fb5ee45bf562cc48319ec011c5034054/src/matching/examples.ts) · [Exercise assertions](https://github.com/juanxiwu2005/platypus-officer-hub/blob/3ad168d2fb5ee45bf562cc48319ec011c5034054/src/matching/examples.test.ts).

| Member | Responsibilities | Current situation |
| --- | --- | --- |
| Morgan | Example operator only, no execution responsibility | Team Captain status does not make them fallback owner |
| Riley | Venue coordination, through role inheritance and direct manual link | Qualifications confirmed, available; venue primary |
| Casey | Venue coordination | Qualifications confirmed, available; venue backup |
| Jordan | Venue coordination | School-system qualification unknown |
| Taylor / Skyler | Firmware testing | Both available; initially no primary |
| Quinn / Drew | Visual production | Quinn primary but unavailable; Drew available backup |
| Sam | Robot demonstration | Sole eligible available person |
| Alex | Flight demonstration | External authorization unknown |
| Robin | Venue coordination, equipment transport | Venue qualification confirmed, availability unknown |
| Jamie | Venue coordination | No longer active |

## Actual results

Offline calls to the same `resolveMatchingAssignment`; these are not AI-written predictions.

| Workflow/task | Result | Reason |
| --- | --- | --- |
| Regular meeting: book meeting room | Preselect Riley | Eligible available primary; three other linked members have unknown qualifications, unknown availability, or have left |
| Competition: book venue | Preselect Riley | Both workflows reuse one venue responsibility; no duplicate responsibility needed |
| Competition: create poster | Suggest Drew, await confirmation | Primary Quinn unavailable, Drew backup |
| Competition: test firmware, new task | Await Taylor/Skyler selection | Both available, no primary; member order does not change result |
| Competition: prepare robot demonstration | Preselect Sam | Sole eligible available candidate |
| Regular meeting: renew club registration | Await member configuration | Responsibility exists, no linked members; no fallback to president |
| Competition: flight demonstration | Await qualification verification | Alex flight authorization unconfirmed |
| Regular meeting: equipment transport | Await availability verification | Robin availability unknown |
| Competition: write copy and design together | Await split or explicit coordination | Composite step cannot be assigned using visual-production responsibility alone |
| Regular meeting: new work with no responsibility link | Await responsibility link | Workflow step not configured |
| Competition: firmware task previously manually confirmed to Skyler | Keep Skyler | Confirmed result retained |
| Same task, then primary set to Taylor | Still Skyler | Default rules affect only new suggestions, not confirmed results |

Venue candidate explanations list Riley, Casey, Jordan, Robin, Jamie and reasons for eligibility/ineligibility. Riley counts once despite two paths. Qualifications/availability come from input; platform does not log into school websites to verify accounts.

## Data and extension boundaries

- Public interface [src/matching/index.ts](https://github.com/juanxiwu2005/platypus-officer-hub/blob/3ad168d2fb5ee45bf562cc48319ec011c5034054/src/matching/index.ts), shared contract [MATCHING_CONTRACT.md](MATCHING_CONTRACT.md). Responsibilities, workflows, steps, members use stable IDs.
- Every actual change records operation ID, actor, time, command, revision; retries do not duplicate changes. Events lack the complete historical external membership list, so cannot alone reconstruct all external state.
- Assignment receipts append-only, retaining responsibility, step, and default-rule revisions. Resolver returns suggestions/reasons; future business entry points authorize, confirm, and write actual tasks.
- Separate configuration key `platypus.matching.v1:<encoded-organization-ID>`; versioned saves. Corrupt, wrong-organization, unsupported data retain raw text, never overwritten with demo. Different organization IDs do not establish login or authorization.
- Saves check read revision and reject common stale overwrites; browser read/check/write is not an atomic cross-tab/cross-device lock or multiuser concurrency service.
- Existing `DemoState`, old storage keys, outer schema version unchanged. Stage 3 source-of-truth/import/version/rollback design:[MATCHING_COMPATIBILITY.md](MATCHING_COMPATIBILITY.md).

## Development and verification

Baseline `22cb3cc`; shared contract `886ccf7`. Two development Agents used independent worktrees from the same contract; lead Agent retained package commits during integration:

| Package | Branch/commit | File scope |
| --- | --- | --- |
| Data Agent | `feat/matching-library` · `307b5d0` | library, validation, repository, 29 tests |
| Resolver Agent | `feat/matching-resolver` · `c5bb56c` | resolve, 45 tests |
| Lead Agent | Integration branch | Contracts, public exports, 12-person exercise, old-data isolation tests, documentation |

Another 17 integration exercise/isolation tests, total 91. Final checks:

| Check | Result |
| --- | --- |
| New module 91 + existing related paths 114 | All 205 passed across 10 files |
| `npm run lint` | Passed, CSS, ESLint, project guardrails |
| `npm run build` | Passed, frontend TypeScript/production build |
| `npm run typecheck:netlify` | Passed |
| Actual fictional exercise calls | All 12 scenarios match expectations |
| Independent read-only Review | Final code candidate `3ad168d` passed, no fixes needed; also checked history protection after editing, reconfirming, merging, save/restore |

Test command: `npm test -- src/test/m4.test.ts src/test/orgWorkflow.test.ts src/test/workflowV2.test.ts src/test/m2b.test.ts src/test/onboardingTeam.test.ts src/test/fb-05-create.test.ts src/matching`.

Initial integration type check found union-type inference in exercise qualification objects; explicit member/qualification types added, build then passed; contract not relaxed. Build emitted dependency-comment and large-chunk notices, no errors. No page changes, so full-site Playwright/full `npm run check` not repeated or reported as passed.

## Later stages

Stage 2 awaits approval: adapt existing constitution-AI output into responsibility drafts, verify source quotes, add responsibility bubbles, member links, primary/backup UI. Stage 3 awaits approval: connect actual task creation, map 46 standard steps individually, migrate saves, and browser acceptance.

No new page/clickable demo this round; accept foundation using assignment table above. No real-model calls, no emails, no main merge. Local backup needs synchronization.
