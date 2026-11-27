import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { webcrypto } from "node:crypto"
import { seedDemo } from "../data/seed"
import { appendLog, buildExport, reducer, type Action } from "../data/store"
import type { DemoState } from "../data/types"
import type { DigestEdit, PreparedDigest } from "./digestContracts"
import { EDITED_TEXT_OMITTED, planReminderDigests, prepareReminderDigest, recordReminderDigests, sendReminderDigests, withoutEditedText } from "./digest"
import { draftLinks, draftTitleOf, fromTokens, toTokens } from "./draft"
import { isReminderRuntime } from "./runtime"

// R-S0 §4: a lead's edited email is recorded only when every task link is exactly as granted and the limits hold.
const ORIGIN = "https://demo.example.org"
const LINE = "Thanks for jumping on this, it really helps the team."
function seed(): DemoState {
  const s = seedDemo(undefined, "v2")
  return { ...reducer({ ...s, org: { ...s.org, settings: { ...s.org.settings, reminderMode: "review_then_auto" } } }, { type: "upgradeReminderPlan" }), viewerId: "alex" }
}
function memory(initial: DemoState) {
  let state = initial
  const actions: Action[] = []
  return { actions, getState: () => state, tryDispatch: (a: Action) => { actions.push(a); const next = reducer(state, a); if (next === state) return false; state = next; return true } }
}
const groupOf = (s: DemoState, recipientId: string) => planReminderDigests(s).groups.find(g => g.recipientId === recipientId)!
async function prepared(api: ReturnType<typeof memory>, recipientId: string): Promise<PreparedDigest> {
  const result = await prepareReminderDigest(api, groupOf(api.getState(), recipientId).id, ORIGIN, "platypus")
  if (!("groupId" in result)) throw new Error(result.error)
  return result
}
/** What the editor would hand over: the rule email with a personal line, tokens expanded back to the granted URLs. */
function edited(s: DemoState, p: PreparedDigest, change: (body: string) => string = body => `${body.replace(/^(Hi [^,]+,)/, `$1\n\n${LINE}`)}`): DigestEdit {
  const titleOf = draftTitleOf(s)
  const links = draftLinks(p.digest.nodeIds.map((nodeId, i) => ({ nodeId, title: titleOf(nodeId), url: p.digest.taskUrls[i] })))
  return { subject: `A quick note, ${p.digest.recipientName.split(" ")[0]}`, body: fromTokens(change(toTokens(p.digest.body, links)), links) }
}
beforeEach(() => { localStorage.clear(); vi.stubGlobal("crypto", webcrypto) })
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })

