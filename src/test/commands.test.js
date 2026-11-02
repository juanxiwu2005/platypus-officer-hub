import { describe, expect, it } from "vitest";
import { seedDemo } from "../data/seed";
import { commandContext, humanEventDate, parseCommand, sanitizeOps } from "../lib/commands";
import { reducer } from "../data/store";
import { validateReview } from "../data/changeReview";
import { buildEventNodes } from "../engine/playbooks";
import { computeSchedule } from "../engine/schedule";
const state = seedDemo();
export const COMMAND_CASES = [
    { sentence: "Plan Founder Dinner on Nov 19, 30 people, outside caterer, USG funding", expected: { op: "create_event", name: "Founder Dinner", food: "offsite", funding: "usg", headcount: 30 } },
    { sentence: "Create a workshop on December 3, 40 attendees, college funding", expected: { op: "create_event", name: "workshop", type: "workshop", funding: "college", headcount: 40 } },
    { sentence: "Schedule Spring Speaker Panel on February 11, 60 students, sponsor", expected: { op: "create_event", type: "speaker", speaker: true, funding: "sponsor" } },
    { sentence: "Organize a team meeting on 2026-11-05, 12 people", expected: { op: "create_event", name: "team meeting", type: "meeting", headcount: 12 } },
    { sentence: "Plan Fundraiser on Nov 20, 80 guests, dues", expected: { op: "create_event", type: "fundraiser", funding: "dues" } },
    { sentence: "Add task: Review speaker slides for Spring Speaker Night", expected: { op: "add_node", title: "Review speaker slides", eventId: "e-speaker" } },
    { sentence: "Create a node: Prepare name tags for Networking Night", expected: { op: "add_node", title: "Prepare name tags", eventId: "e-night" } },
    { sentence: "Add step: Check microphones for Networking Night assigned to Jordan", expected: { op: "add_node", ownerId: "jordan", eventId: "e-night" } },
    { sentence: "Add task: Clean the supply box", expected: { op: "add_node", title: "Clean the supply box", eventId: null } },
    { sentence: "Assign Send the October newsletter to Priya", expected: { op: "assign_owner", nodeId: "t-news", ownerId: "priya" } },
    { sentence: "Give Reconcile September receipts to Maya", expected: { op: "assign_owner", nodeId: "t-recon", ownerId: "maya" } },
    { sentence: "Unassign Book the spring weekly meeting room", expected: { op: "assign_owner", nodeId: "t-room", ownerId: null } },
    { sentence: "Set Send the October newsletter to heavy", expected: { op: "set_tier", nodeId: "t-news", tier: "heavy" } },
    { sentence: "Make Reconcile September receipts light", expected: { op: "set_tier", nodeId: "t-recon", tier: "light" } },
    { sentence: "Mark Book the spring weekly meeting room medium", expected: { op: "set_tier", nodeId: "t-room", tier: "medium" } },
    { sentence: "Make Send the October newsletter depend on Reconcile September receipts", expected: { op: "link_dependency", nodeId: "t-news", dependsOnId: "t-recon" } },
    { sentence: "Remind Sam about Send the October newsletter", expected: { op: "propose_nudge", nodeId: "t-news" } },
    { sentence: "Nudge Maya about Reconcile September receipts", expected: { op: "propose_nudge", nodeId: "t-recon" } },
    { sentence: "Can we serve homemade food?", expected: { op: "answer_question", citations: ["R08"] } },
    { sentence: "What do outside caterers need?", expected: { op: "answer_question", citations: ["R06"] } },
];
describe("20 acceptance commands (same deterministic path as /api/command)", () => {
    it.each(COMMAND_CASES)("$sentence", ({ sentence, expected }) => {
        const ops = parseCommand(sentence, commandContext(state));
        expect(ops).toHaveLength(1);
        expect(ops[0]).toMatchObject(expected);
        expect(JSON.stringify(ops)).not.toMatch(/"(?:date|latestStart|officialDeadline|clubDeadline)":/);
    });
});
describe("command boundary and review", () => {
    const draft = (op) => reducer(state, { type: "draftChanges", changeSet: { id: "review-1", sentence: "test", ops: [op], status: "pending" } });
    it("drops all AI date fields, anchors, unknown keys, bad IDs and unapproved operations", () => {
        const ops = sanitizeOps([{ op: "create_event", name: "Demo", date: "2099-01-01", latestStart: "2099-01-01", extra: { anchor: { date: "2099-01-01" } } }, { op: "updateEvent", date: "2099-01-01" }, { op: "delete_node", nodeId: "t-news" }, { op: "assign_owner", nodeId: "t-news", ownerId: "unknown" }], state);
        expect(ops).toHaveLength(1);
        expect(JSON.stringify(ops)).not.toMatch(/2099|date|anchor|extra/);
    });
    it("never mutates tasks while drafting or rejecting", () => {
        const s = draft({ op: "assign_owner", nodeId: "t-news", ownerId: "priya" });
        expect(s.nodes).toBe(state.nodes);
        expect(reducer(s, { type: "reviewChange", id: "review-1", index: 0, decision: "rejected" }).nodes).toBe(state.nodes);
    });
    it("applies edited owner via existing store logic and prevents applying twice", () => {
        const s = draft({ op: "assign_owner", nodeId: "t-news", ownerId: "priya" });
        const a = { type: "reviewChange", id: "review-1", index: 0, decision: "applied", op: { op: "assign_owner", nodeId: "t-news", ownerId: "jordan", latestStart: "2099-01-01" } };
        const applied = reducer(s, a);
        expect(applied.nodes.find(n => n.id === "t-news")).toMatchObject({ ownerId: "jordan", status: "accepted", acceptedOn: state.today });
        expect(reducer(applied, a)).toBe(applied);
        expect(applied.nodes.find(n => n.id === "t-news")?.latestStart).not.toBe("2099-01-01");
    });
    it("requires the human's date and uses buildEventNodes + engine", () => {
        const s = draft({ op: "create_event", name: "Demo", date: "2099-01-01" });
        const a = { type: "reviewChange", id: "review-1", index: 0, decision: "applied" };
        expect(reducer(s, a)).toBe(s);
        const applied = reducer(s, { ...a, human: { date: "2027-02-18" } });
        const ev = applied.events.at(-1);
        expect(ev.date).toBe("2027-02-18");
        expect(applied.nodes.filter(n => n.eventId === ev.id)).toHaveLength(buildEventNodes(ev, applied.roles).length);
        expect(applied.nodes.filter(n => n.eventId === ev.id).every(n => n.latestStart)).toBe(true);
    });
    it("only accepts real human calendar dates; relative dates remain empty", () => {
        expect(humanEventDate("Nov 19", state.today)).toBe("2026-11-19");
        expect(humanEventDate("February 11, 2027", state.today)).toBe("2027-02-11");
        expect(humanEventDate("2026-02-30", state.today)).toBe("");
        expect(humanEventDate("next Thursday", state.today)).toBe("");
    });
    it("denies officers but allows a vice president", () => {
        const s = draft({ op: "assign_owner", nodeId: "t-news", ownerId: "priya" });
        const action = { type: "reviewChange", id: "review-1", index: 0, decision: "applied" };
        const officer = { ...s, viewerId: "maya" };
        expect(reducer(officer, action)).toBe(officer);
        const vp = { ...s, roles: [...s.roles, { id: "vp", fn: "vice_president", displayName: "VP", holderId: "maya" }], people: s.people.map(p => p.id === "maya" ? { ...p, roleId: "vp" } : p), viewerId: "maya" };
        expect(reducer(vp, action).changeSets[0].status).toBe("applied");
    });
    it("refuses dependency cycles and cross-event links", () => {
        const child = state.nodes.find(n => n.dependsOn.length);
        expect(validateReview(state, { op: "link_dependency", nodeId: child.dependsOn[0], dependsOnId: child.id })).toMatch(/loop/);
        expect(validateReview(state, { op: "link_dependency", nodeId: "t-news", dependsOnId: "e-night:usg" })).toMatch(/same event/);
    });
    it("rejects operation-type changes and missing current references", () => {
        const s = draft({ op: "set_tier", nodeId: "t-news", tier: "heavy" });
        expect(reducer(s, { type: "reviewChange", id: "review-1", index: 0, decision: "applied", op: { op: "assign_owner", nodeId: "t-news", ownerId: "maya" } })).toBe(s);
        const missing = { ...s, nodes: s.nodes.filter(n => n.id !== "t-news") };
        expect(reducer(missing, { type: "reviewChange", id: "review-1", index: 0, decision: "applied" })).toBe(missing);
    });
    it("uses engine dates for added tasks and links", () => {
        const s = draft({ op: "add_node", title: "Check stage", eventId: "e-night", ownerId: "jordan", tier: "heavy", clubDeadline: "2099-01-01" });
        const applied = reducer(s, { type: "reviewChange", id: "review-1", index: 0, decision: "applied" });
        const n = applied.nodes.at(-1);
        expect(n.clubDeadline).toBe(computeSchedule(applied).nodes[n.id].club);
        expect(n.clubDeadline).not.toBe("2099-01-01");
    });
    it("does not guess a partial or ambiguous task name", () => {
        expect(parseCommand("Assign the flyer to Maya", state)).toEqual([]);
        expect(parseCommand("Remind Maya", state)).toEqual([]);
    });
    it("grounds answers in actual cited rules and refuses unknown rules", () => {
        expect(sanitizeOps([{ op: "answer_question", answer: "Invented approval", citations: ["R99"] }], state)[0]).toMatchObject({ citations: [], answer: expect.stringContaining("couldn't find") });
        expect(sanitizeOps([{ op: "answer_question", answer: "Invented approval", citations: ["R06"] }], state)[0]).toMatchObject({ answer: expect.stringContaining("proof of insurance") });
    });
});
