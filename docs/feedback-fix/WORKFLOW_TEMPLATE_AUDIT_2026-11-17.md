# Speaker-event workflow-template findings

This round first aims to stabilize workflow templates before automatic reminders and organizational handoff. Review found causes for all reported link, Details, movement, and branch-addition issues; movement/addition were reproduced in-browser. Further defects include date settings not affecting schedules, conditional steps becoming mandatory for all events, deleted steps returning, and disappearing flows. Templates are not yet a stable source for executable workflows.

Reviewed 2026-11-17 (America/Phoenix), baseline `claude/fervent-thompson-e2j5u2@0f53577`, checked through `ab7123c`; intervening commits changed progress documentation only, product code identical. This commit records the audit only; none of the fixes below was implemented. User screenshots served as interface references, not additional execution instructions.

## Scope and evidence

- Settings → Workflow templates, Step details, movement/context menus, actual Plan task action links.
- Path from template-generated speaker tasks to rule scheduling/reminder facts.
- Browser used fictional repository demo data; isolated function reproduction used a fictional speaker event on 2027-04-16, 60 people, on-campus, no food, membership-dues funding, `partner/rsvp` enabled.
- "Browser reproduction" means actual local Chromium operation; "function reproduction" calls existing branch functions without rewriting implementation to prove a conclusion. Experience judgments are identified separately.

Settings currently saves **one organization-wide event template**; speaker events conditionally generate steps from it, without a separate speaker-template manager. This audit starts with speaker scenarios, but fixes must check other event types. Locations: `src/engine/playbooks.ts:30`, `src/data/settings.ts:126`.

## Findings overview

P1 means execution/data-consistency work needed before template finalization; P2 means usability issues impeding understanding/confirmation. All remain pending; recommendations/acceptance criteria are not implemented.

| ID | Priority | Issue | Evidence |
| --- | --- | --- | --- |
| WF-01 | P1 | Fixed step-based action links can mismatch actual event needs | Browser/functions |
| WF-02 | P1 | Templates cannot add/edit action links; no custom-node configuration | Panel/data-model review |
| WF-03 | P2 | Details lacks intuitive owner/effort/timing/dependency explanation | Observable UI/experience judgment |
| WF-04 | P1 | Movement saves changed dependencies but graph keeps old order | Mouse/keyboard/functions |
| WF-05 | P1 | Inserting into a branch draws the node under Other | Desktop/mobile/functions |
| WF-06 | P1 | Effort changes leave some standard-step start/reminder dates unchanged | Functions |
| WF-07 | P1 | Displayed target timing can disagree with actual scheduling | Browser/functions |
| WF-08 | P1 | Steps added to speaker branch appear in nonspeaker events | Functions |
| WF-09 | P1 | Some editor-deletable steps return during event creation | Functions |
| WF-10 | P1 | Deleting Full Check hides many surviving pre-event nodes | Browser/functions |
| WF-11 | P1 | Task description saves as Why; templates lack reusable instructions/completion criteria | Data-generation review |
| WF-12 | P2 | Renamed standard nodes retain hardcoded short labels | Browser |
| WF-13 | P2 | Owner/description/target-only edits may still produce a standard-template summary | Functions/code |

## User-reported issues

### WF-01 Action links mismatch task context

In actual Plan, Founder Dinner's Quote Gather has `food: none` and asks for supplier quotes, but its fixed **Open ASU catering information** button opens catering information. An isolated no-food speaker event gives the same result.

Cause: `taskActionLink()` looks up only `stepKey`; `quotes/quote/dining` share a catering URL without considering quote category, funding, organization configuration. Only off-campus venue has special handling.

Code: `src/reminders/actionLinks.ts:6`, `:15`, `:22`; `src/reminders/facts.ts:59`; UI `src/components/TaskDetail.tsx:61`.

**Impact:** reminder recipients may land at irrelevant services and cannot act directly.

**Acceptance:** individually review at least speaker-template nodes requiring external action; distinguish catering/other supplier quote entries; label login portals, information pages, final forms. Without stable deep links, provide a real entry and next navigation step. Do not present one generic home page as a direct submission form for every task.

This establishes **semantic mismatch**, not unverified claims that login-protected URLs are broken. The isolated speaker example has 9 fixed links among 37 tasks; that measures mapping coverage, not a requirement for external links on all other 28.

