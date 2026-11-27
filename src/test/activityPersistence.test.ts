import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { buildExport, loadStateWithNotice, reducer, STORAGE_KEY } from "../data/store"
import { seedDemo } from "../data/seed"
import { sanitizeActivity, withActivityBackfill } from "../data/activityBackfill"
import { ACTIVITY_KINDS, backfillActivityId, FACT_TEXT_MAX, isActivityFact } from "../data/activityIds"
import { aiSnapshot, formSnapshot } from "../lib/aiContext"
import type { ActivityEvent, DemoState, Node } from "../data/types"
import type { TaskWork } from "../taskDetails/contracts"
import type { ReminderDelivery } from "../reminders/contracts"
import { clubDraft, startWorkspace } from "../data/settings"
import { parseCommand } from "../lib/commands"

/**
 * R0 persistence (docs/feedback-fix/CHEERS_R0_CONTRACT.md §5): the activity record is rebuilt from existing records when a state
 * has none, sanitized when it has one, and travels through load, reset, import and export. Live events (§4) are not used here.
 * All data is the fictional demo club.
 */

beforeEach(() => window.localStorage.clear())
afterEach(() => { vi.restoreAllMocks(); window.localStorage.clear() })

const seed = () => seedDemo(undefined, "v2")
const withoutActivity = (s: DemoState): DemoState => { const { activity: _drop, ...rest } = s; void _drop; return rest }
const record = (s: DemoState): ActivityEvent[] => { expect(Array.isArray(s.activity)).toBe(true); return s.activity! }
const day = (v: string) => { const [y, m, d] = v.split("-").map(Number); return Date.UTC(y, m - 1, d) / 86_400_000 }
const kindRank = (k: string) => ACTIVITY_KINDS.indexOf(k as never)

/** A valid live-shaped event for sanitizing tests. */
const live = (seq: number, extra: Partial<ActivityEvent> = {}): ActivityEvent =>
  ({ id: `act:${seq}`, seq, on: "2026-11-02", actorId: "jordan", kind: "task.status", personIds: ["jordan"], nodeId: "t-agenda", facts: { from: "accepted", to: "in_progress" }, source: "live", ...extra })

const work = (submissions: TaskWork["submissions"]): TaskWork => ({ version: 1, revision: submissions.length, files: [], drafts: [], submissions })

/** A reminder plan v2 delivery as the ledger keeps it, with fictional snapshot text that must never reach the record. */
const delivery = (id: string, patch: Partial<ReminderDelivery>): ReminderDelivery => ({
  id, candidateId: `candidate:${id}`, nodeId: "t-agenda", recipientId: "priya", ownerId: "priya", ownerVersion: 0, planKey: `plan:${id}`, reason: "start",
  scheduledOn: "2026-11-01", sentOn: "2026-11-01", sequence: 1, via: "automatic", recipientName: "Fictional Recipient Name", taskTitle: "Fictional delivery task title",
  eventName: null, due: "2026-11-03", outcome: "simulated", message: { channel: "email" } as ReminderDelivery["message"], ...patch,
})
const withDeliveries = (s: DemoState, deliveries: ReminderDelivery[]): DemoState =>
  ({ ...s, reminderRuntime: { version: 2, activatedOn: "2026-10-01", sequence: deliveries.length, updates: [], deliveries, waitingRequests: [] } })

