# M3 Sorting Question: Reorder step by "Sort Que" and recalculate the metro in real time

**Status: To be cleared by Juanxi. This document is just a scheme, and no code has been changed.** Drafting: Claude, 2026-10-29, Branch `integration/v1.0`.
Rationale: Section 10.2 (which contains the "m3 hard constraints") and section 9.4 2 of the implementation programme; `src/data/types.ts` (Node, Phase), `src/engine/schedule.ts`, `src/engine/playbooks.ts`, `src/components/flow/metro.ts`, `src/pages/Events.tsx`, `src/components/NodePanel.tsx`, `src/data/store.tsx`.

## 0. First of all, four different findings from the implementation programme (both verified in code)

1. The field for **"Number of days required to process" is called `Node.estDays`, not `Node.effort`. The** execution program says that `effort` does not exist in the code. `estDays` is "days of work", range 0–30 (`updateNode` will be packed and caught); The engine is counted as "latest start" using **`estDays` plus personal buffer days for the responsible person**.
2. **`estDays` does not affect the projected percentage. The** projection (`forecast.ts`) uses another field, `Node.tier` (light 1–2 days, medium 3–5 days, heavy 5–10 days). So just change the number of days, the date changes, but the probability of being on time doesn't change and the interface does not seem to be consistent. This is 9's problem 3.
3. **"Sequence" doesn't exist anywhere. The** data does not have the field "the number of steps" (`Node.rank` is used only for sorting in the board column). Sequence of steps **Completely. `dependsOn`Who's waiting?**。 So when you drag, the list order is always the same. **Recounted from dependency.**。 Conclusion: **each drag must form a change in the dependent relationship, or a change in the Phase**, otherwise it will come back to its original position.
4. The order of **Phase (large order) and the order of reliance are not consistent. The** template contains 3 "inverted" dependence: `approve` (plan) waits for `budget` (money); `foodex` (prepare) waits for `quote` (money); `usg` (money) waits for `flyer`. So you can't use "in order of Phase" as "in order of order".

## 1. Place it: Events page, some active "Edit steps"

Events page now has two viewings oflow/ List. Add a third: **Flow . List . Edit steps** (only president and vice present can see); Others see the List unchanged. The computer has a sorting problem on the left and a subway map on the right (**, same activity, same data**, which is recalculated immediately for each change); The mobile phone is sorted above, the subway map below.

```
Events   [Networking Night ▾]            [ Flow | List | Edit steps ]
┌──────────────────────────────────────────┬───────────────────────────┐
│ Club buffer: 3 working days · Settings → │   (Metro map, real-time recalculation. )        │
│ Your reminder lead: 1 day (private) [-][+]│                           │
│                                          │  ●──●──●──●──●──◆──●      │
│ ▼ Plan                          3 steps  │     \_●_/   \__●__/       │
│ ┌────────────────────────────────────┐   │                           │
│ │≡ ▲▼ Meet the speaker      Days [ 2 ▾]│   │  (Selected rows, corresponding to the highlight )   │
│ │      waits for: —                    │   │                           │
│ │      Start Oct 21 · Club Oct 23 · ASU│   │                           │
│ ├────────────────────────────────────┤   │                           │
│ │≡ ▲▼ Draft the event plan  Days [ 2 ▾]│   │                           │
│ │      waits for: Meet the speaker ×  [+]│  │                           │
│ │      Start Oct 23 · Club Oct 27 · —  │   │                           │
│ └────────────────────────────────────┘   │                           │
│ ▼ Prepare                       9 steps  │                           │
│   …                                      │                           │
└──────────────────────────────────────────┴───────────────────────────┘
 In each row: ≡ Drag the handle.  · ▲▼ Move Up and Down  · Title  · Days Number Boxes  · "waits for" Label (pointable)  × Get rid of it. + Add)
       ⋯ Menu: Do after the row above / Do alongside the row above / Move to phase…
       Date line: read-only, from engine Start / Club / ASU Three dates, three dates apart)
```

