> **2026-10-26 runtime-data update:** new Activity Workspace connects tasks, approvals, funding to same-origin server runtime records with CAS/idempotency/audit outbox; AI/forms share command channel. See [implementation](ACTIVITY_WORKSPACE_IMPLEMENTATION.md). Private demo identities are not real accounts; old legacy business/real organization-database migration is not automatically included.

# Data foundation: record first, then let AI understand

2026-10-26 · Juanxi's latest requirement: **data recording, management, and governance are the foundation; AI sits above.** Implement this in current Organization Setup, not as a future slogan.

## Current implementation

F1–F7: workspace-isolated local recovery copies separate from online save status; conflicts never silently overwrite. New `/phase1` workspace reads server-approved compiled output directly; drafts do not affect approved running configuration or copy to old localStorage. Today/Tasks/Events etc. have not fully migrated. Historical search indexes retain recent versions; complete append-only events stored separately; recovery proposes local changes requiring approval. See [implementation](F1_F7_IMPLEMENTATION.md).

Online saving uses Netlify Blobs document/object storage plus append-only event archives, not a completed production relational database or real organization identity system.

| Record | Contents | Time/provenance |
| --- | --- | --- |
| User actions | Clicks, field-value changes, checks, focus entry/exit, graph interactions, proposal adoption/discard, workspace opening | Client occurrence time, session/order, server receipt time, workspace, actor |
| Configuration history | Complete submitted/saved configurations, revision, approval state, failure reason, prior approved snapshot | Server UTC, request/save/approval events |
| Uploaded material | Original PDF/DOCX/TXT/MD bytes, name/type/size/SHA-256/chunks/completion; pasted/fictional samples also stored as original-text files | Upload start/chunk receipt/completion; extracted AI text separate |
| Conversations/AI | Change requests, exact system prompt/organization context sent, raw response, validation, task start/completion/error, adoption/rejection | Server time, prompt/routing version, requested/actual model, duration, input hash |
| Export/download | Export/original-download actions; JSON includes configuration/events/file catalog | Export time/workspace boundary |

Chunked files avoid exceeding function transfer limits with 8 MB originals; server rechecks full byte size/SHA-256 on completion. Originals separate from AI-extracted text. Scanned PDFs lack OCR; `.doc` must be saved as `.docx`.

`configuration.submitted/requested/saved/approved` distinguishes submission, server processing, actual save; failed requests are not saved. Every save retains history, draft/approved snapshots separate. Before AI, save action/input; after return, archive raw response, then validate/show suggestions. Failure applies nothing. Background jobs use atomic claims to avoid duplicate concurrent calls.

App interfaces append events only, with no ordinary overwrite/delete UI; retrying a client event ID does not overwrite duplicates. File chunks also never overwrite existing chunks. These are application-level append semantics, not compliance WORM or administrator-tamper prevention.

## Governance boundaries

- All archives partition by server-generated workspaceId. Server resolves reads/exports/downloads from current workspace cookie; submitting another ID cannot access another organization.
- Anonymous test workspaces remain; actor is current workspace session. Real accounts/officer identity/role permissions/cross-device recovery not integrated. Same-browser isolation is not production multi-user identity management.
- **Access-session expiry no longer deletes archives.** Credentials still expire on test-session terms; history/originals remain. Account binding, retention, recovery await identity/governance work.
- Credential fields filtered from input events; platform API keys/auth headers excluded. User originals retained privately verbatim, not sent to other organizations. AI text retains contact cleaning/credential detection.
- Sharing off. Exports are user-initiated within own workspace; no automatic cross-organization learning-pool inclusion. Future sharing needs explicit scope, authorization, anonymization, withdrawal rules.
- No automatic clearing; organizations must define retention/deletion/access before real materials launch. Continue fictional materials.

## Handoff and analysis

Records support verifiable handoff sources, configuration-change reasons, AI adoption/rejection, setup time, waiting/manual-edit counts. No organization-efficiency score or overall-efficiency conclusion from these onboarding events.

Next integrate the same interface with formal events/tasks/meetings/funding/handoff/real conversations. Old reference-page business state is not fully migrated; do not claim complete backfill of historical interactions. Cross-organization comparison/sharing is a separate explicitly authorized feature, never automatic.

## Rules for future engineering

1. Define originals, action events, snapshots, provenance, timestamps before AI.
2. Server time authoritative, client occurrence retained; distinguish occurrence/receipt/processing/approval.
3. AI cannot delete/rewrite foundation records or treat unconfirmed inference as fact.
4. Record failures explicitly and retry; never continue showing saved. Browser queues undelivered events per workspace and warns of unsaved changes on leaving.
5. Exports/analysis read archives without extra model calls merely to record, preserving AI allowance.
