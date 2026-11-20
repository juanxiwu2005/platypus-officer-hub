# Onboarding Reformation Implementation Policy (to be approved by Juanxi)

**Status: Just a scheme, no code or interface changed.** Drafting: Claude, 2026-11-01, Branch `claude/determined-johnson-yrdxwf` (pre-reading code for 10).
**Update of the same date:** adopts a supplement to Juanxi - Phase 3 participants go onboarding (new section 2b and changed sections 0, 7, 8, 9). The original proposal for "old immobility during the Phase 3 period" has been discarded and replaced by "entry + old screen plus shell is the smallest version, with new processes catching up to change."
**Two processes to be undertaken:** A. presidient First Organization; B. Registration upon receipt of the invitation link.
**Based on:** `AGENTS.md`, `docs/PROGRESS.md`, `docs/PRODUCT_PLAN.md`, sect. 7, `docs/M4_ONBOARDING_PLAN.md`, `docs/DESIGN_TOKENS.md`, `docs/design-upgrade/`; Two designs, Skill: `dickwu/apple-design-skill` (Apple Hig 123 page, installed in `~/.claude/skills/apple-design`) and `emilkowalski/skills` `apple-design` (Apple WWDC hands and effects, read); Preview of 10 code, running on this plane, desktop 1280px and mobile 390px intercept two existing processes each.

---

## 0. Let's get to the conclusion.

1. **now both processes "can be used but not like Apple."** president, which puts the 70 input frame on one page, and the member, which puts the 5 questions on one page; Both asked "what the system wants" without first being seen "what I got".
2. There is only one sentence at the heart of **: value first, information first; All that can skip; Just do one thing each step.** president 5 saw his first flowchart (which was the goal in product plan 7) within a minute. A member. 2In minutes, you see "what I'm responsible for and what my first thing is."
3. The **design "signature" is the progress chain**. It does three things at the same time: progress directions, flow charts for the first campaign, and "your position" after the members joined. Apple says, "Don't think of decorations as pleasure" -- this signature comes from the product itself, not the decoration.
4. **There's a fact you have to know first: the invitation link is only valid now in the same browser.**（`Join.tsx`Article 11Okay, take the code from the link and compare it to the one stored on this machine.  So the B process is only "designed, authenticated is empty" before v1. 5 does live account numbers. I'm not going to describe it as being able to live registered.
5. **Supplement to your 11-01 (accepted): Phase 3 participants are invited onboarding instead of falling directly into dashboard for the first time.** attendees do not log in Google, so the entrance is placed on "First Enter": a very short welcome page, selecting **Start walkthrough** (go full set-up + look at the social perspective) or **Explore the screenclub** (direct view today). From the same point of departure, each participant can be seen in a coherent manner. Designed to see new section 2b; The old `/#/setup`, `/#/join` remain as the smallest version.
6. **because it will enter the Phase 3 and time becomes the biggest constraint**: only a few days before 11/9 (8.1). I'll divide the range into "the smallest editions that must be made before freezing" and "the full version after." The question that needs your pedal is at 9, there's a total of 8, each with my advice.

---

## 1. What do I see?

Method: In the order of Apple Skill, confirm that this is **web application**, so use Apple 's "Principle + Foundation" (accessibility, colour, font, layout, text), without iOS label bars or other platform rules; `onboarding.md`, `managing-accounts.md`, `entering-data.md`, `privacy.md`, `launching.md`, `collaboration-and-sharing.md`, `generative-ai.md`, `motion.md` and `writing.md` then concluded. Each article is marked by severity (Skill's writing: Critical accessibility failed, High friction, Medium sublime, Low grinding). **did not find the Critical** (accessibility check already exists in existing browser tests).

### Organization set-up (`/#/setup`, 6)

