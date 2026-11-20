# Job Matching Phase 2 Delivery

2026-11-16 (America/Phoenix) . Codex `claude/fervent-thompson-e2j5u2` PR #14 Preview

## What can the user do now?

Click on **Set up responsibilies** from Team or Settings to enter an independent job setting preview for `/#/matching`. Pages are divided into four sections: From  →  Job Repository  →  People and Defaults  →  Assignment Preview.

1. Upload PDF, Word, text files, or paste field communication; It is also possible to create duties by hand.
2. Click **Draft responsibilies** to see the definition of duties, deliverables, exclusions, links and references suggested by AI. The reference found in source text is **Quote found in source**; The rest is indicated as recommendations. This marking merely proves that the reference exists and does not amount to an explanation of approval.
3. Click on **Use as Draw** before joining the duty library. The same recommendations may be adopted or rejected article by article; After adoption, it is necessary to edit, confirm duties and confirm role connections.
4. Tick role 's job bubbles with members; Sets the individual to include or exclude directly, manually confirms availability and necessary qualifications, and then sets the default and backup.
5. Linking workflow steps to responsibilities and looking for proponents and causes. (b) The same function can be reused across the work; A composite step may be marked as requiring split or explicit integration.

The duties support the creation, editing, confirmation, merge and archiving of new files. The platform did not force the target organization to select fixed rolls such as Secretary and Markering, nor did it automatically qualify the outside school system.

At this stage, the **saves an independent setting preview that does not change existing tasks or live team records. The creation of** tasks, the upgrading of old archives and the tailoring of 46 standard steps are still unapproved phases 3. (b) Constitution rule read and short-term read continue to be kept; Adds a new version of the functional reading as compatible extensions.

## What do you mean, "accidentance"?

Preview entrance:

