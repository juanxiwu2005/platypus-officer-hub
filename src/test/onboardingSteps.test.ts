import { describe, expect, it } from "vitest"
import { back, begin, forward, skip } from "../onboarding/engine/steps"

describe("onboarding steps", () => {
  it("reports forward, back, skip and completion without importing recording", () => {
    const events: string[] = []; const log = (step: string, event: string) => events.push(`${step}:${event}`)
    let state = begin(["name", "team"], log)
    state = skip(state, ["name", "team"], log)
    state = back(state, ["name", "team"], log)
    state = forward(state, ["name", "team"], log)
    state = forward(state, ["name", "team"], log)
    expect(state.complete).toBe(true)
    expect(events).toContain("name:skip")
    expect(events).toContain("team:complete")
  })
})
