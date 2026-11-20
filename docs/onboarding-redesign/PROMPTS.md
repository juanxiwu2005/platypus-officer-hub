# Onboarding redesign: prompts for three stages

> Companion files: [`WORK_PACKAGES.md`](WORK_PACKAGES.md) (division/parallel work), [`../ONBOARDING_REDESIGN_STRATEGY.md`](../ONBOARDING_REDESIGN_STRATEGY.md) (design).
> Uses v1.6's "integrator prompt + execution-agent prompt" structure (end of `../design-upgrade/PHASES.md`).

## 0. Who uses these prompts

| Who | Uses | Form |
| --- | --- | --- |
| **Juanxi → me (integrator, this chat)** | **Stage prompts**, Section 1; Juanxi pastes one per stage | Short: stage/prerequisites only, details in repository |
| **Me → execution agents (worktree subagents)** | **Execution prompts**, Sections 2–4; I generate/send, Juanxi need not write | Long, one self-contained prompt per package; subagents begin with no context |

**Why not separate Juanxi-opened chats:** package branches exist only in local worktrees, merged by integrator via `--no-ff`; separate sessions cannot see each other's local branches, and this chat cannot push other branches (`design-upgrade/ROLLBACK_LOG.md`). Integrator must create agents/worktrees in same environment.

**Stage mapping:** stage 1 = wave 0 (OB-01,02,03); stage 2 = wave 1 (OB-04…08); stage 3 = waves 2+3 (OB-09,OB-10).

## Seven prompt principles

1. **Self-contained.** Subagents lack context: specify identity, reading, worktree, ports.
2. **Point, do not duplicate.** Rules/design in repository; refer to sections so prompts survive document edits.
3. **File allowlist.** Explicit allowed files; stop/ask before crossing, never silently edit; foundation of conflict-free parallel work.
4. **Freeze interfaces.** Parallel packages code to identical interfaces (e.g. logging function names); specify instead of guesswork.
5. **Evidence defines completion.** Not "make it prettier": green commands + new test + failing reverse verification.
6. **Explicit stop conditions.** Shared-file/schema/dependency changes, or passing only by weaker tests: stop/report.
7. **Honest reports only.** Unverified section mandatory; final reply only branch/commits/test results/report path.

---

## 1. Stage prompts (Juanxi to integrator)

### Stage 1 (wave 0: foundation)

```
Begin Onboarding stage 1: OB-01 shell/routes, OB-02 logging, OB-03 first-visit gate.
Q2–Q6 follow strategy recommendations. 11/6 is a reference date.
You are integrator. Read CLAUDE.md-required files, then docs/ONBOARDING_REDESIGN_STRATEGY.md,
docs/onboarding-redesign/WORK_PACKAGES.md and PROMPTS.md.
Follow PROMPTS.md "Stage 1 integrator prompt": parallel OB-01/OB-02 worktrees,
then OB-03 after merge. Stop afterward; give welcome preview URL and three acceptance sentences.
```

### Stage 2 (wave 1: flow A and member preview)

```
Begin Onboarding stage 2: OB-04…OB-08. I accepted stage 1 (or: stage 1 feedback …).
Follow PROMPTS.md "Stage 2 integrator prompt": at most 4 concurrent worktrees, OB-06 first.
Register each merge in ROLLBACK_LOG. Stop afterward; give preview for complete president walkthrough.
```

### Stage 3 (waves 2+3: connect, switch, finalize)

```
Begin Onboarding stage 3: OB-09,OB-10. Stage 2 feedback handled (or: feedback …).
Follow PROMPTS.md "Stage 3 integrator prompt". For OB-10, switch only what I specify now:
President flow A: <switch / retain>; member preview B: <switch / retain>.
Stop afterward; give final acceptance checklist.
```

---

## 2. Stage 1 prompts

### 2.1 Integrator prompt (stage 1)

