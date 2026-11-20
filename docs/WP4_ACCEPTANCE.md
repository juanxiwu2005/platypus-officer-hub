# WP4 setup and team: acceptance and handoff

October 22, 2026 · ChatGPT. Work branch: `v1`; `main` and `/legacy/` were not changed.

## Completed

- Five-step president setup: organization/ASU Tempe, 2–3 numeric goals, role templates/generic functions, invitations/demo configuration, and the first event. Roles can be added/removed/renamed and officer names entered individually; spreadsheet import remains v1.5 work.
- As Juanxi confirmed for this package, step 4 saves a Calendar link, Gmail/WhatsApp channel, planning notes, folder link, and small fictional planning files. It performs no login, account reading, or connector authorization. Files stay local and are not read by AI; people review notes and role mappings.
- Step 5 reuses `/api/command` and local fallback, accepting one create-event operation only and discarding AI dates. A person confirms date/properties before `buildEventNodes()` / `applySchedule()` previews/generates the event. Cancelling writes nothing. The final button explains that it replaces the local demo workspace and requires a confirmation checkbox. Completion resets goal progress to zero and invalidates old tasks, records, requests, and invitations.
- Separate officer mobile page `/#/join?invite=…`: five information groups, including career goals/interests/expectations, plus optional weekly availability. Invitations demonstrate fictional identities within the same browser; they are not real login or cross-device authentication.
- Settings allows leaders to edit organization goals, role names/functions, demo configuration, club buffers, and follow-up days. Only president/VP can change these. Each person edits only their own preferences, busy weeks, and personal buffer. Disabling personalization uses the standard one-day buffer. Only the rule engine recalculates dates; official ASU dates remain fixed. Other viewers do not see the numerical personal-buffer explanation on tasks.
- Team shows workload bands for the next 14 days with itemized evidence, contribution rankings/sources, and common meeting availability. Light/medium/heavy work counts 1/2/3 points: 0–3 Light, 4–7 Balanced, 8+ Heavy. It does not display hours or score personal buffers. Contributions reuse WP3 completion records, deduplicate, and show ties. Seed scores were aligned with the existing formula: an on-time light task earns 2 points. Existing deduplication tests retain their behavior; only expected seed scores changed.
- Meeting search uses officers' self-reported weekly availability, excluding busy weeks, ASU closures, finals, and semester gaps. Show at most three non-overlapping slots. Calendar opens an Arizona-time draft without sending invitations.
- Role renaming propagates to event lanes, role menus, Team, Settings, and Handoff's handbook directory. Full AI handbooks and transition seasons remain WP5; the directory is not presented as a complete handbook.

## Acceptance, approximately five minutes

Preview: [WP4 Settings](https://deploy-preview-1--platypus-officer-hub.netlify.app/#/settings), requiring Netlify login.

1. Select **Replay setup** and start timing. Change the organization name and Continue through the steps. Inspect channels, links, and fictional planning attachments in step 4. In step 5 select **Prepare first workflow**, confirm the date, check confirmation, and select **Approve & start workspace**. Events should show the first workflow. This replaces demo data; Reset demo restores it. Record whether a first-time walkthrough takes under five minutes; automated speed does not substitute for a person's first-use measurement.
2. Settings → rename the second Role title to **VP of Finance** → **Save club settings**. Events should show the renamed lane, and Handoff should show **VP of Finance handbook**.
3. Settings → **Invite officers** → **Try officer setup**. Choose Maya, update channel/morning-evening/busy weeks, and save the five questions. Select **View my tasks as Maya Chen**. Back in Settings, only Maya's personal preferences should be editable. Check whether the mobile flow takes under two minutes.
4. Team → expand workload/contribution sources. On the default 2026-10-22 date, all officers should share three half-hour slots starting at 18:30. Set 2026-12-08: it should explain finals-related unavailability and return no slots. Do not send an invitation.
5. Finish with **Reset demo**. Refresh should not reopen setup each time, and old setup invitations should be invalid.

## Verification and limits

- Local `npm run check`: build and all 174 unit / 76 desktop-mobile browser tests passed. All previous 146 unit / 62 browser tests remain. Added checks cover setup permissions, rule-calculated dates, AI-date rejection, private buffers, invitation reset, file limits, meeting intersection, the five steps, and role renaming.
- Automated desktop/mobile walkthroughs complete the five steps/questions within five-/two-minute caps. This establishes flow completion, not first-time human performance.
- At most three planning files, 512 KB each and 1 MB total, stored in the current browser. Clearing browser data or Reset demo removes them. Never use research material or real personal information.
- Local demo only: View as switches fictional identities; UI privacy rules are not server-account authorization. Invitations/task links are not cross-browser/device. Real account access was not implemented, as agreed.
- AI tests use mocked replies and failure fallback. Live DeepSeek/AIR freeform quality still needs deployed validation; provider configuration did not change.
- Meeting results use reported availability and cannot detect actual calendar conflicts. Default campus: ASU Tempe.
- Build passed with a warning for one file exceeding 500 KB. This did not block the feature; later page-level splitting can address it.

## WP5 starting points

- Demo schema **4**; older schemas restore seed data. Pages: `src/pages/Setup.tsx`, `Join.tsx`, `Settings.tsx`, `Team.tsx`; shared forms: `src/components/SettingsForms.tsx`.
- Validation/writes: `src/data/settings.ts`, through store `saveClubSettings` / `saveProfile` / `completeSetup`. Never send the full state to AI: it includes private settings, local attachments, and demo signing keys.
- `org.workspace` holds demo configuration. Reset/new setup rotates `org.inviteCode`. Handoff currently has the role-linked directory; WP5 supplies the full transition/handbook.
- `src/engine/team.ts` handles workload, contributions, and meeting intersection. People choose meeting dates; `schedule.ts` still calculates task deadlines. No ASU rules were added, so `docs/RULES.md` was unchanged.
- `/private/tmp/platypus-officer-hub-wp4` is not GitHub's original history. After remote-file verification, changes were sent through the GitHub commit API along `v1`'s existing parent. Do not push the temporary repository's independent history over the remote.
