# Responsibility Matching Stage 2 Delivery

2026-11-16 (America/Phoenix) · Codex · `claude/fervent-thompson-e2j5u2` · PR #14 preview

## What users can do now

Select **Set up responsibilities** in Team or Settings to open isolated preview `/#/matching`: source → responsibility library → people/defaults → assignment preview.

1. Upload PDF, Word, text, or paste a fictional constitution; alternatively create responsibilities manually.
2. **Draft responsibilities** shows AI-proposed definitions, deliverables, exclusions, roles, quotes. Exact source matches show **Quote found in source**; others are suggestions. This proves the quote exists, not that its interpretation is approved.
3. Only **Use as draft** adds an item to the library. Accept/reject suggestions individually; adopted responsibilities and role links still need editing/confirmation.
4. Select role responsibility bubbles/members; direct-include/exclude individuals, manually confirm availability/qualifications, then defaults/backups.
5. Link workflow steps to responsibilities and inspect suggested people/reasons. Reuse responsibilities across workflows; flag composite steps for splitting or explicit coordination.

Responsibilities support create/edit/confirm/merge/archive, with custom role names. No forced Secretary/Marketing role choices or automatic external-school-system qualifications.

**Stage 2 saves an isolated setup preview; existing tasks and actual team records are unchanged.** Task creation, old-save upgrades, and per-step adaptation of 46 standard steps remain unapproved stage 3. Original constitution structure/short-duty readers remain; new responsibility reading is a compatible extension.

## Acceptance

Preview entries:

