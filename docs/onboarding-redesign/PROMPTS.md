# Onboarding Refinement: Three Phases Prompt

> Supporting documents: [ `WORK_PACKAGES.md` ](WORK_PACKAGES.md) (several and parallel), [ `../ONBOARDING_REDESIGN_STRATEGY.md` ](../ONBOARDING_REDESIGN_STRATEGY.md) (design).
> The structure of the 6 "Integrational Population Order + Implementation of the Agent Password" (at the end of `../design-upgrade/PHASES.md`).

## 0. Let's get this straight: who's it for?

| Who? | With what? | What do you look like? |
| --- | --- | --- |
| **Juanxi, me.**  | **stage password**, section 1: A small segment of each phase, Juanxi to me | Short. Just say, "What stage to start and what to suppose," details are in the document repository. |
| **I'm executing** | **Execution password**, sect. 2–4: Generated and sent by me, Juanxi does not need to write | Long. One bag, and you have to be self-sufficient because the son of an agent doesn't know anything at first. |

**Why not Juanxi open multiple windows and send one each:** work package only in the workingtree branch where it exists, by integrating people using `--no-ff` merge; Several independent sessions do not see each other 's local branches, and this session does not push another branch (`design-upgrade/ROLLBACK_LOG.md`). So executing agent must be driven by an integrated person using worktree in the same environment.

**corresponds to three phases:** stage 1 = Bo-0 (OB-01, 02, 03); Phase 2 = wave 1 (OB-04... 08); Stage 3 = wave 2 + 3 (OB-09, OB-10).

## Prompt how to write it.

1. **Self-sufficiency.** sub-agent doesn't know anything about it: who it is, what documents it reads, which worktree and what port.
2. **points the way, not copy.** rules and designs are written in repository documents, with passwords only "read which section"; That's how the file is changed. The password doesn't have to be changed.
3. **White List of Documents.** makes it clear "can only change these documents." Crossing the border and asking not to change it — this is the foundation of a parallel non-conflict.
4. **nail the interface to death. The** parallel package is programmed for the same interface (e.g., function name of the record module), so the interface writes an import order instead of allowing each agent to guess for itself.
5. **defines "finished" with evidence.** doesn't write "Take a good look" and says, "These orders are all green + this new test exists + reverse certification will turn red."
6. **says when to stop.** needs to change the common document, structure the data, depend on it and test it less — all stops to write the report.
7. **as long as the report is honest. The** report must have an unverified column; The final response is for branches, submission, test results and reporting lines only.

---

## 1. Stage password (Juanxi to integrationist)

### Stage 1 (wave 0: foundations)

```
Action.  Onboarding Phase  1：OB-01 Shells and routes, OB-02 Records, OB-03 First entry.
Q2–Q6 Recommendations by strategy document. 11/6 It's a reference day.
You're integrating people. Read first.  CLAUDE.md File requested. Read it again.  docs/ONBOARDING_REDESIGN_STRATEGY.md、
docs/onboarding-redesign/WORK_PACKAGES.md and  PROMPTS.md。
Press  PROMPTS.md It's... "Phase  1 Integration of population orders "Implementation: OB-01 and  OB-02 One each.  worktree In parallel,
Merge, we'll do it later.  OB-03。And when you're done, give me a preview of the page and three words of access.
```

### Stage 2 (wave 1: Process A and member preview)

```
Action.  Onboarding Phase  2：OB-04…OB-08。Phase  1 I'm already acceptance (or: phase)  1 The feedback is...  …）。
Press  PROMPTS.md It's... "Phase  2 Integration of population orders "Implementation: maximum at the same time  4 One.  worktree，OB-06 It's first.
Every single bag is registered.  ROLLBACK_LOG。Give it to me. "Walk through the president process "_Other Organiser
```

### Phase 3 (wave 2 + 3: connecting, switching, closing)

