import { describe, expect, it } from "vitest"
import type { MatchingExtractionResponse, MatchingSetupDocument, MatchingSetupInitial } from "./setupContracts"
import type { MatchingStorage } from "./contracts"
import {
  beginSetupRead, commandSetup, createSetupDocument, decideSetupProposal, finishSetupRead,
  isSetupReadCurrent, loadSetupDocument, parseSetupDocument, referenceSetup, saveSetupDocument,
  setupStorageKey, sourceSetup,
} from "./setupWorkspace"

const initial: MatchingSetupInitial = {
  contextKey: "fictional-club-roster-v1",
  references: { organizationId: "legacy-club", roles: [{ id: "robotics", title: "Robot Builders" }], members: [{ id: "demo-alex", name: "Demo Alex", active: true, availability: "unknown", qualifications: {} }] },
  memberships: [{ id: "roster-alex", roleId: "robotics", memberId: "demo-alex", confirmed: true }],
}
const source = { name: "Fictional constitution", text: "Robot Builders maintain the robots. They also test the firmware before demonstrations." }
const actor = "demo-alex"
function memory(): MatchingStorage & { values: Map<string, string> } {
  const values = new Map<string, string>()
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value) } }
}
function response(document: MatchingSetupDocument): MatchingExtractionResponse {
  const read = document.reads.at(-1)!
  return { part: "responsibilities", requestId: read.id, sourceId: read.request.sourceId, warnings: [], proposals: ["Robot maintenance", "Firmware tests"].map((title, index) => ({
    id: `proposal-${index}`, title, description: `Deliver ${title.toLowerCase()}.`, deliverable: "An inspected robot.", exclusions: [], requiredQualificationIds: [], roleIds: ["robotics"],
    source: { kind: "constitution" as const, sourceId: read.request.sourceId, quote: "Robot Builders maintain the robots.", verified: true },
  })) }
}
function completed() {
  const pending = beginSetupRead(createSetupDocument(initial), source, actor)
  return finishSetupRead(pending, pending.reads[0].id, actor, { response: response(pending) })
}