describe("recording an edited email", () => {
  it("is accepted with every task URL as granted; the snapshot keeps the email as sent, edited: true and the original", async () => {
    const api = memory(seed())
    const maya = await prepared(api, "maya")
    const edit = edited(api.getState(), maya)
    const result = recordReminderDigests(api, [maya], "platypus", { [maya.groupId]: edit })
    expect(result).toEqual({ recordedGroupIds: [maya.groupId], failedGroupIds: [], error: null })
    const runtime = api.getState().reminderRuntime!
    const snap = runtime.digests![0]
    expect(snap).toMatchObject({ edited: true, subject: edit.subject, body: edit.body, text: `${edit.subject}\n\n${edit.body}`,
      original: { subject: maya.digest.subject, body: maya.digest.body }, taskUrls: maya.digest.taskUrls, checked: true, source: "rules" })
    expect(snap.body).toContain(LINE)
    expect(snap.body).toContain(`Open task: ${maya.digest.taskUrls[0]}`)
    expect(snap.wordCount).toBe(edit.body.trim().split(/\s+/).length)
    expect(isReminderRuntime(runtime)).toBe(true)
    // Each task's own delivery keeps its rule-written mail.
    expect(runtime.deliveries.filter(d => d.digestId === snap.id).map(d => d.message?.body.includes(LINE))).toEqual([false])
    // The action log and the research export never carry the typed text.
    const action = api.actions.find(a => a.type === "recordReminderDigests")!
    const [entry] = appendLog([], seed(), api.getState(), action, 0)
    expect(JSON.stringify(entry)).not.toContain(LINE)
    const exported = JSON.stringify(buildExport(api.getState(), [entry], 0, { attempts: [] }, { sessions: [], seqCleared: 0 } as never))
    expect(exported).not.toContain(LINE)
    expect(exported).not.toContain(edit.subject)
    const out = withoutEditedText(api.getState()).reminderRuntime!.digests![0]
    expect(out).toMatchObject({ edited: true, subject: EDITED_TEXT_OMITTED, body: EDITED_TEXT_OMITTED, original: snap.original })
    expect(isReminderRuntime(withoutEditedText(api.getState()).reminderRuntime)).toBe(true)
    expect(api.getState().reminderRuntime!.digests![0].body).toContain(LINE)
  })

  it("an edit equal to the rule-written email, or no edit, records the unedited snapshot exactly as before", async () => {
    const api = memory(seed())
    const maya = await prepared(api, "maya")
    recordReminderDigests(api, [maya], "platypus", { [maya.groupId]: { subject: maya.digest.subject, body: maya.digest.body } })
    const jordan = await prepared(api, "jordan")
    recordReminderDigests(api, [jordan], "platypus")
    for (const snap of api.getState().reminderRuntime!.digests!) {
      expect("edited" in snap || "original" in snap).toBe(false)
      expect(Object.keys(snap).sort()).toEqual(["body", "channel", "checked", "groupId", "id", "intendedEmail", "nodeIds", "preparedOn", "recipientId",
        "recipientName", "sentOn", "source", "subject", "taskUrls", "text", "version", "via", "wordCount"])
    }
  })

  it.each([
    ["a task URL is missing", (s: DemoState, p: PreparedDigest) => { const e = edited(s, p); return { ...e, body: e.body.replace(`Open task: ${p.digest.taskUrls[0]}`, "") } }],
    ["a task URL is changed", (s: DemoState, p: PreparedDigest) => { const e = edited(s, p); return { ...e, body: e.body.replace(p.digest.taskUrls[1], `${p.digest.taskUrls[1]}0`) } }],
    ["a task URL appears twice", (s: DemoState, p: PreparedDigest) => { const e = edited(s, p); return { ...e, body: `${e.body}\nOpen task: ${p.digest.taskUrls[0]}` } }],
    ["another web address is added", (s: DemoState, p: PreparedDigest) => { const e = edited(s, p); return { ...e, body: `${e.body}\nForm: https://forms.example.org/x` } }],
    ["the body is too long", (s: DemoState, p: PreparedDigest) => { const e = edited(s, p); return { ...e, body: `${e.body}\n${"word ".repeat(400)}` } }],
    ["the subject is empty", (s: DemoState, p: PreparedDigest) => ({ ...edited(s, p), subject: " " })],
    ["the subject is too long", (s: DemoState, p: PreparedDigest) => ({ ...edited(s, p), subject: "x".repeat(121) })],
    ["the edit is not text", () => ({ subject: 1, body: null }) as unknown as DigestEdit],
    ["the edit carries another field", (s: DemoState, p: PreparedDigest) => ({ ...edited(s, p), edited: false }) as unknown as DigestEdit],
  ])("is rejected when %s, and nothing is recorded for that email", async (_name, make) => {
    const api = memory(seed())
    const jordan = await prepared(api, "jordan")
    const before = api.getState().reminderRuntime!
    const result = recordReminderDigests(api, [jordan], "platypus", { [jordan.groupId]: make(api.getState(), jordan) })
    expect(result.recordedGroupIds).toEqual([])
    expect(api.getState().reminderRuntime!.deliveries).toEqual(before.deliveries)
    expect(api.getState().reminderRuntime!.digests ?? []).toEqual([])
  })

  it("an automatic email is never edited: an edit sent with \"automatic\" in Send automatically mode is rejected (review P3-7)", async () => {
    const s = seed()
    const api = memory({ ...s, org: { ...s.org, settings: { ...s.org.settings, reminderMode: "auto_email" } } })
    const ready = await prepareReminderDigest(api, groupOf(api.getState(), "maya").id, ORIGIN, "automatic")
    if (!("groupId" in ready)) throw new Error(ready.error)
    const edit = edited(api.getState(), ready)
    expect(recordReminderDigests(api, [ready], "automatic", { [ready.groupId]: edit }).recordedGroupIds).toEqual([])
    // Even the rule-written text passed as an "edit" is refused; with no edit the same email records as written.
    expect(recordReminderDigests(api, [ready], "automatic", { [ready.groupId]: { subject: ready.digest.subject, body: ready.digest.body } }).recordedGroupIds).toEqual([])
    expect(recordReminderDigests(api, [ready], "automatic").recordedGroupIds).toEqual([ready.groupId])
    expect(api.getState().reminderRuntime!.digests![0].edited).toBeUndefined()
    // A lead's Send in that mode goes out as written too: an edit is refused.
    const jordan = await prepared(api, "jordan")
    expect(recordReminderDigests(api, [jordan], "platypus", { [jordan.groupId]: edited(api.getState(), jordan) }).recordedGroupIds).toEqual([])
  })

  it("a task title with a www. address: the rule-written email leaves it out, so an edit of that email can be recorded (review P3-5)", async () => {
    const s = seed()
    const nodeId = groupOf(s, "maya").candidates[0].nodeId
    const api = memory({ ...s, nodes: s.nodes.map(n => n.id === nodeId ? { ...n, title: "Book the room at www.venue.example.org today" } : n) })
    const maya = await prepared(api, "maya")
    expect(maya.digest.body).not.toMatch(/www\./i)
    expect(maya.digest.subject).not.toMatch(/www\./i)
    const result = recordReminderDigests(api, [maya], "platypus", { [maya.groupId]: edited(api.getState(), maya) })
    expect(result.recordedGroupIds).toEqual([maya.groupId])
  })

  it("an edit written for another person's email (wrong group) is rejected; that group alone is not recorded", async () => {
    const api = memory(seed())
    const maya = await prepared(api, "maya"), jordan = await prepared(api, "jordan")
    const result = recordReminderDigests(api, [maya, jordan], "platypus", { [maya.groupId]: edited(api.getState(), jordan) })
    expect(result.recordedGroupIds).toEqual([jordan.groupId])
    expect(result.failedGroupIds).toEqual([maya.groupId])
    const snaps = api.getState().reminderRuntime!.digests!
    expect(snaps.map(d => [d.recipientId, d.edited ?? false])).toEqual([["jordan", false]])
    // A hand-made action is rechecked the same way: the edit has to fit the group it is attached to.
    const tampered = reducer(api.getState(), { type: "recordReminderDigests", via: "platypus", context: { orgId: api.getState().org.id, inviteCode: api.getState().org.inviteCode, demoLinkKey: api.getState().demoLinkKey },
      digests: [{ ...maya, edit: edited(api.getState(), jordan) }] })
    expect(tampered).toBe(api.getState())
  })

  it("Send all sends each edit with its group and the rest as written", async () => {
    const api = memory(seed())
    const jordan = await prepared(api, "jordan")   // links saved, as when the row was opened
    const edit = edited(api.getState(), jordan)
    const groups = planReminderDigests(api.getState()).groups.map(g => g.id)
    const result = await sendReminderDigests(api, groups, ORIGIN, "platypus", () => true, { [jordan.groupId]: edit })
    expect(result.recordedGroupIds).toEqual(groups)
    const snaps = api.getState().reminderRuntime!.digests!
    expect(snaps.map(d => [d.recipientId, d.edited ?? false])).toEqual([["maya", false], ["jordan", true], ["priya", false]])
    expect(snaps[1].body).toBe(edit.body)
    expect(isReminderRuntime(api.getState().reminderRuntime)).toBe(true)
  })
})

