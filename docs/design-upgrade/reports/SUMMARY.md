# v1. 6 Interface and Dynamic Enhancement: Summary (27 work package)

- Date: 2026-11-01 Integration Branch: `claude/determined-johnson-yrdxwf` (PR #10, Preview https://deploy-preview-10--platypus-officer-hub.netlify.app)
- **Status of all 27 packages: 26 already merge; DX-20 only did 20a, 20b (cell base navigation) and Juanxi for approval.** DX-27 step 3 (merge style files) and other Juanxi approvals, not done.
- None of the packages has changed data structure, no `SCHEMA_VERSION` and rollback will not break old data from the browser. **didn't touch `main`.**

## Status of each package

| Bag. | What did you do? | Merge Commit | Rollback | Report |
| --- | --- | --- | --- | --- |
| DX-01 | Foundation: Style split files, effects token, test ports, screenshot scripts, style guards | `9d5a9f0` | `git revert -m 1 dx/dx-01-merged` | `reports/DX-01.md` |
| DX-02 | `Layout.tsx` Dismantling documents (pure moving) | `f1dbd24` | `git revert -m 1 dx/dx-02-merged` | `reports/DX-02.md` |
| DX-03 | Press feedback to transition to suspension | `055af30` | `git revert -m 1 dx/dx-03-merged` | `reports/DX-03.md` |
| DX-04 | Touch screen click area  ≥ 44px | `39aab5a` | `git revert -m 1 dx/dx-04-merged` | `reports/DX-04.md` |
| DX-05 | Risk point plus shape (not only color) | `b5ee333` | `git revert -m 1 dx/dx-05-merged` | `reports/DX-05.md` |
| DX-06 | Font Details | `0187d36` | `git revert -m 1 dx/dx-06-merged` | `reports/DX-06.md` |
| DX-07 | Page meta-information, click Highlights, scroll through | `775264a` | `git revert -m 1 dx/dx-07-merged` | `reports/DX-07.md` |
| DX-08 | Animated "reduce effect" protection already exists. | `eb55e5a` | `git revert -m 1 dx/dx-08-merged` | `reports/DX-08.md` |
| DX-09 | Right bar slides out, Ask buttons, safe zone, `dvh` | `d419447` | `git revert -m 1 dx/dx-09-merged` | `reports/DX-09.md` |
| DX-10 | Menu Access (Demo menu, bell) | `5a32bf7` | **First** `git revert --no-edit 6f62b17`Again. `git revert -m 1 dx/dx-10-merged` | `reports/DX-10.md` |
| DX-11 | Toast In and Out | `b54de9b` | `git revert -m 1 dx/dx-11-merged` | `reports/DX-11.md` |
| DX-12 | Cell phone suspense card bottom layer. | `e8ff3ec` | `git revert -m 1 dx/dx-12-merged` | `reports/DX-12.md` |
| DX-13 | Expand Animation in Collapse Zones | `4b118e7` | `git revert -m 1 dx/dx-13-merged` | `reports/DX-13.md` |
| DX-14 | Load Bones + Delay Display | `d83af1f` | `git revert -m 1 dx/dx-14-merged` | `reports/DX-14.md` |
| DX-15 | Events board | `d89d959` | **First** `git revert --no-edit a8775e6`Again. `git revert -m 1 dx/dx-15-merged` | `reports/DX-15.md` |
| DX-16 | Tasks board layout | `e6618b8` | **First** `3972412`Again. `a8775e6`Again. `git revert -m 1 dx/dx-16-merged` | `reports/DX-16.md` |
| DX-17 | Ask Panel | `8613954` | `git revert -m 1 dx/dx-17-merged` | `reports/DX-17.md` |
| DX-18 | Empty Status Document and Next | `12f079e` | `git revert -m 1 dx/dx-18-merged` | `reports/DX-18.md` |
| DX-19 | Toggle Cross Fade + Fade Page | `a5fcff5` | `git revert -m 1 dx/dx-19-merged` | `reports/DX-19.md` |
| DX-20 | **Only 20a**: mobile top bar thin (20b unnavigational, approval required) | `cc6a3d6` | `git revert -m 1 dx/dx-20-merged` | `reports/DX-20.md` |
| DX-21 | board row header saturation | `f6bd79a` | `git revert -m 1 dx/dx-21-merged` | `reports/DX-21.md` |
| DX-22 | Flowchart Node Change `transform` + Spring | `bfafc89` | **DX-24, DX-25 dependent on it `src/lib/motion.ts`DX-25, DX-24 and DX-22** | `reports/DX-22.md` |
| DX-23 | Semi-transparent topbar + shadow level token | `0e93cd6` | `git revert -m 1 dx/dx-23-merged` | `reports/DX-23.md` |
| DX-24 | Board pointer drag + Jean + spring + keyboard | `8ac5b82` | `git revert -m 1 dx/dx-24-merged`**Departure DX-26** for use `dragSort.ts`）| `reports/DX-24.md` |
| DX-25 | Time of completion: progress chain growth, dots, circle progress, corner sign | `7ef5a87` | `git revert -m 1 dx/dx-25-merged` | `reports/DX-25.md` |
| DX-26 | Partners board drag | `255c009` | `git revert -m 1 dx/dx-26-merged` | `reports/DX-26.md` |
| DX-27 | Close Document + Style Guard Completion (No. 1) 3(Step not done)  | `7c27bea` | `git revert -m 1 dx/dx-27-merged` | `reports/DX-27.md` |

stage rollback: submission of merge to this phase from the back to the next `git revert -m 1`; Every stage of the rehearsal is recorded on `ROLLBACK_LOG.md`"Rollback Record." 0–5After they're all gone with `dx/phase-N-before` **Word-by-word.**； See below for stage 6 exercises.

## Known problems and unverified (if true)
1. **live mobile phone/real machine finger** undetected: Touches are measured by synthetic events only (dX-24/26 drag, DX-12 bottom layer, DX-04 click area).
2. **Safari and the old browser**: `@starting-style`, `::details-content`, rolling-driven gradient (DX-19/13/...) revert "instant appearance" when not supported, function intact but animated; There's no Safari in the field.
3. The position of **DX-22** flow chart nodes is rarely changed (the layout retains a similar time position), so springs are almost non-existent at regular times; Tests to split into "styles in" and "rules against" parts.
4. The entire **DX-25** process " Growing the Step Mark Done  →  Progress Chain" has not been video-recorded and only parts have been measured.
5. **DX-20b** (Cell phone base navigation) did not do it and requires Juanxi approval.
6. **DX-27Article 3Step**(GROANS) `dx-*.css`Together. `styles.css`No, I need Juanxi's approval.  After the merge R1 fast closes out, only R2.
7. The `dx/*` tag and the `design/dx-NN-*` branch **are only local** (the certificate for this session sends 403). Rebuilding orders at `ROLLBACK_LOG.md`; The SHA rollback (column 3 in the table above) can also be used without a label from merge.
8. Unit tests `engine.test.ts` occasionally exceeds 5 seconds when the machine is busy. It is suggested to move the timeout to 15 seconds.
9. Playwright browser path over the container: local run to set `PW_CHROMIUM=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome`.

## It's for Juanxi.
- Do you want to do DX-20b?
- Do you want to do the DX-27 step 3 (merge small style file)? If you do it, you can't turn off a bag with "Note line `@import`."
- After reading the preview (PR #10), take merge to `main`, choose **Create a new company** (not SQUASH), otherwise you can no longer press work package rollback. Merge only did it when Juanxi said "approved merge."
- Can `integration/v1.0` and other branches be deleted: it is up to Juanxi (there are no missions in this session).

## Complete check (stage after 6 merge)
- Node 22, `npm run check` (lint + Build + Module + Page + Words running alone and without any other task at the same time): **839 unit sets through** (phase 5 is 834), adding 5 new guard tests at this stage; **619 brokenservertes via / 93 designed skip/ 0 failed** (phase 5 is 613/ 87; The extra 6 is a desktop test for DX-26, and the number of skip 6 on the cell phone; Words are all within the ceiling.
- Image comparison (phases) 6Building vs. before starting now, 64Chang: **62Zhang Xue is identical to pixels**； In addition, 2 (`events-mobile-light-rail-open`, `team-mobile-light-rail-open`) were different, but the relapsing proved to be random noise -- with the same old code taken 3 times, Team jumped between 0 and 8,629 pixels; The same 3 times, Events that jumped between 0 and 699. Both differences have nothing to do with the changes at this stage (only partners board, documents and style checks have been changed at this stage).
- Rollback Exercise: See `ROLLBACK_LOG.md` "Rollback Records" in the last line (done DX-27, DX-26 after starting with stage 6 verbatim).
