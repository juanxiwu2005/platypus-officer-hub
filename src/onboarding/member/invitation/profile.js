import { profilePatch, validateProfile } from "../../../data/settings";
import { onboardingCopy } from "../../copy";
/**
 * The profile the previewed officer would have with the choices so far, checked by the same rules as Settings (validateProfile).
 * Used only to check what the visitor typed: nothing here is saved to the club. ASU ID is never asked, so it is always blank.
 */
export function previewPatch(person, stored, over = {}) {
    const base = profilePatch(person);
    return {
        ...base,
        name: stored?.name ?? person.name, email: stored?.email ?? person.email, phone: stored?.phone ?? person.phone ?? "",
        channels: [stored?.channel ?? person.channels[0] ?? "email"], remindAt: stored?.remindAt ?? person.remindAt, asuId: "",
        ...over,
    };
}
/** The first thing wrong with the profile, in words the visitor can act on, or null. */
export function previewProblem(people, person, patch) {
    return validateProfile(patch) ?? (people.some(p => p.id !== person.id && p.name.toLowerCase() === patch.name.trim().toLowerCase()) ? onboardingCopy.member.you.duplicate : null);
}
