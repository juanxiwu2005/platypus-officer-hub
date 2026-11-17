import type { Node } from "../data/types"
import type { TaskActionLink } from "./contracts"

// Published entries only; explanations distinguish routing/sign-in pages from final forms.
const entry = (label: string, url: string, explanation: string): TaskActionLink => ({ label, url, explanation })
const LINKS: [string[], TaskActionLink][] = [
  [["venue"], entry("Open ASU space requests", "https://eoss.asu.edu/student-unions/submit-a-space-request",
    "ASU Student Unions spaces; choose the applicable process at this request entry.")],
  [["registry", "budgetRequest", "budgetApproval", "purchaseRequest", "purchaseApproval", "usg", "ritm"],
    entry("Open Sun Devil Central", "https://sundevilcentral.eoss.asu.edu/",
      "Event, budget or purchase requests. Sign in and select the organization's record or form.")],
  [["sap", "speakerPacket", "usgspeaker"],
    entry("Open speaker agreement instructions", "https://cfo.asu.edu/speaker-artist-performer-agreements",
      "ASU speaker/artist/performer agreements; choose the applicable agreement.")],
  [["quotes", "quote", "dining"], entry("Open ASU catering information", "https://sundevilhospitality.asu.edu/catering",
    "ASU catering information, not an order or food-exception application.")],
  [["attendance"], entry("Open Business Meals Form", "https://eoss.asu.edu/sites/g/files/litvpz141/files/business-meals-form.pdf",
    "Published PDF for required business-meal attendance records.")],
]

/** One task-page action, chosen only from a known step; a policy source alone is not an application link. */
export function taskActionLink(node: Node): TaskActionLink | null {
  const link = LINKS.find(([steps]) => steps.includes(node.stepKey ?? ""))?.[1]
  // Return a separate value; a caller editing its preview cannot change the shared catalog.
  return link ? { ...link } : null
}
