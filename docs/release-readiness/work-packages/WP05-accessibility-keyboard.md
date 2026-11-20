> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# WP05 — Application-wide accessibility/keyboard operation

## Agent prompt

Own application-wide accessibility, focus management, keyboard interaction. Stage 2 package: worktree from latest `origin/integration/v1.0` with WP02/03/04 integrated. Read `AGENTS.md`, README, manifest, fetch/report baseline SHA; never use `main`.

### Scope

- `e2e/a11y.spec.ts`
- Shared Details/dialog/right rail/navigation/focus
- Necessary global/component accessibility styles

### Requirements

- Update tests for current product, never restore old DOM.
- Opening Details moves focus inside; Escape closes/restores trigger.
- Tab order follows visual/reading order; modal/rail-covered page cannot receive focus.
- Workflow nodes/main controls meet touch targets; Board keyboard path without drag.
- `/` Ask shortcut must not intercept typing in text inputs.
- Axe 0 serious/critical violations; never disable target-size/other rules to pass.
- No force click/skip/deleted keyboard assertions/meaninglessly broad locators.

### Acceptance

1. `e2e/a11y.spec.ts` all desktop/mobile passed.
2. Main pages Axe 0 serious/critical.
3. Nodes no target-size violations.
4. Assertions for rail/dialog open/Escape/focus restoration/mobile focus trap.
5. `npm run lint`, `npm test`, `npm run build`, `git diff --check` pass.
6. One `[RR-WP05][Codex]` commit, report WCAG/interaction fixes.
