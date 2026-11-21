# For the Template-Library/Manual-Editor Chat: Team Swimlane Foundation Ready

2026-11-18 (America/Phoenix). Juanxi explicitly chose P1 and requested separate code first, unified adaptation after current library/editor completion. Replaces this task's in-progress start entry in PROGRESS.

## Code location

- Branch: [`feat/team-swimlane-foundation`](https://github.com/juanxiwu2005/platypus-officer-hub/tree/feat/team-swimlane-foundation/src/teamWorkflow)
- [Complete API, scope, integration handoff](https://github.com/juanxiwu2005/platypus-officer-hub/blob/feat/team-swimlane-foundation/docs/feedback-fix/TEAM_WORKFLOW_FOUNDATION_HANDOFF.md)
- [Verification](https://github.com/juanxiwu2005/platypus-officer-hub/blob/feat/team-swimlane-foundation/docs/feedback-fix/team-workflow-verification.json) · [P1 desktop/phone/dark screenshots](https://github.com/juanxiwu2005/platypus-officer-hub/tree/feat/team-swimlane-foundation/docs/prototypes/team-workflow-foundation)
- Complete source commits 2d24427 + 8d55107; handoff addition 863b48a. Do not take only the first commit; preferably merge whole branch later, or explicitly import final src/teamWorkflow/ snapshot by path. Preserve latest current-chat PROGRESS records on merge.

Current feature branch syncs only this note/progress; no source merge, editor changes, official entry, or storage migration. No new foundation PR or main merge.

## Latest required choices

1. P1 people cards retain position/name/email; Team and Reports to independently editable; Add direct report creates subordinate. Team drag does not change manager; manager changes do not change team. Prevent self/descendant cycles. Removing lead leaves vacancy, never auto-selects another.
2. **Exactly N lanes for N teams**, including empty teams. Before/after event work, packages, branches cannot split one team across lanes. Multiple Operations lanes in reference A must become one. Ungrouped tasks are issues, not extra lanes.
3. Lane ownership independent of business branches. Department gradients mean team only; blue/yellow stops retain step-type meaning. Preserve cross-team dependencies; complex parallel layout can remain inside one team container.
4. compileTeamLanes creates unique team rows/all dependencies; assignStepsToTeam changes sidecar mapping only, never source tasks/conditions/effort/dates/placement/individual assignee.
5. Never wire team operations to existing reassignWorkflowStep, which changes branches by role. Reuse current editor x-coordinates/connections/condition-policy validation/Undo/draft transactions.
6. directoryFromLegacy is read-only projection, **never overwrite whole old Role/Person records**, losing duties/constitution sources/history. Preserve AI constitution recognition; team mapping explicitly confirmed, never guessed from function/role name.
7. Future template-version snapshots include mappings. graph.ready means ownership/basic references ready only, not permission/policy/condition scope/date validation. Organization/template migration, official mounting, event-person assignment await unified adaptation.

28 unit/component tests passed; isolated browser verified actual drag, contacts/multilevel reporting, 5/7 rows/46 tasks, 320/390 touch, light/dark, zero serious/critical axe/script errors. Full-site lint, separate CSS, frontend types, production build passed. Existing 46 tasks/dependencies unchanged; zero real AI/email. Local backup sync required.
