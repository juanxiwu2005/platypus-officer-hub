# Onboarding redesign: work packages/worktree workflow

> **Status: awaiting Juanxi's “start.”** Design basis: [`../ONBOARDING_REDESIGN_STRATEGY.md`](../ONBOARDING_REDESIGN_STRATEGY.md) (read sections 0, 2b, 3, 4, 5, and 7 first); this file covers splitting/parallelism/rollback only.
> Reuses v1.6 approach (`../design-upgrade/README.md`): one worktree/package, exclusive files, `--no-ff` merges, independent rollback.

## 1. Agreed prerequisites (Juanxi,2026-11-01)

| Item | Decision |
| --- | --- |
| Date | Aim to finish before **11/6** as reference (exact Phase 3/freeze dates undecided). |
| Participants | **All presidents.** First visit defaults to flowA; member flowB is preview only afterA, using just-created club. **No “I am a member” entry.** |
| Recording | **Record onboarding in participant's own browser** (section 4). |
| Unanswered | Strategy section 9 Q2–Q6 not explicitly answered; **before starting, say “Q2–Q6 as recommended”** (or specify disagreement). |

## 2. Branches/worktrees/one limitation

- **Integration=`claude/determined-johnson-yrdxwf` (PR #10/preview 10).** This session can push only that branch (others and tags return 403; `design-upgrade/ROLLBACK_LOG.md`), so onboarding **shares v1.6 preview**. Default-off entry leaves old preview 10 pages unchanged; new flow via section 6 URL. Main merge still **Create a merge commit**, not Squash.
- Local branch `design/ob-NN-<short-name>`/worktree `../platypus-ob-NN` per package from integration (local only, enters through merge).
- **Separate ports** (supported by `playwright.config.ts`): `PW_PORT=52NN PW_STORAGE_PORT=53NN WORDS_PORT=54NN`, NN package number.
- Parallel packages run `npm run lint`, `npm run build`, `npm test`, and their own `e2e/ob-NN-*.spec.ts`; **integrator runs full `npm run check` once after each wave**.
- **Integrator-only files:** `docs/PROGRESS.md`, `AGENTS.md`, `docs/DESIGN_TOKENS.md`, `src/styles.css`, `src/styles/index.css`, `src/App.tsx`, `src/data/store.tsx` (OB-02 exception), `e2e/helpers.ts`, `playwright.config.ts`.
- Each writes own `docs/onboarding-redesign/reports/OB-NN.md`, not others'.
- Old `src/pages/Setup.tsx`, `Join.tsx`, tests **entirely unchanged** (only wrapped in new shell).

## 3. Packages (worktree suitability)

**Reading:** parallel=concurrent worktrees allowed; exclusive=only that package edits; suitability=agent/worktree assessment.

| Wave | Package | Contents | Dependencies | Parallel | Exclusive files | Suitability | Size | Rollback |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **0** | **OB-01 Shell/routes** | Focused shell without nav/Ask; step state machine (forward/back/skip/recover, pure/unit tested); chain progress; Demo bar; **shared founder draft context** consolidating Setup.tsx 15 states for all screens; copy table; **all new routes/placeholder screens/styles created at once**; legacy setup/join wrapped (`/#/welcome/classic`) | None | Only OB-02 | `src/onboarding/shell/**`, `engine/**`, `draft.tsx`, `copy.ts`, `src/App.tsx`, `src/styles/ob-*.css`, `index.css` `@import`, `e2e/ob-helpers.ts` | ✅ **Enables later parallelism:** creates conflicting shared files once; later packages edit placeholders. **Itself serial** due to shared files | M | R2 |
| **0** | **OB-02 Records** | Local module (section 4), `src/lib/onboardingRecord.ts`/tests/export; Reset demo retains records/reenables entry | None | Only OB-01 | `src/lib/onboardingRecord.ts`, `src/test/onboardingRecord.test.ts`, `src/data/store.tsx` (`buildExport`/`reset` only) | ✅ **Fully independent**, pure logic, ideal separate agent; sole store.tsx package avoids collisions | S | R2 |
| **0** | **OB-03 First-visit gate** | Welcome (Start walkthrough/Explore the sample club); first-visit test; default-off flag; initially `/#/welcome/classic`; Demo Replay setup→Replay walkthrough; recording | OB-01/02 | No, serial | `src/onboarding/gate/**`, `src/components/chrome/DemoMenu.tsx`, `e2e/ob-03-gate.spec.ts` | ⚠️ Depends on prior interfaces, **serial**, but small | S | R2; R1 flag off |
| **1** | **OB-04 Name+Constitution** | A screens 1–2, reuse ConstitutionStep/startReading logic, UI only | OB-03 |05/06/07/08| `src/onboarding/founder/Name.tsx`, `Constitution.tsx`, `ob-04-*.css`, `e2e/ob-04-*.spec.ts` | ✅ Exclusive directory; outside interaction only draft/copy | M | R1+R2 |
| **1** | **OB-05 Goals+Team** | Screens 3–4, suggested goals/two-cell Role-Person rows/OrgChart/duty disclosures | OB-03 | Same | `founder/Goals.tsx`, `Team.tsx`, `ob-05-*.css`, tests | ✅ Same | M | R1+R2 |
| **1** | **OB-06 First event (moment of value)** | Screen 5: sentence→draw chain→buffer segmented control; reuse parseCommand/prepare/completeSetup; rule-engine dates only | OB-03 | Same | `founder/FirstEvent.tsx`, `ob-06-*.css`, tests | ✅ Independent but **largest/hardest; start first** for most time | L | R1+R2 |
| **1** | **OB-07 Member preview: Invitation+You+Reminders** | B screens 0–2, Demo “Previewing as <name>”; example reminder bubble | OB-03 | Same | `src/onboarding/member/Invitation.tsx`, `You.tsx`, `Reminders.tsx`, `ob-07-*.css`, tests | ✅ Independent; use sample invite code during development, no A-screen dependency | M | R1+R2 |
| **1** | **OB-08 Member preview: Busy weeks+About you+Done** | Week strip with finals/breaks, suggested tags, one joining-chart action, first-task card | OB-03 | Same | `member/BusyWeeks.tsx`, `About.tsx`, `Done.tsx`, `ob-08-*.css`, tests | ✅ Independent | M | R1+R2 |
| **2** | **OB-09 Confirm+Invite+A→B+tips** | Confirmation/invitation moment (Copy/WhatsApp/Email, Invited/Joined list), See what your officers will see→B,≤3 one-time Today tips | OB-06/07 | No, integration | `founder/Confirm.tsx`, `Invite.tsx`, `src/onboarding/tips/**`, `ob-09-*.css`, tests | ❌ **Not parallel:** reads 06 and 07 and connects flows; integrator/one agent serially | M | R1+R2 |
| **3** | **OB-10 Switch/harden/finish** | Switch legacy entry to new A/B flags; desktop/mobile/dark/reduced-motion/reduced-transparency; recording e2e; rollback rehearsal/screenshots/docs/freeze notice | All | No | Docs/flags/global tests | ❌ **Serial, integrator personally** for global checks | M | R2 |

**Cut order if short on time (entry/main path intact):**①OB-09 Today tips→②OB-08 (B second half, wrap old ProfileForm)→③OB-07 sample reminder bubble→④OB-04 Constitution screen (one-click sample). **Never cut:**OB-01/02/03 entry/records/shell, A OB-05/06.

### Parallel diagram

```
Wave0 OB-01 ─┐
      OB-02 ─┴→ OB-03
                   │
Wave1 ┌────────────┼────────────┬────────────┬────────────┐
    OB-04       OB-05       OB-06 ★largest OB-07       OB-08        ← ≤4 worktrees; fifth waits
      └────────────┴──────┬─────┴─────┬──────┘
Wave2                   OB-09 ←───────┘ (needs06+07)
                          │
Wave3                   OB-10
```

**Why ≤4:** each worktree needs npm ci/browser tests, straining machine; v1.6 used up to 6, but 3 packages here heavy (06/09/10).

## 4. Recording (Juanxi: “Record onboarding in browser too”)

- **Location:** **new** local key, e.g. `platypus.v1.onboarding`, separate from `platypus.v1.log`: existing 2000-entry cap drops oldest, risking early onboarding loss; Reset demo leaves logs unchanged, same here.
- **No schema changes:** unchanged `SCHEMA_VERSION`/`DemoState`/existing keys; **new** key ignored after rollback (`design-upgrade` rule 4 covers existing data only, this is additive; please confirm).
- **Behavior only, no contents:** per attempt attemptId/flowVersion/Start-or-Explore/each screen enter-back-skip-complete +millisecond time/completed-or-not/exit screen/replay count. **No entered text** (club/name/etc. already in exported state).
- **Viewing:** Settings **Export my data** adds top-level `onboarding` (`formatVersion` stays 1, additive field). **Only participants export**, no automatic reporting.
- **Failure:** blocked storage means no recording; UI works as before.
- **Default on**, as requested. Recommend Welcome sentence "Your steps in this walkthrough are saved in this browser" (Responsibility). **Research disclosure: decide whether/how against IRB materials.**

## 5. Shared package requirements

1. **Exclusive files only.** Shared-file need: stop/report to integrator.
2. **Tokens only** for color/type/radius/layer/duration/easing; dedicated `ob-NN-*.css`; no `!important`, `transition: all`, or raw milliseconds; transform/opacity only; interruptible/reduced-motion variants.
3. **English UI**, strings from OB-01 `copy.ts`, not scattered.
4. **Rule-engine dates only, no AI dates, no `/api/org/*`/`/api/workspace*` calls/new AI endpoints**; existing `/api/setup/constitution`, `/api/command` only.
5. **No real data/secrets.**
6. **Tests:** unit +desktop/mobile `e2e/ob-NN-*.spec.ts` for fastest/full/back/skip/recovery/a11y/dark/reduced-motion; **intentional violation sample for every new guard**; no old-test deletion/weakening.
7. **Words:** immediately visible English ≤ 40/screen (moment-of-value/invite≤60).
8. **Package report:** changes, where-to-click acceptance, unverified real touch/Safari/etc. **Never claim unverified checks passed.**

## 6. Preview review

- Flag off by default: all old preview 10 pages unchanged.
- After OB-03 merge, provide **parameterized URL** (e.g. `?walkthrough=1`) opening Welcome; incognito means first visit. OB-01/02 are invisible foundation, explained in report.
- OB-10: separate A/B switches, enable as accepted; **unaccepted flow retains legacy**.

## 7. Timeline (11/6 reference; today 11/1)

| Day | Work | Your action |
| --- | --- | --- |
| **11/1(today)** | “Start”→parallel OB-01/02→merge→OB-03 | Say “start”/“Q2–Q6 as recommended” |
| **11/2** | OB-03 merge/Welcome preview; wave 1 starts (06 first, 04/05/07 follow) |1-minute Welcome review|
| **11/3** | Wave 1 merges, A preview | Walk A, reply accepted/changes |
| **11/4** | OB-08/09, A feedback fixes | Walk A→B |
| **11/5** | OB-10 switch/full checks/rollback/screenshots | Final acceptance |
| **11/6** | **Buffer:** named fixes only, nothing new | Confirm freeze |

**Risk stated plainly:** assumes each review receives your response **within a day**; one-day delay requires cuts to meet 11/6. v1.6 completed 27 packages in one day, proving splitting/parallelism feasible; review turnaround is bottleneck. **Tell me immediately if Phase 3/freeze moves before 11/6.**

## 8. Rollback

- Each `git merge --no-ff design/ob-NN-xxx` logged in `docs/onboarding-redesign/ROLLBACK_LOG.md` (OB-01 creates), merge SHA recorded (tags cannot push; v1.6 approach, local-only `ob/*`).
- Say **“roll back OB-06”** or **“disable entire entry.”**
  - **R1 fastest:** entry flag off restores current site; or comment package `@import` in index.css.
  - **R2:** `git revert -m 1 <merge-commit>`.
  - Revert fixes before package; dependents first (06/07→09→10).
- No DemoState changes; old browser data safe after rollback, new recording key ignored.
