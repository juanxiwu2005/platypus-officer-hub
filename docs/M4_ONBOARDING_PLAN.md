# M4 Programmes: Two sets of onboarding synthesis (to be reviewed by Juanxi)

**Status: Programs only, no code changes.** Drafting: Claude, 2026-10-29, Branch `integration/v1.0`.
M3 is now sorted, so it's called **M4**. ）
Based on: execution programmes 8.6, 9.1, 9.2, 9.4, 9.6, 10.4; `AGENTS.md` Section 10–12; `docs/IRB_HANDOFF_2026-10-28.md` Section 2; The code only looks at structures: `src/pages/Setup.tsx`, `Join.tsx`, `src/organization/` (file list and type `schema.ts`), `src/phase1/serverStorage.ts`, `vite.config.ts`, `netlify/functions/`.

## 0.

| | |
| --- | --- |
| **Recommendation** | Do not do merge before **Phase 3 (11/9) until after the Phase 3. The** programme is now finalized and frozen; Do a little "invisible" before at most 11/9 (see 6 B) or do nothing. |
| Why? | 4–5 sessions, plus each time you complete acceptance, 11 days is not enough and at least 3 days of "freezing" code are left before testing; Two, it'll change. `Role`、`Person` It's all about 37. `holderId`, the risk of moving forward is too high; 3 participants using field information, DP3's most valuable "readconstitution auto-build role" is not necessary for research tasks. |
| Now the participants have a set of useful settings. | Main application `/#/setup`(5 moves) plus `/#/join`(5 questions); DP3 5AI set in the building for research **It's not gonna happen.**  |

## 1. Phase 3, what do the participants see? So what's it look like after the merger?

### 1.1 Now (verified)

- **research constructs** (`ORG_SETUP_ENABLED` not created, i.e. closed): participants can only go to the primary application of **`/#/setup`**: Your club  →  Semester Goals  →  Office rules  →  Invite & workspace  →  First event (5 moves with data in browsers only); **`/#/join`** (5 questions, presentation links to the same browser).
- The 5 chapter for DP3 AI settings (Constitution — Your Team — Responsibilies — Activity workworklow — Review) in `/#/phase1/`. When `SERVER_STORAGE = false` is constructed, these images of **are not packaged to** and `/#/phase1/` has only one local example. It's AI to walk `/api/org/ai` and wait for 7 endpoints to return to 404 when not open.
- So it's "one can work, the other can be turned off", not "two can use."

### 1.2 After One (draft text)

There is only one path: `/#/setup` (president/ vice president) and `/#/join` (officer). The content of DP3 becomes a few new steps in Setup, using the main application of its own components, and data is still only available on browsers.

```
Set up your fictional club                         ● ● ● ○ ○ ○ ○    (Progress Chain  Chain)
─────────────────────────────────────────────────────────────────────────────
1 Club        name · mission · school
              [ Use our sample constitution ]  [ Choose a file ]  [ Paste text ]   ← optional, skip
              (Points  "Read it with AI" → It's down there. "AI suggestion · check it"line, line by line  Add / Skip)
2 Goals       (Existing 2–3 Target )
3 Team        Table  (.tbl): One per row "People. " —— Name · Email · Role · Department
              Sectors are small colour labels; Role It's a drop; Top Right  "+ Add person"
              One line.  → Right Bar  Details: This person's role Duties）
4 Duties      List of duties by rale column (editable tabs) + Default  R/A/C/IWho's in charge, who's approved, who's consulted and who's informed?
5 Event steps Above standard flow "Gabin student organisation own steps ": Name  · Which one?  · A few days.  · After which step?
              Use  M3 It's...  Edit steps Same set of rules, not another flow chart)
6 Invite      (Existing: invitation links  + Channels in the workspace )
7 First event (Existing: One sentence  → Form  → Confirm ) + A page overview of all above, confirm only to save
─────────────────────────────────────────────────────────────────────────────
Back  Next      "Nothing is saved until you approve the first workflow."
```