```
You are integrator for Onboarding stage 1. Read AGENTS.md, docs/ONBOARDING_REDESIGN_STRATEGY.md (Sections 0,2b,5,7),
docs/onboarding-redesign/WORK_PACKAGES.md, this file.
1. Confirm claude/determined-johnson-yrdxwf includes origin/main; npm ci && npm run check all green.
   Otherwise stop/tell Juanxi, no incidental fixes. Local tag ob/phase-1-before.
2. Create OB-01/OB-02 worktrees (../platypus-ob-01, ../platypus-ob-02,
   branches design/ob-01-shell, design/ob-02-record from integration branch), launch parallel agents with 2.2/2.3 prompts.
3. Wait for both. Review diffs: only allowed files? Weakened old tests? Raw colors/milliseconds/!important?
   Return deficient work; do not silently fix it yourself.
4. Merge OB-02 then OB-01 (--no-ff, local ob/ob-NN-merged tags, register docs/onboarding-redesign/ROLLBACK_LOG.md,
   created by OB-01). Full npm run check after merge.
5. Do OB-03 yourself (2.4, small, no subagent), worktree ../platypus-ob-03, same --no-ff merge.
6. End-stage full npm run check (Node 22). Failures: bisect tags, identify package, R2 revert, tell Juanxi.
7. docs/PROGRESS.md handoff: changes, parameterized preview URL/clicks, unverified, each rollback.
   Include "Local backup sync required". Push claude/determined-johnson-yrdxwf only; no main/other branches.
8. Stop for Juanxi acceptance.
```

### 2.2 Execution prompt: OB-01 shell/routes

```
Execution agent, one package only: OB-01 "Shell/routes".

## Read first, in order
1. AGENTS.md Sections 3,7,7.1; all docs/DESIGN_TOKENS.md.
2. docs/ONBOARDING_REDESIGN_STRATEGY.md Sections 2,3.2,3.4,4.2,5.
3. docs/onboarding-redesign/WORK_PACKAGES.md Sections 2,5, OB-01 row.
4. src/pages/Setup.tsx (owned state), src/pages/Join.tsx, src/App.tsx, src/components/Layout.tsx.

## Location
worktree ../platypus-ob-01; branch design/ob-01-shell; npm ci first.
PW_PORT=5201 PW_STORAGE_PORT=5301 WORDS_PORT=5401. Use PW_CHROMIUM without preinstalled browser.
**Do not push** (unavailable). Commit "[OB-01][Claude] …"; integrator merges.

## Tasks
1. Focused src/onboarding/shell/: no sidebar/Ask/View as/AI toggle; top progress chain/Exit (Save & exit);
   mobile primary anchored bottom (translucent overlay, solid under reduced transparency).
2. Pure step state machine src/onboarding/engine/: forward/back/skip/resume; skipped steps revisitable;
   **report enter/leave/back/skip/complete/exit only via injectable onEvent(step, event),
   import no logging module** (OB-02 parallel, OB-03 wires them). Unit coverage.
3. Progress indicator resembles existing Chain; passed line scaleX growth, --spring-pop dots, skipped hollow dashed;
   animate only forward, immediate reduced-motion display.
4. Shared founder draft src/onboarding/draft.tsx consolidates Setup.tsx state (step, ClubDraft, steps, buffer, sentence,
   constitution doc, reading, event, date, inviteCode, etc.; **check each, omit none**); all screens use it.
   Retain 7-day IndexedDB setup-draft recovery. **Later packages cannot edit this file; include all fields now.**
5. Amber Demo bar "Previewing as someone · Change", matching site Demo pill.
6. src/onboarding/copy.ts: all English copy from strategy Sections 3,4,6 (later packages reference/append keys in owned blocks).
7. Build routes once in src/App.tsx: /welcome (placeholder entry), /welcome/classic (old Setup in shell),
   /welcome/classic-join (old Join in shell), all future screen routes; **one placeholder file per screen**
   (founder/Name,Constitution,Goals,Team,FirstEvent,Confirm,Invite; member/Invitation,You,Reminders,BusyWeeks,About,Done;
   gate/Welcome), each exports only "Coming soon". Later packages replace files, never App.tsx.
8. Shell styles src/styles/ob-00-shell.css; empty ob-04…ob-09 CSS files (names in WORK_PACKAGES),
   ordered @import in src/styles/index.css.
9. e2e/ob-helpers.ts: helpers for /welcome, navigating steps, clearing local data.

## Allowed files only
new src/onboarding/**, src/App.tsx, new src/styles/ob-*.css, src/styles/index.css (@import only),
new e2e/ob-helpers.ts, e2e/ob-01-*.spec.ts, src/test/onboarding*.test.ts,
new docs/onboarding-redesign/ROLLBACK_LOG.md, docs/onboarding-redesign/reports/OB-01.md.
**Do not edit:** old Setup.tsx/Join.tsx (reference only), store.tsx (OB-02), Layout.tsx, DemoMenu.tsx (OB-03),
styles.css, PROGRESS.md, AGENTS.md, DESIGN_TOKENS.md, playwright.config.ts.

## Restrictions
English interface; color/type/radius/stack/duration/easing tokens only; no !important/transition: all/raw milliseconds; transform/opacity only;
interruptible/reduced-motion animations; no /api/org/*,/api/workspace* or new AI endpoints; no real data/keys; no SCHEMA_VERSION/existing localStorage key changes.

## Evidence
- npm run lint/build/test all green.
- Old pages unchanged: setup/join/a11y specs in npm run e2e green desktop+mobile, no weaker assertions.
- New e2e/ob-01-shell.spec.ts: no sidebar/Ask; old setup completes at /welcome/classic; Back/Skip/resume;
  axe, dark, no reduced-motion displacement. Each new guard includes intentionally failing sample.
- git diff --stat contains only allowlisted files.

## Stop conditions
Unauthorized file changes, Setup state cannot consolidate cleanly, dependency needed, old tests only pass if weakened.
Stop/report; no bypass.

## Delivery
docs/onboarding-redesign/reports/OB-01.md: changes / acceptance clicks / unverified (physical devices,Safari) / issues / rollback.
Final reply only branch, commits, results, report path.
```

