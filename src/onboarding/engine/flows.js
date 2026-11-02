export const FOUNDER_STEPS = [
    { id: "founder.name", path: "founder/name", label: "Name", optional: false },
    { id: "founder.constitution", path: "founder/constitution", label: "Constitution", optional: true },
    { id: "founder.goals", path: "founder/goals", label: "Goals", optional: true },
    { id: "founder.team", path: "founder/team", label: "Team", optional: true },
    { id: "founder.first-event", path: "founder/first-event", label: "First event", optional: false },
    { id: "founder.confirm", path: "founder/confirm", label: "Confirm", optional: false },
    { id: "founder.invite", path: "founder/invite", label: "Invite", optional: false },
];
export const MEMBER_STEPS = [
    { id: "member.invitation", path: "member/invitation", label: "Invitation", optional: false },
    { id: "member.you", path: "member/you", label: "You", optional: false },
    { id: "member.reminders", path: "member/reminders", label: "Reminders", optional: false },
    { id: "member.busy-weeks", path: "member/busy-weeks", label: "Busy weeks", optional: true },
    { id: "member.about", path: "member/about", label: "About you", optional: true },
    { id: "member.done", path: "member/done", label: "Done", optional: false },
];
export const FLOWS = { founder: FOUNDER_STEPS, member: MEMBER_STEPS };
/** Which flow and step a /welcome sub-path belongs to, or null (welcome page, classic screens). */
export function stepAt(pathname) {
    const sub = pathname.replace(/^\/welcome\/?/, "");
    for (const flow of ["founder", "member"]) {
        const index = FLOWS[flow].findIndex(s => s.path === sub);
        if (index >= 0)
            return { flow, index };
    }
    return null;
}
