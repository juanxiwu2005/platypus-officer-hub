# Task-matching options and minimal prototype scope

2026-11-16 (America/Phoenix) · Codex · Based on `claude/fervent-thompson-e2j5u2@c85764e`

Compare three choices: building an organization's responsibility library, linking tasks to responsibilities, and selecting executors when several members qualify. Each is examined through user experience, development work, current technical limits, minimal prototype, future expansion. **Juanxi selected A2+B2+C2 and requested worktree agents across two or three stages; stages begin only after approval, within explicit authorization.** Three-stage ownership, compatibility, acceptance: [implementation plan](TASK_MATCHING_IMPLEMENTATION_PLAN.md). Development stages have not started. Other options remain for comparison.

## Confirmed direction and shared rules

User explicitly requires preserving/enhancing constitution AI role/responsibility extraction, manual matching for incomplete extraction, no restriction to preset programs/secretary/marketing functions, multiple workflows, and future one-sentence workflow generation.

Follow the [six-item work order](TASK_MATCHING_REVIEW.md): discuss matching only now; later RACI, reminder plans, email writing, email-link flow, background delivery, then independent work by newcomers.

Rules across options:

- Organizations customize role, responsibility, workflow names; platform examples help them start.
- Extracted responsibilities retain sources; AI workflow-derived responsibilities are suggestions. Both remain editable. Missing extraction must not disguise generic templates as constitution facts.
- One member may hold several responsibilities; one responsibility may have several candidates. Tags grant neither system permission nor external-account qualifications.
- One execution task has one primary executor. Multiple candidates, collaboration, one copy per person are distinct, not automatic duplication.
- Show unmatched gaps. Subsequent AI, refresh, workload recalculation never overwrites human-confirmed assignments.
- Stable IDs link responsibilities; display renames preserve role/task relationships.
- Detect duplicates by same action/deliverable despite differing names; broad groups and detailed responsibilities do not both match the same work. Split composite tasks or explicitly identify multiple required capabilities; matching one capability does not qualify someone for the whole task.

## A How organizations build a responsibility library

### A1 Manually create a custom catalog

President views AI-extracted/manually entered roles, selects “Add responsibility” under each, and types a work name or selects an existing organization bubble. Platform examples are editable. Existing AI role extraction remains; people primarily build the library.

| Perspective | Impact |
| --- | --- |
| Actual experience | Controllable, organization-native terminology; more initial typing, possible duplicate meanings |
| Development | Low–medium: responsibility editing/reuse, role links, source retention, deactivation warnings for references; no new extraction-model task |
| Current limits | Responsibilities are short role text, requiring independent records; synonymous entries cannot be deduplicated by exact strings alone |
| Simplest prototype | Reuse roles/members, add/select responsibilities, preview links; warn on identical names, let humans initially merge synonyms |
| Expansion | Custom records/links extend directly; later AI drafts need no catalog rebuild, but naming differences need ongoing curation |

### A2 AI drafts from constitution, humans confirm

Upload constitution, show original roles, then AI responsibility bubbles below. Clicking reveals definition, deliverable, source passage. President keeps, edits, merges, supplements, then confirms in bulk. Without constitution/on AI failure, use A1 directly.

| Perspective | Impact |
| --- | --- |
| Actual experience | Less initial typing, preserves organization language; president checks constitution completeness/AI overgeneralization |
| Development | Medium: reuse reading/AI interface flow, add structured responsibilities, local validation, source-quote validation, confirmation state, edit protection |
| Current limits | Main-app duties are one/two sentences per role, not a library; long texts are excerpted and may omit content; scanned PDFs lack OCR; AIR has time/output limits |
| Simplest prototype | Role-duty extraction only, in batches; suggestions immediately editable; sources alongside manual additions; retry failed portions only, never overwrite confirmed content |
| Expansion | Add workflow files, role goals, applicable policy actions to same records; revised constitutions produce diff suggestions, not wholesale replacement |

Recommend A2 with A1 always available manually. First verify that AI reduces typing, rather than expecting all organizational knowledge to be understood automatically.

### A3 Build the catalog incrementally from workflows

Constitution still identifies roles/existing responsibilities. First workflow tasks suggest required responsibilities, reusing confirmed entries first; create missing ones beside tasks. Add further responsibilities with later workflows.

| Perspective | Impact |
| --- | --- |
| Actual experience | Start real planning without a full catalog; responsibility additions/synonym merging interrupt workflow creation |
| Development | Medium–high: catalog plus task analysis, reuse suggestions, cross-workflow deduplication, incremental updates |
| Current limits | Event creation mainly applies fixed templates; arbitrary workflows are not connected to a unified library; event-only analysis may miss general work such as annual registration |
| Simplest prototype | Manually mark missing responsibilities in two sample workflows, create/assign roles inline; second workflow reuses first's entries |
| Expansion | Fits one-sentence generation; still needs independent constitution/policy gap checks, not treating recent tasks as all responsibilities |

A3 can follow A2 as an incremental entry. These options describe the primary initial path, not permanently exclusive systems.

