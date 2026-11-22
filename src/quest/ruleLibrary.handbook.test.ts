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
