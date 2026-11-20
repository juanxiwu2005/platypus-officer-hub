# Onboarding rollback register

| Package | Merge commit | Rollback |
| --- | --- | --- |
| OB-01 | `a3e3c16` | `git revert -m 1 a3e3c16` |
| OB-02 | `0452655` | `git revert -m 1 0452655` |
| OB-03 | `d9b302c` | `git revert -m 1 d9b302c` |
| Stage-0 completion (OB-01/03 fixes) | See `[OB-01/03][Claude] Complete stage 0` in `git log` (translated historical commit title) | **Revert this first**, then OB-03/OB-01; `git revert <SHA>` |
| OB-07 | `18e8d0a` (follow-up removes hardcoded dates from sample reminders; **revert it first**) | `git revert -m 1 18e8d0a` |
| OB-04 | `97abaa3` | `git revert -m 1 97abaa3` |
| OB-06 | `b7147a1` (follow-up extends style guards to ob-*.css and uses spring default first-event date; revert it first) | `git revert -m 1 b7147a1` |

| OB-05 | `39c033b` | `git revert -m 1 39c033b` |
| OB-08 | `8c1e0b9` | `git revert -m 1 8c1e0b9` |
| OB-09 | `d203f75` (follow-up makes `draft.clear()` cancel pending timers and removes Confirm workaround; **revert it first**) | `git revert -m 1 d203f75` |
| OB-10 switchover | `cdbc6d5` (Start walkthrough uses new flow; ob-2) | `git revert cdbc6d5` restores old setup; **R1 is faster: leave entry flag off to restore prior site behavior** |
| OB-01 progress-chain fix | `76e46d5` | `git revert 76e46d5` (before OB-01) |

**Rollback drill (2026-11-02):** reversed all 18 stage 2 and stage 3 mainline commits in a temporary worktree, conflict-free; `src`, `e2e`, styles byte-identical to pre-stage-2 `89952fd`; `tsc` passed.

