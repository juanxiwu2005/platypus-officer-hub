# Event workflow — editable review sheet

Use this sheet to decide the **one approved order** before it is put back into the workflow engine.

You can edit this document directly, or copy the table into Excel / Google Sheets and upload it back.  Do **not** change the `key` column unless you want to replace a node entirely: it is the stable machine ID used by existing events, templates, and policy references.

## What each column means

| Column | Plain-language meaning |
| --- | --- |
| `branch` | The horizontal route / row on the diagram. Nodes sharing a branch are read left to right. |
| `order` | The order within that branch. Use whole numbers: 10, 20, 30… so new items can go between them. |
| `waits for` | The node that must be complete first. Use the `key`, not the display name. Multiple keys may be comma-separated. |
| `when shown` | `always` means blue Core step. Anything beginning `if` means yellow Situation-based step, shown only when the relevant event checkbox / condition applies. |
| `timing` | An official or club target relative to Event Day. `engine` means its date follows the preceding work; `T-14` means 14 days before; `T+3` means 3 business days after. |
| `owner function` | The default organization responsibility. The engine maps it to the club's actual role using title and duty text. |

## Current editable flow

### 0. Start

| branch | order | key | display name | waits for | when shown | timing | owner function |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| Start | 10 | eventCreated | Event Created | — | always | event created | Events lead |

### 1. Event Lead route

| branch | order | key | display name | waits for | when shown | timing | owner function |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| Event Lead | 10 | plan | Plan Event | eventCreated | always | T-60 target | Events lead |
| Event Lead | 20 | backup | Backup Plan | plan | always | engine | Events lead |
| Event Lead | 30 | venuechoice | Choose Venue | backup | always | engine | Events lead |
| Event Lead | 40 | registry | Event Registry | venuechoice | always | official minimum T-14 | Events lead |
| Event Lead | 50 | venue | Book Room | registry | always | T-30 target | Events lead |
| Event Lead | 60 | moderator | Moderator Staffing | venue | always | engine | Events lead |
| Event Lead | 70 | materials | Event Materials | moderator | always | engine | Events lead |

### 2. Speaker / partner route

| branch | order | key | display name | waits for | when shown | timing | owner function |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| Speaker | 10 | partner | Partner Meeting | plan | if external speaker / performer selected | engine | Events lead |
| Speaker | 20 | speakerPacket | Speaker Packet | partner | if external speaker / performer selected | engine | Events lead |
| Speaker | 30 | travel | Travel Plan | speakerPacket | if external speaker / performer selected | engine | Events lead |
| Speaker | 40 | partnerReview | Partner Review | travel | if external speaker / performer selected | engine | Events lead |
| Speaker | 50 | parking | Parking Validation | partnerReview | if external speaker / performer selected | engine | Events lead |

### 3. Marketing route

| branch | order | key | display name | waits for | when shown | timing | owner function |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| Marketing | 10 | marketingNeeds | Marketing Needs | plan | always | engine | Marketing lead |
| Marketing | 20 | contentCreation | Content Creation | marketingNeeds | always | engine | Marketing lead |
| Marketing | 30 | promotionItems | Promotion Items | contentCreation | always | engine | Marketing lead |
| Marketing | 40 | rsvp | Open RSVPs | promotionItems | always | T-21 target | Marketing lead |
| Marketing | 50 | content | Content Distribution | rsvp | always | engine | Marketing lead |
| Marketing | 60 | reminder | Event Reminder | content | always | engine | Marketing lead |

### 4. Finance route

| branch | order | key | display name | waits for | when shown | timing | owner function |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| Finance | 10 | budget | Budget | plan | if funding / reimbursement selected | engine | Treasurer |
| Finance | 20 | foodCompliance | Food Exception / Permit | budget | if external food selected | official minimum T-7 business days | Treasurer |
| Finance | 30 | quotes | Quote Gather | foodCompliance | if funding / reimbursement selected | engine | Treasurer |
| Finance | 40 | budgetRequest | Budget Request | quotes, foodCompliance | if funding / reimbursement selected | T-42 target | Treasurer |
| Finance | 50 | budgetApproval | Budget Approved | budgetRequest | if funding / reimbursement selected | engine | Treasurer |
| Finance | 60 | purchaseRequest | Purchase Request | budgetApproval | if funding / reimbursement selected | official minimum T-14 | Treasurer |
| Finance | 70 | purchaseApproval | Purchase Approved | purchaseRequest | if funding / reimbursement selected | engine | Treasurer |
| Finance | 80 | orderPlaced | Order Placed | purchaseApproval | if funding / reimbursement selected | engine | Treasurer |

