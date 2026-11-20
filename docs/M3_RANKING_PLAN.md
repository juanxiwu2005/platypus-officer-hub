# M3 Ranking-Question Plan: Reorder Steps with a Ranking Question and Recompute the Metro Diagram Immediately

**Status: awaiting Juanxi's review. This is a proposal only; no code has changed.** Drafted by Claude, 2026-10-29, on `integration/v1.0`.
Basis: execution plan section 10.2 (including "M3 hard constraints") and section 9.4 item ②. Checked against `src/data/types.ts` (Node, Phase), `src/engine/schedule.ts`, `src/engine/playbooks.ts`, `src/components/flow/metro.ts`, `src/pages/Events.tsx`, `src/components/NodePanel.tsx`, and `src/data/store.tsx`.

## 0. Four findings that differ from the execution plan (all verified in code)

1. **The "days required" field is `Node.estDays`, not `Node.effort`.** The plan's `effort` field does not exist in code. `estDays` counts working days, ranges from 0–30, and is rounded and clamped by `updateNode`. To compute latest start, the engine uses **`estDays` plus the owner's personal buffer days**.
2. **`estDays` does not affect the forecast percentage.** The forecast (`forecast.ts`) uses a different field, `Node.tier` (light 1–2 days, medium 3–5 days, heavy 5–10 days). Changing days alone changes dates but not the on-time probability, creating an apparent inconsistency. See question 3 in section 9.
3. **There is nowhere to store "order."** No data field says which position a step occupies (`Node.rank` only orders cards within board columns). Step sequence is **entirely determined by `dependsOn` (which step waits for which)**. After dragging, the list is therefore **recomputed from dependencies**. Conclusion: **every drag must become a dependency change or a Phase change**; otherwise the row snaps back after release.
4. **Phase order (the outer ranking) differs from dependency order.** The template has 3 "backward" dependencies: `approve` (plan) waits for `budget` (money); `foodex` (prepare) waits for `quote` (money); `usg` (money) waits for `flyer` (marketing). A list grouped by Phase cannot therefore be interpreted as execution order.

## 1. Location: "Edit steps" for an event on Events

