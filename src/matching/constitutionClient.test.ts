import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ chat: vi.fn(), getStore: vi.fn() }))
vi.mock("../../netlify/lib/ai.mts", async original => ({ ...await original<object>(), chatJSON: mocks.chat }))
vi.mock("@netlify/blobs", () => ({ getStore: mocks.getStore }))

import constitutionFunction from "../../netlify/functions/constitution.mts"
import { AIError } from "../../netlify/lib/ai.mts"
import { resetRateLimit } from "../../netlify/lib/http.mts"
import { sanitizeMatchingProposals } from "../../netlify/lib/matching/constitution.mts"
import { extractMatchingResponsibilities, validateMatchingExtractionRequest, validateMatchingExtractionResponse } from "./constitutionClient"
import type { MatchingExtractionRequest, MatchingExtractionResponse } from "./setupContracts"

const request = (): MatchingExtractionRequest => ({
  part: "responsibilities", requestId: "fictional-read-one", sourceId: "fictional-constitution",
  text: "The Sensor Lab stewards test and calibrate the robot sensors. The Documentation Circle maintains the club handbook.",
  roles: [{ id: "sensors", title: "Sensor Lab Stewards" }, { id: "docs", title: "Documentation Circle" }],
  existingResponsibilities: [],
})
const item = (patch: Record<string, unknown> = {}) => ({
  title: "Sensor calibration", description: "Test and calibrate the robot sensors.", deliverable: "A calibrated sensor assembly.",
  exclusions: ["Firmware release approval"], requiredQualificationIds: [], roleIds: ["sensors"],
  quote: "The Sensor Lab stewards test and calibrate the robot sensors.", ...patch,
})
const response = (input = request()): MatchingExtractionResponse => sanitizeMatchingProposals({ proposals: [item()], warnings: [] }, input)
const post = (body: unknown) => constitutionFunction(new Request("https://prototype.example/api/setup/constitution", { method: "POST", body: JSON.stringify(body) }))
let rows: Map<string, unknown>
let writes: { key: string; value: unknown }[]

beforeEach(() => {
  rows = new Map(); writes = []
  mocks.getStore.mockImplementation(() => ({
    async get(key: string) { return rows.get(key) ?? null },
    async setJSON(key: string, value: unknown, options?: { onlyIfNew?: boolean }) {
      if (options?.onlyIfNew && rows.has(key)) return { modified: false }
      const saved = structuredClone(value)
      rows.set(key, saved); writes.push({ key, value: saved })
      return { modified: true, etag: `etag-${writes.length}` }
    },
  }))
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); mocks.chat.mockReset(); mocks.getStore.mockReset(); resetRateLimit() })

