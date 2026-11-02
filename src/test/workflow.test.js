import { describe, expect, it } from "vitest";
import { seedDemo } from "../data/seed";
import { reducer } from "../data/store";
import { validateReply, safeLink } from "../data/taskWorkflow";
import { computeSchedule } from "../engine/schedule";
import { advanceClock, recoveryPreview } from "../engine/followup";
import { nudgeBlocked, nudgeCheck } from "../lib/nudges";
const s = seedDemo();
const personal = (id) => ({ ...seedDemo(), viewerId: id });
const clockCase = () => ({ ...seedDemo(), nodes: s.nodes.filter(n => n.id === "t-silence") });
describe("claim handshake and status permissions", () => {
    it("only the proposed owner can claim; accepts a previously unassigned task atomically", () => {
        const id = "e-speaker:flyer";
        expect(reducer(s, { type: "claimTask", nodeId: id })).toBe(s);
        const seed = personal("sam");
        const sam = { ...seed, nodes: seed.nodes.map(n => n.id === id ? { ...n, status: "unclaimed", acceptedOn: null } : n) };
        const claimed = reducer(sam, { type: "claimTask", nodeId: id });
        expect(claimed.nodes.find(n => n.id === id)).toMatchObject({ status: "accepted", acceptedOn: s.today, ownerId: "sam" });
        expect(reducer(claimed, { type: "claimTask", nodeId: id })).toBe(claimed);
        const jordan = personal("jordan");
        const free = reducer(jordan, { type: "claimTask", nodeId: "e-night:rsvp" });
        expect(free.nodes.find(n => n.id === "e-night:rsvp")).toMatchObject({ ownerId: "jordan", status: "accepted" });
        expect(reducer({ ...free, viewerId: "sam" }, { type: "claimTask", nodeId: "e-night:rsvp" })).toMatchObject({ nodes: free.nodes });
    });
    it("requires a claim before status updates and denies another officer", () => {
        expect(reducer({ ...s, viewerId: "maya" }, { type: "replyTask", nodeId: "t-news", reply: "done" })).toEqual({ ...s, viewerId: "maya" });
        const seed = personal("sam");
        const sam = { ...seed, nodes: seed.nodes.map(n => n.id === "e-speaker:flyer" ? { ...n, status: "unclaimed", acceptedOn: null } : n) };
        expect(reducer(sam, { type: "replyTask", nodeId: "e-speaker:flyer", reply: "done" })).toBe(sam);
        expect(validateReply(sam, sam.nodes.find(n => n.id === "t-news"), "sam", "hack", {})).toMatch(/four/);
    });
    it("lets the president update any assigned task but not another officer", () => {
        const node = s.nodes.find(n => n.id === "t-news");
        expect(validateReply({ ...s, viewerId: "alex" }, node, "alex", "help", {})).toBeNull();
        expect(validateReply({ ...s, viewerId: "maya" }, node, "maya", "help", {})).toMatch(/owner or the president/);
    });
    it("does not allow ordinary officers to rewrite assignments or club dates", () => {
        const sam = personal("sam");
        expect(reducer(sam, { type: "updateNode", id: "t-news", patch: { ownerId: "maya", clubDeadlineOverride: "2099-01-01" } })).toBe(sam);
    });
    it("records waiting and help; does not change any deadline", () => {
        const sam = personal("sam");
        expect(reducer(sam, { type: "replyTask", nodeId: "t-news", reply: "waiting" })).toBe(sam);
        const waiting = reducer(sam, { type: "replyTask", nodeId: "t-news", reply: "waiting", input: { waitingOn: "Priya Nair", waitingOnPersonId: "priya" } });
        expect(waiting.nodes.find(n => n.id === "t-news")).toMatchObject({ status: "waiting", waitingOn: "Priya Nair", waitingOnPersonId: "priya", clubDeadline: sam.nodes.find(n => n.id === "t-news").clubDeadline });
        expect(waiting.notifications.some(n => n.recipientId === "priya" && /waiting for you/.test(n.text))).toBe(true);
        const help = reducer(waiting, { type: "replyTask", nodeId: "t-news", reply: "help" });
        expect(help.nodes.find(n => n.id === "t-news").status).toBe("blocked");
        expect(help.notifications.some(n => n.kind === "help" && n.recipientId === "alex")).toBe(true);
    });
    it("marks completion once, adds contribution once and stops the current follow-up", () => {
        const base = { ...personal("jordan"), silenceCases: [{ id: "case", nodeId: "t-silence", ownerId: "jordan", startedOn: s.today, closedOn: null }] };
        const done = reducer(base, { type: "replyTask", nodeId: "t-silence", reply: "done" });
        expect(done.nodes.find(n => n.id === "t-silence")).toMatchObject({ status: "done", completedOn: s.today });
        expect(done.contributions.filter(c => c.nodeId === "t-silence")).toHaveLength(1);
        expect(done.silenceCases[0].closedOn).toBe(s.today);
        expect(reducer(done, { type: "replyTask", nodeId: "t-silence", reply: "done" })).toBe(done);
        expect(advanceClock(done, 10).protocolLog.filter(e => e.nodeId === "t-silence")).toEqual([]);
        expect(nudgeBlocked(done, done.nodes.find(n => n.id === "t-silence"))).toMatch(/complete/);
    });
    it("replies close existing reminders and private cases immediately", () => {
        const base = { ...personal("sam"), nudges: [{ id: "n", nodeId: "t-news", text: "demo", channel: "whatsapp", sentBy: "alex", sentOn: s.today, response: null }] };
        const updated = reducer(base, { type: "replyTask", nodeId: "t-news", reply: "help" });
        expect(updated.nudges[0].response).toBe("blocked");
        expect(nudgeBlocked(updated, updated.nodes.find(n => n.id === "t-news"))).toMatch(/replied/);
    });
});
describe("extension with a current draft", () => {
    const request = (base = personal("maya")) => reducer(base, { type: "replyTask", nodeId: "e-night:usg", reply: "extension", input: { draftLink: "https://example.org/current-draft", requestedDate: "2026-11-06", reason: "We need the vendor quote." } });
    it("rejects missing/unsafe drafts, invalid dates, earlier deadlines and duplicate requests", () => {
        const base = personal("maya"), n = base.nodes.find(n => n.id === "e-night:usg");
        for (const draftLink of ["", "javascript:alert(1)", "data:text/plain,hi"])
            expect(validateReply(base, n, "maya", "extension", { draftLink, requestedDate: "2026-11-06" })).toMatch(/draft/);
        for (const requestedDate of ["2026-02-30", "2026-10-20", "2026-10-30"])
            expect(validateReply(base, n, "maya", "extension", { draftLink: "https://example.org/draft", requestedDate })).toMatch(/later/);
        const pending = request();
        expect(request(pending)).toBe(pending);
        expect(safeLink("https://example.org")).toBe(true);
    });
    it("does not move deadlines while pending; only a leader may approve", () => {
        const pending = request();
        expect(pending.extensionRequests).toHaveLength(1);
        expect(pending.nodes.find(n => n.id === "e-night:usg").clubDeadline).toBe("2026-10-30");
        const action = { type: "reviewExtension", id: pending.extensionRequests[0].id, approve: true };
        expect(reducer(pending, action)).toBe(pending);
        const approved = reducer({ ...pending, viewerId: "alex" }, action);
        expect(approved.extensionRequests[0].status).toBe("approved");
        const n = approved.nodes.find(n => n.id === "e-night:usg");
        expect(n.clubDeadline).toBe("2026-11-06");
        expect(n.officialDeadline).toBe("2026-11-04");
        expect(computeSchedule(approved).nodes[n.id].issues.some(i => i.code === "official_missed")).toBe(true);
        expect(approved.notifications.some(n => n.recipientId === "maya" && /approved/.test(n.text))).toBe(true);
        expect(reducer(approved, action)).toBe(approved);
    });
    it("declining preserves deadlines and clears a stale request; completion cancels a request", () => {
        const pending = request(), id = pending.extensionRequests[0].id;
        const leader = { ...pending, viewerId: "alex" };
        const changed = reducer(leader, { type: "updateNode", id: "e-night:usg", patch: { clubDeadlineOverride: "2026-11-02" } });
        expect(reducer(changed, { type: "reviewExtension", id, approve: true })).toBe(changed);
        expect(reducer(changed, { type: "reviewExtension", id, approve: false }).extensionRequests[0].status).toBe("rejected");
        expect(reducer(pending, { type: "replyTask", nodeId: "e-night:usg", reply: "done" }).extensionRequests[0].status).toBe("cancelled");
    });
    it("reassignment cancels pending approval and places the newly assigned task in To do", () => {
        const pending = request();
        const reassigned = reducer({ ...pending, viewerId: "alex" }, { type: "updateNode", id: "e-night:usg", patch: { ownerId: "jordan" } });
        expect(reassigned.extensionRequests[0].status).toBe("cancelled");
        expect(reassigned.nodes.find(n => n.id === "e-night:usg")).toMatchObject({ ownerId: "jordan", status: "accepted", acceptedOn: s.today, assignedOn: s.today, ownerVersion: 1 });
    });
});
describe("private ten-day silence walkthrough", () => {
    it("hits day 3, 5, 7, 8, 10 at the expected dates and recipients", () => {
        const base = clockCase();
        const day2 = reducer(base, { type: "advanceClock", days: 2 });
        expect(day2.protocolLog).toEqual([]);
        const day3 = reducer(day2, { type: "advanceClock", days: 1 });
        expect(day3.protocolLog.map(e => e.day)).toEqual([3]);
        expect(day3.protocolLog[0]).toMatchObject({ scheduledOn: "2026-10-25", recipientIds: ["jordan"] });
        const day5 = reducer(day3, { type: "advanceClock", days: 2 });
        expect(day5.protocolLog.map(e => e.day)).toEqual([3, 5]);
        const day7 = reducer(day5, { type: "advanceClock", days: 2 });
        expect(day7.protocolLog.at(-1)).toMatchObject({ day: 7, recipientIds: ["alex"] });
        expect(day7.protocolLog.at(-1).text).toContain("2026-10-30");
        const day8 = reducer(day7, { type: "advanceClock", days: 1 });
        expect(day8.nodes.find(n => n.id === "t-silence").ownerId).toBe("jordan");
        const entry = day8.protocolLog.at(-1);
        expect(entry.kind).toBe("suggest_owner");
        const day10 = reducer(day8, { type: "advanceClock", days: 2 });
        expect(day10.protocolLog.map(e => e.day)).toEqual([3, 5, 7, 8, 10]);
        expect(day10.nodes.some(n => n.id === day10.protocolLog.at(-1).retroNodeId)).toBe(true);
        const retro = day10.nodes.find(n => n.id.startsWith("retro:"));
        expect(retro.clubDeadline).toBe("2026-11-06");
        expect(day10.notifications.filter(n => n.recipientId === "maya")).toEqual([]);
    });
    it("one ten-day jump is equivalent to ten one-day jumps and does not duplicate stages", () => {
        const base = clockCase();
        const jump = advanceClock(base, 10);
        let daily = base;
        for (let i = 0; i < 10; i++)
            daily = advanceClock(daily, 1);
        expect(jump.protocolLog).toEqual(daily.protocolLog);
        expect(jump.notifications).toEqual(daily.notifications);
        expect(advanceClock(jump, 1).protocolLog.filter(e => e.nodeId === "t-silence")).toHaveLength(5);
    });
    it("an owner reply stops the current case; past messages remain as private history", () => {
        const day5 = advanceClock(clockCase(), 5);
        const reply = reducer({ ...day5, viewerId: "jordan" }, { type: "replyTask", nodeId: "t-silence", reply: "waiting", input: { waitingOn: "School or vendor approval" } });
        expect(reply.silenceCases[0].closedOn).toBe("2026-10-27");
        const day10 = advanceClock(reply, 5);
        expect(day10.protocolLog.filter(e => e.caseId === day5.silenceCases[0].id).map(e => e.day)).toEqual([3, 5]);
    });
    it("temporary executive ownership enters To do; day 10 still offers recovery", () => {
        const day8 = advanceClock(clockCase(), 8), entry = day8.protocolLog.find(e => e.kind === "suggest_owner");
        const changed = reducer(day8, { type: "temporaryOwner", entryId: entry.id });
        expect(changed.nodes[0]).toMatchObject({ ownerId: entry.suggestedOwnerId, status: "accepted" });
        expect(changed.silenceCases[0].startedOn).toBe(s.today);
        expect(reducer(changed, { type: "temporaryOwner", entryId: entry.id })).toBe(changed);
        const day10 = advanceClock(changed, 2);
        expect(day10.protocolLog.some(e => e.kind === "recovery")).toBe(true);
        const recovery = day10.protocolLog.find(e => e.kind === "recovery");
        const preview = recoveryPreview(day10, "t-silence");
        const applied = reducer(day10, { type: "approveRecovery", entryId: recovery.id });
        expect(applied.nodes.find(n => n.id === "t-silence").latestStart).toBe(preview.latestStart);
        expect(applied.nodes.find(n => n.id === "t-silence").officialDeadline).toBe(day10.nodes[0].officialDeadline);
    });
    it("recovery dates use the engine and preserve official deadlines and busy weeks", () => {
        const late = { ...s, today: "2026-11-09" };
        const p = recoveryPreview(late, "e-night:usg");
        expect(p.official).toBe("2026-11-04");
        expect(p.latestStart >= late.today).toBe(true);
        expect(p.latestStart).toBe("2026-11-16");
        expect(p.issues.some(i => i.code === "official_missed")).toBe(true);
    });
    it("respects reminder caps, ignores backward/huge clock jumps, and prevents officer clock changes", () => {
        const base = clockCase();
        const capped = { ...base, org: { ...base.org, settings: { ...base.org.settings, maxRemindersPerTask: 1 } } };
        expect(advanceClock(capped, 5).protocolLog.filter(e => e.kind === "reminder" && e.recipientIds.length)).toHaveLength(1);
        expect(advanceClock(base, -1)).toBe(base);
        expect(advanceClock(base, 31)).toBe(base);
        const officer = { ...base, viewerId: "jordan" };
        expect(reducer(officer, { type: "advanceClock", days: 10 })).toBe(officer);
    });
    it("unclaimed handovers return to risk and private president inbox after 48 hours", () => {
        const n = { ...s.nodes.find(n => n.id === "t-silence"), status: "unclaimed", acceptedOn: null, assignedOn: s.today };
        const base = { ...clockCase(), nodes: [n] };
        expect(computeSchedule(advanceClock(base, 1)).nodes[n.id].issues.some(i => i.code === "claim_overdue")).toBe(false);
        const two = advanceClock(base, 2);
        expect(computeSchedule(two).nodes[n.id].issues.some(i => i.code === "claim_overdue")).toBe(true);
        expect(two.notifications.some(n => n.recipientId === "alex" && n.kind === "claim")).toBe(true);
    });
    it("simulated reminders use the same five-section, banned-word and 100-word checks", () => {
        const base = clockCase();
        base.nodes[0] = { ...base.nodes[0], title: "URGENT Just use AI ASAP" };
        const entry = advanceClock(base, 3).protocolLog.find(e => e.kind === "reminder");
        const [subject, ...body] = entry.text.split("\n");
        expect(nudgeCheck(subject, body.join("\n")).ok).toBe(true);
        expect(entry.text).not.toMatch(/URGENT|Just use AI|ASAP/);
    });
    it("manual and simulated reminders share task and weekly limits", () => {
        const day5 = advanceClock(clockCase(), 5);
        const action = { type: "confirmNudgeSent", nodeId: "t-silence", channel: "sms", text: "A checked demo draft" };
        const third = reducer(day5, action);
        expect(third.nudges).toHaveLength(1);
        expect(nudgeBlocked(third, third.nodes[0])).toMatch(/task.*limit/);
        expect(reducer(third, action)).toBe(third);
        const week = { ...day5, protocolLog: Array.from({ length: 6 }, (_, i) => ({ ...day5.protocolLog[0], id: `weekly-${i}`, nodeId: `other-${i}`, scheduledOn: day5.today })) };
        expect(nudgeBlocked(week, week.nodes[0])).toMatch(/weekly/);
    });
});
describe("RACI routing", () => {
    it("notifies downstream owner only after every dependency completes; does not broadcast to unrelated officers", () => {
        const up = s.nodes.find(n => n.id === "t-silence");
        const other = { ...up, id: "other", ownerId: "maya" };
        const down = { ...up, id: "down", ownerId: "priya", dependsOn: [up.id, other.id] };
        const base = { ...s, viewerId: "jordan", nodes: [up, other, down] };
        const first = reducer(base, { type: "replyTask", nodeId: up.id, reply: "done" });
        expect(first.notifications.filter(n => n.kind === "ready")).toEqual([]);
        const both = reducer({ ...first, viewerId: "maya" }, { type: "replyTask", nodeId: "other", reply: "done" });
        expect(both.notifications.filter(n => n.kind === "ready").map(n => n.recipientId)).toEqual(["priya"]);
        expect(both.notifications.some(n => n.recipientId === "sam")).toBe(false);
    });
    it("routes waiting to downstream, help to consulted, and read actions only affect the recipient", () => {
        const up = { ...s.nodes.find(n => n.id === "t-silence"), consultedRoleIds: ["r-fin"] };
        const down = { ...up, id: "down", ownerId: "priya", consultedRoleIds: [], dependsOn: [up.id] };
        const base = { ...s, viewerId: "jordan", nodes: [up, down] };
        const waiting = reducer(base, { type: "replyTask", nodeId: up.id, reply: "waiting", input: { waitingOn: "Maya Chen" } });
        expect(waiting.notifications.some(n => n.recipientId === "priya" && n.kind === "delay")).toBe(true);
        const help = reducer(base, { type: "replyTask", nodeId: up.id, reply: "help" });
        expect(help.notifications.some(n => n.recipientId === "maya" && n.kind === "help")).toBe(true);
        const notice = help.notifications.find(n => n.recipientId === "maya");
        expect(reducer(help, { type: "markNoticeRead", id: notice.id }).notifications.find(n => n.id === notice.id).read).toBe(false);
        expect(reducer({ ...help, viewerId: "maya" }, { type: "markNoticeRead", id: notice.id }).notifications.find(n => n.id === notice.id).read).toBe(true);
    });
});
