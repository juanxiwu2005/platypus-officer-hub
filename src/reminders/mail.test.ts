import { describe, expect, it, vi } from "vitest"
import { buildReminderMail, checkReminderMail } from "./mail"
import type { ReminderMailInput } from "./accessContracts"
import type { ReminderTaskFacts, WaitingRequest } from "./contracts"

const URL = "https://demo.example.org/#/officer?access=grant.signature"
const facts = (patch: Partial<ReminderTaskFacts> = {}): ReminderTaskFacts => ({
  nodeId: "room", eventId: "speaker", eventName: "Speaker Night", eventDate: "2027-04-16", title: "Reserve a room",
  requirement: "Reserve a room for 40 attendees on Apr 16 and record the booking confirmation.",
  importance: "Confirming the room lets us share the location with everyone.",
  ownerId: "jordan", ownerVersion: 0, status: "accepted", due: "2027-03-31", startOn: "2027-03-28",
  waitingOn: null, waitingOnPersonId: null, actionLink: null, source: "Fictional fixture", planKey: "plan", ...patch,
})
const input = (patch: Partial<ReminderMailInput> = {}): ReminderMailInput => ({
  today: "2027-03-28", facts: facts(), taskUrl: URL,
  recipient: { id: "jordan", name: "Jordan Patel", email: "jordan@example.org", active: true, lead: false, channel: "email" }, ...patch,
})
const request = (patch: Partial<WaitingRequest> = {}): WaitingRequest => ({
  id: "wait-room", nodeId: "room", ownerId: "jordan", ownerVersion: 0, recipientId: "sam", waitingOn: "Please confirm which room layout is needed.",
  createdOn: "2027-03-28", sequence: 1, closedOn: null, ...patch,
})

