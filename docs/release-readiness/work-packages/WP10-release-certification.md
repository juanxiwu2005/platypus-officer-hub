> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# WP10 — Final integration/release certification

## Agent prompt

Own certification after all packages merge; generally no new features, integration regressions only. Stage 3 clean worktree from latest `origin/integration/v1.0`. Read `AGENTS.md`, README, manifest, prior two handoffs; fetch, confirm HEAD=remote, report full/short SHA. Never use/modify `main`.

### Prohibited

- No skip/raised timeout/deleted tests/force click/weaker word-security-bundle standards for green results.
- No automatic real paid AIR; prepare manual smoke checklist only.
- No main-ready claim while gates fail.

### Required

1. `npm ci`
2. Node 22: `npm run lint`, `npm run build`, `npm test`
3. Strict TypeScript for Netlify Functions/backend libraries
4. `npm run words`
5. Full Playwright: desktop/mobile/desktop-storage/mobile-storage
6. `npm audit --omit=dev`
7. Full `npm audit`
8. `git diff --check HEAD`
9. `git fsck --no-reflogs --connectivity-only`
10. Secret/private-key scan
11. Build sizes/lazy-loading checks
12. Current GitHub Checks if permissions allow

### Acceptance

- All lint/build/unit pass.
- Playwright 0 failed; skips existing/explicit/documented conditional only, no new unjustified skips.
- `npm run words` passes.
- Production audit 0 high/critical; full audit 0 critical, normally 0 high.
- Entry chunk < 500 kB.
- Clean workspace, HEAD matches latest `origin/integration/v1.0`.
- No secret leaks.
- Release report by underlying logic/data architecture/frontend/backend/security/interaction/accessibility/performance, plus real-AI manual smoke checklist.
- Only after all hard gates pass conclude “may request main merge”; actual merge still requires separate explicit Juanxi approval.

If integration regressions need fixes, one `[RR-WP10][Codex]` commit; otherwise explicitly report no commit.
