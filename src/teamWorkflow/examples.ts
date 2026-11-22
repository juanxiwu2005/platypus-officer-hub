import type { TeamDirectory, WorkflowStepRef, WorkflowTeamMap } from "./contracts"

/** Fictional test/preview data only. Never auto-applied to an organization's real configuration. */
export function exampleDirectory(): TeamDirectory {
  return {
    teams: [
      { id: "leadership", name: "Leadership", leadRoleId: "president", tone: "blue" },
      { id: "finance", name: "Finance", leadRoleId: "treasurer", tone: "amber" },
      { id: "marketing", name: "Marketing", leadRoleId: "marketing-lead", tone: "neutral" },
      { id: "operations", name: "Operations", leadRoleId: "secretary", tone: "teal" },
      { id: "community", name: "Community", leadRoleId: null, tone: "neutral" },
    ],
    roles: [
      { id: "president", title: "President", teamId: "leadership", reportsToRoleId: null, personId: "alex" },
      { id: "evp", title: "Executive VP", teamId: "leadership", reportsToRoleId: "president", personId: "jordan" },
      { id: "treasurer", title: "Treasurer", teamId: "finance", reportsToRoleId: "evp", personId: "maya" },
      { id: "associate", title: "Finance Associate", teamId: "finance", reportsToRoleId: "treasurer", personId: "chris" },
      { id: "assistant", title: "Finance Assistant", teamId: "finance", reportsToRoleId: "associate", personId: "jamie" },
      { id: "marketing-lead", title: "Marketing Director", teamId: "marketing", reportsToRoleId: "evp", personId: "sam" },
      { id: "secretary", title: "Secretary", teamId: "operations", reportsToRoleId: "evp", personId: "priya" },
    ],
    people: [["alex", "Alex Rivera"], ["jordan", "Jordan Patel"], ["maya", "Maya Chen"], ["chris", "Chris Lee"], ["jamie", "Jamie Park"], ["sam", "Sam Okafor"], ["priya", "Priya Nair"]].map(([id, name]) => ({ id, name, email: `${id}@example.org` })),
  }
}
/** Explicitly listed fixture decisions, not a runtime function/keyword matching strategy. New keys stay unresolved. */
export function exampleEventMap(steps: readonly WorkflowStepRef[]): WorkflowTeamMap {
  const groups: Record<string, string[]> = {
    operations: ["plan", "backup", "venuechoice", "registry", "venue", "moderator", "materials", "checkin", "headcount", "thankyou", "feedback", "documentation", "partner", "speakerPacket", "travel", "partnerReview", "parking", "advisor", "access", "security", "eams", "permit", "alcohol", "drone", "schoolApproval"],
    finance: ["budget", "foodCompliance", "quotes", "budgetRequest", "budgetApproval", "purchaseRequest", "purchaseApproval", "orderPlaced", "invoice", "attendance", "spending", "financeRecord"],
    marketing: ["marketingNeeds", "contentCreation", "promotionItems", "rsvp", "content", "reminder", "postmarketing", "photoBackup"],
    leadership: ["finalcheck"],
  }
  const existing = new Set(steps.map(s => s.key))
  return { version: 1, workflowId: "example:general-event", stepTeams: Object.fromEntries(Object.entries(groups).flatMap(([team, keys]) => keys.filter(k => existing.has(k)).map(k => [k, team]))) }
}
