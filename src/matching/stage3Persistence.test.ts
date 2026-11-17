import { afterEach, describe, expect, it, vi } from "vitest"
import type { DemoState } from "../data/types"
import type { MatchingState } from "./contracts"
import { seedDemo } from "../data/seed"
import { buildExport, loadStateWithNotice, reducer, saveState, STORAGE_KEY } from "../data/store"
import { clubDraft } from "../data/settings"
import { importOrganizationMatching, organizationSetupDocument, saveOrganizationSetup } from "./organizationMatching"
import { commandSetup, createSetupDocument, sourceSetup } from "./setupWorkspace"
import { matchingSetupContext } from "./setupContext"
import { stage3Club, stage3CreateEvent, STAGE3_EVENT_DATE, STAGE3_EVENT_OP } from "./stage3Fixtures"

afterEach(() => { localStorage.clear(); vi.restoreAllMocks() })
const preserved = (state: DemoState) => ({ orgName: state.org.name, people: state.people, roles: state.roles, events: state.events, nodes: state.nodes, nudges: state.nudges, handoff: state.handoff, handoffRoles: state.handoffRoles, changes: state.changeSets })

function currentTeamPreview(state = seedDemo(undefined, "v2")) {
  let document = createSetupDocument({
    contextKey: matchingSetupContext(state),
    references: { organizationId: state.org.id, roles: state.roles.map(r => ({ id: r.id, title: r.displayName })), members: state.people.map(p => ({ id: p.id, name: p.name, active: true, availability: "unknown" as const, qualifications: {} })) },
    memberships: state.people.map(p => ({ id: `preview-${p.id}`, roleId: p.roleId, memberId: p.id, confirmed: true })),
  })
  document = commandSetup(document, [{ type: "responsibility.create", value: { id: "preview-duty", title: "Custom laboratory inspection", description: "Inspect fictional laboratory equipment.", deliverable: "A signed inspection record.", exclusions: [], requiredQualificationIds: [], origin: "manual", sources: [{ kind: "manual", sourceId: "fictional-preview-discussion" }] } }, { type: "responsibility.confirm", id: "preview-duty" }], state.viewerId)
  return document
}

describe("stage 3: canonical organization configuration", () => {
  it("enables matching without creating old assignment receipts or modifying existing work", () => {
    const old = seedDemo(undefined, "v2"), state = reducer(old, { type: "matchingInitialize" })
    expect(state.org.settings.matchingMode).toBe("responsibilities")
    expect(state.org.matchingWorkspaceId).toBe(state.matching!.organizationId)
    expect(state.matching!.assignments).toEqual([])
    expect(preserved(state)).toEqual(preserved(old))
    expect(state.matchingContext!.setup).not.toHaveProperty("matching")
    expect(state.matchingContext!.setup).not.toHaveProperty("references")
  })

  it("imports a reviewed current-team preview without changing actual people, roles, tasks or historical owners", () => {
    const old = seedDemo(undefined, "v2"), preview = currentTeamPreview(old)
    const state = reducer(old, { type: "matchingImport", preview })
    expect(state.matching!.responsibilities.find(r => r.id === "preview-duty")).toMatchObject({ title: "Custom laboratory inspection", status: "confirmed" })
    expect(state.matchingContext!.importedPreviewId).toBe(preview.id)
    expect(preserved(state)).toEqual(preserved(old))
    const twice = importOrganizationMatching(state, preview)
    expect(twice.matching!.responsibilities).toEqual(state.matching!.responsibilities)
    expect(twice.matching!.assignments).toEqual([])
  })

  it("refuses a foreign preview scope or unknown member instead of adopting the 12-person example silently", () => {
    const state = seedDemo(undefined, "v2"), preview = currentTeamPreview(state), before = JSON.stringify(state)
    const foreign = { ...preview, contextKey: "another-organization-snapshot" }
    const unknown = structuredClone(preview)
    unknown.references.members.push({ id: "foreign-person", name: "Fictional foreign member", active: true, availability: "available", qualifications: {} })
    expect(() => importOrganizationMatching(state, foreign)).toThrow()
    expect(() => importOrganizationMatching(state, unknown)).toThrow()
    expect(JSON.stringify(state)).toBe(before)
  })

  it("rejects stale setup saves and direct assignment-history rewriting", () => {
    let state = stage3Club()
    state = stage3CreateEvent(state, "persistence-event", { revision: state.matching!.revision, choices: { venue: { memberId: "maya" } } })
    const document = organizationSetupDocument(state)!
    const changed = sourceSetup(document, { name: "Human source", text: "Fictional updated operating policy." }, state.viewerId)
    expect(() => saveOrganizationSetup(state, changed, document.revision - 1)).toThrow()
    const forged = structuredClone(changed)
    forged.matching.assignments[0].memberId = "sam"
    expect(() => saveOrganizationSetup(state, forged, document.revision)).toThrow()
    expect(state.matching!.assignments[0].memberId).toBe("maya")
  })

  it("turns matching off while keeping the canonical graph, owners and receipt history", () => {
    let state = stage3Club()
    state = stage3CreateEvent(state, "disabled-history", { revision: state.matching!.revision, choices: { venue: { memberId: "maya" } } })
    const off = reducer(state, { type: "matchingMode", enabled: false })
    expect(off.org.settings.matchingMode).toBe("legacy")
    expect(off.matching).toEqual(state.matching)
    expect(off.matchingContext).toEqual(state.matchingContext)
    expect(off.nodes).toEqual(state.nodes)
    const legacy = stage3CreateEvent(off, "legacy-after-disable")
    expect(legacy.nodes.find(n => n.id === "legacy-after-disable:0:venue")!.ownerId).toBeTruthy()
    expect(legacy.matching!.assignments).toEqual(state.matching!.assignments)
  })

  it("does not give an ordinary member administrative access by granting them a responsibility", () => {
    const state = { ...stage3Club(), viewerId: "maya" }
    expect(reducer(state, { type: "matchingMode", enabled: false })).toBe(state)
    expect(reducer(state, { type: "matchingCommand", command: { type: "responsibility.archive", id: "fixture-space" } })).toBe(state)
    expect(state.matching!.responsibilities.find(r => r.id === "fixture-space")!.status).toBe("confirmed")
  })
})

