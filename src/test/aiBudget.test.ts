import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import chatFn from "../../netlify/functions/chat.mts"
import commandFn from "../../netlify/functions/command.mts"
import reviewFn from "../../netlify/functions/event-review.mts"
import policyFn from "../../netlify/functions/policy-answer.mts"
import handbookFn from "../../netlify/functions/handbook-draft.mts"
import askFn from "../../netlify/functions/ask.mts"
import constitutionFn from "../../netlify/functions/constitution.mts"
import { chatJSON, SYNC_AI_BUDGET_DEFAULT_MS, syncAiBudgetMs } from "../../netlify/lib/ai.mts"
import { resetRateLimit } from "../../netlify/lib/http.mts"
import { seedDemo } from "../data/seed"
import type { HandbookSource } from "../data/types"
import { commandContext } from "../lib/commands"
import { aiSnapshot } from "../lib/aiContext"
import { reviewPayload } from "../lib/eventReview"
import { handbookPicks, localHandbook, salvageHandbookPicks } from "../lib/handbookDraft"
import { createIntent, respond, type ChatCard } from "../lib/assistant"
import { AI_WAIT_MS, aiMiss, aiWaitMs, ApiError, resetAiBudget } from "../lib/api"

/**
 * Production 2026-11-07 (Netlify logs, live site):
 * 1. /api/chat ran into Netlify's ~30 s limit (504 after 31.2 s, then 502), so "Plan an event about March 3 for networking night
 *    with 50 people" ended in a plain text card with no planning form.
 * 2. /api/handbook/draft stopped at its 700-token limit (finish "length", bad_json, 502) and the handbook step failed.
 * The real AI is never called here: every provider is a fake.
 */
