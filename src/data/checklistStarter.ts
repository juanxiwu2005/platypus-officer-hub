import type { ChecklistItem, ChecklistWhen, ChecklistWho, DemoState, OnboardingChecklist, RoleFunction } from "./types"
import { checklistIdMaker } from "../lib/checklist"

/**
 * The Platypus starter for Settings → Onboarding (contract Section 4). Items that only some roles need name role
 * functions, which are mapped to the club's current role ids, so renamed roles still line up; a function no current role
 * has simply gives no column a dot. Each `source` is a record in src/data/policyCatalog.ts (checked by a test).
 */
interface StarterItem { title: string; when?: ChecklistWhen; who?: ChecklistWho; fns?: RoleFunction[]; source?: string }
interface StarterModule { title: string; when: ChecklistWhen; who: ChecklistWho; items: StarterItem[] }

const HANDBOOK = "ASU-R-004"

const STARTER: StarterModule[] = [
  { title: "First 3 days", when: "day3", who: "new", items: [
    { title: "Join the officer group chat" },
    { title: "Meet your buddy", who: "buddy" },
    { title: "Get added to the club shared drive", when: "day1" },
  ] },
  { title: "Learn the club", when: "week1", who: "new", items: [
    { title: "Read the constitution" },
    { title: "Read the ASU student org handbook", source: HANDBOOK },
    { title: "Complete anti-hazing training", source: HANDBOOK },
    { title: "Complete Officer Training", source: HANDBOOK, fns: ["president", "vice_president", "finance"] },
    { title: "Agree on 3–5 core duties with the president" },
  ] },
  { title: "Tools & access", when: "week2", who: "new", items: [
    { title: "Sync the club calendar to your phone" },
    { title: "Update the Sun Devil Central profile", source: HANDBOOK, fns: ["president"] },
    { title: "Get added as a bank co-signer", source: HANDBOOK, fns: ["finance"], who: "president" },
    { title: "Complete USG-T appropriations training", source: "ASU-R-037", fns: ["finance"] },
    { title: "Walk through a budget request in Sun Devil Central", fns: ["finance"] },
    { title: "Request a Mazevo account", source: "ASU-R-013", fns: ["programs"] },
    { title: "Register a practice event in Event Registry", source: "ASU-R-010", fns: ["programs"] },
    { title: "Read the ASU brand guidelines", source: "ASU-R-009", fns: ["marketing"] },
    { title: "Get admin access to the club social accounts", fns: ["marketing"], who: "outgoing", when: "day3" },
    { title: "Update the member roster in Sun Devil Central", source: HANDBOOK, fns: ["secretary", "membership"] },
  ] },
  { title: "Handoff from your predecessor", when: "week2", who: "outgoing", items: [
    { title: "Walk through open work together" },
    { title: "Hand over account access" },
    { title: "Introduce key contacts", source: HANDBOOK },
  ] },
  { title: "Check-ins", when: "month1", who: "president", items: [
    { title: "Week 2 check-in", when: "week2" },
    { title: "Day 30 review" },
  ] },
]

/** The policy labels the starter uses, for the catalog check in the tests. */
export const STARTER_SOURCES: readonly string[] = [...new Set(STARTER.flatMap(m => m.items.flatMap(i => i.source ? [i.source] : [])))]

/** A fresh starter checklist for this club, already in the shape sanitizeChecklist returns. Ids default to "ck-0", "ck-1", … */
export function starterChecklist(s: DemoState, makeId: () => string = checklistIdMaker()): OnboardingChecklist {
  const rolesWith = (fns: RoleFunction[]) => s.roles.filter(r => fns.includes(r.fn)).map(r => r.id)
  const item = (i: StarterItem): ChecklistItem => ({
    id: makeId(), title: i.title,
    ...(i.when ? { when: i.when } : {}),
    ...(i.who ? { who: i.who } : {}),
    everyone: !i.fns,
    roleIds: i.fns ? rolesWith(i.fns) : [],
    hiddenFor: [],
    ...(i.source ? { source: i.source } : {}),
  })
  return {
    version: 1,
    modules: STARTER.map(m => ({ id: makeId(), title: m.title, when: m.when, who: m.who, items: m.items.map(item) })),
    updatedOn: s.today,
  }
}
