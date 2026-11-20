# Reminder mail: from information received to evidence of a real mission and six options

2026-11-18 (America/Phoenix) Codex . Research and static design, to be selected by Juanxi

This round checks existing codes, access to public papers and management information, and delivers six stand-alone impact maps. No changes were made to websites, templates, alarm rules, sending services or mail files. The figures, events, dates, dependence and dialogue in all the graphs are the picture of the design, not participants ' information or results of the impact tests. Continue using PR #14, do not create PPR, do not merge main.

## 1. Conclusions and recommendations

The most worthwhile way to start is for **to put the facts, a concrete first step, a live value and a clear entry point in very few words. The mission and the processing entrance will be seen immediately upon opening.** uses the action structure A by default, plus D 's live value and thanks. c Provide an optional start-up plan for those who wish to do so but are not available at this time; E. Provides assistance to persons with disabilities; F Only when the real person has taken over.

This is an evidence-based product inference, which cannot be called “science has proven itself best among students”. The subjects, channels and results of the research are different: vaccinations, completion of online courses, help for strangers, daily work experience are not equal to booking immediately.

The real goal for **is to work, not to open emails, click links or change status to Working on it.** doesn't start without a record, and it doesn't mean nothing is happening. The system should use factual language such as “not yet recorded to start updating” and allow members to supplement actual progress.

## 2. What did the latest code actually do?

Reconciling baseline: operational code `bebe999`; Start work to submit `d848317`; Synchronizes it to `273222b`, adding only other dialogue documents and static programs, reminding the associated running code to remain unchanged. Main read-only check is `b9e7a02`.

| Part | Current act and location | Meaning of the study. |
| --- | --- | --- |
| Mail Generation | `src/reminders/mail.ts`: The name of the event is given before the mission name; Hi；(a) Task due; A trigger interpretation based on the actual state of affairs; Request, importance, collaboration and gratitude; An internal task URL; Rule generation, no AI | There's a good baseline of simplicity that doesn't have to be done from zero. |
| Content Source | `src/reminders/facts.ts`: Priorities / why; Otherwise, they are supplemented by rules such as the type of node and the number of persons involved; The first direct follow-up reliance on materiality is desirable, as otherwise only “is part of the plan of activities” | Sometimes the content is specific, sometimes merely repeats the title of the mandate or gives general importance; It needs to be filled with facts, not an AI story. |
| Length Control | `mail.ts` It's... `excerpt()` Take only the first sentence, then budget cut by word, full cap 100 English | Shortness is useful, but key conditions may be in the second sentence or cut-off part; 100 is not the best word for study. |
| Trigger & Frequency | `src/reminders/engine.ts`: Planned start, due day, due post-3 day; (b) Reconsolidation of the priority phase on the same day and non-renewal of the old phase; Up to one per day for each task/person and up to the same allocation/receipt 3Once, everybody rolls. 7The most important day. 6Number of times  | It's not a daily issue that is currently overdue, nor has it been regenerated every update. 3(a) Minor amounts;  Multiple letters may still be received on the same day. |
| Distribute Status | Done do not warn; Stuck paused the supervisor's reminder; Reminding on a specified object and stopping the request after response | It has been shown that “impediments must not be merely directed to the responsible person”, which should be retained. |
| Mail entrance | `src/reminders/SingleTaskPage.tsx`_: access of mandate-holders to shared TaskDetail; Helping objects to enter a specific help page; Links select authorization, open links without submitting status | It's a specific mission entrance. It's not necessary to go to the front page first. |
| Common Task Page | `src/components/TaskDetail.tsx`、`src/taskDetails/TaskSubmission.tsx`_: activities, tasks, Due, head/status, requirements, external entrances, harmonization of Details and attachments, self-contained drafts, submission for completion and withdrawal | Consistent with previously selected generic submission directions; Six options do not create separate input forms for each node |
| External entrances | `src/taskDetails/links.ts`: reservation by default of three websites, which can be covered by specific tasks; Parallel display, no built-in or preferred entrance | There are still decision costs from One Mail Entry to Which Platform in Tasks |
| Send and Cross Device | `src/reminders/useAutomaticReminders.ts` Only record local presentations during the opening period; There is no backstage timed live email; Single task page is clear Local demo with permissions and drafts dependent on the current browser | Live mail to another device has not yet been connected. It's a premise for the future. It can't be solved by paperwork alone. |

