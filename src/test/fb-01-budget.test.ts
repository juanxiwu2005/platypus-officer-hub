import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import health from "../../netlify/functions/health.mts"
import probe from "../../netlify/functions/limit-probe.mts"
import constitutionFn from "../../netlify/functions/constitution.mts"
import nudgeFn from "../../netlify/functions/nudge-draft.mts"
import { SYNC_AI_BUDGET_DEFAULT_MS, syncAiBudgetMs } from "../../netlify/lib/ai.mts"
import { resetRateLimit } from "../../netlify/lib/http.mts"
import { aiBudgetMs, aiWaitMs, callApi, getHealth, readAiBudget, resetAiBudget, wasStopped } from "../lib/api"
import { callRetry } from "../lib/aiRetry"

/** FB-1 3.2 (docs/feedback-fix/PLAN.md): one adjustable time budget for synchronous AI calls, and a probe to measure Netlify's. */
const get = (path: string) => new Request(`https://example.org${path}`, { method: "GET" })
const post = (path: string, body: unknown) => new Request(`https://example.org${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
function configure() {
  vi.stubEnv("AI_PRESET", "asu_air"); vi.stubEnv("AI_API_KEY", "fictional-test-key"); vi.stubEnv("AI_MODEL", ""); vi.stubEnv("AI_BASE_URL", "")
  vi.stubEnv("AI_PROVIDER", ""); vi.stubEnv("AI_JSON_MODE", ""); vi.stubEnv("AI_MODEL_ROUTING", ""); vi.stubEnv("AI_SYNC_BUDGET_MS", "")
}
/** A provider that never answers; records when each request was aborted. */
function hanging() {
  const aborted: number[] = []
  const send = vi.fn((_u: string, init: RequestInit) => new Promise<Response>((_, reject) => init.signal?.addEventListener("abort", () => { aborted.push(Date.now()); reject(Object.assign(new Error("aborted"), { name: "AbortError" })) })))
  vi.stubGlobal("fetch", send)
  return { send, aborted }
}

beforeEach(() => { resetRateLimit(); resetAiBudget(); vi.spyOn(console, "log").mockImplementation(() => {}) })
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); resetAiBudget() })

describe("FB-1 · server time budget", () => {
  it("AI_SYNC_BUDGET_MS sets it, kept within 10–55 s; 26 s by default", () => {
    vi.stubEnv("AI_SYNC_BUDGET_MS", ""); expect(syncAiBudgetMs()).toBe(26_000)
    expect(SYNC_AI_BUDGET_DEFAULT_MS).toBe(26_000)
    vi.stubEnv("AI_SYNC_BUDGET_MS", "50000"); expect(syncAiBudgetMs()).toBe(50_000)
    vi.stubEnv("AI_SYNC_BUDGET_MS", "3000"); expect(syncAiBudgetMs()).toBe(10_000)
    vi.stubEnv("AI_SYNC_BUDGET_MS", "90000"); expect(syncAiBudgetMs()).toBe(55_000)
    vi.stubEnv("AI_SYNC_BUDGET_MS", "soon"); expect(syncAiBudgetMs()).toBe(26_000)
    vi.stubEnv("AI_SYNC_BUDGET_MS", "-5"); expect(syncAiBudgetMs()).toBe(26_000)
  })

  it("a synchronous endpoint stops at the configured budget", async () => {
    configure(); vi.stubEnv("AI_SYNC_BUDGET_MS", "40000")
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] })
    const { aborted } = hanging()
    const start = Date.now()
    const pending = nudgeFn(post("/api/nudge/draft", { node: { id: "t-1", title: "Book the room" }, mission: "Help founders meet" }))
    await vi.advanceTimersByTimeAsync(40_000)
    const res = await pending
    expect(res.status).toBe(504)
    expect(aborted[0] - start).toBe(40_000)
  })

  it("the constitution reader stops one second before the budget", async () => {
    configure(); vi.stubEnv("AI_SYNC_BUDGET_MS", "30000")
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] })
    const { aborted } = hanging()
    const start = Date.now()
    const pending = constitutionFn(post("/api/setup/constitution", { text: "Article 3. The President leads meetings. The Treasurer keeps the books.", part: "structure" }))
    await vi.advanceTimersByTimeAsync(30_000)
    expect((await pending).status).toBe(504)
    expect(aborted[0] - start).toBe(29_000)
  })

  it("/api/health reports the budget and never the key", async () => {
    configure(); vi.stubEnv("AI_SYNC_BUDGET_MS", "45000")
    const res = await health(get("/api/health"))
    const body = await res.json()
    expect(body).toMatchObject({ ok: true, syncBudgetMs: 45_000 })
    expect(JSON.stringify(body)).not.toContain("fictional-test-key")
    vi.stubEnv("AI_SYNC_BUDGET_MS", "")
    expect((await (await health(get("/api/health"))).json()).syncBudgetMs).toBe(26_000)
  })
})

describe("FB-1 · /api/limit-probe", () => {
  it("is 404 unless AI_LIMIT_PROBE=on", async () => {
    vi.stubEnv("AI_LIMIT_PROBE", "")
    expect((await probe(get("/api/limit-probe?s=5"))).status).toBe(404)
    vi.stubEnv("AI_LIMIT_PROBE", "true")
    expect((await probe(get("/api/limit-probe?s=5"))).status).toBe(404)
  })

  it("when on, waits the asked seconds and answers { waited }, with no AI call", async () => {
    vi.stubEnv("AI_LIMIT_PROBE", "on")
    const send = vi.fn()
    vi.stubGlobal("fetch", send)
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] })
    let done = false
    const pending = probe(get("/api/limit-probe?s=35")).then(r => { done = true; return r })
    await vi.advanceTimersByTimeAsync(34_999)
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    const res = await pending
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ waited: 35 })
    expect(send).not.toHaveBeenCalled()
  })

  it("only whole seconds from 1 to 58", async () => {
    vi.stubEnv("AI_LIMIT_PROBE", "on")
    for (const s of ["0", "59", "abc", "1.5", "", "-3"]) expect((await probe(get(`/api/limit-probe?s=${s}`))).status).toBe(400)
    expect((await probe(get("/api/limit-probe"))).status).toBe(400)
  })
})

describe("FB-1 · the browser follows the server's budget", () => {
  it("reads /api/health once and waits the budget plus 4 s; 30 s while unknown", async () => {
    const send = vi.fn(async () => new Response(JSON.stringify({ ok: true, configured: true, provider: "ASU AIR", model: "m", syncBudgetMs: 50_000 })))
    vi.stubGlobal("fetch", send)
    expect(aiWaitMs()).toBe(30_000)
    expect(aiBudgetMs()).toBeNull()
    await Promise.all([readAiBudget(), readAiBudget()])
    await readAiBudget()
    expect(send).toHaveBeenCalledOnce()
    expect(aiBudgetMs()).toBe(50_000)
    expect(aiWaitMs()).toBe(54_000)
  })

  it("an unreadable or missing budget keeps the 30 s wait", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: true, configured: false, provider: null, model: null, syncBudgetMs: 999_999 }))))
    await getHealth()
    expect(aiWaitMs()).toBe(30_000)
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline") }))
    expect(await readAiBudget()).toBeNull()
    expect(aiWaitMs()).toBe(30_000)
  })

  it("callRetry waits as long as callApi for one AI answer", async () => {
    resetAiBudget(40_000)
    vi.useFakeTimers()
    const { aborted } = hanging()
    const start = Date.now()
    const out = callRetry("/setup/workflow", {}, () => true, 1).catch(e => e)
    await vi.advanceTimersByTimeAsync(44_000 + 1_000) // the wait, then the short pause callRetry takes after a failure
    await out
    expect(aborted[0] - start).toBe(44_000)
  })

  it("callApi stops at once when the person presses Stop, and says so", async () => {
    const { aborted } = hanging()
    const stop = new AbortController()
    const pending = callApi("/chat", { message: "x" }, 30_000, stop.signal).catch(e => e)
    stop.abort()
    const e = await pending
    expect(wasStopped(e)).toBe(true)
    expect(aborted).toHaveLength(1)
    // An already-stopped signal sends nothing.
    const send = vi.fn()
    vi.stubGlobal("fetch", send)
    expect(wasStopped(await callApi("/chat", {}, 30_000, stop.signal).catch(x => x))).toBe(true)
    expect(send).not.toHaveBeenCalled()
  })
})
