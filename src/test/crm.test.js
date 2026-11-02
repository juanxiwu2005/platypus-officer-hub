import { describe, expect, it } from "vitest";
import { seedDemo } from "../data/seed";
import { reducer } from "../data/store";
import { canSeeContact, nextStep, orgName, parseTags, timeline, visibleContacts } from "../data/crm";
import { aiSnapshot } from "../lib/aiContext";
import { commandContext } from "../lib/commands";
const as = (s, viewerId) => ({ ...s, viewerId });
const base = () => seedDemo("2026-10-22");
const add = (s, extra = {}) => reducer(s, { type: "addContact", name: "Pat Lee (fictional)", organization: "Print Co (fictional)", relation: "Vendor", ownerRoleId: "r-mkt", cadenceDays: 45, ...extra });
describe("club CRM", () => {
    it("seeds organizations, contacts and a timeline that point at each other", () => {
        const s = base();
        expect(s.contacts.every(c => !c.organizationId || s.organizations.some(o => o.id === c.organizationId))).toBe(true);
        expect(s.interactions.every(i => (i.contactId && s.contacts.some(c => c.id === i.contactId)) || (i.organizationId && s.organizations.some(o => o.id === i.organizationId)))).toBe(true);
        expect(orgName(s, "o-caterer")).toMatch(/Desert Table/);
    });
    it("any member can add a contact; the organization is found or created by name", () => {
        let s = as(base(), "jordan");
        s = add(s);
        const c = s.contacts.at(-1);
        expect(c).toMatchObject({ name: "Pat Lee (fictional)", stage: "cold", visibility: "all", createdBy: "jordan", lastContact: null });
        expect(orgName(s, c.organizationId)).toBe("Print Co (fictional)");
        const again = add(s, { name: "Sam Kim (fictional)", organization: "print co (fictional)" });
        expect(again.organizations).toHaveLength(s.organizations.length);
        expect(add(s, { name: "  " })).toBe(s);
        expect(add(s, { cadenceDays: 0 })).toBe(s);
        expect(add(s, { ownerRoleId: "nope" })).toBe(s);
    });
    it("only the owner or a lead edits a profile; only a lead reassigns the owner", () => {
        const s = base();
        const id = "c-caterer"; // owned by the Treasurer (Maya)
        const sam = as(s, "sam");
        expect(reducer(sam, { type: "updateContact", id, patch: { title: "Boss" } })).toBe(sam);
        const own = reducer(as(s, "maya"), { type: "updateContact", id, patch: { title: "Owner", stage: "warm", tags: ["A", "a", " b "] } });
        expect(own.contacts.find(c => c.id === id)).toMatchObject({ title: "Owner", stage: "warm", tags: ["a", "b"] });
        expect(reducer(as(s, "maya"), { type: "updateContact", id, patch: { ownerRoleId: "r-mkt" } })).toEqual(as(s, "maya"));
        expect(reducer(s, { type: "updateContact", id, patch: { ownerRoleId: "r-mkt" } }).contacts.find(c => c.id === id).ownerRoleId).toBe("r-mkt");
        expect(reducer(s, { type: "updateContact", id, patch: { stage: "bogus" } })).toBe(s);
    });
    it("leads-only contacts are hidden from other members, the owner and the creator still see them", () => {
        const s = base();
        const hidden = s.contacts.find(c => c.visibility === "leads");
        expect(canSeeContact(s, hidden)).toBe(true); // president owns it
        expect(canSeeContact(as(s, "maya"), hidden)).toBe(false);
        expect(visibleContacts(as(s, "maya"))).not.toContain(hidden);
        expect(JSON.stringify(aiSnapshot(as(s, "maya")))).not.toContain(hidden.name);
        expect(commandContext(as(s, "maya")).contacts.some(c => c.id === hidden.id)).toBe(false);
        const lastSeen = reducer(as(s, "maya"), { type: "logInteraction", input: { contactId: hidden.id, date: "2026-10-22", kind: "call", summary: "x" } });
        expect(lastSeen.interactions).toHaveLength(s.interactions.length);
    });
    it("logging an interaction adds to the timeline and moves last contact forward, never back", () => {
        let s = as(base(), "sam");
        s = reducer(s, { type: "logInteraction", input: { contactId: "c-caterer", date: "2026-10-20", kind: "call", summary: "Confirmed headcount", outcome: "OK", nextStep: "Send deposit", nextDue: "2026-10-28" } });
        expect(s.contacts.find(c => c.id === "c-caterer").lastContact).toBe("2026-10-20");
        expect(s.interactions.at(-1)).toMatchObject({ byId: "sam", kind: "call", nextDone: false });
        expect(nextStep(s, "c-caterer")?.nextStep).toBe("Send deposit");
        const older = reducer(s, { type: "logInteraction", input: { contactId: "c-caterer", date: "2026-09-01", kind: "email", summary: "Old note" } });
        expect(older.contacts.find(c => c.id === "c-caterer").lastContact).toBe("2026-10-20");
        expect(timeline(older, { contactId: "c-caterer" }).map(i => i.date)).toEqual(["2026-10-20", "2026-10-13", "2026-09-01"]);
        // rejects: empty summary, future date, bad kind, bad date
        for (const bad of [{ summary: " " }, { date: "2026-10-30" }, { kind: "fax" }, { date: "2026-02-30" }]) {
            expect(reducer(s, { type: "logInteraction", input: { contactId: "c-caterer", date: "2026-10-21", kind: "email", summary: "ok", ...bad } })).toBe(s);
        }
    });
    it("the author, the owner or a lead can tick off or delete an entry; others cannot", () => {
        let s = as(base(), "sam");
        s = reducer(s, { type: "logInteraction", input: { contactId: "c-founder", date: "2026-10-21", kind: "email", summary: "Hi", nextStep: "Reply", nextDue: null } });
        const id = s.interactions.at(-1).id;
        expect(reducer(as(s, "priya"), { type: "updateInteraction", id, nextDone: true })).toEqual(as(s, "priya"));
        expect(reducer(s, { type: "updateInteraction", id, nextDone: true }).interactions.find(i => i.id === id).nextDone).toBe(true);
        expect(reducer(as(s, "alex"), { type: "updateInteraction", id, delete: true }).interactions.some(i => i.id === id)).toBe(false);
        expect(nextStep(reducer(s, { type: "updateInteraction", id, nextDone: true }), "c-founder")).toBeUndefined();
    });
    it("deleting is for leads; an organization with people cannot be deleted", () => {
        const s = base();
        expect(reducer(as(s, "maya"), { type: "deleteContact", id: "c-caterer" }).contacts).toHaveLength(s.contacts.length);
        const gone = reducer(s, { type: "deleteContact", id: "c-caterer" });
        expect(gone.contacts.some(c => c.id === "c-caterer")).toBe(false);
        expect(gone.interactions.some(i => i.contactId === "c-caterer")).toBe(false);
        expect(reducer(s, { type: "deleteOrganization", id: "o-caterer" }).organizations).toHaveLength(s.organizations.length);
        expect(reducer(gone, { type: "deleteOrganization", id: "o-caterer" }).organizations.some(o => o.id === "o-caterer")).toBe(false);
    });
    it("organizations: unique names, owner-or-lead edits, interactions on an organization show in its timeline", () => {
        let s = base();
        expect(reducer(s, { type: "addOrganization", name: "desert table catering (fictional)", orgType: "Vendor" })).toBe(s);
        expect(reducer(as(s, "sam"), { type: "updateOrganization", id: "o-caterer", patch: { notes: "x" } })).toEqual(as(s, "sam"));
        expect(reducer(as(s, "maya"), { type: "updateOrganization", id: "o-caterer", patch: { notes: "Updated", tags: ["Food"] } }).organizations.find(o => o.id === "o-caterer")).toMatchObject({ notes: "Updated", tags: ["food"] });
        s = reducer(as(s, "sam"), { type: "logInteraction", input: { contactId: null, organizationId: "o-osl", date: "2026-10-21", kind: "meeting", summary: "Visited the office" } });
        expect(timeline(s, { organizationId: "o-osl" })).toHaveLength(2);
    });
    it("parseTags trims, lowercases and de-duplicates", () => {
        expect(parseTags(" Catering, tempe ,,CATERING")).toEqual(["catering", "tempe"]);
    });
    it("marking contacted still works for the owner (used by the AI small op and Undo)", () => {
        const s = reducer(as(base(), "maya"), { type: "contacted", id: "c-caterer" });
        expect(s.contacts.find(c => c.id === "c-caterer").lastContact).toBe("2026-10-22");
        expect(reducer(as(base(), "sam"), { type: "contacted", id: "c-caterer" }).contacts.find(c => c.id === "c-caterer").lastContact).toBe("2026-10-13");
    });
});
