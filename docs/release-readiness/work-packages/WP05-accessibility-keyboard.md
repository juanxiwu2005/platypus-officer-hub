# WP05 - Cross-Application Accessibility and Keyboard Operations

## Agent prompt

You are responsible for cross-application accessibility, focus management and keyboard interaction. This package is the second stage and must be created from the latest `origin/integration/v1.0` already integrated into WP02, WP03 and WP04. Reading `AGENTS.md`, README, manifest, fetch, reporting baseline SHA before starting, cannot use `main`.

### Scope of responsibility

- `e2e/a11y.spec.ts`
- General Details Panel, Dialog/right Rail, Navigation and Focus Management
- Necessary global or component level accessibility styles

### Request

- The test is updated to the current product structure and the old DOM cannot be restored.
- Focus into details after opening the details; Escape closes and returns the trigger element.
- Tab sequence corresponds to visual and reading order; Can not get message: %s %s
- Process nodes and main controls meet the touch control target dimensions; Board has a keyboard path that doesn't have to drag.
- The text box that is being entered cannot be hijacked when the `/` shortcut focuses on Ask.
- Axe may not have serious/critical information. Target-size or other rules may not be disabled.
- Disables force click, skip, remove keyboard assertions or unhelpful locator.

### Acceptance Standard

1. `e2e/a11y.spec.ts` on desktop/ mobile all through.
2. The main page is 0.
3. Process node does not report target-size information.
4. The opening of the right Rail/dialog, Escape, Focus Restoration and Phone Focus traap are all asserted.
5. `npm run lint`, `npm test`, `npm run build` and `git diff --check` were adopted.
6. Create a `[RR-WP05][Codex]` submission to report on WCAG/interactive issues repaired.
