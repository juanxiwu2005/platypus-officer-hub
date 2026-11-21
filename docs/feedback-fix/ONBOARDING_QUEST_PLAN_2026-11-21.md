# New exec onboarding plan v2: learn the handbook through an "event-planning quest" (2026-11-21, Claude)

Previous review: `HANDOFF_RAMP_REVIEW_2026-11-21.md`; research reports: `handoff-ramp-research/`. This version is rewritten according to Juanxi's decisions of 2026-11-21. Documentation only; no code was changed.

## 0. Juanxi's decisions (premises of this version)

1. "The 40-plus-page document" = the **Student Club and Organization Handbook 2026–2027** (archive record ASU-R-004). The 2025–26 edition (ASU-R-064) is used only as a historical comparison.
2. Scenario-question scores and questions escalated to the president **may be stored**.
3. The president **sees only a summary, and the summary may not be shown at all**.
4. The core goal is to **teach members basic event planning**. Taking Google AI Quests' *Market Marshes* as a reference, build an interactive game in which members "go on a quest" through how a student event is run. Where rules conflict, teach the stricter one (event registration 30 days in advance; speakers 6 weeks in advance).
5. Phase 3 has ended, so implementation planning can begin.

---

## 1. What to borrow from Market Marshes

Market Marshes is the first AI Quest made by Google Research and the Stanford Accelerator for Learning (September 2025). It is for students aged 11–14, free, and played in the browser. Students play Google researchers helping a riverside market predict floods: they collect data, clean it, choose features, train a model, and go back to revise when results are poor. The game has a mentor character, Professor Skye. Each quest takes 30–45 minutes and comes with complete lesson plans and a teacher guide, plus a slide version for classrooms without computers.

We borrow the **structure**, not its content or visuals:

| What Market Marshes does | Platypus equivalent |
| --- | --- |
| Play someone in a real profession (a researcher) | Play a club officer running an event at realistic scale |
| A real-world problem (flood prediction) drawn from real research | Real ASU rules, drawn from the source text of the handbook and the funding guide |
| Make, step by step, the decisions a real professional would make | Booking, registration, budget, vendors, promotion, event day, wrap-up: every step is a real decision |
| Go back and revise when results are poor (iteration) | After a wrong choice, see "what would happen in reality," then return to that step and redo it |
| A mentor character guides | The Platypus guide (the right-panel Ask, which gives only hints inside the game) |
| 30–45 minutes per quest | One event split into two parts of about 30 minutes each |
| Teacher guide | A one-page "facilitator guide" for the president |
| Slide version (low-tech) | A printable "paper version" to play together at an exec meeting |

## 2. Why a game (evidence and its limits)

- Serious games overall produce better learning than ordinary instruction, but the effect is moderate: Wouters et al. 2013 (*J. Educ. Psych.*, 77 effect sizes); Clark, Tanner-Smith & Killingsworth 2016 (*Rev. Educ. Res.*, g≈0.33).
- For adults, the largest gains from simulation games were in confidence (d≈0.52) and being able to do the work (procedural knowledge, d≈0.37): Sitzmann 2011 (*Personnel Psychology*). This maps directly onto "able to start working within 3 days."
- Three conditions make the effect larger, and the plan must meet all of them:
  - **Combine with other instruction** rather than relying on the game alone (Wouters 2013) → the game is followed by a real handoff and real tasks.
  - **Multiple, spaced sessions** beat one sitting (Wouters 2013; Clark 2016) → play over two days, with a retest on day 3.
  - **Actively making decisions** beats watching; players can return at any time (Sitzmann 2011) → every step requires a choice, and the game stays open permanently.
- Simple visuals do not reduce the effect (Clark 2016, secondhand summary) → use existing interface components and the workflow chart; no art is needed.
- The in-game loop "decide → see the consequence → read the source text → try again" is itself the method with the strongest evidence in the previous version: guess first, then look; quizzing; when wrong, show the decisive condition (Roediger & Karpicke 2006; Richland et al. 2009; Butler & Roediger 2008).
- **Limit:** No study has directly tested "student clubs learning university rules through a game." The above are borrowed mechanisms; the effect must be measured in real clubs.

---

## 3. Game design: "Plan Your First Event"

### 3.1 Story

> You have just become an officer of the Desert Founders Society. The club wants to hold a **Spring Speaker Night** at the Memorial Union in Tempe: a paid speaker, about 80 people, pizza, promoted on Instagram. The Platypus guide takes you from today (7 weeks before the event) all the way to one week after the event.

