# Speaker Activity Workstream Template Question Log

The objective for this round is to fix the workflow template and then advance automatic reminders and organization handoff. Check confirmation: Links listed by users, Details, moves and additional branch issues are accounted for; The moves and additional questions have been repeated on the browser. Other date settings do not reflect deficiencies such as scheduling, conditionalities becoming mandatory for all activities, recovery after deletion and process loss. The existing template is not yet a stable source of implementation processes.

The review date is 2026-11-17 (America/Phoenix) and the base code point is `claude/fervent-thompson-e2j5u2@0f53577`. Closes to `ab7123c`, during which only progress documents are submitted and the product code is identical. This round was submitted for audit purposes only, and the following repairs were not implemented. The screenshot serves only as an interface reference for users and is not used as an additional execution instruction.

## Scope and manner of review

- Settings  → Workfly template, Step details, moving and right-key menus, and the actual Plan task processing entrance.
- Template to generate a speaker active task, and then enter the path to rule Scheduling and reminder facts.
- Browser operations use repository presentation data; The independent function repeats the field speaker activity with dates 2027-04-16, 60 people, schools, non-dinners, contribution funds, `partner/rsvp` open.
- "Browser recurrence" means local chromium operations; (a) " Function recurrence" means the call to the original function of the branch, which is not rewrited to substantiate the conclusion; Experience judgements are identified separately.

The current Settings save a **template for organizing generic events**, from which the Speaker activity generates steps according to conditions and does not have a stand-alone speaker template manager. As a first step, check with the speaker scene to see if other activities have been affected. Location: `src/engine/playbooks.ts:30`, `src/data/settings.ts:126`.

## Summary of issues

P1 indicates that implementation or data consistency issues should be addressed prior to the template; P2 indicates that it would make the configuration difficult to understand or identify empirical problems. The following entries are to be repaired and the recommended and acceptance standards have not yet been implemented.

| Numbering | Priority | Problem | Method of verification |
| --- | --- | --- | --- |
| WF-01 | P1 | Matching links only in fixed steps would be inconsistent with the actual needs of the activity | Resume Browser and Functions |
| WF-02 | P1 | Template cannot add or edit links, custom nodes have no configuration path | Panel and data model checks |
| WF-03 | P2 | The director of Details, the time frame, the point and the meaning of dependence lack intuitive explanation | Interface facts and experience judgements |
| WF-04 | P1 | Node moves have been re-reliant and saved, and the flow chart still shows the old order | Mouse drag, keyboard and function recurrence |
| WF-05 | P1 | Add nodes to the original branch where nodes are drawn to "Other" branch | Desktops, Cell phones and Functions Resume |
| WF-06 | P1 | The start date and reminder time for some of the standard steps will remain unchanged as the projected workload is revised | Function Resume |
| WF-07 | P1 | The target point shown by Details may not be consistent with the actual Scheduling | Resume Browser and Functions |
| WF-08 | P1 | Adding steps to the Speaker branch will enter a non-speaker activity | Function Resume |
| WF-09 | P1 | Some steps the template allows to be deleted and the new activity is restored | Function Resume |
| WF-10 | P1 | After Full Check is deleted, a large number of pre-activity nodes that still exist disappear from the map. | Resume Browser and Functions |
| WF-11 | P1 | Task description is actually saved to Why, templates lack reusable instructions and completion criteria | Data Generation Path Check |
| WF-12 | P2 | When the standard node is changed and saved, the old acronym still appears on the chart | Browser Resume |
| WF-13 | P2 | A template summary may still be referred to as a standard template when the head, description or target point is changed. | Function Recover and Code Check |

## Questions from users

### WF-01 Linking does not match the task scene

Actual Plan opens the Quote Gather of Fund Dinner's demonstration: this activity `food: none`, which is required to collect offers from suppliers, but the button is fixed at **Open ASU gathering information**, skipping the catering information page. The same results were obtained when independent speaker activities were not fed.

