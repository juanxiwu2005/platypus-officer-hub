# WP10 - Final Integration and Publication Authentication

## Agent prompt

You are responsible for the final release of all work package merges. In principle, no new functions will be added and only integrated returns will be repaired. This package is the third stage and must be created clean worktree from the latest `origin/integration/v1.0`. Read `AGENTS.md`, README, manifest and first two stages Handoff, fetch before starting, confirm that HEAD is consistent with the remote and report complete/short SHA. `main` cannot be used or modified.

### Prohibitions

- The green result should not be obtained by skip, timeout, delete tests, force click, lower word/safe/package standards.
- Do not automatically call live AIR; Only handy smoke checklist.
- It may not be claimed that a failure is prohibited.

### It has to be done.

1. `npm ci`
2. Node 22：`npm run lint`、`npm run build`、`npm test`
3. Strict TypeScript check for Netlify Operations and back-end libraries
4. `npm run words`
5. Full Playwright: desktop, mobile, desktop-storage, mobile-storage
6. `npm audit --omit=dev`
7. Complete `npm audit`
8. `git diff --check HEAD`
9. `git fsck --no-reflogs --connectivity-only`
10. Secret/ private-key scan
11. Build product size and lazy loading check
12. Read the current GitHub Checks when permitted

### Acceptance Standard

- Lint/Build/unit All adopted.
- Playwright 0 failed; All sskip is an established, well-defined and documented condition kskip cannot add no justification skip.
- `npm run words` passed.
- Production of audit 0 high/critical; Complete audit 0 criminal, in principle 0 high.
- The main entrance hunk is below 500 kB.
- The workspace's clean, the HEAD is consistent with the latest `origin/integration/v1.0`.
- No secret leak.
- Output release reports classified by bottom logic, data arcitecture, front end, backend, security, interaction, accessibility, performance, and live AI manual smoke checklist.
- The conclusion that "merge main" can only be given after all the hard doors have been passed. The real merge main still needs another explicit approval from Juanxi.

Create a `[RR-WP10][Codex]` submission if integrated returns need to be repaired; If no change is required, report explicitly no limit.
