import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AIR_MIN_OUTPUT_TOKENS, airMinOutputTokens, chatJSON } from "../../netlify/lib/ai.mts"
import { resetRateLimit } from "../../netlify/lib/http.mts"

/**
 * FB-1 3.1 (docs/feedback-fix/PLAN.md). Production 2026-11-12: /api/nudge/draft asked ASU AIR for 120 tokens and came back
 * cut off ("output limit") in about 4 s, twice, so the reminder's AI line failed every time. Every provider here is a fake.
 */
function configure() {
  vi.stubEnv("AI_PRESET", "asu_air")
  vi.stubEnv("AI_API_KEY", "fictional-test-key")
  vi.stubEnv("AI_MODEL", "")
  vi.stubEnv("AI_BASE_URL", "")
  vi.stubEnv("AI_PROVIDER", "")
  vi.stubEnv("AI_JSON_MODE", "")
  vi.stubEnv("AI_MODEL_ROUTING", "")
  vi.stubEnv("AI_MIN_OUTPUT_TOKENS", "")
}
const completion = (content: string, finish = "stop", usage: Record<string, unknown> = { prompt_tokens: 10, completion_tokens: 40 }) =>
  new Response(JSON.stringify({ model: "muse-glimmer-30b", choices: [{ finish_reason: finish, message: { content } }], usage }))
const bodies = (send: { mock: { calls: unknown[][] } }) => send.mock.calls.map(c => JSON.parse(String((c[1] as RequestInit).body)))
const usageLines = (log: { mock: { calls: unknown[][] } }) => log.mock.calls.map(c => String(c[0])).filter(t => t.includes('"ai_usage"'))

