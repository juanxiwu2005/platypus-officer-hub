import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { webcrypto } from "node:crypto"
import { seedDemo } from "../data/seed"
import { appendLog, reducer, type Action } from "../data/store"
import type { DemoState, ReminderMode } from "../data/types"
import { addDays } from "../lib/dates"
import type { ReminderDelivery, ReminderInput, ReminderRuntime, ReminderTaskFacts } from "./contracts"
import type { PreparedDigest } from "./digestContracts"
import { planReminderDigests, prepareReminderDigest, recordReminderDigests, sendReminderDigests } from "./digest"
import { confirmReminderDelivery, createReminderRuntime, planReminders } from "./engine"
import { buildReminderFacts, buildReminderInput, reminderPeople } from "./facts"
import { buildReminderDigestMail, checkReminderDigestMail, type ReminderDigestMail } from "./mail"
import { digestWordBudget, DIGEST_TASK_CAP } from "./policy"
import { digestCentre } from "./centre"
import { isReminderRuntime } from "./runtime"
import { taskAccessToken, verifyTaskAccessGrant } from "./taskAccess"

const ORIGIN = "https://demo.example.org"
/** The real seed club on its demo day (Sat Oct 31) after "Enable updated reminders"; viewer is the president. */
function seed(mode: ReminderMode = "review_then_auto", viewerId = "alex"): DemoState {
  const s = seedDemo(undefined, "v2")
  return { ...reducer({ ...s, org: { ...s.org, settings: { ...s.org.settings, reminderMode: mode } } }, { type: "upgradeReminderPlan" }), viewerId }
}
function memory(initial: DemoState, intercept?: (s: DemoState, a: Action) => DemoState) {
  let state = initial
  return { getState: () => state, tryDispatch: (a: Action) => { const next = reducer(intercept ? intercept(state, a) : state, a); if (next === state) return false; state = next; return true } }
}
const groupOf = (s: DemoState, recipientId: string) => planReminderDigests(s).groups.find(g => g.recipientId === recipientId)!
async function prepared(api: ReturnType<typeof memory>, recipientId: string, via: ReminderDelivery["via"] = "platypus") {
  const result = await prepareReminderDigest(api, groupOf(api.getState(), recipientId).id, ORIGIN, via)
  if (!("groupId" in result)) throw new Error(result.error)
  return result
}
beforeEach(() => { localStorage.clear(); vi.stubGlobal("crypto", webcrypto) })
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })

describe("B1: the seed plan records exactly what it shows", () => {
  it("5 ready tasks for 3 people are 3 emails, and sending all records 5 deliveries and 3 digests", async () => {
    const s = seed()
    const plan = planReminderDigests(s)
    expect(plan.groups.map(g => [g.recipientId, g.candidates.length])).toEqual([["maya", 1], ["jordan", 3], ["priya", 1]])
    expect(plan.groups.flatMap(g => g.candidates.map(c => c.id)).sort()).toEqual(planReminders(buildReminderInput(s, s.reminderRuntime!)).ready.map(c => c.id).sort())
    expect(plan.blocked.some(b => /limit|reserved/.test(b.reason))).toBe(false)
    for (const g of plan.groups) expect(g.id).toBe(JSON.stringify(["digest", g.recipientId, s.today, ...g.candidates.map(c => c.id)]))

    const api = memory(s)
    const result = await sendReminderDigests(api, plan.groups.map(g => g.id), ORIGIN, "platypus")
    expect(result).toEqual({ recordedGroupIds: plan.groups.map(g => g.id), failedGroupIds: [], error: null })
    const after = api.getState(), runtime = after.reminderRuntime!
    expect(runtime.deliveries).toHaveLength(5)
    expect(runtime.digests).toHaveLength(3)
    expect(isReminderRuntime(runtime)).toBe(true)
    expect(planReminderDigests(after).groups).toEqual([])
    expect(after.taskAccessGrants).toHaveLength(5)
    for (const grant of after.taskAccessGrants!) expect(await verifyTaskAccessGrant(after, taskAccessToken(grant))).toBe(true)
    const jordan = runtime.digests!.find(d => d.recipientId === "jordan")!
    expect(jordan).toMatchObject({ id: expect.stringMatching(/^reminder-digest:\d+$/), sentOn: s.today, via: "platypus", channel: "email", checked: true, source: "rules", subject: "3 club tasks for today" })
    const members = runtime.deliveries.filter(d => d.digestId === jordan.id)
    expect(members.map(d => d.nodeId)).toEqual(jordan.nodeIds)
    expect(members.every(d => d.message?.checked && d.outcome === "simulated")).toBe(true)
    expect(jordan.body.startsWith("Hi Jordan,")).toBe(true)
    expect(jordan.body.match(/https?:\/\/\S+/g)).toEqual(jordan.taskUrls)
    expect(jordan.taskUrls).toEqual(members.map(d => d.message!.taskUrl))
    // Replaying the same groups records nothing more.
    expect((await sendReminderDigests(api, plan.groups.map(g => g.id), ORIGIN, "platypus")).recordedGroupIds).toEqual([])
    expect(api.getState().reminderRuntime!.deliveries).toHaveLength(5)
  })
})