### WF-02 No template link editing/persistence

Step details offers only title, default role, effort, target timing, description, dependencies. Neither `StepTemplate` nor task `Node` has action-link configuration; addresses come from fixed mapping. Settings Links & files are shared organization materials, not step-specific action entries.

Code: `src/components/setup/WorkflowPanel.tsx:87`; `src/data/types.ts:66`, `:271`; `src/reminders/actionLinks.ts:22`.

**Impact:** presidents cannot correct known URLs in templates; new nodes do not automatically gain links through the fixed table.

**Acceptance:** standard/custom steps support link labels, addresses, necessary notes; survive save/refresh/event creation; Plan and email-linked task pages read the same configuration. Explicitly define effects on existing events, avoiding silent overwrite of executed tasks.

### WF-03 Details is unclear

Experience issue, with observable facts:

- **Done by** selects a role such as Events lead without explaining default assignment for future events.
- **Days of work** means business-day effort; **Target timing** does not explain completion target versus start reminder, nor combine them into readable timing.
- Empty target **From dependencies** cannot preview which prerequisites produce which date; `0` differs from blank.
- Expanded **Waits for** lists many cross-branch/pre/post-event steps without grouping/dependency-effect previews.
- Node applicability is neither shown nor editable; new speaker-step scope is especially unclear.

Code: `src/components/setup/WorkflowPanel.tsx:78`. Screenshot's Partner Speaker Review uses this panel; WF-06, WF-07, WF-11 cover specific date/description logic defects.

**Suggested acceptance:** users can directly understand default owner, work, completion criteria, reminder start, completion date, prerequisites, action entry. English fields with nearby clear units/results. Layout awaits joint confirmation; no redesign this round.

### WF-04 Movement persists but graph does not update

Reproduction: drag Marketing's Promotion Items between Marketing Needs and Content Creation. Message: **Moved “Promotion Items” between “Marketing Needs” and “Content Creation”.** Saved Content Creation now waits for Promotion Items, but graph still puts Content Creation first.

Both mouse and Alt+← reproduce unchanged x/y coordinates. Isolated functions confirm correct dependency changes.

Cause: movement changes `dependsOn`, but graph orders by hardcoded keys in `PRE_ROUTES/POST_ROUTES`, ignoring actual dependencies. This is more than failure to save: persisted dependencies conflict with visuals.

Code: `src/lib/flowEdit.ts:23`; `src/components/flow/metro.ts:22`, `:36`, `:104`.

**Acceptance:** same-branch movement agrees in visuals, dependencies, refresh, generated events; cross-branch moves explicitly define branch/owner changes; actual dependencies reschedule while protecting school hard deadlines. Neither graphics-only nor data-only movement suffices.

### WF-05 New node appears in another branch

Reproduction: right-click Speaker SAP Headshot → **Add a step after this one**. New step waits for Speaker SAP Headshot, Partner Travel Plan waits for new step, but graph does not put it between them: a new bottom branch on desktop, new right column on mobile.

Cause: new steps store `fn/ownerRoleId/phase/dependsOn` etc., but no persistent branch identity. Unknown keys go to `other-pre`/`other-close`. Same-role inheritance cannot solve it: Event Lead/Speaker steps may both belong to Events lead.

Code: `src/components/setup/WorkflowPanel.tsx:46`; `src/components/flow/metro.ts:67`.

**Acceptance:** node/edge insertion defaults to the same branch/order; multiple inserts follow insertion position; refresh/new events agree. Branch, owner, phase, dependencies must be independently expressible.

## Other template-finalization issues

### WF-06 Effort changes do not adjust start reminders

Function reproduction: Marketing Needs `estDays: 2`→`10`; new task keeps `timing: { startDays: 60, dueDays: 58 }`. Both yield start **2027-02-15**, due **2027-02-17**, without new scheduling-risk warning.

Cause: effort editing changes only `estDays`; calibrated windows still determine these starts. `calibratedStep()` keeps timing when anchor unchanged, `timingStart()` uses `startDays`; reminder facts read actual `latestStart`.