```
Action.  Onboarding Phase  3：OB-09、OB-10。Phase  2 feedback has been processed (or: feedback is  …）。
Press  PROMPTS.md It's... "Phase  3 Integration of population orders "Implementation. OB-10 Lee. "Which one? "According to what I said this time:
President Process  A：<Cut.  / No, no, no. >；Members' preview  B：<Cut.  / No, no, no. >。
When you're done, stop and give me the final list.
```

---

## 2. Stage 1 password

### 2.1 Integration Order (Phase 1)

```
You're integrating people. Onboarding Phase  1。Read it.  AGENTS.md、docs/ONBOARDING_REDESIGN_STRATEGY.md(Para. )  0、2b、5、7 Sections,
docs/onboarding-redesign/WORK_PACKAGES.md. This document.
1. Confirm  claude/determined-johnson-yrdxwf Already Mege  origin/main，npm ci && npm run check All green.
   If it's not green, stop telling.  JuanxiDon't do it yourself. "Take care of it. "。Local tab  ob/phase-1-before。
2. Yes.  OB-01、OB-02 One each.  worktree（../platypus-ob-01、../platypus-ob-02，
   Branch  design/ob-01-shell、design/ob-02-record, from an integrated branch)  2.2、2.3 The section's password starts in parallel.  agent。
3. Wait for both to be delivered. Case by case  diff: Just moving. "Files that can be changed "I'm sorry. Did you weaken the old test? There's no color, no milliseconds. !important？
   If you're not qualified, don't change yourself.
4. Let's go first.  OB-02Let's go again.  OB-01（--no-ffFight!  ob/ob-NN-merged Local tab, register  docs/onboarding-redesign/ROLLBACK_LOG.md，
   OB-01 This is a new document. Merge, back to full.  npm run check。
5. Do it yourself.  OB-03See you at the password.  2.4Don't need a son.  agentIt's very small. Yes.  worktree ../platypus-ob-03 The same thing.  --no-ff Merge.
6. End of phase complete.  npm run check（Node 22）。It's red: two points on the label, find out which package it is. R2 Get out of here. Tell me.  Juanxi。
7. Write.  docs/PROGRESS.md A stage handoff: what has been done, preview the site (with parameters) and dots, unverified rollback for each package.
   Write. "Need to sync local backup "。Push  claude/determined-johnson-yrdxwf。No touching.  mainDon't push another branch.
8. Stop! Wait!  Juanxi Acceptance.
```

### 2.2 Enforcement password: OB-01 shell and route