describe("backfill from existing records", () => {
  it("rebuilds the seed deterministically, and running it again changes nothing", () => {
    const a = withActivityBackfill(seed()), b = withActivityBackfill(seed())
    const events = record(a)
    expect(events.length).toBeGreaterThan(50)
    expect(events).toEqual(record(b))
    expect(events.map(e => e.seq)).toEqual(events.map((_, i) => i + 1))
    expect(new Set(events.map(e => e.id)).size).toBe(events.length)
    for (const e of events) {
      expect(e.source).toBe("backfill")
      expect(e.id.startsWith("act:bf:")).toBe(true)
      for (const v of Object.values(e.facts ?? {})) expect(isActivityFact(v)).toBe(true)
    }
    // Order: by date, then the contract's kind order, then subject.
    for (let i = 1; i < events.length; i++) {
      const p = events[i - 1], e = events[i]
      expect(p.on < e.on || (p.on === e.on && kindRank(p.kind) <= kindRank(e.kind))).toBe(true)
    }
    // Idempotent: its own output is already clean, so the same state comes back.
    expect(withActivityBackfill(a)).toBe(a)
    expect(sanitizeActivity(events)).toEqual(events)
  })

  it("writes only the kinds the contract lists for backfill", () => {
    const kinds = new Set(record(withActivityBackfill(seed())).map(e => e.kind))
    // R1: the v2 seed has cheers, rebuilt as cheer.sent.
    expect([...kinds].sort()).toEqual(["cheer.sent", "event.created", "playbook.answer_added", "task.assigned", "task.claimed", "task.done"])
  })

  it("dates and attributes the seed's records as the contract describes", () => {
    const s = seed()
    const events = record(withActivityBackfill(s))
    const find = (kind: string, subject: string) => events.find(e => e.id === backfillActivityId(kind, subject))
    const minutes = s.nodes.find(n => n.id === "t-minutes")!

    expect(find("task.assigned", "t-agenda")).toMatchObject({ on: "2026-10-28", actorId: null, personIds: ["priya"], nodeId: "t-agenda" })
    // A task posted to nobody has no assignment.
    expect(find("task.assigned", "t-photos")).toBeUndefined()
    expect(find("task.claimed", "t-photos")).toBeUndefined()

    const done = find("task.done", "t-minutes")!
    expect(done).toMatchObject({ on: "2026-10-29", actorId: "priya", personIds: ["priya"], nodeId: "t-minutes", source: "backfill" })
    expect(done.facts).toEqual({ onTime: true, daysEarly: day(minutes.clubDeadline!) - day("2026-10-29"), detailsChars: 0, files: 0, viaBudget: false })
    const venue = find("task.done", "e-night:venue")!
    expect(venue).toMatchObject({ eventId: "e-night", nodeId: "e-night:venue", on: "2026-10-21" })

    for (const e of s.events) expect(find("event.created", e.id)).toMatchObject({ on: s.today, eventId: e.id, actorId: null, personIds: [], facts: { date: e.date } })
    expect(find("playbook.answer_added", "pa-2")).toMatchObject({ on: "2026-09-08", actorId: "alex", personIds: ["alex"], facts: { questionId: "pq-1", answerKind: "club" } })
    expect(find("playbook.answer_added", "pa-1")).toMatchObject({ actorId: null, personIds: [], facts: { questionId: "pq-1", answerKind: "rule" } })
    // Every done task with a completion date has exactly one task.done.
    expect(events.filter(e => e.kind === "task.done").length).toBe(s.nodes.filter(n => n.status === "done" && n.completedOn).length)
  })

  it("rebuilds submissions, completions and reminders with their facts", () => {
    const s = seed()
    const node = s.nodes.find(n => n.id === "t-flyer")!
    const submitted: Node = {
      ...node, status: "done", completedOn: "2026-11-08", clubDeadline: "2026-11-06",
      taskWork: work([
        { id: "submission-1", authorId: "sam", details: "First fictional draft of the save-the-date.", attachmentIds: ["file-a"], savedOn: "2026-11-04", ownerVersion: 0 },
        { id: "submission-3", authorId: "sam", details: "Final fictional version.", attachmentIds: ["file-a", "file-b"], savedOn: "2026-11-08", ownerVersion: 0 },
      ]),
    }
    const state: DemoState = {
      ...s,
      nodes: s.nodes.map(n => n.id === node.id ? submitted : n),
      nudges: [{ id: "nudge-1-t-agenda", nodeId: "t-agenda", channel: "email", text: "Fictional reminder text for Priya Nair", sentBy: "alex", sentOn: "2026-11-01", response: null, via: "platypus" }],
    }
    const events = record(withActivityBackfill(state))
    const find = (kind: string, subject: string) => events.find(e => e.id === backfillActivityId(kind, subject))

    expect(find("task.submitted", "t-flyer:submission-1")).toMatchObject({ on: "2026-11-04", actorId: "sam", personIds: ["sam"], nodeId: "t-flyer", facts: { detailsChars: 43, files: 1, revision: 1 } })
    expect(find("task.submitted", "t-flyer:submission-3")?.facts).toEqual({ detailsChars: 24, files: 2, revision: 2 })
    // No contribution for this task: on time is judged against the club deadline (two days late here).
    expect(find("task.done", "t-flyer")?.facts).toEqual({ onTime: false, daysEarly: -2, detailsChars: 24, files: 2, viaBudget: false })
    // Same day: the submission comes before the completion.
    expect(events.findIndex(e => e.id === backfillActivityId("task.submitted", "t-flyer:submission-3")))
      .toBeLessThan(events.findIndex(e => e.id === backfillActivityId("task.done", "t-flyer")))
    expect(find("reminder.recorded", "nudge-1-t-agenda")).toMatchObject({ on: "2026-11-01", actorId: "alex", personIds: ["priya"], nodeId: "t-agenda", facts: { via: "platypus", channel: "email" } })
  })

  it("takes on time from the matching contribution when one exists", () => {
    const s = seed()
    const state: DemoState = { ...s, contributions: s.contributions.map(c => c.nodeId === "t-minutes" ? { ...c, onTime: false } : c) }
    expect(record(withActivityBackfill(state)).find(e => e.id === backfillActivityId("task.done", "t-minutes"))?.facts?.onTime).toBe(false)
  })

  it("ignores a contribution from another completion of the task and judges against the club deadline", () => {
    const s = seed()
    const minutes = s.nodes.find(n => n.id === "t-minutes")!
    expect(minutes.completedOn! <= minutes.clubDeadline!).toBe(true)
    const doneOn = (state: DemoState) => record(withActivityBackfill(state)).find(e => e.id === backfillActivityId("task.done", "t-minutes"))?.facts?.onTime
    // A contribution from an earlier completion (the task was reopened and finished again on time).
    expect(doneOn({ ...s, contributions: s.contributions.map(c => c.nodeId === "t-minutes" ? { ...c, onTime: false, completedOn: "2026-10-12" } : c) })).toBe(true)
    // A contribution without a completion date cannot be matched either.
    expect(doneOn({ ...s, contributions: s.contributions.map(c => c.nodeId === "t-minutes" ? { personId: c.personId, nodeId: c.nodeId, points: c.points, onTime: false } : c) })).toBe(true)
  })

  it("rebuilds reminder plan v2 deliveries as reminder.recorded, like the live record", () => {
    const s = seed()
    const agenda = s.nodes.find(n => n.id === "t-agenda")!
    const venue = s.nodes.find(n => n.id === "e-night:venue")!
    const state = withDeliveries(s, [
      delivery("reminder-delivery:1", { sentOn: "2026-11-01", via: "automatic" }),
      // A follow-up to the person Priya waits on: about the owner and the recipient.
      delivery("reminder-delivery:2", { sentOn: "2026-11-02", via: "manual", recipientId: "maya", reason: "waiting_on", message: { channel: "whatsapp" } as ReminderDelivery["message"] }),
      delivery("reminder-delivery:3", { sentOn: "2026-11-02", via: "platypus", nodeId: venue.id, ownerId: "maya", recipientId: "maya", message: undefined }),
    ])
    const events = record(withActivityBackfill(state))
    const find = (subject: string) => events.find(e => e.id === backfillActivityId("reminder.recorded", subject))
    expect(find("reminder-delivery:1")).toEqual({
      id: backfillActivityId("reminder.recorded", "reminder-delivery:1"), seq: find("reminder-delivery:1")!.seq, on: "2026-11-01", actorId: "system:reminders",
      kind: "reminder.recorded", personIds: ["priya"], nodeId: "t-agenda", facts: { via: "automatic", channel: "email", recipientId: "priya" }, source: "backfill",
    })
    expect(agenda.eventId).toBeNull()
    // The sender of a manual or Platypus-drafted send is not in the ledger, so no actor is guessed.
    expect(find("reminder-delivery:2")).toMatchObject({ on: "2026-11-02", actorId: null, personIds: ["priya", "maya"], nodeId: "t-agenda", facts: { via: "manual", channel: "whatsapp", recipientId: "maya" } })
    expect(find("reminder-delivery:3")).toMatchObject({ actorId: null, personIds: ["maya"], nodeId: venue.id, eventId: venue.eventId, facts: { via: "platypus", channel: null, recipientId: "maya" } })
    const text = JSON.stringify(events)
    for (const t of ["Fictional Recipient Name", "Fictional delivery task title"]) expect(text).not.toContain(t)
    // Damaged ledger entries are skipped, and a record that exists already is never rebuilt.
    const damaged = withDeliveries(s, [null, { id: 7 }, delivery("reminder-delivery:4", { sentOn: "soon" })] as never)
    expect(record(withActivityBackfill(damaged)).some(e => e.kind === "reminder.recorded")).toBe(false)
  })

  it("never records task titles, details, reminder text, names or email addresses", () => {
    const s = seed()
    const secret = "Fictional private details about the caterer"
    const state: DemoState = {
      ...s,
      nodes: s.nodes.map(n => n.id === "t-recap" ? { ...n, taskWork: work([{ id: "submission-1", authorId: "sam", details: secret, attachmentIds: [], savedOn: "2026-10-27", ownerVersion: 0 }]) } : n),
      nudges: [{ id: "nudge-1-t-sponsor", nodeId: "t-sponsor", channel: "whatsapp", text: "Fictional nudge text", sentBy: "alex", sentOn: "2026-10-30", response: null }],
    }
    const events = record(withActivityBackfill(state))
    // Every string value in the record (IDs, kinds, fact values); keys such as "viaBudget" are schema, not data.
    const values = events.flatMap(e => [e.id, e.kind, e.actorId, e.nodeId, e.eventId, ...e.personIds, ...Object.values(e.facts ?? {})])
      .filter((v): v is string => typeof v === "string")
    const forbidden = [
      secret, "Fictional nudge text",
      ...state.nodes.map(n => n.title), ...state.nodes.map(n => n.why).filter(w => w.length > 12),
      ...state.people.flatMap(p => [p.name, p.email]), ...state.events.map(e => e.name),
      ...(state.playbook?.answers ?? []).map(a => a.text), ...(state.playbook?.questions ?? []).map(q => q.text),
    ]
    for (const f of forbidden) expect(values.some(v => v.includes(f)), f).toBe(false)
    for (const e of events) for (const v of Object.values(e.facts ?? {})) if (typeof v === "string") expect(v.length).toBeLessThanOrEqual(FACT_TEXT_MAX)
  })

  it("gives an empty record when there is nothing to rebuild", () => {
    const s = withoutActivity({ ...seed(), nodes: [], events: [], nudges: [], contributions: [], playbook: undefined, cheers: undefined })
    const next = withActivityBackfill(s)
    expect(next).not.toBe(s)
    expect(next.activity).toEqual([])
  })

  it("skips records with dates that are not demo dates", () => {
    const s = seed()
    const state: DemoState = { ...s, nodes: s.nodes.map(n => n.id === "t-agenda" ? { ...n, assignedOn: "next week" } : n) }
    expect(record(withActivityBackfill(state)).some(e => e.id === backfillActivityId("task.assigned", "t-agenda"))).toBe(false)
  })
})

