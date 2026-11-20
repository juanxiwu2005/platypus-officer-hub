# WP04 — Setup, Team, Settings and the Mobile End Cover

## Agent prompt

You are responsible for organizing Setup, Team, Settings and the blocking of mobile controls. Read `AGENTS.md`, README, manifest, fetch before starting and confirm the updated baseline SHA. `main` should not be used.

### Scope of responsibility

- `e2e/setup-team.spec.ts`
- `e2e/workflow-setup.spec.ts`
- Setup/team scene in `e2e/phase1.spec.ts`
- Settings, organisational charts, role management, invitations to members, meeting Finder-related components and styles

### Known Live Problem

The port agents of `org-canvas`, `roles-manager`, settings nav or the top bar will intercept controls such as Undo, Invite Offices, Tre officer setup.

### Request

- Finds the active root in layout height, sticky, z-index, overflow, transform or rolling positioning.
- Ensure that 375 px, 390 px and 768 px width visible controls can live click/touch; Force click is prohibited.
- Updates the number of old torrents, old role names, old process nodes and meeting date assumptions.
- Privacy and consistency: private buffer/file/profile do not enter shared requests; Create workspace after approval; AI failure can still be accomplished manually; Failure to save cannot be disguised as success; Expired or altered invitations cannot modify the status.
- It is prohibited to delete mobile tests, skip or increase the timeout to mask layout problems.

### Acceptance Standard

1. `setup-team.spec.ts`, `workflow-setup.spec.ts` were all adopted.
2. `phase1.spec.ts` setup/team scene passed.
3. Undo, Invite Offices, Settings Divisions and Organization charts can be operated under 375/390/ 768px.
4. No more target controls in the log were blocked by `intercepts pointer events`.
5. Reverse-body privacy claims to be retained and adopted.
6. `npm run lint`, `npm test`, `npm run build` and `git diff --check` were adopted.
7. Creates a `[RR-WP04][Codex]` submission, reports root and validates viewport.
