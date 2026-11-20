> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# WP02 — Events/Funding Integration and Rules Interactions

## Agent prompt

Repair Events, integrated Funding flow, Rules, and related browser tests. Read AGENTS.md/README/manifest, fetch latest remote, verify worktree baseline/report short SHA. Never use main.

### Scope

- e2e/events.spec.ts
- e2e/flow-edit.spec.ts
- e2e/feel.spec.ts
- Events/Funding cases in e2e/touch.spec.ts
- e2e/wp5.spec.ts
- Events/Rules/Event Budget production components

### Requirements

- Align with current intent; replace obsolete node-panel, old workflow node IDs/event dates/Funding-page contracts.
- Funding is integrated; budget view/request status/Plan B/manual progress available in Events.
- Verify mouse/touch/keyboard opening, rescheduling after event-date changes, shared Flow/List data, desktop/mobile budgets, editing/Undo/refresh persistence/Reset.
- Similar Rules "Ask Platypus" actions need unique stable accessible names; do not hide duplicates with vague locators.
- Prefer role/accessible name/stable business test ID.
- No duplicate Funding page, force click, skip, assertion deletion, or timeout-only fixes.

### Acceptance

1. events.spec.ts/flow-edit.spec.ts/feel.spec.ts/wp5.spec.ts pass.
2. Events/Funding touch.spec.ts passes mobile.
3. Both devices verify rescheduling/budget/workflow editing/persistence/Reset.
4. Similar Rules buttons have unique accessible names.
5. npm run lint/npm test/npm run build/git diff --check pass.
6. Create [RR-WP02][Codex] commit and return evidence.
