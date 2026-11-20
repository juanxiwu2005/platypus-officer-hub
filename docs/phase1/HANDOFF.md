> This document records the previous version of the Phase 1 prototype. Juanxi has further authorized the Organization Setup live AI/line to save incremental quantities; See [ 's new setup handoff ](../organization/HANDOFF.md) for the current coverage. The previous version is set on `/phase1/setup-legacy` and the following old prototype interactive notes are used only for historical reference.

# Phase 1 prototype Handoff and acceptance

2026-10-25 Codex **to Juanxi image acceptance, stop here.**

## Open Preview

- New prototype entry: `/#/phase1`.
- You can click on preview: http://127.0.0.1:4173/#/phase1 (available while the preview service is running).
- The [ draft PR #2 ](https://github.com/juanxiwu2005/platypus-officer-hub/pull/2) (target v1) was created. The status of Netlify deployment is not currently received; The remote link is not confirmed and does not use the old PR #1 as this preview. The GitHub CI status is based on the PR page, and a complete check has been made.
- The old version entry `/` remains as it is, and can be returned from Open language workspace.

## Five steps

1. **Home**: Plan a member activity  →  Review workflow, check if the entrance to the first page is clear.
2. **Organization setup**: Point Continue  →  USe field example, try Accept/ Edit/ Reject, see proposal source text below.
3. **Responsabilities**: After accepting an external communication proposal to clash with Marketing, opting to retain manual division of labour or use advice; Update the organization information after confirmation. You can also use the Skip Constitution to take a short path.
4. **Activity**: Switching Demo Organization A/B, the head of a comparison company; Try List/Board, Dot Tasks, Change Presentation Status, Review Plan  →  Approve preview.
5. **mobile phone and restoration of**: midway update, should stop at the current step. The system should ask only one choice and not approve the plan when there is a lack of a manager.

The answer is “may” or “where”. No need to read the code.

## Delivery and modification documents

| Documentation | Contents |
|---|---|
| `src/App.tsx` | New Isolated `/phase1/*` Routes. Old routes are the same. |
| `src/phase1/PhaseOne.tsx` | Three images, uniform composer, five-step settings, recommended clearance, custom roll, division of labour and process preview |
| `src/phase1/phase1.css` | Separate Styles, Desktop/Phone, Contrast, Touch and Keyboard Focus |
| `src/phase1/model.ts` | Front-end preview model, seven high-level competency groups and fieldconstruction |
| `src/phase1/logic.ts` | Scope division of work, candidate validation and source text mapping, manual priority, two types of processes and preview bridge for existing date engines |
| `src/phase1/repository.ts` | Front-end demonstration repository/localStorage apter, draft separate from approved snapshots, organization and account range, 7 day save policy |
| `src/phase1/phase1.test.ts` | 26 new unit check |
| `e2e/phase1.spec.ts` | 17 scenes, running desktops and mobile phones for a total of 34 new page checks |
| `public/phase1/fictional-constitution.txt` | Field sample for uploading |
| `docs/phase1/ARCHITECTURE.md` | 6-storey model, complete field design, reuse/rewriting list, interface boundary, migration and data governance |
| `docs/phase1/HANDOFF.md` | Ben Handoff, access and known limits |
| `docs/PROGRESS.md` | Change of direction, state, testing, preview and next boundary |
| `docs/PRODUCT_PLAN.md` | Add new directions, historical plans reserved |
| `AGENTS.md` | Clear rules and cessation conditions for the new prototype |

The screenshot is located in the local `output/playwright/phase1-{home,setup,workspace}-{desktop,mobile}.png`; Output directory is not submitted repository. No changes to old schema, rule entry, old page and old test were made outside the preview.

## Validate Results

Complete `npm run check` success:

- The TypeScript check with the Vite build is passed.
- Vitest: **279/279**, including former 253 and new 26.
- Playwright: **141 passed, 13 skip**. Add all 34 entries to be adopted; The 13 item is duplicate accessibility/suspension of mobile phones already tested, and does not delete or relax old tests.
- New check coverage: A/B division of labour, multi-capabilities role, Constitution schema allowlist/evidence/sensitive field, manual conflict with constitution, context permissions strategy, Activity classification, two types of processes, one uncertainty issue, AI date filter, migration check, no private handoff, draft restoration/expiring/approved snapshots, desktop/cell phone, keyboard, 44px touch, upload and kip coordination, three images axe AA scan.
- Manually viewed screenshots of the desktop header, desktop activity and mobile phone settings; Fixes the auxiliary text contrast, List/Board size and jump to port.
- There is no live AI test, no user uses the timer for the first time and no production of missions tests. The 26 model test only validates the local preview logic and is not evidence of completion of the formal API or live migration.

## Known limits

1. **Constitution is a local demonstration extractor**, which recognizes only limited pictureal phrases; Not AIR/DeepSeek. Only txt/md/ paste is supported without PDF/Word/OCR.
2. **Activity is two operational process previews of**. The user ' s word is only for scene classification and options, not full open planner. The approval and task status are only used for local previews, not for old Store.
3. The new preview will demonstrate that the organization/account check returns missions, but the localStorage and demonstration accounts do not constitute a secure production boundary. No live login, database or service-end organization is achieved.
4. No old data migration was implemented; Provides only a policy and a pure check function to keep the original record. The old Tasks/Funding/Handoff etc. remain, and separate tasks and storage methods exist in the old entrances.
5. No new dialogue log has been saved and no Handoff has been formally reconstructed; Only demonstrates the filter borders that have confirmed organizational content to access handoff.
6. Five minutes, at least 80% click completion and low cognitive burden require first-time user measurements; There was no advance declaration of compliance.
7. The date source is an unmodified existing rule engine and fieldial artificial anchor. The ASU policy has not been re-examined at this time.
8. 7 days saved for last save start-up and clean up when reading at end of the device; Could not close temporary folder: %s Closes site storage only in memory, with a clear indication of the page.
9. The remote preview may follow Netlify access protection; Do not try to login, do not change the protection settings. This preview is a backup access.

## Next phase

Wait for the image. Followed by a clear authorization, enter the original requirements for membership Activity Operations, Single AI Workspace/navigation, live database/account/long-term memory, official Handoff. Complete schema, service end check, version ChangeSet, migration to fallback at the time of formal access cannot directly use demo adapter as production backend.

Main and v1 not rewritten; This code is only for `feat/ai-native-phase1`.