Events currently has Flow / List views. Add a third: **Flow · List · Edit steps** (visible only to the president and VP; other users' List stays unchanged). On desktop, place the ranking question on the left and metro diagram on the right (**the same event and data**, recomputed immediately after every change). On phones, put the ranking question above the vertical metro diagram.

```
Events   [Networking Night ▾]            [ Flow | List | Edit steps ]
+------------------------------------------+---------------------------+
| Club buffer: 3 working days · Settings → | (Metro diagram, live)     |
| Your reminder lead: 1 day (private) [-][+]|                           |
|                                          |  ●──●──●──●──●──◆──●      |
| ▼ Plan                          3 steps  |     \_●_/   \__●__/       |
| +------------------------------------+   |                           |
| |≡ ▲▼ Meet the speaker      Days [ 2 ▾]|   | (Selected row's dot      |
| |      waits for: —                   |   |  is highlighted)         |
| |      Start Oct 21 · Club Oct 23 · ASU|   |                           |
| +------------------------------------+   |                           |
| |≡ ▲▼ Draft the event plan  Days [ 2 ▾]|   |                           |
| |      waits for: Meet the speaker × [+]| |                           |
| |      Start Oct 23 · Club Oct 27 · — |   |                           |
| +------------------------------------+   |                           |
| ▼ Prepare                       9 steps  |                           |
|   …                                      |                           |
+------------------------------------------+---------------------------+
 Each row: ≡ drag handle · ▲▼ move up/down · title · Days numeric input · "waits for" tags (× removes, + adds)
           ⋯ menu: Do after the row above / Do alongside the row above / Move to phase…
           Date row: read-only, from the engine (Start / Club / ASU, shown separately)
```

Key points:
- **Outer ranking = the 6 Phase groups; inner ranking = steps within a group.** Group sizes differ: plan 4, prepare 9, money 5, marketing 4, run 3, close 3 (28 steps total). Prepare has 9, exceeding your "about 5," so each group can collapse.
- Each row's dates are **read-only** and shown separately. For "Start," **only the owner** sees an algorithm explanation containing their personal buffer; everyone else sees a generic explanation (consistent with the current detail panel and personal-buffer privacy).
- With Behind the scenes enabled, source explanations appear below dates (reuse S7's mechanism rather than creating another).
- This is outside Events' default view, so it does not count toward AGENTS.md §7.5's Events word limit (the word check measures only the default view).

## 2. Outer ranking maps to Phase: can Phase order be dragged?

**Recommendation: do not allow dragging Phase order; fix it as plan → prepare → money → marketing → run → close.** Reasons:

| Effect of dragging Phase order | Finding |
| --- | --- |
| Where is order stored? | Only in a code constant (`ORDER` in `src/lib/phases.tsx`), with no data field. Persisting it requires a new field (a data-structure change), violating "the interface writes only dependsOn / days / phase" |
| Does it affect the **engine**? | **Order has no effect; only whether the phase is close matters.** The engine checks only `phase === "close"`: close steps are scheduled **after** the event (3 working days after, no earlier than the first working day after). Other phases are treated identically (`schedule.ts` lines 193/199/214/307) |
| Does it affect the **forecast**? | Same: only close is special (does not start before event day and is excluded from the critical path; `forecast.ts` lines 42/76) |
| Does it affect the **metro diagram**? | The main line follows **dependencies**, not Phase (only `phase==="close"` determines the post-event side; `metro.ts` line 51). Reordering phases therefore does not change the diagram |
| Does it affect **Today progress dots**? | Yes: each event progress-chain dot on Today represents one Phase, ordered by `ORDER` |

Thus **dragging Phase order would only make Today's progress dots disagree with the editor, without changing any dates**. It is unhelpful and misleading.

**What we can support is moving a step to another Phase:** drag a row into another group, changing only that row's `phase` (≤ one field, no dependency changes). ⚠️ **Moving into or out of Close changes dates** (into Close = after the event; out = before it), so show "Close-out steps are scheduled after the event." and before/after dates during the move.

One other small gap: `NodePatch` (`src/data/store.tsx`) currently **does not permit `phase` changes**. M3 must add `phase` (only this field).

## 3. ⚠️ Critical: convert list order into `dependsOn` without losing parallelism

### 3.1 Why we cannot chain steps in list order

The template has 28 steps, **many running in parallel**. For example, after `approve`, all 9 of `registry`, `venue`, `offvenue`, `advisor`, `quote`, `dining`, `permit`, `foodplan`, and `flyer` wait only for `approve`, independently. `sap` waits only for `partner`, in parallel with `draft` and `mktneeds`. `usg` waits for `quote`, `flyer`, and `budget` together (a merge).

Chaining all 28 in list order would **add every step's processing days together**, totaling **37 working days**, versus the current actual longest route (critical path) of **15 working days**. Almost every latest start would shift 22 working days earlier, many becoming "before today" or "unable to meet the ASU deadline," and the metro diagram would become a straight line. **This is the failure you are concerned about, so it must never happen.**

### 3.2 Proposal: dependencies are the source of truth; the list is one representation

| Rule | Behavior |
| --- | --- |
| **R0 Never rebuild dependencies from the list** | Never "iterate over rows and set each `dependsOn = previous row`." Dependencies change **individually**, only through explicit user actions |
| **R1 List ordering** | Group by Phase (fixed order); within each group, sort by dependency depth (what comes first) → engine-computed club deadline → title. Recompute after each edit so the released row lands in its new position |
| **R2 Drop below row U** | Means **"do this step after U"**: add only dependency U to dragged row R (R waits for U). Leave every other row unchanged. If R previously waited for d and U already waits directly or indirectly for d, d→R is **redundant**; remove it too (unchanged dates, fewer metro lines) |
| **R3 Drop above row V** | Means **"do this step before V"**: add only dependency R to V (V waits for R). Remove redundant dependencies in the same way |
| **R4 Release between two rows** | Open a small panel with two options: **① Do after "the row above"** (checked by default, = R2); **② Do before "the row below"** (unchecked by default, = R3). Both may be selected (insert between them), or just one. Dependencies remain visible and selectable rather than being silently added |
| **R5 Run two steps in parallel (Do alongside)** | Row-menu **Do alongside the row above** removes the dependency between R and row U above, and makes R wait for **U's prerequisites** (so they start together). Preserve R's other existing prerequisites |
| **R6 Prevent cycles** | Before submitting, check whether the new dependency makes R indirectly wait for itself. If so, **reject** and identify the steps (for example, "Reserve the room waits for Add the RITM number, which already waits for it"). The engine only reports cycles afterward, so the interface must check first |
| **R7 Cross a dependent row** | Dragging across a row with a **direct dependency** on/from this row means **reversing their sequence**: remove the existing edge and add its reverse. This is a substantial change, so show before/after dates for confirmation before release; reject it if it creates a cycle |
| **R8 One drag = one action = one log entry = one undo** | See section 6 |

### 3.3 A concrete example (actual template steps)

Initial state (excerpt): `approve` ← `registry`, `venue`; `ritm` waits for both `registry` and `venue`; `offvenue`, `advisor`, and `quote` also wait only for `approve`.

**Action:** drag **Reserve the room (`venue`)** below **Register the event (`registry`)** and select "Do after Register the event".

| | `venue` dependencies | Other steps |
| --- | --- | --- |
| Before | `[approve]` | `registry:[approve]`, `ritm:[registry, venue]`, `offvenue:[approve]`, `advisor:[approve]`, `quote:[approve]`… |
| Apply R2 | Add `registry` → `[approve, registry]`; since `registry` already waits for `approve`, remove redundant `approve` → **`[registry]`** | **None changes**: `offvenue`, `advisor`, `quote`, `dining`, `permit`, `foodplan`, `flyer`, `sap`… still wait only for their previous prerequisites, **preserving all parallelism**; `ritm` still waits for `registry` and `venue`, correctly |

After recomputation, `venue` waits for `registry` to finish, bringing `registry`'s club deadline earlier (it must finish before `venue` starts). `venue`'s own ASU deadline (R03) stays unchanged. The diagram moves `venue` from alongside `registry` to after it; other branches stay unchanged. Only **1 dependency of 1 step** changes.

**Compare chaining the list:** that same drag would rewrite every dependency among 28 steps, increasing total days from 15 to 37.

### 3.4 Two edge cases

- **Rows "snap back" within a group:** since order is not stored, swapping unrelated rows without selecting an option changes nothing. They return to their previous positions with: "These steps don't depend on each other, so their order is set by their dates. Tick \"Do after\" to make one wait for the other."
- **Steps with manually set club deadlines (`clubDeadlineOverride`):** the editor never touches this field; show "Club deadline set by a person" beside those dates.

## 4. Where to write and display processing days and lead days

| Item | Storage | Interface |
| --- | --- | --- |
| **Processing days** | `Node.estDays` (integer 0–30; existing `updateNode` clamps the range) | "Days" numeric input on the right of each row; recompute immediately |
| **Shared club lead days** | Not edited here. This is `org.settings.clubBufferBusinessDays` (default 3 working days), already configurable in Settings → "Deadline and follow-up defaults" | Read-only top line: "Club buffer: 3 working days before every ASU deadline", linked to Settings; applies uniformly to all tasks |
| **Personal lead days** ("remind me 2 days early") | `Person.personalBufferDays` (0–5, already in Settings → My preferences; only the person can edit it, and it can be disabled) | At the top, "Your reminder lead: N days (private)", **only for the current viewer**, with −/＋ buttons (writes their preference, not a date). Other people's personal-buffer numbers **are hidden**, as now |
| **Latest start calculation** | No direct writes. Engine: `latest start = club deadline − (estDays + owner's personal buffer)`, using the owner's working days (skipping busy weeks) | Start in each date row; open details / Behind the scenes for the calculation |

Show three dates separately on each row: **Start** (each person's latest start) · **Club** (club deadline) · **ASU** (official deadline; omit if no rule applies).

## 5. Operate without dragging (keyboard and phone)

- Each row has **▲ ▼ buttons**: actual buttons reachable by Tab and activated by Enter/Space. Same semantics as dragging: **▼ = after the row below (Do after it); ▲ = before the row above (Do before it)**. Crossing a directly dependent row reverses their order (R7).
- The ⋯ menu also offers **Do after the row above / Do alongside the row above / Move to phase…**, most convenient on phones.
- **Dragging:** mouse dragging on desktop (reuse Tasks board's approach; add no drag library). **No touch dragging in the first phone version** (HTML5 drag does not work on touch); use ▲▼ and menus, adding touch dragging later if needed.
- The drag handle is a button with descriptive text ("Drag to reorder: Draft the event plan"), accessible to screen readers and announcing row position.
- Explain rejected actions (cycles, cross-Phase restrictions) in one line with `role="status"`, without a dialog.

## 6. Who can edit, undo, and interaction logging

- **Permissions:** as with `updateNode`, only **president and VP** (`canLead`). Others do not see "Edit steps". AI **cannot** use this entry point (its allowed actions stay unchanged; do not add AI actions such as `unlink` or `set_phase`).
- **Add one store action**, `applyStepEdits`: one drag = one action containing patches for several steps. **Each patch permits only `dependsOn`, `estDays`, and `phase`** (optionally `tier` as a fourth field; see question 3). Validate the allowlist, check cycles, clamp ranges, and call **`applySchedule()` only once** at the end.
- **Undo:** save affected steps' previous values before each action. After release, show an **"Undo"** notice (as for small AI changes; reuse `undoAuto`'s "restore before" approach). Retain the latest 10 actions; do not retain undo history after refresh (as now).
- **Interaction log:** every store action is already logged automatically (action content + previous values). Add `payloadOf` / `beforeOf` branches for `applyStepEdits`, recording "which step, and the old/new `dependsOn`/`estDays`/`phase` values." **No date fields enter the log.**

## 7. Hard constraints, item by item

1. **The interface writes only `dependsOn`, `estDays` (= your effort), and `phase`. Never write date fields `officialDeadline`, `clubDeadline`, `latestStart`, or `clubDeadlineOverride`.** In `applyStepEdits`, allowlist only those three (plus optional `tier`). Add a unit test showing that all date-field changes before/after any patch come only from `applySchedule`.
2. **Call `applySchedule()` after edits** (existing store `updateNode` already does this; follow it).
3. **Do not change `src/engine/`.** Put new logic in a new pure-function file, `src/lib/stepOrder.ts` (list ordering, drag → patches, cycle checking, redundant-edge removal), and in the store/interface.
4. Live metro updates mean rerunning `computeSchedule()` + `metro.ts` layout (already the case); **never store coordinates**.
5. Use only tokens in new styles (S6 stylelint/eslint checks this); add no dependencies.

## 8. Tests and estimated effort

**Unit tests** (`src/test/stepOrder.test.ts` and store tests):
- List order: grouped by Phase; the 3 backward cross-Phase dependencies cause neither errors nor incorrect ordering.
- Drag → patches: one each for R2, R3, R4, R5, R7; assert section 3.3's example **step by step** (`venue` becomes `[registry]`; every other `dependsOn` is unchanged).
- **No-chain test:** perform several drags on the full template; changed-step count ≤ drag count × 2, and total days / critical path do not become 37.
- Cycles: reject direct and indirect cycles, identifying the steps.
- Remove redundant dependencies (transitive reduction); hints when moving `phase` into/out of close.
- **No date fields:** discard date fields in any patch; preserve `clubDeadlineOverride` before/after submission.
- Permissions: ignore actions by anyone other than president/VP. Undo: restore exact prior `dependsOn`, `estDays`, and `phase`, with identical recomputed dates. Logging: one entry, no date fields.

**Browser tests** (desktop + phone, `e2e/`):
- Mouse-drag a row → release panel → select option → metro dot and dates change (assert club deadline in the dot's `aria-label`).
- Keyboard only: Tab to ▼, Enter; row and dates change; "Do alongside" menu.
- Phone: achieve the same through ⋯ and ▲▼ (no phone dragging).
- Change Days → date row and diagram change; values above 30 clamp.
- Non-presidents do not see "Edit steps"; rejected actions have explanatory text; Undo restores; edits survive refresh (consistent with existing saves).
- a11y (axe on desktop + phone, including wcag22aa 24×24 touch targets); date-row explanations with Behind the scenes enabled.

**Estimated effort: more than one session; split into three:**

| Step | Scope | Size |
| --- | --- | --- |
| **M3b** | `src/lib/stepOrder.ts` pure functions + add `phase` to `NodePatch` + `applyStepEdits`/undo/logging + all unit tests. **No interface** | About 1 session |
| **M3c** | "Edit steps" view: grouped list, Days inputs, waits-for tags, ▲▼, row menu, dates, top buffer explanation; connect metro on the right; keyboard/phone e2e and a11y. **No mouse dragging** | About 1 session |
| **M3d** | Mouse dragging + release panel + before/after date preview + remaining e2e | About 0.5–1 session |

M3b and M3c already deliver full functionality (including keyboard and phone); M3d adds desktop convenience.

## 9. Decisions for Juanxi

1. **Should Phase order (outer ranking) be draggable?**
   - **(a) Recommended: no.** Keep the 6 phases in fixed order; allow moving steps between them. Section 2 explains: Phase order changes no dates and has no data field.
   - (b) Custom outer groups (create and order them) require **new data fields**, violating "write only dependsOn / days / phase," and need a separate decision.
2. **Should a drag default to adding a dependency?** Since order is not stored, dragging unrelated steps without adding a dependency changes nothing.
   - **(a) Recommended:** dropping below U defaults to "Do after U" (deselectable in the release panel). Every drag has a purpose, changing at most 1–2 dependencies.
   - (b) Pure visual sorting (preserve order without changing dependencies) requires a new `order` field and a separate decision.
3. **Should changing days also change effort `tier`?** Forecast on-time probability currently uses the tier (light/medium/heavy), not days.
   - **(a) Recommended:** automatically synchronize 1–2 days → light, 3–5 → medium, 6+ → heavy (one extra `tier` field; still no date writes). Dates and on-time probability then change together consistently.
   - (b) Change only days, leaving tier/forecast unchanged (show "Forecast uses the effort size, not the days").