- [Current Team Settings Preview](https://deploy-preview-14--platypus-officer-hub.netlify.app/#/matching)
- [12Example of human robotics ](https://deploy-preview-14--platypus-officer-hub.netlify.app/#/matching?example=1)

Edit using president or Viice presidient; Other members can see. **Try 12- person example** on the page uses a stand-alone space to keep the current manual configuration. Example is completely offline and does not call AI by opening, returning or refreshing it.

| Select in the example | The results to be seen. |
| --- | --- |
| Book a meeting room / Reserve a competition space | Both process reuse site duties, pre-selection Demo Riley |
| Prepare the competition poster | Default not available, suggest Demo Drew, clear need to confirm backup |
| Test the firmware | Multiple candidates, no defaults, waiting for a choice. |
| Prepare a flight demonstration | Qualifications unknown. Check qualifications first. |

Manual processes: New duties: Filling definitions with deliverables *Save daft § Conform responsiability ~ Checking functions under rale confirmation of meeting availability  →  setting defaults and backups § new steps and confirming functional association. Renovation configuration should be maintained. Export uses **Export preview**.

AI processes only use field communication. (b) Development of a validation use simulation response; The live Air call has not been automatically executed, so the actual model quality, time-consuming and the current preview of Blob/AIR connectivity status have not yet been measured. If an AI or archiving service is not available, the interface will clearly report errors and manual settings can continue.

## Rules for retaining manual content and requests

- The new recommendation is to add only drafts and does not cover manual content or confirm records. (a) The same recommendation may be adopted or rejected only once; A set of recommendations could be dealt with article by article.
- Confirms that the functions just introduced in this instalment will not allow the remaining recommendations to expire; After manually rewrite or archive it, modify source text or roll, the remaining relevant recommendation is entered into stale and cannot continue directly.
- Source text and complete requests are saved successfully in the browser before AI is launched; Failure to save does not trigger a request for fees. Click again to repeat the current completion results when you do not change, and specify that a retry of rolle or genderal is an explicit new request.
- Refreshing, leaving the page and editing input will prevent overdue responses from being used. (a) Interruption requests are not automatically repeated; Normal members can also restore a breakout status when they cut back their editable identity.
- **Stop waiting** ceased to wait and was introduced without undertaking that the supplier had stopped executing or billing. Manual settings are still available when global AI switches are closed.
- Keep an unsaved preview for export when writing fails and stop the follow-up overlay; Modifys the conflict hint export and read again. Bad or unsupported version of source text can be downloaded without Reset demo instead of recovery.
- The team comes from a copy when entering this independent setting; The custom rule, qualification, membership relationship in the preview does not rewrite an old business. Recomplete the last round preview of the organization ' s settings using new invitations; The identifier is only a local domain and cannot be used as an official basis for missions.

## Technology Handoff

The shared contract is available at [ MATCHING_STAGE2_CONTRANT.md ](MATCHING_STAGE2_CONTRACT.md). Main entrance:

- `src/matching/MatchingPage.tsx`, `setupContext.ts`: Old team read-only, context segregated, route entrance.
- `setupWorkspace.ts`, `useMatchingSetup.ts`: Verified operation, preservation, history, request and adoption/refusal of control.
- `src/matching/ui/`: Components are only operated by controllers and do not simply write old store or durability.
- `constitutionClient.ts`: Request/response to secondary verification, cancellation and timeout.
- `netlify/functions/constitution.mts`: New `part: responsibilities`; The original structure/duties branch is compatible.
- `netlify/lib/matching/`: Server prompt, entry verification, source text reference check and private archive.

The local preview document uses `platypus.matching.setup.v1:<encoded context>`, which contains source drafts, complete requests, verified responses, adopted/rejected and operating history. The original business key, `DemoState` and the outer layer version of 22 have not been changed. (b) The browser check is not an atomic matter or a trans-equipment database; Phase 3 must be based on a uniform version of [ MATCHING_COMPATIBILTY.md ](MATCHING_COMPATIBILITY.md), which cannot be double-written over time.

The new AI requests the use of independent private Netlify Blob store `platypus-matching-constitution-v1`: save input and exact prompt before calling; `chatJSON.onResponse` Preservation of original responses and diagnostics prior to analysis; The result may have failed to be filed separately. (a) Atom `onlyIfNew` to accept the same request ID to prevent duplication of fees; Reset to the cache has been completed and sending/failed does not automatically call again. Failed before new call when archive is not available. No publicly available archive list or reading interfaces; Client ID with actor is not a formal account system.

Relocation protection here is for the station to receive the same request repeatedly. The supplier level retains the previously approved output cutback retry by Juanxi: up to one additional test when sufficient time is left, and all attempts go into the original diagnosis. Therefore, a “one click” or “one request ID” commitment cannot be charged to only one supplier; This sharing strategy has not been changed at this stage.

First edition limit: source text up to 60,000 characters, 100 roles and 500 existing duties; Explicit hint, do not silence intercept. Prompt each recommended maximum 12 to control time-consuming and verify acceptance of up to 40 complete entries; Part of the failure is a warning, one by one, and not a guess. The semantic overlap of duties, workflows and full policy coverage are still subject to manual review, and AI does not claim that it has been shown to be complete.

## Worktree and check logs

Phase 1 Baseline `b883107`; Stage 2 Contract `8a5d0f4`. Two developments, Agent, started from the same contract, and the retention package was submitted in combination:

| Work package | Submit | Contents |
| --- | --- | --- |
| AI Agent | `4f31c58` | Extract service, client, private archive and 25 simulation checks |
| UI Agent | `805ef2a` | Job setup component, token style and 18 components check |
| Lord Agent | `3380d41`、`ccea818` | Save controller, entrance, context, integration and review restoration |

Independent Review on Final Run-time Code `ccea818` passed. Discovered 3 items P2 have been repaired and reviewed: expired with the re-programming of duties, re-established isolation after a change of identity. Can not delete folder: %s: No such folder

| Inspection | Results |
| --- | --- |
| New and old relevant module/component testing | 15 files, 276 adopted (phase 2 with new 71 + stage 1 91 + Old Link 114) |
| `npm run lint` | Passed |
| `npm run build` | Through, including front-end type check |
| `npm run typecheck:netlify` | Passed |
| `e2e/matching-stage2.spec.ts` | Desktop 9 + mobile phone 9 with a total of 18 through |
| Response and accessibility | No horizontal overflow of two dimensions, WCAG 2.0/2.1/2.2 A/AA scan passed and screen checked |
| Read-only Independent Review | Through which the fixes were reviewed |

Unit command: `npm test -- --maxWorkers=2 src/matching src/test/m4.test.ts src/test/orgWorkflow.test.ts src/test/workflowV2.test.ts src/test/m2b.test.ts src/test/onboardingTeam.test.ts src/test/fb-05-create.test.ts`.

Browser command: `PW_PORT=4312 PW_STORAGE_PORT=4313 PW_CHROMIUM=/usr/bin/chromium npx playwright test e2e/matching-stage2.spec.ts --project=desktop --project=mobile --workers=2`. All API intercepts as simulated responses; Implementation testing of local production construction.

A start-up browser examination revealed that `waitingOnPersonId: null` would be replenished for the first time by an old business reader, so maintaining a comparison of claims from the full client after normal reopen; No field is deleted to assert or modify the old reader. The rejuvenation browser may first interrupt Fetch and is now leaving the event log interrupted. Parallel build/browser load, one component is time-consuming; Change to a streamlined team kit related to the case, retain all original assertions and run back with two workers. No increase in overtime or lowering of the inspection threshold.

Playwright or `npm run check` are not repeated at this stage. Live Air/Blob, Safari/iOS and official multiple account numbers were not authenticated and the simulation validation could not be described as having been measured for these services. Updates only the functional branch with PR #14 preview, not merge main. Phase 3 is still pending approval. Could not close temporary folder: %s

Deployment check: Deploy-preview status on GitHub `09dd532`returns access with the above-mentioned PR# 14Links;  The current cloud environment browser returns `ERR_TUNNEL_CONNECTION_FAILED` and the curl of the URL returns proxy CONNECT 403, so no online page click is recorded as passed. The 18 browser check has been completed in local production, and the AI Live service is still being used manually for follow-up. The addition to the subsequent delivery document does not change the running time code already available.