- 7 takes a lot of steps, but **1, 4, 5 are** (“Skip - use the standard plan”), so the fastest route is still the same as 5.
- Participants use field information, AI is **optional accelerator**: Turn off the AI (top-column AI feeds) process as it works.

## 2. DP3 Chapter 5 which moves in and reworks with the primary application of 5 components

The main application of 5 components (AGENTS.md § 7.2): state color block `StatusPill`, progress chain `Chain`, table `.tbl`, suspended card `Hover`/ `Info`, details in the right column (`useRail().show`). AI only has one entrance in the right column Ask (§ 7.1).

| DP3 Chapter | Do what? | Are you moving? | How do you redo it in the main app? |
| --- | --- | --- | --- |
| **1 Constitution** | Upload PDF/Word or paste  →  AI to read the name, mission, role, role belonging to department, unsure | **Moving (optional)** | Setup 1 step line button; **only reads** (in browser) `readConstitution` Use pdfjs/mammoth, not available; Point "Read it with AI" to send **text** to a new **interface that does not store** (section 5); The result is a line-by-line Add/Skip (imitating the change card); AI, put it somewhere uncertain. `Info` Suspend card |
| **2 Your team** | Department, role, organisation arcitecture `SetupCharts.tsx` 958 Lines, remember | **Move half.**. | **Moving:** department, roll, person (code 3 step table). **Not moving:** organization arcitecture (you chose a simple style); You can do it later in the subway style. Man becomes the main character of the form (Section 4) |
| **3 Responsibilities** | Department/ roll duty, Check (AI risk check) | **move duty, not check**. | Step 4: each role has an edited set of job labels; Right column Details. `Check`（`risk_check`Plan check. |
| **4 Activity workflow** | Member Flowchart + Council Flowchart `FlowEditor.tsx`, drag nodes manually) | **. Just custom steps**. | Do not move flowcharts (9.42: do not flyEditor). Article 5Step: on the standard process **Add this standardisation your own steps**(becomes)  `StepTemplate` An additional step of style, created with a standard step; Order/days with M3 editing rules. **Council Process (boardFlow) not to move** |
| **5 Review** | approval, `guide`(student event description for AI), translated into machine readable JSON, risk summary | **Masters, not gide/JSON** | An overview of the one page of step 7; `guide` Do not need to read live data (the AI used by the main application, `aiContext.ts`）；JSON can be part of "Export my Data" |

**No one moves:** server storage, original archiving (`archive.ts`, `client.ts`), AI mission records and diagnostics, chat records, `src/workspace/`, `organization.css`/`setupV3.css` / `phase1.css` (third design system for 4,567), `FlowEditor.tsx`, `SetupCharts.tsx`. **Reusable:** pure logic file `setupLogic.ts` (Stabilized ID, manual field protection, partial reference restoration); 592 line, there are tests) but only re-use functions and not package the `src/organization/` interface.

## 3. Field map, and five conflicts in 9.4

### 3.1 field map (DP3 — master application)

