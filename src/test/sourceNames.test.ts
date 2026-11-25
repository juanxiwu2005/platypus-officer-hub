import { describe, expect, it } from "vitest"
import { POLICY_CATALOG } from "../data/policyCatalog"
import { RULES, ruleSourceName, ruleSourceNames } from "../data/rules"
import { distinctSources, sourceName, sourceNames, UNKNOWN_SOURCE_NAME, withSourceNames } from "../lib/sourceNames"

describe("policy source names instead of record IDs (2026-11-25)", () => {
  it("names a catalog record by its official name and a rule by its first source", () => {
    expect(sourceName("ASU-R-004")).toBe("Student Club and Organization Handbook 2026-2027")
    expect(sourceName("ASU-R-038")).toBe(POLICY_CATALOG.find(r => r.recordId === "ASU-R-038")!.officialName)
    expect(sourceName("R06")).toBe("Student Organization Handbook 2025–26")
    expect(sourceName("R01")).toBe("Event Registry guidelines")
    expect(sourceName(" r09 ")).toBe("USG Spending Guidelines")
    for (const record of POLICY_CATALOG) expect(sourceName(record.recordId)).toBe(record.officialName)
    for (const rule of RULES) expect(sourceName(rule.id)).toBe(rule.sources[0].label)
  })

  it("falls back to a neutral name for unknown IDs and never echoes the ID", () => {
    for (const id of ["ASU-R-999", "R99", "SPECIAL-03", "", "anything"]) {
      expect(sourceName(id)).toBe(UNKNOWN_SOURCE_NAME)
      expect(ruleSourceName(id)).toBe(UNKNOWN_SOURCE_NAME)
    }
    expect(UNKNOWN_SOURCE_NAME).toBe("School policy source")
  })

  it("shows a source once when several IDs share it, keeping the first ID as the hook", () => {
    // R06, R08 and R13 all come from the 2025–26 handbook.
    expect(sourceNames(["R06", "R08", "R01", "R13"])).toEqual(["Student Organization Handbook 2025–26", "Event Registry guidelines"])
    expect(distinctSources(["R08", "R06", "ASU-R-004"])).toEqual([
      { id: "R08", name: "Student Organization Handbook 2025–26" },
      { id: "ASU-R-004", name: "Student Club and Organization Handbook 2026-2027" },
    ])
    expect(sourceNames(["R99", "SPECIAL-06"])).toEqual([UNKNOWN_SOURCE_NAME])
    expect(ruleSourceNames(["R11", "R12", "R11"])).toEqual(["USG Spending Guidelines", "USG Funding Rules"])
    expect(sourceNames([])).toEqual([])
  })

  it("rewrites IDs in text the app wrote, one name per run, and leaves other words alone", () => {
    expect(withSourceNames("Homemade food may not be served. [R08]")).toBe("Homemade food may not be served. [Student Organization Handbook 2025–26]")
    expect(withSourceNames("Deadline: Book a room. Club deadline 2026-11-03 (R03, R16).")).toBe("Deadline: Book a room. Club deadline 2026-11-03 (Submit a Space Request; Student Organization Handbook 2025–26).")
    expect(withSourceNames("14 calendar days before the event (ASU R01). ")).toBe("14 calendar days before the event (Event Registry guidelines). ")
    expect(withSourceNames("Pre-submission check · R11 / R12")).toBe("Pre-submission check · USG Spending Guidelines; USG Funding Rules")
    expect(withSourceNames("See ASU-R-004 and R13")).toBe("See Student Club and Organization Handbook 2026-2027; Student Organization Handbook 2025–26")
    // Not record IDs: an unknown rule number, words that merely contain one, and plain text.
    for (const text of ["Room R99 is free.", "R2D2 and FR06", "No IDs here."]) expect(withSourceNames(text)).toBe(text)
  })
})
