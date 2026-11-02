import { describe, expect, it } from "vitest";
import { seedDemo } from "../data/seed";
import { reducer } from "../data/store";
import { clubDraft, completeSetup, profilePatch, saveClubSettings, saveProfile, validateClub, validateDefaults, validateProfile, validateRoles, validateWorkspace } from "../data/settings";
import { computeSchedule } from "../engine/schedule";
import { parseCommand } from "../lib/commands";
import { newRole } from "../data/structure";
const base = () => seedDemo("2026-10-22");
const code = "12345678-1234-1234-1234-123456789abc";
describe("club settings", () => {
    it("validates the seeded club and defaults", () => { const s = base(); expect(validateClub(clubDraft(s))).toBeNull(); expect(validateDefaults(s.org.settings)).toBeNull(); });
    it("renames roles without changing owners, role ids or official dates", () => {
        const s = base(), d = clubDraft(s);
        d.roles.find(r => r.fn === "finance").displayName = "VP of Finance";
        const next = saveClubSettings(s, d, { ...s.org.settings, clubBufferBusinessDays: 4 });
        expect(next.roles.find(r => r.id === "r-fin")?.displayName).toBe("VP of Finance");
        expect(next.nodes.find(n => n.id === "e-night:usg")?.ownerId).toBe("maya");
        expect(next.nodes.find(n => n.id === "e-night:usg")?.officialDeadline).toBe("2026-11-04");
        expect(next.nodes.find(n => n.id === "e-night:usg")?.clubDeadline).not.toBe(s.nodes.find(n => n.id === "e-night:usg")?.clubDeadline);
    });
    it("does not let a cadre edit club settings or others' private profiles", () => {
        const s = base(), d = clubDraft(s);
        d.people[1].personalBufferDays = 5;
        expect(saveClubSettings({ ...s, viewerId: "maya" }, d, s.org.settings).org).toBe(s.org);
        expect(saveClubSettings(s, d, s.org.settings).people[1].personalBufferDays).toBe(s.people[1].personalBufferDays);
        expect(saveProfile(s, "maya", { ...profilePatch(s.people[1]), personalBufferDays: 5 })).toBe(s);
    });
    it("rejects duplicate role names, duplicate functions and removing the president", () => {
        const s = base();
        const roles = structuredClone(s.roles);
        roles[1].displayName = roles[0].displayName;
        expect(validateRoles(roles, s.people)).toBeTruthy();
        roles[1].displayName = "Finance";
        roles[1].fn = roles[0].fn;
        expect(validateRoles(roles, s.people)).toBeTruthy();
        expect(validateRoles(s.roles.filter(r => r.fn !== "president"), s.people)).toBeTruthy();
    });
    it("updates node functions when an officer's standard function changes", () => {
        const s = base(), d = clubDraft(s);
        d.roles.find(r => r.id === "r-fin").fn = "vice_president";
        const next = saveClubSettings(s, d, s.org.settings);
        expect(next.nodes.find(n => n.id === "e-night:usg")?.fn).toBe("vice_president");
    });
    it("lets the president add a vacant role without changing current officers", () => {
        const s = base(), d = clubDraft(s), added = newRole("Community Lead", d.roles[0].id);
        d.roles.push(added);
        const next = saveClubSettings(s, d, s.org.settings);
        expect(next.roles.find(r => r.id === added.id)).toMatchObject({ displayName: "Community Lead", holderId: null });
        expect(next.people).toEqual(s.people);
    });
    it("lets the president update fictional officer contact details without moving their role", () => {
        const s = base(), d = clubDraft(s), maya = d.people.find(p => p.id === "maya");
        maya.name = "Maya C.";
        maya.email = "maya.c@example.org";
        maya.phone = "480-555-0199";
        maya.asuId = "9999000099";
        const next = saveClubSettings(s, d, s.org.settings);
        expect(next.people.find(p => p.id === "maya")).toMatchObject({ name: "Maya C.", email: "maya.c@example.org", phone: "480-555-0199", asuId: "9999000099", roleId: "r-fin" });
    });
    it("rejects reordered protocol, excessive nudges and automatic sending", () => {
        const s = base();
        expect(validateDefaults({ ...s.org.settings, silenceProtocol: { ...s.org.settings.silenceProtocol, presidentDay: 4 } })).toBeTruthy();
        expect(validateDefaults({ ...s.org.settings, maxRemindersPerTask: 4 })).toBeTruthy();
        expect(validateDefaults({ ...s.org.settings, sendMode: "auto" })).toBeTruthy();
        expect(validateDefaults({ ...s.org.settings, quietHours: { from: "23:00", to: "08:00" } })).toBeTruthy();
    });
    it("requires two or three positive numeric goals and safe workspace links", () => {
        const s = base(), d = clubDraft(s);
        d.goals = d.goals.slice(0, 1);
        expect(validateClub(d)).toBeTruthy();
        d.goals = clubDraft(s).goals;
        d.goals[0].target = NaN;
        expect(validateClub(d)).toBeTruthy();
        expect(validateWorkspace({ ...s.org.workspace, calendarUrl: "javascript:alert(1)" })).toBeTruthy();
        expect(validateWorkspace({ ...s.org.workspace, driveLink: "file:///private" })).toBeTruthy();
    });
    it("keeps a small fictional attachment and rejects oversized or executable files", () => {
        const w = base().org.workspace;
        const f = { id: "f", name: "fictional-plan.txt", size: 5, type: "text/plain", dataUrl: "data:text/plain;base64,aGVsbG8=" };
        expect(validateWorkspace({ ...w, files: [f] })).toBeNull();
        expect(validateWorkspace({ ...w, files: [{ ...f, name: "run.html" }] })).toBeTruthy();
        expect(validateWorkspace({ ...w, files: [{ ...f, size: 512001 }] })).toBeTruthy();
        expect(validateWorkspace({ ...w, files: [{ ...f, dataUrl: "javascript:alert(1)" }] })).toBeTruthy();
        expect(validateWorkspace({ ...w, files: [f, f, f, f] })).toBeTruthy();
    });
});
describe("personal preferences and invitations", () => {
    it("saves only the self-profile whitelist and preserves role and contribution points", () => {
        const s = base();
        const patch = { ...profilePatch(s.people[0]), careerGoal: "Operations", personalBufferDays: 3, roleId: "r-fin", contributions: [] };
        const next = reducer(s, { type: "saveProfile", personId: "alex", patch });
        expect(next.people[0].careerGoal).toBe("Operations");
        expect(next.people[0].roleId).toBe("r-pres");
        expect(next.contributions).toBe(s.contributions);
    });
    it("allows another fictional officer's setup only with the current local invitation", () => {
        const s = base(), p = { ...profilePatch(s.people[1]), remindAt: "morning" };
        expect(saveProfile(s, "maya", p, "wrong")).toBe(s);
        expect(saveProfile(s, "maya", p, s.org.inviteCode).people[1].remindAt).toBe("morning");
        const reset = reducer(s, { type: "reset" });
        expect(saveProfile(reset, "maya", p, s.org.inviteCode)).toBe(reset);
    });
    it("reschedules busy weeks and keeps official deadlines fixed", () => {
        const s = { ...base(), viewerId: "maya" };
        const patch = { ...profilePatch(s.people[1]), busyWeeks: ["2026-10-26"] };
        const next = saveProfile(s, "maya", patch);
        expect(next.nodes.find(n => n.id === "e-night:usg").latestStart < "2026-10-26").toBe(true);
        expect(next.nodes.find(n => n.id === "e-night:usg")?.officialDeadline).toBe("2026-11-04");
    });
    it("uses the default buffer when customization is disabled", () => {
        const s = { ...base(), viewerId: "maya" }, p = profilePatch(s.people[1]);
        const custom = saveProfile(s, "maya", { ...p, personalBufferDays: 5 });
        const off = saveProfile(custom, "maya", { ...p, personalBufferDays: 5, personalBufferEnabled: false });
        expect(computeSchedule(off).nodes["e-night:usg"].latestStart).toBe(computeSchedule(s).nodes["e-night:usg"].latestStart);
        expect(computeSchedule(custom).nodes["e-night:usg"].latestStart).not.toBe(computeSchedule(off).nodes["e-night:usg"].latestStart);
    });
    it("rejects real contact details, invalid times and non-Monday busy weeks", () => {
        const p = profilePatch(base().people[0]);
        expect(validateProfile({ ...p, email: "real@gmail.com" })).toBeTruthy();
        expect(validateProfile({ ...p, phone: "480-123-4567" })).toBeTruthy();
        expect(validateProfile({ ...p, phone: "+1 480-555-0100" })).toBeNull();
        expect(validateProfile({ ...p, busyWeeks: ["2026-10-22"] })).toBeTruthy();
        expect(validateProfile({ ...p, freeSlots: [{ day: 1, from: "20:00", to: "18:00" }] })).toBeTruthy();
        expect(validateProfile({ ...p, availabilityOverrides: { "2026-10-22:20": "no" } })).toBeTruthy();
    });
});
describe("first workflow approval", () => {
    const event = parseCommand("Plan Founder Dinner on Nov 19, 30 people, outside caterer, USG funding", base())[0];
    it("builds the rule-based workflow, discards AI dates and resets the local workspace only on completion", () => {
        const s = base(), d = clubDraft(s);
        d.name = "Fictional Test Club";
        d.roles[1].displayName = "VP of Finance";
        const before = JSON.stringify(s);
        const next = completeSetup(s, d, { ...event, date: "2099-01-01", clubDeadline: "2098-01-01" }, "2026-11-19", code);
        expect(JSON.stringify(s)).toBe(before);
        expect(next.events).toHaveLength(1);
        expect(next.events[0].date).toBe("2026-11-19");
        expect(next.nodes.some(n => n.stepKey === "purchaseRequest" && n.officialDeadline === "2026-11-04")).toBe(true);
        expect(next.nodes.filter(n => n.fn === "finance").every(n => n.ownerId === "maya")).toBe(true);
        expect(next.org.inviteCode).toBe(code);
        expect(next.org.goals.every(g => g.current === 0)).toBe(true);
        for (const key of ["nudges", "contributions", "contacts", "funding", "notifications", "extensionRequests", "officerGrants", "protocolLog"])
            expect(next[key]).toHaveLength(0);
    });
    it("ignores invalid dates, non-event operations and unprivileged setup", () => {
        const s = base(), d = clubDraft(s);
        expect(completeSetup(s, d, event, "2026-02-30", code)).toBe(s);
        expect(completeSetup(s, d, event, "2026-10-21", code)).toBe(s);
        expect(completeSetup(s, d, { op: "propose_nudge", nodeId: s.nodes[0].id }, "2026-11-19", code)).toBe(s);
        const cadre = { ...s, viewerId: "maya" };
        expect(completeSetup(cadre, d, event, "2026-11-19", code)).toBe(cadre);
    });
});
