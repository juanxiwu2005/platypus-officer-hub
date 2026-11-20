# Current prompts and model contract

2026-10-26. Server source of truth:[prompts.mts](../../netlify/lib/organization/prompts.mts), version `organization-setup-v3.1`. Product offers neither View prompt nor Review AI instructions. Four exact prompt sets delivered to Juanxi as development-chat attachments; continue reviewing changes in chat, not product pages.

| Task | Current input scope | Output/constraints |
| --- | --- | --- |
| constitution | Constitution text, current organization/departments/roles | Evidenced departments/roles/duties; mark inference; retain manual fields |
| risk_check | Mission/reviewed role duties | At most 4 major risks, 2–3 options each; do not repeat ordinary form details as omissions |
| member_workflow | Organization, duties, relevant constitution excerpts | Compact nodes/dependencies/owners; no coordinates/final dates |
| edit | Current configuration, screen, valid selection, recent dialogue; explicitly selected history version | Clarification or allowlisted local proposal; zero application before approval |

Unchanged navigation, Review compilation, graph layout, ordinary manual edits use no model. Duty/workflow edits cannot silently overwrite other fields. History is evidence; selecting a version does not restore it automatically. All inputs are data, granting no extra permissions.

Routing source:[modelPolicy.ts](../../src/organization/modelPolicy.ts), `air-task-routing-v3`; Gemma `gemma4-31b-it` for long structure, Muse `muse-glimmer-30b` short edits, GLM `glm-5-3` explicit deeper review only. Requested none does not guarantee gateway none; retain actual reasoning level/original returned model name. Local JSON-schema validation remains required.

Historical Muse call: 765 input/1846 output tokens, first content 16.715 seconds, total 50.396 seconds, shape validation failed. Not evidence of Gemma speedup; first-content wait does not establish provider queueing. Offline checks consume no AIR, no automatic regeneration/multimodel evaluation. [Implementation record](F1_F7_IMPLEMENTATION.md) for diagnostics/acceptance.

## Historical explanation (original material below retained, not current UI/routing)

> **Latest v3.1:** Gemma 4 31B for longer constitution/risk/event structures, Muse short conversation edits, GLM 5.3 user-requested depth only. One real Muse result showed native-schema/reasoning-none requests do not ensure gateway compliance; prompts now specify exact JSON fields, observed aliases get strict unambiguous conversion, missing content still rejected. [v3 live record](V3_CHANGELOG.md). New speed awaits measurement; model names guarantee none.

> **v3 canonical source:** `netlify/lib/organization/prompts.mts`. Server-only prompts, not product UI; given directly to Juanxi in development chat for editing. Old docs/`src/organization/prompts.ts` v2 five stages retained for historical compatibility.
> Four tasks: Constitution (departments/roles/duties), Risk check (major only), Member workflow (compact structure), Edit (allowlisted local changes, explicit approval). Coordinates, final machine config, unchanged navigation handled programmatically, no model.
> Default Muse Glimmer 30B +reasoning none; Deeper review uses GLM 5.3 low. Native JSON schema +Zod/graph/ID/hierarchy validation; record output cap/raw response. Small fictional live smoke allowed, other regressions mocked. [v3 changes](V3_CHANGELOG.md).

# Organization Setup: actual prompts and review

**Awaiting Juanxi review.** Quality review is product acceptance; development completion is not prompt approval. Final Review has “Review AI instructions” and reminder; each step can expand exact system prompt. Sole runtime source:[`src/organization/prompts.ts`](../../src/organization/prompts.ts), not this overview; version recorded in each successful server AI generation record.

## What each step gives the model and requests

| Stage | Organization input | Output/rationale |
| --- | --- | --- |
| Basic → Constitution | Name, constitution text/checksum, action catalog; no organization-category question | Actual role titles, duties, verbatim quotes; missing-item inference marked Suggested; avoid reentry/speculation as fact |
| Team → Responsibilities | Edited roles, constitution, action catalog, existing selections | Multi-role arrays for all actions; manual selections (including intentional blanks) win, president tweaks only |
| Responsibilities → Member programs | Roles, reviewed assignments, review status, reference event chain | DAG nodes, dependencies, roles, reasons, internal RACI; retain two opportunity-entry paths and parallel execution |
| Member programs → Board work | Roles, assignments, existing member flow, president one-sentence goal, officer drafts | Chains for social/tabling goals; adjustment proposal must be accepted, save possible first |
| Board work → Review | Current config, two reviewed flows, confirmation states | alwaysRead core docs + onDemand detailed docs with retrieval conditions + uncertainties |

