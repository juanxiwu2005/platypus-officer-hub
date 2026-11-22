# Trial log

One row per run. "Steps/tokens" only if OpenCode shows them. "Rework" = repair runs needed. Keep notes factual (what happened, not guesses).

| Date | Card | Role | Model | Minutes | Steps/tokens | Checks (vitest / tsc / lint) | Critic verdict (model) | Rework | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| | P0-01 | coder | | | | | | | |
| | P0-01 | coder | | | | | | | bake-off copy |
| | P0-01 | coder | | | | | | | bake-off copy |
| | P0-02 | coder | | | | | | | |

## Planner verification (done before the trial, 2026-11-22)

- Cards P0-01 and P0-02 were applied exactly as written (10 rules), then removed: `npx vitest run src/quest` 4/4 passed; `npx tsc --noEmit -p tsconfig.json` passed; `npx eslint src/quest` passed.
- All quotes in P0-01 and P0-02 were checked against `03_Full_Rules_Archive.txt` at the cited line (whitespace-normalized). Line 2143 contains a non-breaking space, so rule 2.3 quotes the two clauses around it.

## Decisions after the trial

- Coder model for P1+:
- Critic model for P1+:
- Card template changes:
