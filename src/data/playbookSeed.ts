import type { Playbook, PlaybookAnswer, PlaybookQuestion } from "./types"

/**
 * Fictional sample Playbook for the demo club (Desert Founders Society). No research data, no real people.
 * "rule" answers paraphrase the school pack and name their policy record (shown as the source name, never the ID);
 * each was checked against the archived policy text on 2026-11-25. Club and experience answers are invented examples.
 */
type Q = Omit<PlaybookQuestion, "checklistItemIds" | "origin" | "createdOn" | "createdBy">
type A = Omit<PlaybookAnswer, "status" | "votes" | "verifiedOn"> & { up?: string[]; down?: string[] }

const QUESTIONS: Q[] = [
  { id: "pq-1", text: "How far ahead must an event funding request go in?", category: "funding", roleIds: ["r-fin", "r-pres"], policyIds: ["ASU-R-038"] },
  { id: "pq-2", text: "$700 was approved and we spent $701. Is that allowed?", category: "funding", roleIds: ["r-fin"], policyIds: ["ASU-R-037"] },
  { id: "pq-3", text: "Can we buy something before the request is approved?", category: "funding", roleIds: "all", policyIds: ["ASU-R-025"] },
  { id: "pq-4", text: "When must the RITM number reach Student Unions?", category: "venues", roleIds: ["r-events"], policyIds: ["ASU-R-014"] },
  { id: "pq-5", text: "How far ahead should an event be registered?", category: "venues", roleIds: ["r-events", "r-pres"], policyIds: ["ASU-R-010", "ASU-R-004"] },
  { id: "pq-6", text: "Can we start promoting an event before it is approved?", category: "promotion", roleIds: ["r-mkt", "r-events"], policyIds: ["ASU-R-004"] },
  { id: "pq-7", text: "Can members bring homemade food to an event?", category: "food", roleIds: "all", policyIds: ["ASU-R-004", "ASU-R-036"] },
  { id: "pq-8", text: "Who do we ask to change an approved budget line?", category: "people", roleIds: ["r-fin"], policyIds: ["ASU-R-026"] },
  { id: "pq-9", text: "When is the Treasurer busiest during the year?", category: "timeline", roleIds: ["r-fin"], policyIds: [] },
  { id: "pq-10", text: "How do we hand over the club Instagram admin?", category: "tools", roleIds: ["r-mkt", "r-pres"], policyIds: [] },
  { id: "pq-11", text: "Can an officer sign a vendor contract for the club?", category: "people", roleIds: "all", policyIds: ["ASU-R-037"] },
  { id: "pq-12", text: "Who keeps the member roster up to date?", category: "tools", roleIds: ["r-sec", "r-pres"], policyIds: ["ASU-R-004"] },
]

