# Game plan: Plan Your First Event (review version, 2026-11-21, Claude)

Basis: `ONBOARDING_QUEST_PLAN_2026-11-21.md` (Juanxi has agreed to the direction). This file gives every detail for review; **no code has been written yet**.
- Text players see in the game is in English (interface rule). The explanatory notes were originally written in Chinese and are translated here; the italic in-game English text is unchanged.
- Every "source text" quotation has been checked sentence by sentence against `03_Full_Rules_Archive.txt` and is labeled with its record ID and line number (L).
- "Handbook" means the 2026–27 Student Club and Organization Handbook (ASU-R-004); names in quotation marks after "Handbook" are its subsection names.

---

## 1. One-page overview

| Item | Content |
| --- | --- |
| Who plays | All new execs (including the President); returning officers may take the "skip test" |
| Length | 7 chapters, 32 decisions + 1 closing reflection, about 55 minutes, split over two days: day 1 chapters 1–4 (about 30 min), day 2 chapters 5–7 (about 25 min) |
| Story | Desert Founders Society holds a **Spring Speaker Night** at the Memorial Union in Tempe: a paid speaker, about 80 people, food provided, Instagram promotion. It runs from 7 weeks before the event to 1 week after |
| Characters | Player = a new officer. **Guide Pip** (the Platypus mascot, equivalent to the right-panel Ask) gives only hints. Peers: Taylor (Treasurer), Morgan (Marketing), Riley (Events), Sam (Secretary), Alex (President), Dr. Lee (Advisor) |
| Each decision | Scenario → options → "how sure are you" → result card (right: why + source text + workflow chart lights up; wrong: real-world consequence + source text + choose again) |
| Red lines | 13 decisions are marked 🔴: they must eventually be answered correctly and are tested again on day 3 |
| After completion | A complete event workflow chart (dates calculated by the rule engine) + 5 "replays with a twist" |
| Completion standard | All red lines eventually answered correctly + day-3 retest passed + (counted separately) the president approves real tasks |
| Data stored | For each decision: first-attempt right/wrong, confidence, number of retries, time taken; chapter completion; retest results; escalated questions |

---

## 2. Screens (9)

| # | Screen | Content | Existing components used |
| --- | --- | --- | --- |
| S1 | Quest map | The 7 chapters on one line (Chain), completed chapters lit up; "Continue"; "Handbook map" in the top-right corner | `Chain`, `StatusPill` |
| S2 | Decision card | Date bar ("6 weeks before the event"), peer avatar and one line of dialogue, scenario ≤40 words, 2–4 options, confidence (Not sure / Pretty sure / Very sure), "Ask Pip for a hint" | Card, right-panel Ask |
| S3 | Correct card | One sentence on why (≤25 words), 1–2 sentences of source text, "Read this in the Handbook → [subsection]", the newly lit dot on the workflow chart | `MetroChart` |
| S4 | Wrong card | A peer states the real-world consequence (≤25 words), 1–2 sentences of source text, "Try again" (options shuffled) | — |
| S5 | Chapter end | The segment of the workflow chart lit up in this chapter, the list of Handbook subsections used in this chapter | `MetroChart` |
| S6 | Completion | Complete Speaker Night workflow chart (owner and latest date for each step), "Replay with a twist" (5), "Save this plan as a template" | `MetroChart` |
| S7 | Handbook map | The Handbook's 12 table-of-contents sections, played ones lit up; each section links to the source text; no scoring | `.tbl` |
| S8 | Day-3 retest | Only decisions first answered wrong or "Very sure but wrong," asked in a different way | Same as S2–S4 |
| S9 | President view (can be turned off) | Number of people finished, the 3 most frequently missed decisions, number of questions awaiting answers; **no individual scores** | `.tbl`, `StatusPill` |

- Maximum per card: a 1-line title + scenario ≤40 words + options; no countdown, no rankings.
- On mobile, the same flow is stacked vertically; every action can be completed by keyboard; motion uses only existing tokens.
- Paper version: the 32 cards of S2–S4 can be exported as a PDF to play together at an exec meeting.

---

## 3. All decisions

Format: **Number Scenario** (English = in-game text) → options (✓ correct) → if wrong → source basis → lead roles (P President · T Treasurer · E Events · M Marketing · S Secretary · All) → Pip's hint.

### Chapter 1 Is your club ready? (7 weeks before the event)

