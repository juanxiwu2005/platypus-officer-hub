# Reminder emails: evidence and six concepts for moving from receipt to actual task work

2026-11-18 (America/Phoenix) · Codex · Research and static design, awaiting Juanxi's choice

This round reviewed existing code, public papers and management resources, and delivered six separate mockups. It changed no website, templates, reminder rules, sending service, or email copy. All people, events, dates, dependencies, and conversations in the images are fictional design scenarios, not participant data or effectiveness-test results. Continue PR #14; no new PR or main merge.

## 1. Conclusions and recommendations

The strongest direction to try first is: **combine facts, one concrete first action, one real benefit, and one clear entry point in very little text; opening it immediately shows the task and where to do the work.** Default to A's action structure plus D's real value and thanks. C offers optional start planning for willing people who are busy now; E offers help for obstacles; F is appropriate only when a real person will respond.

This is an evidence-informed product inference, not “science has proved this is best for student organizations.” The studies differ in populations, channels, and outcomes: vaccination, online-course completion, helping strangers, and daily work experiences do not equal club members immediately starting a room booking.

**The real goal is work happening, not opening email, clicking links, or changing status to Working on it.** Missing start records do not prove no real work occurred. Use factual language such as “no start update recorded yet, ” and let members add actual progress.

## 2. What the latest code actually does

Verified baseline: runtime `bebe999`; starting commit `d848317`; later synchronized to `273222b`, whose additions were only other conversations' documents/static concepts; reminder runtime unchanged. Read-only main check: `b9e7a02`.

| Area | Current behavior/location | Meaning for this research |
| --- | --- | --- |
| Email generation | `src/reminders/mail.ts`: event before task; Hi; one Task due; trigger explanation based on actual state; requirements, importance, collaboration, thanks; one internal task URL; rules, no AI | Good concise baseline; no need to start over |
| Content sources | `src/reminders/facts.ts`: task instructions / why first; otherwise rules by node type, attendance, etc.; importance may use first direct downstream dependency, otherwise only “part of the event plan” | Sometimes concrete, sometimes repeats title or generic importance; add facts rather than AI stories |
| Length control | `excerpt()` in `mail.ts` takes first sentence, then truncates by word budget; whole email capped at 100 English words | Brevity helps, but essential conditions may be in sentence two or truncated text; 100 is not a scientifically established optimum |
| Triggers/frequency | `src/reminders/engine.ts`: planned start for unstarted tasks, due day, third day overdue; coincident stages use priority, no old-stage catch-up; at most once per task/person/day, three per assignment/recipient, six per person in rolling seven days | Not daily overdue emails; updates do not reset the three-send allowance; multiple tasks may still produce several emails on one day |
| Status routing | No reminders for Done; Stuck pauses owner reminders; Waiting on targets an explicit person and stops request reminders after response | Already recognizes obstacles require more than chasing the owner; retain |
| Email entry | `src/reminders/SingleTaskPage.tsx`: owners enter shared TaskDetail; helpers enter request-specific page; link determines authorization, opening itself submits no status | Specific task entry, without finding it from home |
| Universal task page | `src/components/TaskDetail.tsx`, `src/taskDetails/TaskSubmission.tsx`: event, task, Due, owner/status, requirements, external links, universal Details/attachments, private drafts, completion submission/undo | Matches previously chosen universal-submission direction; six concepts do not invent per-node forms |
| External destinations | `src/taskDetails/links.ts`: three default room-booking sites, overridable per task; shown equally, no built-in applicability or preferred path | Choosing a platform inside the task still costs effort after “one email, one entry” |
| Sending/cross-device | `src/reminders/useAutomaticReminders.ts` records local demos only while app open; no background real-email timer; task page explicitly Local demo, authorization/drafts depend on current browser | Full real-email-to-another-device flow not connected; prerequisite for release, not solvable by copy alone |

Also, option D's Need more time already lets members directly update the club target date and select whom to notify. This round does not reintroduce an “approver, ” waiting for approval, or a new approval process.

## 3. Evidence: what it supports and what it does not

Targeted literature search for a product question, not a full systematic review. Prefer original papers and public author/university versions; HBR/books explain management practice. Publication age alone is not a filter; retained relevant foundational work and found experiments closer to email. Search date is this document's date.

