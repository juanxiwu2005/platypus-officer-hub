# Handoff Module Adjustment Program

> **Status ( 2026-11-09: Pressed `HANDOFF_EXECUTION_PLAN.md`](HANDOFF_EXECUTION_PLAN.md)min 8One stage in the branch. `claude/tender-gates-j8ztlr`Let's get it done before Juanxi access;  Phase 3 does not reach `main` until the data is collected. The difference between the** practice and this programme can be found in section 10 of the Implementation Programme. The original programme is set out below, on which the basis is retained.

> 2026-11-08 Claude . Write only the scheme, **has not changed any code**.
> Based on: `main` top `fc9eccd` (PR #12 later). Other remote branches have not changed the Handoff code (checked one by one): `claude/keen-gauss-ye3gvr`Only one more document is submitted. `integration/v1.0`、`integration/v1.6`、`claude/quirky-noether-x8jtj3`、`feat/ai-native-phase1`It has nothing to do with Handoff.
> Reader codes: `src/data/handoff.ts`, `src/lib/handbook.ts`, `src/pages/Handoff.tsx`, `netlify/functions/handbook-draft.mts`, `src/data/types.ts`, `src/data/settings.ts`, `src/pages/Join.tsx`, `src/components/rail/AskPanel.tsx`, `src/lib/uiLog.ts`, `src/data/sampleScenario.ts`.
> The bugs of the 2 section ran over `seedDemo()` with temporary unit tests (test not submitted).

---

## 0.

Handoff now is "**outgoing"**. ": Outgoing people write a few lines interview  →  AI picks 12 from this person's mission title and rehearses two signatures to hook up 6 generic lists  →  the system creates a new name to take over.
**does not use the platform ' s greatest advantage** (all tasks, contacts, interactions, extensions, card points, AI question-and-answers are stored), and there are several logics that are counterproductive or that are likely to choke (Section 2).

It is proposed to change to "**autoaccumulate, handoff fills only gaps**":

1. The system usually compiles a copy of each role automatically. **Role Archives**(NO AI, INDISTINCTLY)
2. **looks at what's missing and asks out-of-person questions about**, instead of letting out-of-persons remember blank frames.
3. Incoming officer is not passive receipt of the document, but **reads and recapitulates and takes over a real thing. 7/30 looks back at**, looks back at the gaps found when looking back and writes the file. Next time, it's better.
4. The data divides " **** " and " **model** " so that existing members can be transferred, re-elected, filled in vacant posts, changed during the term, added or renamed.

---

## 1.

| Steps | Who's doing it? | Code | Actual effects |
| --- | --- | --- | --- |
| StartLeadership Transition Season | _Other Organiser | `changeHandoff` `start` | Here. **♪ All that existed then ♪**Make one record each and insert two prefixes to the "Example (actional)..."  |
| 1 Interview | Outgoing personally | `interview` | One line, maximum 20 line. **Because it's prefilled. First season. 1Let's do it.**  |
| 2 Handbook | Outgoing or presiding | `draft` + `/api/handbook/draft` | There are only two types of sources: the task under this person's name (the phrase "title + why + status") and the interview line. AI can only renumber with a maximum of 12 reordering; AI Press local "interview  →  assignment completed" when failed |
| 3 Sign-off | ♪ Outgoing people confirm ♪ | `confirm` / `approve` | When the source changes (any task changed why/state) it has to be reworked. |
| 4 First week | President, outgoing or incoming officer | `check` | 6 Article SEO Common List, all rolls |
| 5 Hand over | I don't think so. | `complete` | Enter one **New name.**, the system copying human data to create an incoming officer and moving uncompleted (state changed to accessed), the contact automatically follows because it is hung on a roll  |
| Day 30 | president or incoming officer | `review` | It's just a button. |

Pages: Top of a leadership progress seasonal progress chain (5 date points, `handoffDates` count), with one relay card for each role below (outgoing person  →  incoming officer, 7 grid) and right bar above 5 moves.

---

## 2. Discovered problems (first in bug, then in design)

### 2.1 confirmed existence bug

| # | Problem | How? | Impact |
| --- | --- | --- | --- |
| B1 | Once **handoff has been completed, Settings' student organization settings can no longer exist. The** incoming officer mailbox is empty (example.org); "Match every office to their own rule" after adding it to the mailbox, because outgoing people are still on the list. `roleId` Still pointing to the original role, but the role `holderId` Already incoming officer | Temporary test: After Treasurer handoff `validateClub(clubDraft(s))` It's a bad mail box, and it's in the back. | If you finish a roll, change the name of your target or target, and add the rule will fail. |
| B2 | **Existing members cannot take over.** `complete` We're asking for a new name not to be renamed to anyone we have. | Treasurer. `completed` Still the false | Internal upgrades, transfers (e.g. Secretary  →  VP) are not possible |
| B3 | **'s first week list is filled up before coming office.** `complete` Asked for 6 to be done to handoff, but incoming officer `complete` That's when they built it. `incomingId` Yeah, that's it. | Provisional test: after season `incomingId === null` | The first week of "incoming officer" can actually only be replaced by a president or outgoing, in reverse order. |
| B4 | The new rule after the **season will not enter the leadership translation.**, a little more. Save dates, no. | Temporary test: Add "Events Chair" after the season, rolls 6, leadership translation records are still 5 | The details of the new role show "Start the handoff season..." but the season is open. |
| B5 | **vacancy rule cannot handoff.** without outgoing people who can't write an interview, confirm it; `complete` Requesting an old man. | Read Code ( `self = outgoingId === viewerId`，`complete` Lee. `if(!old) return s`） | The new role, when someone quits, the role never makes it up to anyone. |
| B6 | The 1 step is "open season complete" for prefilling the example. | Read Code ( `interview.length > 0`） | President saw the pace of progress. |

### 2.2 Design problems

| # | Problem | Why does it matter? |
| --- | --- | --- |
| D1 | The **handbook is too narrow a source.** Read only "The title of the task under this person's name + why + state" and interview. Not read: Contact person and interactive time line, activity and funding phase, extension request and justification, record/cuff record, reminder, punctuality, change order, feedback, AI question-and-answer | The platform's greatest advantage is completely useless; Incoming officer gets a series of task titles. |
| D2 | The **manual is the reordering of 12 once text.**, there's no chapter. | I don't know what I'm gonna do next week. |
| D3 | **interview is an empty text box.**, no problem guide. It's outgoing. | The hardest thing to study is "Why, with whom, where the pits are." |
| D4 | **First week's list is all the same.**♪ There's no way ♪ 30Day-live cutoff date  | What I need most is, "When is the first hard cut-off day after I take over?" |
| D5 | **incoming officer is passive.** did not take the step of "repeating and asking yourself after reading," did not follow the shadow period, did not incoming officer | In the medical handoff study, receiving restatement is the most critical step in reducing errors (see 3) |
| D6 | **presentent does not see the risk.** only progress loops, no "role handoff most dangerous". | President should focus on the most dangerous one or two. |
| D7 | **can only be exchanged throughout the season.**, someone quits the semester, a single role filler has to start a full season. | It's very common for students to change people in the middle of a term. |
| D8 | **rule is not fully supported.** change of name is no problem (role ID unchanged, records follow); Add role to leave translation (B4) without startup information; Split, merge, delete role not supported | %1 is adjusted every year |
| D9 | **AI question-and-answer notes cannot be used directly now.** Ask chats only have the last 60 in the browser, all View as share one key `platypus.v1.chat`）；Full question once text in **Research Log**（ `ui.ask`It's IRB research data. | **can't read research log** |

---

## 3. Research: Handoff, how to do it?

Here's the handoff and incoming officer induction studies that are more mature and relevant to us, and the design that follows corresponds here.

| Source | Core conclusions | How do we use it? |
| --- | --- | --- |
| **I-PASS Hospital Referral Procedure** (Starmer et al.,*NEJM* 2014, 9 hospitals) | The **recipient repeats** in its own words, using a fixed structure (pathology, summary, to-do, emergency preparedness). Decline of medical errors after implementation 23%, preventable negative events drop by about 30% of shift time has not changed  | The manual uses fixed chapters; Incoming officer has to do the Read-back step. |
| **Invisible Knowledge and SECI Model** (Polanyi); Nonaka & Takeuchi 1995） | What can be written is explicit knowledge; "How to do, why, who to find" is so invisible that it's all about working together and talking. | Add "and do something real" to the document; You know, interview asks, "Why?" |
| **Knowledge Loss Study** (DeLong, *Lost Knowledge*, 2004; Leonard & Swap, *Deep Smarts*, 2005） | (a) Separation only upon separation from service; The way it works is... **Constantly recorded**, handoff **Targeted questions**and **Practice with guidance**  | (c) Automatic accumulation of archives; AI problem by file gap instead of blank |
| **U.S. Army AAR and Handoff** (Relief in Place) | Incoming officer first sits in the right seat and then turns to left-wing, old man bystanders, and finally hands over command; Short copy after each task | Incoming officer first collaborates with a live task and then is responsible (R); 30 Days to make a remix |
| **incoming officer Socialization study** (Bauer et al. 2007 meta-analysis),*J. Applied Psychology*; 4C framework for Bauer) | Incoming officer adapts to three things: **rule clarity, sense of self-effectiveness, acceptance by the team**. Frame (rules), Clarity (function), Culture (culture), Connection | The four parts of the manual correspond to 4C; 7/30, look back at these three things. |
| **Watkins, *The First 90 Days*** | Incoming officer wants to talk early and clear with his superiors: status, expectations, ways of working, resources, growth; Let's start with an early victory. | The first week of alignment with the president; The first winning mission will be picked by the system from the archives. |
| **TWI Work Guidance Act**WWII American Training Act  | Prepare # Demonstration # Let incoming officer try to follow up | Read it, read it, do it, lead it, look back. |

**Combining role or new role handoff 7Steps:**

1. **Inventory**: The system automatically generates role files (no AI, no write).
2. **Filling Gap**: AI looked at the file and asked only questions that could not be answered in the file of the outgoing people.
3. **Book**: A manual with fixed sections for files and answers. Each sentence has a source.
4. **Handoff will.**: outgoing person and incoming officer over by the manual;  Incoming officer echoes and asks questions in his own words.
5. **Follow-up**: Incoming officer works together to do a live task while the people are still alive.
6. **Transfer**: one-time transfer tasks, affiliations, missions; Outgoing people become "formers", not disappearing.
7. **Looking back at**: Days 7 and 30, incoming officer Look at three indicators (definition, confidence, acceptance).

---

## 4. New design

### 4.1 3 bottom adjustment

**(1"Man" and "role term" are separated.**

Now a man can only have a roll (`Person.roleId` + `Role.holderId`), handoff by " copying old artificials into coming office." there shall be substituted:

```
RoleTerm(role term)
  roleId      Which one?
  personId    Who?
  status      incoming(Designate) /I'm on it. | active(in service) | former(former)
  from / to   Start date (rule engine)
  handoffId   This time, when was the handoff created?
```

- One rule can also have 1 active + 1 incoming.
- Outgoing later former, a person is still in the station organisation (which can be an ordinary member and can take another roll) or is marked as "leaved away".
- `Role.holderId` reserves, as a quick way to "current incumbent", calculated by term, without major changes in the old code.
- This step will allow schema vension + 1.

**Solutions:** B1, B2, B3, B5, D7.

**(2) file (Role dossier): Auto-accumulation without AI**

Every single file page, all of which has been recorded **Determinability calculations**You can see it at all times (not only the restership season).  4 pieces corresponding to 4C:

| Blocks | Contents | From which records? |
| --- | --- | --- |
| **Calendar**. | The role is responsible for steps and the usual advance in each type of activity; Next 30 day live cut-off date (especially ASU hard) | Activity flow template `fn` / `ownerRoleId` It's this roller step, `schedule.ts` Dates, history of calculation `completedOn` |
| **In flight** (in progress) | Unfinished, what is waiting (who is waiting), at which stage the funds card and pending extensions | `nodes`、`waitingOnPersonId`、`funding`、`extensionRequests` |
| **People** | This role contact, last interaction, next steps and date; Other role (A/C/I in RACI) | `contacts`（`ownerRoleId`）、`interactions`Node `approverRoleId` / `consultedRoleIds` |
| **Lessons** | Which tasks have been extended and why; Which have been taken over by the silence agreement; (a) Which steps have a low rate of punctuality; Questions often asked. | `extensionRequests.reason`、`silenceCases`、`protocolLog`、`contributions.onTime`Questions and Answers on Products (see below) |

- Each line of the file can look at the original record, just like the "Source" in the current manual.
- Compliance with existing rules: dates from rule engine only; Only officer visible (`visibility: "leads"`) contacts are hidden under the same rules in their files.

**Solve:**D1, D2, D4, and "handoff from writing out to autoaccumulation." 1Really landed.

**(3) The product ' s own question and answer record (separate from the research log)**

- Creates a new **product data**: Who, who on the rolle board, what do you ask, what records are cited by AI and whether they have been used. Exists in the student organization data, by person (not all View as share a 60 article).
- The **research log (`interactionLog`/`ui.ask`) is still active and the manual will never read it.** this is IRB border.
- The Lessons block of the file shows "this rale question that is often asked" (show only clusters of questions and rules/records cited by AI, do not show other people's words unless the questioner chooses to be public).
- **It's up to you.**: Whether this record is added and whether IRB should be notified (see 6Section Q3.

### 4.2 president view workflow

**entrance:** Handoff page (page word cap 120, without long text, by color and suspension card).

1. **Opening season or single roll handoff.** Two buttons: Start Handoff Season (for the whole season)/ Hand over one rule (for a single roller, use during term). Only rolls to be replaced at the beginning of the season. A new rolle entry after season (repair B4).
2. **Specifies incoming officer** (each)
   - Selection of an existing member (internal promotion/reassignment, repair B2);
   - Sending invitations to new recruits (incoming officer fills out the information itself, see 4.3B);
   - Remain vacant for the time being (role vacancy, see below).
3. **See risk sorting.** One relay card for each roll, sorted according to "handoff risk" (rules, no AI): number of tasks not completed, ASU hard cut-off within 30 days, number of recent updates by outgoing people, file gaps. The most dangerous platoon is top, and into the Today risk queue.
4. **Approval manual.** Same as now: outgoing people confirm the president approval. The difference is that the president saw "the manual with chapters + the gap list" instead of reordering the 12 sentence.
5. **hosts** (optional but recommended): The system generates a page of the agenda (manual chapter + incoming officer rehearsing + legacy), president can just "open" it.
6. **point Hand over complete the handover.** system once-in-a-lifetime: term incoming — active, older active — former; Incoming officer (incoming officer still requires "I've got it" recognition, not direct access, maintaining full-stop rules); Contact with role to go (now is); Missions with role go.
7. **On Day 30, look back at the results**: Three fractions (resolution, confidence, acceptance) + adding officer. "What's missing in the manual?"

**Vacancies rale** (no outing): president plays "outgoing" -- answer AI's questions based on the files (mostly empty); Or "Start from a textlate" (see 4.4).

### 4.3 Workstream for the Perspective of Members

**A.** already in the organization

| Situation | Process |
| --- | --- |
| **outgoing** | 1 "Your Treasurer handbook is ready to review"; 2 Open file, system filled 80 per cent; 3 Answers to AI 's 5–8 questions based on the gap (for each question, "unsolved"); 4 Confirmation of the manual; 5 and incoming officer open handoff meetings, bring incoming officer to do one thing; 6 Turned into "former" after handover, shown as "Ask your predecessor" in an incoming officer file. |
| **Transfer/ Promoted member** (a roller outing person, another roll incoming officer) | Both processes appear on his Today: hand over the old rule + pick up the new rule. The system checked if the hard cut-off days on both sides hit the same week. |
| **Re-elected**  | Not into the process. But it's still possible to "update the archives" within the season to prepare for later. |

**B. Incoming officer**

1. Dot Invitation Link (Rale in the link) — Filling information (using existing Join/ member onboarding, no other set).
2. **Read the manual**: read by 4 block; "Got it" or "Unclear" (Unclear automatically becomes a question for outgoing people).
3. **recapitulating** (Read-back): Answer the 3 fixed question -- "What's the most important thing in the next 30 day? ".." Meet X. Who would you call first? What's the easiest place to make mistakes with this role? "。AI uses only "unlikely or not" from the manual to confirm that **does not score, wrong or wrong**.
4. **Follow-up**: The system selects from the archives a recent, difficult and human task ( "early victory"), incoming officer (C) as a collaborator, outgoing is the person responsible (R).
5. **First week after the transfer**: rale exclusive list = generic 6 (SEO/R16, reservation) + this rule life cut-off date for the next 30 days. Incoming officer already exists and can do it on its own.
6. **Days 7, day 30 look back at**: Three questions of 1–5 (clearness, confidence, acceptance) + "What's missing from the manual."
7. **Incoming officer before 30Questions from AI**: If there's anything in the manual, it's not easy to find it;  If not in the manual, it's a gap. Both of them. 30The day is condensed to the president and outgoing people (only for the subject of the question, not incoming officer).

### 4.4 rule change

| Change | Now. | Recommendations |
| --- | --- | --- |
| **Change of name**  | All right, roll I.D. stays the same. The records go with them. | Hold on. Also remember a "renamed history" (from one day on, Treasurer & Sposorship) where the files and old manuals show the name at the time, avoiding incoming officer matching old documents. |
| **Add rale** | Can add but not add leftship translation (B4) with no startup information | Generate **start-up pack** ": 1 condition/ duty source text for this rule; 2 Same functions ( `fn`) steps in the standard process; 3 Tasks and contacts for **transferred from other roll** (see next row); Four presidents answered 3 questions (why this rule is set, what success is, and who to work with). No history yet, no fabrications |
| **split role** (e.g. Marine Media+Design) | Not supported | A wizard: Lists outstanding tasks, contacts, process steps under the old role and selects belongings by article (or by label batch). The archives and manuals of the old role are readable as two new role together. |
| **merge roll** | Not supported | Reverse Wizard: Two Files Merge, Contacts and Steps to New Rolle, Old Roll Archive |
| **Delete rale** | Settings not allowed to delete | Run a hand-over and split things to the other role, then file them. |
| **Replacement of functions**（ `fn` Changed) | It can be changed to affect process allocation. | "This rule's funning changed on, steps before that came from..." |

### 4.5 AI does what in there, doesn't do anything.

| AI do it. | AI don't do it. |
| --- | --- |
| Read the file and show it to the outsiders. 5–8A problem with the gap (examples: "Budget Request" postponed) 2Next thing you know, the record is empty -- where was the card?  "） | No date written (following rule 3) |
| Picking out and sorting the manual from the file. | Do not read research logs |
| Check the echoes of incoming officer against the manual and identify inconsistencies | No credit for incoming officer, no "qualified/not qualified" |
| **You need to decide**, Q2) Write a guide or two readings for each chapter. Each sentence must refer to the records of the file and the date should be covered by the rules 3 | It's not "exercise" where it's not recorded. |

AI When failing or closing: The problem is a template question generated by the rules ("The reason for this extension is empty. "）；The manual is sorted locally (now available). It's not stuck.

### 4.6 How do you know it's going to change?

- **Incoming officer days to complete the first task on time**(Designation day to first) `completedOn`）。
- **incoming officer ex-30** vs outgoing for the same period.
- **Response rate**: incoming officer ratio (references only, not scores).
- **Manual Gap**: number of times incoming officer "Unclear" + the previous 30 days asked AI that there were no questions in the manual, which should be reduced from season to season.
- **Third fraction of day 30** (resolution, confidence, acceptance).

These can be calculated from existing records; If the paper is to be analysed, a comparison of IRB (Q3) is required.

---

## 5. Phased implementation (sequence of recommendations)

**Time Proposal: Phase 3 is collecting data, and Handoff is part of the example of student organisation (`sampleScenario.ts` with leadership transition season). The job card in runbook (a)-(e) I can't see source text to make sure there's no question for Handoff. Changes other than the suggested H1 are made after Phase 3 is completed and then merge to `main`, so that participants do not see different pages.**

| Bag. | Contents | Size | Solve | Dependence |
| --- | --- | --- | --- | --- |
| **H1 fix bug (may be done first)**  | Handoff after Settings can store (incoming officer generates legal email.org); For outgoing read "no roll" state, check release; Add a new ruler to enter automatically after the season; Interview no longer prefills the example (changed to place reference text) and progress is not too high | Small, 1 sessions | B1、B4、B6 | None |
| **H2 term model** | `RoleTerm`, schema version + 1, migration of old data; (b) The replacement of existing members; Vacant role; single roll handoff; Incoming officer exists before the transfer. He can do his own first week. | Medium | B2、B3、B5、D7 | H1 |
| **H3 roll archive**  | 4 file pages (pure calculations) + unit sets; The relay card is ranked by risk, connected to the Today risk queue; Replace the manual with a 4 stamp | Medium | D1、D2、D4、D6 | H2 |
| **H4 gap + incoming officer reply**  | AI creates a gap (new interface, 22 second budget, failure template); Read manuals, Unclear, rehearsals, follow-up missions, 7/30 day by day | Medium | D3、D5 | H3 |
| **H5 rule change** | Change of name history; Add a roll start bag; Split/ merge/ Remove Wizard | Medium | D8 | H2 |
| **H6 Question and answer record**  | (a) The product ' s own question-and-answer record (by person, by range); The files show that questions are often asked; Incoming officer pre-30 day summary of problems | Medium | D9 | H3；**Needs Q3 Response** |

Each package: unit tests + browser tess; Handoff’s page number is still within 120/ 120; Gives you access when you are finished on the preview site.

---

## 6. Issues requiring a decision by Juanxi

- **Q1 which packs to start with?** I suggest H1 do it now. H2-H6 in the order of H2-H3-H5-H6 after Phase 3.
- **Q2 AI Can you write a "guided reading"?** Now the manual is a pure extract (every word is an original record). AI is allowed to write 1–2 with quotes, which will go a long way, but it's no longer "every word can be traced back once text" but "every sentence has references." I prefer **to allow it, but each sentence must quote records, date is covered by rules 3, and the interface indicates which phrase is written by AI**.
- **Q3 Product Question & Answer Record (H6) Do you want to do it or tell IRB?** is a new data record (questions source text, by person). I prefer to, but strictly separate from the research logs; Do you want to tell IRB that it's up to you to check the material.
- **Q4 outgoing incoming officer "advising"?** I prefer to be able to switch off.
- **Q5 7/30 day, three points who can see?** I prefer only the president and incoming officer to see without contributing.
- **Q6 Phase 3 task card (a)-(e) for Handoff page?** If there is one, H1 also waits for the end of Phase 3 (or you are sure that the change does not affect that subject).

---

## 7. References

- Starmer, A. J., et al. (2014). Changes in medical errors after implementation of a handoff program. *New England Journal of Medicine*, 371(19), 1803–1812.
- Nonaka, I., & Takeuchi, H. (1995). *The Knowledge-Creating Company*. Oxford University Press.
- Polanyi, M. (1966). *The Tacit Dimension*. University of Chicago Press.
- DeLong, D. W. (2004). *Lost Knowledge: Confronting the Threat of an Aging Workforce*. Oxford University Press.
- Leonard, D., & Swap, W. (2005). *Deep Smarts*. Harvard Business School Press.
- Bauer, T. N., Bodner, T., Erdogan, B., Truxillo, D. M., & Tucker, J. S. (2007). Newcomer adjustment during organizational socialization: A meta-analytic review. *Journal of Applied Psychology*, 92(3), 707–721.
- Bauer, T. N. (2010). *Onboarding New Employees: Maximizing Success*. SHRM Foundation.
- Watkins, M. D. (2013). *The First 90 Days* (updated ed.). Harvard Business Review Press.
- U.S. Army. *A Leader's Guide to After-Action Reviews* (TC 25-20); Relief in Place program.
- Training Within Industry (1945*Job Construction* Handbook.

These are based on my known literature and do not have line-by-line page numbers and figures online for this session; I-PASS 23 %/ 30 % is the number in the abstract of the paper. Check once text if you want to write a paper.