In addition, the Need more time is already part of the target day for direct updating of the program and selection of the person to be informed; There is no re-introduction of the “approvaler”, pending approval or new approval process.

## 3. Evidence: What can and cannot be supported

This is a targeted literature search for product issues, not a complete system overview. Priority original thesis, author/university public version; HBR and books are used to manage practice interpretation. The age of the paper itself is not a screening criterion; The basic study was retained for the current round, while experiments that were closer to e-mails were identified. The date of retrieval is the date of this document.

| Source | Type, research findings | Sensitization and restriction of conversion to the product |
| --- | --- | --- |
| [S1：Effect of Personalized Email-Based Reminders…，JMIR Formative Research，2023](https://formative.jmir.org/2023/1/e43977) | 39 active East African adult learners, 585 mails are duplicate observations and not stand-alone samples of 585. Random cross-design; Add specific information such as where the individual should be in the course, model estimates high probability of 14 percentage points on time, 95% trusted zone 3–25 | Supports the use of rules to concretize current mission facts; Not equal to a name, no generator AI; The result is course progress, not start immediately |
| [ S2: Milkman et al., PNAS, 2011 ](https://pubmed.ncbi.nlm.nih.gov/21670283/) | (a) On-site inoculation experiments at enterprises: the reminder gives a specific date and time of the vaccination, with a higher rate of 4.2 percentage points compared to the comparison; Date-only differences are not significant | C “When, what to do first” is worth trying; It doesn't prove that every mail with a new date is valid, nor can it be replicated. |
| [ S3: Grant and Gino, JPSP, 2010 ](https://faculty.wharton.upenn.edu/wp-content/uploads/2012/05/GrantGino_A-LitteThanks.pdf) | Several experiments, including on-site experiments with university fund raisers; Thank you for helping people by feeling that they're valued by society. | Retain thanks and specify how contributions help the team; There's no guarantee that every word added to the automatic template will add action. |
| [ S4: Harkin et al., Psychological Bulletin, 2016 ](https://eprints.whiterose.ac.uk/id/eprint/87431/) | The meta-analysis of 138 experiments supports the recording/monitoring of positive roles between progress and achievement of targets | Harmonization of Details, results, annexes and status is valuable; Proactive records do not amount to mandatory disclosure, do not extrapolate rankings or publicly urge validity |
| [ S5: Scheibehenne et al., JCR, 2010 ](https://edoc.unibas.ch/entities/publication/1cd7cefa-8ab9-4be8-9a0f-5412feb5350d/full) | 50 experimental 63 conditions, 5,036 people, opting to overload average effect close to zero, with wide differences between studies | It cannot be claimed that "the fewer the links to scientific evidence, the better." |
| [ S6: Chernev et al., JCP, 2015 ](https://chernev.com/wp-content/uploads/2017/02/ChoiceOverload_JCP_2015.pdf) | The meta-analysis of 99 observations and 7,202 indicates that complexity, mission difficulty, preference uncertainty and decision target impact selection are overloaded | The focus is on whether the portal can be understood and adapted to different purposes; Consumption options studies do not directly compare the 1, 2 and 3 URLs of our mail |
| [ S7: Roghanizad and Bohns, JeSP, 2017 ](https://ecommons.cornell.edu/entities/publication/eeb6c49d-2293-4ff6-b640-332366495fb3) | Two studies compare direct requests to strangers in person/mail; Mail requests overestimate each other's collaboration, and trust and perspective differences are one of the explanations. | Real communication cannot be equated with electronic requests. But a stranger's request for help is different from an acquaintance's automatic reminder. |
| [ S8: Mohr, Cuijpers and Lehman, JMIR, 2011 ](https://www.jmir.org/2011/1/e30/) | Supportive Accountability theoretical model: people who are credible, well-meaning and able to help, with clear process expectations that may support sustained engagement | F Need to live responsiveness; This is a theoretical model to be tested, which focuses on the dependence of health interventions and does not prove that the follow-up of presidients has led to an increase in booking rates. |
| [ S9: Ryan and Deci, American Psychologist, 2000 ](https://www.selfdeterminationtheory.org/SDT/documents/2000_RyanDeci_SDT.pdf) | Overview of the self-determination theory: autonomy, competence and relationship require assistant motivation | (a) Communication that respects choices and reduces the sense of control for volunteer volunteers; Not without a deadline or no liability. |
| [ S10: Michie et al., Application Science, 2011 ](https://link.springer.com/article/10.1186/1748-5908-6-42) | COM-B Capability, opportunity, motivation as a condition for behavioural analysis | Distinguishing does not do, lacks resources/ services, is empty at this point and does not see value. It's a diagnostic framework. It's not the best mail template that has been proven. |
| [ S11: Fog Behavior Model ](https://behaviordesign.stanford.edu/resources/fogg-behavior-model) of Stanford Behavion Design Lab | Design models for motivation, ease of implementation and reminder of the need to combine operational moments | Repeat Prompt does not automatically fill missing capabilities and opportunities; The model is not a calculation formula for warning success rates. |
| [S12:David Allen, Getting Things Done Official Project Management Note](https://gettingthingsdone.com/2010/02/managing-projects-tips-from-david-allen/)  | Management approach: transforming projects into visible, concrete next actions | A. Dismantling the “completed booking” to “check available rooms for specified time periods”; It's a practical method. It doesn't pretend to be a random mail experiment. |
| [ S13: Amabile and Kramer, The Progress Princile, 2011, author of ](https://progressprinciple.com/progress-principle/) | Management studies and books based on work journals, highlighting progress, clear objectives, supporting conditions for meaningful work | Reminders should help remember to make small progress and remove obstacles; Observational work studies don't alone prove some CTA to be more effective. |
| [S14：HBR，The Power of Small Wins，2011](https://hbr.org/2011/05/the-power-of-small-wins) | Management Reading: Focusing on Small Progress | It's the same line of study as S13. It can't be a second independent causal evidence. |
| [S15：HBR，A Face-to-Face Request Is 34 Times More Successful Than an Email，2017](https://hbr.org/2017/04/a-face-to-face-request-is-34-times-more-successful-than-an-email) | Managing reading: channels worthy of attention | See S7 for original study; The values in the title do not predict the effects of this product |
| [ S16: Oreopoulos and Petronijevic, NBER/IZA working paper, 2019 ](https://www.iza.org/publications/dp/12460/the-remarkable-unresponsiveness-of-college-students-to-nudging-and-what-we-can-learn-from-it) | Reporting on 25,000 students, multi-year online/sMS intervention; Some counselling improves psychological or learning time, and the interventions assessed do not significantly improve academic outcomes | (a) Counter-substantiation of the “regarding necessarily facilitates the outcome”; Nor can all missions alerts be declared invalid on this basis. School results are not bookings. |
| [ S17: Behavioural Insights Team, EAST, 2014/2024 Update ](https://www.bi.team/publications/east-four-simple-ways-to-apply-behavioural-insights/) | Practical framework for Easy, Attracive, Social, Timely | (a) To reduce resistance, sharpen focus, live team value and timing for individual checks; It's not a six-program test. |

The table above reproduces each source only briefly and does not reproduce the full text of articles or books. (b) Limited access to selected periodical sites and cross-checking using author ' s public manuscripts, university libraries or original digests; There is no causality conclusion based on the sales vendor ' s hits rate. No direct study has been found that can reliably specify "Student event of this kind which alerts the mail just to put a few links best".

## 4.

The order of the proposal is: the only thing that stands out in terms of activity and task — the fact of the moment and why it was received at this point — a specific action that can be started – the necessary conditions/ live value — clear portals — support and thanks. Keep the greeting short; The theme remains on the move.

- **The first step must be to produce progress.** "Open the server/open the Plus/point Task" is a navigational description. The task is to see whether the accessible rooms of Apr 16, 6–8 pm can be reserved for 40 people. Do not claim to be “only two minutes” without being measured.
- The **cut-off date is different from the time of the event.** highlights only one task, Due; The trigger date from backstage is not shown as the second cut-off date. The period of activity required for booking must still be provided in the context of the mission, without deleting the fact that it is necessary to pursue a date.
- **Explains why it was sent.** starts with different rules for reminders, end-of-date reminders, overdue reminders and requests for help; When working records are available, do not say “no update started”. Don't make the system unrecorded as an accusation of the truth.
- The **value needs to be verifiable.** "Sam can only publish the site after confirmation of the site" is used only when the mission does so; Otherwise, use saved why or honest short descriptions. There can be no automatic “everyone is waiting for you”.
- **tone has boundaries.** appreciates the contribution of members and specifies what collaboration is available. “Thanks” cannot substitute for the fact of a mission, nor should it be accompanied by shame, exaggeration of urgency, false scarcity or falsifying human interests.

The current 100 word hard cut proposal is to be replaced in the future with a priority of “necessary facts cannot be thrown aside and redundant sentences prioritized”, but this recommendation is pending approval. The current round does not change the existing 100 word verification.

## 5. Continuous experience after connecting to point

| Mail entrance | Advantages | Costs and applicable conditions |
| --- | --- | --- |
| 1: specific internal tasks | Retain context, performances, status, outcome; The closest to the existing structure | (b) Navigation to an external site more frequently; The internal page must be sufficiently focused |
| 2: Main external processing + sub-internal tasks | When the only suitable platform is known, it may go faster to work. | (b) May have left the context and forgotten to return; Need to identify mains, indicate external login and do not assume automatic return |
| 3: Start/ Arrange/ Help | It is oriented towards different obstacles and provides for autonomous choices | Increased reading and decision-making, and people who are skilled and ready to act may be distracted; All links are navigational/preselection view only. Messages must be clearly confirmed or changed |

Could not close temporary folder: %s If it is true that two or three external platforms are required within the mission, each entry point should include a description of the applicable scene; It is only highlighted when the lead person has identified a preferred path and cannot be selected at any rate by the system. Collapse of other entry points is an ad hoc option and does not hide the options necessary to accomplish this task.

The initial screen will remain the previously selected generic task page: activity/task, one Due, head, status, specific requirements, relevant external entrances, a Details large text box and attachment. Existing preservations should continue; It is not possible to request a return from the mail to retrace or refill activities. The preservation of private start-up plans, access to external websites, sending help and submission are four different facts that do not pretend to be mutually exclusive.

The secure scanning/pre-emption of mail links cannot trigger a business action. Clicking on a link does not automatically mark as Working/Done, does not call for help and does not update the date automatically. (b) An honest explanation and recovery path when the link fails or when the person in charge is replaced; Live is also required to solve the presentation limits currently available only for this browser.

## 6. Division of labour for automated information and follow-up

Automated systems are good at matching mission facts, dates, context and processing entry points to avoid omissions; The added value of the real person is to understand specific obstacles, clarify, coordinate resources, align arrangements together and respond truly to responses. The two are not the only words missing.

It is recommended that automated mail clearly identify Platypus. When you respond to an obstacle, you transfer it to the selected live collaborator and avoid continuing to repeat the same catalytic text. Repeated failure to respond may result in a recommendation for real-person review, but the use of this process, timing and frequency still needs to be decided; No automatic extension of the addressee, no public roll call.

"Alex via Platypus / reviewed and sent by Alex" is shown only when the president or member does view and send it, and the reply does reach its inbox. If not, it's still automatic mail, and you can't make up the president who has read, promised to help immediately or pretend to be a writer.

## 7. Six independent effects maps

Atlas: [ file directory ](../prototypes/reminder-email-research-2026-11-18/manifest.json). Each left is e-mail and the right is where the point opens; White mail and deep green task pages are used to separate channels and do not require live messages to compel dark themes. Uniform examples: Jordan, Specter Night, Task Reserve a room, Due Mar 31; Activity Apr 16, 6–8 pm; 40 people ' s accessibility. The date is only used to design comparisons, not the current presentation business date or live rule calculation.

| Programme | Main obstacles addressed, entry points | Basis | The price of having to watch. |
| --- | --- | --- | --- |
| [A: A clear first step ](../prototypes/reminder-email-research-2026-11-18/A-next-action.png)  | I don't know where to start. 1 internal task links | S1、S10–S12、S17 | If the first action is too ordinary or wrong, it becomes "opens a platform" again. |
| [ B: Direct Access Processing ](../prototypes/reminder-email-research-2026-11-18/B-direct-booking.png) | Reduction to actual website operations; 1 Main External + 1 Internal | Design inferences for S10, S11 and S17 | (a) External login and back-mail friction; You can't pretend you got the booking results. |
| [C: Make your own start. ](../prototypes/reminder-email-research-2026-11-18/C-choose-a-moment.png)  | If you have the will, but it's not convenient at the moment. 1 entrances, landfall options for private plans | S2、S9 | Additional input may also block people who are ready to start; Skip, No Due, Not Automatic |
| [D: See live team value](../prototypes/reminder-email-research-2026-11-18/D-purpose-and-peer.png)  | I don't understand why it matters. 1 task portal, dependencies and thanks | S3、S9、S13、S14 | (a) Not to put pressure on the writing of adult relationships; Do not repeat the Long Mission Declaration |
| [E: remove obstacles first](../prototypes/reminder-email-research-2026-11-18/E-remove-a-barrier.png)  | Insufficient information, waiting persons or time; 3 navigational portals, confirm help when you click | S8、S10、S11 | Additional entrances; There must be a live recipient for help; The help panel in the figure is a recommendation, not currently connected |
| [ F: There are real people who can collaborate ](../prototypes/reminder-email-research-2026-11-18/F-real-human-support.png) | Automatic reminders are invalid and require coordination; 1 tasks URL + mail origin Reply | S7、S8、S16 | (a) Real time costs and response processing; Live must manually view the delivery and cannot disguise automatic mail |

**proposes to discuss the A+D combination first. The**E barrier stream can be left on the post-set task page, C for option and F for actual support received. B and E are compared to multiple-entry mails, and it is not recommended that all single-entry mail be replaced without authentication. The six figures represent programmes for different mechanisms and are not the six-level ranking of proven results.

The absence of all old functions from the visual display does not mean that they are deleted: Universal Edit is still based on existing missions; Need more time to follow D 's update date and select the informer; The state may be restored and withdrawn by error; The annexes remain 3, each of 2 MiB and a total of 5 MiB; The new scheme does not authorize changes to the Settings template. Auto-storage in the figure reflects only existing experiences and does not commit to inter-equipment cloud storage being achieved.

## 8. Rules and borders of AI

| Contents | Default Generation |
| --- | --- |
| Activity, task, Due, current status, start/due/late cause, responsible person, recipient, link, frequency | (a) Read and rule-based preservation of facts; Leave it to AI. |
| Brief expression of greetings, thanks, collaboration, different situations | Manually reviewed fixed library + rule selection |
| Specific requirements and first steps, why they matter, scope of application of the Platform | Give priority to reading job creators for saving content; The type of node has been identified and a rule template is available; Show and improve access when missing |
| Task dependency, live affected | Read workflow/personal relationships to aggregate by rules and avoid exaggeration or disclosure of non-missions |
| Selectable to start planning and help with information | Remember to enter/choice itself; No AI is required to save the rules and routes |
| Old, lengthy mission statement | In the future, it is optional to use AI as a one-time tool during the editing phase to help compress and be identified for preservation; Alarm sent without waiting AI |

The six maps for this round are modelled on images. It doesn't mean the product needs to call AI every time it e-mails. The current communication content generation path is already a rule.

## 9. How to judge better in the future

This round does not run membership experiments, no live emails. If later approved for validation, it will be possible to see whether members can understand activities, tasks, Due, first steps and entrances before undertaking tests of a suitable scale.

The main indicators should be “time to the first meaningful work record”, whether real progress has been made within the intended observation window and whether it has been completed as required. (b) Room requests for verifiable booking progress/recognizing information are more meaningful than a separate Worlding status; Enter any word in the draft that is not live to do. External platforms recognize non-observables when they do not return, using members to confirm or record results, and cannot complete speculation by clicking.

This is supported by the quality of tasks, collaboration after an extension, whether or not there is a response to the request for help, abandonment/revision, and disruption of the burden. Open and click rates reflect only the links, do not serve as an alternative indicator for mission advancement, nor do they need to be added to mail-trace pixels.

If a specific comparison of 1/2/3 entrances is made, other conditions should be fixed: type and difficulty of task, text, sender, timing, page and recipient group; The fact that the link function itself is different still affects interpretation. The six maps changed both content and path, and their results could not be attributed separately to the number of links. A small sample of student orgation is limited, gives priority to qualitative understanding barriers and does not promise visibility or treat an occasional click as a victory.

## 10. Delivery and follow-up

This round of delivery is a research record, six separate PNGs, and pictures of manifest. No new product test: Only document/static pictures, access view source retroactive, six figures complete, number accurate from the core entry, repository discrepancies do not contain a product running file. Once Juanxi has chosen to do so, a specific phased implementation programme will be written.

Pending confirmation on a case-by-case basis: which structure is used for default mail; How to edit the first step and value field; How multi-platforms choose the preferred/indicate the applicable scenario; The availability of private start-up plans; (a) Who will receive the help/real response; Live distribution and cross-equipment access to future backstages. They are not the approved scope of development.
