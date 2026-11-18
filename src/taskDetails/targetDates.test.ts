import { webcrypto } from "node:crypto"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { suggestedTargetPeople } from "./targetPeople"
import { seedDemo } from "../data/seed"
import { buildExport, reducer } from "../data/store"
import { applySchedule } from "../engine/schedule"
import { taskTargetKey, targetImpact, type TaskTargetInput } from "./targetDates"
import { makeTaskAccessGrant, taskAccessToken } from "../reminders/taskAccess"
import { makeOfficerGrant, grantToken } from "../lib/officerLinks"
import type { DemoState, Node } from "../data/types"

beforeAll(() => vi.stubGlobal("crypto", webcrypto))
afterAll(() => vi.unstubAllGlobals())
function fixture(): DemoState {
  const s = seedDemo(undefined, "v2"), source = s.nodes.find(n => n.stepKey === "venue")!
  const base: Node = { ...source, id: "room", eventId: source.eventId, stepKey: "custom-room", ownerId: "jordan", ownerVersion: 0, status: "accepted", dependsOn: [], anchor: { kind: "fixed", official: "2027-05-01", club: "2027-03-31" }, clubDeadlineOverride: "2027-03-31", estDays: 1, timing: undefined }
  return applySchedule({ ...s, viewerId: "jordan", today: "2027-03-28", nodes: [base, { ...base, id: "sap", title: "Submit SAP", clubDeadlineOverride: "2027-04-02", ownerId: "sam", dependsOn: ["room"], anchor: { kind: "fixed", official: "2027-05-01", club: "2027-04-02" } }, { ...base, id: "publish", title: "Publish location", clubDeadlineOverride: "2027-04-05", ownerId: "sam", dependsOn: ["sap"], anchor: { kind: "fixed", official: "2027-05-01", club: "2027-04-05" } }, { ...base, id: "self", title: "Check the entrance", dependsOn: ["room"] }, { ...base, id: "unrelated", ownerId: "maya", dependsOn: [] }], events: s.events.filter(e => e.id === source.eventId).map(e => ({ ...e, date: "2027-05-20" })), extensionRequests: [], notifications: [], nudges: [], silenceCases: [], protocolLog: [] })
}
const input = (s: DemoState): TaskTargetInput => ({ date: "2027-04-08", message: "Waiting for room confirmation.", notifyPersonIds: ["sam", "alex"], expectedTask: taskTargetKey(s.nodes[0]) })
const update = (s: DemoState, value = input(s)) => reducer(s, { type: "updateTaskTarget", nodeId: "room", input: value })

