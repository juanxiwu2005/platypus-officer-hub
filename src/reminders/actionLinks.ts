import type { Node } from "../data/types"
import type { TaskActionLink } from "./contracts"

// These are existing, published product entry points, not invented deep links to a form or booking.
// The explanation travels with the link so a generic sign-in or routing page is not presented as a final form.
const SPACE: TaskActionLink = {
  label: "Open ASU space requests",
  url: "https://eoss.asu.edu/student-unions/submit-a-space-request",
  explanation: "For ASU Student Unions spaces. Use the published request entry to choose the applicable reservation process.",
}
const SDC: TaskActionLink = {
  label: "Open Sun Devil Central",
  url: "https://sundevilcentral.eoss.asu.edu/",
  explanation: "For the organization's event registration, budget or purchase request. Sign in and select the applicable record or form.",
}
const SPEAKER: TaskActionLink = {
  label: "Open speaker agreement instructions",
  url: "https://cfo.asu.edu/speaker-artist-performer-agreements",
  explanation: "For ASU speaker, artist and performer agreements. Follow the instructions for the applicable agreement.",
}
const FOOD: TaskActionLink = {
  label: "Open ASU catering information",
  url: "https://sundevilhospitality.asu.edu/catering",
  explanation: "For ASU catering arrangements. This is catering information, not a confirmed order or food-exception application.",
}
const ATTENDANCE: TaskActionLink = {
  label: "Open Business Meals Form",
  url: "https://eoss.asu.edu/sites/g/files/litvpz141/files/business-meals-form.pdf",
  explanation: "For attendance documentation when the business-meal requirements apply. This link opens the published PDF.",
}

/** One task-page action, chosen only from a known step; a policy source alone is not an application link. */
export function taskActionLink(node: Node): TaskActionLink | null {
  let link: TaskActionLink | null = null
  switch (node.stepKey) {
    case "venue": link = SPACE; break
    case "registry":
    case "budgetRequest":
    case "budgetApproval":
    case "purchaseRequest":
    case "purchaseApproval":
    case "usg":
    case "ritm": link = SDC; break
    case "sap":
    case "speakerPacket":
    case "usgspeaker": link = SPEAKER; break
    case "quotes":
    case "quote":
    case "dining": link = FOOD; break
    case "attendance": link = ATTENDANCE; break
  }
  // Return a separate value; a caller editing its preview cannot change the shared catalog.
  return link ? { ...link } : null
}