describe("short rule-generated mail", () => {
  it("puts the activity first and includes the concrete room requirement, importance and thanks", () => {
    const mail = buildReminderMail(input())
    expect(mail.subject).toBe("Speaker Night · Reserve a room")
    expect(mail.body).toContain("Task due: Mar 31")
    expect(mail.body).toContain("40 attendees on Apr 16")
    expect(mail.body).toContain("booking confirmation")
    expect(mail.body).toContain("share the location")
    expect(mail.body).toContain("Hi Jordan,")
    expect(mail.body).toContain("so we can help")
    expect(mail.body).toContain("Thank you for your work")
    expect(mail.wordCount).toBeLessThanOrEqual(100)
    expect(mail.checked).toBe(true)
  })

  it("hides the numeric start date and never reintroduces navigation steps or status links", () => {
    const mail = buildReminderMail(input())
    expect(mail.body).toContain("Today is our planned start date")
    expect(mail.body).not.toMatch(/Mar 28|Start by|Time to start|Why now:|What:|How:|~\d workday|1\. Open|reply=/)
    expect(mail.body.match(/https?:\/\/\S+/g)).toEqual([URL])
  })

  it.each([
    ["2027-03-27", /prepare/, /today.*planned start|past due/],
    ["2027-03-29", /planned start has passed/, /due today/],
    ["2027-03-31", /due today; no completion update/, /planned start/],
    ["2027-04-01", /1 day past due/, /due today/],
    ["2027-04-03", /3 days past due/, /due today/],
  ])("explains the real phase on %s without treating missing records as proof of no work", (today, expected, excluded) => {
    const mail = buildReminderMail(input({ today: today as string }))
    expect(mail.body).toMatch(expected as RegExp)
    expect(mail.body).not.toMatch(excluded as RegExp)
    expect(mail.body).not.toMatch(/you haven't|you have not|you didn't|you did not/i)
    expect(mail.checked).toBe(true)
  })

  it("does not call started work unstarted, and does not prepare a send for completed work", () => {
    expect(buildReminderMail(input({ facts: facts({ status: "in_progress" }) })).body).toContain("Work is marked as in progress")
    const done = buildReminderMail(input({ today: "2027-04-01", facts: facts({ status: "done" }) }))
    expect(done.checked).toBe(false)
    expect(done.body).toContain("completion update is recorded")
    expect(done.body).not.toContain("past due")
  })

  it("does not invent event names, dates, attendees or effort for a standalone task", () => {
    const mail = buildReminderMail(input({ facts: facts({ eventId: null, eventName: null, eventDate: null, requirement: "Confirm the room.", due: null, startOn: null }) }))
    expect(mail.subject).toBe("Club work · Reserve a room")
    expect(mail.body).toContain("Task due: Not set")
    expect(mail.body).not.toMatch(/40|Mar|Apr|workday/)
    expect(mail.checked).toBe(true)
  })

  it("keeps a long human description concise and leaves the full detail to the task page", () => {
    const mail = buildReminderMail(input({ facts: facts({ requirement: "Reserve a room for 40 attendees and record its confirmation. " + "Extra detail. ".repeat(80), importance: "The confirmed location supports the invitation. " + "Other context. ".repeat(80) }) }))
    expect(mail.body).toContain("40 attendees")
    expect(mail.body).toContain("record its confirmation")
    expect(mail.wordCount).toBeLessThanOrEqual(100)
    expect(mail.checked).toBe(true)
  })

  it("puts exactly one access link in mail even when source prose has other links", () => {
    const mail = buildReminderMail(input({ facts: facts({ requirement: "Reserve a room via https://asu.example.org/form and record confirmation.", importance: "The [room guide](https://asu.example.org/guide) supports this work." }) }))
    expect(mail.body.match(/https?:\/\/\S+/g)).toEqual([URL])
    expect(mail.body).not.toContain("asu.example.org")
    expect(mail.checked).toBe(true)
  })

  it.each(["ASAP", "Is it done yet?", "Just use AI", "URGENT", "This should only take an hour"])("does not repeat coercive source wording: %s", phrase => {
    const mail = buildReminderMail(input({ facts: facts({ title: phrase, requirement: phrase, importance: phrase }) }))
    expect(mail.text).not.toContain(phrase)
    expect(mail.checked).toBe(true)
  })

  it("rejects another URL, a per-status link, a tampered count or an arbitrary recipient", () => {
    const mail = buildReminderMail(input())
    expect(checkReminderMail({ ...mail, body: mail.body + " https://other.example.org/" })).toBe(false)
    expect(buildReminderMail(input({ taskUrl: URL + "&reply=done" })).checked).toBe(false)
    expect(checkReminderMail({ ...mail, wordCount: 0 })).toBe(false)
    expect(buildReminderMail(input({ recipient: { ...input().recipient, id: "someone-else" } })).checked).toBe(false)
  })

  it("does not use an invalid date or inactive recipient", () => {
    const mail = buildReminderMail(input({ facts: facts({ due: "2027-02-30", startOn: null }) }))
    expect(mail.body).toContain("Task due: Not set")
    expect(buildReminderMail(input({ recipient: { ...input().recipient, active: false } })).checked).toBe(false)
  })

  it("needs no AI, fetch request or wall clock", () => {
    const fetch = vi.fn(), now = vi.spyOn(Date, "now")
    vi.stubGlobal("fetch", fetch)
    try {
      const a = buildReminderMail(input()), b = buildReminderMail(input())
      expect(a).toEqual(b)
      expect(fetch).not.toHaveBeenCalled()
      expect(now).not.toHaveBeenCalled()
    } finally { now.mockRestore(); vi.unstubAllGlobals() }
  })
})

describe("mail asking the waiting object for help", () => {
  const waitingInput = (r = request()): ReminderMailInput => input({
    facts: facts({ status: "waiting", waitingOnPersonId: "sam", waitingOn: r.waitingOn }), request: r, requesterName: "Jordan",
    recipient: { ...input().recipient, id: "sam", name: "Sam Okafor", email: "sam@example.org" },
  })
  it("names the requester and needed input without assigning them the owner's room booking", () => {
    const mail = buildReminderMail(waitingInput())
    expect(mail.body).toContain("Jordan is waiting for your input")
    expect(mail.body).toContain("confirm which room layout is needed")
    expect(mail.body).not.toContain("Reserve a room for 40 attendees")
    expect(mail.recipientId).toBe("sam")
    expect(mail.checked).toBe(true)
  })
  it("does not turn a person's name into an action or use a closed request", () => {
    const named = buildReminderMail(waitingInput(request({ waitingOn: "Sam Okafor" })))
    expect(named.body).toContain("Could you share an update with the task's owner?")
    expect(buildReminderMail(waitingInput(request({ closedOn: "2027-03-28", closeReason: "changed" }))).checked).toBe(false)
  })
  it("requires matching task, original owner, assignment and intended helper", () => {
    for (const patch of [{ recipientId: "maya" }, { nodeId: "other-task" }, { ownerId: "maya" }, { ownerVersion: 3 }]) {
      expect(buildReminderMail(waitingInput(request(patch))).checked).toBe(false)
    }
  })
})
