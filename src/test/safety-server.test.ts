import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import chatFn from "../../netlify/functions/chat.mts"
import { chatJSON } from "../../netlify/lib/ai.mts"
import { RATE_LIMITS, clientIp, rateLimit, resetRateLimit, TooManyRequests } from "../../netlify/lib/http.mts"
import { seedDemo } from "../data/seed"
import { commandContext } from "../lib/commands"

const state = seedDemo()
const post = (body: unknown, ip?: string) => new Request("https://example.org/api/chat", { method: "POST", headers: { "content-type": "application/json", ...(ip ? { "x-nf-client-connection-ip": ip } : {}) }, body: typeof body === "string" ? body : JSON.stringify(body) })

beforeEach(() => resetRateLimit())
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); for (const k of ["AI_API_KEY", "AI_MODEL", "AI_PRESET"]) delete process.env[k] })

describe("A8(a) · request size", () => {
  const ask = { message: "Assign Send the October newsletter to Priya", context: commandContext(state) }
  it("/api/chat answers a normal request", async () => {
    expect((await chatFn(post(ask))).status).toBe(200)
  })
  it("/api/chat refuses anything over 40,000 characters", async () => {
    const r = await chatFn(post({ ...ask, padding: "x".repeat(40_000) }))
    expect(r.status).toBe(400)
    expect((await r.json()).message).toBe("Request is too large.")
  })
})

describe("A8(d) · per-visitor rate limit", () => {
  const req = (ip?: string) => post({ message: "hi" }, ip)
  it("allows a normal pace and stops a runaway loop with 429 and Retry-After", async () => {
    for (let i = 0; i < RATE_LIMITS.perMinute; i++) expect(() => rateLimit(req("203.0.113.5"), 1_000 + i)).not.toThrow()
    let err: unknown
    try { rateLimit(req("203.0.113.5"), 2_000) } catch (e) { err = e }
    expect(err).toBeInstanceOf(TooManyRequests)
    expect((err as TooManyRequests).retryAfter).toBeGreaterThan(0)
  })
  it("counts each address separately, and lets the same address back in after a minute", () => {
    for (let i = 0; i < RATE_LIMITS.perMinute; i++) rateLimit(req("203.0.113.5"), 1_000)
    expect(() => rateLimit(req("203.0.113.5"), 1_001)).toThrow(TooManyRequests)
    expect(() => rateLimit(req("198.51.100.9"), 1_001)).not.toThrow()
    expect(() => rateLimit(req("203.0.113.5"), 62_000)).not.toThrow()
  })
  it("has an hourly cap too", () => {
    for (let i = 0; i < RATE_LIMITS.perHour; i++) rateLimit(req("203.0.113.7"), i * 5_000)
    expect(() => rateLimit(req("203.0.113.7"), RATE_LIMITS.perHour * 5_000)).toThrow(TooManyRequests)
  })
  it("a request with no address shares one bucket instead of skipping the limit", () => {
    expect(clientIp(req())).toBe("unknown")
    for (let i = 0; i < RATE_LIMITS.perMinute; i++) rateLimit(req(), 1_000)
    expect(() => rateLimit(req(), 1_001)).toThrow(TooManyRequests)
  })
  it("the endpoint itself answers 429 once the limit is passed", async () => {
    for (let i = 0; i < RATE_LIMITS.perMinute; i++) await chatFn(post({ message: "" }, "203.0.113.20"))
    const r = await chatFn(post({ message: "" }, "203.0.113.20"))
    expect(r.status).toBe(429)
    expect(r.headers.get("retry-after")).toMatch(/^\d+$/)
    expect((await r.json()).error).toBe("rate_limited")
  })
})

describe("A8(e) · AI usage log", () => {
  const KEY = "sk-SECRET-KEY-do-not-log"
  const configure = () => { process.env.AI_PRESET = "deepseek"; process.env.AI_API_KEY = KEY; process.env.AI_MODEL = "deepseek-chat" }
  const lines = (spy: ReturnType<typeof vi.spyOn>) => spy.mock.calls.map(c => String(c[0])).filter(t => t.includes("ai_usage"))

  it("writes one line per call with provider, model, tokens, time and endpoint, and nothing private", async () => {
    configure()
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ model: "deepseek-chat", choices: [{ message: { content: '{"ok":true}' } }], usage: { prompt_tokens: 111, completion_tokens: 22 } }), { status: 200 })))
    const log = vi.spyOn(console, "log").mockImplementation(() => {})
    await chatJSON({ system: "SYSTEM PROMPT TEXT", user: "PRIVATE USER MESSAGE about Maya", endpoint: "chat" })
    const out = lines(log)
    expect(out).toHaveLength(1)
    const row = JSON.parse(out[0])
    expect(row).toMatchObject({ evt: "ai_usage", endpoint: "chat", provider: "DeepSeek", model: "deepseek-chat", inputTokens: 111, outputTokens: 22, ok: true })
    expect(typeof row.ms).toBe("number")
    for (const secret of [KEY, "Bearer", "SYSTEM PROMPT", "PRIVATE USER", "Maya", '{"ok"']) expect(out[0]).not.toContain(secret)
  })

  it("reads Anthropic-style token counts too", async () => {
    configure(); process.env.AI_PRESET = "anthropic"; process.env.AI_MODEL = "m"
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ model: "m", content: [{ type: "text", text: '{"a":1}' }], usage: { input_tokens: 5, output_tokens: 6 } }), { status: 200 })))
    const log = vi.spyOn(console, "log").mockImplementation(() => {})
    await chatJSON({ system: "s", user: "u", endpoint: "ask" })
    expect(JSON.parse(lines(log)[0])).toMatchObject({ endpoint: "ask", provider: "Anthropic", inputTokens: 5, outputTokens: 6, ok: true })
  })

  it("logs failures too (no tokens), still without private text", async () => {
    configure()
    vi.stubGlobal("fetch", vi.fn(async () => new Response("provider says: PRIVATE USER MESSAGE and " + KEY, { status: 500 })))
    const log = vi.spyOn(console, "log").mockImplementation(() => {})
    await expect(chatJSON({ system: "s", user: "PRIVATE USER MESSAGE", endpoint: "command" })).rejects.toThrow()
    const out = lines(log)
    expect(out).toHaveLength(1)
    expect(JSON.parse(out[0])).toMatchObject({ endpoint: "command", ok: false, error: "upstream", inputTokens: null, outputTokens: null })
    expect(out[0]).not.toContain(KEY)
    expect(out[0]).not.toContain("PRIVATE")
  })

  it("cannot be used to smuggle text into the log through the endpoint name", async () => {
    configure()
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: "{}" } }] }), { status: 200 })))
    const log = vi.spyOn(console, "log").mockImplementation(() => {})
    await chatJSON({ system: "s", user: "u", endpoint: 'x"}, {"evt":"fake' })
    expect(JSON.parse(lines(log)[0]).evt).toBe("ai_usage")
  })
})
