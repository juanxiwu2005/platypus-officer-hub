> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# DX-18 Empty-state copy and next actions (except Tasks, Events)

- Stage 3 · Size S · Low risk · Rollback R2 · Depends on: DX-01 · Parallel partners: DX-15–17,19
- Branch: `design/dx-18-empty-states` · Detail: D25

## Why
Existing empty states say only "nothing here, " not what to do next. Examples: `Funding.tsx`: "Nothing needs action."; `Partners.tsx`: "No contacts match.", "No organizations match."; `Today.tsx`: "No finished steps yet this week." Apple `writing.md` and Lens 5: empty screens should invite a next step.

## Tasks
1. **Audit before changing: ** `grep -rn "<Empty" src/pages src/components` lists every empty state/page (excluding `Tasks.tsx`/`Events.tsx`, owned by DX-16/DX-15); include the list in the report.
2. Change each to "one explanation + a button/link if a corresponding action exists, " e.g. "No contacts match. **Clear filters**" (clears filters). Keep one sentence where no suitable action exists; do not force one.
3. English copy, same short/direct voice. **No word-count increase: ** neither "at a glance" nor total words from each page's `npm run words` may exceed current counts (Partners limit 120/120; measure remaining allowance first).
4. No illustrations or icons.
5. No schema changes or logic changes beyond button behavior.

## Allowed files
`src/pages/Today.tsx`, `Team.tsx`, `Funding.tsx`, `Handoff.tsx`, `Partners.tsx`, `Rules.tsx`, `Settings.tsx` (empty-state lines only).
**Forbidden: ** `Tasks.tsx`, `Events.tsx`, `Empty` itself in `ui/index.tsx` (report any needed parameter additions).

## Acceptance
- `today.spec.ts`, `crm.spec.ts`, `wp5.spec.ts`, `word-budgets.spec.ts`, `a11y.spec.ts`, desktop/mobile green; before/after `npm run words` table in report.
- Juanxi: search a nonexistent Partners name; message includes a Clear filters link.

## Rollback
R2.
