# R1 contract: Cheers (2026-11-26)

Phase R1 of `CHEERS_TEAM_PROGRESS_PLAN.md`. Juanxi approved the final screens and all three suggestions on 2026-11-26. The screens are the specification: `docs/prototypes/cheers-r1-final/` (README lists them; F1–F7). Interface text is English.

## 1. Already done in stage A (main agent; do not edit these files)

- `src/data/types.ts`: `Cheer`, `CheerBook`, `CheerPoints`, `CheerCard`, `DemoState.cheers?`; `Notice.kind` gains `"cheer"` and `Notice.cheerId?`; `ActivityKind` gains `"cheer.withdrawn"`.
- `src/data/cheerRules.ts`: every number and word list (points, cards, note 10–280, 5 recipients, allowance 200 / 500, at most 3 cards at once, weekly line Monday–Wednesday, quick starts).
- `src/data/cheers.ts` and `src/lib/cheerMail.ts`: **frozen names and signatures with simple placeholders.** The interface agent builds against them; the model agent replaces the bodies.
- `src/data/store.tsx`: action `{ type: "cheerAction"; action: CheerAction }` (in `READ_ONLY_OK`, so incoming officers can mark their cards seen; `changeCheers` enforces who may send); reducer case calls `changeCheers(state, action, state.viewerId)`; log payload with IDs and numbers only (never the note); load, reset and import call `withSanitizedCheers`; first-time setup drops the old club's cheers (also in `src/data/settings.ts`).
- `src/components/rail/RailContext.tsx`: rail kind `{ kind: "cheer"; toIds?: string[]; nodeId?: string }`.
- `src/lib/aiContext.ts`: cheer notices are excluded from `yourUpdates`; cheers are never in AI context.

## 2. Rules (both agents)

| Rule | Behavior |
| --- | --- |
| Who sends | Current officers (`isOfficer`). Incoming officers receive but do not send; former officers neither send nor receive. Nobody cheers themselves. |
| Note | Required. Trimmed length 10–280. Stored as written (trimmed). |
| Points | One of 10 / 25 / 50 / 100 per recipient. |
| Recipients | 1–5 distinct, all able to receive. |
| Allowance | Sum of `points × recipients` of the sender's non-withdrawn cheers sent in the current demo week (Monday–Sunday of `today`) ≤ 200, or 500 for a president or VP (`fn` "president" or "vice_president"). Unused points expire. Receiving is unlimited. |
| Term totals | "This term" = the period in `TERMS` (`src/engine/calendar.ts`) that contains `today`, else the latest one that ended before it, else everything. Received = sum of `points` of non-withdrawn cheers to the person in the term; given = `points × recipients` sent. |
| Privacy | A cheer is visible to its sender and recipients only. No public list, ranking or count of other people's cheers anywhere (the weekly line shows delivery names from the activity record, not cheers). |
| Withdraw | The sender only, on the same demo date it was sent. A withdrawn cheer is hidden, counts for nobody, and its unread notices are marked read. |
| Seen | Each recipient's card shows once: `markSeen` adds them to `seenBy`. Also mark the matching notice read. |
| Notices | One `kind: "cheer"` notice per recipient, `cheerId` set, `nodeId` the cheer's task or `""`, text without the note: "<First name> sent you <points> points." |
| Activity | `cheer.sent` (actor sender, personIds recipients, nodeId when set, facts `points`, `recipients`, `noteChars`, `card`, `email`) and `cheer.withdrawn` (actor sender, personIds recipients, fact `cheerId`). Never the note text. |
| Weekly line | President and VP only, Monday–Wednesday of the demo week, not dismissed this week: the people (other than the viewer) with a `task.done` this week that was on time and has details or files (`deliveredWithDetails` in `src/lib/activityQuery.ts`, then `onTime`; amended at integration to match screen F7), at most 5, in name order; null when nobody. "Thank them" and closing both dismiss it for the week. |
| Thank prompt | On a task with status `done` whose owner can receive and is not the viewer, when the viewer can send. |
| Email | `cheerMail`: subject `⭐ <Sender first name> sent you <points> points`; body (plain text, at most 80 words besides the note): greeting with the recipient's first name; "<Sender> sent you <points> points" plus " for <task title> (<event name>)" when a task is set; a blank line; `Why: “<note>”`; a blank line; "See your card:" and the link `cheerLink(baseUrl, id)`, which opens the F5 card. No running total. The interface opens it with `composeUrl("email", body, subject)` from `src/lib/nudges.ts`. Nothing is sent by the app. |

## 3. Data shape and IDs

`DemoState.cheers = { cheers: Cheer[]; weeklyLineDismissed?: Record<personId, mondayISO> }`. IDs `ch-<n>` from `nextCounter`. `SCHEMA_VERSION` stays 23.

## 4. Agent R1-M (model)

**Owns:** `src/data/cheers.ts`, `src/lib/cheerMail.ts`, `src/data/activity.ts` (add the two cheer kinds), new `src/data/cheerSeed.ts` plus at most one line in `src/data/seed.ts` that adds fictional cheers to the **v2 seed only** (so the demo shows the card; legacy fixtures unchanged), and tests `src/test/cheers*.test.ts`.

