> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# WP09 — Initial bundle/route lazy loading

## Agent prompt

Reduce initial JS/safely lazy-load routes/features. Read `AGENTS.md`, README, manifest; fetch latest stage baseline/report SHA. No `main`.

### Audit baseline

- Entry JS about 722.65 kB (gzip 222.23 kB).
- `src/App.tsx` synchronously imports large PhaseOne.
- PDF reading creates large chunk.

### Requirements

- Route/feature lazy-load noninitial PhaseOne/setup/PDF reading.
- Accessible Suspense/loading UI, no blank screen/obvious layout shifts.
- Hash routing/direct access/refresh/Back-Forward/unsaved-data protection work.
- No hiding with increased `chunkSizeWarningLimit`.
- Avoid cycles/load-order issues with manualChunks.
- Do not delay essential home interaction.

### Acceptance

1. Entry chunk < 500 kB uncompressed; before/after sizes.
2. Initial screen downloads no PhaseOne/PDF implementation chunks.
3. `npm run build`, `npm run lint`, `npm test`, `git diff --check` pass.
4. Key smoke/phase1/organization-setup Playwright passed.
5. Direct/refresh `/#/phase1` work, accessible loading/no blank screen.
6. One `[RR-WP09][Codex]` commit.