- [Current-team setup preview](https://deploy-preview-14--platypus-officer-hub.netlify.app/#/matching)
- [12-person robotics club example](https://deploy-preview-14--platypus-officer-hub.netlify.app/#/matching?example=1)

President/VP edit; others view. **Try 12-person example** uses a separate space, preserving manual configuration. Entirely offline; entry/back/refresh never invokes AI.

| Example choice | Expected result |
| --- | --- |
| Book a meeting room / Reserve a competition space | Both reuse venue responsibility, preselect Demo Riley |
| Prepare the competition poster | Default unavailable; suggest Demo Drew, explicitly confirm backup |
| Test the firmware | Multiple candidates, no default; await selection |
| Prepare a flight demonstration | Qualifications unknown; verify first |

Manual path: new responsibility → definition/deliverables → Save draft → Confirm responsibility → select under role → confirm member availability → default/backup → new step/confirm responsibility link. Refresh preserves configuration. **Export preview** exports it.

Use fictional constitutions only for AI. Development used mocked responses, without automatic live AIR calls; actual model quality, latency, and preview Blob/AIR connectivity remain untested. AI/archive failures show explicit errors; manual setup continues.

## Preserving manual content and requests

- Suggestions add drafts without overwriting manual content/confirmation. Each suggestion can be accepted or rejected once; process batches individually.
- Confirming a newly adopted responsibility does not stale remaining suggestions. Manually rewriting/archiving it, changing source or roles, marks related remaining suggestions stale and blocks direct adoption.
- Save source/full request in browser before AI; save failure prevents paid calls. An unchanged full read reuses the completed result; role/general retry is an explicit new request.
- Refresh, departure, input edits block stale adoption; interrupted requests never automatically resend. Returning from member to editable identity can recover interrupted state.
- **Stop waiting** ends waiting/adoption without promising provider execution/billing stopped. Manual setup works with global AI off.
- Write failure preserves unsaved preview for export and stops later overwrites; revision conflicts prompt export/reload. Corrupt/unsupported originals remain downloadable; Reset demo is not recovery.
- Team is a copy from entry into isolated setup. Custom roles/qualifications/member links never write back to old business state. Completing organization setup again uses a new existing invitation identifier to isolate the prior preview; local scope only, not a real authorization credential.

## Technical handoff

Shared contract: [MATCHING_STAGE2_CONTRACT.md](MATCHING_STAGE2_CONTRACT.md). Main entries:

- `src/matching/MatchingPage.tsx`, setupContext.ts: read-only old-team adaptation, context isolation, route.
- setupWorkspace.ts, useMatchingSetup.ts: validated actions, persistence/history, requests/adoption/rejection.
- `src/matching/ui/`: controller-only operations; no direct old-store/persistence writes.
- constitutionClient.ts: request/response revalidation, cancellation, timeout.
- `netlify/functions/constitution.mts`: adds part: responsibilities; preserves structure/duties compatibility.
- `netlify/lib/matching/`: server prompts, item validation, exact-source checks, private archives.

Local preview key `platypus.matching.setup.v1:<encoded-context>` includes source drafts, complete requests, validated responses, adoption/rejection/history. Existing business keys, DemoState, outer version 22 unchanged. Browser check-then-write is neither atomic nor cross-device storage. Stage 3 must unify authority per [MATCHING_COMPATIBILITY.md](MATCHING_COMPATIBILITY.md), never indefinite dual writes.

New requests use private Netlify Blob store `platypus-matching-constitution-v1`: save input/exact prompt before invocation; chatJSON.onResponse saves raw response/diagnostics before parse; archive result/failure separately. Atomic onlyIfNew claims same request ID, preventing duplicate charges; completed replay returns cache, pending/failed never automatically reinvoke. Unavailable archive fails before new calls. No public archive list/read endpoint; client IDs/actors are not accounts.

Replay protection covers this site receiving the same request repeatedly. Provider-level output-truncation retry remains as Juanxi previously approved: at most one extra attempt with sufficient remaining time, all attempts in raw diagnostics. Therefore neither one click nor one request ID guarantees one provider charge. This shared policy is unchanged.

Initial limits: 60,000 source characters, 100 roles, 500 existing responsibilities; explicit errors, no silent truncation. Prompt asks at most 12 suggestions for latency; validation accepts at most 40 complete items. Partial failures get per-item warnings, no guessed completion. Human review remains necessary for semantic overlap/workflow/policy coverage; AI does not claim proof of completeness.

## Worktrees and verification

Stage-1 baseline b883107; stage-2 contract 8a5d0f4. Both development agents started from that contract; package commits retained:

| Package | Commit | Content |
| --- | --- | --- |
| AI Agent | `4f31c58` | Extraction/client/private archive, 25 mocked checks |
| UI Agent | `805ef2a` | Setup components/token CSS, 18 component checks |
| Main Agent | `3380d41`, `ccea818` | Persistence controller, entry/context, integration/review fixes |

Independent Review approved final runtime ccea818. All three P2 findings fixed/rechecked: stale suggestions after adopted-responsibility rewrite, pending recovery after identity switch, isolation after resetting the same club. Also recorded interruption on page departure.

| Check | Result |
| --- | --- |
| Related new/old unit/component tests | 15 files, 276 passed (71 new stage 2 + 91 stage 1 + 114 old paths) |
| npm run lint | Passed |
| npm run build | Passed, including frontend types |
| npm run typecheck:netlify | Passed |
| e2e/matching-stage2.spec.ts | 9 desktop + 9 phone = 18 passed |
| Responsive/accessibility | No horizontal overflow at either size; WCAG 2.0/2.1/2.2 A/AA scans passed; screenshots visually inspected |
| Independent read-only Review | Passed; fixes rechecked |

Unit command: `npm test -- --maxWorkers=2 src/matching src/test/m4.test.ts src/test/orgWorkflow.test.ts src/test/workflowV2.test.ts src/test/m2b.test.ts src/test/onboardingTeam.test.ts src/test/fb-05-create.test.ts`.

Browser command: `PW_PORT=4312 PW_STORAGE_PORT=4313 PW_CHROMIUM=/usr/bin/chromium npx playwright test e2e/matching-stage2.spec.ts --project=desktop --project=mobile --workers=2`. All APIs intercepted with mocks; tested local production build.

Initial browser checks showed legacy reader adds waitingOnPersonId: null on first reopen, so preservation comparison starts after normal reopen with the complete business object; no field assertions removed or legacy-reader changes. Browser may abort fetch before refresh processing; departure now records interrupted. One component test timed out under parallel build/browser load; used a smaller relevant team fixture, preserved every assertion, reran with two workers. No timeout increases or relaxed gates.

No repeat of full-site Playwright/full npm run check. Real AIR/Blob, Safari/iOS, formal multi-user accounts unverified; mocks do not establish those services work. Feature branch/PR #14 only, no main merge; stage 3 awaits approval. Local backup sync required.

Deployment check: GitHub Netlify deploy-preview status for 09dd532 was success, targeting PR #14 above. Cloud browser returned ERR_TUNNEL_CONNECTION_FAILED; curl to same URL returned proxy CONNECT 403, so online clicking is not marked passed. All 18 browser checks used local production build; actual AI service requires later human acceptance with a fictional constitution. Later document additions do not change accepted runtime code.
