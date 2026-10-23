import type { Rule } from "./types"

/**
 * ASU rule book v0 (official layer). Mirrors docs/RULES.md — change both together.
 * Opened and checked on 2026-10-07; every rule must be re-verified before v1.0 ships (WP6).
 */
const SRC = {
  reg: { label: "Event Registry guidelines", url: "https://eventreg.asu.edu/about-registry/event-guidelines" },
  hb: { label: "Student Organization Handbook 2025–26", url: "https://eoss.asu.edu/sites/default/files/2025-04/ASU%20Student%20Organization%20-%2025_26%20Handbook.pdf" },
  space: { label: "Submit a Space Request", url: "https://eoss.asu.edu/student-unions/submit-a-space-request" },
  faq: { label: "Catering and Food FAQ (2023, recheck)", url: "https://eoss.asu.edu/sites/default/files/2023-09/FAQ%20-%20Catering%20and%20Food%20Guidelines%202.pdf" },
  usg: { label: "USG Spending Guidelines", url: "https://www.asuusgt.org/spending-guidelines" },
  usgr: { label: "USG Funding Rules", url: "https://www.asuusgt.org/funding-rules" },
}
const checkedOn = "2026-10-07"

export const RULES: Rule[] = [
  { id: "R01", category: "venue", short: "Register on-campus events in Event Registry", timing: "30 days", text: "On-campus, in-person events must be registered in Event Registry.", limit: "At least 14 days (Event Registry page); 30 days (Handbook)", sources: [SRC.reg, SRC.hb], checkedOn, note: "Two sources disagree. Platypus uses the stricter 30 days." },
  { id: "R02", category: "compliance", short: "Advisor attends; 250+ people needs a university rep", text: "Student-organization events need the advisor present. Public events or events over 250 people need a university representative present throughout.", limit: "—", sources: [SRC.reg], checkedOn },
  { id: "R03", category: "venue", short: "Book union rooms in Mazevo (top three officers)", timing: "16 days", text: "Student union spaces are booked in Mazevo, and only the top three officers can submit.", limit: "At least 16 days; outdoor tabling 3 business days; complex setups 2 weeks", sources: [SRC.space], checkedOn },
  { id: "R04", category: "venue", short: "Add the RITM number to the room request", timing: "14 days", text: "The space request must include the event's RITM number from Event Registry.", limit: "At least 14 days before, or the booking may be canceled with a fee", sources: [SRC.space], checkedOn },
  { id: "R05", category: "food", short: "Union venues use Sun Devil Dining only", timing: "2 weeks", text: "Memorial Union, Student Pavilion and similar venues use Aramark / Sun Devil Dining exclusively for food.", limit: "Arrange at least 2 weeks ahead", sources: [SRC.hb], checkedOn },
  { id: "R06", category: "food", short: "Outside caterer: Food Exception Request and insurance", timing: "14 days", text: "Outside caterers need a Food Exception Request plus the vendor's certificate of insurance.", limit: "14 days before", sources: [SRC.hb], checkedOn },
  { id: "R07", category: "food", short: "Food made on site needs an $85 permit", timing: "7 business days", text: "Food prepared on site needs a temporary food permit ($85).", limit: "At least 7 business days", sources: [SRC.faq], checkedOn, note: "Source is a 2023 FAQ. Recheck before relying on it." },
  { id: "R08", category: "food", short: "No homemade food", text: "Homemade food may not be served.", limit: "—", sources: [SRC.hb], checkedOn },
  { id: "R09", category: "money", short: "USG food and service requests", timing: "10 business days", text: "USG food and service requests (rentals, setup, lighting).", limit: "10 business days before", sources: [SRC.usg], checkedOn },
  { id: "R10", category: "money", short: "USG speaker requests need a signed SAP", timing: "14 business days", text: "USG guest speaker or performer requests need a signed SAP agreement.", limit: "14 business days before", sources: [SRC.usg], checkedOn },
  { id: "R11", category: "money", short: "USG purchases: flyer, purpose, $999 reimbursement cap", text: "USG purchase requests need the event flyer and a public-purpose statement. Invoices are addressed to ASU, reimbursements are capped at $999, Amazon purchases may not be reimbursed, and checks arrive in about 3 weeks.", limit: "—", sources: [SRC.usg], checkedOn },
  { id: "R12", category: "money", short: "Meals $25+ per person: form and attendance list", text: "Meals at $25 or more per person need a Business Meals Form and an attendance list.", limit: "—", sources: [SRC.usgr], checkedOn },
  { id: "R13", category: "venue", short: "No events during final exams", text: "No events during final exams.", limit: "—", sources: [SRC.hb], checkedOn },
  { id: "R14", category: "compliance", short: "Officers should not sign binding contracts", text: "Student officers should avoid signing legally binding contracts.", limit: "—", sources: [SRC.hb], checkedOn },
  { id: "R15", category: "compliance", short: "No raffles; free equal-chance drawings are fine", text: "ASU cannot run raffles. Free ticket drawings where everyone has an equal chance are allowed.", limit: "—", sources: [SRC.hb], checkedOn },
  { id: "R16", category: "transition", short: "Officer transition checklist; re-register every spring", timing: "Spring", text: "Officer transition: contact the advisor; new officers complete training and read the handbook and constitution; update Sun Devil Central and bank accounts; re-register every spring.", limit: "Spring", sources: [SRC.hb], checkedOn },
]

export const RULE_CATEGORIES: { id: Rule["category"]; label: string }[] = [
  { id: "venue", label: "Venues & events" },
  { id: "food", label: "Food" },
  { id: "money", label: "Money" },
  { id: "marketing", label: "Marketing" },
  { id: "compliance", label: "Safety & compliance" },
  { id: "transition", label: "Officer transition" },
]
