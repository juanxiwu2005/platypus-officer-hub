# Playbook phase 1: frozen contract (2026-11-25)

Plan: `PLAYBOOK_INTEGRATION_PLAN.md`. Decisions: path 2, the name **Playbook**, questions expand in place with an **Ask AI** button (AGENTS.md §6 exception), bounded word growth, phase 4 interfaces only. Design reference (Chinese, fictional): https://claude.ai/artifact/JezotTwt9qXUGsd3K6qJKa (question-first list, answer kinds told apart by label text colour only, like/dislike).

Branch `claude/fervent-thompson-e2j5u2`, draft PR #20. Never `main`.

## 1. Stage A, already committed by the main agent (do not redo)

- **Types** in `src/data/types.ts`: `DemoState.playbook?: Playbook`, `Playbook`, `PlaybookQuestion`, `PlaybookAnswer`, `PlaybookAsked`, `PlaybookCategory`. Optional, so `SCHEMA_VERSION` stays 23; old saves load with no Playbook.
- **Baseline model** `src/data/playbook.ts`: exported names and signatures below are frozen; the bodies are a working baseline that P1-M completes.
- **Sample content** `src/data/playbookSeed.ts` (`samplePlaybook()`, 12 fictional questions, 21 answers; rule answers checked against the archive) and `seedDemo(..., "v2")` adds `playbook: samplePlaybook()`. Main agent owns this file; ask before changing content.
- **Store**: action `{ type: "playbookAction"; action: PlaybookAction }`, reducer case calling `changePlaybook`, added to `READ_ONLY_OK` (the reducer itself limits what non-officers may do), log payload with kinds and IDs only (never text), log "before" with counts only.
- **Routes**: nav item **Playbook** at `/playbook` (`also: ["/handoff"]`, icon `playbook`); `/handoff` keeps rendering the existing Handoff page as a `sub` page (not in the navigation) until phase 2; lazy `src/pages/Playbook.tsx` placeholder.
- **Word limits**: `/playbook` visible 200 / total 600 in `scripts/word-count.mjs`.

Frozen exports of `src/data/playbook.ts`: `PLAYBOOK_CATEGORIES`, `MAX_QUESTION_TEXT` (100 since §5; was 140), `MAX_ANSWER_TEXT` (400), `QUESTIONS_PER_VIEW` (8), `PlaybookAction`, `emptyPlaybook`, `playbookOf`, `liveQuestion`, `questionsFor`, `answerSet`, `isRead`, `newPlaybookId`, `changePlaybook`. P1-M may add exports and add new `PlaybookAction` members; it may not rename or remove these.

## 2. P1-M: model agent

**Owns:** `src/data/playbook.ts`, `src/lib/playbookMatch.ts` (new), `src/data/playbookStarter.ts` (new), `src/test/playbook*.test.ts` (new), and the research-log guard list in `src/test/handoffStage7.test.ts`.

1. **Robust reading.** `playbookOf(s)` never throws on damaged data: it returns a sanitized view (unknown kinds and categories dropped or normalized, text capped, votes deduplicated, unknown people removed from votes and reads, `mergedInto` cycles broken). Memoize by reference so it stays cheap.
2. **Permissions** (enforced in `changePlaybook`):
   - Any current officer (`isOfficer`) may add a question, add an experience answer, vote and mark read.
   - Only the president or VP (`canLead`) may add or edit a **club** answer, hide or unhide any answer or question, and merge questions.
   - The author or the president/VP may edit an experience answer.
   - An incoming officer (`Person.incomingFor`) may read, mark read and vote, nothing else. A former officer may only read.
   - **Rule** answers are read-only for everyone (they come only from the school pack or seed).
3. **Actions** (add these members): `editQuestion` (text, category, roleIds; creator or president/VP), `hideQuestion` (president/VP), `importStarter` (president/VP; adds starter questions from `playbookStarter.ts`; idempotent).
4. **Ranking in `answerSet`:** within each kind, primary = highest net votes (likes minus dislikes), then most recent `verifiedOn ?? on`, then id. Alternates keep that order. Hidden answers never show. (Policy consistency, review and cross-club weighting arrive in later phases.)
5. **Starter questions** (`playbookStarter.ts`, rules only, no AI): for each role, interview lines from `handoffRoles` and `handoffHistory` become experience answers under one question per role, "What did the last <role name> want the next one to know?" (category `timeline`), author = the outgoing officer; skip empty lines; idempotent by a stable id per role. Leads-only contacts never appear.
6. **Similar questions** (`playbookMatch.ts`): `similarQuestions(s, text, opts?)` returns up to 3 live questions ranked by word overlap (lowercase, stop words removed, simple stemming of a trailing "s"), with a bonus for the same category or a shared policy ID; a minimum score so unrelated questions are not suggested. Pure, deterministic, unit-tested.
7. **Limits:** at most 500 questions and 2,000 answers; actions beyond them are refused.
8. **Guard:** add `src/data/playbook.ts`, `src/data/playbookStarter.ts`, `src/lib/playbookMatch.ts`, `src/data/playbookSeed.ts`, `src/pages/Playbook.tsx` and `src/components/playbook/` to the files `src/test/handoffStage7.test.ts` forbids from reading the research log (`getLog`, `interactionLog`, `LogEntry`, `"ui.ask"`).
9. **Tests:** every action and permission row; ranking ties; merge following; damaged-data reading; starter idempotency; similar-question scoring; log payload contains no question or answer text.

