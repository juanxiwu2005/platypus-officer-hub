# IRB handoff bag. 2026-10-28

Checklist for another dialogue. Research No. STUDY00024727, Platypus Phase 3 test.

**, every single item in this document is checked for** in repository. The branch of the check is `feat/ai-night-mode`.
(Submitting `55949b8`), and `main` do not differ in these respects. Each of the following articles has a source document and line number.
Another conversation can be looked into on its own.

**must read the last section, "What I can't check."** has one thing only Juanxi can confirm himself.

> **2026-10-29 Review (`integration/v1.0`, submitted to `afe0b5b`):**
> - The facts of sections 1, 2 are still valid: the log structure `LogEntry` and 2026-10-28 were exactly the same at the time. The upper limit remains 2000, only in the browser localStoreage and the export button is still in Settings; The server stored the switch and the test to hold it was still in place. Only the lines have changed: `types.ts` line 379, `store.tsx` line 297/306, `Settings.tsx` line 119.
> - **Article 3Section is outdated: DeepSeek's code path already exists 2026-10-29(IRB after approval) Delete**，`AI_PRESET=deepseek`Now it's going to be rejected directly.  (a) The material submitted, which is written as "maintaining an uninvited old path", is now more stringent than this; Should I inform IRB that Juanxi asks Marcie for a decision?
> - Changes to the new feature Edit steps (sorting) will also be recorded in the same interactive log (with the same `before` value), without adding any upload or server storage.

---

## 1. What data to collect (to write into Protocol)

Each step of the participants in the prototype will be recorded. This is research data, Protocol has to write.

**The English language where IRB forms can be glued directly:**

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

**Source (another dialogue can be checked):**

| Facts | Documentation | Location |
| --- | --- | --- |
| Log field structure | `src/data/types.ts` | 367 Line `interface LogEntry` |
| cap 2000 | `src/data/store.tsx` | 252 Line `LOG_LIMIT = 2000` |
| Exists LocalStorage | `src/data/store.tsx` | 261 Line `const store = () => window.localStorage` |
| Export Button | `src/pages/Settings.tsx` | 109 Line `data-testid="export-data"` |

Fields by article (`LogEntry`, comment source text):

- `seq` - 1, 2, 3 ... not reused; There's a gap at the beginning, which means that the oldest ones were lost at the 2000 cap.
- `at` - Live time when actions are assigned, milliseconds since 1970 (`Date.now()`)
- `actor` --who did the app "View as" set when the action was executed?
- `type` - Action type, e. g. `updateNode`, `moveTask`
- `payload` - Action parameters reduced (long text cut, secret key and swollen objects unaccepted)
- `before` - The values of those fields before the action are recorded only for actions that "change existing things"
- `applied` - `false` indicates an app ignores this action (no performances, no validity or nothing to change)

**means something to IRB: the** `before` field means that the log can restore "what has been changed by the participants."
It's not just what the participants ordered. It's thinner than the usual click flow. Protocol better say it, don't be vague.
"usage analytics"。

---

## 2. Do not write "Serviceend Storage Organization Configuration"

**in Protocol does not want** to have the server save tissue configuration. It was completely shut down at M1 (2026-10-27).
The building for the study will not be enabled. Instead, it would allow IRB to follow the data retention period and delete process, which has nothing to do with it.

**Degree of shutdown (tested)**

When `ORG_SETUP_ENABLED` does not equal the string `"true"`, all of the lower 7 endpoints return to 404,
`getStore` is called by 0:

```
/api/org/setup              /api/org/archive
/api/org/ai                 /api/org/ai-run
/api/workspace              /api/workspace/assistant
/api/workspace/assistant-run
```

- Switch logic: `vite.config.ts` Line 11, `process.env.ORG_SETUP_ENABLED === "true"`
- Front side: `src/phase1/serverStorage.ts` - **is excluded, not hidden while running, when stored images are built in**
- `src/test/serverStorageHidden.test.ts`.
  - 7 endpoints each assert 404 + `getStore` zero call
  - There's a special one claiming that only the **precise string `"true"`** can open it (`""`, `"false"`, `"1"`, `"TRUE"`, `"yes"` are all still 404).
  - And there's a reverse contrast: the same request when opened **does** go to the storage layer to prove that this test is not empty.
- On the side of e2e is an assertion that round visits result in 0 storage requests

**If IRB asks if the prototype will send data to the server**, the exact answer is:
This is not done in the construction for research, and there are automating tests to verify this at every CI; There is this path in the code.
However, the relevant endpoint returns 404 and the interface is not packaged.

---

## 3. AI supplier (this section is easily misspelled)