/* ---------- Engine limits per email (pure input, fictional people). ---------- */
const TODAY = "2027-03-28"
const facts = (patch: Partial<ReminderTaskFacts> = {}): ReminderTaskFacts => {
  const value: ReminderTaskFacts = {
    nodeId: "room", eventId: null, eventName: null, eventDate: null, title: "Fictional task", requirement: "Do the fictional task.",
    importance: "It helps.", ownerId: "jordan", ownerVersion: 0, status: "accepted", due: "2027-04-10", startOn: TODAY,
    waitingOn: null, waitingOnPersonId: null, actionLink: null, source: "Fictional fixture", planKey: "", ...patch,
  }
  value.planKey = JSON.stringify([value.nodeId, value.ownerId, value.ownerVersion, value.due, value.startOn])
  return value
}
const input = (tasks: ReminderTaskFacts[], deliveries: ReminderDelivery[] = []): ReminderInput => ({
  today: TODAY, mode: "review_then_auto", maxPerTask: 3,
  people: [{ id: "jordan", name: "Jordan", email: "jordan@example.org", active: true, lead: false, channel: "email" }],
  tasks, runtime: { ...createReminderRuntime(TODAY), sequence: deliveries.length, deliveries },
})
const sent = (index: number, patch: Partial<ReminderDelivery> = {}): ReminderDelivery => ({
  id: `old-${index}`, candidateId: `old-${index}`, nodeId: `old-node-${index}`, recipientId: "jordan", ownerId: "jordan", ownerVersion: 0,
  planKey: "old", reason: "start", scheduledOn: TODAY, sentOn: TODAY, sequence: index + 1, via: "platypus", recipientName: "Jordan",
  taskTitle: "Earlier fictional task", eventName: null, due: "2027-04-20", outcome: "simulated", ...patch,
})
const starts = (n: number) => Array.from({ length: n }, (_, i) => facts({ nodeId: `start-${i}` }))

