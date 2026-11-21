# WP2 acceptance guide (October 22, 2026, ChatGPT)

## Delivered

- One-sentence entry on Today: calls `/api/command` and returns a whitelisted change card. Each item can be edited, approved, or rejected. Events/tasks remain unchanged until approval, then are saved in this browser. Approving an item twice has no additional effect.
- Supports creating events, adding nodes, assigning owners, setting effort tiers, linking dependencies, proposing reminders, and answering rule questions. Answers show the actual rule text and sources; without valid sources they decline to answer. Existing-node edits still use the store; new events still use `buildEventNodes()`; task dates are still written by `applySchedule()` / `computeSchedule()`.
- Discards every AI-supplied date, anchor, and unknown field, including in the retained `/api/parse-brief` endpoint. An event date comes only from an explicit year/month/day in the person's sentence or from the date they enter and confirm in review. Relative dates require manual completion; AI must not guess.
- Risks retain WP1's red/yellow reasons and ordering, with at most three items. Assign an owner first when one is missing. Do not draft reminders for tasks that are complete, have a response or subsequent update, or have reached the three-reminder limit.
- `/api/nudge/draft` returns a complete sectional draft. AI rewrites only the meaning sentence; code reinserts and rechecks actual dates and dependency explanations. The body is limited to 100 English words, How to three steps, and includes four status entrypoints.
- Opens a WhatsApp, text-message, or Gmail draft according to the person's preferred channel. The demo does not prefill real phone numbers/recipients or send automatically. Opening a draft is not a send. Only “I sent this reminder” records the person's own send confirmation; it does not establish delivery.
- Event strips show the current unfinished step and the next two, ordered by engine start dates and dependencies so post-event review does not appear first. Selecting a step opens the existing side panel.
- Retains semester goals. Star of the week uses existing contribution points associated with completed nodes updated that week, exposes its basis, removes duplicates, and shows ties. Actual completion dates can refine this after WP3.

## Automated checks

Local `npm run check` completed: build succeeded, and all 120 unit tests and 50 browser tests passed. All previous 68 unit and 38 browser tests remain. The two new server functions were also checked for bundling.

All **20/20** fixed commands produced the expected operations in `src/test/commands.test.ts`. This verifies the deterministic command parser shared with the actual `/api/command`, not DeepSeek/AIR accuracy on freeform language. Server tests use controlled mock AI responses to cover date injection, unauthorized operations, unknown owners, and invalid reminders.

| # | Test command | Expected result |
| --- | --- | --- |
| 1 | Plan Founder Dinner on Nov 19, 30 people, outside caterer, USG funding | New event; 30 people; outside catering; USG |
| 2 | Create a workshop on December 3, 40 attendees, college funding | Workshop; 40 people; college funding |
| 3 | Schedule Spring Speaker Panel on February 11, 60 students, sponsor | Speaker event; 60 people; sponsorship |
| 4 | Organize a team meeting on 2026-11-05, 12 people | Meeting; 12 people |
| 5 | Plan Fundraiser on Nov 20, 80 guests, dues | Fundraiser; dues funding |
| 6 | Add task: Review speaker slides for Spring Speaker Night | Add task to the matching event |
| 7 | Create a node: Prepare name tags for Networking Night | Add task to the matching event |
| 8 | Add step: Check microphones for Networking Night assigned to Jordan | Add task; Jordan owns it |
| 9 | Add task: Clean the supply box | Standalone task; person supplies the due date |
| 10 | Assign Send the October newsletter to Priya | Change owner |
| 11 | Give Reconcile September receipts to Maya | Assign owner |
| 12 | Unassign Book the spring weekly meeting room | Clear owner |
| 13 | Set Send the October newsletter to heavy | Heavy tier |
| 14 | Make Reconcile September receipts light | Light tier |
| 15 | Mark Book the spring weekly meeting room medium | Medium tier |
| 16 | Make Send the October newsletter depend on Reconcile September receipts | Link dependency |
| 17 | Remind Sam about Send the October newsletter | Propose a reminder only |
| 18 | Nudge Maya about Reconcile September receipts | Propose a reminder only |
| 19 | Can we serve homemade food? | R08 with source |
| 20 | What do outside caterers need? | R06 with source |

Desktop/mobile browser checks cover editing event names/dates during review, persistence after refresh and reset, owner changes/rejection, risk counts/reasons, channels and four status entrypoints, ordinary-officer permissions, explicit fallback labelling when AI is off or the server fails, and rejection of invalid output.

## Juanxi's four-step acceptance

Preview: https://deploy-preview-1--platypus-officer-hub.netlify.app/#/ (Netlify login still required).

1. Select **Reset demo**. Enter command 1 on Today and select **Review changes**. A change card should appear while the event count remains two. Check/edit **Event date**; only **Apply this change** should add the third event.
2. Select **Draft reminder** on the first **Needs a nudge** item. It should show Sam, preferred WhatsApp, five short sections, a word count no higher than 100, and four status entrypoints. Selecting Text message / Gmail changes the open-draft button. No actual sending is needed.
3. Close the draft and inspect **Current / Next 1 / Next 2** on the event strip. Networking Night's Current should be the flyer. Selecting a step shows its owner and three dates. Semester goals and the weekly-recognition scoring basis appear below.
4. Use **View as** to select Maya. Reminder buttons should disappear from risks, and change approval should be unavailable. Finish with **Reset demo**.

## Known boundaries and WP3 handoff

- The four status entrypoints currently open a preview of the corresponding task and explicitly say no status has changed. Actual claiming, completion, waiting, help, and draft-backed extensions belong to WP3, as planned.
- Reminder timing only tells the person their preferred time and the 8:00–22:00 window. This implementation opens drafts without automatic sending or background timers; the demo clock and silence protocol belong to WP3.
- No real DeepSeek/AIR calls were made locally; mocked-provider tests are not provider measurements. Deployed freeform requests use the existing adapter. Configuration failure clearly labels local demo fallback; unrecognized commands ask the person to rephrase.
- WhatsApp/text/Gmail links and contents were checked automatically. Juanxi must verify the external apps' actual appearance and SMS compatibility on his devices. No real send/delivery test was performed.
- Browser View as demonstrates permissions, not real login. Real authentication remains v1.5 work.
- `ChangeSet.reviews` is optional; the existing schema version did not change. WP3 can reuse manual send confirmations and `response` in `nudges` for stop-reminder behavior and silence escalation. Status changes need tests.
- GitHub `v1` is the source of truth. `/private/tmp/platypus-officer-hub-wp2` is a connector-downloaded snapshot with independent local history; do not push that unrelated history to the remote. The next contributor should freshly clone `v1` or continue through the connector.