- Everyone **plays one complete event**, so every role sees what the other roles need (shared foundation + cross-role dependencies).
- Whenever another role is needed, **an in-game peer character** (Treasurer, Marketing, Events, Secretary, President, Advisor) comes to ask for something. If you hand over the right thing, the work moves forward; if you hand over the wrong thing or hand it over late, the peer tells you, "I'm stuck because…".
- Steps belonging to your own role are marked "**this is your job**" and include an extra deeper question.

### 3.2 Seven chapters, mapped to the handbook's table of contents

| Chapter | What happens in the game (key decisions) | What happens in reality if you get it wrong | Handbook / source text |
| --- | --- | --- | --- |
| 1 Is the club ready? | Who are the Top 3? Who must take which training? Does the roster have ≥10 people? | Without qualified Top 3 officers, no one can submit; with too few members on the roster, no funding | "Registering and Reregistering," "Leadership Transitions and Roster Management"; R030, R037 |
| 2 Pick a date and a place | What first: the Event Registry, Mazevo, or a test post first? | Promotion before approval can get the event cancelled; if the RITM number is not submitted 14 days ahead, the booking is cancelled; events during finals cannot receive USG-T funding | "Events and Tabling," "Event Registry," "Events During Finals," "Reserving Spaces"; R014, R015 |
| 3 Where does the money come from? | What to give the Treasurer (date, place, attendance, quotes including tax and shipping, one per vendor); if $700 is approved, can you spend $701; can money saved on flyers go to pens; can you buy first with your own card | The amount must equal the approved amount, with no tolerance; line items cannot be moved; purchases before approval are not reimbursed; late submissions are automatically ineligible | "Funding and Fiscal Management" + the Tempe funding guide and training (R025–R029, R035, R037, R041, R047) |
| 4 Speaker, contracts, food | Who signs the speaker contract? When to start? Can pizza be ordered from outside? | Students cannot sign contracts; speaker paperwork follows the 6-week deadline; Union spaces have exclusive catering, and outside food first requires checking permits and inspection records | "Contracts for Vendors, Guest Speakers, or Performers," "Food at Events"; R036, R045, R049 |
| 5 Get the word out | When can you post on Instagram? How should the event name be written? Who makes the T-shirts? | Risk of promoting before approval; "at ASU" goes at the end, and no ASU logo; merchandise must use a licensed vendor | "Promoting an Event," "Social Media"; R009 |
| 6 Event day | Does the advisor need to be there? What if someone is injured? Can a raffle charge money? | The advisor must be present when there are outside participants; in an emergency, call 911 and report it; paid raffles are not allowed | "Risk Management," "Raffles" |
| 7 Wrap up and hand over to the next officer | When are receipts due? What if it exceeds $999.99? What to leave for the next officer? | Receipts within 10 days; nothing older than 60 days is reimbursed; missing paperwork revokes the approval | "Funding and Fiscal Management"; R037, R041, R038 |

Each chapter takes 4–6 minutes: **chapters 1–4 about 30 minutes (day 1), chapters 5–7 about 25 minutes (day 2)**.

### 3.3 What a decision looks like (chapter 2 example)

> **5 weeks before the event.** Marketing wants to post a teaser on Instagram today "to see how many people are interested first." What do you do first?
> A. Book a Memorial Union room in Mazevo · B. Submit the Event Registry in Sun Devil Central · C. Agree to post the teaser first
> **How sure are you?** Somewhat / Very sure

- Choose **C**: peer Events says, "The event isn't approved yet; posting now could get the whole event cancelled." The source text appears: "Advertising the event prior to approval may result in event cancellation, event postponement, and/or referral for conduct review." (handbook, "Event Approval and Event Promotion"). Return to this step and choose again.
- Choose **A**: the guide hints, "Booking a room requires a RITM number. Where does that number come from?" (a hint, not the answer).
- Choose **B**: the workflow chart shows "Event Registry → RITM number → Mazevo booking," with dates calculated by the rule engine from today (**AI gives no dates at all**).

After every decision there is a **"source card"**: 2–5 sentences of handbook source text, where in the handbook it appears, and an "Open this handbook section" link. Curiosity comes from the moment of having just chosen wrongly or hesitated (an information gap); that is when the player is pointed to the source text.

### 3.4 A real event workflow chart grows as you play

Each correct decision lights up a dot on the on-screen workflow chart, **the same chart as on the Plan page** (reusing the existing MetroChart and the `schedule.ts` rule engine). On completion, the player holds a complete Speaker Night plan: every step, who is responsible, and the latest date. The next time they run a real event, they open the same kind of chart: **the game and real work use the same screens**.

### 3.5 Play again with different conditions (varied scenarios)