**1.1 🔴** *Taylor (Treasurer) wants to submit the budget request. Taylor isn't one of the three officers on your registration form. Who submits?*
A. Taylor · B. ✓ A top-three officer submits; Taylor prepares it · C. Dr. Lee, the advisor
If wrong: Taylor: "They'll ignore it — only top three officers count." | Source: "Only the top three officers of an organization should submit a budget request … Submissions from advisors or general members will not be considered." (R026 L4521) | Lead: P, T | Hint: "Check who is listed on the registration form."

**1.2** *Which training must every officer complete — not only the top three?*
A. ✓ Anti-hazing training · B. USG-T appropriations training · C. None
Source: "All student organization officers and advisors will be required to complete anti-hazing training during the registration process." (Handbook "Risk Management / Hazing" L800); the Top 3 must additionally complete Student Organization Officer Training (L484) | Lead: All | Hint: "One training applies to officers and advisors alike."

**1.3** *Before anyone requests USG-T funding, who must pass the appropriations training?*
A. Every member · B. ✓ A top-three officer, scoring 100% on each quiz · C. The advisor
Source: "a top 3 officer (for student organizations) must receive a 100% on each quiz and affirm that you completed the course in all funding requests you submit." (R037 L5429) | Lead: P, T | Hint: "Funding training is tied to the person who submits."

**1.4** *Sam's roster on Sun Devil Central shows 8 members. Can you request USG funding?*
A. Yes · B. ✓ Not until at least 10 members are on the roster · C. Only for small amounts
If wrong: Taylor: "The request will be turned away — we're short on members." | Source: "a minimum of 10 members is required for USG funding" (R030 L4955) | Handoff: S → T (accurate roster) | Lead: S, T

### Chapter 2 Pick a date and a place (7–5 weeks before the event)

**2.1 🔴** *Seven weeks out. What do you do first?*
A. Book Memorial Union in Mazevo · B. ✓ Register the event in the Event Registry · C. Post a teaser on Instagram
If wrong with A: Pip hints "Your room request will ask for a number. Where does it come from?"; if wrong with C: see 2.2 | Source: "Events should be registered 30 days prior to the event." (Handbook "Event Registry" L594) | Result: the workflow chart shows "Event Registry → RITM number → Mazevo" | Lead: E

**2.2 🔴** *The Event Registry is submitted but not approved yet. Morgan wants to post "Save the date" today.*
A. Post it · B. Post it without the date · C. ✓ Wait for approval
If wrong: Riley: "If we post before approval, the event can be cancelled." | Source: "Advertising the event prior to approval may result in event cancellation, event postponement, and/or referral for conduct review." (Handbook "Event Approval and Event Promotion" L598) | Handoff: E → M ("approved") | Lead: M, E

**2.3** *Dr. Lee offers to book the room for you in Mazevo. Who can request the space?*
A. Dr. Lee · B. ✓ One of up to three registered elected officers with a Mazevo account · C. Any member
Source: "User Accounts can be requested by up to three (3) elected officers … Organization advisors are not eligible to serve as requestors" (R013 L2143) | Lead: P (designates the account holders), E

**2.4** *When must the Memorial Union room request be in?*
A. One week before · B. ✓ At least 16 days before · C. The day before
Source: "A minimum of sixteen (16) days is required to reserve all reservable spaces" (R015 L2438) | Lead: E

**2.5 🔴** *The room is booked, but nobody sent the RITM number to Student Unions. The event is 12 days away. What happens?*
A. Nothing — the booking stands · B. ✓ The event is cancelled and fees apply · C. They email a reminder
Source: "Failure to register an event and/or communicate a RITM Number … 14 or more days in advance of the event will result in the cancellation of the event and applicable fees will be applied." (R014 L2294) | Follow-up question: "By when must the RITM reach Student Unions?" ✓ 14+ days | Handoff: E → the Mazevo account holder | Lead: E

**2.6** *Your event has a paid guest speaker. Does Dr. Lee need to attend?*
A. Optional · B. ✓ Required
Source: "Advisor attendance is required for events that include guest speakers, performers, vendors, external partners, travel, contracts…" (Handbook "Student Organization Advisor" L453) | Handoff: E → Advisor (date) | Lead: E, P

### Chapter 3 Where does the money come from? (6–4 weeks before the event)

**3.1** *Taylor asks what you need to hand over for the budget request. Pick everything Taylor needs.* (multiple choice)
✓ Date, place and expected attendance · ✓ A vendor quote or screenshot for each item, with tax and shipping · ✗ "A rough total — we'll fix it later" · ✗ Just the vendor's name
Source: "make sure to include screenshots and quotes for the items you are requesting … Don't forget to add tax or shipping if needed" (R037 L5544) | Handoff: E/M → T | Lead: E, M, T

