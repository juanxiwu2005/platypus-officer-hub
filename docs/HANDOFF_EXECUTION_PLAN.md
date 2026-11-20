# • Step-by-step implementation programme

> 2026-11-08 Claude . Based on [ `HANDOFF_REDESIGN_PLAN.md` ](HANDOFF_REDESIGN_PLAN.md) (question numbers B1-B6 and D1-D9 refers to that document).
> Juanxi 2026-11-08 asks: "Reconstruct all the problems above, implement the component-step programme and move forward in stages. "
> **This document is the original: the record of implementation of section 9 is updated at each stage.**

---

## 1. General rules (applicable at each stage)

1. **only do one stage at a time.** After completing the running test  →  Write acceptance step  →  **Stop until Juanxi says "may" or "where"** starts the next phase.
2. **Branch:** works on `claude/tender-gates-j8ztlr` (the branch designated for this session). `git fetch origin main` and merge up-to-date `main` before starting work, avoid conflict with Phase 3 changes. **does not touch `main`, only Juanxi says "approved" merge.**
3. **rollback:** At the end of each phase, at the end of 9, we will record "submission before stage" and "last submission during phase". For a stage to be withdrawn, the paragraph `git revert` should be submitted in order (the later stage depends on the previous one, so withdraw from it).
4. **Test:** replaces unit tests by changing behavior; If you change the page, fill the browser tests (desktop + cell phone). `npm run lint`, type check, build, whole unit sets and browserstes associated with Handoff; Last stage running full `npm run check`.
5. (a) The constant border of **: the date of** is counted only by rule engine; AI only returns the numbering and restricted content; **handoff functions do not read research logs** (`interactionLog`, `ui.*`); Only the visible contacts of officer are also hidden from handoff pages and AI; English language interface; Handoff does not exceed 120/ 120.
6. **Phase 3Protection during period of detention (Q6 reply: Phase) 3The task card is available on Handoff's page, so number one... 1We'll leave it all to the branch from now on, Phase. 3Not until the data is collected. `main`）：**Example: `sampleScenario.ts`)Leadership translation season and example  Schema version `SCHEMA_VERSION`In Phase 3Before closing **Not up.**, because the upgrade will allow participants to move their stored data through the old version.  The stage for which an upgrade is required (from the 3 phase) is scheduled after Phase 3.
7. **Preview of web sites:**Acceptance needs to open a PR for this branch if you want to use a preview of the site.  **Open PR to Juanxi for consent.**

---

## 2. Overview of all phases

| Phase | Name | What kind of problems? | You want to raise the schema vension? | We need Juanxi to decide before we start. | Can you take medge during the Phase 3 period? |
| --- | --- | --- | --- | --- | --- |
| **1** | Fix bug (no page changes) | B1、B4、B6 | No | None (Q6: Confirmed that the Phase 3 task card was not used to Handoff, merge) | Yes, confirm after Q6 |
| **2** | Existing members take over + slot + single handoff | B2、B5、D7 | No (optional field only) | D-2a、D-2b | After recommendations |
| **3** | Term model + incoming office | B3, and the base of stage 4–7 | **Yes** | D-3a | After |
| **4** | Roll file (4) + risk sorting | D1、D2、D4、D6 | No | None | After |
| **5** | Error reading + incoming officer read, rehears, follow-up, look back | D3、D5 | No | Q2、Q4、Q5 | After |
| **6** | role changes (rename history, add, split, merge, archive) | D8 | Yes | D-6a | After |
| **7** | Product Question and Answer Record | D9 | Yes | **Q3 (including IRB)**  | After |
| **8** | End of story: document, complete return, local backup | — | — | Mege Timing | — |

The 2 phase was placed in front of the 3 stage because "the current member takes over" and "vacant rule" could be fixed without changing the data model to enable it to be used earlier; The 3 stage then moves them to the official term model.

---

## 3. Phase 1: Renovation bug (B1, B4, B6)

**Target:** handoff after completion of other functions are no longer bad; Add a new line after the season to leave translation; Progress is not too high. Page layout remains the same.

**Change what document:**

