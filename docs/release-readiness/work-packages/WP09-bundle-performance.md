# WP09 -- Initial package and route lazy load

## Agent prompt

You are responsible for lowering the initial JS package and introducing a safe route/functional laziness load. Read the updated baseline of `AGENTS.md`, README, manifest, fetch before starting and report to SHA. `main` should not be used.

### Review of baseline

- The main entrance JS is approximately 722.65 kB (gzip about 222.23 kB).
- `src/App.tsx` synchronises the import of large PhaseOne.
- PDF reading replacement code forms a large chank.

### Request

- Implementation of route or function level lazy loading for non-first screen functions such as PhaseOne, Organizational Settings, PDF Reading.
- Provides accessible Suspense/loading UI to avoid white screen and visible layout jumps.
- Hash roote, direct access, refreshing, Back/Forward and unsaved data protection must be normal.
- Do not hide problems by raising `chunkSizeWarningLimit`.
- Avoids circulatory dependency and loading order problems when using manual Chunks.
- Do not delay the necessary interaction on the front page.

### Acceptance Standard

1. The main entrance hunk is below 500 kB and is uncompressed, and reports on the optimal size before and after.
2. The first screen does not download the PhaseOne/ PDF to achieve chank.
3. `npm run build`, `npm run lint`, `npm test` and `git diff --check` were adopted.
4. The key Playwright test was passed for smoke, phase1, ororganization setup.
5. Direct access and refresh `/#/phase1` is normal, load state accessible without white screens.
6. Creates a `[RR-WP09][Codex]` submission.
