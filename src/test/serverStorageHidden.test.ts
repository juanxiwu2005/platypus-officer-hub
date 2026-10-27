import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Every storage call goes through @netlify/blobs getStore. Count it; nothing below may reach it while hidden.
vi.mock("@netlify/blobs", () => ({ getStore: vi.fn(() => { throw new Error("storage touched") }) }))
import { getStore } from "@netlify/blobs"
import orgSetup from "../../netlify/functions/org-setup.mts"
import orgArchive from "../../netlify/functions/org-archive.mts"
import orgAi from "../../netlify/functions/org-ai.mts"
import orgAiRun from "../../netlify/functions/org-ai-run-background.mts"
import workspace from "../../netlify/functions/workspace.mts"
import workspaceAssistant from "../../netlify/functions/workspace-assistant.mts"
import workspaceAssistantRun from "../../netlify/functions/workspace-assistant-run-background.mts"
import health from "../../netlify/functions/health.mts"
import { resetRateLimit } from "../../netlify/lib/http.mts"

// A request that would pass every other check: same origin, the setup header, a well-formed session cookie.
const SESSION = "platypus_org_setup_v2=" + "a".repeat(64)
const req = (path: string, method: "GET" | "POST", body?: unknown) => new Request(`https://example.org${path}`, {
  method, headers: { cookie: SESSION, origin: "https://example.org", "x-platypus-request": "organization-setup", "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}),
})
const ENDPOINTS: [string, (r: Request) => Promise<unknown>, string][] = [
  ["org-setup", orgSetup, "/api/org/setup"],
  ["org-archive", orgArchive, "/api/org/archive"],
  ["org-ai", orgAi as (r: Request) => Promise<unknown>, "/api/org/ai"],
  ["org-ai-run-background", orgAiRun, "/api/org/ai-run"],
  ["workspace", workspace, "/api/workspace"],
  ["workspace-assistant", workspaceAssistant as (r: Request) => Promise<unknown>, "/api/workspace/assistant"],
  ["workspace-assistant-run-background", workspaceAssistantRun, "/api/workspace/assistant-run"],
]

beforeEach(() => { vi.mocked(getStore).mockClear(); resetRateLimit() })
afterEach(() => vi.unstubAllEnvs())

describe("M1 · server storage is hidden unless ORG_SETUP_ENABLED=true", () => {
  for (const [name, handler, path] of ENDPOINTS) it(`${name} answers 404 and never touches storage`, async () => {
    for (const r of [req(path, "GET"), req(path, "POST", { action: "start", jobId: "j", stage: "constitution" })]) {
      const res = await handler(r) as Response
      expect(res.status).toBe(404)
    }
    expect(getStore).not.toHaveBeenCalled()
  })

  it("only the exact value true turns it on", async () => {
    for (const value of ["", "false", "1", "TRUE", "yes"]) {
      vi.stubEnv("ORG_SETUP_ENABLED", value)
      expect(((await orgSetup(req("/api/org/setup", "POST", { action: "start" }))) as Response).status).toBe(404)
    }
    expect(getStore).not.toHaveBeenCalled()
  })

  it("the AIR connection check does not open a session or archive anything", async () => {
    vi.stubGlobal("fetch", vi.fn())
    const body = await (await health(req("/api/health?check=1", "GET"))).json()
    expect(body.connection).toMatchObject({ ok: false })
    expect(getStore).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it("control: switched on, the same request does reach storage", async () => {
    vi.stubEnv("ORG_SETUP_ENABLED", "true")
    await orgSetup(req("/api/org/setup", "POST", { action: "start" })).catch(() => {})
    expect(getStore).toHaveBeenCalled()
  })
})
