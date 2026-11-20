# IRB handoff package · 2026-10-28

Verification materials for another chat. Study ID STUDY00024727, Platypus Phase 3 prototype testing.

**Every item in this file was checked against the repository**, on branch `feat/ai-night-mode`
(commit `55949b8`), which does not differ from `main` in these respects. Every item below cites its source file and line numbers,
so the other chat can check independently.

**The final section, “What I cannot verify,” is required reading.** One item can only be confirmed by Juanxi himself.

> **2026-10-29 recheck (`integration/v1.0`, commit `afe0b5b`):**
> - The facts in sections 1 and 2 still hold: the `LogEntry` structure is exactly as it was on 2026-10-28; the limit is still 2000 entries; storage is still only in browser localStorage; and Settings still has the export button. The server-storage flag and its guarding tests remain. Only line numbers changed: `types.ts` line 379, `store.tsx` lines 297 / 306, `Settings.tsx` line 119.
> - **Section 3 is outdated: the DeepSeek code path was deleted on 2026-10-29 (after IRB approval)**; `AI_PRESET=deepseek` is now rejected outright. The submitted materials say “an unselected legacy provider code path is retained”; actual behavior is now stricter. Juanxi should ask Marcie whether IRB needs to be informed.
> - Changes made through the new “Edit steps” feature (the ordering task) are recorded in the same interaction log as usual (also including `before` values), with no new uploads or server storage.

---

## 1. Data collected (must be in the Protocol)

Every action participants take in the prototype is recorded. This is research data and must be described in the Protocol.

**English text ready to paste into the IRB form:**

> Participant interaction logs are recorded locally in the participant's own
> browser using browser localStorage, capped at 2,000 entries (oldest dropped
> first). Each entry records: a sequence number; the real wall-clock timestamp
> of the action; which person the application was set to act as; the action
> type; the action's arguments with long text truncated; and, for actions that
> modify existing data, the field values as they were before the change; and
> whether the application accepted or rejected the action.
>
> Participants export these logs themselves using the "Export my data" button
> on the Settings page, which downloads a single JSON file containing their
> club data and their ordered record of actions. The participant hands that
> file to the researcher. Nothing is transmitted automatically.
>
> The logs contain operational records only. Participants work with fictional
> organization and member information supplied by the researcher, so no real
> names, real contact details, or real organizational records are captured.

**Sources (for the other chat to check):**

| Fact | File | Location |
| --- | --- | --- |
| Log field structure | `src/data/types.ts` | Line 367, `interface LogEntry` |
| 2000-entry limit | `src/data/store.tsx` | Line 252, `LOG_LIMIT = 2000` |
| Stored in localStorage | `src/data/store.tsx` | Line 261, `const store = () => window.localStorage` |
| Export button | `src/pages/Settings.tsx` | Line 109, `data-testid="export-data"` |

Field by field (`LogEntry`, from the source comments):

- `seq`—1, 2, 3 … never reused; a gap at the beginning means the oldest entries were dropped at the 2000-entry limit
- `at`—the real time the action was dispatched, in milliseconds since 1970 (`Date.now()`)
- `actor`—who the app's “View as” was set to when the action occurred
- `type`—action type, such as `updateNode` or `moveTask`
- `payload`—shortened action arguments (long text truncated; secrets and bulky objects excluded)
- `before`—the fields' values before the action, recorded only for actions that “modify something that already exists”
- `applied`—`false` means the app ignored the action (unauthorized, invalid, or nothing to change)

**A point relevant to IRB:** the `before` field means the log can reconstruct “what participants changed from and to,”
not just “what participants clicked.” This is more detailed than ordinary clickstream data; the Protocol should state it explicitly,
without vaguely calling it "usage analytics".

---

## 2. Do not describe “server-side storage of organization configuration”

The Protocol **must not** say that the server saves organization configuration. This was completely disabled in M1 (2026-10-27),
and the study build will not enable it. Describing it would prompt IRB questions about retention and deletion processes for a system that has nothing to manage.

**How completely it is disabled (guarded by tests):**

Unless `ORG_SETUP_ENABLED` equals the string `"true"`, all 7 endpoints below return 404,
and the storage layer's `getStore` is called 0 times:

```
/api/org/setup              /api/org/archive
/api/org/ai                 /api/org/ai-run
/api/workspace              /api/workspace/assistant
/api/workspace/assistant-run
```

- Flag logic: `vite.config.ts` line 11, `process.env.ORG_SETUP_ENABLED === "true"`
- Frontend: `src/phase1/serverStorage.ts`—screens using storage are excluded **at build time**, rather than hidden at runtime
- Guarding tests: `src/test/serverStorageHidden.test.ts`
  - Each of the 7 endpoints asserts 404 + zero `getStore` calls
  - A dedicated assertion proves that only **the exact string `"true"`** enables it (`""`, `"false"`, `"1"`, `"TRUE"`, and `"yes"` all still return 404)
  - A reverse control also proves that, when enabled, the same request **does** reach the storage layer, demonstrating that the test is not vacuous
- An e2e assertion also verifies 0 storage requests throughout the visit

