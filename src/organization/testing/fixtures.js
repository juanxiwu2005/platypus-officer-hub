/** Fictional provider responses for automated tests only. Never a runtime fallback. */
import { ACTIONS, blankDraft, EXAMPLE_CONSTITUTION, presetAssignments, referenceMemberFlow, } from "../presets";
const rows = [
    ["president", "President", "leadership", "Article II"],
    [
        "programs",
        "Vice President of Professional Development",
        "planning",
        "Article III",
    ],
    ["logistics", "Event Logistics Coordinator", "logistics", "Article IV"],
    ["finance", "Treasurer", "finance", "Article V"],
    ["marketing", "Vice President of Marketing", "marketing", "Article VI"],
    ["marketing_intern", "Marketing Intern", "marketing", "Article VI"],
    ["outreach", "Outreach Director", "outreach", "Article VII"],
    ["external", "External Relations Director", "outreach", "Article VII"],
    ["secretary", "Secretary", "leadership", "Article II"],
];
export const FIXTURE_ROLES = rows.map(([id, title, departmentId, article]) => ({
    id,
    title,
    departmentId,
    responsibilities: ACTIONS.filter((a) => a.departmentId === departmentId)
        .slice(0, 3)
        .map((a) => a.title),
    source: "constitution",
    quote: EXAMPLE_CONSTITUTION.split("\n").find((s) => s.startsWith(article)),
    confidence: 0.94,
}));
export function fixtureDraft() {
    const d = blankDraft();
    return {
        ...d,
        source: {
            fileName: "fictional-constitution.txt",
            text: EXAMPLE_CONSTITUTION,
            checksum: "fixture-checksum",
            uploadedAt: "2026-10-25T12:00:00.000Z",
        },
        roles: structuredClone(FIXTURE_ROLES),
        assignments: presetAssignments(FIXTURE_ROLES),
    };
}
export function fixtureFlow(d = fixtureDraft(), board = false) {
    const nodes = board
        ? [
            {
                id: "availability",
                title: "Confirm board availability",
                description: "Find a time that works for the board.",
                actionIds: ["staffing"],
                dependsOn: [],
                position: { x: 0, y: 100 },
                basis: "The board goal and staffing responsibilities.",
                dependencyMode: "all",
            },
            {
                id: "arrange",
                title: d.boardGoal.toLowerCase().includes("tabling")
                    ? "Arrange tabling shifts"
                    : "Prepare the board social",
                description: "Coordinate materials, people and practical arrangements.",
                actionIds: [
                    d.boardGoal.toLowerCase().includes("tabling")
                        ? "staffing"
                        : "board_social",
                ],
                dependsOn: ["availability"],
                position: { x: 290, y: 100 },
                basis: "The current board goal.",
                dependencyMode: "all",
            },
            {
                id: "brief",
                title: "Share the plan",
                description: "Make sure everyone knows their part.",
                actionIds: ["promotion"],
                dependsOn: ["arrange"],
                position: { x: 580, y: 100 },
                basis: "Confirmed communication responsibilities.",
                dependencyMode: "all",
            },
            {
                id: "record",
                title: "Record the outcome",
                description: "Save the agreed lessons and completion evidence.",
                actionIds: ["records"],
                dependsOn: ["brief"],
                position: { x: 870, y: 100 },
                basis: "Confirmed documentation responsibilities.",
                dependencyMode: "all",
            },
        ]
        : referenceMemberFlow().nodes;
    return {
        title: board
            ? d.boardGoal.toLowerCase().includes("tabling")
                ? "Board tabling"
                : "Board social"
            : "Member program workflow",
        explanation: board
            ? "A short chain organized around the board’s goal."
            : "Either opportunity entry can start the workflow. Reviews come before parallel preparation.",
        nodes: nodes.map((n) => ({
            ...n,
            roleIds: [
                ...new Set(n.actionIds.flatMap((id) => d.assignments.find((a) => a.actionId === id)?.roleIds ?? [])),
            ],
        })),
        raci: d.actions.map((a) => ({
            actionId: a.id,
            responsible: d.assignments.find((r) => r.actionId === a.id)?.roleIds ?? [],
            accountable: "president",
            consulted: [],
            informed: ["secretary"],
            reason: "The fictional President reviews major plans; the Secretary records confirmed decisions.",
        })),
    };
}
export function fixtureResult(stage, d = fixtureDraft()) {
    if (stage === "constitution")
        return {
            name: d.name,
            mission: "Connect students with founders through practical programs.",
            summary: "Your constitution describes planning, logistics, finance, marketing, outreach and leadership roles.",
            roles: structuredClone(FIXTURE_ROLES),
            assignments: presetAssignments(FIXTURE_ROLES),
            uncertainties: [],
        };
    if (stage === "responsibilities")
        return {
            assignments: d.assignments.length
                ? d.assignments
                : presetAssignments(d.roles),
            summary: "Responsibilities are grouped by function, with shared marketing work.",
            uncertainties: [],
        };
    if (stage === "guide")
        return {
            alwaysRead: "Application safety instructions take precedence. Use the confirmed organization roles and selected responsibilities. Important changes need review. Dates come from the rule engine.",
            onDemand: [
                {
                    topic: "Member program workflow",
                    when: "Planning or adjusting a member program",
                    content: "Opportunity or invitation → first meeting → program plan → marketing review → finance review → parallel preparation → event → feedback.",
                },
                {
                    topic: "Board workflow",
                    when: "Coordinating internal board work",
                    content: d.boardGoal,
                },
            ],
            uncertainties: [],
        };
    return fixtureFlow(d, stage === "board_workflow");
}