describe("stage 3: migration, unreadable subconfiguration and recovery", () => {
  it("backs up an exact v22 save and upgrades without losing any organization history or rebuilding its graph", () => {
    const old = { ...seedDemo(undefined, "v2"), schemaVersion: 22 }
    const raw = JSON.stringify(old)
    localStorage.setItem(STORAGE_KEY, raw)
    const loaded = loadStateWithNotice()
    expect(loaded.state.schemaVersion).toBe(23)
    expect(preserved(loaded.state)).toEqual(preserved(old))
    const backup = Object.keys(localStorage).filter(key => key.startsWith(`${STORAGE_KEY}.backup.`)).map(key => localStorage.getItem(key))
    expect(backup).toContain(raw)
    const repeated = loadStateWithNotice()
    expect(repeated.state.nodes).toEqual(loaded.state.nodes)
    expect(repeated.state.people).toEqual(loaded.state.people)
    expect(repeated.notice?.kind).not.toBe("restored_demo")
  })

  it("does not upgrade or overwrite the source when its mandatory migration backup cannot be saved", () => {
    const old = { ...seedDemo(undefined, "v2"), schemaVersion: 22 }, raw = JSON.stringify(old)
    localStorage.setItem(STORAGE_KEY, raw)
    const write = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key: string, value: string) {
      if (key.startsWith(`${STORAGE_KEY}.backup.`)) throw new Error("Fictional backup write failure")
      return write.call(this, key, value)
    })
    const loaded = loadStateWithNotice()
    expect(loaded.state.schemaVersion).toBe(22)
    expect(preserved(loaded.state)).toEqual(preserved(old))
    expect(localStorage.getItem(STORAGE_KEY)).toBe(raw)
  })

  it.each([{ schemaVersion: 99, opaqueFutureField: ["keep me"] }, { schemaVersion: 1, responsibilities: "broken" }])("preserves an unsupported or corrupt matching subtree without resetting the old application: %o", bad => {
    const state = stage3Club()
    const damaged = { ...state, matching: bad as unknown as MatchingState }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(damaged))
    const loaded = loadStateWithNotice()
    expect(preserved(loaded.state)).toEqual(preserved(state))
    expect(loaded.state.org.settings.matchingMode).toBe("responsibilities")
    expect(loaded.state.matching).toEqual(bad)
    expect(loaded.notice?.kind).not.toBe("restored_demo")
    const created = stage3CreateEvent(loaded.state, "bad-config-event")
    const added = created.nodes.filter(n => n.eventId === "bad-config-event:0")
    expect(added.length).toBeGreaterThan(20)
    expect(added.every(n => n.ownerId === null)).toBe(true)
    expect(saveState(loaded.state)).toBe(true)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).matching).toEqual(bad)
  })

  it("exports and restores the matching configuration and exact confirmed receipt alongside actual task ownership", () => {
    let state = stage3Club()
    state = stage3CreateEvent(state, "export-event", { revision: state.matching!.revision, choices: { venue: { memberId: "maya" } } })
    const exported = buildExport(state, [], Date.UTC(2026, 10, 17))
    const restored = reducer(seedDemo(undefined, "v2"), { type: "replace", state: exported.state as DemoState })
    expect(restored.matching).toEqual(state.matching)
    expect(restored.matchingContext).toEqual(state.matchingContext)
    expect(restored.nodes.find(n => n.id === "export-event:0:venue")!.ownerId).toBe("maya")
    expect(saveState(restored)).toBe(true)
    const loaded = loadStateWithNotice()
    expect(loaded.state.matching!.assignments).toEqual(state.matching!.assignments)
    expect(loaded.state.nodes.find(n => n.id === "export-event:0:venue")!.ownerId).toBe("maya")
  })

  it("gives a newly completed setup a fresh matching identity rather than inheriting old receipts under reused task IDs", () => {
    let old = stage3Club()
    old = stage3CreateEvent(old, "old-organization", { revision: old.matching!.revision, choices: { venue: { memberId: "maya" } } })
    const draft = clubDraft(old)
    draft.name = "Fictional New Robotics Club"
    const next = reducer(old, { type: "completeSetup", draft, event: STAGE3_EVENT_OP, date: STAGE3_EVENT_DATE, inviteCode: crypto.randomUUID() })
    expect(next.org.name).toBe(draft.name)
    expect(next.org.matchingWorkspaceId).not.toBe(old.org.matchingWorkspaceId)
    expect(next.matching?.assignments ?? []).toEqual([])
    expect(next.nodes.some(n => n.id === "old-organization:0:venue")).toBe(false)
  })
})
