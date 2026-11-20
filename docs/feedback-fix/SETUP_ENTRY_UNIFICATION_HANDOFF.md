# One shared flow for Start and repeated setup

2026-11-17 (America/Phoenix), Codex. Implementation `d616bb1`; checks/deployment below.

## Changes

Two coexisting page sets caused the issue: Start used the eight-step founder flow, but Settings → Replay setup and `/setup` still rendered the six-step `pages/Setup.tsx` form. Restoring main alone therefore could not unify entries.

The old six-step page is deleted; all president setup entries share pages, progress, validation, and draft:

**Name → Constitution → Goals → Team → First event → Reminders → Confirm → Invite.**

| Entry | Destination |
| --- | --- |
| `/#/start`, Welcome → Start, Demo → Replay walkthrough | Shared founder pages; starts a study record under existing rules |
| Settings → Replay setup | `/#/welcome/setup` → shared founder pages, no study attempt |
| Old `/#/setup`, `/#/welcome/classic` | Compatibility redirect to shared setup entry |
| Demo → Test onboarding as president | Shared founder pages, retaining unrecorded test behavior |

Team directly shows Role, Person, Reports to; Edit duties expands duties. Presidents no longer enter everyone's Email/Phone/ASU ID during setup. Existing member self-profile flow remains. Constitution upload, AI role/duty extraction, manual editing, first event, reminder questions retain current Start behavior.

Hidden server-workspace experiment `/phase1/setup*` belongs to another prototype and is unchanged, as are reminder stage-1–3 integration, budget permissions, date engine, organizational handoff.

## Continuing old drafts

An old `setup-draft` first shows Continue your setup; Continue saved setup opens the corresponding shared page. Valid drafts retain roles, member profiles, duties, constitution, organization-workspace links, edited workflow, buffer, original event description.

Replacing a founder draft archives the original then writes the new draft in **one IndexedDB transaction**; continue only after completion. Failure neither replaces nor leaves a partial backup; stay for retry. Keep old six-step originals, marking completed import by source timestamp so replays do not repeatedly prompt. Async work finishing during exit cannot pull the user back into setup.

Restored roles/duties do not automatically rerun constitution AI, including on refresh. Old versions never saved prepared events/dates, so old steps 4–6 resume at First event for review. Preserve unreadable old records unchanged with a notice; allow current setup guide, without clearing/guessing corrupt data.

Business archive stays 23, unknown/withdrawn matching fields retained. Import/preview leaves current organization unchanged; only Confirm → Start workspace performs existing demo-workspace replacement. Rejected writes retain Confirm/draft.

## User checks

1. Open [Preview 14 repeated setup](https://deploy-preview-14--platypus-officer-hub.netlify.app/#/setup); Continue saved setup if applicable.
2. Continue with fictional names, upload constitution or Skip — use standard roles; fill Mission, then Team.
3. Compare [Start](https://deploy-preview-14--platypus-officer-hub.netlify.app/#/start): same eight steps/Team layout, desktop and mobile.
4. Repeat via Settings → Replay setup; old `/welcome/classic` also uses this flow. To inspect UI only, Exit on Team without final Start workspace.

Browsers with formal study attempts should not repeatedly use research Start for comparison. Use Demo → Test onboarding as president or another test browser. Original research Start recording remains.

## New task-group direction

[Workflow task-group owner assignment proposal](EVENT_TASK_GROUP_ASSIGNMENT_PROPOSAL.md), grounded in code: templates define groups; choose one concrete owner per group per event; tasks inherit, with individual manual reassignment. Groups are not fixed standard roles; no AI person selection. Multiple workflows, version snapshots, later-added tasks, old-event compatibility are documented.

**Proposal only; no new UI or assignment-engine integration.**

## Checks and deployment

- 18 related unit/component files, 156 passed: constitution, Team, first event, study records, responsibility rollback, setup, workflow.
- Final setup/record/refresh/old-entry/role/workflow/bundle browser checks: 131 passed, 1 mobile-only desktop skip. Two additional device-specific stepwise accessibility checks passed: total 133 passed, 1 skip. Earlier selector and refresh-before-draft-save issues from porting tests were retested in final unchanged flows; no product budgets weakened.
- Lint, frontend types/production build, server types, 9-page words passed; Settings 147/150. Entry 542,460/550,000 bytes.
- Desktop/mobile dark screenshots manually reviewed. All AI mocked/local fallback; 0 real AI, 0 external emails.
- `d616bb105abda4b376cd9ccb98f82b95c2e6f476` pushed to original feature branch; GitHub Netlify deploy-preview success, existing Preview 14. PR #14 remains draft, no new PR/main merge; main stays `b9e7a02`.

No full-site gate rerun. Retain main First event's 64 words against a 60-word budget and existing calibration timeout under previous delivery; do not claim full-site green. New task-group assignment remains a proposal for discussion. Local backup needs synchronization.