## B How tasks link to responsibilities

### B1 Bind each workflow directly to roles

President assigns “request venue” to competition lead, “debug program” to software lead in the template. New events copy role allocation; C options determine people.

| Perspective | Impact |
| --- | --- |
| Actual experience | Intuitive, familiar workflows configured once; similar tasks across templates need separate maintenance |
| Development | Low, closest to `ownerRoleId`/editor; still stop silent fallback from unknown titles to preset functions |
| Current limits | One step already links one editable role; multiple holders still need a separate person-selection layer |
| Simplest prototype | Choose roles/preview members in two editable templates; no semantic matching |
| Expansion | More templates supported, but organizational changes scatter updates; AI-generated workflows need their own role links |

B1 validates assignment interaction, not cross-workflow responsibility reuse by itself.

### B2 Bind template tasks to responsibilities, then find candidates

“Book meeting room” and “request competition venue” both link to this organization's “venue coordination.” Changing who handles that responsibility affects future candidate lookup; existing assignments stay, with changes needing attention flagged. AI suggests or a human selects responsibility initially, then confirmation saves it in the template.

| Perspective | Impact |
| --- | --- |
| Actual experience | Verify task requirements once, reuse recurring events; details explain responsibility, candidates, selection reason |
| Development | Medium: responsibility references, role/member links, template/instance distinction, confirmation provenance, impact prompts; AI needed only for initial suggestions |
| Current limits | Main tasks rely on one `fn`/`ownerId`; add responsibility links/candidate lookup; other pages still use old functions, so deleting them cannot assume compatibility |
| Simplest prototype | One primary responsibility per exercise task; split multi-specialty deliverables first; AI does not choose people on every repeat |
| Expansion | Multiple workflows share responsibilities; add collaborators, alternative responsibilities, workflow-scoped defaults while keeping responsibility identity |

Recommend B2 for existing-template relationships and a unified new-workflow entry. No complex skill-weight model initially.

### B3 AI recommends responsibilities from new-task descriptions

For “organize a robotics competition, ” AI suggests steps and existing responsibilities from the organization's library. If none match, suggest new entries for presidential review. Save confirmed task, responsibility, person; never re-infer on each view.

| Perspective | Impact |
| --- | --- |
| Actual experience | Easier free input/ad hoc work; inspect uncertainties; description/model judgment affects results |
| Development | Medium–high: constrain existing IDs, validate outputs, handle unmatched/composite work, persist/protect manual changes |
| Current limits | AI latency/structured failures; standard event creation does not invoke this per step; arbitrary workflow generation is not completed main-app capability |
| Simplest prototype | Paste a few task descriptions, get one batch recommendation, confirm/freeze; AI failure shows B2's manual selector |
| Expansion | Fits ad hoc/future workflows, depends on B2-like data; save common results as templates to avoid repeated waits |

Combine B3 for the first pass with B2 for reliable reuse.

## C Selecting executors among same-responsibility candidates

### C1 President selects one qualified person

May preselect a sole available candidate; show multiple candidates side by side for batch confirmation at event creation. Show roles, responsibility evidence, recorded unavailability.

| Perspective | Impact |
| --- | --- |
| Actual experience | Explainable choices informed by real work division; many recurring events still mean many choices |
| Development | Low: candidate lookup, deduplication, single selection, unresolved list, persistent human decisions |
| Current limits | No shared responsibility pool; add member/responsibility links; existing multiselect is not a one-of-many selector |
| Simplest prototype | Two people share a responsibility, two candidates shown, one task/one primary executor generated |
| Expansion | Keep as exception handling for all automated strategies; selection and automatic email can operate independently |

### C2 Default assignee and backup per responsibility

Choose primary/backup from qualified members during responsibility setup. Preselect default on creation, allow one-off changes. If explicitly unavailable, show backup for confirmation; if both unavailable, leave unresolved. No default uses C1.

| Perspective | Impact |
| --- | --- |
| Actual experience | One setup simplifies recurring venue, finance, external-contact work; always using one person may be unsuitable when work should be shared |
| Development | Low–medium: responsibility defaults, validity checks, instance overrides; no precise remaining-hours estimation |
| Current limits | Store defaults separately from qualified candidates; role holder is not default for all work; external permissions initially recorded manually |
| Simplest prototype | Primary, backup, manual unavailability; missing/conflicting settings use C1, save only after confirmation |
| Expansion | Workflow-specific preferences or C3 for some responsibilities, without duplicate synonymous entries |

Recommend C2 for minimum usable version, with C1 exceptions. Default preselection is not member acceptance; record assignment and claiming separately.

### C3 Capacity or rotation among qualified candidates

Exclude missing required permissions/unavailability first, then apply organization rules: rotation, or more remaining capacity when effort/capacity data exists. Explain selection, allow override.