### 2.3 Execution prompt: OB-02 logging

```
Execution agent, OB-02 "Logging" only.

## Read first
1. AGENTS.md Section 3; docs/ONBOARDING_REDESIGN_STRATEGY.md Sections 2b,7.
2. docs/onboarding-redesign/WORK_PACKAGES.md Sections 2,4,5.
3. LOG_KEY/loadLog/saveLog/buildExport/downloadExport/reset in src/data/store.tsx; LogEntry in src/data/types.ts.

## Location
worktree ../platypus-ob-02; branch design/ob-02-record; PW_PORT=5202 PW_STORAGE_PORT=5302 WORDS_PORT=5402.
No push; commit "[OB-02][Claude] …".

## Task: local onboarding logging (pure logic, no UI)
- New key (e.g. platypus.v1.onboarding), separate from platypus.v1.log; Reset demo preserves it; no SCHEMA_VERSION/DemoState changes.
- **Agreed interface, do not rename** (OB-03 calls it):
  ```ts
  // src/lib/onboardingRecord.ts
  export type OnboardingEvent = "enter" | "leave" | "back" | "skip" | "complete" | "exit"
  export function hasSeenWelcome(): boolean
  export function markWelcomeSeen(): void
  export function rearm(): void                          // Reset demo: re-enable entry, preserve records
  export function startAttempt(entry: "start" | "explore", flowVersion: string): string   // Returns attemptId
  export function recordStep(attemptId: string, step: string, event: OnboardingEvent): void
  export function finishAttempt(attemptId: string, outcome: "completed" | "exited" | "explored"): void
  export function loadOnboardingRecord(): OnboardingRecord  // Export/tests
  ```
- Behavior only: attemptId, flowVersion, entry choice, screen events + millisecond timestamps, completion, exit screen, replay count.
  **No typed text.** Bound count to avoid localStorage exhaustion, oldest first.
- Blocked browser storage: no throws; hasSeenWelcome falls back to session-memory flag.
- **Only two store.tsx changes:** top-level onboarding in buildExport (formatVersion stays 1); reset calls rearm().
  Only this package may edit store.tsx.

## Allowed files
new src/lib/onboardingRecord.ts, src/test/onboardingRecord.test.ts, src/data/store.tsx (two changes only),
**necessary** existing export-test expectations (equally strict new-field assertions, explain in report),
new docs/onboarding-redesign/reports/OB-02.md.

## Restrictions
Same as OB-01, plus no data reporting anywhere/no network requests.

## Evidence
lint/build/npm test green; units cover attempts/replays/count cap/blocked storage/export onboarding,
Reset preserves history but hasSeenWelcome false/no input text in records.
Reverse check: deliberately put text content in event, test must fail.

## Stop conditions
Other store.tsx changes needed, external export-format consumers found, existing key change needed.

## Delivery: same as OB-01 (OB-02.md; final only branch/commits/results/path).
```

### 2.4 OB-03 first-visit gate (integrator)

