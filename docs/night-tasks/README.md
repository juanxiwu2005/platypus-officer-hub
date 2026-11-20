> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# Night Mode Task Library

Ready-to-queue task files. People precomputed the mappings/checklists
(docs/NIGHT_MODE.md 7c item 1: humans investigate; Night Mode makes mechanical edits only).

N1…N6 filename prefixes define execution order; queue sorts by filename.

Usage:

```bash
cd /Users/Dirofs/AI-Projects/platypus-night-mode
git pull
mkdir -p .nightmode/queue
cp docs/night-tasks/N*.md .nightmode/queue/     # Or select individual tasks
caffeinate -dimsu bash scripts/night-queue.sh
```

⚠️ **While the queue runs, nobody, including Claude, may push feat/ai-night-mode.**
All seven tasks on 2026-10-27 failed solely because Claude pushed a documentation commit
during execution; every later task hit the same barrier. See docs/NIGHT_MODE.md 7b-2.

## Current queue (2026-10-29: Night Mode paused; N2–N6 run in manual sessions)

| Task | Work | Visual risk | Estimate | Dependencies |
| --- | --- | --- | --- | --- |
| N1 | Consolidate spacing, odd values only | Low, maximum ±2px | **Complete**, 720680a, CI passed | — |
| N2 | Consolidate radii to 4 tiers | Low, two +2px changes | Manual session, formerly 40 min | — |
| N3 | Consolidate sizes to 7 tiers | Low, maximum ±1px | Manual session, formerly 50 min | — |
| N4 | Remove dead --st-now, consolidate chart blues | **Zero** | Manual session, formerly 20 min | — |
| N5 | Contrast fixes | Medium; Juanxi acceptance needed | Manual session, formerly 40 min | — |
| N6 | Write docs/DESIGN_TOKENS.md | Zero, docs only | Manual session, formerly 30 min | N2 N3 N4 |

**N1 intentionally comes first:** it passed all gates on 2026-10-27 as T6,
blocked only at push; this known-working task verifies the queue itself.

## Final results from 2026-10-27

Seven tasks, two actually successful; all stopped at pushing rather than code.

| Original | Result | Current location |
| --- | --- | --- |
| T1 z-index | All gates passed: 611 unit + 276 e2e + Critic approval | **Landed**, 55949b8 |
| T2 radii | Work done, gates failed | Partial wip/T2-radius, rewritten N2 |
| T3 sizes | Work done, gates failed | Partial wip/T3-fontscale, rewritten N3 |
| T4 status colors | **Task itself invalid**, below | Deleted; viable part rewritten N4 |
| T5 contrast | Correctly skipped due to failed T4 dependency | Dependency removed, now N5 |
| T6 spacing | All gates passed, two fix rounds | Cherry-pick conflicts, rerun N1 |
| T7 docs | Correctly skipped, dependencies unmet | Dependencies N2/N3/N4, now N6 |

Backup: entire commit stack on backup/2026-10-28-queue, nothing lost.

## Why T4 was an invalid task rather than agent failure

T4 only added a `docs/PROGRESS.md` row, leaving styles.css untouched. Neither exhausted budget
nor stale information caused this: all 5 cited hardcoded colors and undefined --st-now were **verified true**.
Two deliverables were semantically invalid:

**"Make diagram dots follow Settings → Board colors" is impossible.**
.now comes from nodeStop() in src/lib/phases.tsx:23, returning four chart states,
`StopState = "done" | "now" | "todo" | "risk"`, computed from scheduling dates/risk.
Six user states map many-to-one: in_progress, waiting, blocked, even accepted after latestStart,
all become now. No corresponding single status color exists. Diagram value lies in timeline position;
showing owner-set status instead would erase its most useful information.

**"Unify synonymous brand/status colors" should not be done.**
They are distinct constraint systems, not duplicate definitions:

| | --late / --good / --warn | 6 status colors |
| --- | --- | --- |
| Usage | **Text** on light backgrounds (5 places), borders, backgrounds | **White text** on colored pills |
| Dark theme | **Independent values:** #f08a80 #6fcf8a #e7a74a | **None**, user data |

Measured contrast (white text on color / color as text on off-white #fbfaf7):

| Meaning | Brand token | White on it | As text | Status color | White on it | As text |
| --- | --- | --- | --- | --- | --- | --- |
| Late/blocked | #b42318 | 6.57 | 6.30 | #c0362f | 5.51 | 5.28 |
| Done | #1a7f37 | 5.08 | 4.87 | #237a42 | 5.34 | 5.11 |
| Attention/in progress | #8f5206 | 6.22 | 5.96 | #b25c00 | 4.75 | 4.55 |

Unifying breaks dark mode: --late there is #f08a80; white text yields only **2.43:1**.
Status colors have no dark variants because they are stored user values and cannot follow the theme.

**Lesson recorded in docs/NIGHT_MODE.md 7c item 5.**

## Not queued

| Item | Reason |
| --- | --- |
| Three inline status colors in Handoff.tsx:61 | Product semantics: should they follow user status colors? Juanxi decides |
| Remove disabled DeepSeek provider path | AI routing touches critical code during IRB submission; leave it |
| S6 / S9 / M3 | Protected files/dependencies/merges, **not suitable for Night Mode** |
| PR #6 M2b regression | e2e/today.spec.ts:8 fails desktop/phone; Night Mode fixed to feat/ai-night-mode cannot fix it |