const ANSWERS: A[] = [
  { id: "pa-1", questionId: "pq-1", kind: "rule", policyId: "ASU-R-038", authorId: null, on: "2026-10-29", text: "At least 4 weeks before the event, or 5 weeks above $10,000. Late requests are automatically ineligible." },
  { id: "pa-2", questionId: "pq-1", kind: "club", authorId: "alex", on: "2026-09-08", text: "We submit 5 weeks ahead so there is time to fix a returned request.", up: ["maya", "jordan"] },
  { id: "pa-3", questionId: "pq-1", kind: "experience", authorId: "maya", on: "2026-04-20", text: "Send every vendor quote in one go. A missing quote sent the whole request back to the queue.", up: ["alex"] },
  { id: "pa-4", questionId: "pq-1", kind: "experience", authorId: "jordan", on: "2026-03-02", text: "If nothing has moved after 10 days, ask the Business Office during office hours with the request number." },
  { id: "pa-5", questionId: "pq-2", kind: "rule", policyId: "ASU-R-037", authorId: null, on: "2026-10-29", text: "No. The amount must match the approved amount; there is no tolerance." },
  { id: "pa-6", questionId: "pq-2", kind: "experience", authorId: "maya", on: "2026-04-20", text: "Ask vendors for quotes that include tax and shipping, and request the full total.", up: ["alex", "sam"] },
  { id: "pa-7", questionId: "pq-3", kind: "rule", policyId: "ASU-R-025", authorId: null, on: "2026-10-29", text: "No. Purchases made before approval will not be reimbursed." },
  { id: "pa-8", questionId: "pq-4", kind: "rule", policyId: "ASU-R-014", authorId: null, on: "2026-10-29", text: "At least 14 days before the event, or the room booking is cancelled." },
  { id: "pa-9", questionId: "pq-4", kind: "experience", authorId: "jordan", on: "2026-04-18", text: "Put \"day 14\" on the calendar the moment the registration goes in. Last fall the number came on day 15 and the room nearly went.", up: ["alex"] },
  { id: "pa-10", questionId: "pq-5", kind: "rule", policyId: "ASU-R-004", authorId: null, on: "2026-10-29", text: "The handbook asks for 30 days; Event Registry gives 14 days as the minimum. Plan for 30." },
  { id: "pa-11", questionId: "pq-6", kind: "rule", policyId: "ASU-R-004", authorId: null, on: "2026-10-29", text: "No. Advertising before approval may get the event cancelled." },
  { id: "pa-12", questionId: "pq-6", kind: "club", authorId: "alex", on: "2026-09-08", text: "Promotion starts only after the events lead posts \"approved\" with the RITM number in the officer chat." },
  { id: "pa-13", questionId: "pq-7", kind: "rule", policyId: "ASU-R-004", authorId: null, on: "2026-10-29", text: "No homemade food or drink at club events. Cooking on site needs a temporary food permit at least 7 working days ahead." },
  { id: "pa-14", questionId: "pq-8", kind: "rule", policyId: "ASU-R-026", authorId: null, on: "2026-10-29", text: "Contact the USG-T Appropriations Committee." },
  { id: "pa-15", questionId: "pq-8", kind: "club", authorId: "alex", on: "2026-09-08", text: "Tell the Treasurer first; the Treasurer contacts the committee so only one person asks." },
  { id: "pa-16", questionId: "pq-9", kind: "experience", authorId: "maya", on: "2026-04-20", text: "September budget window, the weeks before the November funding deadline, and April close-out. Start quotes two weeks early each time.", up: ["alex"] },
  { id: "pa-17", questionId: "pq-10", kind: "club", authorId: "alex", on: "2026-09-08", text: "The outgoing officer adds the new one as admin; once the new officer can sign in, the outgoing one leaves." },
  { id: "pa-18", questionId: "pq-10", kind: "experience", authorId: "sam", on: "2026-04-25", text: "Use the club email for account recovery, never a personal one, or the account can be lost at graduation." },
  { id: "pa-19", questionId: "pq-11", kind: "rule", policyId: "ASU-R-037", authorId: null, on: "2026-10-29", text: "No. Students do not have signature authority; do not sign contracts with vendors." },
  { id: "pa-20", questionId: "pq-12", kind: "rule", policyId: "ASU-R-004", authorId: null, on: "2026-10-29", text: "Officers and the advisor keep the Sun Devil Central roster current, with eligible members only." },
  { id: "pa-21", questionId: "pq-12", kind: "club", authorId: "alex", on: "2026-09-08", text: "The Secretary updates the roster after every general meeting." },
]

/** The sample Playbook (a fresh copy each call). */
export function samplePlaybook(): Playbook {
  return {
    questions: QUESTIONS.map(q => ({ ...q, roleIds: q.roleIds === "all" ? "all" : [...q.roleIds], policyIds: [...q.policyIds], checklistItemIds: [], origin: "seed", createdOn: "2026-10-29", createdBy: null })),
    answers: ANSWERS.map(({ up, down, ...a }) => ({ ...a, status: "active", votes: { up: [...(up ?? [])], down: [...(down ?? [])] } })),
  }
}
