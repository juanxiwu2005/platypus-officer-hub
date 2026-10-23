import type { DemoState, Node } from "./types"
import { addDays, onOrAfterWeekday, toISO } from "../lib/dates"

export const SCHEMA_VERSION = 1

/**
 * The fictional demo organization used for development and Phase 3 sessions.
 * Every name, email and number here is invented. No research data belongs in this file.
 *
 * Node dates below are provisional placeholders relative to "today". From WP1 on, the rule
 * engine recomputes officialDeadline / clubDeadline / latestStart for every node.
 */
export function seedDemo(today: string = toISO(new Date())): DemoState {
  const nightDate = onOrAfterWeekday(addDays(today, 26), 4) // a Thursday about four weeks out
  const speakerDate = onOrAfterWeekday(addDays(today, 70), 4)
  const d = (n: number) => addDays(today, n)

  const node = (n: Partial<Node> & Pick<Node, "id" | "title">): Node => ({
    eventId: null,
    ownerId: null,
    approverRoleId: "r-pres",
    consultedRoleIds: [],
    informedRoleIds: [],
    dependsOn: [],
    tier: "light",
    officialDeadline: null,
    clubDeadline: null,
    latestStart: null,
    ruleIds: [],
    status: "accepted",
    acceptedOn: d(-10),
    waitingOn: null,
    draftLink: null,
    why: "",
    lastUpdate: d(-2),
    ...n,
  })

  return {
    schemaVersion: SCHEMA_VERSION,
    today,
    viewerId: "alex",
    aiEnabled: true,
    org: {
      id: "dfs",
      name: "Desert Founders Society",
      school: "ASU Tempe",
      mission: "Help students learn how startups actually work by building with real founders.",
      goals: [
        { id: "g-events", label: "Weekly events this semester", target: 12, current: 7, unit: "events" },
        { id: "g-loyal", label: "Loyal members (3+ events)", target: 30, current: 18, unit: "members" },
        { id: "g-income", label: "External income", target: 1000, current: 350, unit: "USD" },
      ],
      settings: {
        clubBufferBusinessDays: 3,
        silenceProtocol: { nudgeDays: [3, 5], presidentDay: 7, reassignDay: 8, retroDay: 10 },
        maxRemindersPerTask: 3,
        sendMode: "review",
        quietHours: { from: "22:00", to: "08:00" },
      },
    },
    roles: [
      { id: "r-pres", displayName: "President", fn: "president", holderId: "alex" },
      { id: "r-fin", displayName: "Treasurer", fn: "finance", holderId: "maya" },
      { id: "r-events", displayName: "Events lead", fn: "programs", holderId: "jordan" },
      { id: "r-mkt", displayName: "Marketing lead", fn: "marketing", holderId: "sam" },
      { id: "r-sec", displayName: "Secretary", fn: "secretary", holderId: "priya" },
    ],
    people: [
      { id: "alex", name: "Alex Rivera", roleId: "r-pres", email: "alex.rivera@example.org", channels: ["email", "whatsapp"], remindAt: "morning", busyWeeks: [], careerGoal: "Product management", interests: "Startups, public speaking", personalBufferDays: 1 },
      { id: "maya", name: "Maya Chen", roleId: "r-fin", email: "maya.chen@example.org", channels: ["whatsapp", "email"], remindAt: "evening", busyWeeks: [onOrAfterWeekday(d(14), 1)], careerGoal: "Corporate finance", interests: "Budgeting, analytics", personalBufferDays: 1 },
      { id: "jordan", name: "Jordan Patel", roleId: "r-events", email: "jordan.patel@example.org", channels: ["sms", "email"], remindAt: "morning", busyWeeks: [], careerGoal: "Event and operations management", interests: "Logistics, hospitality", personalBufferDays: 2 },
      { id: "sam", name: "Sam Okafor", roleId: "r-mkt", email: "sam.okafor@example.org", channels: ["whatsapp"], remindAt: "evening", busyWeeks: [onOrAfterWeekday(d(7), 1)], careerGoal: "Brand marketing", interests: "Design, social media", personalBufferDays: 1 },
      { id: "priya", name: "Priya Nair", roleId: "r-sec", email: "priya.nair@example.org", channels: ["email"], remindAt: "morning", busyWeeks: [], careerGoal: "Consulting", interests: "Writing, research", personalBufferDays: 1 },
    ],
    events: [
      { id: "e-night", name: "Networking Night", date: nightDate, type: "social", headcount: 30, venue: "campus", food: "offsite", funding: "usg", speaker: false, goalId: "g-events", playbookId: "oa101-social" },
      { id: "e-speaker", name: "Spring Speaker Night", date: speakerDate, type: "speaker", headcount: 60, venue: "campus", food: "offsite", funding: "usg", speaker: true, goalId: "g-events", playbookId: "oa101-speaker" },
    ],
    nodes: [
      node({ id: "n-venue", eventId: "e-night", title: "Reserve the room in Mazevo", ownerId: "jordan", status: "done", ruleIds: ["R03"], latestStart: d(-14), clubDeadline: d(-12), officialDeadline: addDays(nightDate, -16), why: "Rooms near the MU fill up early." }),
      node({ id: "n-registry", eventId: "e-night", title: "Register the event in Event Registry", ownerId: "alex", status: "done", ruleIds: ["R01"], latestStart: d(-10), clubDeadline: d(-8), officialDeadline: addDays(nightDate, -30), why: "Needed before the room booking can be confirmed." }),
      node({ id: "n-quote", eventId: "e-night", title: "Get the caterer quote and insurance certificate", ownerId: "maya", status: "done", ruleIds: ["R06"], latestStart: d(-8), clubDeadline: d(-4), why: "The food request and the USG request both need the quote." }),
      node({ id: "n-ritm", eventId: "e-night", title: "Add the RITM number to the room request", ownerId: "jordan", status: "in_progress", ruleIds: ["R04"], dependsOn: ["n-venue", "n-registry"], latestStart: d(-1), clubDeadline: d(1), officialDeadline: addDays(nightDate, -14), why: "Without it the room booking can be canceled." }),
      node({ id: "n-foodex", eventId: "e-night", title: "Submit the Food Exception Request", ownerId: "maya", status: "waiting", waitingOn: "Approval from Student Unions", ruleIds: ["R06"], dependsOn: ["n-quote"], latestStart: d(-3), clubDeadline: d(2), officialDeadline: addDays(nightDate, -14), tier: "medium", why: "An outside caterer is not allowed without it." }),
      node({ id: "n-flyer", eventId: "e-night", title: "Finish the event flyer", ownerId: "sam", status: "waiting", waitingOn: "Speaker headshot from the alumni panelist", ruleIds: ["R11"], latestStart: d(-2), clubDeadline: d(1), tier: "medium", why: "USG requires the flyer with the funding request." }),
      node({ id: "n-usg", eventId: "e-night", title: "Submit the USG food request", ownerId: "maya", status: "accepted", ruleIds: ["R09", "R11"], dependsOn: ["n-quote", "n-flyer"], latestStart: d(0), clubDeadline: d(2), officialDeadline: addDays(nightDate, -14), tier: "medium", why: "Everything about the dinner waits on this approval." }),
      node({ id: "n-rsvp", eventId: "e-night", title: "Publish the event and open RSVPs in Sun Devil Central", ownerId: null, status: "unclaimed", acceptedOn: null, latestStart: d(1), clubDeadline: d(4), why: "Catering needs an RSVP count; no RSVPs nearly cost one club its food order." }),
      node({ id: "n-advisor", eventId: "e-night", title: "Confirm the advisor will attend", ownerId: "alex", status: "accepted", ruleIds: ["R02"], latestStart: d(5), clubDeadline: d(8), why: "Student-organization events need the advisor present." }),
      node({ id: "n-headcount", eventId: "e-night", title: "Send the final headcount to the caterer", ownerId: "jordan", status: "accepted", dependsOn: ["n-rsvp"], latestStart: addDays(nightDate, -5), clubDeadline: addDays(nightDate, -4), why: "Order for about 40–50% of RSVPs; free evening events rarely fill." }),
      node({ id: "n-closeout", eventId: "e-night", title: "Close out: reimbursement, attendance list, retro", ownerId: "maya", status: "accepted", ruleIds: ["R11", "R12"], latestStart: addDays(nightDate, 1), clubDeadline: addDays(nightDate, 3), tier: "medium", why: "Unspent or undocumented money causes problems next term." }),
      node({ id: "n-news", title: "Send the October newsletter", ownerId: "sam", status: "waiting", waitingOn: "Event photos from the secretary", latestStart: d(-4), clubDeadline: d(-1), why: "Monthly update to members.", lastUpdate: d(-6) }),
      node({ id: "n-room", title: "Book the spring weekly meeting room", ownerId: "jordan", status: "accepted", ruleIds: ["R03"], latestStart: d(3), clubDeadline: d(8), why: "Spring bookings open early in November." }),
      node({ id: "n-sdc", title: "Check the officer list in Sun Devil Central", ownerId: "alex", status: "accepted", ruleIds: ["R16"], latestStart: d(5), clubDeadline: d(9), why: "A new officer joined this month and must be listed." }),
      node({ id: "n-recon", title: "Reconcile September receipts", ownerId: "maya", status: "in_progress", ruleIds: ["R11"], latestStart: d(-3), clubDeadline: d(2), why: "Two receipts are missing invoice addresses." }),
    ],
    nudges: [],
    contributions: [
      { personId: "jordan", nodeId: "n-venue", points: 1, onTime: true },
      { personId: "alex", nodeId: "n-registry", points: 1, onTime: true },
      { personId: "maya", nodeId: "n-quote", points: 1, onTime: true },
    ],
    contacts: [
      { id: "c-caterer", name: "Desert Table Catering (fictional)", organization: "Local caterer", relation: "Vendor", lastContact: d(-9), cadenceDays: 60, ownerRoleId: "r-fin", eventIds: ["e-night"] },
      { id: "c-founder", name: "Riley Brooks (fictional)", organization: "Saguaro Labs (fictional)", relation: "Guest speaker", lastContact: d(-95), cadenceDays: 90, ownerRoleId: "r-pres", eventIds: ["e-speaker"] },
    ],
    funding: [{ eventId: "e-night", source: "usg", amount: 2000, stage: "budget_request", spendBy: addDays(nightDate, 30) }],
    handoff: null,
    changeSets: [],
  }
}
