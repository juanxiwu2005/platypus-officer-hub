import { onboardingCopy } from "../../copy"

/** The mission is required and at most 300 characters: the same rule validateClub (src/data/settings.ts) applies when the club is created. */
export const MAX_MISSION = 300

/** What stops Continue on the Name screen because of the mission, or null. (It used to be checked on the Goals screen, removed in FB-2.) */
export function missionError(mission: string): string | null {
  if (!mission.trim()) return onboardingCopy.founder.name.missionRequired
  if (mission.length > MAX_MISSION) return onboardingCopy.founder.name.missionLong
  return null
}
