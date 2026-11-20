> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# WP04 — Setup, Team, Settings, mobile obstruction

## Agent prompt

Fix organization Setup/Team/Settings/mobile obstructed controls. Read `AGENTS.md`, README, manifest, fetch/confirm latest stage baseline SHA. No `main`.

### Scope

- `e2e/setup-team.spec.ts`
- `e2e/workflow-setup.spec.ts`
- setup/team cases in `e2e/phase1.spec.ts`
- Settings/org chart/role management/officer invitations/meeting-finder components/styles

### Known actual issue

Mobile Settings `org-canvas`, `roles-manager`, settings nav/top bar intercept pointer events for Undo/Invite officers/Try officer setup.

### Requirements

- Find actual layout-height/sticky/z-index/overflow/transform/scroll-position cause.
- Actual clicks/touch on all visible controls at 375px/390px/768px; no force click.
- Update obsolete seed counts/role names/workflow nodes/meeting-finder date assumptions.
- Preserve privacy/consistency: no private buffers/files/profiles in shared requests; workspace created only after approval; manual completion on AI failure; no false save success; expired/tampered invitations cannot change state.
- No removed mobile tests/skips/timeout increases hiding layout defects.

### Acceptance

1. All `setup-team.spec.ts`, `workflow-setup.spec.ts` pass.
2. setup/team cases in `phase1.spec.ts` pass.
3. Undo/Invite officers/Settings sections/org chart usable at 375/390/768px.
4. No target-control `intercepts pointer events` obstruction in logs.
5. Request-body privacy assertions retained/passing.
6. `npm run lint`, `npm test`, `npm run build`, `git diff --check` pass.
7. One `[RR-WP04][Codex]` commit, reporting root cause/verified viewports.
