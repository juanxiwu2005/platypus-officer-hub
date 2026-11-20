> **2026-10-26 current Activity Workspace handoff:** user approved A1/B1/C2 and global AI/personal-task/funding integration; see [implementation](ACTIVITY_WORKSPACE_IMPLEMENTATION.md). F1–F7 below is retained baseline; read-only organization-duty Homepage/Recent template entries are replaced by actual activity workspace.

# Organization Setup Current Handoff

2026-10-26 · Codex · Juanxi approved F1–F7 audit fixes. Integration fix/setup-v3-completion from feat/organization-setup-ai@54e5823; no main merge/production release.

Current flow: **Constitution → Your team → Responsibilities → Activity workflow → Review**. Prompts reviewed in development chat only, server authority netlify/lib/organization/prompts.mts, not old client file. Routing v3: Gemma long structure, Muse short edits, GLM explicit deeper checks only; no latest speedup-percentage finding.

Added persistence/recovery/conflicts, manual-hierarchy protection, granular incremental review, automatic Check reuse, proposals for current object/recent history, graph acceptance/error diagnostics. Consumers read server **approved** compiled output only. /phase1 Home/activities share organization roles/duties/workflows/department colors, never copy into old localStorage config. /#/phase1?example=1 and setup-legacy explicitly remain references; absent approved config never disguises example as new organization.

Complete Board planner, real organization accounts, legacy business DB migration, cross-organization sharing unimplemented. New-organization /phase1/activity/executive explicitly says not generated, never reuses another fictional organization's chain.

Acceptance/evidence: [F1–F7 implementation](F1_F7_IMPLEMENTATION.md). Older records below retained; **six chapters/matrix/web View prompt/v2 all-Muse/old test counts are neither current behavior nor this acceptance result**.

## Historical Handoff (through 54e5823, retained)

> **v3.1 latest:** Gemma 4 31B for longer constitution/risk/activity structures; Muse short edits; GLM 5.3 explicit deeper checks. One live Muse result proved requesting native schema/reasoning none does not guarantee gateway compliance. Prompts now specify exact JSON fields; observed aliases convert only with strict unambiguous mapping, missing content rejected. [v3 live record](V3_CHANGELOG.md). New speed awaits measurement; model name is no speed guarantee.

> **2026-10-26 v3 addition: in progress (Codex)**
> Five-chapter organization chart/duty items, Check/graph editing/right AI approvals/server JSON compilation implemented; prompts removed from web. Focus: JSON errors/downstream preservation. [V3_CHANGELOG](V3_CHANGELOG.md) details metrics/boundaries. Main/old data retained; final appended record governs live smoke/deployment/CI results.

# Organization Setup: Deployment Handoff

2026-10-26 · Codex · **Awaiting Juanxi's hands-on acceptance**. Additional live AI testing stopped.

## Online entries

- [Latest Organization Setup](https://deploy-preview-3--platypus-officer-hub.netlify.app/#/phase1/setup)
- [Separate branch site](https://feat-organization-setup-ai--platypus-officer-hub.netlify.app/#/phase1/setup)
- [Previous setup reference](https://deploy-preview-3--platypus-officer-hub.netlify.app/#/phase1/setup-legacy)
- [Original site](https://platypus-officer-hub.netlify.app/) retained, main unmerged.
- [Draft PR #3, base v1](https://github.com/juanxiwu2005/platypus-officer-hub/pull/3), feat/organization-setup-ai. Previous Phase 1 branch/PR #2 retained.

Old localStorage key/pages retained. New domain does not automatically carry browser data from old domain; original remains reference. No research/IRB file changes.

## Implemented setup redesign

Constitution → Your team → Responsibilities → Member programs → Board work → Review. Removed organization-category/workflow-preference questions. Constitution extracts roles/duties; custom roles directly displayed; departmental multi-role checkbox matrix; backend RACI. AI prepares next screen for human review at each step.

Upload text-bearing PDF/Word .docx/TXT/MD, fictional example, or paste. 8 MB / PDF 50 pages / 60,000 characters. No scanned-PDF OCR; save .doc as .docx. **Originals/history retained from this version onward**, Download original/Export records; previously unsaved binaries cannot be reconstructed.

Member workflow: opportunity/invitation entries, initial Outreach + Professional Development meeting, planning, Marketing→Finance review, parallel preparation, execution, feedback. Drag nodes/change dependencies-parallelism/add by button-context menu/multiple owners/AI proposals. Position dragging does not change order; edges/order controls change logic. Mobile vertical nodes/editing.

Exec Board generates goal-specific social/tabling chains and keeps drafts; changing goal invalidates old flow to prevent old plan reaching Review. Finally two-level organization guidance, prompt-review notice, model generation records.

## Data precedes AI

New-setup actions/originals/history/conversation requests/AI input-output-errors/adoption-rejection enter timestamped private workspace archives. Access expiry never deletes history; no automatic cross-org sharing. [Data foundation](DATA_FOUNDATION.md). Actual setup implementation; legacy business pages not comprehensively migrated to new organization DB. Accounts/multi-user permissions/cross-org sharing/efficiency analysis remain future work.

## Model and speed

Default muse-glimmer-30b, extra reasoning off; GLM 5.3 only explicit Use deeper reasoning/Review with stronger model. Existing AIR key, route v2; [prompt/model notes](PROMPTS.md).

Historical live results before default switch: AIR auto/north-mini-code completed roles/matrix/member workflow/multi-owner AI edits/Board social/tabling with two shifts. Gemma constitution 56s/matrix 15s; GLM guidance 56–91s/member flow 81s, actual glm-5-3-mxfp4. After one GLM structural failure, added native JSON schema/concise constraints and retested successfully.

Times include gateway waits/generation; model versus queue time unresolved. Per Juanxi, **no further live tests after Muse switch**, no measured speedup claim; Juanxi evaluates hands-on. Background jobs address hosting's observed ~30-second synchronous limit.

## Checks and next acceptance

Earlier full checks passed build/319 unit/167 desktop-phone browser, 13 existing skips. Latest foundation ran only necessary build/43 offline organization-server-model-archive checks: original hashes/non-overwrite/event timestamps/dedup/workspace isolation/expiry preserving archives. **No AIR/quota usage.** GitHub CI runs independently; no repeated manual full live-AI acceptance.

1. Online fictional example or fictional PDF/Word; inspect roles/matrix.
2. Edit flow/owners, request sentence-based adjustment; first assess normal wait, deeper check only if needed.
3. Export records/Download original, confirm records/files.
4. Review two-level guidance/all prompts; Juanxi must review quality, development completion is not product approval.

Recent activities retained for next-round changes as requested.

## Environment-variable reload

After Juanxi accidentally changed variables, verified AI_PRESET=asu_air, AI_MODEL=muse-glimmer-30b, Functions key scope across Production/Deploy Previews/Branch deploys, redeployed. Preview/branch /api/health?check=1 AIR catalog checks returned 200, Muse/GLM available, generationPerformed=false. Catalog read only, no generation, not model-quality acceptance. Complete key never read/output.
