/**
 * Rule library for the onboarding game "Mission: Speaker Night".
 * Each rule quotes the ASU rules archive (03_Full_Rules_Archive.txt) verbatim.
 * `record` is the catalog ID (src/data/policyCatalog.ts); `line` is the archive line number.
 */
export type QuestRole = "all" | "president" | "treasurer" | "events" | "marketing" | "secretary"

export interface QuestRuleSource {
  record: string
  line: number
  quote: string
  /** Handbook section name for ASU-R-004; null for other records. */
  section: string | null
}

export interface QuestRule {
  /** "<mission>.<number>", for example "1.1". */
  id: string
  mission: number
  /** Red-line rules must be answered correctly before the game counts as finished. */
  redLine: boolean
  /** The rule in plain English, at most 15 words. */
  summary: string
  sources: QuestRuleSource[]
  /** Roles that act on this rule. */
  leads: QuestRole[]
  /** Cross-role handoff this rule implies, or null. */
  handoff: string | null
  /** Pip's hint, at most 12 words. Never the answer. */
  hint: string
}

export const QUEST_RULES: readonly QuestRule[] = [
  {
    id: "1.1",
    mission: 1,
    redLine: true,
    summary: "Only a top-three officer on the registration form submits budget requests.",
    sources: [
      {
        record: "ASU-R-026",
        line: 4521,
        quote: "Only the top three officers of an organization should submit a budget request since they should’ve taken the required Appropriations Training course. Submissions from advisors or general members will not be considered.",
        section: null,
      },
    ],
    leads: ["president", "treasurer"],
    handoff: "treasurer → top-three officer: a prepared budget request",
    hint: "Check who is listed on the registration form.",
  },
  {
    id: "1.2",
    mission: 1,
    redLine: false,
    summary: "Every officer and the advisor complete anti-hazing training during registration.",
    sources: [
      {
        record: "ASU-R-004",
        line: 800,
        quote: "All student organization officers and advisors will be required to complete anti-hazing training during the registration process.",
        section: "Hazing Prevention",
      },
      {
        record: "ASU-R-004",
        line: 484,
        quote: "These officers must complete the Student Organization Officer Training",
        section: "Registering and Reregistering a Student Organization",
      },
    ],
    leads: ["all"],
    handoff: null,
    hint: "One training applies to officers and advisors alike.",
  },
  {
    id: "1.3",
    mission: 1,
    redLine: false,
    summary: "A top-three officer must pass appropriations training with 100% before funding requests.",
    sources: [
      {
        record: "ASU-R-037",
        line: 5429,
        quote: "In order to pass the training, a top 3 officer (for student organizations) must receive a 100% on each quiz and affirm that you completed the course in all funding requests you submit.",
        section: null,
      },
    ],
    leads: ["president", "treasurer"],
    handoff: null,
    hint: "Funding training is tied to the person who submits.",
  },
  {
    id: "1.4",
    mission: 1,
    redLine: false,
    summary: "USG funding requires at least 10 members on the roster.",
    sources: [
      {
        record: "ASU-R-030",
        line: 4955,
        quote: "a minimum of 10 members is required for USG funding",
        section: null,
      },
    ],
    leads: ["secretary", "treasurer"],
    handoff: "secretary → treasurer: an accurate roster",
    hint: "Count the members on the roster.",
  },
  {
    id: "2.1",
    mission: 2,
    redLine: true,
    summary: "Register the event in the Event Registry 30 days before the event.",
    sources: [
      {
        record: "ASU-R-004",
        line: 594,
        quote: "Events should be registered 30 days prior to the event.",
        section: "Event Registry",
      },
    ],
    leads: ["events"],
    handoff: "events → Mazevo account holder: the RITM number",
    hint: "Your room request will ask for a number.",
  },
  {
    id: "2.2",
    mission: 2,
    redLine: true,
    summary: "Publicize the event only after it is approved.",
    sources: [
      {
        record: "ASU-R-004",
        line: 598,
        quote: "Advertising the event prior to approval may result in event cancellation, event postponement, and/or referral for conduct review.",
        section: "Event Approval and Event Promotion",
      },
    ],
    leads: ["marketing", "events"],
    handoff: "events → marketing: the approval and RITM number",
    hint: "Has the event been approved yet?",
  },
  {
    id: "2.3",
    mission: 2,
    redLine: false,
    summary: "Up to three registered officers may request Mazevo accounts; advisors cannot.",
    sources: [
      {
        record: "ASU-R-013",
        line: 2143,
        quote: "User Accounts can be requested by up to three (3) elected officers",
        section: null,
      },
      {
        record: "ASU-R-013",
        line: 2143,
        quote: "Organization advisors are not eligible to serve as requestors for student organizations",
        section: null,
      },
    ],
    leads: ["president", "events"],
    handoff: null,
    hint: "Check who holds a Mazevo account.",
  },
  {
    id: "2.4",
    mission: 2,
    redLine: false,
    summary: "Request Memorial Union spaces at least 16 days before the event.",
    sources: [
      {
        record: "ASU-R-015",
        line: 2438,
        quote: "A minimum of sixteen (16) days is required to reserve all reservable spaces including conference rooms, ballroom, and other large and/or outdoor programming spaces.",
        section: null,
      },
    ],
    leads: ["events"],
    handoff: null,
    hint: "Count back from the event date.",
  },
  {
    id: "2.5",
    mission: 2,
    redLine: true,
    summary: "Send the RITM number at least 14 days ahead or the event is cancelled.",
    sources: [
      {
        record: "ASU-R-014",
        line: 2294,
        quote: "Failure to register an event and/or communicate a RITM Number (formerly Event Registry Number) 14 or more days in advance of the event will result in the cancellation of the event and applicable fees will be applied.",
        section: null,
      },
    ],
    leads: ["events"],
    handoff: "events → Mazevo account holder: the RITM number",
    hint: "Student Unions needs one number from the registry.",
  },
  {
    id: "2.6",
    mission: 2,
    redLine: false,
    summary: "The advisor must attend events with guest speakers or outside participants.",
    sources: [
      {
        record: "ASU-R-004",
        line: 453,
        quote: "Advisor attendance is required for events that include guest speakers, performers, vendors, external partners, travel, contracts, or other activities involving individuals or entities outside of the organization.",
        section: "Student Organization Advisor",
      },
    ],
    leads: ["events", "president"],
    handoff: "events → advisor: the event date",
    hint: "Who must attend when outsiders take part?",
  },
  {
    id: "3.1",
    mission: 3,
    redLine: false,
    summary: "Include item quotes, vendor details, tax and shipping in budget requests.",
    sources: [
      { record: "ASU-R-037", line: 5544, quote: "make sure to include screenshots and quotes for the items you are requesting", section: null },
      { record: "ASU-R-037", line: 5544, quote: "Don’t forget to add tax or shipping if needed for your request.", section: null },
      { record: "ASU-R-037", line: 5544, quote: "Include the vendor name, description of the item(s), and the total of the items.", section: null },
    ],
    leads: ["events", "marketing", "treasurer"],
    handoff: "events and marketing → treasurer: item details, quotes, tax and shipping",
    hint: "What evidence would the person submitting your budget need?",
  },
  {
    id: "3.2",
    mission: 3,
    redLine: true,
    summary: "Submit funding requests four weeks before items are needed; allow six weeks for speakers.",
    sources: [
      { record: "ASU-R-037", line: 5476, quote: "the budget request is due at least 4 weeks prior to the items needed unless the request includes a speaker agreement, then the paperwork is due 6 weeks out from the event.", section: null },
      { record: "ASU-R-038", line: 6580, quote: "Events that fail to meet the required submission deadlines are automatically ineligible for funding.", section: null },
    ],
    leads: ["treasurer", "events"],
    handoff: null,
    hint: "Which part of this event needs the longer lead time?",
  },
  {
    id: "3.3",
    mission: 3,
    redLine: true,
    summary: "Purchase totals must match approved amounts; ask Appropriations before changing them.",
    sources: [
      { record: "ASU-R-037", line: 5594, quote: "The total estimated amount MUST match the amount approved from your Budget Request.", section: null },
      { record: "ASU-R-026", line: 4540, quote: "Contact the USG-T Appropriations Committee.", section: null },
    ],
    leads: ["treasurer"],
    handoff: null,
    hint: "Compare the approved amount with the final purchase total.",
  },
  {
    id: "3.4",
    mission: 3,
    redLine: true,
    summary: "Stay within each approved budget line; savings on one cannot increase another.",
    sources: [
      { record: "ASU-R-029", line: 4849, quote: "Your awarded funds can only be spent on the items included in your approved budget request at the amounts requested.", section: null },
      { record: "ASU-R-029", line: 4849, quote: "You will not be able to spend $150 on fliers even if you only spent $50 on pens.", section: null },
    ],
    leads: ["treasurer", "marketing"],
    handoff: null,
    hint: "Does an unchanged overall total keep each line within its limit?",
  },
  {
    id: "3.5",
    mission: 3,
    redLine: true,
    summary: "Wait for approval before purchasing; earlier expenses will not be reimbursed.",
    sources: [
      { record: "ASU-R-025", line: 4363, quote: "Purchases made before approval will not be reimbursed.", section: null },
      { record: "ASU-R-038", line: 6625, quote: "Budget requests for expenses already purchased or partially purchased prior to approval will be automatically denied and not reimbursed.", section: null },
    ],
    leads: ["all"],
    handoff: null,
    hint: "Check whether approval came before the purchase.",
  },
  {
    id: "3.6",
    mission: 3,
    redLine: false,
    summary: "USG funds cannot cover expedited shipping, production or processing fees.",
    sources: [
      { record: "ASU-R-028", line: 4768, quote: "Expedited shipping, production, or processing fees", section: null },
      { record: "ASU-R-028", line: 4792, quote: "ASU cannot pay for these items, even if they have been approved to be funded by USG.", section: null },
    ],
    leads: ["treasurer"],
    handoff: null,
    hint: "Check the prohibited-expense list before paying for speed.",
  },
  {
    id: "3.7",
    mission: 3,
    redLine: false,
    summary: "Attach event flyers to purchase requests; wait 24 hours after budget approval.",
    sources: [
      { record: "ASU-R-029", line: 4881, quote: "All clubs and organizations MUST attach the flyer/advertisement used to promote an event to all purchase requests.", section: null },
      { record: "ASU-R-037", line: 5585, quote: "You must wait 24-hours since your bill has been approved in order to submit a purchase request.", section: null },
      { record: "ASU-R-035", line: 5194, quote: "Be sure your purchase request is submitted by a top three officer", section: null },
    ],
    leads: ["treasurer", "marketing"],
    handoff: "marketing → treasurer: final event flyer or advertisement",
    hint: "What promotional material does the purchase request need?",
  },
]