describe("limits count emails, not tasks", () => {
  it("a person's same-day tasks are one email; two emails already today leave no group", () => {
    expect(planReminders(input(starts(3))).ready).toHaveLength(3)
    const plan = planReminders(input(starts(3), [sent(0, { reason: "due", due: TODAY }), sent(1, { reason: "due", due: TODAY })]))
    expect(plan.ready).toEqual([])
    expect(plan.blocked.map(b => b.reason)).toEqual(["daily_limit", "daily_limit", "daily_limit"])
  })
  it("deliveries that share a digestId are one email", () => {
    const digest = [0, 1, 2].map(i => sent(i, { digestId: "reminder-digest:9", reason: "due", due: TODAY }))
    expect(planReminders(input([facts({ due: TODAY })], digest)).ready).toHaveLength(1)
    // Seven earlier tasks in two digests this week are two emails, under the weekly limit of six.
    const week = Array.from({ length: 7 }, (_, i) => sent(i, { digestId: `reminder-digest:${i < 4 ? 20 : 21}`, sentOn: addDays(TODAY, i < 4 ? -3 : -2) }))
    expect(planReminders(input(starts(2), week)).ready).toHaveLength(2)
    const six = Array.from({ length: 6 }, (_, i) => sent(i, { sentOn: addDays(TODAY, -1 - (i % 5)) }))
    expect(planReminders(input(starts(2), six)).blocked.map(b => b.reason)).toEqual(["weekly_limit", "weekly_limit"])
  })
  it("the important-slot reservation works per email: an important task carries ordinary ones with it", () => {
    const ordinary = [sent(0)]
    expect(planReminders(input(starts(2), ordinary)).blocked.map(b => b.reason)).toEqual(["daily_reserved", "daily_reserved"])
    const mixed = planReminders(input([...starts(2), facts({ nodeId: "due-today", due: TODAY })], ordinary))
    expect(mixed.ready.map(c => c.reason)).toEqual(["due", "start", "start"])
    expect(mixed.blocked).toEqual([])
    const fourOrdinary = Array.from({ length: 4 }, (_, i) => sent(i, { sentOn: addDays(TODAY, -1 - i) }))
    expect(planReminders(input(starts(1), fourOrdinary)).blocked[0].reason).toBe("weekly_reserved")
    expect(planReminders(input([...starts(1), facts({ nodeId: "late", due: "2027-03-20" })], fourOrdinary)).ready).toHaveLength(2)
  })
  it("per-task limits stay per task", () => {
    const plan = planReminders(input(starts(2), [sent(0, { nodeId: "start-0", candidateId: "elsewhere", reason: "due", due: TODAY })]))
    expect(plan.blocked).toEqual([{ nodeId: "start-0", recipientId: "jordan", reason: "already_sent_today" }])
    expect(plan.ready.map(c => c.nodeId)).toEqual(["start-1"])
  })
  it(`caps one email at ${DIGEST_TASK_CAP} tasks and keeps the rest for the next email`, () => {
    const plan = planReminders(input(starts(DIGEST_TASK_CAP + 2)))
    expect(plan.ready).toHaveLength(DIGEST_TASK_CAP)
    const waiting = plan.upcoming.filter(c => c.scheduledOn === addDays(TODAY, 1) && c.reason === "start")
    expect(waiting).toHaveLength(2)
    expect(waiting[0].explanation).toBe("We will include this in the next reminder email.")
    expect(plan.blocked).toEqual([])
    expect(new Set([...plan.ready, ...waiting].map(c => c.nodeId)).size).toBe(DIGEST_TASK_CAP + 2)
  })
  it("after today's capped email is recorded, the leftover tasks wait for tomorrow's email instead of a second email today", () => {
    const tasks = starts(DIGEST_TASK_CAP + 2)
    const first = planReminders(input(tasks))
    expect(first.ready).toHaveLength(DIGEST_TASK_CAP)
    const recorded = first.ready.map((c, i) => sent(i, { id: `capped-${i}`, candidateId: c.id, nodeId: c.nodeId, planKey: c.planKey, reason: c.reason, due: c.due, digestId: "reminder-digest:30" }))
    const leftover = tasks.map(t => t.nodeId).filter(id => !first.ready.some(c => c.nodeId === id))
    expect(leftover).toHaveLength(2)
    const after = planReminders(input(tasks, recorded))
    expect(after.ready.filter(c => leftover.includes(c.nodeId))).toEqual([])
    expect(after.blocked.filter(b => leftover.includes(b.nodeId))).toEqual([])
    // Each leftover task is in the next email, dated tomorrow (later planned checks may follow it).
    const next = after.upcoming.filter(c => leftover.includes(c.nodeId) && c.scheduledOn === addDays(TODAY, 1))
    expect(next.map(c => c.nodeId).sort()).toEqual([...leftover].sort())
    for (const c of next) expect(c.explanation).toBe("We will include this in the next reminder email.")
    expect(after.upcoming.filter(c => leftover.includes(c.nodeId)).every(c => c.scheduledOn > TODAY)).toBe(true)
  })
  it("the single-task path records one email without digestId, and the rest are judged as the next email", () => {
    const value = input(starts(3))
    const runtime = confirmReminderDelivery(value, planReminders(value).ready[0].id, "platypus")
    expect(runtime.deliveries).toHaveLength(1)
    expect(runtime.deliveries[0].digestId).toBeUndefined()
    expect(planReminders({ ...value, runtime }).blocked.map(b => b.reason)).toEqual(["daily_reserved", "daily_reserved"])
  })
})

describe("tasks held by email limits on the Reminders page", () => {
  it("count as waiting for the next email and are not listed under Fix first", () => {
    const s = seed(), runtime = s.reminderRuntime!
    const ready = Object.fromEntries(planReminderDigests(s).groups.map(g => [g.recipientId, g.candidates.map(c => c.nodeId)]))
    expect(ready.maya).toHaveLength(1)
    expect(ready.jordan).toHaveLength(3)
    // Earlier fictional emails without a saved mail: two to Maya today (daily limit), six to Jordan this week (weekly limit).
    const earlier = [
      ...[0, 1].map(i => ({ recipientId: "maya", recipientName: "Maya Chen", sentOn: s.today, i })),
      ...[1, 2, 3, 4, 5, 6].map(i => ({ recipientId: "jordan", recipientName: "Jordan Patel", sentOn: addDays(s.today, -i), i })),
    ].map(({ recipientId, recipientName, sentOn, i }, k): ReminderDelivery => ({
      id: `earlier-${recipientId}-${i}`, candidateId: `earlier-${recipientId}-${i}`, nodeId: `earlier-node-${recipientId}-${i}`, recipientId, ownerId: recipientId, ownerVersion: 0,
      planKey: "earlier", reason: "start", scheduledOn: sentOn, sentOn, sequence: runtime.sequence + k + 1, via: "platypus", recipientName,
      taskTitle: "Earlier fictional task", eventName: null, due: null, outcome: "simulated",
    }))
    const sequence = runtime.sequence + earlier.length
    const held: DemoState = { ...s, reminderRuntime: { ...runtime, sequence, mailRequiredAfter: sequence, deliveries: [...runtime.deliveries, ...earlier] } }
    expect(isReminderRuntime(held.reminderRuntime)).toBe(true)
    const centre = digestCentre(held)
    expect(centre.held).toBe(ready.maya.length + ready.jordan.length)
    // Step 0: the same count per person, and a person with only held tasks still has a row (no email, no Send).
    expect(centre.people.map(p => [p.recipientId, p.held, !!p.group])).toEqual([["priya", 0, true], ["maya", ready.maya.length, false], ["jordan", ready.jordan.length, false]])
    const limited = [...ready.maya, ...ready.jordan]
    expect(centre.fix.filter(row => limited.includes(row.nodeId))).toEqual([])
    expect(centre.groups.map(g => g.recipientId)).toEqual(["priya"])
    expect(digestCentre(s).held).toBe(0)
  })
})

describe("recording person digests", () => {
  it("each group is all-or-nothing when one of its tasks is stale or tampered", async () => {
    const api = memory(seed())
    const all = [await prepared(api, "maya"), await prepared(api, "jordan"), await prepared(api, "priya")]
    expect(api.getState().taskAccessGrants).toHaveLength(5)
    const jordan = all[1]
    const tampered: PreparedDigest = { ...jordan, entries: jordan.entries.map((e, i) => i === 1 ? { ...e, message: { ...e.message, body: `${e.message.body} ASAP` } } : e) }
    const result = recordReminderDigests(api, [all[0], tampered, all[2]], "platypus")
    expect(result.recordedGroupIds).toEqual([all[0].groupId, all[2].groupId])
    expect(result.failedGroupIds).toEqual([jordan.groupId])
    expect(result.error).toBeTruthy()
    const runtime = api.getState().reminderRuntime!
    expect(runtime.deliveries.filter(d => d.recipientId === "jordan")).toEqual([])
    expect(runtime.digests!.map(d => d.recipientId)).toEqual(["maya", "priya"])

    // A task in the group changes after preparation: nothing is recorded for that group.
    const stale = memory(seed()), group = await prepared(stale, "jordan")
    const reassigned = groupOf(stale.getState(), "jordan").candidates[2].nodeId
    expect(stale.tryDispatch({ type: "updateNode", id: reassigned, patch: { ownerId: "sam" } })).toBe(true)
    expect(recordReminderDigests(stale, [group], "platypus")).toMatchObject({ recordedGroupIds: [], failedGroupIds: [group.groupId] })
    expect(stale.getState().reminderRuntime!.deliveries).toEqual([])
    expect(stale.getState().reminderRuntime!.digests).toBeUndefined()
  })
  it("a changed combined email or a missing task entry is refused", async () => {
    const api = memory(seed()), group = await prepared(api, "jordan")
    const edited = { ...group, digest: { ...group.digest, subject: "Edited subject", text: `Edited subject\n\n${group.digest.body}` } }
    expect(recordReminderDigests(api, [edited], "platypus").recordedGroupIds).toEqual([])
    expect(recordReminderDigests(api, [{ ...group, entries: group.entries.slice(0, 2) }], "platypus").recordedGroupIds).toEqual([])
    expect(recordReminderDigests(api, [{ ...group, digest: { ...group.digest, extra: true } as unknown as PreparedDigest["digest"] }], "platypus").recordedGroupIds).toEqual([])
    expect(api.getState().reminderRuntime!.deliveries).toEqual([])
    expect(recordReminderDigests(api, [group], "platypus").recordedGroupIds).toEqual([group.groupId])
  })
  it("manual is only for review_then_self, needs a lead, and saves links before any draft is opened", async () => {
    const api = memory(seed("review_then_self"))
    const group = await prepared(api, "jordan", "manual")
    expect(api.getState().taskAccessGrants).toHaveLength(3)
    expect(api.getState().reminderRuntime!.deliveries).toEqual([])
    expect(await prepareReminderDigest(api, group.groupId, ORIGIN, "platypus")).toHaveProperty("error")
    expect(recordReminderDigests(api, [group], "platypus").recordedGroupIds).toEqual([])
    const member = memory({ ...api.getState(), viewerId: "jordan" })
    expect(await prepareReminderDigest(member, group.groupId, ORIGIN, "manual")).toHaveProperty("error")
    expect(recordReminderDigests(member, [group], "manual").recordedGroupIds).toEqual([])
    expect(recordReminderDigests(api, [group], "manual").recordedGroupIds).toEqual([group.groupId])
    expect(api.getState().reminderRuntime!.deliveries.every(d => d.via === "manual" && d.outcome === "recorded_by_sender")).toBe(true)
    expect(await prepareReminderDigest(memory(seed("review_then_auto")), groupOf(seed("review_then_auto"), "jordan").id, ORIGIN, "manual")).toHaveProperty("error")
  })
  it("automatic is only for auto_email and needs no lead; platypus also works there for a lead", async () => {
    const review = memory(seed("review_then_auto"))
    expect((await sendReminderDigests(review, planReminderDigests(review.getState()).groups.map(g => g.id), ORIGIN, "automatic")).recordedGroupIds).toEqual([])
    expect(review.getState().taskAccessGrants ?? []).toEqual([])
    const auto = memory(seed("auto_email", "jordan"))
    const ids = planReminderDigests(auto.getState()).groups.map(g => g.id)
    expect((await sendReminderDigests(auto, ids, ORIGIN, "platypus")).recordedGroupIds).toEqual([])
    const result = await sendReminderDigests(auto, ids, ORIGIN, "automatic")
    expect(result).toMatchObject({ failedGroupIds: [], error: null })
    expect(auto.getState().reminderRuntime!.deliveries.every(d => d.via === "automatic" && d.outcome === "simulated" && !!d.digestId)).toBe(true)
    expect(auto.getState().reminderRuntime!.digests).toHaveLength(3)
    const lead = memory(seed("auto_email"))
    expect((await sendReminderDigests(lead, ids, ORIGIN, "platypus")).recordedGroupIds).toEqual(ids)
  })
  it("cancellation or a replaced workspace records nothing", async () => {
    const s = seed(), ids = planReminderDigests(s).groups.map(g => g.id)
    const cancelled = memory(s)
    expect((await sendReminderDigests(cancelled, ids, ORIGIN, "platypus", () => false)).recordedGroupIds).toEqual([])
    const replaced = memory(s, state => ({ ...state, demoLinkKey: "replacement-workspace-key" }))
    expect((await sendReminderDigests(replaced, ids, ORIGIN, "platypus")).recordedGroupIds).toEqual([])
    expect(replaced.getState().reminderRuntime!.deliveries).toEqual([])
  })
  it("the interaction log keeps counts and ids, never mail text", async () => {
    const api = memory(seed()), group = await prepared(api, "jordan"), before = api.getState()
    const action: Action = { type: "recordReminderDigests", via: "platypus", context: { orgId: before.org.id, inviteCode: before.org.inviteCode, demoLinkKey: before.demoLinkKey }, digests: [group] }
    const after = reducer(before, action)
    expect(after.reminderRuntime!.digests).toHaveLength(1)
    const [entry] = appendLog([], before, after, action, 0)
    expect(entry).toMatchObject({ type: "recordReminderDigests", applied: true, actor: "alex", payload: { via: "platypus", count: 1, taskCount: 3, groupIds: [group.groupId], recipientIds: ["jordan"] } })
    const logged = JSON.stringify(entry)
    expect(logged).not.toContain("Hi Jordan")
    expect(logged).not.toContain(group.digest.subject)
    expect(logged).not.toContain("access=")
    expect(logged).not.toContain(before.demoLinkKey)
  })
})

