import type { Anchor, Event, Node, Phase, Role, RoleFunction, StepCond, StepTemplate } from "../data/types"

/**
 * Event playbook (plan §4, §11 "Playbook"). Built from SEO's own workflows:
 *   OA101 project initiation (swimlanes: president, outreach, programs, marketing, finance, EVP),
 *   OA102 execution, OA201 funding, the event template's T-90 / T-60 / T-30 / T-14 checklist,
 *   and the ASU rules R01–R16 (docs/RULES.md). Summary: docs/SEO_PLAYBOOK_REFERENCE.md.
 *
 * A step has no dates of its own. It has an anchor (an ASU rule or a club timing) and links to other
 * steps; the rule engine (schedule.ts) turns those into the three deadlines.
 */

export type { StepTemplate }

const rule = (ruleId: string, days: number, unit: "calendar" | "business"): Anchor => ({ kind: "rule", ruleId, days, unit })
const target = (days: number, unit: "calendar" | "business", label: string): Anchor => ({ kind: "target", days, unit, label })
export const CONDITIONS: Record<StepCond, (e: Event) => boolean> = {
  campus: e => e.venue === "campus", offcampus: e => e.venue === "offcampus", speaker: e => e.speaker,
  externalGuest: e => e.speaker || e.checks?.partner === true,
  usgFood: e => e.funding === "usg" && e.food !== "none", usgSpeaker: e => e.speaker && e.funding === "usg",
  offsite: e => e.food === "offsite", dining: e => e.food === "dining", onsite: e => e.food === "onsite", tbd: e => e.food === "tbd", food: e => e.food !== "none",
  funding: e => e.checks?.funding === true || e.funding !== "none", externalFood: e => e.checks?.externalFood === true || e.food === "offsite", onsiteFood: e => e.checks?.onsiteFood === true || e.food === "onsite",
  partner: e => e.checks?.partner === true, travel: e => e.checks?.travel === true, parking: e => e.checks?.parking === true, advisor: e => e.checks?.advisor === true,
  access: e => e.checks?.access === true, safety: e => e.checks?.safety === true, outdoor: e => e.checks?.outdoor === true, alcohol: e => e.checks?.alcohol === true,
  drone: e => e.checks?.drone === true, media: e => e.checks?.media === true, prize: e => e.checks?.prize === true, schoolApproval: e => e.checks?.schoolApproval === true || e.headcount >= 250,
  content: e => e.checks?.content === true, rsvp: e => e.checks?.rsvp === true, large: e => e.headcount >= 250 || ["safety", "outdoor", "alcohol", "drone", "travel"].some(k => e.checks?.[k as keyof NonNullable<Event["checks"]>] === true),
}

/** The steps new events are built from: the club's own workflow if setup made one, else the standard one. */
export const orgSteps = (s: { org: { eventWorkflow?: { steps: StepTemplate[] } } }): StepTemplate[] => s.org.eventWorkflow?.steps ?? EVENT_STEPS

