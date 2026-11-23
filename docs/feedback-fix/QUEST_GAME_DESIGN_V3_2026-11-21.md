# Game design v3: Mission: Speaker Night (interactive film, review version, 2026-11-21, Claude)

**What changed:** Juanxi found v2 (`QUEST_GAME_SPEC_2026-11-21.md`) too much like a quiz. v3 is an **interactive film with a mission-control headquarters**: the story moves forward, the player drags, places, builds and turns things, text is minimal, and consequences are shown as animation. v2's 33 rules and their sources are **kept in full** as the rule library and are embedded in the interactions below (v2 numbering is reused, for example 2.5).
**Status update, November 22, 2026:** the 33-rule library and P1 pipeline are complete. Juanxi approved all nine recommended design decisions; six [P3 static storyboard references](../quest-build/storyboards/p3-v1/README.md) are ready for visual acceptance. Scene/game implementation has not started. The questions in section 11 are retained as the original review record; current approvals are in [P3_DESIGN_DECISIONS.md](../quest-build/P3_DESIGN_DECISIONS.md).

**Inspiration and IP boundaries:** v3 borrows genre techniques only: a mission-control headquarters (like the control tower in children's animated series), cinematic cutscenes, and Market Marshes' "play a real professional, make real decisions, iterate". It uses **no** characters, names, visuals, music or levels from PAW Patrol, Google's AI Quests or any other existing work; all characters, art and story are original. Scenes **never show ASU's real logo or sunburst** (the handbook itself forbids student organizations from using them).

---

## 1. In one sentence

> You are a newly elected officer. The club's **Club HQ** has just switched on, and the big screen counts down 49 days. Across seven missions you build the crew, lay out the timeline, manage the money, deal with the speaker, set up the room, run the night, and wrap up and hand over. Get it right and the film continues; get it wrong and you **see the consequence happen**, then press **Rewind** to go back to that moment.

---

## 2. Experience principles

| Principle | How |
| --- | --- |
| **Do, don't read questions** | Every rule is hidden inside an action: drag, drop, pour, turn, stamp, place furniture. No "pick A/B/C" cards |
| **Minimal text** | Each screen's instruction is at most 12 English words; character speech bubbles at most 10 words; the rule text sits behind a **Why?** button (1–2 sentences). At most 120 visible words per mission |
| **Show consequences** | A mistake is never a red "wrong" message. The game fast-forwards: a **CANCELLED** stamp lands on the room door, a receipt is crumpled, lights go out one by one; then **Rewind** appears |
| **Playing house, for college students** | A room you can freely arrange, a theme and colors to pick, an event name to write. No stickers, no cartoon medals; characters are adult students |
| **Cinematic** | Cutscenes use letterbox bars, camera push-ins and pans, time-lapse (calendar pages flipping) and lighting changes. Each mission opening is at most 20 seconds and can be skipped |
| **Outcome feedback, not points** | No points or badges. HQ shows three gauges, **Turnout**, **Budget** and **Safety**, which rise when the player does the right thing. The ending is a campus newspaper front page |

---

## 3. World and characters

**Club HQ** (main scene): a converted club room with a big screen (countdown plus the event's flow chart) and four workstations the player can enter:

| Workstation | What is inside | Interactions |
| --- | --- | --- |
| **Countdown Wall** | A timeline from today to event day; red danger zones are computed by the rule engine | Drag task blocks |
| **Money Desk** | Shopping cart, budget jars, funding forms | Drag, pour, stamp |
| **Comms** | Phone and inbox; messages from teammates, the speaker and vendors | Swipe, forward, decline |
| **Venue Table** | A 3D model of the event room | Place furniture, run checks |

**Characters** (original, one consistent art style):

| Character | Role | Part in the story |
| --- | --- | --- |
| **You** | New officer (shown with the player's real role) | Protagonist |
| Taylor | Treasurer | Asks for materials; money rules show through her reactions |
| Morgan | Marketing | Always wants to post early; publicity rules |
| Riley | Events | Booking, food, running the night |
| Sam | Secretary | Roster, check-in, attendance list |
| Alex | President | Hands out the mission at the start; reviews it at the end |
| Dr. Lee | Advisor | The moments when the advisor must be present |
| **Pip** | HQ's AI guide (a small platypus icon with a speech bubble) | Gives hints only; tapping Pip opens Ask; never gives the answer |

**Art direction:** original flat vector illustration with adult proportions, warm desert-campus sunset colors plus Platypus teal. Scenes use an isometric (45° top-down) view, like a polished tabletop model or a "dollhouse", with restrained colors and clean lines. No real photos, no stickers.

---

## 4. Interaction library (10 types)

| # | Interaction | What the player does | How the rule is built in |
| --- | --- | --- | --- |
| I1 | **Crew Board** | Drag teammate cards into role slots; only three glowing **Top 3** badge slots exist | Only the Top 3 can submit; training lights |
| I2 | **Countdown Wall** | Drag task blocks onto the timeline; blocks snap into place | A block in a red zone is too late; wrong order greys out the blocks that depend on it |
| I3 | **Handoff Tray** | Drag documents onto a teammate's desk | The right item: the teammate nods and starts work. The wrong item: the teammate holds it up, "I'm stuck" |
| I4 | **Budget Jars** | Add items to the cart and watch the jar drain; try pouring one jar into another | Over $700 the jar overflows red; the lid snaps shut when pouring |
| I5 | **Phone & Inbox** | Messages pop in; swipe right to handle, left to decline, long-press to forward | Temptations: a flash sale, "Sign here", home-made cookies |
| I6 | **Venue Builder** (section 5) | Place furniture, cables and a theme in the room model | Exits, catering location, aisles, accessibility |
| I7 | **Flyer Fix-up** | Tap the mistakes on a poster | "@", a logo look-alike, an over-budget print order |
| I8 | **Live Moment** | Turn a volume knob, watch the clock, dial a phone | No amplified sound after 9 p.m.; call 911 first |
| I9 | **Receipt Rush** | Drag receipts into the Business Office tray; day 10 is marked on the calendar | Receipts within 10 days |
| I10 | **Time Capsule** | Write three lines for the next officer | Saved to the handoff file |

Every drag has a keyboard alternative (select, arrow keys, Enter to drop); on phones the player taps an item, then taps the target.

---

## 5. Venue Builder (the signature interaction)

**Scene:** a generic multipurpose room (not a real floor plan) in isometric view on a grid floor. Fixed: two exit doors, power outlets and a projection wall.

**Furniture and props (drag in):** podium, projector screen, chair rows (a "Theatre rows" brush lays a whole row at once), round tables, registration table, catering station, speakers and microphone, cable covers, accessible-seating markers, reserved front-row markers, signs, photo backdrop and trash bins.
**Free creation (no wrong answers):** theme color, lighting (warm, cool, stage), backdrop pattern, tablecloth color, and the event name shown on the screen.

**Live checks** (six lights in the top-right corner, turning green or red while the player builds):

| Check | What the player sees when it fails | Source |
| --- | --- | --- |
| Head count within room capacity (80 / capacity) | The counter turns red; extra chairs shake | "Designated maximum capacity for any event will not be exceeded at any time." (R015 L2401) |
| Exits and exit aisles not blocked | A blocked door flashes red | "Exit aisles, staircases, fire alarm systems and emergency exits may not be blocked at any time." (R015 L2401) |
| Catering inside the room, not in the hallway | A hallway buffet greys out with a cross | "All catering must be set up inside the reserved space. Food buffets are not permitted in the hallways." (R015 L2392) |
| Theatre seating has center and side aisles | Rows missing an aisle are highlighted | "A Theatre Setup includes chairs set up in straight lines, with proper spacing between rows, center and side aisles." (R014 L2277) |
| Accessibility: walkways at least 36", accessible seating, reserved front seats for deaf and hard-of-hearing guests, screen visible | Dotted hints appear in the right places | ASU Event Planning Accessibility Checklist (R019 L3576–3582) |
| Cables crossing walkways are covered | The cable flashes | "Electric power cords crossing walkways and aisles are covered." (R019 L3584) |

- The first four are **venue rules**: the player cannot "Lock the layout" until they pass. The last two come from the school's **accessibility checklist**; the game also requires them (the standard of a good event), and the card states that the source is a checklist.
- After locking: the camera pushes in, the lights come up, and a five-second animation shows guests arriving. The layout is **saved to this event's Plan**, so it can be reused and edited for a real event.

---

## 6. Story: prologue, seven missions and credits

Every mission follows the same beat: **briefing cutscene (≤20 s) → hands-on → fast-forward → outcome cutscene → Rewind on a mistake → Why? (rule text) → the flow chart on the big screen lights up**.

| Part | Name and film moment | Hands-on | Embedded rules (v2 numbers) | Consequence shown on a mistake |
| --- | --- | --- | --- | --- |
| Prologue (40 s) | An empty club room at night; the lights come on one by one; Alex's message on the big screen: "Speaker Night. 49 days. It's yours." | Switch HQ on | — | — |
| 1 **Assemble the Crew** | A busy club fair | I1: drag people into the three Top 3 slots and other roles; light each person's training; Sam's roster shows 8/10, so drag two new members in from the crowd | 1.1 only the Top 3 submit; 1.2 anti-hazing training for all officers; 1.3 one Top 3 officer passes appropriations training with 100%; 1.4 funding needs at least 10 members | Taylor submits the budget and the reviewer's light on the far screen goes dark: "Not considered." |
| 2 **Lock the Date** | The Countdown Wall lights up at 49 days | I2: drag Event Registry, Room request, RITM → Student Unions, Advisor invite and Instagram teaser onto the timeline; I5: Morgan asks "Post the teaser now?" | 2.1 register first (30 days); 2.2 publicize only after approval; 2.3 the advisor cannot request in Mazevo; 2.4 room request at least 16 days ahead; 2.5 RITM at least 14 days ahead; 2.6 the advisor must attend when there is a speaker | Fast-forward to 12 days out: a "CANCELLED" stamp on the room door and a fee notice floating out; or an "Event postponed" email under the Instagram post |
| 3 **The Money Run** | The Money Desk; Taylor carries a stack of empty folders | I3: drag the "date/place/head count" card and the "quote screenshot with tax and shipping" to Taylor (the "rough total" sticky note comes back); I4: a $701 cart overflows the $700 jar, so remove something; try pouring the pens jar into the flyers jar; I5: "Flash sale – buy now?" pops up; the "Expedited" shipping option is locked | 3.1 what to give the Treasurer; 3.2 six weeks when a speaker is involved; 3.3 the amount must equal the approval; 3.4 no moving money between lines; 3.5 nothing bought before approval; 3.6 expedited fees are prohibited; 3.7 attach the flyer to the purchase request | A receipt is crumpled into the trash: "Not reimbursed."; or the budget form is stamped "Ineligible – late" |
| 4 **The Speaker & the Feast** | An email from the speaker's agent in the inbox, with a glowing "Sign here" attachment | I5: drag the contract to the "Business Office" outbox (don't sign); drag the $6,000 fee onto the funding form, which stops at $5,000; spin the "Bill to" dial to ASU; I5: pizza from a delivery app vs. the Sun Devil Hospitality menu; someone brings a plate of home-made cookies (swipe left to decline politely); I3: drag Sam's attendance list and Dr. Lee's signature onto the Business Meals Form | 4.1 speaker cap $5,000; 4.2 students don't sign contracts; 4.3 invoices billed to ASU; 4.4 Memorial Union's exclusive caterer; 4.5 no home-made food; 4.6 meals form, attendee list and signatures | After signing: a "lawyer's letter" cutscene, "You may be personally liable."; the delivery pizza is stopped at the room door |
| 5 **Set the Stage** | The Venue Table; the room model rises out of the table | **I6 Venue Builder** (section 5); I3: wait for Riley to hand "Approved + RITM" to Morgan; I7: tap "@ ASU", a logo look-alike and a $600 print order on the poster; drag the T-shirt order to a "Licensed vendor" | 5.1 approval details go to publicity; 5.2 naming and logo; 5.3 printing at most $500; 5.4 licensed vendor and logo flag; the six venue checks | A blocked exit flashes red and a firefighter silhouette shakes its head; the poster is stamped "Not approved" |
| 6 **Showtime** (event night) | The most cinematic part: guests arrive, lights change, the speaker takes the stage | I8 live: an arrival counter; at 8:50 p.m. the DJ wants to keep going, so turn the volume knob and watch the decibel meter (75 dB line) and the clock (9:00); someone in the audience collapses and a phone dial pad appears (no timer by default); Morgan wants to sell $2 raffle tickets, so flip the switch to "Free door prize" | 6.1 no amplified sound after 9 p.m., at most 75 dB; 6.2 call 911 first and say you are on an ASU campus; 6.3 no paid raffles; 2.6 callback: Dr. Lee is present | The Safety gauge drops and an alarm light flashes; then Rewind |
| 7 **Curtain Call** | A week later, the empty room being cleared | I9: drag scattered receipts into the Business Office tray (day 10 is marked); at semester end the leftover $150 jar "evaporates" on camera; Taylor's folder warns that missing paperwork means the approval is withdrawn; I10: Time Capsule, three lines for the next officer | 7.1 receipts within 10 days; 7.2 no rollover; 7.3 missing paperwork rescinds approval; 7.4 handoff reflection | The jar empties as the semester page turns; an "Approval rescinded" stamp |
| Credits | Campus newspaper front page: "Speaker Night packs the room" (or a different headline depending on the gauges); the credits that roll are the player's **complete event flow chart**: "Produced by ___" | Take a screenshot or save the plan | — | — |

**Length:** prologue and cutscenes about 4 minutes in total; about 6–8 minutes of hands-on per mission; about 55–60 minutes overall. **Day 1: prologue plus missions 1–4. Day 2: missions 5–7 plus credits.** All cutscenes can be skipped.

**Sequels (formerly "replay with a twist"):** five short episodes of 6–8 minutes each, using the same HQ with a new script: *Finals Week* (the event may run but cannot get USG-T funding), *The Sponsor Table* (tabling with an active sponsor becomes an event), *Movie Night* (public viewing rights), *Open to the Public* (300 people; a university representative and the advisor present throughout), *Road Trip* (no 12- or 15-passenger vans; a personal-vehicle driver assumes all liability). Sources are listed in v2 section 4.

---

## 7. Text budget and rule cards

- Instruction examples: *Drag each task onto the countdown.* / *Hand Taylor what she needs.* / *Fill the jar — don't spill it.*
- Line examples: Morgan: *"Teaser goes up tonight?"* Taylor: *"I can't file this without the quote."* Riley: *"Room's gone. We never sent the number."*
- **Why?** appears after each action. Tapping it shows 1–2 sentences of rule text plus "Open in Handbook". It is collapsed by default; curiosity comes from the consequence the player just saw.
- At most 120 visible words per mission, measured the same way as `npm run words`.

## 8. Animation spec

| Type | Where | Notes |
| --- | --- | --- |
| Camera moves | Briefings, outcomes, credits | Layered scenes (background, characters, foreground); push-ins and pans use transform only; letterbox bars fade in |
| Time-lapse | End of each mission | Calendar pages flip and the countdown digits roll |
| Stamp, light up, go dark | Outcomes | APPROVED, CANCELLED, Not reimbursed; flow-chart nodes on the big screen light up in sequence |
| Rewind | After a mistake | The picture plays backward for 0.8 s (blur plus reverse) to the moment before the action |
| Drag feel | All drag and drop | Existing spring curve (`--spring-ui`) for landing |

- Follows AGENTS.md motion rules: animate only transform and opacity, and use only duration tokens. **Juanxi's approval is needed for a few new "cutscene" duration tokens**: the longest existing token is 450–480 ms, and cutscenes run 2–20 seconds.
- **Reduced-motion mode:** cutscenes become 3–4 still storyboard frames with captions, and Rewind becomes a direct cut back. Function is identical.
- **Sound:** optional light sound effects and music, off by default (for playing in libraries and classrooms) and on with one tap. All lines have captions.

## 9. Technical approach (summary)

- A separate lazy-loaded page, `/quest`, in its own bundle, so the home entry bundle does not grow.
- React with SVG scenes and the Web Animations API; drag follows the existing pointer-drag code; **no game engine** (size and maintenance cost).
- All dates come from the rule engine (`schedule.ts`); the big-screen flow chart reuses `MetroChart`; the venue layout is saved as an attachment to the event.
- Rule library = v2's 33 rules (with source quotes and line numbers). Each interaction references only rule-library IDs; Pip may cite only the rule library and handbook text.
- Data: as in v2 section 7 (first-try result, retries and time for each action; retests; escalated questions), plus the venue layout and the time capsule.

**Art production:** about 12 scene backgrounds, 7 characters (5–6 expressions or poses each), about 40 props and the venue-builder kit. Recommendation: **all code-drawn SVG vector art** (controllable, light, recolorable, no licensing problems). For a more "film" look, AI-generated background paintings are possible, but each one must be reviewed and must contain no real logos or identifiable real people.

## 10. Build steps

| Step | Content | Why this order |
| --- | --- | --- |
| 1 Static storyboards | HQ main scene, Mission 2 Countdown Wall, "CANCELLED + Rewind", Venue Builder, a Showtime live moment, the credits newspaper and roll (6 images) | Check the art style and feel first |
| 2 Playable sample | Prologue, HQ, Mission 2 and Mission 5 (Venue Builder) | The two most representative missions; test with 3–5 real officers |
| 3 Full seven missions and credits | The remaining missions, the day-3 retest and the president summary | Expand after sample feedback |
| 4 Sequels | Five short episodes | — |

## 11. Questions for Juanxi

1. **Names and tone:** *Mission: Speaker Night*, Club HQ, the guide Pip, six teammates. OK?
2. **Art style:** code-drawn flat vector isometric models (recommended), or AI-generated backgrounds for a more cinematic look?
3. **Length:** about 55–60 minutes over two days, or cut to about 40 minutes (dropping parts of missions 1 and 7)?
4. **Venue Builder:** require the two accessibility checks (from the school checklist) as well. Agree?
5. **Sound** off by default. Agree?
6. **The emergency moment on event night:** add time pressure? Recommendation: no timer by default, optional to turn on.
7. **First playable sample:** Mission 2 plus Mission 5. Agree?
8. **Cutscene duration tokens:** approve new 2–20 second tokens used only in `/quest`?

After review, the next step is the six static storyboards in section 10, step 1.
