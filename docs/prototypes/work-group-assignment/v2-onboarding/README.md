# Onboarding visual concepts v2: awaiting user choice

2026-11-17 (America/Phoenix). Onboarding review only, not integrated into runtime. Complete earlier five-screen code preserved in `../v1/`; v1 originals/screens2–5 unchanged. Continue next new-event discussion only after Juanxi explicitly says “accepted, proceed”; no automatic development.

## Two sets of mockups

### People: 4 options

`people-options.html` compares the same seven fictional roles/members, retaining title/name/invite email. Example President→Executive Vice President→Treasurer/Marketing Director/Secretary→Associates hierarchy is not fixed policy; future constitution extraction/manual edits remain.

- **Organization-tree cards:** hierarchical connectors between editable name/email cards, clearest reporting at a glance.
- **Hierarchical directory:** indented hierarchy, direct three-column entry, suited to bulk entry for larger teams.
- **Department relay Board:** top leadership separated from departments, department leads/collaborators vertically arranged, showing whole responsibility chain.
- **Chart/card editor:** chart shows role/name/email readiness; select to edit full title/name/email/Reports to in side panel, suited to long titles/complex hierarchies.

Invitation toggle illustrates future post-setup invitations; currently local mockup only, no mail. User input never enters repository; public examples use example.org.

### Workflow grouping: 6 options

`workflow-options.html` uses the same 46-item actual template (conditional paths included) in `workflow-data.json`, from `src/engine/playbooks.ts` at feature commit `e87b19c95e6eece07a3a695fdc0438de3f92fb67`; all 43 original dependencies retained. Other chats audit/fix templates; this design changes no rules/dependencies and does not represent snapshot as fixed template.

1. **Subway-map highlighted groups:**46 stops/43 dependencies, select Finance etc. to highlight coverage, retaining context. Compact mockup layout, production layout engine unchanged.
2. **Cross-phase responsibility lanes:** groups as rows/phases as columns; selected group short names expanded, others individually clickable stops, showing span across phases.
3. **Collapsible phases:** expand/collapse, every collapsed dot still one real task, accurate counts, configure in sections to reduce simultaneous reading.
4. **Task ownership matrix:**46 rows, one primary group/task; click dot to reassign, inspect coverage/duplicate ownership. Mobile dropdown per task.
5. **Whole-package assignment:**46 tasks partitioned into 12 review packages, no duplicates/omissions; one selection assigns package. Packages are not new business tasks/dependency changes.
6. **Responsibility paint Board:** choose group, click/drag tasks to color/assign, fast bulk classification, Undo.

Initial functional grouping as discussion starting point: Event team 22, Finance 12, Marketing 8, Records 2, Leadership 2; not mandatory departments. Phases/groups independent dimensions.

All tasks default to **unique two-English-word short names**, not careless first-two-word truncation; full names/requirements/rule sources/conditions/dependencies retained/viewable on selection. Toggle short names off for comparison. Grouping changes mockup ownership only, not dates/requirements/real approvals/production data.

## Checks/preservation

- v1 source SHA-256 byte-identical to original workspace; `../v1/manifest.json`, not overwritten.
- 10 views×1024, 736, 393, and 320 px=40 layout checks, no horizontal overflow/script errors.
- All 6 workflow options cover 46 unique tasks at every size; subway renders 43 original dependencies.
- Email editing/saving, reporting changes, subway reassignment, matrix reassignment, whole-package reassignment/Undo, paint clicking passed; `verification.json`.
- 46 unique exactly-two-word names; 12 disjoint packages cover 46.
- Both HTMLs self-contained chat visualization fragments with styles/examples/local interactions; no external API/real AI/mail/production-save writes, not deployed features.
- No src/public/server/business-schema/current-site changes; full-site tests not repeated.

Local backup needs synchronization.
