# Partners temporary archive

2026-11-19（America/Phoenix） · Codex。Users explicitly requested that partners be temporarily hidden, and that codes be retained; Team moves to main navigation. Archiving Baseline `ac19513`, following PR14/preview 14.

- `Partners.tsx`, originally `src/pages/Partners.tsx`, retains full page code such as People/Board/Organizations, filtering and adding; Only corrects the import path after a move, and clearly retains the Partners title.
- `dx-26-crm-drag.css` was originally `src/styles/dx-26-crm-drag.css`, reserved word by word, exits active style import.
- The exclusive browser test is moved to repository `archive/partners/e2e/` and is no longer included in the e2e catalogue of the current product; Partners' exclusive blank scenes from the blending tests are also archived separately. The sharing of CRM data continues.
- The current App does not import archive pages, navigation does not have partners, old `/#/partners` and lower path returns safely to the first page; Do not build an independent Partners page chunk. Team appears directly on the main navigation and does not display empty More buttons when it is inactive.
- `data/crm.ts`, type of contact/organization/link history, store operation and as-remained. Handoff still uses shared contact information components such as `components/crm/ContactDetail`; These shared codes and associated base styles remain in place to avoid damaging the Handoff information. The live tasks and general connection issues in the workflow do not belong to this separate page and do not delete/rename. The schema and storage keys remain unchanged.

## Restore from now

Reconnect this component to the `partners` route of App (remove current reorientation) and restore partnerer page definition in `src/routes.ts`; `src/styles/index.css` imports the CSS archive, then puts the `archive/partners/e2e/` test back to the e2e directory and adjusts the helpes import. Restore the original 120/120 word budget and screenshot/accessible page list in `scripts/word-count.mjs`, running CRM with page acceptance.

The original file can also be checked from the baseline `ac19513`, but not all rollbacks to avoid covering workflows, reminders and subsequent changes over the same period. Currently, only stand-alone pages are frozen and user data have not been cleaned; No data migration is required to reboot.