After completion, "replay with changed conditions" unlocks. Each replay changes only one or two things, specifically to practice "when the conditions change, the answer changes": the event moves to an off-campus venue, attendance reaches 300, the speaker becomes a free visiting speaker, an outside sponsor adds a table, or the date falls in the two weeks of finals. On day 2, players first play **the version most relevant to their own role**, about 10 minutes.

### 3.6 How the guide (AI) talks in the game

- **In the game it gives only hints**, never the answer directly: "Look at which number the room booking needs" (Bastani et al. 2025: AI that gives answers directly prevents people from learning).
- Players may ask the guide any policy question at any time. Answers **must include the source passage and its source**; if none can be found, it says "I'm not sure" (rules 1–3 of the previous version).
- Outside the game (when doing real work), the same Ask gives direct answers with the source text.

---

## 4. The 3 days beyond the game

| Time | New member | Predecessor / buddy | President |
| --- | --- | --- | --- |
| **Before starting** | Fill in profile: campus, position, whether Top 3, funding sources | Predecessor fills in an **open-items list** (applications in progress, commitments, balances, accounts, contacts, "if X then Y") | About 15–30 minutes: confirm the role, choose tasks from templates (what to do, why, what to deliver, when it is due, what counts as done), and check Top 3 status, university training, and system access |
| **Day 1 (about 75 minutes)** | Game chapters 1–4 (30 min) → 3 platform actions (10 min) → submit the first small task | **1:1 handoff, 30–45 min**: open the real materials, ask "which time required rework, and what was done right," and finish with the new officer restating the 3 most urgent items | — |
| **Day 2 (about 45 minutes)** | Game chapters 5–7 (25 min) + this role's "replay with changed conditions" (10 min); use Ask to move tasks forward | Buddy, 15 minutes | Handles only questions the AI cannot resolve and that members actively escalate |
| **Day 3 (about 15 minutes)** | **Retest**: only the decisions answered wrong on days 1–2 or "very sure but wrong" (10 min); submit the remaining tasks | — | Reviews tasks one by one: approve, or return with a clear note on what to change |
| **Afterward** | The first time something is actually done (first room booking, first budget), a mini-retest of 3 related decisions pops up; one more retest after 2–4 weeks | At semester end, writes a one-page retrospective for the next officer | Keeps the existing day-7 / day-30 check-ins |

- University-required training (Officer Training, hazing prevention, 100% on the appropriations training) is tracked separately in the startup checklist; **the game does not replace university scores**.
- Returning members (re-elected or changing roles) can **go straight to "replay with changed conditions"**; if they get everything right, they skip chapters 1–7.
- The **completion standard** is not "finished playing" or "finished reading," but: all red-line decisions answered correctly (retries allowed) + this role's chapters passed + the president approves the tasks.

### 4.1 How the handbook is "read"

- No one is required to read it cover to cover. The 7 game chapters cover the parts of the handbook directly related to running events; every source card links to the corresponding subsection.
- Members can open a "**handbook map**": every section listed by the table of contents, with played chapters lit up. It is purely for the member's own view: **no scores, no rankings, no rewards** (previous version's evidence: rewarding reading lowers intrinsic motivation).
- Parts of the handbook not in the game (starting a club, advisor eligibility, travel, bank accounts, fundraising, etc.) go into "look up as needed": when related work comes up, Ask provides them with the source text.

---

## 5. How the president can feel confident without having to look

