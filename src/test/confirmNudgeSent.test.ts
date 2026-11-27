import { describe, expect, it } from "vitest"
import { DEMO_TODAY, seedDemo } from "../data/seed"
import { reducer } from "../data/store"
import type { DemoState } from "../data/types"

const base = seedDemo(undefined, "v2")
const send = (s: DemoState, nodeId: string, via?: "president" | "platypus") => reducer(s, { type: "confirmNudgeSent", nodeId, channel: "email", text: "A checked demo reminder", ...(via ? { via } : {}) })

describe("confirmNudgeSent's optional via", () => {
  it("is kept only when it is one of the two values, and is absent when not given", () => {
    expect(send(base, "t-room", "platypus").nudges[0].via).toBe("platypus")
    expect(send(base, "t-room", "president").nudges[0].via).toBe("president")
    expect("via" in send(base, "t-room").nudges[0]).toBe(false)
    const odd = reducer(base, { type: "confirmNudgeSent", nodeId: "t-room", channel: "email", text: "x", via: "robot" as never })
    expect("via" in odd.nudges[0]).toBe(false)
  })
})

it("uses the demo date", () => expect(base.today).toBe(DEMO_TODAY))