```
OB-03 "First-visit gate". worktree ../platypus-ob-03, branch design/ob-03-gate, ports 5203/5303/5403.
Prerequisite OB-01/OB-02 merged.
1. src/onboarding/gate/Welcome.tsx: strategy 2b wireframe; primary Start walkthrough, secondary Explore the sample club.
   Start → startAttempt("start", flowVersion) → /welcome/classic (old setup until OB-10);
   Explore → startAttempt("explore") + finishAttempt("explored") + markWelcomeSeen → /.
2. First visit: enabled && no saved demo data && !hasSeenWelcome(). Default off; build environment flag (Netlify) + ?walkthrough=1 override for previews.
   Intercept before /, without Layout edits; blocked storage shows once per session.
3. Wire OB-01 onEvent to OB-02 recordStep.
4. DemoMenu.tsx: rename Replay setup to Replay walkthrough, /welcome/classic; log replays too.
5. Reserve welcome notice slot, **hide notice sentence by default**; Juanxi decides against IRB.
Tests: switch off leaves all old specs green/unchanged; on shows first-visit welcome, Explore then refresh hides, Reset restores;
matching records; desktop/mobile/a11y/dark.
```

---

## 3. Stage 2 prompts

### 3.1 Integrator prompt (stage 2)

```
Integrator, Onboarding stage 2. Read AGENTS.md, WORK_PACKAGES.md, this file, docs/onboarding-redesign/ROLLBACK_LOG.md.
1. Stage 1 merged/full npm run check green; tag ob/phase-2-before.
2. OB-04…OB-08 worktrees ../platypus-ob-NN, branches design/ob-NN-<short-name>, **max 4 concurrently**, OB-06 first;
   start fifth only after another delivers. Generate prompts from 3.2 template/table.
3. Review allowlist, old-test strength, raw colors/milliseconds/!important,
   intentional-failure samples for guards; return deficient work.
4. Merge ascending number --no-ff, tag/register ROLLBACK_LOG.md. Each merge lint/build/unit,
   full npm run check at wave end.
5. PROGRESS handoff, push, stop. Preview must support full president flow; specify clicks.
```

### 3.2 Execution template (OB-04…OB-08, fill fields)

```
Execution agent, one package OB-{NN} "{name}".

## Read
1. AGENTS.md Sections 3,7,7.1; docs/DESIGN_TOKENS.md.
2. docs/ONBOARDING_REDESIGN_STRATEGY.md Sections {sections},5,6.
3. docs/onboarding-redesign/WORK_PACKAGES.md Sections 2,5, OB-{NN} row.
4. src/onboarding/ (OB-01 shell/engine/draft.tsx/copy.ts/your placeholders).
5. {old reference code}

## Location
worktree ../platypus-ob-{NN}; branch design/ob-{NN}-{short-name}; npm ci first.
PW_PORT=52{NN} PW_STORAGE_PORT=53{NN} WORDS_PORT=54{NN}. No push; commit "[OB-{NN}][Claude] …".

## Tasks
{tasks}

## Allowed files
{exclusive files}
OB-01 created/routed placeholders; replace them, **no App.tsx/draft.tsx/existing copy.ts edits**
(copy.ts append only in owned block). Missing draft field: stop/report.

## Restrictions / evidence / stop conditions / delivery
Corresponding four OB-01 sections, plus:
- Visible English words ≤40 per screen ({special limit}).
- Every skippable screen includes Skip for now + where to find it later.
- Shell calls engine onEvent centrally; no screen-level logging.
- Own e2e: fastest/full path, back/skip/resume, desktop/mobile, axe, dark, reduced motion;
  motion tests disable reduced motion and sample frames (existing dx-*.spec.ts); intermediate values required.

Final reply only branch, commits, results, report path.
```