```
You're doing it.  agent, work package: OB-01Shells and Routes.

## Read it first. Read it first.
1. AGENTS.md Article  3、7、7.1 Section; docs/DESIGN_TOKENS.md(All)
2. docs/ONBOARDING_REDESIGN_STRATEGY.md Article  2、3.2、3.4、4.2、5 Section
3. docs/onboarding-redesign/WORK_PACKAGES.md Article  2、5 Sections and  OB-01 That line.
4. src/pages/Setup.tsx(Look what it holds) src/pages/Join.tsx、src/App.tsx、src/components/Layout.tsx

## Where are you?
worktree ../platypus-ob-01；Branch  design/ob-01-shell；First.  npm ci。
Port: PW_PORT=5201 PW_STORAGE_PORT=5301 WORDS_PORT=5401。When no preview browser is available  PW_CHROMIUM。
**Don't push**(PULLS UP) Submitting in branch, submitting information  "[OB-01][Claude] …", integrate the person will merge.

## Tasks
1. Focus on the shell.  src/onboarding/shell/: No sidebar, no  Ask Right column, no.  View as and  AI Switches; There's a progress chain in the top bar. Exit（Save & exit）；
   The main button on the mobile phone is bottomed (the surface is semi-transparent and less transparent, fallback solid).
2. Step state machine  src/onboarding/engine/: Pure function ——Forwards, returns,skip, restoration; skip steps can be counted back;
   **The engine only goes through one thing that can be injected.  onEvent(step, event) Report back.  enter/leave/back/skip/complete/exit，
   Don't.  import Any Record Modules **（OB-02 In parallel, OB-03 It's responsible for bringing them together. Unittes overwrite.
3. Progress chain indicator: using existing  Chain The look; It's for walking lines.  scaleX Grow up, dots.  --spring-pop；skip points are empty hollow lines;
   Only move as it moves forward, directly with reduced force effects.
4. shared context for the president draft  src/onboarding/draft.tsx: Put  Setup.tsx Existing State(s) step、ClubDraft、steps、buffer、sentence、
   constitution doc、reading、event、date、inviteCode Wait. **One by one, not one.**One harvest, all screens only read and write it.
   Continue with existing  7 Day Restoration (Cyber) IndexedDBkey  setup-draft I'm sorry, but I don't know what to do. **No change to this document is permitted in the other packages thereafter, so the field will be given at once.**
5. Demo Article(s) "Previewing as Some.  · Change"Amber, and the whole station.  Demo It's the same thing.
6. List  src/onboarding/copy.tsStrategy No. 1  3、4、6 In all the English cases that appear in this section, put them in first.  key Go to your own block.
7. Route: in  src/App.tsx It's built at once.  /welcome♪ Into the entrance, empty shell first ♪ /welcome/classic(old)  Setup "Into the outer shell,"
   /welcome/classic-join(old)  Join (b) the outer shell, and the route of each screen behind it; **Create an empty shell file per screen**
   （founder/Name、Constitution、Goals、Team、FirstEvent、Confirm、Invite；member/Invitation、You、Reminders、BusyWeeks、About、Done；
   gate/Welcome), each file is exported only one "Coming soon"Component. That way the bag in the back will only replace its own files and never touch them.  App.tsx。
8. Style: src/styles/ob-00-shell.css Write the shell; Respace File  ob-04…ob-09 It's...  cssOne each. See your name.  WORK_PACKAGES），
   And  src/styles/index.css Inside in order  @import。
9. e2e/ob-helpers.ts: Test assistant for the back bag (open)  /welcomeI'm going to take a step and empty my own data.

## We have to change these files.
src/onboarding/**(new), src/App.tsx、src/styles/ob-*.css(new), src/styles/index.css(only added)  @import）、
e2e/ob-helpers.ts(new), e2e/ob-01-*.spec.ts(new), src/test/onboarding*.test.ts(new),
docs/onboarding-redesign/ROLLBACK_LOG.md(new), docs/onboarding-redesign/reports/OB-01.md(new).
**Do not change:** Old  Setup.tsx / Join.tsx(Only quoted), store.tsx（OB-02 and the rest of the world) Layout.tsx、DemoMenu.tsx（OB-03 and the rest of the world)
styles.css、PROGRESS.md、AGENTS.md、DESIGN_TOKENS.md、playwright.config.ts。

## Can't do it.
English interface; Colours, character numbers, angles, layers, lengths, curves only  token；No writing.  !important、transition: all(a) Naked millisecond; Just move.  transform and  opacity；
Animation can be interrupted with a less dynamic version; Do Not Call  /api/org/*、/api/workspace*, do not add  AI Interfaces; do not release live data and secret key; I won't change.  SCHEMA_VERSION And any existing  localStorage key.

## How can we prove it?
- npm run lint、npm run build、npm test All green.
- Old page zero change: npm run e2e Lee.  setup、join、a11y Related  spec Desktop  + The mobile phone is still green (alleged that it cannot be relaxed).
- New Test  e2e/ob-01-shell.spec.ts: no sidebar and  Ask；/welcome/classic (a) It can be built after it has been established; Back/Skip/Rehabilitation;
  Accessibility ( axe）；(a) Dark colour; Reducing the immobility of dynamic effects. Every new guard. "Deliberate violation turns red. "A sample.
- Use  git diff --stat Self-examination: No documents other than the white list.

## The conditions for stopping.
Documents other than the list need to be changed; Found  Setup.tsx The state is not clean enough to fit into a context; Reliance is needed; It's only possible to weaken old tests.
Just stop when you meet, write in the report, and don't go around.

## Delivery
docs/onboarding-redesign/reports/OB-01.md: What has been done?  / What? Acceptance. / Not authenticated. Safari）/ Problems encountered  / Rollback way.
The final response only reads: branch name, submission list, test results, reporting path.
```

