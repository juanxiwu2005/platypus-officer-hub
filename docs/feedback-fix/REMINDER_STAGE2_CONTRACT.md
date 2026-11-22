# Reminder Stage 2: Frozen Email and Standalone Task-Page Contract

2026-11-16 (America/Phoenix). Juanxi explicitly requested "continue stage 2". Excludes stage-3 Details/reminder-center rearrangement, default enablement, and real backend sending. Continue feat/reminder-plan-v2 and PR #15; retain matching integration through 26af354 at freeze and sync 5e301d9 at closeout, without reverting claiming/v23 saves. Reminder interfaces unchanged.

## Assignments

- Main agent: shared types/store/taskWorkflow, taskAccess.ts, message-record adaptation, old NudgeComposer lazy bridge, Officer.tsx route bridge, manual task-description fields, e2e/acceptance/delivery.
- Mail agent: src/reminders/mail.ts, mail.test.ts, ReminderComposer.tsx, ReminderComposer.test.tsx, reminder-composer.css; no old composer/global styles/store/contract changes.
- Page agent: src/reminders/SingleTaskPage.tsx, SingleTaskPage.test.tsx, single-task.css; no old Officer/TaskActions/TaskDetail/store/shared types.
- Independent Review: read-only final-candidate review; original owners fix findings.

## Shared authority and main-agent API

accessContracts.ts defines new email/reusable access authorization; contracts.ts retains stage-1 facts/candidates. Optional Node.instructions/Node.completionCriteria; facts.requirement prefers manual instructions; optional facts.completionCriteria; importance from existing why/actual dependencies. Main agent supplies editing, never model-invented facts.

src/reminders/taskAccess.ts exports:

- `makeTaskAccessGrant(state, nodeId, waitingRequestId?): Promise<TaskAccessGrant>`: no request means original owner; specified request means its explicit waiting target only. Local signing, not login/cross-device service.
- `taskAccessToken(grant): string`, `taskAccessUrl(origin, grant): string`; new /#/officer?access=..., no Done/Working query parameters.
- `usableTaskAccessGrant(state, token): TaskAccessGrant | undefined`, `verifyTaskAccessGrant(state, token): Promise<boolean>`: repeated access/updates do not consume link; verify stored grant/signature/ownership version/current membership/expiry. Same entry viewable after completion; reassignment/ownership changes revoke previous rights.
- `taskAccessIssueValid(state, grant): boolean` for store issue validation.
- New Actions `{type:'issueTaskAccessGrant', grant}`, `{type:'taskAccessAction', token, update:TaskAccessUpdate}`.
- Owner scope maps four buttons to done/working/stuck/waiting; claim first if unclaimed. working is an explicit reply action, not a disguised extension request.
- Waiting scope only acknowledge/provided; records request respondedOn/responseBy/response (acknowledged/provided), never source owner/status or task-write permission. Cancelled/reassigned requests cannot update; completed source task read-only.

## Mail API and component

`buildReminderMail(input: ReminderMailInput): ReminderMail`, `checkReminderMail(mail: ReminderMail): boolean`. Default entirely rule-based; no AI/network imports/calls. Subject "event · task" (standalone may use Club work); emphasize one Task due. eventDate only within requirements as context; no separate Start by or printed latest start. Explain trigger using actual today/startOn/due/candidate, distinguishing future/start day/due/actual overdue.

Natural greeting, concrete requirements, importance, collaboration, thanks; about 100 English words or fewer, retaining essential actionable content, full materials on task page. Avoid five mechanical labels or "step 1 open platform/step 2 find task". Body has one core taskUrl, removing other source URLs. Attendance comes from facts, never invent 40 people. Retain prohibited nagging/shaming language rules. Waiting email explains whose task needs the recipient's help without transferring execution ownership; a waitingOn name alone is not a concrete action.

Default-export ReminderComposer, props `{nodeId:string;onClose:()=>void}`, existing useStore. Ordinary owner uses current facts; enabled runtime selects current ready candidate for node, including waiting, through planReminders(buildReminderInput(...)); explain blocking, never fabricate sending. Disabled old path still uses nudgeBlocked/existing scheduling. Ordinary emails use new format; waiting-target delivery only under new runtime.

Dispatch issue after grant creation; disable sending until valid grant is stored. Build mail with unique URL from window.location.origin. No AI wait/Skip AI button. Preserve close/Escape/focus, channel preference, demo/no-delivery explanation. Platform modes use email; manual mode may open Email/WhatsApp/SMS drafts and record only after explicit confirmation.

Save snapshot `{...mail,channel,preparedOn:state.today,accessId:grant.id}`. Optional message on old confirmNudgeSent/new confirmPlannedReminder. Runtime confirmation requires current candidateId; otherwise old action. Main agent revalidates current facts/grant/recipient/mode and saves snapshot. Optional ReminderDelivery.message?/Nudge.message? for history; do not backfill old records. Success must follow actual stored record, not merely local setConfirmed(true).

## SingleTaskPage

Default export, props `{token:string}`. Read grant via usable/verify APIs; never infer rights from URL ownerId. Owner view: event/task, prominent due date, requirements/completion criteria, importance, one genuine action destination with applicability explanation, four states. Latest start does not dominate header. No full navigation/other tasks/Ask. Preserve official-deadline risks; financially controlled steps cannot bypass Event Budget to Done.

Waiting view: context of owner's request, specific waiting explanation, Acknowledge / Update provided only, not four source-task states. Show current state after success; refresh/reopening remains usable; completed tasks viewable. Unknown/expired/reassigned/departed-member tokens get clear messages, never imply success.

Preserve old ?token= one-time links/status-query compatibility; new ?access= uses this page. Lazy-load page/composer within entry budget. No real identity/email service or guessed external waiting-target email addresses.
