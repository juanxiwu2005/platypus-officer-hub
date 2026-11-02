import { onboardingCopy } from "../../copy";
const c = onboardingCopy.founder.invite;
/** The same link Settings shows (Settings.tsx InviteLink). */
export const inviteUrl = (code, origin, pathname) => `${origin}${pathname}#/join?invite=${encodeURIComponent(code)}`;
/** One English sentence with the club name and the link. It never carries anyone's phone number or email address. */
export const inviteMessage = (club, link) => c.message.replace("{club}", club).replace("{link}", link);
export const whatsappHref = (club, link) => `https://wa.me/?text=${encodeURIComponent(inviteMessage(club, link))}`;
export const emailHref = (club, link) => `mailto:?subject=${encodeURIComponent(c.subject.replace("{club}", club))}&body=${encodeURIComponent(inviteMessage(club, link))}`;
/** Every role except the president, in the order given. A role with no named holder is an open position and has no status. */
export function officerRows(roles, people) {
    return roles.filter(r => r.fn !== "president").map(r => {
        const p = people.find(x => x.id === r.holderId);
        if (!p || !p.name.trim())
            return { id: r.id, role: r.displayName, name: "", status: "open" };
        return { id: r.id, role: r.displayName, name: p.name, status: p.setupCompletedOn ? "joined" : "invited" };
    });
}
