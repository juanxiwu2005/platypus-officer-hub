> **Historical instruction note:** repository content and GitHub collaboration must now be in English. Former Chinese-language directions below are historical and superseded by current `AGENTS.md`. A dated approval applies only to its stated work.

# Goal

Describe the single user outcome to achieve in 1–3 sentences.

# Files

- Pages, components, source files, or test directories that may be modified.
- If filenames are unknown, specify the permitted functional area.
- Explicitly mark unnecessary large files "do not read" (for example, "do not read src/styles.css" when no styling changes are needed).

# Depends on

(Optional; meaningful only when running a queue with `scripts/night-queue.sh`.)

```
# Depends on: 01-previous-task.md
```

If the prerequisite fails or is skipped, this task is also skipped. Remove this section if there is no dependency.

# Constraints

- Use fictional demo data only.
- Do not modify dependencies, deployment, GitHub Actions, secrets, research data, or Night Mode safety files.
- Do not modify or merge `main`.
- Preserve existing product rules, permissions, date engine, and human-confirmation gates.
- Do not paste API keys, participant information, or real member data here.
- **After editing, do not reread files to "verify the baseline."** Differences from the task description are normal: you just changed the files.
- Preserve anything uncertain and record it in the handoff; do not guess to finish the task.

# Done means

- What users can see or do in the interface.
- Which edge cases must work.
- Which unit and Playwright tests should be added or updated.
- `npm run check` must pass.

# Out of scope

- Explicitly list adjacent features excluded from this task to prevent unauthorized scope expansion.

---

## Read before writing tasks (lessons from five failures on the evening of 2026-10-27)

**First read sections 7b (runtime environment budget card) and 7c (task authoring) in `docs/NIGHT_MODE.md`.**
Four of five failures were caused by tasks demanding more than the agent could actually do.

Check these four points before writing:

1. **Humans investigate; tasks provide conclusions.**
   ❌ "Find unused CSS, then delete it" — investigation consumes the budget.
   ✅ "Delete these 51 classes" + a list.

2. **Do not describe files' current state.**
   ❌ "styles.css has 718 lines" — after editing it has 626, so the agent thinks something went wrong and stops.
   ✅ State only the desired outcome.

3. **Confirm the task can run.**
   Every required command must be on the 7b allowlist. `node script`, `curl`, and compound commands (with `&&`) are rejected.
   Tasks requiring dependency installation or `.github/**` changes **cannot use Night Mode**.

4. **Estimate steps.**
   The budget is 300 steps, with about 6 spent reading documentation before work starts.
   "Read one file + edit one file" costs 2 steps; across 11 files that is at least 22.
   Split tasks that exceed 100 steps.
