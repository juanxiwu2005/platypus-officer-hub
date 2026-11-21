# 3-day ramp-up for new execs: draft review, research evidence and recommended plan (2026-11-21, Claude main agent + 5 research agents)

**Scope:** Review of the Handoff / Onboarding draft that Juanxi wrote with another AI (original: `handoff-ramp-research/00_DRAFT_from_user.md`). Basis: the existing code, the uploaded policy archive `03_Full_Rules_Archive.txt` (64 sources), and 4 online literature studies. Documentation only: **no website code was changed**, 0 product AI calls, 0 emails.

| Study | What it did | Detailed report |
| --- | --- | --- |
| R1 Learning science | How to learn long policies, testing, curiosity, incentives, mandatory training, newcomer adjustment | `handoff-ramp-research/R1_learning_science.md` (about 35 papers) |
| R2 Handoff and succession | Cross-role knowledge, experience handoff, hospital/military handoffs, student-organization leadership turnover | `R2_handoff_succession.md` (23 papers) |
| R3 AI answers first | AI assistants for newcomers, the risk that AI harms learning, reluctance to ask superiors, hallucination in policy Q&A | `R3_ai_help_seeking.md` (24 papers) |
| R4 Policy check | Item-by-item check of the draft appendix, measuring the reading load, extracting core rules and role handoffs | `R4_policy_check.md` (with source quotes and line numbers) |
| R5 Code | What the existing handoff, rules, Ask and task submission can reuse | `R5_code_survey.md` |

For every paper, an Agent verified the authors, year, venue and link by search; papers that could not be verified were removed. Preprints (not peer reviewed) are marked as such in the reports.

---

## 1. One-sentence conclusion

**The draft points in the right direction, but it is too heavy and too much like "read everything, then take the test."** The research and the policy archive both point to the same lighter approach:

> Require everyone to know only **a small set of red lines** and **the handoff requirements of their own role and its upstream and downstream roles**. Other rules are delivered by the AI, with the source text, when work triggers them. Learning happens through "guess first, then see the answer" scenario questions, not through pages read. Handoff happens through an open-items sheet filled in by the predecessor and one meeting with real materials. The President offloads most repeated questions through a queue that escalates only what "the AI cannot answer."

---

## 2. Item-by-item review of the draft: sound / needs change / unsound

