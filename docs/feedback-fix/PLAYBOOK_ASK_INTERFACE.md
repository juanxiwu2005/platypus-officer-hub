# Playbook Ask AI: data interface for a future AI harness (2026-11-26)

Juanxi (2026-11-26): pressing **Ask AI** on a Playbook question must give Ask a structured context, not only text, so a later AI harness can answer from the club's own Playbook. This page describes that interface. No new AI behaviour was built: the context is produced, carried and checked; nothing on the server acts on it yet.

## 1. The context type

`src/lib/playbookAsk.ts`:

```ts
export interface PlaybookAskContext {
  kind: "playbook-question"
  questionId: string
  question: string
  category: string            // the category's label, e.g. "Funding"
  rules: { policyId: string; sourceName: string; sourceUrl: string | null; text: string }[]
  clubRules: { answerId: string; text: string; author: string | null; on: string }[]
  tips: { answerId: string; text: string; author: string | null; on: string; likes: number; dislikes: number }[]
}
export function playbookAskContext(s: DemoState, questionId: string): PlaybookAskContext | null
```

- `rules` are the question's **School rule** answers (stored kind `rule`): the policy record ID, its source name (`sourceName`) and official link from the policy catalog, and the answer text (a paraphrase checked against the archive).
- `clubRules` are **Club rule** answers (kind `club`), the club's own standard, written only by the president or VP.
- `tips` are **Tip** answers (kind `experience`), an officer's personal advice, with vote counts.
- Order: the page's ranking (`compareAnswers`: net votes, then the most recent `verifiedOn ?? on`, then id), within each kind. At most `MAX_ASK_ITEMS` (10) per list.
- Authors are full names (`Person.name`), or `null` when the author is unknown.
- `on` is the stored ISO date (`verifiedOn ?? on`), copied. **No date is computed.**
- Left out on purpose: who voted, who has read what, research-log data, anything only the president or VP may see. A merged question resolves to the question it was merged into; a missing or deleted question gives `null`.

## 2. Where it is produced and how it travels

1. **Row** (`src/components/playbook/QuestionRow.tsx`): the Ask AI icon button (accessible name "Ask AI about <question>", logged as "Playbook Ask AI", never the text) calls `rail.askAbout(playbookAskContext(state, q.id))`.
2. **Rail** (`src/components/rail/RailContext.tsx`): `askAbout(context)` puts the question into the Ask box (not sent) and keeps `askContext`. `ask(text)` from anywhere else, closing the chip, or leaving `/playbook` clears it (`clearAskContext`).
3. **Ask panel** (`src/components/rail/AskPanel.tsx`): while `askContext` is set on `/playbook`, the focus is `{ kind: "playbook-question", id, title, playbookQuestion }`, with the chip "Looking at: <question>". The context is recomputed from the current state at that moment (votes and edits since the click count; a deleted question has none).
4. **Assistant** (`src/lib/assistant.ts`): with that focus and AI on, `respond` sends the message to `/api/chat` first. `aiReply` sends `focus` as `{ kind, id, title }` only and adds the context as the body field **`playbookQuestion`** (not for a `purpose: "form"` request). If the AI is off, fails or returns nothing, the usual answers apply unchanged (a question ending in "?" still gets the rule book's answer). With AI off, nothing is sent.
5. **Server** (`netlify/functions/chat.mts`): `cleanPlaybookAsk` (`src/lib/playbookAskWire.ts`) checks the field: known fields only, strings trimmed and capped (question 100, answer text 400, names 80, source names 200), at most 10 per list, links `https://` only, dates ISO or empty, counts clamped, the whole at most `MAX_ASK_CHARS` (16,000) characters, otherwise dropped. The checked context is added to the model's user JSON as `playbookQuestion`, as data. Its dates are **not** added to `allowedDates`, so the existing date filter still removes any date the model writes that the club data does not already hold. The request body limit (128 KB) is unchanged.

## 3. What a future AI harness must do

Consume `playbookQuestion` at the marked point in `netlify/functions/chat.mts` (after `cleanPlaybookAsk`, before `chatJSON`), or in a dedicated endpoint that receives the same field.

- **Answer only from the context:** `rules[].text` for what the school requires, then `clubRules[]` for the club's standard, then `tips[]` as officers' experience, said as such ("an officer's tip"). Do not add facts from general knowledge.
- **Cite sources by name:** a school rule is cited by `sourceName` (with `sourceUrl` when present), never by `policyId`; club rules and tips by kind and author ("Club rule · Alex Rivera").
- **Never compute dates.** Only the deterministic rule engine computes dates and scheduling (AGENTS.md §3). Repeat a date only if it is already in the club data; the server filter removes others.
- **Decline when nothing applies:** if the context and rule book do not answer the question, say so plainly rather than guess.
- **Escalate to a person:** when declining, or when the rules and club answers disagree or a decision is needed, point the officer to a person (the president, VP or the office named in the rule). "Ask a person" (`Playbook.asked`) is phase 3 and not built.
- Keep the existing card contract (`src/lib/chatCards.ts`, `sanitizeCards`); write through validated commands only.
- Never send research data: the context builder and its wire check are on the research-log guard list (`src/test/handoffStage7.test.ts`).

## 4. Test hooks

- Unit: `src/test/playbookAsk.test.ts`: the context for `pq-1` (ranking, full names, source name and link, copied dates, no voter IDs), merges, deletes, the per-kind cap, `cleanPlaybookAsk` (unknown fields, caps, `javascript:` links, bad dates), `respond` sending `playbookQuestion` to `/chat` with AI on, nothing with AI off, fallback when the AI fails, and `/api/chat` passing the checked field to the model (and not for a form fill).
- Browser: `e2e/playbook.spec.ts`: "Ask AI on a row" (chip, filled question, no request, no `ui.ask` entry) and "sending from Ask AI includes playbookQuestion" (request interception of `/api/chat`, server answering 503, demo AI switch on).
- DOM hooks: the chip `data-testid="focus-chip"`; the row's Ask AI button by its name "Ask AI about <question>"; `data-question-id` and `data-answer-id` on rows and answers.
