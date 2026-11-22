# Coder prompt (paste into `opencode run`, replacing `<CARD>`)

```text
You are a coding agent for the Platypus repository. Read docs/quest-build/AGENT_BRIEF.md, then the task card <CARD>. Read only the files the card lists under "Read". Do not read docs/PROGRESS.md, docs/PRODUCT_PLAN.md or any file listed under "Do not read". Follow the card's numbered steps exactly, using only the data in the card. Run the command under "Done when". Do not commit or push. Finish with the handoff described in the card (at most 10 lines).
```

Example on macOS (replace `<model-id>` with the exact ID from `opencode models`):

```bash
opencode run --auto --agent backend-coder --model <model-id> --title "P0-01" "$(sed -n '/^```text$/,/^```$/p' docs/quest-build/prompts/coder.md | sed '1d;$d' | sed 's#<CARD>#docs/quest-build/cards/P0-01-rule-library-mission-1.md#')"
```

If `--model` is not supported by the installed OpenCode, remove it and set the model for `backend-coder` in the user-level OpenCode config before the run.
