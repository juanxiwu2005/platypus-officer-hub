# Automatic-reminder task-matching review and next steps

2026-11-16 (America/Phoenix) · Codex · Baseline `claude/fervent-thompson-e2j5u2@bea7771`

Advance automatic reminders through six priorities in order. This round reviewed existing task-matching code and recorded design requirements for responsibility tags/multiple candidates; catalog/allocation rules still need item-by-item decisions. Documentation only; task matching, reminders, email, handoff behavior unchanged.

> **Subsequent explicit direction (2026-11-16):** Juanxi requires retaining/enhancing AI constitution role/duty extraction, supplemented/matched manually; do not restrict all clubs to nine existing functions. Build extensible relationships for varied/future AI-generated workflows. Earlier "evaluate without AI" remains initial thinking, never authorization to remove existing constitution AI. Juanxi selected A2 + B2 + C2 in [option comparison](TASK_MATCHING_OPTIONS.md), requesting staged worktree agents with approval before stages begin; [three-stage plan](TASK_MATCHING_IMPLEMENTATION_PLAN.md) currently awaits approval, product unchanged.

## Six priorities and current scope

| Order | Work | Status |
| --- | --- | --- |
| 1 | Task matching | Current-state review complete; discuss responsibility tags/coverage/multiple-candidate rules |
| 2 | RACI | Recorded; later clarify responsible roles/message recipients |
| 3 | Reminder plans | Recorded; later triggers/status changes/Details |
| 4 | Email writing | Recorded; later concise wording/facts/action links |
| 5 | Flow after opening email | Recorded; action links should reach specific real external pages, explaining multiple entries; status feedback separate |
| 6 | Independent background sending service | Recorded; later server data/scheduling/send history/failures |

Independent newcomer work/organization handoff is the second core goal, after automatic reminders. Older FB waves/three-day handoff plans do not authorize concurrent implementation; this changes current order only, preserving history.

## User's task-matching requirements

1. Evaluate onboarding/role matching without AI: organize existing workflows/duties/applicable policy actions into selectable responsibility bubbles.
2. No duplicate/indistinguishable responsibility definitions; check for missing known work.
3. Cover complete current workflow and general organizational duties beyond events.
4. Define task executor selection when two people share a responsibility.
5. Explain current mechanism before refining proposal; no tags/algorithm/later five features implemented now.

"Without AI" tags are a proposed direction under evaluation, not approval of final catalog/automatic allocation/migration. Workload/availability ideas from chat are not already implemented capabilities.

## Current main-flow allocation

Role name → broad function → workflow step's explicit role or function match → role holder → task executor.

### A role maps to one function

[`RoleFunction`](../../src/data/types.ts) has nine fixed values: president, vice_president, finance, programs, marketing, outreach, secretary, membership, advisor. Each `Role` has one `fn`, one `holderId`; no selectable responsibility catalog, multiple tags, or member pool for a role.

[`fnForRole`](../../src/data/structure.ts) mainly reads English title keywords. Finance/Treasurer/Budget → finance; Marketing/Design/Media → marketing; Event/Logistics/Operations → programs. Unknown ordinary roles default programs. Cross-functional titles match the first code-ordered category, never multiple.

Team edits role name/holder/reporting/duty text. Renaming usually recalculates function; duties remain free text, never compiled into fine-grained tags.

### Each step carries function or explicit role

[`EVENT_STEPS`](../../src/engine/playbooks.ts) defines 46 steps: 31 always-retained core, 15 conditional. Not every event creates all 46 tasks.

Each has `fn`, optionally explicit `ownerRoleId`. Distinct content/marketing publishing specialties currently share marketing; venue/guest/transport/security share programs.

[`withOwners`](../../src/engine/workflow.ts) prioritizes explicit passed step-role choice → saved still-existing role → `roleFor`. Manual selections work, but historic automatic role bindings are also retained, with no provenance distinction.

### Score-based choice without explicit role

[`roleFor`](../../src/engine/playbooks.ts) scores each role:

- Matching role `fn`/step `fn`: +100.
- Function keyword in role name/duties: +20.
- Highest wins; ties choose earlier input-list role.

No positive candidate uses fixed fallbacks: finance/marketing → president; programs → vice_president → president; others have their own chains. If none found, returns first role.

No comparison of specific skills, required account access, occupied/vacant role, personal busy weeks, actual capacity, assigned workload. `orderRoles` sorts some setup paths by reporting hierarchy, so list order does not imply suitability. Saved `ownerRoleId` takes precedence; new events do not always rematch current list.

### Role holder becomes executor