## 3. P1-U: interface agent

**Owns:** `src/pages/Playbook.tsx` (replace the placeholder), `src/components/playbook/*` (new), `src/styles/pb-01-playbook.css` (new, imported from the component), `e2e/playbook.spec.ts` (new). May make the minimal fixes needed in existing e2e specs that assumed a "Handoff" navigation item (for example `e2e/navigation-archive.spec.ts`), and add `/playbook` to page lists in `e2e/a11y.spec.ts`, `e2e/dx-04-targets.spec.ts`, `e2e/dx-08-reduced-motion.spec.ts`, `e2e/storage-hidden.spec.ts`, `e2e/smoke.spec.ts`. Never edit model, seed, store, routes or types; work around gaps and report them.

**Page:**
- `PageHead path="/playbook"`. Under it, one quiet line linking to the existing handoff workspace (`/handoff`): "Handoff in progress · N roles" when a season or a role handoff is open, otherwise "Handoff workspace".
- **Filters:** a role select (default: the viewer's role; an incoming officer sees the role they are taking over; options: each current role and "All roles") and category chips (All + the seven categories + club categories), `aria-pressed`.
- **Question list:** each row is a button with `aria-expanded`; shows the question, a "New" tag when the viewer has not read it, and the category; rows the viewer has read look muted. At most `QUESTIONS_PER_VIEW` rows, then "Show N more".
- **Expanded row (in place):** answers are rendered only while open (never in the DOM when closed). Order: School rule, Club practice, Experience. Each answer has a **label in its own text colour** (no coloured blocks, borders or fills), a meta line (rule: the source name from `sourceName(policyId)` linked to the catalog `sourceUrl`; others: author first name and month), and the text. Collapsed alternates: "N more answers" reveals them inline. Opening a row dispatches `markRead`.
- **Actions in an open row:** like and dislike buttons (SVG thumbs, `aria-pressed`, counts), **Ask AI** (small button; `useRail().ask(<question text>, false)` so Ask opens with the question ready to send; Ask stays the only AI input), "Add an answer", and for the president/VP "Hide" on answers; author/lead "Edit".
- **Add experience** (toolbar button): question field with live suggestions from `similarQuestions` ("Answer this existing question instead"); category select; for the president/VP a choice between Club practice and Experience; answer text (400 max); short note "Demo: use fictional names only." Saving creates the question if new and the answer.
- **Empty state** (old saves without a Playbook): "No questions yet." plus "+ Add experience" and, for the president/VP, "Start from your handoff notes" (`importStarter`).
- **Rules:** English copy, short; tokens only; no inline styles except CSS variables; motion through tokens with reduced motion; ≥14px; keyboard and screen reader complete; light and dark; no page-level horizontal overflow at 390px; the existing right rail and Ask behaviour unchanged.

**Tests (`e2e/playbook.spec.ts`, desktop and mobile):** navigation shows Playbook and is current on `/playbook` and `/handoff`; the handoff link opens the existing page; a row expands in place, shows the three kinds with source names (no `ASU-R-` text), and is marked read after reload; answers of closed rows are not in the DOM; "Show N more" appears past 8; like toggles and persists; Ask AI opens Ask with the question text; add experience with a duplicate suggestion choosing the existing question; a new question appears in its category; an incoming officer (View as) can read and vote but sees no add/edit; axe clean in light and dark; no horizontal overflow on mobile; `npm run words` keeps `/playbook` within 200 / 600.

## 4. Gates (main agent, after merging both)

`npm run lint`, `npm run build` (entry ≤ 550,000; report it), `npm run typecheck:netlify`, `CI=1 npx vitest run` (full), browser specs for Playbook, navigation, Handoff, a11y, smoke on desktop and mobile with `--trace off`, `npm run words`. Then an independent read-only review and a fix agent.

## 5. Amendments (fix agent, 2026-11-25)

- `MAX_QUESTION_TEXT` is now **100** (was 140), so eight rows stay within the page's word budget; the sanitizer cuts longer stored questions.
- `importStarter` now carries `{ questions, answers }`, computed by the lazily loaded page with `starterPlaybook`; the reducer keeps every check (president/VP, starter id scheme, sanitizer, idempotent, limits), so `playbookStarter.ts` stays out of the startup bundle.