Code: `src/components/setup/WorkflowPanel.tsx:95`; `src/engine/playbooks.ts:306`; `src/engine/schedule.ts:166`; `src/reminders/facts.ts:72`.

**Acceptance:** define interplay of fixed start windows/effort-based backward scheduling. Changed effort adjusts starts or explicitly warns of fixed windows/conflicts. Do not imply earlier reminders while dates remain unchanged.

### WF-07 Settings target disagrees with actual deadline

Check-in Forms Details shows **Target timing = 1**. Anchor is 1 business day before event, but `timing.dueDays = 0`; generated deadline is event day **2027-04-16**. Another field, `startDays: 5`, controls start; Details hides that window.

Editing target always writes `unit: calendar`, replacing business units without a selector. Closing steps hide target inputs entirely, preventing edits to post-event timing.

Code: `src/engine/playbooks.ts:41`; `src/components/setup/WorkflowPanel.tsx:96`; `src/engine/schedule.ts:151`.

**Acceptance:** show actual completion/start rules; distinguish business/calendar days, event day, post-event. Editing, clearing, regeneration must not silently switch units/date meaning.

### WF-08 New speaker steps appear without speakers

New steps do not inherit adjacent `cond: externalGuest` and no condition editor exists. Function reproduction: insert New speaker check after Speaker SAP Headshot, create ordinary `speaker: false` event without partner: old speaker steps disappear, new step remains.

Code: `src/components/setup/WorkflowPanel.tsx:48`; `src/engine/playbooks.ts:245`.

**Acceptance:** conditional-branch insertion explicitly defines scope; speaker/partner off skips new conditional steps with correct dependency reconnection. All-event applicability remains explicitly selectable.

### WF-09 Deleted steps return during event creation

Function reproduction: delete Photo Backup; `validateWorkflow()` passes and template truly lacks it; `buildEventNodes()` restores it in the new event.

Cause: editor blocks some deletions based on school rules; generator separately uses `CORE_EVENT_STEP_KEYS` to restore missing v2 core nodes. Definitions of deletable differ.

Code: `src/components/setup/WorkflowPanel.tsx:109`; `src/engine/workflow.ts:189`; `src/engine/playbooks.ts:225`, `:240`.

**Acceptance:** unify mandatory/deletable steps. Mandatory means block/explain deletion; permitted deletion means respect it on generation. Do not report successful delete/save then silently restore.

### WF-10 Deleting Full Check hides pre-event flow

Browser: Full Check Details → **Delete this step**, save allowed; graph nodes drop **46→11**, hiding Event Plan and other pre-event work. Functions confirm 35 non-closing nodes remain, but layout returns only closing branches.

Cause: Full Check has no deletion-disabling `ruleIds`, validation does not require it, yet layout requires it to draw every pre-event branch: `if (!routeNodes.length || !final) return`.

Code: `src/components/setup/WorkflowPanel.tsx:109`; `src/components/flow/metro.ts:62`, `:104`.

**Acceptance:** protect mandatory joins from accidental deletion; permitted deletion has alternate connections with remaining tasks visible/selectable/editable. Surviving data disappearing from graph is not normal deletion.

### WF-11 Instructions conflated with Why

Step details **Task description** edits `step.why`, becoming `node.why`, interpreted as **Why it matters** in tasks/reminder facts. **Your next step** prefers `node.instructions`, then fixed step copy/title.

Actual tasks have optional `instructions/completionCriteria`, but templates lack these fields and generators do not copy them. Presidents cannot write reusable detailed operations/completion criteria once in a template; changing Task description does not configure member next-step guidance.

Code: `src/components/setup/WorkflowPanel.tsx:98`; `src/data/types.ts:66`, `:272`; `src/engine/playbooks.ts:327`; `src/reminders/facts.ts:16`, `:45`; `src/components/TaskDetail.tsx:57`.

**Acceptance:** distinguish what, how, completion criteria, why; template inputs populate correct event/task/reminder fields. Detailed instructions may expand on task pages; emails emphasize one action/one task entry.

This affects both cores: immediately actionable reminders and new marketing members working directly from the process.

### WF-12 Renamed nodes retain old short labels

Browser: rename Budget to **Sponsor cost plan**, save confirmed; graph still says **Budget**.

