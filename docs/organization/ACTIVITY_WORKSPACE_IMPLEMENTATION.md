# Activity Workspace execute handoff

2026-10-26 . Codex . Based on `1815be0`, users have approved A1/B1/C2, more Agent Worktree and the last two additions: priorities directly select existing tasks; Global AI query, adjust and create clients through uniform command.

## Current structure

- New entrance `/#/phase1`: Home, My tasks, Activities, Organization setup. Recent activities only list live members up to five, without setting templates or Executive Board.
- Home is sorted from the existing personal task certainty (by default, three can be carried out), including tasks to be assigned by those who are personally responsible/jointly involved and clearly awaiting their approval and management. You don't have anything to do for the future, you don't call AI and write a summary. The two overviews are: Amber Programme and Exact Board.
- Activities are a searchable, filtered and sorted list of examples. The four-position short chain is from the task DAG and phase projection, showing parallel, live count and blockage. Personal board sorting does not change process; The phase folding loop was rejected.
- The details default Timeline, the date from the same Scheduling function; Tasks, approvals and Funding within the event. My tasks defaults on three active columns, Doe entering fold history by completing the button and checking downstream effects when restarting.
- Funding multi-applications related to missions, Gate, version, source and fixed term. Submission does not amount to approval; Provisions, expenditures and releases are recorded separately and the cumulative amount terms are stated. Financial history does not allow for a change of origin.
- Setup, five chapters can be clicked and saved. Activity Workflow has 8 7/ 6 weeks set, relative time bands, node labels; Select to delete/revoke and replace with keyboard touch. Affected items are reviewed centrally and removed by node. Organization documents are located in Constitution.

## Homogenous data and time

`src/workspace/contracts/` Defines fixed IDs, status, tasks, approvals, funds and orders. Templates save versions separately from examples; Protects history and manual changes using a new template/default pre-time preview. The name is only a label, and the reference is an ID; The current organizational name/departmental colour/position comes from the same source and remains as it is in history.

`netlify/lib/workspace/` and `/api/workspace` save running data. Form with AI walking on the same white list command. The CAS in a workspace for JSON is written into the task/approval/funds and audits submitted to the order; 409 does not cover, and IDs and durable vouchers are ordered to support the resetting. The AI proposal for different targets is approved in subparagraphs and does not commit to any arbitrary cross-platform matters.

The product combines Waiting/Stuck with Stuck, retaining multiple causes and precise targets at the back office and only removing conditions that have been met. The outstanding task remains To Do, and the independent branch continues. General approval requires the identification of Gate/ Approving Officers, not by title or RACI A guess missions; The old Gate/old application cannot approve the current task.

8/7/ 6 weeks is an organizational preference (the goal of completion of 56/49/ 42 natural days) separate from the school rules. The duration of the school is based on a school working day, while the workday of the office day is available to the individual. USG specifies R09 for catering/service use, and guest uses R10, College/other devices. R01 covers both inside and outside activities using school funds. The period of time spent does not change with the activity. The student 's school history is currently recorded in a reliable range of 2026-08-20-2027-05-08, which is clearly beyond the scope and does not extend to fielding.

## Global AI with Save

`src/workspace/assistant/` is the only visible right-hand dialogue box that maintains a dialogue across pages, with narrow screen defaults and permanent access points. Setup Bridge saves the current editor before requesting/using organizational proposals to prevent coverage of old drafts.

The `netlify/lib/workspaceAssistant/` and two assistant functions provide a permanent background task, the context of the current object, reading by ID/search page, organizational/business proposals and creating forms. Generates a draft exclusive process for meeting activities or Executive Board and uses the same form to create it. Dates are calculated by human input and engine; Organizational changes are pre-drafted, confirmed and approved configuration updated. Models cannot be modified for missions, system time, archives or historical approvals, nor can they construct external approval evidence.