| Source | Type/findings | Product inference and limits |
| --- | --- | --- |
| [S1: Effect of Personalized Email-Based Reminders…, JMIR Formative Research, 2023](https://formative.jmir.org/2023/1/e43977) | 39 working adult learners in East Africa; 585 emails are repeated observations, not 585 independent participants. Randomized crossover; individualized information such as expected course position; model-estimated on-time probability +14 percentage points, 95% credible interval 3–25 | Supports rule-based specificity from current task facts, beyond adding names; generative AI unnecessary; outcome was course progress, not immediate club-task starts |
| [S2: Milkman et al., PNAS, 2011](https://pubmed.ncbi.nlm.nih.gov/21670283/) | Workplace vaccination field experiment: writing specific vaccination date/time in reminders raised vaccination 4.2 percentage points over control; date-only difference nonsignificant | C's “when/what first” worth trying; does not prove adding a date to every email works or justify copying effect size |
| [S3: Grant and Gino, JPSP, 2010](https://faculty.wharton.upenn.edu/wp-content/uploads/2012/05/GrantGino_A-LitteThanks.pdf) | Multiple experiments, including university fundraiser field experiment; gratitude can increase helping through perceived social worth | Retain thanks and explain specific team contribution; no guarantee each automated Thank you increases action |
| [S4: Harkin et al., Psychological Bulletin, 2016](https://eprints.whiterose.ac.uk/id/eprint/87431/) | Meta-analysis of 138 experiments supports positive effects of recording/monitoring goal progress on attainment | Universal Details, outcomes, attachments, status valuable; active recording is not forced publicity; does not establish leaderboards/public chasing |
| [S5: Scheibehenne et al., JCR, 2010](https://edoc.unibas.ch/entities/publication/1cd7cefa-8ab9-4be8-9a0f-5412feb5350d/full) | 63 conditions in 50 experiments, 5,036 people; mean choice-overload effect near zero with large variation | Cannot claim “science proves fewer links is better” |
| [S6: Chernev et al., JCP, 2015](https://chernev.com/wp-content/uploads/2017/02/ChoiceOverload_JCP_2015.pdf) | Meta-analysis, 99 observations, 7,202 people: complexity, task difficulty, preference uncertainty, decision goals moderate choice overload | Focus on understandable destinations serving distinct purposes; consumer-choice studies did not directly compare our one/two/three URLs |
| [S7: Roghanizad and Bohns, JESP, 2017](https://ecommons.cornell.edu/entities/publication/eeb6c49d-2293-4ff6-b640-332366495fb3) | Two studies compare direct requests to strangers in person/by email; email requesters overestimate compliance; trust/perspective differences partly explain | Human conversation and electronic requests differ; strangers' helping differs from automated reminders in familiar teams; do not transplant popular-article multipliers |
| [S8: Mohr, Cuijpers and Lehman, JMIR, 2011](https://www.jmir.org/2011/1/e30/) | Supportive Accountability theoretical model: credible, benevolent helpers and negotiated process expectations may support engagement | F requires actual response capacity; theory awaiting verification, mainly health-intervention adherence, not a trial proving president follow-up raises booking rates |
| [S9: Ryan and Deci, American Psychologist, 2000](https://www.selfdeterminationtheory.org/SDT/documents/2000_RyanDeci_SDT.pdf) | Self-determination theory review: autonomy, competence, relatedness help explain motivation | Respect choice/reduce controlling language in voluntary clubs; not removal of deadlines/responsibility |
| [S10: Michie et al., Implementation Science, 2011](https://link.springer.com/article/10.1186/1748-5908-6-42) | COM-B analyzes capability, opportunity, motivation as behavioral conditions | Distinguish not knowing how, lacking resources/permissions, being busy now, lacking perceived value; diagnostic framework, not proven best email template |
| [S11: Stanford Behavior Design Lab, Fogg Behavior Model](https://behaviordesign.stanford.edu/resources/fogg-behavior-model) | Design model combining motivation, ability/ease, prompt at action time | Repeating prompts does not supply missing capability/opportunity; not a reminder-success formula |
| [S12: David Allen, official Getting Things Done project-management guidance](https://gettingthingsdone.com/2010/02/managing-projects-tips-from-david-allen/) | Management method: turn projects into visible concrete next actions | A changes “finish booking” to “check available rooms for the specified time”; practice, not an email randomized trial |
| [S13: Amabile and Kramer, The Progress Principle, 2011, authors' introduction](https://progressprinciple.com/progress-principle/) | Work-diary management research/book emphasizing meaningful-work progress, clear goals, support | Reminders should enable small progress/remove obstacles; observational work research alone does not prove a CTA more effective |
| [S14: HBR, The Power of Small Wins, 2011](https://hbr.org/2011/05/the-power-of-small-wins) | Management reading: focus on small progress | Same research lineage as S13, not a second independent causal source |
| [S15: HBR, A Face-to-Face Request Is 34 Times More Successful Than an Email, 2017](https://hbr.org/2017/04/a-face-to-face-request-is-34-times-more-successful-than-an-email) | Management reading: channel matters | Original S7; title's number does not predict this product's effect |
| [S16: Oreopoulos and Petronijevic, NBER/IZA working paper, 2019](https://www.iza.org/publications/dp/12460/the-remarkable-unresponsiveness-of-college-students-to-nudging-and-what-we-can-learn-from-it) | Nearly 25,000 students, multiple institutions/years of online/SMS interventions; some coaching improved well-being/study time, evaluated interventions did not significantly improve academic outcomes | Counters “reminders necessarily improve outcomes”; also does not prove every club-task reminder ineffective; academic outcomes differ from booking behavior |
| [S17: Behavioural Insights Team, EAST, 2014/2024 update](https://www.bi.team/publications/east-four-simple-ways-to-apply-behavioural-insights/) | Practical Easy, Attractive, Social, Timely framework | Checklist for friction, salience, real team value, timing; not an experiment ranking six concepts |

Brief paraphrases only, no full articles/books copied. Some journal sites restricted fetching; cross-checked public author drafts, university repositories, original abstracts. Marketing vendors' click-rate claims were not causal conclusions. No direct research reliably specifies the exact optimal number of links for this kind of club reminder.

## 4. What members need to receive

Suggested order: event/task → one prominent Due → current facts/why now → one concrete starting action → necessary conditions/real value → clear entry → support/thanks. Short greeting; event first in subject.

- **First action must produce progress.** “Open the server/open Plus/click Task” is navigation. “Check whether an accessible room for 40 is available Apr 16, 6–8 pm” is work. Do not claim “only two minutes” without measurement.
- **Task deadline differs from event time.** Highlight one task Due; do not show background start-trigger date as a second deadline. Still provide event time needed for booking; never remove necessary facts for the sake of one date.
- **Explain why this email was sent.** Distinct rules for start, due, overdue, help; with Working recorded, do not say “no start update.” Missing system records must not become accusations about members.
- **Value must be verifiable.** “Once venue is confirmed, Sam can publish the location” only if that dependency exists; otherwise use saved why or honest brief explanation. Never invent “everyone is waiting for you.”
- **Tone has boundaries.** Appreciate contributions and specify available collaboration. Thanks cannot replace task facts or accompany shame, exaggerated urgency, false scarcity, fabricated personal concern.

Recommend replacing the 100-word hard truncation later with “preserve necessary facts, remove redundancy first, ” but approval is pending. Existing 100-word validation unchanged this round.

## 5. Links and continuity after opening

| Email destinations | Benefits | Costs/conditions |
| --- | --- | --- |
| One: specific internal task | Preserves context, permissions, status, outcomes; closest to existing structure | Extra navigation to external website; internal page must stay focused |
| Two: primary external action + secondary internal task | Potentially faster work when one appropriate platform is known | Context loss/forgotten submission; clear hierarchy/external-login explanation; never assume automatic result return |
| Three: start / schedule / help | Different obstacles, autonomous choice | More reading/decisions; may distract ready, experienced users; links only navigate/preselect views, explicit confirmation required to message/change status |

Default recommendation: one internal task entry. If two/three external platforms are necessary inside, explain each use; highlight a preferred path only when chosen by the owner, not arbitrarily by the system. Collapsing others is a hypothesis to test; never hide required options.

First screen remains the previously chosen universal task page: event/task, one Due, owner, status, concrete requirements, relevant external links, one large Details field, attachments. Resume existing saved content; no searching again or reentry after email. Saving a private start plan, visiting an external website, asking for help, and submitting completion are four distinct facts, never substitutes.

Email security scanning/prefetch must trigger no business action. Clicking does not automatically set Working/Done, send help, or update dates. Explain expired links/owner changes honestly and provide recovery; real release must resolve browser-only demo access.

## 6. Automation and human follow-up

Automation consistently includes task facts, dates, context, and action links without omissions. Humans add understanding of obstacles, clarification, resources, joint rescheduling, and actual response. The difference exceeds tone.

Clearly identify automated emails as Platypus. When a member reports an obstacle, route to a selected real collaborator and stop repeating the same chase text. Repeated nonresponse may prompt a human-review suggestion, but adoption, timing, frequency remain undecided; no automatic audience expansion or public naming.

Show “Alex via Platypus / reviewed and sent by Alex” only if the president/member actually reviewed and sent it and replies really reach their inbox. Otherwise it remains automated; never invent presidential review, immediate-help promises, or personal authorship.

## 7. Six separate mockups

Gallery: [manifest](../prototypes/reminder-email-research-2026-11-18/manifest.json). Email left, destination right; white email/dark-green task page distinguish channels, not a demand for dark email. Shared fictional example: Jordan, Speaker Night, Reserve a room, Due Mar 31; event Apr 16, 6–8 pm; accessible venue for 40. Dates support comparison, not current demo dates or actual rule calculations.

| Concept | Main obstacle/entry | Basis | Cost to observe |
| --- | --- | --- | --- |
| [A: One clear first action](../prototypes/reminder-email-research-2026-11-18/A-next-action.png) | Unsure where to start; one internal task link | S1, S10–S12, S17 | Generic/wrong first action degenerates into “open a platform” |
| [B: Direct action entry](../prototypes/reminder-email-research-2026-11-18/B-direct-booking.png) | Fewer steps to actual website; one primary external + one secondary internal | Design inference from S10, S11, S17 | External login/result-return friction; no false booking-result capture claim |
| [C: Choose a start time](../prototypes/reminder-email-research-2026-11-18/C-choose-a-moment.png) | Willing but busy now; one entry, optional private plan on destination | S2, S9 | Extra input may obstruct ready users; skippable, Due unchanged, no automatic Working |
| [D: Real team value](../prototypes/reminder-email-research-2026-11-18/D-purpose-and-peer.png) | Unclear importance; one task entry, dependencies/thanks | S3, S9, S13, S14 | No interpersonal pressure from dependencies or long mission repetition |
| [E: Remove an obstacle first](../prototypes/reminder-email-research-2026-11-18/E-remove-a-barrier.png) | Missing information, waiting person, or time; three navigation entries, help confirmed after opening | S8, S10, S11 | More entries; actual help recipient required; pictured help panel proposed, not connected service |
| [F: Real human collaboration](../prototypes/reminder-email-research-2026-11-18/F-real-human-support.png) | Repeated automation ineffective, coordination needed; one task URL + native email Reply | S7, S8, S16 | Human time/reply handling; genuinely reviewed/sent by a person, never disguised automation |

**Discuss A+D first.** E's obstacle routing can live on task page, C optional, F support with a real responder. Retain B/E multiple-entry emails for comparison; do not replace every single-entry email without validation. These are mechanisms, not six scientifically ranked effectiveness levels.

Omission from mockups does not remove existing features: universal Edit retains permissions; Need more time keeps D's date update/notification selection; statuses reversible, accidental completion undoable; attachments still three, each 2 MiB, total 5 MiB; no authorization to change Settings templates. Autosave illustrates existing experience, not a promise of cross-device cloud storage.

## 8. Rules and AI boundaries

| Content | Default generation |
| --- | --- |
| Event, task, Due, state, start/due/overdue reason, owner, recipient, links, frequency | Saved facts + rules, no AI |
| Greeting, thanks, collaboration, brief status wording | Human-reviewed fixed phrase library + rules |
| Requirements/first action, importance, platform applicability | Creator's saved content first; rule templates for confirmed node types; honest missing-data display/edit entry |
| Dependencies, actually affected members | Rule summaries of workflow/person relationships; no exaggeration or unauthorized disclosure |
| Optional start plan, help message | Member input/selection, rule storage/routing; no AI needed |
| Old long instructions | Optional future one-time AI compression while editing, confirmed/saved by human; no AI wait when sending |

Six mockups were created by an image model. This does not mean product email sends require AI; current content generation already uses rules.

## 9. Future evaluation

No member experiment or real emails this round. If later approved, first observe understanding of event, task, Due, first action, entry; then an appropriately sized trial.

Primary measures: “time to first meaningful work record, ” actual progress within a defined observation window, completion to requirements. Room-application submission and verifiable booking progress/confirmation matter more than Working alone; typing one arbitrary draft character is not meaningful work. Admit unobservability where external platforms have no callback; use member confirmation/outcomes, never infer completion from clicks.

Secondary measures: task quality, collaboration after extensions, help responses, abandonment/unsubscription, interruption burden. Opens/clicks describe the route, not task progress; no need to add tracking pixels first.

To compare one/two/three entries specifically, hold task type/difficulty, body, sender, timing, page, recipient grouping constant; differing link functions still complicate interpretation. Six mockups change content and route together, so effects cannot be attributed solely to link count. Small clubs have limited samples; prioritize qualitative obstacles, promise no statistical significance, never declare victory from one chance click.

## 10. Deliverables and next steps

Deliverables: this research record, six separate PNGs, image manifest. No new product tests: documentation/static images only; acceptance checks traceable sources, all six images, correct numbering/core entries, no runtime files in diff. After Juanxi chooses, write a concrete phased implementation plan.

Still to confirm individually: default email structure; first-action/value editing; preferred-platform/applicability handling; private start plans; help/human-reply ownership; future background real sending/cross-device access. These are not approved development scope this round.