### 2.3 Enforcement password: OB-02 Record

```
You're doing it.  agent, work package: OB-02"Record."

## Read first.
1. AGENTS.md Article  3 Section; docs/ONBOARDING_REDESIGN_STRATEGY.md Article  2b、7 Section
2. docs/onboarding-redesign/WORK_PACKAGES.md Article  2、4、5 Section
3. src/data/store.tsx Yeah.  LOG_KEY、loadLog、saveLog、buildExport、downloadExport、resetand  src/data/types.ts It's...  LogEntry

## Where are you?
worktree ../platypus-ob-02；Branch  design/ob-02-record；PW_PORT=5202 PW_STORAGE_PORT=5302 WORDS_PORT=5402。
Do not push; Submit  "[OB-02][Claude] …"。

## _Other Organiser  onboarding Record module (pure logic, no interface)
- New  key(e.g.,  platypus.v1.onboarding) and existing  platypus.v1.log Separation; Reset demo I don't know about it. SCHEMA_VERSION and  DemoState Don't move.
- **The interface has been agreed. Do not change the name.**（OB-03 Will press it to:
  ```ts
  // src/lib/onboardingRecord.ts
  export type OnboardingEvent = "enter" | "leave" | "back" | "skip" | "complete" | "exit"
  export function hasSeenWelcome(): boolean
  export function markWelcomeSeen(): void
  Export fun action rearm(): void/ /Reset demo call: relight the entrance without deleting the record
  Export function startattempt (entry: "start", flyVersion: string): String/ / returns attachmentId
  export function recordStep(attemptId: string, step: string, event: OnboardingEvent): void
  export function finishAttempt(attemptId: string, outcome: "completed" | "exited" | "explored"): void
  Export function loadingRecord(): Onboarding Read/ / for export and testing
  ```
- Only act: attemptId、flowVersionAccess selection, every screen event.  + A millisecond pamphlet, whether or not it's finished, from which screen it exited, and the first replay.
  **Do not remember any text entered.** Maximum number of articles (prevent blasts)  localStorageThe old one's gone first.
- Browser block storage: all functions do not drop by mistake, hasSeenWelcome Degradation to "In this session "is the memory mark.
- store.tsx Lee. **Just two places.**：buildExport One more top-level field  onboarding（formatVersion Hold  1）；reset Incoming  rearm()。
  You're the only one allowed to change.  store.tsx The bag.

## We have to change these files.
src/lib/onboardingRecord.ts(new), src/test/onboardingRecord.test.ts(new), src/data/store.tsx(Only the two above),
Existing export tests **Yes.**(a) The expectation of updating (changed to a similarly rigorous new field, as indicated in the report),
docs/onboarding-redesign/reports/OB-02.md(new).

## Can't do it.
Same.  OB-01 It's... "Can't do it. "；In addition, no data are reported anywhere and no web request is made.

## How can we prove it?
lint / build / npm test Full green; unittes overwrite: multiple attempts, recounts, bar ceilings, storage blocked, exported  onboarding、
Reset demo The records are still in place.  hasSeenWelcome Yes.  false, no input text can be found in the record.
Reverse authentication: intentionally writing an event into the text and testing it to become red.

## The conditions for stopping.
It needs to be changed.  store.tsx Other parts; Finds that the export format has an external user; It needs to be changed.  key。

## Delivery: same as  OB-01(Report)  OB-02.md, the final response is only for branches, submission, test results, reporting path).
```

