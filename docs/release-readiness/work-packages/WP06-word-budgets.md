# WP06 - Words and Information Density Restricted

## Agent prompt

You are responsible for restoring the page word bar and preserving the detectability of information. This package is the second stage and must be based on the latest `origin/integration/v1.0` that has been integrated into WP02. Reading `AGENTS.md`, README, manifest, fetch, reporting baseline SHA before starting, cannot use `main`.

### Known failures in the review baseline

- `/events`: Total Words 614/420
- `/rules`: Visible 324/170, total word 1671/560
- `/team`: Visible 138/130
- `/funding`: Redirected Events, but still counting according to the old Funding 160 overall word cap

### Request

- `/funding` Disables removal from the stand-alone page door or explicitly as `/events` alias and does not restore duplicate pages.
- Events Default to render only the information currently needed; Minor details are rendered as necessary or selected and no budget, source or key cut-off date should be removed.
- Rules ' classification, search or tabs only render the current selection while retaining all policy sources that can be found. It is important not to cheat only with the large text that CSS hides while still in DOM.
- Team streamlines duplicate statements but maintains clarity of roles and responsibilities.
- LIMITS may not be simply upgraded unless expressly authorized; Scripts should not be modified to ignore what is actually seen by ordinary users.

### Acceptance Standard

1. `npm run words` Completely adopts and reports the number of pages before and after restoration.
2. Funding no longer repeats statistics as a stand-alone page that does not exist.
3. Policy sources, event budgets and accountability information are still accessible via keyboard/read screen.
4. The Rules/Events/SMoke related Playwright test was passed.
5. `npm run lint`, `npm test`, `npm run build` and `git diff --check` were adopted.
6. Creates a `[RR-WP06][Codex]` submission.