describe("digest mail", () => {
  const retext = (mail: ReminderDigestMail, body: string): ReminderDigestMail => ({ ...mail, body, text: `${mail.subject}\n\n${body}`, wordCount: body.trim().split(/\s+/).length })
  it("one subject, a greeting, each task with its own due date, reason and entry link, and thanks", async () => {
    const api = memory(seed()), { digest } = await prepared(api, "jordan")
    const mail: ReminderDigestMail = { ...digest }
    expect(checkReminderDigestMail(mail)).toBe(true)
    expect(digest.body.match(/^Task due: /gm)).toHaveLength(3)
    expect(digest.body).toContain("Thank you for your work on these.")
    expect(digest.body).toMatch(/It's \d+ days? past the due date\. How's it going\?/)
    expect(digest.body).not.toMatch(/is recorded|no completion update|no start update/)
    expect(digest.subject).toBe("3 club tasks for today")
    expect(digest.wordCount).toBeLessThanOrEqual(digestWordBudget(3))
    digest.taskUrls.forEach((url, i) => expect(new URL(url).hash).toContain(`node=${encodeURIComponent(digest.nodeIds[i])}`))
    const single = await prepared(api, "maya")
    expect(single.digest.subject).toBe("Reconcile September receipts, due Oct 26")
    expect(single.digest.body).toContain("One task could use an update today.")
  })
  it("is signed by the lead who prepares it, and an automatic email has no sign-off (C2)", async () => {
    const signed = await prepared(memory(seed()), "jordan")
    expect(signed.digest.body.endsWith("Thank you for your work on these.\nAlex")).toBe(true)
    expect(signed.entries.every(e => e.message.body.includes("Thank you for your work on this.\nAlex\n\nOpen task: "))).toBe(true)
    const automatic = await prepared(memory(seed("auto_email")), "jordan", "automatic")
    expect(automatic.digest.body.endsWith("Thank you for your work on these.")).toBe(true)
    expect(automatic.entries.every(e => !e.message.body.includes("Alex"))).toBe(true)
    // The record rebuilds the same signed email, so a prepared email is recorded exactly as shown.
    const api = memory(seed()), group = await prepared(api, "jordan")
    expect(recordReminderDigests(api, [group], "platypus")).toMatchObject({ recordedGroupIds: [group.groupId], error: null })
    expect(api.getState().reminderRuntime!.digests!.at(-1)!.body).toBe(group.digest.body)
  })
  it("the checker rejects extra or missing links, a wrong task, banned words and a wrong count", async () => {
    const api = memory(seed()), { digest } = await prepared(api, "jordan")
    const mail: ReminderDigestMail = { ...digest }
    expect(checkReminderDigestMail(retext(mail, `${mail.body}\nhttps://demo.example.org/#/events?node=x&access=a.b`))).toBe(false)
    expect(checkReminderDigestMail(retext(mail, mail.body.replace(`Open task: ${mail.taskUrls[1]}`, "Open task in Plan.")))).toBe(false)
    expect(checkReminderDigestMail({ ...mail, nodeIds: [mail.nodeIds[1], mail.nodeIds[0], mail.nodeIds[2]] })).toBe(false)
    expect(checkReminderDigestMail(retext(mail, mail.body.replace("Thank you", "Please reply ASAP. Thank you")))).toBe(false)
    expect(checkReminderDigestMail(retext(mail, mail.body.replace("Thank you", "This is urgent. Thank you")))).toBe(false)
    expect(checkReminderDigestMail({ ...mail, wordCount: mail.wordCount + 1 })).toBe(false)
    expect(checkReminderDigestMail({ ...mail, subject: `${mail.subject} ${mail.taskUrls[0]}`, text: `${mail.subject} ${mail.taskUrls[0]}\n\n${mail.body}` })).toBe(false)
    expect(checkReminderDigestMail(retext(mail, `${mail.body}\n${"word ".repeat(digestWordBudget(3))}`))).toBe(false)
    expect(checkReminderDigestMail(retext(mail, mail.body))).toBe(true)
  })
  it("a task URL for another task or a recipient outside the task scope is never checked", async () => {
    const s = seed(), group = groupOf(s, "jordan"), people = reminderPeople(s)
    const items = group.candidates.map((candidate, i) => ({ facts: buildReminderFacts(s, candidate.nodeId)!, candidate, taskUrl: `${ORIGIN}/#/events?node=${i ? candidate.nodeId : "someone-else"}&access=a.b` }))
    expect(buildReminderDigestMail({ today: s.today, recipient: people.find(p => p.id === "jordan")!, items }).checked).toBe(false)
    const fixed = items.map(item => ({ ...item, taskUrl: `${ORIGIN}/#/events?${new URLSearchParams({ ...(item.facts.eventId ? { event: item.facts.eventId } : {}), node: item.facts.nodeId, access: "a.b" })}` }))
    expect(buildReminderDigestMail({ today: s.today, recipient: people.find(p => p.id === "jordan")!, items: fixed }).checked).toBe(true)
    expect(buildReminderDigestMail({ today: s.today, recipient: people.find(p => p.id === "sam")!, items: fixed }).checked).toBe(false)
  })
})