Roots: `taskActionLink()` only check the table by `stepKey`; `quotes/quote/dining` Shared catering address, with no choice of entrance based on type of offer, funding or organizational configuration. Only out-of-school vue is currently treated on an exceptional basis.

Codes: `src/reminders/actionLinks.ts:6`, `:15`, `:22`; `src/reminders/facts.ts:59`；Show at `src/components/TaskDetail.tsx:61`.

**Impact:** members may still be directed to entry points that are not compatible with the task and cannot act directly after receiving a reminder.

**standard:** to at least confirm externally processed nodes in the speaker template item by item; Price entrances distinguish catering from other suppliers; Login entrances, notes and final forms are clearly marked. Give a live entry and next navigation description when no steady straight to the address. A generic home page cannot be considered a form that can be submitted directly to all tasks.

This item confirms the **semantic matching problem** and does not declare an unincorporated site as a invalid link. Independent speaker sample 37 jobs with 9 fixed processing links; This amount merely indicates the existing map coverage, on which basis it cannot be assumed that the remaining 28 items must have an outer chain.

### The WF-02 template lacks the ability to edit and save links

Step details only has a name, default line, time, target point, description and dependence. `StepTemplate` does not have a link configuration field with the task `Node`; The current processing address is from the above-mentioned fixed map. Links & files of Settings are information-sharing organizations and cannot replace a processing entrance to a particular step.

Code: `src/components/setup/WorkflowPanel.tsx:87`; `src/data/types.ts:66`、`:271`；`src/reminders/actionLinks.ts:22`。

**Impact:** president cannot be modified in the template even if it knows the correct address; New nodes will not automatically obtain access through existing fixed tables.

**standard:** standards and custom steps can edit linked names, addresses and necessary instructions; Save, refresh and keep after new activities; Plan and mail links open the task page to read the same configuration. Changes in the template need to be clear on the scope of application of existing activities, so as not to cover tasks performed quietly.

### WF-03 Details

This is a question of experience, among which the following can be observed:

- **Done by** is chosen for rolls, e.g. Events lead; It is not clear that this is the default allocation for future activities.
- **Days of work** for working days; **Target Timing** did not explain whether the objective was to be achieved or a reminder started, nor did it form a readable time note.
- The empty target shows **From dependencies**, but it does not provide a preview of the time taken from which tasks are ahead. Entering `0` has a different meaning than leaving space.
- **Waits for** was launched with a large number of steps across branches, before and after activities, without grouping and dependence previews.
- It is not possible to edit this condition without showing the type of activity to which the node applies, and it is particularly difficult to judge the scope of the new step.

Code: `src/components/setup/WorkflowPanel.tsx:78`. Partner Specter Review from the same panel in the screenshot; The above-mentioned dates and descriptions also include specific logical questions for WF-06, WF-07 and WF-11.

**Recommended standard for access:** user can read directly who is responsible by default, what to do, how to count completion, when to start reminding, when to complete, where to wait and where to go. Fields are in English, but clear units and results statements are given at adjacent locations. The specific layout is left for joint confirmation and will not be changed during the current round.

### WF-04 moves saved but not updated on graph

Resume: Drag the Movement Items of the Marking branch to between Marketing Neds and Content Corporation. **Moved “Promotion Items” between “Markating Neds” and “Content Corporation”.**, which is in the archive, has also been changed to “Promotion Items”, but remains on the map ahead.

Both the mouse drag and Alt+ ←  repeats the problem: nodes are different in length and range. Independent function calls also confirm that the mobile function produces the correct relying changes.

Root: The move changes `dependsOn`, and the drawings are in the order of the key written in `PRE_ROUTES/POST_ROUTES`, which determines the order without reading actual reliance. It is therefore not just “unsaved”: the operational reliance on preservation has been inconsistent with the image.

Code: `src/lib/flowEdit.ts:23`; `src/components/flow/metro.ts:22`、`:36`、`:104`。

**standard:** corresponds to the image, dependence, updating and generation of new activities after moving with the branch; (b) When moving across branches, make clear whether branch attribution and the person in charge have changed; Scheduling remains protected on the hard cut-off date of schools based on actual reliance. The graphics cannot be moved without changing the business data, nor can they simply change the data while retaining the old graphics.

