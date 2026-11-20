# Responsibility-matching strategy: review before interface redesign

2026-11-16 (America/Phoenix). Juanxi requested main onboarding first, withdrawal of overly complex responsibility settings, then reading this strategy before discussing interactions through references/sketches.

This documents the just-withdrawn design. Complete implementation remains at `5e301d9`; current preview restores original onboarding/assignment entries. New UI development is paused.

## Problem to solve

Finding the right person for a task requires three facts: **what work it is, who handles that kind of work, and whom to choose this time when several qualify.** Role titles alone cannot answer; Vice Presidents in different clubs may do entirely different work.

The proposal separates roles, responsibilities, and members: role names are arbitrary, responsibilities describe actual work, members execute it. One role may cover several responsibilities; several people may undertake one responsibility.

## Three selected strategies

| Question | Selected strategy | Plain-language explanation |
| --- | --- | --- |
| Build the club's responsibility library | A2: AI drafts, humans confirm | Upload constitution; AI extracts responsibilities with original evidence. President edits, adds, merges, confirms; manual creation works if AI cannot read it |
| Associate tasks with responsibilities | B2: workflow steps link to responsibilities | Define the responsibility needed for work such as room booking, then reuse it for future events rather than guessing by role names |
| Choose among several people | C2: default and backup | Maya normally handles it, Jordan is backup; each actual assignment confirms one executor; backup takeover needs explicit confirmation |

## 1. What a responsibility library is

Responsibilities are work-type bubbles such as venue booking, event copywriting, reimbursement-material preparation. They come from the club's constitution/workflows/manual additions, without requiring fixed Secretary/Marketing roles across clubs.

Each responsibility stores name, scope, deliverable, exclusions, source, confirmation state, and professional qualifications when necessary.

For example, venue booking submits applications and obtains confirmation; it excludes budget approval/payment. This reduces overlapping claims to the same work.

AI content starts as suggestions. Quotations found in uploaded originals show source evidence; unsupported items are explicitly suggestions. Humans may always add/edit.

**Unresolved:** written boundaries do not prove responsibilities are mutually exclusive or complete. Manual merge/review exists, but no automatic proof of whole-club workflow/policy coverage.

## 2. Linking responsibilities to roles and people

Two normal paths:

- A role holds a responsibility; its members become candidates.
- A person directly holds a responsibility, supplementing role relationships.

People qualifying through multiple roles appear once. Humans confirm required system accounts/qualifications; the platform does not pretend to verify school-system access.

A one-time manual task assignment is recorded as this decision, without permanently granting all related responsibilities/qualifications.

## 3. Finding a task's responsibility

Order: **workflow step → primary responsibility → qualified members → this task's owner.**

For example:

| Workflow task | Responsibility | Candidates |
| --- | --- | --- |
| General meeting: book a room | Venue booking | Maya, Jordan |
| Speaker event: book auditorium | Venue booking | Maya, Jordan |
| Speaker event: prepare speaker poster | Visual design | Sam |

Two workflows can share one responsibility without near-duplicate roles. General work can also link to responsibilities without all becoming event planning.

Steps combining specialties, such as slides/decorations/other event materials, remain "split or explicitly coordinate." Someone able to make slides is not thereby able to deliver the whole task.

The version provided review entries for all 46 current standard steps, 9 initially composite. **This is a review checklist, not proof that all clubs' 46 links are correct or every policy responsibility is covered.**

## 4. Choosing among several people

With Maya default and Jordan backup:

| Situation | Original handling |
| --- | --- |
| Maya qualified/available | Preselect Maya; confirm on submission |
| Maya unavailable, Jordan available | Suggest Jordan; wait for explicit choice, no silent takeover |
| No default, one qualified candidate | May preselect that member |
| Several qualify, no default | President chooses; never first-listed by default |
| No qualified candidate, unknown qualification, or missing responsibility | Remain unassigned with missing requirements explained; no automatic president fallback |
| Owner already confirmed | Template/default changes do not reassign old tasks |

Assignment and claiming differ: creating Maya's task does not mean she agreed. Self-claiming remains required.

## 5. Why this interface was burdensome

The UI directly exposed four configuration layers: constitution sources, responsibility editing, roles/members/defaults, workflow associations. Users had to understand, complete, and confirm them before seeing a task assigned.

It also simultaneously showed sources, boundaries, deliverables, qualifications, availability, member exceptions, defaults, backups, composite-task states. Much should appear at decision time; this version turned it all into setup work.

Main issues:

- Presidents must maintain much configuration before the first automatic-assignment benefit.
- Associating every workflow step requires too much work.
- Normal and exception paths mix, with excessive text and weak primary actions.
- Users cannot quickly answer: "What has the system already done, and what one decision do I need to make now?"

Turning underlying rules directly into user flows increased setup burden. Redesign must separately discuss rules to retain, information to show, and user confirmations; users need not learn every data relationship.

## 6. Intended expansion and actual limits

The library was intended to belong to the club, not one workflow. Future event types or AI-suggested flows from a sentence could reuse the same responsibilities/member relationships, with users resolving uncertainty.

Actual prototype: only a standard template and one custom event template; custom flows still obey mandatory ASU steps. No arbitrary-template management/free workflow generator, real organization accounts, cross-device sync, or server multi-user concurrency.

After rollback, new matching no longer drives actual tasks. Preview uses original assignment; existing owners/saved records remain. Reusing implementation requires explicit reconciliation of then-current teams, tasks, and old records, never reenable-and-reassign automatically.

## Next discussion

Use main onboarding as the experience baseline. After Juanxi reads this logic and supplies references/sketches, decide entry, order, and the single decision each screen requests. Retain necessary rules or revise strategies; do not build new responsibility pages prematurely.

Discuss what presidents first see; how much AI should prepare; when defaults/backups need questions; whether responsibility gaps belong in initial setup or when actual tasks need them.