| Documentation | Change what? |
| --- | --- |
| `src/data/types.ts` | `Person` Add optional fields `leftOn`(outgoing date). The person with this field is "former": the historical record is still there, but no longer the current officer. |
| `src/data/permissions.ts` | Add `officers(s)`: Return only to the current officer |
| `src/data/handoff.ts` | `complete`: generating incoming office generate a valid field email ( `…@example.org`）；outgoing `leftOn`；Add `syncSeasonRoles()`: add an extra log when the season is open; `start` No more pre-filled examples |
| `src/data/settings.ts` | Verifying sskip predecessor (not reporting "Match every officer to their own rule"); The upper limit of the number of officers is currently available only; Call after saving settings `syncSeasonRoles()` |
| `src/pages/Handoff.tsx` | Show hint text when content is not available in the interview box ("One point per line. Field examples only."), no more prefilled |
| Listing of officer places: `TopBar`（View as）、`Team`、`TaskFields`、`NodePanel`、`Settings`（Who can create events）、`aiContext`、`commandContext` | Change `officers(s)`, the ex is no longer on the selection list, and AI will not assign a task to his predecessor. |

**Test:**

- Module: `validateClub(clubDraft(s))` is null and capable of saving Settings once the handoff has been completed; Incoming officer mailbox is legal; Outgoing people have `leftOn`, not `officers(s)`; View as/ Assigned list does not include the predecessor; Add a rule after the season automatically has leadership translation record; `start` after interview is empty and progress step 1 has not been completed; Example The example of student organization remains unchanged from the example of interview.
- Page: Complete Treasurer handoff to open Settings to save by changing name; There are no outsideing people in the View as menu.
- All original tests retained.

**Acceptance (Juanxi):**♪ One Handoff ♪ Treasurer ♪ 5→  Finnish rule handoff;  2 Settings change the name of the target organization to see saved; 3 No Maya in View as; 4 Settings plus a new roll back to Handoff, where the new card appears and opens without saying "Start the handoff season".

**Non-doing:** Replacement of existing member, slote can handoff (stage 2); Order of the first week's list (phase 3).

---

## 4. Phase 2: Replacement of existing members + vacancy rale + single role handoff (B2, B5, D7)

**The decision has to be made:**

- **D-2a Incoming officer reacknowledged?** is now directly to do. It is suggested that **not captured + specify incoming office officer**, adding office point "I've got it" to be taken over and consistent with the whole station 's rules of title (the plan "handhake”).
- **D-2b Vacancies** suggests that **be replaced by the outgoing** (interface writing "Answering for a vacant rule”).

**Do What:**

1. **Current member** (Low down, only current officer and former)/ **New person** ( Type Name, same as now) / temporarily empty.
2. The current member takes over: if he had a role, the original role became vacant and hinted that "Secretary is now vacant". `leftOn` was cleared when the predecessor took over.
3. Vacancies rule: president can write interview, confirm, finish handoff.
4. **single rule handoff:** Handoff added "Hand over one rule" to replace a roll without full season.
5. `validateRoles` allows the role to be empty (now `holderId` is allowed for null, supplemental testing).

**Test:** Attribution of two rolls, task transfer, Settings can still be preserved after the current members have taken over; The missing slot can go through the full process; Single roll handoff does not affect other rolls; The names are still rejected (new people).

**access:** uses Sam to pick up Treasurer  →  Marking to show the vacancies  →  to fill with "new people" No season directly "Hand over one rule".

---

## 5. Phase 3 . time model + incoming officer early (B3)

**needs to decide first: what can you see before** **D-3a** handoff in coming office? Recommendation: When this role manual, file and unfinished tasks are available in term intercoming officer, **cannot change the** task (only comment/ question) until it is handed over.

**Do What:**

1. New data `RoleTerm { roleId, personId, status: incoming | active | former, from, to, handoffId }` (see Programme 4.1). **Actual practice (more robust than programme):** `Role.holderId`、`Person.leftOn`、`RoleHandoff.incomingId`Data that is still written directly by the action, term by `normalizeTerms`Automatically aligns each action to a historical record, without changing the other code.
2. **schema version + 1** for migration: existing `holderId`  →  active term; People with `leftOn`  →  former term; Ongoing leadership reservation.
3. Selecting incoming office **The first week's list was ticked by incoming officer.**and then after the transfer (repair B3).
4. Hand over: incoming — active, old action — former.

**Test: The same data before and after the migration of**, with all pages showing the same role as the person; Incoming officer cannot change tasks before handing over; The first week's list can only be ticked after the transfer. There can be no error in repeating the migration.

**access:** Walk through: select incoming officer  →  View as coming officer, can read the manual and cannot change the first week of hand-over incoming officer.

---

## 6. Phase 4 . file + risk ranking (D1, D2, D4, D6)

**Do What:**

1. `src/lib/roleDossier.ts` (pure function, no AI): Calendar / In flight / People / Lessons four pieces (see Table for Project 4.1). Each line is accompanied by an ID from which the original record can be opened.
2. The source of the manual was expanded from "Task + Access" to four parts of the archive; The manual is divided into four chapters; Could not close temporary folder: %s
3. First week's list = Universal 6 + this rule next live deadline of 30 days (rule engine). **Practical practice:** Universal 6 is still open; The list of "Next 30 days" (read-only, each item can open a task) on the cut-off date does not add the number of bars to be ticked.
4. The relay card is ranked according to "handoff risk" (unfinished, 30 days ASU hard-cut, overdue, stuck, outgoing people recently updated, file gaps). **Practice:** Sorting and Colouring Only on Handoff Pages; **No** in "Needs a Nudge" today, because that column means "the most likely step to catch up with 3", and mixing role will change meaning and Phase 3 page, requiring Juanxi to decide otherwise.
5. Only the visible contact in officer hides both the file and the contents sent to AI according to existing rules.

**Test: calculation of each piece of the** archive (including empty "no history yet"); Hide contacts not appearing in files and AI requests; Risk ranking; word ceiling.

**access:** Open the Treasurer file with four pieces of content, each line can be opened; Handoff's page is the most dangerous role in line first.

---

## 7. Phase 5 . Gap interview + joining officer process (D3, D5)

**has to decide first:** Q2 (is it possible for AI to write a guide with reference), Q4 (is it possible for the predecessor to be consulted), and Q5 (see who can see the score).

**Do What:**

1. **Gap:** rule template question ("Chase the USG review" got an exception but no reason was recovered. What held it up?" Outgoing people answer questions or skip, skip in "unsolved". **AI version `/api/handoff/questions` did not do**: Juanxi hasn't answered the Q2(AI can write a sentence); AI can only select/sort a ready-to-use template question with little value, and Q2 approval and prompt clearance are required for AI to write questions.
2. **incoming officer reading booklets:** Got it/Unclear; Unclear becomes a problem for the outgoing people.
3. **Recapitulate:** 3A fixed problem;  The **rule** (not AI) simply says the answer "No word in the manual" and gives outgoings to choose not to add to the manual without a score.
4. **Follow up:** president picks a light task that people are still doing, incoming officer receives notice and can look at it. **RACI** (incoming officer and outgoing are the same role when "visited" makes no sense) and the task is still left to outsiders.
5. **7 / 30 day back:** clarity, confidence, acceptance of three questions 1–5 + "What's missing from the manual"? The president one key back to the file. The original Day 30 button for this.

**Test:** template subject generated from archival certainty; AI only quotes records that exist; Restatement does not produce scores; Look back at the results only to the Q5 decision-makers.

**Acceptance:**♪ Incoming officer read, pick one ♪ 30I read back to my file every day.

---

## 8. Stages 6, 7, 8

**Phase 6. Role changes (D8). D-6a:**Delete "rolle" or "archived"?  Recommendations are archived only.
Doing what: changed name history (details show "Formerly..."); New role start (constitution / duty source text plus standard steps for functions + president 3 questions, no history to start asking questions automatically); **Mobile Work** (checking task by article and contact to another roll) and **closes the rule** (turning everything that is left, file undeleted). **split = add new rule + move work, merge = all moves + close**, there is no separate "gui" interface (one layer less than the wizard and more difficult to misoperate). **Not done:** by tag batch; The old manual shows the name of the role at that time (only the history of renaming is shown in the file details). Schema version + 1 (22).

**Phase 7 Product Questions and Answers (D9). Q3 Response received from Juanxi: question-and-answer notes and research logs are completely separate.**
Actual practice: **do not create any new records** (no new entries, no IRB); **reads** incoming officer from the existing research log at the moment that it was painted and asks questions about Ask, indicating those not covered by the manual, only for the president and incoming officer. The result is no records, no manuals and files, no AI (test guardian). **Not doing:** Ask chats on View as separately (Ask behavior that moves Phase 3); In the file, "this role's often asked questions." Do not change schema version.

**Article 8• End of period:**Update `AGENTS.md`Article 6Sectional code maps, `docs/RULES.md`(if the handoff rules change), `docs/WP5_ACCEPTANCE.md`； Complete `npm run check`; Write handoff at `PROGRESS.md`; Synchronize local backups (when connected to Juanxi computers); Please Juanxi decide the time.

---

## 9. Executing records (updated at each stage)

| Phase | Status | Submission before start | Last submission | Test Results | Juanxi access |
| --- | --- | --- | --- | --- | --- |
| 1 | **considering access** (Claude, 2026-11-08) | `de5c1f9` | `fb495dd`(document submitted to `eebd4ab`） | Lint, two sets of type checks, construction pass; Module 1060 All over (new 12 and failed 9 on old code); New browser tests 6 through (all desktop versions of 3 on old code failed); _Other Organiser 714Numbers: 656Adopted / 52Skip / 3Occasional (rerun through)/ 3Fail, this. 3One that hasn't changed.  `main` The same failure ( `workflow-setup:123` Desktop + mobile phone, `organization-setup:1381`） | Wait, Juanxi. |
| 2 | **considering access** (Claude, 2026-11-08); D-2a, D-2b agreed by Juanxi) | `eebd4ab` | `da45e5c`(document submitted to `591c28a`） | Lint, two sets of type checks, construction pass; Module 1080 Full (new 20); (b) The new browser tests 3 (desktop + cellular phone) were passed, and the 1 phase of the browser ts were joined with 12; There are already browser tests 700: 663 failed by / 52 skip / 1 / 4, of which 3 have not changed `main` The same failure ( `workflow-setup:123` Desktop + mobile phone, `organization-setup:1381`1 are known to be random. `ob-04` Keyboard File Selection Box(s) `main` Over and over 16Second failure 3Next, this branch 16Second failure 4time)  | Wait, Juanxi. |
| 3 | **considering access** (Claude, 2026-11-08); The term model and the D-3a have been agreed to by Juanxi; **No more `main`, wait for Phase 3 to finish**) | `591c28a` | `6414cd7`(document submitted to `309bad2`） | Lint, two sets of type checks, construction pass; Module 1095 Full (new 15); New browser tests 4 (desktop + cell phones total 8) passed; There are already a number of 794: 735 through / 52 skip / 5 (rerun through); Where to read the archive `recovery` Repeated 40 times all)/ 2 failed `workflow-setup:123` Desktop + cell phone. No change. `main` The same thing that failed. | Wait, Juanxi. |
| 4 | **considering access** (Claude, 2026-11-08); No, merge to `main`Waiting for Phase 3 to finish) | `309bad2` | `92e060e`、`2f0e887`、`f811730` | Lint, two sets of type checks, construction pass; Module 1110 Full (new 15); New browser tests 4 (desktop + cell phone 8) passed; Existing browser tests 800 +: all adopted, divided by `workflow-setup:123`、`organization-setup:1381` It hasn't changed. `main` The same failure, and a few known incidentals. `production-security`、`ob-04`、`dx-10`、`tasks:68`，`main` It also occasionally fails. **Note: First page entry file 499,664 bytes, cap 500,000, only 336 bytes, see PROGRESS.md** | Wait, Juanxi. |
| 5 | **considering access** (Claude, 2026-11-09); Q2/Q4/Q5 do as my suggested default, waiting for Juanxi to confirm; No, merge to `main`Waiting for Phase 3 to finish) | `42ae862` | `6dbc25f`(document submitted to `6ca4f83`） | Lint, two sets of type checks, construction pass; Module 1127 Full (new 17); New Page Length Process Test `handoff-stage5.spec.ts`( Desktop + mobile phone) pass; There are already browser tests 840: 780 failed by / 52 skip / 4 / 4, of which `workflow-setup:123`(desktop + cell phone), `organization-setup:1381` It hasn't changed. `main` The same failure was reported. `ob-12:208` and `workflow-setup:39` Yes. `main` 24 failed 4 (this branch 3). 505,418 bytes for the first page entry file (ceiling reference to 520,000) | Wait, Juanxi. |
| 6 | **considering access** (Claude, 2026-11-09); D-6a has been confirmed by Juanxi; No, merge to `main`Waiting for Phase 3 to finish) | `6ca4f83` | `1f2da6c`(document submitted to `86be187`） | Lint, two sets of type checks, construction pass; Module 1143 Full (new 16); New Browsertes `handoff-stage6.spec.ts` 4 (desktop + cell phone 8) pass; _Other Organiser 902Numbers: 844Adopted / 53Skip / 4Occasional / 1Failed (  `m4-setup:98`, repeat 24: this branch failed 4, `main` Failed 3Next time, loads fail.  First page entry file 509,008 bytes (ceiling 520,000) | Wait, Juanxi. |
| 7 | **considering access** (Claude, 2026-11-09); Q3 has been answered by Juanxi; No, merge to `main`Waiting for Phase 3 to finish) | `86be187` | `9d2c411`(document submitted to `b13f7e0`） | Lint, two sets of type checks, construction pass; Module 1160 Full (new 17); New Browsertes `handoff-stage7.spec.ts`(desktop+cell) Pass, repeat 30 full; There are already browser tests 920: 847 failed by / 64 skip / 5 supple / 4, both `main` The same old problems that fail or happen occasionally. First page entry file 509,017 bytes (ceiling 520,000) | Wait, Juanxi. |
| 8 | **Completed** (Claude, 2026-11-09) | `b13f7e0` | See `git log` Latest submission | Complete `npm run check` We'll see about that. `docs/PROGRESS.md` (a) The upper one; Document collation, merge list, rollback table, all known problems in this document section 10–12 | — |
| Review repairs | **Completed and Mege to `main`**（Claude，2026-11-09；Juanxi approves direct merge, Q2/Q4/Q5 confirms that the Q4 postbox telephones have been replaced by an expired manual rule to read only quoted entries) | `3991320`(Final submission of this branch) | See `docs/PROGRESS.md` Top one. | 13 questions and amendments `docs/PROGRESS.md` The top one and `AGENTS.md` Section 6 "Handoff review repair"; Test `src/test/handoffReview.test.ts` | Juanxi ratified merge |

---

## 10. Last look, what's different from the original scheme (`HANDOFF_REDESIGN_PLAN.md`)

| Original programme | Actual | Why? |
| --- | --- | --- |
| B-1-B6 Six bugs. | **Completely repaired** (B1, B4, B6 stage 1; B2, B5 stage 2; B3 Phase 3) | — |
| D1-D9 9 design issues | D1-D8 did it; D9 Replace "read existing research logs" with "read existing research logs", as decided by Juanxi 7Phase)  | Q3: The question and answer record is not separated from the research log |
| term by `RoleTerm` Calculate `holderId` | `holderId`、`leftOn`、`incomingId` It's still written directly by the action. `normalizeTerms` Put the term after every action. **Align to History**  | The old code doesn't change, returns to the same object when it doesn't change. |
| The first week of the manual list = generic 6 + live | The common 6 is still to be written; Live as of "Next 30 days" | Do not change the number of bars to be ticked |
| "Needs a nudge" on Today. | **did not do**, only sorting and colouring on Handoff page | The column means "the most likely 3 step" changes the meaning and moves the Phase 3 page. |
| AI Gaps, AI Guide & Q2 | **did not do**. Gaps are generated by rules, and every word in the manual is still recorded. | Q2 did not answer; AI Write sentence requires Juanxi to approve and review prompt |
| Incoming officer as Consulted | Select a light task to allow incoming officer to watch and the task is still going on. | Incoming officer and outgoing are the same role when "visited" makes no sense. |
| Restatement by AI Contrast Manual | "Does it appear in the manual?" No marks. | Ibid. (Q2) and easier to test |
| Split / merge / Archive the Wizard | Two actions: move work, close role; Split = galle + move, merge = move + close | Less interface, less easy to misoperate |
| Questions and answers for the product itself. | Do not create new, read existing research logs and show only | Q3；And hold on to the hard rule of "research data not entering AI prompt." |
| Ask chat press View ass to save separately | **, not**. | Ask behavior for Phase 3 |

**Juanxi's decision:**D-2a (mission to be identified for transfer into office), D-2b (vacant slot replacement outgoing), term model, D-3a (incoming officer readable), Q6 (Phase) 3Taskcard is used on Handoff page, so the whole branch is waiting. 3After closing merge), cap 500,000→520,000), D-6a (Closing file = archive, historical retention), Q3 (question and answer records and research logs are not separated).
**, done at my suggested default value and not explicitly confirmed by Juanxi:** Q2 (AI does not write guide readings), Q4 (incoming officer can see the previous name without turning off the switch), Q5 (seeing the scores only for presidient and incoming officer).

---

## List before 11. metge to `main`

> **2026-11-09 Update:** item 1 (Phase 3) was decided by Juanxi to "directly submit to main"; 2 Divisions Q2, Q4, Q5 confirmed (Q4 plus: incoming officer can see ex-mail boxes and telephones); Numbers 4, 6 and 7 have been done (with merge company merge, no Squash). Item 5 (live ASU AIR drafting manual) **has not yet been validated**; The 3 IRB comparison still needs Juanxi's own confirmation.

1. **Phase 3. Have you received the data yet?** Phase 1–7 was changed to Handoff page and Stages 3, 6 were upgraded to schema application (20 →  22) in violation of the border of Phase 3 " No change to `SCHEMA_VERSION` " . **Only Juanxi says "approved merge".**
2. **identifies three default values:** Q2, Q4, Q5 (see section 10).
3. **IRB: The contents of the new input box (interview answer,read-back, 7/30 day) on** 1Handoff will be entered into the research log like any other action; 2 Incoming officer card reads the log on the page asking questions about Ask (show only, no store, no AI). Please cross-reference the IRB material.
4. **Once more updated `main`** (`git fetch origin main && git merge origin/main`), conflict resolution (most likely the top entries above `docs/PROGRESS.md` and `AGENTS.md`) and rerun of `npm run check`.
5. **Clicks on the preview once with Live AI, Draw left handbook**. See Netlify log: there are more sources of the manual than before (many categories: line/step/confact/lesson), server functions have been changed, but **only uses analog AI to measure** and no live ASU AIR authentication.
6. **Open PR** (to Juanxi agree): "[ preview. Do not take ] first; Choosing **Create a merge company**, instead of Squash, so that you can rollback by stage.
7. **After the merge**Update `AGENTS.md`Section 6d. "In the border." No change. `SCHEMA_VERSION`/`DemoState`"The one. 22) and synchronize the local backup.
8. Netlify environment variable: **does not add**, nor does it add an AI interface (`/api/handbook/draft` only accepts four source types more).

---

## Table 12. rollback (from backwards, submitted under `git revert`; (drawn by phase at the time of submission)

| Phase | Code Submission | Dependence | Undo it and be careful. |
| --- | --- | --- | --- |
| 7 Read Log Display | `9d2c411` | 5 (incoming officer card) | No data changes |
| 6 rule change | `1f2da6c` | 3 | Schema version 22  →  21: Browser data saved as 22 will walk the "Data Backup and Restore Example" path |
| 5 incoming officer process | `6dbc25f` | 3、4 | `RoleHandoff` The extra optional fields remain in the archive without harm. |
| 4 Archives and risks | `92e060e`、`2f0e887`、`f811730` | 3 | Server Functions `handbook-draft.mts` I'm going to go back. Fall back to the 499 KB. |
| 3 term model | `6414cd7` | 2 | ♪ Chema version ♪ 21 → 20: Idem;  The 4–7 phase depends on it. They have to be removed first. |
| 2 Current members take over | `da45e5c` | 1 | In the old test, "accupated" expectations have to be changed. |
| 1 fix bug | `fb495dd` | — | — |
| Upper limit | `42ae862` | — | The single withdrawal will make the front page entrance test red after stage 3. |

---

## 13. Known problems and nothing.

- **Not done:** AI with a gap, AI with a guide (Q2); Today; Ask chats are stored separately; Move tasks by tag batch; The old manual says "the name of the role at the time"; The "outgoing man can turn off the consulting switch" (Q4).
- **Not authenticated:** live ASU AIR drafts a new version of the manual; Makoto and Safari; The screen reader actually reads (only autoa11y check).
- **It's not stable in the browsertes. `main`It would also fail or occasionally, not this time:** `workflow-setup:123`(desktop + cell phone), `organization-setup:1381`、`m4-setup:98`、`production-security:14`、`ob-04`Keyboard File Boxes, `ob-12:208`、`workflow-setup:39`、`tasks:37/68`、`dx-10`、`dx-11`、`phase1:271`(loads and loads occasionally.)
- **Performance budget:** first page entry file 509,017 bytes, cap 520,000, leaving about 11 KB.

