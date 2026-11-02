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
export function makeDraft(scenario = "A") {
    const roles = titles.map((title, i) => ({ id: `role-${i}`, title }));
    const assign = (capabilityId, title, responsibility = "owner", scope = "all") => ({
        roleId: roles.find((r) => r.title === title).id,
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