describe("saved snapshots with the new optional fields", () => {
  it("old snapshots stay valid; edited ones must carry a well-formed original", async () => {
    const api = memory(seed())
    const maya = await prepared(api, "maya")
    recordReminderDigests(api, [maya], "platypus", { [maya.groupId]: edited(api.getState(), maya) })
    const runtime = api.getState().reminderRuntime!
    const snap = runtime.digests![0]
    const withSnap = (patch: Record<string, unknown>) => ({ ...runtime, digests: [{ ...snap, ...patch }] })
    expect(isReminderRuntime(runtime)).toBe(true)
    const { edited: _e, original: _o, ...plain } = snap
    expect(isReminderRuntime({ ...runtime, digests: [{ ...plain, subject: snap.original!.subject, body: snap.original!.body, text: `${snap.original!.subject}\n\n${snap.original!.body}`, wordCount: maya.digest.wordCount }] })).toBe(true)
    for (const bad of [{ edited: false }, { edited: "yes" }, { original: undefined }, { original: null }, { original: { subject: "S" } },
      { original: { subject: "S", body: 3 } }, { original: { subject: "S", body: "B", extra: "x" } }, { edited: undefined }]) {
      expect(isReminderRuntime(withSnap(bad))).toBe(false)
    }
    expect(isReminderRuntime({ ...runtime, digests: [{ ...plain, original: { subject: "S", body: "B" } }] })).toBe(false)
  })
})
