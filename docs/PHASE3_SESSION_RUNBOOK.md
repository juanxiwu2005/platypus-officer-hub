# Phase 3 Test Day Step (to Juanxi)

Every game goes this way. Based on: IRB Agreement HRP-503A Part 3 (Sections 6 Step 1–6, 11.4). Field description can be found in `PHASE3_DATA_DICTIONARY.md`.

## Prior to testing (one per day)

1. Open https://platypus-officer-hub.netlify.app/api/health, confirm `"provider": "ASU AIR"` and `"configured": true`. If not, don't start.
2. Check the link with your own markless window to confirm that you can enter " Name your blue " .

## Testing

1. **confirms eligibility, signs consent, gives study ID (E01, E02...).**, these are all done outside the site.
2. **allows participants to open a traceless window** (Chrome:Incognito); Safari：Private）。When an online test is conducted, he is asked to share only this browser window.
3. **Sending test link:** `https://platypus-officer-hub.netlify.app/#/start`
   - Opens it straight into the setup, without going through the welcome page.
   - Test not to reopen the link (a new record will be started, setup will start again from a blank); If it is open, the data will not be lost. There will be two sessions in the export file.
   - It doesn't matter if it's a little refreshing. The fillout will be kept.
4. **task (f): setup.** lets him fill out a field card. First event can be planned for a game or press "Skip for now" skip; This is an observation point. Don't tell him which to choose. The screen of Reminders is an observation point. Don't tell him which to choose; The website doesn't really e-mail.
   - **Process `ob-5` (FB-2 only, not applicable on branch, official web line):** screens in turn are **Name** (standard event + mission)  →  **Team** (officer list); A folded "Fill rolls from your condition" on the top, which can be used for example as a condition, upload or paste; There's **First event**, **Reminders**, **Confirm**, **Invite**. There is no separate Constitution screen and Goals screen: Constitution is on Team screen and targets are set later in Settings. If a target is written on the tissue card, tell participants not to fill in the guide. Name and Team have a row "Why:" in the title, and welcome pages are three lines: Why/ How/ What.
   - The second half of the **president process (FB-3, branch only and not online);** First event and Reminders also have a line "Why:". First event 's buffer has been changed to three options: Tight . 1 day / Standard 3 days (Recommended)/ Safe 5 days, with steps and two dates for the ASU cut-off date listed below. There is an example reminder card on the roof of Reminders, with three step charts, analogies and the phrase "what happens in Platybus" under each option. Confirm has only one main button **Create my club** (former Start workspace); The text link "Cancel and keep the current library" is only available when it has been built. **Open my workspace** (former Go to Today), **"See what your offices will see"**: Participants go in without a member preview. If you want to read the board's preview yourself, use "Test Onboarding Page Invite" on the Demo menu.
5. Start workspace (Create my Club on `ob-5` branch), his planned activities (if any) will be added to the list of examples (Networking Night, Spring Speaker Night, Funder Dinner). The task card (a)-(e) is then made.
   - **Task No. (Juanxi 2026-11-08 determined):** Mission 1 = (f) setup, without pressing, the system itself; Task 2–6 = (a)-(e).
   - **Participants are asked to press a task card every time they read it:**Demo subscript for the top of the pointbar  →  "Study task" by corresponding number ( 2–6）； Finish the last job and press "Done". When the next number is pressed, the previous task will automatically be concluded. The topbar sub-marks show that the current task is the first one, which can be checked by passing.
   - He forgets that it is okay to press: the time on the score sheet is the main basis, and these buttons only allow for a more accurate demarcation of the export file.
   - **homepage and navigation (FB-8, only branch, not applicable to the official website line):** first page is no longer today but **Reminders** (Calling Centre), in five columns: **Needs your OK**, **This week**, **Sent**, **Repries**, **No reply yet**. The original front page "Needs a Nudge", Events Progress, Semester Goals, Superstar of the Week are not on the front page. Left-hand navigation is only **Reminders**, **Plan** (Events and Tasks with "Events | Tasks" switch), **Handoff**, **Rules**; Team and Partners are collected in **More** that can be expanded. **Change "Today" on the mission card to "Reminders", "Needs a Nudge" to "Needs your OK", "Tasks" to "Plan →  Tasks".**
6. **Reminds participants:** writes reminders, asks Gmail/ WhatsApp to look at the draft, **, but don't send it to**.
   - **FB-8 (on branch only):** followed the answer to the Reminders screen in setup (also on Settings  →  Club  →  Tasks and events). "I review, then I send" or "skip": Open the draft at your OK point **Review & open Draw** > . "I review, Platypus sends": **Review** → **Approve · Platypus sends (demo)**, or the top of the column **Approve all (N)**(a) All at one time;  Do not open any drafts. "Send automatically": Needs your OK is empty, and the daily reminder is displayed directly in Sent under the symbol "Would be sent-demo". **no way really sends it.**skip sees "Choose how participants go out" on top of your OK screens; Don't point him at nothing.
7. Finally, he was directed to create a new activity (e.g. "Plan a new event") with the right Ask.

## At the end

1. **Settings — My preferences — Export my data**, and the browser downloads a `platypus-export-….json` file.
   - In person test: The file is directly on your computer.
   - Online test: Ask him to send files to your ASU mailbox. He can delete his share when he's done.
   - He did not wish to submit documents, but only scoring tables and videos were used.
2. **Close the no-smug window.**The site's data in this browser is all cleared out. 6In a post titled "The Right to Life" (Advanced in English and French) , the blogger says:
3. You change the name of the file to a study ID (e. g. `E01.json`), save it in ASU storage, and delete that part of the mail.
4. You want to convert the file into a table: `node scripts/export-to-csv.mjs E01.json`, which generates `E01.csv` and opens it directly with Excel.

## What if...

- **AI did not react or make a mistake:** will automatically use built-in answers, which next to "AI unavailable". Take note of the score sheet and proceed to the next item.
- **Participants use mobile phones:** can also be used, but priority is given to computers.
- The Test Onboarding button in the **Demo menu:** is for your own tests, not records, not participants.
