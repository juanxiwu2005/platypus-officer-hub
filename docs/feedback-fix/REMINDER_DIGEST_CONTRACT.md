# Reminder center option F + per-person email digests: frozen contracts and ownership (2026-11-19, Claude lead agent)

**Juanxi's decision (2026-11-19):** option F (`docs/prototypes/reminder-centre-concepts/F-review-and-send.png`): vertical people list showing each person's current tasks; right rail shows the actual outgoing email, reviewed sequentially with Send & next or sent all at once. Same-day reminders for one person become **one email** ("5 tasks → 3 emails"). Also fix review findings. Use multiple agents.

Background/issues: `docs/feedback-fix/REMINDER_CENTRE_REVIEW_2026-11-19.md`.

## 1. Bugs (acceptance must cover)

- **B1 bulk send undercounts:** seed (Sat Oct 31, `review_then_auto`), "Approve all (5)" records only 4; Jordan's 3rd hits `limitReason()`'s per-person/day cap because `planReminders()` counts sent records but not same-batch candidates. **After:** caps count emails; same-person/day candidates form one email; displayed email count equals recordable count, no "Some reminders changed or reached a limit".
- **B2 mismatched counts:** "Needs your OK 13" includes 8 unsendable issues. **After:** sendable person-groups and Fix first (no_owner / unresolved_waiting / paused / unavailable_recipient / legacy_history, etc.) display/count separately.
- **B3 duplicates:** task appears in both pending and This week. **After:** today's pending tasks are excluded from upcoming lists.
- **B4 mode 2 takes dozens of clicks:** `review_then_self` opens drafts individually. **After:** one draft per person, sequential "Open Gmail draft" → "I sent this email" → next.

## 2. Frozen interfaces (do not change signatures; consult lead agent first)

- Types: `src/reminders/digestContracts.ts` (`ReminderDigestGroup`, `ReminderDigestPlan`, `ReminderDigestSnapshot`, `PreparedDigest`, `DigestRecordResult`).
- Optional fields already added, no `SCHEMA_VERSION` increase: `ReminderDelivery.digestId?`, `ReminderRuntime.digests?`.
- Functions: `src/reminders/digest.ts`
  - `planReminderDigests(state)`: skeleton groups by person for UI use; Engine changes caps to count emails.
  - `prepareReminderDigest(store, groupId, origin, via)`: issue and **save** each task's link (as when opening `ReminderComposer`), generate individual snapshots/merged email; call before mode-2 draft opening so links work.
  - `recordReminderDigests(store, prepared[], via)`: one store action; each group records all-or-nothing.
  - `sendReminderDigests(store, groupIds, origin, via, isCurrent)`: Send all/automatic mode.
- Modes/`via` (existing `confirmReminderDelivery`): `review_then_self` → `manual`; `review_then_auto` → `platypus` (president/VP); `auto_email` → `automatic` (also permits `platypus`).

## 3. File ownership (one agent per file)

| Agent | Owns | Does not touch |
| --- | --- | --- |
| **Engine** | `src/reminders/digest.ts`, `engine.ts`, `policy.ts`, `runtime.ts`, `batch.ts`, `delivery.ts`, `deliveryContracts.ts`, `useAutomaticReminders.ts`, `mail.ts` (add merged-mail functions only; single-email behavior unchanged), `src/data/store.tsx` (new action/log summary only), related unit tests | Pages, rail, CSS, e2e |
| **UI** | `src/pages/Today.tsx`, `src/reminders/centre.ts` (presentation), new `src/reminders/DigestPanel.tsx`, new `src/reminders/digest-centre.css`, `src/components/rail/RailContext.tsx`, `Rail.tsx` (new kind), `src/pages/Today.reminders.test.tsx`, reminder `e2e/*.spec.ts` | Engine files above; call interfaces only |

## 4. UI requirements (option F, UI agent)

- Small top card: `Review N emails · M tasks · K sent today` + progress. Mode actions: `review_then_auto`: "Send all N emails"; `review_then_self`: "Open draft 1 of N"; `auto_email`: only "Platypus sends these automatically (demo: nothing is sent)", no approval button.
- Center: **vertical people list**, one column even for 10 people: initials + name + status (Up next / Reviewing / Sent ✓). Each task needing a reminder today occupies **one row**: title + one reason pill (N days overdue / Due today / Start passed / Follow-up / Waiting on you). Then quiet "Also has N other open tasks"; name/this row opens rail.
- Right rail (new kind, e.g. `{ kind: "reminderDigest"; recipientId }`): actual merged email preview (recipient, subject, body, Open task link per task). Actions: `Skip` / `Send & next`, below "Send all N without reviewing"; mode 2: "Open Gmail draft" → "I sent this email". Below, **all unfinished tasks** for that person (name/status pill/Due), opening task details.
- "Fix first N" below: one row per task + issue pill (Pick who it waits on / No owner / Stuck / Check earlier reminders / No valid email) + task-details button; legacy retains "I checked · allow future reminders".
- History compacted to `N sent this week · N replied · N no reply`; History opens rail list (reuse Sent/Replies/No reply data). Hide empty sections.
- Preserve member `YourReminders` meaning.
- Follow AGENTS.md section 7: tokens only; no inline styles except CSS variables/data-driven sizes; font ≥14px (supporting 12–13); motion tokens only; one row per item. Today budget **200 / 500** (`npm run words`). English UI.

## 5. Hard boundaries (both agents)

- 0 real AI, 0 real emails; rule-generated mail only. Dates only from rule engine.
- No `SCHEMA_VERSION` increase; optional fields only; read old v1/v2 ledgers and `nudges`/`protocolLog` normally.
- Do not weaken signature, single-task scope, mode permission, or `canLead` checks.
- Do not alter Settings templates, Plan, or other Task Details behavior.
- Small commits in own worktrees, messages `[Reminder digest][Engine|UI] …`; **do not push**; lead integrates.
- Tests: `npm test` (Vitest); Playwright preinstalled; use own ports: `PW_PORT=<4300+> PW_STORAGE_PORT=<4400+> npx playwright test e2e/<spec> --trace off`. Do not run `playwright install`.