describe("responsibility extraction boundaries", () => {
  it("allows arbitrary positions, general duties and exact source quotations", () => {
    const parsed = sanitizeMatchingProposals({ proposals: [item(), item({ title: "Handbook maintenance", roleIds: [], quote: "The Documentation Circle maintains the club handbook." })] }, request())
    expect(parsed.proposals).toHaveLength(2)
    expect(parsed.proposals[0]).toMatchObject({ roleIds: ["sensors"], source: { sourceId: request().sourceId, verified: true, kind: "constitution" } })
    expect(parsed.proposals[1].roleIds).toEqual([])
    expect(parsed.warnings.join(" ")).toMatch(/does not prove complete coverage/)
  })

  it("downgrades invented or absent quotes, never marking them as constitution facts", () => {
    const parsed = sanitizeMatchingProposals({ proposals: [item({ quote: "This sentence was never in the constitution." }), item({ title: "Lab coordination", quote: "" })] }, request())
    expect(parsed.proposals.every(proposal => !proposal.source.verified && proposal.source.kind === "suggestion" && proposal.source.quote === "")).toBe(true)
    expect(parsed.warnings.some(warning => warning.includes("no verified quotation"))).toBe(true)
  })

  it("rejects invalid items independently and preserves valid ones with warnings", () => {
    const parsed = sanitizeMatchingProposals({ proposals: [item(), item({ title: "Unknown role", roleIds: ["president"] }), { title: "No deliverable" }] }, request())
    expect(parsed.proposals).toHaveLength(1)
    expect(parsed.warnings.filter(warning => warning.includes("was rejected"))).toHaveLength(2)
  })

  it("does not repeat existing human responsibilities or duplicate returned titles", () => {
    const input = request()
    input.existingResponsibilities = [{ id: "human-duty", title: "Sensor calibration", description: "Manually written", deliverable: "Human-defined outcome" }]
    const parsed = sanitizeMatchingProposals({ proposals: [item(), item({ title: "Other duty" }), item({ title: "OTHER DUTY" })] }, input)
    expect(parsed.proposals.map(proposal => proposal.title)).toEqual(["Other duty"])
    expect(input.existingResponsibilities[0].description).toBe("Manually written")
  })

  it("restricts partial retries to their selected positions, with empty selection meaning general only", () => {
    const selected = { ...request(), targetRoleIds: ["docs"] }
    const parsed = sanitizeMatchingProposals({ proposals: [item(), item({ title: "General maintenance", roleIds: [], quote: "" })] }, selected)
    expect(parsed.proposals.map(proposal => proposal.title)).toEqual(["General maintenance"])
    expect(sanitizeMatchingProposals({ proposals: [item()] }, { ...request(), targetRoleIds: [] }).proposals).toEqual([])
  })

  it("removes invented dates and contacts from generated prose", () => {
    const parsed = sanitizeMatchingProposals({ proposals: [item({ description: "Contact robot@example.org and prepare by 2027-04-16.", exclusions: ["Send to team@example.org by 2027-04-16"] })] }, request())
    expect(parsed.proposals[0].description).not.toMatch(/example.org|2027-04-16/)
    expect(parsed.proposals[0].exclusions[0]).not.toMatch(/example.org|2027-04-16/)
  })

  it("rejects a malformed response instead of inventing a missing list", () => {
    expect(() => sanitizeMatchingProposals({ duties: [item()] }, request())).toThrow(/did not return/)
  })

  it("rejects duplicated or unknown request identities before sending anything", () => {
    for (const input of [
      { ...request(), roles: [request().roles[0], request().roles[0]] },
      { ...request(), targetRoleIds: ["unknown"] },
      { ...request(), text: "short" },
      { ...request(), text: "a".repeat(60_001) },
      { ...request(), unexpected: true },
    ]) expect(() => validateMatchingExtractionRequest(input)).toThrow()
  })

  it("rechecks untrusted reply IDs, source IDs and requested position scope in the client", () => {
    const valid = response()
    expect(validateMatchingExtractionResponse(valid, request())).toEqual(valid)
    for (const invalid of [
      { ...valid, requestId: "another-reading" },
      { ...valid, sourceId: "another-source" },
      { ...valid, proposals: [...valid.proposals, valid.proposals[0]] },
      { ...valid, proposals: [{ ...valid.proposals[0], roleIds: ["unknown"] }] },
      { ...valid, proposals: [{ ...valid.proposals[0], source: { ...valid.proposals[0].source, sourceId: "foreign" } }] },
    ]) expect(() => validateMatchingExtractionResponse(invalid, request())).toThrow()
  })

  it("downgrades a cached or forged citation that fails exact source matching", () => {
    const valid = response()
    const parsed = validateMatchingExtractionResponse({ ...valid, proposals: [{ ...valid.proposals[0], source: { ...valid.proposals[0].source, quote: "Not a source quotation" } }] }, request())
    expect(parsed.proposals[0].source).toMatchObject({ kind: "suggestion", verified: false })
    expect(parsed.warnings.join(" ")).toMatch(/could not be verified/)
  })
})

