# Quest build kit

Everything a new assistant needs to continue building the onboarding game *Mission: Speaker Night* in phases, using ASU AIR models through OpenCode for most of the coding.

| File | Read it when |
| --- | --- |
| [HANDOFF.md](HANDOFF.md) | First. Decisions so far, phases with gates, tonight's runbook, hard rules |
| [DECOMPOSITION.md](DECOMPOSITION.md) | Before writing or splitting any task. Size limits per level, context budget, model routing, card template |
| [AGENT_BRIEF.md](AGENT_BRIEF.md) | This is the only project document ASU AIR coding agents read (instead of `docs/PROGRESS.md` and the other large files) |
| [prompts/](prompts/) | Exact prompts for the coder and critic runs |
| [cards/](cards/) | Task cards, one file per run, executed in filename order |
| [P1_PIPELINE.md](P1_PIPELINE.md) | Before running the repaired guarded controller; setup, commands, known-failure fixes and evidence |
| [TRIAL_LOG.md](TRIAL_LOG.md) | Record every run here: model, time, result, critic verdict, notes |

Design sources: [game design v3](../feedback-fix/QUEST_GAME_DESIGN_V3_2026-11-21.md), [rule library (v2 section 3)](../feedback-fix/QUEST_GAME_SPEC_2026-11-21.md), [onboarding plan](../feedback-fix/ONBOARDING_QUEST_PLAN_2026-11-21.md), [research review](../feedback-fix/HANDOFF_RAMP_REVIEW_2026-11-21.md), [Night Mode manual](../NIGHT_MODE.md).
