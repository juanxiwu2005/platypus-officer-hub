# Start shares a process with reset

2026-11-17（America/Phoenix），Codex。Achieved: `d616bb1`; The results of the inspections and deployments are shown at the end of the document.

## Changed what?

The problem is that two sets of pages exist simultaneously: Start uses the eight-step process, Settings  →  Replay setup and `/setup` still rewrite the six-step form for `pages/Setup.tsx`. Therefore, only the main code can be restored and the two entrances cannot be reconciled.

The old six-step page has now been deleted and all presidient settings will eventually share the same set of pages, progress bars, checks and drafts:

**Name → Constitution → Goals → Team → First event → Reminders → Confirm → Invite。**

| Imports | Now where? |
| --- | --- |
| `/#/start`、Welcome → Start、Demo → Replay walkthrough | The same group of funder pages; Start a research log according to the original rules. |
| Settings → Replay setup | `/#/welcome/setup` * Same set of search pages, no research attempt created |
| Original `/#/setup`、`/#/welcome/classic` | Compatible Jump to the same settings entry |
| Demo → Test onboarding as president | The same group of funder pages; Maintain the original unrecorded test rule |

Team displays Role, Person, Reports to and the duties are performed by Edit Duties; Do not require presidents to fill Email, Phone, AAU ID on a person-by-person basis. New member adds a chain reservation to fill out its own information. Constitution uploads, AI roll / functional recognition, manual modifications, first-time activities and reminders all retain the current behaviour of Start.

The hidden server workspace experiment `/phase1/setup*` belongs to another prototype, unchanged. Reminder phase 1–3 Integration, Budget Missions, Date Engines, Division Handoff remains unchanged.

## How does the old draft go on?

Continue your setup when there is an old `setup-draft`, you can choose Continue saved setup to enter the corresponding shared page. In valid drafts, the role, memory, function, connection, organise workspace links, edited workflows, buffers and original activity descriptions are kept together.

Replaces the current draft with a new draft in **for the same IndexedDB service**; It will continue only if the business is completed. The failure was not replaced, there was no backup and it was still on the original page for retry. The original of the old six-step draft is always retained and the import is completed with a source time stamp, which is not repeated every time it is replayed. A step operation completed during exit does not pull a person back to the settings.

Restoring role and function does not automatically re-call constitution AI; And refreshing doesn't trigger. The old version never saved the events and dates that had been prepared, so steps 4-6 reverted to First event and requested a re-examination of the event. Unable to safely read old records as they are kept and hinted, and users can open the current settings guide; Do not clean or guess bad data.

Existing operations are still archived on Release 23 and the matching fields are not known/reserved. Imports and previews do not modify existing tissues, only Conform  → Start workspaces perform the existing replacement demonstration workspace operations; Keep the confirmation page with the draft when you refuse to write.

## How do you check the user?

1. Open [ preview 14's setup entrance again ](https://deploy-preview-14--platypus-officer-hub.netlify.app/#/setup). Continue saved setup.
2. Continue with field name, upload Constitution or select Skip — use standard rolls; Fill in Mission, then enter Team.
3. Compared to [ Start entrance ](https://deploy-preview-14--platypus-officer-hub.netlify.app/#/start): the same eight-step and Team layout; Computers and mobile phones can be checked.
4. Check again from Settings point The old `/welcome/classic` address should also enter the same process. The interface is available only at Team Point Exit, without the last start workspace.

Do not repeat research for comparison interfaces by browsers that have formal research attempts Available as Demo's test browser. Study Start New Recording Behaviour Maintenance.

## New task cluster orientation

[ is assigned to task forces by workflow: for discussion programme ](EVENT_TASK_GROUP_ASSIGNMENT_PROPOSAL.md) has been coded: the template defines task forces, selects a specific head of each group for each event, inherits tasks and allows manual reassignment of individual assignments. Group is not fixed as standard; it does not depend on AI selection; Multiple workflows, versions of snapshots, follow-up tasks and old activities are compatible with design descriptions.

**is a programme with no access to new interfaces or distribution engines.**

## Inspection and deployment

- The 18 units/components document 156 were adopted, including constitution, Team, first-time activities, research records, duties fallback, settings and workflows.
- Last round of set-up/record/repair/old entrance/ role/workflow/ volume browser check: 131 pass, 1 cell phone only applies to desktopskip. Two progressive accessibility checks were passed at the other two ends, 133 in total, 1skip. Issues such as the selections and drafts that were found at the old test of the front transplant, which had not been saved, were re-examined in the final prototype process; There was no relaxation of product budgets.
- Lint, front end type and production construction, server type, 9 pages of text budget approved; Settings 147/150。The entrance is 542. 460/550,1,000 bytes.
- Desktop and cell phone dark screenshots have been manually viewed. All AI interfaces use simulation or local fallback; 0 live AI, 0 external mail.
- Code `d616bb105abda4b376cd9ccb98f82b95c2e6f476` has been pushed to the original functional branch, Netlify deploy-preview state on GitHub with access target of existing preview 14. PR #14 Keep the draft, no new PR, no more mege main; Main is still `b9e7a02`.

No full stop will be repeated for this round. The 64/60 old budget differences and calibration retained in Main First event source text, which were time-consuming, remained on the basis of previous delivery records and did not claim full greenness. The new Task Force allocates only programmes to be discussed. Could not close temporary folder: %s
