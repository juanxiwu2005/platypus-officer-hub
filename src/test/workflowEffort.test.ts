import { describe, expect, it } from "vitest"
import { effortEditPatch, parseEffortDays } from "../lib/workflowEffort"

describe("explicit workflow effort input", () => {
  it.each([0, "0", 1, "10", 30, "30", " 10 "])("accepts the complete integer %j", raw => {
    expect(parseEffortDays(raw)).toBe(Number(raw))
    expect(effortEditPatch(raw)).toEqual({ estDays: Number(raw), startPolicy: "effort" })
  })

  it.each(["", " ", "-", "-1", -1, 31, "100", 1.5, "1.5", "1e1", "Infinity", Infinity, NaN, null, undefined, false, {}])("does not turn invalid draft %j into another estimate", raw => {
    expect(parseEffortDays(raw)).toBeNull()
    expect(effortEditPatch(raw)).toBeNull()
  })
})
