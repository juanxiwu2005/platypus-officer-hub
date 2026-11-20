> **Language policy update, November 19, 2026:** write documents, reports, comments, commits, and GitHub notes in English. This supersedes any earlier language instruction quoted in this historical file. Current `AGENTS.md` controls.

# Goal

Use 1–3 to describe the only user result to be completed this time.

# Files

- Allows a modified page, component, source file or test directory.
- If the name of the document is not known, clearly define the functional area to be covered.
- If you can’t use a big document, you must clearly state “do not read” (e.g. do not change the style of the task and write “don’t read src/styles.css).

# Depends on

(optional, meaningful only when running in `scripts/night-queue.sh`)

```
# Depends on: 01-Previous mission .md
```

When a dependent task fails or is skiped, the task will also be skip. Delete the section without reliance.

# Constraints

- Only field presentation data are used.
- Do not modify dependencies, deployments, GitHub Actions, secret key, research data or Night Mode security files.
- Do not modify or mege `main`.
- Keep existing product rules, missions, date engines and manual locks.
- Do not paste any API key, participant information or live memory data here.
- **does not reread the document to "check the baseline".** files and job descriptions that are inconsistent are normal -- that's what you just changed.
- Undetermined retention and writing in handoff records; Don't guess to do the job.

# Done means

- The user can see or complete anything on the interface.
- Which border situations must work.
- What unit sets and Playwright tests should be added or updated.
- `npm run check` must pass.

# Out of scope

- A clear list of the adjacent functions that were not done this time to prevent Agent from expanding the scope.

---

## Read before writing a task 2026-10-27Five times a night.

**read `docs/NIGHT_MODE.md` 7b (run environmental budget card) and 7c (how to write the task).**
Four out of five failures, the root cause is that what the mission requires is beyond what Agent actually can do.

Before writing, I checked against these four articles:

1. The **investigation was handed over to the person and the task was only to draw conclusions.**
   "Find which CSS is empty and then delete it" -- all the budgets will be spent.
   "Delete the list of 51 class"+.

2. **does not describe the current status of the file.**
   "Styles.css on a total 718 line" -- changed to 626 line, and Agent would think it was wrong and then stop.
   Just write what results are to be achieved.

3. **confirm it can run up.**
   Every order the mission requires is placed on a white list of 7b. `node script`, `curl` and combined orders (with `&&`) were rejected.
   Task **that requires reliance or modification of `.github/**` cannot go Night Mode **.

4. **estimate the number of steps.**
   Budgeted 300 steps, which are fixed to cost approximately 6 steps before work starts.
   "Reading a file + Change a file" counts as 2 moves, with 11 files being 22 steps up.
   More than 100 steps should be removed.
