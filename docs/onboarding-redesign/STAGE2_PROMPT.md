> **Language policy update, November 19, 2026:** write documents, reports, comments, commits, and GitHub notes in English. This supersedes any earlier language instruction quoted in this historical file. Current `AGENTS.md` controls.

# Phase 2 prompt (to another AI)

> Usage: Change only the top two places before sending [to be completed] and paste the following code block to each other. Stage 2. After you complete the stage, hand over phase 3.
> At the same time, only one AI does stage 2 (including me), otherwise it will cover each other on the same branch.

```
Hello. You're taking over.  Platypus Repository  Onboarding It's a revised version. **Phase  2**。You can't see the conversation before, so everything depends on the document and code in repository. Don't guess.

[Pocket before sending]  1】Juanxi Policy Document  docs/ONBOARDING_REDESIGN_STRATEGY.md Article  9 Section  Q2–Q6 Response: As recommended  / was replaced by: ________
[Pocket before sending]  2Phase  1 Acceptance: Juanxi _Other Organiser  / The feedback is: ________

## 0. Background and rules.
- Juanxi does not code. Explain plainly in his preferred conversation language, one step at a time, with exact UI instructions when needed. UI, documentation, reports, code comments, commits, and GitHub notes must be in English.
- I'm sorry, repository.  GitHub juanxiwu2005/platypus-officer-hub, Task Branch  claude/determined-johnson-yrdxwfIt's also a preview.  10 It's...  PR）。Don't change the name, don't delete it.
- Absolutely not: change  main, transport or merge  main, forced delivery and rewriting of others' submissions. Merge to  main It's not your mission.
- Reference date  11/6。All attendees are presidents, default first steps  A；Worker process  B Just...  A After that. "Preview "。

## 1. Read it first. Read it first.
1. AGENTS.md(Para. )  3、4、7、7.1 Section)
2. docs/PROGRESS.md The top few, especially.  2026-11-02 That one. "Phase  0 Completion "
3. docs/DESIGN_TOKENS.md
4. docs/ONBOARDING_REDESIGN_STRATEGY.md(Para. )  2、3、4、5、6、7 Section)
5. docs/onboarding-redesign/WORK_PACKAGES.md、PROMPTS.md（**Article  3.2 Templates and tables are mission statements for each package.**）、ROLLBACK_LOG.md
6. docs/onboarding-redesign/reports/OB-04-prep-stage0-gap-fix.md(Phase)  0 What did you do, why?
Designed, do not re-engineer, and do not change the strategy, work package, process document; They stopped to write the report because they thought they were wrong.

## 2. Phase  0 I've got something for you.
- Route: src/App.tsx Lee.  /welcome/founder/* and  /welcome/member/* All roads have been built. **Each screen is an empty shell file with only a placeholder content.**（src/onboarding/founder/*.tsx、member/*.tsx）。You will replace only the empty shell of your own bag. **Never change.  App.tsx**。
- src/onboarding/draft.tsx: complete president draft context (clubs, constitution, AI Reading status, role, workflow, buffer, first event, date, invitation number, skipped # And wait # Only by screen  useOnboardingDraft() It's...  draft / patch / update Read and write. **Need a field not in it: stop writing the report and don't change the document.**
- src/onboarding/engine/flows.ts + useFlow.ts: step sheet and route-driven step machine. Use in screen  const flow = useFlow()I'll do it.  flow.next() / back() / skip() / exit()；skip just right.  optional The steps are effective; It's the only way to get a record of events. **Don't write your own records on the screen.**。
- src/onboarding/shell/(Hells, ProgressChain、DemoStrip）、src/onboarding/copy.ts(Text of documents). The text can only be quoted, or **My own block.**Reload  keyDon't change people's blocks.
- Style: src/styles/ob-04-name-constitution.css、ob-05-goals-team.css、ob-06-first-event.css、ob-07-member-invitation.css、ob-08-member-finish.css、ob-09-confirm-invite.css Built and completed  @import；Every bag is just one of its own. No change.  index.css and  styles.css。
- Records: src/lib/onboardingRecord.ts(Browser active, with behavior-free content). You don't need to call it.
- (a) the entrance switch default; Open with: Website Add  ?walkthrough=1。Start walkthrough The old set-up page is still in place. src/onboarding/target.ts It's...  FOUNDER_START），**Cut to the new process is stage.  3 Don't change it.**。Look at your new screen and open it.  /#/welcome/founder/name Or something like that.
- Test Assistant  e2e/ob-helpers.ts；References  e2e/ob-01-shell.spec.ts、ob-03-gate.spec.ts It's written.

## 3. Your job: 5 One bag, in this order, one at a time.
Mission statement  = PROMPTS.md Article  3.2 Template for Sections  + That filled-out form. Key points:
- **OB-06 First event(first done, most difficult):** One word.  + Example button  → The progress chain itself.  src/engine/schedule.ts，AI No Dates) → Buffer part control ( 1·2·3·5·7Call the date and change the scene. → Collapse  Event details。Reuse  Setup.tsx It's...  prepare Logical, data/settings.ts It's...  completeSetup、lib/commands.ts。**Draws a performance that can be interrupted and the whole thing shows up directly with less dynamic effects.** Documents: src/onboarding/founder/FirstEvent.tsx、ob-06 Styles, e2e/ob-06-*.spec.ts。
- **OB-05 Goals + Team：** Suggested target (switch)  + (c) Steprs; Rory, there's only one thing  Role / Person Two. Person Leave empty  = Open position), organizational chart reuse  OrgChartand the overlapping of responsibilities; **No phone calls. ASU IDMailbox**(Postboxing)  data/structure.ts It's...  fillEmails）。Documents: founder/Goals.tsx、Team.tsx、ob-05 Styles, tests.
- **OB-04 Name + Constitution：** Student event name  + (a) School-only titles; Three Options Lines ( Use sample In front.  / Upload / Paste）+ Skip；Reuse  ConstitutionStep and  Setup.tsx It's...  startReading (a) Logical; AI Failed documentation  copy.ts The one that's already written in the inside. Documents: founder/Name.tsx、Constitution.tsx、ob-04 Styles, tests.
- **OB-07 First half of the crew preview:** Invitation( Role card magnified, three benefits, trusting a word), You(pre-fill confirmation), Reminders(channel options line)  + Morning/Evening + An example that changes with the selection reminds bubbles; The phone's only on the menu.  WhatsApp/SMS The subsequent occurrence and writing of the purpose; **Don't ask.  ASU ID**）、Demo Artic  "Previewing as Some. "。Develop a sample example of student application and its invitation code. Documents: member/Invitation.tsx、You.tsx、Reminders.tsx、ob-07 Styles, tests.
- **OB-08 The last half of the crew preview:** Weeks (end of week) /The holidays are from  engine/calendar.ts；The busy week must be Monday, Wednesday in a single screen, Done(name added to organizational chart)  + First card. Documents: member/BusyWeeks.tsx、About.tsx、Done.tsx、ob-08 Styles, tests. **It's a cutable bag.**: Stop and tell if there's not enough time  JuanxiDon't steal jobs.
Every screen. "kskip "There has to be.  Skip for now + One line. "Where to find it from now on? "；Every Screen "I saw it at first glance. "English  ≤40（OB-06 ≤60）。Q2–Q6 It's called strategy number one.  9 Section; If it's empty, "Recommendation ", press every single one of the documents "Recommendations "Column execution.

## 4. Working methods
- Act as implementer and integrator, one package at a time. Create local `design/ob-NN-<short-name>` from the work branch, lowercase without AI names. Commit in English, for example `[OB-NN][Codex] Describe the change`; after self-check, return to the work branch and use `git merge --no-ff` to preserve package rollback. Update ROLLBACK_LOG and push the work branch. Do not squash or rebase pushed commits.
- Passion denied: first  git fetch, to push yourself back behind the far end, not to push; At the far end, there may be someone else's restoration. Don't change them.
- First thing to do:  docs/PROGRESS.md Put it on. "Onboarding Phase  2"Mark As "Ongoing "Write it down.  AI Name and date; If there's something else,  AI Marking in progress. Stop asking questions.  Juanxi。
- Every bag is just one of its own. "We have to change these files. "(a) The document in the column; Look before submission and Mege.  git diff --stat。Documents other than the list that need to be changed ( App.tsx、draft.tsx、store.tsx、styles.css、index.cssThe old one.  Setup.tsx/Join.tsx Wait: Stop writing the report.

## 5. Hard rules (violation is a failure, see full version)  AGENTS.md）
1. Disable research data, participant information, secret key; Only field@actional data.
2. Dates are calculated only by rule engine. AI Can't give date.
3. Do Not Call  /api/org/*、/api/workspace*, do not add  AI Interfaces; Use only what's available.  /api/setup/constitution、/api/command。
4. I won't change.  SCHEMA_VERSION、DemoStateDon't change what you already have.  localStorage / IndexedDB key.
5. Styles only  token；Just write your own.  ob-NN Documentation; No writing.  !important、transition: all(a) Naked milliseconds, naked colour; Just move.  transform and  opacity；Animation can be interrupted with a less dynamic version. npm run lint Will stop.
6. Old pages and old tests remain unchanged and not relaxed; The entrance switch is closed as it is today.
7. One for each new guard. "Deliberate violation turns red. "test samples; No skip, no deletes, no relaxing tests to turn green.
8. There must be a report. "It's not verified. "One column (real fingers, real fingers) SafariAnd don't say anything that has not been verified.

## 6. How do you prove a package is done?
Node 22。npm ci；npm run lint；npm run build；npm test；Run for your own.  e2e(desktops and cell phones)  project）：
PW_PORT=52NN PW_STORAGE_PORT=53NN WORDS_PORT=54NN npx playwright test e2e/ob-NN-*.spec.ts（NN It's a package. Cannot initialise Evolution's mail component.  PW_CHROMIUM=<chromium Path >(This environment is common: /opt/pw-browsers/chromium-1243/chrome-linux64/chrome）。
Tests for each package include at least: fastest path, full path, return /Skip /It's restored. axe (a) Accessibility, dark colour and reduction of kinetic effects; We're going to have to cut back the power. "No reduction "and sample by frame (reference)  e2e/dx-*.spec.ts）。
Every merge, one pack full.  npm run check；The phase must be complete and green before it ends.
**The starting point is to run first:** Before we start.  npm run check Must be green. An old test known to be fragile: src/test/engine.test.ts Lee.  "no change ever makes a step start after its own club deadline" It's going to pass on the slow machine.  5 The second limit fails, plus  --testTimeout=30000 A single rerun is a known problem and states in the report that it should not be modified.
Note: No use.  pkill -f To kill the development server.  shell We're going to kill them together.  PID。

## 7. We have to stop the situation.
(a) The starting point is not green; Documents other than the white list, data structure, stored keys already available or dependent on them; Only by weakening the test can it become green. The document contradicts the code; I saw something else.  AI At the same stage; Pushing has been a failure. When you stop, write in the report where it's done, where the card is, what your advice is, and tell them in simple Chinese.  Juanxi。

## 8. Delivery
1. Each one of the bags.  docs/onboarding-redesign/reports/OB-NN.mdWhat'd you do?  / What do you mean, "acceptance"?  / It's not verified.  / Problems encountered  / Rollback mode.
2. ROLLBACK_LOG.md Register each merge submission  SHA。
3. docs/PROGRESS.md Add a stage to the top: what has been done, previewing the web site (with  ?walkthrough=1 and "Do what you want to do, president process. "A few words, test results, unverified, next steps.  Juanxi (a) Decide on what; Change Status "I'm sorry, isn't it? "；Write. "Need to sync local backup "。
4. Send the branch of work. No new  PRNo, merge.  main。
5. Here.  Juanxi A simple sum up in Chinese.  3–5 And then stop waiting for him. **Don't go on the stage.  3**。

From now on, do the first.  1 Section reading, and recapitulating. "This is the package and order to be done. "and "Scope of the document to be changed for each package "Do it again.
```
