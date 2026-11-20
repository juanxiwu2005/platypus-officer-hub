# Handoff module redesign plan

> **Status (2026-11-09): Completed in 8 stages on branch `claude/tender-gates-j8ztlr` under [`HANDOFF_EXECUTION_PLAN.md`](HANDOFF_EXECUTION_PLAN.md), awaiting Juanxi's acceptance; do not merge into `main` before Phase 3 data collection ends.** See execution-plan section 10 for differences from this proposal. The original proposal is retained below as the rationale.

> 2026-11-08 · Claude · Proposal only; **no code changed**.
> Basis: `main` tip `fc9eccd` (after merging PR #12). No other remote branch changed Handoff code (checked individually: `claude/keen-gauss-ye3gvr` has only one additional documentation commit; `integration/v1.0`, `integration/v1.6`, `claude/quirky-noether-x8jtj3`, and `feat/ai-native-phase1` are unrelated to Handoff).
> Code read: `src/data/handoff.ts`, `src/lib/handbook.ts`, `src/pages/Handoff.tsx`, `netlify/functions/handbook-draft.mts`, `src/data/types.ts`, `src/data/settings.ts`, `src/pages/Join.tsx`, `src/components/rail/AskPanel.tsx`, `src/lib/uiLog.ts`, `src/data/sampleScenario.ts`.
> The bugs in section 2 were tested against `seedDemo()` with temporary unit tests (not committed).

---

## 0. Main conclusion

Handoff currently means "**write a document when leaving office**": the outgoing officer writes a few interview lines → AI selects and rearranges 12 lines from that person's task titles → two people sign off → check 6 generic items → the system creates a new name to take over.
It **does not use the platform's greatest advantage** (all tasks, contacts, interactions, delays, blockers, and AI questions are stored), and some logic is reversed or can deadlock (section 2).

Proposed approach: "**accumulate continuously; fill only the gaps at handoff**":

1. The system continuously builds a **role dossier** for every role (directly from records, without AI).
2. At handoff, AI does one thing: **inspect the dossier for gaps and ask the outgoing officer targeted questions**, instead of requiring recall in an empty box.
3. New officers actively **read → read back → shadow a real task → formally take over → review on days 7/30**. Gaps found during reviews feed back into the dossier, improving the next transition.
4. Separate "**person**" from "**role term**" in the data model to support existing members changing roles, reelection, vacancies, midsemester replacements, and new or renamed roles.

---

## 1. How the current code works

| Step | Actor | Code | Actual effect |
| --- | --- | --- | --- |
| Start handoff season | President/VP | `changeHandoff` `start` | Creates one record for **every role existing at that time**, prefilling two "Example (fictional)…" interview lines |
| 1 Interview | Outgoing officer themselves | `interview` | One entry per line, at most 20 lines. **Prefilled examples make step 1 complete as soon as the season starts** |
| 2 Handbook | Outgoing officer or president | `draft` + `/api/handbook/draft` | Only two source types: that person's tasks (one "title + why + status" sentence each) and interview lines. AI can return only numbered references, selecting and reordering at most 12 entries; on failure, local ordering is "interview → unfinished tasks → completed tasks" |
| 3 Sign-off | Outgoing officer confirms → president approves | `confirm` / `approve` | Must be repeated whenever sources change (any task's why/status changes) |
| 4 First week | President, outgoing officer, or newcomer | `check` | 6 generic SEO checklist items, identical for every role |
| 5 Hand over | President | `complete` | Enter a **new name**; the system copies the outgoing officer's profile to create a newcomer and transfers unfinished tasks (status becomes accepted). Contacts follow automatically because they belong to the role |
| Day 30 | President or newcomer | `review` | Just a button; clicking counts as completion |

Page: a season progress chain at the top (5 date stops calculated by `handoffDates`), then one "relay card" per role (outgoing → incoming, 7-segment progress ring). Opening a card shows the 5 steps above in the right rail.

---

## 2. Findings (bugs first, then design problems)

### 2.1 Confirmed bugs

| # | Problem | Verification | Impact |
| --- | --- | --- | --- |
| B1 | **After one completed handoff, club settings in Settings can never be saved again.** The newcomer's email is empty (validation requires an example.org email); adding one then produces "Match every officer to their own role" because the outgoing officer remains listed with `roleId` pointing to the original role, whose `holderId` now points to the newcomer | Temporary test: after Treasurer handoff, `validateClub(clubDraft(s))` first reports an email error, then a role mismatch after adding an email | Once the president hands over any role, changing the club name, goals, or adding roles fails |
| B2 | **Existing members cannot take over.** `complete` requires a new name that differs from every existing person's name | Temporary test: use Sam's name to take over Treasurer; `completed` stays false | Internal promotion and role changes (such as Secretary → VP) are impossible |
| B3 | **The first-week checklist must be complete before the newcomer exists.** `complete` requires all 6 items checked before handoff, yet creates the newcomer only at that moment (`incomingId` is null beforehand) | Temporary test: `incomingId === null` after starting the season | The "newcomer's first week" can only be checked off by the president or outgoing officer; the order is reversed |
| B4 | **Roles added after the season starts do not enter handoff.** Clicking Save dates again does not add them | Temporary test: add "Events Chair" after season start; 6 roles but still 5 handoff records | New-role details always say "Start the handoff season…" even though it has started |
| B5 | **Vacant roles cannot be handed over.** No outgoing officer → nobody can write or confirm an interview; `complete` requires a predecessor | Code reading (`self = outgoingId === viewerId`; `if(!old) return s` in `complete`) | New roles and roles vacated by departing members can never be filled |
| B6 | Prefilled examples make step 1 "complete at season start," adding a false segment to the progress ring | Code reading (`interview.length > 0`) | The president sees overstated progress |

### 2.2 Design problems

| # | Problem | Why it matters |
| --- | --- | --- |
| D1 | **Handbook sources are too narrow.** It reads only "title + why + status" for that person's tasks and interviews. Missing: contacts and interaction timelines, event and funding stages, extension requests and reasons, silence/stuck records, reminders, on-time rates, change requests, feedback, and AI questions | The platform's greatest advantage is unused; newcomers receive a string of task titles |
| D2 | **The handbook is just 12 rearranged source sentences.** No chapters (the role's yearly rhythm, work in progress, who to contact, lessons learned), so priorities are unclear | Newcomers still do not know "what do I do next week, and whom do I contact?" |
| D3 | **The interview is an empty text box.** No guiding questions; outgoing officers rely on memory | "Why, with whom, and what pitfalls" (tacit knowledge) is hardest to preserve in research; an empty box captures it poorly |
| D4 | **Every role gets the same first-week checklist**, without its actual deadlines over the next 30 days | Newcomers most need to know "what is my first hard deadline after taking over?" |
| D5 | **Newcomers are passive.** No step to read back or ask questions, no shadowing period, no personal entry point | Healthcare handoff research identifies receiver read-back as a critical error-reduction step (section 3) |
| D6 | **The president cannot see risk.** Progress rings do not show "which role's handoff is riskiest" (many unfinished tasks, an ASU hard deadline within two weeks, or an outgoing officer no longer responding) | The president should focus on the one or two riskiest roles |
| D7 | **Only whole-season transitions are supported.** A midsemester departure or single vacancy requires a whole season | Midsemester replacements are common in student organizations |
| D8 | **Role changes are incompletely supported.** Renaming works (role ID remains stable, so records follow); new roles do not enter handoff (B4) or receive starter material; splitting, merging, and deleting roles are unsupported | Clubs reorganize every year |
| D9 | **Current AI question records cannot be used directly.** Ask chat stores only the last 60 browser messages, shared by all View as identities (`platypus.v1.chat`); complete question text is in the **research log** (`ui.ask`), which is IRB research data | Using AI questions for handoff requires a separate product question record; **do not read the research log** |

---

## 3. Research: effective handoff practices

These are established findings from handoff and newcomer-onboarding research relevant to us. The design below maps to them.

| Source | Main finding | Application |
| --- | --- | --- |
| **I-PASS hospital handoff program** (Starmer et al., *NEJM* 2014, 9 hospitals) | Fixed handoff structure (illness severity, summary, actions, contingencies), with **the receiver synthesizing in their own words**. Medical errors fell about 23% and preventable adverse events about 30%, without longer handoffs | Fixed handbook chapters; a required newcomer Read-back step |
| **Tacit knowledge and the SECI model** (Polanyi; Nonaka & Takeuchi 1995) | Written knowledge is explicit; "how, why, and whom to contact" is often tacit and transmitted through shared work and dialogue | Add "shadow a real task" beyond documentation; interviews ask "why," not just "what happened" |
| **Knowledge-loss research** (DeLong, *Lost Knowledge*, 2004; Leonard & Swap, *Deep Smarts*, 2005) | Exit interviews conducted only at departure yield little; effective practice combines **continuous recording**, **targeted questions**, and **guided practice** at handoff | Build dossiers continuously; AI asks about dossier gaps rather than presenting a blank interview |
| **U.S. Army AAR and "left-seat/right-seat" transition** (Relief in Place) | Newcomers first observe from the right seat, then lead from the left while predecessors observe, before formal transfer of command; short reviews follow each mission | During shadowing, newcomers first collaborate (C) on a real task, then become responsible (R); review on day 30 |
| **Newcomer socialization research** (Bauer et al. 2007 meta-analysis, *J. Applied Psychology*; Bauer's 4C framework) | Adjustment is most directly reflected in **role clarity, self-efficacy, and social acceptance**. The framework comprises Compliance, Clarification, Culture, and Connection | Four handbook sections map to 4C; days 7/30 reviews ask about these three outcomes |
| **Watkins, *The First 90 Days*** | Newcomers should clarify the situation, expectations, working style, resources, and development with their supervisor early, then seek an "early win" | First-week alignment meeting with the president; the system selects an "early win" task from the dossier |
| **TWI Job Instruction** (U.S. WWII training method) | Prepare → demonstrate → let the newcomer try → follow up | Read → shadow → lead → review |

**7 steps for handoff into an existing or new role:**

1. **Inventory:** automatically generate a role dossier (no AI or manual writing).
2. **Fill gaps:** AI asks the outgoing officer only questions the dossier cannot answer.
3. **Compile:** dossier + interview answers → handbook with fixed chapters and a source for every sentence.
4. **Handoff meeting:** outgoing and incoming officers walk through the handbook; the newcomer reads back in their own words and asks questions.
5. **Shadow:** complete a real task collaboratively while the outgoing officer is still available.
6. **Transfer:** transfer tasks, contact ownership, and permissions together; the outgoing officer becomes a consultable predecessor rather than disappearing.
7. **Review:** on days 7 and 30, newcomers report missing or incorrect handbook material, feeding the dossier; the president sees three measures (clarity, confidence, acceptance).

---

## 4. New design

### 4.1 Three foundational changes

**(1) Separate people from role terms (data model)**

Currently a person can hold only one role (`Person.roleId` + `Role.holderId`), and handoff "copies the old person to create a new one." Replace this with:

```
RoleTerm (role term)
  roleId      Which role
  personId    Who
  status      incoming (designate/shadowing) | active (in office) | former (predecessor)
  from / to   Start/end dates (written by the rule engine)
  handoffId   The handoff that created this term
```

- A role may have 1 active + 1 incoming simultaneously (overlap during shadowing).
- On departure from office, the term becomes former; the person remains in the club (as a regular member or in another role), or may be marked "left the club."
- Retain `Role.holderId` as a shortcut to the current active holder, derived from terms, avoiding extensive old-code changes.
- Increment the schema version by 1.

**Resolves:** B1, B2, B3, B5, D7.

**(2) Role dossier: continuous automatic accumulation without AI**

Each role gets a dossier page **computed deterministically** from existing records, available anytime (not only during handoff season). 4 sections correspond to 4C:

| Section | Content | Source records |
| --- | --- | --- |
| **Calendar** (the role's year) | Steps assigned to this role in each event type and typical lead times; actual deadlines for the next 30 days (especially ASU hard deadlines) | Workflow-template steps with this role's `fn` / `ownerRoleId`, dates calculated by `schedule.ts`, historical `completedOn` |
| **In flight** (ongoing work) | Unfinished tasks, waiting items (who is being waited on), funding stage blockers, pending extension requests | `nodes`, `waitingOnPersonId`, `funding`, `extensionRequests` |
| **People** (whom to contact) | Role contacts, latest interaction, next action and date; frequent collaborator roles (RACI A/C/I) | `contacts` (`ownerRoleId`), `interactions`, node `approverRoleId` / `consultedRoleIds` |
| **Lessons** (pitfalls) | Delayed tasks and reasons; silence-protocol takeovers; steps with low on-time rates; frequent questions | `extensionRequests.reason`, `silenceCases`, `protocolLog`, `contributions.onTime`, product question records (below) |

- Every dossier row opens its original record, like the current handbook's "Source."
- Follow existing rules: dates come only from the rule engine; officer-only contacts (`visibility: "leads"`) are hidden from unauthorized dossier viewers by the same rules.

**Resolves:** D1, D2, D4, and implements "replace departure-time writing with continuous accumulation" (the proposal's original wording in section 1).

**(3) Product question records (separate from research logs)**

- Create **product data** recording who asked, during which role term, the question, AI's cited records, and whether it was adopted. Store in club data per person (no longer one shared 60-message history for all View as identities).
- **Leave research logs (`interactionLog` / `ui.ask`) untouched; the handbook must never read them.** This is the IRB boundary.
- The dossier's Lessons section shows "frequent questions for this role" (only question clusters and AI-cited rules/records, not other people's exact wording unless the questioner chooses to share).
- **Your decision required:** whether to add these records and whether IRB notification is needed (section 6 Q3).

### 4.2 President workflow

**Entry:** Handoff page (120-word page budget; use colors and hover cards, not long paragraphs).

1. **Start a season or a single-role handoff.** Two buttons: Start handoff season (whole season) / Hand over one role (midsemester vacancy). Select only roles changing holders (reelected roles are excluded). Roles added after season start enter automatically (fix B4).
2. **Choose a newcomer** for each role, one of three options:
   - Select an existing member (promotion/role change, fixing B2).
   - Send an invitation link to a recruit (they fill in their own details; 4.3 B).
   - Leave vacant for now (below).
3. **View risk ranking.** One relay card per role, sorted by handoff risk (rules, no AI): unfinished task count, ASU hard deadlines within 30 days, recent outgoing-officer updates, and dossier gap count. Riskiest first, also in Today's risk queue.
4. **Approve the handbook.** Same order: outgoing officer confirms → president approves. The president now sees chapters + a gap list, rather than 12 rearranged lines.
5. **Chair a handoff meeting** (optional but recommended): the system generates a one-page agenda (chapters + newcomer read-back + open issues); the president may simply check "held."
6. **Click Hand over to transfer.** In one operation: incoming term → active, old active term → former; unfinished tasks transfer to the newcomer (who still claims them with "I've got it," rather than receiving accepted directly, preserving site-wide claiming rules); contacts follow the role (as now); permissions follow the role.
7. **Review day-30 results:** three scores (clarity, confidence, acceptance) + the newcomer's "what the handbook missed." The president can add the supplement to the dossier with one click.

**Vacant roles** (no outgoing officer): the president acts as the predecessor, answering AI questions based on the mostly empty dossier, or chooses "Start from a template" (4.4).

### 4.3 Member workflow

**A. Members already in the organization**

| Situation | Flow |
| --- | --- |
| **Outgoing officer** (handing over a role) | ① Notification: "Your Treasurer handbook is ready to review"; ② open the dossier, already 80% filled by the system; ③ answer 5–8 AI gap questions (each can be skipped; skipped questions become "unresolved"); ④ confirm the handbook; ⑤ meet the newcomer and guide a real task; ⑥ after transfer, become a predecessor shown in the newcomer's dossier as "Ask your predecessor" (optional, can be disabled) |
| **Member changing roles/being promoted** (outgoing in one role, incoming in another) | Both flows appear in Today: hand over the old role + take over the new. The system checks whether their hard deadlines fall in the same week and alerts the president if so |
| **Reelection** | No handoff flow. Can still "update dossier" (answer gap questions) during the season to prepare for a later transition |

**B. Newly recruited member (newcomer)**

1. Open the invitation link (includes the role) → fill in details (reuse existing Join / member-onboarding screens).
2. **Read handbook:** read its 4 sections, choosing "Got it" or "Unclear" after each (Unclear automatically becomes a question for the outgoing officer).
3. **Read-back:** answer 3 fixed questions: "What is the most important thing in the next 30 days?", "Who would you contact first if X happens?", and "What is most likely to go wrong in this role?" AI flags only content inconsistent with or absent from the handbook for outgoing-officer confirmation; **no scoring or judgments of right/wrong**.
4. **Shadow:** select a near-term, easy task with guidance available from the dossier (an "early win"); newcomer is consulted/collaborating (C), outgoing officer responsible (R).
5. **First week after transfer:** role-specific checklist = the retained 6 generic items (SEO / R16) + actual role deadlines over the next 30 days (rule engine). The newcomer now exists and can check items themselves (fix B3).
6. **Days 7 and 30 reviews:** three 1–5 ratings (clarity, confidence, acceptance) + a sentence about "what the handbook missed."
7. **AI questions during the first 30 days:** if the answer is in the handbook, it is hard to find; if absent, it is a gap. Summarize both for the president and outgoing officer on day 30 (question themes only, not exact wording unless the newcomer consents).

### 4.4 Role changes

| Change | Current | Proposal |
| --- | --- | --- |
| **Rename** | Works; stable role ID keeps records attached | Retain. Also record rename history (from a given date, Treasurer became Treasurer & Sponsorship); show the historical name in dossiers and old handbooks so newcomers can match old documents |
| **New role** | Can be added, but excluded from handoff (B4) with no starter material | Generate a **starter pack**: ① verbatim role clauses from the constitution/responsibilities; ② standard-workflow steps with the same function (`fn`); ③ tasks and contacts **transferred from other roles** (next row); ④ president answers 3 questions (why create it, what success looks like, whom to work with). Without history, Lessons shows "No history yet"; do not invent it |
| **Split role** (e.g. Marketing → Social Media + Design) | Unsupported | Wizard lists old-role unfinished tasks, contacts, and workflow steps; assign individually or in tag-based batches. Old dossier and handbook remain readable as a shared predecessor for both new roles |
| **Merge roles** | Unsupported | Reverse wizard: combine two dossiers, assign contacts and steps to the new role, archive old roles |
| **Delete role** | Settings prohibits deletion | First transfer its items to other roles, then archive (no actual deletion; retain history) |
| **Change function** (`fn` changes) | Allowed; affects workflow assignment | Retain, with a dossier-top notice: "This role's function changed on …, steps before that came from …" |

### 4.5 AI responsibilities and boundaries

| AI does | AI does not |
| --- | --- |
| Inspect dossiers and ask outgoing officers 5–8 targeted gap questions (e.g. "Budget Request was extended 2 times, but the reasons are empty. What blocked it?") | Write any dates (retain rule 3) |
| Select and order dossier material for the handbook (retain the current numbered-reference-only response) | Read research logs |
| Compare newcomer read-back with the handbook and flag inconsistencies | Score newcomers or judge pass/fail |
| (**Your decision required**, Q2) Write one or two introductory sentences per chapter, each citing dossier records, with dates masked under rule 3 | Invent "experience" unsupported by records |

When AI fails or is disabled: use rule-generated template questions ("This extension reason is empty; add a sentence?") and local handbook ordering (already available). The flow does not block.

### 4.6 How to measure improvement

- **Days until the newcomer's first on-time task completion** (transfer date to first `completedOn`).
- **Newcomer's first-30-day on-time rate** versus the outgoing officer over the corresponding period.
- **Read-back consistency:** proportion matching the handbook (reference only; do not show personal scores).
- **Handbook gap count:** newcomer "Unclear" selections + first-30-day AI questions absent from the handbook; should decrease between seasons.
- **Three day-30 scores** (clarity, confidence, acceptance).

All can be calculated from existing records; use in thesis analysis requires checking IRB coverage (Q3).

---

## 5. Phased implementation (recommended order)

**Timing recommendation: Phase 3 is collecting data, and Handoff is part of the sample club (`sampleScenario.ts` includes a handoff season). I cannot access the original runbook task cards (a)–(e), so cannot confirm whether any uses Handoff. Merge changes beyond H1 into `main` only after Phase 3 ends, to avoid changing pages midway through participation.**

| Package | Content | Size | Resolves | Dependencies |
| --- | --- | --- | --- | --- |
| **H1 Bug fixes (can start first)** | Settings saves after handoff (generate valid example.org newcomer emails; outgoing officer becomes "no role," allowed by validation); new roles enter an active season automatically; replace prefilled interview examples with placeholders so progress is accurate | Small, 1 session | B1, B4, B6 | None |
| **H2 Term model** | `RoleTerm`, schema version +1, old-data migration; existing-member takeover; vacancies; single-role handoffs; incoming newcomer exists before transfer and can check first-week items | Medium | B2, B3, B5, D7 | H1 |
| **H3 Role dossiers** | 4-section dossier page (pure calculation) + unit tests; risk-ranked relay cards connected to Today's queue; handbook split into 4 chapters | Medium | D1, D2, D4, D6 | H2 |
| **H4 Gap interview + newcomer read-back** | AI gap questions (new endpoint, 22-second budget, template fallback); handbook reading, Unclear, read-back, shadowing task, days 7/30 reviews | Medium | D3, D5 | H3 |
| **H5 Role changes** | Rename history; new-role starter packs; split/merge/delete wizards | Medium | D8 | H2 |
| **H6 Question records** | Product question records (per person, visibility scope); frequent dossier questions; newcomer first-30-day summary | Medium | D9 | H3; **Q3 answer required** |

Each package: unit + page tests for new behavior; Handoff stays within 120 / 120 words; provide a preview URL for your acceptance.

---

## 6. Decisions for Juanxi

- **Q1 Which packages first?** Recommend H1 now (bug fixes without visual changes), H2–H6 after Phase 3 in order H2 → H3 → H4 → H5 → H6.
- **Q2 May AI write introductory sentences?** The handbook currently contains only exact extracts. Allowing 1–2 cited introductions per chapter improves readability but changes "every word traceable to source text" to "every sentence has citations." I favor **allowing this with record citations for every sentence, dates masked under rule 3, and AI-written sentences identified in the UI**.
- **Q3 Build product question records (H6), and notify IRB?** These are new data records (original question text stored per person). I favor building them with strict separation from research logs; you must compare the materials to decide IRB notification.
- **Q4 May newcomers consult predecessors after transfer?** I favor enabling "Ask your predecessor" by default, with outgoing officers able to disable it.
- **Q5 Who sees the three days 7/30 scores?** I favor only the president and the newcomer, excluded from contribution scores.
- **Q6 Do Phase 3 task cards (a)–(e) use Handoff?** If so, H1 must also wait until Phase 3 ends (unless you confirm the changes do not affect that task).

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
- U.S. Army. *A Leader's Guide to After-Action Reviews* (TC 25-20); Relief in Place procedures.
- Training Within Industry (1945). *Job Instruction* manual.

These references were compiled from known literature; page numbers and figures were not individually checked online in this session. I-PASS's 23% / 30% figures come from the abstract. Check the original sources before using them in the thesis.
