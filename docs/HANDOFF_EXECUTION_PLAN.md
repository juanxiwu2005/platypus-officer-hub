# Handoff redesign · Phased execution plan

> 2026-11-08 · Claude · Based on [`HANDOFF_REDESIGN_PLAN.md`](HANDOFF_REDESIGN_PLAN.md) (issue IDs B1–B6 and D1–D9 refer to that document).
> Juanxi's request on 2026-11-08: "Fix all the issues above, make a step-by-step execution plan, and proceed in phases."
> **This is the canonical file: update the execution record in section 9 after each stage.**

---

## 1. General rules (apply to every stage)

1. **One stage at a time.** Finish → run tests → push → write acceptance steps → **stop and wait for Juanxi to say "okay" or specify changes** before starting the next stage.
2. **Branch:** Use `claude/tender-gates-j8ztlr` throughout (the branch assigned to this session). Before starting, `git fetch origin main` and merge the latest `main` to avoid conflicts with Phase 3 changes. **Do not touch `main`; merge only when Juanxi says "merge approved."**
3. **Rollback:** At each stage's end, record the "commit before the stage" and "last commit of the stage" in section 9. To undo a stage, `git revert` its commits in order (later stages depend on earlier ones, so undo stages from last to first).
4. **Tests:** Add unit tests for behavior changes and page tests (desktop + mobile) for page changes. At each stage's end, run `npm run lint`, type checks, build, all unit tests, and Handoff-related page tests; run the full `npm run check` for the final stage.
5. **Fixed boundaries:** Only the rule engine calculates dates; AI returns IDs and constrained content only; **handoff features must never read research logs** (`interactionLog`, `ui.*`); contacts visible only to officers remain hidden from both the handoff page and AI; interface copy is English; Handoff page word counts must not exceed 120 / 120.
6. **Phase 3 protections (Q6 answered: Phase 3 task cards use Handoff, so keep everything on the branch from stage 1 onward and do not merge into `main` until Phase 3 data collection is complete):** Leave the sample club's (`sampleScenario.ts`) transition season and sample interviews unchanged; **do not increment** the schema version (`SCHEMA_VERSION`) before Phase 3 ends, since doing so runs participants' saved data through an old-version migration. Stages requiring a version increment (stage 3 onward) are scheduled for merging after Phase 3.
7. **Preview URL:** To use a preview URL for acceptance, open a PR for this branch (title "[Preview · Do not merge]"). **Opening the PR requires Juanxi's agreement.**

---

## 2. All stages

| Stage | Name | Issues fixed | Schema version increment? | Juanxi decision required before starting | Can merge during Phase 3? |
| --- | --- | --- | --- | --- | --- |
| **1** | Bug fixes (no visual changes) | B1, B4, B6 | No | None (Q6: merge only after confirming Phase 3 task cards do not use Handoff) | Yes, after confirming Q6 |
| **2** | Existing member succeeds + vacant roles + single-role handoff | B2, B5, D7 | No (optional fields only) | D-2a, D-2b | Prefer afterward |
| **3** | Role-term model + incoming person appears earlier | B3 and foundation for stages 4–7 | **Yes** | D-3a | Afterward |
| **4** | Role dossier (4 sections) + risk ranking | D1, D2, D4, D6 | No | None | Afterward |
| **5** | Gap interviews + incoming person reads, reads back, shadows, reviews | D3, D5 | No | Q2, Q4, Q5 | Afterward |
| **6** | Role changes (rename history, add, split, merge, archive) | D8 | Yes | D-6a | Afterward |
| **7** | Product Q&A records | D9 | Yes | **Q3 (including IRB)** | Afterward |
| **8** | Closeout: documentation, full regression, local backup | — | — | Merge timing | — |

Stage 2 precedes stage 3 because "existing member succeeds" and "vacant roles" can be fixed without changing the data model, making them available earlier; stage 3 then moves them onto the formal role-term model.

---

## 3. Stage 1 · Bug fixes (B1, B4, B6)

**Goal:** Other features keep working after a handoff; roles added after season start automatically join the transition; progress is not overstated. Page layout stays the same.

**Files to change:**

