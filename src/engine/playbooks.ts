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
  usgFood: e => e.funding === "usg" && e.food !== "none", usgSpeaker: e => e.speaker && e.funding === "usg",
  offsite: e => e.food === "offsite", dining: e => e.food === "dining", onsite: e => e.food === "onsite", tbd: e => e.food === "tbd", food: e => e.food !== "none",
  funding: e => e.checks?.funding === true || e.funding !== "none", externalFood: e => e.checks?.externalFood === true || e.food === "offsite", onsiteFood: e => e.checks?.onsiteFood === true || e.food === "onsite",
  partner: e => e.checks?.partner === true, travel: e => e.checks?.travel === true, parking: e => e.checks?.parking === true, advisor: e => e.checks?.advisor === true,
  access: e => e.checks?.access === true, safety: e => e.checks?.safety === true, outdoor: e => e.checks?.outdoor === true, alcohol: e => e.checks?.alcohol === true,
  drone: e => e.checks?.drone === true, media: e => e.checks?.media === true, prize: e => e.checks?.prize === true, schoolApproval: e => e.checks?.schoolApproval === true || e.headcount >= 250,
  content: e => e.checks?.content === true, large: e => e.headcount >= 250 || ["safety", "outdoor", "alcohol", "drone", "travel"].some(k => e.checks?.[k as keyof NonNullable<Event["checks"]>] === true),
}

/** The steps new events are built from: the club's own workflow if setup made one, else the standard one. */
export const orgSteps = (s: { org: { eventWorkflow?: { steps: StepTemplate[] } } }): StepTemplate[] => s.org.eventWorkflow?.steps ?? EVENT_STEPS

