# Onboarding redesign implementation strategy (awaiting Juanxi's approval)

**Status: proposal only; no code or interface changed.** Drafted by Claude on 2026-11-01, branch `claude/determined-johnson-yrdxwf` (Preview 10 code).
**Same-day update:** adopted Juanxi's addition: Phase 3 participants enter onboarding on first visit (new section 2b, updates to sections 0, 7, 8, 9). The earlier recommendation to leave the old flow untouched during Phase 3 is superseded by "entry + a shell around existing screens is the minimum version; replace as much of the flow as is ready."
**Two flows to build:** A. President creates an organization for the first time; B. Member registers through an invitation link.
**Basis:** `AGENTS.md`, `docs/PROGRESS.md`, section 7 of `docs/PRODUCT_PLAN.md`, `docs/M4_ONBOARDING_PLAN.md`, `docs/DESIGN_TOKENS.md`, `docs/design-upgrade/`; two design skills: `dickwu/apple-design-skill` (123-page Apple HIG, installed at `~/.claude/skills/apple-design`) and `apple-design` in `emilkowalski/skills` (Apple WWDC interaction feel and motion, read); Preview 10 run locally, with both existing flows captured on desktop 1280px and mobile 390px.

---

## 0. Recommendation first (one-minute version)

1. **Both current flows “work, but do not feel like Apple.”** The president flow puts 70 inputs on one page; the member flow puts 5 question groups on one page. Both ask “what does the system need?” before showing “what do I get?”
2. **The core change is one sentence: deliver value before requesting information; allow every optional step to be skipped; do one thing per step.** Presidents see their club's first flowchart within 5 minutes (already the target in product-plan section 7); members see “what am I responsible for, and what is my first task?” within 2 minutes.
3. **This design's signature is the progress chain** (Platypus's own connected dots). It serves three purposes: progress indicator, first-event workflow for presidents, and “your place” after members join. Apple's advice is “don't mistake decoration for delight”—this signature comes from the product itself, not decoration.
4. **One fact you must know first: invitation links currently work only in the same browser** (`Join.tsx` line 11 compares the link's code with the locally stored code). Until real accounts in v1.5, flow B can therefore only be “designed properly, with identity verification left as a placeholder.” I will not describe it as real registration.
5. **Your 11-01 addition (adopted): Phase 3 participants enter onboarding on their first visit, rather than landing directly on the dashboard.** Participants do not sign into Google, so the entry occurs on first visit: a very short welcome page offers **Start walkthrough** (full setup + a look at the member perspective) or **Explore the sample club** (straight to Today). Each participant begins at the same point so onboarding can be observed consistently. See new section 2 b; old `/#/setup` and `/#/join` remain as the minimum fallback.
6. **Because this enters Phase 3, time becomes the largest constraint**: only days remain before 11/9 (8.1). I divided scope into “minimum required before freeze” and “full version afterward.” Section 9 contains 8 decisions for you, each with my recommendation.

---

## 1. What I found (current-state diagnosis)

Method: following the Apple Skill's sequence, first confirm this is a **web app**. Apply Apple's principles and foundations (accessibility, color, typography, layout, writing), without importing platform rules such as iOS tab bars. Then read `onboarding.md`, `managing-accounts.md`, `entering-data.md`, `privacy.md`, `launching.md`, `collaboration-and-sharing.md`, `generative-ai.md`, `motion.md`, and `writing.md` before drawing conclusions. Each finding has a severity (the Skill's definitions: Critical = accessibility failure, High = real friction, Medium = suboptimal, Low = polish). **No Critical findings** (the existing browser tests already include accessibility checks).

### A. President sets up the organization (`/#/setup`, 6 steps)

| # | Severity | Observed facts | Apple's guidance |
| --- | --- | --- | --- |
| A1 | **High** | First-time users see **the entire app shell**: left navigation (with Tasks badge), right Ask panel (suggesting "What are my top 5 tasks?", intended for clubs already using it), View as, AI toggle, bell. | `onboarding.md › Best practices`: "Keep onboarding content focused on the experience you provide." A newcomer’s first screen should not include things they cannot yet use. |
| A2 | **High** | Step 3, "Officer roles": the sample constitution extracts 10 roles, **7 inputs each (role name, manager, name, email, phone, ASU ID, responsibilities) ≈ 70 total**; desktop page height is about 3,768px. | `entering-data.md`: "Pre-gathering as much information as possible to minimize the amount of data that people need to supply"; `onboarding.md`: "Postpone nonessential setup flows". |
| A3 | **High** | **The same information is requested twice, from two different people.** President enters each officer's phone and ASU ID in step 3; joining officers (`ProfileForm`) are asked again. Product plan Section 7 says "officers fill in their own information." | `entering-data.md › Get information from the system whenever possible`; `privacy.md`: "Request access only to data that you actually need." (No purpose is given for ASU ID.) |
| A4 | **High** | The most valuable moment is hidden: step 6 requires typing a sentence, clicking "Prepare first workflow", filling a 9-field form, and checking confirmation; **the flowchart appears only as a text list of the first 6 steps inside a collapsed section** (`Setup.tsx` line 188, `slice(0, 6)`). The product's best visual elements (progress chain, flowchart) are absent from its reveal moment. | `design-principles.md › Purpose / Delight`: delight follows from getting the other seven principles right; `onboarding.md`: "Teach through interactivity." |
| A5 | Medium | Invitation link appears in step 4's collapsed "Your invitation after setup", saying it works only after step 6; after completion, invitations are only in Settings → collapsed "Invite officers". **The crucial "bring in the team" step appears too early (unusable) and is buried too deeply.** | `collaboration-and-sharing.md`: "Prominently display the Collaboration button as soon as collaboration starts."; "Write succinct phrases that summarize the sharing permissions". |
| A6 | Medium | Progress uses 6 equal pills wrapping into two rows on desktop; required versus skippable steps are unclear. Product plan says "5 steps, 5 minutes"; there are actually 6. | `onboarding.md`: flow should be "fast, fun, and optional". |
| A7 | Medium | First action is the browser's native "Choose File" button; "Use the sample constitution" (the primary Phase 3 path) is a small second-row button. | `entering-data.md`: "When possible, offer choices instead of requiring text entry."; `generative-ai.md`: "offer diverse, predefined example inputs". |
| A8 | Medium | AI errors display "AI could not read it (HTTP 404)". (⚠ Observed locally with only the frontend, no server functions; may not occur online, but this text exists in code and will surface with errors.) | `writing.md`: "Write clear error messages… avoid blame, and be clear about what someone can do to fix it." |

### B. Member receives an invitation (`/#/join`)

| # | Severity | Observed fact | Apple's guidance |
| --- | --- | --- | --- |
| B1 | **High** | **Asks for information before showing value.** Opening the link shows a research explanation ("same-browser demo… does not verify a real identity") and a "Try setup as" dropdown on the first screen; the "who you are and what you do" role card sits below the dropdown in small text. Nothing says "what this does for you." | `managing-accounts.md`: "Explain the benefits of creating an account"; `launching.md`/`onboarding.md`: let people experience value first. |
| B2 | **High** | 5 groups of questions **crowded onto one page** (about 1,700px on desktop): name/email; channel/phone/ASU ID; reminder time; busy weeks + personal buffer + checkboxes; three text fields for career goals/interests/expectations; plus collapsed availability slots. The product plan targets "2 minutes on mobile, five questions." | `onboarding.md`: "design a brief, enjoyable experience that doesn't require people to memorize a lot of information." |
| B3 | Medium | "Busy weeks" consists of a date input → an apparently disabled "Add busy week" button → a list saying "Remove week 2026-11-09." It feels like manipulating a log rather than selecting "which weeks I am busy." | `entering-data.md`: prefer selection over typing; immediate feedback; `writing.md`: use plain language. |
| B4 | Medium | The ending has only "You're ready" and two links (one is "Back to Settings" — why should a new member return to settings?). **It does not tell them what to do first.** | `feedback.md`: provide clear completion feedback; `onboarding.md`: let people start using the product immediately. |
| B5 | Medium | Invalid invitations say "Check your setup invitation… belongs to a different browser." For a real member, this offers no next step. | `writing.md`: errors should explain "what you can do." |
| B6 | **Limitation, not defect** | Identity is not verified; the link will always fail on another phone or browser. | `managing-accounts.md`: "Delay sign-in for as long as possible, " "prefer using a passkey" — feasible only in v1.5. |

### What is working and must be preserved

- **Unfinished setup is saved in the browser and can be resumed within 7 days** (`setup-draft` in `Setup.tsx`) — exactly "Restore the previous state" from `launching.md`.
- The constitution is **read only in the browser**; email addresses and phone numbers are masked before sending to AI; there is a local fallback when AI is off; the promise is "Nothing is saved until you approve."
- Dates come only from the rule engine; "Fictional only" research protection.
- Existing accessibility, mobile, dark-mode, and reduced-motion tests. **The new flow must be at least as good.**

### Brand reminder (one Craft point; no change required)

A cream background (`--bg #fbfaf7`) plus serif headings is close to one of the Skill's “three most common default looks” (our accent is teal, not terracotta, so it is only adjacent). **This plan leaves brand tokens unchanged**, making the progress chain the memorable feature instead of relying on a new palette. If the serif and cream background are deliberate brand choices, tell me and I will record them in the design principles.

---

## 2. Design approach: translate Apple's eight principles into six Platypus onboarding principles

Apple's eight principles, rewritten in June 2026: Purpose, Agency, Responsibility, Familiarity, Flexibility, Simplicity, Craft, Delight. Applied to these two flows:

| # | Platypus principle | Apple source | Meaning |
| --- | --- | --- | --- |
| 1 | **Give value before requesting information** | Purpose, Responsibility | Each screen first says "what you will get," then "what I need." Explain each question's purpose beside it in active voice (the "purpose string" approach in `privacy.md`). |
| 2 | **Avoid unnecessary questions; allow skipping** | Agency, Simplicity | The fastest path contains only required steps. Everything else has "Skip for now" and explains where to find it later. **Do not ask again** about skipped items (`onboarding.md`: "don't present it again"). |
| 3 | **One thing per screen, usable with one hand** | Simplicity (not minimalism) | One question per screen; primary mobile button at the bottom within thumb reach; "Back" always available. Move secondary content one level deeper rather than hiding it. |
| 4 | **See results while working** | Craft, Delight, "teach through interactivity" | A live preview on the right (bottom on mobile): entering the club name produces its heading; selecting reminder timing shows the reminder; changing buffer days changes dates immediately. |
| 5 | **Use familiar controls** | Familiarity | Use segmented controls and option rows for choices, rather than dropdowns and text fields; use a week strip for dates rather than "ISO date + Add button"; invitations should look like sharing (Copy link / WhatsApp / Email). |
| 6 | **Leave and return at any time** | Agency | Back from every step; "Save & exit" anytime; resume where you left off (preserve the existing 7-day recovery); replay from Settings. |

**Self-critique (the Skill's "would this still work for another product?" test): ** "One thing per screen + a progress bar + a welcome screen" would work in another app too. This is Apple's general approach, intentionally so (Familiarity). **Only one element truly belongs to Platypus: the progress chain is simultaneously a progress bar, the first event's workflow, and the member's "you are here."** I am putting everything memorable into that one element and keeping the rest quiet.

---

## 2b. First-entry gateway (added by Juanxi on 11-01, adopted)

**Your idea:** Phase 3 participants do not sign in with Google, but on **their first website visit** can be asked whether they want the complete onboarding walkthrough now, rather than landing directly in the dashboard. I think this is better: everyone starts at the same point, onboarding can be observed consistently, and participants need not discover `/#/setup` themselves.

**What actually happens now (verified against the code): **
- A browser with no saved data opens straight to Today, containing a fully populated fictional student organization, Desert Founders Society, viewed as Alex Rivera (president). There is no guidance.
- Setup is hidden under "Replay setup" in the Demo menu (visible only to the president/VP); the member flow requires an invitation link participants cannot obtain.
- Each participant has independent data in their own browser (`store.tsx`), so a small local flag can identify a "first visit": **no account or server required**.

**Entry screen** (based on `onboarding.md`: appear after launch, optional, never repeat after completion, and always retrievable later):

```
┌──────────────────────────────────────────────┐
│  Welcome to Platypus                         │
│  Your club's chief of staff.                 │
│                                              │
│  Set up a fictional club and see what your   │
│  officers will see. About 5 minutes.         │
│                                              │
│  [ Start walkthrough ]          ← Primary   │
│    Explore the sample club      ← Secondary │
│                                              │
│  Everything here is fictional and stays in   │
│  this browser.                               │
└──────────────────────────────────────────────┘
```

**Rules:**
1. **When it appears:** this browser has neither saved demo data nor a "welcome seen" flag (a separate key outside demo data). Returning visitors and users with existing data do not see it again.
2. **Start walkthrough:** president flow A (section 3) → at the invitation moment, an additional **See what your officers will see** button opens a preview of member flow B (Demo strip: "Previewing as [name]"). It shows **the club they just created themselves**, not the sample → finish in Today. One person experiences the complete onboarding from both sides in one coherent story.
3. **Explore the sample club:** go directly to Today, save the flag, and do not show it again. Rename "Replay setup" in the Demo menu to **Replay walkthrough**, available anytime.
4. **No destructive confirmation on first setup:** the participant's workspace contains nothing to protect yet, so confirmation is the ordinary "Start workspace." Only replaying from the Demo menu shows "this will replace the current demo."
5. **Reset demo:** reenable the entry after reset (recommendation: reset returns to the research starting point).
6. **Browser storage blocked (private browsing):** if the flag cannot persist, show it only once within the current session, without looping.
7. **Off by default.** A switch controls entry (build flag or URL parameter, decided in OB-00). When off, website behavior is identical to today, so **none** of the 600-plus existing page tests (opening `/#/` and expecting Today) needs changing. Enable it in the Phase 3 participant URL or build.
8. **Neither sign-in nor consent:** the welcome screen collects no name/email and does not use Google; informed consent occurs during recruitment, outside this flow (`onboarding.md`: "Avoid displaying licensing details within your onboarding flow.").

**Two decisions are yours (Q7, Q8):** whether participants act as president or member, and whether to record onboarding in the local interaction log. The entry changes the first screen participants see; please also check whether the submitted IRB protocol's description of "prototype tasks" covers this guidance.

---

## 3. Flow A: a president sets up an organization for the first time

**The only task:** within 5 minutes, the president sees **their club's first flowchart** and sends invitations.
**The memorable moment:** say one sentence, and the progress chain draws itself before your eyes, with dates computed by the rule engine.

### 3.1 Screens and fastest path

```
Welcome → Name → Constitution* → Goals* → Team* → First event → Invite
                    (*skippable)
Fastest path: Welcome → Name → First event → Invite (4 screens; Skip 3 screens, use standard roles and goals)
```

| Screen | Behavior | Compared with today | Notes |
| --- | --- | --- | --- |
| **0 Welcome** | One screen. "Let's set up your club." 3 promises: about 5 minutes; you get a flowchart for your first event; demo data is not sent anywhere. "Get started" button. Also "Try a sample club" (fast path for Phase 3 participants). | New | Appears once, not on every launch (`launching.md`/`onboarding.md`). |
| **1 Name** | Club name (school fixed to ASU Tempe, with a small read-only badge + Info explaining why). Preview on the right: the title appears. | Half of old step 1 | One input. |
| **2 Constitution** *skippable* | Three option rows: **Use sample** (recommended, first) · **Upload a file** · **Paste text**. One sentence explains what AI does and where the text goes (not saved after reading). After selection, "read in the background" while the president continues (preserve existing behavior). Bottom: "Skip — use standard roles." | Lower half of old step 1 | AI label and specific progress wording: "Reading officer titles…" (`generative-ai.md`: "specific, reassuring feedback"); results later appear in Team as "AI suggested" rows, editable individually. |
| **3 Goals** *skippable* | Three suggested goals as toggleable rows, each with a numeric stepper; users only need to confirm. Mission statement collapsed by default under "Add a mission (optional)." | Old step 2 | Selection instead of typing. |
| **4 Team** *skippable* | **One screen with an "organization chart + list"**: each list row has just two fields — **Role** and **Person (may be blank = Open position)**. Reporting lines are prefilled and editable by clicking the chart; duties are collapsed, expandable to read (including AI suggestions). **Do not ask for phone, ASU ID, or email here**: existing `fillEmails` generates emails; officers fill in the rest when joining. | Old step 3, from 70 fields to fewer than 20 | Page height drops from about 3,768px to roughly one and a half screens. Verified: `validateProfile` (`src/data/settings.ts`) already allows phone and ASU ID to be blank, requiring only a name and example.org email, so validation needs no change. |
| **5 First event (value moment)** | One large input + 3 sample-sentence buttons. Click "Plan it" → **the progress chain draws itself**, each point dated by the rule engine ("ASU official deadline − club buffer"). Below: segmented control **Club buffer: 1 · 2 · 3 · 5 · 7 days**; changing it updates dates immediately (moves the existing "how many days early" question to where it makes sense). Required confirmation fields (date, attendance, venue, etc.) are in collapsed "Event details, " defaulted from the sentence. | Old step 6 + buffer question from the end of old step 3 | Standard workflow (old step 5, "Event workflow") included by default; "Customize workflow" is a secondary button opening **the same** `WorkflowPanel` (section 9 Q3). |
| **6 Confirm + Invite** | Confirmation: one-sentence summary, "This creates Desert Founders Society with 6 officers and Founder Dinner on Nov 19. It replaces the current demo." + **Start workspace** / **Keep current demo** buttons (replace the current checkbox; this step replaces the demo workspace and is destructive, so explain it clearly and allow cancellation. **Exception:** first-entry walkthrough participants have nothing to replace, so omit this warning; show it only when replayed from the Demo menu, per section 2b item 4). Confirmation leads **immediately to the invitation moment**: see 3.3. | End of old step 6 + new | |

### 3.2 Progress indicator = progress chain (signature)

```
 ●────●────◐ ─ ─ ○ ─ ─ ○           Name · Constitution · Goals · Team · Event
 Current dot is solid; completed lines grow across (transform: scaleX); skipped dots are hollow/dashed and can be revisited
```

- Use the existing `Chain` appearance, **not a third progress-bar design**. Grow the line using DX-25's approach (`transform` + `--spring-pop`), animate only when moving **forward**, and show it immediately with reduced motion.
- Show skipped steps as dashed hollow dots, not red "unfinished" dots: skipping is a valid choice (Agency).
- On the last screen, this chain **becomes** the first event's workflow: the same dots and lines. This is the entire flow's only "performance."

### 3.3 Invitation moment (move it from a buried disclosure to the final screen)

```
┌────────────────────────────────────────────────────────┐
│  Your club is ready.                                   │
│  Invite your officers.                                 │
│                                                        │
│  [ Copy link ]  [ WhatsApp ]  [ Email ]                │
│  Only people with this link can join as an officer.    │   ← One-sentence permission summary (Apple's "permission summary")
│                                                        │
│  Maya Chen · Treasurer         ○ Invited               │
│  Priya Nair · Secretary        ○ Invited               │   ← Becomes ● Joined after joining (same-browser demo)
│  Open position · Director of Outreach                  │
│                                                        │
│  [ See what your officers will see ]   ← Primary button on first visit; previews flow B │
│  Go to Today                                           │
└────────────────────────────────────────────────────────┘
```

- WhatsApp / Email means "open a prewritten message, then the person presses send, " matching existing reminder sending (product plan section 8, "two sending modes"). **Nothing is sent automatically**; state this in the interface.
- The Ask right rail appears for the first time only after entering Today. Today has at most 3 **one-time tips** (the "context-specific tips" recommended by `onboarding.md`, not a large tutorial): each sits beside the relevant item, disappears on one click, and never reappears.

### 3.4 Desktop and mobile

```
Desktop 1280                                    Mobile 390
┌────────────────────────┬────────────────┐      ┌────────────────────┐
│ ●──●──○──○──○   Exit   │                │      │ ●──●──○ ─ ○  ⋯     │
│                        │  Live preview  │      │                    │
│  Name your club        │  (org chart /  │      │  Name your club    │
│  [ Desert Founders … ] │   chain)       │      │  [ Desert Founders ]│
│                        │                │      │                    │
│  [Back]   [Continue]   │                │      │  Preview: top strip│
└────────────────────────┴────────────────┘      │ ┌────────────────┐ │
  No sidebar, Ask, or View as                     │ │   Continue     │ │ ← Bottom-fixed, within thumb reach
                                                  │ └────────────────┘ │
                                                  └────────────────────┘
```

---

## 4. Flow B: member receives an invitation link

**The only task:** within 2 minutes, members (mostly on phones, arriving from WhatsApp) confirm their identity, understand their responsibilities, and see their first task.
**What should stay with them:** the link's first screen says "the president invited you to this role, with these responsibilities," rather than presenting a form.

### 4.1 Screens

```
Invitation → You → Reminders → Busy weeks* → About you* → Done
                                 (*skippable)
```

| Screen | Action | Compared with current flow | Notes |
| --- | --- | --- | --- |
| **0 Invitation** | Club name as large heading; "Alex invited you to be **Treasurer**"; role card (reports to, three lines of responsibilities); three benefits: one task at a time, reminders where you choose, no public calling-out (product principle C4); one trust sentence explaining collected and uncollected data. "Continue" button. | New (move current role card to front and enlarge it) | Move research "same-browser demo" explanation into **one small Demo bar** (4.2), rather than dominating first screen. |
| **1 You** | Name and email **prefilled by president**, requiring only confirmation ("Not you?" changes person). | Former group 1 | `entering-data.md`: "Prefill fields with reasonable default values". |
| **2 Reminders** | Channel: three option rows **WhatsApp / SMS / Email** (phone appears only for first two, explaining purpose: "So Alex can open a prewritten WhatsApp message to you. Nothing is sent automatically."); time: segmented **Morning / Evening**. Below, **a realistic sample reminder bubble** updates immediately with choices. State quiet hours 10 pm–8 am as a default, not a question. | Former groups 2 and 3 | Bubble shows results as users act. No more ASU ID (4.3). |
| **3 Busy weeks** *skippable* | Semester week strip: small week squares, with ASU finals and breaks premarked ("get from the system"); select busy weeks. "Skip — nothing busy yet". Outcome: "Platypus will plan around these weeks." | Former group 4 (date inputs + add + delete buttons) | Dates still computed by rule engine and academic calendar. |
| **4 About you** *skippable* | Three questions on one screen: career goals, interests, expectations for this role; each has 3 suggestion chips and free typing. Purpose: "Helps match you with tasks you'll care about." | Former group 5 | Keep data required by product plan G4, but make it **skippable** (Section 9 Q5). |
| **5 Done** | Their name **joins the org chart** with one gentle motion; first task below: show assigned task card, otherwise "You'll see tasks here when Alex assigns one", with Tasks preview. **Open my tasks** button. | Former "You're ready" | President's invitation list simultaneously changes to ● Joined. |

**Removed from flow B:** personal buffer (default 1 day; advanced option remains in Settings → My preferences), weekly availability (ask when first using Team meeting finder, alongside the feature), ASU ID (4.3).

### 4.2 Demo strip (honest boundaries)

In Phase 3, participants "play" a fictional officer, so the "choose who you are" dropdown must remain, but should not dominate the first screen:

```
┌──────────────────────────────────────────────┐
│ DEMO  Previewing as Maya Chen · Treasurer  Change │   ← Narrow amber strip at the top, matching the site-wide Demo badge
└──────────────────────────────────────────────┘
```

The strip says "Fictional demo. Choosing a name does not verify an identity." (retain the existing research-protection wording). **When v1.5 has real accounts, remove this entire strip and its dropdown**, without changing subsequent screens.

### 4.3 ASU ID and phone number

Ask for a phone number only when WhatsApp / SMS is selected. **Do not ask for ASU ID** in the new flow (it is optional in existing data; if a feature later needs it, ask there and explain why). This proposal changes privacy behavior; see section 9 Q2.

### 4.4 v1.5 integration points (reserve space; do not implement now)

Flow B's "You" screen is the future "identity" screen: once v1.5 integrates Supabase email one-time links, it becomes "Check your email." `managing-accounts.md` recommends "delay sign-in as long as possible and prefer passkeys"; our plan already calls for "experience value before signing in, " so placing identity after Invitation (value) fits. **Do not implement this today or pretend it is already implemented.**

---

## 5. Shared interaction feel for both flows (from Emil's apple-design Skill)

All motion follows `AGENTS.md` 7.1; new styles go in small dedicated files `src/styles/ob-NN-*.css`, referencing tokens only.

| Interaction feel | Implementation | Rule source |
| --- | --- | --- |
| **Immediate response on press** | Reuse DX-03: shrink slightly on press, without waiting for release. Option rows highlight on press. | Emil §1 Response |
| **Screen changes** | Forward content fades in from 24px to the right; backward from the left; **transform + opacity only**; `--dur-base` + `--ease-out`; Back/Continue remain clickable throughout animation, with no queue or UI lock. Reduced motion uses fade only. | Emil §3 interruptibility, §7 spatial consistency (same path in and out); Apple `motion.md`: "Let people cancel motion." |
| **Progress-chain growth** | Grow the line with `scaleX`; dots pop with `--spring-pop`; forward only. | Already in DX-25 |
| **Value moment** | Draw the first-event chain **once**: points appear sequentially with very short gaps, at most 8, finishing within about 0.5 seconds; **interruptible**; **show the entire chain immediately under reduced motion**. This is the flow's only performance. | Emil §8 hint in direction; Apple "brevity and precision" |
| **Where not to animate** | Adding/removing a role row, changing a number, selecting an option: these happen many times per minute, so do not animate them (rule 7.1 item 5). | `motion.md`: "avoid adding motion to UI interactions that occur frequently" |
| **Materials** | Onboarding shell top bar uses DX-23 translucency; mobile bottom primary-button bar is a functional layer floating above content, so blur that layer only, not content; reduced transparency falls back to solid. | Emil §12; `liquid-glass.md`: use only on floating functional layers |
| **Typography** | Screen headings use existing `--fs-xl` (mobile)/`--fs-2xl` (desktop) + DX-06 letter spacing; body ≥14px (rule 7.4); tabular numerals. **No new fonts.** | Emil §15; `typography.md` |
| **Colors** | **No new tokens.** Reuse existing status and accent colors. Calculate contrast before adding any color (text ≥4.5:1). Check dark mode too. | `docs/DESIGN_TOKENS.md` section 7 |
| **Touch** | Option rows and buttons ≥44px (reuse DX-04); primary button at the bottom, with Back to its left or above. | Apple `accessibility.md`; DX-04 |

---

## 6. Copy (the interface is entirely English; direction and examples follow)

Principles: every button is a verb; one active-voice sentence beside each question explains its purpose; errors say what users can do; avoid repeating "fictional" (once in the Demo bar and once on the screen asking for name/phone); keep the app's existing sentence case rather than switching to Title Case (Familiarity: consistency with the whole site matters more than consistency with iOS).

| Location | Current | Proposed |
| --- | --- | --- |
| Invalid Join link | "Check your setup invitation. This local demo invitation has expired or belongs to a different browser." | "This invitation link isn't working. Ask Alex to send a new one." + a separate demo-user line: "Demo tip: open the link in the browser where setup was done." |
| AI constitution reading fails | "AI could not read it (HTTP 404), so this was read in your browser. Check each line." | "We couldn't use AI just now, so we read it here in your browser instead. Check each line." (Remove status code; retain reason in Behind the scenes.) |
| Phone | "Demo phone (optional)" | "Phone — so Alex can open a prewritten WhatsApp message to you. Nothing is sent automatically." |
| Destructive confirmation | Checkbox "I reviewed this event and want to start this demo workspace." | Buttons "Start workspace" / "Keep current demo", preceded by one sentence stating what will be replaced. |
| Skip | (None) | "Skip for now" + gray text below: "You can add this later in Settings." |

---

## 7. Out of scope (boundaries)

- **No real accounts, passwords, or cross-device verification.** All deferred to v1.5.
- **No server-storage changes:** the new flow calls no `/api/org/*` or `/api/workspace*` (`ORG_SETUP_ENABLED` remains unset); retain the existing guard-test pattern. AI uses only existing `/api/setup/constitution` and `/api/command`; **no new AI endpoints**.
- **No real data or secrets**; every new-interface example is fictional.
- **Only the rule engine calculates dates**: every date at the reveal moment comes from `schedule.ts`; AI supplies no dates.
- **No data-structure changes** (`SCHEMA_VERSION` unchanged): the flow still writes through existing `completeSetup` / `saveProfile`. The `M4_ONBOARDING_PLAN` data foundation (`Role.departmentId`, `syncHolders`, etc.) is separate and excluded here (section 9 Q6).
- **Do not implement** an organization-chart connector editor, DP3 server storage, or a third design system (M4 already decided against importing it).
- **Do not change brand tokens.**
- **No new automatic reporting or telemetry.** Existing local interaction records (`platypus.v1.log`, only in the participant's browser, exported through Settings → Export my data) already log executed actions (e.g. `saveProfile`, including previous values). Recording extra details such as "step reached/skipped, Start or Explore" is a research-design decision (section 9 Q8), off by default. Performance budgets remain measured by scripts.

---

## 8. Execution plan

### 8.1 Prerequisites and sequence

1. **The new flow depends on preview 10's motion tokens and drag/spring code** (`dx-00-tokens.css`, `motion.ts`). These currently exist only on `claude/determined-johnson-yrdxwf` (PR #10), **not `main`**. Thus **your decision on preview 10 (merge or not) must come first**, establishing a stable foundation. If merging preview 10, choose **Create a merge commit** as previously discussed.
2. Create a new branch from `main` (including merged v1.6), named under `AGENTS.md` Section 8: "`design/onboarding-flows`" (lowercase, no AI names). Open its own Draft PR for a preview when done; **do not touch `main`; merge only after you say "approved to merge."**
3. **Two entry points, one switch:** new flows at `/#/welcome` (president) and `/#/invite` (member). Until complete and accepted, the first-visit welcome (Section 2b) points to **old** `/#/setup` and `/#/join` (first add focused shell, removing sidebar and Ask). President flow A and member flow B are **each a complete unit: switch each entry only when that entire flow is complete and accepted by you**; unaccepted flow stays old. Preserve old URLs and their tests unchanged.
4. **Freeze date is a hard constraint.** `M4_ONBOARDING_PLAN` says Phase 3 starts 11/9, freeze starts 11/6 (written October 29; I **have not rechecked**). Today is 11/1; **I cannot guarantee** the full 8–9 chats will finish in time. Two tiers: **minimum = OB-00 (including entry) + shell around old screens**, which must precede freeze; **whether president flow A (OB-01–04) finishes depends on actual Phase 3 dates and your acceptance speed for each package; I make no promise**. Member flow B follows. **Whatever combination is active at freeze becomes the study instrument**; after freeze, merge no further changes into `main`, and record that version in PROGRESS.

### 8.2 Work packages (following v1.6: independent packages, `--no-ff` merges, individually reversible)

| Package | Contents | Size |
| --- | --- | --- |
| **OB-00 Foundation + first-entry gateway** | New onboarding shell (focused layout without sidebar or Ask, top bar, Skip/Back/Save & exit); step state machine (pure functions: forward, back, skip, resume, with unit tests); progress-chain indicator; Demo strip; copy table; **welcome page and flag (section 2b, off by default)**; empty `/#/welcome`, `/#/invite` routes. Gateway initially points to **old** setup/join. **With the flag off, the whole site remains exactly as today, with zero changes to old-route behavior.** | 1–1.5 sessions |
| **OB-01 A·Welcome + Name + Constitution** | Screens 0–2; reuse `ConstitutionStep` reading logic and `startReading` (UI change only). | 1 session |
| **OB-02 A·Goals + Team** | Screens 3–4; two-field role rows + organization chart (reuse existing `OrgChart`) + collapsed duties; verify the relationship between `validateProfile` and `fillEmails`. | 1 session |
| **OB-03 A·First event** | Screen 5: sentence → progress-chain drawing → segmented buffer control; reuse `parseCommand`/`prepare` logic and `completeSetup`. **Hardest package** (visuals and motion for the value moment). | 1.5 sessions |
| **OB-04 A·Confirm + Invite** | Screen 6, invitation moment, Joined status, Today's 3 one-time tips. | 1 session |
| **OB-05 B·Invitation + You + Reminders** | Member screens 0–2; sample-reminder bubble; Demo strip. | 1 session |
| **OB-06 B·Busy weeks + About you + Done** | Week strip, suggested tags, one "join the organization chart" action, first-action card. | 1 session |
| **OB-07 Closeout** | Full desktop+mobile+light/dark+reduced-motion+reduced-transparency checks; documentation (`AGENTS.md`, `PROGRESS.md`, `DESIGN_TOKENS.md`); rollback rehearsal; screenshot comparisons; your acceptance revisions. | 1 session |

About **8–9 sessions** total, plus your acceptance feedback for each package. After OB-00, OB-01–OB-04 (president) and OB-05–OB-06 (member) do not modify the same files, so **they can run in parallel in separate worktrees, as in v1.6**.

### 8.3 Acceptance gates for every package (write into its instructions first)

1. `npm run check` fully passes (lint + build + unit + browser tests + word budgets).
2. **New browser tests:** fastest and complete paths on desktop and phone; Back/Skip/resume; zero `/api/org` or `/api/workspace` requests; `axe` accessibility; dark mode; no movement animations under reduced motion.
3. **Negative verification that intentional violations fail:** provide a failing sample for every new guard (following the v1.6 rule).
4. **New-screen word limits:** ≤ 40 visible English words per screen (≤ 60 for the reveal and invitation screens); remove copy first if over budget. (Existing `npm run words` covers only main pages; add a separate budget for the new flow.)
5. **Budgets (design targets, not measured results):** president's fastest path ≤ 12 clicks/inputs; member's ≤ 8. Count with scripts, not human participants.
6. Each package includes **rollback instructions** and a separate merge commit; **delete none** of the existing route tests.
7. Record in PROGRESS what changed, what remains unverified (real fingers on devices, Safari, etc.), and acceptance steps. **Never claim an unverified item was verified.**

### 8.4 How you will review acceptance

As with v1.6: after each package or stage, I will give you the preview URL and a few sentences explaining where to click; you only need to say "approved" or "change this."

---

## 9. Eight decisions for you (each with my recommendation)

| # | Question | My recommendation |
| --- | --- | --- |
| **Q1 Timing and scope** ✅ **Answered (11-01)** | Use **11/6 as a reference** and aim to finish before 11/6; exact Phase 3 and freeze dates are not yet set. | The entry point, logging, and shell must be ready; prioritize the new president flow A; see [`onboarding-redesign/WORK_PACKAGES.md`](onboarding-redesign/WORK_PACKAGES.md) for splitting and parallel work. |
| **Q2 President no longer enters phone numbers or ASU IDs** | President enters only "role + name" (email is supplied automatically); officers enter their own phone numbers on joining (ask only for WhatsApp/SMS). **The new flow does not ask for ASU IDs.** | **Approved.** This resolves A3 (asking twice for the same information) and privacy concerns; Product Plan Section 7 already intends this. I checked existing validation: both fields can already be blank, so no change is needed. |
| **Q3 Calendar/Drive links and workflow customization are no longer required steps** | Remove Calendar links, Drive folders, and "customize standard workflow" from the required path: select invitation channels when inviting; put the rest in Today's small "Finish setup" checklist and Settings. **This differs from Product Plan Section 7, item 6 (configure connectors during initial setup), and the 10-29 decision (let presidents edit within the diagram during the workflow step).** | **Approved**, because these connections are currently demo configuration without real integrations; retain a "Customize workflow" entry to the same editor, preserving the feature. |
| **Q4 Put invitations last and show Invited / Joined lists** | Invite after "creation succeeded." | **Approved.** Invitations appear when they can be used, instead of being hidden before they are usable. |
| **Q5 Member questions can be skipped** | Combine career goals/interests/expectations into one skippable screen; move personal buffers and weekly availability from onboarding to Settings and Team (ask when needed). | **Approved.** Apple's principle is to defer unnecessary setup; these data can still be collected later with context. |
| **Q6 Relationship and sequencing with M4** | This plan covers only **interface and flow**, with no schema changes; the data foundation (M4a) and "read constitution" (M4c) in `M4_ONBOARDING_PLAN` are separate. Combine them into one roadmap? Decide preview 10 first? | **Keep separate.** Decide preview 10 first → then implement this plan (starting with OB-00); do M4a separately when needed. Neither waits for the other. |
| **Q7 Who do participants play?** ✅ **Answered (11-01)** | **All participants are presidents**; everyone starts with president flow A by default. | Member flow B becomes only a "preview" after A (viewing the student organization just created); **remove the "I am a member" entry point**. |
| **Q8 Log the onboarding process?** ✅ **Answered (11-01)** | **Yes, in the browser.** | Use a separate local key, record behavior only rather than content, and let participants export it through Export my data; see WORK_PACKAGES Section 4. Decide whether to notify participants on the welcome page by checking the IRB materials. |

**You can answer in any of these ways:** "Follow all recommendations"; "Do not approve Q3, approve the rest"; or "Build OB-00 and the gateway first so I can see them." Please provide the actual dates and participant roles for Q1 and Q7 directly.

---

## 10. What this plan has not verified

- **Not tested with a real phone or real fingers**, nor viewed in Safari; screenshots are only Chromium desktop at 1280px and mobile at 390px.
- The current AI constitution-reading behavior is what I observed running only the frontend locally (server functions were not running); I did not test the live behavior or consume any AI quota.
- New contrast, font-size, and target-size numbers **have not been calculated** — measure them with existing `axe` and the token contrast table once each package has a real interface; the plan adds no new colors, so new values are not expected to be needed.
- "President ≤5 minutes, member ≤2 minutes" are product-plan **targets**; I have not measured the current flow (no human testing). The click budget in 8.3 is a design target.
- Dates (11/9 for Phase 3, 11/6 freeze) come from the 10/29 M4 plan and have not been rechecked.
- The second Skill I read was `skills/apple-design/SKILL.md` in the `emilkowalski/skills` repository (a web version of WWDC motion notes). Its motion numbers (damping 1.0, response 0.3–0.4, etc.) were references only; actual values still follow `--dur-*` and `--spring-*` in `docs/DESIGN_TOKENS.md`.

---

**My first step after approval:** implement only OB-00: focused shell, step state machine, **first-visit welcome (off by default)**, empty routes, and switch. Give you a preview URL showing welcome; with the switch off, the whole site and existing interface remain exactly as today.
