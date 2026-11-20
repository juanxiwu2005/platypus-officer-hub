# FB-6 Calibration Report: Date Engine updated according to your schedule

> Write to Juanxi. The next two tables are not handwritten: they're measured by the test `src/test/calibration.test.ts` using the engine, compared to your file `event-workflow-calibrated-2027-04-16.tsv` line-by-line. The test turns red when the date does not match and is not included in the list of permitted differences.

## 1.

For the same campaign (2027-04-16 Fridays, 60 people, external catering, USG funds, default settings), 32 steps start and end of **18 and your files are exactly the same as**; There are three reasons for the difference between 14 and:

1. The date in the **document falls on weekends** (5 moves): the cut-off day is moved to the previous working day (post-event move to the last working day) and the start day is moved to the preceding working day for the person in charge. Example: Budget file 2/20 (Sunday), engine to 2/19 (Friday).
2. **Closing Steps do not start on the day of the event** (6 Step: Thank You Note, Feedback, Post Marking, Photo Backup, Invivoice, Attendance Submit): Document writing 4/16 (Activities Day) starts and engine 4/19 (First working day after the event, Monday). It's an implementation program. 7.2Article 4Article X.  **requires your confirmation of** (see article 1, section 6).
3. **Last Three Steps** (Paid Reimbursed, Finance Report, Documentation) did not copy the document “post-event 129/132/129 days”. Those three numbers are the output of old engines (activities for 4 months, which were pushed through the end and summer vacations and dropped to 8). It is now 5 working days, 7 working days and 14 days after the event. **needs you to confirm**.

Also: each step of the workload (Effort days) and the three ASUs of legal documents are consistent with the document; The reliance between the steps is also consistent with the document, except for one: Budget et al. Event Plan (the note to the document reads “Needs Event Plan as preequisite”).

## 2.

- One more "time window" per standard step: **start date = day of activity - number of days of activity, end of day = day of activity - end of date**. The day of commencement is the day of the reminder.
- **cut-off date** = your cut-off days, and the "ASU cut-down target buffer" earlier. The preceding working day (one working day after the event) is used for landing on weekends or holidays.
- **Start Day** falls on days when the person in charge is unable to work (weeks of weekends, holidays, end weeks, semesters, busy weeks of his own) and moves forward to the day he can work. The individual buffer is only the part that exceeds the default 1 day: the result under the default setting is the same as your file; Someone set the personal buffer to 3 days, and he starts early on 2 workdays.
- **“Depends on” indicates only the sequence of completion**: the previous step was not completed and the deadline was later than that before moving back and marked “Moved later”. The same day may be closed. The window can overlap (e. g. five steps are 2/10  →  2/15).
- **Closing Steps**: Head Count can start and close on the day of the event; The remaining closing steps are not earlier than the start of the first post-event work.
- **Someone changed the deadline.**: a date fixed by the user;  The start date is earlier than the “old start date” and the “new cut-off date”.
- Steps without a window of time (manual tasks, conditionality steps, previously established activities): exactly the same as before.

In order not to have false yellow warnings on the new activity, three more things were done by the engine (not written in the programme, found when realized, see 6 section 3):

