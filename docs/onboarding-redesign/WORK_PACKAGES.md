# Onboarding Reverse: work stream and worktree

> **Status: Wait until Juanxi says "start."** is designed on the basis of [ `../ONBOARDING_REDESIGN_STRATEGY.md` ](../ONBOARDING_REDESIGN_STRATEGY.md) (read first its sections 0, 2b, 3, 4, 5, 7); This paper only says, "How to open it, how to parallel it, how to rollback."
> This follows v1. 6 (`../design-upgrade/README.md`): one worktree per package, exclusive file, `--no-ff` merge, alone rollback.

## 1. Established premises (Juanxi 2026-11-01)

| Item | Resolves |
| --- | --- |
| Date | Using **11/6** as a reference, try to finish it before 11/6 (Phase 3 and the exact date of the freeze have not yet been set).  |
| Participants | **is president.** Enter default process A for the first time; Process B is just a preview, after A (see your newly built student organization). **doesn't have the entrance to "I'm a member".** |
| Records | The **onboarding process is recorded in the participant's own browser** (see section 4).  |
| Unanswered | Strategy... 9Section Q2– Q6 does not provide a clear response;  **Before you start, please say "Q2-Q6 as suggested"** (or indicate which one does not agree).  |

## 2. Branch, worktree and a limit

- **Integrated Branch = `claude/determined-johnson-yrdxwf` (PR #10, preview of 10).** This session can only push this branch (subsequent branch and label 403, see `design-upgrade/ROLLBACK_LOG.md`), so onboarding **and v1. 6 is in the same preview**. The original page in 10 will not change because the entrance is closed by default; The new process is based on the web site of 6. Merge to `main`_Other Organiser **Create a merge commit**Don't squaash.
- Each package is a local branch `design/ob-NN-<short-name>`, a worktree `../platypus-ob-NN` from an integrated branch (only exists on this plane and by merge refers to an integrated branch).
- **port staggered** (`playwright.config.ts` supported): `PW_PORT=52NN PW_STORAGE_PORT=53NN WORDS_PORT=54NN`, n is the package number.
- Parallel packages run only `npm run lint`, `npm run build`, `npm test` and their own `e2e/ob-NN-*.spec.ts`; The **complete `npm run check` run after each wave of merge by the integrated person.**
- **Document No.** (only for integration): `docs/PROGRESS.md`, `AGENTS.md`, `docs/DESIGN_TOKENS.md`, `src/styles.css`, `src/styles/index.css`, `src/App.tsx`, `src/data/store.tsx` (except for OB-02), `e2e/helpers.ts`, `playwright.config.ts`.
- Once each package is finished, write a `docs/onboarding-redesign/reports/OB-NN.md` (your own file, no touching).
- The old `src/pages/Setup.tsx`, `Join.tsx` and their tests **do not change the word** (just wrapped into a new shell).

## 3. Work package overview (including worktree fit)

**Reading:** "parallel" = who can worktree at the same time; "Secret document" = only this package can be changed; "According" = Evaluation of the Agent + Worktree workflow.

| Wave. | Bag. | Contents | Dependence | Parallel | Monopoly File | Worktree Fits | Size | Rollback |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **0** | **OB-01Shells and Routes**  | Focus on the shell (no sidebar/Ask); Step state machine (ahead/back/skip/ recovery, pure function + single measure); (a) Progress chain indicators; Article Demo; **shared context for the president draft**♪ Put the existing ♪  `Setup.tsx` 15 state harvest one, all screens read and write only it; (a) Lists; **Routes and shell files for all new screens are constructed at once**; `ob-NN-*.css` (a) An empty document is constructed once; Old setup/join wrapped in outer shell ( `/#/welcome/classic`）。 | None | OB-02 only | `src/onboarding/shell/**`、`engine/**`、`draft.tsx`、`copy.ts`、`src/App.tsx`、`src/styles/ob-*.css`、`index.css` It's... `@import`、`e2e/ob-helpers.ts` | **is dedicated to paving the back parallel**: it builds all the "conflicting common documents" one at a time, and then each bag changes only its shell. **, it has to collide**.  | M | R2 |
| **0** | **OB-02 Record** | Host log module (Section 4): `src/lib/onboardingRecord.ts` + (a) Single measure; Bring out of Export; Reset demo has no record, re-lighted the entrance.  | None | OB-01 only | `src/lib/onboardingRecord.ts`、`src/test/onboardingRecord.test.ts`、`src/data/store.tsx`(changed only) `buildExport` and `reset`） | (a) **fully independent**, pure logic, best placed to be left to an Agent alone; Only allowed to touch. `store.tsx` The bag, avoid anyone crashing it.  | S | R2 |
| **0** | **OB-03First entrance.**  | Welcome page (Start walkthrough /Explore the screen Club); "Isn't the first time" to judge; Switches (default switch); The entrance points first. `/#/welcome/classic`；Demo menu "Replay setup" — "Replay walkthrough"; The record's on.  | OB-01、OB-02 | No (single) | `src/onboarding/gate/**`、`src/components/chrome/DemoMenu.tsx`、`e2e/ob-03-gate.spec.ts` | Reliance on interfaces of the first two packages,** without parallel **; But it's small, chained without delay.  | S | R2；R1 Switches |
| **1** | **OB-04 Name + Constitution** | Process A 1–2 screen. Reuse `ConstitutionStep` and `startReading` logic (interface only).  | OB-03 | With 05, 06, 07, 08 | `src/onboarding/founder/Name.tsx`、`Constitution.tsx`、`ob-04-*.css`、`e2e/ob-04-*.spec.ts` | ✅  Directory exclusive, only through `draft` and `copy` Interact with the outside world.  | M | R1 + R2 |
| **1** | **OB-05 Goals + Team** | 3–4 Screen: Suggested target + two rows (Role/ Person) + tissue chart (reuse) `OrgChart`) + Responsibility folds.  | OB-03 | Same source as above | `founder/Goals.tsx`、`Team.tsx`、`ob-05-*.css`Test | Ibid.  | M | R1 + R2 |
| **1** | **OB-06First event**  | 5 screen: One sentence  →  progress chain drawn  →  buffer section control; Reuse `parseCommand`/`prepare` and `completeSetup`；Date from rule engine only.  | OB-03 | Same source as above | `founder/FirstEvent.tsx`、`ob-06-*.css`Test | Independent, but **is the most difficult**, **the first to open** and give it the longest possible time.  | L | R1 + R2 |
| **1** | **OB-07 member preview: Investment + You + Reminders** | Process B 0–2 screen (Demo rule "Previewing as a certain"); Example: Bubbles.  | OB-03 | Same source as above | `src/onboarding/member/Invitation.tsx`、`You.tsx`、`Reminders.tsx`、`ob-07-*.css`Test | Independence; The invitation number for the development example of student organization is not dependent on the A screen.  | M | R1 + R2 |
| **1** | **OB-08 Board member preview: Busy weeks + About you + Done** | Weeks (end of school calendar week/leave), suggested tags, a move to join the tissue map, first thing card.  | OB-03 | Same source as above | `member/BusyWeeks.tsx`、`About.tsx`、`Done.tsx`、`ob-08-*.css`Test | Independence.  | M | R1 + R2 |
| **2** | **OB-09 Confirms + Invitation + A ≤ B Link + Hint** | Confirm screens, invitations (Copy/WhatsApp/Email+Invited/Joined list), See what your offices will see) get a one-time tip from B. Today to 3.  | OB-06、OB-07 | No (integrated) | `founder/Confirm.tsx`、`Invite.tsx`、`src/onboarding/tips/**`、`ob-09-*.css`Test | ≤** Discomfort line **: to read the results of 06 and 07, two processes are organized. Serial, done by an integrated person or a Agent.  | M | R1 + R2 |
| **3** | **OB-10Switch, strengthen, shut up.**  | Point the entrance from the old screen to the new process (one switch each for A and B); Desktop + mobile phone + dark colour + action reduction + transparency package; (b) End-to-end testing of records; Rollback rehearsal; (a) Cross-references to cross-sections; documents; Note on freezing.  | All ahead. | No | Document, switch, global test | The **must be a combination of individuals who do the** (global inspection).  | M | R2 |

