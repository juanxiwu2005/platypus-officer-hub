# Onboarding checklist matrix (option C): frozen contract (2026-11-23)

**Decision (Juanxi, 2026-11-23):** build the onboarding checklist editor as **option C, the matrix**: one row per item, one column per role. The president first writes the whole-club checklist, then adjusts per role by clicking cells. Modules are fully user-defined. An item has only three fields: **title, when, who does it**; when and who follow the item's module unless set on the item. "Checked by", "Proof" and "Applies to" were removed. Mockups: `docs/prototypes/onboarding-checklist/` (option C chosen).

Work is split across agents in this order: **M (model)** → **U (interface)** → independent review → fixes. Each agent works in its own git worktree and touches only its files. Branch: `claude/fervent-thompson-e2j5u2` (draft PR #20, preview only, never `main`).

## 1. Scope

In scope: the template editor in **Settings → Onboarding** (president/VP only), data model, a Platypus starter, paste of lines or spreadsheet rows, typed shorthand, Undo, persistence in the demo browser.

Out of scope for this package: the officer-facing checklist instance and ticking items, Handoff integration (the existing `WEEK_ONE` list stays untouched), AI ("Tidy up", "Ask about this"), per-role overrides of when/who, school packs and capability slots, drag-and-drop (Move up/down buttons instead), real dates (labels stay relative; the rule engine converts them in a later package).

## 2. Data (M owns `src/data/types.ts` changes)

```ts
export type ChecklistWhen = "day1" | "day3" | "week1" | "week2" | "month1" | "none"
export type ChecklistWho = "new" | "buddy" | "president" | "outgoing"
export interface ChecklistItem {
  id: string
  title: string          // trimmed, 1–120 characters
  when?: ChecklistWhen   // absent = follow the module
  who?: ChecklistWho     // absent = follow the module
  everyone: boolean      // true: every current role gets it, minus hiddenFor
  roleIds: string[]      // used when everyone is false: the roles that get it
  hiddenFor: string[]    // used when everyone is true: the roles that skip it
  source?: string        // read-only label "ASU-R-NNN"; only the starter sets it
}
export interface ChecklistModule { id: string; title: string /* 1–60 */; when: ChecklistWhen; who: ChecklistWho; items: ChecklistItem[] }
export interface OnboardingChecklist { version: 1; modules: ChecklistModule[]; updatedOn: string }
// Org gets one optional field:
onboardingChecklist?: OnboardingChecklist
```

- Optional field only: **`SCHEMA_VERSION` stays 23**, old saves load unchanged, the seed has no checklist (empty state), Reset demo clears it.
- Limits: at most 20 modules, 60 items per module, 300 items in total.
- Role IDs refer to `state.roles` (current roles). Unknown or archived role IDs are ignored when resolving and dropped by `sanitizeChecklist`.
- Labels (UI copy, English): `WHEN_LABEL` = Day 1, Day 3, Week 1, Week 2, Month 1, No deadline. `WHO_LABEL` = New officer, Buddy, President, Outgoing officer.

## 3. Pure functions (M owns `src/lib/checklist.ts`, no React, no store import)

| Function | Behaviour |
| --- | --- |
| `effectiveWhen(m, i)` / `effectiveWho(m, i)` | item value if set, else the module's |
| `cellState(i, roleId)` | `"inherited"` (everyone, not hidden), `"hidden"` (everyone, hidden), `"included"` (not everyone, listed), `"off"` |
| `toggleCell(i, roleId)` | everyone: toggles `hiddenFor`; otherwise toggles `roleIds`. Returns a new item |
| `toggleEveryone(i)` | on → `everyone: true, roleIds: [], hiddenFor: []`; off → `everyone: false, roleIds: [], hiddenFor: []` |
| `countForRole(c, roleId)` / `countEveryone(c)` | items a role gets / items with `everyone: true` |
| `itemsForRole(c, roleId)` | `{ module, item }[]` in order |
| `sanitizeChecklist(raw, roleIds, today)` | returns a valid `OnboardingChecklist` or `null`: checks enums, trims and caps text, drops empty titles, unknown role IDs, duplicate IDs, a `source` not matching `/^ASU-R-\d{3}$/`, enforces limits, sets `updatedOn: today` |
| `parseShorthand(text)` | `{ title, when?, who? }`. Case-insensitive whole tokens: `@new @buddy @president @outgoing @predecessor`; `day 1`, `day 3`, `week 1`, `week 2`, `month 1`, `day 30` (→ month1). Recognized tokens are removed from the title; if nothing would remain, the original text stays the title. No guessing |
| `parsePastedList(text)` | `{ modules: { title, items: { title, when?, who? }[] }[] }`. **Tab-separated with a header row:** columns found by header names (item / checklist item / task / title; section / module / group; owner / who / responsible; due / when / timing); rows whose item cell is empty but whose first cell has text become a module (numeric prefixes such as "0." removed). **Plain lines:** a line ending in ":" starts a module; prefixes `-`, `*`, `•`, `☐`, `[ ]`, `1.`, `1)`, `0.1` are stripped; empty lines skipped; each line goes through `parseShorthand`. Owner keywords: buddy → buddy; president / vice president → president; outgoing / predecessor / previous → outgoing; else none. Absolute dates are ignored. Items before any module go into a module titled "Checklist" |
| `addPasted(c, parsed, makeId)` | appends: a pasted module whose title matches an existing one (case-insensitive) adds its items there; new modules get `when: "none", who: "new"`; new items are `everyone: true` |

IDs use a caller-supplied `makeId()` so the functions stay deterministic in tests.

## 4. Starter (M owns `src/data/checklistStarter.ts`)

`starterChecklist(s: DemoState): OnboardingChecklist` maps role functions (`Role.fn`) to the club's current role IDs. Content:

| Module (when · who) | Items (role functions when not everyone) |
| --- | --- |
| First 3 days (Day 3 · New officer) | Join the officer group chat · Meet your buddy (who: Buddy) · Get added to the club shared drive (when: Day 1) |
| Learn the club (Week 1 · New officer) | Read the constitution · Read the ASU student org handbook `ASU-R-004` · Complete anti-hazing training `ASU-R-004` · Complete Officer Training `ASU-R-004` (president, vice_president, finance) · Agree on 3–5 core duties with the president |
| Tools & access (Week 2 · New officer) | Sync the club calendar to your phone · Update the Sun Devil Central profile `ASU-R-004` (president) · Get added as a bank co-signer `ASU-R-004` (finance; who: President) · Complete USG-T appropriations training `ASU-R-037` (finance) · Walk through a budget request in Sun Devil Central (finance) · Request a Mazevo account `ASU-R-013` (programs) · Register a practice event in Event Registry `ASU-R-010` (programs) · Read the ASU brand guidelines `ASU-R-009` (marketing) · Get admin access to the club social accounts (marketing; who: Outgoing officer; when: Day 3) · Update the member roster in Sun Devil Central `ASU-R-004` (secretary, membership) |
| Handoff from your predecessor (Week 2 · Outgoing officer) | Walk through open work together · Hand over account access · Introduce key contacts `ASU-R-004` |
| Check-ins (Month 1 · President) | Week 2 check-in (when: Week 2) · Day 30 review |

A function with no current role simply gives no column a dot. Verify each `ASU-R-NNN` label against `src/data/policyCatalog.ts` before committing; drop a label rather than guess.

## 5. Store (M owns the `src/data/store.tsx` lines)

- Action `{ type: "saveOnboardingChecklist"; checklist: OnboardingChecklist | null }`. `null` removes the field (start over).
- Only `canLead(state)`; not added to `READ_ONLY_OK`. Runs `sanitizeChecklist` with current role IDs; returns the same state when invalid or unchanged.
- Interaction-log "before" payload: `{ onboardingModules, onboardingItems }` (counts only, no titles).

## 6. Interface (U owns these files)

`src/components/settings/settingsNav.ts` (tab id `"onboarding"`), `src/pages/Settings.tsx` (tab "Onboarding" after Workflow, `lead: true`, lazy-loaded), `src/components/settings/OnboardingChecklist.tsx` (new, default export), `src/styles/ck-01-onboarding-matrix.css` (new), `e2e/settings-onboarding.spec.ts` (new).

- **Empty state:** "Every new officer gets this list." with buttons **Start from Platypus starter**, **Paste a list**, **Add module**.
- **Toolbar:** **+ Add item** (to the last module, focus the new title), **+ Add module**, **Paste a list**, status ("Saved", or "Saving failed. Changes are only on screen." when `persistenceFailed`) and **Undo** (local stack of the last 30 saved versions).
- **Table** (`.tbl`) inside a horizontally scrolling wrapper with a sticky Item column; the page itself must never scroll sideways. Columns: Item · When · Who does it · Everyone · one column per current role (`displayName`) · row actions.
  - Module row: name input (label "Module name"), When select, Who select, item count, Move up / Move down / Delete (deleting a module with items asks once inline).
  - Item row: title field (label "Item title"). **Enter** saves, applies `parseShorthand`, inserts a new item below and focuses it. **Backspace** on an empty title deletes it and focuses the previous one. Pasting multi-line text into a title inserts the parsed items below. When/Who selects: the first option follows the module (empty value); the chip then shows only the value ("Week 1") with a dashed border and the accessible name says "follows module"; an explicit value shows filled. *Amended after F1 (2026-11-23):* titles are one-line text areas that wrap and grow, and the `rule-id` tag sits on its own line under the title, so nothing is cut off; the item parsing functions live in `src/lib/checklistParse.ts` (lazy chunk only).
  - Cells: buttons with `aria-pressed` and labels that name the item (amended after F2): "Treasurer: gets …", "Treasurer: hidden for …", "Treasurer: does not get …", "Everyone: on for …" (titles cut to about 40 characters). Visuals follow mockup C: filled dot, light dot (from Everyone), empty ring, crossed ring (hidden).
  - Footer row "Items per role" with `countEveryone` and `countForRole`. A legend below the table.
  - `source` shows as a read-only `rule-id` tag after the title.
- **Paste a list:** an inline panel above the table with a textarea (label "Paste a list"), live preview "N items in M modules", **Add to checklist** / **Cancel**, hint "Paste lines or spreadsheet rows. A line ending with ':' starts a module."
- Saving: discrete actions dispatch at once; typing is debounced (500 ms). No dates are shown anywhere.
- Rules: tokens only, no inline styles (CSS variables excepted), no `!important`, motion only through tokens; ≥14px text; keyboard reachable; axe: no serious or critical issues in light and dark; mobile (≤700px) without page-level horizontal overflow. The Onboarding tab is a report-only row of `npm run words` automatically; keep copy short.

## 7. Tests

- M: `src/test/checklist.test.ts` (every function in Section 3, including the SEO spreadsheet header layout and section rows), `src/test/checklistStore.test.ts` (permission, sanitize, unchanged-state identity, null clears, unknown role IDs dropped, old saves without the field).
- U: `e2e/settings-onboarding.spec.ts` on desktop and mobile: starter loads and counts match; hiding Treasurer changes its count; Everyone off then one role on; Enter adds the next row; shorthand `@buddy day 3`; pasting tab-separated rows builds modules; Undo; reload keeps the checklist; a non-lead sees no Onboarding tab; no page-level horizontal overflow; axe.
- Both: `npm run lint`, `npm run build`, `npm run typecheck:netlify`, the related unit and browser specs. Report the exact counts; do not claim a full-suite run that did not happen.

---

## 8. Template v2 (Juanxi, 2026-11-24): frozen changes

Juanxi confirmed the onboarding roadmap in three phases: (1) personal checklist created from this template when a role's handoff starts, (2) predecessor handoff module that can produce a 1–2 page handoff document, (3) AI woven through the whole process (questions about a checklist item or a policy go to AI first; people only for what AI cannot answer). Before phase 1 the template editor changes as follows.

1. **Drag to reorder.** Every item and every module has a drag handle. Items can be dropped anywhere: within their module, into another module (between items or at the end, including an empty module). Modules can be dragged to reorder. Pointer-based (mouse, touch, pen) with a visible drop line, edge auto-scroll, Escape cancels; one Undo step per drop. The handle is also the keyboard alternative (WCAG 2.5.7): Space or Enter picks up, Arrow Up/Down moves, Space or Enter drops, Escape cancels, each step announced in a polite live region. The ↑/↓ row buttons are removed; × (delete) stays.
2. **"Who does it" is removed** everywhere: the column, the module default, the item field, the starter values, shorthand `@…` tokens (no longer recognized; they stay in the title as typed), the spreadsheet Owner column (ignored), labels and legends. `sanitizeChecklist` drops any stored `who`. Data shape: `ChecklistModule` and `ChecklistItem` lose `who`; nothing else changes; `SCHEMA_VERSION` stays 23.
3. **Module colours.** Each module gets its own soft tone (left colour bar plus a light tint on its header row), cycling through a module palette by position. It must stay distinguishable from the team tones (item 5), work in light and dark, and keep text contrast at WCAG AA. Tokens only.
4. **"+ Add item" moves into each module.** The toolbar loses "+ Add item"; every module header row has "+ Add item" at its right end, adding a focused row at the end of that module. The toolbar keeps "+ Add module", "Paste a list", the status and Undo.
5. **Teams above roles, read live from Settings → Roles & teams.** The header gets a team row above the role names: one cell per team spanning its roles, in the team's order from `org.workflowTeams`, roles assigned by `org.workflowRoleTeams`, coloured with the same team tone as Roles & teams and Workflow (`wfx-tone-N` by the team's index % 6, `src/styles/fb-10-team-tones.css`). Roles in no team (and advisors, as in `teamOrgChart`) come last under "Not in a team". Renaming a team, moving a role or adding a team in Roles & teams changes the matrix immediately; the checklist stores role IDs only, never team IDs. A pure helper builds the column groups.
6. **"From Everyone" is removed.** Role cells have two states only: filled = this role gets the item, empty ring = it does not (the crossed "hidden" ring also goes). The Everyone cell is filled exactly when every current role gets the item; clicking it gives the item to all current roles (`everyone: true`, `hiddenFor: []`) or, when all have it, to none (`everyone: false`, `roleIds: []`, `hiddenFor: []`). The stored `everyone` flag still means "roles added later get it too". Legend: "Gets it", "Does not get it", "Follows the module" (dashed chip).
7. At 1440px with the starter loaded every column still fits without scrolling inside the matrix; mobile keeps zero page-level overflow.
