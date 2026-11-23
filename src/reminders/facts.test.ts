import { describe, expect, it } from "vitest"
import { seedDemo } from "../data/seed"
import type { DemoState } from "../data/types"
import { buildReminderFacts, buildReminderInput, reminderPeople } from "./facts"
import type { ReminderRuntime } from "./contracts"

const base = seedDemo(undefined, "v2")
const room = base.nodes.find(n => n.stepKey === "venue")!
const event = base.events.find(e => e.id === room.eventId)!
const runtime: ReminderRuntime = { version: 1, activatedOn: base.today, sequence: 0, updates: [], deliveries: [], waitingRequests: [] }
const roomState = (headcount: number, venue: "campus" | "offcampus" = "campus"): DemoState => ({
  ...base,
  events: base.events.map(e => e.id === event.id ? { ...e, name: "Speaker Night", headcount, date: "2027-04-16", venue } : e),
  nodes: base.nodes.map(n => n.id === room.id ? { ...n, clubDeadline: "2027-03-31", latestStart: "2027-03-28" } : n),
})

describe("rule-only reminder facts", () => {
  it("uses the actual activity, count and event date in a concrete booking requirement", () => {
    const facts = buildReminderFacts(roomState(40), room.id)!
    expect(facts.eventName).toBe("Speaker Night")
    expect(facts.requirement).toBe("Reserve a room for 40 attendees for Speaker Night on Apr 16 and record the booking confirmation.")
    expect(facts.due).toBe("2027-03-31")
    expect(facts.startOn).toBe("2027-03-28")
    expect(facts.requirement).not.toMatch(/Mar 31|Mar 28|Task due|Start by/)
    expect(buildReminderFacts(roomState(65), room.id)?.requirement).toContain("65 attendees")
  })

  it("omits missing or invalid counts rather than copying the illustrative 40 attendees", () => {
    for (const count of [0, -1, 3.5, Number.NaN]) {
      const facts = buildReminderFacts(roomState(count), room.id)!
      expect(facts.requirement).not.toContain("attendees")
      expect(facts.requirement).not.toContain("40")
    }
  })

  it("does not turn an invalid existing event date into a different calendar date in the requirement", () => {
    const s = roomState(40)
    s.events = s.events.map(e => e.id === event.id ? { ...e, date: "2027-02-30" } : e)
    const facts = buildReminderFacts(s, room.id)!
    expect(facts.requirement).not.toMatch(/Mar 2|Invalid Date/)
    expect(facts.requirement).toBe("Reserve a room for 40 attendees for Speaker Night and record the booking confirmation.")
  })

  it("keeps an explicitly off-campus room away from the ASU Student Unions action", () => {
    const facts = buildReminderFacts(roomState(40, "offcampus"), room.id)!
    expect(facts.requirement).toContain("Confirm the venue for 40 attendees")
    expect(facts.actionLink).toBeNull()
  })

  it("preserves an existing written why instead of generating an unsupported consequence", () => {
    const s = { ...base, nodes: base.nodes.map(n => n.id === room.id ? { ...n, why: "The accessible layout must be confirmed first" } : n) }
    expect(buildReminderFacts(s, room.id)?.importance).toBe("The accessible layout must be confirmed first.")
  })

  it("uses an actual prerequisite relationship when no why was recorded", () => {
    const s = { ...base, nodes: base.nodes.map(n => n.id === room.id ? { ...n, why: "" } : n) }
    const facts = buildReminderFacts(s, room.id)!
    const dependent = s.nodes.filter(n => n.dependsOn.includes(room.id)).sort((a, b) => a.id.localeCompare(b.id))[0]
    expect(facts.importance).toBe(`“${dependent.title}” depends on this task.`)
    expect(facts.importance).not.toContain("can start")
  })

  it("handles standalone and orphaned activity tasks without borrowing a different activity", () => {
    const standalone = buildReminderFacts(base, "t-room")!
    expect([standalone.eventId, standalone.eventName, standalone.eventDate]).toEqual([null, null, null])
    expect(standalone.requirement).toBe("Book the spring weekly meeting room.")
    const s = { ...base, events: base.events.filter(e => e.id !== event.id) }
    const orphan = buildReminderFacts(s, room.id)!
    expect([orphan.eventId, orphan.eventName, orphan.eventDate]).toEqual([null, null, null])
    expect(orphan.requirement).not.toContain("attendees")
    expect(buildReminderFacts(base, "missing-task")).toBeNull()
  })

  it("keeps a custom task's wording and has an honest fallback when purpose is missing", () => {
    const source = base.nodes.find(n => n.id === "t-room")!
    const s = { ...base, nodes: [{ ...source, title: "Call the workshop host", why: "", ruleIds: [] }] }
    const facts = buildReminderFacts(s, source.id)!
    expect(facts.requirement).toBe("Call the workshop host.")
    expect(facts.importance).toBe("Part of the club's work.")
    expect(facts.actionLink).toBeNull()
  })

  it("does not rewrite an existing date or treat title edits as a new plan", () => {
    const facts = buildReminderFacts(base, room.id)!
    expect(facts.planKey).toBe(JSON.stringify([room.id, room.ownerId, room.ownerVersion ?? 0, room.clubDeadline, room.latestStart]))
    const change = (patch: Partial<typeof room>) => buildReminderFacts({ ...base, nodes: base.nodes.map(n => n.id === room.id ? { ...n, ...patch } : n) }, room.id)!
    expect(change({ title: "A different task title", tags: ["tag-new"] }).planKey).toBe(facts.planKey)
    expect(change({ clubDeadline: "2027-05-01" }).planKey).not.toBe(facts.planKey)
    expect(change({ ownerId: "sam" }).planKey).not.toBe(facts.planKey)
    expect(change({ ownerVersion: (room.ownerVersion ?? 0) + 1 }).planKey).not.toBe(facts.planKey)
  })

  it("passes waiting text and a chosen person separately without guessing a recipient", () => {
    const s = { ...base, nodes: base.nodes.map(n => n.id === room.id ? { ...n, waitingOn: "Maya's approval", waitingOnPersonId: undefined } : n) }
    expect(buildReminderFacts(s, room.id)).toMatchObject({ waitingOn: "Maya's approval", waitingOnPersonId: null })
    const chosen = { ...s, nodes: s.nodes.map(n => n.id === room.id ? { ...n, waitingOnPersonId: "maya" } : n) }
    expect(buildReminderFacts(chosen, room.id)?.waitingOnPersonId).toBe("maya")
  })
})