### 2.4 OB-03 First entry (integrated person)

```
Tasks: OB-03First-time entrance. worktree ../platypus-ob-03Branch  design/ob-03-gatePort  5203/5303/5403。
Preconditions: OB-01、OB-02 Already metge.
1. Welcome Page  src/onboarding/gate/Welcome.tsx: Strategy  2b ; the frame of the line; Start walkthrough(Major) / Explore the sample club(twice).
   Start → startAttempt("start", flowVersion) → /welcome/classicIt's the first time I've ever seen a woman in my life. OB-10 It's just a new process.
   Explore → startAttempt("explore") + finishAttempt("explored") + markWelcomeSeen → /。
2. First judgement: Switch on  && No demo data saved  && !hasSeenWelcome()。Switch default switch; Open with: Build Environment Variables (Build) Netlify）+ Website parameters  ?walkthrough=1 Overwrite (for preview).
   Yes.  / Stop at the front. Don't move.  Layout；Storage is blocked only once in this session.
3. Put it on.  OB-01 The engine.  onEvent Got it.  OB-02 It's...  recordStep。
4. DemoMenu.tsx："Replay setup" Change of name  "Replay walkthrough"Point  /welcome/classic；The replay is also recorded.
5. Welcoming the fact that there is a place on the page for the record, **Default does not show that sentence**；Whether or not to show wait  Juanxi Contrast  IRB Material decision.
Test: Old page zero change when the switch is closed (existing)  spec (a) Full green; Switch on: first time →Welcome page; Selection  Explore (b) Refurbishment no more bullets; Reset demo Then play it again;
(a) The corresponding event is recorded; Desktop  + Cell phone.  + Accessibility  + Dark.
```

---

## 3. Stage 2 password

### 3.1 Integration Order (Phase 2)

```
You're integrating people. Onboarding Phase  2。Read it.  AGENTS.md、WORK_PACKAGES.mdThe present document, docs/onboarding-redesign/ROLLBACK_LOG.md。
1. Identification phase  1 Mege already and  npm run check Full green; Fight!  ob/phase-2-before。
2. Yes.  OB-04…OB-08 Open.  worktree（../platypus-ob-NNBranch  design/ob-NN-<Short name >），**At most.  4 One.**；OB-06 It's first.
   The last one waits for any delivery. Use the first.  3.2 Sections templates and tables generate their own passwords.
3. Each delivery will be reviewed: diff Is it only in the white list? Was the old test weakened? Did you write the naked color? /Naked milliseconds /!important？
   Are the new guards carrying them? "Deliberate violation turns red. "A sample? Unqualified revert.
4. Numbered from small to large  --no-ff Merge, hit the local tab, register.  ROLLBACK_LOG.md。Every merge, one runs first.  lint + build + Unit,
   We're gonna run all over the port.  npm run check。
5. Write.  PROGRESS Stage Handoff, push, stop. Preview of web sites must be able "Walk through the president process ": Give us a few steps.
```

### 3.2 Execution password template (OB-04 ... OB-08 shared, empty)

