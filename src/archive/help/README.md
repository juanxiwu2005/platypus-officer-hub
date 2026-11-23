# Help archived

2026-11-23 (America/Phoenix) · Claude, package S5. Owner decision (Juanxi): archive only the Help page; Team, Rules, View as, the AI switch and every other page stay exactly as they are. Archive baseline `95f4a4f`.

## What it was

`Help.tsx`, formerly `src/pages/Help.tsx`, was the `/help` page in the navigation footer ("How does Platypus work?"). It had three cards: "How it works" (five steps: tell it, check it, own it, nudge it, hand it over), "Reading the screen" (status colours, dates, risk colours, contributions, funding timing) and "About this demo".

## Why it is archived

Its text had drifted from the code and contradicted what the product actually does. Each page now explains itself where the work happens, and the Demo menu keeps its one-line demo note. Rather than maintain a second description of the product, the page is frozen here.

## What changed

- `Help.tsx` moved here. Only its import paths changed, and its `PageHead` now carries an explicit `title="Help"` because `/help` is no longer in `src/routes.ts`.
- `src/routes.ts`: the Help footer item is gone; Settings is the only footer item.
- `src/App.tsx`: the lazy Help import and route are gone; `/#/help` and its descendants redirect to `/`, like archived Partners. No Help chunk is built.
- `src/lib/assistant.ts`: the `/help` Ask suggestions row is gone (the panel falls back to the `/` suggestions).
- `scripts/word-count.mjs`: the `/help` row (`[9999, 9999]`) is gone.
- Tests: `/help` left the accessibility page list (`e2e/a11y.spec.ts`); the smoke and router specs now expect `/help` to land on Reminders; the navigation lists in `e2e/navigation-archive.spec.ts` and `e2e/fb-08-reminder-centre.spec.ts` no longer include Help; `e2e/navigation-archive.spec.ts` has a redirect test. Help had no dedicated spec, so nothing moved to `archive/`.
- Kept: `FORECAST_ASSUMPTIONS` in `src/engine/forecast.ts` stays where it is but was reworded in S7 (2026-11-23, commit `c71e230`: shorter plain-language lines without formulas, rule ids or document references), so the archived page would show the new wording. Kept in place unchanged: the `help` icon in `src/components/icons.tsx`, and every task-level "help" reply, status and notice (those mean "I need help with this task", not this page). No schema or storage change.

## Restore later

1. Move `Help.tsx` back to `src/pages/Help.tsx`, change the imports back to `../components/...`, `../engine/forecast`, `../data/store`, and drop the explicit title.
2. `src/routes.ts`: add `{ path: "/help", label: "Help", icon: "help", question: "How does Platypus work?", group: "footer" }` after Settings.
3. `src/App.tsx`: add `const Help = lazy(() => import("./pages/Help"))` and replace the `help/*` redirect with `<Route path="help" element={screen(<Help />, "Loading help…")} />`.
4. `src/lib/assistant.ts`: restore the `/help` suggestions row if wanted.
5. `scripts/word-count.mjs`: add `"/help": [9999, 9999]` back to `LIMITS`.
6. Tests: add `/help` back to `e2e/a11y.spec.ts`, expect the `Help` heading for `/help` in `e2e/smoke.spec.ts` and `e2e/production-security.spec.ts`, add `/^Help/` after `/^Settings/` in both navigation lists, and replace the Help redirect test.
7. Rewrite the copy against the current code before showing it again: that drift is why it was archived.