**decapitable (in this order, without prejudice to the entrance and main line when time is insufficient): Today's small hint in** 1 OB-09  →  2 OB-08 (the second half of the B preview with the old `ProfileForm` placed into the outer shell)  →  3 OB-07 example reminder bubble 4 OB-04 Constitution screen (with "Stamp Constitution One"). **Do not cut:** OB-01, 02, 03 (entry + record + shell), OB-05 and 06 of the A process.

### Parallel Charts

```
Wave. 0   OB-01 ─┐
      OB-02 ─┴→ OB-03
                   │
Wave. 1   ┌────────────┼────────────┬────────────┬────────────┐
    OB-04       OB-05       OB-06 ★Max     OB-07       OB-08        ← In the meantime  ≤4 One.  worktreeNo, no, no.  5 We're done here.
      └────────────┴──────┬─────┴─────┬──────┘
Wave. 2                     OB-09 ←───────┘Yes.  06 + 07）
                          │
Wave. 3                     OB-10
```

**Why at the same time is 4:** every worktree wants to run `npm ci` and run tests with browsers, machines are tight; v1. 6 has a maximum of 6 at the same time, but this time 3 bags are heavier (06, 09, 10).

## 4. What about "recording"?

- **Place:** A **new** server key, e. g. `platypus.v1.onboarding`, separate from existing interactive records (`platypus.v1.log`). Reason: Up to 2000 records available, old ones will be squeezed and emptying at the beginning is easy to throw first; And Reet demo hasn't touched the record, and so has this.
- **No change in data structure:** `SCHEMA_VERSION` no change, `DemoState` no change, existing key no change; One more. **New**Key, dropback ignores it ( `design-upgrade`Rules 4Only for "data available", here is a purely new one, please confirm.
- **What do you remember (recording actions only, without content):** each attempt one: `attemptId`, `flowVersion`, access selection (Start/ Explore), entry/ return/skip/ completion + time (ms), completion, exit from which screen, first replay. **does not take into account the text entered** (student name, name, etc.) - these are already in exported state.
- **What do you think:** Setings — **Export my data** with an extra top field of `onboarding` (`formatVersion` keeping 1, new fields). **, as it is now, only the participants themselves can export**; There is no automatic reporting.
- **Failed: The** browser blocked storage and the pages worked as usual (consistency with existing storage).
- **by default opens** (you have requested records). "Your steps in this welcome page are saved in this crowder": I suggest, a word of honesty. **, this is a question of research. Please decide how to write it against the IRB material.**

## 5. Common requirements per package

1. **changed only its own exclusive document.** Need to change common files? Stop and put in a report to the Integration.
2. **All colours, fonts, corneres, layers, lengths, curves only token;** New style written in its own `ob-NN-*.css`; No `!important`, `transition: all`, nudity milliseconds; Only `transform` and `opacity`; Animation can be interrupted; There is a less dynamic version.
3. **interface English.** files are taken from `copy.ts` (OB-01 constructed) and do not scatter strings in components.
4. **dates from rule engine only; AI not given date; Do not call any `/api/org/*`, `/api/workspace*` or add an AI interface.** only uses existing `/api/setup/constitution`, `/api/command`.
5. **does not release live data, sets key.**
6. **Test:** module + one `e2e/ob-NN-*.spec.ts` each for desktop and mobile phones (fast path, full path, return/skip/ recovery, accessibility, dark colour, reduced kinetic effects); **Each new guard carries a sample of "intentional violation makes it red"**; The old test article is not deleted or relaxed.
7. **Words:** Every screen "seen at first glance" English word 40 (witness screen, invite screen 60).
8. **per pack of reports:** did what, how acceptance (point), nothing to verify (real fingers, Safari...). **doesn't mean it didn't.**

## 6. What do you think?

- When the switch is closed (default): Previews all old pages of 10 remain unchanged.
- Look at the new process: OB-03 merge, I'll give you a preview of **with parameters.** (e.g. insert `?walkthrough=1` after the web site). Open is a welcome page; Opening with a invisible window is like "first time." You don't see anything new after OB-01, 02 merge. I'll tell you in the report.
- Switch: one switch for each A and B in OB-10, one cut for you; **didn't adopt an article to continue with the old one.**

## 7. Timeline (for 11/6 reference, today 11/1)

| Day | Do what? | What are you doing? |
| --- | --- | --- |
| **11/1(Today)**  | You said "start." I'm driving OB-- 01With OB- 02(two worktrees in parallel) 03  | Say "start" and "Q2-Q6 follow the advice." |
| **11/2** | OB-03 merge, welcome page preview for you; 1 (OB-06 first, 04/05/07 second) | Look at the welcome page (1 minutes) |
| **11/3** | 1 successive merges; A preview of your president process A | Let's go, A. Go back to "Where can we change?" |
| **11/4** | OB-08、OB-09；Fix it with your feedback. | Let's go. A-B. |
| **11/5** | OB-10: Switch, full set, rollback exercise, screenshot comparison | Final |
| **11/6** | **Buffer Day**: Only you call questions, nothing new  | Confirm freezing |

**The risk of honesty:**This rhythm assumes that every time you're on **One day.**Response;  Every time you drag a day, 11/6 will have to be by "several order". v1. The 6 package of 27 was completed in one day, so split and parallel are feasible per se. The bottleneck is acceptance round trip, not writing code. **If Phase 3 is frozen earlier than 11/6, please let me know immediately.**

## 8. rollback.

- Each package is registered to `docs/onboarding-redesign/ROLLBACK_LOG.md` (IB-01) using an integrated branch of `git merge --no-ff design/ob-NN-xxx`, recording the merge submitted to SHA (the label cannot be inserted in this session, following the v1. 6 approach, and the `ob/*` tag is only local).
- All you have to do is say **" rollback OB-06 "** " or **"Close the whole entrance"**.
  - **R1 (quickest):** off the entrance switch and all stand back to today. or `index.css`It's an annotation. `@import`。
  - **R2:** `git revert -m 1 <merge-commit>`.
  - (b) The repair package was submitted and the repairs were withdrawn before it was removed; Reliance on withdrawal (06, 07, 09, 10).
- All packages do not change `DemoState` so rollback doesn't break old data from the browser; The new key rollback is ignored after recording it.