- **By default, the president does not need to look at anything.** The system uses the data itself: scheduling retests for members, finding the steps where everyone goes wrong, and turning frequently asked questions into FAQs.
- When needed, the president can open a **summary** (can be turned off in Settings): only "how many people have finished / the 3 decisions most often answered wrong / how many questions are waiting for your answer this week," **with no individual scores and no individual chats** (Gnewuch et al. 2024: when members feel watched, they ask the AI less).
- The only thing the president must handle is the **escalation queue**: questions where the AI cannot find the source text, runs into a policy conflict, or the question needs authorization or experience. Each item automatically includes the original question, the AI's answer and citations, and why it was not resolved. After the president answers, an FAQ draft is generated; once confirmed, the next person gets the answer directly from the AI.
- A one-page **facilitator guide** (equivalent to Market Marshes' teacher guide): the 3 things the president needs to do, and the option of playing chapter 2 together using the "paper version" at the first exec meeting (Wouters 2013: playing in groups works better).

---

## 6. What data is stored (Juanxi has agreed to storage)

| What is stored | Purpose | Who can see it |
| --- | --- | --- |
| Each decision: first-attempt right/wrong, confidence, number of retries, time taken | Schedule retests; count frequently missed decisions | The member; a summary (no individuals) for the president |
| Chapter completion, "replay with changed conditions" results | Completion standard, skip decisions | The member; aggregate counts for the president |
| Escalated questions (question, AI answer and citations, reason, president's answer) | Escalation queue, FAQ | The member and the president |
| FAQ (answers confirmed by the president) | The next member gets the answer directly from the AI | The whole club |

- **Not stored**: the full text of conversations between the player and the guide (only escalated ones are stored); no member personal information is sent to the AI (AGENTS.md hard rule).
- Research exports require new field descriptions in `docs/PHASE3_DATA_DICTIONARY.md`; if the data is later used for new research, it must be separately confirmed under IRB requirements.
- Structurally, add only **optional fields** and avoid raising `SCHEMA_VERSION` where possible; if it must be raised, ask Juanxi first.

---

## 7. Relationship to existing code and implementation order

**Reuse directly:** the workflow chart `MetroChart` and the rule engine `schedule.ts` (all dates in the game are calculated by it); the Speaker event template `playbooks.ts`; the 64-entry source catalog `policyCatalog.ts` and the handbook source text on the server (`netlify/lib/policy-archive.mts`); the right-panel Ask and citation tags; the handoff module (interview, handbook, restatement, day-7/30 check-ins); task submission and attachments.

**To change or build:**

| Phase | Content | Notes |
| --- | --- | --- |
| P1 Content | Write 7 chapters with about 35 decisions (each with the correct option, the consequence of a wrong choice, 2–5 sentences of source text, and the handbook subsection) and 5 "replays with changed conditions"; verify conflicting items first | Use archive source text only; teach the stricter rule on conflicts and label it; along the way, fix the website's outdated rule R13 (events during finals) and the old handbook citations in R01–R16 |
| P2 Game | A new page, or a quest flow under `/welcome`; decision cards, source cards, workflow-chart lighting, replays with changed conditions, retest queue | Use only the existing 5 component types and tokens; English interface; the word limit for the new page requires Juanxi's approval |
| P3 Guide and escalation | Ask gives only hints in the game; answers must include source text, and it refuses when none is found; escalation queue, FAQ drafts and confirmation | `/api/policy-answer` currently lets the AI write free text; change it to "source text first, AI only explains" |
| P4 Handoff and tasks | Predecessor's open-items list + new officer's restatement; task status "submitted → president approves/returns" (currently, submitting marks it Done) | Change the handoff to the 3-day rhythm; keep the day-7/30 check-ins |
| P5 Summary | President summary (optional; can be turned off); members' own retest reminders | No individual scores shown |

Following Juanxi's usual process: **once this plan is confirmed → first produce static mockups (one game decision, a source card, the completion workflow chart, the president summary, the escalation queue) → write code only after the mockups are confirmed.**

---

## 8. Small questions for Juanxi to confirm

1. Number of tasks required within 3 days: the suggestion is **2–3** (the rest may be "in progress + where it is stuck"), or keep 3–5?
2. Is it OK for the game story to use **Speaker Night** (covers speaker contracts, food, funding, and promotion; the most comprehensive)? Quests such as "tabling," "off-campus events," and "travel" can be added later.
3. Should the president summary be **on or off by default**?
4. Where does the game go: in the onboarding at a new member's first login, on the Handoff page, or with entry points in both?

## References

- Google Research, AI Quests teacher resources: https://research.google/ai-quests/intl/en_us/teacher-resources
- Stanford Accelerator for Learning, 2025-09-09: https://acceleratelearning.stanford.edu/story/stanford-and-google-develop-ai-educational-game-for-teens
- Google for Education, Market Marshes course: https://edu.exceedlms.com/student/path/1978138-ai-quests-market-marshes
- Wouters, van Nimwegen, van Oostendorp & van der Spek (2013). A meta-analysis of the cognitive and motivational effects of serious games. *Journal of Educational Psychology*, 105(2), 249–265. https://research-portal.uu.nl/en/publications/a-meta-analysis-of-the-cognitive-and-motivational-effects-of-seri/
- Sitzmann (2011). A meta-analytic examination of the instructional effectiveness of computer-based simulation games. *Personnel Psychology*, 64(2), 489–528.
- Clark, Tanner-Smith & Killingsworth (2016). Digital games, design, and learning. *Review of Educational Research*, 86(1), 79–122. https://doi.org/10.3102/0034654315582065
- Others (testing effect, guess-then-look, AI harming learning, rewards and motivation, president summary): see `handoff-ramp-research/R1`–`R3`.
