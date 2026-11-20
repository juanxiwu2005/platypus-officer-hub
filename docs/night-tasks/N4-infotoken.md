# Goal

Remove an undefined CSS variable `--st-now` and write the same blue at 4
The harvest is two tokens. **This round does not change any visual effects**, and the final representation of all colours remains unchanged.

# Files

- src/styles.css

**Do not read** src/workcents/, src/pages/, src/organization/, src/phase1/, src/workspace/
Under any document. This round changes only src/styles.css to one file.

# Constraints

- Only field presentation data are used.
- Do not modify dependencies, deployments, GitHub Actions, secret key, research data or Night Mode security files.
- Do not modify or mege `main`.
- Src/ styles.css only, without touching any.tsx/.ts files.
- **Do not change src/components/ui/statusDefaults.ts.** There's 6 color and PALETTE
  is the data that can be modified by the user and the literal value must remain the same.
- **Don't touch the two** (`@media (prefers-color-scheme: dark)`) and
  `:root[data-theme="dark"]`）。This round does not give a new token coloured version -- see the reason for 1 below.
- Do not change fonts, spacing, corner, layout, z-index.
- **does not reread the document to "check the baseline".** files and job descriptions that are inconsistent are normal -- that's what you just changed.
- Undetermined retention and writing in handoff records.

# Done means

## 1. Add these two tokens in `:root`

```
--info: #3a6fd8;
--info-glow: rgba(58,111,216,.18);
```

Add an explanatory note to them, copying the following (in your own words, but all three points):

- This is **time axis/ chart** with blue, which means "go here now."
- It's **not** status color. `.now` dots for progress chains and flow charts are calculated by `nodeStop()`
  The chart state (`done` / `now` / `todo` / `risk`) determines that it is derived from schedules and risks.
  6 user status is more than one-on-one on top of it. So **does not exist** with its state color,
  Do not try to follow the color set by the user in Settings  → Board.
- It is deliberately excluded from the coverage value of its dark-coloured theme, as the status quo is that deep-flung theme shared this blue.
  This round is only renaming and does not change the senses.

## 2. Replace the next 4 with a completely unchanged colour

| Location | The way it is now. | Change it to |
| --- | --- | --- |
| `.chain .dot.now` It's... `background` | `var(--st-now, #3a6fd8)` | `var(--info)` |
| `.chain .dot.now` It's... `border-color` | `var(--st-now, #3a6fd8)` | `var(--info)` |
| `.chain .dot.now` It's... `box-shadow` Colours | `rgba(58,111,216,.18)` | `var(--info-glow)` |
| `.m-dot.now` It's... `background` and `border-color` | `#3a6fd8` | `var(--info)` |
| `.m-dot.now` It's... `box-shadow` Colours | `rgba(58,111,216,.18)` | `var(--info-glow)` |
| `.m-dot.now.risk` It's... `background` | `#3a6fd8` | `var(--info)` |

`.m-dot.now.risk`'s `border-color: var(--late)` **Keep the** still.

⚠️ `var(--st-now, #3a6fd8)`In this writing, `--st-now`It's never been defined in the whole repository.
So it always falls back to that `#3a6fd8`. If you change to `var(--info)`, it'll be the same.
But there is no longer a variable that pretends to be configured and actually never works.

## 3. After `--st-now`, it must not appear in the whole src/

## 4.

- `npm run check` must pass.
- **does not require any additional tests.** This round is purely renamed and no behavioural changes can be measured.
  No invention tests to be delivered or any existing tests modified or relaxed.
- In the handoff record:
  - What line did you change?
  - Confirm `--st-now` has disappeared from src/ completely
  - Confirmed that `statusDefaults.ts`, dark theme two paragraphs, `Handoff.tsx` were not passive

# Out of scope

- **does not change `src/pages/Handoff.tsx`.**It's... 61There's a connection. `#237a42` / `#3a6fd8` / `#5f6763`
  Three values. The three things that should follow the user's status color are a semantic issue for the product, to be decided by Juanxi.
  Not in this round.
- **does not do "dismantling synonyms."** `--late/--good/--warn` and blocked/done/in_progress
  The status color appears to repeat, actually two different binding systems: brand token on a light-colored **text**
  and has a stand-alone dark theme value, the state colour is used to press **white word** on the color bar and no dark version is available.
  Merge will cause text contrasts under dark themes to collapse (only 2.43:1 on `#f08a80`).
  **don't do this.**
- Do not spell, spacing, corner, z-index.
- Do not touch src/engine/, netlife/, src/data/, any.tsx.

---

## Budget estimates

A document with an explanation for about 6 replacement. Read file + Change file + Run check,
Normal within 20 steps. Budget 300, far enough.
