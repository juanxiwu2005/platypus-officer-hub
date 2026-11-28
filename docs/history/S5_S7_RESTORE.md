# S5–S7 restore guide (November 23, 2026)

Juanxi approved removing these parts on the condition that they can be restored from earlier versions. Git keeps every version, and each package came in through its own merge commit on `claude/fervent-thompson-e2j5u2`.

- **Last commit before S5–S7 code changes:** `b385487`. Production `main` at `db1a0be` (Preview 14) also has all of it.
- **Restore a whole package:** `git revert -m 1 <merge commit>` (listed below), resolve conflicts with later work, run the checks.
- **Restore single files:** `git checkout b385487 -- <path>` and re-add imports/routes.
- **Saved data:** no package changed `SCHEMA_VERSION` or removed stored fields. Goals, career goal/interests/expectations, workspace links/files and other values the UI no longer edits are still in saved data.

## S5 — Help archived (merge `c56d8cd`)

`src/pages/Help.tsx` moved to `src/archive/help/Help.tsx`; see `src/archive/help/README.md` for the restore steps (route in `src/App.tsx`, footer item in `src/routes.ts`, `/help` row in `scripts/word-count.mjs`, Ask suggestions row in `src/lib/assistant.ts`). `/help` and `/help/*` now redirect to `/`.

## S6-A — onboarding: three founder screens, four member screens, `FLOW_VERSION` ob-6 (merge `5bb118b`)

| Removed | Where it lived |
| --- | --- |
| Goals screen (goals + required mission) | `src/onboarding/founder/Goals.tsx`, `founder/goals/suggestions.ts`, Goals CSS |
| Confirm screen (Start workspace now on Team) | `src/onboarding/founder/Confirm.tsx`, `founder/confirm/summary.ts` |
| Separate Constitution screen (now "Import roles from your constitution" on Team; reading logic kept) | founder flow step in `src/onboarding/engine/flows.ts` |
| Member "You" and "About you" screens (name/email moved to Invitation; career fields no longer asked) | `src/onboarding/member/You.tsx`, `member/About.tsx` |
| Classic Join page (`/join` now opens the member flow) | `src/pages/Join.tsx` |
| Legacy setup-draft importer and its entry, "Coming soon" catch-all | `src/onboarding/gate/SetupEntry.tsx`, `gate/legacySetup.ts`, `gate/ComingSoon.tsx`, `src/test/legacySetup.test.ts` |
| Name preview card, school line, "Not you?", draft `restore()` | onboarding screens |

Redirects (`src/onboarding/gate/Redirect.tsx`): old Constitution/Goals/Reminders/Confirm steps → Team; First event → screen 1; You → Invitation; About you → Done; `/welcome/classic`, `/welcome/setup`, `/setup` → screen 1; `/join?…`, `/welcome/classic-join?…` → member Invitation; unknown `/welcome/*` → `/welcome`. Research: `FLOW_VERSION` ob-6 is documented in `docs/PHASE3_DATA_DICTIONARY.md`; older records still export the same answers (`firstEventStep` in `src/lib/onboardingRecord.ts`). Without a mission from the walkthrough, `completeSetup` stores the default "Plan events together and follow through." (a constitution reading's mission is kept).

## S6-B — slimmer Settings (merge `f4878aa`)

| Removed | Where it lived |
| --- | --- |
| Links & files tab (calendar link, messaging channel, Drive folder, planning-file upload); Planning notes moved to Club; `?tab=links` opens Club | `src/pages/Settings.tsx`, `WorkspaceEditor` in `src/components/SettingsForms.tsx`, `settingsNav.ts` |
| Semester goals editing | `GoalsEditor` in `src/components/SettingsForms.tsx` |
| Club line "Task due follows this length; club buffer applies to ASU event deadlines." (rare day settings now behind "More") | `src/pages/Settings.tsx` |
| Workflow Save draft button and the Teams panel | workflow library components, `WorkflowTeams.tsx` and its test |
| Roles & teams chart legend | `.rt-legend` CSS |
| My preferences numbered headings, career goal/interests/expectations fields, long buffer explanation and demo hints | new `src/components/settings/MyPreferencesForm.tsx` replaces the old form in Settings |

Version controls moved behind a "Versions" disclosure; canvas day labels "T0/T+N" now read "Event day / Event day + N". Replay setup stays (it differs from Demo → Replay walkthrough, which records a study attempt).

## S7 — copy pass (merge `1c52c22`)

About 85 user-facing strings across 38 files were shortened or removed (Team, Meeting finder, Handoff, Ask rail and assistant replies, Task Details messages, forecast assumptions, engine notes, Follow-up). No behavior, AI prompt or server contract changed. To restore wording, revert the merge or check out individual files from `b385487`.
