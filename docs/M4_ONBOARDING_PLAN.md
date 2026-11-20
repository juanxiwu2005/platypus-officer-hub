# M4 plan: combine two onboarding flows into one (awaiting Juanxi's review)

**Status: proposal only; no code changed.** Drafted by Claude, 2026-10-29, branch `integration/v1.0`.
(The execution plan called this "M3"; M3 now means the ordering task, so this is renamed **M4**.)
Basis: execution plan 8.6, 9.1, 9.2, 9.4, 9.6, 10.4; `AGENTS.md` §§10–12; `docs/IRB_HANDOFF_2026-10-28.md` §2; code inspection covered structure only: `src/pages/Setup.tsx`, `Join.tsx`, `src/organization/` (file list and `schema.ts` types), `src/phase1/serverStorage.ts`, `vite.config.ts`, `netlify/functions/`.

## 0. Recommendation first

| | |
| --- | --- |
| **Recommendation** | **Do not merge before Phase 3 (11/9); defer until after Phase 3.** Finalize and freeze the plan now; at most, do one small “invisible” item before 11/9 (option B in section 6), or do nothing |
| Why | ① Completion takes 4–5 sessions, plus your acceptance reviews; 11 days is insufficient, and code must be frozen for at least 3 days before testing; ② it changes the `Role`/`Person` relationship, and `holderId` is used in 37 places across the app—too risky before testing; ③ participants use fictional information, so DP3's most valuable feature, “read a constitution and automatically create roles,” is not essential to study tasks |
| Participants already have usable setup | The main app's `/#/setup` (5 steps) plus `/#/join` (5 questions); DP3's 5-chapter AI setup is **completely unreachable** in the study build |

## 1. What do Phase 3 participants see now? What would unification look like?

### 1.1 Now (verified)

- **Study build** (`ORG_SETUP_ENABLED` unset, therefore off): participants can only use the main app's **`/#/setup`**: Your club → Semester goals → Officer roles → Invite & workspace → First event (5 steps, data stored only in the browser); officers use **`/#/join`** (5 questions, demo links for the same browser).
- DP3's 5-chapter AI setup (Constitution → Your team → Responsibilities → Activity workflow → Review) is at `/#/phase1/`. With build-time `SERVER_STORAGE = false`, those screens **are not bundled**, leaving only a local example at `/#/phase1/`. Its AI uses `/api/org/ai` and the other 7 endpoints, all returning 404 when disabled.
- The current state is therefore “one usable flow, the other disabled,” not “both usable.”

### 1.2 After unification (text sketch)

Only one route: `/#/setup` (president/VP) and `/#/join` (officers). DP3 content becomes additional Setup steps, built with the main app's components, with data still stored only in the browser.

```
Set up your fictional club                         ● ● ● ○ ○ ○ ○    (progress Chain)
─────────────────────────────────────────────────────────────────────────────
1 Club        name · mission · school
              [ Use our sample constitution ]  [ Choose a file ]  [ Paste text ]   ← Optional; may be skipped
              (Click "Read it with AI" → role rows labeled "AI suggestion · check it" appear below, with Add / Skip per row)
2 Goals       (Existing: 2–3 goals)
3 Team        Table (.tbl): one “person” per row—Name · Email · Role · Department
              Departments are colored tags; Role is a dropdown; "+ Add person" at top right
              Click a row → right-rail Details: this person's role responsibilities (Duties)
4 Duties      Duties by role (editable tags) + default R/A/C/I (responsible, accountable, consulted, informed)
5 Event steps Add “this club's own steps” to the standard workflow: name · role · days · which step it follows
              (Same rules as M3's Edit steps, not another flowchart)
6 Invite      (Existing: invitation links + workspace channels)
7 First event (Existing: one sentence → form → confirmation) + one-page overview of everything above; save only on confirmation
─────────────────────────────────────────────────────────────────────────────
Back  Next      "Nothing is saved until you approve the first workflow."
```