describe("sanitizing a saved or imported record", () => {
  it("keeps valid events as they are and returns the same state", () => {
    const events = [live(1), live(2, { kind: "future.kind", facts: undefined }), live(3, { actorId: null, personIds: [], nodeId: undefined })]
    const clean = events.map(e => Object.fromEntries(Object.entries(e).filter(([, v]) => v !== undefined))) as unknown as ActivityEvent[]
    const s = { ...seed(), activity: clean }
    expect(sanitizeActivity(clean).every((e, i) => e === clean[i])).toBe(true)
    expect(withActivityBackfill(s)).toBe(s)
  })

  it("drops malformed events and facts, keeps unknown kinds, keeps the first of a duplicate ID and sorts by seq", () => {
    const raw: unknown[] = [
      live(5),
      live(2, { kind: "cheer.future", facts: { a: 1 } }),
      null, "act:9", 42, [live(6)],
      { ...live(7), id: "" }, { ...live(8), id: 8 },
      { ...live(9), seq: 0 }, { ...live(10), seq: 1.5 }, { ...live(11), seq: "11" },
      { ...live(12), on: "2026-13-01" }, { ...live(13), on: "yesterday" }, { ...live(14), on: "2026-02-30" },
      { ...live(15), actorId: 5 }, { ...live(16), kind: "" }, { ...live(17), personIds: ["sam", 3] }, { ...live(18), personIds: "sam" },
      { ...live(19), source: "ai" },
      { ...live(5), on: "2026-11-30" }, // duplicate ID: the first one wins
      { ...live(3), facts: { ok: "accepted", long: "x".repeat(FACT_TEXT_MAX + 1), nested: { a: 1 }, list: [1], nan: Number.NaN, none: null } },
      { ...live(4), title: "Fictional task title", nodeId: 7, eventId: ["e-night"] },
      { ...live(1), facts: "not an object" },
    ]
    const out = sanitizeActivity(raw)
    expect(out.map(e => e.seq)).toEqual([1, 2, 3, 4, 5])
    expect(out.find(e => e.seq === 5)?.on).toBe("2026-11-02")
    expect(out.find(e => e.seq === 2)?.kind).toBe("cheer.future")
    expect(out.find(e => e.seq === 3)?.facts).toEqual({ ok: "accepted", none: null })
    const four = out.find(e => e.seq === 4)!
    expect(four).not.toHaveProperty("title")
    expect(four).not.toHaveProperty("nodeId")
    expect(four).not.toHaveProperty("eventId")
    expect(out.find(e => e.seq === 1)).not.toHaveProperty("facts")
    expect(raw[0]).toBe(out[4]) // a valid event is kept as the same object
    expect(sanitizeActivity(undefined)).toEqual([])
    expect(sanitizeActivity({ 0: live(1) })).toEqual([])
  })

  it("caps the length of IDs and kinds, requires a safe seq, and an act:<n> ID that matches its seq", () => {
    const at = (n: number) => "i".repeat(n)
    const raw: unknown[] = [
      live(1, { id: `x:${at(126)}` }), // 128 characters: kept
      live(2, { id: `x:${at(127)}` }), // 129: dropped
      live(3, { kind: `k.${at(62)}` }), // 64: kept
      live(4, { kind: `k.${at(63)}` }), // 65: dropped
      live(5, { actorId: at(129) }), // dropped
      live(6, { personIds: ["jordan", at(129), at(128)] }), // the over-long entry is dropped
      live(7, { nodeId: at(129), eventId: at(129) }), // the over-long fields are dropped
      live(8, { nodeId: at(128), eventId: at(128) }),
      { ...live(9), id: "act:3" }, // an act:<n> ID that does not match its seq
      { ...live(10), seq: Number.MAX_SAFE_INTEGER + 2 },
      { ...live(11), seq: 2 ** 60 },
      live(12, { id: "act:012" }), // the same number written with leading zeros
    ]
    const out = sanitizeActivity(raw)
    expect(out.map(e => e.seq)).toEqual([1, 3, 6, 7, 8, 12])
    expect(out[0]).toBe(raw[0])
    expect(out.find(e => e.seq === 6)!.personIds).toEqual(["jordan", at(128)])
    const seven = out.find(e => e.seq === 7)!
    expect(seven).not.toHaveProperty("nodeId")
    expect(seven).not.toHaveProperty("eventId")
    expect(out.find(e => e.seq === 8)).toBe(raw[7])
  })

  it("drops hostile imported events, so live events recorded after them survive a reload", () => {
    const note = "Fictional private note pasted into the record by hand. ".repeat(5).slice(0, 234)
    expect(note).toHaveLength(234)
    const hostile: [string, ActivityEvent[]][] = [
      ["an ID that claims a later seq", [{ ...live(1), id: "act:3" }]],
      ["the largest safe seq", [live(Number.MAX_SAFE_INTEGER)]],
      ["a long note in personIds", [live(1, { personIds: ["jordan", note] })]],
    ]
    for (const [label, activity] of hostile) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...seed(), activity }))
      const loaded = loadStateWithNotice().state
      expect(JSON.stringify(loaded.activity), label).not.toContain(note)
      // Three live events: Alex takes the unowned tabling task (assigned, claimed, status change).
      const after = reducer(loaded, { type: "claimTask", nodeId: "t-tabling" })
      const recorded = record(after).filter(e => e.source === "live" && e.nodeId === "t-tabling")
      expect(recorded.map(e => e.kind), label).toEqual(["task.assigned", "task.claimed", "task.status"])
      expect(recorded.every(e => Number.isSafeInteger(e.seq) && e.id === `act:${e.seq}`), label).toBe(true)
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(after))
      const reloaded = loadStateWithNotice().state
      expect(reloaded.activity, label).toEqual(after.activity)
      expect(record(reloaded).filter(e => e.nodeId === "t-tabling" && e.source === "live").map(e => e.kind), label).toEqual(["task.assigned", "task.claimed", "task.status"])
    }
  })

  it("rebuilds a record that is not an array", () => {
    const s = { ...seed(), activity: "damaged" as unknown as ActivityEvent[] }
    const next = withActivityBackfill(s)
    expect(next.activity).toEqual(record(withActivityBackfill(withoutActivity(seed()))))
  })
})

