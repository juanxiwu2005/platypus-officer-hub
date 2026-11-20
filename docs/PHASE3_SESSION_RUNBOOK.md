# Phase 3 test-day procedure (for Juanxi)

Follow this for every session. Basis: IRB protocol HRP-503A Part 3 (section 6 steps 1–6, section 11.4). Field definitions: `PHASE3_DATA_DICTIONARY.md`.

## Before testing (once per day)

1. Open https://platypus-officer-hub.netlify.app/api/health and confirm `"provider": "ASU AIR"` and `"configured": true`. If not, do not begin.
2. Walk through the study link yourself in a private window and confirm it goes directly to "Name your club."

## During testing

1. **First confirm eligibility, obtain signed consent, and assign a study ID (E01, E02…).** Do these outside the website.
2. **Have the participant open a private window** (Chrome: Incognito; Safari: Private). For remote tests, ask them to share only that browser window.
3. **Send the study link:** `https://platypus-officer-hub.netlify.app/#/start`
   - Opens setup directly, bypassing Welcome.
   - Do not reopen the link during testing (it starts a new record and blank setup); if reopened, data is retained and the export has two sessions.
   - Accidental refresh is fine; entered content remains.
4. **Task (f): setup.** Have them enter a fictional club using the organization card. On First event, they may plan an event or choose "Skip for now"; this is an observation point, so do not steer their choice. Reminders is also an observation point; do not steer their choice. No real email is sent.
5. After Start workspace, the club contains their planned event (if any), three sample events (Networking Night, Spring Speaker Night, Founder Dinner), and sample tasks. Continue with task cards (a)–(e).
   - **Task numbering (Juanxi, 2026-11-08):** Task 1 = (f) setup, recorded automatically with no button press; tasks 2–6 = (a)–(e).
   - **Ask the participant to press a number after reading each task card:** top-bar Demo badge → corresponding number (2–6) in "Study task"; press "Done" after the last task. Pressing the next number automatically ends the previous task. The top badge shows the current task number for checking.
   - Forgetting is fine: scoring-sheet times are primary; these buttons only improve boundaries in the export.
6. **Remind the participant:** When composing reminders/invitations, they may open Gmail / WhatsApp to inspect drafts, **but must not actually send them**.
7. Finally, guide them to create an event with Ask on the right (e.g. click "Plan a new event").

## At the end

1. Participant clicks **Settings → My preferences → Export my data**; browser downloads `platypus-export-….json`.
   - In-person: the file is already on your computer.
   - Remote: ask them to send it to your ASU email; they may delete their copy afterward.
   - They may decline to provide the file; use only scoring sheet and recording for that session.
2. **Close the private window.** This clears all website data in that browser (protocol step 6 requires clearing it in front of the participant).
3. Rename the file using only the study ID (e.g. `E01.json`), store in ASU storage, then delete the emailed copy.
4. To convert to a spreadsheet: `node scripts/export-to-csv.mjs E01.json` generates `E01.csv`, ready for Excel.

## If something goes wrong

- **AI unresponsive or errors:** Website automatically uses built-in answers, labeled "AI unavailable." Note it on the scoring sheet and continue to the next item.
- **Participant uses a phone:** Supported, but prefer a computer.
- **Test Onboarding button in Demo menu:** For your own testing; it creates no records. Do not let participants use it.