Key points:
- **Large Sort = Phase Group (6), Small Sort = Steps within Group.** The number of steps in a group is different: Plan 4, prepare 9, money 5, marketing 4, run 3, close 3 (total 28 moves). Prepare has 9, more than you said "approximately 5," so each group can fold.
- The date line in each row is **read-only**, with three dates to be written separately; "Start" is the only one. **The person in charge.**When you see an algorithmic description with a personal buffer, you can only see a generic statement (which is consistent with the current detail panel and protects the privacy of the individual buffer).
- When opening the Behinds switch, a source description appears below the date line (using the S7 mechanism instead of the second set).
- Do not enter the Events default view, so do not reach the AGENTS.md § 7.5 word limit for Events (word check only for the default view).

## 2. Large order corresponds to Phase: Is it possible to drag the order?

**Recommendation: The order of Phase cannot be postponed, fixed as Plan  →  prepare  →  money  →  marking  →  run  →  close.** Reason:

| What's the order for dragging Phase? | Conclusions |
| --- | --- |
| Where's the order?  | Only exists in code constants（`src/lib/phases.tsx` s `ORDER`），There is no such field in the data.。New fields to store（Restructured data），Violation"Interface only dependsOn / Days / phase" |
| Any effect on **engine**?  | **has no "order" effect, only "isn't close" influence.** Engine only cares `phase === "close"`: step by close is ranked after activity **** (after activity 3 working days, no earlier than the first working day after activity), other Phases are treated exactly the same. `schedule.ts` 193/199/214/307 Line) |
| Any impact on **prediction**?  | Ibid., only close special (not started before the activity date and not included in "key path" ), `forecast.ts` 42/76 Line) |
| Any impact on the **metro map**?  | The metro is based on **Dependence** main line, not Phase (only) `phase==="close"` To judge the "post-acting" side, `metro.ts` 51 rows. So dragging Phase doesn't change the metro map. |
| Yeah, **, today's page progress point**.  | Yes: for each activity on today's page, one point is a Phase from `ORDER` |

So the order of **tow Phase will only make today's pages in a different order from the editing pages, but it won't change any date**, no meaning and easy to misunderstand.

What **can do is "Move steps to another Phase":** drags a row into another Phase group and changes only this line of `phase` ( ≤  one field, no longer dependent). ≤  **moving in or out of Close will change the date** (move into Close = after they are lined up for activity); Move out = before they're lined to the activity, so when moving, you show a line: "Close-out steps are scheduled after the event."

Another small gap to be filled: `NodePatch` (`src/data/store.tsx`) currently **does not allow for the change of `phase`**, and M3 adds `phase` (only this field).

## 3.  ⚠  Key: How the list order becomes `dependsOn` and does not lose parallel relationships

### 3.1, why can't you "strap a chain in the order of the list"?

The template totals 28 moves, while **takes a large number of steps in parallel to**. Example: After `approve`, `registry`, `venue`, `offvenue`, `advisor`, `quote`, `dining`, `permit`, `foodplan`, `flyer`, 9 steps are all waiting for `approve`, all in parallel; `sap` only waits for `partner`, parallel to `draft`, `mktneeds`; `usg` also includes `quote`, `flyer` and `budget` (convergence).

If you put it... 28Step into a chain in the list order: each step of the "processed days" will be **Add All**Total **37Working days**And now the real longest route (key path) is just **15Working days**。 As a result, almost all steps of latest start are pushed ahead of 22 working days, many will be "early today" or "lost ASU deadline," and the subway map will become a straight line. **is the mistake you're worried about, so you can't do it.**

### 3.2 Program: Dependence is the truth. The list is just a sign of it.

