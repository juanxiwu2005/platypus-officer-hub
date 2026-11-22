# P3 storyboard design decisions — approved for static storyboards

Date: November 22, 2026 (America/Phoenix). Planner/reviewer: Codex.
Baseline: `feat/onboarding-quest@b4ed1eb8c0638b4dd3e4f11b73e9b9de07e55319`; continue existing Draft PR #19.

**Status: all nine recommended decisions APPROVED by the owner at 2026-11-22T14:12:28-07:00.** The owner explicitly selected every recommendation and requested six consistent static storyboards. This confirms the design direction and authorizes P3 image production; the resulting six images received separate owner visual acceptance before the P4 request below.

Juanxi requested simple Chinese questions first and six static storyboards only after confirmation. The in-chat questionnaire is the owner-facing version; this English register preserves the exact questions and recommendation status.

Sources: [HANDOFF](HANDOFF.md) sections 1 and 3; [v3 design](../feedback-fix/QUEST_GAME_DESIGN_V3_2026-11-21.md) sections 3, 5, 8, 10 and 11; [design tokens](../DESIGN_TOKENS.md) section 9.

| ID | Owner decision | Proposed recommendation | Alternative / consequence | Status |
| --- | --- | --- | --- | --- |
| D1 | Names, cast and tone | Retain Mission: Speaker Night, Club HQ, Pip the platypus guide, and the six named people: Taylor (treasurer), Morgan (marketing), Riley (events), Sam (secretary), Alex (president), Dr. Lee (advisor). Adult student proportions and a college audience. | Owner may rename characters or adjust the tone before consistent art is made. | APPROVED: recommendation |
| D2 | Art style | Clean flat-vector isometric illustration, like a polished tabletop model; warm desert-campus colors and Platypus teal. | A more cinematic illustrated background style is possible; its consistency and production choices would be reviewed after selection. | APPROVED: recommendation |
| D3 | Total length | About 55–60 minutes across two sessions over two days, preserving all 33 scored rules. | About 40 minutes may compress presentation and repeated actions. It must retain all 33 approved rules; the old suggestion to drop parts of missions 1 and 7 is not adopted. | APPROVED: recommendation |
| D4 | Venue accessibility checks | Require both checklist-derived check groups alongside the four venue rules: accessible routes/seating/front seats/screen visibility, and covers for cables crossing walkways. | Confirm these as requirements of the game while accurately identifying the checklist source. | APPROVED: recommendation |
| D5 | Sound | Music and effects off by default, manually enabled; all dialogue captioned. | Sound-on by default requires a different owner choice. | APPROVED: recommendation |
| D6 | Emergency-scene pressure | No emergency countdown by default; an optional timed challenge can be selected later. | A timer can add pressure; it is not assumed. | APPROVED: recommendation |
| D7 | First playable sample scope | Prologue, Club HQ, mission 2 (Countdown Wall) and mission 5 (Venue Builder). | Other sample scope requires an explicit owner choice. P3 itself remains static storyboards. | APPROVED: recommendation |
| D8 | Cutscene duration direction | Approve later /quest-only 2–20-second cutscene duration tokens; skippable and captioned, with still-frame/direct-cut reduced-motion alternatives. | P3 adds no duration tokens or animation code. The named 40-second prologue remains a separate sequence, not a 40-second chapter-opening token. | APPROVED: recommendation |
| D9 | True 3D scope | Keep the surrounding game in 2D/2.5D and make only Venue Builder truly 3D in the later sample phase. | All-2.5D is an alternative. This design choice does not install a 3D dependency or implement 3D during P3. | APPROVED: recommendation |

## Six agreed storyboard subjects

These six approved subjects come directly from v3 section 10:

1. Club HQ overview.
2. Mission 2 Countdown Wall.
3. CANCELLED consequence plus Rewind.
4. Venue Builder.
5. A Showtime live moment.
6. Credits newspaper and event-flow-chart roll.

## Fixed boundaries

- Preserve all 33 rules and 13 required red lines; reflection 7.4 remains unscored.
- Original characters/art/music only; no real ASU logo, identifiable real person or participant data.
- Strong hands-on interactions, little text, no multiple-choice quiz cards, stickers or points/badges.
- Existing keyboard/touch and reduced-motion requirements remain; they are not optional additions.
- P3 produces six static review images after confirmation. Approval of these decisions does not accept the eventual storyboard art or authorize P4 implementation, dependencies, study recruitment, a merge or production deployment.
- Main, the completed P0 branch and user-level OpenCode defaults remain unchanged. The legacy queue remains paused. Thesis backup synchronization remains pending.

## Approval and current action

The owner explicitly accepted all nine recommendations before production. Six consistent static storyboard images are now ready: [gallery](storyboards/p3-v1/index.html), [review notes](storyboards/p3-v1/REVIEW.md), [prompts](storyboards/p3-v1/prompts.json). One targeted Venue Builder correction was made and carried into Showtime. Finished-art visual acceptance is still pending. Do not infer P4 implementation, dependency, merge or deployment approval from the design decision approval.

## Finished-art acceptance — November 22, 2026

The owner explicitly accepted the six storyboard images, requested the same visual style and cast, and authorized P4 route/framework/playable Countdown Wall work. P4 still does not authorize P5, dependencies, main merge or production deployment.
