import type { Anchor, Event, Node, Phase, Role, RoleFunction, Tier } from "../data/types"

/**
 * Event playbook (plan §4, §11 "Playbook"). Built from SEO's own workflows:
 *   OA101 project initiation (swimlanes: president, outreach, programs, marketing, finance, EVP),
 *   OA102 execution, OA201 funding, the event template's T-90 / T-60 / T-30 / T-14 checklist,
 *   and the ASU rules R01–R16 (docs/RULES.md). Summary: docs/SEO_PLAYBOOK_REFERENCE.md.
 *
 * A step has no dates of its own. It has an anchor (an ASU rule or a club timing) and links to other
 * steps; the rule engine (schedule.ts) turns those into the three deadlines.
 */

export interface StepTemplate {
  key: string
  title: string
  fn: RoleFunction
  phase: Phase
  anchor?: Anchor
  estDays: number
  tier: Tier
  dependsOn?: string[]
  ruleIds?: string[]
  when?: (e: Event) => boolean
  why: string
  source: string
  consulted?: RoleFunction[]
  informed?: RoleFunction[]
}

const rule = (ruleId: string, days: number, unit: "calendar" | "business"): Anchor => ({ kind: "rule", ruleId, days, unit })
const target = (days: number, unit: "calendar" | "business", label: string): Anchor => ({ kind: "target", days, unit, label })
const campus = (e: Event) => e.venue === "campus"
const usgFood = (e: Event) => e.funding === "usg" && e.food !== "none"
const usgSpeaker = (e: Event) => e.speaker && e.funding === "usg"

