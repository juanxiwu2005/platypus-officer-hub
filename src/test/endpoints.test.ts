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
import { aiSnapshot } from "../lib/aiContext"

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
  it("/api/chat sends the officer's club data and the shared pool, minus secrets, and keeps only known dates", async () => {
    chat.mockResolvedValue({ data: { cards: [{ kind: "text", text: "USG is due 2026-10-30, not 2026-12-25." }] }, model: "mock", provider: "mock" })
    const data = aiSnapshot(state) as Record<string, unknown>
    data.apiKey = "sk-should-not-pass"
    const usg = state.nodes.find(n => n.id === "e-night:usg")!
    const r = await (await chatFn(request({ message: "What should I focus on?", context: commandContext(state), data }, "/api/chat"))).json()
    const sent = JSON.parse(chat.mock.calls[0][0].user)
    expect(sent.clubData.tasks.length).toBe(state.nodes.length)
    expect(sent.sharedPool.approvalTimes.length).toBeGreaterThan(0)
    expect(JSON.stringify(sent)).not.toMatch(/sk-should-not-pass|demoLinkKey|dataUrl/)
    expect(chat.mock.calls[0][0].system).toMatch(/ONE short question/)
    expect(r.cards[0].text).toContain(usg.clubDeadline === "2026-10-30" ? "2026-10-30" : "[date in plan]")
    expect(r.cards[0].text).not.toContain("2026-12-25")
  })
  it("/api/chat keeps budget, partner and tag changes (ids for funding, contacts, roles and tags reach the server)", async () => {
    const f = state.funding[0], c = state.contacts[0]
    chat.mockResolvedValue({ data: { cards: [{ kind: "changes", ops: [{ op: "set_funding_amount", eventId: f.eventId, amount: 450 }, { op: "mark_contacted", contactId: c.id }, { op: "add_contact", name: "New Partner", organization: "X", relation: "Sponsor", ownerRoleId: state.roles[0].id, cadenceDays: 30 }] }, { kind: "changes", ops: [{ op: "set_funding_amount", eventId: "ghost", amount: 1 }] }] }, model: "mock", provider: "mock" })
    const r = await (await chatFn(request({ message: "Raise the budget to $450", context: commandContext(state) }, "/api/chat"))).json()
    expect(r.cards[0].ops.map((o: { op: string }) => o.op)).toEqual(["set_funding_amount", "mark_contacted", "add_contact"])
    expect(r.cards[1]).toMatchObject({ kind: "text" })
  })
})