**3.2 🔴** *This event has a paid speaker. When is the budget request due?*
A. 2 weeks before · B. 4 weeks before · C. ✓ 6 weeks before
Source: "the budget request is due at least 4 weeks prior … unless the request includes a speaker agreement, then the paperwork is due 6 weeks out from the event." (R037 L5476); "Events that fail to meet the required submission deadlines are automatically ineligible for funding." (R038 L6580) | Note: sources disagree about the speaker deadline; teach the strictest, 6 weeks | Lead: T, E

**3.3 🔴** *Supplies were approved at $700. With tax and shipping, the cart is $701.*
A. Submit — $1 is fine · B. ✓ Trim the order to $700 or ask the Appropriations Committee about a change · C. Pay the $1 yourself
If wrong: Taylor: "The purchase request has to match the approved amount exactly." | Source: "The total estimated amount MUST match the amount approved from your Budget Request." (R037 L5594); to change the budget: "Contact the USG-T Appropriations Committee." (R026 L4540) | Lead: T

**3.4 🔴** *You were awarded $75 for flyers and $125 for pens. Pens only cost $50. Can flyers go up to $150?*
A. Yes, the total is the same · B. ✓ No — each line has its own limit
Source: "if you were awarded $75 for fliers and $125 for pens, those amounts are the most you will be able to spend. You will not be able to spend $150 on fliers even if you only spent $50 on pens." (R029 L4849) | Lead: T, M

**3.5 🔴** *A sale on table covers ends today, and the budget isn't approved yet. Buy now with your own card and get reimbursed later?*
A. Yes, keep the receipt · B. ✓ No — wait for approval
Source: "Purchases made before approval will not be reimbursed." (R025 L4363); "…automatically denied and not reimbursed." (R038 L6625) | Lead: All

**3.6** *Approval is slow. Can USG funds pay for expedited shipping so things arrive in time?*
A. Yes · B. ✓ No — expedited fees are a prohibited expense
Source: prohibited item "Expedited shipping, production, or processing fees" (R028 L4768); "ASU cannot pay for these items, even if they have been approved to be funded by USG." (R028 L4792) | Lead: T

**3.7** *The budget was approved this morning. What must go with every purchase request?*
A. Nothing else · B. ✓ The flyer or ad used to promote the event · C. The attendee list
Source: "All clubs and organizations MUST attach the flyer/advertisement used to promote an event to all purchase requests." (R029 L4881); after approval, wait 24 hours before submitting (R037 L5585); submitted by a Top 3 officer (R035 L5194) | Handoff: M → T (final promotional material) | Lead: T, M

### Chapter 4 Speaker, contracts and food (6–2 weeks before the event)

**4.1** *The speaker's fee is $6,000. How much can USG-T event funding cover?*
A. All of it · B. ✓ Up to $5,000 per event
Source: "Maximum funding for external speakers, panelists, or performers is $5,000 per event." (R038 L6556) | Lead: T, E

**4.2 🔴** *The speaker emails a contract and asks you to sign it today.*
A. Sign it — it's standard · B. Ask Dr. Lee to sign · C. ✓ Don't sign; send it through the university process (Business Office)
If wrong: Pip: "If you sign, you may be personally responsible for it." | Source: "Students do not have signature authority. DO NOT SIGN any contracts with vendors." (R037 L5676–77); "Any agreement signed by a student or student organization may result in personal liability…" (Handbook "Contracts for Vendors, Guest Speakers, or Performers" L602) | Lead: E, T

**4.3** *The speaker's agent asks who to bill.*
A. Your club · B. You personally · C. ✓ Arizona State University
Source: "The USG-T business office is unable to remit payment for invoices made out to anyone other than 'Arizona State University.'" (R029 L4891) | Lead: E, T

**4.4 🔴** *Riley wants to order pizza from a local shop for the Memorial Union room.*
A. Fine — order it · B. ✓ Use Sun Devil Hospitality, the venue's exclusive caterer · C. Have it delivered to the hallway
If wrong: Riley: "Memorial Union only allows its own caterer." | Source: "ASU Student Unions and Centers have an exclusive catering service with Sun Devil Hospitality. No other off-site catering services or third party food and beverage are permitted." (R015 L2392); special needs can go through a Food Exception Request, due 14 days before the event (Handbook "Food at Events" L648) | Lead: E