| # | Criticality | The truth. | Apple, what do you say? |
| --- | --- | --- | --- |
| A1 | **High** | The first user saw the **shell of the whole application**: left navigation (with Tasks horn), right Ask panel (the suggested question is "What are my top 5 tabs?", prepared for the existing application), View as well as AI switches and bells already used.  | `onboarding.md › Best practices`"Keep onboarding contact felt on the experience you offer."  |
| A2 | **High** | 3 Step "Office Rules", for example, constitution reads 10 roles, **each role 7 input boxes (rolle names, who to report to, name, mailbox, telephone, ASU ID, duties)  ≈  70** with a page about 3, 768px.  | `entering-data.md`："Pre-gathering as much information as possible to minimize the amount of data that people need to supply"；`onboarding.md`："Postpone nonessential setup flows"。 |
| A3 | **High** | **asked twice for the same information, or two.** president fills each officer's phone and ASU ID at 3; When officer Adds `ProfileForm`I was asked again about the phone and the ASU ID. Section 7 of the Product Plan says "officer information is filled out by them."  | `entering-data.md › Get information from the system whenever possible`；`privacy.md`"Request access only to Data that you actually need." |
| A4 | **High** | The most valuable moment is hidden: 6 takes a word, points "Prepare first worklow", forms filled in 9 fields, ticks a confirmation box, while the **flowchart only appears in a folding block with** (Former 6 text list) `Setup.tsx` 188 Line `slice(0, 6)`）。The best thing about the product (progress chain, flow chart) isn't on "Show Time."  | `design-principles.md › Purpose / Delight`(ii) Joy is the result of matching the remaining seven; `onboarding.md`："Teach through interactivity." |
| A5 | Medium | The link is invited to appear in the folding block of step 4, "Your Introduction after setup", which says, "Only complete step 6;" After completion, the invitation is only in the folding block of Settings  →  "Invite Offices". **'s most critical "pull the team" step, too early and too deep.** | `collaboration-and-sharing.md`："Prominently display the Collaboration button as soon as collaboration starts."；"Write succinct phrases that summarize the sharing permissions"。 |
| A6 | Medium | Progress indicators are 6 pills of equal size, folded into two rows on the desktop; Which can skip and which must not be filled out. The product plan says 5, 5 minutes, actually 6.  | `onboarding.md`: Process should be "fast, fun, and optional".  |
| A7 | Medium | The first action is the "Choose File" button with the browser; "Use the sample constitution" 3This is the second row of small buttons.   | `entering-data.md`："When possible, offer choices instead of requiring text entry."；`generative-ai.md`："offer diverse, predefined example inputs"。 |
| A8 | Medium | AI Writes directly to "AI could not read it (HTTP 404)" when an error occurs. ( ⚠ ) This is what I see when I'm running the front end without a server function; It doesn't have to appear on the line, but it's written in the code and a lot of errors will come out. ） | `writing.md`："Write clear error messages… avoid blame, and be clear about what someone can do to fix it." |

### B. Invitations received by the members (`/#/join`)

| # | Criticality | The truth. | Apple, what do you say? |
| --- | --- | --- | --- |
| B1 | **High** | **wants information first, then gives value.** Open the link and the first screen is a "Try setup as" frame. The role of "who you are, what you're responsible for" is stuck under the frame and the word is small. There's no saying "What good is it for you"?  | `managing-accounts.md`："Explain the benefits of creating an account"；`launching.md`/`onboarding.md`: Let people experience value first.  |
| B2 | **High** | 5 group questions **Squeeze to one page** (desktop approximately 1,,700px): name mailbox, channel phone ASU ID, reminder time, busy week + personal buffer + tick box, career goal/interest/expected text frame with a folding free slot. The objective of the product program is "on the phone." 2Minutes, five questions."   | `onboarding.md`："design a brief, enjoyable experience that doesn't require people to memorize a lot of information"。 |
| B3 | Medium | " Busy Week" is: date input box — an "Add business week" button that looks ash, and the list says "Remove week 2026-11-09." It's like running a journal, not choosing "what few weeks I'm busy with."  | `entering-data.md`: use selection instead of input, immediate feedback; `writing.md`: In human words.  |
| B4 | Medium | There's only one sentence at the end: "You're ready" and two links (one of which is "Back to Settings," why does a new member go back to settings? ）。**didn't tell him what the first thing was.** | `feedback.md`: Clear feedback on completion; `onboarding.md`: Let people start using it right away.  |
| B5 | Medium | The hint for an invalid invitation is "check your setup in motion... belongs to a different crowder". There's no next step to that for live members.  | `writing.md`: Mistakes say "what can be done."  |
| B6 | **Limitations, not defects.**  | (b) The identity is not authenticated; Another cell phone or another browser, the link must fail.  | `managing-accounts.md`："Delay sign-in for as long as possible"、"prefer using a passkey" —— v1.5It's the right thing to do.   |

### It's the right thing to keep.

- The unfinished setup of **will be found in the browser and can restore** (`Setup.tsx` `setup-draft`) within 7 -- exactly what `launching.md` says is "Restore the previous state".
- Constitution **reads** only in browsers, and the email phone covers it before sending AI; AI had a local cover when it was turned off; "Nothing is saved until you apply."
- Date from rule engine only; "Fictional only".
- Existing accessibility, mobile phones, dark colours, and action reduction tests. **new processes must be no worse than they are.**

### Brand Reminder (Craft's article, no change requested)