- 7 steps look like many, but **1, 4, and 5 can all be skipped** ("Skip — use the standard plan"), so the fastest path remains the original 5 steps.
- Participants use fictional information; AI is an **optional accelerator**: the entire flow still works with AI off (top-bar AI features toggle).

## 2. Which DP3 chapters to bring over, and how to rebuild them with the main app's 5 components

The main app's 5 components (AGENTS.md §7.2): status blocks `StatusPill`, progress `Chain`, table `.tbl`, hover cards `Hover`/`Info`, and right-rail details (`useRail().show`). The only AI entry is right-rail Ask (§7.1).

| DP3 chapter | What it does | Bring over? | Rebuild in the main app |
| --- | --- | --- | --- |
| **1 Constitution** | Upload PDF/Word or paste → AI extracts club name, mission, roles, departments for roles, and uncertainties | **Yes (optional)** | A row of buttons in Setup step 1; files **read only in the browser** (`readConstitution` uses pdfjs/mammoth; no upload); clicking "Read it with AI" sends only **text** to a **new stateless** endpoint (section 5); results become suggestion rows with Add/Skip per row (like change cards); AI uncertainties go in `Info` hover cards |
| **2 Your team** | Departments, roles, organization chart (`SetupCharts.tsx`, 958 lines), members | **Half** | **Bring:** departments, roles, people (step 3 table). **Leave:** organization chart (you chose a simple style; a subway-map style could be used later). People become the table's focus (section 4) |
| **3 Responsibilities** | Department/role duties, Check (AI risk review) | **Duties yes, Check no** | Step 4: editable duty tags for each role, viewable in right-rail Details. Defer `Check` (`risk_check`); the main app already has event Plan check |
| **4 Activity workflow** | Member flowchart + executive-board flowchart (`FlowEditor.tsx`, manually dragged nodes) | **Only custom steps** | No flowchart (9.4②: no FlowEditor). Step 5: **add this club's own steps** to the standard workflow (extra steps in the style of `StepTemplate`, generated with standard steps when creating events); ordering/days follow M3 editing rules. **Defer executive-board workflow (boardFlow)** |
| **5 Review** | Approval, `guide` (club instructions for AI), machine-readable JSON compilation, risk summary | **Overview yes, guide/JSON no** | One-page overview in step 7; no `guide` needed (main-app AI reads actual data directly through `aiContext.ts`); JSON can later become part of "Export my data" |

**Bring none of these:** server storage, original-file archive (`archive.ts`, `client.ts`), AI task records and diagnostics, chat history, `src/workspace/`, `organization.css` / `setupV3.css` / `phase1.css` (4,567 lines of a third design system), `FlowEditor.tsx`, `SetupCharts.tsx`. **Reusable:** pure logic in `setupLogic.ts` (stable IDs, manual-field protection, local-reference repair; 592 lines, tested), but reuse functions only, without bundling `src/organization/` UI.

## 3. Field mapping and handling the five conflicts in 9.4

### 3.1 Field mapping (DP3 → main app)