### WF-05 New Node Runs to another branch

Restore: Right-click SAP Headshot, select **Add a step after this one**. The new nodes rely on Speaker SAP Headshot, Partner Travel Plan, but the new nodes are not shown between these two nodes. The desktop is placed in a new branch below the map, and the mobile phone is placed in a new column on the right.

Roots: The new step is only information such as `fn/ownerRoleId/phase/dependsOn` and there are no branches that can be saved. Layout finds it not to be a fixed key list, which will be integrated into `other-pre` or `other-close`. Inheriting the same role will not solve: Event Lead and Speaker may be responsible for events lead.

Code: `src/components/setup/WorkflowPanel.tsx:46`; `src/components/flow/metro.ts:67`。

**standard:** inserted from a node or line, defaulting to retain the branch and sequence; Multiple new nodes can be arranged by place of insertion; Renovation and new construction activities remain consistent. Branches, persons in charge, stages and dependency must be expressed separately.

## Other questions that affect the template

### WF-06 Start reminder without a corresponding change of workload

Function recovery: Marking Neds changed from `estDays: 2` to `10`, generating a new active task that remains the original `timing: { startDays: 60, dueDays: 58 }`. The rules are the same: **2027-02-15**, as of date **2027-02-17**, no new risk hints for scheduling.

Roots: `estDays` only for template workload editing; The default start date for such steps is still determined by the school-time windows already available. `calibratedStep()` Keep original texting while the target anchor remains unchanged, `timingStart()` uses `startDays`. Remind the facts and then read the actual `latestStart`.

Code: `src/components/setup/WorkflowPanel.tsx:95`; `src/engine/playbooks.ts:306`；`src/engine/schedule.ts:166`；`src/reminders/facts.ts:72`。

**standard:** to clarify how the “fixed start window” and the “inverted workload” fit together; Changes to the workload should be adjusted accordingly or a fixed time window and its conflict should be explicitly indicated on the start day. It is not possible to let the president think that an advance reminder has been made, and the actual reminder date remains unchanged.

### The WF-07 setup page does not have the same target as the actual deadline

Check-in Forms' Details show **Target Timing = 1**. The template anchor is 1 working days before the event, but also has `timing.dueDays = 0`; After the actual activity is generated, the deadline is **2027-04-16** on the day of the event. The start date is decided by another field `startDays: 5`, and Details does not show this time window.

In addition, the edit target values are uniformly written into `unit: calendar`, the original business unit is replaced and the interface is not selected. The closing step completely hides the target point input and cannot be completed here a few days after adjusting the activity.

Code: `src/engine/playbooks.ts:41`; `src/components/setup/WorkflowPanel.tsx:96`；`src/engine/schedule.ts:151`。

**standard:** setup page displays actual completion targets and starting rules used; (a) To make a clear distinction between working days, natural days, day of activity and after the event; Revalued, emptied and regenerated tasks do not implicitly change units or create another set of dates.

### WF-08 stepr appears in nonspeaker activity

The new step does not inherit `cond: externalGuest` from the adjacent step, nor does it require editing of the entrance. Function repeats: Inserts New Speaker check after Speaker SAP Headshot, generating normal activities of `speaker: false` without partnerer, the original speaker step disappears and new steps are created.

Code: `src/components/setup/WorkflowPanel.tsx:48`; `src/engine/playbooks.ts:245`。

**standard:** specifies the scope of application of the new step when inserted in the branch of conditions; New steps belonging to the branch of this condition are correct when speaker/partner closes, and subsequent reliance is on proper continuity. If the user wishes to do all activities, it can also be visible.

### WF-09 Deleting steps are restored when new activity is created

function repeats: `validateWorkflow()` is passed after photo Backup has been removed from the template and there is no such step in the template; Photo Backup exists again when calling `buildEventNodes()` to generate a new activity.