**If IRB asks “Will the prototype store data on a server?”**, the accurate answer is:
not in the study build, and automated tests verify this on every CI run. The code contains this path,
but while disabled, the relevant endpoints return 404 and the relevant screens are excluded from the bundle.

---

## 3. AI providers (easy to describe incorrectly)

> **2026-10-29 update (`[AI]` commit): the DeepSeek code path has been deleted.** The warning below against writing "DeepSeek has been removed" and the test guarding it (`adapter.test.ts`, "keeps DeepSeek behavior unchanged…") are outdated; DeepSeek is now absent from the code, and `AI_PRESET=deepseek` is rejected (without sending any request). **The English statement below remains accurate**, because two unselected provider presets, OpenAI and Anthropic, remain in the code ("an unselected legacy provider code path"). Juanxi decides whether to remove those too and whether to revise the materials.

**What to write:** all AI requests go through **ASU AIR** (the university's internal gateway). Routing v3:

- Gemma 4 31 B—longer structured setup tasks
- Muse—short conversations and edits
- GLM 5.3—only when the user explicitly requests deeper review

**⚠️ Do not write "DeepSeek has been removed"; that is not true.**

The repository **still contains** a DeepSeek provider code path; it is simply not selected by the study configuration.
A test guards its behavior:

```
src/organization/adapter.test.ts
  → "AIR provider routing > keeps DeepSeek behavior unchanged when AIR is not selected"
```

**Accurate English wording:**

> All AI requests in the study configuration are routed to ASU's AIR gateway,
> which is operated by Arizona State University. No participant data is sent to
> any third-party AI provider during the study. The codebase retains an
> unselected legacy provider code path that the study configuration does not
> use.

**Why this matters:** if the Protocol says DeepSeek was removed, but IRB or an IT security review inspects the code
and finds it still there, that factual error could call the credibility of the entire Protocol into question.
Saying “an unselected legacy path is retained” has no downside; saying “removed” does.

Complete removal of that dead code is already scheduled for a later task, but **cannot be done before today's submission**,
so today's Protocol must reflect the current state.

---

## 4. Data participants see

The repository contains only fictional demo student-organization data. Participants work with fictional organization and member information supplied by the researcher.
No real names, real contact details, or real student-organization records enter the system.

This is a hard repository rule (`AGENTS.md` §3, item 1): do not commit raw survey responses, interview transcripts,
recordings, participant names or quotes, or paste any of those materials into any AI.

---

## 5. Participant recruitment and grouping (Juanxi's 2026-10-27 decision)

- **Include group B**, because feedback on the onboarding process itself needs to be observed
- Timeline: submit IRB around Thursday → approval next Monday or Tuesday → recruitment email on Wednesday → actual prototype testing begins the following week

(This section records Juanxi's own arrangements, not facts verified from code. If the other chat needs to check,
it should ask Juanxi himself or consult the IRB system records.)

---

## 6. What I cannot verify—Juanxi must confirm personally

**Whether `ORG_SETUP_ENABLED` is set to `true` in Netlify's environment variables.**

It is not set in `netlify.toml`, so the default is off. But environment variables can also be configured in Netlify's site settings,
which I cannot see in this session.

**Every conclusion in section 2 depends on “it has not been set to true.”**

Please check personally before submitting:

> Netlify → select the platypus site → Site configuration → Environment variables
> → confirm the list **does not contain** `ORG_SETUP_ENABLED`, or its value is not `true`

If you find it set to `true`, tell me immediately; section 2 must be rewritten in full,
because server storage would be enabled and the Protocol would need retention and deletion procedures.

---

## 7. Verification checklist for the other chat

Check each item:

- [ ] The Protocol's data-collection section describes interaction logs consistently with the English in section 1
- [ ] It explicitly says **participants export the logs themselves** and hand them to the researcher; there is no automatic upload
- [ ] It explicitly describes `before` values (which reconstruct changes), without vaguely calling them usage analytics
- [ ] The Protocol contains **no** description of server-side organization-configuration storage
- [ ] The AI-provider section specifies ASU AIR and correctly describes the three models' roles
- [ ] The AI-provider section **does not** claim DeepSeek was removed
- [ ] Group B is included
- [ ] Juanxi has confirmed Netlify's `ORG_SETUP_ENABLED` setting (section 6)
- [ ] Retention: logs remain in participants' own browsers, capped at 2000 entries, and disappear when browser data is cleared—the Protocol's retention description must match

---

## 8. If IRB asks follow-up questions

Likely questions and accurate answers:

**“Where is data stored, and for how long?”**
In participants' own browsers (localStorage), limited to the latest 2000 entries. The researcher's copy is a JSON file
that participants voluntarily export and hand over, retained for the period promised by the researcher in the Protocol. Clearing browser
data removes the local copy.

**“Can participants withdraw?”**
Before handing over the JSON file, participants can clear browser data at any time without leaving a trace. After handover, follow the Protocol's
withdrawal terms.

**“Will AI see participant data?”**
Yes—content participants enter in the prototype is sent to the ASU AIR gateway to generate responses. This is fictional student-organization
information. It does not pass through any third-party AI provider.

**“Is there a risk of key exposure?”**
The product site's API key exists only in Netlify environment variables, not in code, documents, prompts, or commit history
(`AGENTS.md` §3, item 2).
