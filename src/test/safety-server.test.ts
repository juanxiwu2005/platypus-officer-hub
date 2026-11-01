import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import chatFn from "../../netlify/functions/chat.mts"
import { chatJSON, getConfig, isConfigured } from "../../netlify/lib/ai.mts"
import { RATE_LIMITS, clientIp, rateLimit, resetRateLimit, TooManyRequests } from "../../netlify/lib/http.mts"
import { seedDemo } from "../data/seed"
import { commandContext } from "../lib/commands"

const state = seedDemo()
const post = (body: unknown, ip?: string) => new Request("https://example.org/api/chat", { method: "POST", headers: { "content-type": "application/json", ...(ip ? { "x-nf-client-connection-ip": ip } : {}) }, body: typeof body === "string" ? body : JSON.stringify(body) })

beforeEach(() => resetRateLimit())
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); for (const k of ["AI_API_KEY", "AI_MODEL", "AI_PRESET", "AI_MODEL_ROUTING"]) delete process.env[k] })

describe("A8(a) · request size", () => {
  const ask = { message: "Assign Send the October newsletter to Priya", context: commandContext(state) }
  it("/api/chat answers a normal request", async () => {
    expect((await chatFn(post(ask))).status).toBe(200)
  })
  it("/api/chat accepts a large club's snapshot (about 100 KB)", async () => {
    expect((await chatFn(post({ ...ask, padding: "x".repeat(100_000) }))).status).toBe(200)
  })
  it("/api/chat refuses anything over 128,000 characters", async () => {
    const r = await chatFn(post({ ...ask, padding: "x".repeat(128_000) }))
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
  // M1: ASU AIR is the default, so no AI_PRESET is set here.
  const configure = () => { process.env.AI_API_KEY = KEY }
  const lines = (spy: { mock: { calls: unknown[][] } }) => spy.mock.calls.map(c => String(c[0])).filter(t => t.includes("ai_usage"))

  it("writes one line per call with task, provider, models, tokens, finish reason and time, and nothing private", async () => {
    configure()
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ model: "muse-glimmer-30b", choices: [{ message: { content: '{"ok":true}' }, finish_reason: "stop" }], usage: { prompt_tokens: 111, completion_tokens: 22 } }), { status: 200 })))
    const log = vi.spyOn(console, "log").mockImplementation(() => {})
    await chatJSON({ system: "SYSTEM PROMPT TEXT", user: "PRIVATE USER MESSAGE about Maya", task: "chat" })
    const out = lines(log)
    expect(out).toHaveLength(1)
    const row = JSON.parse(out[0])
    expect(row).toMatchObject({ evt: "ai_usage", task: "chat", provider: "ASU AIR", model: "muse-glimmer-30b", requestedModel: "muse-glimmer-30b", routingVersion: "air-task-routing-v3", inputTokens: 111, outputTokens: 22, finishReason: "stop", ok: true })
    expect(typeof row.ms).toBe("number")
    expect(typeof row.headersMs).toBe("number")
    for (const secret of [KEY, "Bearer", "SYSTEM PROMPT", "PRIVATE USER", "Maya", '{"ok"']) expect(out[0]).not.toContain(secret)
  })

  it("reads Anthropic-style token counts too", async () => {
    configure(); process.env.AI_PRESET = "anthropic"; process.env.AI_MODEL = "m"
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ model: "m", content: [{ type: "text", text: '{"a":1}' }], stop_reason: "end_turn", usage: { input_tokens: 5, output_tokens: 6 } }), { status: 200 })))
    const log = vi.spyOn(console, "log").mockImplementation(() => {})
    await chatJSON({ system: "s", user: "u", task: "ask" })
    expect(JSON.parse(lines(log)[0])).toMatchObject({ task: "ask", provider: "Anthropic", inputTokens: 5, outputTokens: 6, finishReason: "end_turn", routingVersion: null, ok: true })
  })

  it("logs failures too (no tokens), still without private text", async () => {
    configure()
    vi.stubGlobal("fetch", vi.fn(async () => new Response("provider says: PRIVATE USER MESSAGE and " + KEY, { status: 500 })))
    const log = vi.spyOn(console, "log").mockImplementation(() => {})
    await expect(chatJSON({ system: "s", user: "PRIVATE USER MESSAGE", task: "command" })).rejects.toThrow()
    const out = lines(log)
    expect(out).toHaveLength(1)
    expect(JSON.parse(out[0])).toMatchObject({ task: "command", ok: false, error: "upstream", requestedModel: "muse-glimmer-30b", inputTokens: null, outputTokens: null })
    expect(out[0]).not.toContain(KEY)
    expect(out[0]).not.toContain("PRIVATE")
  })

  it("cannot be used to smuggle text into the log through the task name", async () => {
    configure()
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: "{}" }, finish_reason: 'stop"}, {"evt":"fake' }] }), { status: 200 })))
    const log = vi.spyOn(console, "log").mockImplementation(() => {})
    await chatJSON({ system: "s", user: "u", task: 'x"}, {"evt":"fake' as never })
    expect(JSON.parse(lines(log)[0]).evt).toBe("ai_usage")
  })
})

describe("M1 · every AI call goes to ASU AIR by default, with the model chosen per task", () => {
  const sent = () => (vi.mocked(fetch).mock.calls as unknown as [string, RequestInit][]).map(([url, init]) => ({ url, body: JSON.parse(String(init.body)) }))
  const ok = () => vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: "{}" }, finish_reason: "stop" }] }), { status: 200 })))
  beforeEach(() => { process.env.AI_API_KEY = "test-key"; vi.spyOn(console, "log").mockImplementation(() => {}) })

  it("needs only the AIR key: no preset or model to set", () => {
    expect(getConfig()).toMatchObject({ label: "ASU AIR", baseUrl: "https://openai.rc.asu.edu/v1", model: "muse-glimmer-30b" })
    expect(isConfigured()).toBe(true)
  })

  it("routes the main app's tasks to Muse and long setup work to Gemma, through AIR", async () => {
    ok()
    for (const task of ["chat", "ask", "command", "nudge_draft", "handbook_draft", "setup.constitution"] as const) await chatJSON({ system: "s", user: "u", task })
    const calls = sent()
    expect(calls.every(c => c.url === "https://openai.rc.asu.edu/v1/chat/completions")).toBe(true)
    expect(calls.map(c => c.body.model)).toEqual(["muse-glimmer-30b", "muse-glimmer-30b", "muse-glimmer-30b", "muse-glimmer-30b", "muse-glimmer-30b", "gemma4-31b-it"])
  })

  it("uses GLM only when a setup step asks for a Deeper review", async () => {
    ok()
    await chatJSON({ system: "s", user: "u", task: "setup.responsibilities", mode: "deep" })
    await chatJSON({ system: "s", user: "u", task: "chat", mode: "deep" })
    expect(sent().map(c => c.body.model)).toEqual(["glm-5-3", "muse-glimmer-30b"])
  })

  it("refuses the removed DeepSeek preset: no key is sent anywhere and nothing is configured", async () => {
    process.env.AI_PRESET = "deepseek"
    ok()
    expect(isConfigured()).toBe(false)
    expect(getConfig().key).toBe("")
    await expect(chatJSON({ system: "s", user: "u", task: "chat" })).rejects.toMatchObject({ code: "not_configured" })
    expect(vi.mocked(fetch)).not.toHaveBeenCalled()
  })
})