| DP3 | Main application | Practice |
| --- | --- | --- |
| `OrgRole.id` | `Role.id` | Direct (stable ID) |
| `OrgRole.title` | `Role.displayName` | Direct |
| `OrgRole.departmentId` | **Add optional fields `Role.departmentId`** | Sectors are merely labeled and used to group and color; **`Role.fn`（`RoleFunction`** (see conflict 1) |
| `OrgRole.description` | **Add optional `Role.description`** | Low risk |
| `OrgRole.responsibilities[]` | **Add optional `Role.duties?: string[]`** | Enter Handoff Manual, AI context |
| `OrgRole.source/quote/confidence/manualFields/position/parentRoleId` | — | Do not move ( `position` Response to conflict 2; Organisation |
| Sector `Department{id,name,color}` | **Add optional `org.departments`** | Colour is user data, same as status colour (changeable, not token) |
| `RaciRow.responsible` | `Node.ownerId` | By "rolle — the current person" |
| `RaciRow.accountable` | `Node.approverRoleId` | Direct correspondence |
| `RaciRow.consulted / informed` | `Node.consultedRoleIds / informedRoleIds` | Direct correspondence (nearly one to one) |
| `OrgAction`(Duties entry, no date) | **`StepTemplate` Additional steps of style**No, it's not.  `Node` | 9.4 Decision: Action is better suited to become process template |
| `FlowNode.title / description` | `title` / `why` | Direct |
| `FlowNode.dependsOn` | `Node.dependsOn` | For "additional steps" only; `dependencyMode:"any"` See conflict 3 |
| `FlowNode.timing` | `Node.anchor`（rule/target/fixed） | See conflict 4 |
| `Assignment`(action #role) | Responsibility for additional steps | Parsing as Manager |
| `guide`、`aiRuns`、`messages`、`generated`、`compiled`、`approvals` | — | I'm not moving. |

### 3.2 Five Conflicts (decisions taken by 9.4, adopted)

1. **`departmentId` vs `RoleFunction`: both remain.** `RoleFunction` remains the main key to process templates, swimming lanes and manuals; `departmentId` just group labels. A map of "departmental functions" is required: Programs & Planning & Programs, Event Losistics & Projects, Finance & Purchasing & finance, Marking & Communication & marking, Outreach, Leadership & Records § president / vice_president / interface (in the name of rule, it is not possible to judge on secretary and can be changed at the interface). **more than one, so it has to be manual.**
2. **`FlowNode.position{x,y}`: Discard** on import and use `metro.ts` automatically. The drag node editor for DP3 is not migrated; Later the user changed "Order and Dependence" (M3 already done).
3. **`dependencyMode:"any"`: Only `"all"` is accepted.** refused when confronted with `any` and explicitly told the user "This worklow uses an 'any' link, which Platypus does not support yet." Don't pretend all. **does not change `src/engine/` for this.**
4. **`timing`: Only** can be translated into the `Node.anchor`+ process and handed over to `schedule.ts`. **cannot be written directly into three date fields in any case. The date appearing in** AI or constitution is discarded (AGENTS.md Rule 3).
5. **DP3 There is no "person": after** joining **must have the step of "who holds each rule"**, i.e. step 3 Team table (the row, line). Saved the whole Tasks / Team / Today no data.

## 4. The "human" hierarchy (Project A for 10.4)

**Scope: Only data modelling, not live login. Phase 3 still uses field information, live account number to v1. 5.**

- Levels: **`Person` * `Role` § `Department`**.
- **`Person.roleId` is the only truth.** `Role.holderId`Now repeat it. 37I don't know what to do with it. **No, no, no. Change to "divine value."**: add a function `syncHolders(state)`, in Setup completes, saves settings, saves personal data, completes a call for each of these places `holderId`Always equals " `roleId`It's the man."  Benefits: No change in the use of 37; The risk is concentrated in a function and an "always consistent" test.
- **One roll individual** (consistent with the present); A man with a role. Multiple people with role are not in this range.
- `canLead` is still president/ vice present.
- **don't do account codes.** invitation remains the "show link to the same browser" (existing `InviteLink` + `Join.tsx`); The participants got us the full figure.
- **A new tip.**Real steps are planned for a later procedure.

## 5.  ⚠  IRB: Server storage must be kept closed and programme does not need it

**Hard Rule: The** process **does not call any `/api/org/*`, `/api/workspace*`** and `ORG_SETUP_ENABLED` continues to be open. IRB materials still contain **without** "Service Storage Organization Configuration" (`docs/IRB_HANDOFF_2026-10-28.md`, sect. 2).

| Data | Where? | Annotations |
| --- | --- | --- |
| Drafts in settings | **Only** localStorage (deleted when single key, complete or reset demo) | No touching. `src/organization/` Draft/archive code for |
| Constitution File | **Read** only in browser (pdfjs/ Mammoth running on browser) | (b) Never reach them; And don't keep the originals. |
| Contents to AI | "Read it with AI" only. **Extracted Text**Send one. **New, unstored**Server Functions  | The function transmits only to AI (ASU AIR) and returns the result. **does not need Blobs, no writing log text**; and existing `/api/chat`、`/api/event/review` Same category |
| Content filled out by participants | Allactional (following Handoff's hint "Fictional example only") | Never past a real view or members details." |
| Default entrance | **"Use our sample condition"**  | Participants don't need to find their own files. |

**The "gatekeeper" test to add:**
1. The new server function **does not import `serverStorage`**, calling `getStore` is 0 (the same way as `serverStorageHidden.test.ts`).
2. **requests for any `/api/org/` or `/api/workspace` are 0** (repeal with "0 storage requests" using the existing e2e).
3. Add an AI result filter: all date fields are discarded; Only live fields remain; Maximum number of words/bars.
4. Construction inspection: no `/api/org/setup` string of this type can be found in the study (optional, with a unit text reading product).

## 6. Workload, can you finish by 11/9?

| Session | Contents | Size |
| --- | --- | --- |
| **M4a Data Base** (no interface) | New Optional Fields ( `Role.departmentId/description/duties`、`org.departments`- additional steps; `syncHolders` And the "always consistent" test; DP3 — Conversion pure function for master applications `src/lib/orgAdapter.ts` and map tests; • Functional mapping | 1 Sessions |
| **M4b Settings Interface**  | Team tables, Duties, Event steps, overviews with 5 components; Join synchronisation; Words/accessibility/cell phones | 1.5–2 Sessions |
| **M4c Read constitution (optional accelerator)**  | Browser Read File + Non-storage Server Function + Prompt + Filter + Suggested Line Interface + Simulate AI Test + Door Watch Test | 1 Sessions |
| **M4d End** | e2e (desktop + cell phone), a11y, documents (AGENTS.md, PROGRESS, DESIGN_TOKENS if new token), your acceptance modification | 1 Sessions |

**4–5 Sessions** plus each step of your acceptance round-trip.

**Can you finish by 11/9? Not recommended.**
- From today (10/29) to 11/9 for 11 days; The pre-test freeze period was removed (at least 3 days without code change, 11/6 cases) with only about 8 days left.
- 4–5 Sessions + 9–11 days as soon as you change every time after acceptance, and M4b, M4c will modify the `Role`/ `Person` relationships shared on all pages and there's no time to check them.
- Research missions do not need to read "constitution " : participants have access to the field club.

**Three Options:**
- **A (Recommendation):** 11/9 did nothing before and the programme was frozen. Press M4a → M4b → M4c → M4d after Phase 3.
- **B:** 11/9 formerly only **M4a** (invisible database: optional fields, `syncHolders` and testing). The benefit of the same interface and the lowest risk is that a new field is already in the Phase 3 data. I still recommend staying after the test because "zero risk" will cost you one more time.
- **C:** all done. No, for the reasons given above.

## 7. The question of Juanxi's tablet

1. **, now or after Phase 3?** Recommendation **A: Phase 3 After**. (B do only M4a can, but with no obvious benefit. ）
2. **, "read communication + AI" want to do it?** It is M4c, **optional**. If Phase 3 only uses the sample club of fielding, participants will not upload communication, but may first do M4a + M4b (persons, departments, duties, extra steps) and leave AI reading consultation to v1. 5. Recommendation: **not to do M4c**.
3. **, do you want to go to the first edition of extra steps?** is step 5, where the standard process adds its own. It lengthens the process of Phase 3 participants; If not, M4b can be reduced to **Team + Duties two steps**, save about half a session. Recommendation: The first version of **is only for Team+Duties, with additional steps left after**.
