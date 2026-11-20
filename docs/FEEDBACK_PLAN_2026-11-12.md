# Test feedback solution (2026-11-12, to Juanxi selection)

> Status: **is just a scheme, no code changes.** Juanxi selects each programme and implements it.
> According to: Juanxi, the questions asked by other heads of missions after they had been tested; `main` = code for `ee7e825`; 2026-11-12 Minimum AI diagnosis of 2 for official websites; Juanxi uploads the timetable file `event-workflow-calibrated-2027-04-16-3.tsv` (not placed in repository).
> Each question to 2–3 programmes, **= my proposal**. The workload was a rough one, not a commitment.

## 0.

### 0.1 AI The main reason why you failed is not Netlify timeout

2026-11-12 I've adjusted the lightest AI interface on two official sites with complete pictureal data (the "Why it matters" sentence):

| Number | Results | Time |
| --- | --- | --- |
| 1 | _Other Organiser `AIR stopped before finishing the response (output limit)` | 4.1 seconds |
| 2 | Same failure. | 4.0 seconds |

4 seconds fail, far from the limit of any time. The reason for this is that **, which we gave to AI, is too small for**: this interface is only for 120 token and the model has been cut off before it's finished, and our code considers it a failure. The most likely explanation is that the model "thinks" first and uses the amount (`AGENTS.md`, sect. 12 v3. 1 has already been remembered: Muse asks not to think, but actually still to think). I don't have any direct proof of that, but I want to put "thinking how much token" in the log at the time of restoration.

**Consequences: Al of the reminder, which now fails every time**, always shows "Checked Team AI unavailable". That's exactly what we sell.

So there are two types of AI failure that have to be addressed separately:

1. The **output amount is too small** (consistent failure, within seconds): `nudge-draft` 120, `ask` 300, `handbook-draft` 400, `chat` 400–600, `policy-answer` 500.
2. **Sir, it's slow.**(Accordingly): Chat type requests 15–23Seconds, and we set our own ceiling. 22seconds (sec) `SYNC_AI_BUDGET_MS`If you don't like it, just give up.

Time limit for Netlify: repository says "about 30 seconds will be cut off" (2026-11-07 line log: 31.2 seconds later 504). Netlify's current document is written as a synchronous function **60 seconds** ([ operations confuture ](https://docs.netlify.com/build/functions/configuration/)). The two are inconsistent and need to be repeated when implemented; If it's really 60 seconds, our 22 second cap can be relaxed.

### 0.2 Reminders' choice is no use now.

The three alarms selected in Onboarding are simply stored (`org.settings.reminderMode`), and **does not change any behavior**; No news is sent anywhere (IRB: No reminders in the test). The real reminder process is: Today, Point Remind, Select Channel, Open the Gmail/WhatsApp Draft, Send This Returner. That is, the "auto-alert" is currently the thinest part of the product.

### 0.3 Timetable Files Uploaded with 5 to confirm first

See section 1.3.

---

## 1. Onboarding

### 1.1 Goals has an unknown time frame to press SMART

**Status:** `src/onboarding/founder/goals/suggestions.ts` Recommendations to three: Weekly events (per week), Active Members (memberes), External Income (USD). The data contains only names, targets, current numbers, units. **No time frame, no deadline.**。 The title of the screen is only "Set Goals for your Club".

| Programme | Do what? | Benefits | Cost |
| --- | --- | --- | --- |
| A Text changes only | Each target adds time to its name and unit: `External income this semester (USD)`、`Events per week`、`Active members by semester end`；"Goals are for this seconder (ends May 8)." | Half a day; Do not move data | Still not a SMART, just not ambiguous. |
| B SMART sentences | Each target is presented as a sentence: **"By [May 8] reach [$500] in [external income] ([this semester ▾])"**。 Time frame is drop: per week/ per month / this timester; The cut-off date is automatically filled in by the engine on the end of the term. Three little hooks in each row: Specificic Meausurable Time-Bound, one of the missing ones is ash. A good goal says what, how much, and by when. | The tester knows what to decide at first glance; Then today's target ring can write "$120 of $ 500... 6 weeks left." | About 1.5 days; `Goal` Add optional fields `period`(old archive is not affected; no promotions are required); Process version to upgrade to `ob-5` |
| C AI Help | President Writes A.I. Rewrites to SMART and Track Shortcuts | It's the least brainy. | Dependence on AI (now unstable); The date still has to be the engine; Don't do it. |