Cream bottom (`--bg #fbfaf7`) with lined headlines is one of the "most common three default appearances" named by Skill (our emphasis is green, not red pottery, so it's just riming). **The program does not change the brand token**, puts "remembering things" on the progress chain instead of changing color. If the liner and the cream bottom are the brand you chose, please tell me I'll write it into the design principles.

---

## 2. Design thinking: Turn eight principles of Apple into six principles of Platypus

Apple is here. 2026Year 6The month rewrites eight principles: Purpose, Agency, Responsibility, Familiarity, Flexibility, Simplicity, Craft, Delight.  On these two processes:

| # | Platypus Principles | Which one from Apple? | Specifically. |
| --- | --- | --- | --- |
| 1 | **Values first, information then**. | Purpose、Responsibility | Every screen says, "What you'll get," and "what I need." Write use next to each question, with active sentence ( `privacy.md` "Purpose string" writing.  |
| 2 | **Don't ask, don't ask, just jump.**  | Agency、Simplicity | The fastest path is only a few steps necessary; The rest have "Skip for now" and tell people where to get it back. **Stop asking questions about** `onboarding.md`："don't present it again"）。 |
| 3 | **One screen, one hand at a time.**  | Simplicity. | One problem per screen; The main button on the mobile phone is at the bottom of the thumb enough; "Back" always is. It's not hiding things, it's putting them on the lower floor.  |
| 4 | **You do it and you see the results.**  | Craft、Delight、"teach through interactivity" | On the right, there is a live preview: you type the name of the target orgation, which grows the title; You choose the reminder time, it shows you what this reminder looks like; You change buffer days, date changes on the spot.  |
| 5 | **familiar control, not inventing new** | Familiarity | Select the subject using a number control and an option line, without drawing boxes and text frames; Dates are on weekdays, without "ISO date + Add button"; Please use "Share" (copy link / WhatsApp / Email).  |
| 6 | **. You can back up any minute.**. | Agency | Any step can be taken by Back; Anytime "Save & Exit"; Go back from where you came from (existing 7 days to resume retention); You can relive it in the settings.  |

**Self- Criticism (Skill's request for a different product):** would also be created -- part of the Apple generality, intentional -- if it were to replace "One screen one thing + progress bar + welcome page" with another application. **really belongs to Platypus in one place: the progress chain is both a schedule and a flow chart of the first event, and the member's "You're here."** I've got "remembering things" all in this place, the rest of you keep quiet.

---

## 2b. First-time entrance (Juanxi 11-01 supplement, adopted)

**Your idea:** Phase 3 Participants don't log into Google accounts, but can ask **when** first accessed the site: Shall we go full onboarding now instead of falling directly into dashboard? I think it's better -- each participant starts from the same point of departure, and it's easier to look together without looking for `/#/setup`.

**What really happened now (checked code):**
- A browser that does not save data opens the site, entering directly into Today. It is a full-filled picture of Desert Foundations Society and its identity is Alex Rivera (president). There is no guide.
- Creates a process hidden in the Demo menu only by "Replay setup" (only president / vice president is visible); The club member had to rely on an invitation link, which the participants could not obtain.
- Each participant has a stand-alone data (`store.tsx`) on its own browser, so whether or not it is the first time that **can be judged by a small mark of this machine does not need an account or a server**.

**what does the entrance look like?** (based on `onboarding.md`: after start-up has been completed, it's optional, it's not repeated and it's always found):

```
┌──────────────────────────────────────────────┐
│  Welcome to Platypus                         │
│  Your club's chief of staff.                 │
│                                              │
│  Set up a fictional club and see what your   │
│  officers will see. About 5 minutes.         │
│                                              │
│  [ Start walkthrough ]          ← Main Button      │
│    Explore the sample club      ← Secondary Links    │
│                                              │
│  Everything here is fictional and stays in   │
│  this browser.                               │
└──────────────────────────────────────────────┘
```

**Rules:**
1. **When it appears:**, there is no demonstration data saved in this browser, nor is there a "welcome page" mark (a separate key that does not appear in the presentation data). Those interviewed and those with available data will not be seen again.
2. **Start walkthrough:**Go presidient Process A 3# One more button at the invitation hour **See what your officers will see**, enter the preview of social program B (Demo texting "Previewing as certain"), see **The one they just built.**It's not an example of how to end up back today.  It's a story that happens on both sides, and it's consistent.
3. **Select Explore the screenclub:** straight into Today, mark down and stop playing. Replay setup on the Demo menu changed its name to **Replay walkthrough**.
4. **does not need damaging confirmation when first set-up:** at a time when there is nothing in the participants' own workspace that needs to be protected, and the confirmation screen is just "Start workspace"; Only when "replaying" from the Demo menu comes up with a warning that "this will replace the current presentation".
5. **Reset demo:** re-lighted the entrance after replacement (recommendation: Reset = Back to the starting point of the study).
6. **Browser shielding storage (invisible window):** can't remember marking, only play once in this session and not loop.
7. **Default Close. The** entry is controlled by a switch (made to build the switch or site parameter, OB-00). When closed, the site behaves exactly as it does today -- so there are now more than 600 Browners tests (which all directly open `/#/` and look forward to today) **without changing**. Phase 3's participant web site or build to open it.
8. **It's not a login, it's not a letter of consent:** welcomes no name, no mailbox, no Google. The informed consent is completed at the recruitment stage, not here. `onboarding.md`："Avoid displaying licensing details within your onboarding flow."）。

**I don't judge for you at two.**The participants played the president or member of the group.  Whether to put the process onboarding into local interactive records. The entrance will change the first screen that participants see, and please confirm that the description of the "prototype task" covers this direction against the IRB scheme that has been submitted.

---

## 3. Process A: first-time organization

The only mission for **: within** 5 minutes, the presenter saw **his first flow chart** and sent out an invitation.
**Something to remember:**, you said that the progress chain was drawn in front of your eyes and the date was rule engine.

### 3.1 Screen and Fastest Path

```
Welcome → Name → Constitution* → Goals* → Team* → First event → Invite
                    (*Yes, kip. )
Fastest path: Welcome → Name → First event → Invite（4 The screen, Skip Drop it.  3 Screen, with Standard Roll and Standard Targets)
```

| Screen | Do what? | Compared to now. | Remarks |
| --- | --- | --- | --- |
| **0 Welcome** | A screen. "Let's set up your club." Three-line commitment: about 5 minutes; You'll get a flow chart for the first event. The presentation data will not be sent anywhere. button "Get started". There's also "Try a screenclub" (Phase 3 fast path for participants).  | Add | Only once, not every time it starts. `launching.md`/`onboarding.md`）。 |
| **1 Name** | The name of the student organization (school fixed ASU Tempe, reading only tab + Info explains why). Right preview: The title appears.  | Half of the original 1 step | An input box.  |
| **2 Constitution*** | Three option lines: **Use sample** (recommended, first place) . **Upload a file** **Paste text**. An example of what AI does and where the text goes. After the selection, "back-office reading", the president can continue down (reserved by current practice). Bottom "Skip-use standard roles."  | Bottom of the original 1 step | AI Label, Specific Progress Talk: "Reading Office Tittles..." `generative-ai.md`："specific, reassuring feedback"）；And then in Team, there was a line called "AI Suggested" and one line could be changed.  |
| **3 Goals*** | 3 proposed lines for switchable lines, one digital step forward in each row; The mission is just confirmation. Mission sentence by default folds "Add a mission (optional)".  | Original 2 Step | Select to replace the input.  |
| **4 Team*** | **One screen, a "Organisation + List"**: Only two cells per row of the list - **Role** and **erson (allowable = Open position)**. The reporting relationship is brought out by default and can be modified at points above the chart; The job folds and the dots are open. (AI suggests inside) **The phone, the ASU ID and the mailbox are not here to ask.**: Mailbox Available  `fillEmails` Automatically, the rest is filled in by the officer itself.  | Original 3 step, 70 grid  →  20 grid | Page height dropped from approximately 3, 768px to about a screen half. Checked: `validateProfile`（`src/data/settings.ts`Inner telephones and ASU IDs were allowed to remain empty, only names and example.org mailboxes are required, so no re-checking is required.  |
| **5First event**  | A big input box + 3 example sentence buttons. The dot "Plan it" — the **progress chain**, the date of each dot, rule engine counts. **Club buffer: 1 2 3 5 7 days**, president dials the date change instantaneously (this is now the question of "a few days earlier" moving to a meaningful place). The fields that must be checked (date, number, location, etc.) are in folded " Event details " , from which the default is derived.  | The buffer at the end of former 6 step + former 3 step | The standard process ( "Event workflow" former step 5) is brought in by default; "Customize Workflow" is a secondary button that opens **for the same** `WorkflowPanel`(Section 9 Q3).  |
| **6 Confirm + Invite** | Confirmed: "This forms Desert Founders Society with 6 offices and funder Dinner on Nov 19. It places the current demo." + two buttons **Start workspace** / **Keepcurent demo** (replacing the current tickbox); This step will replace the demonstration workspace, which is devastating, so make it clear that it can be cancelled. **Exceptions: None of the participants can be replaced when** first enters the walkthrough. This warning does not appear, but only when "replay" comes from the Demo menu; see section 2b, article 4. Once confirmed, **is immediately the invitation**: see 3.3.  | End of former 6 step + add | |

### 3.2 Progress Directions = Progress Chain (Signed)

```
 ●────●────◐ ─ ─ ○ ─ ─ ○           Name · Constitution · Goals · Team · Event
 The current point of truth, the line you've taken. "Long "Past ( transform: scaleXThe point of the skip is a hollow line to go back.
```

- **is not the third set of progress bars for**, as it is now `Chain`. The "growth" of the line follows the approach of DX-25 (`transform` + `--spring-pop`) and only occurs directly when **moves forward to**.
- The skip step is shown to be a hollow point, not a red dot of "finished" -- a legitimate option.
- On the last screen, this chain **becomes a flow chart of the first activity of**: the same point, the same line. It's the only show of the whole process.

### 3.3 Invitations.

```
┌────────────────────────────────────────────────────────┐
│  Your club is ready.                                   │
│  Invite your officers.                                 │
│                                                        │
│  [ Copy link ]  [ WhatsApp ]  [ Email ]                │
│  Only people with this link can join as an officer.    │   ← Words (permissions) Apple It's...  "permission summary"）
│                                                        │
│  Maya Chen · Treasurer         ○ Invited               │
│  Priya Nair · Secretary        ○ Invited               │   ← When someone joins, it becomes...  ● Joined(same browser demo)
│  Open position · Director of Outreach                  │
│                                                        │
│  [ See what your officers will see ]   ← Main button on first entry, into process  B Preview of the  │
│  Go to Today                                           │
└────────────────────────────────────────────────────────┘
```

- WhatsApp / Email is "open a written message, sent by the person", consistent with what's available in the product (Section 8 "two modes of sending"), **doesn't automatically send**, which is specified on the interface.
- After entering the Today, the right column appeared only for the first time. Today hangs up at most 3 **one-time tips** (the "context-special sessions" advocated by `onboarding.md`, is not a major lesson: every thing that it says, points out disappears and does not appear again.

### 3.4 Desktops and Cell phones

```
Desktop  1280                                        Cell phone.  390
┌────────────────────────┬────────────────┐      ┌────────────────────┐
│ ●──●──○──○──○   Exit   │                │      │ ●──●──○ ─ ○  ⋯     │
│                        │  Live Preview        │      │                    │
│  Name your club        │  (Organization chart)  /     │      │  Name your club    │
│  [ Desert Founders … ] │   progress chain)       │      │  [ Desert Founders ]│
│                        │                │      │                    │
│  [Back]   [Continue]   │                │      │  Preview: a row of bars at the top   │
└────────────────────────┴────────────────┘      │ ┌────────────────┐ │
  No sidebar, no sidebar.  AskNo, I didn't.  View as                 │ │   Continue     │ │ ← The bottom. The thumbs are enough.
                                                  │ └────────────────┘ │
                                                  └────────────────────┘
```

---

## 4. Process B: Members receiving invitations to link

The only task for **is that within** 2 minutes, the members (mostly on the phone and from whatsApp) identify who they are, know what they're responsible for, see first things about themselves.
**Something to remember:**, the first screen to open the link is "president who you are and what you're responsible for" -- not a table.

### 4.1 Screen

```
Invitation → You → Reminders → Busy weeks* → About you* → Done
                                 (*Yes, kip. )
```

| Screen | Do what? | Compared to now. | Remarks |
| --- | --- | --- | --- |
| **0 Invitation** | The header name of the main title; " Alex involved you to be **Treasurer** " ; Role card (to whom, three lines of responsibility); Three "what will you get": one thing at a time, a reminder to your chosen place and no public roll call (product principle C4); Trust a word: what is gathered here, what is not collected. button "Continue".  | Add (now role card moved to front, zoom in) | The study called "same-browser demo" describes the intake of **a small Demo rule** (see 4.2), which no longer occupies the first screen.  |
| **1 You** | Name, Mailbox, **has prefilled** by confirming it ("Not you?" link change).  | Former group 1 | `entering-data.md`："Prefill fields with reasonable default values"。 |
| **2 Reminders** | Channels: **WhatsApp / SMS / Email** (the first two are only available for a prewritten whatsApp message to you. Nothing is sent automatically." Time: part control **Morning/ Evening**. The following example of **Live reminds bubble** to change as it is selected. 10 pm - 8 am is written as default, not a problem.  | Former group 2, 3 | The example of bubbles is "see results while doing it." ASU ID no longer asked (see 4.3).  |
| **3 Busy weeks*** | Weeks of the term: small squares in a row, end weeks and holidays for ASU are marked ( "from the system"), and every few weeks you're busy. "Skip — nothing busy yet"。"Platypus will plan around these weeks." | Original 4 group (date input + Add + Delete button) | The date is still counted by rule engine and the school calendar.  |
| **4 About you*** | Three questions are synthesized: career goals, interests, expectations of the role, each with 3 suggested little labels and can also be typed. Helps match you with tasks you'll care about." | Former group 5 | Data required for product plan G4, retained, but **skip** (Section 9 Q5).  |
| **5 Done** | His name **joins the organizational chart** (a light move); Next is his first thing: you'll see task cards here when Alex assigns one, and preview the Tasks page. Button **Open my tasks**.  | "You're ready" | The invitation list over there becomes .  |

**Departures from the B process:** personal buffers (default 1 days, advanced options remain for Settings →  My preferences), weekly free time periods (waiting to be asked when members first use Team 's meeting time function and with functional questions), ASU ID (see 4.3).

### Article 4.2 Demo

Phase 3, participants want to "play" a field officer, so the lower frame of "choice who you are" must still be in place, but it should not be the lead on the first screen:

```
┌──────────────────────────────────────────────┐
│ DEMO  Previewing as Maya Chen · Treasurer  Change │   ← A narrow line at the top of the window, amber, and a full stop.  Demo It's the same thing.
└──────────────────────────────────────────────┘
```

It says, "Fictional demo. Choosing a name does not protect an interest." **v1. When 5 has a live account, this whole one is removed and the drop frame disappears** without changing the back screen.

### 4.3 about AAU ID and the phone

The telephone only asks whatsApp / SMS when it selects, ASU ID in the new process **does not ask** (it is an optional field in existing data); And then where it really needs to be, it's in that function. This is a change in the privacy dimension of the programme, which is listed in section 9 Q2.

### 4.4 v1. 5 interface (do not do today but leave a location)

The "You" screen of the B process is the future "Identity" screen: v1. 5, after answering Supabase's mail one-time link, becomes "Check your email". `managing-accounts.md` Recommendation "Run as late as possible and give priority to passkey" Our plan was to "exercise the value before login," so the identity screen is set after the value. **doesn't make it today and does not pretend to have done it.**

---

## 5. The two processes share a sense of hands (apple-design Skill from Emil)

Full compliance with the `AGENTS.md` 7.1 dynamic rules; The new style is placed in its own little file `src/styles/ob-NN-*.css`, referring only to Token.

| Feel it. | Practice | Rule |
| --- | --- | --- |
| **Press to react immediately.**  | Follow DX-03: push down a bit and let go. option line is highlighted.  | Emil §1 Response |
| **Change screen.**  | Moving forward new content down from right 24px to left; **uses only transform + opacity**; `--dur-base` + `--ease-out`；Animated at any time to count Back/Continue, without queueing or locking the interface. For reduced kinetic effect read pure light entry.  | Emil § 3 interruptibility, § 7 spatial consultation (to and from the same path); Apple `motion.md`："Let people cancel motion." |
| **Progress chain growth**  | Line `scaleX` Long, dots. `--spring-pop` Play it. Only as we move forward.  | DX-25 Exists |
| **Witnessing the moment.**  | The **chain of the first activity shows up one time at**: points appear sequentially, with very short intervals of up to 8, completed in about 0.5 seconds, **can interrupt**, **direct whole** under reduced power effects. It's the only show of the whole process.  | Emil §8 hint in direction；Apple "brevity and precision" |
| **Where there's no animation.**  | Add a column, delete a line, change a number, cut an option: these dots are many times per minute and have no effect (rule 7.1 rule 5).  | `motion.md`："avoid adding motion to UI interactions that occur frequently" |
| **Materials** | Translucency style for onboarding shell topbars in DX-23; The main button bar at the bottom of the cell phone is a functional layer that floats on the content, and the fuzzy is given only to it and not to the contents; Reduce transparency of fallback solid.  | Emil §12；`liquid-glass.md`: used only in floating functional layers |
| **Font** | Use current screen captions `--fs-xl`(cell phone)/ `--fs-2xl`( Desktop)+DX-06 word spacing; Text 14px (rule 7.4); Figures are given in equal width. **no new fonts.** | Emil §15；`typography.md` |
| **Colours**  | **No new token. The** state and emphasis colours remain as they are. Contrast before adding any colour (text  ≥ 4.5:1). Dark Synchronization.  | `docs/DESIGN_TOKENS.md` Section 7 |
| **Touchscreen** | Options line and buttons  ≥ 44px (following DX-04); Main button bottom, Back on its left or above.  | Apple `accessibility.md`；DX-04 |

---

## 6. Document.

Principle: Each button is a verb; Use of a sentence next to each issue (active sentence); "What can be done" is wrong. (a) Not "actional" (only on the Demo bar and the screen where the name/telephone is entered); Case follows the existing sentence ' s upper case instead of Title Case (Familianity: Consistency is more important than iOS).

| Location | Now. | Programme |
| --- | --- | --- |
| Join Invalid Link | "Check your setup invitation. This local demo invitation has expired or belongs to a different browser." | "This intro link isn't working. "Ask Alex to send a new one." |
| AI Read Constitution Failed | "AI could not read it (HTTP 404), so this was read in your browser. Check each line." | "We couldn't use AI just now, so we read it here in your crowder instead. Behind the reasons. ） |
| Telephone | "Demo phone (optional)" | "Phone — so Alex can open a prewritten WhatsApp message to you. Nothing is sent automatically." |
| Disruptive confirmation. | "I reviewed this event and want to start this demo workspace." | button "Start workspace" / "Keep current demo", the preceding sentence states what to replace.  |
| Skip | (none) | "You can add this later in Settings." |

---

## 7. Do not do anything.

- **does not perform live account, password, cross-equipment authentication.** Leave all v1. 5.
- **Store without touching the server:** New processes do not call any `/api/org/*`, `/api/workspace*` (`ORG_SETUP_ENABLED` continues unset); Follow the existing door-to-door test. AI only takes the existing `/api/setup/constitution` and `/api/command`, **does not add an AI interface**.
- **without live data, secure key**; All examples of the new interface are fielded.
- **dates are calculated by rule engine only as**: each date of the witnessing moment comes from `schedule.ts`, which AI does not give.
- **No change in data structure** (`SCHEMA_VERSION` unchanged): The new process is still written into the existing `completeSetup`/ `saveProfile`. The data base (`Role.departmentId`, `syncHolders` et cetera) in `M4_ONBOARDING_PLAN` is another thing that is not done here (9 Q6).
- **Tug Editor not working on** organization arcitecture, server storage for DP3 and third design system (M4 option has decided not to move).
- **don't change brand token.**
- **does not add any automatic reporting or burial sites.** Existing local interactive records (`platypus.v1.log`, only in the participant ' s own browser, which is exported by Settings  →  Export my data) would have recorded the executed operation (e. g. `saveProfile` with values prior to modification). And don't you ever think about "the step to go, the step to kip, the way to start or the choice" -- it's a question of design. See 9 Q8, default. The fast budget is still in scripts.

---

## 8. Implementation plan

### 8.1 Preconditions and Order

1. **The new process relies on previewing the dynamic effects of 10 token and drag/ spring code** (`dx-00-tokens.css`, `motion.ts`). These are now only `claude/determined-johnson-yrdxwf` (PR #10), **is not in `main`**. So: **Wait for your preview. 10After taking a decision (merge or not)**The new process will have a stable foundation.  Preview 10If you want merge, please follow your previous choice. **Create a merge commit**。
2. The new process opens a new branch from `main` (including mege v1. 6) with the name `AGENTS.md`, Section 8: "`design/onboarding-flows`" (lower case without an AI name), finishes its own Draft PR grab preview, **does not touch `main`, and you say "approval the merge" is just "merge".**
3. **Two entrances, one switch:** New processes on `/#/welcome` (president) and `/#/invite` (member); The first entry page (section 2b) points to **old** `/#/setup` and `/#/join` before the new process is completed or acceptance takes place (with an initial focus on the shell, removing sidebars and Ask). President Process A, B **, each as a whole, once you have finished one, and you pass one, pointing the entrance to the past**; The one that didn't pass goes on with the old one. The old web site and their tests are kept as they were.
4. **The freezing date is a hard constraint.** `M4_ONBOARDING_PLAN`Write Phase 3Yes. 11/9From the freezing period 11/6Up ( 10Month 29It's written, I... **No re-check**）。 Today is 11/1, full version of 8–9 session **cannot be guaranteed to catch up with**. So there are two lines: **Minimum = OB-00 (including entrances) + Old screen plus shell**, which must be frozen before it is frozen; **president process A (OB-01 ~ 04) will not catch up depending on the live date of Phase 3 and the speed of each package of your acceptance, and I will not commit to**; Worker process B second. The combination that **started at the moment of freezing is the research tool**, and then freeze without changing anything to `main`, and I'll write the version in PROGRESS.

### 8.2 work package (following v1. 6 approach: stand-alone, `--no-ff` merge, single rollback)

| Bag. | Contents | Size |
| --- | --- | --- |
| **OB-00Base + First Entry**  | New onboarding shell (with no sidebar and Ask focused layout, top bar, Skip/Back/Save & exit); Step state machines (pure function: forward, return, skip, restore with unit tests); (a) Progress chain indicators; Article Demo; (a) Lists; **Welcome page and switch (section 2b, default switch)**; `/#/welcome`、`/#/invite` Air route. The entrance points first to the **old** setup/join. **Switches stand exactly the same as today, with zero change in behavior by old route.** | 1–1.5 Sessions |
| **OB-01 A·Welcome + Name + Constitution** | 0–2 screens; Reuse `ConstitutionStep` to read logic and `startReading`(change interface only).  | 1 Sessions |
| **OB-02 A·Goals + Team** | 3–4 screens; Two rows + tissue chart (reuse existing) `OrgChart`) + Folding of duties; Confirm `validateProfile` and `fillEmails` Relationships.  | 1 Sessions |
| **OB-03 A·First event** | 5 screen: One sentence  →  progress chain drawn  →  buffer section control; Reuse `parseCommand`/`prepare` Logical and `completeSetup`。**, the hardest package of**.  | 1.5 Sessions |
| **OB-04 A·Confirm + Invite** | 6 screen, invitation hour, Joaned state, one-time reminder for 3 at Today.  | 1 Sessions |
| **OB-05 B·Invitation + You + Reminders** | 0–2 screen for members; Example: Bubbles; Article Demo.  | 1 Sessions |
| **OB-06 B·Busy weeks + About you + Done** | Weeks, suggested labels, an action to join the tissue map, first thing card.  | 1 Sessions |
| **OB-07Shut up.**  | Desktop + mobile phone + light/deep colour + less dynamic + less transparency full set; Document(s) `AGENTS.md`、`PROGRESS.md`、`DESIGN_TOKENS.md`）；Rollback rehearsal; A cross-section of screenshots; Your acceptance modification.  | 1 Sessions |

Combining about **8–9 Sessions** with each package of your acceptance round-trip. After OB-00, OB-01 — OB-04 (president) and OB-05 — OB-06 (member of the community) do not change each other's files. **can create a worktree parallel to** as v1. 6.

### 8.3 Acceptance door for each package (indents)

1. `npm run check` Full Green (lint + Build + Module + Brownsertes + Words).
2. **Add browsertes:** desktop and cell phones each "fast path" and "complete path". Back/Skip/restoration; `/api/org`, `/api/workspace` requests are 0; `axe` Accessibility; (a) Dark colour; Reduces the effect of moving the painting unattached.
3. **"Intentional infractions make red" reverse verification**: each new guard carries a sample that turns red (following the v1. 6 rule).
4. **Maximum number of new screen words**: Every screen "seen word at first glance" 40English words (witness and invitation screens) 60）； We're going to delete it first. (existing `npm run words` main page, with a single budget for the new process. ）
5. **budget (design target, not measured result):** president fastest path  ≤  12 hits/inputs, member fastest route  ≤  8; Use scripts, not real people.
6. Every bag. **Rollback Note**And independent merge committee;  The old route test **cannot delete**.
7. I will write in PROGRESS: What has been done, what has not been verified (real fingers, Safaris, etc.), how to access it. **didn't prove it. I wouldn't say I did.**

### 8.4 your approach

Like v1. 6: At the end of each package or phase, I'll give you a preview of the web site and a few words from "where the dots are", and you just answer "may" or "where the dots are."

---

## 9. 8 questions that you need to decide.

| # | Problem | My advice. |
| --- | --- | --- |
| **Q1 Time and Scope** ✅ **Reply(s) 11-01）**  | **11/6 as a reference for** and try to finish it before 11/6; Phase 3 and the exact date of the freeze have not yet been set.  | The entrance + the record + the shell must catch; New president process priority A; Split & Meet [ `onboarding-redesign/WORK_PACKAGES.md`](onboarding-redesign/WORK_PACKAGES.md)。 |
| **Q2 president no longer fills the phone and ASU ID** | "role + name" only; Phones and ASU IDs are filled in by the office (call only when selecting whatsApp/SMS), **ASU IDs do not ask for**.  | **Ratification.** solves A3 (the same message twice) and privacy issues; Section 7 of the product plan was meant to mean that. I've checked the existing verifications: these two could have been left empty without changing them.  |
| **Q3 Calendar/Drive Links and Process Custom is no longer a necessary step**  | Calendar links, Drive folders and custom standard processes are moved from mandatory paths: invitation channels are selected at the time of invitation; The rest is on today's "Finish Setup" list and Settings. **This is different from the decision taken by 6 in section 7 of the product plan (set with a connector for the first time) and 10-29 (the process step allows presidents to be adjusted in the graph).** | **approves** for reasons: these connections are currently only demonstration configurations and have no real access; The flowchart editor leaves a "Customize workflow" portal, which remains the same editor without loss of functionality.  |
| **Q4 invitation to put at the end and show the list of Invited/ Joined**  | Invite time after "Create Success".  | **Ratification.** it makes the invitation appear when it's useful, not when it's useless.  |
| **Q5 members' questions are fine.**  | Career goals/interests/desirations become a screen for kskip; Personal buffers, weekly free hours are moved from onboarding to Settings and Team pages (to be asked).  | **Ratification. The principle of** Apple is to postpone non-necessary setting; These data are still available and collected in context.  |
| Relationship between the **Q6 and M4 programmes;** Order | This programme only handles **interfaces and processes**, without changing the data structure; `M4_ONBOARDING_PLAN` The data base (M4a) and the " Read communication " (M4c) are another line. Do you want merge as a route? And why don't you decide on a preview of 10?  | **Separate.** decides first to preview 10 and then to do this programme (OB-00); M4a does it alone when needed, and the two are not reciprocal.  |
| **Q7 Who the participants played**  ✅  **replied (11-01)** | **attendees are president**, defaulting that everyone goes first to the president process A.  | **cancels the** portal "I'm a member" after A.  |
| **Q8 Do you want to record the process onboarding** ✅ **Reply(s) 11-01）**  | **to record, in the browser.** | Be a stand-alone key, with no content for behavior only and be exported by the participants themselves through Export my data; Designed as WORK_PANKAGES Section 4. Whether to inform participants on the page of welcome should be checked against IRB material.  |

**You can answer me like this:**"All done as suggested";  Or "Q3 not approved, the rest authorized"; Or, "Do OB-00 first and look at the entrance." Live dates in Q1, Q7 and participant roles, please tell me directly.

---

## 10.

- **has not measured** with a real cell phone, a real finger, nor has it been seen in Safari; The screenshot is only the Chromium desktop 1280px and mobile phone 390px.
- The AI reading condition in the status quo is the result that I only saw when I ran the front end (no server function started), and I did not measure on-line behaviors, nor did I consume any AI amounts.
- **new numbers for contrasts, fonts and click areas have not yet been counted** - they are to be measured by the existing `axe` and token comparisons when each package has a live interface; No new colours have been introduced into the programme, so no new values are expected to be required.
- "President — 5 minutes, members  ≤  2 minutes" is the product plan for **target**. How long has it been that I haven't measured (no real test); The budget for the number of hits on 8.3 is a design target.
- Date (Phase) 3It's... 11/9、11/6From 10Month 29M4 of Japan, not re-reconciled.
- The second Skyll, I read `skills/apple-design/SKILL.md` in `emilkowalski/skills` repository (a web page version of WWDC action notes), whose dynamic figures (combating 1.0, response 0.3–0.4, etc.) I refer only to it and the actual values are still `--dur-*` and `--spring-*` for `docs/DESIGN_TOKENS.md`.

---

**My first step after approval:** only does OB-00: focus on the outer shell, step state machine, **'s first entry welcome page (default closing)**, open route and switch. I'll give you a preview of the web site where you can see the page. When the switch is closed, it stands exactly as it is today and the current interface remains unchanged.