| Perspective | Impact |
| --- | --- |
| Actual experience | Shares repetitive work; capacity strategy requires availability/real-effort upkeep, with higher maintenance cost |
| Development | Medium–high: simple rotation easier; capacity requires cross-workflow calculations, stable tie rules, persistent rotation/assignment records, not changing on refresh |
| Current limits | Open-task count/planning days are rough; main app lacks full capacity data/real synchronized multi-user assignments |
| Simplest prototype | Compare fairness with explicit rotation; capacity exercise uses fictional manual capacity and visible assumptions |
| Expansion | Fits many repetitive tasks; strategy per responsibility; simultaneous users later need server consistency |

C3 must not equate fewer tasks with availability. Professional qualifications/operation rights filter candidates; sharing rules apply only among those eligible.

## Reusable code

| Foundation | Reuse | Missing |
| --- | --- | --- |
| Main file reading/constitution AI | PDF, docx, text; batched role/duty extraction; human-field protection | Independent records, verifiable sources, deduplication, confirmation |
| Main templates/tasks | Step editing, explicit roles, executors, date engine | Responsibility links, template/instance matching provenance, candidates, exceptions |
| Main members/roles | Existing member input for exercises | Member/responsibility links; full one-person/multi-role and multi-holder roles need adaptation |
| Hidden Organization Setup | Custom roles, source text, responsibility arrays, work items, links, human-field protection designs | Bridge to main data; enabling a flag is not migration |
| Hidden Activity workspace | Multi-role/multi-collaborator members, server revisions, command model | Actual multi-candidate assignment strategy, real organization membership, main-app integration |

Code: [`constitution.ts`](../../src/lib/constitution.ts), [`useReading.ts`](../../src/onboarding/founder/constitution/useReading.ts), [`readDocument.ts`](../../src/lib/readDocument.ts), [`types.ts`](../../src/data/types.ts), [`organization/schema.ts`](../../src/organization/schema.ts), [`workspace/contracts/index.ts`](../../src/workspace/contracts/index.ts), [`runtime.mts`](../../netlify/lib/workspace/runtime.mts).

Main business data remains browser-local; separate server workspace stays hidden/independent by default. Same-browser exercises work; real concurrent editing/cross-device assignment needs server organizations, members, permissions, persistence, not just pages.

Constitution reading currently caps 24 roles, 6 roles' duties per batch, and short text per role; do not force new records into those strings. Filtering 20 people is cheap; clear responsibilities, complete data, AI wait, consistency are the constraints, not a need for complex optimization.

## Two prototype scopes

### P1 Fastest interaction validation

A1+B1+C1. Retain extraction, use manual responsibilities/role choices. Least development, tests understanding/selection, but not long-term reuse/automatic selection value.

### P2 Minimum usable responsibility framework

Recommend A2+B2+C2, with A1/C1 for failure/exceptions. Reuse file/AI adapters, create a separate matching exercise isolated from old demo archives, retain relationships for future real members/server.

Only three consecutive screens:

1. My organization's responsibilities: upload/paste fictional constitution, view roles, bubbles, sources, edit/confirm.
2. What this work needs: choose task responsibilities in one template, then reuse them/resolve gaps in a second different workflow.
3. Who gets it: candidates, defaults, backups; resolve assignments in bulk, confirm, view actual executors/reasons.

Minimum data expresses responsibilities, role links, member eligibility, task primary responsibility, defaults, actual assignments. Reuse member input initially; full multi-holder management later; deduplicate candidates by member identity against future multi-role duplication. Editable sample templates/relationships, not fixed role-title conditions.

Start with 10–20 fictional members, two markedly different workflows, a few representative tasks. For the first formal template, map all 46 standard steps, then check applicable general policy actions. Representative samples do not prove full policy coverage.

Acceptance includes:

- Custom specialist roles need not fit nine functions; manual continuation with AI failure/no constitution/missing responsibilities.
- Two workflows reuse one responsibility, without per-workflow synonym duplication; additions allowed.
- Role/responsibility renames preserve links; deactivation shows reference impact.
- Two eligible members yield one primary executor; no candidates/no availability/no default visibly unresolved.
- Refresh/regeneration preserve manual reassignment; template changes do not silently reassign existing work.
- Missing required operation rights show reasons, not treating labels as approval credentials.

Prototype excludes simultaneous real email, full old-business database migration, all-workflow generation, full skill scoring, calendar integration, organization handoff. Connect later in the recorded six-item order.

## Relationships retained for expansion

A library-building, B task-identification, C person-selection can be replaced independently: AI can supplement manual libraries, AI steps can be manually linked, fixed assignments can later rotate.

Shared chain: organization materials → responsibility → template-step requirements → qualified members → actual task executor. AI is one source of input/suggestions; dates remain deterministic, task writes validated. Record responsibilities, skills, external qualifications, system authorization separately. Future RACI adds accountability roles without deciding for users now.

## Selected combination and next step

Comparison/code review complete; user selected A2+B2+C2 with manual fallback. Use P2 foundation for fast delivery; Stage 3 real-business integration scope in [implementation plan](TASK_MATCHING_IMPLEMENTATION_PLAN.md). Docs only, no new model calls/product tests; wait for explicit stage-start approval, then work within authorization. Local backup synchronization is needed.
