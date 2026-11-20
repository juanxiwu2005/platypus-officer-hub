# Phase 3 Test-Day Steps (for Juanxi)

Follow this for every session. Basis: IRB protocol HRP-503A Part 3 (section 6 steps 1–6, section 11.4). Field definitions are in `PHASE3_DATA_DICTIONARY.md`.

## Before testing (once each day)

1. Open https://platypus-officer-hub.netlify.app/api/health and confirm `"provider": "ASU AIR"` and `"configured": true`. Otherwise, do not start yet.
2. Walk through the test link yourself in a private window and confirm it opens directly to "Name your club".

## During testing

1. **First confirm eligibility, obtain signed consent, and assign a study ID (E01, E02…).** Do all of this outside the website.
2. **Ask the participant to open a private window** (Chrome: Incognito; Safari: Private). For remote sessions, ask them to share only this browser window.
3. **Send the test link:** `https://platypus-officer-hub.netlify.app/#/start`
   - It opens setup directly, bypassing Welcome.
   - Do not reopen it during the test (this starts a new recording and resets setup to blank). If reopened, data is retained and the export contains two sessions.
   - Accidental refresh is fine; entered content remains.
4. **Task (f): setup.** Ask the participant to enter a fictional club using the organization card. On First event, they may plan an event or press "Skip for now"; this is an observation point, so do not suggest a choice. Reminders is also an observation point; do not suggest a choice. The site sends no actual email.
   - **Flow `ob-5` (FB-2, branch only; not applicable until deployed to production):** screens are **Name** (club name + one-line Mission, both required) → **Team** (officer list, with collapsed "Fill roles from your constitution (optional)" at the top, supporting a sample constitution, upload, or paste; "Add advisor" button) → **First event** → **Reminders** → **Confirm** → **Invite**. Separate Constitution and Goals screens are gone: the constitution is within Team; goals are set later in Settings. If the organization card lists goals, tell the participant they do not need to enter them during onboarding. Name and Team each have a "Why:" line below the heading; Welcome has Why / How / What lines.
   - **Second half of the president flow (FB-3, branch only, unreleased; not applicable until deployed to production):** First event and Reminders each also have "Why:". First event offers three buffers: Tight · 1 day / Standard · 3 days (Recommended) / Safe · 5 days, followed by steps with ASU deadlines and two dates. Reminders has an example reminder card, with a three-step diagram, analogy, and "what happens in Platypus" sentence under each option. Confirm has one primary button, **Create my club** (formerly Start workspace); only existing clubs get the text link "Cancel and keep the current club" (formerly Keep current demo). Invite has one primary button, **Open my workspace** (formerly Go to Today), and **no longer has "See what your officers will see"**: completing Invite goes to the home page, bypassing member preview. To inspect that preview yourself, use Demo → "Test Onboarding Page Invite" (no logging).
5. After Start workspace (Create my club on the `ob-5` branch), the club contains the event they planned, if any, plus three sample events (Networking Night, Spring Speaker Night, Founder Dinner) and sample tasks. Continue with task cards (a)–(e).
   - **Task numbering (set by Juanxi on 2026-11-08):** task 1 = (f) setup, recorded automatically with no button press; tasks 2–6 = (a)–(e).
   - **Ask participants to press a number after reading each task card:** top-bar Demo badge → corresponding number (2–6) in "Study task"; press "Done" after the final task. Pressing the next number automatically ends the previous task. The top badge shows the current task number for cross-checking.
   - Forgetting is fine: scoring-sheet timestamps are primary; these buttons only improve boundaries in the export.
   - **Home and navigation (FB-8, branch only; not applicable until production deployment):** the home page is now **Reminders**, with five sections: **Needs your OK**, **This week**, **Sent**, **Replies**, **No reply yet**. "Needs a nudge", Events progress, Semester goals, and Superstar of the week are removed from the home page. Left navigation contains **Reminders**, **Plan** (Events and Tasks, toggled by "Events | Tasks" in the heading), **Handoff**, **Rules**; Team and Partners are under expandable **More**. **Before launch, change task-card references from "Today" to "Reminders", "Needs a nudge" to "Needs your OK", and "Tasks" to "Plan → Tasks".**
6. **Remind participants:** they may open Gmail / WhatsApp drafts for reminders and invitations, **but must not actually send them**.
   - **FB-8 (branch only):** reminder behavior follows the setup Reminders answer (also editable in Settings → Club → Tasks and events). "I review, then I send" or skipped: Needs your OK → **Review & open draft** → open draft → return → "I sent this reminder". "I review, Platypus sends": **Review** → **Approve · Platypus sends (demo)**, or section-level **Approve all (N)** to approve all at once; no draft opens. "Send automatically": Needs your OK is empty; due reminders appear directly in Sent as "Would be sent · demo". **None actually sends anything.** Participants who skipped Reminders see "Choose how reminders go out" above Needs your OK; do not suggest whether to click it.
7. Finally, guide them to create an event through Ask on the right (for example, "Plan a new event").

## At the end

1. Participant selects **Settings → My preferences → Export my data**; the browser downloads `platypus-export-….json`.
   - In person: the file is on your computer.
   - Remote: ask them to send it to your ASU email. They may delete their copy afterward.
   - They may decline to provide the file; use only the scoring sheet and recording for that session.
2. **Close the private window.** This clears all website data from that browser (protocol step 6 requires doing this in the participant's presence).
3. Rename the file using only the study ID (for example, `E01.json`), store it in ASU storage, then delete the email copy.
4. To convert it to a table, run `node scripts/export-to-csv.mjs E01.json`; it generates `E01.csv`, directly readable in Excel.

## If something goes wrong

- **AI does not respond or errors:** the site automatically uses built-in responses, labeled "AI unavailable". Note this on the scoring sheet and continue.
- **Participant uses a phone:** supported, but prefer a computer.
- **Demo's Test Onboarding buttons:** for your own testing; they do not log. Do not have participants use them.