```
You're doing it.  agent, work package: OB-{NN}「{Name }」。

## Read first.
1. AGENTS.md Article  3、7、7.1 Section; docs/DESIGN_TOKENS.md
2. docs/ONBOARDING_REDESIGN_STRATEGY.md Article  {Chapter }、5、6 Section
3. docs/onboarding-redesign/WORK_PACKAGES.md Article  2、5 Sections and  OB-{NN} That line.
4. src/onboarding/（OB-01 Set up: shell, engine, draft.tsx、copy.tsYour shell file)
5. {Old code reference }

## Where are you?
worktree ../platypus-ob-{NN}；Branch  design/ob-{NN}-{Short name }；First.  npm ci。
PW_PORT=52{NN} PW_STORAGE_PORT=53{NN} WORDS_PORT=54{NN}。Do not push; Submit  "[OB-{NN}][Claude] …"。

## Tasks
{Tasks }

## We have to change these files.
{Monopoly File }
Your shell file has been filed by  OB-01 It was built and hung up: directly replacing its content. **Don't change.  App.tsx、draft.tsx、copy.ts The existing part.**
（copy.ts It can only be added to your own block.  key）。Yes.  draft : Stop and write the report.

## Can't do it.  / How can we prove it?  / The conditions for stopping.  / Delivery
Same.  OB-01 The password corresponds to four sections, plus:
- Every Screen "I saw it at first glance. "English  ≤40（{Special ceiling }）。
- Each in the process "kskip "The screen has to be.  Skip for now + One line. "Where to find it from now on? "。
- Engine.  onEvent It's called from the shell, and you don't write your own records.
- Your own.  e2e: Fastest path, full path, return /Skip /Restore, Desktop  + Cell phones, axe(b) Darkness, reduced kinetic effects;
  The kinetic test is going to cut it back. "No reduction "and sampled by frame (reference to existing)  dx-*.spec.ts), if you see the median value, it is animated.

The final response is written only: branch, submission, test results, reporting path.
```

| Bag. | Name / Short name | Policy Chapter | Tasks (filled with "task") | Monopoly File | Reference to Old Code | Special |
| --- | --- | --- | --- | --- | --- | --- |
| OB-04 | Name + Constitution / `name-constitution` | 3.1 1–2 | (a) a text box for the name of the student orgation + a school-only symbol; Three option lines (Use sample before / Upload/ Paste)+Skip; Repeats the current reading logic and ends with "AI selected" | `founder/Name.tsx`、`Constitution.tsx`、`ob-04-*.css`、`e2e/ob-04-*.spec.ts` | `ConstitutionStep.tsx`、`Setup.tsx` It's... `startReading`、`lib/constitution.ts` | AI Failed text following policy section 6 (de-state code) |
| OB-05 | Goals + Team / `goals-team` | 3.1 3–4 | Suggested target to switch + walker; Two rows (Role / Person, available); Organizational chart; (a) Folding of duties; **Do not ask for mailboxes, telephones, ASU ID** (mailbox) `fillEmails`） | `founder/Goals.tsx`、`Team.tsx`、`ob-05-*.css`Test | `SettingsForms.tsx`、`OrgChart.tsx`、`data/structure.ts` | Page height target  ≤  1/2 screen (desktop) |
| OB-06 | First event / `first-event` | 3.1 5, 3.2, 5 (times of sight) | One sentence + Example button  →  Progress chain drawn (date from) `schedule.ts`• Buffer segment control (date change on the spot)  →  "Event details" folding; **Just one show, you can interrupt. The whole thing's coming up with less power.**  | `founder/FirstEvent.tsx`、`ob-06-*.css`Test | `Setup.tsx` It's... `prepare`、`data/settings.ts` It's... `completeSetup`、`lib/commands.ts` | **Maximum Hardest, start with**; The cap 60 word; Date from rule engine only, AI does not give date |
| OB-07 | First half of the crew preview / `member-invitation` | 4.1 0–2 screen, 4.2 | (a) Invitation (magnification of role cards), You (prefill confirmation), Reminders (channel options + Morning/Evening + example bubbles); Rule Demo | `member/Invitation.tsx`、`You.tsx`、`Reminders.tsx`、`ob-07-*.css`Test | `Join.tsx`、`SettingsForms.tsx` It's... `ProfileForm`/`RoleCard`、`data/settings.ts` It's... `saveProfile` | Develop an invitation code for sample cases; **ASU ID does not ask**; Phones only appear and write after whatsApp/SMS |
| OB-08 | Back half of the crew preview / `member-finish` | 4.1 3–5 | Weeks (end week/ vacation from school calendar), recommended tag three questions of skip, Done: name added to tissue chart + first thing card | `member/BusyWeeks.tsx`、`About.tsx`、`Done.tsx`、`ob-08-*.css`Test | `engine/calendar.ts`、`ProfileForm` | The busy week must be Monday. `validateProfile` Rules; But you can chop it and use the old ones. `ProfileForm` |

