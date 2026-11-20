> **Language policy update, November 19, 2026:** write documents, reports, comments, commits, and GitHub notes in English. This supersedes any earlier language instruction quoted in this historical file. Current `AGENTS.md` controls.

# Hand over to another AI prompt (Onboarding)

> **How do you use:** to send only two of the top boxes, and then to put the entire code block below to each other.
> **only one stage at a time. After the** phase, after you acceptance, we'll change the line to "do only this" and send out the next one.
> **Don't let the two AIs change to the same stage** (including me): they cover each other in the same branch. I won't move at the stage of delivery.
> Prompt does not contain any secret key or research data. It assumes that the other can read and write this GitHub repository, run Node 22 and Playwright; If they can't, it'll press the "stop" clause in prompt to tell you.

```
Hello. You're taking over.  Platypus One job in repository: Onboarding Change it. Here's all you need to know. You can't see me and the last one.  AI（Claude) Dialogue, so don't guess, everything depends on the document in repository.

[Pocket before sending]  1♪ This is just the stage ♪  1(may read  Phase  2 or  Phase  3）
[Pocket before sending]  2】Juanxi Policy Document No. 1  9 Section  Q2–Q6 Response: As recommended  / was replaced by: ________

## 0. Who are you, who do you work for?
- Project Manager  Juanxi Don't write code. Speak to him in simple Chinese, one step at a time, without terminology; Where he needs to do it, write something.
- Use English for UI copy, documentation, reports, code identifiers/comments, commits, and GitHub notes. Private conversation may follow Juanxi's preferred language.
- Repository: GitHub juanxiwu2005/platypus-officer-hub。
- Task Branch (also previews of web sites)  PR）：claude/determined-johnson-yrdxwf。Preview: https://deploy-preview-10--platypus-officer-hub.netlify.app 。
  This branch belt.  AI Name, out of the ordinary, but...  Juanxi It has been agreed to be used only on this preview. **Don't change your name, don't delete it.**(The preview is deleted and will be cancelled.
- **Absolutely not.**: Change  mainIt's a push.  main, merge  main, forced delivery ( --force), rewrite someone else's submission history. Only.  Juanxi Well, to be clear, "Ratification "♪ To merge to  mainAnd that's not your job.

## 1. Read it in this order before work starts.
1. AGENTS.md(All); Focus on the first.  3 Section "Rigid rules "I'm sorry.  4 Section "Handoff Rule for Rotation Work "I'm sorry.  7 and  7.1 Section "Interfaces and action rules "）
2. docs/PROGRESS.md A few of the top articles, especially the title. "Onboarding"Two.
3. docs/DESIGN_TOKENS.md
4. docs/ONBOARDING_REDESIGN_STRATEGY.md(Designation basis: No.  0、2、2b、3、4、5、6、7 Section)
5. docs/onboarding-redesign/WORK_PACKAGES.mdHow to open, file belonging, log program, rollback
6. docs/onboarding-redesign/PROMPTS.md（**Every workpackage "Execute password "It's your mission statement.**；I want you to know that the integration order tells you how it works.
The design has been finalized. **Do not redesign**, and do not change the strategy, work package, program these three documents. If you think they're wrong, stop and write in the report. Wait.  Juanxi Decision.

## 2. What's the job?
Here.  Platypus Make two new ones.  onboarding: first organization established; The members are invited to experience it. Phase 3 Participants in the study **It's all president.**, they first saw a welcome page when they opened the site for the first time.  Start walkthrough(go president process, preview the member's perspective) or  Explore the sample club。onboarding The process. **Recorded in the participants' own browser.**(Independent new)  key, bearing in mind that the act is silent and that only the participants themselves can export it). Reference date  11/6No specific freezing date has been set.

## 3. Your way of working (and  PROMPTS.md by this section)
PROMPTS.md Yes. "Integration of people  + Parallel  worktree Son  agent"Write. You are. **One.** AISo:
- You're both an executor and an integrationist. **Make one bag at a time in order.**。Order:
  Phase  1：OB-01 → OB-02 → OB-03
  Phase  2：OB-06 → OB-05 → OB-04 → OB-07 → OB-08（OB-06 Most difficult, first done.
  Phase  3：OB-09 → OB-10
- For each package, create local `design/ob-NN-<short-name>` from the work branch, in lowercase without an AI name in the branch. Use an English commit message such as `[OB-NN][Codex] Describe the change`.
  When you're done and self-checked, go back to the branch.  git merge --no-ff (Reservation merge submitted, Juanxi And then it's going to be left alone with a rollback bag, and then push the branch of work.
  Don't.  squashDon't.  rebase Submitted.
- Transfer denied (new submission from remote): first  git fetch, and bring your hand off behind it. git rebase origin/<Branch > Don't push it.
  There may be someone at the far end. Juanxi Or something.  AI(b) Transferred the restoration; Don't change them.
- First thing to do:  docs/PROGRESS.md Put it on.  Onboarding The corresponding phase is marked as "Ongoing "Write it down.  AI Name & Date ( AGENTS.md Article  4 ), submitted and pushed. If you see anything else,  AI It's already marked. "Ongoing "，**Stop and ask.  Juanxi**。
- The parallel package would not have touched each other's documents. You have to follow the same rule. **Every bag is just one of its own. "We have to change these files. "Documents listed in the box**；Resize Files Required ( App.tsx、store.tsx、styles.css、PROGRESS.md and other than shared documents)  PROMPTS.md Without authorization, stop writing the report.
- You have to look at merge and every bag before it's submitted.  git diff --stat, confirm that there are no documents other than the White List.

## 4. Rigid rules.  AGENTS.md）
1. Disable research data, survey, interview, participant information; Only field presentation data. Do not release any secret key  API key Write to code, document, prompt, submission.
2. Date by rule engine only ( src/engine/(ii) Calculation; AI Can't give date.
3. Do Not Call  /api/org/*、/api/workspace*, do not add  AI Interfaces; Use only existing ones  /api/setup/constitution and  /api/command。ORG_SETUP_ENABLED Keep it up.
4. I won't change.  SCHEMA_VERSIONDon't change.  DemoStateDon't change anything that already exists.  localStorage / IndexedDB key. The records are for... **Add**It's...  key(See.)  WORK_PACKAGES.md Article  4 Section ).
5. Styles: Colours, Characters, Corners, Levels, Lengths, Curves Only  token；The new style is written only on its own.  src/styles/ob-*.css；No writing.  !important、transition: all(a) Naked millisecond;
   Animation only  transform and  opacity, can be interrupted, must be "Reduce kinetic Effect "Version. Run  npm run lint Will stop.
6. Old pages and old tests: src/pages/Setup.tsx、Join.tsx No change of word; The old test article cannot be deleted or relaxed. When the new switch is closed, it's the same as today.
7. Every new guard has to attach one. "Deliberate violation turns red. "The test sample.
8. Do not skip, delete or relax the test to make it green. If you're red, find out why. If you can't find it, stop reporting.
9. The report must be for each package. "It's not verified. "One column (real fingers, real fingers) Safari When you can't, you can't. Don't say proof if you don't.

## 5. How do you prove one package is done?
Yes.  Node 22 Bottom: npm ci；npm run lint；npm run build；npm test；I'll run my own bag.  e2e（npx playwright test e2e/ob-NN-*.spec.ts）。
Port: PW_PORT=52NN PW_STORAGE_PORT=53NN WORDS_PORT=54NN（NN It's a package number, avoid other processes.
Environment variable for no pre-installed browser  PW_CHROMIUM=<chromium Executable File Path >。
♪ Every merge out of a bag and run through it ♪  npm run check（lint + Build  + Module  + Browsertes  + Words. The phase must be complete and green before it ends.
We have to run first: before we start.  npm run check Must be green; It's not green. **Stop!**Tell me.  JuanxiDon't. "Take care of it. "。

## 6. When do you have to stop?
- Starting point  npm run check Not green.
- It needs to be changed. "We have to change these files. "other documents, or change  SCHEMA_VERSION / Stored keys already available  / Data structure, or reliance.
- Only by weakening the test can it become green.
- The document contradicts each other or does not match the code.
- I saw something else.  AI Do the same thing.
- (Don't push.) Tell me.  Juanxi What kind of orders are you stuck with? What's the output?
When you stop: where did you do it, where the card was, what your proposal was in the report, and tell them in simple Chinese.  Juanxi。

## 7. After this session (delivery)
1. Each one of the bags.  docs/onboarding-redesign/reports/OB-NN.mdWhat'd you do?  / What do you mean, "acceptance"?  / It's not verified.  / Problems encountered  / Rollback mode.
2. Yes.  docs/onboarding-redesign/ROLLBACK_LOG.md Register each merge submission  SHA（OB-01 This is a new document.
3. Yes.  docs/PROGRESS.md Add a stage to the top: what has been done, previewing the site and "What do you want? "Thirty-five sentences, test results (orders and numbers of passes), unverified, next steps.  Juanxi (a) Decide on what;
   Change work package status to "I'm sorry, isn't it? "；Write it down. "Need to sync local backup "。
4. Send the branch of work. **Do Not New  PRNo, no, no.  main。**
5. Last one.  Juanxi A simple summary in Chinese: What has been done? 3–5 ), which site he should open where it's at, what's not done or what's at risk. **And then stop waiting for him.**Don't go on the next stage by yourself.

From now on, do the first.  1 Read it again. "This is the package and order to be done. "and "You're going to change the scope of the document. "Do it again.
```