**4.5 🔴** *A member offers to bake cookies for everyone.*
A. Great — thank them · B. ✓ Politely decline: home-made food can't be served
Source: "No home-prepared food or drink is allowed at campus events sponsored by student organizations." (Handbook "Food at Events" L633) | Lead: All

**4.6** *You're using funds for food. What else must you submit?*
A. Nothing · B. ✓ A Business Meals Form and a list of every attendee, signed by an officer and the advisor
Source: "Any purchase involving edible products must include a Business Meals Form and a list of every attendee." (R037 L5655); "must be signed by a club officer and your advisor" (L5718) | Handoff: S → T (attendee list) | Lead: T, S

### Chapter 5 Get the word out (after approval)

**5.1** *The event is approved. Before posting, what does Morgan need from Riley?*
A. Nothing · B. ✓ The approval with the RITM number and the confirmed room
Source: promotion is allowed only after approval (L598, see 2.2) | Handoff: E → M | Lead: E, M

**5.2** *Morgan's flyer says "Desert Founders @ ASU Speaker Night" with the ASU sunburst logo. What needs fixing?* (multiple choice)
✓ Use "at ASU®" at the end of the name, not "@" · ✓ Remove the sunburst logo · ✗ Nothing
Source: "The word 'at' must be used and not the @ symbol." (Handbook L390); "Students and student groups may not use the ASU sunburst logo or the seal." (L396) | Lead: M

**5.3** *Morgan wants to print $600 of posters.*
A. Fine · B. ✓ Printed marketing is capped at $500 per event
Source: "Printed marketing materials (e.g., flyers, posters) must not exceed $500 per event." (R038 L6552) | Lead: M, T

**5.4** *You'd like T-shirts with an ASU-style design.*
A. Any print shop · B. ✓ A licensed vendor; mark "Expense Includes Logo" and attach the artwork to the request
Source: "Student clubs must use a licensed vendor for all merchandise." (R009 L1530); "'Expense Includes Logo' must be selected on the RFF … A copy of the artwork … must be attached" (R047 L9742–44) | Handoff: M → T | Lead: M, T

### Chapter 6 Event day

**6.1** *It's Friday at 8:50 p.m. The DJ wants to keep the music going until 9:30.*
A. Sure · B. ✓ Amplified sound must end by 9:00 p.m. and stay under 75 dB at 30 feet
Source: "Amplification is only permitted between … 5:00pm and 9:00pm Monday through Friday … may not exceed 75 decibels at a distance of 30 feet" (R015 L2376) | Lead: E

**6.2 🔴** *An attendee collapses during the talk. What do you do first?*
A. Text Alex · B. ✓ Call 911 and say you're on an ASU campus · C. Drive them to urgent care
Source: "call 911 and tell the dispatchers you are on an ASU Campus and need to be connected to the ASU Police Department" (Handbook "Risk Management" L905); after the person is taken to medical care, notify the Dean of Students (L914) | Lead: All

**6.3** *Morgan wants to sell $2 raffle tickets for a prize.*
A. Fine · B. ✓ Not allowed; a free door prize with an equal chance for everyone is OK
Source: "ASU and its departments … are NOT permitted to conduct raffles. Using an actual raffle ticket for a door prize is permitted, as long as attendees are not required to pay…" (Handbook "Raffles" L780) | Lead: M, E

### Chapter 7 Wrap up and hand over (1 week after the event)

**7.1 🔴** *You paid for supplies and need reimbursement. When must itemized receipts reach the Business Office?*
A. By the end of the semester · B. ✓ Within 10 days
Source: "All itemized receipts need to be turned into the Business Office within 10 days" (R037 L5726) | Handoff: payer → T | Lead: All, T

**7.2** *$150 of your budget is left at the end of the semester. Keep it for next semester?*
A. Yes · B. ✓ No — unused funds don't roll over; submit a new request next semester
Source: "If funding was not used in a previous semester, it cannot be rolled over into the next semester." (R037 L5730) | Lead: T, P

**7.3** *Taylor hasn't sent the required paperwork after approval. What can happen?*
A. Nothing · B. ✓ The approval can be taken back
Source: "the USG-T Business Office shall be required to rescind and deny the previously approved request." (R038 L6630) | Lead: T

**7.4 Closing reflection (not scored)** *Write three short lines for the next officer: one thing still open, one thing that went wrong, one thing that worked.* → Saved to that role's handoff record (Lessons), visible to the next officer during handoff.

