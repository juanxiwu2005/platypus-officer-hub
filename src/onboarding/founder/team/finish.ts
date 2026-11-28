import { validateClub, type ClubDraft, type FirstEvent } from "../../../data/settings"
import { fillEmails } from "../../../data/structure"
import { validDate } from "../../../lib/commands"
import { onboardingCopy } from "../../copy"
import type { OnboardingDraft } from "../../draft"

const c = onboardingCopy.founder.team
/** The screen whose Skip for now means "no first event" (screen 1 since ob-6). */
export const EVENT_STEP = "founder.name"

export type Finish = { ok: true; club: ClubDraft; event: FirstEvent | null; date: string } | { ok: false; problem: string; needsEvent: boolean }

/**
 * What Start workspace on the Team screen passes to completeSetup (it was the Confirm screen's job up to ob-5): the planned first event and its
 * date, or, after Skip for now on screen 1, no event and no date. Arriving without planning and without skipping (an address typed by hand)
 * still asks for the first event. The walkthrough no longer asks for a mission, so an empty one becomes the standard line (editable in Settings);
 * goals are never written here (a new club starts with none). Emails are made from the officers' names, as on the Team screen.
 */
export function finishSetup(d: OnboardingDraft, team: { people: ClubDraft["people"] }, today: string): Finish {
  const noEvent = !d.event && d.skipped.includes(EVENT_STEP)
  const planned = !!d.event && validDate(d.date) && d.date >= today
  if (!planned && !noEvent) return { ok: false, problem: c.missing, needsEvent: true }
  const club: ClubDraft = { ...d.club, people: fillEmails(team.people), mission: d.club.mission.trim() || c.mission, goals: [] }
  const error = validateClub(club)
  if (error) return { ok: false, problem: error, needsEvent: false }
  return { ok: true, club, event: noEvent ? null : d.event, date: noEvent ? "" : d.date }
}
