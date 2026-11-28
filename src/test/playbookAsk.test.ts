import { afterEach, describe, expect, it, vi } from "vitest"
const chat = vi.hoisted(() => vi.fn())
const call = vi.hoisted(() => vi.fn())
vi.mock("../../netlify/lib/ai.mts", async importOriginal => ({ ...await importOriginal<object>(), chatJSON: chat }))
vi.mock("../lib/api", async importOriginal => ({ ...await importOriginal<object>(), callApi: call }))
import chatFn from "../../netlify/functions/chat.mts"
import { resetRateLimit } from "../../netlify/lib/http.mts"
import { seedDemo } from "../data/seed"
import { changePlaybook } from "../data/playbook"
import type { DemoState } from "../data/types"
import { commandContext } from "../lib/commands"
import { playbookAskContext } from "../lib/playbookAsk"
import { cleanPlaybookAsk, MAX_ASK_ITEMS } from "../lib/playbookAskWire"
import { respond, type Focus } from "../lib/assistant"

// Ask AI on a Playbook question (Juanxi, 2026-11-26; docs/feedback-fix/PLAYBOOK_ASK_INTERFACE.md).
const base = () => seedDemo(undefined, "v2")
afterEach(() => { chat.mockReset(); call.mockReset(); resetRateLimit() })