| Rules | Contents |
| --- | --- |
| **R0 Do Not Rebuild Dependence From List**  | Never."Walk Through List，Write to every line. `dependsOn = previous row`"。Reliance is only when you make a clear move.，By**Article by article**Change |
| **R1 What's the list for**? | Group first by Phase (fixed order) and within the group by: club deadline captions calculated by relying on depth (who is in front). This order is recalculated every time it's changed, so let it go and it'll fall into its new position. |
| **R2 Drag to "under a row U"**  | It means **, "This step is done after U."**: Only for the dragged line R **plus a dependency U** (R et al. U). Nothing else. If R was waiting for a step d, the U is already (directly or indirectly) waiting d, the d → R will be removed from **extra**. |
| **R3 Drag to** | This means **"This step is done before V."**: only one R (V et al.) depends on V. And get rid of the spares. |
| **R4, let go between the two lines.**  | **1 Do after "The Line Up"** (default ticked, = R2) **2 Do beforee "The following line"** (default not ticked, = R3). It can be both (in the middle) and only one. I can see, choose. I don't have to rely too much. |
| **R5 wants two steps in parallel.**  | **Do alongside the row above**: remove the dependency between R and the top line U, and let R and other steps like **U take** (so they start simultaneously). R. Other steps to keep |
| **R6 No rings**. | Check before submitting: whether new dependency will allow R indirectly to wait for itself. Yes, for **to reject** and indicate the steps (e.g. "Reserve the room waits for Add the RITM number, which already waits for it”). The engine will only report "ring" afterwards, so the check must be done at the interface. |
| **R7 Cross the line of dependency.**  | The line that drags one and its own **directly on**, is "**vs.**": removes the previous dependence and adds the opposite direction. It's a big move, so before you let go, you have to show "before/ after" for confirmation; It's gonna cause the ring to refuse. |
| **R8 Drag = One Action = A Log = Undo** | See 6 |

### 3.3, a specific example (live steps in the template)

State of departure (excerpt): `approve` ← `registry`, `venue`; `ritm` et al. `registry` and `venue`; `offvenue`, `advisor` and `quote` are just waiting for `approve`.

**Operation:** drags the **Reserve the room (`venue`)** to the bottom of **Register the event (`registry`)**, ticking "Do after Register the event".

| | `venue` Dependence | Other steps |
| --- | --- | --- |
| Before | `[approve]` | `registry:[approve]`、`ritm:[registry, venue]`、`offvenue:[approve]`、`advisor:[approve]`、`quote:[approve]`…… |
| Press R2 | Add `registry` → `[approve, registry]`；`registry` I've been waiting. `approve`♪ So... ♪ `approve` It's redundant. Get rid of **. `[registry]`** | **None of them moved.**： `offvenue`、`advisor`、`quote`、`dining`、`permit`、`foodplan`、`flyer`、`sap`... that we are still waiting for only the original steps, while **parallel relationships remain**; `ritm` Still waiting `registry` and `venue`No problem. |

When the engine is recalculated, you see: `venue` waits for `registry` to be done, `registry`'s club deadline is therefore advanced (it has to be completed before `venue`), `venue` its own ASU cut-off date (R03) remains unchanged. On the subway map, `venue` went from "with `registry`" to "following `registry`" and the rest of the branches remained unchanged. Change Only **1Step by step. 1Reliance.**。

**comparison "Long by List":** also drags to rewrite each step of the 28 step, from 15 to 37.

### 3.4 Two Border Situations

- **"Playback" in the inner order:**These steps don't change on each other, so their order is set by their dates. Dick "Do after" to make one wait for the other."  Want one to wait for the other, please tick "Do after". ）
- **Someone manually set up the club deadline (`clubDeadlineOverride`):** editor does not touch this field; This line date displays a small label "Club deadline set by a person".

## 4. How do you write "the number of days required to process" and "the number of days ahead"?

| Something. | Where did it go? | How do you show it on the interface? |
| --- | --- | --- |
| **Number of days required to process**  | `Node.estDays`(0–30 integer; Existing `updateNode` It's covered. | (a) Digital frame "Days" on the right side of each row; We'll recalculate it now. |
| **Standard event uniform advance days**  | Don't change here. It is. `org.settings.clubBufferBusinessDays`(default 3 working days), set in Settings →  "Deadline and follow-up causes" | "Club buffer: 3 working days before every ASU deadline" + links to Settings; Unanimously effective for all missions |
| **Personal days in advance**("Advanced" ) 2"The Lord reminds me"  | `Person.personalBufferDays`(0–5, Settings  →  My pretenences — only I can change and can close) | **only gives the current viewer his own**, with −/+ buttons (which are written as his own preferences and not dates); Personal buffer number **does not show** |
| **latest start where's**? | Don't write. Engine: `latest start = club deadline − (estDays + owner personal buffer)` , based on the person's working day (skip busy week) | Start on each line of date lines; Behind the senses, look at the algorithm. |

The date is divided into three lines: **Start** (each person ' s own latest start), **Club** (club deadline) and **ASU** (school cut-off day, no rules are shown).

## 5. Operation without drag (keyboard, cell phone)

- In every line. **Two buttons.**, is the real button, Tab can get to, Enter/space trigger.  syntax and drag: **▲/▼  = after the line below (Do after it); =** before the line above (Do before it); The line of direct dependence is the alternation (R7).
- **Do after the row above / Do alongside the row above / Move to face...**, best used on cell phones.
- **drags itself**: The computer drags with the mouse (following the dragging method already used in Tasks board, without adding a new library); The first version of the **mobile phone does not touch and drag** (HTML5 drags to work on the tentage screen), relying on the stubble and menu. I'll add it later.
- Drag the handle is a button ("Drag to indicate: Draw the event plan", readable, line position.
- The rejected operation (which creates rings, cross-Phase restrictions) is described in a line `role="status"` text and does not pop windows.

## 6. Who can change it, how to cancel it, whether or not to enter an interactive log.

- **missions:**, like the current `updateNode`, only **president and Vice president** (`canLead`). Others can't see "Edit steps". AI **can't** walk through this entrance (AI's white list is working the same, without adding `unlink`, `set_phase` or so).
- **Add a new action** `applyStepEdits` (store): One drag = one action containing patches of several steps, **each allowing only `dependsOn`, `estDays`, `phase` field** (the fourth `tier`, see question 3); Come in first, check the white list, check the ring, see the range. **last dialed `applySchedule()`** only once.
- **Undo:** Every action first saves the value of the affected step "before it"; A **"Undo"** prompt (as with the minor changes in AI, reusing the `undoAuto` "restore before" idea) appears after release from the interface and can be withdrawn more recently 10 times. Unretention of records after refreshing pages (same as currently available).
- **Interactive log: every action in** `store.tsx` will automatically log (action content + value before change). Completing `applyStepEdits` with two branches of `payloadOf`/ `beforeOf`, which is recorded in the log as "what step, `dependsOn`/ `estDays`/ `phase` from what" and no date field **in the** log.

## 7. Hard constraints (article by article)

1. **interfaces only write `dependsOn`, `estDays` (= effort you said), `phase`. Never write any date fields for `officialDeadline`, `clubDeadline`, `latestStart`, `clubDeadlineOverride`.** uses the white list to select only three (optional `tier`) fields in `applyStepEdits`; Add a unit tess: For any patch, all date fields before and after submission can only be changed by `applySchedule`.
2. **Change it out. `applySchedule()`**(Store Lee) `updateNode`It's done, new moves do it.
3. **does not change `src/engine/`.** All new logics are placed in the new pure function file `src/lib/stepOrder.ts` (list sorting, drag-and-drop patches, ring check, de-reliance) and store/ interface.
4. The subway map is updated in real time = to rerun the `computeSchedule()` + `metro.ts` layout (as has already been done), **does not have coordinates**.
5. The new style is only checked with token (styllint/ eslint for S6); Do not add a dependency.

## 8. Tests to be added, projected workload

**unittes** (`src/test/stepOrder.test.ts`, store):
- List order: grouping by Phase; There are 3 cross-Phase dependents that do not mistreat or disorderly.
- Dragping: R2, R3, R4, R5, R7 each; Article 3.3Examples of sections **Article by article.**（`venue`Become `[registry]`The rest of the steps. `dependsOn`One remains the same.
- **"No chain" test:** drags the complete template several times, changes the number of steps  ≤  drag × 2 and does not change the total days/ key paths to 37.
- Rings: Both direct and indirect rings are denied, and indicate which steps.
- (a) To rely on it redundantly (transmit about Jane); `phase` Moves in/out of clues for close.
- **Undated field:** any date field appearing in a patch is discarded; No change to `clubDeadlineOverride` before and after submission.
- Organisations: Actions that are not president/ vice president are ignored. Cancelled: Restoring `dependsOn`, `estDays`, `phase` is fully consistent with the previous one and the dates are recalculated. Log: There is a recorded and no date field.

**browser tests** ( Desktop + Cell phone, `e2e/`):
- Mouse drags and pulls a line  →  unhanded box  →  ticking points and date changes on the subway map (club deadline assertion using point `aria-label`).
- Keyboard only: Tab to  ▼  button, Enter, line position and date change; Menu "Do alongside".
- Cellular: Do the same thing with the  ⋯  menu and the  ▲/▼  (phones don't drag).
- Change Days — changes in date lines and subway maps; More than 30 caught.
- "Edit steps" is not visible; The rejected operation has a texttip; Undo recovery; Upgraded and modified (same as the existing archive).
- a11y (axe, desktop + mobile phone with wcag22aa touch target 24 x 24); Behind the dates when they're open.

**Anticipated workload: One session cannot be finished and three sessions are recommended:**

| Steps | Contents | Size |
| --- | --- | --- |
| **M3b** | `src/lib/stepOrder.ts` Pure function + `phase` Add `NodePatch` + `applyStepEdits`/ Undo/ Log+All unit sets. **No interface** | About 1 sessions |
| **M3c** | "Edit steps" view: group list, Days digital box, waits-for labels,  ▲/▼ , line menus, date rows, top buffer instructions; (a) To the right, to the subway; Keyboard/cell e2e and a11y. **No mouse drag** | About 1 sessions |
| **M3d** | Mouse drag + loose hand box + Save date preview before changing + remaining e2e | About 0.5–1 sessions |

M3b and M3c are already fully operational (keyboards, cell phones), and M3d is just easier on the computer.

## 9. The question of Juanxi's tablet

1. **Phase (large order) do you want to drag the order?**
   - **(a) Recommendation: No.** 6 Phase fixed order; We can only move steps to another Phase. For the reasons, see section 2: The sequence of Phase does not affect any date and does not exist in the data.
   - (b) Do you want to customize large groups (self-built, sorted): need to be in the data **Add Fields**It's against "write only dependsOn / days / phase" to make another decision.
2. **"draw" by default equals "plus a dependency"?**, because the order doesn't store, drags two unrelated steps without relying on them, and nothing changes.
   - **(a) Recommendation:** to drop below U = default tick "Do after U" (can be removed from the loose hand box). This drag always makes sense and changes the maximum 1–2 dependency at a time.
   - (b) To "pure visual sorting" (not to be relied upon, saved in sequence): New `order` fields are required and a decision is made separately.
3. **Do you want to change the number of days? `tier`"？** The current projected probability of punctuality is in slots (light/medium/heavy), not days.
   - **(a) Recommendations:**Days 1–2 → light，3–5 → medium，6~ Heavy, autosync (with one more) `tier`field, still do not touch the date).  It is not inconsistent to change the number of days so that the date changes with the probability of being on time.
   - (b) Change only the number of days, slots and projections (the interface will alert "Foreast uses the effort size, not days").