| Package | Name / short name | Strategy sections | Tasks (insert into prompt) | Exclusive files | Old references | Special |
| --- | --- | --- | --- | --- | --- | --- |
| OB-04 | Name + Constitution / `name-constitution` | 3.1 screens 1–2 | Club-name input/read-only school; three option rows (Use sample first / Upload / Paste) + Skip; reuse reading logic, results "AI suggested" into draft | `founder/Name.tsx`, `Constitution.tsx`, `ob-04-*.css`, `e2e/ob-04-*.spec.ts` | `ConstitutionStep.tsx`, `Setup.tsx` `startReading`, `lib/constitution.ts` | AI failures per strategy 6, no status codes |
| OB-05 | Goals + Team / `goals-team` | 3.1 screens 3–4 | Toggle/stepper goals; two-cell Role/Person rows (vacant allowed), org chart, collapsed duties; **no email/phone/ASU ID** (`fillEmails` for email) | `founder/Goals.tsx`, `Team.tsx`, `ob-05-*.css`, tests | `SettingsForms.tsx`, `OrgChart.tsx`, `data/structure.ts` | Desktop height target ≤1.5 screens |
| OB-06 | First event / `first-event` | 3.1 screen 5,3.2,5 (reveal) | Sentence/examples → chain draws (`schedule.ts` dates) → buffer segments (dates update immediately) → collapsed Event details; **one interruptible reveal, reduced motion immediate whole display** | `founder/FirstEvent.tsx`, `ob-06-*.css`, tests | `Setup.tsx` `prepare`, `data/settings.ts` `completeSetup`, `lib/commands.ts` | **Largest/hardest, first**; 60 words; engine dates only, no AI dates |
| OB-07 | Member preview first half / `member-invitation` | 4.1 screens 0–2,4.2 | Invitation enlarged role card, You prefilled confirmation, Reminders channel rows/Morning-Evening/example bubble; Demo bar | `member/Invitation.tsx`, `You.tsx`, `Reminders.tsx`, `ob-07-*.css`, tests | `Join.tsx`, `SettingsForms.tsx` `ProfileForm`/`RoleCard`, `data/settings.ts` `saveProfile` | Sample-club invitation in development; **no ASU ID**; phone only WhatsApp/SMS with purpose |
| OB-08 | Member preview second half / `member-finish` | 4.1 screens 3–5 | Week strip (calendar finals/breaks), three suggestion-chip questions on one skippable screen, Done joins name to org chart/first task | `member/BusyWeeks.tsx`, `About.tsx`, `Done.tsx`, `ob-08-*.css`, tests | `engine/calendar.ts`, `ProfileForm` | Busy weeks Monday (`validateProfile`); droppable package, fallback old `ProfileForm` |

---

## 4. Stage 3 prompts

### 4.1 Integrator prompt (stage 3)

```
Integrator, Onboarding stage 3. Read AGENTS.md, WORK_PACKAGES.md, this file, ROLLBACK_LOG.md.
1. Stage 2 merged/full npm run check green; tag ob/phase-3-before.
2. OB-09 first (integration, sequential; optional one worktree subagent with 4.2, then line-by-line review).
3. After OB-09 merge do OB-10 yourself (4.3, no subagent).
4. Switch only as Juanxi specifies now: independent A/B switches, unspecified flow keeps old screens.
5. End-stage full npm run check (Node 22); before/after dx-shots (old pages pixel-identical, only /welcome new);
   rollback rehearsal (OB-10 then OB-09…, tsc passes, byte-identical to stage start).
6. PROGRESS handoff + small AGENTS.md "onboarding entries/logging" section (integrator only).
   Include "Local backup sync required". Push, stop, final acceptance/freeze notes (active combination/flowVersion at freeze).
```

### 4.2 Execution prompt: OB-09 confirm/invite/connect/tips

```
(Use 3.2 template, OB-09, branch design/ob-09-confirm-invite, ports 5209/5309/5409; OB-06/OB-07 merged.)
Tasks: ①Confirm summary + Start workspace / Keep current demo; **no** replacement warning on first entry, only Demo replay;
②Invite reveal: Copy link / WhatsApp / Email (prefilled messages only, no automatic sends, explicitly stated) + permission sentence + Invited/Joined;
③First-visit primary See what your officers will see → member preview OB-07/08 → Today;
④At most 3 one-time Today tips, adjacent to subject, click dismiss permanently; src/onboarding/tips/ with own mount,
  no page changes beyond Today.tsx; **stop/ask integrator before Today.tsx edits**; npm run words within limits.
Exclusive founder/Confirm.tsx,Invite.tsx,src/onboarding/tips/**,ob-09-*.css,tests.
Droppable: ④.
```

### 4.3 OB-10 switching/hardening/finalization (integrator)

```
1. Independent A/B switches (build flag + ?walkthrough=1), set per Juanxi; R1 disables entry to restore today.
2. flowVersion (e.g. ob-1) recorded; PROGRESS at freeze.
3. Desktop/mobile/light/dark/reduced motion/reduced transparency; axe/word budgets; old specs green without weakening.
4. Logging e2e: complete flow, Export my data onboarding complete/no typed text; Reset retains logs/re-enables entry.
5. Guard: zero /api/org or /api/workspace requests throughout, existing assertion style.
6. Rollback rehearsal, before/after shots, docs/freeze (4.1 items 5–6).
```
