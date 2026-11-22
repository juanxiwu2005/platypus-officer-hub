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
})
