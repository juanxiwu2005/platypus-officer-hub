# ASU Rules Library v0 (official policy)

The rule engine and `/api/ask` may use only the rules recorded here. Each rule has a source. The originals were checked on October 7, 2026; WP6 required a fresh item-by-item check before release, recorded below on October 23. Where two sources disagree, use the stricter requirement and show both sources. Keep `RULES` in `src/data/rules.ts` consistent when policy changes; the v0.1 copy is in `public/legacy/index.html`. `src/engine/playbooks.ts` maps steps to rules and lead times.

This is a translation of the recorded policy baseline, not a new verification of ASU policy. Preserve the verification dates until the original sources are checked again.

| ID | Category | Rule | Lead time | Source | Verified |
| --- | --- | --- | --- | --- | --- |
| R01 | Venues and events | Register on-campus in-person events and off-campus events using university funds or student fees in Event Registry. | At least 14 days in the guide; 30 days in the handbook. Use 30 days. | [Event Registry guidelines](https://eventreg.asu.edu/about-registry/event-guidelines); [Student Organization Handbook 2025–26](https://eoss.asu.edu/sites/default/files/2025-04/ASU%20Student%20Organization%20-%2025_26%20Handbook.pdf) | 2026-10-23 |
| R02 | Safety and compliance | An advisor must attend student organization events; public events or events expecting more than 250 attendees require a university representative throughout. | — | Event Registry guidelines above | 2026-10-23 |
| R03 | Venues and events | Reserve student union space through Mazevo. Up to 3 elected officers per organization may request accounts. | At least 16 days; outdoor tabling at least 3 business days; complex setups at least 2 weeks. | [Submit a Space Request](https://eoss.asu.edu/student-unions/submit-a-space-request) | 2026-10-23 |
| R04 | Venues and events | Add the Event Registry RITM number to the space reservation. | At least 14 days before the event, or the reservation may be cancelled and charged. | Submit a Space Request above | 2026-10-23 |
| R05 | Food | Aramark/Sun Devil Dining is the exclusive caterer for venues including Memorial Union and Student Pavilion. | Arrange at least 2 weeks ahead. | Student Organization Handbook 2025–26 above | 2026-10-23 |
| R06 | Food | Outside catering requires a Food Exception Request and vendor proof of insurance. | 14 days ahead. | Student Organization Handbook 2025–26 above | 2026-10-23 |
| R07 | Food | Preparing food on site requires a temporary food permit ($85). | At least 7 working days. | [Catering and Food FAQ, 2023; recheck required](https://eoss.asu.edu/sites/default/files/2023-09/FAQ%20-%20Catering%20and%20Food%20Guidelines%202.pdf) | 2026-10-23 |
| R08 | Food | Do not serve homemade food. | — | Student Organization Handbook 2025–26 above | 2026-10-23 |
| R09 | Funding | USG catering and service requests, including rentals, setup, and lighting. | 10 business days ahead. | [USG Spending Guidelines](https://www.asuusgt.org/spending-guidelines) | 2026-10-23 |
| R10 | Funding | USG speaker or performer requests require a signed SAP agreement. | 14 business days ahead. | USG Spending Guidelines above | 2026-10-23 |
| R11 | Funding | USG purchase requests need an event flyer and public-purpose statement; invoices must name ASU. The stated reimbursement limit is $999, but its placement after the Amazon sentence may limit its scope to Amazon. Platypus conservatively warns at $999. Amazon purchases may be ineligible for reimbursement; reimbursement checks take about 3 weeks. | — | USG Spending Guidelines above | 2026-10-23 |
| R12 | Funding | Meals costing $25 or more per person require a Business Meals Form and attendance list. | — | [USG Funding Rules](https://www.asuusgt.org/funding-rules) | 2026-10-23 |
| R13 | Venues and events | Do not hold events during final exams. | — | Student Organization Handbook 2025–26 above | 2026-10-23 |
| R14 | Safety and compliance | Student officers should avoid signing legally binding contracts. | — | Student Organization Handbook 2025–26 above | 2026-10-23 |
| R15 | Safety and compliance | ASU prohibits raffles. Free door-prize drawings with equal chances are permitted. | — | Student Organization Handbook 2025–26 above | 2026-10-23 |
| R16 | Leadership transition | Contact the advisor; incoming officers complete training and read the handbook/constitution; notify Campus Liaisons; update Sun Devil Central and bank-account access; re-register each spring. | Spring. | Student Organization Handbook 2025–26 above | 2026-10-23 |

The six Rules-page categories are venues/events, food, funding, publicity, safety/compliance, and leadership transition. Publicity currently has no official rule here; channel lead times are in `SEO_PLAYBOOK_REFERENCE.md`.

Pending source work: locate the handbook's August 27 update and check for a 2026–27 edition. Questions can go to the Tempe student organization office, tempeclubs@asu.edu, about policy only; this is not authorization to contact anyone or recruit research participants.

## ASU calendar used by the rule engine

The engine calculates official and club deadlines using ASU business days. Officer work also avoids finals weeks and gaps between semesters. Data is in `src/engine/calendar.ts`, checked October 22, 2026; Fall 2027 and Spring 2028 were added October 27. Recheck before each semester.

| Type | Dates | Source |
| --- | --- | --- |
| University closures, excluded from business days | 2026: Nov 11 Veterans Day; Nov 26–27 Thanksgiving; Dec 24–25 winter closure. 2027: Jan 1 New Year; Jan 18 MLK Day; May 31 Memorial Day; July 5 Independence Day observed; Sep 6 Labor Day; Nov 11; Nov 25–26; Dec 24 and 27. New Year 2028 is observed Friday, Dec 31, 2027. 2028: Jan 17 MLK Day; May 29 Memorial Day; July 4 Independence Day; Sep 4 Labor Day; Nov 10 Veterans Day observed; Nov 23–24 Thanksgiving; Dec 25–26 winter closure. | [ASU holiday schedule](https://cfo.asu.edu/holiday-schedule) |
| Finals, excluded from events under R13 and from officer work | Fall 2026: Dec 7–12; Spring 2027: May 3–8; Fall 2027: Dec 6–11; Spring 2028: May 1–6, projected. | [Academic Calendar](https://registrar.asu.edu/academic-calendar), official through Fall 2027; [Projected Dates](https://registrar.asu.edu/projected-dates-future-semesters) for Spring 2028 |
| Semester ranges; no officer work scheduled between semesters | Fall 2026: Aug 20–Dec 12; Spring 2027: Jan 11–May 8; Fall 2027: Aug 19–Dec 11; Spring 2028: Jan 10–May 6, projected. | Same calendar sources above |
| Breaks without university closure; business days remain valid, but events warn that many members may be away | Fall 2026: Oct 10–13; Spring 2027: Mar 7–14; Fall 2027: Oct 9–12; Spring 2028: Mar 5–12, projected. | Same calendar sources above |

The v0.1 calendar incorrectly treated December 31 and spring break as university closures; v1 corrected both.

Spring 2028 semester, finals, and spring-break dates are projected, not official, and subject to change without notice. Recheck the three `(projected)` entries in `calendar.ts` once official dates are published. The 2028 holiday column is already published by the CFO office.

**Calendar-range guard, A9, October 27:** the engine knows August 20, 2026 through May 6, 2028. An event date, calculated official/club deadline, or latest start outside that range creates a red `calendar_range` issue on the step and event: “outside the ASU calendar Platypus knows”. Previously, unknown days were treated as semester gaps and backward scheduling silently jumped too far: counting 14 student workdays back from October 15, 2027 incorrectly reached April 13 instead of September 27. Extend `TERMS`, `FINALS`, `BREAKS`, and `HOLIDAYS` in `calendar.ts`; the supported range extends automatically.

## v1.1 short UI wording, October 23, 2026

The Rules page uses `short` and `timing` from `src/data/rules.ts`; hover cards hold full wording, sources, and verification dates. Short copy is an abbreviation; the full recorded rule controls. Review both when changing policy.

## Item-by-item verification, October 23, 2026 (WP6)

All 16 original pages were opened and checked; their verification dates were updated to October 23. Wording was clarified without changing the recorded requirements:

- R01 covers physical events on university property and off-campus events related to university business or using university/student funds. The guide says 14 days, handbook page 15 says 30; use 30.
- R03 says up to 3 elected officers may apply, rather than the top 3 officers.
- R06 uses “vendor proof of insurance” on handbook page 14.
- R07's FAQ has no date; submit to the ASU Food Safety & Health Manager. The vendor usually pays; the lead time is “7 working days”.
- R11's $999 sentence follows the Amazon sentence and may apply only to Amazon; keep the conservative $999 warning.
- R16's handbook page 12 also requires contacting Campus Liaisons to make the transition effective.

## Organization timing defaults in the newer workspace, October 26, 2026

Determine purchase items 8 weeks ahead, obtain quotes 7 weeks ahead, and submit budget requests 6 weeks ahead. These are owner-requested internal targets, not new ASU rules. Leaders may adjust them in Organization Setup; otherwise defaults apply. Weeks are stored as 7 calendar days, while scheduling accounts for workdays, dependencies, and effort. Official deadlines and internal targets are stored separately.

Only USG food/services use R09 and speakers use R10; do not apply those formulas to College or unrelated funding categories. The spending deadline is an absolute constraint attached to the request and does not move when the event is rescheduled. Implementation is in `src/workspace/schedule.ts` and the server runtime; legacy demo rules remain. If the student calendar lacks coverage, report that reliable scheduling is unavailable rather than inventing future dates.