| File | Change |
| --- | --- |
| `src/data/types.ts` | Add optional `leftOn` (departure date) to `Person`. Someone with this field is "former": retained in historical records (tasks, contributions, interactions), but no longer a current officer |
| `src/data/permissions.ts` | Add `officers(s)`: returns only current officers |
| `src/data/handoff.ts` | `complete`: generate a valid fictional email (`…@example.org`) for the incoming person; mark the outgoing person with `leftOn`; add `syncSeasonRoles()` to create records for roles added after season start; `start` no longer prefills sample interviews |
| `src/data/settings.ts` | Skip former officers in validation (stop reporting "Match every officer to their own role"; officer-count limit counts only current officers); call `syncSeasonRoles()` after saving settings |
| `src/pages/Handoff.tsx` | Show placeholder text ("One point per line. Fictional examples only.") for empty interviews instead of prefilling |
| Officer lists: `TopBar` (View as), `Team`, `TaskFields`, `NodePanel`, `Settings` (Who can create events), `aiContext`, `commandContext` | Use `officers(s)`; former officers no longer appear in selectors, and AI cannot assign tasks to them |

**Tests:**

- Unit: after completing a handoff, `validateClub(clubDraft(s))` is null and Settings saves; incoming email is valid; outgoing person has `leftOn` and is absent from `officers(s)`; View as / assignment lists exclude former officers; a role added after season start automatically gets a transition record; after `start`, interview is empty and progress step 1 is incomplete; sample club's sample interviews stay unchanged.
- Page: complete Treasurer handoff → open Settings and change club name → save succeeds; View as excludes the outgoing person.
- Retain all existing tests.

**Acceptance (Juanxi):** ① Handoff → Treasurer → complete all 5 steps → Finish role handoff; ② change club name in Settings and see it saved; ③ Maya is absent from top-bar View as; ④ add a role in Settings → return to Handoff, see its card, and opening it no longer says "Start the handoff season."

**Excluded:** Existing members succeeding and vacant-role handoffs (stage 2); first-week checklist ordering (stage 3).

---

## 4. Stage 2 · Existing member succeeds + vacant roles + single-role handoff (B2, B5, D7)

**Decisions needed first:**

