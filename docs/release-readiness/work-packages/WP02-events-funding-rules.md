# WP02 – Events, Funding Mege Interact with Rules

## Agent prompt

You are responsible for repairing Events, the Funding process that has been incorporated into Events, the Rules page and associated browser tests. Read the latest remotes of `AGENTS.md`, README, manifest, fetch before starting, confirm worktree baselines and report short SHA. `main` should not be used.

### Scope of responsibility

- `e2e/events.spec.ts`
- `e2e/flow-edit.spec.ts`
- `e2e/feel.spec.ts`
- Events/Funding scene in `e2e/touch.spec.ts`
- `e2e/wp5.spec.ts`
- Events, Rules, incident budget-related production components

### Request

- Replace failed `node-panel`, old flow node ID, old event date and old Funding page compacts against current product intent.
- Funding is no longer an independent page; Budget viewing, application status, Plan B and manual progress should be available in Events.
- Validate process nodes to be opened by mouse, touch and keyboard; (b) Changes in the date of the event will recalculate the plan; Lower/List uses the same data; Budget tables are available on the desktop and mobile phones; Edit, Undo, Refresh Lasting and Reset Normal.
- A similar "Ask Platypus" operation in Rules must have a unique, stable and accessible name. Duplicate names should not be masked with vague locator.
- Priority is given to roll, accessible name and stabilization operation test id.
- It is forbidden to repeat the Funding page, force click, kip, delete assertions or simply add timeout.

### Acceptance Standard

1. `events.spec.ts`, `flow-edit.spec.ts`, `feel.spec.ts` and `wp5.spec.ts` were all adopted.
2. `touch.spec.ts`'s Events/Funding scene was passed in mobile.
3. Both desktop/mobile validates date recalculation, budget, process editing, durability and Reset.
4. Rule type button accessible name only.
5. `npm run lint`, `npm test`, `npm run build` and `git diff --check` were adopted.
6. Creates a `[RR-WP02][Codex]` to submit and return evidence.
