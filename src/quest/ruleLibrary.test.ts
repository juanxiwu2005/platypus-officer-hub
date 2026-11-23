import { describe, expect, it } from "vitest"
import { QUEST_RULES } from "./ruleLibrary"

const words = (value: string) => value.trim().split(/\s+/).filter(Boolean).length

describe("quest rule library", () => {
  it("has unique ids that match their mission", () => {
    const ids = QUEST_RULES.map(rule => rule.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const rule of QUEST_RULES) {
      expect(rule.id).toMatch(/^[1-7]\.\d{1,2}$/)
      expect(Number(rule.id.split(".")[0])).toBe(rule.mission)
    }
  })

  it("keeps summaries and hints short", () => {
    for (const rule of QUEST_RULES) {
      expect(words(rule.summary)).toBeLessThanOrEqual(15)
      expect(words(rule.hint)).toBeLessThanOrEqual(12)
    }
  })

  it("cites at least one archive source per rule", () => {
    for (const rule of QUEST_RULES) {
      expect(rule.sources.length).toBeGreaterThan(0)
      for (const source of rule.sources) {
        expect(source.record).toMatch(/^ASU-R-0\d{2}$/)
        expect(source.line).toBeGreaterThan(0)
        expect(words(source.quote)).toBeGreaterThan(0)
        expect(words(source.quote)).toBeLessThanOrEqual(40)
        if (source.record !== "ASU-R-004") expect(source.section).toBeNull()
      }
    }
  })

  it("names at least one lead role per rule", () => {
    for (const rule of QUEST_RULES) expect(rule.leads.length).toBeGreaterThan(0)
  })

  it("contains all 33 approved rules and the 13 required red lines", () => {
    const missionCounts = [4, 6, 7, 6, 4, 3, 3] as const
    const expectedIds = missionCounts.flatMap((count, mission) =>
      Array.from({ length: count }, (_, index) => `${mission + 1}.${index + 1}`),
    )
    expect(QUEST_RULES.map(rule => rule.id)).toEqual(expectedIds)
    expect(QUEST_RULES.filter(rule => rule.redLine).map(rule => rule.id)).toEqual([
      "1.1", "2.1", "2.2", "2.5", "3.2", "3.3", "3.4",
      "3.5", "4.2", "4.4", "4.5", "6.2", "7.1",
    ])
  })
})
