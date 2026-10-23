import { afterEach, describe, expect, it, vi } from "vitest"
const chat = vi.hoisted(() => vi.fn())
vi.mock("../../netlify/lib/ai.mts", async importOriginal => ({ ...await importOriginal<object>(), chatJSON: chat }))
import command from "../../netlify/functions/command.mts"
import nudge from "../../netlify/functions/nudge-draft.mts"
import parseBrief from "../../netlify/functions/parse-brief.mts"
import { seedDemo } from "../data/seed"
import { commandContext } from "../lib/commands"
import { nudgeCheck } from "../lib/nudges"

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
})
