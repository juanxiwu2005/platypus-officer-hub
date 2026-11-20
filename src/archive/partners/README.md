# Partners temporarily archived

2026-11-19 (America/Phoenix) · Codex. User explicitly requested temporarily hiding Partners, preserving code, and moving Team to main navigation. Archive baseline `ac19513`, continuing PR 14/preview 14.

- `Partners.tsx`, formerly `src/pages/Partners.tsx`, retains full People/Board/Organizations, filters, creation, and other page code; only moved import paths corrected, and Partners title explicitly retained.
- `dx-26-crm-drag.css`, formerly `src/styles/dx-26-crm-drag.css`, retained verbatim, removed from active style imports.
- Dedicated browser tests moved to repository `archive/partners/e2e/`, outside current product e2e; Partners-only empty-state scenarios in mixed tests archived separately. Shared CRM data unit tests still run.
- App no longer imports archived page, navigation omits Partners, old `/#/partners`/descendants safely return home; no standalone Partners chunk built. Team directly in main navigation; no empty More when no active entries.
- `data/crm.ts`, contact/organization/contact-history types, store actions, saves retained unchanged. Handoff still uses shared contact components such as `components/crm/ContactDetail`; shared code/base styles stay in place to protect handoff records. Actual workflow tasks such as Partner meeting and general contact questions are outside this standalone page; never deleted/renamed. Schema/storage keys unchanged.

## Restore later

Reconnect component to App `partners` route (remove redirect), restore Partners definition in `src/routes.ts`; import archived CSS in `src/styles/index.css`, move `archive/partners/e2e/` tests back to e2e and adjust helpers imports. Restore original 120/120 word budget in `scripts/word-count.mjs`, screenshot/accessibility page lists; run CRM/page acceptance.

May also compare originals at `ac19513`, but do not revert whole baseline and overwrite concurrent workflow/reminder/later changes. Only standalone page frozen, no user data cleanup; reenabling needs no migration.
