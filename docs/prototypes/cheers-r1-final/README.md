# Cheers (phase R1) final screens (2026-11-26)

Final review images for phase R1 of `docs/feedback-fix/CHEERS_TEAM_PROGRESS_PLAN.md`, drawn from Juanxi's choices on 2026-11-26. Each image is the running demo (fictional seed club, demo day Sat Oct 31) with one screen injected where it will live; `source/snap.cjs` regenerates them (start `npx vite --port 5199` first). Desktop 1440×900, mobile 412×915, both at 2×. Review page (Chinese): https://claude.ai/artifact/9dJvJemRJfXhrFtZWZ9FBG

| Screen | Files | What it shows |
| --- | --- | --- |
| F1 Personal cheers card on Team (replaces the Contributions board, which is hidden and later president-only) | `F1-team-card-desktop.png`, `-mobile`, `-dark` | Points received this term, allowance left this week, the three latest sent and received cheers with their notes, View history, Give points |
| F2 Give points in the right-rail Details | `F2-give-empty-desktop.png`, `F2-give-filled-desktop.png`, `F2-give-filled-mobile.png` | Recipient, optional task, points 10/25/50/100, quick starts, a required note (10–280 characters; Send stays disabled until then), card style, Also email |
| F2b, F2c Give points as built after the R1.1 amendments (contract §8), viewer Maya | `F2b-give-v2-desktop.png`, `F2c-confirm-desktop.png` (`source/snap-r1.1.cjs`) | Points with − and + (100 to what is left), the note "What did they do, and how did it help?" with a small asterisk, eight trophies, two people under "Let others know too", "Jordan will get an email."; then the confirmation "Send 300 points to Jordan Patel? You can't undo this." with Cancel and Send |
| F3 History dialog | `F3-history-desktop.png`, `-mobile` | Term totals, All / Received / Sent, records grouped by week, private to sender and recipient |
| F4 Prompt on a finished task | `F4-task-prompt-desktop.png` | "Priya finished this. Say thanks?" for anyone but the owner; opens F2 prefilled |
| F5 Received card, shown once | `F5-received-desktop.png`, `F5-received-two-mobile.png`, `F5-received-dark.png` | Centered card with the note, sender and task; "1 of 2 new cheers" with Next |
| F6 Email draft | `F6-email-draft.png` | "⭐ Maya sent you 25 points"; the points, the task, the sender's note and a link that opens the F5 card; no running total |
| F7 President's weekly line | `F7-weekly-strip.png` | "This week: Maya and Jordan delivered on time with details." with Thank them, opening F2 with both selected |

Open questions on the review page: how long the weekly line shows (suggested Monday to Wednesday), how many received cards show at once (suggested at most 3), and whether the president-only Contributions board waits for phase R2 (suggested).

R1.1 (2026-11-26): after trying the form, Juanxi amended F2 and F6 (contract §8): no task field, no quick starts, points from 100, trophies, a confirmation, no withdraw, automatic email instead of a draft, and "Let others know too". The F2 and F6 images above show R1 and are kept as history; F2b and F2c show the form as built.