describe("reminder people and input", () => {
  it("excludes former and incoming officers from active recipients while retaining history identity", () => {
    const s = { ...base, people: base.people.map(p => p.id === "jordan" ? { ...p, leftOn: base.today } : p.id === "sam" ? { ...p, incomingFor: "r-mkt" } : p) }
    const people = reminderPeople(s)
    expect(people.find(p => p.id === "jordan")).toMatchObject({ active: false, name: "Jordan Patel" })
    expect(people.find(p => p.id === "sam")?.active).toBe(false)
    expect(people.find(p => p.id === "maya")?.active).toBe(true)
  })

  it("requires current role ownership for leadership and keeps actual recipient channel preferences", () => {
    expect(reminderPeople(base).find(p => p.id === "alex")?.lead).toBe(true)
    expect(reminderPeople(base).find(p => p.id === "jordan")?.channel).toBe("sms")
    const s = { ...base, roles: base.roles.map(r => r.fn === "president" ? { ...r, holderId: null } : r) }
    expect(reminderPeople(s).find(p => p.id === "alex")?.lead).toBe(false)
    const former = { ...base, people: base.people.map(p => p.id === "alex" ? { ...p, leftOn: base.today } : p) }
    expect(reminderPeople(former).find(p => p.id === "alex")?.lead).toBe(false)
  })

  it("adapts settings and runtime without side effects or requiring AI/network access", () => {
    const s = structuredClone(base)
    const before = structuredClone(s)
    const input = buildReminderInput(s, runtime)
    // The sample club starts on "I review, Platypus sends" (S2); an old save without a choice has none.
    expect(input.mode).toBe("review_then_auto")
    const { reminderMode: _gone, ...settings } = s.org.settings; void _gone
    expect(buildReminderInput({ ...s, org: { ...s.org, settings } }, runtime).mode).toBeNull()
    expect(input.maxPerTask).toBe(base.org.settings.maxRemindersPerTask)
    expect(input.today).toBe(base.today)
    expect(input.runtime).toBe(runtime)
    expect(input.tasks).toHaveLength(base.nodes.length)
    expect(s).toEqual(before)
    expect(runtime.deliveries).toEqual([])
    const mode = { ...s, org: { ...s.org, settings: { ...s.org.settings, reminderMode: "auto_email" as const } } }
    expect(buildReminderInput(mode, runtime).mode).toBe("auto_email")
  })
})