describe("loading saved data", () => {
  it("gives a v23 save without a record one rebuilt from its records", () => {
    const saved = withoutActivity(seed())
    expect(saved.schemaVersion).toBe(23)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
    const { state, notice } = loadStateWithNotice()
    expect(notice).toBeNull()
    expect(record(state).length).toBeGreaterThan(50)
    expect(state.activity).toEqual(record(withActivityBackfill(saved)))
  })

  it("keeps a saved record, sanitized, without adding backfilled events", () => {
    const saved = { ...seed(), activity: [live(1), { ...live(2), on: "not a date" }, live(3, { facts: { from: "accepted", note: "y".repeat(80) } })] as ActivityEvent[] }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
    const { state } = loadStateWithNotice()
    expect(state.activity).toEqual([live(1), live(3, { facts: { from: "accepted" } })])
  })

  it("leaves data held back by migration_blocked untouched", () => {
    const raw = [live(1), { id: "broken" }]
    const saved = JSON.stringify({ ...seed(), schemaVersion: 22, activity: raw })
    window.localStorage.setItem(STORAGE_KEY, saved)
    const write = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key: string, value: string) {
      if (key.startsWith(`${STORAGE_KEY}.backup.`)) throw new Error("Fictional backup failure")
      return write.call(this, key, value)
    })
    const { state, notice } = loadStateWithNotice()
    expect(notice?.kind).toBe("migration_blocked")
    expect(state.activity).toEqual(raw)
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(saved)

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(withoutActivity({ ...seed(), schemaVersion: 22 })))
    const blocked = loadStateWithNotice()
    expect(blocked.notice?.kind).toBe("migration_blocked")
    expect(blocked.state).not.toHaveProperty("activity")
  })
})