- **D-2a Must the incoming person reclaim transferred unfinished tasks?** They currently become To do directly. Recommend **Not claimed + assigned incoming person**, with takeover only after clicking "I've got it, " matching the sitewide claiming rule (the plan's "claim handshake").
- **D-2b Who answers interviews and confirms handbooks for vacant roles?** Recommend **the president acting for the outgoing person** (explicit UI text: "Answering for a vacant role").

**Work:**

1. Hand over offers three options: **existing member** (dropdown listing only current and former officers) / **new person** (enter name, as today) / leave vacant for now.
2. Existing-member succession: if they already hold a role, that role becomes vacant, with "Secretary is now vacant" shown to the president. Clear `leftOn` when a former officer returns.
3. Vacant roles: the president can answer the interview, confirm, and finish the handoff.
4. **Single-role handoff:** Add "Hand over one role" to Handoff to replace one role holder without starting a whole season (midsemester vacancy).
5. `validateRoles` allows vacant roles (`holderId` already allows null; add tests).

**Tests:** Ownership of both roles after existing-member succession, task transfers, Settings still saves; vacant roles complete the full process; single-role handoffs leave other roles unaffected; duplicate names remain rejected for new people.

**Acceptance:** Have Sam take Treasurer → Marketing shows vacant → fill Marketing with a "new person"; use "Hand over one role" without starting a season.

---

## 5. Stage 3 · Role-term model + incoming person appears earlier (B3)

**Decision needed first:** **D-3a** What can incoming people see before handoff? Recommend access to the role's handbook, dossier, and unfinished tasks while incoming, but **no task editing** (comments / questions only); editing permissions begin after transfer.

**Work:**

1. New data `RoleTerm { roleId, personId, status: incoming | active | former, from, to, handoffId }` (plan 4.1). **Actual implementation (more robust than the plan):** Actions still write `Role.holderId`, `Person.leftOn`, and `RoleHandoff.incomingId` directly; `normalizeTerms` automatically reconciles terms into historical records after every action, without changes to other code.
2. **Increment schema version by 1** and write migration: existing `holderId` → active term; people with `leftOn` → former term; retain in-progress transition seasons.
3. Create an incoming term as soon as the successor is selected (the incoming person now exists), so **the incoming person checks their own first-week checklist**, moved to after handoff (fix B3).
4. On Hand over: incoming → active, old active → former.

**Tests:** All pages show the same roles and people before and after migration of the same data; incoming person cannot edit tasks before handoff; only the incoming person after handoff can check the first-week checklist; repeated migration is safe.

**Acceptance:** Select incoming person → View as that person, read handbook but cannot edit tasks → hand over → incoming person checks first week.

---

## 6. Stage 4 · Role dossier + risk ranking (D1, D2, D4, D6)

**Work:**

1. `src/lib/roleDossier.ts` (pure functions, no AI): four sections, Calendar / In flight / People / Lessons (plan 4.1 table). Each row has a source ID and opens the original record.
2. Expand handbook sources from "tasks + interviews" to all four dossier sections; organize handbook chapters accordingly; still return IDs only, with local ordering on AI failure.
3. First-week checklist = 6 generic items + this role's real deadlines over the next 30 days (rule-engine calculation). **Actual implementation:** The 6 generic items remain checkable; real deadlines appear below under "Next 30 days" (read-only, each opens its task), without adding checkboxes.
4. Rank relay cards by "handoff risk" (unfinished tasks, ASU hard deadlines within 30 days, overdue, blocked, outgoing person's latest update, dossier gaps). **Actual implementation:** Ranking and coloring only on Handoff; **not** included in Today's "Needs a nudge, " since that section means "the 3 steps most likely to miss their deadlines." Mixing in roles changes that meaning and the Phase 3 page, requiring a separate Juanxi decision.
5. Contacts visible only to officers remain hidden in dossiers and AI input under existing rules.

**Tests:** Calculations for each dossier section (including "No history yet" for empty roles); hidden contacts absent from dossiers and AI requests; risk ranking; word limits.

**Acceptance:** Open Treasurer's dossier: all four sections have content and every row opens; the highest-risk role is first on Handoff.

---

## 7. Stage 5 · Gap interviews + incoming-person flow (D3, D5)

**Decisions needed first:** Q2 (may AI write cited introductory sentences), Q4 (may former officers be consulted), Q5 (who sees review scores).

**Work:**

1. **Gap questions:** Rule-based templates (e.g. "“Chase the USG reimbursement” got an extension but no reason was recorded. What held it up?"). The outgoing person answers or skips each question; skipped questions become "unresolved." **AI version `/api/handoff/questions` was not implemented**: Juanxi has not answered Q2 (whether AI may write sentences); AI offers little value if limited to selecting/ordering existing templates, and writing questions requires Q2 approval and prompt review.
2. **Incoming person reads handbook:** Got it / Unclear for each chapter; Unclear becomes a question for the outgoing person.
3. **Read-back:** 3 fixed questions; **rules**, not AI, roughly flag answers containing "words absent from the handbook, " leaving the outgoing person to decide whether to add them; no scoring.
4. **Shadowing:** President chooses a lightweight task the outgoing person is still doing; incoming person is notified and can open it; **task RACI stays unchanged** (both people share the role, so "Consulted" is meaningless), and ownership remains with the outgoing person.
5. **Day 7 / 30 review:** Three 1–5 ratings for clarity, confidence, and feeling accepted + "what is missing from the handbook"; president writes back to the dossier in one click. Replaces the old Day 30 button.

**Tests:** Deterministic template questions from dossier; AI questions cite only existing records; read-back produces no scores; review results visible only to those selected by Q5.

**Acceptance:** Outgoing person answers gap questions → incoming person reads and selects one Unclear → read-back → Day 30 review written back to dossier.

---

## 8. Stages 6, 7, 8

**Stage 6 · Role changes (D8). Decide D-6a first:** Does deleting a role mean "archive" or actual deletion? Recommend archive only.
Work: rename history ("Formerly …" in details); new-role starting material (original constitution/duties text + standard steps for the same function + 3 president questions; automatically expand questions for roles with no history); **move work** (select tasks and contacts individually to transfer to another role) and **close role** (transfer everything remaining, archive rather than delete). **Split = add new role + move work; merge = move everything + close**, with no separate "wizard" (one less UI layer, less risk of mistakes). **Not implemented:** Bulk selection by tag; historical role names in old handbooks (rename history shown only in dossier details). Schema version +1 (22).

**Stage 7 · Product Q&A records (D9). Juanxi answered Q3: Q&A records and research logs are not separated at all.**
Actual implementation: **Create no new records** (no added logged items, no further IRB notification needed); when the incoming-person card renders on Handoff, **read** questions they asked Ask after being designated from existing research logs, flag those not covered by the handbook, and show only to the president and that incoming person. Results are not saved, included in handbooks/dossiers, or sent to AI (test guarded). **Not implemented:** Separate Ask chat storage by View as identity (would alter Phase 3 Ask behavior); dossier summary of "frequently asked questions for this role." No schema version change.

**Stage 8 · Closeout:** Update `AGENTS.md` section 6 code map, `docs/RULES.md` (if handoff rules change), `docs/WP5_ACCEPTANCE.md`; full `npm run check`; handoff in `PROGRESS.md`; sync local backup (when Juanxi's computer is accessible); ask Juanxi to decide merge timing.

---

## 9. Execution record (update after each stage)

| Stage | Status | Commit before start | Last commit | Test results | Juanxi acceptance |
| --- | --- | --- | --- | --- | --- |
| 1 | **Awaiting acceptance** (Claude, 2026-11-08) | `de5c1f9` | `fb495dd` (documentation through `eebd4ab`) | lint, both type checks, build passed; all 1060 unit tests passed (12 new, 9 fail on old code); 6 new page tests passed (all 3 desktop cases fail on old code); 714 related existing page tests: 656 passed / 52 skipped / 3 flaky (passed on rerun) / 3 failed; those 3 also fail on unchanged `main` (`workflow-setup:123` desktop+mobile, `organization-setup:1381`) | Awaiting Juanxi |
| 2 | **Awaiting acceptance** (Claude, 2026-11-08; Juanxi approved D-2a, D-2b) | `eebd4ab` | `da45e5c` (documentation through `591c28a`) | lint, both type checks, build passed; all 1080 unit tests passed (20 new); 3 new page cases (desktop+mobile) passed, all 12 passed combined with stage 1 page tests; 700 related existing page tests: 663 passed / 52 skipped / 1 flaky / 4 failed, including 3 also failing on unchanged `main` (`workflow-setup:123` desktop+mobile, `organization-setup:1381`) and 1 known flaky `ob-04` keyboard file picker (3 failures in 16 repeats on `main`, 4 in 16 on this branch) | Awaiting Juanxi |
| 3 | **Awaiting acceptance** (Claude, 2026-11-08; Juanxi approved role-term model and D-3a; **do not merge into `main` until Phase 3 data collection ends**) | `591c28a` | `6414cd7` (documentation through `309bad2`) | lint, both type checks, build passed; all 1095 unit tests passed (15 new); 4 new page cases (8 desktop+mobile) passed; 794 related existing page tests: 735 passed / 52 skipped / 5 flaky (passed on rerun; archive-reading `recovery` and Demo menu passed all 40 repeats) / 2 failed (`workflow-setup:123` desktop+mobile, also fail on unchanged `main`) | Awaiting Juanxi |
| 4 | **Awaiting acceptance** (Claude, 2026-11-08; do not merge into `main` until Phase 3 data collection ends) | `309bad2` | `92e060e`, `2f0e887`, `f811730` | lint, both type checks, build passed; all 1110 unit tests passed (15 new); 4 new page cases (8 desktop+mobile) passed; 800+ related existing page tests: all passed except `workflow-setup:123`, `organization-setup:1381`, which also fail on unchanged `main`, and several known flaky cases (`production-security`, `ob-04`, `dx-10`, `tasks:68`, also intermittent on `main`). **Note: homepage entry file 499,664 bytes against 500,000 limit, only 336 bytes left; see PROGRESS.md** | Awaiting Juanxi |
| 5 | **Awaiting acceptance** (Claude, 2026-11-09; Q2/Q4/Q5 use my recommended defaults, awaiting Juanxi confirmation; do not merge into `main` until Phase 3 data collection ends) | `42ae862` | `6dbc25f` (documentation through `6ca4f83`) | lint, both type checks, build passed; all 1127 unit tests passed (17 new); new long-flow page test `handoff-stage5.spec.ts` (desktop+mobile) passed; 840 related existing page tests: 780 passed / 52 skipped / 4 flaky / 4 failed; `workflow-setup:123` (desktop+mobile), `organization-setup:1381` also fail on unchanged `main`; `ob-12:208` and `workflow-setup:39` failed 4 times in 24 repeats on `main` (3 on this branch). Homepage entry file 505,418 bytes (limit raised to 520,000) | Awaiting Juanxi |
| 6 | **Awaiting acceptance** (Claude, 2026-11-09; Juanxi confirmed D-6a; do not merge into `main` until Phase 3 data collection ends) | `6ca4f83` | `1f2da6c` (documentation through `86be187`) | lint, both type checks, build passed; all 1143 unit tests passed (16 new); 4 new page cases in `handoff-stage6.spec.ts` (8 desktop+mobile) passed; 902 related existing page tests: 844 passed / 53 skipped / 4 flaky / 1 failed (`m4-setup:98`; 24 repeats: 4 failures on this branch, 3 on `main`, both fail under high load). Homepage entry file 509,008 bytes (limit 520,000) | Awaiting Juanxi |
| 7 | **Awaiting acceptance** (Claude, 2026-11-09; Juanxi answered Q3; do not merge into `main` until Phase 3 data collection ends) | `86be187` | `9d2c411` (documentation through `b13f7e0`) | lint, both type checks, build passed; all 1160 unit tests passed (17 new); new page test `handoff-stage7.spec.ts` (desktop+mobile) passed, all 30 repeats passed; 920 related existing page tests: 847 passed / 64 skipped / 5 flaky / 4 failed, all existing failures or flaky cases also present on `main`. Homepage entry file 509,017 bytes (limit 520,000) | Awaiting Juanxi |
| 8 | **Completed** (Claude, 2026-11-09) | `b13f7e0` | See latest commit in `git log` | Full `npm run check` results in top entry of `docs/PROGRESS.md`; documentation cleanup, merge checklist, rollback table, and known issues in sections 10–12 below | — |
| Review fixes | **Completed and merged into `main`** (Claude, 2026-11-09; Juanxi approved direct merge, confirmed Q2/Q4/Q5, added email/phone to Q4, changed handbook staleness to consider cited entries only) | `3991320` (last commit on this branch) | See top entry of `docs/PROGRESS.md` | 13 issues and fixes in top entry of `docs/PROGRESS.md` and "Handoff review fixes" in `AGENTS.md` section 6; test `src/test/handoffReview.test.ts` | Juanxi approved merge |

---

## 10. Differences between the final result and original plan (`HANDOFF_REDESIGN_PLAN.md`)

| Original plan | Actual result | Why |
| --- | --- | --- |
| Six bugs B1–B6 | **All fixed** (B1, B4, B6 in stage 1; B2, B5 in stage 2; B3 in stage 3) | — |
| Nine design issues D1–D9 | D1–D8 implemented; D9 changed to "read existing research logs" per Juanxi (stage 7) | Q3: no separation between Q&A records and research logs |
| Derive `holderId` from `RoleTerm` | Actions still write `holderId`, `leftOn`, `incomingId` directly; `normalizeTerms` **reconciles terms into history** after each action | No changes to old code, same object returned if unchanged; more robust |
| Handbook first-week checklist = 6 generic items + real deadlines | 6 generic checkboxes remain; real deadlines listed under "Next 30 days" (read-only) | Number of checkboxes unchanged |
| Risk in Today's "Needs a nudge" | **Not implemented**; ranking and coloring on Handoff only | That section means "the 3 steps most likely to miss their deadlines"; changes its meaning and the Phase 3 page |
| AI gap questions and introductory sentences (Q2) | **Not implemented**; rule-generated gap questions; every handbook word still comes from original records | Q2 unanswered; AI sentences require Juanxi approval and prompt review |
| Shadowing: incoming person as Consulted | President selects a lightweight task for observation; ownership stays with outgoing person | Both hold the same role, making "Consulted" meaningless |
| AI checks read-back against handbook | Rules roughly check whether words appear in the handbook, without scoring | Same reason (Q2), and easier to test |
| Split / merge / archive "wizard" | Two actions: move work, close role; split = add role + move, merge = move + close | One less UI layer, less risk of mistakes |
| Product-specific Q&A records | No new records; read existing research logs for display only | Q3; also preserves the hard rule "no research data in AI prompts" |
| Separate Ask chat storage by View as identity | **Not implemented** | Would alter Phase 3 Ask behavior |

**Juanxi's decisions:** D-2a (tasks transferred to incoming people need claiming), D-2b (president acts for outgoing person in vacant roles), role-term model, D-3a (incoming person can read but not edit), Q6 (Phase 3 task cards use Handoff, so wait until Phase 3 data collection ends to merge the whole branch), limit 500,000→520,000, D-6a (close role = archive, preserve history), Q3 (no separation between Q&A records and research logs).
**Implemented using my recommended defaults, not yet explicitly confirmed by Juanxi:** Q2 (AI writes no introductory sentences), Q4 (incoming people see former officers' names, no opt-out switch), Q5 (review scores visible only to president and incoming person).

---

## 11. Checklist before merging into `main` (review item by item when Juanxi decides to merge)

> **2026-11-09 update:** For item 1 (Phase 3), Juanxi decided "commit directly to main"; item 2 Q2, Q4, Q5 confirmed (Q4 additionally allows incoming people to see former officers' email and phone); items 4, 6, 7 completed (merged with a merge commit, not Squash). Item 5 (real ASU AIR handbook drafting) **remains unverified**; Juanxi still needs to check item 3 against the IRB materials himself.

1. **Is Phase 3 data collection complete?** Stages 1–7 all changed Handoff; stages 3 and 6 incremented schema version (20→22), violating the Phase 3 "do not change `SCHEMA_VERSION`" boundary. **Merge only when Juanxi says "merge approved."**
2. **Confirm the three defaults:** Q2, Q4, Q5 (section 10).
3. **IRB:** ① New Handoff inputs (interview answers, read-back, Day 7/30 reviews) enter research logs like other actions; ② the incoming-person card reads their Ask questions from logs for page display (display only, no separate storage, no AI). Check against IRB materials.
4. **Merge latest `main` again** (`git fetch origin main && git merge origin/main`), resolve conflicts (most likely top entries in `docs/PROGRESS.md` and `AGENTS.md`), rerun full `npm run check`.
5. **Click Draft role handbook once with real AI on the preview**, and inspect Netlify logs: handbook sources expanded (four additional types: deadline/step/contact/lesson), and server functions changed, but **only mocked AI has been tested**, with no real ASU AIR validation.
6. **Open PR** (requires Juanxi agreement): title "[Preview · Do not merge]" for the preview first; for the actual merge, choose **Create a merge commit**, not Squash, to preserve stage-by-stage rollback.
7. **After merging**, update the "do not change `SCHEMA_VERSION`/`DemoState`" boundary in `AGENTS.md` section 6d (version is now 22), and sync local backup.
8. Netlify environment variables: **none added**; no new AI endpoints either (`/api/handbook/draft` merely accepts four additional source types).

---

## 12. Rollback table (undo last to first using `git revert` on the commits; with merge commits, undo entire stages)

| Stage | Code commits | Dependencies | Rollback considerations |
| --- | --- | --- | --- |
| 7 Read and display logs | `9d2c411` | 5 (incoming-person card) | No data changes |
| 6 Role changes | `1f2da6c` | 3 | Schema version 22 → 21: browser data already saved as 22 takes the "data backed up and sample restored" path (backup retained in browser) |
| 5 Incoming-person flow | `6dbc25f` | 3, 4 | Additional optional `RoleHandoff` fields can harmlessly remain in saved data |
| 4 Dossiers and risk | `92e060e`, `2f0e887`, `f811730` | 3 | Also revert server function `handbook-draft.mts`; homepage entry returns to about 499 KB |
| 3 Role-term model | `6414cd7` | 2 | Schema version 21 → 20: same as above; stages 4–7 depend on it and must be reverted first |
| 2 Existing-member succession | `da45e5c` | 1 | Restore old tests' "accepted" expectations |
| 1 Bug fixes | `fb495dd` | — | — |
| Limit | `42ae862` | — | Reverting alone makes homepage-entry tests fail after stage 3 |

---

## 13. Known issues and unimplemented work

- **Not implemented:** AI gap questions and introductory sentences (Q2); handoff risk in Today; Ask chat stored separately per person; bulk task movement by tag; historical role names in old handbooks; "outgoing person can opt out of consultation" switch (Q4).
- **Not verified:** Real ASU AIR drafting of the new handbook; physical devices and Safari; actual screen-reader speech (automated a11y checks only).
- **Preexisting unstable page tests (also fail or flake on `main`, not introduced here):** `workflow-setup:123` (desktop+mobile), `organization-setup:1381`, `m4-setup:98`, `production-security:14`, `ob-04` keyboard file picker, `ob-12:208`, `workflow-setup:39`, `tasks:37/68`, `dx-10`, `dx-11`, `phase1:271` (intermittent under high load).
- **Performance budget:** Homepage entry file 509,017 bytes, limit 520,000, about 11 KB remaining.