### 5. Special Event route

| branch | order | key | display name | waits for | when shown | timing | owner function |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| Special Event | 10 | advisor | Advisor Involved | plan | if advisor checkbox selected | engine | Events lead |
| Special Event | 20 | access | Accessibility Check | advisor | if accessibility checkbox selected | engine | Events lead |
| Special Event | 30 | security | Security | access | if elevated safety checkbox selected | engine | Events lead |
| Special Event | 40 | eams | EAMS Plan | security | if elevated safety checkbox selected | engine | Events lead |
| Special Event | 50 | permit | Permit Insurance | eams | if elevated safety checkbox selected | engine | Events lead |
| Special Event | 60 | alcohol | Alcohol Permit | venue, registry | if alcohol checkbox selected | official minimum T-15 | Events lead |
| Special Event | 70 | drone | Drone Approval | venue, registry | if drone checkbox selected | official minimum T-15 | Events lead |
| Special Event | 80 | schoolApproval | School Approval | alcohol | if 250+ attendees or school approval selected | engine | Events lead |

### 6. Readiness and Event Day

| branch | order | key | display name | waits for | when shown | timing | owner function |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| Merge | 10 | finalcheck | Full Check / Alert Changes | materials, parking, reminder, orderPlaced, permit, alcohol, drone, schoolApproval, access | always | T-14 target | President |
| Event Day | 10 | checkin | Check-in Forms (photo release + liability) | finalcheck | always | Event Day | Events lead |
| Event Day | 20 | eventDay | Event Day | checkin | always | Event Day | Events lead |
| Post-event gate | 10 | headcount | Headcount | eventDay | always | T+1 | Events lead |

`eventCreated` and `eventDay` are visual engine milestones, not editable task records. The app currently uses the Event Day milestone automatically between pre-event and close-out dates; the final integration will make the Headcount dependency visibly attach to it.

### 7. Close-out routes

| branch | order | key | display name | waits for | when shown | timing | owner function |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| Close — Event | 10 | thankyou | Thank You | headcount | always | T+1 business day | Secretary |
| Close — Event | 20 | feedback | Feedback | thankyou | always | T+3 business days | VP / Events lead |
| Close — Event | 30 | documentation | Documentation | feedback, photoBackup, financeRecord | always | T+14 calendar days | Secretary |
| Close — Marketing | 10 | postmarketing | Post Event Marketing | headcount | always | T+2 business days | Marketing lead |
| Close — Marketing | 20 | photos | Photo Upload | postmarketing | always | T+3 business days | Marketing lead |
| Close — Marketing | 30 | photoBackup | Photo Backup | photos | always | T+4 business days | Marketing lead |
| Close — Finance | 10 | invoice | Invoice | headcount | always | T+2 business days | Treasurer |
| Close — Finance | 20 | attendance | Attendance Submit / BMF | invoice | always | T+3 business days | Treasurer |
| Close — Finance | 30 | spending | Paid or Reimbursed | attendance | always | T+5 business days | Treasurer |
| Close — Finance | 40 | financeRecord | Finance Record | spending | always | T+7 business days | Treasurer |
| End | 10 | end | End | documentation, photoBackup, financeRecord | always | complete | System |

## How to return your edits

1. Keep the `key` exactly as written for an existing step.
2. Change `branch`, `order`, `display name`, and `waits for` to match your drawing.
3. If a node should disappear, write `REMOVE` in its `display name` cell and briefly say why.
4. For a new node, add a row with `NEW-01`, `NEW-02`, etc. in `key`; I will assign its permanent machine ID.
5. Upload the edited `.md`, `.txt`, `.xlsx`, or a screenshot of your completed table here.

The only dates you need to decide are relative targets like `T-30`, `T-14`, `Event Day`, or `T+3`. Do not calculate calendar dates: the schedule engine will do that per event.
