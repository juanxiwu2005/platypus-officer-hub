# Responsibility Matching Stage 2 Development Contract

2026-11-16 (America/Phoenix). Juanxi approved stage 2: actionable responsibility setup and constitution AI enhancements only; no actual task-creation integration or legacy business-save migration. Shared type authority: `src/matching/setupContracts.ts`; reuse stage-1 contracts/resolver.

## File ownership

- Main agent: shared types, setupWorkspace.ts, useMatchingSetup.ts, MatchingPage.tsx/tests, App/Team/Settings entry points, style import, browser tests, delivery docs.
- AI agent: `src/matching/constitutionClient.ts`, AI-only tests, `netlify/lib/matching/`, backward-compatible branch in existing `netlify/functions/constitution.mts`; no other product API/UI changes.
- UI agent: `src/matching/ui/`, `src/styles/matching-setup.css`, UI-only tests; no shared types/controller/old pages/App/main style entry.

## AI boundary

Public client method: `extractMatchingResponsibilities(request: MatchingExtractionRequest, options?: { signal?: AbortSignal }): Promise<MatchingExtractionResponse>`; also export `validateMatchingExtractionResponse(raw: unknown, request: MatchingExtractionRequest): MatchingExtractionResponse` for recovery/revalidation. Continue POST `/api/setup/constitution`, adding `part: responsibilities`; preserve structure/duties compatibility. Request/response requestId/sourceId must match exactly.

Associate responsibilities only with supplied role IDs, without fixed-function enums; allow general responsibilities without roles. AI does not update existing responsibilities/members, create confirmed records, or provide dates. Quotes must be contiguous exact text in this input. Unsupported sources are suggestions, never verified constitutional facts. Reject invalid items individually with warnings, without inventing missing/truncated content. Support partial requests with explicit targetRoleIds. No automatic AI on entry/back/refresh.

Reuse server ASU AIR and timeout budget. Request only after browser input save succeeds. Server follows AGENTS data-foundation requirements: save input before invocation; save raw response/diagnostics via chatJSON.onResponse before parsing, including failures. Use a separate private prototype archive namespace; client actor/request IDs are not formal identities. If archive unavailable, fail before paid invocation and allow manual continuation; never silently omit records. No claims of real accounts or cross-device authorization. Live AI tests disabled by default.

## UI boundary

Default export MatchingSetupView(props: MatchingSetupViewProps) from `src/matching/ui/MatchingSetupView.tsx`; named export also acceptable if agreed with main agent. Parent controller validates, saves, requests, stops; all actions via props, no business-store/persistence access.

Minimum path: upload PDF/docx/txt/md or paste fictional constitution → read (optional role-specific retry) → sources/warnings → explicitly adopt drafts → edit/confirm responsibilities → role bubbles, direct member inclusions/exclusions, availability/required qualifications → default/backups → step links/resolver preview. Support manual create/edit/merge/archive. Use stage-1 commands for every action, never mutate matching arrays directly. Preview supports custom role creation/renaming; qualification confirmation is a demo, not real permission assignment.

One primary responsibility per ordinary step; composite tasks marked needs_split. Preview displays resolver output only, never writes real tasks or fabricates claims. Candidate lists explain ineligible/unknown reasons; backups require confirmation. Default/backup controls must expose non-candidates, unavailable people, and unknown qualifications; never treat unknown as eligible.

Preserve manual responsibilities/confirmation records. AI adoption adds editable drafts/unconfirmed links only, requiring further human confirmation; repeated adoption cannot duplicate records. Parent save failure must not commit a new document; show error and preserve form. Corrupt/new-version previews offer original download, never overwrite with an empty sample.

English UI, Chinese docs [historical documentation rule; superseded by current English policy]; follow `docs/DESIGN_TOKENS.md`. New CSS uses existing tokens/responsive layout; semantic forms, keyboard access, no mobile horizontal overflow. Use responsibility-bubble summaries/progressive disclosure to avoid form clutter; no prompts displayed. Stop ends this wait/adoption only, without claiming provider billing stopped.

## Isolation and persistence

Stage-2 separate key `platypus.matching.setup.v1`, using a preview copy of existing team only. Main controller records context identity to prevent reuse after organization switching/resetup. Member/role copies are prototype inputs, never authoritative business data. Stage 3 uses MATCHING_COMPATIBILITY.md for explicit import/unified authority.

Preview documents include version, independent revision, source drafts, full requests/results, adoption/rejection/events. Writes check expected revision; conflicts preserve current drafts and reject overwrite, without claiming cross-tab atomicity. After refresh, pending becomes interrupted and cannot retrigger paid requests. Before adoption, verify source, roles, and existing-responsibility snapshot still match; retain stale responses in history without direct adoption.
