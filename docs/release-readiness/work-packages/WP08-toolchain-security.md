> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# WP08 — Development and CI Toolchain Security

## Agent prompt

Address high/critical development/CI vulnerabilities. Stage 2: create worktree from latest origin/integration/v1.0 including WP07. Read AGENTS.md/README/manifest, fetch/report SHA. Never use main or run npm audit fix --force without review.

### Priority dependencies

- Vitest / tinypool
- Vite / esbuild
- ESLint / minimatch
- Other development dependencies in full npm audit

### Requirements

- Upgrade individually to supported secure versions; handle configuration/API/test compatibility.
- Preserve Node 22 CI.
- Never remove lint rules/test files/coverage to pass.
- If no upstream fix exists, prove exclusion from production bundle and document dependency chain/risk/resolution conditions; removal still preferred.

### Acceptance

1. Full npm audit critical = 0; high should also be 0 in principle.
2. npm audit --omit=dev high/critical remain 0.
3. npm ci passes.
4. Node 22 `npm run lint`, `npm run build`, and `npm test` pass.
5. Playwright lists/runs tests without reducing count.
6. git diff --check passes.
7. Create [RR-WP08][Codex] commit; report before/after audit and exceptions.
