import { profilePatch, validateProfile, type ProfilePatch } from "../../../data/settings"
import type { Person } from "../../../data/types"
import { onboardingCopy } from "../../copy"
import type { MemberChoice } from "./choice"

/**
 * The profile the previewed officer would have with the choices so far, checked by the same rules as Settings (validateProfile).
 * Used only to check what the visitor typed: nothing here is saved to the club. ASU ID is never asked, so it is always blank.
 */
export function previewPatch(person: Person, stored: MemberChoice | null, over: Partial<ProfilePatch> = {}): ProfilePatch {
  const base = profilePatch(person)
  return {
    ...base,
    name: stored?.name ?? person.name, email: stored?.email ?? person.email, phone: stored?.phone ?? person.phone ?? "",
    channels: [stored?.channel ?? person.channels[0] ?? "email"], remindAt: stored?.remindAt ?? person.remindAt, asuId: "",
    ...over,
  }
}
/** The first thing wrong with the profile, in words the visitor can act on, or null. */
export function previewProblem(people: Person[], person: Person, patch: ProfilePatch): string | null {
  return validateProfile(patch) ?? (people.some(p => p.id !== person.id && p.name.toLowerCase() === patch.name.trim().toLowerCase()) ? onboardingCopy.member.you.duplicate : null)
}