Roots: The editor may not delete a part of the node which is judged only in accordance with school rules; The generator also has `CORE_EVENT_STEP_KEYS`, which will make up the missing core nodes for the v2 activity. The definition of “deletable” at both ends is different.

Code: `src/components/setup/WorkflowPanel.tsx:109`; `src/engine/workflow.ts:189`；`src/engine/playbooks.ts:225`、`:240`。

**standard:** Harmonizes which steps must be retained and which can be deleted. If core steps must be retained, the editor should prevent deletion and explanation; If deletion is permitted, the decision should be respected in generating the activity. Delete and save successfully could not be shown, then quietly restored.

### WF-10 Deleting Full Check will cause preactivity processes to disappear

Browser repeats: Open Full Check's Details, click **Delete this step**; The operation allows saving, and the task nodes on the map are not shown any more than before activities such as **46 to 11** and Event Plan. function confirms the template still has 35 non-endpoints, but only the end branch is returned to the layout.

Root: Full Check does not disable `ruleIds` for delete buttons and template verification does not require it to be kept; The layout also uses its existence as a prerequisite for mapping all pre-activities: `if (!routeNodes.length || !final) return`.

Code: `src/components/setup/WorkflowPanel.tsx:109`; `src/components/flow/metro.ts:62`、`:104`。

**standard:** must retain a point of convergence that cannot be deleted by mistake; Where deletion is permitted, the layout has the right alternative connections and the remaining tasks remain visible, optional and editable. Data are still missing from the map and cannot be considered to be deleted as normal.

### Operation description for WF-11 templates mixed with why

**Task description** of Step details was actually modified by `step.why`. It enters `node.why` when generating the task, and the task page and reminder facts interpret it as **Why it matters**; **Your next step** gives priority to `node.instructions`, using either a fixed step text or task title whenever it is not.

The actual task already has an optional `instructions/completionCriteria`, but the template does not have a corresponding field and the generator does not copy either from the template. Therefore, the president cannot write detailed and complete standards for reuse at a time in the template; Changing Task description alone does not set content as the next guide for members.

Code: `src/components/setup/WorkflowPanel.tsx:98`; `src/data/types.ts:66`、`:272`；`src/engine/playbooks.ts:327`；`src/reminders/facts.ts:16`、`:45`；`src/components/TaskDetail.tsx:57`。

**standard:** makes a clear distinction between what to do, what to do, what to accomplish and why; Templates enter the correct location for new activities, task pages and reminders. The operating document can be expanded on the task page, and the mail still highlights a clear action and a task entry.

This at the same time affects two core objectives: a reminder of whether members can act immediately, and whether the new marketing member can do it directly according to process.

### The old acronym is still on the WF-12 rename

The browser changes Budget to **Sponsor cost plan**, confirming that the new name has been saved; Node on the chart still shows **Budget**.

Root: The text in the figure gives preference to a fixed acronym for `SHORT[stepKey]` and does not determine whether the user has changed the standard name. Complete names are updated in detail or with a standstill, resulting in inconsistent information on different locations.

Code: `src/components/flow/MetroChart.tsx:30`, `:298`.

**standard:** self-defined name immediately reflected on the chart; Abbreviations are generated from the current name or are accompanied by distinct acronyms when required; Renovation and new construction activities remain consistent.

### WF-13 template summary missing some custom settings

Function recovery: only the description of Partner Specter Review is changed, or only the default rule for Budget, `describeWorkflow()`Still returns **The standard workflow.**。 The function 's change count compares names, hours, stages and reliance only, without comparing the person responsible, description, target ancher or Timing.

Code: `src/engine/workflow.ts:226`, `src/pages/Settings.tsx:138`.

**standard: The key custom settings maintained by** should be included or clearly displayed in the summary to enable presidients to confirm that the current configuration is adjusted.

## Suggested repair order and release freeze conditions

Only follow-up sequences are recorded here and implementation is not automatic.

