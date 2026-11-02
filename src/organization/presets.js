export const ACTIONS = [
    [
        "find_opportunity",
        "outreach",
        "Find external opportunities",
        "Build relationships and identify opportunities for members.",
    ],
    [
        "first_meeting",
        "outreach",
        "Arrange the first partner meeting",
        "Coordinate the first conversation with Programs & Planning.",
    ],
    [
        "draft_plan",
        "planning",
        "Write the activity plan",
        "Define the purpose, audience, format and program.",
    ],
    [
        "program_design",
        "planning",
        "Design the program and run of show",
        "Turn the goal into a clear participant experience.",
    ],
    [
        "venue",
        "logistics",
        "Arrange venue and equipment",
        "Confirm the space, equipment and setup needs.",
    ],
    [
        "registration",
        "logistics",
        "Register the event",
        "Prepare event registration and required approval materials.",
    ],
    [
        "staffing",
        "logistics",
        "Arrange people and shifts",
        "Assign available board members and coordinate shifts.",
    ],
    [
        "run_event",
        "logistics",
        "Run the activity",
        "Coordinate execution and respond to issues.",
    ],
    [
        "budget_review",
        "finance",
        "Review the total budget",
        "Review the costs of the full plan before commitments.",
    ],
    [
        "school_funding",
        "finance",
        "Apply for school funding",
        "Prepare an applicable school funding application.",
    ],
    [
        "budget_request",
        "finance",
        "Submit the budget request",
        "Prepare the organization’s internal budget request.",
    ],
    [
        "purchase_request",
        "finance",
        "Submit purchase requests",
        "Coordinate approved purchases and required evidence.",
    ],
    [
        "tax_review",
        "finance",
        "Coordinate tax or filing review",
        "If applicable, coordinate qualified review; do not assume a form or tax status.",
        true,
    ],
    [
        "marketing_review",
        "marketing",
        "Review the proposed plan",
        "Check the audience, message and promotional feasibility.",
    ],
    [
        "promotion",
        "marketing",
        "Create and share promotion",
        "Prepare the campaign and communication materials.",
    ],
    [
        "board_social",
        "leadership",
        "Coordinate board social activities",
        "Plan an internal board gathering and coordinate availability.",
    ],
    [
        "invitation",
        "leadership",
        "Receive and review invitations",
        "Review invitations sent to the president or the team.",
    ],
    [
        "approval",
        "leadership",
        "Confirm important decisions",
        "Confirm the plan and any changes to authority or spending.",
    ],
    [
        "feedback",
        "planning",
        "Collect feedback and reflect",
        "Review what worked and what the team would change.",
    ],
    [
        "records",
        "leadership",
        "Save approved records and lessons",
        "Keep confirmed decisions, evidence and organizational lessons.",
    ],
].map(([id, departmentId, title, description, optional]) => ({
    id,
    departmentId,
    title,
    description,
    optional: !!optional,
}));
export const EXAMPLE_CONSTITUTION = `DESERT FOUNDERS SOCIETY — FICTIONAL CONSTITUTION FOR SOFTWARE TESTING
Article I — Purpose. The organization connects university students with founders through practical programs and shared learning.
Article II — Leadership. The President reviews incoming invitations and approves major plans and commitments. The Secretary keeps decisions, completion evidence and handoff records.
Article III — Programs. The Vice President of Professional Development leads program planning, drafts activity plans, joins the first partner meeting, designs the run of show and leads feedback reviews.
Article IV — Event Logistics. The Event Logistics Coordinator arranges venues, event registration, equipment, volunteer staffing and shift schedules.
Article V — Finance. The Treasurer reviews the total budget and coordinates school funding, internal budget requests, purchase requests and any applicable qualified filing review.
Article VI — Marketing. The Vice President of Marketing and the Marketing Intern both handle promotional work. The Vice President reviews the proposed program for audience fit; the Intern supports campaign production.
Article VII — Outreach. The Outreach Director handles campus-organization relationships. The External Relations Director handles companies and sponsors. They coordinate the first meeting with Professional Development.
Article VIII — Member programs. Opportunities come from outreach or an invitation to the President or team. Outreach arranges the first meeting with Professional Development. Professional Development writes the plan. Marketing reviews it, followed by Finance reviewing the overall cost. Venue arrangements, event registration, promotion and staffing can proceed in parallel after relevant reviews. The activity ends with feedback and confirmed lessons.
Article IX — Executive board work. Internal socials and tabling are planned according to purpose, availability, shifts and roles. A working draft may be kept and adjusted later. No one is assumed to have approval authority just because of a job title.`;
export function blankDraft() {
    return {
        schemaVersion: 2,
        name: "Desert Founders Society",
        mission: "",
        summary: "",
        step: 0,
        source: null,
        roles: [],
        actions: ACTIONS,
        assignments: [],
        memberFlow: null,
        boardFlow: null,
        boardGoal: "Plan a social gathering for our executive board.",
        guide: null,
        uncertainties: [],
        approvals: {},
        aiRuns: [],
        confirmed: false,
        contextVersion: 0,
        confirmedAt: null,
    };
}
/** Visible suggested defaults are allowed only when no role can be extracted, never claimed to be constitutional facts. */
export const PRESET_ROLES = [
    ["president", "President", "leadership"],
    ["programs", "VP of Professional Development", "planning"],
    ["logistics", "Event Logistics Coordinator", "logistics"],
    ["finance", "Treasurer", "finance"],
    ["marketing", "VP of Marketing", "marketing"],
    ["outreach", "Outreach Director", "outreach"],
    ["secretary", "Secretary", "leadership"],
].map(([id, title, departmentId]) => ({
    id,
    title,
    departmentId,
    responsibilities: [],
    source: "suggested",
    quote: "",
    confidence: 0.4,
}));
export function presetAssignments(roles) {
    return ACTIONS.map((a) => ({
        actionId: a.id,
        roleIds: roles
            .filter((r) => r.departmentId === a.departmentId &&
            !(a.id === "records" &&
                roles.some((x) => /secretary/i.test(x.title)) &&
                !/secretary/i.test(r.title)))
            .map((r) => r.id),
        origin: "preset",
        confirmed: false,
    }));
}
/** A user-approved reference playbook, provided to the AI as a starting point. Not a fake model response. */
export function referenceMemberFlow() {
    return {
        title: "Member program",
        explanation: "Opportunity → first meeting → plan → marketing review → finance review → parallel preparation → event → feedback.",
        raci: [],
        nodes: [
            ["opportunity", "Find an opportunity", ["find_opportunity"], [], 0, 0],
            ["invitation", "Receive an invitation", ["invitation"], [], 0, 220],
            [
                "meeting",
                "First partner meeting",
                ["first_meeting", "draft_plan"],
                ["opportunity", "invitation"],
                300,
                100,
            ],
            [
                "plan",
                "Write the program plan",
                ["draft_plan", "program_design"],
                ["meeting"],
                600,
                100,
            ],
            [
                "marketing",
                "Marketing review",
                ["marketing_review"],
                ["plan"],
                900,
                100,
            ],
            [
                "finance",
                "Review the full budget",
                ["budget_review"],
                ["marketing"],
                1200,
                100,
            ],
            ["venue", "Venue & equipment", ["venue"], ["finance"], 1500, 0],
            [
                "registration",
                "Event registration",
                ["registration"],
                ["finance"],
                1500,
                180,
            ],
            ["promotion", "Promotion", ["promotion"], ["finance"], 1500, 360],
            ["staffing", "People & shifts", ["staffing"], ["finance"], 1500, 540],
            [
                "event",
                "Run the activity",
                ["run_event"],
                ["venue", "registration", "promotion", "staffing"],
                1800,
                180,
            ],
            [
                "feedback",
                "Feedback & lessons",
                ["feedback", "records"],
                ["event"],
                2100,
                180,
            ],
        ].map(([id, title, actionIds, dependsOn, x, y]) => ({
            id,
            title,
            actionIds,
            dependsOn,
            dependencyMode: id === "meeting" ? "any" : "all",
            roleIds: [],
            description: "",
            position: { x, y },
            basis: "Juanxi’s approved workflow reference.",
        })),
    };
}