| Draft content | Verdict | Reason (evidence) | How to change it |
| --- | --- | --- | --- |
| Everyone (including the President) goes through the same shared foundation, then the role handoff | ✅ Sound | The keys to newcomer adjustment are role clarity, self-efficacy and social acceptance (Bauer et al. 2007, meta-analysis of 70 samples) | Keep |
| Step 1: the President configures goals and tasks in advance; startup checklist (organization, people, training, access, handoff) | ✅ Sound, ⚠️ division of labor needs change | Checklists significantly reduce omissions (Haynes et al. 2009 NEJM; I-PASS, Starmer et al. 2014 NEJM: preventable adverse events −30%, handoff time unchanged) | The column for "open requests, commitments, permissions, contacts" is **filled in by the predecessor**; the President only checks it. Otherwise the President's burden grows |
| Top 3, school training and platform access are verified separately; a member learning finance is not necessarily the submitter; individual travel funding is handled separately | ✅ Sound; matches the archive | R026, R035 (Top 3 submit); R038 L6671, R041 L8600 (individual travel is not tied to the organization) | Keep; add "advisors cannot request a Mazevo account" (R013) |
| Step 2: material is split only into "required" and "optional"; **required = all applicable rules for every core node, learned by everyone** | ❌ Unsound | People basically do not read long policies (Obar & Oeldorf-Hirsch 2018); web users read only about 20% of a page on average (Nielsen 2008); unused rules are quickly forgotten (Arthur et al. 1998); support at the moment of the task works for procedural work (Nguyen & Klein 2008). Archive size: about 118,000 words ≈ 236 pages; even the core part for an ordinary Tempe event is about 36,000 words ≈ 72 pages | Change to three tiers (see Section 4): **red lines (everyone must know) → own role plus upstream/downstream nodes (must know) → look up when needed (must be able to find, not required to have read)** |
| Each node explains "what I give the next person, what limits they work under, and who a change affects" | ✅ Very good, ⚠️ reading alone is not enough | Cross-training works, at the level of "knowing the inputs, outputs and constraints of adjacent roles" (Volpe et al. 1996; Marks et al. 2002); but concept-only cross-training is almost ineffective (Cooke et al. 2000) | Pair every handoff with an exercise **from the downstream role's point of view** (for example, review an event plan as finance) |
| Step 3: teach one platform operation at a time, with result examples | ✅ Sound | Novices learn faster from demonstrations than by figuring things out themselves (Sweller & Cooper 1985, worked examples) | Keep it within 10 minutes; people who already know it can skip |
| School systems (Canvas, SDC, Mazevo, Event Registry) get guidance at the relevant node; real outcomes are recorded from real records | ✅ Sound | — | Keep; add the chain **Event Registry → RITM number → Mazevo booking** (see Section 3) |
| Step 4: tiered scenario questions (basic → multi-rule → changed situation); after a wrong answer, explain the decisive condition, then practice with a new question | ✅ Sound, strongest evidence | Testing effect (Roediger & Karpicke 2006; Rowland 2014 g≈0.50; Adesope et al. 2017); feedback after errors (Butler & Roediger 2008) | Add three things: (1) an opening **guess-first-then-see** question for each node (Richland et al. 2009); (2) a one-tap "how sure are you" rating before answering, with **high-confidence errors** resurfacing on day 3 (Butterfield & Metcalfe 2001); (3) experienced members can test out directly (Kalyuga et al. 2003) |
| Three key cases ($700/$701, moving money between line items, waiting for approval) | ✅ The first two are supported by archive text; ⚠️ the third cites the wrong source | $75 flyers / $125 pens is the example in the R029 source text; the archive has no rule of any kind that "a $1 difference can be tolerated", and R037 states the amount "MUST match" | Change the third case to cite R025 and R026; add "expedite fees themselves are prohibited" (R028) |
| Quizzes give only "traceable grading grounds"; items with conflicts are verified before they are graded | ✅ Sound; must be held to | The archive does contain several conflicts (see Section 3) | Keep; questions with conflicts stay offline for now |
| The learning plan sets no review schedule | ⚠️ Missing | Spaced review is one of the two most effective methods (Dunlosky et al. 2013; Cepeda et al. 2006) | Learn on day 1 → re-test the missed items on day 3 → a 3-question mini quiz the first time the rule is actually used → test again after 2–4 weeks |
| Step 5: ask the AI about general policy first, then ask people about experience | ✅ Right direction, supported by evidence | AI assistants raised novice productivity by 34% (Brynjolfsson, Li & Raymond 2025 QJE); employees are reluctant to ask superiors for fear of looking dependent (Lee 1997); people have fewer concerns about asking a machine (Lucas et al. 2014); a university used AI to answer procedural questions effectively (Page & Gehlbach 2017) | Keep |
| The AI "first confirms campus, identity and funding source, then explains the rule, reason and dependencies" | ⚠️ Needs change | Legal AI with citations still hallucinates 17–33% of the time (Magesh et al. 2025); in generative search only about half of sentences are fully supported by their citations (Liu et al. 2023); **explanations make people trust the AI more, whether it is right or wrong** (Bansal et al. 2021); giving answers directly leads people to "get the exercises right but not learn"; with the AI removed, exam scores were 17% lower (Bastani et al. 2025 PNAS) | (1) Campus, Top 3 status and funding source are filled in at the start as a **fixed profile**, not asked by the AI during the conversation; (2) every answer **shows the source passage** plus source, version and campus, and declines to answer when nothing is found; (3) known conflicts **show both source passages side by side** marked "to be confirmed"; (4) during learning and quizzes the AI **only gives hints**; it gives direct answers only when doing real work |
| One-on-one oral handoff, with event-based questions prepared per role | ✅ Strongly supported | Probing around specific events (Klein et al. 1989, Critical Decision Method); experts' general advice does not help novices (Hinds et al. 2001); debriefs work best with real materials (Keiser & Arthur 2021, d=0.79) | (1) Talk **with the real materials open** (a returned request, receipts); (2) also ask "what went right" (Ellis & Davidi 2005); (3) at the end the new officer **reads back** the 3 most urgent items (I-PASS); (4) schedule it on day 1–2, not last |
| Resource desk (who can solve what, how to contact them) | ✅ Sound | Whom people go to for help depends on "how accessible and how trustworthy" they are (Hofmann et al. 2009) | Add a **buddy from an adjacent role** before the President (Microsoft 2019 pilot, self-reported data) |
| Step 6: 3–5 tasks, **submit the task pack once after all are done** | ⚠️ Needs change | No study compares this directly; but feedback research consistently supports **early, multi-round, task-focused** feedback (Kluger & DeNisi 1996; Watkins 2003 early wins) | **Submit and review item by item**, with item 1 due before the end of day 1; **require 2–3 items** within 3 days, and let the rest be "in progress + where it is stuck" |
| The President's own handoff is reviewed by the predecessor or the advisor | ✅ Sound | School transition guides: the transition meeting happens before the official start | Keep |
| Incentive (1): core learning progress (mastering must-know nodes, correcting misconceptions) | ✅ Sound | Feedback that says "you can do this now" strengthens motivation (Ryan & Deci 2000) | Display it as "you can now handle X"; no ranking |
| Incentive (2): cross-department XP (earn XP for reading other departments' content) | ❌ Unsound | Rewards for "participating/completing" lower intrinsic motivation (Deci, Koestner & Ryan 1999, d −0.36/−0.40); badges and leaderboards lowered motivation after one semester (Hanus & Fox 2015); points increase quantity, not quality (Mekler et al. 2017) | Remove XP; replace it with **confirmation from a downstream peer** that "the material you gave can be used without rework", visible to the team |
| Incentive (3): complete-policy-reading milestone | ❌ Unsound | It rewards clicking through pages; rereading is an inefficient method (Dunlosky 2013); completing training ≠ behavior change (Ho et al. 2025, 8-month randomized trial) | Remove; replace with an optional "coverage map" (which nodes have been seen); **completion is judged by mastery of scenario questions, not pages** |
| The President makes completion mandatory | ⚠️ Caution | Mandatory, completion-checkbox training transfers poorly (Gegenfurtner et al. 2016; Ho et al. 2025) | What is mandatory is "**mastering the core scenario questions + delivering the tasks**", not "finishing the reading"; publish a time budget (≤90 minutes of learning per day) |
| Missing from the draft: how the President can feel confident | ❌ The most critical piece is missing | Trust must match visible reliability (Lee & See 2004); a President watching chats in real time actually reduces the questions the AI can handle (Gnewuch et al. 2024 ISR field experiment) | Add: unresolved-question queue, FAQ feedback loop, spot checks, reliability numbers (the original says "see Section 5"; these rules are in Section 4, part 4) |
| Ongoing distillation of policy content (applicable conditions, rule, reason, steps, materials, departments, version) | ✅ Sound | Explaining "why" has a moderate effect (Dunlosky 2013) | Cards start with "When you are about to…", ≤110 words each |

---

## 3. Policy facts in the draft appendix: verification results

**Mostly accurate** (archive source text and line numbers are in the R4 report): registration needs 3 officers + an advisor + a constitution; members need ≥3 credit hours; Top 3 must take Officer Training; all officers and advisors complete hazing training during registration; USG-T appropriations training requires 100% on each quiz; funding requires ≥10 members; Mazevo allows at most 3 officers; Top 3 submit budget and purchase requests; individual travel funding is not tied to the organization; anything prohibited stays prohibited even when it is in the budget; FER and Routine Inspection; the source hierarchy in R028.

**Too weak or wrong; needs change:**

| Draft wording | What the archive actually says |
| --- | --- |
| Members "usually" need ≥3 credit hours | "must" (R004 L357) |
| Tabling plus an external vendor "may" become an event | "will result" in an event (R004 L590) |
| Whether a low-impact end-of-semester event can get USG-T event funding is "judged separately" | Explicitly **no**: nothing is funded in the last two weeks (R025 L4361; R038 L6576) |
| "Each Top 3 officer quiz must reach 100%" | The source says "**a** top 3 officer", singular; it must not be taught as all three having to take it |
| The approval-wait case cites R014 | R014 is about venue booking; it should cite R025 and R026; also, expedite fees are prohibited (R028 L4768) |
| R059 "excludes student organizations" | It means organizations **may not drive ASU vehicles**; it does not exclude them from a program |
| R036 is filed under "Tempe funding" | R036 is a university-wide food-safety page |
| Mazevo | Omits "advisors cannot request an account" (R013 L2143) |

**Important rules the draft omits:**
1. **The Event Registry → RITM → Mazevo booking chain**: book the venue at least 16 days ahead; if the RITM number is not given to Student Unions 14 days before the event, the booking **is canceled** (R015 L2438; R014 L2294).
2. **Advertising before approval can get the event canceled** (R004 L598).
3. **Purchases made before approval are not reimbursed** (R025 L4363; R038 L6625).
4. **Students have no signature authority and sign no contracts**; invoices are billed to ASU (R037 L5676; R029 L4891).
5. Event-funding caps: $15,000 per semester, printed marketing ≤$500 per event, speakers ≤$5,000 (R037, R038).
6. The Business Meals Form needs officer and advisor signatures; receipts are due within 10 days; no rollover between semesters; tips ≤18% (R037).
7. Contact the Student Organizations Team before engaging vendors or running sales (R004 L586).
8. Bylaws take precedence over terms required by the funding platform (R038 L6491).

**The conflicts the draft lists are basically accurate. Additions:**
- Event Registry: 14 days (R010–R016) vs 30 days (R004, R037, R041, R064). **Teach 30 days.**
- Travel funding: R027 and the Bylaws (R038) both say $1,000 and 4 weeks; R037 and R041 say $500 and 6 weeks. The Bylaws take precedence, but teach the stricter 6-week timeline, and for the amount, "confirm with the Business Office".
- Four different wordings of the reimbursement cap ($999 / $999.99 per day / per transaction / ≥$999.99 automatically rejected).
- Food: the R041 training slides (2021) require FER for all ready-to-eat food, which contradicts R036; R015 says the approved catering list has been discontinued, while R037 still links to it.
- When the advisor must be present: three sources, three different conditions (R004, R011, R041).
- Speaker deadline: 14 business days / 2 weeks / 6 weeks. Teach 6 weeks.
- Appeals: this is not "two conflicting deadlines" (the two clauses belong to different subcommittees). The real contradiction is inside one clause: an event less than 15 business days away cannot be appealed, yet an emergency is defined as within 10 business days (R038 L6638 vs L6648).

**Which document is "the file of more than 40 pages"?** Only two documents in the archive exceed 40 pages: **R038 USG-T Bylaws (about 61 pages of text)** and **R041 funding training slides (about 53 pages, but only about 8 pages of text)**. The 2026–27 student organization handbook R004 is about 19–25 pages. You need to confirm which one is meant; the two are handled differently (see Section 4, point 1).

**Website issues found along the way:** Website rule R13 "no events during finals" uses the 2025–26 handbook (R064); the 2026–27 handbook (R004 L625) now allows certain end-of-semester events (they still cannot get USG-T funding). In addition, most of the existing R01–R16 rules cite the old 2025–26 handbook, and the code has no "applicable campus/term" field.

---

## 4. Recommended plan: ramp up in 3 days, learn what matters, without reading 236 pages

### 1. Split policy into three tiers (addresses problems 1 and 3)

| Tier | Who | Content | How it is learned | Completion standard |
| --- | --- | --- | --- | --- |
| **(1) Red lines** | Everyone (including the President) | About 12 rules whose violation leads to cancellation, no reimbursement or a violation: the amount must equal the approved amount (no tolerance); line items cannot be moved; nothing bought or advertised before approval; only Top 3 submit; students sign no contracts; 30-day registration; RITM 14 days; prohibited items cannot be bought even when approved; nothing funded in the last two weeks; no homemade food (on-site cooking needs a temporary permit 7 business days ahead); in an emergency, call 911 | One **guess-first-then-see** question per rule; after answering, show 2–5 sentences of source text and the source link | All answered correctly (after an error, answer a replacement question); about 20 minutes |
| **(2) Role + upstream/downstream** | Each role | Out of the about 40 core rules in Section 3 of the R4 report, the ones **the role itself carries out** (marked A) and the ones **that its handoff partners carry out and for which the role must supply materials** | Node cards (starting with "When you are about to…", ≤110 words) + scenario questions (basic → multi-rule → changed situation) + one "review materials from the downstream role's point of view" question | Pass the scenario questions for the role's nodes; about 30–40 minutes |
| **(3) Look up when needed** | Read only when used | All other rules, special situations (alcohol, minors, travel, raffles, etc.), complete source text | When work triggers them, the AI delivers them with source text; the full text can be opened for deeper reading; optional "coverage map" | Not tested on "having read it" but on "can find it and apply it correctly"; a 3-question mini quiz the first time it is actually used |

**How to handle the file of more than 40 pages:**
- If it is **R041 funding training**: the school requires it to be completed in Canvas, and **the site does not replace it**. The site's approach is "preview + read with questions in mind": first answer 5 guess-first questions (which correspond exactly to the slides where people most often go wrong); after each question, tell the member "this is on page N". Curiosity comes from the question just answered wrong (information-gap theory, Loewenstein 1994).
- If it is **R038 Bylaws**: no one is required to read all of it. Much of its roughly 61 pages governs USG-T's own officers. Extract only the clauses that matter to applying organizations (deadlines, caps, automatic disqualification, appeals, Bylaws precedence) and put them into tiers (2) and (3).

### 2. Turn cross-dependencies into "handoff agreements" (addresses problem 2)

Organize "who gives whom what" from the R4 report into fixed handoff agreements. **Both sides of each handoff must know it** (it belongs to tier (2), not optional reading):

| Giver → receiver | What is handed over | Latest by | What happens if it is missing | Basis |
| --- | --- | --- | --- | --- |
| Events → Finance | Date, location, audience, vendor quotes including tax and shipping (one sheet per vendor) | ≥4 weeks before the event (5 weeks for >$10k; 6 weeks for speakers) | A late request is automatically disqualified | R025, R038 L6495, R033, R035 |
| Events → Marketing | "Approved" + RITM number and venue | Before advertising starts | Advertising before approval can get the event canceled | R004 L598 |
| Events → the officer who holds Mazevo | RITM number | 14 days before the event | Venue booking is canceled | R014 L2294 |
| Marketing → Finance | Final marketing artwork (must be attached to the purchase request) | Before the purchase request | Purchase request is incomplete | R029 L4881, R047 |
| Secretary → Finance | Accurate roster (≥10 people), sign-in/attendance list | Before the funding request; at meal reimbursement | Not eligible for funding; meal form incomplete | R030 L4955, R037 L5655 |
| Payer → Finance | Itemized receipts | Within 10 days (cannot be reimbursed after 60 days or more) | Not reimbursed | R037 L5726, R041 L8912 |
| President → everyone / advisor | Top 3 list, training checklist | Before any submission | No one is eligible to submit | R004 L475, L450 |

Practice: each role does at least one "I am the receiver: what is missing from this material?" error-finding question; one item in the task pack is **real material handed to the downstream role**, and a downstream peer confirms it "can be used directly".

### 3. Three-day schedule (≤90 minutes of learning per day; the rest of the time goes to real tasks)

| When | New member | Predecessor / buddy | President |
| --- | --- | --- | --- |
| **Before starting** | Fill in the fixed profile: campus, position, Top 3 or not, funding source | The predecessor fills in the **open-items sheet**: requests in progress (number, status, deadline), external commitments, balances and line items, account permissions, key contacts, "if X then Y" | About 30 minutes: pick 2–3 tasks from templates (what to do, why, what to deliver, when, what counts as done); check Top 3, school training and system access |
| **Day 1** | Red-line guess-first questions (20 min) → own role's node cards and handoff agreements (30 min) → 3 platform operations (10 min) → submit the first small task | 1:1 handoff, 30–45 min: open the real materials; ask "which time required rework, what went right, what was the earliest warning sign"; at the end the new officer reads back the 3 most urgent items | Feedback on task 1 |
| **Day 2** | Advanced scenario questions + "review materials from the downstream point of view" questions (30 min); move tasks forward in the AI doing mode | 15-minute buddy conversation | Handle only the questions in the escalation queue |
| **Day 3** | Re-test wrong answers and "very sure but wrong" questions (10 min); submit the remaining tasks | — | Review item by item: approve, or return with a clear note on what to change |
| **Afterward** | A 3-question mini quiz the first time something is actually done; re-test after 2–4 weeks | Before the end of the semester, write a one-page semester review for the next officer | Keep the existing day 7 / day 30 check-ins |

School trainings (Officer Training, hazing, appropriations training) are tracked separately in the checklist; on-site quizzes **do not replace** school scores. Appropriations training only needs to be completed by the Top 3 officer responsible for submitting funding requests.

### 4. "AI answers first, the President answers after": rules that let the President feel confident (addresses problem 4)

1. **No source text, no answer.** Every answer shows the source passage, source ID, version and campus; if nothing is found, it says "cannot confirm" and offers an escalation button.
2. **Profile mismatch means no answer.** When the member profile (campus, Top 3, funding source) does not match a provision's scope, the AI does not guess.
3. **Show conflicts.** When a known conflict is hit, show both source passages side by side, mark "to be confirmed", and tell the member whom to ask.
4. **For questions about amounts, eligibility, deadlines and signature authority**, first have the member state the condition that decides the answer, then show the AI's conclusion (Buçinca et al. 2021, cognitive forcing, used only for high-risk questions).
5. **Hints only while learning; answers while doing** (Bastani et al. 2025).
6. **Fixed escalation order:** AI → handoff handbook / predecessor → buddy → President. An escalation automatically attaches the original question, the AI's answer, the citations and the reason it was not resolved (conflict / missing material / needs authorization / needs experience).
7. **By default the President sees summaries and the escalation queue, not individual chats in real time** (Gnewuch et al. 2024).
8. **Every President answer generates an FAQ draft, published after the President confirms it**, so the next person gets it directly from the AI (del Rio-Chanona et al. 2024: private Q&A that is not captured is lost).
9. **Build trust with numbers:** share of answers with source text, decline rate, escalation count, errors found in spot checks; in the first semester, spot-check 5–10 items per week (Lee & See 2004).

What is left for the President to do: 30 minutes of setup before the start, answering the escalation queue, and reviewing 2–3 tasks.

---

## 5. Relationship to the existing code

**Can be used directly:** the handoff module (interview, source-extract-only handbook, new-officer read-back, shadow task, day 7/30 check-ins, gap questions), the 64-source catalog, the full policy source text and search on the server, `/api/ask` returning only rule IDs, citation chips and checked dates, task submission and attachments, notifications, Roles & teams.

**Conflicts with the draft / recommended plan; needs change:**
- A submitted task is automatically marked Done; there is no "President review / return" status.
- Handoff is scheduled on 7/30 days, not 3 days.
- `/api/policy-answer` lets the AI write up to 1,200 characters of free text, which does not satisfy "no source text, no answer".
- Two rule-ID schemes (R01–R16 and ASU-R-001…064), and R01–R16 mostly cite the old handbook; R13 is outdated; there is no campus/term applicability field.
- The Ask chat history is a single shared log for everyone (the last 60 messages); there is no "unresolved-question queue".

**Does not exist at all:** data structures for red lines / node cards and handoff agreements, a scenario-question engine, task-pack review, an escalation queue and FAQ feedback loop, a startup checklist.

**Constraints:**
- This is currently the Phase 3 data-collection period (11/16–12/4); per plan, code is frozen.
- Scenario-question scores, the escalation queue and member profiles are all **new record items**; per AGENTS.md, you must decide on them after checking against the IRB.
- The research-log guard test does not allow the handoff module to read the interaction log; the escalation queue must be stored separately and must not be assembled from the research log.
- The `/handoff` page word limit is 120/120; new pages need you to approve new limits.

---

## 6. Decisions needed from you

1. Does "the file of more than 40 pages" mean **R041 funding training** or **R038 Bylaws**?
2. Should scenario-question scores and escalated questions **be stored**? (This affects the IRB and "what the President sees".)
3. Can the President see individuals' Q&A with the AI? I recommend showing only summaries and actively escalated questions.
4. Require **2–3** tasks within 3 days (recommended), or keep 3–5?
5. Teach conflicting items by the "stricter" reading (Event Registry 30 days, speakers 6 weeks, travel 6 weeks + confirm the amount with the Business Office): do you agree?
6. When to start building: after Phase 3 ends (12/4), or only static mockups first?

## 7. Limits of the evidence

- There is very little empirical research on student-organization leadership turnover itself (the most direct paper covers a single organization with 22 people). Most evidence comes from corporate newcomers, hospital handoffs and educational psychology; what is borrowed is the mechanism, not the effect size.
- No rigorous peer-reviewed research was found on "AI-generated suggested questions" or on "self-service knowledge bases reducing tickets".
- The 12 red lines, about 40 core rules, 90 minutes per day and 2–3 tasks are design choices based on the evidence and the archive, and **have not yet been tested in a real student organization**.