describe("reset, import and export", () => {
  const withLiveEvent = () => { const s = withActivityBackfill(seed()); return { ...s, activity: [...record(s), live(record(s).length + 1, { id: "act:999" })] } }

  it("starts a new record from the fresh demo on reset", () => {
    const next = reducer(withLiveEvent(), { type: "reset" })
    expect(record(next).some(e => e.id === "act:999")).toBe(false)
    expect(next.activity).toEqual(record(withActivityBackfill(seed())))
  })

  it("rebuilds the record of an imported file that has none", () => {
    const file = JSON.parse(JSON.stringify(withoutActivity({ ...seed(), today: "2026-11-05" }))) as DemoState
    const next = reducer(seed(), { type: "replace", state: file })
    expect(record(next).length).toBeGreaterThan(50)
    expect(record(next).filter(e => e.kind === "event.created").every(e => e.on === "2026-11-05")).toBe(true)
  })

  it("keeps the valid events of an imported record with malformed ones", () => {
    const file = JSON.parse(JSON.stringify({ ...seed(), activity: [live(2), { ...live(3), seq: -1 }, { ...live(4), personIds: [null] }, live(1, { kind: "progress.future" }), "junk"] })) as DemoState
    const next = reducer(seed(), { type: "replace", state: file })
    expect(next.activity).toEqual([live(1, { kind: "progress.future" }), live(2)])
  })

  it("starts a new record for the new club on first-time setup", () => {
    const CODE = "12345678-1234-1234-1234-123456789abc"
    const s = withLiveEvent()
    const mixer = parseCommand("Plan Welcome Mixer on Nov 19, 30 people", s)[0]
    // startWorkspace itself (src/data/settings.ts) drops the old record, not only the reducer around it.
    const workspace = startWorkspace(s, clubDraft(s), mixer, "2026-11-19", CODE)
    expect(workspace).not.toBe(s)
    expect(workspace).not.toHaveProperty("activity")
    const next = reducer(s, { type: "completeSetup", draft: clubDraft(s), event: mixer, date: "2026-11-19", inviteCode: CODE })
    expect(next.org.setupCompletedOn).toBe(s.today)
    const events = record(next)
    expect(events.length).toBeGreaterThan(0)
    expect(events.some(e => e.id === "act:999")).toBe(false)
    expect(events.every(e => e.source === "backfill")).toBe(true)
    expect(events).toEqual(record(withActivityBackfill(withoutActivity(next))))
    // The new club's own event is in its record.
    expect(events.some(e => e.kind === "event.created" && next.events.some(x => x.id === e.eventId && x.name === "Welcome Mixer"))).toBe(true)
  })

  it("includes the record in the full export", () => {
    const state = withLiveEvent()
    const file = buildExport(state, [], Date.UTC(2026, 10, 2))
    expect(file.state.activity).toEqual(state.activity)
    expect(JSON.stringify(file)).toContain("act:999")
  })
})

