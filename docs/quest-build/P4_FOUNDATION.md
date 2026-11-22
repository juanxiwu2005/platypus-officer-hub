# P4 foundation contract — November 22, 2026

Owner accepted P3 art and authorized /quest, scene/interaction framework and one playable Countdown Wall. Baseline a28991e on feat/onboarding-quest / Draft PR #19. Main remains read-only.

- Lazy standalone HashRouter route /#/quest and a discoverable navigation link. Return to the existing application without changing its saved club/event state.
- Preserve the accepted fictional cast/palette. Use approved HQ art, dedicated cleaned Countdown/consequence plates and a Pip guide asset. Runtime controls and text are DOM, not baked screenshot buttons.
- Typed scene definitions, interaction definitions/results, reducer transitions and versioned isolated local practice persistence form a copyable reference for later cards.
- The reference covers rule IDs 2.1, 2.2, 2.4 and 2.5 using Registry, an unscored authored Approval milestone, Room request, RITM and Publicity. Date/order placement supports same-day order without inventing approval turnaround times. Full Mission 2 account-holder/advisor decisions remain P5 work; no false six-rule completion claim.
- All calendar dates and official deadlines come from a deterministic engine adapter using existing officialDeadline/calendar logic. Use the approved 49-day fictional scenario and the existing demo clock. Closed-day shifts remain visible in Why. Do not alter production engine behavior or any of the 33 source rules.
- A complete attempted plan shows a scripted consequence or success. Rewind preserves the plan for repair, with original attempt results retained locally. Why is collapsed by default and quotes exact existing rule-library entries with catalog links; Pip provides existing hints only.
- Pointer drag uses the established drag helper. Equivalent click/tap and keyboard select/arrow/Enter workflows, Escape cancellation, focus recovery, announcements, reduced-motion behavior and small-screen layout are required.
- Quest interaction capture is isolated from the application's study interaction logger. Practice persistence is a separate local key; unavailable or newer/invalid storage must not corrupt existing data.
- No new dependencies, live AI, remote writes, real organization data, research recruitment, new timing tokens or P5/3D features. Scene transitions use existing motion tokens.

Validation: pure rule/deadline/transition/persistence regressions, component interaction/storage/isolation tests, full lint/types/build, relevant real browser mouse/keyboard/mobile/touch/reduced-motion flows, screenshots, and exact-head PR CI. Deliver a local runnable build, source/asset snapshot, screenshots, checks and complete TRIAL_LOG. Owner acceptance and main release remain separate.

## Extending the reference

A SceneDefinition links to an InteractionDefinition; COUNTDOWN_WALL declares the timeline kind and exact scored rule IDs. QuestAction drives scene/move/check/rewind/restart through one reducer. InteractionResult retains an immutable board, attempt number and scored rule IDs. Later ASU AIR cards can copy this boundary for one interaction at a time without reading the whole application or modifying existing rules. Introduce a new save version/migration before changing a supported saved shape. Keep date calculations in engine adapters and new practice capture separate from existing research logs.

For acceptance: open Quest from the navigation, place the five tasks, run the night, inspect Why, Rewind and repair the plan. Task dates may match; vertical order on the same day remains causal. Selecting/dragging a timed task marks engine-derived late days in red with a text warning; a late drop remains playable. Test pointer, tap and keyboard equivalents and reload a partial plan. This reference rehearses only the four listed timing/order rules and must not unlock full Mission 2 or claim account-holder/advisor completion.

## Validation and delivery status

Local implementation complete on feat/onboarding-quest, Draft PR #19. Full local unit suite passed before final UI polish (2,152 tests); final affected suite passed 31/31. Lint/types/build and existing page word budgets passed. Real mouse, same-day reorder, keyboard, touch tap/hold-drag, failure/Rewind/repair/success, reload/storage isolation and reduced-motion checks passed. HQ and mobile wall axe audits found zero violations after fixes. Both updated exact-navigation browser tests pass on desktop/mobile (four cases). No source rule, production engine, dependency, pipeline or default-model change occurred.

The output directory outputs/quest-p4-foundation contains site/, START_QUEST.command, screenshots, exact prompts, changed-source snapshot, command evidence, DELIVERY.json and the final TRIAL_LOG.md. The loopback-only launcher was started and its output build opened at http://127.0.0.1:5190/#/quest. A later run can double-click the launcher; an occupied unrelated port is preserved.

Netlify reports a successful deployment at https://deploy-preview-19--platypus-officer-hub.netlify.app/#/quest. Browser checks reached Team protection: This site is private, invited-account sign-in required. This is an access limitation, not verified hosted gameplay. Local gameplay is verified. Keep this distinction when handing off: owner play acceptance and the hosted-preview portion of the P4 gate remain pending. Do not weaken protection or advance to P5 automatically. Exact final commit/check IDs are in the local delivery closure to avoid a self-referential CI-log commit cycle.