describe("runtime validation of digests", () => {
  it("accepts old ledgers without digests and a recorded ledger with them", async () => {
    expect(isReminderRuntime(createReminderRuntime(TODAY))).toBe(true)
    expect(isReminderRuntime(seed().reminderRuntime)).toBe(true)
    const api = memory(seed())
    await sendReminderDigests(api, planReminderDigests(api.getState()).groups.map(g => g.id), ORIGIN, "platypus")
    expect(isReminderRuntime(api.getState().reminderRuntime)).toBe(true)
  })
  it("rejects malformed digests and keeps such a ledger without running it", async () => {
    const api = memory(seed())
    await sendReminderDigests(api, [groupOf(api.getState(), "jordan").id], ORIGIN, "platypus")
    const good = api.getState().reminderRuntime!, digest = good.digests![0]
    const bad: ReminderRuntime[] = [
      { ...good, digests: undefined },
      { ...good, digests: {} as unknown as ReminderRuntime["digests"] },
      { ...good, digests: [{ ...digest, id: "digest-1" }] },
      { ...good, digests: [digest, digest] },
      { ...good, digests: [{ ...digest, id: `reminder-digest:${good.sequence + 1}` }] },
      { ...good, digests: [{ ...digest, nodeIds: [...digest.nodeIds].reverse() }] },
      { ...good, digests: [{ ...digest, taskUrls: digest.taskUrls.slice(1) }] },
      { ...good, digests: [{ ...digest, wordCount: digestWordBudget(3) + 1 }] },
      { ...good, digests: [{ ...digest, checked: false as unknown as true }] },
      { ...good, digests: [{ ...digest, text: "Changed" }] },
      { ...good, digests: [{ ...digest, via: "manual" }] },
      { ...good, deliveries: good.deliveries.map((d, i) => i ? d : { ...d, digestId: "reminder-digest:999" }) },
      { ...good, deliveries: good.deliveries.slice(1) },
    ]
    for (const runtime of bad) expect(isReminderRuntime(runtime)).toBe(false)
    const kept = { ...api.getState(), reminderRuntime: bad[3] }
    expect(planReminderDigests(kept).groups).toEqual([])
    expect(reducer(kept, { type: "upgradeReminderPlan" })).toBe(kept)
  })
})