---

## 4. Stage 3 password

### 4.1 Integration Order (Phase 3)

```
You're integrating people. Onboarding Phase  3。Read it.  AGENTS.md、WORK_PACKAGES.mdThe present document, ROLLBACK_LOG.md。
1. Identification phase  2 Mege, npm run check Full green; Fight!  ob/phase-3-before。
2. Do it first.  OB-09(integrated, rows;) One of them.  worktree The son.  agentHere.  4.2 The password, but you have to go on trial after it is delivered."
3. Merge.  OB-09 Do it later.  OB-10（4.3You'll do it yourself, not give it to him.  agent）。
4. Toggle  Juanxi The password will read as follows: A、B One switch each, and the unnamed one continues to point to the old screen.
5. End of phase: complete  npm run check（Node 22）；dx-shots Contrast (old pages should be identical to pixels, only  /welcome The new page below is new;
   Rollback  OB-10 Again.  OB-09……，tsc Adopted, word by word, before the beginning of the phase).
6. Write.  PROGRESS Stage Handoff  + AGENTS.md Add a subsection "onboarding Entrances and records "(The two documents can be changed only by the integrated person).
   Write. "Need to sync local backup "。Push it. Stop it. Here.  Juanxi Final list and freeze description (what's the combination, version number that was open at the moment of freezing)  flowVersion How much is it?
```

### 4.2 Execution password: OB-09 Confirms + Invitation + Link + Hint

```
Use  3.2 the template, OB-09Branch  design/ob-09-confirm-invitePort  5209/5309/5409。Dependence: OB-06、OB-07 Already metge. ）
Tasks: ① Confirm Screen: Summing up a sentence  + Start workspace / Keep current demo；On first entry **No, it doesn't.**"This will replace the current presentation "A warning only from  Demo When the menu is replayed;
② Invite Screen (invited moment): Copy link / WhatsApp / EmailJust open up the written message, don't send anything automatically. + ...permissions, a word.  + Invited/Joined Lists;
③ Main button on first entry  "See what your officers will see" → Entering membership previews (%) OB-07、08 , finish back  Today；
④ Today A one-time tip.  ≤3 (As it says, a little bit disappears and does not appear again); Put it on  src/onboarding/tips/, through one of your own mount points,
   Don't change.  Today.tsx Pages outside; **Change  Today.tsx Let's stop and ask for integration first.**, maximum word count  npm run words Can't be over.
Monopoly file: founder/Confirm.tsx、Invite.tsx、src/onboarding/tips/**、ob-09-*.cssTest.
Cutable: ④。
```

### 4.3 OB-10 Switching, strengthening and closing (integrated by the person)

```
1. Switch: A、B One switch each (building environment variable)  + ?walkthrough=1 Overwrite, press  Juanxi (a) Password settings; R1 Close the entrance and go back to today.
2. flowVersion: write a version number into the record of the process (e. g.  ob-1Write when freezing  PROGRESS。
3. Full set: desktop  + Cell phone.  + Light /Deep  + Reduce kinetic Effect  + Reducing transparency; axe；word budgets；Old  spec It's green and not relaxed.
4. Record end to end: after complete process  Export my data Lee.  onboarding The field is complete and no text has been entered; Reset demo After that, the records were still in place and the entrances resurfaced.
5. Doorkeeper: The whole new process is right  /api/org、/api/workspace Number of requests  0(Refer to existing accusatorial formulation).
6. Rollback rehearsal, back-to-back screens, documents, freeze notes (see above)  4.1 Article  5–6 Article ).
```
