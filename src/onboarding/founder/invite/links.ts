import { onboardingCopy } from "../../copy"

const c = onboardingCopy.founder.invite

/** The same link Settings shows (Settings.tsx InviteLink). */
export const inviteUrl = (code: string, origin: string, pathname: string) => `${origin}${pathname}#/join?invite=${encodeURIComponent(code)}`

/** One English sentence with the club name and the link. It never carries anyone's phone number or email address. */
export const inviteMessage = (club: string, link: string) => c.message.replace("{club}", club).replace("{link}", link)

export const whatsappHref = (club: string, link: string) => `https://wa.me/?text=${encodeURIComponent(inviteMessage(club, link))}`
export const emailHref = (club: string, link: string) => `mailto:?subject=${encodeURIComponent(c.subject.replace("{club}", club))}&body=${encodeURIComponent(inviteMessage(club, link))}`

export interface OfficerRow { id: string; role: string; name: string; status: "invited" | "joined" | "open" }
/** Every role except the president, in the order given. A role with no named holder is an open position and has no status. */
export function officerRows(roles: { id: string; fn: string; displayName: string; holderId: string | null }[], people: { id: string; name: string; setupCompletedOn?: string | null }[]): OfficerRow[] {
  return roles.filter(r => r.fn !== "president").map(r => {
    const p = people.find(x => x.id === r.holderId)
    if (!p || !p.name.trim()) return { id: r.id, role: r.displayName, name: "", status: "open" as const }
    return { id: r.id, role: r.displayName, name: p.name, status: p.setupCompletedOn ? "joined" as const : "invited" as const }
  })
}