export const EVENT_STEPS: StepTemplate[] = [
  // Blue: every event gets this complete lifecycle. Names are intentionally short for the flow canvas.
  { key: "plan", title: "Event Plan", fn: "programs", phase: "plan", estDays: 1, tier: "light", anchor: target(60, "calendar", "Event scope target"), why: "Define the purpose, operating scope and backup plan before routing work.", source: "PLAN-01" },
  { key: "backup", title: "Back-up Plan", fn: "programs", phase: "plan", estDays: 1, tier: "light", dependsOn: ["plan"], why: "Document a workable fallback for venue, program, weather, or attendance changes.", source: "PLAN-01" },
  { key: "venuechoice", title: "Candidate Venue", fn: "programs", phase: "plan", estDays: 1, tier: "light", dependsOn: ["backup"], why: "Choose a candidate venue with capacity, access and setup needs.", source: "VENUE-01" },
  { key: "registry", title: "Event Registry (SDC & Special Event)", fn: "programs", phase: "prepare", anchor: rule("R01", 14, "calendar"), estDays: 3, tier: "medium", dependsOn: ["venuechoice"], ruleIds: ["R01"], why: "Events lead records the Event Registry submission and confirmation.", source: "R01" },
  { key: "venue", title: "Book Room & Layout", fn: "programs", phase: "prepare", anchor: target(30, "calendar", "Venue planning target"), estDays: 1, tier: "light", dependsOn: ["registry"], why: "Request and confirm the permitted room, site, layout and capacity.", source: "VENUE-01" },
  { key: "moderator", title: "Moderator Lead Staffing", fn: "programs", phase: "prepare", estDays: 1, tier: "light", dependsOn: ["venue"], why: "Confirm the moderator, host, and required event staffing.", source: "Organization standard" },
  { key: "materials", title: "Event Materials PPT Decorations", fn: "programs", phase: "prepare", estDays: 2, tier: "medium", dependsOn: ["moderator"], why: "Prepare the run-of-show materials, signage, slides and event items.", source: "Organization standard" },
  { key: "checkin", title: "Check-in Forms Photo Release Liability", fn: "programs", phase: "run", estDays: 1, tier: "light", dependsOn: ["finalcheck"], why: "Prepare photo release, liability, and check-in forms for event day.", source: "Organization standard" },
  { key: "headcount", title: "Headcount", fn: "programs", phase: "close", anchor: target(-1, "calendar", "Post-event count"), estDays: 1, tier: "light", dependsOn: ["checkin"], why: "Record the final attendance count after event day.", source: "Organization standard" },
  { key: "thankyou", title: "Thank You Note", fn: "secretary", phase: "close", anchor: target(-1, "business", "Within one business day after the event"), estDays: 1, tier: "light", dependsOn: ["headcount"], why: "Send a concise thank-you to attendees, partners and contributors.", source: "Organization standard" },
  { key: "feedback", title: "Feedback", fn: "vice_president", phase: "close", anchor: target(-3, "business", "Within three business days after the event"), estDays: 1, tier: "light", dependsOn: ["thankyou"], why: "Collect feedback and record a short reusable retrospective.", source: "CLOSE-03" },
  { key: "postmarketing", title: "Post Marketing", fn: "marketing", phase: "close", anchor: target(-2, "business", "Post-event update"), estDays: 1, tier: "light", dependsOn: ["headcount"], why: "Publish an approved post-event recap or outcome update.", source: "Organization standard" },
  { key: "photoBackup", title: "Photo Backup", fn: "marketing", phase: "close", anchor: target(-4, "business", "Cloud backup"), estDays: 1, tier: "light", dependsOn: ["postmarketing"], why: "Save and back up approved event photos or media in the organization record.", source: "Organization standard" },
  { key: "invoice", title: "Invoice", fn: "finance", phase: "close", anchor: target(-2, "business", "Invoice closeout"), estDays: 1, tier: "light", dependsOn: ["headcount"], why: "Collect and verify invoices after the event.", source: "CLOSE-02" },
  { key: "attendance", title: "Attendance Submit", fn: "finance", phase: "close", anchor: target(-3, "business", "Business meal form"), estDays: 1, tier: "light", dependsOn: ["invoice"], why: "Submit attendance and the required business meal form.", source: "CLOSE-02" },
  { key: "spending", title: "Paid Reimbursed", fn: "finance", phase: "close", anchor: target(-5, "business", "Payment closeout"), estDays: 1, tier: "light", dependsOn: ["attendance"], why: "Confirm payment or reimbursement from the respective funding source.", source: "CLOSE-02" },
  { key: "financeRecord", title: "Finance Record", fn: "finance", phase: "close", anchor: target(-7, "business", "Financial closeout target"), estDays: 1, tier: "light", dependsOn: ["spending"], why: "Record all event spending and income for tax-ready records.", source: "CLOSE-02" },
  { key: "documentation", title: "Documentation", fn: "secretary", phase: "close", anchor: target(-14, "calendar", "Archive within two weeks"), estDays: 1, tier: "light", dependsOn: ["feedback"], why: "Preserve approved materials, decisions and reusable event records.", source: "CLOSE-03" },

  // Yellow: only selected situation-based routes create these tasks.
  { key: "partner", title: "Partner Meeting", fn: "programs", phase: "plan", estDays: 1, tier: "light", cond: "externalGuest", why: "Align scope, roles and commitments with the outside party.", source: "SPEND-02" },
  { key: "speakerPacket", title: "Speaker SAP Headshot", fn: "programs", phase: "prepare", estDays: 2, tier: "medium", dependsOn: ["partner"], cond: "externalGuest", why: "Collect the speaker scope, headshot, quote and required agreement information.", source: "SPECIAL-04" },
  { key: "travel", title: "Partner Travel Plan", fn: "programs", phase: "prepare", estDays: 2, tier: "medium", dependsOn: ["speakerPacket"], cond: "externalGuest", why: "Document speaker or partner travel, transport and emergency coverage.", source: "TRAVEL-01" },
  { key: "partnerReview", title: "Partner Speaker Review", fn: "programs", phase: "prepare", estDays: 1, tier: "light", dependsOn: ["travel"], cond: "externalGuest", why: "Review partner or speaker requirements before final delivery.", source: "Organization standard" },
  { key: "parking", title: "Parking Validation", fn: "programs", phase: "prepare", estDays: 1, tier: "light", dependsOn: ["partnerReview"], cond: "externalGuest", why: "Validate guest parking, loading, shuttle or transport needs.", source: "VENUE-02" },
  { key: "budget", title: "Budget", fn: "finance", phase: "money", estDays: 2, tier: "medium", why: "Build the budget and identify the funding source.", source: "FUND-02" },
  { key: "foodCompliance", title: "Food Exception Permit", fn: "finance", phase: "prepare", anchor: rule("R06", 14, "calendar"), estDays: 3, tier: "medium", dependsOn: ["budget"], ruleIds: ["R06"], cond: "externalFood", why: "Resolve the food exception, permit or evidence needed before submitting a food budget.", source: "R06" },
  { key: "quotes", title: "Quote Gather", fn: "finance", phase: "money", estDays: 3, tier: "medium", dependsOn: ["foodCompliance"], why: "Collect dated provider, speaker or vendor quotes for the budget route.", source: "FUND-04" },
  { key: "budgetRequest", title: "Budget Request", fn: "finance", phase: "money", anchor: target(42, "calendar", "Funding planning floor"), estDays: 7, tier: "heavy", dependsOn: ["quotes", "foodCompliance"], cond: "funding", why: "Submit the budget, public purpose and supporting quote package.", source: "FUND-02 · FUND-04" },
  { key: "budgetApproval", title: "Budget Approval", fn: "finance", phase: "money", estDays: 1, tier: "light", dependsOn: ["budgetRequest"], cond: "funding", why: "Record the funding decision before any approval-dependent commitment.", source: "FUND-02" },
  { key: "purchaseRequest", title: "Purchase Request", fn: "finance", phase: "money", anchor: rule("R09", 10, "business"), estDays: 1, tier: "light", dependsOn: ["budgetApproval"], ruleIds: ["R09"], cond: "funding", why: "Route the approved purchase through the applicable purchasing process.", source: "R09" },
  { key: "purchaseApproval", title: "Purchase Approval", fn: "finance", phase: "money", estDays: 1, tier: "light", dependsOn: ["purchaseRequest"], cond: "funding", why: "Record purchase approval before ordering or reimbursement.", source: "R09" },
  { key: "advisor", title: "Advisor Involved", fn: "programs", phase: "prepare", estDays: 1, tier: "light", cond: "advisor", why: "Bring in the advisor when the event needs their participation or signature.", source: "PLAN-03" },
  { key: "access", title: "Accessibility Check", fn: "programs", phase: "prepare", estDays: 3, tier: "medium", dependsOn: ["advisor"], cond: "access", why: "Confirm disability accommodations, accessible route, seating and accessible communications.", source: "VENUE-03" },
  { key: "security", title: "Security", fn: "programs", phase: "prepare", estDays: 4, tier: "heavy", dependsOn: ["access"], cond: "safety", why: "Identify security and elevated-risk needs before preparing the event plan.", source: "RISK-01" },
  { key: "eams", title: "EAMS Plan", fn: "programs", phase: "prepare", estDays: 3, tier: "medium", dependsOn: ["security"], cond: "safety", why: "Prepare the event and medical safety plan required by risk review.", source: "RISK-01" },
  { key: "permit", title: "Permit Insurance", fn: "programs", phase: "prepare", estDays: 3, tier: "medium", dependsOn: ["eams"], cond: "safety", why: "Resolve permit, insurance or certificate requirements returned by risk review.", source: "RISK-01" },
  { key: "alcohol", title: "Alcohol Permit", fn: "programs", phase: "prepare", anchor: rule("SPECIAL-03", 15, "calendar"), estDays: 15, tier: "heavy", dependsOn: ["permit"], ruleIds: ["SPECIAL-03"], cond: "alcohol", why: "Resolve alcohol permit, venue and insurance conditions before service.", source: "SPECIAL-03" },
  { key: "drone", title: "Drone Approval", fn: "programs", phase: "prepare", anchor: rule("SPECIAL-06", 15, "calendar"), estDays: 7, tier: "medium", dependsOn: ["permit"], ruleIds: ["SPECIAL-06"], cond: "drone", why: "Obtain the required unmanned aircraft approval before operating a drone.", source: "SPECIAL-06" },
  { key: "schoolApproval", title: "School Admin Approval", fn: "programs", phase: "prepare", estDays: 3, tier: "medium", dependsOn: ["alcohol", "drone"], cond: "schoolApproval", why: "Confirm the director, dean or college approval route for a 250+ event.", source: "PLAN-03" },
  { key: "marketingNeeds", title: "Marketing Needs", fn: "marketing", phase: "marketing", estDays: 1, tier: "light", why: "Identify audience, channels, timeline, and promotion needs.", source: "Organization standard" },
  { key: "contentCreation", title: "Content Creation", fn: "marketing", phase: "marketing", estDays: 2, tier: "medium", dependsOn: ["marketingNeeds"], why: "Create approved copy, graphics, and campaign assets.", source: "Organization standard" },
  { key: "promotionItems", title: "Promotion Items", fn: "marketing", phase: "marketing", estDays: 1, tier: "light", dependsOn: ["contentCreation"], why: "Prepare promotional items, giveaways, or printed materials.", source: "Organization standard" },
  { key: "rsvp", title: "Open RSVPs", fn: "marketing", phase: "marketing", anchor: target(21, "calendar", "RSVPs open three weeks ahead"), estDays: 1, tier: "light", dependsOn: ["promotionItems"], cond: "rsvp", why: "Open registration and collect attendance intent.", source: "Organization standard" },
  { key: "content", title: "Content Distribution", fn: "marketing", phase: "marketing", estDays: 2, tier: "medium", dependsOn: ["rsvp"], why: "Distribute approved campaign content through selected channels.", source: "Organization standard" },
  { key: "reminder", title: "Event Reminder", fn: "marketing", phase: "marketing", estDays: 1, tier: "light", dependsOn: ["content"], why: "Send the final reminder to registered and intended attendees.", source: "Organization standard" },
  { key: "orderPlaced", title: "Order Placed", fn: "finance", phase: "money", estDays: 1, tier: "light", dependsOn: ["purchaseApproval"], cond: "funding", why: "Place approved orders and record vendor commitments.", source: "R09" },
  { key: "finalcheck", title: "Full Check Alert Changes", fn: "president", phase: "run", anchor: target(14, "calendar", "Final readiness review"), estDays: 1, tier: "light", dependsOn: ["materials", "parking", "reminder", "orderPlaced", "schoolApproval"], why: "Check every active route, alert stakeholders to changes, and confirm readiness.", source: "CLOSE-01" },
]

