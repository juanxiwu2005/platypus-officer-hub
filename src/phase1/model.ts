/** Design-checkpoint view models only. Not the production data schema or an API. */
export type ActivityKind = "member_activity" | "executive_obligation";
export type Responsibility = "owner" | "approver" | "support" | "informed";
export type Scope = "all" | "campus" | "companies";
export interface PreviewRole {
  id: string;
  title: string;
}
export interface Assignment {
  roleId: string;
  capabilityId: string;
  responsibility: Responsibility;
  scope: Scope;
  source: "manual" | "constitution" | "ai_suggestion";
  confirmedByUser: boolean;
  evidenceSourceId: string | null;
  confidence: number | null;
  notes: string;
}
export interface Suggestion {
  id: string;
  roleTitle: string;
  capabilityId: string;
  scope: Scope;
  quote: string;
  start: number;
  end: number;
  confidence: number;
  decision: "pending" | "accepted" | "rejected";
  edited: boolean;
}
export interface Source {
  organizationId: string;
  id: string;
  type: "constitution";
  fileName: string;
  text: string;
  accessScope: "organization";
  createdAt: string;
  retentionPolicy: "demo_7_days";
  checksum: string;
  status: "draft" | "reviewed";
}
export interface Draft {
  organizationId: string;
  accountId: string;
  scenario: "A" | "B";
  step: number;
  name: string;
  mission: string;
  profile: string;
  goal: string;
  preference: string;
  roles: PreviewRole[];
  assignments: Assignment[];
  source: Source | null;
  suggestions: Suggestion[];
  confirmed: boolean;
  version: number;
  lastReviewedAt: string | null;
}
export interface PreviewTask {
  id: string;
  activityId: string;
  title: string;
  capabilityId: string;
  owner: string | null;
  approver: string | null;
  support: string[];
  date: string | null;
  dateReason: string;
  status: "To do" | "Working on it" | "Waiting" | "Done";
  risk: string | null;
}
export const CAPABILITIES = [
  { id: "planning", label: "Event planning" },
  { id: "staffing", label: "Staffing and manpower" },
  { id: "money", label: "Money and purchasing" },
  { id: "marketing", label: "Marketing and communication" },
  { id: "relationships", label: "External relationships" },
  { id: "compliance", label: "Compliance and approval" },
  { id: "documentation", label: "Documentation and handoff" },
];
export const FICTIONAL_CONSTITUTION = `Desert Founders Society — FICTIONAL CONSTITUTION\nArticle 1. Our mission is to help students build meaningful professional connections.\nArticle 2. The President approves organization plans and compliance decisions.\nArticle 3. The Programs Director plans member events and coordinates staffing.\nArticle 4. The Treasurer owns purchasing and funding applications.\nArticle 5. Marketing owns promotion and member communication.\nArticle 6. Outreach owns relationships with campus organizations.\nArticle 7. External Relations owns relationships with companies and sponsors.\nArticle 8. The Secretary maintains documentation and handoff notes.`;
const titles = [
  "President",
  "Programs Director",
  "Treasurer",
  "Marketing",
  "Outreach",
  "External Relations",
  "Secretary",
];
export function makeDraft(scenario: "A" | "B" = "A"): Draft {
  const roles = titles.map((title, i) => ({ id: `role-${i}`, title }));
  const assign = (
    capabilityId: string,
    title: string,
    responsibility: Responsibility = "owner",
    scope: Scope = "all",
  ): Assignment => ({
    roleId: roles.find((r) => r.title === title)!.id,
    capabilityId,
    responsibility,
    scope,
    source: "manual",
    confirmedByUser: true,
    evidenceSourceId: null,
    confidence: null,
    notes: "Fictional, manually confirmed scenario.",
  });
  return {
    organizationId: `demo-${scenario}`,
    accountId: "demo-president",
    scenario,
    step: 0,
    name: "Desert Founders Society",
    mission: "Help students build meaningful professional connections.",
    profile: "Professional development",
    goal: "Build stronger member connections",
    preference: "President reviews plans",
    roles,
    assignments: [
      assign("planning", "Programs Director"),
      assign("staffing", "Programs Director"),
      assign("money", "Treasurer"),
      assign("marketing", "Marketing"),
      assign("compliance", "President"),
      assign("documentation", "Secretary"),
      assign("money", "President", "approver"),
      assign("planning", "President", "approver"),
      assign("relationships", "President", "approver"),
      assign("relationships", "Marketing", "support"),
      ...(scenario === "A"
        ? [assign("relationships", "Marketing")]
        : [
            assign("relationships", "Outreach", "owner", "campus"),
            assign("relationships", "External Relations", "owner", "companies"),
          ]),
    ],
    source: null,
    suggestions: [],
    confirmed: false,
    version: 0,
    lastReviewedAt: null,
  };
}