describe("playbookAskContext", () => {
  it("builds the question's context in the page's ranking, with source names, full author names and vote counts", () => {
    const ctx = playbookAskContext(base(), "pq-1")
    expect(ctx).toEqual({
      kind: "playbook-question",
      questionId: "pq-1",
      question: "How far ahead must an event funding request go in?",
      category: "Funding",
      rules: [{ policyId: "ASU-R-038", sourceName: "The Bylaws of the Undergraduate Student Government - Tempe of Arizona State University", sourceUrl: expect.stringMatching(/^https:\/\//), text: expect.stringContaining("At least 4 weeks") }],
      clubRules: [{ answerId: "pa-2", text: "We submit 5 weeks ahead so there is time to fix a returned request.", author: "Alex Rivera", on: "2026-09-08" }],
      tips: [
        { answerId: "pa-3", text: expect.stringContaining("Send every vendor quote"), author: "Maya Chen", on: "2026-04-20", likes: 1, dislikes: 0 },
        { answerId: "pa-4", text: expect.stringContaining("If nothing has moved"), author: "Jordan Patel", on: "2026-03-02", likes: 0, dislikes: 0 },
      ],
    })
  })

  it("follows votes, merges and deletes; returns null for a missing question", () => {
    let s: DemoState = { ...base(), viewerId: "sam" }
    s = changePlaybook(s, { kind: "vote", answerId: "pa-4", vote: 1 })
    s = changePlaybook({ ...s, viewerId: "jordan" }, { kind: "vote", answerId: "pa-4", vote: 1 })
    expect(playbookAskContext(s, "pq-1")!.tips.map(t => t.answerId)).toEqual(["pa-4", "pa-3"])
    const merged = changePlaybook({ ...s, viewerId: "alex" }, { kind: "mergeQuestion", fromId: "pq-5", intoId: "pq-4" })
    expect(playbookAskContext(merged, "pq-5")!.questionId).toBe("pq-4")
    const deleted = changePlaybook({ ...s, viewerId: "alex" }, { kind: "deleteQuestion", questionId: "pq-1" })
    expect(playbookAskContext(deleted, "pq-1")).toBeNull()
    expect(playbookAskContext(base(), "pq-404")).toBeNull()
  })

  it("holds no voter ids, reads or computed dates, and is deterministic", () => {
    const s = changePlaybook(base(), { kind: "markRead", questionId: "pq-1" })
    const text = JSON.stringify(playbookAskContext(s, "pq-1"))
    expect(text).not.toMatch(/"alex"|"maya"|reads|votes/)
    // The only dates are the stored answer dates, copied.
    expect([...text.matchAll(/\d{4}-\d{2}-\d{2}/g)].map(m => m[0]).sort()).toEqual(["2026-03-02", "2026-04-20", "2026-09-08"])
    expect(playbookAskContext(s, "pq-1")).toEqual(playbookAskContext(s, "pq-1"))
  })

  it("keeps at most MAX_ASK_ITEMS answers of a kind", () => {
    let s = base()
    for (let i = 0; i < MAX_ASK_ITEMS + 3; i++) s = changePlaybook(s, { kind: "addAnswer", id: `pa-x${i}`, questionId: "pq-9", answerKind: "experience", text: `Tip ${i}.` })
    expect(playbookAskContext(s, "pq-9")!.tips).toHaveLength(MAX_ASK_ITEMS)
  })
})

describe("cleanPlaybookAsk (the server's check of playbookQuestion)", () => {
  it("passes a real context unchanged and rejects anything else", () => {
    const ctx = playbookAskContext(base(), "pq-1")!
    expect(cleanPlaybookAsk(ctx)).toEqual(ctx)
    for (const bad of [null, "x", [], {}, { ...ctx, kind: "other" }, { ...ctx, question: "" }]) expect(cleanPlaybookAsk(bad)).toBeNull()
  })

  it("drops unknown fields, caps text and lists, keeps https links and ISO dates only", () => {
    const ctx = playbookAskContext(base(), "pq-1")!
    const dirty = {
      ...ctx, secret: "sk-should-not-pass", question: `${"q".repeat(300)}?`,
      rules: [{ ...ctx.rules[0], sourceUrl: "javascript:alert(1)", extra: 1 }],
      tips: Array.from({ length: 30 }, (_, i) => ({ answerId: `pa-${i}`, text: "t".repeat(900), author: "Maya Chen", on: "next week", likes: -4, dislikes: 1e9 })),
    }
    const out = cleanPlaybookAsk(dirty)!
    expect(JSON.stringify(out)).not.toMatch(/sk-should-not-pass|javascript|extra|next week/)
    expect(out.question).toHaveLength(100)
    expect(out.rules[0].sourceUrl).toBeNull()
    expect(out.tips).toHaveLength(MAX_ASK_ITEMS)
    expect(out.tips[0]).toMatchObject({ on: "", likes: 0, dislikes: 10_000 })
    expect(out.tips[0].text).toHaveLength(400)
  })
})

describe("the context travels to /api/chat as playbookQuestion", () => {
  const focusOf = (s: DemoState, id: string): Focus => { const c = playbookAskContext(s, id)!; return { kind: "playbook-question", id: c.questionId, title: c.question, playbookQuestion: c } }

  it("respond sends it with the message (AI on); focus itself stays kind, id and title", async () => {
    const s = base()
    call.mockResolvedValue({ cards: [{ kind: "text", text: "Four weeks; the club aims for five." }], source: "ai", model: "mock" })
    const reply = await respond("How far ahead must an event funding request go in?", s, "alex", focusOf(s, "pq-1"), "/playbook", [])
    expect(call).toHaveBeenCalledTimes(1)
    const [path, body] = call.mock.calls[0]
    expect(path).toBe("/chat")
    expect(body.focus).toEqual({ kind: "playbook-question", id: "pq-1", title: "How far ahead must an event funding request go in?" })
    expect(body.playbookQuestion).toEqual(playbookAskContext(s, "pq-1"))
    expect(reply.cards[0]).toMatchObject({ kind: "text" })
  })

  it("with AI off nothing is sent, and the usual local answer applies", async () => {
    const s = { ...base(), aiEnabled: false }
    const reply = await respond("How far ahead must an event funding request go in?", s, "alex", focusOf(s, "pq-1"), "/playbook", [])
    expect(call).not.toHaveBeenCalled()
    expect(reply.cards[0].kind).toBe("rule")
  })

  it("when the AI fails, the message falls back to the usual answers", async () => {
    const s = base()
    call.mockRejectedValue(new Error("503"))
    const reply = await respond("How far ahead must an event funding request go in?", s, "alex", focusOf(s, "pq-1"), "/playbook", [])
    expect(call.mock.calls[0][0]).toBe("/chat")
    expect(reply.cards[0].kind).toBe("rule")
  })

  it("/api/chat passes the checked context to the model as data, and leaves it out of a form fill", async () => {
    const s = base()
    chat.mockResolvedValue({ data: { cards: [{ kind: "text", text: "See the school rule." }] }, model: "mock", provider: "mock" })
    const ctx = playbookAskContext(s, "pq-1")!
    const request = (body: unknown) => new Request("https://example.org/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
    await chatFn(request({ message: "How far ahead?", context: commandContext(s), playbookQuestion: { ...ctx, secret: "sk-x" } }))
    const sent = JSON.parse(chat.mock.calls[0][0].user)
    expect(sent.playbookQuestion).toEqual(ctx)
    await chatFn(request({ message: "How far ahead?", context: commandContext(s), playbookQuestion: "junk" }))
    expect(JSON.parse(chat.mock.calls[1][0].user)).not.toHaveProperty("playbookQuestion")
    await chatFn(request({ message: "Plan a networking night", context: commandContext(s), purpose: "form", playbookQuestion: ctx }))
    expect(JSON.parse(chat.mock.calls[2][0].user)).not.toHaveProperty("playbookQuestion")
  })
})
