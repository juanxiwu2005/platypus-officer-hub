> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# WP07 — Production dependency security

## Agent prompt

Own production security upgrades. Read AGENTS.md/README/manifest, fetch latest stage baseline, report SHA. No main, uncontrolled `npm audit fix --force`, or incidental WP08 dev-tool upgrades.

### Known audit-baseline issues

- `react-router-dom` 6.28.0 / `@remix-run/router`: open-redirect and protocol-relative redirect/XSS advisories.
- Zod 3.x: oversized constrained collections may exhaust memory.

### Requirements

- Upgrade React Router to a fixed compatible version.
- Upgrade Zod securely; major-version changes require complete client/server migration plus parsing-failure, oversized-input, rejection-path tests.
- Redirects accept only controlled internal paths or explicit allowlists.
- Keep `package.json`/`package-lock.json` synchronized.
- No audit ignore masking production vulnerabilities.

### Acceptance

1. `npm audit --omit=dev` high/critical both 0.
2. `npm ci`, `npm run lint`, `npm run build`, `npm test` pass.
3. Strict Netlify Functions/backend-library TypeScript passes.
4. Routing/invalid parsing/oversized-payload regression coverage.
5. `git diff --check` passes.
6. One `[RR-WP07][Codex]` commit; report before/after versions and audit results.
