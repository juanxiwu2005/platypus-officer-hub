# Handoff benchmark across companies and organizations, and a recommended flow for student clubs (2026-11-23, Claude)

**Scope:** Juanxi asked for a broad, multi-company, multi-dimension study of handoff and onboarding, to find the flow that best fits nonprofits and student clubs. Documentation only: **no website code changed**, 0 product AI calls, 0 emails. Branch `claude/fervent-thompson-e2j5u2` (draft PR #20). Preview 14 itself was merged into `main` on 2026-11-22 (`db1a0be`); this branch is `main` plus the S0–S3 and S5–S7 subtraction work.

**Relationship to earlier work:** `HANDOFF_RAMP_REVIEW_2026-11-21.md` covers *what a new officer must learn* (red lines, role rules, scenario questions, AI answers with sources). This report covers *how the role itself changes hands*: timing, who does what, what moves, and when authority transfers. The two fit together (Section 6).

**Evidence quality:** most sources below are practitioner guides, vendor pages and organization manuals, not controlled studies. Vendor figures are marked as such. The useful part is the **pattern that repeats across very different fields**, not any single number.

---

## 1. One-sentence conclusion

Organizations that hand over well treat handoff as **an overlap with live work and one clear moment of transfer**, not as **a document that must be written and approved before the newcomer can start**. Platypus today is document-first (interview → AI handbook → outgoing confirms → president approves → hand over). The recommended flow keeps the parts that already match the best practice (the continuously built role dossier, gap questions, read-back, day-30 review) and changes the spine to: **name the successor early → overlap with real tasks → transfer assets and authority in one confirmed step → nudge the people around the newcomer at the right moments.**

---

## 2. What was studied (12 dimensions, about 40 sources)

| # | Field | Organizations / sources | Core mechanism |
| --- | --- | --- | --- |
| A | Military unit rotation | US Army relief in place / transfer of authority (RIP/TOA) | Advance party → **left-seat ride** (old unit operates, new unit watches) → **right-seat ride** (new unit operates, old unit watches) → formal transfer ceremony. About 2 weeks for most posts, 30 days for command |
| B | Aviation | FAA AC 61-115, AOPA | **Positive three-step exchange of controls:** "You have the controls" → "I have the controls" → "You have the controls". Never ambiguous who is flying |
| C | Open source with rotating roles | Kubernetes Release Team (new team every ~4 months) | Each role has a **Lead + Shadows** and a public role handbook; shadows "learn by doing while taking load off the lead"; many shadows become the next cycle's lead |
| D | Shift handoff | GitLab on-call handover, incident.io, Google SRE | Short **open-items list** (active incidents, pending follow-ups, workarounds) written before the end of shift; **synchronous handoff preferred**; the outgoing person waits for acknowledgment |
| E | Account handoff | Sales → Customer Success (Vitally, Rocketlane, Pedowitz, Asana templates) | Standard handoff form (hard data + soft context + commitments made); **the receiver verifies completeness before kickoff** and logs gaps with an owner; joint "warm" introduction before ownership moves; some firms tie the seller's commission to a complete handoff |
| F | Employer onboarding | Google (manager just-in-time checklist), Microsoft (buddy pilot), GitLab (onboarding issue + buddy) | Google: a 5-item checklist emailed to the **manager** the day before start; reported 25% faster ramp (secondary sources, from Laszlo Bock's *Work Rules!*). Microsoft: pairs who met **more than 8 times** in 90 days, 97% said the buddy made them productive faster (once: 56%; self-reported). GitLab: onboarding is a task list in the work tool, buddy chosen by the manager |
| G | HR / IT systems | Rippling, BambooHR | Access is attached to **the role, not the person**: role-based app provisioning on day 1, one-click deprovisioning, each system owner ticks their own step (audit trail) |
| H | Knowledge bases | Guru (verification cycles), GitLab handbook-first, Scribe/Tango (capture while working), WalkMe/Whatfix (in-app guidance) | Every card has an **owner and an expiry**; stale cards get re-verified or archived. Documentation is **captured during work**, not reconstructed at exit. Help is delivered **at the moment of the task** because one-off training is forgotten |
| I | Leadership transitions | Watkins *The First 90 Days*; Partnership for Public Service (presidential transitions) | Plan the transition **long before** the start date; agencies prepare briefing books for incoming teams; the newcomer secures an **early win** in the first 30 days |
| J | Membership nonprofits | Rotary (president-elect, PETS), Toastmasters (officer training twice a year), BoardSource (staggered terms) | **An "-elect" year:** Rotary's president-elect is chosen a year ahead and must attend training before 1 July. Toastmasters credits clubs only if officers are trained in both yearly rounds. BoardSource: stagger terms so no more than half (ideally one third) turn over at once |
| K | Fraternities and sororities | NIC, Phi Delta Theta, SigEp, UVA, Memphis, Mississippi State | **Transition retreat after elections and before installation**: officer-to-officer session with materials, then team-to-team lessons; a **shadowing period**; prepared questions ("best experience", "advice", "most helpful staff") |
| L | Universities and students' unions | UNLV, Ohio State, Notre Dame, WashU, Wichita State, Loyola, DePaul, Missouri, Georgia Tech, Colorado, Nebraska; UK SUs (UCL, Southampton, Durham, Swansea, Strathclyde); Anthology Engage | Transition binder updated every cycle; **elect earlier** so the newcomer can watch the big spring event; update roster/platform positions immediately; **move bank signers, social accounts and files before graduation** (lost social accounts usually cannot be recovered); store files in an organization-owned shared drive; check in about 3 months later |

Full source list in Section 8.

---

## 3. Ten patterns that repeat across fields

| # | Pattern | Seen in | What it means for a student club |
| --- | --- | --- | --- |
| P1 | **Start at selection, not at departure** | Rotary president-elect, Kubernetes shadows, presidential transitions, "elect earlier" advice from UNL and others | The trigger is "successor named", not "season dates". Most clubs elect in spring while the outgoing officer is still active; that overlap is the most valuable time |
| P2 | **Overlap with real work, both directions** | Army left-seat/right-seat, Kubernetes shadows, fraternity shadowing | First the newcomer watches one real task, then **does one real task while the predecessor watches**. Reading alone is not enough (also R2 in the 11-21 study) |
| P3 | **One explicit moment of transfer, acknowledged by both sides** | TOA ceremony, "I have the controls", SRE "wait for acknowledgment", CS kickoff | Ambiguity about "who owns this now" is where tasks get dropped. One confirmed click: "You have the role" / "I have the role" |
| P4 | **The receiver checks completeness** | CS verifies the handoff form before kickoff; I-PASS read-back; on-call acknowledgment | The incoming officer marks each open item "got it / unclear" and reads back the top three; unclear items go back to the predecessor |
| P5 | **Open items beat narratives** | On-call notes, CS packets (commitments made), briefing books | The core handoff artifact is a short list: open tasks, promises to outsiders, money in flight, next hard deadlines, people. Long prose is optional |
| P6 | **Assets belong to the role, not the person** | Rippling role-based access, Google shared drives, Anthology positions, UK SU password handover, bank signers | The most irreversible loss in student clubs is accounts: Instagram, club email, Drive, bank, SDC/Engage roster, venue system. Track *which* assets exist and *who holds admin* (never the passwords) |
| P7 | **Nudge the people around the newcomer, just in time** | Google manager checklist, Microsoft buddy frequency, GitLab manager tasks | The president, the predecessor and a buddy each get a tiny, timed task. Frequency of contact matters more than one long meeting |
| P8 | **Capture during the term; keep it fresh with owners** | GitLab handbook-first, Scribe capture-as-you-work, Guru verification | Platypus already builds the role dossier from records. Add an owner and a "still true?" check at handoff rather than a fresh write-up |
| P9 | **An early win in the first weeks** | Watkins, product "time to first value" | The first owned task should be small, real and due within days, so the newcomer and the club see it working |
| P10 | **Retrospective feeds the next cycle** | Kubernetes retros, WashU packet updated each cycle, Missouri/DePaul 3-month check | Day-30 "what was missing" becomes a dossier lesson for the next successor (Platypus already does this) |

Two patterns that are specific to student clubs and appear in almost every university guide:

- **The summer gap.** Officers are often elected in spring, the outgoing seniors graduate in May, and real work restarts in August. If the handoff waits until fall, the predecessor is gone. The overlap must happen before finals, and a "re-entry" reminder should fire before the first fall deadline.
- **Whole-board turnover.** Clubs often replace most officers at once (BoardSource warns against more than half). That makes *cross-role* overlap scarce, so the president and adjacent-role buddies carry more of the load, and the system's own records matter more.

---

## 4. Where the current Platypus module stands

| Pattern | Current module (`src/pages/Handoff.tsx`, `HandoffNewOfficer.tsx`, `src/data/handoff.ts`) | Verdict |
| --- | --- | --- |
| P8 capture during term | Role dossier (Calendar / In flight / People / Lessons) built from records without AI | ✅ Strong; matches the best practice |
| P10 retrospective | Day 7 / day 30 review; "Add to dossier" turns gaps into lessons | ✅ Keep |
| P4 receiver checks | Read-back of 3 fixed questions; "Got it / Unclear" per handbook section | ✅ Keep, but move it onto open items instead of handbook sections |
| P1 start at selection | `setIncoming` exists, but the page is organized around a **season with dates** and the 7-step chain starts with the interview | ⚠️ Trigger and ordering should change |
| P5 open items | In-flight tasks exist in the dossier, but the main artifact is an **AI-drafted handbook of 12 lines** | ⚠️ Promote open items; make the AI handbook optional |
| P3 one transfer moment | Handover requires **interview → handbook → outgoing confirms → president approves**; then tasks become "Not claimed" until the newcomer claims each one | ❌ Two approval gates on a document block the transfer; the real moment of transfer is spread over many claims |
| P2 overlap both directions | One optional shadow task (newcomer watches) | ⚠️ Missing the right-seat step (newcomer does, predecessor watches) |
| P6 assets | `org.workspace` holds demo links; no list of accounts, admins, bank signers, or school-system positions per role | ❌ Missing; this is the most cited item in student-club guides |
| P7 nudges to others | A generic 6-item first-week checklist (`WEEK_ONE`) ticked by the newcomer or president; no buddy; reminder engine not used for handoff | ❌ Missing; the reminder engine already exists and could carry it |
| P9 early win | Not designed | ⚠️ Missing |

**Load today:** 7 stages and 2 sign-offs before the newcomer owns anything. The outgoing officer writes, re-drafts and confirms; the president approves each role's handbook. Nothing in the benchmarks gates the transfer on approving a document. They gate it on **open items acknowledged and access moved**.

---

## 5. Recommended flow: "Name → Overlap → Transfer → First 30 days"

Burden budget (design targets, not measured): **outgoing officer ≤ 60 minutes in total, incoming officer ≤ 3 hours in week 1 (fits the 3-day ramp), president ≤ 15 minutes per role.**

### Step 0 · Always on (during the term, no extra work)

- Role dossier keeps building from tasks, contacts, delays and lessons (exists).
- **New: Role assets list.** For each role, the accounts and places it controls: name, where it lives (Instagram, club Gmail, shared drive folder, bank signer, Sun Devil Central position, Mazevo access), and **who currently holds admin**, plus a second admin. **No passwords or recovery codes are ever stored**; the list only says what exists and who can get in.

### Step 1 · Name the successor (day 0, president, about 2 minutes)

- The president names the incoming officer (exists as `setIncoming`). This is the trigger, not a season date range.
- The incoming officer immediately gets read-only access to the dossier, open tasks and the assets list (exists for dossier and tasks).
- Platypus generates the **handoff packet automatically**: open items (tasks in flight, promises to outsiders, money in flight), the next 30 days of hard deadlines, people, assets, lessons. No AI needed.
- The outgoing officer gets one job: **answer the gap questions** (at most 6, already generated by `handoffQuestions.ts`), about 15 minutes. Answers join the dossier.

### Step 2 · Overlap (1–3 weeks while both are active; before finals in spring)

1. **One handoff meeting, 30–45 minutes, with the real materials open.** Platypus prints the agenda from the packet: open items → deadlines → people → watch-outs → "what went right". It ends with the newcomer's **read-back of the top 3 urgent items** (exists, move here).
2. **Left seat:** the newcomer watches one real task (exists as shadow).
3. **Right seat (new):** the newcomer does one small real task, the predecessor reviews it. This is also the **early win**.
4. **Assets move:** for each asset, the newcomer ticks "I can get in" (receiver confirms, P4). The old admin is removed only after Step 3.
5. **Buddy (new):** the president picks one officer from an upstream/downstream role (for example Events ↔ Finance). The reminder engine nudges them to check in.

### Step 3 · Transfer of authority (one confirmed moment)

- Outgoing: "Hand over". Incoming: "I have the role". The president sees a one-line receipt.
- **Gate:** every open item is marked "got it" or "unclear → question sent", and every asset is "I can get in" or has a named exception. **No handbook approval gate.**
- Open tasks move to the new officer **as owned in one step** (instead of each waiting as Not claimed), with a list the newcomer can push back on within 3 days.
- The predecessor becomes **former** (exists) and stays reachable for questions for 30 days ("alumni on call").

### Step 4 · First 30 days (just-in-time nudges, reusing the reminder engine)

| When | Who is nudged | What (one line each) |
| --- | --- | --- |
| Day 1 | New officer | Your first deadline is X; your first task is Y |
| Day 1 | President | 2 things to do today (manager checklist pattern) |
| Day 3 | Buddy | Check in with the new officer |
| 5 days before the first hard deadline | New officer + buddy | What is needed and from whom |
| Day 7 | New officer | Short review (exists) |
| Day 30 | New officer, then president | "What was missing?" → dossier lesson (exists) |
| Before the first fall deadline (if handed over in spring) | New officer | Re-entry: what changed over summer |

### Variants

- **Predecessor gone** (mid-term departure, graduated): the president answers the gap questions (exists as "speaks"), the dossier carries the rest; skip the overlap but keep the assets check.
- **President role:** the predecessor or the advisor runs the handoff meeting (Rotary's "immediate past president" pattern).
- **Whole-board turnover:** run Step 2 as one board session (fraternity transition retreat pattern): officer-to-officer pairs first, then a team session for cross-role dependencies.

### What this removes or demotes

- The AI handbook draft and its two sign-offs become **optional** ("Make a one-page summary"), not a gate.
- The season date range with 5 fixed checkpoints is replaced by the per-role trigger (names a person → the flow starts).
- The generic `WEEK_ONE` list is replaced by the role-specific, timed nudges above.

---

## 6. How this combines with the 11-21 ramp-up plan

| Ramp-up plan (11-21) | Slots into |
| --- | --- |
| "Before starting": fixed profile, predecessor's open-items sheet, president picks 2–3 tasks | Step 1 (packet is generated, not filled in by hand) |
| Day 1: red-line questions, role node cards, 1:1 handoff with read-back, first small task | Step 2 meeting + right-seat task |
| Day 2–3: scenario questions, buddy talk, task review | Step 2 overlap + buddy |
| Afterward: mini quiz on first real use, day 7/30 | Step 4 nudges |

Learning (what to know) runs inside the overlap; the handoff mechanics (what moves, when) are this report.

---

## 7. Constraints, risks and decisions needed

**Constraints**

- New stored items (assets list, buddy, right-seat task, transfer receipt) change `DemoState`; `SCHEMA_VERSION` changes need Juanxi's approval. Phase 3 data collection ended (PR #14 record), but new record items should still be checked against the IRB scope.
- **Security:** the assets list must never hold passwords, recovery codes or 2FA secrets. Fields are limited to name, location, admin holder names. It must not be sent to AI beyond names.
- Research-log guard (`handoffStage7.test.ts`) stays: the new flow must not read the interaction log.
- `/handoff` word limit is 120/120; the new flow should fit by removing the season chain and handbook steps.
- Dates for nudges come only from the rule engine.

**Decisions for Juanxi**

1. Remove the handbook approval as a gate for handing over (keep it as an optional summary)? *Recommended: yes.*
2. Add a per-role **assets list** (names and admin holders only, no passwords)? *Recommended: yes; highest value for student clubs.*
3. Add a **right-seat task** (newcomer does one task, predecessor reviews) next to the existing shadow? *Recommended: yes.*
4. Add a **buddy** from an adjacent role, nudged by the reminder engine? *Recommended: yes.*
5. Start the flow when a successor is **named**, instead of from season dates? *Recommended: yes; keep "Start handoff season" only as a bulk "name successors for all roles" helper.*
6. Move open tasks to the new officer **as owned in one step** at transfer, instead of each waiting as Not claimed? *Recommended: yes, with a 3-day push-back window.*
7. Build order: a clickable static mock first, or straight into code on this branch?

**Limits of the evidence:** almost no controlled research exists on student-club officer handoff itself; the strongest support is that the same mechanisms recur in the army, aviation, hospitals, on-call engineering, sales and membership nonprofits. The burden budget and nudge schedule are design choices and have not been tested with real clubs.

---

## 8. Sources

**Military, aviation, shift handoff**
- US Army, "Tennessee Guardsmen take a right seat ride": https://www.army.mil/article/36246/tennessee_guardsmen_take_a_right_seat_ride_with_the_unit_they_are_replacing
- US Army, "Taking the Baton: Preparing for Leadership Transitions": https://www.army.mil/article/288931/taking_the_baton_preparing_for_leadership_transitions_in_the_army
- US Army, "Optimizing Army leader changeover": https://www.army.mil/article-amp/289330/optimizing_army_leader_changeover
- Relief in place (overview): https://en.wikipedia.org/wiki/Relief_in_place
- AOPA, positive exchange of controls: https://www.aopa.org/news-and-media/all-news/2023/august/08/training-and-safety-tip-ive-got-it-youve-got-it-whos-got-it
- FAA Airplane Flying Handbook (FAA-H-8083-3B): https://atsb.gov.au/sites/default/files/2024-11/FAA-H-8083-3B.pdf
- GitLab, on-call handover: https://handbook.gitlab.com/handbook/engineering/infrastructure/team/ops/on-call-handover
- GitLab, handoffs and continuity: https://handbook.gitlab.com/handbook/engineering/devops/oncall/handoff-and-continuity/
- incident.io, async on-call handoff template: https://incident.io/blog/async-on-call-handoff-template
- Google SRE Workbook, on-call: https://sre.google/workbook/on-call/

**Open source**
- Kubernetes Release Team shadows guide: https://git.k8s.io/sig-release/release-team/shadows.md
- Kubernetes Release Team README and role handbooks: https://github.com/kubernetes/sig-release/blob/master/release-team/README.md
- CNCF, a release team shadow's experience: https://cncf.io/blog/2024/08/27/my-journey-as-a-kubernetes-release-team-shadow-insights-and-experiences
- Opensource.com, succession planning for FOSS leaders: https://opensource.com/article/18/4/passing-baton-succession-planning-foss-leadership
- FOSSHub, bus factor: https://www.fosshub.com/resources/maintainers/bus-factor/

**Companies and tools**
- Google manager just-in-time checklist (secondary): https://newsletter.ere.net/p/wow-googles-simple-just-in-time-checklist-improves-onboarding-results-by-25 ; MIT Sloan Management Review: https://sloanreview.mit.edu/?p=64798
- Microsoft onboarding buddy pilot: https://workplaceinsights.microsoft.com/?p=853 ; https://techcommunity.microsoft.com/blog/viva_insights_blog/every-new-employee-needs-an-onboarding-buddy/3862435
- GitLab onboarding and buddies: https://handbook.gitlab.com/handbook/people-group/general-onboarding/ ; https://handbook.gitlab.com/handbook/people-group/general-onboarding/onboarding-buddies/
- Rippling, role-based provisioning and offboarding (vendor): https://www.rippling.com/resources/the-it-heros-guide-automate-onboarding-and-offboarding ; https://www.rippling.com/blog/how-i-solved-it-jessie-bourg-offboarding-automation
- Guru, verification (vendor): https://help.getguru.com/docs/verifying-and-unverifying-cards
- Scribe vs Tango (vendor): https://scribe.com/library/scribe-vs-tango
- WalkMe, learning in the flow of work (vendor): https://www.walkme.com/blog/ai-in-workflow-learning/
- Whatfix, forgetting curve (vendor): https://whatfix.com/blog/ebbinghaus-forgetting-curve/
- Moveworks, AI agents for onboarding (vendor): https://www.moveworks.com/us/en/resources/blog/ai-agents-for-onboarding
- Oracle, onboarding with AI assistance: https://docs.oracle.com/en/cloud/saas/readiness/hcm/26c/hure-26c/26C-hr-wn-f44444.htm
- Amplitude, time to value: https://amplitude.com/blog/time-to-value-drives-user-retention

**Sales to customer success handoff**
- Vitally: https://www.vitally.io/post/5-tips-for-a-successful-sales-to-customer-success-handoff
- Rocketlane: https://rocketlane.com/blogs/sales-to-customer-success-handoff
- Pedowitz Group: https://www.pedowitzgroup.com/whats-the-handoff-process-from-sales-to-cs
- Sixteen Ventures: https://sixteenventures.com/sales-to-csm-handoff/
- Asana post-sales handoff template: https://asana.com/templates/for/sales/post-sales-handoff

**Leadership transitions and onboarding frameworks**
- IMD, hit the ground running (Watkins): https://www.imd.org/research-knowledge/articles/hit-the-ground-running-transitioning-to-new-leadership-roles/
- HBS Working Knowledge, a fast start on your new job: https://www.library.hbs.edu/working-knowledge/a-fast-start-on-your-new-job
- Partnership for Public Service, Agency Transition Guide 2023: https://presidentialtransition.org/wp-content/uploads/sites/6/2023/11/2023-Agency-Transition-Guide.pdf ; lessons learned: https://presidentialtransition.org/reports-publications/lessons-learned/
- Bauer's 4 Cs (SHRM Foundation, secondary): https://humaninterest.com/learn/articles/new-hire-onboarding-compliance-clarification-culture-connection/
- Knowledge exit interview (Miami University KM): https://miamioh.teamdynamix.com/TDClient/1813/Portal/KB/ArticleDet?ID=169474 ; ODI toolkit: https://odi.org/documents/1032/6443.pdf

**Membership nonprofits**
- Rotary PETS (district example): https://rotary7390.org/page/president-elect-training ; ABC's of Rotary: https://rotaryclubofeleuthera.org/Stories/abc-s-of-rotary
- Toastmasters club officer training schedule: https://www.toastmasters.org/Leadership-Central/District-Leader-Tools/Training/Club-Officer-Training-Schedule ; DCP FAQ: https://www.toastmasters.org/Footer/FAQ/Distinguished%20Club%20Program
- BoardSource, board officer succession: https://boardsource.org/resources/board-officer-succession/ ; term limits: https://boardsource.org/resources/term-limits/
- Volunteer onboarding (practitioner): https://volunteerhub.com/blog/from-volunteer-orientation-to-onboarding-a-framework-for-retention ; Encore toolkit: https://toolkit.encore.org/onboard-2/

**Fraternities and sororities**
- NIC, officer transition: https://nicfraternity.org/wp-content/uploads/2020/09/Officer-transition.pdf
- Phi Delta Theta, effective officer transitions: https://phideltatheta.org/news-stories/building-on-whats-been-built-the-importance-of-effective-officer-transitions/
- UVA Executive Board Transition Guide (2024): https://studentaffairs.virginia.edu/system/files/Executive%20Board%20Transition%20Guide%20(11-2024).pdf
- University of Memphis chapter transition retreat manual: https://www.memphis.edu/studentinvolvement/pdfs/fsa/chapterofficertransitionretreatmanual.pdf
- Mississippi State chapter transition checklist: https://greeks.msstate.edu/chapter-transition-checklist

**Universities, students' unions, platforms**
- UNLV officer transition: https://unlv.edu/sia/student-orgs/registration/officer-transition
- UNL, five common officer transition challenges: https://newsroom.unl.edu/announce/rso/18585/100723
- Ohio State leadership transition guide: https://activities.osu.edu/posts/documents/leadership-transition-guide-updated.pdf
- Notre Dame officer transition: https://www3.nd.edu/~sao/thesource/officertransition.html
- Wichita State leader transition: https://www.wichita.edu/student_life/student_engagement_belonging/student-organizations/leader-transition.php
- Loyola Chicago organization transition: https://www.luc.edu/studentengagement/recognizedstudentorganizations/aboutstudentorganizations/studentorganizationre-registration/organizationtransition/
- DePaul officer transitions: https://dehub.depaul.edu/OSI/officer-transitions/
- University of Missouri, transitioning leadership: https://getinvolved.missouri.edu/manage-your-organization/transitioning-leadership
- CU Boulder yearly transitions: https://www.colorado.edu/involvement/node/330
- Tufts, create a transition document: https://students.tufts.edu/office-campus-life/student-organizations/leadership-transition
- University of Southern Maine, social media admin changes: https://usm.maine.edu/office-of-marketing-and-strategic-communications/social-media-resources/social-media-account-administrator-changes/
- Students' Union UCL, hand over to your new committee: https://studentsunionucl.org/how-to/clubs-and-societies/how-to-handover-to-your-new-committee
- Southampton SU handover: https://susu.org/groups/admin/howto/handover
- Durham SU AGM and handover: https://www.durhamsu.com/student-group-resources/governance/agm-and-handover
- Anthology Engage, changing position holders: https://help.anthology.com/engage/en/changing-position-holders-in-your-organization.html
- Cornell IT, Google shared drive: https://it.cornell.edu/gsuite/google-shared-drive ; Texas A&M shared drive overview: https://service.tamu.edu/TDClient/36/Portal/KB/Article/476/Google-Shared-Drive-Overview
