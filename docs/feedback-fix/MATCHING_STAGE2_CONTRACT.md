# 2 Development Contract

2026-11-16（America/Phoenix）。Juanxi approved the second phase; Only functional job settings and constitution AI enhancements are performed, without actual task creation or migration of old operations for archiving. Share type original: `src/matching/setupContracts.ts`; Phase 1 Compact and Solver continues to be reused.

## Documents Officer

- Main Agent: Share type, `setupWorkspace.ts`, `useMatchingSetup.ts`, `MatchingPage.tsx` and its tests, App/ Team/Settings portals, style import, browser usage and delivery documents.
- AI Agency: `src/matching/constitutionClient.ts` and AI exclusive testing, `netlify/lib/matching/` and existing `netlify/functions/constitution.mts` backward compatible branches. It is prohibited to modify other products API or UI.
- UI Agency: `src/matching/ui/`, `src/styles/matching-setup.css` and UI exclusive tests. Do not change the share type, controller, old page, App or style master entry.

## AI Border

Client public method `extractMatchingResponsibilities(request: MatchingExtractionRequest, options?: { signal?: AbortSignal }): Promise<MatchingExtractionResponse>`; Export of `validateMatchingExtractionResponse(raw: unknown, request: MatchingExtractionRequest): MatchingExtractionResponse` for restoration and secondary validation. HTTP continues POST `/api/setup/constitution`, adding `part: responsibilities`; Original stucture/duties requests and responses are compatible. Requests and responses to reservations must be fully matched.

Do not produce a list of fixed functions based only on incoming role ID association duties; Allows a general duty without role. AI does not directly update an existing function or member, does not create a confirmed record and does not give a date. Source text reference must be continuous source text in this input text; Unsupported sources can only be supposition and cannot be described as verified constitution facts. Invalid entries can be rejected and warned on a case-by-case basis, but cannot create missing or cut-off content. Supports the partial request for a visible target RoleIDs; Do not automatically call AI for entering, returning or refreshing a page.

Follow the server ASU AIR with the existing timeout budget. The original input is requested only after the browser has been saved successfully; The server saves input before calling and uses `chatJSON.onResponse` to save original response and diagnosis before parsing, in accordance with AGENTS data base requirements. Use an independent, privately owned prototype archive naming space and do not use client actor or request ID as an official identity; Archives that are not available should fail before a fee is called and allow manual continuation without whispering of the skip record. There are no live multiple account or cross-equipment authorization statements. Live AI test does not run by default.

## UI Border

UI Default Export `MatchingSetupView(props: MatchingSetupViewProps)`, file `src/matching/ui/MatchingSetupView.tsx`. Export may also be using a generic name, but it is agreed with the main Agent. The parent controller is responsible for verifying, saving, requesting and stopping; All operations run through props, do not read and write business stre or browser sustainability.

Minimum operating path: Upload PDF/docx/ txt/ md or paste the field observation ~ Click Read (optional rile retry) ~ View source/ warning Support manual creation, editing, merge, archiving duties. Each command uses stage 1 already existing group, not directly changing matching arrays. You can add/ rename custom role in the preview; Membership is only confirmed by rehearsal and not automatically granted live missions.

A primary function corresponds to a normal step; The composite task is marked as needs_split. The preview only displays the condenser output, without writing the actual task or falsifying the identity. The candidate list explains the reasons for non-qualification/unknown, and the backup needs to be confirmed; The default/back-up option must identify non-candidatures, non-availability and unknown qualifications that are not qualified.

The original manual duties and confirmation records are always maintained. The introduction of AI only adds editable drafts and unconfirmed links, requiring further confirmation; Repeated use of the same recommendation does not generate duplicate records. Do not submit a new document when the parent component failed to save, display errors and keep a form. The damage/new version preview provides for downloads of source text without automatically covering blank examples.

UI English, document Chinese; Comply with `docs/DESIGN_TOKENS.md`. The new CSS only uses existing token and responsive layouts, semantic forms, keyboard operations, no horizontal spillover of mobile phones. (a) Reduction of the volume of forms by a summary of job bubbles and roll-out as required; Do not show prompt. Stop merely stopped this wait-and-adoption and did not falsely claim that the vendor stopped billing.

## Isolation and preservation

Stage 2 sets the document key `platypus.matching.setup.v1` independently, using only preview copies of existing teams; The main controller records the context markings to prevent a switch or reset of tissues. Member and roll copies are entered only for this stand-alone prototype and not as business originals. Phase 3 is still imported and harmonized according to `MATCHING_COMPATIBILITY.md`.

Preview documents with versions, independent revisions, source drafts, complete requests and results, adoption/rejection and events. (b) Write the expected revisions to the inspection; Keeps the current draft in case of conflict, refuses to cover it and does not pretend to cross-label atom affairs. Refreshing shows interrupted and does not trigger a request for payment again. Pre-reaction examination source, rule, still matches an existing snapshot of duties; Obsolete response is retained in the record without direct application being provided.