describe("stage 2 setup keeps human decisions and source provenance", () => {
  it("takes an isolated team snapshot without editing the input roster", () => {
    const before = JSON.stringify(initial), document = createSetupDocument(initial)
    expect(document.id).not.toBe(initial.references.organizationId)
    expect(document.matching.organizationId).toBe(document.references.organizationId)
    expect(document.references.members[0].availability).toBe("unknown")
    expect(document.matching.memberships).toEqual(initial.memberships)
    expect(JSON.stringify(initial)).toBe(before)
  })

  it("archives the exact request before an AI result exists, with explicit subset and no fabricated approval", () => {
    const pending = beginSetupRead(createSetupDocument(initial), source, actor, ["robotics"])
    expect(pending.source).toEqual(source)
    expect(pending.reads[0]).toMatchObject({ status: "pending", actorId: actor, response: null, request: { text: source.text, targetRoleIds: ["robotics"] } })
    expect(pending.matching.responsibilities).toEqual([])
  })

  it("adopts multiple proposals from one batch independently as unconfirmed drafts exactly once", () => {
    let document = completed()
    const read = document.reads[0]
    document = decideSetupProposal(document, read.id, "proposal-0", "accepted", actor)
    expect(isSetupReadCurrent(document, read.id)).toBe(true)
    document = decideSetupProposal(document, read.id, "proposal-1", "accepted", actor)
    expect(document.matching.responsibilities).toHaveLength(2)
    expect(document.matching.responsibilities.every(r => r.status === "draft" && r.origin === "ai")).toBe(true)
    expect(document.matching.roleResponsibilities.every(r => !r.confirmed)).toBe(true)
    expect(decideSetupProposal(document, read.id, "proposal-0", "accepted", actor)).toBe(document)
    expect(document.reads[0].request.text).toBe(source.text)
  })

  it("records rejected proposals without altering responsibilities", () => {
    const document = completed(), next = decideSetupProposal(document, document.reads[0].id, "proposal-0", "rejected", actor)
    expect(next.matching).toEqual(document.matching)
    expect(next.decisions[0]).toMatchObject({ decision: "rejected", responsibilityId: null, actorId: actor })
  })

  it("lets confirmation preserve a batch but marks remaining proposals stale after an adopted sibling is edited or archived", () => {
    let document = completed()
    const readId = document.reads[0].id
    document = decideSetupProposal(document, readId, "proposal-0", "accepted", actor)
    const id = document.decisions[0].responsibilityId!
    const confirmed = commandSetup(document, [{ type: "responsibility.confirm", id }], actor)
    expect(confirmed.reads[0].status).toBe("completed")
    expect(isSetupReadCurrent(confirmed, readId)).toBe(true)
    for (const next of [commandSetup(confirmed, [{ type: "responsibility.update", id, patch: { description: "A different human-defined scope." } }], actor), commandSetup(confirmed, [{ type: "responsibility.archive", id }], actor)]) {
      expect(next.reads[0].status).toBe("stale")
      expect(() => decideSetupProposal(next, readId, "proposal-1", "accepted", actor)).toThrow(/outdated/)
    }
  })

  it("makes old suggestions stale after manual content or position changes, while preserving the response", () => {
    const document = completed()
    for (const next of [sourceSetup(document, { ...source, text: source.text + " Revised rules." }, actor), referenceSetup(document, { ...document.references, roles: [{ id: "robotics", title: "Embedded Builders" }] }, actor)]) {
      expect(next.reads[0].status).toBe("stale")
      expect(next.reads[0].response).toEqual(document.reads[0].response)
      expect(() => decideSetupProposal(next, document.reads[0].id, "proposal-0", "accepted", actor)).toThrow(/outdated/)
    }
  })

  it("does not let a late response become adoptable after source edits or an explicit stop", () => {
    const pending = beginSetupRead(createSetupDocument(initial), source, actor), read = pending.reads[0], result = response(pending)
    const edited = sourceSetup(pending, { ...source, text: source.text + " Updated." }, actor)
    expect(finishSetupRead(edited, read.id, actor, { response: result }).reads[0].status).toBe("stale")
    const stopped = finishSetupRead(pending, read.id, actor, { status: "stopped", message: "Stopped waiting." })
    expect(finishSetupRead(stopped, read.id, actor, { response: result }).reads[0].status).toBe("stale")
  })

  it("does not replace or clear manual confirmed responsibilities when a reading is adopted", () => {
    let document = createSetupDocument(initial)
    document = commandSetup(document, [{ type: "responsibility.create", value: { id: "manual", title: "Lab inspection", description: "Inspect safety equipment.", deliverable: "An inspection log.", exclusions: [], requiredQualificationIds: [], origin: "manual", sources: [{ kind: "manual", sourceId: "club-discussion" }] } }, { type: "responsibility.confirm", id: "manual" }], actor)
    const manual = structuredClone(document.matching.responsibilities[0])
    document = beginSetupRead(document, source, actor)
    document = finishSetupRead(document, document.reads[0].id, actor, { response: response(document) })
    document = decideSetupProposal(document, document.reads[0].id, "proposal-0", "accepted", actor)
    expect(document.matching.responsibilities.find(r => r.id === "manual")).toEqual(manual)
  })

  it("refuses the whole command group if any relationship is invalid", () => {
    const document = createSetupDocument(initial), raw = JSON.stringify(document)
    expect(() => commandSetup(document, [
      { type: "membership.upsert", value: { id: "additional", roleId: "robotics", memberId: "demo-alex", confirmed: false } },
      { type: "membership.upsert", value: { id: "missing", roleId: "missing", memberId: "demo-alex", confirmed: true } },
    ], actor)).toThrow()
    expect(JSON.stringify(document)).toBe(raw)
  })

  it("refuses forged verified citations, wrong response identities and unknown proposal roles on recovery", () => {
    const document = completed()
    for (const mutate of [
      (d: MatchingSetupDocument) => { d.reads[0].response!.sourceId = "another-document" },
      (d: MatchingSetupDocument) => { d.reads[0].response!.proposals[0].source.quote = "This sentence never appeared." },
      (d: MatchingSetupDocument) => { d.reads[0].response!.proposals[0].roleIds = ["missing-role"] },
    ]) {
      const value = structuredClone(document); mutate(value)
      expect(() => parseSetupDocument(value)).toThrow()
    }
  })
})

describe("stage 2 preview storage preserves raw data and refuses stale writers", () => {
  it("round-trips requests, results, decisions and history under a context-specific side key", () => {
    const store = memory(), document = completed()
    saveSetupDocument(store, document, null)
    const loaded = loadSetupDocument(store, initial)
    expect(loaded.document).toEqual(document)
    expect(store.values.has("platypus.v1.demo")).toBe(false)
    expect(setupStorageKey(initial.contextKey)).not.toBe(setupStorageKey("different-team"))
  })

  it.each(["{broken", JSON.stringify({ version: 99 }), JSON.stringify({ version: 1, id: "incomplete" })])("keeps invalid or future preview data unchanged: %s", raw => {
    const store = memory(), key = setupStorageKey(initial.contextKey)
    store.values.set(key, raw)
    expect(loadSetupDocument(store, initial)).toMatchObject({ document: null, raw })
    expect(() => saveSetupDocument(store, createSetupDocument(initial), null)).toThrow()
    expect(store.values.get(key)).toBe(raw)
  })

  it("refuses a stale revision without overwriting a different tab's edits", () => {
    const store = memory(), original = createSetupDocument(initial)
    saveSetupDocument(store, original, null)
    const first = sourceSetup(original, source, actor)
    saveSetupDocument(store, first, 0)
    const stale = sourceSetup(original, { ...source, name: "Other tab" }, actor)
    expect(() => saveSetupDocument(store, stale, 0)).toThrow(/another tab/)
    expect(loadSetupDocument(store, initial).document).toEqual(first)
  })

  it("surfaces blocked storage without substituting a demo or losing the caller's draft", () => {
    const blocked: MatchingStorage = { getItem() { throw new Error("blocked") }, setItem() { throw new Error("blocked") } }
    expect(loadSetupDocument(blocked, initial).document).toBeNull()
    const draft = completed(), before = JSON.stringify(draft)
    expect(() => saveSetupDocument(blocked, draft, null)).toThrow()
    expect(JSON.stringify(draft)).toBe(before)
  })
})
