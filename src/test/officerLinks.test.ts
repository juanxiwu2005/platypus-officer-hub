import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { webcrypto } from "node:crypto"
import { seedDemo } from "../data/seed"
import { reducer } from "../data/store"
import { grantToken, makeOfficerGrant, officerUrl, usableGrant, verifyOfficerGrant } from "../lib/officerLinks"
import { messageText, buildNudge } from "../lib/nudges"

beforeAll(() => vi.stubGlobal("crypto", webcrypto))
afterAll(() => vi.unstubAllGlobals())
async function issued() {
  const s = seedDemo()
  const grant = await makeOfficerGrant(s, "t-silence")
  return { grant, token: grantToken(grant), state: reducer(s, { type: "issueOfficerGrant", grant }) }
}
describe("signed, one-use local demo officer links", () => {
  it("signs and verifies a scoped grant; opening does not consume it or switch viewers", async () => {
    const { state, token, grant } = await issued()
    expect(await verifyOfficerGrant(state, token)).toBe(true)
    expect(usableGrant(state, token)).toBe(grant)
    expect(state.viewerId).toBe("alex")
    expect(grant.usedOn).toBeNull()
    expect(officerUrl("https://example.org", grant, "done")).toContain("/#/officer?token=")
  })
  it("rejects tampering, changed signing key, expiry, another browser and owner reassignment", async () => {
    const { state, token } = await issued()
    expect(await verifyOfficerGrant(state, token + "0")).toBe(false)
    expect(await verifyOfficerGrant({ ...state, demoLinkKey: "changed" }, token)).toBe(false)
    expect(usableGrant({ ...state, today: "2026-10-26" }, token)).toBeUndefined()
    expect(usableGrant(seedDemo(), token)).toBeUndefined()
    const reassigned = reducer(state, { type: "updateNode", id: "t-silence", patch: { ownerId: "maya" } })
    expect(usableGrant(reassigned, token)).toBeUndefined()
    const backAgain = reducer(reassigned, { type: "updateNode", id: "t-silence", patch: { ownerId: "jordan" } })
    expect(usableGrant(backAgain, token)).toBeUndefined()
  })
  it("one permitted update consumes the link; it cannot be replayed", async () => {
    const { state, token } = await issued()
    const action = { type: "officerAction", token, reply: "help" } as const
    const updated = reducer(state, action)
    expect(updated.nodes.find(n => n.id === "t-silence")!.status).toBe("blocked")
    expect(updated.officerGrants[0].usedOn).toBe(state.today)
    expect(reducer(updated, action)).toBe(updated)
    expect(updated.viewerId).toBe("alex")
  })
  it("invalid waiting/extension payload does not consume a valid link", async () => {
    const { state, token } = await issued()
    expect(reducer(state, { type: "officerAction", token, reply: "extension", input: { requestedDate: "2026-11-20" } })).toBe(state)
    expect(reducer(state, { type: "officerAction", token, reply: "waiting", input: {} })).toBe(state)
    expect(await verifyOfficerGrant(state, token)).toBe(true)
  })
  it("ordinary officers cannot mint grants for someone else's task; all message status choices share one grant", async () => {
    const { state, grant } = await issued()
    const officer = { ...state, viewerId: "maya", officerGrants: [] }
    expect(reducer(officer, { type: "issueOfficerGrant", grant })).toBe(officer)
    const n = state.nodes.find(n => n.id === "t-silence")!
    const msg = messageText(buildNudge(state, n), "https://example.org", n.id, grant)
    expect(msg.match(/officer\?token=/g)).toHaveLength(5)
    expect(msg).toContain("reply=extension")
    expect(msg).not.toContain("demoLinkKey")
  })
})
