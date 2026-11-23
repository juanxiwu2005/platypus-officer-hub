import type { DemoState, Event, Node, NodeStatus, Role } from "./types"
import { buildEventNodes } from "../engine/playbooks"
import { applySchedule } from "../engine/schedule"
import { DUTY_TEMPLATES } from "./structure"
import { syncBudgetFlow } from "../engine/eventBudget"
import { sampleHandoff } from "./sampleScenario"
import { normalizeTerms } from "./roleTerms"
import { DEFAULT_REMINDER_MODE } from "./reminderMode"

// v20 also completes the demo plan when saved data skipped the v18-to-v19 update.
export const SCHEMA_VERSION = 23

/**
 * The demo starts on a fixed date, so every participant and every test sees the same plan
 * (Sat Oct 31, 2026). The three upcoming events deliberately show a healthy plan, an attention-needed
 * plan, and a just-starting plan — without presenting any of them as too late to recover.
 * The simulated clock (WP3) moves forward from here.
 */
export const DEMO_TODAY = "2026-10-31"

/**
 * The fictional demo organization used for development and Phase 3 sessions.
 * Every name, email and number here is invented. No research data belongs in this file.
 * Dates are never written here: the rule engine computes them from the playbook (src/engine).
 */
/** `legacy` exists only for historical unit-test fixtures; the application starts on v2. */
export function seedDemo(today: string | undefined = undefined, workflow: "legacy" | "v2" = "legacy"): DemoState {
  // Legacy is retained only as a stable fixture for the historical workflow tests.
  // The application explicitly asks for v2 and therefore always receives the current demo date.
  today ??= workflow === "v2" ? DEMO_TODAY : "2026-10-22"
  const roles: Role[] = [
    { id: "r-pres", displayName: "President", fn: "president", holderId: "alex", reportsToId: null, duties: DUTY_TEMPLATES.president },
    { id: "r-fin", displayName: "Treasurer", fn: "finance", holderId: "maya", reportsToId: "r-pres", duties: DUTY_TEMPLATES.finance },
    { id: "r-events", displayName: "Events lead", fn: "programs", holderId: "jordan", reportsToId: "r-pres", duties: DUTY_TEMPLATES.programs },
    { id: "r-mkt", displayName: "Marketing lead", fn: "marketing", holderId: "sam", reportsToId: "r-pres", duties: DUTY_TEMPLATES.marketing },
    { id: "r-sec", displayName: "Secretary", fn: "secretary", holderId: "priya", reportsToId: "r-pres", duties: DUTY_TEMPLATES.secretary },
  ]
  const coreEvents: Event[] = [
    { id: "e-night", name: "Networking Night", date: workflow === "v2" ? "2027-03-25" : "2026-11-19", type: "social", headcount: 30, venue: "campus", food: "offsite", funding: "usg", speaker: false, budgetItems: [{ id: "e-night:budget:1", item: "Catering", quantity: 30, pricePerUnit: 40, source: "usg", status: "food_exception_permit", category: "food" }, { id: "e-night:budget:2", item: "Event supplies", quantity: 1, pricePerUnit: 800, source: "usg", status: "food_exception_permit", category: "general" }], ...(workflow === "v2" ? { checks: { food: true, externalFood: true, funding: true, partner: true, rsvp: true } } : {}), goalId: "g-events", playbookId: "seo-event" },
    { id: "e-speaker", name: "Spring Speaker Night", date: workflow === "v2" ? "2027-03-18" : "2027-02-11", type: "speaker", headcount: 60, venue: "campus", food: "offsite", funding: "usg", speaker: true, budgetItems: [{ id: "e-speaker:budget:1", item: "Speaker travel", quantity: 1, pricePerUnit: 500, source: "usg", status: "not_started", category: "travel" }], ...(workflow === "v2" ? { checks: { food: true, externalFood: true, funding: true, speaker: true, partner: true, rsvp: true } } : {}), goalId: "g-events", playbookId: "seo-event" },
  ]
  // The application uses v2. Its third event shows why checklist routes matter:
  // no food is selected, so no food-compliance branch exists in its workflow.
  const founderDinner: Event = { id: "e-founder", name: "Founder Dinner", date: "2026-12-03", type: "social", headcount: 24, venue: "campus", food: "none", funding: "dues", speaker: false, budgetItems: [{ id: "e-founder:budget:1", item: "Table cards", quantity: 24, pricePerUnit: 3, source: "organization", status: "order_placed", category: "general" }], checks: { partner: true, rsvp: true }, goalId: "g-events", playbookId: "seo-event" }
  const events: Event[] = workflow === "v2" ? [...coreEvents, founderDinner] : coreEvents

  // Networking Night needs attention in several places, but its March date leaves time to resolve them.
  const v2NightStatus: Record<string, Partial<Node> & { status: NodeStatus }> = {
    plan: { status: "done", completedOn: "2026-10-06" },
    backup: { status: "done", completedOn: "2026-10-08" },
    venuechoice: { status: "done", completedOn: "2026-10-12" },
    registry: { status: "done", completedOn: "2026-10-16" },
    venue: { status: "done", completedOn: "2026-10-21" },
    partner: { status: "done", completedOn: "2026-10-14" },
    marketingNeeds: { status: "done", completedOn: "2026-10-18" },
    budget: { status: "done", completedOn: "2026-10-20" },
    speakerPacket: { status: "waiting", waitingOn: "Signed speaker agreement from the guest" },
    foodCompliance: { status: "waiting", waitingOn: "Food Exception Permit confirmation from Student Unions" },
    quotes: { status: "in_progress" },
    contentCreation: { status: "blocked", waitingOn: "Brand photos needed for the campaign" },
  }
  // Spring Speaker Night has its event plan ready; the remaining work is only assigned.
  const speakerStatus: Record<string, Partial<Node> & { status: NodeStatus }> = {
    plan: { status: "done", completedOn: today, lastUpdate: today },
  }
  const founderStatus: Record<string, Partial<Node> & { status: NodeStatus }> = {
    // Dated against the calibrated windows (FB-6, Dec 3 event): the planning steps finished inside their windows and the money route
    // is done (the table cards are ordered). This week the moderator is due and the partner review's
    // reminder goes out on Friday; materials should have started; distribution and the reminder come later in November.
    plan: { status: "done", completedOn: "2026-09-29" }, backup: { status: "done", completedOn: "2026-09-30" }, venuechoice: { status: "done", completedOn: "2026-10-01" }, registry: { status: "done", completedOn: "2026-10-02" }, venue: { status: "done", completedOn: "2026-10-02" },
    partner: { status: "done", completedOn: "2026-10-07" }, speakerPacket: { status: "done", completedOn: "2026-10-09" }, travel: { status: "done", completedOn: "2026-10-23" },
    budget: { status: "done", completedOn: "2026-10-02" }, quotes: { status: "done", completedOn: "2026-10-08" },
    marketingNeeds: { status: "done", completedOn: "2026-10-05" }, contentCreation: { status: "done", completedOn: "2026-10-12" }, promotionItems: { status: "done", completedOn: "2026-10-16" }, rsvp: { status: "done", completedOn: "2026-10-18" },
    moderator: { status: "in_progress", lastUpdate: "2026-10-28" }, materials: { status: "accepted", lastUpdate: "2026-10-28" },
    // Kept from the earlier sample: the president already ran a first readiness check, so his board has a recently finished card.
    finalcheck: { status: "done", completedOn: "2026-10-24" },
  }
  const nightStatus: Record<string, Partial<Node> & { status: NodeStatus }> = workflow === "v2" ? v2NightStatus : {
    draft: { status: "done" }, mktneeds: { status: "done" }, budget: { status: "done" }, approve: { status: "done" }, registry: { status: "done" }, venue: { status: "done" }, quote: { status: "done" }, ritm: { status: "in_progress" }, foodex: { status: "waiting", waitingOn: "Approval from Student Unions" }, flyer: { status: "waiting", waitingOn: "Speaker headshot from the alumni panelist" }, rsvp: { status: "unclaimed", ownerId: null },
  }

  const night = buildEventNodes(events[0], roles, { fundingAmount: 2000 }).map(n => {
    const s = nightStatus[n.stepKey!] ?? { status: "accepted" as NodeStatus }
    return { ...n, assignedOn: "2026-10-08", ownerVersion: 0, acceptedOn: s.status === "unclaimed" ? null : "2026-10-08", lastUpdate: "2026-10-20", ...s }
  })
  const speaker = buildEventNodes(events[1], roles).map(n => {
    const s = speakerStatus[n.stepKey!]
    return s ? { ...n, assignedOn: "2026-10-19", ownerVersion: 0, acceptedOn: "2026-10-19", lastUpdate: "2026-10-20", ...s } : { ...n, assignedOn: today, ownerVersion: 0 }
  })
  const founder = workflow === "v2" ? buildEventNodes(founderDinner, roles).map(n => {
    const s = founderStatus[n.stepKey!] ?? { status: "accepted" as NodeStatus }
    return { ...n, assignedOn: "2026-10-10", ownerVersion: 0, acceptedOn: s.status === "unclaimed" ? null : "2026-10-10", lastUpdate: "2026-10-21", ...s }
  }) : []

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
    task({ id: "t-silence", title: "Confirm the workshop checklist", fn: "programs", ownerId: "jordan", lastUpdate: today, acceptedOn: today, assignedOn: today, why: workflow === "v2" ? "The November workshop host needs the room, laptop and sign-in plan confirmed." : "A fictional task for the ten-day follow-up walkthrough." }, "2026-10-27"),
  ]
  // The application's club week (v2 only; the legacy fixture stays as it was). Sat Oct 31: a general meeting just happened on
  // Wednesday, Founder Dinner is five weeks out, finals start in December. Every task spans the six board columns and all five officers.
  // Each club date is the date a person would type when making the task; the rule engine computes the start dates and any delay.
  const clubWeek: Node[] = workflow === "v2" ? [
    // Not claimed: open to anyone; nobody has said "I've got it" yet (assigned work goes straight to To do since v12).
    task({ id: "t-photos", title: "Share the October meeting photos", fn: "secretary", ownerId: null, status: "unclaimed", acceptedOn: null, assignedOn: "2026-10-29", lastUpdate: "2026-10-29", why: "The October newsletter is waiting on these photos." }, "2026-11-02"),
    task({ id: "t-tabling", title: "Sign up for a Memorial Union tabling slot", fn: "marketing", ownerId: null, status: "unclaimed", acceptedOn: null, assignedOn: "2026-10-30", lastUpdate: "2026-10-30", ruleIds: ["R03"], why: "Tabling before Founder Dinner brings in new members; tabling must be booked three business days ahead." }, "2026-11-13"),
    // To do.
    task({ id: "t-agenda", title: "Draft the meeting agenda", fn: "secretary", ownerId: "priya", assignedOn: "2026-10-28", lastUpdate: "2026-10-28", why: "Members get the agenda the day before each general meeting." }, "2026-11-03"),
    task({ id: "t-sponsor", title: "Follow up with the sponsor", fn: "finance", ownerId: "maya", assignedOn: "2026-10-27", lastUpdate: "2026-10-27", ruleIds: ["R14"], why: "A sponsor could cover the Networking Night catering gap. Officers should not sign a sponsor contract themselves." }, "2026-11-05"),
    task({ id: "t-volunteers", title: "Recruit Founder Dinner volunteers", fn: "programs", ownerId: "jordan", assignedOn: "2026-10-28", lastUpdate: "2026-10-28", why: "Two members run check-in so guests and the advisor are welcomed on time." }, "2026-11-12"),
    task({ id: "t-notes", title: "Write role transition notes", fn: "secretary", ownerId: "priya", estDays: 2, tier: "medium", assignedOn: "2026-10-26", lastUpdate: "2026-10-26", ruleIds: ["R16"], why: "The handoff season is open; the next officer needs our steps, files and contacts before winter break." }, "2026-11-13"),
    // Working on it.
    task({ id: "t-flyer", title: "Design the Networking Night save-the-date", fn: "marketing", ownerId: "sam", status: "in_progress", estDays: 3, tier: "medium", assignedOn: "2026-10-26", lastUpdate: "2026-10-28", why: "Members plan their spring calendars before winter break." }, "2026-11-06"),
    // Waiting.
    task({ id: "t-usg", title: "Chase the USG reimbursement", fn: "finance", ownerId: "maya", status: "waiting", waitingOn: "A reply from the USG finance office", assignedOn: "2026-10-19", lastUpdate: "2026-10-27", ruleIds: ["R11"], why: "Two members paid for workshop supplies; reimbursement checks take about three weeks." }, "2026-11-04"),
    task({ id: "t-advisor", title: "Confirm the advisor for Founder Dinner", fn: "president", ownerId: "alex", status: "waiting", waitingOn: "A reply from our faculty advisor", assignedOn: "2026-10-26", lastUpdate: "2026-10-27", ruleIds: ["R02"], why: "Student organization events need the advisor present." }, "2026-11-06"),
    // Stuck.
    task({ id: "t-studyroom", title: "Book the finals study night room", fn: "programs", ownerId: "jordan", status: "blocked", waitingOn: "Mazevo access: only three officers can hold an account", assignedOn: "2026-10-22", lastUpdate: "2026-10-28", ruleIds: ["R03", "R13"], why: "The study night has to happen before finals week, and union rooms need 16 days' notice." }, "2026-11-10"),
    // Done this week.
    task({ id: "t-minutes", title: "Post the meeting minutes", fn: "secretary", ownerId: "priya", status: "done", tier: "medium", assignedOn: "2026-10-28", completedOn: "2026-10-29", lastUpdate: "2026-10-29", why: "Members who missed the meeting catch up from the minutes." }, "2026-10-30"),
    task({ id: "t-checkin", title: "Record meeting attendance", fn: "programs", ownerId: "jordan", status: "done", assignedOn: "2026-10-28", completedOn: "2026-10-28", lastUpdate: "2026-10-28", why: "Attendance counts toward the loyal-members goal." }, "2026-10-29"),
    task({ id: "t-recap", title: "Post the October workshop recap", fn: "marketing", ownerId: "sam", status: "done", assignedOn: "2026-10-26", completedOn: "2026-10-27", lastUpdate: "2026-10-27", why: "A recap shows prospective members what our workshops are like." }, "2026-10-28"),
  ] : []

  const seeded = applySchedule({
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
        reminderMode: DEFAULT_REMINDER_MODE,
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
    nodes: [...night, ...speaker, ...founder, ...standalone, ...clubWeek],
    nudges: [],
    contributions: [
      { personId: "jordan", nodeId: "e-night:venue", points: 2, onTime: true },
      { personId: "alex", nodeId: "e-night:registry", points: 2, onTime: true },
      { personId: "maya", nodeId: workflow === "v2" ? "e-night:budget" : "e-night:quote", points: 2, onTime: true },
      // This week's finished work (v2): medium + on time = 3, light + on time = 2. The Superstar card reads these.
      ...(workflow === "v2" ? [
        { personId: "priya", nodeId: "t-minutes", points: 3, onTime: true, completedOn: "2026-10-29" },
        { personId: "jordan", nodeId: "t-checkin", points: 2, onTime: true, completedOn: "2026-10-28" },
        { personId: "sam", nodeId: "t-recap", points: 2, onTime: true, completedOn: "2026-10-27" },
      ] : []),
    ],
    organizations: [
      { id: "o-caterer", name: "Desert Table Catering (fictional)", type: "Vendor", website: "desert-table.example.org", email: "orders@desert-table.example.org", phone: "", address: "Tempe, AZ (fictional)", tags: ["catering", "tempe"], notes: "Book at least 3 weeks ahead. Does not need a deposit under $500.", createdBy: "maya" },
      { id: "o-saguaro", name: "Saguaro Labs (fictional)", type: "Guest speaker", website: "saguaro-labs.example.org", email: "", phone: "", address: "", tags: ["startup", "speaker"], notes: "", createdBy: "alex" },
      { id: "o-osl", name: "Student Org Support (fictional)", type: "Campus office", website: "", email: "orgs@example.edu", phone: "", address: "Memorial Union (fictional)", tags: ["campus"], notes: "Ask about room bookings and the SAP form.", createdBy: "alex" },
    ],
    contacts: [
      { id: "c-caterer", name: "Jamie Ortiz (fictional)", title: "Catering manager", organizationId: "o-caterer", relation: "Vendor", email: "jamie@desert-table.example.org", phone: "", social: "", preferredChannel: "email", tags: ["catering"], stage: "active", source: "Previous officers", introducedById: null, visibility: "all", lastContact: "2026-10-13", cadenceDays: 60, ownerRoleId: "r-fin", eventIds: ["e-night"], createdBy: "maya" },
      { id: "c-founder", name: "Riley Brooks (fictional)", title: "Founder", organizationId: "o-saguaro", relation: "Guest speaker", email: "riley@saguaro-labs.example.org", phone: "", social: "linkedin.com/in/riley-brooks-fictional", preferredChannel: "linkedin", tags: ["speaker", "startup"], stage: "warm", source: "Member referral", introducedById: "jordan", visibility: "all", lastContact: "2026-07-19", cadenceDays: 90, ownerRoleId: "r-pres", eventIds: ["e-speaker"], createdBy: "alex" },
      { id: "c-osl", name: "Casey Lin (fictional)", title: "Student org advisor", organizationId: "o-osl", relation: "Campus office", email: "casey.lin@example.edu", phone: "", social: "", preferredChannel: "email", tags: ["campus"], stage: "active", source: "Campus event", introducedById: null, visibility: "all", lastContact: "2026-09-30", cadenceDays: 45, ownerRoleId: "r-pres", eventIds: [], createdBy: "alex", ...(workflow === "v2" ? { lastContact: "2026-10-27", eventIds: ["e-founder"] } : {}) },
      { id: "c-sponsor", name: "Morgan Hale (fictional)", title: "Community manager", organizationId: null, relation: "Sponsor", email: "", phone: "", social: "", preferredChannel: "", tags: ["sponsor-prospect"], stage: "cold", source: "Cold outreach", introducedById: null, visibility: "leads", lastContact: null, cadenceDays: 30, ownerRoleId: "r-pres", eventIds: [], createdBy: "alex" },
    ],
    interactions: [
      { id: "i-1", contactId: "c-caterer", organizationId: null, date: "2026-10-13", kind: "email", byId: "maya", summary: "Asked for a quote for 40 people.", outcome: "Quote due next week", nextStep: "Compare the quote with the USG food rules", nextDue: "2026-10-27", nextDone: false, eventId: "e-night" },
      { id: "i-2", contactId: "c-founder", organizationId: null, date: "2026-07-19", kind: "meeting", byId: "alex", summary: "Coffee chat about speaking in the spring.", outcome: "Interested, wants a date", nextStep: "", nextDue: null, nextDone: false, eventId: "e-speaker" },
      { id: "i-3", contactId: "c-osl", organizationId: null, date: "2026-09-30", kind: "call", byId: "alex", summary: "Checked the room booking steps for November.", outcome: "", nextStep: "", nextDue: null, nextDone: false, eventId: null },
      ...(workflow === "v2" ? [{ id: "i-4", contactId: "c-osl", organizationId: null, date: "2026-10-27", kind: "email" as const, byId: "alex", summary: "Invited the advisor to Founder Dinner.", outcome: "No reply yet", nextStep: "Confirm the advisor will attend", nextDue: "2026-11-06", nextDone: false, eventId: "e-founder" }] : []),
    ],
    funding: [{ eventId: "e-night", source: "usg", amount: 2000, stage: "budget_request", spendBy: "2026-12-19" }, ...(workflow === "v2" ? [{ eventId: "e-founder", source: "dues" as const, amount: 72, stage: "budget_approved" as const, spendBy: "2026-11-05" }] : [])],
    // v2: officers write role handbooks before winter break (the season a president sets on Handoff). Some have given their outgoing
    // interview; the rest have not started. The legacy fixture has no season.
    ...(workflow === "v2" ? sampleHandoff(roles, { from: "2026-10-26", to: "2026-11-25" }) : { handoff: null, handoffRoles: [] }),
    roleTerms: [],
    archivedRoles: [],
    feedback: [],
    changeSets: [],
    extensionRequests: [],
    // v2: the private updates a week like this leaves behind. Unread for the people they ask something of.
    notifications: workflow === "v2" ? [
      { id: "seed:help:t-studyroom", recipientId: "alex", nodeId: "t-studyroom", kind: "help" as const, text: "Help requested for “Book the finals study night room”.", createdOn: "2026-10-28", read: false },
      { id: "seed:waiting:t-photos", recipientId: "priya", nodeId: "t-photos", kind: "info" as const, text: "Marketing is waiting for the October meeting photos before the newsletter can go out.", createdOn: "2026-10-29", read: false },
      { id: "seed:claim:t-photos", recipientId: "alex", nodeId: "t-photos", kind: "claim" as const, text: "“Share the October meeting photos” has not been claimed within 48 hours. Check the handover privately.", createdOn: "2026-10-31", read: false },
      { id: "seed:done:t-minutes", recipientId: "alex", nodeId: "t-minutes", kind: "info" as const, text: "“Post the meeting minutes”: completed.", createdOn: "2026-10-29", read: true },
    ] : [],
    silenceCases: [], protocolLog: [], officerGrants: [],
    demoLinkKey: Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, "0")).join(""),
  })
  return normalizeTerms(events.reduce((state, event) => syncBudgetFlow(state, event.id), seeded))
}
