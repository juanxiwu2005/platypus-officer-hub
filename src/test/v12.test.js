import { describe, expect, it } from "vitest";
import { seedDemo } from "../data/seed";
import { reducer } from "../data/store";
import { aiSnapshot, knownDates } from "../lib/aiContext";
import { commandContext, isSmallOp, sanitizeOps } from "../lib/commands";
import { sanitizeCards, stripDates } from "../lib/chatCards";
import { SHARED_POOL } from "../data/sharedPool";
const set = (ops, id = "auto-1") => ({ id, sentence: "test", ops: ops, status: "pending", source: "AI draft" });
const lead = () => seedDemo();
const asOfficer = (s) => {
    const r = s.roles.find(r => r.fn !== "president" && r.fn !== "vice_president" && r.holderId);
    return { ...s, viewerId: r.holderId };
};
describe("v1.2 AI data access", () => {
    it("the snapshot has everything the viewer can see, but no secrets or other people's buffers", () => {
        const s = asOfficer(lead());
        const snap = aiSnapshot(s);
        expect(snap.tasks).toHaveLength(s.nodes.length);
        expect(snap.events).toHaveLength(s.events.length);
        expect(snap.partners).toHaveLength(s.contacts.filter(c => c.visibility === "all").length); // leads-only contacts are hidden from AI too
        const text = JSON.stringify(snap);
        expect(text).not.toMatch(/demoLinkKey|dataUrl|signature|personalBufferEnabled/);
        expect(snap.people.every(p => !("personalBufferDays" in p))).toBe(true);
        expect(snap.yourUpdates.every(n => s.notifications.find(x => x.nodeId === n.taskId && x.text === n.text)?.recipientId === s.viewerId)).toBe(true);
        expect(snap.silentTasks).toEqual([]);
    });
    it("the shared pool is fictional and read-only: no op can target it", () => {
        expect(SHARED_POOL.note).toMatch(/Fictional/);
        const ops = sanitizeOps([{ op: "add_pool_entry", text: "x" }, { op: "update_pool", id: "pool-film" }], commandContext(lead()));
        expect(ops).toEqual([]);
    });
    it("AI text keeps dates the app knows and masks invented ones", () => {
        const s = lead();
        const known = knownDates(aiSnapshot(s));
        const usg = s.nodes.find(n => n.id === "e-night:usg");
        const [y, m, d] = usg.clubDeadline.split("-");
        const short = `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m) - 1]} ${Number(d)}`;
        expect(stripDates(`Due ${short}, ${usg.clubDeadline}, ${Number(m)}/${Number(d)}`, known)).toBe(`Due ${short}, ${usg.clubDeadline}, ${Number(m)}/${Number(d)}`);
        expect(stripDates(`Start ${y}-12-25 or Dec 25`, known)).toBe("Start [date in plan] or [date in plan]");
        expect(stripDates(`Due ${short}`)).toBe("Due [date in plan]");
        expect(sanitizeCards({ cards: [{ kind: "text", text: `By ${usg.clubDeadline}` }] }, commandContext(s), known)[0]).toEqual({ kind: "text", text: `By ${usg.clubDeadline}` });
    });
});
describe("v1.2 AI changes: small apply at once with Undo, big wait for review", () => {
    it("sorts new ops into small and big", () => {
        const s = lead();
        const n = s.nodes.find(n => n.status !== "done");
        const ops = sanitizeOps([
            { op: "set_status", nodeId: n.id, status: "in_progress" }, { op: "rename_task", nodeId: n.id, title: "New name" },
            { op: "set_funding_amount", eventId: s.funding[0].eventId, amount: 250 }, { op: "update_event", eventId: s.events[0].id, headcount: 80 },
            { op: "set_status", nodeId: n.id, status: "flying" }, { op: "advance_funding", eventId: "nope" },
        ], commandContext(s));
        expect(ops.map(o => [o.op, isSmallOp(o)])).toEqual([["set_status", true], ["rename_task", true], ["set_funding_amount", false], ["update_event", false]]);
    });
    it("applies small edits as the viewer and undoes them", () => {
        const s = lead();
        const n = s.nodes.find(n => n.status !== "done" && n.ownerId);
        const next = reducer(s, { type: "aiAutoApply", changeSet: set([{ op: "rename_task", nodeId: n.id, title: "Renamed by AI" }, { op: "set_tier", nodeId: n.id, tier: n.tier === "heavy" ? "light" : "heavy" }]) });
        expect(next.nodes.find(x => x.id === n.id).title).toBe("Renamed by AI");
        const record = next.changeSets.find(c => c.id === "auto-1");
        expect(record).toMatchObject({ auto: true, status: "applied", reviews: ["applied", "applied"] });
        const undone = reducer(next, { type: "undoAuto", id: "auto-1" });
        expect(undone.nodes.find(x => x.id === n.id).title).toBe(n.title);
        expect(undone.nodes.find(x => x.id === n.id).tier).toBe(n.tier);
        expect(undone.changeSets.find(c => c.id === "auto-1").undone).toBe(true);
        expect(reducer(undone, { type: "undoAuto", id: "auto-1" })).toBe(undone);
    });
    it("an officer's AI cannot do what the officer cannot do", () => {
        const s = asOfficer(lead());
        const other = s.nodes.find(n => n.status !== "done" && n.ownerId && n.ownerId !== s.viewerId);
        const next = reducer(s, { type: "aiAutoApply", changeSet: set([{ op: "rename_task", nodeId: other.id, title: "Hijack" }]) });
        expect(next.nodes.find(x => x.id === other.id).title).toBe(other.title);
        expect(next.changeSets.at(-1)).toMatchObject({ status: "rejected", reviews: ["rejected"] });
        expect(next.changeSets.at(-1).notes[0]).toMatch(/president or VP/);
    });
    it("big edits go to review and apply only when a lead approves", () => {
        const s = lead();
        const f = s.funding[0];
        const drafted = reducer(s, { type: "draftChanges", changeSet: set([{ op: "set_funding_amount", eventId: f.eventId, amount: (f.spent ?? 0) + 123 }, { op: "set_status", nodeId: s.nodes[0].id, status: "done" }], "big-1") });
        const change = drafted.changeSets.find(c => c.id === "big-1");
        expect(change.ops.map(o => o.op)).toEqual(["set_funding_amount"]); // small ops never wait in review
        expect(drafted.funding[0].amount).toBe(f.amount);
        const applied = reducer(drafted, { type: "reviewChange", id: "big-1", index: 0, decision: "applied" });
        expect(applied.funding.find(x => x.eventId === f.eventId).amount).toBe((f.spent ?? 0) + 123);
    });
});