| DP3 | Main app | Approach |
| --- | --- | --- |
| `OrgRole.id` | `Role.id` | Use directly (stable ID) |
| `OrgRole.title` | `Role.displayName` | Use directly |
| `OrgRole.departmentId` | **New optional `Role.departmentId`** | Department is only an additional grouping/color tag; **`Role.fn` (`RoleFunction`) remains the engine's primary key** (conflict ①) |
| `OrgRole.description` | **New optional `Role.description`** | Low risk |
| `OrgRole.responsibilities[]` | **New optional `Role.duties?: string[]`** | Included in Handoff handbook and AI context |
| `OrgRole.source/quote/confidence/manualFields/position/parentRoleId` | — | Omit (`position` relates to conflict ②; no organization chart) |
| Department `Department{id,name,color}` | **New optional `org.departments`** | Colors are user data, in the same category as status colors (editable, outside tokens) |
| `RaciRow.responsible` | `Node.ownerId` | Resolve a person through “role → current holder” |
| `RaciRow.accountable` | `Node.approverRoleId` | Direct correspondence |
| `RaciRow.consulted / informed` | `Node.consultedRoleIds / informedRoleIds` | Direct correspondence (this group is almost one-to-one) |
| `OrgAction` (undated duty item) | **Extra step in `StepTemplate` style**, not `Node` | 9.4 decided: Action fits better as a workflow template |
| `FlowNode.title / description` | `title` / `why` | Use directly |
| `FlowNode.dependsOn` | `Node.dependsOn` | For extra steps only; `dependencyMode:"any"` covered by conflict ③ |
| `FlowNode.timing` | `Node.anchor` (rule/target/fixed) | See conflict ④ |
| `Assignment` (action → role) | Responsible role for an extra step | Resolve to an owner |
| `guide`, `aiRuns`, `messages`, `generated`, `compiled`, `approvals` | — | Omit |

### 3.2 Five conflicts (reuse decisions already made in 9.4)

1. **`departmentId` vs `RoleFunction`: keep both.** `RoleFunction` remains the primary key for workflow templates, swimlanes, and handbooks; `departmentId` is only a grouping tag. A “department → function” mapping is needed: Programs & Planning → programs, Event Logistics → programs, Finance & Purchasing → finance, Marketing & Communication → marketing, Outreach & Partnerships → outreach, Leadership & Records → president / vice_president / secretary (infer from role title; if unclear, use secretary and show that it can be changed). **Many-to-one, so manual changes must be allowed.**
2. **`FlowNode.position{x,y}`: discard on import**, always use `metro.ts` automatic layout. Do not migrate DP3's node-dragging editor; users will edit “order and dependencies” instead (already implemented in M3).
3. **`dependencyMode:"any"`: accept only `"all"`.** Reject `any` with the explicit message "This workflow uses an 'any' link, which Platypus does not support yet."; never silently treat it as all. **Do not modify `src/engine/` for this.**
4. **`timing`: translate only into `Node.anchor` + workflow lead times**, then let `schedule.ts` calculate. **Never write it directly into the three date fields.** Discard all dates from AI or constitutions (AGENTS.md rule 3).
5. **DP3 has no people:** unified onboarding **must ask “who holds each role”**, in step 3's Team table (people as rows, roles as a column). Without it, Tasks / Team / Today have no data.

## 4. People-first hierarchy (option A in 10.4)

**Scope: data modeling only, no real login. Phase 3 still uses fictional information; real accounts wait until v1.5.**

- Hierarchy: **`Person` → `Role` → `Department`**.
- **`Person.roleId` is the sole source of truth.** `Role.holderId` currently duplicates it (37 uses across the app); **retain it as a derived value**: add `syncHolders(state)`, called consistently on Setup completion, settings save, profile save, and handoff completion, so every role's `holderId` always equals “the person whose `roleId` is this role.” Benefit: none of the 37 uses needs changing; risk is concentrated in one function and one “always consistent” test.
- **One person per role** (as today); one role per person. Multiple people in a role are out of scope.
- Permissions unchanged: `canLead` still means president/VP.
- **No usernames/passwords.** Invitations remain same-browser demo links (existing `InviteLink` + `Join.tsx`); participants receive fictional people supplied by us.
- **New one-sentence notice** in the Team step: "Fictional names only. Real accounts are planned for a later version."

## 5. ⚠️ IRB: server storage must remain disabled; this plan does not need it

**Hard rule:** the unified flow **calls no `/api/org/*` or `/api/workspace*` endpoints**; leave `ORG_SETUP_ENABLED` unset (off). IRB materials still **must not** describe “server storage of organization configuration” (`docs/IRB_HANDOFF_2026-10-28.md` §2).

