# Email entry into actual Plan and cross-node Details: implementation handoff

2026-11-18 (America/Phoenix) · Codex · Implementation approved by user, continuing PR #14

## Current delivery: event flowchart as email destination

After another acceptance review, the user clarified: do not land in Team tasks or personal Tasks; use the screenshot's **Plan → Events flowchart with the corresponding task Details expanded on the right**. The previous “eventless tasks enter Tasks/Team tasks” fixed the standalone-page omission but selected the wrong left workspace. This routing supersedes it.

- **Actual event tasks:** New emails, old officer entry, and Tasks email entries generated last round all enter `/events`, opening the task's real eventId, selecting the actual node, and expanding Details. A recently viewed different event never overrides real ownership; reuse MetroChart/TeamMetroChart without layout changes.
- **Eventless Club task:** New link `/events?node=<id>&access=<grant>`. Original task stays in right rail; left shows this workspace's last-viewed event (first event if no preference) for reference. Add browsing event to current URL for refresh/history; switching events retains original task entry, with return after viewing other nodes. Explicitly state task has no event; never alter task.eventId or claim membership in the displayed diagram. No events: empty Events plus original task details.
- **Ordinary Tasks entry:** Restore My tasks default; Team tasks remains manually available. Emails no longer enter task board.
- **Shared information/autodrafts:** Original task retains grant scope, actor, drafts/attachments; other nodes show only team-submitted body and corresponding attachments, with no editing/private-draft access. Waiting on permits help responses only. Back to Plan hides Details for diagram use; return, refresh, Back/Forward retain task selection and autosaved content.
- **Browsing preference:** Last event is workspace-isolated sessionStorage UI preference, not business state, task ownership, or authorization. Ignore invalid/deleted events; explicit mismatch, expiry/reassignment, forgery still show errors.

Files this round: Events/Tasks entry, planEntry/PlanTaskPanel/planEventPreference, email URL generation/historical snapshot validation, related unit/browser fixtures. Settings templates, renderers, date algorithms, schema/store, business recipients, server sending unchanged; concurrent four-team defaults/static-layout research retained.

### This round's verification and deployment

276 related unit/component tests across 19 files, frontend/backend types, production build, lint, 9-page words passed; entry 495,809/550,000 bytes, ordinary Tasks 84/130 words. Unique desktop/mobile browser count 32 passed: 22 Plan entry, 8 existing email/universal-submission/default-workflow compatibility, 2 entry budget. First 20: 19 passed/1 mobile script used desktop event button; switched to existing mobile dropdown, rerun passed. Supplemental 14: 12 passed/2 new seed checks mistook three visual joins for tasks; counting actual flow-node buttons yielded full 38-task scenario and 4 entry-budget rechecks passed, without changing diagram or relaxing validation for tests.

[Actual desktop Networking diagram](../prototypes/reminder-events-entry/networking-event-desktop.png), [mobile Details](../prototypes/reminder-events-entry/networking-event-mobile.png), [eventless task beside diagram](../prototypes/reminder-events-entry/club-task-with-event-desktop.png), [evidence manifest](../prototypes/reminder-events-entry/manifest.json) saved and inspected. Full seed check uses actual e-night/moderator/venue and all 38 tasks, not a single-node fixture; also covers last event, real ownership priority, old Tasks entry, My tasks default, autodrafts/attachments, reassignment invalidation, read-only records.

