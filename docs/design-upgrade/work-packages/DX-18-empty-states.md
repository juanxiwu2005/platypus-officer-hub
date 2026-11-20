# DX-18 empty state file and next step (except Tasks, Events)

- Phase 3 size S Risk Low R Level R2 Dependence: DX-01 Parallel Partners: DX-15 ~ 17, 19
- Branch: `design/dx-18-empty-states` Corresponding Details: D25

## Why?
The current empty state only says "no" now, not next. For example, `Funding.tsx`: "Nothing needs action." `Partners.tsx`："No contacts match."、"No organizations match."；`Today.tsx`："No finished steps yet this week."。Apple `writing.md` and Lens 5: Empty screens to invite next steps.

## Something to do.
1. **First audited and then modified**: `grep -rn "<Empty" src/pages src/components` lists each empty state and the page on which it is located (excluding `Tasks.tsx`, `Events.tsx`, belonging to DX-16, DX-15), with a list posted in the report.
2. Replace each article with "A statement + Give a button or link if there's a corresponding action." For example, " No contacts match. **Clear filters** " (point clean filter). If you don't have the right action, keep a word. Don't put it in hard.
3. The text is in English and follows the current tone (short, direct). **No additional word**: no more "see" and "total word" on every page of `npm run words` than is currently available (the ceiling for Partners is 120/120, which must be measured first).
4. No illustrations, no icons.
5. Do not change any data structure, do not change logic other than button behavior.

## Files that can be changed
`src/pages/Today.tsx`, `Team.tsx`, `Funding.tsx`, `Handoff.tsx`, `Partners.tsx`, `Rules.tsx`, `Settings.tsx` (lines with empty status only).
**Don't touch it.**：`Tasks.tsx`、`Events.tsx`、`ui/index.tsx`Yeah. `Empty`The components themselves (in the report if parameters are required).

## Acceptance
- `today.spec.ts`, `crm.spec.ts`, `wp5.spec.ts`, `word-budgets.spec.ts`, `a11y.spec.ts` desktop + mobile phone green; The `npm run words` comparative table is included in the report.
- Juanxi How to Test: Search a non-existent name in Partners with a "clean filter" link in the tip.

## Rollback
R2。