describe("what the assistant sees", () => {
  it("never sends the record or any event ID to AI", () => {
    const base = withActivityBackfill(seed())
    const state: DemoState = { ...base, activity: [...record(base), live(record(base).length + 1, { id: "act:777" })] }
    for (const viewerId of ["alex", "sam"]) {
      const snapshot = aiSnapshot({ ...state, viewerId })
      const text = JSON.stringify(snapshot) + JSON.stringify(formSnapshot(snapshot))
      expect(snapshot).not.toHaveProperty("activity")
      expect(text).not.toContain("\"activity\"")
      expect(text).not.toContain("act:bf:")
      for (const e of record(state)) expect(text.includes(e.id), e.id).toBe(false)
    }
  })
})

describe("record size", () => {
  it("serializes a synthetic semester of 3,000 events under 700 KB (contract §5)", () => {
    // Each task's life in the record: created, assigned, claimed, three status changes, a submission, done and one reminder.
    const people = ["alex", "maya", "jordan", "sam", "priya"]
    const steps = ["plan", "venue", "registry", "budget", "quotes", "contentCreation", "promotionItems", "foodCompliance", "speakerPacket", "materials"]
    const clubEvents = ["e-night", "e-speaker", "e-founder"]
    const events: ActivityEvent[] = []
    const push = (e: Omit<ActivityEvent, "id" | "seq" | "source">) => { const seq = events.length + 1; events.push({ id: `act:${seq}`, seq, ...e, source: "live" }) }
    for (let t = 0; events.length < 3000; t++) {
      const eventId = clubEvents[t % 3], standalone = t % 4 === 3
      const nodeId = standalone ? `t-task-${t}` : `${eventId}:${steps[t % steps.length]}`
      const owner = people[t % 5], on = new Date(Date.UTC(2026, 7, 24) + Math.floor(t / 3) * 86_400_000).toISOString().slice(0, 10)
      const base = { on, actorId: owner, personIds: [owner], nodeId, ...(standalone ? {} : { eventId }) }
      push({ ...base, kind: "task.created", facts: { status: "unclaimed", eventId: standalone ? null : eventId } })
      push({ ...base, kind: "task.assigned", facts: { from: null } })
      push({ ...base, kind: "task.claimed" })
      push({ ...base, kind: "task.status", facts: { from: "unclaimed", to: "accepted" } })
      push({ ...base, kind: "task.status", facts: { from: "accepted", to: "in_progress" } })
      push({ ...base, kind: "task.submitted", facts: { detailsChars: 312, files: 1, revision: 3 } })
      push({ ...base, kind: "task.status", facts: { from: "in_progress", to: "done" } })
      push({ ...base, kind: "task.done", facts: { onTime: true, daysEarly: 2, detailsChars: 312, files: 1, viaBudget: false } })
      push({ ...base, actorId: "system:reminders", kind: "reminder.recorded", facts: { via: "platypus", channel: "email" } })
    }
    const semester = events.slice(0, 3000)
    expect(sanitizeActivity(semester)).toEqual(semester)
    const bytes = new TextEncoder().encode(JSON.stringify(semester)).length
    expect(bytes).toBeLessThan(700 * 1024)
  })
})

