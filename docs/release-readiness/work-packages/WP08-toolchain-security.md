# WP08 - Development and CI Tool Chain Security

## Agent prompt

You are responsible for the development of high/critical holes in the CI tool chain. This package is the second stage and must be created from the latest `origin/integration/v1.0` that has been integrated into WP07. Read `AGENTS.md`, README, manifest, fetch before starting and report to SHA. `main` may not be used or can run `npm audit fix --force` without review.

### Focused reliance

- Vitest / tinypool
- Vite / esbuild
- ESLint / minimatch
- Other development dependence in the complete `npm audit` report

### Request

- Upgrades to a supported security version, processing configuration/API/test compatibility changes.
- Keep Node 22 CI compatible.
- Lint rules, test files or test overlays may not be removed in exchange for passage.
- If there is no upstream restoration, it must be proved not to enter the process bindle and record the chain of dependence, risk and release conditions; Priority remains to be given to elimination.

### Acceptance Standard

1. The complete `npm audit` criminal is 0 and, in principle, high is 0.
2. `npm audit --omit=dev` Keep high/ criminal to 0.
3. `npm ci` passed.
4. `npm run lint`, `npm run build` and `npm test` under Node 22 were adopted.
5. Playwright configuration can list and run tests, the number of tests is not reduced.
6. `git diff --check` passed.
7. Creates a `[RR-WP08][Codex]` submission, reports results before and after audit and any exceptions.