let log: ReturnType<typeof vi.spyOn>
beforeEach(() => { resetRateLimit(); log = vi.spyOn(console, "log").mockImplementation(() => {}) })
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe("FB-1 · output allowance", () => {
  it("a caller asking for 120 tokens is sent at least 1024 on ASU AIR", async () => {
    configure()
    const send = vi.fn(async () => completion('{"whyItMatters":"We help founders meet."}'))
    vi.stubGlobal("fetch", send)
    const r = await chatJSON({ system: "JSON", user: "Fictional", task: "nudge_draft", maxTokens: 120, timeoutMs: 26_000 })
    expect(AIR_MIN_OUTPUT_TOKENS).toBe(1024)
    expect(bodies(send)[0].max_tokens).toBeGreaterThanOrEqual(1024)
    expect(r.maxTokens).toBe(1024)
    expect(send).toHaveBeenCalledOnce()
  })

  it("AI_MIN_OUTPUT_TOKENS overrides the minimum, kept within 256–4096", () => {
    vi.stubEnv("AI_MIN_OUTPUT_TOKENS", "2000"); expect(airMinOutputTokens()).toBe(2000)
    vi.stubEnv("AI_MIN_OUTPUT_TOKENS", "50"); expect(airMinOutputTokens()).toBe(256)
    vi.stubEnv("AI_MIN_OUTPUT_TOKENS", "99999"); expect(airMinOutputTokens()).toBe(4096)
    vi.stubEnv("AI_MIN_OUTPUT_TOKENS", "lots"); expect(airMinOutputTokens()).toBe(1024)
    vi.stubEnv("AI_MIN_OUTPUT_TOKENS", ""); expect(airMinOutputTokens()).toBe(1024)
  })

  it("another preset keeps the caller's allowance", async () => {
    configure(); vi.stubEnv("AI_PRESET", "openai"); vi.stubEnv("AI_MODEL", "fictional-model")
    const send = vi.fn(async () => completion('{"a":1}'))
    vi.stubGlobal("fetch", send)
    await chatJSON({ system: "JSON", user: "Fictional", task: "ask", maxTokens: 120 })
    expect(bodies(send)[0].max_tokens).toBe(120)
  })

  it("cut off once, then complete: the second request has twice the allowance and the call succeeds", async () => {
    configure()
    const send = vi.fn()
      .mockResolvedValueOnce(completion('{"whyItMatters":"We he', "length", { prompt_tokens: 10, completion_tokens: 1024, completion_tokens_details: { reasoning_tokens: 1000 } }))
      .mockResolvedValueOnce(completion('{"whyItMatters":"We help founders meet."}', "stop", { prompt_tokens: 10, completion_tokens: 900, completion_tokens_details: { reasoning_tokens: 880 } }))
    vi.stubGlobal("fetch", send)
    const r = await chatJSON({ system: "JSON", user: "Fictional", task: "nudge_draft", maxTokens: 120, timeoutMs: 26_000 })
    expect(send).toHaveBeenCalledTimes(2)
    const [first, second] = bodies(send)
    expect(first.max_tokens).toBe(1024)
    expect(second.max_tokens).toBe(2048)
    expect(second.messages).toEqual(first.messages)
    expect(r.data).toEqual({ whyItMatters: "We help founders meet." })
    expect(r).toMatchObject({ maxTokens: 2048, retry: "output_limit", reasoningTokens: 880 })
  })

  it("cut off twice: the call ends with the output-limit error after exactly two requests", async () => {
    configure()
    const send = vi.fn(async () => completion('{"whyItMatters":"We he', "length"))
    vi.stubGlobal("fetch", send)
    const error = await chatJSON({ system: "JSON", user: "Fictional", task: "nudge_draft", maxTokens: 120, timeoutMs: 26_000 }).catch(e => e)
    expect(send).toHaveBeenCalledTimes(2)
    expect(error).toMatchObject({ code: "bad_json" })
    expect(String(error.message)).toContain("output limit")
    expect(error.diagnostics).toMatchObject({ failureKind: "output_limit", maxTokens: 2048, retry: "output_limit", attemptCount: 2 })
  })

  it("the doubled allowance never goes past 4096", async () => {
    configure(); vi.stubEnv("AI_MIN_OUTPUT_TOKENS", "3000")
    const send = vi.fn(async () => completion('{"a":"b', "length"))
    vi.stubGlobal("fetch", send)
    await chatJSON({ system: "JSON", user: "Fictional", task: "chat", timeoutMs: 26_000 }).catch(() => {})
    expect(bodies(send).map(b => b.max_tokens)).toEqual([3000, 4096])
  })

  it("no retry when less than 5 s of the budget is left", async () => {
    configure()
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] })
    // The first reply arrives after 22 s of a 26 s budget: 4 s left, not enough for a second try.
    const send = vi.fn(() => new Promise<Response>(resolve => setTimeout(() => resolve(completion('{"a":"b', "length")), 22_000)))
    vi.stubGlobal("fetch", send)
    const pending = chatJSON({ system: "JSON", user: "Fictional", task: "chat", timeoutMs: 26_000 }).catch(e => e)
    await vi.advanceTimersByTimeAsync(22_000)
    const error = await pending
    expect(send).toHaveBeenCalledOnce()
    expect(error).toMatchObject({ code: "bad_json" })
    expect(error.diagnostics.retry).toBeUndefined()
  })

  it("a cut-off reply the caller can salvage is kept, not asked for again", async () => {
    configure()
    const send = vi.fn(async () => completion('{"ids":["s1","s2', "length"))
    vi.stubGlobal("fetch", send)
    const r = await chatJSON({ system: "JSON", user: "Fictional", task: "handbook_draft", timeoutMs: 26_000, salvageTruncated: () => ({ ids: ["s1"] }) })
    expect(send).toHaveBeenCalledOnce()
    expect(r).toMatchObject({ data: { ids: ["s1"] }, truncated: true })
  })

  it("a format fallback uses the second request: a cut-off reply after it is not retried again", async () => {
    configure()
    const send = vi.fn()
      .mockResolvedValueOnce(new Response("response_format not supported", { status: 400 }))
      .mockResolvedValue(completion('{"a":"b', "length"))
    vi.stubGlobal("fetch", send)
    const error = await chatJSON({ system: "JSON", user: "Fictional", task: "chat", timeoutMs: 26_000 }).catch(e => e)
    expect(send).toHaveBeenCalledTimes(2)
    expect(error.diagnostics).toMatchObject({ failureKind: "output_limit" })
  })

  it("the usage line has maxTokens, reasoningTokens and retry, and never the prompt or the reply", async () => {
    configure()
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(completion('{"whyItMatters":"SECRET REPLY cut', "length", { prompt_tokens: 10, completion_tokens: 1024, completion_tokens_details: { reasoning_tokens: 1010 } }))
      .mockResolvedValueOnce(completion('{"whyItMatters":"SECRET REPLY whole"}', "stop", { prompt_tokens: 10, completion_tokens: 700, completion_tokens_details: { reasoning_tokens: 690 } })))
    await chatJSON({ system: "SYSTEM PROMPT TEXT", user: "PRIVATE USER about Maya", task: "nudge_draft", maxTokens: 120, timeoutMs: 26_000 })
    const out = usageLines(log)
    expect(out).toHaveLength(1)
    expect(JSON.parse(out[0])).toMatchObject({ evt: "ai_usage", task: "nudge_draft", ok: true, maxTokens: 2048, reasoningTokens: 690, retry: "output_limit", finishReason: "stop" })
    for (const secret of ["SYSTEM PROMPT", "PRIVATE USER", "Maya", "SECRET REPLY", "fictional-test-key"]) expect(out[0]).not.toContain(secret)
  })

  it("without a retry or a reasoning count those two fields are left out", async () => {
    configure()
    vi.stubGlobal("fetch", vi.fn(async () => completion('{"a":1}')))
    await chatJSON({ system: "s", user: "u", task: "chat", timeoutMs: 26_000 })
    const row = JSON.parse(usageLines(log)[0])
    expect(row.maxTokens).toBe(1024)
    expect(row).not.toHaveProperty("retry")
    expect(row).not.toHaveProperty("reasoningTokens")
  })
})
