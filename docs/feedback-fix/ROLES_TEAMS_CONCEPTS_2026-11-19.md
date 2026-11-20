# Settings  → Rales & teams 4 static options (Juanxi selection C, achieved, realizing access)

2026-11-19，Claude。Only static maps, no changes in product codes. The data is the field presentation.

## Why did you change it?

Workflow's Team Branch (Operations, Finance, Marking, Club Leadership) now comes from `org.workflowTeams`, and the role and team counterpart (`org.workflowRoleTeams`) can only be changed in the Workflow  → More  →  Teams panel. The Rolls page does not see the team at all, so "Who is in which team and what steps this team takes" has to be looked for back and forth. All four have changed the name of the Rolls page to **Rolls & Teams**, and the team colour is consistent with the Workflow canvas; The structure of the data remains unchanged (each role belongs to a team).

## Four programmes

| Programme | Figure | Practice | Benefits | Cost |
| --- | --- | --- | --- | --- |
| Table A by Team Group | [A-table-grouped.png](../prototypes/roles-teams-concepts/A-table-grouped.png) | The table is now added to the Team column, grouped by team, with one row heading for each group (a few rolls, several steps, Rename, Open in Workflow); Organisation Coloured by Team | It's the smallest change. The contact is at first sight. | Team still looks like a field in the table. |
| Team B, board. | [B-team-board.png](../prototypes/roles-teams-concepts/B-team-board.png) | A colour card for each team to drag the role card into the team; Bottom 'Not in a team'; Contact Table Collapse | The most intuitive, new role. | No reporting lines are visible; It's going to be a vertical row on the phone. |
| C Organizational Chart + Team Area | [C-chart-zones.png](../prototypes/roles-teams-concepts/C-chart-zones.png) | The reporting line remains the same, and the team becomes a colored sub-block wrapping role; Point rule change to head, reporter, team, contact details, responsibilities on the right panel; Contact list | Reporting lines and teams at the same time; Right panel is consistent with Workflow Details | When teams and reporting lines are inconsistent (e.g., cross-team reporting) the map is complicated |
| D Team List + Team Details | [D-team-detail.png](../prototypes/roles-teams-concepts/D-team-detail.png) | Left team list, members of the right selected team, duties, steps to be taken in various Workfly templates and Open in Workflow | Teams become first-class objects that are most closely connected to Workflow, Leadership Transport (steps and roll) | Look at all contacts cut to All rolls; Maximum change |

## Recommendations

This round of recommendations ****: Keep a profile of presidents that are already familiar, the group displays the same colour block as Workflow and the editors are on the right panel (like Workfly's Details). Later, when you have more than one template, put D 's " Team in charge of which steps " onto the right panel of C.

## Source File

`docs/prototypes/roles-teams-concepts/source/` (`gen.py` produces HTML, `snap.cjs` with Playwright screenshot, 1440 wide and 2 megapixels).

## Scheme C Achieved (2026-11-19, worktree Agent E)

- Settings' "Roles" has been renamed **Roles & teams**. Chart View: The reporting line + team color block (the same colour as the Workfly canvas, drawn to `src/styles/fb-10-team-tones.css`, unchanged texture), label "<Team>. Nsteps" (number of steps in the default template), no team 'role in Not a team.
- Right panel: point role to Tile / Office name / Reports to / Team / Email / Phone / ASU ID / Duties, displaying "Owns N steps in <template>" and Open in Workflow; Change team to save immediately (`saveWorkflowTeams`), can Undo. Team tags change the name of the team, read the role, Delete team (with a role, any template version or draft that is used, pre-defined, last and why).
- `+ Role`、`+ Team`；`Contact list` is the original table, an extra column of Team labels; Closed Rules, Invite Offices are down there. Workflow  →  More  →  Teams continue to be available and can jump to Rolls & Teams (`#/settings?tab=roles`).
- On this page, the Ask panel by default closes (as on the Worldflow page), and the tablet and the right panel of the phone line down to the tissue chart.
- Codes: `src/engine/teamOrgChart.ts`, `src/components/settings/{TeamOrgChart,RolesTeams,RolesTable}.tsx`, `src/data/roleEdits.ts`, `src/data/workflowTeamSettings.ts`. Schema remains the same.
- Validation: Lint, build through; 2118 past in module 2120 (old 2 failed); New `e2e/settings-roles-teams.spec.ts` desktop + cell phone 10/10, and two Brownservertes merge repeat 28/28; Settings word number 146/150. It is irrelevant that the 8 entries in Agent runoff / setup-team / a11y / m4-setup failed, as well as on the code before the change (as previously recorded).
- Screenshots: `C-implemented-desktop.png`, `C-implemented-team.png`, `C-implemented-phone.png`.
- Acceptance: Preview14 — Settings — Rolls & Teas; Point Secretary, replace Team with Markering, see the color plate change, and then Undo; Point Finance tag for team details; Cut to Contact List.