1. **First harmonizes the template with the execution data.** Clear branches, conditions, dependency, node and sole date synonym to resolve WF-04 to CF-10. Otherwise, the follow-up interface and mail will still read conflicting messages.
2. **Completion of mission content.** Solves the WF-01, WF-02, WF-11, so that presidients are configured for specific operations, completion of standards, processing entrances and reasons, as well as keeping track of new activities and task pages.
3. **Collapse Details, text and summary.** solves WF-03, WF-12, WF-13, displaying readable results with the same live configuration.
4. **Do a full speaker activity.** Edit Template  →  Move Node  →  Insert steps in the speaker branch  →  Change time and target  →  Update generation activity  →  Check for owner, condition, dependency, date, link, job description and alarm content. Confirms the conditions for isolation by closing the normal activity of the Speaker.

Templates release freeze should at least be satisfied: edit results can be saved, readable, consistent with reliance, new activities are faithfully configured, reminder dates match the task date, members can find a live processing entrance and templates can repeat the operation description. The ultimate effectiveness of the incoming officer will still need to be validated and cannot be claimed by these technical inspections alone as having reached a “three-day mastery of all processes”.

## Existing acts and subsequent borders

- **Change template only affects future activities**It is currently clearly designed, as Settings has stated;  Existing activities retain their own steps, which have not been misreported as defects in the present round. Location: `src/pages/Settings.tsx:129`, `src/data/settings.ts:126`.
- The **flow chart is not drawn at date scale** itself can be a design choice. The WF-04 problem is that the page requires the user to edit the order in which it will be executed, but the graph does not reflect the changes in saved reliance.
- The **auto email is still a display in the browser.** `useAutomaticReminders()` Reliance on application open and state changes, `sendReminderBatch()` generates mail and local records, runtime results are `simulated`. Live backstage scheduled, external mail delivery and cross-equipment access remain follow-up and the current template cannot be considered as completed unattended. Location: `src/reminders/useAutomaticReminders.ts:8`, `src/reminders/delivery.ts:13`, `src/reminders/runtime.ts:35`.
- The focus template for this round does not modify the function matching, mail strategy, Handoff, incoming officer training functionality or official website.
- `ab7123c` 's parallel working records show that Details, Editt and Multi-Foreign chains at actual activity nodes are being modified in another task to explicitly exclude Settings templates. The implementation of this report will be preceded by a re-checking of the then integrated task fields and processing portals, the reuse of their data models and the avoidance of reintroduction of two sets of links or overlap with ongoing work.

## Verify and Handoff

**Checked:** 7 relevant test files, **104 passed**; Existing Settings workflow browsers pass through 1 each on the desktop and cell phones, with a total of **2 passing**. Although the tests have been passed, they do not cover reverse cases of moving visual order, insertion with branch, consistency between workload and reminder dates, and cannot be considered to exist on that basis.

Run command:

```text
npm exec -- vitest run src/test/workflow.test.ts src/test/workflowV2.test.ts src/test/orgWorkflow.test.ts src/test/flowEdit.test.ts src/reminders/actionLinks.test.ts
npm exec -- vitest run src/test/calibratedEngine.test.ts src/reminders/facts.test.ts
npm exec -- playwright test --config=/tmp/workflow-audit-playwright.config.mjs --grep 'Settings workflow'
```

Browser repeats the existing `e2e/workflow-setup.spec.ts`, temporarily configured using local Vite 4188 ports and systems Chromium, unmodified repository test. Completing **8 browser scene records**: keyboard moves, mouse drags, desktop additions, mobile phone additions, Chuck-in targets, name change, Full Check deletion, actual Plan quotation entry; function reverses the new conditions, returns when generated, dates and layouts.

`/workspace/shared/workflow-template-audit/`: `browser-results.json`, `engine-results.json` and screenshots; The directory is not a repository annex, and cross-machine handoff refers to the steps and code location of this report.

(a) Failure to complete the release of a restricted door or live school form; No live AI called, live mail sent, product code modified, merge main created or new PR created. Follow-up will first address the above template consistency issues and then move forward with automatic reminders and organization handoff. Could not close temporary folder: %s
