# P1-01 Guard handbook citation section labels

Phase: P1 end-to-end pipeline verification. This card adds useful citation regression coverage without changing the approved 33 rules or existing tests.

## Read only

- `docs/quest-build/AGENT_BRIEF.md`
- This card
- `src/quest/ruleLibrary.ts`
- `src/quest/ruleLibrary.handbook.test.ts` (only after creating it)

## Write only

- `src/quest/ruleLibrary.handbook.test.ts`

Do not change any existing source/test, scripts, configuration, documentation, dependency or Git file. The planner has verified the data baseline. No investigation, directory listing, Git, archive access or delegation is needed. Do not read generic project documents. No dependencies or additional tests are needed.

## Exact new file

```ts
import { describe, expect, it } from "vitest"
import { QUEST_RULES } from "./ruleLibrary"

describe("quest handbook citations", () => {
  it("provides a nonempty section label for each handbook citation", () => {
    const handbookSources = QUEST_RULES.flatMap(rule => rule.sources)
      .filter(source => source.record === "ASU-R-004")
    expect(handbookSources.length).toBeGreaterThan(0)
    for (const source of handbookSources) {
      expect(source.section?.trim().length ?? 0).toBeGreaterThan(0)
    }
  })
})
```

This guards the `QuestRuleSource.section` contract for handbook citations. Existing coverage only requires null for non-handbook records; this test catches missing/blank handbook labels and avoids vacuous success with an empty collection.

## Checks and handoff

1. Create exactly the file above.
2. Run `npx vitest run src/quest`.
3. Run `npx tsc --noEmit -p tsconfig.json`.
4. Return at most ten English lines stating files changed, results and uncertainty; finish.

The controller independently runs pipeline regression tests, quest tests, frontend TypeScript and full lint, obtains read-only DeepSeek review of the complete diff, commits/pushes only the feature branch and waits for all eight CI jobs on the exact published SHA. The focused local checks are approved for this test-only card; the full existing GitHub CI remains mandatory. No test is skipped or weakened. The controller saves its ready note locally. Only Juanxi can approve adoption or merging.