const state = seedDemo("2026-10-22")
/** FB-1: the synchronous budget is now read from AI_SYNC_BUDGET_MS (default 26 s; it was a fixed 22 s). */
const SYNC_AI_BUDGET_MS = SYNC_AI_BUDGET_DEFAULT_MS
const post = (path: string, body: unknown) => new Request(`https://example.org/api/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })

function configure() {
  vi.stubEnv("AI_PRESET", "asu_air")
  vi.stubEnv("AI_API_KEY", "fictional-test-key")
  vi.stubEnv("AI_MODEL", "")
  vi.stubEnv("AI_BASE_URL", "")
  vi.stubEnv("AI_PROVIDER", "")
  vi.stubEnv("AI_JSON_MODE", "")
  vi.stubEnv("AI_MODEL_ROUTING", "")
  // A long default must not leak into the synchronous functions: each sets its own budget.
  vi.stubEnv("AI_TIMEOUT_MS", "120000")
}
/** A provider that never answers; it only gives up when the request is aborted. Records when that happened. */
function hangingProvider() {
  const aborted: number[] = []
  const send = vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_, reject) => {
    init.signal?.addEventListener("abort", () => { aborted.push(Date.now()); reject(Object.assign(new Error("aborted"), { name: "AbortError" })) })
  }))
  vi.stubGlobal("fetch", send)
  return { send, aborted }
}
const completion = (content: string, finish = "stop") => new Response(JSON.stringify({ model: "fake-model", choices: [{ finish_reason: finish, message: { content } }], usage: { prompt_tokens: 10, completion_tokens: 400 } }))

beforeEach(() => { resetRateLimit(); vi.spyOn(console, "log").mockImplementation(() => {}) })
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe("server: every synchronous AI endpoint answers inside Netlify's 30 s", () => {
  const endpoints: [string, (r: Request) => Promise<Response>, string, unknown][] = [
    ["/api/chat", chatFn, "chat", { message: "Plan an event about March 3 for networking night with 50 people", context: commandContext(state), data: aiSnapshot(state) }],
    ["/api/chat (form)", chatFn, "chat", { message: "Plan an event about March 3 for networking night with 50 people", purpose: "form", context: commandContext(state), data: aiSnapshot(state) }],
    ["/api/command", commandFn, "command", { sentence: "Think about what the sponsor might want", context: { events: [], nodes: [], people: [] } }],
    ["/api/event/review", reviewFn, "event/review", { eventId: "e-night", context: commandContext(state), data: reviewPayload(state, "e-night") }],
    ["/api/policy-answer", policyFn, "policy-answer", { question: "Can we use an outside caterer for food at our event?" }],
    ["/api/handbook/draft", handbookFn, "handbook/draft", { sources: [{ id: "task:t-one", kind: "task", text: "Task: Book the room." }] }],
    ["/api/ask", askFn, "ask", { question: "Can we run a raffle?" }],
    ["/api/setup/constitution", constitutionFn, "setup/constitution", { text: "Article 3. The President leads meetings. The Treasurer keeps the books.", part: "structure" }],
  ]
  for (const [name, fn, path, body] of endpoints) {
    it(`${name} gives up on a silent provider within ${SYNC_AI_BUDGET_MS / 1000} s with a clean JSON error`, async () => {
      configure()
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] })
      const { send, aborted } = hangingProvider()
      const start = Date.now()
      const pending = fn(post(path, body))
      await vi.advanceTimersByTimeAsync(SYNC_AI_BUDGET_MS)
      const res = await pending
      expect(send).toHaveBeenCalledOnce() // no second try that would add another wait
      expect(aborted).toHaveLength(1)
      expect(aborted[0] - start).toBeLessThanOrEqual(SYNC_AI_BUDGET_MS)
      expect(res.status).toBe(504)
      expect(await res.json()).toMatchObject({ error: "timeout" })
    })
  }

  it("a format-fallback second attempt only gets what is left of the budget", async () => {
    configure()
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] })
    const aborted: number[] = []
    const send = vi.fn((_url: string, init: RequestInit) => send.mock.calls.length === 1
      ? new Promise<Response>(resolve => setTimeout(() => resolve(new Response("response_format not supported", { status: 400 })), 15_000))
      : new Promise<Response>((_, reject) => init.signal?.addEventListener("abort", () => { aborted.push(Date.now()); reject(Object.assign(new Error("aborted"), { name: "AbortError" })) })))
    vi.stubGlobal("fetch", send)
    const start = Date.now()
    const pending = chatJSON({ system: "JSON", user: "Fictional", task: "chat", timeoutMs: SYNC_AI_BUDGET_MS }).catch(e => e)
    await vi.advanceTimersByTimeAsync(SYNC_AI_BUDGET_MS + 1_000)
    const error = await pending
    expect(send).toHaveBeenCalledTimes(2)
    expect(error).toMatchObject({ code: "timeout", status: 504 })
    expect(aborted[0] - start).toBe(SYNC_AI_BUDGET_MS) // 15 s + the 11 s left, not 15 s + another 26 s
  })

  it("/api/chat sends a lean prompt when the browser only wants the form filled", async () => {
    configure()
    const send = vi.fn(async () => completion(JSON.stringify({ cards: [{ kind: "form", intent: "plan_event", prefill: { name: "Networking Night", headcount: 50, date: "2027-03-03" } }] })))
    vi.stubGlobal("fetch", send)
    const message = "Plan an event about March 3 for networking night with 50 people"
    const full = await chatFn(post("chat", { message, context: commandContext(state), data: aiSnapshot(state) }))
    const lean = await chatFn(post("chat", { message, purpose: "form", context: commandContext(state), data: aiSnapshot(state) }))
    expect(full.status).toBe(200)
    expect(lean.status).toBe(200)
    const sent = send.mock.calls.map(c => JSON.parse((c as unknown as [string, RequestInit])[1].body as string))
    const fullUser = JSON.parse(sent[0].messages[1].content), leanUser = JSON.parse(sent[1].messages[1].content)
    expect(Object.keys(leanUser.clubData).sort()).toEqual(["club", "events", "people", "roles", "today", "you"])
    expect(leanUser).not.toHaveProperty("sharedPool")
    expect(leanUser).not.toHaveProperty("rules")
    expect(fullUser.clubData).toHaveProperty("tasks")
    expect(sent[1].messages[1].content.length).toBeLessThan(sent[0].messages[1].content.length / 3)
    // FB-1: ASU AIR is always sent at least AIR_MIN_OUTPUT_TOKENS (1024); the function asks for 600 / 400.
    expect(sent[0].max_tokens).toBe(1024)
    expect(sent[1].max_tokens).toBe(1024)
    // The model's date never survives: the form's date comes from the person's words in the browser.
    const card = (await lean.json()).cards[0]
    expect(card).toMatchObject({ kind: "form", intent: "plan_event", prefill: { name: "Networking Night", headcount: 50 } })
    expect(JSON.stringify(card)).not.toContain("2027-03-03")
  })
})

describe("server: a handbook reply cut off at the output limit keeps its complete picks", () => {
  const sources: HandbookSource[] = [
    { id: "task:t-recon", kind: "task", text: "Task: Reconcile the budget. Purpose: x. Recorded status: in_progress." },
    { id: "task:t-usg", kind: "task", text: "Task: Chase the USG reimbursement. Purpose: y. Recorded status: done." },
    { id: "interview:r-fin:1", kind: "interview", text: "Keep receipts in the shared folder." },
  ]
  it("salvage keeps only complete values that name an existing record, in order", () => {
    expect(salvageHandbookPicks('{"ids":["s3","s1","s9","s2', sources)).toEqual({ entries: [{ sourceId: "interview:r-fin:1" }, { sourceId: "task:t-recon" }] })
    // The old shape, with copied text cut off mid-string: only the complete sourceId survives.
    expect(salvageHandbookPicks('{"entries":[{"sourceId":"task:t-usg","text":"Task: Chase the USG reimb', sources)).toEqual({ entries: [{ sourceId: "task:t-usg" }] })
    expect(salvageHandbookPicks('{"entries":[{"sourceId":"task:invented"},{"sourceId":"task:t-re', sources)).toBeNull()
    expect(salvageHandbookPicks("", sources)).toBeNull()
  })
  it("refs map back to real source IDs; unknown refs and IDs are dropped", () => {
    expect(handbookPicks({ ids: ["s2", "s7", "task:t-recon", "task:made-up", 3] }, sources)).toEqual({ entries: [{ sourceId: "task:t-usg" }, { sourceId: "task:t-recon" }] })
  })
  it("/api/handbook/draft returns the complete picks of a cut-off reply, marked partial", async () => {
    configure()
    const send = vi.fn(async () => completion('{"ids":["s3","s1","s2', "length"))
    vi.stubGlobal("fetch", send)
    const res = await handbookFn(post("handbook/draft", { sources }))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ entries: [{ sourceId: "interview:r-fin:1", text: "Keep receipts in the shared folder." }, { sourceId: "task:t-recon" }], partial: true, source: "ai" })
    const sent = JSON.parse((send.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
    expect(sent.max_tokens).toBe(1024) // FB-1: the AIR minimum, not the function's 400
    // The model sees short refs and never the real IDs it could echo back at length.
    expect(sent.messages[1].content).toContain('"ref":"s1"')
    expect(sent.messages[1].content).not.toContain("task:t-recon")
  })
  it("a cut-off reply with nothing complete is still an error (and the browser builds the handbook)", async () => {
    configure()
    vi.stubGlobal("fetch", vi.fn(async () => completion('{"ids":["s', "length")))
    const res = await handbookFn(post("handbook/draft", { sources }))
    expect(res.status).toBe(502)
    expect(await res.json()).toMatchObject({ error: "bad_json" })
  })
  it("a cut-off reply elsewhere is never salvaged", async () => {
    configure()
    vi.stubGlobal("fetch", vi.fn(async () => completion('{"cards":[{"kind":"text","text":"Hel', "length")))
    const res = await chatFn(post("chat", { message: "How is the club doing overall", context: commandContext(state), data: aiSnapshot(state) }))
    expect(res.status).toBe(502)
  })
  it("the local handbook uses the same records: interview points, then open tasks, then finished ones, at most 12", () => {
    expect(localHandbook(sources).entries.map(e => e.sourceId)).toEqual(["interview:r-fin:1", "task:t-recon", "task:t-usg"])
    const many: HandbookSource[] = Array.from({ length: 20 }, (_, i) => ({ id: `task:t${i}`, kind: "task", text: `Task ${i}.` }))
    expect(localHandbook(many).entries).toHaveLength(12)
  })
})

describe("browser: asking to plan an event always ends in the planning form", () => {
  const form = (cards: ChatCard[]) => cards.find(c => c.kind === "form") as Extract<ChatCard, { kind: "form" }> | undefined
  const slow504 = () => vi.fn(async () => new Response(JSON.stringify({ error: "timeout", message: "The AI provider took too long to answer." }), { status: 504 }))
  it("waits for the AI no longer than the server's budget plus a little", () => {
    // FB-1: the server's budget plus 4 s once /api/health has said it; 30 s until then.
    resetAiBudget()
    expect(aiWaitMs()).toBe(AI_WAIT_MS)
    expect(AI_WAIT_MS).toBe(30_000)
    expect(AI_WAIT_MS).toBeGreaterThanOrEqual(syncAiBudgetMs() + 4_000)
    resetAiBudget(26_000)
    expect(aiWaitMs()).toBe(30_000)
    resetAiBudget(50_000)
    expect(aiWaitMs()).toBe(54_000)
    resetAiBudget()
  })
  it("tells a timeout from an unavailable service", () => {
    expect(aiMiss(new ApiError("x", 504))).toBe("timeout")
    expect(aiMiss(Object.assign(new Error("aborted"), { name: "AbortError" }))).toBe("timeout")
    expect(aiMiss(new ApiError("x", 502))).toBe("unavailable")
    expect(aiMiss(new Error("offline"))).toBe("unavailable")
  })
  it("the production sentence names Networking Night but asks for a new event: the form shows at once, filled from the words", async () => {
    const send = slow504()
    vi.stubGlobal("fetch", send)
    const t = "Plan an event about March 3 for networking night with 50 people"
    expect(createIntent(t, state)).toBe("event")
    const r = await respond(t, state, "alex", null, "/", [])
    const f = form(r.cards)!
    expect(f).toMatchObject({ date: "2027-03-03", thinking: true, prefill: { name: "Networking night", headcount: 50 } })
    // The assistant's reading goes out once, lean, and when it times out the label says so honestly.
    expect(await r.refine).toBeNull()
    expect(r.refineMiss?.why).toBe("timeout")
    expect(send).toHaveBeenCalledOnce()
    const body = JSON.parse((send.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
    expect(body.purpose).toBe("form")
    expect(body.data).not.toHaveProperty("tasks")
  })
  it.each([
    ["Plan networking night on March 3 with 50 people", { date: "2027-03-03", name: "Networking night", headcount: 50 }],
    ["plan a food event next month", { date: "", name: "Food event", food: "tbd" }],
    ["Host another networking night", { date: "", name: "Networking night" }],
    ["Set up an event for networking night on March 3", { date: "2027-03-03", name: "Networking night" }],
  ])("%s → the planning form, dates only from the person's words", async (t, want) => {
    vi.stubGlobal("fetch", slow504())
    const f = form((await respond(t, state, "alex", null, "/", [])).cards)!
    expect(f.date).toBe(want.date)
    expect(f.prefill).toMatchObject({ name: want.name, ...("headcount" in want ? { headcount: want.headcount } : {}), ...("food" in want ? { food: want.food } : {}) })
  })
  it("the same sentences with AI off give the same form, without calling the server", async () => {
    const send = vi.fn()
    vi.stubGlobal("fetch", send)
    const r = await respond("Plan an event about March 3 for networking night with 50 people", { ...state, aiEnabled: false }, "alex", null, "/", [])
    expect(form(r.cards)).toMatchObject({ date: "2027-03-03", prefill: { headcount: 50 } })
    expect(r.source).toBe("Local demo grammar · AI off")
    expect(send).not.toHaveBeenCalled()
  })
  it("work on an existing event is still not a new event", () => {
    expect(createIntent("Plan the budget for Spring Speaker Night", state)).toBeNull()
    expect(createIntent("Plan a budget for Networking Night", state)).toBeNull()
    expect(createIntent("Move Networking Night to March 3", state)).toBeNull()
    expect(createIntent(`Plan Networking Night on ${state.events.find(e => e.id === "e-night")!.date}`, state)).toBeNull()
  })
  it("a planning message the app would leave to the AI still gets the form when the AI times out, labelled honestly", async () => {
    const send = slow504()
    vi.stubGlobal("fetch", send)
    const t = "Plan a monthly social for new members"
    expect(createIntent(t, state)).toBeNull()
    const r = await respond(t, state, "alex", null, "/", [])
    expect(form(r.cards)).toMatchObject({ date: "", prefill: { name: "Monthly social" } })
    expect(r.source).toBe("Platypus · AI didn't answer in time, filled from your words")
    expect(send).toHaveBeenCalledOnce()
  })
  it("an unavailable service is not called a timeout", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "upstream" }), { status: 502 })))
    const r = await respond("Plan a monthly social for new members", state, "alex", null, "/", [])
    expect(form(r.cards)).toBeTruthy()
    expect(r.source).toBe("Platypus · AI unavailable, filled from your words")
    const other = await respond("Tell me something fun about the club", state, "alex", null, "/", [])
    expect(other.source).toBe("Local fallback · server unavailable")
  })
})
