# Reminder Stages 1–3 Integrated into Preview 14

2026-11-16 (America/Phoenix) · Codex · User explicitly requested: "No new pull request; just integrate the code into preview14."

## Delivery scope

Continue [PR #14](https://github.com/juanxiwu2005/platypus-officer-hub/pull/14), branch `claude/fervent-thompson-e2j5u2`, starting from its latest rollback result `57c7e55`. Merge reminder branch `feat/reminder-plan-v2@9f100b3` through history-preserving merge `0555fc4`. Final runtime `6bb3e24`, followed only by delivery documentation; no new PR, history rewriting, main merge, or production release.

Preserve short rule-generated emails, one Task due, unique standalone task entry, four progress states, independent Waiting on recipients/permissions, three Details sections, individual/bulk/automatic reminder-center demos, new-organization defaults/explicit enablement for old saves, save-failure retry/history protection. Reminder rules/backend limits follow [stage 3 delivery](REMINDER_STAGE3_HANDOFF.md).

Follow preview14's latest withdrawal decision: src/onboarding/, App routes, original task-creation page, Team unchanged versus 57c7e55; do not restore isolated matching module. matching/matchingContext/old node matching fields remain uninterpreted archives; remove new reminder-page imports/checks for withdrawn matching code. Tasks require claiming before progress updates; reassignment invalidates old reminder links. New regressions verify archives neither block claiming nor get rewritten by reminder updates.

To preserve entry budget only, separate store/UI-independent reminder engine/runtime validation into cacheable reminder-rules module. Home preloads normally; no hidden features, delayed decisions, or relaxed gates.

## Checks

- Related unit/component: 31 files, **381 passed**, covering rule emails, standalone access, waiting targets, Provider, save recovery, Details, settings, original onboarding, workflows, matching withdrawal; new archived-task claiming/reassignment-revocation regressions.
- Lint, frontend/backend types, production build, new reminder CSS passed. Nine page word budgets passed; home 92/200 (total 92/500), Settings 147/150.
- Final build uses COMMIT_REF=6bb3e2476c317069853d2db6a7486fa669358687, actual PR #14 branch, deploy-preview metadata. `/assets/index-nmMIPOpH.js`: **542,788 / 550,000 bytes**. Initial 551,793 overflow fixed without raising budget.
- Final bundle: all 16 key desktop/phone checks passed, including entry size, initial requests, lazy routes, on-demand PDF, three Details sections/accessibility/overflow, complete bulk emails, independent Waiting follow-up, preserved input after write failure. Actual desktop/phone Details screenshots viewed.
- Initial 98 desktop/phone checks: 95 passed, 1 existing device skip, 2 entry-overflow failures. After cache split, all 16 final-bundle key checks passed, including both failed entry tests. **97 unique passed, 1 existing exclusion**, batched verification rather than one full-site gate. Includes original-main onboarding Confirm/Invite/send modes, matching withdrawal/archive claiming, standalone refresh/four states/reassignment revocation, three demo send modes, bulk/history/replies, calculation-source toggle/accessibility.

No repeat full-site gate, live AI, or mail delivery. Original First event 64/60-word discrepancy recorded in matching rollback delivery remains unchanged; this check was not run or claimed passed. Existing calibration 5-second timeout is not resolved by these local checks.

## Acceptance and deployment

Continue [preview14 reminder center](https://deploy-preview-14--platypus-officer-hub.netlify.app/#/). Existing saves: **Enable updated reminders** first. Open Details from task row to verify one deadline, concrete requirements, recipient. Review draft → Recorded email → unique Open task; inspect Working on it, Waiting on, Stuck, Done. Original onboarding at /#/welcome/test/president; /#/matching still redirects to Settings.

GitHub Netlify status/bot records confirmed preparation commit d47fb5f deployed successfully. Integration push uses the same connection; verify final branch commit through PR #14 netlify/platypus-officer-hub/deploy-preview before delivering URL. Stop using the guessed preview15 address; no new site required. No direct Netlify deploy connector, but PR #14 Git auto-deployment remains available.

Logs: `/tmp/preview14-reminders-{unit,lint-types,words,css,browser,final-browser,candidate-build}.log`. Local backup sync required.
