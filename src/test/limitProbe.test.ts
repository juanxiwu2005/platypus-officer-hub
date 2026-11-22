import { afterEach, describe, expect, it, vi } from "vitest"
import probe from "../../netlify/functions/limit-probe.mts"

// /api/limit-probe measures Netlify's real synchronous limit (docs/AI_SETUP.md). It must stay off unless AI_LIMIT_PROBE=on.
const get = (s: string) => probe(new Request(`https://example.org/api/limit-probe?s=${s}`))

afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers() })

describe("/api/limit-probe", () => {
  it("answers 404 unless AI_LIMIT_PROBE is exactly on", async () => {
    vi.stubEnv("AI_LIMIT_PROBE", "")
    expect((await get("1")).status).toBe(404)
    vi.stubEnv("AI_LIMIT_PROBE", "yes")
    expect((await get("1")).status).toBe(404)
  })

  it("rejects waits outside 1–58 seconds", async () => {
    vi.stubEnv("AI_LIMIT_PROBE", "on")
    for (const s of ["0", "59", "x", "1.5"]) expect((await get(s)).status).toBe(400)
  })

  it("waits the requested seconds and reports them", async () => {
    vi.stubEnv("AI_LIMIT_PROBE", "on")
    vi.useFakeTimers()
    const pending = get("2")
    await vi.advanceTimersByTimeAsync(2000)
    const res = await pending
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ waited: 2 })
  })
})