### 1.2 organization arcitecture: no Advisor, not intuitive

**Status: The** code actually supports Advisor (with `advisor` in `RoleFunction`, drawing it next to the president and using a dotted line), but the new 5 rolls that start with the student orientation do not have it, while "Add Rule" adds only "New Roll"; You have to change your name to Advisor to become a consultant, no one will find out. The Team screen is a table (rolled down by Role / Person / Reports to) and the tissue chart below Table ****, read only.

| Programme | Do what? | Benefits | Cost |
| --- | --- | --- | --- |
| A. Advisor | Default one more line **Advisor** (already empty); Reports to not pull down but to write "Advises the Club"); Add the button "Add issuer"; Move the tissue chart to table **above** | Half a day; Solve "no problem." | The upper and lower levels still understand. |
| B Tables as an outline | On the basis of A, the table groups up and down and draws a connection line with " → " in each row to raise or down one rule level (like the Word outline); Point a line and the box on the chart is highlighted | About 1 days; The phone and the keyboard are working. | Still two things looking at each other. |
| *C, change it directly on the map. | On the basis of A, the organization chart becomes editable: point box renames and people; Add "+" to the box with one subordinate; Drag the box to another box = re-reporting object (Move under... menu for mobile phones and keyboards). Table harvest "Edit as list" | You see, you get what you see. | About 2–3 days; Resume drag code for board ( `src/lib/dragSort.ts`） |

It's suggested that we do a "A" (good day), C in the back.

### 1.3 Date Engine Update

I have finished reading: 32 steps correspond to the current template, changed to **projected days** (many from 1 to 5 or 10), **relative to the time point of the activity day** and several **dependent relationships**. You need to confirm 5 before execution:

1. The **series of steps started on the same day and ended on the same day.** Event Plan  →  Back-up Plan  →  Candidate Venue  →  Event Registry  →  Book Room is one and the same, but all five steps are "2/10 starts, 2/15 ends, 5 days each". The current engine rules (the next step is done before we start) don't fit in. You mean one of these five steps can actually be done at the same time, or two is to be staggered?
2. **"Event Day" is not a step.** Feedback, Post Marketing, Photo Backup, Attendance Submit wrote "Event Day". I understand "can start after the day of the event," right?
3. **Paid Reimbursed, Finance Report, Documentation Post-Activities 129–132 (8).**It's because the activity is... 4/16The engine counted the summer vacation as "student doesn't work," so it pushed to start in the fall.  Is that what you want? Or should I finish it before the end of the semester?
4. **"Effort days" is now more like "how long the window" than "a few days' work."**, for example, Quote Gath 10 is actually a quote. This and the 3 issue are the same thing, suggested together.
5. **Budget's Note "Needs Event Plan as preequisite"**: Should the dependency on "Budget et al. Event Plan be added?

How to land:

| Programme | Do what? | Benefits | Cost |
| --- | --- | --- | --- |
| *A update standard template | Change by File `src/engine/playbooks.ts` Time, number of days, dependency at each step; (b) Remedial testing; `docs/RULES.md` Sync | New time for all new activities. | About 1 days; "Recalculate with the new event" is not automatic. |
| B Template becomes data file | Place the schedule in a table file in repository, with import/export scripts on A | You can update it later without changing the code. | More or more 1 days |
| C for SEO only. | Save only as SEO's own workflow ( `org.eventWorkflow`), the standard template remains unchanged | Without prejudice to other student organization | Other testers still see old times. |

### 1.4 Buffer day nobody understands. Why not the whole process?

**Status:** has only one title per screen and a maximum of one subheading (the cap of the word 60 per screen). Buffer controls are on First event screens, which means "Your library finishes this many working days before each official deadline." There's another known problem. `AGENTS.md` 6d）：**Buffer, the date on the progress chain will not change.**So it looks really useless.

**Buffer itself:**

| Programme | Do what? |
| --- | --- |
| * A move out onboarding | Default 3 days, asking no questions; Settings keeps a small time-axis explanation. |
| B, keep it but tell a story. | Replace 1/2/3/5/7 with Tight (1) / Standard (3) / Safe (5), next to a small axis: `ASU deadline Apr 2 → your club finishes Mar 30 → Sam is reminded Mar 26`If a quite comes back two days late, you still make it. |

**Why (Gold Circle: Why  →  How  →  What):**

| Programme | Do what? | Benefits | Cost |
| --- | --- | --- | --- |
| *A: Why does every screen say a | Staple a line "Why:" under each screen title, with the same sentence. Example — "Your observation already says who does what. Goals — "So Platypus knows which events matter most."；Team — "Every task needs one owner. Reminders go to a person, not to 'the club'."；First event — "See every ASU deadline before it bites."；Reminders — "So you never have to chase people yourself." | About half a day; Every screen says, "Why do you want to fill this?" | The maximum number of words per screen is to be mentioned from 60 about 80. |
| ♪ B, start with a screen "Why has Platypus" | After the welcome page 15One screen for seconds, three lines: **Why** "Clubs miss deadlines because nobody sees the whole chain, and everything resets at handoff." → **How** "Platypus watches every deadline and writes the reminder for you." → **What** "Four things to set up: your team, your first event, how reminders go out. About 5"Who owns what" instead of "Team."  | Let's get this whole thing straight, and then we'll have it filled out. | About half a day; One more screen. |
| C by filling and looking at effects | Put a real-time preview on the right side of every screen: what does Platypus do? | The most intuitive, "show, don't tell" | About 3–4 days |

A and B can do it together (total about 1 days).

### 1.5 Reminder screen no example

**Status:** `src/onboarding/founder/ReminderMode.tsx`: Three single options, one sentence, no example, no map.

| Programme | Do what? | Benefits | Cost |
| --- | --- | --- | --- |
| *A example + three-step diagram + analogue | Put it on top of the screen first. **A live-like reminder**"Hi Sam - Book the room for Welcome Mixer. Start by Mar." 26, due Mar 30"Reply: Done Waiting .Need help."* Three steps below each option, accompanied by a life analogy: **Send automatically** — Platypus writes → Platypus sends（"Like a calendar alert."）； **I review, then I send** — Platypus writes → you check → you send（"Like a draft waiting in your outbox."）；**I review, Platypus sends** — Platypus writes → you approve → Platypus sends（"Like approving a scheduled post."） | Non-technical students can also understand; Three options and sequences remain unchanged, and research data are still comparable | About 1 days; The word cap is up. |
| B, split into two simple questions. | 1: "Do you want to check each other first?" Yes/No; 2 (Yes only shows up): "Who presses send?" Me/ Platypus | It's all a big deal. | You can't compare the data directly to the IRB. |
| C, you can try. | Add "Try it" on "A" and play a little simulation. | I know the best. | More or more 1.5 days |

Note: The bottom "Demo: no email is ever sent." must be retained during the Phase 3 period.

### 1.6, the last button is confusing.

**Status:** Confirm screens **Start workspace**, **Keep current demo**, Back; The primary button for the Invite screen is **See what your offices will see** (after that is a 6 screen crew preview), and the second button is Go to Today.

| Programme | Do what? | Benefits | Cost |
| --- | --- | --- | --- |
| ♪ A main button to remove previews | Confirm leaves only one main button **Create my club**; "Keep crrent demo" is removed. Only a line with the word "Cancel and keep the current Club" is shown when it has previously been built. Invite master button changed to **Open my workspace**, "See what your offices will see". The crew preview remains intact and stays on the Demo menu ( "Test Onboarding Page" already exists) | (a) Enter when the president is set; 6 screen | About half a day; Process version up `ob-5`；There's no more members previewing that part of the research record. |
| B merge in one screen. | Confirm and Invite synthesize one screen: + **Create my club**; Your screen is ready, **Open my workspace** | 8 Screen Change 7 Screen | About 1 days |
| C Preview downgrade | Keep previews, but change to a line of small words link under the main button "Preview the office input (optional)" | Minimum change | There's still a risk of distraction. |

---

## 2. Other modules

### 2.1 Club Deadline and Due date

**Status:** Each step has three dates: Start by, Club Deadline, ASU Deadline. The third task built manually is called "Due date," and after the buffer, Club deadline was a few days earlier than Due date, so... **Two "cut-off days" appear on the same mission.**（`src/engine/taskDates.ts`It's... `officialLabel`）。

I agree with your idea that the **engine still counts as the ASU cut-off date**, because it's on its own "if you don't miss the school hard deadline." It's just the interface.

| Programme | Do what? | Benefits | Cost |
| --- | --- | --- | --- |
| * A interface with only one Due | All places show only one date **Due** (= club deadline). The ASU date is no longer a parallel column. It appears only in two places: "Why this date" at 1 o'clock: "AAU needs this by Apr." 2. Your club finishes 3 working days earlier."； 2 Red warnings when there is a risk. The manual task removes the "club deadline N working days earlier" tickbox with only one date. "Start by" is called "Reminder goes out Mar 26." | One task for a cut-off date | About 1–1.5 days; The formulation of product plan "Mechanism 1: Three cut-off days" needs to be changed. |
| B, leave two but clear. | Renamed **Due (club)** and **ASU cut-off (hard limit)** with a small axis of time; Only steps with real ASU rules (32 pace 7 step) show the second | Keep the message on file. | Still two dates. |
| C by Role | officer only sees Due; You can see ASU cut-off in Details. | Officer is the simplest | There's a difference between the two. It's an explanation for the presentation. |

### 2.2 Events page does not have the Create Event button

**Status:** `src/pages/Events.tsx` No new entry, empty "Ask Platypus to plan one." Only "Plan..." in the right column of Ask. The Tasks page has "+ New task".

| Programme | Do what? | Benefits | Cost |
| --- | --- | --- | --- |
| ♪ A plus buttons, straight out of the form | Events Page (and Today's Events Card) plus main button **+ New event**, clicks to open the existing active form directly in the right bar without typing first. "Only the present or VP can create events." | About half a day to 1 days; Reuse existing forms; Matching "AI" interface rules with "Ask only." | None |
| B button opens the "One Word" window. | Button opens a small box: "Descripte your event in one place" + three examples (like onboarding) | Keep the bright spot of "one word construction activity." | Reliance on AI resolution |
| C, both of them. | button: Fill in aform / Discribe it to Platypus; Ask add a suggested button "Plan an event" | Both types of care. | One more step. |

### 2.3 AI has failed every time.

See 0.1 for the reason.

| Programme | Do what? | Benefits | Cost |
| --- | --- | --- | --- |
| *A repair output level | The output of all short tasks refers to levels that are not "thinking" enough (for example, at least 800–1000); When it was cut off because it wasn't enough, **Try again on a larger scale.**； "How much token" in the journal; Adding a test that says, "I'm going to make small amounts red." | About half a day; Directly eliminate the category of "inevitably failing"; Synchronising folder | Automatic retry will spend more on AIR calls ( `AGENTS.md` Section 12 says, "Don't duplicate fees automatically," so you have to agree. |
| ♪ B, relaxing time ♪ | Redistribution of the live ceiling for Netlify (document 60 seconds); If true, refer the 22-second cap to approximately 45 seconds, while the browser waits for synchronisation; Show "Thinking... 12 s" while waiting; Extending "first out of form and then fill in AI" to all AI portals | About 1 days; Fixing the occasional timeout. | The maximum time to wait is 45 seconds, so progress must be shown |
| C Backstage Task + Roundup | Change long tasks (read constitution, draft manual) to back-office functions (Netlify ceiling 15 minutes), with the page asking for results every few seconds. The code for this approach already exists in repository. `org-ai-run-background.mts`） | Completely untimed | About 2–3 days; There is a need to open the server storage (now off). `ORG_SETUP_ENABLED`It's up to you. |
| D Change model or supplier | Short jobs for faster models. | — | Phase 3 must use ASU AIR; Not now. |

Recommendation A + B to do it together; We can't do C until we're done.

### What does 2.4 mean by "not caught"?

**Status (read code):** "Not filled" with two completely different scenarios:

1. **pointed to someone but he didn't order "I've got it".** is the only person who can claim it. In: leadership transfer transfer to incoming officer, president pointing the task to someone else and moving role.
2. **doesn't have a head, anyone can take it.** appears at: role empty, president sent out a mission "who will do it."

This column in "My tasks" = the one that points to me + nobody is responsible; To "Team tasks" = to all unclaimed individuals, and you can't do it in the name of others. The cards don't see which one. That's the source of the tester's confusion.

Besides, when a new activity is built, there are steps to be taken directly by To do (no need to recognize), only those left empty by the Rolle are not cleared.

| Programme | Do what? | Benefits | Cost |
| --- | --- | --- | --- |
| * A separates the two cases with text | The data remain unchanged. This column in "My tasks" is called **waiting for you**, and the button is still "I've got it" and "Accept all (5)"; **Open . anyone can take**. "Taam tasks" with each card marked "Waiting for Sam" or "Open to anyone". | About 1 days; Logic is clear; Do Not I Schema Version | Listing is different in two views. Change the description from Settings  → Board |
| B. Reduction in the number of cases requiring recognition | Based on A: mandate transfer is no longer individually recognized, confirming all at once when "take over" | A lot less. | Changed the rules you agreed to at 2 stage (D-2a) |
| C split into two states. | Add status: Open and Overed (to someone) | Cleanest. | 6 Status Change 7 to upgrade schema venion, change board color and `AGENTS.md` 7.6；Not recommended |

### 2.5 Details, it's a mess.

**Status (`src/components/TaskDetail.tsx`):** top-to-down: status, title, why, head of office, three dates, waiting, draft links, Where to submit, Open Event Budget, Copy All Event Details, Remind, source, extension hint. **is the main operation** (I've got it/ Done/waiting on.../Need help/ Need more time) and then Edit. A maximum of 6 buttons of the same size before the main operation; "Do this" and "do this" mixed up; The person in charge and the date cannot be changed here. Also, `src/components/NodePanel.tsx` is an old detailed panel that no one uses.

| Programme | Do what? | Benefits | Cost |
| --- | --- | --- | --- |
| * A. Reorder into three paragraphs | ①**Head:**Title, status, responsible person, Due.  2 **Your next step:** one main button (I've got it or Mark done) and the rest of the status buttons are lined with a small button; The link to "Where to submit" is right down there. 3 **Collapse:** Why & Dates / People / Edit (president: changed name, person in charge, date, label here) / Documents. Remind only for those who are not in charge; Copy All Event Details moved to the campaign's own details | About 1.5 days; No new features. Just sorting out. | It's related to the browser tests to be changed. |
| B by person | The person in charge sees the "Do" view (how, where to turn it over, back in); President sees "Manage" view (changed header and date, reminder, risk) | Everyone sees what they want. | About 2–3 days; The difference between the two people saw in the presentation. |
| C-page Tasks | Open the entire page with a computer task on top, and only previews are done in the right bar. | Space wide | It's a big change. It's not recommended. |

Remove no one uses `NodePanel.tsx` by hand (or move its editorial field into the Edit area of A).

---

## 3Is the mission a "one day" or?" 15Minutes."

**Status:** Each step has one `estDays` ( "How many working days do you have"), the smallest being 1. Manually constructed tasks are always 1 days. The engine uses this to count "latest start" = cut-off date - projected days - personal buffers. So one. 15E-mails can be sent in minutes, and they'll be lined up. 2"The working day begins." It says in the reminder: 1 workday"。

Fundamental problem: **, two different things are put into the same number.**

- **Workload**: How much time does it really take? 15Minutes / Half a day / several days.
- **Advances**: Number of days to start, because the middle is waiting for someone else. 10God, but only flowers. 1Hours.  Your upload schedule for 10 days is ahead of schedule.

Reminders only require **in advance of** (when); The workload affected only that sentence of the reminder and the workload on the Team page. Neither needs to be accurate to the minute.

| Programme | Do what? | Benefits | Cost |
| --- | --- | --- | --- |
| * A split into two, no exact numbers. | **Size**: Quick (within half an hour)/ Half day/ Multi-day - direct to the existing light / medium / heavy, without fields. **Lead time**: "Start N days before due." `estDays`, the interface changed name. Engines remain unchanged (still in days, since reminders are always sent by day). In the reminder, for ~1 workday, press Size to say "about 15 minutes" | About 1 days; Do not promote schema vension; Same schedule as you. | One for each step of the template, Size. 1.3We'll do it together.  |
| B plus one. | Add an optional field "Expected Minutes" (15/30/60/120/240/480); Quick task advance to 0 | More precise. | One more thing to fill out; Students don't have time to estimate. |
| C Change Text Only | "Effort (working days)" to "Start this many days before due", and "~ 1 workday" | Half a day. | The problem of 15 minutes ahead of schedule 2 days. |

**"Someone has sent a long mission":** suggests a rule: **a task = one responsible + one deliverer + can be done within a week.** is not a task:

| Programme | Do what? |
| --- | --- |
| *A Short title + Remarks | Title limited to 80 characters; Enter the long content into the new "Notes" column (now there is no comment bar, only why) |
| B hint splits | On the basis of A, when there is "and/ then" or more in the title, Ask suggests "This looks like 3 tasks. Split it"? |
| C Sublist | There's a tick list in the mission. |

---

## 4. Focus: two cores, the rest of the way.

### 4.1 functions are classified by two cores

| Category | Functions |
| --- | --- |
| **Core 1: see risk  →  Automatic reminder** | Date of rule engine, flow of activity (the source of the task), "Needs a Nudge" by Today, alarm editor, silent protocol (3/5/7/8/10 days), recognition, one key echo state, notification |
| **Core 2：24The hour's up. 3Oh, my God. Handoff.**  | Handoff, rale files (auto-summation), manuals, role contacts, Rules (rules to be checked incoming officer) |
| **Support** | Events、Tasks、Ask、Settings |
| **Perimeter (and two core relationships are weak)**  | Team (workload, star of the week, meeting time), partnerers board and agencies, Funding and budget details, target ring, forecast percentage, color change and labeling, Tasks timeline view, Deeper review, old `/phase1` Page |

**The biggest discovery: Core 1 is the least done now.** Reminder point 5, leaving the website and coming back for confirmation AI, every time it fails; The choice onboarding does not work; There's no place to see 'what reminders this week will send'. Instead, the peripherals do very well.

### 4.2, how do you get the navigation and the front page?

| Programme | Do what? | Benefits | Cost |
| --- | --- | --- | --- |
| ★  F1 Reminder Priority, the rest in More | Left-hand navigation from 9 to 4: **Today** (Risk + Reminder queue), **Plan** (Events and Taks), **Handoff**, **Rules**; Team, Partners, Funding in "More". Today **Synchronising folder**: Going out this week /Needs your OK/ Sent/ Replies, a button 3)"。 Onboarding really takes effect here. | The product sees what it does at first glance; Sold on the front page. | About 4–6 days; Page position changes. It affects Phase 3 taskcards and existing browser sets |
| F2 Page Do not move, add a focus header | All pages remain in place; **Reminders** and **Handoff**, with the rest folded into "Tools" | Yes, Phase 3 is the least risky | It's still the same function. It's just sorted out. |
| F3 direct cut | Remove Partners, Team, Funding from the product. | Focus | They're called "must" in the tabulation of the papers; Handoff’s roll file is used as a contact; Not recommended |

### 4.3 Real "automatic send"

There are two reasons why no messages are being sent: IRB (no reminders in the tests) and there is no account number or server (data only in browsers). In two steps:

1. **What can be done now (demonstration):** Reminds the center + Three ways really take different processes + fix the sentence that AI wrote. It looks like it's automatically used, just not really sent out at the end.
2. **v1. 5 (live version):** login, server data storage, regular task check the alarm every morning and send it by mail service. It's a product plan that's in place for 12 months, to do it separately from IRB, and you decide which mail service to use.

### 4.4 Core 2: How do you get 24 hours to 3 days

**Status:** Handoff has 8 phases (interview, AI drafting manual, identification of outgoers, presidient approval, designation of successors, incoming officer reading and rehearsing, bystand task, 7/30 days). It's complete, but it takes weeks to wait for someone at every step. Among the most valuable of these, and **does not have to wait for anyone** is the roll file (`src/lib/roleDossier.ts`): it automatically aggregates from normal records the uncompleted date of future 30 days, contacts, experience.

| Programme | Do what? | Benefits | Cost |
| --- | --- | --- | --- |
| ♪ S1 Handoff bag for three days | **immediately after "Hand over this rule"** generates a three-day list from the rale archive (no AI, no etc.): **Day 1 (30 minutes) The case of** now is on fire: the date of failure to fulfil its mandate and their end date, the date of future 30 days, the account number and link to be obtained; **Day 2** Read 5 experiences, learned about 3 contacts and asked his predecessor about gaps identified by the 3 system; **Day 3** "Accept all" to take over the task and send the reminder to incoming officer. Shows on top "Handoff 60 %. 1 day left". Existing interviews, handbooks, restatements become "deep" and no longer hold handsoff. **Reminder system to drive handoff itself**: Remind your predecessor to answer questions, remind incoming officer to finish the day list -- two cores to drive each other  | We can take over on the first day. Reuse existing file codes | About 4–5 days; Changed the "necessary steps" of Handoff's current process. |
| S2 is usually on handoff. | There's no "handoff" thing: one word for every job. 10"Anything the next person should know?"  Change = change name + read list for three days | Leadership Transition | In general, one more question per mission; It takes a long time to save the content. |
| S3 plus a fast track. | Keep 8 phases with "Fast track (3 days)": skip confirm, approve, repeat | Minimum change | Two processes coexisting, more complicated. |

---

## 5. Order of implementation of recommendations

| Phase | Contents | Rough estimate |
| --- | --- | --- |
| 0. It'll be over in a minute. | 2.3 A (AI output), 2.2 A (+ New event), 1.6 A (last-step button), 1.1 A or B (Goals), 1.2 A (Advisor) | 2–3 Days |
| 1, make yourself clear. | 1.4 (Why and Buffer), 1.5 A (Examples of Reminders), 2.1 A (a Due), 2.4 A (Not cleared), 2.5 A (Details) | 5–6 Days |
| 2 Time | 1.3 (schedule, first answer to 5 questions), Section 3 (Size and Lead time), 2.3 B (time limit) | 3–4 Days |
| 3 Focus | 4.2 (navigation and reminder centre) | 4–6 Days |
| 4 Handoff | 4.4 S1 (three days handoff package) | 4–5 Days |
| 5 Live Send | 4.3 Step 2 (login, storage, timed dispatch) | Plan it separately. |

Each stage is a separate branch, and it's a preview for you. You say "may" and do the next one.

## 6. Questions that Juanxi needs to answer first

1. What's the status of **Phase 3?**The road map says... 11/16–12/4The code is frozen during the evaluation.  These tests for "other leaders" are the official data of Phase 3, or did they run before? If the official receipt of data has already started or begins immediately, changes onboarding (the process version will change from `ob-4` to `ob-5`) and navigation will make two batches of data incomparable, which are changed now and which ones will be replaced.
2. **1.3 5 confirmation points.**
3. **moves to several of the rules that have been approved and you are asked to nod:** per screen word cap (1.4, 1.5); For three cut-off days read one at the interface (2.1); AI automatically retry when cut (2.3 A); Reminder method (1.5 if B is selected); Navigational changes (4.2).
4. **Whether to open the server to store** (both 2.3 C and 4.3 step 2).
5. **live which channel to send and when to do** (4.3).
