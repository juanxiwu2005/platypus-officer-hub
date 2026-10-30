import type { DemoState, Event, Node, NodeStatus, Role } from "./types"
import { buildEventNodes } from "../engine/playbooks"
import { applySchedule } from "../engine/schedule"
import { DUTY_TEMPLATES } from "./structure"

export const SCHEMA_VERSION = 6

/**
 * The demo starts on a fixed date, so every participant and every test sees the same plan
 * (Networking Night on Thu Nov 19, USG food request: start Wed Oct 28, club deadline Fri Oct 30,
 * ASU deadline Wed Nov 4, as in plan §4). The simulated clock (WP3) moves forward from here.
 */
export const DEMO_TODAY = "2026-10-22"

/**
 * The fictional demo organization used for development and Phase 3 sessions.
 * Every name, email and number here is invented. No research data belongs in this file.
 * Dates are never written here: the rule engine computes them from the playbook (src/engine).
 */
export function seedDemo(today: string = DEMO_TODAY): DemoState {
  const roles: Role[] = [
    { id: "r-pres", displayName: "President", fn: "president", holderId: "alex", reportsToId: null, duties: DUTY_TEMPLATES.president },
    { id: "r-fin", displayName: "Treasurer", fn: "finance", holderId: "maya", reportsToId: "r-pres", duties: DUTY_TEMPLATES.finance },
    { id: "r-events", displayName: "Events lead", fn: "programs", holderId: "jordan", reportsToId: "r-pres", duties: DUTY_TEMPLATES.programs },
    { id: "r-mkt", displayName: "Marketing lead", fn: "marketing", holderId: "sam", reportsToId: "r-pres", duties: DUTY_TEMPLATES.marketing },
    { id: "r-sec", displayName: "Secretary", fn: "secretary", holderId: "priya", reportsToId: "r-pres", duties: DUTY_TEMPLATES.secretary },
  ]
  const events: Event[] = [
    { id: "e-night", name: "Networking Night", date: "2026-11-19", type: "social", headcount: 30, venue: "campus", food: "offsite", funding: "usg", speaker: false, goalId: "g-events", playbookId: "seo-event" },
    { id: "e-speaker", name: "Spring Speaker Night", date: "2027-02-11", type: "speaker", headcount: 60, venue: "campus", food: "offsite", funding: "usg", speaker: true, goalId: "g-events", playbookId: "seo-event" },
  ]

  // Where each Networking Night step stands on the demo date.
  const nightStatus: Record<string, Partial<Node> & { status: NodeStatus }> = {
    draft: { status: "done" },
    mktneeds: { status: "done" },
    budget: { status: "done" },
    approve: { status: "done" },
    registry: { status: "done" },
    venue: { status: "done" },
    quote: { status: "done" },
    ritm: { status: "in_progress" },
    foodex: { status: "waiting", waitingOn: "Approval from Student Unions" },
    flyer: { status: "waiting", waitingOn: "Speaker headshot from the alumni panelist" },
    rsvp: { status: "unclaimed", ownerId: null },
  }
  const speakerStatus: Record<string, Partial<Node> & { status: NodeStatus }> = {
    partner: { status: "in_progress" },
    draft: { status: "accepted" },
  }

  const night = buildEventNodes(events[0], roles, { fundingAmount: 2000 }).map(n => {
    const s = nightStatus[n.stepKey!] ?? { status: "accepted" as NodeStatus }
    return { ...n, assignedOn: "2026-10-08", ownerVersion: 0, acceptedOn: s.status === "unclaimed" ? null : "2026-10-08", lastUpdate: "2026-10-20", ...s }
  })
  const speaker = buildEventNodes(events[1], roles).map(n => {
    const s = speakerStatus[n.stepKey!]
    return s ? { ...n, assignedOn: "2026-10-19", ownerVersion: 0, acceptedOn: "2026-10-19", lastUpdate: "2026-10-20", ...s } : { ...n, assignedOn: today, ownerVersion: 0 }
  })

  const task = (n: Partial<Node> & Pick<Node, "id" | "title" | "fn" | "ownerId">, club: string, official: string | null = null): Node => ({
    eventId: null, stepKey: null, phase: null, approverRoleId: "r-pres", consultedRoleIds: [], informedRoleIds: [], dependsOn: [],
    tier: "light", estDays: 1, anchor: { kind: "fixed", official, club }, clubDeadlineOverride: null,
    officialDeadline: null, clubDeadline: null, latestStart: null, ruleIds: [], status: "accepted", acceptedOn: "2026-10-01",
    waitingOn: null, draftLink: null, why: "", source: "Standalone task", lastUpdate: "2026-10-18", ...n,
  })
  const standalone: Node[] = [
    task({ id: "t-news", title: "Send the October newsletter", fn: "marketing", ownerId: "sam", status: "waiting", waitingOn: "Event photos from the secretary", why: "Monthly update to members.", lastUpdate: "2026-10-16" }, "2026-10-21"),
    task({ id: "t-room", title: "Book the spring weekly meeting room", fn: "programs", ownerId: "jordan", ruleIds: ["R03"], why: "Spring bookings open early in November." }, "2026-11-03"),
    task({ id: "t-sdc", title: "Check the officer list in Sun Devil Central", fn: "president", ownerId: "alex", ruleIds: ["R16"], why: "A new officer joined this month and must be listed." }, "2026-11-04"),
    task({ id: "t-recon", title: "Reconcile September receipts", fn: "finance", ownerId: "maya", status: "in_progress", ruleIds: ["R11"], estDays: 2, why: "Two receipts are missing invoice addresses." }, "2026-10-26"),
    task({ id: "t-silence", title: "Confirm the workshop checklist", fn: "programs", ownerId: "jordan", lastUpdate: today, acceptedOn: today, assignedOn: today, why: "A fictional task for the ten-day follow-up walkthrough." }, "2026-10-27"),
  ]

  return applySchedule({
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
      workspace: { calendarUrl: "https://calendar.google.com/", messaging: "whatsapp", driveLink: "", planningNotes: "Programs plans the event; marketing prepares the flyer; finance submits funding requests. The president reviews decisions.", files: [] },
      setupCompletedOn: null,
      inviteCode: crypto.randomUUID(),
    },
    roles,
    people: [
      { id: "alex", name: "Alex Rivera", roleId: "r-pres", email: "alex.rivera@example.org", channels: ["email", "whatsapp"], remindAt: "morning", busyWeeks: [], careerGoal: "Product management", interests: "Startups, public speaking", personalBufferDays: 1 },
      { id: "maya", name: "Maya Chen", roleId: "r-fin", email: "maya.chen@example.org", channels: ["whatsapp", "email"], remindAt: "evening", busyWeeks: ["2026-11-09"], careerGoal: "Corporate finance", interests: "Budgeting, analytics", personalBufferDays: 1 },
      { id: "jordan", name: "Jordan Patel", roleId: "r-events", email: "jordan.patel@example.org", channels: ["sms", "email"], remindAt: "morning", busyWeeks: [], careerGoal: "Event and operations management", interests: "Logistics, hospitality", personalBufferDays: 2 },
      { id: "sam", name: "Sam Okafor", roleId: "r-mkt", email: "sam.okafor@example.org", channels: ["whatsapp"], remindAt: "evening", busyWeeks: ["2026-11-02"], careerGoal: "Brand marketing", interests: "Design, social media", personalBufferDays: 1 },
      { id: "priya", name: "Priya Nair", roleId: "r-sec", email: "priya.nair@example.org", channels: ["email"], remindAt: "morning", busyWeeks: [], careerGoal: "Consulting", interests: "Writing, research", personalBufferDays: 1 },
    ].map((p, i) => ({ ...p, channels: p.channels as import("./types").Channel[], remindAt: p.remindAt as "morning" | "evening", personalBufferEnabled: true, phone: `480-555-01${String(i + 1).padStart(2, "0")}`, asuId: `9999${String(i + 1).padStart(6, "0")}`, expectations: "Learn the role and help our club follow through.", freeSlots: [{ day: 4, from: i === 3 ? "18:30" : "18:00", to: "20:00" }, { day: 1, from: "18:00", to: "20:00" }], setupCompletedOn: null })),
    events,
    nodes: [...night, ...speaker, ...standalone],
    nudges: [],
    contributions: [
      { personId: "jordan", nodeId: "e-night:venue", points: 2, onTime: true },
      { personId: "alex", nodeId: "e-night:registry", points: 2, onTime: true },
      { personId: "maya", nodeId: "e-night:quote", points: 2, onTime: true },
    ],
    organizations: [
      { id: "o-caterer", name: "Desert Table Catering (fictional)", type: "Vendor", website: "desert-table.example.org", email: "orders@desert-table.example.org", phone: "", address: "Tempe, AZ (fictional)", tags: ["catering", "tempe"], notes: "Book at least 3 weeks ahead. Does not need a deposit under $500.", createdBy: "maya" },
      { id: "o-saguaro", name: "Saguaro Labs (fictional)", type: "Guest speaker", website: "saguaro-labs.example.org", email: "", phone: "", address: "", tags: ["startup", "speaker"], notes: "", createdBy: "alex" },
      { id: "o-osl", name: "Student Org Support (fictional)", type: "Campus office", website: "", email: "orgs@example.edu", phone: "", address: "Memorial Union (fictional)", tags: ["campus"], notes: "Ask about room bookings and the SAP form.", createdBy: "alex" },
    ],
    contacts: [
      { id: "c-caterer", name: "Jamie Ortiz (fictional)", title: "Catering manager", organizationId: "o-caterer", relation: "Vendor", email: "jamie@desert-table.example.org", phone: "", social: "", preferredChannel: "email", tags: ["catering"], stage: "active", source: "Previous officers", introducedById: null, visibility: "all", lastContact: "2026-10-13", cadenceDays: 60, ownerRoleId: "r-fin", eventIds: ["e-night"], createdBy: "maya" },
      { id: "c-founder", name: "Riley Brooks (fictional)", title: "Founder", organizationId: "o-saguaro", relation: "Guest speaker", email: "riley@saguaro-labs.example.org", phone: "", social: "linkedin.com/in/riley-brooks-fictional", preferredChannel: "linkedin", tags: ["speaker", "startup"], stage: "warm", source: "Member referral", introducedById: "jordan", visibility: "all", lastContact: "2026-07-19", cadenceDays: 90, ownerRoleId: "r-pres", eventIds: ["e-speaker"], createdBy: "alex" },
      { id: "c-osl", name: "Casey Lin (fictional)", title: "Student org advisor", organizationId: "o-osl", relation: "Campus office", email: "casey.lin@example.edu", phone: "", social: "", preferredChannel: "email", tags: ["campus"], stage: "active", source: "Campus event", introducedById: null, visibility: "all", lastContact: "2026-09-30", cadenceDays: 45, ownerRoleId: "r-pres", eventIds: [], createdBy: "alex" },
      { id: "c-sponsor", name: "Morgan Hale (fictional)", title: "Community manager", organizationId: null, relation: "Sponsor", email: "", phone: "", social: "", preferredChannel: "", tags: ["sponsor-prospect"], stage: "cold", source: "Cold outreach", introducedById: null, visibility: "leads", lastContact: null, cadenceDays: 30, ownerRoleId: "r-pres", eventIds: [], createdBy: "alex" },
    ],
    interactions: [
      { id: "i-1", contactId: "c-caterer", organizationId: null, date: "2026-10-13", kind: "email", byId: "maya", summary: "Asked for a quote for 40 people.", outcome: "Quote due next week", nextStep: "Compare the quote with the USG food rules", nextDue: "2026-10-27", nextDone: false, eventId: "e-night" },
      { id: "i-2", contactId: "c-founder", organizationId: null, date: "2026-07-19", kind: "meeting", byId: "alex", summary: "Coffee chat about speaking in the spring.", outcome: "Interested, wants a date", nextStep: "", nextDue: null, nextDone: false, eventId: "e-speaker" },
      { id: "i-3", contactId: "c-osl", organizationId: null, date: "2026-09-30", kind: "call", byId: "alex", summary: "Checked the room booking steps for November.", outcome: "", nextStep: "", nextDue: null, nextDone: false, eventId: null },
    ],
    funding: [{ eventId: "e-night", source: "usg", amount: 2000, stage: "budget_request", spendBy: "2026-12-19" }],
    handoff: null, handoffRoles: [], feedback: [],
    changeSets: [],
    extensionRequests: [], notifications: [], silenceCases: [], protocolLog: [], officerGrants: [],
    demoLinkKey: Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, "0")).join(""),
  })
}