The selected ID with a deep-task link is identified by synchronous route, and the central non-modular task details do not mask AI on the right. Check for non-submission of forms prior to application of AI proposal; The server changes were synchronized only for fields that had not been artificially modified, conflicts were retained and reviewed, and progress was submitted as inactive.

The original model response/failure indicator is archived and analysed. Phase groups are structurally cached and are not created over and over again as a result of state/sequence changes. Operations are submitted in response to loss, resumed through operating vouchers, and no duplication of operations or repayment requests.

Active status on the server; Locally only protects unsubmitted input and does not copy the new organization back to the old presentation localStorage. Remember, create, tasks/activities, funds/approvals and AI input to separate protection by workspace/object, requiring reconciliation of the latest saving version after recovery. The global shell shares a navigation coordinater with Setup, all checked out before leaving/replaying history.

This round is still a private testing session. Field member/ rule supports binding, dual and joint responsibility, with a clear identification of the demonstration; Cookie attests to the workspace visit and not to live memory. Official accounts, invitations and cross-equipment multiplicity of missions are not in the current round.

## Authentication and local environment

Final product code: `3e9c69a`. The complete sequence check after integration is completed was passed:

- `npm run build`: TypeScript and Vite are built through.
- `npm test -- --maxWorkers=2 --minWorkers=1`: 36 documents, 548 all adopted.
- `npm run e2e -- --workers=2`: 272 scenes, 256 pass, 16 condition skip, 0 fail; Eventually, `.last-run.json` was passed and filled with empty Tests.
- 16 skip is 12 old cellular reprints a11y/keyboard check, 1 touchscreen does not apply to hoover, 3 desktop needles/additional historical scenes; The new version of the mobile phone is largely returned/exited, restored, synchronized with Task, direct task location for AI, form protection and axe, all physically passed without representing the entity ' s cellular phone or Safari testing.
- Locally actual HTTP: 7 group, 34 requests with the same version and a successful release of 1,409; The local storage of direct CAS probes was successfully completed in 7 412 cases after 8 rounds each were repaired.
- Independent Review review to `3e9c69a`, no known P0/P1; The final small incremental 19 orientation reviews were passed, see [ Independent Records ](REVIEW_ACTIVITY_WORKSPACE.md).

Logs are located in integrated workspaces `.scratch/activity-final-build.log`, `activity-final-unit.log`, `activity-final-e2e.log` and `workspace-http-smoke-report.json`. No live AI generation in the current cycle, no model quality/ actual response velocity; Local pass is not equal to remote CI or deployment through. Submits only Handoff documents after submission, without changing product logic.

The actual local Functions/Blobs simulation has been validated for initialization, draft role binding, template confirmation, financial example, task/approval connection, refreshing, resetting, amount, 401/ 409 and conditions of distribution. The end result is as above and the current check does not contain online storage or live AI.

(a) Local `@netlify/blobs@11.1.6` simulator GET/HEAD missing ETag, and atomic lock missing for PUT condition checks: first combined trigger product 503; Direct and probes find that the same version may be written several times. Only fix the contents of an external development emulator ETag with a string queue for every key, and products are strictly CAS without downgrading. You can repeat the script `/workspace/.cloud-tools/platypus/patch-local-blobs-etag.mjs --serialize-put` and do not submit node_modules/ lock files. Could not call local simulations online.

## Collaboration and borders

Independent Worktree:activity-integration/data/schedule/ui/assistant/setup/review. Data, Schedule, Workspace UI, AI, Setup UI each has a single document owner who is the main Agent maintenance contract/shell/ member/document/integration, Review independent inspection programme, code and malfunction recovery.

Old pages, old examples and `/#/phase1?example=1`/setup-legacy keep reference and do not automatically migrate fieldseeds into new tissues. Development of PR #3, main/official station unchanged. Remote CI, deployment and live AI quality need to be verified separately and not replaced by local results. The product document needs to be backed up locally by the synchronised user.