Actual requests separate versioned system prompt from JSON data. Organization/role names, documents, edit requests, old AI output are data, never system overrides. Browser extracts documents; only text goes to site server then configured provider; original PDF/Word binaries never uploaded.

## Why core instructions are written this way

- **Evidence:** Constitution sources must be verbatim actual text; nonexistent quotes demoted to Suggested. Model confidence is not calibrated reliability probability.
- **Organization differences:** Departments navigation only; custom titles not forced into eight fixed roles; VP/Intern in same department may share work.
- **Human priority:** Program preserves manual matrix assignments again, not prompt alone. Workflow AI changes proposed first, replaced only after acceptance.
- **RACI:** Checked roles are R, at most one evidenced A, other C/I must reference known roles; uncertainty stays blank. Backend output needs later product calibration, grants no automatic permissions.
- **Safety/boundaries:** No invented school rules, tax/legal conclusions, permissions, final dates; existing rule engine handles all final dates. Schema filters structural fields; common date formats in generated text masked.
- **Traceability:** Save prompt version, provider, model, stage, time, input hash; never keys/raw dialogue.

## Two configuration layers

Each setup call's `contextPacket()` reads name/mission, roles/duty assignments, confirmation states, context version, compiled core guidance. Setup reads constitution evidence by task; workflow generation also reads matching existing flow/goal; final compilation reads both flows/all supporting config. Detailed guidance stores topic/when/content.

Organization Setup scope only. Old Ask/Today/planner still use original business state/prompts, not automatically migrated; full integration follows setup acceptance. Unconnected features are not described as consuming new guidance.

## Juanxi review checklist

1. Does clear constitution still get unwanted default roles?
2. Similar organizations with different duties produce different assignments?
3. Marketing VP +Intern share appropriate work?
4. AI respects manually cleared assignments?
5. Member flow retains Outreach/President entrances and Marketing→Finance review order?
6. Social/tabling have genuinely different staffing?
7. Honest sources/uncertainty, no guessing missing approval authority?
8. Fictional documents with malicious instructions still respect system constraints?
9. alwaysRead short enough/covering core habits; onDemand conditions explicit?

Then revise prompts, add evaluation examples, increment version. Automated tests prove constraints/interactions, not prompt quality across all organizations.


## Task-based model selection: current v2

After excessive real waits, Juanxi requested speed first/lower quota use. Source:[`modelPolicy.ts`](../../src/organization/modelPolicy.ts), version `air-task-routing-v2`:

| Mode | Model | Usage |
| --- | --- | --- |
| Default fast | `muse-glimmer-30b` | Ordinary setup, daily dialogue, short structured tasks; `reasoning_effort=none` |
| Explicit deeper review | `glm-5-3` | User checks Use deeper reasoning or Review with stronger model; backend `low`, larger output budget retained |

No default GLM wait or automatic retry/model upgrade. Shared AIR gateway/key; user input cannot specify arbitrary model IDs. Archive records actual provider/requested/returned model, requested/gateway reasoning levels, duration, routing/prompt versions. GLM may return `glm-5-3-mxfp4`; retain original name.

Earlier v1 actual timings: Gemma constitution 56s, matrix 15s; GLM member flow 81s, guidance≈56–91s. Include gateway wait/generation; cannot attribute all latency to model or queue. Muse default now selected; per user request **no further real Muse test**. Juanxi assesses speed/quality by use; no measured speedup ratio claimed.

Complex workflow requests use native JSON schema then known-role/action, human-priority, source, DAG checks; stronger models cannot bypass. Current prompt v2.3; final Review retains all prompt-review entries/reminders.

Basis:[ASU Chat Completions](https://docs.rc.asu.edu/ai/api/chat/) describes models/reasoning_effort on shared gateway; candidate list from Juanxi AIR page. Engineering tradeoff, not a general leaderboard proving onboarding quality. AI request/output/human-decision retention:[data foundation](DATA_FOUNDATION.md).
