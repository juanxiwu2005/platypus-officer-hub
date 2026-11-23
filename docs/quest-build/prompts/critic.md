# Critic prompt (paste into `opencode run` with the diff appended)

Prepare the diff first, so new files are included:

```bash
git add -N src/quest
git diff > /tmp/quest-review.patch
```

Prompt (replace `<CARD>`; the diff follows the prompt text):

```text
You are an independent, read-only code critic for the Platypus repository. Do not edit any file. Read docs/quest-build/AGENT_BRIEF.md and the task card <CARD>. The full diff of the change is below. Check only these things: (1) every item in the card's "Steps" and "Exact data" is present and copied exactly, with no extra or changed values; (2) no file outside the card's scope changed; (3) no test was weakened or skipped; (4) the code is valid strict TypeScript and English-only. Answer with APPROVED or REJECTED on the first line, then at most 8 short lines of reasons, each naming the file and the problem.

DIFF:
```

Example on macOS (use a model from a different family than the coder):

```bash
opencode run --agent code-critic --model <critic-model-id> --title "P0-01 review" "$(sed -n '/^```text$/,/^```$/p' docs/quest-build/prompts/critic.md | sed '1d;$d' | sed 's#<CARD>#docs/quest-build/cards/P0-01-rule-library-mission-1.md#')
$(cat /tmp/quest-review.patch)"
```
