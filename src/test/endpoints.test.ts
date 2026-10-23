import { afterEach, describe, expect, it, vi } from "vitest"
const chat = vi.hoisted(() => vi.fn())
vi.mock("../../netlify/lib/ai.mts", async importOriginal => ({ ...await importOriginal<object>(), chatJSON: chat }))
import command from "../../netlify/functions/command.mts"
import nudge from "../../netlify/functions/nudge-draft.mts"
import parseBrief from "../../netlify/functions/parse-brief.mts"
import chatFn from "../../netlify/functions/chat.mts"
import { seedDemo } from "../data/seed"
import { commandContext } from "../lib/commands"
import { nudgeCheck } from "../lib/nudges"
import { chatSummary } from "../lib/assistant"

const state = seedDemo()
const request = (body: unknown, path = "/api/command") => new Request("https://example.org" + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
afterEach(() => chat.mockReset())
describe("server endpoint contract", () => {
  it("/api/command returns a sanitized change set without needing a provider for supported commands", async () => {
    const response = await command(request({ sentence: "Assign Send the October newsletter to Priya", context: commandContext(state) }))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ source: "rules", ops: [{ op: "assign_owner", nodeId: "t-news", ownerId: "priya" }] })
    expect(chat).not.toHaveBeenCalled()
  })
  it("/api/command filters hostile provider operations and dates", async () => {
    chat.mockResolvedValue({ data: { ops: [{ op: "set_tier", nodeId: "t-news", tier: "heavy", latestStart: "2099-01-01" }, { op: "delete_node", nodeId: "t-news" }, { op: "assign_owner", nodeId: "t-news", ownerId: "unknown" }] }, model: "mock" })
    const r = await command(request({ sentence: "Please adjust the newsletter's effort", context: commandContext(state) }))
    expect(await r.json()).toEqual({ source: "ai", model: "mock", ops: [{ op: "set_tier", nodeId: "t-news", tier: "heavy" }] })
  })
  it("handles missing/malformed requests without calling AI", async () => {
    expect((await command(request({}))).status).toBe(400)
    expect((await nudge(request({}))).status).toBe(400)
    expect((await command(new Request("https://example.org/api/command", { method: "POST", body: "{" }))).status).toBe(400)
    expect(chat).not.toHaveBeenCalled()
  })
  it("/api/nudge/draft returns a whole checked draft, reconstructing dates from input and discarding AI dates", async () => {
    chat.mockResolvedValue({ data: { whyItMatters: "We build a stronger club together.", date: "2099-01-01", clubDeadline: "2099-01-01" }, model: "mock" })
    const node = state.nodes.find(n => n.id === "e-night:usg")!
    const r = await nudge(request({ node, today: state.today, remindAt: "evening", mission: state.org.mission }, "/api/nudge/draft"))
    const d = await r.json()
    expect(r.status).toBe(200)
    expect(nudgeCheck(d.subject, d.body).ok).toBe(true)
    expect(d.body).toContain("Oct 30")
    expect(d.body).not.toContain("2099")
  })
  it("replaces banned AI reminder wording", async () => {
    chat.mockResolvedValue({ data: { whyItMatters: "URGENT Just use AI ASAP" }, model: "mock" })
    const d = await (await nudge(request({ node: state.nodes[0], today: state.today }))).json()
    expect(d.body).not.toMatch(/URGENT|ASAP|Just use AI/)
    expect(d.checked).toBe(true)
  })
  it("the retained parse-brief endpoint also discards AI date fields", async () => {
    chat.mockResolvedValue({ data: { name: "Dinner", date: "2099-01-01" }, model: "mock" })
    const d = await (await parseBrief(request({ sentence: "Dinner", today: state.today }))).json()
    expect(d.brief).toEqual({ name: "Dinner" })
  })
  it("/api/chat answers supported commands without AI and filters every model card", async () => {
    const local = await chatFn(request({ message: "Assign Send the October newsletter to Priya", context: commandContext(state) }, "/api/chat"))
    expect(await local.json()).toMatchObject({ source: "rules", cards: [{ kind: "changes", ops: [{ op: "assign_owner", nodeId: "t-news", ownerId: "priya" }] }] })
    expect(chat).not.toHaveBeenCalled()
    chat.mockResolvedValue({ data: { cards: [{ kind: "text", text: "Due Nov 4, so start 2026-10-28." }, { kind: "send_email", to: "x@y.z" }, { kind: "tasks", scope: "risk", limit: 99 }, { kind: "rule", citations: ["R06", "R99"], inScope: true }] }, model: "mock", provider: "mock" })
    const r = await (await chatFn(request({ message: "How is our flyer doing?", context: commandContext(state), history: [{ role: "user", text: "hi" }] }, "/api/chat"))).json()
    expect(r.cards.map((c: { kind: string }) => c.kind)).toEqual(["text", "tasks", "rule"])
    expect(JSON.stringify(r.cards)).not.toMatch(/Nov 4|2026-10-28|R99|send_email/)
    expect(r.cards[1]).toEqual({ kind: "tasks", scope: "risk", limit: 10 })
    expect((await chatFn(request({}, "/api/chat"))).status).toBe(400)
  })
  it("/api/chat passes only a checked status summary to the model", async () => {
    chat.mockResolvedValue({ data: { cards: [{ kind: "text", text: "Start with the USG form." }] }, model: "mock", provider: "mock" })
    const summary = chatSummary(state)
    summary.nodes.push({ id: "ghost", status: "done", owner: "x", eventId: null, risk: "purple", overdue: true })
    ;(summary.nodes[0] as Record<string, unknown>).notes = "secret profile"
    await chatFn(request({ message: "What should I focus on?", context: commandContext(state), summary }, "/api/chat"))
    const sent = JSON.parse(chat.mock.calls[0][0].user)
    expect(sent.summary.nodes.length).toBeGreaterThan(0)
    expect(sent.summary.nodes.some((n: { id: string }) => n.id === "ghost")).toBe(false)
    expect(JSON.stringify(sent.summary)).not.toMatch(/secret profile|purple/)
    expect(sent.summary.workload.length).toBe(state.people.length)
    expect(chat.mock.calls[0][0].system).toMatch(/ONE short question/)
  })
})