Continues PR 14/preview 14, no new PR/main merge; `netlify/platypus-officer-hub/deploy-preview` for runtime `c0fbf9f60fd90cb7cfc078575d2380bc555f09a7` confirmed success; use [preview 14](https://deploy-preview-14--platypus-officer-hub.netlify.app/#/events). Interaction evidence is local production build; online deployment status checked, no separate online browser walkthrough. Tests use locally reissued grants; no real product AI/external email, no archived full user authorization link. Logs `/tmp/events-entry-{unit,related,browser,browser-final,browser-seed,build,lint,netlify-types,words}.log`; full-site gates not repeated.

## Previous round below: retained history; current routing above takes precedence

> **Same-day omission fix:** User's actual `Draft the meeting agenda` task is `t-agenda`, `eventId:null`. Initial implementation handled event tasks only, leaving the club-task standalone branch and reproducing the problem. Fixed: old/new emails for these tasks enter **Plan → Tasks** with expanded right rail; event tasks still enter their event Plan. Club tasks never forcibly linked to events; old signatures/task IDs/drafts retained. Supplemental checks: 262 unit/component tests across 17 files passed; 18 unique desktop/mobile browser cases passed, including original same-name seed task, old/new links, body/attachments/refresh, others' submissions read-only, board/table/timeline selection, reassignment invalidation. Two initial locator failures ignored task-type icon prefixes; fixed locators and reran successfully; product validation not relaxed.

## Problem and result

Standalone pages make responses easy, but booking may require reading attendance, equipment, or timing already submitted at other nodes. Juanxi approved the two concepts' interaction, noting their diagrams differ from the real workflow; only entry/navigation changed, reusing actual `MetroChart`/`TeamMetroChart` rather than redrawing from mockups.

Event emails enter matching event Plan; eventless club tasks enter Plan → Tasks; both select the task/open right Details. Members click actual nodes or **View task in this event** in the rail to switch same-event tasks; return to original email task afterward. Mobile retains fullscreen Details, **Back to Plan**, and node selection, rather than squeezing desktop's three columns in.

## Links and navigation

- New email: event `/#/events?event=<eventId>&node=<taskId>&access=<scopedToken>`, club `/#/tasks?node=<taskId>&access=<scopedToken>`. First entry prefers Flow over saved List/hidden-rail preference; later explicit Flow/List/Budget choices respected.
- Node switches update URL; `from` retains original email task and `access` authorizes only it. Refresh/Back/Forward restore event/node. Clicking selected node reopens manually hidden Details; ordinary autosave does not repeatedly reopen it.
- Hiding rail retains selection; Close details clears task/authorization/return parameters. Switching events clears previous event task context.
- Locate actual node through existing `.is-selected`, scroll current diagram container horizontally; no node-layout, relationships, dates, templates changed.
- Reusable legacy `/#/officer?access=…`, once verified with current member context, routes by real task association to Plan Events/Tasks; existing restricted entry unable to enter workspace retains member scope. Old single-use `token` unchanged.
- Expired, bad-signature, reassigned, wrong-event/node, forged `from` links show errors; never open another event's first task or mutate status on opening.

## Identity, submission, drafts

Original assignment-scoped grant still updates the original task, preserving valid actor, repeat updates, extension notifications, completion undo, finance limits; browser president never falsely recorded as email owner. Link never changes `viewerId`.

Viewing other Plan nodes relies on existing active-member context in the local demo, **not organization-wide identity from a single-task token**. Other tasks forced read-only while browsing email: latest submitted Details/corresponding attachments shown; edit/status/submit/private unsent drafts hidden. Only original task has token update rights; Waiting on recipient can confirm/provide help there, not change status, target, owner.

Universal form retains body/file autodrafts. Switching/return/refresh preserve text/attachments without Save draft; attachment limits, IndexedDB isolation, historical outcomes, completion undo, school dates, message-recipient rules unchanged.

Still same-browser demo data/member switching; no real login, background sending, cross-device sync. Future production identity/server integration must not treat local member checks as server authentication.

## File boundaries

- `src/pages/Events.tsx` / `Tasks.tsx`: URL/rail sync, selection recovery, actual diagram positioning/view choice; email Tasks defaults Team tasks, preserving email context across board/table/timeline clicks.
- `src/reminders/planEntry.ts`, `useTaskAccess.ts`, `PlanTaskPanel.tsx`, `planTask.css`: target resolution, signature checks, same-event navigation.
- `taskAccess.ts`, `mail.ts`, `message.ts`, `delivery.ts`, `ReminderComposer.tsx`: generate/strictly validate Plan entry, retain old snapshots; still one task URL.
- `SingleTaskPage.tsx`/`Officer.tsx`: old-link redirects, embeddable help content.
- `Layout.tsx`, `Rail.tsx`, shared task components: select Plan task, clear Details when leaving links, clear close parameters, explicit read-only display.

Started at latest workflow delivery `a2f4dd8`; no changes to Settings, template library/versions, team grouping, actual renderers, task IDs, store/schema, rule arrays, date engine. Concurrent workflow delivery retained.

## Verification

- 270 related unit/component tests across 19 files passed: rule emails, snapshots, authorization, submission, target dates, universal Details, both diagram foundations; 10 new cases cover target binding, legacy links, cross-event rejection, member context, read-only outcomes, draft retention.
- First 12 desktop/mobile entry cases passed; combined regression with existing submission/attachments/extensions/undo, batch emails/help, template generation, standard diagram, bundle budgets: 38 cases, 37 passed/1 mobile navigation hit old click race after automatic rail close. Fixed leaving-Plan Details cleanup and waited for actual closure; all 14 rechecks passed, 38 unique cases total, not cumulative duplicates.
- lint, frontend types/production build, backend types, standalone CSS, 9-page words passed; Plan153/180 visible words, Settings 147/150. Initial entry 494,992/550,000 bytes; club-task omission fix495,514/550,000; threshold unchanged.
- Browser checks include actual attachment downloads, immediate typing/switch/return, refresh/history, expiry/reassignment, help scope, serious/critical accessibility, horizontal overflow. Initial fictional-attachment MIME failure fixed in fixture, not validation.
- Actual desktop/mobile screenshots:[manifest](../prototypes/reminder-plan-implemented/manifest.json); real running pages, not prior image-model mockups.
- 0 real product AI calls/external emails. Full-site gates not repeated; historical assertions such as stage-two four buttons not all migrated, so no full-site pass claim.

## Acceptance

[preview 14 reminder center](https://deploy-preview-14--platypus-officer-hub.netlify.app/#/): prepare an event-task email, click **Open task**; matching event Plan should highlight the actual node and show universal Details. Browse another node's submitted content/attachments, return and check draft. Mobile: right task dropdown or Back to Plan.

Existing reminder-center enablement/review/quotas retained; if no pending event email, click a Plan task to test identical Details navigation. Runtime `3505d79`, push after concurrent records `861431c`; GitHub Netlify deploy-preview confirmed **success**. Direct site fetching blocked by proxy403, so no online browser walkthrough claim; interaction evidence is local production-build desktop/mobile checks. Continues original feature branch/PR #14, no new PR/main merge. Local backup needs synchronization.


Club-task fix logs: `/tmp/club-plan-final-unit.log`, `/tmp/club-plan-browser.log`, `/tmp/club-plan-browser-final.log`, `/tmp/club-plan-final-build.log`, `/tmp/club-plan-final-lint.log`, `/tmp/club-plan-words.log`. This code changes no Settings/teams/templates, ASU rules, schema/store, background sending; concurrent four-team preset restoration integrated/retained. Full user authorization link never copied/stored.

Actual club-task evidence:[desktop](../prototypes/reminder-plan-club-fix/club-agenda-desktop.png), [mobile](../prototypes/reminder-plan-club-fix/club-agenda-mobile.png), [manifest](../prototypes/reminder-plan-club-fix/manifest.json). Original seed t-agenda with locally reissued test grant, no copied user token. Runtime `76cd2df`, after concurrent layout-research merge `84ee1fd`.

**Club-task omission deployment:** GitHub confirmed `netlify/platypus-officer-hub/deploy-preview` success for `84ee1fd74feb93b258f9c635d9c7c0f2d907f30e`, still preview 14. Final screenshot fixture uses only original agenda node, removing inherited booking instructions; 12 unit/2 desktop-mobile capture rechecks passed, without altering user instructions in screenshots/runtime. Not added again to 262/18 counts.
