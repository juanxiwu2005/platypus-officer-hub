# WP4 Settings and Teams:

2026-10-22，ChatGPT。The working branches are `v1`, `main` and `/legacy/` unchanged.

## Completed

- President Five-Step Settings: Standing Organization and ASU Tempe, 2–3 digital targets, roll templates and generic functions, invitation and presentation configurations, first event. Support for increase or decrease of role and change of name; Officer name can be filled in item by item (form import left to v1. 50).
- Step 4 saves Calendar links, Gmail/WhatsApp channels, planning instructions, folder links and small projectal files as confirmed by Juanxi. Could not close temporary folder: %s Documents are local attachments only, AI does not read files; The description and the roll map are checked.
- `/api/command` and local fallback are used in step five to accept only one new active operation; AI date discarded. A person confirms the date and properties of the activity and uses a `buildEventNodes()`/ `applySchedule()` preview and generation. Cancel the non-writing of data; The final button clearly indicates that you will replace the local presentation workspace, which is checked for confirmation. After completion, the objectives are zero and old tasks, records, applications and invitations lapse.
- Office of the Independent Mobile Phone Page `/#/join?invite=…`: Five messages, career goals/interests/desirations with optional weekly free time. Invitations are limited to the site identity demonstration of the browser; Does not represent live login or cross-equipment authentication.
- The setup page can modify the target target, role name and function, presentation configuration, student buffer and follow-up days; Only the president/ vice present may be changed. Each person only edits his or her preferences, his or her busy schedule and personal buffers. Turn off the personality and switch to a standard one-day buffer. The date re-counting remains with the rule engine, and the official ASU date remains unchanged. Others hide a numerical explanation for their personal buffer when looking at the task.
- Team page: Future 14 day workload slots and block-by-item basis, contribution list and source, meeting space. Light/medium/heavy workload counts 1/2/3 points, 0–3 for Light, 4–7 for Balanced, 8+ for Heavy; Do not show working hours, do not rate with personal buffers. The contribution follows WP3 to complete the record and to re-examine and display and list it; The old demo scores are aligned to the established formula (the light task is completed on time with 2 points); The original recheck only updates the presentation score expectations and tests behaviour retention.
- The meeting searches only for the weekly free hours filled out by the office itself, avoiding busy weeks, ASU closing days, end-of-cycle weeks and school holidays. Displays a maximum of three non-overlapping time periods; Calendar button opens only the draft calendar of Arizona time and does not send invitations.
- Role Synchronizes the name to the action flow lanes, role menus, group pages, setup pages and Handoff 's role manual directory. The full AI manual and leadship translation are still WP5; The catalogue was not described as a full manual.

## What? Acceptance (approximately 5 minutes)

Preview: [ WP4 settings page ](https://deploy-preview-1--platypus-officer-hub.netlify.app/#/settings), requires login to Netlify.

1. **Replay setup** and start timing; Change the name of student organization, gradually Continue. The fourth step is to look at the channels, links and plan attachments to the field; Step 5 **Prepare first workworkflow**, confirm date, check and click **Approve & start workspace**. Should go into Events and see the first flow chart. This operation replaces the demonstration data; Reset demo at any time. Please record whether your first departure is less than five minutes; The speed of the program cannot be a substitute for the live first time.
2. Settings: Replace the second Rowe Title with **VP of Finance** **Save club settings**. Events should see the name of the new swimming lane, Handoff should see **VP of Finance handbook**.
3. Settings → **Invite officers** → **Try officer setup**。Choose Maya, rechannel/morning/ busy week, save five questions. **View my tasks as Maya Chen**; Back to Settings should only see Maya's personal preferences. Confirm if the cell phone has been completed in less than two minutes.
4. Team — Workload, source of contributions. Bottom default 2026-10-22, all officers should share three and a half hours from 18:30. Changed to 2026-12-08 should state that the end of the week etc. was inconclusive. Don't send invitations.
5. **Reset demo**. Shouldn't be used for each update; The old setting invitation will expire.

## Validation Results and Limits

- `npm run check`: build, 174 unit tests, 76 computers/cellbrowser tests The original 146 unit tests and 62 browser tests retained. Adds a check to overwrite settings, rule dates, AI date discards, private buffers, invitations to reset, file limits, meeting overlaps, five-step process and roll rename.
- The page check script is five steps and five questions in two dimensions, with a maximum of five minutes/two minutes; This only proves that the process can be completed and that those who have not yet used it for the first time also meet their time targets.
- (a) Up to three per 512 KB, total 1 MB; Saves the current browser, emptys the browser or Reset demo and removes it. Do not release research data or live personal information.
- Currently is a local presentation: View as can be used to switch field identities; Privacy display rules are not server accounts. Neither invitations nor task links support cross-browser/equipment; Live account read but not done, in accordance with this decision.
- AI interface tested with analogue response and failure fallback, live DeepSeek/AIR free expression quality still needs to deploy environmental validation; There has been no change in the way suppliers are configured.
- Meeting time was based on self-reported spare time and was not aware of actual calendar conflicts. The default school is ASU Tempe.
- Build through; There are volume tips for individual files that exceed 500 KB and do not affect functionality. The resources can then be split by page.

## WP5. Pick it up from here.

- The demonstration schema vension is **4**, and the old structure restores the seeds. `src/pages/Setup.tsx`, `Join.tsx`, `Settings.tsx`, `Team.tsx`; Share forms on `src/components/SettingsForms.tsx`.
- Set authentication and writing in `src/data/settings.ts`; `saveClubSettings`/ `saveProfile`/ `completeSetup` of the store. Do not send the entire state directly to AI. It contains personal settings, local attachments and a demonstration signature.
- `org.workspace` save demonstration configuration; `org.inviteCode` Replace when reset or complete new settings. Handoff currently has only a directory of manuals synchronised with rale, and WP5 continues to complete the manual translation and handbook.
- `src/engine/team.ts` Management of workload, aggregation of contributions and cross-fertilization of meetings. The date of the meeting is a date selected by the person and the end-of-mission date is still calculated by `schedule.ts`. There are no new ASU rules, so `docs/RULES.md` remains unchanged.
- `/private/tmp/platypus-officer-hub-wp4` is not GitHub original history; The remote file has been verified and submitted to the parent on the `v1` mouth with GitHub up the handoff. Don't push this temporary repository independent history to the far end.