[`buildEventNodes`](../../src/engine/playbooks.ts) uses valid step role first, calling `roleFor` only if missing; chosen role's `holderId` becomes `ownerId`. Vacant role produces unowned task, without searching next occupied candidate.

Inputs are event/roles/template options, not complete member skills/workload. This creation path immediately sets occupied-role tasks accepted, unlike standalone tasks assigned to others awaiting claim.

## AI and other creation entries

| Entry | Actual behavior |
| --- | --- |
| New event | Template/engine generate tasks using bound roles/matching above; no per-task AI member evaluation |
| Optional constitution reading | AI extracts roles/duties; accepted suggestions enter local role configuration, not fine-grained skill matching |
| Workflow AI owner endpoint | owners branch in `netlify/functions/workflow.mts` lets model choose existing role per step; static search found no non-test frontend caller on this branch, so server code does not establish active onboarding usage |
| Ask standalone task | Prompt uses only explicitly named people/roles, otherwise blank; editable form then `createTasks` |
| Manual reassignment | Uses selected person; entries validate identity/IDs/edit permission, with no common responsibility-qualification layer |
| Temporary takeover after silence | `suggestedOwner` sorts function proximity, then unfinished-task count; special follow-up suggestion, not unified ordinary-task allocator |

Code: [`structure.ts`](../../src/data/structure.ts), [`workflow.mts`](../../netlify/functions/workflow.mts), [`chatCards.ts`](../../src/lib/chatCards.ts), [`changeReview.ts`](../../src/data/changeReview.ts), [`followup.ts`](../../src/engine/followup.ts).

Selecting two people in standalone form creates two similar tasks, one each; it does not choose one of two same-responsibility members for one job. Without assignee, president can post unowned work; ordinary officers default to self; assignments to others await claim.

Repository also has default-hidden server Activity workspace. `resolveOwners` finds candidates by member `roleIds`: exactly one becomes primary; multiple leave primary blank and others as collaborator candidates. Separate from browser main app, never claim unified release.

## Proposed responsibility-bubble boundaries

Bubbles describe work owned, such as venue booking, official event registration, promotional writing, promotional visual creation, publishing. Club-defined role names remain, each selecting multiple duties.

Distinguish duties/skills/permissions: Canva proficiency is skill; owning visual production is responsibility; submitting a particular application is permission. A duty selection proves no required access, and interest is not professional qualification.

Check each allocatable duty's action/object/deliverable:

| Candidate responsibility | Main deliverable | Explicit exclusions |
| --- | --- | --- |
| Official event registration | Registration record/confirmation number | Annual organization registration, room booking |
| Venue booking | Venue/capacity/layout/booking confirmation | Official event registration |
| Promotional writing | Reviewable promotional text | Visual deliverables, publishing |
| Promotional visual creation | Reviewable poster/image | Copywriting, publishing |
| Promotional publishing | Content posted to specified channels | Creating text/visuals |

These five illustrate boundaries, not final/full catalog. Parent groups aid discovery, not duplicate allocatable duties counted alongside children.

Different bubbles need distinct definitions; different roles/members may select the same bubble. These solve work classification and candidate membership respectively.

`contentCreation` currently combines copy/visuals; `materials`, `checkin`, `speakerPacket` also combine deliverables. Specialization requires splitting tasks or specifying multiple required duties and primary executor's coordination role. Multiple tags do not prove that someone matching one can complete the whole compound task alone.

## Coverage verification

Two separate mappings required:

1. Every standard/custom/ad-hoc task → main responsibility; split compound steps if needed; explicitly retain unmapped work as uncategorized.
2. Every applicable organizational policy action → trigger, actual action, main duty. Determine whether each rule is a constraint/prohibition/action; do not turn every source into a task.

Reviewed scope: 46 standard steps, 9 broad functions, 16 simplified rules, 64 policy-source catalog entries. All 46 steps listed below; 64 entries not yet extracted/reviewed duty by duty, so no claim of complete ASU-policy coverage.

Non-event scope to review: registration/annual renewal, role/org profiles, training/account access, advisor/university liaison, organizational archives, branding/trademarks, applicable music copyright. Recruitment/meeting minutes also occur in duty templates. These are review areas; specific obligations/authority need applicable clauses/configuration, not title-based assumptions.

[`R16`](../../src/data/rules.ts) combines general organization matters; [`POLICY_CATALOG`](../../src/data/policyCatalog.ts) includes governance/branding/accessibility/college sources. Historic materials/specific-college rules do not automatically apply currently to all organizations.

Coverage denominator must be a defined list. Recheck new steps/policy actions; preserve gaps instead of hiding them by assigning first role.

## Two people with the same responsibility

