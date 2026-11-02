# OB-06 current-template timeline review

Status: **needs scheduling-model adjustment; no engine dates changed in this review.**

## Scenario exported

This is the exact current-template calculation for the event shown in the review:

| Field | Value |
| --- | --- |
| Event | Spring Kickoff Dinner |
| Event date | 2027-04-16 |
| Type / venue / food | Social / campus / outside caterer |
| Funding / headcount | USG / 60 |
| Club buffer | 2 days |

`Nov 31` was treated as an illustrative date, not input data, because that calendar date does not exist. The accompanying TSV is therefore based on the real screen scenario above and is safe to edit in Excel.

## Finding: why Budget comes before Event Plan

This is a real dependency-model issue, not merely an ordering issue in the UI.

1. `Food Exception Permit` depends on `Budget` and carries the Apr 2 official deadline. The backward scheduler therefore pulls `Budget` to Feb 8.
2. `Event Plan` has its own 60-calendar-day target, Feb 15, but **does not precede Budget** in the template.
3. The compact preview sorts all nodes by club deadline and shows only the first six. It does not show a dependency chain.

The current engine consequently permits this invalid-looking sequence: `Budget → Food Exception Permit` before `Event Plan`. A later model change should make the event plan a prerequisite of the budget/funding branch (or introduce an explicit event-brief milestone which both branches require), then show dependency order rather than deadline order in the compact preview.

## Excel-style review file

Open [the TSV timeline](first-event-current-template-2027-04-16.tsv) in Excel, Numbers, or Google Sheets. It has one row per current template node, including post-event close-out work, and the fields needed to edit each proposed time point:

- `Engine start`, `Club deadline`, `Official deadline`: generated current values; preserve these as the baseline.
- `Proposed start`, `Proposed deadline`, `Decision / note`: intentionally blank columns for review.
- `Relative timing`: makes the relationship to the event date visible without hiding the real date.

For an Excel swimlane view, select columns A–I and insert a stacked-bar Gantt chart using `Days from event` / date columns, or add a daily date header beginning 2027-02-03 and color cells from `Engine start` through `Club deadline`. This keeps every node editable without encoding a visual chart as business logic.

## Daily swimlane excerpt (the affected early branch)

Legend: `S` = engine start, `■` = scheduled interval, `D` = club deadline. Every column is one calendar day.

| Lane / node | 02-03 | 02-04 | 02-05 | 02-06 | 02-07 | 02-08 | 02-09 | 02-10 | 02-11 | 02-12 | 02-13 | 02-14 | 02-15 | 02-16 | 02-17 | 02-18 | 02-19 | 02-20 | 02-21 | 02-22 | 02-23 | 02-24 | 02-25 | 02-26 | 02-27 | 02-28 | 03-01 | 03-02 | 03-03 | 03-04 | 03-05 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Plan · Event Plan |  |  |  |  |  |  |  | S | ■ | ■ | ■ | ■ | D |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Money · Budget | S | ■ | ■ | ■ | ■ | D |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Prepare · Food Exception Permit |  |  |  |  |  |  | S | ■ | ■ | ■ | ■ | ■ | D |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Money · Quote Gather |  |  |  |  |  |  |  |  |  |  |  |  |  | S | ■ | ■ | ■ | ■ | ■ | D |  |  |  |  |  |  |  |  |  |  |  |
| Plan · Back-up Plan |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | S | ■ | ■ | D |  |  |  |  |  |  |  |  |
| Money · Budget Request |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | S | ■ | ■ | ■ | ■ | ■ | ■ | ■ | ■ | ■ | D |
| Plan · Candidate Venue |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | S | ■ | ■ | ■ | ■ | D |  |  |

## GitHub Primer-aligned visual redesign proposal

The top of the screen and the native-looking `Event details` disclosure currently use different visual languages: the first is an open canvas of controls and the second is a browser-style disclosure plus dense fields. The recommended direction is one clear page hierarchy built from three consistent sections.

```text
Plan your first event

┌ Event brief ───────────────────────────────────────┐
│ Describe the event                                  │
│ [ sentence input                                  ] │
│ examples                            [Generate plan] │
└────────────────────────────────────────────────────┘

┌ Schedule preview ──────────────────────────────────┐
│ Milestones / dependency-aware timeline              │
│ Schedule buffer [1] [2] [3] [5] [7]                 │
└────────────────────────────────────────────────────┘

┌ Event details                              [Edit] ──┐
│ Name                         Date                    │
│ Type                         Headcount               │
│ Venue                        Food                    │
│ Funding                      Guest speaker           │
└────────────────────────────────────────────────────┘

[Back]                                      [Continue]
```

This follows Primer's form guidance: visible labels above each control, one primary action per stage, predictable section boundaries, consistent control dimensions, and progressive disclosure only for secondary editing.

### Recommended implementation direction

1. **Make `Event brief`, `Schedule preview`, and `Event details` sibling cards.** Use the same border, radius, header spacing, and internal grid. This gives the top prompt and the lower form the same visual grammar.
2. **Replace the bare `<details>` treatment with an explicit section header and `Edit details` button.** Initially show a compact, readable summary after planning; opening edit mode reveals the existing two-column form. This is clearer than an unlabeled browser-style triangle and supports progressive disclosure.
3. **Keep `Generate plan` as the only primary action in the brief card.** Example chips remain secondary. `Continue` stays as the page-level completion action, visually separated at the footer.
4. **Place buffer with the schedule it changes.** Give it a short helper sentence below the segmented control and surface the official/club-date distinction in the timeline rather than as disconnected body text.
5. **Replace the six earliest-deadline dots with a dependency-aware preview.** Until the engine changes, label it `Earliest deadlines` so it does not imply a sequence. After the model fix, use the actual plan → budget/funding → execution relationship.
6. **Use the same responsive behavior for all three sections.** Two columns at desktop widths, one column on narrow screens; keep form controls and buttons at the established 44px interaction size.

No UI or scheduling code was changed by this review. The next implementation should begin only after the timing relationships in the TSV are approved.