- The latter step is the ASU cut-off date, and when the buffer has been completed earlier than the previous one (for example: 12Month 3Day event, R09. Request for purchase. 11/12The advance, Budget Approval. 11/12Finish before, not before. 11/13）。
- Chronology of the template itself (examples: weekend events, after event) 7"Attendance" compared to "after Action." 5Paid Reimbursed is included directly in the recommended date and does not mark yellow;  Only real delays (some late dates, steps not completed on time) will be marked yellow.
- When the condition steps are mixed between two calibration steps (e. g. Open RSVPs between Promotion Items and Content Distribution), it only requires completion, and does not push a later step beyond the activity.

The test tested every day from 2026-11 to 2028-04 as an event day (standard activity + activities that open all conditions): no calibration steps were postponed, ASU cut-off date was missed or after the event.

## 3. Gradual comparison (engine generation)

<!-- comparison:start -->
| Step | File start | Engine start | File due | Engine due | ASU deadline (engine) | Reason for difference |
| --- | --- | --- | --- | --- | --- | --- |
| Event Plan | 2027-02-10 (Wed) | 2027-02-10 (Wed) | 2027-02-15 (Mon) | 2027-02-15 (Mon) | — | Matches |
| Back-up Plan | 2027-02-10 (Wed) | 2027-02-10 (Wed) | 2027-02-15 (Mon) | 2027-02-15 (Mon) | — | Matches |
| Candidate Venue | 2027-02-10 (Wed) | 2027-02-10 (Wed) | 2027-02-15 (Mon) | 2027-02-15 (Mon) | — | Matches |
| Event Registry (SDC & Special Event) | 2027-02-10 (Wed) | 2027-02-10 (Wed) | 2027-02-15 (Mon) | 2027-02-15 (Mon) | 2027-04-02 (Fri) | Matches |
| Book Room & Layout | 2027-02-10 (Wed) | 2027-02-10 (Wed) | 2027-02-15 (Mon) | 2027-02-15 (Mon) | — | Matches |
| Moderator Lead Staffing | 2027-02-15 (Mon) | 2027-02-15 (Mon) | 2027-03-22 (Mon) | 2027-03-22 (Mon) | — | Matches |
| Event Materials PPT Decorations | 2027-02-15 (Mon) | 2027-02-15 (Mon) | 2027-04-01 (Thu) | 2027-04-01 (Thu) | — | Matches |
| Full Check Alert Changes | 2027-04-02 (Fri) | 2027-04-02 (Fri) | 2027-04-15 (Thu) | 2027-04-15 (Thu) | — | Matches |
| Check-in Forms Photo Release Liability | 2027-04-11 (Sun) | 2027-04-09 (Fri) | 2027-04-16 (Fri) | 2027-04-16 (Fri) | — | The file date falls on a weekend or holiday: move the deadline to the previous business day (the next business day for post-event work), and the start to the previous officer workday. |
| Budget | 2027-02-15 (Mon) | 2027-02-15 (Mon) | 2027-02-20 (Sat) | 2027-02-19 (Fri) | — | The file date falls on a weekend or holiday: move the deadline to the previous business day (the next business day for post-event work), and the start to the previous officer workday. |
| Food Exception Permit | 2027-02-15 (Mon) | 2027-02-15 (Mon) | 2027-02-20 (Sat) | 2027-02-19 (Fri) | 2027-04-02 (Fri) | The file date falls on a weekend or holiday: move the deadline to the previous business day (the next business day for post-event work), and the start to the previous officer workday. |
| Quote Gather | 2027-02-15 (Mon) | 2027-02-15 (Mon) | 2027-02-25 (Thu) | 2027-02-25 (Thu) | — | Matches |
| Budget Request | 2027-02-15 (Mon) | 2027-02-15 (Mon) | 2027-02-26 (Fri) | 2027-02-26 (Fri) | — | Matches |
| Budget Approval | 2027-03-17 (Wed) | 2027-03-17 (Wed) | 2027-03-29 (Mon) | 2027-03-29 (Mon) | — | Matches |
| Purchase Request | 2027-03-17 (Wed) | 2027-03-17 (Wed) | 2027-03-29 (Mon) | 2027-03-29 (Mon) | 2027-04-02 (Fri) | Matches |
| Purchase Approval | 2027-03-17 (Wed) | 2027-03-17 (Wed) | 2027-04-06 (Tue) | 2027-04-06 (Tue) | — | Matches |
| Order Placed | 2027-03-17 (Wed) | 2027-03-17 (Wed) | 2027-04-06 (Tue) | 2027-04-06 (Tue) | — | Matches |
| Marketing Needs | 2027-02-15 (Mon) | 2027-02-15 (Mon) | 2027-02-17 (Wed) | 2027-02-17 (Wed) | — | Matches |
| Content Creation | 2027-02-17 (Wed) | 2027-02-17 (Wed) | 2027-02-27 (Sat) | 2027-02-26 (Fri) | — | The file date falls on a weekend or holiday: move the deadline to the previous business day (the next business day for post-event work), and the start to the previous officer workday. |
| Promotion Items | 2027-02-27 (Sat) | 2027-02-26 (Fri) | 2027-03-09 (Tue) | 2027-03-09 (Tue) | — | The file date falls on a weekend or holiday: move the deadline to the previous business day (the next business day for post-event work), and the start to the previous officer workday. |
| Content Distribution | 2027-03-30 (Tue) | 2027-03-30 (Tue) | 2027-04-06 (Tue) | 2027-04-06 (Tue) | — | Matches |
| Event Reminder | 2027-04-12 (Mon) | 2027-04-12 (Mon) | 2027-04-13 (Tue) | 2027-04-13 (Tue) | — | Matches |
| Headcount | 2027-04-16 (Fri) | 2027-04-16 (Fri) | 2027-04-16 (Fri) | 2027-04-16 (Fri) | — | Matches |
| Thank You Note | 2027-04-16 (Fri) | 2027-04-19 (Mon) | 2027-04-17 (Sat) | 2027-04-19 (Mon) | — | Closeout starts no earlier than the first business day after the event (plan 7.2, rule 4: Friday 4/16 is followed by Monday 4/19).; The file date falls on a weekend or holiday: move the deadline to the previous business day (the next business day for post-event work), and the start to the previous officer workday. |
| Feedback | 2027-04-16 (Fri) | 2027-04-19 (Mon) | 2027-04-17 (Sat) | 2027-04-19 (Mon) | — | Closeout starts no earlier than the first business day after the event (plan 7.2, rule 4: Friday 4/16 is followed by Monday 4/19).; The file date falls on a weekend or holiday: move the deadline to the previous business day (the next business day for post-event work), and the start to the previous officer workday. |
| Post Marketing | 2027-04-16 (Fri) | 2027-04-19 (Mon) | 2027-04-17 (Sat) | 2027-04-19 (Mon) | — | Closeout starts no earlier than the first business day after the event (plan 7.2, rule 4: Friday 4/16 is followed by Monday 4/19).; The file date falls on a weekend or holiday: move the deadline to the previous business day (the next business day for post-event work), and the start to the previous officer workday. |
| Photo Backup | 2027-04-16 (Fri) | 2027-04-19 (Mon) | 2027-04-23 (Fri) | 2027-04-23 (Fri) | — | Closeout starts no earlier than the first business day after the event (plan 7.2, rule 4: Friday 4/16 is followed by Monday 4/19). |
| Invoice | 2027-04-16 (Fri) | 2027-04-19 (Mon) | 2027-04-23 (Fri) | 2027-04-23 (Fri) | — | Closeout starts no earlier than the first business day after the event (plan 7.2, rule 4: Friday 4/16 is followed by Monday 4/19). |
| Attendance Submit | 2027-04-16 (Fri) | 2027-04-19 (Mon) | 2027-04-23 (Fri) | 2027-04-23 (Fri) | — | Closeout starts no earlier than the first business day after the event (plan 7.2, rule 4: Friday 4/16 is followed by Monday 4/19). |
| Paid Reimbursed | 2027-08-19 (Thu) | 2027-04-19 (Mon) | 2027-08-23 (Mon) | 2027-04-23 (Fri) | — | The final three steps retain the intended offsets of 5 business days, 7 business days, and 14 days after the event, rather than the file's 129/132/129 days caused by the old engine pushing closeout past finals and summer. |
| Finance Record | 2027-08-24 (Tue) | 2027-04-19 (Mon) | 2027-08-26 (Thu) | 2027-04-27 (Tue) | — | The final three steps retain the intended offsets of 5 business days, 7 business days, and 14 days after the event, rather than the file's 129/132/129 days caused by the old engine pushing closeout past finals and summer. |
| Documentation | 2027-08-19 (Thu) | 2027-04-19 (Mon) | 2027-08-23 (Mon) | 2027-04-30 (Fri) | — | The final three steps retain the intended offsets of 5 business days, 7 business days, and 14 days after the event, rather than the file's 129/132/129 days caused by the old engine pushing closeout past finals and summer. |
<!-- comparison:end -->

## 4. Date of condition step (the same event, opening all conditions, engine generation)

You do not have these steps in your documents (speaker, addressr, security, alcohol, drone, RSVP etc.). They **don't have a time window**, and dates are still being rolled out by step. The following table is for your subsequent calibration; Opening these conditions does not change any date of the above 32 step (test check).

<!-- conditional:start -->
| Conditional step | Start | Due | ASU deadline | Deadline source (engine explanation) |
| --- | --- | --- | --- | --- |
| Partner Meeting | 2027-03-10 (Wed) | 2027-03-12 (Fri) | — | Must be done before “Speaker SAP Headshot” starts (Mon, Mar 15) |
| Speaker SAP Headshot | 2027-03-15 (Mon) | 2027-03-18 (Thu) | — | Must be done before “Partner Travel Plan” starts (Fri, Mar 19) |
| Partner Travel Plan | 2027-03-19 (Fri) | 2027-03-24 (Wed) | — | Must be done before “Partner Speaker Review” starts (Thu, Mar 25) |
| Partner Speaker Review | 2027-03-25 (Thu) | 2027-03-29 (Mon) | — | Must be done before “Parking Validation” starts (Tue, Mar 30) |
| Parking Validation | 2027-03-30 (Tue) | 2027-04-01 (Thu) | — | Must be done before “Full Check Alert Changes” starts (Fri, Apr 2) |
| Advisor Involved | 2027-01-28 (Thu) | 2027-02-01 (Mon) | — | Must be done before “Accessibility Check” starts (Tue, Feb 2) |
| Accessibility Check | 2027-02-02 (Tue) | 2027-02-08 (Mon) | — | Must be done before “Security” starts (Tue, Feb 9) |
| Security | 2027-02-09 (Tue) | 2027-02-16 (Tue) | — | Must be done before “EAMS Plan” starts (Wed, Feb 17) |
| EAMS Plan | 2027-02-17 (Wed) | 2027-02-23 (Tue) | — | Must be done before “Permit Insurance” starts (Wed, Feb 24) |
| Permit Insurance | 2027-02-24 (Wed) | 2027-03-02 (Tue) | — | Must be done before “Alcohol Permit” starts (Wed, Mar 3) |
| Alcohol Permit | 2027-03-03 (Wed) | 2027-03-25 (Thu) | 2027-04-01 (Thu) | Must be done before “School Admin Approval” starts (Fri, Mar 26) |
| Drone Approval | 2027-03-15 (Mon) | 2027-03-25 (Thu) | 2027-04-01 (Thu) | Must be done before “School Admin Approval” starts (Fri, Mar 26) |
| School Admin Approval | 2027-03-26 (Fri) | 2027-04-01 (Thu) | — | Must be done before “Full Check Alert Changes” starts (Fri, Apr 2) |
| Open RSVPs | 2027-03-24 (Wed) | 2027-03-26 (Fri) | — | RSVPs open three weeks ahead |
<!-- conditional:end -->

## 5. What does it have to do with the data that already exist?

- **New Activity** (subsequently built on the website) uses a new time window.
- **Activities that have been built do not automatically change**: They take steps without a window of time and date is calculated according to the original rules. There is only one exception: when a certain step is missing from the old archive, this step will be completed on reading and this step will be filled with a new window of time.
- **student organization Process** (Settings — World, FB-6) saved by itself: when building a new activity, standard steps are filled with time windows by name (key); If the workload remains an old default value, then the value in your table is replaced. The modified workload or target time of the organization was retained, and the steps added by the organization were not sufficient.
- The very old archive (schema file 6–11) would have been re-established by standard process, so they would have a new window of time.
- ♪ Chema version ♪ **Nothing.**Upgrade (new field is optional).

## Example:

Example The three activities of the standard event are currently built using templates when opening a website, so all dates change. Both demonstration days (2026-10-31, Saturday) and activity dates are **without change to**.

- **Networking Night (3/25) and Spring Speaker Night (3/18)**: Both windows were opened after 2027 1, so that they did not fall due or have a risk on the day of presentation (as before). Before, every last step had a yellow "Moved later", and now it's gone.
- **Founder Dinner (12/3)**: Almost all previous steps have been completed, some after the new deadline. Rescheduled to the new window: planning steps were completed at 9/29–10/2 (all in the window) and the funding process was completed as usual (table cards have been placed); **This week**: Moderator Lead Staffing is doing it and 11/6 (Friday) ends; The reminder day for Partner Specter Review is 11/6; Event Materials' window 10/1 is open and shows yellow "Shoud have started"; Parking Valiation, Content Distribution, Event Redender is in the middle of mid-month 11. Full Check follows the old example to keep "completed" (president has done a preliminary check) so that the president task board has a recently completed card; Press your table and its window is 11/19–12/2, strictly finished too early.
- **Today's “Needs a Nudge”** remains the same three articles (Send the October newsletter, Chase the USG reimbursement, Reconcile Security dates) because they are manual tasks with no change in date.
- **Forecasts (Forecast) have been modified a little bit by** (`src/engine/forecast.ts`): both windows of the calibrated steps are counted as working days, defaulting that the 1 day personal buffer is contained in your watch and closing steps start simulation from its own window. If you don't change, Head Count, which ends on the day of the event, will always be 0%, and close little dots in Close will always be red. After this change, the end-of-stage step of the type “is due on the day or the next day” is approximately 50 per cent (yellow or red edge); Founder Dinner's claims and financial records are at the end of the month of 12 and students do not work, so there is a risk - this is a live reminder, but you need to see if it makes sense.

## 6. Need you to confirm. / Unsolved

1. **Start date of closing steps**: Program 7.2 Article 4 states that “except for Head Count, the closing step is not earlier than the first working day after the event”, so thank You Note, Feedback etc. are sent on Monday after the event and your document writing day. If you want to remind me on the day of the event, just change the rules.
2. **Last three steps**: Post-activities 5 working days (reimbursement), 7 working days (financial records), 14 days (archived). Give me a new number if you disagree.
3. Three rules, **(the end of section 2), which are not part of the** programme, are designed to ensure that no false warning arises from new construction activities. The third of these and the option “to follow existing rules when one party is not a calibration step” are slightly different: uncalibrated steps followed by the calibration step are dealt with “in order of completion”; The calibration steps followed after the non-calibration step were still to be completed not earlier than the previous step, but the deadline would not be pushed back without delay.
4. The **workload has changed and the difficulty labels have not changed**: for example, the Moder Lead Staffing workload changed from 1 to 10 days, but it remains “light”. The difficulty label affects the time-use and contribution points for predictions, which have not changed this time.
5. **Date on which the workload is not moved**: The date of the calibrated step is from the time window, so that a change in workload (no change to target time) will not change the date;  Settings  →  Workflow rewording "Target Timing" will still change (engine is recalculated according to the number of days you give, window length remains unchanged).
6. **Check-in target time**:Settings — Check-in in Workflow still shows old ' 1(one working day before the event) The actual deadline is your schedule for the day after the event.  The display has not changed because an old restoration code was read in the archive to change the value back.
7. **Activities at the beginning of the term**: For example 1In the middle of the month, many start-up days are off. Engines move them forward. 12By the end of month.  This is the old rule of “no student work between semesters”, and it turns out you need to look at it.
8. **Conditional Steps without a window of time**: The table in section 4 is the result. Open all conditions and move on 2026-11-02or 11-03At the time, the safety chain (Advisor ...) School Admin Approval, 40(a) A working day is postponed because it starts before the beginning of the autumn term;  This is the old rule of un calibrated steps.
