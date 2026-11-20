# Onboarding Original v3: Clear Team + Work Package

2026-11-17 (America/Phoenix) . Status: operational original, to be reviewed by Juanxi, with no access to the actual website.

Only the selected " departmental relay panel " and " entire task package assignment " will be modified in this version. Originals share People/Work groups settings on a page to directly test the connection of " Change Team  →  Package Assigned " . v1 Five screens, four staff programmes and six working group programmes are maintained; New activities, Finance assignment, Markering transfer and coordinator reassignment of four screens continue to freeze.

## Direct trial.

Opens the `foundation.html`, all presentation data are messageal content, do not call interfaces, do not send invitations or emails.

1. **People**: Add team only creates empty teams; Add rule creates a role that can be pre-selected or assign later. Add line below the teams has pre-selected the team.
2. To drag the bottom of Jamie's **Finance Treasurer 2** card to the top right corner of Finance, where the original two members became three; The same action can be done with the card's Team drop frame.
3. The name of the post, name and invitation mailbox, team name may be changed directly. The name does not create a team; Move role won't rewrite the reporting relationship. When the team leader was removed, the old team emptied and asked for a manual re-selection without automatically replacing him with another.
4. To **Work groups**: Overview View, Detail view zooms in the selected work package; Moves side by side, moves the top of the drag card, +/- zooms. The cell phone is centered on the current work package, and it skips from below to avoid scalding to an unread complete picture.
5. Enlarged card display package tasks; The full task and original title, description and source are always available below. Select the responsible team on the right, and all tasks in the package will be assigned to the team together; And the team leader is from People.
6. Click work package output  ○  and then click on another package to enter ° additional links; You can also open Connings & procedure, which is connected by a drop-down. Circulation, repetition of connections are stopped. New work package to be empty, without copying existing tasks; This round is not a task content editor.
7. Arrange reorders from left to right by relying. Suggested links may be deleted; Templates were originally dependent on reservations. Undo can reverse structural changes. Saved in preview to support session status; Only the current page state is maintained when directly opening a file. **does not save the site or has a memory of** permanently.

## Model and user purpose

| Object | What is it? | Stabilize connections |
| --- | --- | --- |
| Team | A live team with multiple rolls and minutes | `team.id`, does not extrapolate from the roll title or reporting line |
| Role | Treasurer, Finance Associate et al. | `role.teamId`Independent `reportsToRoleId` |
| Person | Name, invitation mailbox | `role.personId`, edit the title without affecting personal information |
| Task pack | A set of tasks that normally fit the same team. | `pack.teamId`Clear. `taskIds` |
| Connection | Work package back and forth dependence | `from` / `to` / `origin` |

The demonstration contains by default Club leadership, Finance, Marking, Operations, and is an example, not a core directory. The follow-up self-constructed team is still assigned with ID. AI does not need to guess which team Finance Treasurer 2 belongs to. Shows the same group 's live members after work package has been reassigned; Not to copy a mission to all of the team.

**Duty boundaries for future access:** saving team structure with template default grouping; When creating the event, president identifies which team, who is responsible for each package and who collaborates to keep its own assigned snapshot; The sole operator of a specific task is assigned or reassigned by the person in charge. This level of activity and the following four screens have not been implemented, nor has the old distribution engine for the current site changed.

Constitution AI rule/ function recognition continues. In the future, Team/Role can be drafted and eventually manually confirmed; The official assignment to the team is a visible choice. Any stream may have its own packages and drawings, without writing examples such as Finance, Secretary etc. into a fixed category of the system.

## 46 task and connection sources

`workflow-data.json` Reservation v2 from `src/engine/playbooks.ts` complete **46 mission/ 43 original task dependent on** snapshots (source submission `e87b19c95e6eece07a3a695fdc0438de3f92fb67`), including original name, word short name, condition, description, source. This is not a new original of the current running rules.

- Every original mission just happens to appear once. **13work package**。 Event Review (feedback) before dividing the original Leadership Review into a single Kari before and after the event.
- The original task map was condensed to the layer and obtained **11 live across packages relying on**, which is shown in line. The inside reliance remains intact in the data.
- In order to discuss a more complete and basic workflow, an additional **8 proposal was drawn to link**, showing in a dotted line: planning partners/security/advocacy, publicity preparation for inspection, campaign media archiving/activity rediscovery, financial closure/media archive of the student orgnification archives.
- The proposed connection is only a original proposal and does not claim to have been included in the existing template or used for actual date calculations. The connection to the new painting is marked as draft; The original map and all dates/policy engines have not been rewritten.
- Use the selected v2 script to place feedback in the direction of the record work, which is shown in the current version. Example by default: Finance 12, Marketing 8, Offices 25, Club lightship 1. This is not an allocation change for running.
- The connection uses a straight angle path to avoid work card cards and avoids false sequencing by passing through another card. Wiring validation is not equivalent to the condition/convergence execution semantic for completing a complete workflow editor in the future.

## Inspections and restrictions

Browser check covers: Add rule/Add team separation, live finger drag into Finance, roll rename no team, report retention, head move out, pack reassignment, 46 mission only coverage, 43 original dependency and 11+8 cross-package, initial connection not to pass through other work package, flat move zoom, work page, drag cycle refusal, new packages/ links/ Undo, status recovery, contact not to enter modelContent, light depth, mobile phone layout. Also check 320/736/1024 for two tabs without page level overflowing. For more information, please see "Verification / Playout-Verification".

`verify.cjs` and `layout-check.cjs` are check scripts for the quarantine manuscript, requiring Playwright and Chromium; Default compatibility with the installation location of this container. The screenshot is the illustrative state of editing and dragging in these checks, defaulting that the original will continue to start with two Finance meeting + one group card to enter.

This edition does not have a web site for missions, multi-person collaboration, backstage preservation, live invitation, activity level assignment or automatic scheduling; Do not add AI calls, research records, mail dispatch, data structure upgrades or releases. The original prevateContent can save the contact person that the user fills out; ModelContent only keeps count, entity ID and assigned/connected, without name or mailbox. The preview snapshot cap 16 KiB, the excess hints remain on the current page and does not claim success.

## File and Handoff

- `foundation.html`: Operational scripts, style/data/interactive grouping, are not imported.
- `workflow-data.json`: Mission snapshots, 13 packages and clear-source 19 links.
- `verification.json`, `layout-verification.json`: Results of this round.
- `verify.cjs`, `layout-check.cjs`: Check exclusively for originals.
- `previews/`: Screening status screens; `manifest.json`: All archived files SHA-256.

The design was deconstructed into a website component only after the orientation had been confirmed, and a team, workflow template and activity assignment three layers of formal storage and compatibility options were identified. For the time being, the original will not be stored as an operational data base. Could not close temporary folder: %s