/* Legacy reference retained in Git history; this list is the active v1.0 standard. */
const LEGACY_EVENT_STEPS: StepTemplate[] = [
  // Plan (OA101)
  { key: "partner", title: "Meet the speaker or partner: goals, audience, format", fn: "outreach", phase: "plan", estDays: 2, tier: "medium", cond: "speaker",
    why: "Agree on what each side wants and what our members get before planning anything else.", source: "OA101 step 10; SEO T-90 checklist", consulted: ["programs"] },
  { key: "draft", title: "Draft the event plan: headcount, room, food, staffing", fn: "programs", phase: "plan", estDays: 2, tier: "medium", dependsOn: ["partner"],
    why: "Everyone else needs these numbers to start their part.", source: "OA101 step 20", consulted: ["finance", "marketing"] },
  { key: "mktneeds", title: "List marketing needs and estimate their cost", fn: "marketing", phase: "plan", estDays: 1, tier: "light", dependsOn: ["draft"],
    why: "Flyers, posts, tabling and giveaways all go into the budget.", source: "OA101 step 30", informed: ["finance"] },
  { key: "budget", title: "Build the budget and choose the funding source", fn: "finance", phase: "money", estDays: 2, tier: "medium", dependsOn: ["draft", "mktneeds"],
    why: "Funding is the most common outside delay, so it is planned first. Over budget means cut and recount.", source: "OA101 step 40; OA201 budget list", consulted: ["programs"] },
  { key: "approve", title: "Approve the event plan", fn: "president", phase: "plan", estDays: 1, tier: "light", dependsOn: ["budget"],
    why: "Check mission fit, feasibility and value before anyone spends time or money.", source: "OA101 step 50", informed: ["programs", "finance", "marketing", "outreach"] },

  // Prepare (OA102 logistics + ASU rules)
  { key: "registry", title: "Register the event in Event Registry", fn: "president", phase: "prepare", anchor: rule("R01", 30, "calendar"), estDays: 1, tier: "light", dependsOn: ["approve"], ruleIds: ["R01"], cond: "campus",
    why: "The room booking needs the RITM number this gives.", source: "OA102 step 64; SEO T-90 checklist", informed: ["programs"] },
  { key: "venue", title: "Reserve the room in Mazevo", fn: "programs", phase: "prepare", anchor: rule("R03", 16, "calendar"), estDays: 1, tier: "light", dependsOn: ["approve"], ruleIds: ["R03"], cond: "campus",
    why: "Only the top three officers can submit, and popular rooms go early.", source: "OA102 step 64; SEO T-90 checklist" },
  { key: "offvenue", title: "Confirm the off-campus venue (officers do not sign contracts)", fn: "programs", phase: "prepare", anchor: target(30, "calendar", "SEO checklist: venue settled a month ahead"), estDays: 2, tier: "medium", dependsOn: ["approve"], ruleIds: ["R14"], cond: "offcampus",
    why: "Student officers should not sign binding contracts; ask the advisor first.", source: "OA102 step 64" },
  { key: "ritm", title: "Add the RITM number to the room request", fn: "programs", phase: "prepare", anchor: rule("R04", 14, "calendar"), estDays: 1, tier: "light", dependsOn: ["registry", "venue"], ruleIds: ["R04"], cond: "campus",
    why: "Without it the room booking can be canceled with a fee.", source: "OA102 step 64" },
  { key: "advisor", title: "Confirm the advisor will attend", fn: "president", phase: "prepare", anchor: target(7, "calendar", "One week before the event"), estDays: 1, tier: "light", dependsOn: ["approve"], ruleIds: ["R02"],
    why: "Student-organization events need the advisor present; over 250 people also needs a university representative.", source: "R02" },
  { key: "quote", title: "Get the caterer quote and insurance certificate", fn: "finance", phase: "money", estDays: 1, tier: "light", dependsOn: ["approve"], ruleIds: ["R06"], cond: "offsite",
    why: "The Food Exception Request and the funding request both need the quote.", source: "OA201 purchase preparation" },
  { key: "foodex", title: "Submit the Food Exception Request", fn: "finance", phase: "prepare", anchor: rule("R06", 14, "calendar"), estDays: 1, tier: "light", dependsOn: ["quote"], ruleIds: ["R06"], cond: "offsite",
    why: "An outside caterer is not allowed without it.", source: "R06" },
  { key: "dining", title: "Order catering from Sun Devil Dining", fn: "programs", phase: "prepare", anchor: rule("R05", 14, "calendar"), estDays: 1, tier: "light", dependsOn: ["approve"], ruleIds: ["R05"], cond: "dining",
    why: "Union venues use Sun Devil Dining only.", source: "R05" },
  { key: "permit", title: "Apply for the temporary food permit ($85)", fn: "finance", phase: "prepare", anchor: rule("R07", 7, "business"), estDays: 1, tier: "light", dependsOn: ["approve"], ruleIds: ["R07", "R08"], cond: "onsite",
    why: "Food made on site needs a permit. Homemade food is not allowed.", source: "R07, R08" },
  { key: "foodplan", title: "Choose how the food is provided: Sun Devil Dining, a caterer or made on site", fn: "programs", phase: "prepare", estDays: 1, tier: "light", dependsOn: ["approve"], ruleIds: ["R05", "R06", "R07"], cond: "tbd",
    why: "Each option has its own ASU steps and deadlines. Choose early so the right one still fits.", source: "R05, R06, R07" },

  // Money (OA201 + USG)
  { key: "usg", title: "Submit the USG food request", fn: "finance", phase: "money", anchor: rule("R09", 10, "business"), estDays: 1, tier: "light", dependsOn: ["quote", "flyer", "budget"], ruleIds: ["R09", "R11"], cond: "usgFood",
    why: "Everything about the food waits on this approval.", source: "OA201 request funds; R09, R11" },
  { key: "sap", title: "Get the speaker's signed SAP agreement", fn: "president", phase: "money", estDays: 2, tier: "medium", dependsOn: ["partner"], ruleIds: ["R10"], cond: "usgSpeaker",
    why: "USG pays a guest only with a signed agreement on file.", source: "R10" },
  { key: "usgspeaker", title: "Submit the USG speaker request", fn: "finance", phase: "money", anchor: rule("R10", 14, "business"), estDays: 1, tier: "light", dependsOn: ["sap", "budget"], ruleIds: ["R10"], cond: "usgSpeaker",
    why: "Speaker payments need 14 business days and the signed agreement.", source: "OA201 request funds; R10" },

  // Marketing (OA102)
  { key: "flyer", title: "Finish the event flyer", fn: "marketing", phase: "marketing", estDays: 2, tier: "medium", dependsOn: ["approve"], ruleIds: ["R11"],
    why: "USG requires the flyer with the funding request, and RSVPs open with it.", source: "OA102 step 62" },
  { key: "partnerreview", title: "Partner reviews the marketing materials", fn: "outreach", phase: "marketing", estDays: 1, tier: "light", dependsOn: ["flyer"], cond: "speaker",
    why: "The partner signs off on how they are presented.", source: "OA102 step 65" },
  { key: "rsvp", title: "Publish the event and open RSVPs in Sun Devil Central", fn: "marketing", phase: "marketing", anchor: target(21, "calendar", "SEO timing: RSVPs open three weeks ahead"), estDays: 1, tier: "light", dependsOn: ["flyer", "partnerreview"],
    why: "Catering needs an RSVP count; no RSVPs nearly cost one club its food order.", source: "OA102 step 67; SEO T-30 checklist" },
  { key: "promo", title: "Launch the marketing push (posts, tabling, partner clubs)", fn: "marketing", phase: "marketing", anchor: target(14, "calendar", "SEO T-14 checklist: run the marketing plan"), estDays: 3, tier: "medium", dependsOn: ["rsvp"],
    why: "Turnout comes from the last two weeks of promotion.", source: "SEO T-14 checklist" },

  // Run
  { key: "review", title: "Full check: room, food, marketing, staffing", fn: "president", phase: "run", anchor: target(14, "calendar", "SEO T-14 checklist: full review"), estDays: 1, tier: "light",
    dependsOn: ["ritm", "offvenue", "foodex", "dining", "permit", "foodplan", "usg", "usgspeaker", "rsvp"],
    why: "The last moment to catch a gap while there is still time to fix it.", source: "SEO T-14 checklist (quality gate)", consulted: ["programs", "finance", "marketing"] },
  { key: "runshow", title: "Write the run-of-show and staffing plan", fn: "programs", phase: "run", anchor: target(7, "calendar", "SEO template: run-of-show a week ahead"), estDays: 1, tier: "light", dependsOn: ["review"],
    why: "Everyone knows their job on the night: check-in, host, photos, member welcome.", source: "SEO event template" },
  { key: "headcount", title: "Send the final headcount to the caterer", fn: "programs", phase: "run", anchor: target(4, "calendar", "Caterers usually need the count 3–4 days ahead"), estDays: 1, tier: "light", dependsOn: ["rsvp", "review"], cond: "food",
    why: "Order for about 40–50% of RSVPs; free evening events rarely fill.", source: "Team practice" },

  // Close
  { key: "feedback", title: "Collect feedback and write a short retro", fn: "vice_president", phase: "close", anchor: target(-3, "business", "OA101 step 70: within 3 business days after the event"), estDays: 1, tier: "light",
    why: "What worked goes into next year's playbook.", source: "OA101 step 70" },
  { key: "closeout", title: "Close out: receipts, reimbursement, attendance list", fn: "finance", phase: "close", anchor: target(-5, "business", "Within a week after the event"), estDays: 2, tier: "medium", ruleIds: ["R11"],
    why: "Unspent or undocumented money causes problems next term.", source: "OA201 finalize budget; R11" },
  { key: "archive", title: "Archive the plan, materials, attendance and lessons", fn: "secretary", phase: "close", anchor: target(-14, "calendar", "OA101 step 80: archive within two weeks"), estDays: 1, tier: "light", dependsOn: ["feedback", "closeout"],
    why: "The next officer starts from this, not from zero.", source: "OA101 step 80" },
]
void LEGACY_EVENT_STEPS