Main app currently breaks score ties by role-list order, one holder per role; no same-duty member-pool strategy.

Recommend tags form candidate sets, then define allocation per duty. At least two scenarios:

- Continuous external communication/fixed system permission: primary + backup.
- Independent work shareable among qualified members: allocate among permission/time-qualified candidates; define capacity, existing work, rotation rules later.

Always one primary executor per task. Collaborators should not automatically receive duplicates. Never silently reassign manual choices during daily load recalculation; unavailable candidates/unsettled strategy should explicitly show unassigned with reason.

Rotation/capacity/ties/default owner/coverage adjustment remain undecided. Task counts/planning days cannot accurately represent actual effort or be called real workload.

## Complete current standard steps

Static definitions at review baseline. Core means membership in `CORE_EVENT_STEP_KEYS`; context describes conditional creation. No skill/duty tags yet.

| Step ID | Current name | Function | Core | Context |
| --- | --- | --- | --- | --- |
| plan | Event Plan | programs | Yes | — |
| backup | Back-up Plan | programs | Yes | — |
| venuechoice | Candidate Venue | programs | Yes | — |
| registry | Event Registry (SDC & Special Event) | programs | Yes | — |
| venue | Book Room & Layout | programs | Yes | — |
| moderator | Moderator Lead Staffing | programs | Yes | — |
| materials | Event Materials PPT Decorations | programs | Yes | — |
| checkin | Check-in Forms Photo Release Liability | programs | Yes | — |
| headcount | Headcount | programs | Yes | — |
| thankyou | Thank You Note | secretary | Yes | — |
| feedback | Feedback | vice_president | Yes | — |
| postmarketing | Post Marketing | marketing | Yes | — |
| photoBackup | Photo Backup | marketing | Yes | — |
| invoice | Invoice | finance | Yes | — |
| attendance | Attendance Submit | finance | Yes | — |
| spending | Paid Reimbursed | finance | Yes | — |
| financeRecord | Finance Record | finance | Yes | — |
| documentation | Documentation | secretary | Yes | — |
| partner | Partner Meeting | programs | No | externalGuest |
| speakerPacket | Speaker SAP Headshot | programs | No | externalGuest |
| travel | Partner Travel Plan | programs | No | externalGuest |
| partnerReview | Partner Speaker Review | programs | No | externalGuest |
| parking | Parking Validation | programs | No | externalGuest |
| budget | Budget | finance | Yes | — |
| foodCompliance | Food Exception Permit | finance | No | externalFood |
| quotes | Quote Gather | finance | Yes | — |
| budgetRequest | Budget Request | finance | Yes | — |
| budgetApproval | Budget Approval | finance | Yes | — |
| purchaseRequest | Purchase Request | finance | Yes | — |
| purchaseApproval | Purchase Approval | finance | Yes | — |
| advisor | Advisor Involved | programs | No | advisor |
| access | Accessibility Check | programs | No | access |
| security | Security | programs | No | safety |
| eams | EAMS Plan | programs | No | safety |
| permit | Permit Insurance | programs | No | safety |
| alcohol | Alcohol Permit | programs | No | alcohol |
| drone | Drone Approval | programs | No | drone |
| schoolApproval | School Admin Approval | programs | No | schoolApproval |
| marketingNeeds | Marketing Needs | marketing | Yes | — |
| contentCreation | Content Creation | marketing | Yes | — |
| promotionItems | Promotion Items | marketing | Yes | — |
| rsvp | Open RSVPs | marketing | No | rsvp |
| content | Content Distribution | marketing | Yes | — |
| reminder | Event Reminder | marketing | Yes | — |
| orderPlaced | Order Placed | finance | Yes | — |
| finalcheck | Full Check Alert Changes | president | Yes | — |

## Verification and handoff

Offline assertions of real functions confirmed: list-order ties; reversing list changes unbound candidates; vacant role can rank first; unknown titles default programs; missing match falls back first role; saved bindings retained; vacant holder yields unowned task.

6 existing related files/114 tests passed: `npm test -- src/test/m4.test.ts src/test/orgWorkflow.test.ts src/test/workflowV2.test.ts src/test/m2b.test.ts src/test/onboardingTeam.test.ts src/test/fb-05-create.test.ts`. Workflow endpoint tests mock AI; no real models called. Step list generated directly from current `EVENT_STEPS`/`CORE_EVENT_STEP_KEYS`, verified 46 rows/31 core.

This round records only state, user requirements, pending refinement. Next review catalog/coverage item by item, then multiple-candidate rules; no early RACI/email/scheduling/background service/handoff implementation. Local backup sync required.