describe("activity backfill: cheers (R1)", () => {
  it("rebuilds the seed's cheers as cheer.sent with the live facts and without the note", () => {
    const s = withActivityBackfill(withoutActivityForCheers(seedDemo(undefined, "v2")))
    const cheers = s.cheers?.cheers ?? []
    expect(cheers.length).toBeGreaterThan(0)
    const sent = (s.activity ?? []).filter(e => e.kind === "cheer.sent")
    expect(sent.map(e => e.facts?.cheerId).sort()).toEqual(cheers.map(c => c.id).sort())
    for (const c of cheers) {
      const e = sent.find(x => x.facts?.cheerId === c.id)!
      expect(e).toMatchObject({ on: c.on, actorId: c.fromId, personIds: c.toIds, source: "backfill" })
      expect(e.facts).toEqual({ cheerId: c.id, points: c.points, recipients: c.toIds.length, noteChars: c.note.length, card: c.card, email: c.email === true })
      expect(JSON.stringify(s.activity)).not.toContain(c.note)
    }
  })
  it("records a withdrawn cheer as sent, then withdrawn", () => {
    const base = withoutActivityForCheers(seedDemo(undefined, "v2"))
    const [first, ...rest] = base.cheers!.cheers
    const s = withActivityBackfill({ ...base, cheers: { ...base.cheers!, cheers: [{ ...first, withdrawnOn: first.on }, ...rest] } })
    const kinds = (s.activity ?? []).filter(e => e.facts?.cheerId === first.id).map(e => e.kind)
    expect(kinds).toEqual(["cheer.sent", "cheer.withdrawn"])
  })
  it("R1.1: records how many people the sender let know, never who", () => {
    const base = withoutActivityForCheers(seedDemo(undefined, "v2"))
    const [first, ...rest] = base.cheers!.cheers
    const s = withActivityBackfill({ ...base, cheers: { ...base.cheers!, cheers: [{ ...first, ccIds: ["sam", "jordan"] }, ...rest] } })
    const sent = (s.activity ?? []).find(e => e.kind === "cheer.sent" && e.facts?.cheerId === first.id)!
    expect(sent.facts).toMatchObject({ cc: 2, email: true })
    expect(sent.personIds).toEqual(first.toIds)
    expect(JSON.stringify(sent)).not.toMatch(/sam|jordan/)
  })
})

function withoutActivityForCheers(s: ReturnType<typeof seedDemo>) { const { activity: _a, ...rest } = s; void _a; return rest }