export const EVENT_STEPS: StepTemplate[] = [
  // Plan (OA101)
  { key: "partner", title: "Meet the speaker or partner: goals, audience, format", fn: "outreach", phase: "plan", estDays: 2, tier: "medium", when: e => e.speaker,
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
  { key: "registry", title: "Register the event in Event Registry", fn: "president", phase: "prepare", anchor: rule("R01", 30, "calendar"), estDays: 1, tier: "light", dependsOn: ["approve"], ruleIds: ["R01"], when: campus,
    why: "The room booking needs the RITM number this gives.", source: "OA102 step 64; SEO T-90 checklist", informed: ["programs"] },
  { key: "venue", title: "Reserve the room in Mazevo", fn: "programs", phase: "prepare", anchor: rule("R03", 16, "calendar"), estDays: 1, tier: "light", dependsOn: ["approve"], ruleIds: ["R03"], when: campus,
    why: "Only the top three officers can submit, and popular rooms go early.", source: "OA102 step 64; SEO T-90 checklist" },
  { key: "offvenue", title: "Confirm the off-campus venue (officers do not sign contracts)", fn: "programs", phase: "prepare", anchor: target(30, "calendar", "SEO checklist: venue settled a month ahead"), estDays: 2, tier: "medium", dependsOn: ["approve"], ruleIds: ["R14"], when: e => e.venue === "offcampus",
    why: "Student officers should not sign binding contracts; ask the advisor first.", source: "OA102 step 64" },
  { key: "ritm", title: "Add the RITM number to the room request", fn: "programs", phase: "prepare", anchor: rule("R04", 14, "calendar"), estDays: 1, tier: "light", dependsOn: ["registry", "venue"], ruleIds: ["R04"], when: campus,
    why: "Without it the room booking can be canceled with a fee.", source: "OA102 step 64" },
  { key: "advisor", title: "Confirm the advisor will attend", fn: "president", phase: "prepare", anchor: target(7, "calendar", "One week before the event"), estDays: 1, tier: "light", dependsOn: ["approve"], ruleIds: ["R02"],
    why: "Student-organization events need the advisor present; over 250 people also needs a university representative.", source: "R02" },
  { key: "quote", title: "Get the caterer quote and insurance certificate", fn: "finance", phase: "money", estDays: 1, tier: "light", dependsOn: ["approve"], ruleIds: ["R06"], when: e => e.food === "offsite",
    why: "The Food Exception Request and the funding request both need the quote.", source: "OA201 purchase preparation" },
  { key: "foodex", title: "Submit the Food Exception Request", fn: "finance", phase: "prepare", anchor: rule("R06", 14, "calendar"), estDays: 1, tier: "light", dependsOn: ["quote"], ruleIds: ["R06"], when: e => e.food === "offsite",
    why: "An outside caterer is not allowed without it.", source: "R06" },
  { key: "dining", title: "Order catering from Sun Devil Dining", fn: "programs", phase: "prepare", anchor: rule("R05", 14, "calendar"), estDays: 1, tier: "light", dependsOn: ["approve"], ruleIds: ["R05"], when: e => e.food === "dining",
    why: "Union venues use Sun Devil Dining only.", source: "R05" },
  { key: "permit", title: "Apply for the temporary food permit ($85)", fn: "finance", phase: "prepare", anchor: rule("R07", 7, "business"), estDays: 1, tier: "light", dependsOn: ["approve"], ruleIds: ["R07", "R08"], when: e => e.food === "onsite",
    why: "Food made on site needs a permit. Homemade food is not allowed.", source: "R07, R08" },

  // Money (OA201 + USG)
  { key: "usg", title: "Submit the USG food request", fn: "finance", phase: "money", anchor: rule("R09", 10, "business"), estDays: 1, tier: "light", dependsOn: ["quote", "flyer", "budget"], ruleIds: ["R09", "R11"], when: usgFood,
    why: "Everything about the food waits on this approval.", source: "OA201 request funds; R09, R11" },
  { key: "sap", title: "Get the speaker's signed SAP agreement", fn: "president", phase: "money", estDays: 2, tier: "medium", dependsOn: ["partner"], ruleIds: ["R10"], when: usgSpeaker,
    why: "USG pays a guest only with a signed agreement on file.", source: "R10" },
  { key: "usgspeaker", title: "Submit the USG speaker request", fn: "finance", phase: "money", anchor: rule("R10", 14, "business"), estDays: 1, tier: "light", dependsOn: ["sap", "budget"], ruleIds: ["R10"], when: usgSpeaker,
    why: "Speaker payments need 14 business days and the signed agreement.", source: "OA201 request funds; R10" },

  // Marketing (OA102)
  { key: "flyer", title: "Finish the event flyer", fn: "marketing", phase: "marketing", estDays: 2, tier: "medium", dependsOn: ["approve"], ruleIds: ["R11"],
    why: "USG requires the flyer with the funding request, and RSVPs open with it.", source: "OA102 step 62" },
  { key: "partnerreview", title: "Partner reviews the marketing materials", fn: "outreach", phase: "marketing", estDays: 1, tier: "light", dependsOn: ["flyer"], when: e => e.speaker,
    why: "The partner signs off on how they are presented.", source: "OA102 step 65" },
  { key: "rsvp", title: "Publish the event and open RSVPs in Sun Devil Central", fn: "marketing", phase: "marketing", anchor: target(21, "calendar", "SEO timing: RSVPs open three weeks ahead"), estDays: 1, tier: "light", dependsOn: ["flyer", "partnerreview"],
    why: "Catering needs an RSVP count; no RSVPs nearly cost one club its food order.", source: "OA102 step 67; SEO T-30 checklist" },
  { key: "promo", title: "Launch the marketing push (posts, tabling, partner clubs)", fn: "marketing", phase: "marketing", anchor: target(14, "calendar", "SEO T-14 checklist: run the marketing plan"), estDays: 3, tier: "medium", dependsOn: ["rsvp"],
    why: "Turnout comes from the last two weeks of promotion.", source: "SEO T-14 checklist" },

  // Run
  { key: "review", title: "Full check: room, food, marketing, staffing", fn: "president", phase: "run", anchor: target(14, "calendar", "SEO T-14 checklist: full review"), estDays: 1, tier: "light",
    dependsOn: ["ritm", "offvenue", "foodex", "dining", "permit", "usg", "usgspeaker", "rsvp"],
    why: "The last moment to catch a gap while there is still time to fix it.", source: "SEO T-14 checklist (quality gate)", consulted: ["programs", "finance", "marketing"] },
  { key: "runshow", title: "Write the run-of-show and staffing plan", fn: "programs", phase: "run", anchor: target(7, "calendar", "SEO template: run-of-show a week ahead"), estDays: 1, tier: "light", dependsOn: ["review"],
    why: "Everyone knows their job on the night: check-in, host, photos, member welcome.", source: "SEO event template" },
  { key: "headcount", title: "Send the final headcount to the caterer", fn: "programs", phase: "run", anchor: target(4, "calendar", "Caterers usually need the count 3–4 days ahead"), estDays: 1, tier: "light", dependsOn: ["rsvp", "review"], when: e => e.food !== "none",
    why: "Order for about 40–50% of RSVPs; free evening events rarely fill.", source: "Team practice" },

  // Close
  { key: "feedback", title: "Collect feedback and write a short retro", fn: "vice_president", phase: "close", anchor: target(-3, "business", "OA101 step 70: within 3 business days after the event"), estDays: 1, tier: "light",
    why: "What worked goes into next year's playbook.", source: "OA101 step 70" },
  { key: "closeout", title: "Close out: receipts, reimbursement, attendance list", fn: "finance", phase: "close", anchor: target(-5, "business", "Within a week after the event"), estDays: 2, tier: "medium", ruleIds: ["R11"],
    why: "Unspent or undocumented money causes problems next term.", source: "OA201 finalize budget; R11" },
  { key: "archive", title: "Archive the plan, materials, attendance and lessons", fn: "secretary", phase: "close", anchor: target(-14, "calendar", "OA101 step 80: archive within two weeks"), estDays: 1, tier: "light", dependsOn: ["feedback", "closeout"],
    why: "The next officer starts from this, not from zero.", source: "OA101 step 80" },
]

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
}

export function roleFor(roles: Role[], fn: RoleFunction): Role | undefined {
  for (const f of [fn, ...FALLBACK[fn]]) {
    const r = roles.find(x => x.fn === f)
    if (r) return r
  }
  return roles[0]
}

/** The steps that apply to this event, with links to skipped steps passed through to their own links. */
export function stepsFor(e: Event, steps: StepTemplate[] = EVENT_STEPS): StepTemplate[] {
  const included = new Map(steps.filter(s => !s.when || s.when(e)).map(s => [s.key, s]))
  const all = new Map(steps.map(s => [s.key, s]))
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
export function buildEventNodes(e: Event, roles: Role[], opts: { fundingAmount?: number } = {}): Node[] {
  const president = roleFor(roles, "president")
  const perHead = opts.fundingAmount && e.headcount ? opts.fundingAmount / e.headcount : 0
  return stepsFor(e).map(s => {
    const role = roleFor(roles, s.fn)
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