> **2026-10-29 Update (submitted `[AI]`): The code path for DeepSeek has been deleted.**, the warning "DeepSeek has been removed" and the test that holds it for `adapter.test.ts` is out of date; DeepSeek is not in the code now, and `AI_PRESET=deepseek` will be rejected (no request). **The following English expression is still accurate**, as two uninvited suppliers preset in the code ("an unsolecated legacy provider code path") are also retained. Whether or not to delete them, or to change the wording of the material, is left to Juanxi.

**To write:** All AI calls go **ASU AIR** (school internal gateway). Route v3:

- Gemma 4 31B - Long Structural Settings Task
- Muse — Short Dialogue and Editor
- GLM 5.3 - Only when the user requests deeper review

**⚠  don't write "DeepSeek has been removed", that's not true.**

**in repository and** a supplier code path for DeepSeek which is not selected only under the configuration used for research.
There's a test that's holding on to its behavior:

```
src/organization/adapter.test.ts
  → "AIR provider routing > keeps DeepSeek behavior unchanged when AIR is not selected"
```

**Exact English:**

> All AI requests in the study configuration are routed to ASU's AIR gateway,
> which is operated by Arizona State University. No participant data is sent to
> any third-party AI provider during the study. The codebase retains an
> unselected legacy provider code path that the study configuration does not
> use.

**Why this is important:** if Protocol says DeepSeek has been removed and IRB or IT security review to see the code
And finding it still is, it's a factual error that could trigger a question about the credibility of Protocol as a whole.
There is no harm in writing "a unused path has been retained" or "removed".

The clean-up of that dead code has been assigned to the follow-up, but **was submitted today in time to do**.
So today's Protocol is going to be written on the status quo.

---

## 4. Data seen by participants

Repository contains only the demo student event data. The participants use the knowledgeal and membrane information provided by the researchers.
Live name, live contact information, live listed records are not entered.

This is the hard rule of repository (`AGENTS.md`, sect. 3, 1): do not submit original answer for survey, interview transliteration,
The recording, the names of participants or quotations are not posted to any AI.

---

## 5. Participant recruitment and grouping (Decision of Juanxi 2026-10-27)

- **contains group B** on the basis of the need to observe feedback from participants onboarding process itself
- Timeline: IRB submitted around Thursday, approved on Monday or Tuesday.

(This section is Juanxi's own arrangement, not from the code. The other conversation is to be checked.
Juanxi should be asked about himself or the IRB records. ）

---

## 6. Something I can't check -- need Juanxi to confirm it himself.

**`ORG_SETUP_ENABLED` has been set up as `true` in the Environmental Variables of Netlify.**

`netlify.toml` didn't set it up, so the default is off. However, there are also environmental variables in the web settings interface of Netlify.
I can't see that interface in this session.

The conclusions of **, section 2, are based on the fact that "it has not been set as true."**

Please confirm for yourself before submitting:

> == sync, corrected by elderman ==
> The **on the confirmation list does not have** `ORG_SETUP_ENABLED`, or its value is not `true`.

If you find it's set up as `true`, tell me immediately that section 2 has to be rewritten.
Because that means the server's storage is open, Protocol has to write the data retention and deletion process.

---

## 7. Checklist for another dialogue

Article by article:

- [ ] Does Protocol's data collection section have an interactive log and is written in the English version of 1?
- [ ] Does it say that the log is **that the participants themselves export** to the researchers, not automatically upload it?
- [ ] Do you have a log containing `before` values (recovering both before and after the changes) without being vaguely identified as using analytics
- [ ] **in Protocol does not have a description of the** serverend storage tissue configuration
- [ ] AI Vendor section says AAU Air, the division of work across the three models.
- [ ] AI Vendor Section **No** Claim DeepSeek has been removed
- [ ] Include group B in the group
- [ ] Juanxi has confirmed `ORG_SETUP_ENABLED` for Netlify (section 6)
- [ ] Data retention: Logs in participants ' own browser, capped 2000, clearer data disappear - Protocol 's retention period description is consistent with this

---

## 8. If IRB comes back for questioning,

A few approximates will be asked, and the exact answer:

**, "Where does the data exist and how long does it last? 」**
Participants ' own browser (localStorage), capping 2000 up-to-date records. The studyer has a copy of the participant.
The active export and delivery of a JSON file, with the retention period set at the time promised by the researcher in Protocol. Participants clear browsers
The data, the locals are gone.

**, "Can you pull it back? 」**
The participants will be able to clear the browser data at any time before handing over the JSON file without leaving a trace. Press Protocol after surrender
The withdrawal clause is dealt with.

**"AI will see the participant's data?" 」**
Session - The contents entered by the participants in the prototype will be sent to the ASU AIR gateway to generate a response. The contents of the project are student organisation
Information. No third party AI supplier.

**"Is there a risk of leak? 」**
API key for the product website is only in Netlify 's environment variable and not in code, document, prompt or submission records
（`AGENTS.md`Article 3Section 2Article ).