export const EVENT_STEPS: StepTemplate[] = [
  // Blue: every event gets this complete lifecycle. Names are intentionally short for the flow canvas.
  { key: "plan", title: "Plan Event", fn: "programs", phase: "plan", estDays: 1, tier: "light", anchor: target(60, "calendar", "Event scope target"), why: "Define the purpose, operating scope and backup plan before routing work.", source: "PLAN-01" },
  { key: "venuechoice", title: "Choose Venue", fn: "programs", phase: "plan", estDays: 1, tier: "light", dependsOn: ["plan"], why: "Choose a candidate location with capacity, access and setup needs.", source: "VENUE-01" },
  { key: "registry", title: "Event Registry", fn: "programs", phase: "prepare", anchor: rule("PLAN-02", 14, "calendar"), estDays: 3, tier: "medium", dependsOn: ["plan", "venuechoice"], ruleIds: ["PLAN-02"], why: "Events lead records the Event Registry submission and confirmation.", source: "PLAN-02 · ASU-R-010, ASU-R-011" },
  { key: "venue", title: "Confirm Location", fn: "programs", phase: "prepare", anchor: target(30, "calendar", "Venue planning target"), estDays: 1, tier: "light", dependsOn: ["venuechoice", "registry"], why: "Request and confirm the permitted room, site, layout and capacity.", source: "VENUE-01" },
  { key: "materials", title: "Event Materials", fn: "programs", phase: "prepare", estDays: 2, tier: "medium", dependsOn: ["venue"], why: "Prepare the run-of-show materials, signage, slides and event items.", source: "Organization standard" },
  { key: "checkin", title: "Check-in Forms", fn: "programs", phase: "prepare", estDays: 1, tier: "light", dependsOn: ["plan"], why: "Prepare RSVP, check-in, waiver or liability forms appropriate to the event.", source: "Organization standard" },
  { key: "headcount", title: "Headcount", fn: "programs", phase: "run", anchor: target(4, "calendar", "Final count 3–4 days before the event"), estDays: 1, tier: "light", dependsOn: ["checkin"], why: "Confirm expected and actual attendance for healthy event operations.", source: "Organization standard" },
  { key: "eventday", title: "Event Day", fn: "programs", phase: "run", anchor: target(0, "calendar", "Event date"), estDays: 1, tier: "heavy", dependsOn: ["finalcheck", "materials", "headcount"], why: "Run the activity within its confirmed location, capacity and conditions.", source: "Organization standard" },
  { key: "thankyou", title: "Thank You", fn: "secretary", phase: "close", anchor: target(-1, "business", "Within one business day after the event"), estDays: 1, tier: "light", dependsOn: ["eventday"], why: "Send a concise thank-you to attendees, partners and contributors.", source: "Organization standard" },
  { key: "feedback", title: "Feedback", fn: "vice_president", phase: "close", anchor: target(-3, "business", "Within three business days after the event"), estDays: 1, tier: "light", dependsOn: ["eventday"], why: "Collect feedback and record a short reusable retrospective.", source: "CLOSE-03" },
  { key: "postmarketing", title: "Post Marketing", fn: "marketing", phase: "close", anchor: target(-3, "business", "Post-event update"), estDays: 1, tier: "light", dependsOn: ["eventday"], why: "Publish an approved post-event recap or outcome update.", source: "Organization standard" },
  { key: "photos", title: "Photo Upload", fn: "marketing", phase: "close", anchor: target(-3, "business", "Post-event media record"), estDays: 1, tier: "light", dependsOn: ["eventday"], why: "Save approved event photos or media in the organization record.", source: "Organization standard" },
  { key: "spending", title: "Record Spending", fn: "finance", phase: "close", anchor: target(-5, "business", "Closeout target"), estDays: 1, tier: "light", dependsOn: ["eventday"], why: "Record spending, receipts and unresolved financial items.", source: "CLOSE-02" },
  { key: "attendance", title: "Attendance Record", fn: "programs", phase: "close", anchor: target(-5, "business", "Closeout target"), estDays: 1, tier: "light", dependsOn: ["eventday", "headcount"], why: "Submit the final attendance record and required event metrics.", source: "CLOSE-02" },
  { key: "financeRecord", title: "Finance Record", fn: "finance", phase: "close", anchor: target(-7, "business", "Financial closeout target"), estDays: 1, tier: "light", dependsOn: ["spending"], why: "Complete reimbursement, payment status and the final finance record.", source: "CLOSE-02" },
  { key: "documentation", title: "Documentation", fn: "secretary", phase: "close", anchor: target(-14, "calendar", "Archive within two weeks"), estDays: 1, tier: "light", dependsOn: ["feedback", "financeRecord", "photos"], why: "Preserve approved materials, decisions and reusable event records.", source: "CLOSE-03" },

  // Yellow: only selected situation-based routes create these tasks.
  { key: "partner", title: "Partner Meeting", fn: "programs", phase: "plan", estDays: 1, tier: "light", dependsOn: ["plan"], cond: "partner", why: "Align scope, roles and commitments with the outside party.", source: "SPEND-02" },
  { key: "speakerPacket", title: "Speaker Packet", fn: "programs", phase: "prepare", estDays: 2, tier: "medium", dependsOn: ["partner", "venuechoice"], cond: "speaker", why: "Collect the speaker scope, headshot, quote and required agreement information.", source: "SPECIAL-04" },
  { key: "travel", title: "Travel Plan", fn: "programs", phase: "prepare", estDays: 2, tier: "medium", dependsOn: ["plan"], cond: "travel", why: "Document travel scope, participants, transport and emergency coverage.", source: "TRAVEL-01" },
  { key: "parking", title: "Parking Review", fn: "programs", phase: "prepare", estDays: 1, tier: "light", dependsOn: ["venue"], cond: "parking", why: "Confirm guest parking, loading, shuttle or transport needs.", source: "VENUE-02" },
  { key: "quotes", title: "Quote Gather", fn: "finance", phase: "money", estDays: 3, tier: "medium", dependsOn: ["venue"], cond: "funding", why: "Collect dated provider, speaker or vendor quotes for the budget route.", source: "FUND-04" },
  { key: "foodCompliance", title: "Food Exception", fn: "finance", phase: "prepare", anchor: rule("SPECIAL-02", 10, "business"), estDays: 3, tier: "medium", dependsOn: ["venue", "quotes"], ruleIds: ["SPECIAL-02"], cond: "externalFood", why: "Resolve the food exception, permit or evidence needed before submitting a food budget.", source: "SPECIAL-01 · SPECIAL-02" },
  { key: "budgetRequest", title: "Budget Request", fn: "finance", phase: "money", anchor: target(42, "calendar", "Funding planning floor"), estDays: 7, tier: "heavy", dependsOn: ["quotes", "foodCompliance"], cond: "funding", why: "Submit the budget, public purpose and supporting quote package.", source: "FUND-02 · FUND-04" },
  { key: "budgetApproval", title: "Budget Approval", fn: "finance", phase: "money", estDays: 1, tier: "light", dependsOn: ["budgetRequest"], cond: "funding", why: "Record the funding decision before any approval-dependent commitment.", source: "FUND-02" },
  { key: "purchaseRequest", title: "Purchase Request", fn: "finance", phase: "money", anchor: rule("FUND-05", 14, "calendar"), estDays: 1, tier: "light", dependsOn: ["budgetApproval"], ruleIds: ["FUND-05"], cond: "funding", why: "Route the approved purchase through the applicable purchasing process.", source: "FUND-05" },
  { key: "purchaseApproval", title: "Purchase Approval", fn: "finance", phase: "money", estDays: 1, tier: "light", dependsOn: ["purchaseRequest"], cond: "funding", why: "Record purchase approval before ordering or reimbursement.", source: "FUND-05" },
  { key: "access", title: "Access Review", fn: "programs", phase: "prepare", estDays: 3, tier: "medium", dependsOn: ["venue"], cond: "access", why: "Confirm accommodations, accessible route, seating and accessible communications.", source: "VENUE-03 · ASU-R-018, ASU-R-019" },
  { key: "security", title: "Security Plan", fn: "programs", phase: "prepare", estDays: 7, tier: "heavy", dependsOn: ["venue", "registry"], cond: "safety", why: "Document security, EMS, crowd, protest or elevated-risk coverage.", source: "RISK-01" },
  { key: "permit", title: "Permit Review", fn: "programs", phase: "prepare", estDays: 3, tier: "medium", dependsOn: ["security"], cond: "safety", why: "Resolve permit, insurance or certificate requirements returned by risk review.", source: "RISK-01" },
  { key: "alcohol", title: "Alcohol Permit", fn: "programs", phase: "prepare", anchor: rule("SPECIAL-03", 15, "calendar"), estDays: 15, tier: "heavy", dependsOn: ["venue", "registry"], ruleIds: ["SPECIAL-03"], cond: "alcohol", why: "Resolve alcohol permit, venue and insurance conditions before service.", source: "SPECIAL-03" },
  { key: "drone", title: "Drone Approval", fn: "programs", phase: "prepare", anchor: rule("SPECIAL-06", 15, "calendar"), estDays: 7, tier: "medium", dependsOn: ["venue", "registry"], ruleIds: ["SPECIAL-06"], cond: "drone", why: "Obtain the required unmanned aircraft approval before operating a drone.", source: "SPECIAL-06" },
  { key: "schoolApproval", title: "School Approval", fn: "programs", phase: "prepare", estDays: 3, tier: "medium", dependsOn: ["registry"], cond: "schoolApproval", why: "Confirm the director, dean or college approval route for a 250+ event.", source: "PLAN-03 · needs verification" },
  { key: "content", title: "Content Distribution", fn: "marketing", phase: "marketing", estDays: 2, tier: "medium", dependsOn: ["plan"], cond: "content", why: "Prepare approved materials, giveaways or digital distribution for attendees.", source: "Organization standard" },
  { key: "finalcheck", title: "Final Check", fn: "president", phase: "run", anchor: target(14, "calendar", "Final readiness review"), estDays: 1, tier: "light", dependsOn: ["venue", "registry", "purchaseApproval", "permit", "alcohol", "drone", "schoolApproval", "access"], why: "Confirm every active approval and condition before the event proceeds.", source: "CLOSE-01" },
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

export function roleFor(roles: Role[], fn: RoleFunction): Role | undefined {
  for (const f of [fn, ...FALLBACK[fn]]) {
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

/** Turn the playbook into nodes for one event. New nodes wait for their proposed owner to claim them. */
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
      status: "unclaimed",
      acceptedOn: null,
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