| Data | Location | Notes |
| --- | --- | --- |
| Setup drafts | **Browser only**, localStorage (separate key, deleted on completion or Reset demo) | Leave `src/organization/` draft/archive code untouched |
| Constitution file | **Read only in browser** (pdfjs/mammoth run in the browser) | Never uploaded; original not saved |
| Content sent to AI | Only when the user clicks "Read it with AI": **extracted text** sent to a **new stateless** server function | Function only forwards to AI (ASU AIR) and returns the result; **no Blobs, no text bodies in logs**; same category as existing `/api/chat` and `/api/event/review` |
| Participant input | All fictional (reuse Handoff's "Fictional example only" notice) | Beside the paste box explicitly show "Fictional example only. Never paste a real constitution or member details." |
| Default entry | One-click **"Use our sample constitution"** | Participants need not find a file themselves |

**Guarding tests to add:**
1. The new server function **does not import `serverStorage`** and makes 0 `getStore` calls (same approach as `serverStorageHidden.test.ts`).
2. Page test: complete the unified flow with **0 requests to any `/api/org/` or `/api/workspace` endpoint** (reuse the existing e2e zero-storage-requests assertion).
3. New AI-result filtering: discard all date fields; retain only actual supported fields; cap word and item counts.
4. Build check: strings such as `/api/org/setup` absent from study build (optional unit test reading build output).

## 6. Effort and feasibility before 11/9

| Session | Contents | Size |
| --- | --- | --- |
| **M4a Data foundation** (no UI) | New optional fields (`Role.departmentId/description/duties`, `org.departments`, extra steps); `syncHolders` and “always consistent” test; DP3 → main-app pure converter `src/lib/orgAdapter.ts` and mapping-table tests; department → function mapping | 1 session |
| **M4b Setup UI** | Team table, Duties, Event steps, overview using 5 components; synchronize Join; word counts/accessibility/mobile | 1.5–2 sessions |
| **M4c Read constitution (optional accelerator)** | Browser file reading + stateless server function + prompt + filtering + suggestion-row UI + mocked AI tests + guarding tests | 1 session |
| **M4d Finish** | e2e (desktop+mobile), a11y, documentation (AGENTS.md, PROGRESS, DESIGN_TOKENS if new tokens), changes from your acceptance review | 1 session |

Total **4–5 sessions**, plus back-and-forth acceptance review at each step.

**Finish before 11/9? Not recommended.**
- Today (10/29) to 11/9 is 11 days; subtract the pre-test freeze (at least 3 days without code changes, starting 11/6), leaving about 8 days.
- 4–5 sessions + changes after each acceptance review take at least 9–11 days, and M4b/M4c change the `Role`/`Person` relationship shared by all pages; there is no time for prolonged debugging.
- Study tasks do not require constitution reading: participants receive fictional clubs.

**Three options:**
- **A (recommended):** do nothing before 11/9; freeze the plan. After Phase 3, implement M4a → M4b → M4c → M4d.
- **B:** do only **M4a** before 11/9 (invisible data foundation: optional fields, `syncHolders`, tests). No UI change, lowest risk; benefit: Phase 3 data already includes the new fields. I still recommend waiting until after testing, because even “zero risk” costs an acceptance review.
- **C:** do everything. Not recommended, for the reasons above.

## 7. Decisions Juanxi needs to make

1. **Now or after Phase 3?** Recommend **A: after Phase 3**. (B, M4a only, is possible but offers no clear benefit.)
2. **Include “read constitution + AI”?** This is M4c, **optional**. If Phase 3 uses only fictional example clubs, participants will not upload constitutions; start with M4a + M4b (people, departments, duties, extra steps) and defer AI constitution reading to v1.5. Recommendation: **defer M4c**.
3. **Include extra steps in version one?** Step 5 lets clubs add their own steps beyond the standard workflow. This lengthens the flow for Phase 3 participants; if unnecessary, reduce M4b to **Team + Duties only**, saving about half a session. Recommendation: **Team + Duties only in version one; extra steps later**.