/** SEO event template cadence, shown as guide marks on the timeline. */
export const SEO_MILESTONES = [
  { days: 90, label: "T-90", items: "First partner meeting, food and funding plan, Event Registry, Sun Devil Central, room" },
  { days: 60, label: "T-60", items: "Audience check, materials and design, host, Plan B" },
  { days: 30, label: "T-30", items: "Purchase orders, slides review, second partner meeting, staffing, parking" },
  { days: 14, label: "T-14", items: "Run the marketing plan, full review, quality gate" },
]

/** Plan B library (mechanism 8). Used from WP5. */
export const PLAN_B = [
  { id: "nofood", label: "No-food version", when: "Funding or the food approval is late" },
  { id: "dues", label: "Pay from dues", when: "USG has not approved by the decision date" },
  { id: "smaller", label: "Smaller room, smaller order", when: "RSVPs are slow two weeks out" },
]

export const PHASE_LABEL: Record<Phase, string> = {
  plan: "Plan (OA101)",
  prepare: "Prepare (OA102)",
  money: "Money (OA201)",
  marketing: "Marketing",
  run: "Run",
  close: "Close out",
}

/** If a club has no role for a function, the work falls to the next one in this chain. */
const FALLBACK: Record<RoleFunction, RoleFunction[]> = {
  president: [],
  vice_president: ["secretary", "president"],
  finance: ["president"],
  programs: ["vice_president", "president"],
  marketing: ["president"],
  outreach: ["vice_president", "president"],
  secretary: ["vice_president", "president"],
  membership: ["secretary", "president"],
  advisor: ["president"],
}