Cause: labels prefer fixed `SHORT[stepKey]` without checking custom standard names. Full name updates in details/hover, creating inconsistency.

Code: `src/components/flow/MetroChart.tsx:30`, `:298`.

**Acceptance:** custom names immediately reach graph; shorten from current names or explicit short-name fields; consistent after refresh/new events.

### WF-13 Summary misses custom configuration

Function reproduction: change only Partner Speaker Review description or Budget default role; `describeWorkflow()` still returns **The standard workflow.** Change counts compare only title, effort, phase, dependencies, excluding owners/descriptions/anchor/timing.

Code: `src/engine/workflow.ts:226`, `src/pages/Settings.tsx:138`.

**Acceptance:** count or explicitly show key saved custom settings so presidents can confirm adjusted configuration is active.

## Suggested order and finalization conditions

Records future order only; does not start implementation.

1. **Unify template/execution data:** branches, conditions, dependencies, mandatory nodes, single date meaning; WF-04 through WF-10, otherwise UI/mail keep conflicting facts.
2. **Complete actionable content:** WF-01, WF-02, WF-11; configure operations, completion criteria, entries, rationale, connecting new events/task pages.
3. **Clarify Details, labels, summaries:** WF-03, WF-12, WF-13, readable results from one real configuration.
4. **Full speaker-event acceptance:** edit → move → insert speaker step → effort/target edits → refresh → create event → verify owners/conditions/dependencies/dates/links/instructions/reminders; nonspeaker event verifies condition isolation.

At minimum: edits persist/read clearly, graph matches dependencies, new events honor configuration, reminder/task dates agree, real action entries available, reusable instructions. Actual newcomer outcomes need use testing; technical checks cannot prove "master all workflows in three days."

## Existing behavior and boundaries

- **Template edits affect future events only**, explicitly designed/documented in Settings; existing events retain own steps, not a defect here. `src/pages/Settings.tsx:129`, `src/data/settings.ts:126`.
- **Graph not proportional to dates** may be valid design. WF-04 instead concerns editing execution order while graph ignores saved dependencies.
- **Automatic email remains browser demo.** `useAutomaticReminders()` requires open app/state changes; `sendReminderBatch()` generates mail/local records; runtime delivery is `simulated`. Real background scheduling, external delivery, cross-device access remain future; template finalization does not complete unattended sending. `src/reminders/useAutomaticReminders.ts:8`, `src/reminders/delivery.ts:13`, `src/reminders/runtime.ts:35`.
- Template-focused; no matching/mail-policy/Handoff/newcomer-training/production-site changes.
- Parallel-work record at `ab7123c` shows actual-task Details/Edit/multiple links being changed elsewhere, explicitly excluding Settings templates. Before implementation, recheck integrated fields/action entries and reuse their model to avoid duplicate link systems/overlap.

## Validation and handoff

**Existing checks:** 7 related files, **104 passed**; existing Settings workflow browser case passed 1 each desktop/mobile, **2 passed**. These omit counterexamples for visual ordering after moves, same-branch insertion, effort/reminder-date consistency, so passing does not disprove findings.

Commands:

```text
npm exec -- vitest run src/test/workflow.test.ts src/test/workflowV2.test.ts src/test/orgWorkflow.test.ts src/test/flowEdit.test.ts src/reminders/actionLinks.test.ts
npm exec -- vitest run src/test/calibratedEngine.test.ts src/reminders/facts.test.ts
npm exec -- playwright test --config=/tmp/workflow-audit-playwright.config.mjs --grep 'Settings workflow'
```

Browser reuses `e2e/workflow-setup.spec.ts`, temporary local Vite port 4188/system Chromium configuration, no repository-test changes. Also **8 recorded browser scenarios**: keyboard move, mouse drag, desktop/mobile insertion, Check-in target, rename, Full Check deletion, actual Plan quote entry. Function counterexamples cover conditional additions, generation restoration, dates, layout.

Workspace evidence `/workspace/shared/workflow-template-audit/`: `browser-results.json`, `engine-results.json`, screenshots. Not repository attachments; cross-machine handoff relies on these documented reproductions/code locations.

No full release gate, real school-form submission, real AI/email, product-code changes, main merge, or new PR. Address template consistency first, then automatic reminders/organizational handoff. Local backup needs synchronization.
