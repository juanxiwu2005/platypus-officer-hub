import { beforeEach, describe, expect, it, vi } from "vitest"
import { finishAttempt, hasSeenWelcome, loadOnboardingRecord, markWelcomeSeen, rearm, recordStep, startAttempt } from "../lib/onboardingRecord"

describe("onboarding record", () => {
  beforeEach(() => { localStorage.clear(); rearm(); vi.spyOn(Date, "now").mockReturnValue(1000) })
  it("records behavior, never supplied form text", () => {
    const id = startAttempt("start", "ob-1")
    recordStep(id, "constitution", "enter")
    recordStep(id, "constitution", "skip")
    finishAttempt(id, "completed")
    const text = JSON.stringify(loadOnboardingRecord())
    expect(text).toContain("constitution")
    expect(text).not.toContain("secret constitution text")
  })
  it("rearms without deleting evidence", () => {
    const id = startAttempt("explore", "ob-1")
    markWelcomeSeen(); expect(hasSeenWelcome()).toBe(true)
    rearm(); expect(hasSeenWelcome()).toBe(false)
    expect(loadOnboardingRecord().attempts[0].id).toBe(id)
  })
  it("keeps only bounded attempts and step events", () => {
    for (let i = 0; i < 42; i++) startAttempt("start", "ob-1")
    const id = loadOnboardingRecord().attempts.at(-1)!.id
    for (let i = 0; i < 202; i++) recordStep(id, `s${i}`, "enter")
    const record = loadOnboardingRecord()
    expect(record.attempts).toHaveLength(40)
    expect(record.attempts.at(-1)!.steps).toHaveLength(200)
  })
  it("falls back safely when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked") })
    expect(() => startAttempt("start", "ob-1")).not.toThrow()
    expect(hasSeenWelcome()).toBe(false)
  })
})
