import { describe, expect, it, vi } from "vitest"
import { buildReminderMail, checkReminderMail } from "./mail"
import type { ReminderMailInput } from "./accessContracts"
import type { ReminderCandidate, ReminderTaskFacts, WaitingRequest } from "./contracts"

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
    expect(mail.subject).toBe("Speaker Night: Reserve a room, due Mar 31")
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
    expect(mail.body).toContain("This is planned to start today. Need anything?")
    expect(mail.body).not.toMatch(/Mar 28|Start by|Time to start|Why now:|What:|How:|~\d workday|1\. Open|reply=/)
    expect(mail.body.match(/https?:\/\/\S+/g)).toEqual([URL])
  })

  it.each([
    ["2027-03-27", /prepare/, /today.*planned start|past due/],
    ["2027-03-29", /This was planned to start Mar 28\. Need anything\?/, /due today/],
    ["2027-03-31", /This is due today\. How's it going\?/, /planned to start/],
    ["2027-04-01", /It's 1 day past the due date\. How's it going\?/, /due today|1 days/],
    ["2027-04-03", /It's 3 days past the due date\. How's it going\?/, /due today/],
  ])("explains the real phase on %s without treating missing records as proof of no work", (today, expected, excluded) => {
    const mail = buildReminderMail(input({ today: today as string }))
    expect(mail.body).toMatch(expected as RegExp)
    expect(mail.body).not.toMatch(excluded as RegExp)
    expect(mail.body).not.toMatch(/you haven't|you have not|you didn't|you did not/i)
    expect(mail.checked).toBe(true)
  })

  it("does not call started work unstarted, and does not prepare a send for completed work", () => {
    expect(buildReminderMail(input({ facts: facts({ status: "in_progress" }) })).body).toContain("Good to see this is underway.")
    const done = buildReminderMail(input({ today: "2027-04-01", facts: facts({ status: "done" }) }))
    expect(done.checked).toBe(false)
    expect(done.body).toContain("completion update is recorded")
    expect(done.body).not.toContain("past due")
  })

  it("does not invent event names, dates, attendees or effort for a standalone task", () => {
    const mail = buildReminderMail(input({ facts: facts({ eventId: null, eventName: null, eventDate: null, requirement: "Confirm the room.", due: null, startOn: null }) }))
    expect(mail.subject).toBe("Reserve a room")
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
    expect(mail.body).toContain("Jordan is waiting on your input.")
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

describe("reminder wording reads like a person wrote it (C2)", () => {
  const AUDIT = /is recorded|not recorded|recorded as provided|no completion update|no start update|·|—/
  const waitingInput = (r: WaitingRequest, patch: Partial<ReminderMailInput> = {}): ReminderMailInput => input({
    facts: facts({ status: "waiting", waitingOnPersonId: "sam", waitingOn: r.waitingOn }), request: r, requesterName: "Jordan Patel",
    recipient: { ...input().recipient, id: "sam", name: "Sam Okafor", email: "sam@example.org" }, ...patch,
  })
  const followup = (r: WaitingRequest): ReminderCandidate => ({ id: "c", nodeId: "room", ownerId: "jordan", ownerVersion: 0, recipientId: "sam", planKey: "plan",
    reason: "waiting_followup", scheduledOn: "2027-04-02", due: "2027-03-31", overdueDays: 2, explanation: "Fictional fixture", waitingRequestId: r.id })

  it.each([
    ["overdue by one day", input({ today: "2027-04-01" }), "It's 1 day past the due date. How's it going?"],
    ["overdue by five days", input({ today: "2027-04-05" }), "It's 5 days past the due date. How's it going?"],
    ["due today", input({ today: "2027-03-31" }), "This is due today. How's it going?"],
    ["planned start passed", input({ today: "2027-03-30" }), "This was planned to start Mar 28. Need anything?"],
    ["waiting for input", waitingInput(request()), "Jordan is waiting on your input."],
  ])("%s: one plain sentence, no audit-log wording or em dash", (_, value, line) => {
    const mail = buildReminderMail(value)
    expect(mail.body).toContain(line)
    expect(mail.text).not.toMatch(AUDIT)
    expect(mail.checked).toBe(true)
  })

  it("a help request with no reply names the person who asked", () => {
    const r = request({ createdOn: "2027-03-28" })
    const mail = buildReminderMail(waitingInput(r, { today: "2027-04-02", candidate: followup(r) }))
    expect(mail.body).toContain("Jordan asked for help and hasn't heard back yet.")
    expect(mail.body).toContain("Your input will help Jordan plan the next step.")
    expect(mail.text).not.toMatch(AUDIT)
  })

  it("an acknowledged request keeps the engine's expected date", () => {
    const r = request({ response: "acknowledged", respondedOn: "2027-03-29", responseBy: "sam", expectedOn: "2027-04-01" })
    const mail = buildReminderMail(waitingInput(r, { today: "2027-04-02", candidate: followup(r) }))
    expect(mail.body).toContain("Jordan is still waiting on your input, expected by Apr 1.")
    expect(mail.text).not.toMatch(AUDIT)
  })

  it("uses a neutral fallback when the requester is unknown", () => {
    const mail = buildReminderMail(waitingInput(request(), { requesterName: undefined }))
    expect(mail.body).toContain("A teammate is waiting on your input.")
    expect(mail.body).toContain("Your input will help the owner plan the next step.")
  })

  it("subject: event, task and due date; task and due date without an event; task alone without a due date", () => {
    expect(buildReminderMail(input()).subject).toBe("Speaker Night: Reserve a room, due Mar 31")
    expect(buildReminderMail(input({ facts: facts({ eventId: null, eventName: null, eventDate: null }) })).subject).toBe("Reserve a room, due Mar 31")
    expect(buildReminderMail(input({ facts: facts({ eventId: null, eventName: null, eventDate: null, due: null }) })).subject).toBe("Reserve a room")
  })

  it("signs with the sender's first name after the thanks, and leaves the sign-off out when nobody sends it", () => {
    const signed = buildReminderMail(input({ senderName: "Avery Chen" }))
    expect(signed.body).toContain("Thank you for your work on this.\nAvery\n\nOpen task: ")
    expect(signed.checked).toBe(true)
    const unsigned = buildReminderMail(input())
    expect(unsigned.body).toContain("Thank you for your work on this.\n\nOpen task: ")
    expect(buildReminderMail(input({ senderName: "  " })).body).toBe(unsigned.body)
    expect(buildReminderMail(input({ senderName: "https://evil.example.org Avery" })).body).not.toContain("evil")
  })
})
