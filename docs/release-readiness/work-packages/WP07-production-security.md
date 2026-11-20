# WP07 - Production dependent on safety

## Agent prompt

You're responsible for the safety upgrade of production. Read the updated baseline of `AGENTS.md`, README, manifest, fetch before starting and report to SHA. No `main`, no running uncontrollable `npm audit fix --force` and no upgrade to the development tool responsible for WP08.

### Review of known issues in baselines

- `react-router-dom` 6.28.0 / `@remix-run/router`: Open Redirection and Protocol-relative redact/XSS Bulletin.
- Zod 3. x: Super-sized constraining operations may cause RAM to run out.

### Request

- Upgrade React Router to a restored and compatible version.
- Upgrade Zod to a secure version; If you cross the Major, move the client and service to complete and parse failed, super-high input and reject path tests.
- Checking redact only accepts controlled internal paths or a clear white list.
- Update and maintain `package.json`/ `package-lock.json` consistency.
- Audit ignore should not be used to hide production loopholes.

### Acceptance Standard

1. `npm audit --omit=dev` 's high/ criminal are 0.
2. `npm ci`, `npm run lint`, `npm run build` and `npm test` were adopted.
3. The Netlify Operations/ Backend library is strict TypeScript check-through.
4. Routes, invalid parsing and super big payload have regression tests.
5. `git diff --check` passed.
6. Creates a `[RR-WP07][Codex]` submission, reports up-to-date version and audit results.
