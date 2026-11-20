# Settings → Roles & teams: four static concepts (Juanxi chose C, implemented, awaiting acceptance)

2026-11-19, Claude. Static images only, no product-code changes. Fictional demo club Desert Founders Society.

## Why change

Workflow branches (Operations, Finance, Marketing, Club leadership) come from `org.workflowTeams`; role/team mapping `org.workflowRoleTeams` editable only in Workflow→More→Teams small panel. Roles shows no teams, forcing two places to find people/team steps. All concepts rename Roles **Roles & teams**, colors matching Workflow; no schema change (one team per role).

## Concepts

| Concept | Image | Approach | Benefit | Cost |
| --- | --- | --- | --- | --- |
| A Grouped table | [A-table-grouped.png](../prototypes/roles-teams-concepts/A-table-grouped.png) | Team column/groups; heading per team with role/step counts, Rename, Open in Workflow; chart colored by team | Smallest change, contacts at a glance | Team still feels like table field |
| B Team Board | [B-team-board.png](../prototypes/roles-teams-concepts/B-team-board.png) | Colored team cards, drag role cards into teams; Not in a team below, contacts collapsed | Clearest assignment, new roles not missed | No reporting lines; mobile vertical layout needed |
| C Chart +team zones | [C-chart-zones.png](../prototypes/roles-teams-concepts/C-chart-zones.png) | Existing reporting lines, colored team backgrounds around roles; role sidebar edits holder/reports-to/team/contacts/duties; Contact list switch | Reporting/teams together, Workflow Details interaction | Cross-team reporting complicates chart |
| D Team list/details | [D-team-detail.png](../prototypes/roles-teams-concepts/D-team-detail.png) | Team list left, selected members/duties/steps across templates in small swimlanes/Open in Workflow right | First-class teams, strongest Workflow/handoff link (steps follow roles) | All roles switch for all contacts; largest change |

## Recommendation

**C**: retain familiar chart, Workflow-colored zones, right-side editing like Workflow Details. Later multiple templates can add D step ownership to C sidebar.

## Sources

`docs/prototypes/roles-teams-concepts/source/` (`gen.py` generates HTML, `snap.cjs` Playwright screenshots, 1440 width/2× pixels).

## C implementation (2026-11-19, worktree agent E)

- Settings Roles→**Roles & teams**. Chart: reporting lines/team backgrounds (same Workflow palette extracted to `src/styles/fb-10-team-tones.css`, Workflow pixels unchanged), label “<Team> · N steps” (default-template count), unteamed roles under Not in a team.
- Sidebar edits Title/Officer name/Reports to/Team/Email/Phone/ASU ID/Duties; “Owns N steps in <template>”, Open in Workflow; team change saves immediately (`saveWorkflowTeams`), Undo supported. Team label edits name/shows roles/Delete team (blocked with reason for roles, use by any template version/draft, preset team, last team).
- `+ Role`, `+ Team`; `Contact list` original table plus Team tags; Closed roles/Invite officers below. Workflow→More→Teams retained with Roles & teams link (`#/settings?tab=roles`).
- Ask initially collapsed on this page like Workflow; tablet/mobile sidebar below chart.
- Code: `src/engine/teamOrgChart.ts`, `src/components/settings/{TeamOrgChart,RolesTeams,RolesTable}.tsx`, `src/data/roleEdits.ts`, `src/data/workflowTeamSettings.ts`. Schema unchanged.
- Verified lint/build; 2118 of 2120 unit tests passed (2 old failures); new `e2e/settings-roles-teams.spec.ts` desktop/mobile 10/10, combined two Workflow specs 28/28; Settings 146/150 words. Agent's extra handoff / setup-team / a11y / m4-setup checks had 8 failures also fail pre-change code (previously recorded), unrelated.
- Screenshots: `C-implemented-desktop.png`, `C-implemented-team.png`, `C-implemented-phone.png`.
- Acceptance: preview 14→Settings→Roles & teams; Secretary→Team Marketing, observe colors, Undo; Finance label details; Contact list.