// Titles are helpful, but a club may call its event officer "Operations Chair" or
// describe a treasurer's work only in the duties field.  Match that organization
// context before using a generic fallback, so a new workflow starts assigned to
// the people the club actually defined.
const DUTY_WORDS: Record<RoleFunction, RegExp> = {
  president: /presiden|chair|leadership|approve/i,
  vice_president: /vice president|deput|support.*president|coordinate/i,
  finance: /treasur|financ|budget|fund|purchas|receipt|reimburse/i,
  programs: /event|venue|speaker|logistic|schedule|program|operation/i,
  marketing: /market|content|promotion|social|design|brand|media/i,
  outreach: /outreach|partner|sponsor|relationship|external/i,
  secretary: /secretar|record|minute|document|archive|compliance/i,
  membership: /member|recruit|attendance|engagement/i,
  advisor: /advisor|adviser/i,
}

export function roleFor(roles: Role[], fn: RoleFunction): Role | undefined {
  const words = DUTY_WORDS[fn]
  const ranked = roles.map((r, index) => {
    const context = `${r.displayName} ${r.duties ?? ""}`
    return { r, index, score: (r.fn === fn ? 100 : 0) + (words.test(context) ? 20 : 0) }
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score || a.index - b.index)
  if (ranked[0]) return ranked[0].r
  for (const f of FALLBACK[fn]) {
    const r = roles.find(x => x.fn === f)
    if (r) return r
  }
  return roles[0]
}

/** The steps that apply to this event, with links to skipped steps passed through to their own links. */
export function stepsFor(e: Event, steps?: StepTemplate[]): StepTemplate[] {
  // Records saved before the structured v2 intake retain their former graph until store migration adds checks.
  // New and migrated activities always carry `checks` (including an empty object) and use the approved standard.
  const selectedSteps = steps ?? (e.checks === undefined ? LEGACY_EVENT_STEPS : EVENT_STEPS)
  const included = new Map(selectedSteps.filter(s => !s.cond || CONDITIONS[s.cond](e)).map(s => [s.key, s]))
  const all = new Map(selectedSteps.map(s => [s.key, s]))
  const resolve = (key: string, seen = new Set<string>()): string[] => {
    if (included.has(key)) return [key]
    if (seen.has(key)) return []
    seen.add(key)
    return (all.get(key)?.dependsOn ?? []).flatMap(k => resolve(k, seen))
  }
  const resolved = new Map([...included.values()].map(s => [s.key, [...new Set((s.dependsOn ?? []).flatMap(k => resolve(k)))]]))
  // Drop links already implied by another path (A → B → C makes a direct A → C redundant).
  const ancestors = new Map<string, Set<string>>()
  const anc = (key: string, seen = new Set<string>()): Set<string> => {
    if (ancestors.has(key)) return ancestors.get(key)!
    const out = new Set<string>()
    if (seen.has(key)) return out
    seen.add(key)
    for (const d of resolved.get(key) ?? []) {
      out.add(d)
      for (const a of anc(d, seen)) out.add(a)
    }
    ancestors.set(key, out)
    return out
  }
  return [...included.values()].map(s => {
    const deps = resolved.get(s.key)!
    return { ...s, dependsOn: deps.filter(d => !deps.some(o => o !== d && anc(o).has(d))) }
  })
}

/** Turn the playbook into nodes for one event. A normal workflow step is assigned
 * straight to its accountable officer; only work with no owner is unclaimed. */
export function buildEventNodes(e: Event, roles: Role[], opts: { fundingAmount?: number; steps?: StepTemplate[] } = {}): Node[] {
  const president = roleFor(roles, "president")
  const perHead = opts.fundingAmount && e.headcount ? opts.fundingAmount / e.headcount : 0
  return stepsFor(e, opts.steps).map(s => {
    const role = (s.ownerRoleId ? roles.find(r => r.id === s.ownerRoleId) : undefined) ?? roleFor(roles, s.fn)
    const ruleIds = [...(s.ruleIds ?? [])]
    if (s.key === "closeout" && perHead >= 25) ruleIds.push("R12")
    return {
      id: `${e.id}:${s.key}`,
      title: s.title,
      eventId: e.id,
      stepKey: s.key,
      phase: s.phase,
      fn: s.fn,
      ownerId: role?.holderId ?? null,
      approverRoleId: role?.id === president?.id ? null : president?.id ?? null,
      consultedRoleIds: unique((s.consulted ?? []).map(f => roleFor(roles, f)?.id).filter(isStr).filter(id => id !== role?.id)),
      informedRoleIds: unique((s.informed ?? []).map(f => roleFor(roles, f)?.id).filter(isStr).filter(id => id !== role?.id)),
      dependsOn: (s.dependsOn ?? []).map(k => `${e.id}:${k}`),
      tier: s.tier,
      estDays: s.estDays,
      anchor: s.anchor ?? null,
      clubDeadlineOverride: null,
      officialDeadline: null,
      clubDeadline: null,
      latestStart: null,
      ruleIds: unique(ruleIds),
      status: role?.holderId ? "accepted" : "unclaimed",
      acceptedOn: role?.holderId ? e.date : null,
      waitingOn: null,
      draftLink: null,
      why: s.why,
      source: s.source,
      lastUpdate: null,
    }
  })
}

const isStr = (x: unknown): x is string => typeof x === "string"
const unique = <T,>(xs: T[]) => [...new Set(xs)]
