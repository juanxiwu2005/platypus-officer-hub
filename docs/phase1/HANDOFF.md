> This records the earlier Phase 1 prototype. Juanxi subsequently authorized real-AI/online-save Organization Setup increments; current acceptance: [new setup handoff](../organization/HANDOFF.md). Earlier setup retained at `/phase1/setup-legacy`; instructions below are historical only.

# Phase 1 prototype handoff/acceptance

2026-10-25 · Codex · **Await Juanxi's visual acceptance; stop here.**

## Open preview

- New entry `/#/phase1`.
- Clickable local http://127.0.0.1:4173/#/phase1 (while preview server runs).
- [Draft PR #2](https://github.com/juanxiwu2005/platypus-officer-hub/pull/2), target v1, created. No Netlify deployment status received, remote link unconfirmed; do not use old PR #1 as this preview. GitHub CI per PR; full local checks passed.
- Legacy `/` unchanged; return via Open legacy workspace.

## Five-step acceptance

1. **Home:** Plan a member activity→Review workflow, check clear entry.
2. **Organization setup:** Continue→Use fictional example, Accept/Edit/Reject, inspect constitution quote under suggestions.
3. **Responsibilities:** accept external-contact suggestion conflicting with Marketing, choose manual division/constitution suggestion; update only after confirmation. Skip constitution offers short path.
4. **Activity:** switch Demo organization A/B, compare company-contact owners; List/Board, tasks/demo status, Review plan→Approve preview.
5. **Mobile/recovery:** refresh mid-setup, remain on step. Leave owner Needs confirmation, confirm profile, ask who owns company contact in Activity; only one multiple-choice question, no plan approval without owner.

Reply accepted/what to change; no code reading.

## Deliverables/files

| File | Content |
|---|---|
| `src/App.tsx` | Isolated `/phase1/*` routes only, old routes unchanged |
| `src/phase1/PhaseOne.tsx` | Three screens/shared composer/five-step setup/suggestion review/custom roles/assignments/workflow preview |
| `src/phase1/phase1.css` | Separate styles, desktop/mobile, contrast/touch/keyboard focus |
| `src/phase1/model.ts` | Preview model, seven high-level capability groups, fictional Constitution |
| `src/phase1/logic.ts` | Scope assignments/candidate validation/quote mapping/manual priority/two workflows/bridge to existing date engine |
| `src/phase1/repository.ts` | Demo repository/localStorage adapter, draft-approved separation/org-account scope/7-day retention |
| `src/phase1/phase1.test.ts` |26 new unit checks|
| `e2e/phase1.spec.ts` |17 scenarios×desktop/mobile=34 new page checks|
| `public/phase1/fictional-constitution.txt` | Uploadable fictional example |
| `docs/phase1/ARCHITECTURE.md` | Six-layer model/full fields/reuse-rewrite list/interfaces/migration/governance |
| `docs/phase1/HANDOFF.md` | Handoff/acceptance/limits |
| `docs/PROGRESS.md` | Direction/status/tests/preview/next-agent boundaries |
| `docs/PRODUCT_PLAN.md` | New direction, historical plan retained |
| `AGENTS.md` | Explicit prototype rules/stop conditions |

Local screenshots `output/playwright/phase1-{home,setup,workspace}-{desktop,mobile}.png`; output uncommitted. No old schema/rules/pages/tests changed outside preview.

## Verification

Full `npm run check` succeeded:

- TypeScript/Vite passed.
- Vitest **279/279** (253 existing+26 new).
- Playwright **141 passed/13 skipped**; all 34 additions passed; 13 existing mobile duplicate-a11y/hover skips, no old-test deletion/weakening.
- New coverage: A/B division/multicapability roles/Constitution schema allowlist-evidence-sensitive fields/manual-constitution conflicts/context permissions/Activity classification/two workflows/one uncertainty question/AI-date filtering/migration/no-private-info handoff/draft recovery-expiry-approved snapshots/desktop-mobile/keyboard/44px touch/upload-skip Constitution/three-screen axe AA.
- Visually inspected desktop Home/Activity/mobile setup; fixed helper contrast/List-Board sizing/navigation entries.
- No real-AI tests/first-use timing/production permissions.26 model tests prove local preview only, not formal API/actual migration.

## Known limits

1. **Constitution local demo extractor** recognizes limited fictional patterns, not AIR/DeepSeek; txt/md/paste only, no PDF/Word/OCR.
2. **Activity two working previews**, sentence classification/options only, not open-ended planner; approvals/status local, not old Store.
3. Demo repository org/account checks not production security via localStorage/demo accounts; no real login/database/server isolation.
4. No actual migration, only strategy/pure checks preserving records; old Tasks/Funding/Handoff/standalone tasks/storage remain legacy entry.
5. No new conversation logs/formal Handoff refactor; only filtering confirmed organization content into handoff.
6. Five-minute/≥80%-by-click/low-cognitive-load targets need novice testing, no advance passage claim.
7. Dates from unchanged rule engine/fictional manual anchors; ASU policy not rechecked.
8. 7-day retention from device last-save, cleanup on read, no server-auto-delete promise; blocked storage memory-only with notice.
9. Remote preview may retain Netlify protection; no login attempts/protection changes, local fallback.

## Next

Await visual acceptance first. If explicitly authorized, Member Activity planner→Executive Operations→Single AI Workspace/navigation→real database/accounts/long-term memory→formal Handoff. Formal integration requires complete schema/server validation/versioned ChangeSet/reversible migration; demo adapter is not production backend.

main/v1 not rewritten; code only `feat/ai-native-phase1`.