describe("constitution endpoint: private archived responsibility suggestions", () => {
  const arrangeSuccess = () => mocks.chat.mockImplementation(async args => {
    expect(writes[0].key).toMatch(/\/input$/)
    expect((writes[0].value as { at: string }).at).toMatch(/^\d{4}-/)
    await args.onResponse({ rawReply: JSON.stringify({ proposals: [item()] }), finishReason: "stop", outputChars: 200, durationMs: 100, model: "mock-air" })
    expect(writes.some(write => write.key.includes("/transport/"))).toBe(true)
    return { data: { proposals: [item()] }, model: "mock-air", provider: "asu-air" }
  })

  it("archives input before inference and raw transport before returning checked suggestions", async () => {
    arrangeSuccess()
    const result = await post(request())
    expect(result.status).toBe(200)
    const output = await result.json()
    expect(output).toMatchObject({ part: "responsibilities", requestId: request().requestId, model: "mock-air" })
    expect(output.proposals[0].source.verified).toBe(true)
    expect(writes.map(write => write.key.replace(/^reads\/[^/]+\//, ""))).toEqual(["input", expect.stringMatching(/^transport\//), "result"])
    const prompt = mocks.chat.mock.calls[0][0]
    expect(prompt.task).toBe("constitution_read")
    expect(prompt.user).toContain("matching-responsibilities-v1")
    expect(prompt.system).not.toContain("fnForRole")
  })

  it("reuses a completed identical request without another paid call", async () => {
    arrangeSuccess()
    const first = await post(request()), second = await post(request())
    expect(await second.json()).toEqual(await first.json())
    expect(mocks.chat).toHaveBeenCalledTimes(1)
    expect(writes).toHaveLength(3)
  })

  it("refuses reuse of a request ID with changed input without overwriting history", async () => {
    arrangeSuccess(); await post(request())
    const before = [...rows.entries()]
    const result = await post({ ...request(), text: request().text + " Additional policy text." })
    expect(result.status).toBe(409)
    expect(mocks.chat).toHaveBeenCalledTimes(1)
    expect([...rows.entries()]).toEqual(before)
  })

  it("uses the atomic input claim to reject a simultaneous request", async () => {
    let release: (() => void) | undefined
    const waiting = new Promise<void>(resolve => { release = resolve })
    mocks.chat.mockImplementation(async args => { await waiting; await args.onResponse({ rawReply: "{}" }); return { data: { proposals: [] }, model: "mock", provider: "mock" } })
    const first = post(request())
    await vi.waitFor(() => expect(mocks.chat).toHaveBeenCalledTimes(1))
    const second = await post(request())
    expect(second.status).toBe(409)
    release!(); expect((await first).status).toBe(200)
    expect(mocks.chat).toHaveBeenCalledTimes(1)
  })

  it("does not call the model when the input cannot be archived", async () => {
    mocks.getStore.mockImplementation(() => { throw new Error("No blob context") })
    const result = await post(request())
    expect(result.status).toBe(503)
    expect((await result.json()).message).toMatch(/No new AI call was started/)
    expect(mocks.chat).not.toHaveBeenCalled()
  })

  it("retains raw invalid JSON and failure outcome without a second generation", async () => {
    mocks.chat.mockImplementation(async args => { await args.onResponse({ rawReply: "{truncated", finishReason: "length" }); throw new AIError("bad_json", "Output incomplete") })
    const result = await post(request())
    expect(result.status).toBe(502)
    expect([...rows.values()].some(value => (value as { observation?: { rawReply: string } }).observation?.rawReply === "{truncated")).toBe(true)
    expect([...rows.values()].some(value => (value as { status?: string }).status === "failed")).toBe(true)
    expect((await post(request())).status).toBe(409)
    expect(mocks.chat).toHaveBeenCalledTimes(1)
  })

  it("refuses to present an unarchived raw reply as a successful reading", async () => {
    const normalStore = mocks.getStore.getMockImplementation()!
    mocks.getStore.mockImplementation(() => {
      const normal = normalStore()
      return { ...normal, async setJSON(key: string, value: unknown, options: { onlyIfNew?: boolean }) { if (key.includes("/transport/")) throw new Error("Storage full"); return normal.setJSON(key, value, options) } }
    })
    mocks.chat.mockImplementation(async args => { await args.onResponse({ rawReply: "saved nowhere" }); return { data: { proposals: [item()] } } })
    const result = await post(request())
    expect(result.status).toBe(503)
    expect((await result.json()).message).toMatch(/raw AI reply could not be archived/)
    expect(writes).toHaveLength(1)
    expect((await post(request())).status).toBe(409)
  })

  it("redacts contacts before archival/inference and refuses credentials before any storage or inference", async () => {
    arrangeSuccess()
    expect((await post({ ...request(), text: request().text + " Contact robot@example.org." })).status).toBe(200)
    expect(JSON.stringify(writes[0].value)).not.toContain("robot@example.org")
    expect(mocks.chat.mock.calls[0][0].user).not.toContain("robot@example.org")
    const count = writes.length
    expect((await post({ ...request(), requestId: "secret-read", text: "A fictional club document with password=example-do-not-send" })).status).toBe(400)
    expect(writes).toHaveLength(count)
    expect(mocks.chat).toHaveBeenCalledTimes(1)
  })

  it("rejects bad target positions and malformed fields before storage", async () => {
    expect((await post({ ...request(), targetRoleIds: ["missing"] })).status).toBe(400)
    expect((await post({ ...request(), roles: "bad" })).status).toBe(400)
    expect(mocks.getStore).not.toHaveBeenCalled()
    expect(mocks.chat).not.toHaveBeenCalled()
  })

  it("keeps legacy structure and duties requests independent from the new archive", async () => {
    mocks.chat.mockResolvedValue({ data: { roles: [{ title: "President" }], mission: null, notes: [] }, model: "mock", provider: "mock" })
    expect((await post({ text: request().text, part: "structure" })).status).toBe(200)
    mocks.chat.mockResolvedValue({ data: { items: [{ name: "Sensor Lab Stewards", duties: "Test and calibrate sensors." }] }, model: "mock", provider: "mock" })
    const duties = await post({ text: request().text, part: "duties", items: [{ name: "Sensor Lab Stewards" }] })
    expect(await duties.json()).toMatchObject({ part: "duties", items: [{ name: "sensor lab stewards", duties: "Test and calibrate sensors." }] })
    expect(mocks.getStore).not.toHaveBeenCalled()
  })
})

describe("one explicit client reading", () => {
  it("posts exactly once to the existing endpoint with a cancellation signal", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(response())))
    vi.stubGlobal("fetch", fetcher)
    expect((await extractMatchingResponsibilities(request())).proposals).toHaveLength(1)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher.mock.calls[0][0]).toBe("/api/setup/constitution")
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual(request())
    expect(fetcher.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal)
  })

  it("returns a useful HTTP error without retrying or falling back to unrelated results", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "Reading already in progress" }), { status: 409 }))
    vi.stubGlobal("fetch", fetcher)
    await expect(extractMatchingResponsibilities(request())).rejects.toThrow("Reading already in progress")
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it("supports stop before and during a request", async () => {
    const controller = new AbortController(); controller.abort()
    const fetcher = vi.fn()
    vi.stubGlobal("fetch", fetcher)
    await expect(extractMatchingResponsibilities(request(), { signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" })
    expect(fetcher).not.toHaveBeenCalled()
    const live = new AbortController()
    fetcher.mockImplementation((_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener("abort", () => reject(new DOMException("Stopped", "AbortError")))))
    const reading = extractMatchingResponsibilities(request(), { signal: live.signal })
    live.abort()
    await expect(reading).rejects.toMatchObject({ name: "AbortError" })
  })

  it("bounds waiting and explains timeout without an automatic second paid request", async () => {
    vi.useFakeTimers()
    const fetcher = vi.fn().mockImplementation((_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener("abort", () => reject(new DOMException("Timed out", "AbortError")))))
    vi.stubGlobal("fetch", fetcher)
    const reading = expect(extractMatchingResponsibilities(request())).rejects.toThrow(/took too long/)
    await vi.advanceTimersByTimeAsync(40_001)
    await reading
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it("handles malformed transport and network failures while preserving manual fallback", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response("<html>not JSON</html>")).mockRejectedValueOnce(new TypeError("Offline"))
    vi.stubGlobal("fetch", fetcher)
    await expect(extractMatchingResponsibilities(request())).rejects.toThrow(/unreadable/)
    await expect(extractMatchingResponsibilities(request())).rejects.toThrow(/continue manually/)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