**Red lines at a glance (13):** 1.1, 2.1, 2.2, 2.5, 3.2, 3.3, 3.4, 3.5, 4.2, 4.4, 4.5, 6.2, 7.1.

---

## 4. Five "replays with a twist"

Each has 6–8 decisions and takes about 8 minutes, reusing cards from the main storyline and changing only the conditions.

| Replay | What changed | New key decision | Source text |
| --- | --- | --- | --- |
| R1 Finals week | The date falls between the last week of classes and final exams | Study-group-type events may be held, but **cannot receive USG-T funding** | Handbook "Events During Finals" L625; R025 L4361 |
| R2 Tabling plus a sponsor | An outside sponsor actively engages people during tabling | It becomes an "event," requiring event approval and advisor presence; contact the Student Organizations Team before finding vendors | Handbook L590, L586 |
| R3 Movie night | Screening a film | Public performance rights must be purchased | Handbook L606 |
| R4 Public, 300 people | Open to the public, about 300 expected | A university representative and the faculty advisor must be present throughout | R011 L1760 |
| R5 Out-of-town visit | Traveling out of town by vehicle | Do not use 12/15-passenger vans; private-vehicle drivers bear full responsibility | Handbook L707, L695 |

Day 2: first play the one **most relevant to your own role** (T→R1, M→R2/R3, E→R4, P→R5).

---

## 5. Rules and scoring

- **The first attempt** is recorded once as right/wrong; after a wrong answer, the player must choose again until correct (options shuffled).
- **Confidence**: choosing Very sure and answering wrong → marked as a "blind spot," always included on day 3.
- **Red lines**: all must eventually be answered correctly for completion.
- **Day-3 retest**: only first-attempt misses and blind-spot questions, asked differently; completion requires answering correctly.
- **Afterward**: the first time a player books a room, submits a budget, or does promotion in a real Plan, 3 related questions pop up (about 1 minute); after 2–4 weeks, 5 more questions appear once.
- **Skip test** (re-elected or changing roles): the 13 red-line questions + 5 questions for the player's role; getting all of them right in one attempt counts as completion, and the player can go straight to "replays with a twist."
- **No points, badges, or leaderboards**; only the map lighting up and "you can now handle X."

## 6. Guide Pip (AI)

- In the game: each decision has 1 pre-written hint (see section 3). When the player asks other questions, Pip gives only **hints and the location of the source text**, not the answer.
- Answers to any policy question **include the source passage and its source**; if no source text can be found, Pip says "I'm not sure — I've sent this to your president." (it enters the escalation queue).
- **Generates no dates**; all workflow-chart dates are calculated by the rule engine.
- Outside the game (real work), the same Ask gives direct answers with the source text.

## 7. Data stored (Juanxi has agreed)

| Record | Fields | Who can see it |
| --- | --- | --- |
| Decision answers | Decision number, first-attempt right/wrong, confidence, number of retries, time taken, date | The member; a summary with no individuals |
| Chapters / replays | Completion time, whether the skip test was used | The member; number of people finished |
| Retests | Question, result | The member |
| Escalated questions | Question, Pip's answer and citations, reason it was unresolved, president's answer, whether it became an FAQ | The member, the president |
| Closing reflection | 3 lines of text | The member, the next officer, the president |

- The full conversation with Pip is not stored (only escalated ones are); member personal information is not sent to the AI.
- New fields go into `docs/PHASE3_DATA_DICTIONARY.md` and the export; structurally, only optional fields are added.

## 8. Questions for Juanxi to review

1. **Story and character names**: Speaker Night, guide Pip, peers Taylor/Morgan/Riley/Sam/Alex/Dr. Lee — are these OK?
2. **13 red lines** (the previous version said "about 12"): are these 13 enough, and should any be added or removed?
3. **3.2 speaker, 6 weeks**: sources give three versions (14 business days / 2 weeks / 6 weeks); teach the strictest, 6 weeks — agreed?
4. **Reimbursement limit beyond 7.1**: sources word it four ways ($999 / $999.99 per day / per transaction / automatically denied at $999.99 or more), so it was **not put into the main storyline**; it is answered only in Ask, with a conflict notice — agreed?
5. **President view S9**: off or on by default?
6. **Entry points**: new member's first-login onboarding, the Handoff page, the Help page — which of these?
7. **"Save this plan as a template"**: should the completed workflow chart be saveable directly as the club's first event template?

After review approval, following the process, first produce static mockups (one each for S1, S2, S3, S4, S6, S9), then write code.