describe("direct team target dates", () => {
  it("saves the target, append-only history and one notice per selected person without an approval or progress change", () => {
    const start = fixture(), next = update(start, { ...input(start), notifyPersonIds: ["sam", "sam", "alex"] })
    expect(next.nodes[0]).toMatchObject({ clubDeadline: "2027-04-08", officialDeadline: "2027-05-01", status: "accepted", lastUpdate: start.today })
    expect(next.extensionRequests).toEqual([])
    expect(next.notifications.filter(n => n.recipientId === "sam")).toHaveLength(1)
    expect(next.notifications.find(n => n.recipientId === "sam")?.text).toMatch(/Submit SAP.*Publish location/)
    expect(next.notifications.some(n => n.recipientId === "jordan")).toBe(false)
    expect(next.nodes[0].targetDates?.changes[0]).toMatchObject({ actorId: "jordan", previousDate: "2027-03-31", date: "2027-04-08", notifiedPersonIds: ["sam", "alex"] })
    const again = update(next, { ...input(next), date: "2027-04-12", notifyPersonIds: [] })
    expect(again.nodes[0].targetDates?.changes).toHaveLength(2)
    expect(again.notifications).toEqual(next.notifications)
    expect(JSON.parse(JSON.stringify(buildExport(again, [], Date.now()).state)).nodes[0].targetDates).toEqual(again.nodes[0].targetDates)
  })
  it("follows connected tasks rather than adjacency, includes self, merges roles, and excludes completed or unrelated work", () => {
    const s = fixture(), result = targetImpact(s, "room", "2027-04-08")
    expect(result.affected.map(n => n.id).sort()).toEqual(["publish", "sap", "self"])
    const people = suggestedTargetPeople(s, "room", "2027-04-08")
    expect(people.find(p => p.person.id === "sam")?.tasks).toHaveLength(2)
    expect(people.some(p => p.person.id === "jordan")).toBe(true)
    expect(people.some(p => p.person.id === "maya")).toBe(false)
    const dual = { ...s, roles: s.roles.map(r => r.fn === "president" ? { ...r, holderId: "sam" } : r) }
    const combined = suggestedTargetPeople(dual, "room", "2027-04-08").filter(p => p.person.id === "sam")
    expect(combined).toHaveLength(1)
    expect(combined[0]).toMatchObject({ lead: true, tasks: expect.any(Array) })
    const done = { ...s, nodes: s.nodes.map(n => n.id === "sap" ? { ...n, status: "done" as const } : n) }
    expect(targetImpact(done, "room", "2027-04-08").affected.some(n => n.id === "sap")).toBe(false)
  })
  it("does not change school dates, waiting state, results, attachments or the workflow template", () => {
    const s = fixture(); s.nodes[0] = { ...s.nodes[0], status: "waiting", waitingOn: "Room office", waitingOnPersonId: "sam", taskWork: { version: 1, revision: 1, files: [], drafts: [], submissions: [{ id: "s1", authorId: "jordan", ownerVersion: 0, details: "Current result", savedOn: s.today, attachmentIds: [] }] } }
    const next = update(s, { ...input(s), date: "2027-05-03", notifyPersonIds: ["jordan"] })
    expect(next.nodes[0]).toMatchObject({ officialDeadline: s.nodes[0].officialDeadline, waitingOn: "Room office", waitingOnPersonId: "sam", status: "waiting", taskWork: s.nodes[0].taskWork })
    expect(next.org).toBe(s.org)
    expect(next.notifications[0].recipientId).toBe("jordan")
  })
  it("rejects stale date cycles, reassignment, unknown history, invalid dates and unavailable people without partial writes", () => {
    const s = fixture(), original = input(s), next = update(s)
    expect(update(next, original)).toBe(next)
    const back = update(next, { ...input(next), date: "2027-03-31" })
    expect(update(back, original)).toBe(back)
    for (const patch of [{ date: "2027-02-30" }, { date: "2027-03-27" }, { date: s.nodes[0].clubDeadline! }, { notifyPersonIds: ["missing"] }, { message: "x".repeat(301) }]) expect(update(s, { ...original, ...patch })).toBe(s)
    const former = { ...s, people: s.people.map(p => p.id === "sam" ? { ...p, leftOn: s.today } : p) }
    expect(update(former, original).nodes).toBe(former.nodes)
    const reassigned = { ...s, nodes: s.nodes.map(n => n.id === "room" ? { ...n, ownerVersion: 1 } : n) }
    expect(update(reassigned, original)).toBe(reassigned)
    const unknown = { ...s, nodes: s.nodes.map(n => n.id === "room" ? { ...n, targetDates: { version: 99 } as unknown as Node["targetDates"] } : n) }
    expect(update(unknown)).toBe(unknown)
  })
  it("requires a claimed open task and the current owner or president, without needing any configured approver", () => {
    const s = fixture(); s.nodes[0].approverRoleId = null
    const noLead = { ...s, roles: s.roles.filter(r => r.fn !== "president" && r.fn !== "vice_president") }
    expect(update(noLead, { ...input(noLead), notifyPersonIds: [] }).nodes[0].clubDeadline).toBe("2027-04-08")
    expect(update({ ...s, viewerId: "alex" }).nodes[0].clubDeadline).toBe("2027-04-08")
    for (const status of ["done", "unclaimed"] as const) { const closed = { ...s, nodes: s.nodes.map(n => n.id === "room" ? { ...n, status } : n) }; expect(update(closed)).toBe(closed) }
    const other = { ...s, viewerId: "maya" }; expect(update(other)).toBe(other)
  })
  it("attributes email-entry updates to its owner and consumes legacy grants only after successful saving", async () => {
    const base = { ...fixture(), viewerId: "alex" }, grant = await makeTaskAccessGrant(base, "room")
    const issued = reducer(base, { type: "issueTaskAccessGrant", grant })
    const next = reducer(issued, { type: "updateTaskTarget", nodeId: "room", input: input(issued), authorization: { kind: "access", token: taskAccessToken(grant) } })
    expect(next.viewerId).toBe("alex")
    expect(next.nodes[0].targetDates?.changes[0].actorId).toBe("jordan")
    const altered = { type: "updateTaskTarget" as const, nodeId: "room", input: input(base), authorization: { kind: "access" as const, token: "altered" } }
    expect(reducer(issued, altered)).toBe(issued)
    const legacy = await makeOfficerGrant(base, "room"), state = reducer(base, { type: "issueOfficerGrant", grant: legacy })
    const action = { type: "updateTaskTarget" as const, nodeId: "room", input: input(state), authorization: { kind: "legacy" as const, token: grantToken(legacy) } }
    expect(reducer(state, { ...action, input: { ...action.input, date: "bad" } })).toBe(state)
    const saved = reducer(state, action)
    expect(saved.officerGrants[0].usedOn).toBe(state.today)
    expect(reducer(saved, action)).toBe(saved)
  })
  it("keeps legacy proposals as history and retires them only when the owner explicitly applies a new target", () => {
    const s = fixture(); s.extensionRequests = [{ id: "old", nodeId: "room", ownerId: "jordan", previousDeadline: s.nodes[0].clubDeadline, requestedOn: s.today, requestedDate: "2027-04-08", reason: "Old note", draftLink: "https://example.org/draft", status: "pending" }]
    expect(update(s).extensionRequests[0]).toMatchObject({ status: "cancelled", reason: "Old note", draftLink: "https://example.org/draft" })
    expect(s.extensionRequests[0].status).toBe("pending")
  })
  it("does not let a waiting-helper grant borrow the browser president's date permissions", async () => {
    const s = reducer({ ...fixture(), viewerId: "alex" }, { type: "upgradeReminderPlan" })
    const waiting = reducer({ ...s, viewerId: "jordan" }, { type: "replyTask", nodeId: "room", reply: "waiting", input: { waitingOn: "Please confirm access", waitingOnPersonId: "sam" } })
    const request = waiting.reminderRuntime!.waitingRequests.at(-1)!
    const grant = await makeTaskAccessGrant({ ...waiting, viewerId: "alex" }, "room", request.id)
    const issued = reducer({ ...waiting, viewerId: "alex" }, { type: "issueTaskAccessGrant", grant })
    const next = reducer(issued, { type: "updateTaskTarget", nodeId: "room", input: input(issued), authorization: { kind: "access", token: taskAccessToken(grant) } })
    expect(next).toBe(issued)
    expect(next.nodes[0].targetDates).toBeUndefined()
  })
})
