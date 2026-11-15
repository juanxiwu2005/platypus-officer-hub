import { afterEach, describe, expect, it, vi } from "vitest"
import { seedDemo } from "../data/seed"
import { respond, reviewEvent, STOPPED_FORM_SOURCE, STOPPED_SOURCE } from "../lib/assistant"

/** FB-1 3.3: Stop ends the AI request at once and the answer comes from this browser. The AI is never called for real. */
const state = seedDemo("2026-10-22")
/** A server that never answers until the request is aborted. */
function hanging() {
  const send = vi.fn((_u: string, init: RequestInit) => new Promise<Response>((_, reject) => init.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })))))
  vi.stubGlobal("fetch", send)
  return send
}
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

describe("FB-1 · Stop in the assistant", () => {
  it("a chat question: Stop gives the local answer, labelled as stopped", async () => {
    const send = hanging()
    const stop = new AbortController()
    const pending = respond("Tell me something fun about the club", state, "alex", null, "/", [], stop.signal)
    await vi.waitFor(() => expect(send).toHaveBeenCalledOnce())
    stop.abort()
    const r = await pending
    expect(r.source).toBe(STOPPED_SOURCE)
    expect(r.source).toBe("Platypus · stopped, quick answer from this browser")
    expect(r.cards[0]).toMatchObject({ kind: "text" })
  })

  it("a planning message the AI would read: Stop keeps the form filled from the words", async () => {
    hanging()
    const stop = new AbortController()
    const pending = respond("Plan a monthly social for new members", state, "alex", null, "/", [], stop.signal)
    stop.abort()
    const r = await pending
    expect(r.source).toBe(STOPPED_FORM_SOURCE)
    expect(r.cards.find(c => c.kind === "form")).toMatchObject({ prefill: { name: "Monthly social" } })
  })

  it("the form's second look: Stop settles it to nothing and says why", async () => {
    const send = hanging()
    const stop = new AbortController()
    const r = await respond("Plan an event about March 3 for networking night with 50 people", state, "alex", null, "/", [], stop.signal)
    expect(r.cards.find(c => c.kind === "form")).toBeTruthy()
    expect(send).toHaveBeenCalledOnce()
    stop.abort()
    expect(await r.refine).toBeNull()
    expect(r.refineMiss?.why).toBe("stopped")
  })

  it("a rule question: Stop falls back to the keyword match", async () => {
    hanging()
    const stop = new AbortController()
    const pending = respond("Can we run a raffle?", state, "alex", null, "/rules", [], stop.signal)
    stop.abort()
    const r = await pending
    expect(r.source).toBe("Matched by keywords · AI stopped")
  })

  it("the plan check: Stop shows the rule engine's own check", async () => {
    hanging()
    const stop = new AbortController()
    const pending = reviewEvent(state, "e-night", stop.signal)
    stop.abort()
    const r = await pending
    expect(r.source).toBe("Rule engine check · AI stopped")
    expect(r.cards[0]).toMatchObject({ kind: "review", label: "Rule engine check · AI stopped" })
  })

  it("an answer that arrives after Stop is never used", async () => {
    let resolveLate: (r: Response) => void = () => {}
    const send = vi.fn(() => new Promise<Response>(resolve => { resolveLate = resolve }))
    vi.stubGlobal("fetch", send)
    const stop = new AbortController()
    const pending = respond("Tell me something fun about the club", state, "alex", null, "/", [], stop.signal)
    await vi.waitFor(() => expect(send).toHaveBeenCalledOnce())
    stop.abort()
    resolveLate(new Response(JSON.stringify({ cards: [{ kind: "text", text: "LATE AI ANSWER" }], source: "ai" })))
    const r = await pending
    expect(r.source).toBe(STOPPED_SOURCE)
    expect(JSON.stringify(r.cards)).not.toContain("LATE AI ANSWER")
  })
})