- Implement every function in `cheers.ts` per §2, keeping the frozen signatures: `changeCheers` (send, withdraw, markSeen, dismissWeeklyLine; return `state` itself when refused or unchanged), `cheersOf`, `visibleCheers` (newest first), `allowanceOf`, `receivedThisTerm`, `givenThisTerm`, `unseenFor` (oldest first), `canSendCheers`, `canReceiveCheers`, `cheerRecipients` (people who can receive, not the sender, in name order), `validateCheer` (short English messages: "Write at least 10 characters.", "Keep it under 280 characters.", "Choose who to cheer.", "Up to 5 people at a time.", "Only 25 points left this week." etc.), `weeklyLine`, `thankPromptFor`, `withSanitizedCheers` (drop malformed cheers, unknown people, bad points or cards, over-long notes; dedupe IDs; keep valid ones; return `s` when unchanged).
- `cheerMail.ts`: `cheerLink`, `cheerMail` per §2.
- Seed: about four fictional cheers among the seed officers in the current week and term (so Maya's card shows received and sent rows and an allowance in use), none unseen for the president at start.
- Tests through the real `reducer`: every rule in §2 (allowance by week and role, Monday reset, term totals, privacy of `visibleCheers`, withdraw same day only, markSeen by an incoming officer, former officers refused, notices without the note, activity events without the note), sanitizing of hostile imports, the email text, `weeklyLine` window and dismissal, `thankPromptFor`, and a research-log guard: after `loggedReducer` sends a cheer, the log contains no part of the note.

## 5. Agent R1-U (interface)

**Owns:** new `src/components/cheers/*`, new `src/styles/ch-01-cheers.css`, `src/pages/Team.tsx`, `src/components/rail/Rail.tsx` (render the `cheer` kind), `src/components/TaskDetail.tsx` (the thank prompt, F4), `src/pages/Today.tsx` (the weekly line, F7), `src/components/PrivateInbox.tsx` (cheer notices open the card), `src/components/Layout.tsx` or `src/App.tsx` (mount the received-card overlay once), and new `e2e/cheers*.spec.ts`.

- Build F1–F7 as in the images, reusing `src/components/ui/` primitives, `.card`, `.btn`, `.chip`, `.avatar`, design tokens (`docs/DESIGN_TOKENS.md`), reduced motion, keyboard and focus rules (AGENTS.md §6).
- F1: on Team, the Contributions card is no longer rendered (keep its code and data; it returns later for the president only); in its place, for every viewer, **Your cheers** ("Only you see this"): received this term, allowance left with a meter, the 3 latest visible cheers (note on at most two lines), **View history** and **Give points**. Empty state: one short line and Give points.
- F2: the right-rail Details form for `{ kind: "cheer" }`: To (select, or chips for several), For a task (optional select of the club's tasks), points chips, quick starts that insert their phrase into the note, the note (`data-log-name="cheer-note"`, counter, required hint), card style, Also email, Send (disabled until `validateCheer` returns null; show its message). On send: dispatch, toast "Cheer sent.", and when Also email is on open the draft from `cheerMail` with `window.location.href` as `baseUrl`. Withdraw is offered on the sender's own cheer in history on the same day.
- F3: history dialog (focus trapped, Escape closes, returns focus), All / Received / Sent, grouped This week / Last week / Earlier, the privacy line.
- F4: the thank prompt in Task Details for `thankPromptFor`, opening F2 with the owner and task.
- F5: received cards, centered, once: on app load and when new ones arrive for the viewer, show `unseenFor` (at most 3, "1 of N", Next, then Close; when more than 3, the last says "N more on Team"); closing marks shown ones seen. The link `#/?cheer=<id>` opens that card for its sender or recipient (others see nothing).
- F7: on the Reminders home for president and VP when `weeklyLine` is not null: one line with **Thank them** (opens F2 with those people) and a close button; both dismiss for the week.
- Word limits must hold without raising any limit: Team visible ≤ 130 (today 117), "/" visible ≤ 200 (today 127). Measure with `npm run words` and adjust copy, not limits.
- Browser tests: the flows above on desktop and mobile, including the "at most 3 presses with a typed note" path (open, type, Send), privacy (a third officer sees none of another pair's cheers), the once-only card, the email draft link, and axe with no serious or critical issues.

## 6. Gates

`npm run lint`, `npm run build` (entry ≤ 550,000 bytes; keep new UI in a lazy chunk where possible), `npm run typecheck:netlify`, `CI=1 npx vitest run` (full), affected browser specs on desktop and mobile (`PW_CHROMIUM=/opt/pw-browsers/chromium`, `--trace off`), `npm run words`, axe in light and dark. No AI calls, no real email, fictional data only.

## 7. Rollback

One merge commit per agent. `DemoState.cheers` is optional; an older build reads a v23 save verbatim and keeps the field.
