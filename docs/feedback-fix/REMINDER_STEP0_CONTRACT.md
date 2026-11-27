# Reminders step 0 and editable emails: contract (R-S0)

**Status:** approved by Juanxi on November 27, 2026 (America/Phoenix); in progress. Baseline `2c5c312` plus Stage A (this file, and `PersonRow` and `YourReminders` moved out of `src/pages/Today.tsx` without behavior changes). Source review: [Reminders interaction review](https://claude.ai/artifact/3biTLyJ94vj6Z6EBbBet9L) (Chinese, private to the owner), four read-only agents on November 27.

## 1. Juanxi's decisions

1. Do step 0 of the review now: fix the P1 and P2 findings that need no product decision (section 3).
2. The president or VP can edit an email before it goes out: add a personal line, change wording or the subject. A row of a person opens the email as a simple compose box, Gmail-like, with nothing more than the text fields and basic controls.
3. Editing must not lose a task link by accident. Undo is the minimum; the box also protects links (section 4).
4. Later, not now: send through the president's own Gmail account (Gmail API in the background) or through a Platypus mailbox. Both need a server, real accounts, Google OAuth review and mailbox setup; today nothing is really sent (AGENTS.md §3). The data shape below keeps the edited subject and body so either path can reuse it.
5. Juanxi liked the simplicity of option 1 (outbox with undo); the undo-send window and the option 6 restructuring are step 1, after acceptance of this work.

## 2. Work packages and file ownership

| Package | Owns | Must not change |
|---|---|---|
| W1 logic and accessibility | `src/pages/Today.tsx`, `src/reminders/centre.ts`, `useAutomaticReminders.ts`, `DigestPanel.tsx`, the head of `PersonRow` (toggle, heading, Send button, status note) | the email area of `PersonRow`, CSS files |
| W2 visual and mobile | `digest-centre.css`, `centre.css`, `src/reminders/YourReminders.tsx`, the task list in `PersonRow` (`dg-tasks`), the `Mail` component's markup in `DigestMail.tsx`, the floating Ask button's clearance | send logic, the reducer |
| W3 editable email | new `src/reminders/draft.ts` and `src/reminders/DraftEditor.tsx`, the email area of `PersonRow` (`dg-inline`), `digest.ts` and the `recordReminderDigests` reducer path, `digestContracts.ts`, the data dictionary | the engine, limits, statuses |

Each package works in its own worktree, adds regression tests for what it changes, runs `npm run lint`, `npm run build`, the affected unit tests and the affected browser specs on desktop and mobile, and commits small English commits. An integration step merges W1 → W2 → W3, then an independent read-only review, then fixes.

## 3. Step 0 fixes (W1 and W2)

W1:
- Stable order: rows keep the order of the page's first render for the visit; a sent row is marked in place, never moved under the pointer (`centre.ts` sent-first sorting).
- Focus: after Send all, focus moves to the summary line (`tabIndex=-1`), never to `body`.
- Send all names its count: "Send 3 emails" (accessible name the same).
- One feedback line inside the summary card, always mounted, cleared on the next action. It counts today, not only this click: "Sent to all 3 today." or "Sent to 2 people. 1 was sent earlier today." The per-row "Sent to Maya." note goes once the row shows Sent.
- Held tasks: a person's row says "+N in the next email" when a limit moved tasks to that person's next email (`held`, per person; no new record type).
- Automatic mode: "Sent automatically to N people today." and failures listed apart; never "Nothing to send today." beside "Sent automatically".
- Invalid or legacy plan: a short reason plus one action (Settings link or the existing recovery path); no blank page.
- History → Follow up opens that person's row on the home page (and its email) instead of a second send flow in the rail. `DigestPanel` keeps no separate Send & next; History stays in the rail.
- Accessibility: one page-level polite status region, always mounted; `aria-busy` on the people list only; each person's name is a heading (h3) containing the disclosure button; button names include the task or person ("Choose who this waits on: <task>", "Send to Maya"); Fix first heading reads "Fix first, 8" to a screen reader.
- Fix first buttons say what they do. Where the action only opens the task, the visible label stays short but the button opens the right part of Task Details when one exists (owner picker for Assign; waiting details for Waiting); otherwise its name is "Open task: <title>". "Assign" must never claim the task for the viewer.

W2:
- Task titles wrap on narrow screens; the reason chip moves under the title below about 600px (replace the 860px breakpoint for these rows so iPad keeps one line).
- Reminder reasons ("5 days overdue", "No start update") use one neutral chip style; status words that are real task statuses ("Stuck", "Not claimed") use `StatusPill` with the fixed colors. "Late to start" becomes "No start update" (factual wording, `REMINDER_EMAIL_RESEARCH_2026-11-18.md`); "No owner" shows as the Not claimed status.
- Risk: no red ✕ on this page. Show "At risk" as text after the title (one tab stop fewer, read after the title); the shared `RiskDot` component stays unchanged for other pages.
- The email subject in previews is plain text, sans serif, not a heading; the page title keeps the serif.
- The floating Ask button never covers an action: the page keeps bottom padding equal to the button plus the safe area on phones.
- Member view: no "To <your own name>"; a line for an email due today ("Today you get 1 email about: <titles>") before Coming up; no empty indent gutter.

## 4. Editable email (W3)

**Where.** In the review modes (`review_then_auto`, `review_then_self`, and no mode chosen), opening a person's row shows a compose box instead of the read-only preview: To (read-only), Subject (one line), Body (auto-growing textarea), then a small toolbar: Undo, Redo, Restore original, and the mode's action. `auto_email` shows the read-only preview. Nothing else (no formatting, attachments, CC).

**Task links as tokens.** The body shows each task link as a readable token on its own line, for example `[Open task: Reconcile September receipts]`, never the long signed address. Tokens are turned back into the exact signed URLs only when the email is recorded or handed to Gmail. A token that is deleted or altered counts as missing.

**Protection.**
- A list under the box names each missing link ("Missing link: Book the spring weekly meeting room") with one "Put back links" button that reinserts every missing token at the end of the body, as one undoable step.
- Send, Open in Gmail and Send all are disabled for an email with a missing link, and say why.
- Undo and Redo keep their own history (typing grouped by pauses of about 500 ms or word boundaries, every Put back and Restore one step), with Ctrl/⌘+Z, Ctrl/⌘+Shift+Z and Ctrl+Y. At least 100 steps per email.
- Restore original brings back the rule-written email as one undoable step.
- Limits: subject 1–120 characters; body at most 2,000 characters; no web addresses other than the tokens (extra links would be labelled "Open task" in the email). Each limit shows a short message, never a silent cut.

**State.** Drafts live in memory for the browser tab, keyed by digest group id, outside the row component, so collapsing a row, opening another row or visiting another page keeps the edit (and the Gmail "draft opened" flag that shows I sent this). A reload loses unsent edits; that is stated in the code comment, not on the page. When the rule-written email for a group changes after editing (a task changed), the box keeps the edit only if the same task links still apply, and shows "This email's tasks changed. Review it before sending." with Use new email; otherwise it shows the new email and says the edit was replaced.

**Recording.** `recordReminderDigests` accepts an optional edited subject and body per group. The reducer still rechecks context, mode, sender, lead rights, grants, limits and the rebuilt rule-written email; for an edited group it also checks that the body contains every task URL of that group exactly as granted, the limits above, and no other URL. The saved `ReminderDigestSnapshot` keeps `subject`, `body` and `text` as sent and adds optional `edited: true` with `original: { subject, body }` (the rule-written version). No `SCHEMA_VERSION` change; old snapshots stay valid. History shows the email as sent with a small "Edited" label. Send all sends each person's current draft (edited or not) and stops with a named reason if any draft has a missing link. Open in Gmail uses the draft (tokens expanded) and fills To with `composeUrl(..., to)`.

**Privacy and research logging.** Typed subject and body are never logged (`src/lib/uiLog.ts` already ignores typed values; verify for the new fields and give the toolbar buttons stable `data-testid`s). The research export may count `edited` emails, never their text. Update `docs/PHASE3_DATA_DICTIONARY.md`.

**References.** No new dependency. Open-source compose boxes and undo-history patterns may be studied for approach only (for example the undo stack in Lexical's history plugin or the compose box of open-source Gmail clients); no code is copied, and the packages consulted are listed in the handoff.

## 5. Out of scope

Real sending (Gmail API, Platypus mailbox), scheduled delivery, the undo-send window, option 6 restructuring, moving Fix first to Plan, an "outside dependency" category, schema version changes, AI-written email text, edits in `auto_email` mode, rich text.
