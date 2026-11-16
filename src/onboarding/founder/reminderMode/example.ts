import type { ClubDraft } from "../../../data/settings"
import type { DemoState } from "../../../data/types"
import { fmtShort } from "../../../lib/dates"
import { dueOf } from "../../../lib/taskDue"
import { onboardingCopy } from "../../copy"

const c = onboardingCopy.founder.reminders
const first = (name: string) => name.trim().split(/\s+/)[0]

export interface ExampleReminder { name: string; step: string | null; event: string | null; due: string | null; text: string }

/**
 * FB-3 (docs/feedback-fix/PLAN.md 5.3): the example reminder on the Reminders screen, made from the president's own draft.
 * Recipient: the first officer in the draft's roles who has a name and is not the president (else "your officer"). Step, event and date: that
 * officer's first open step in the plan (`preview`, the rule engine's plan of the first event), or any officer's when they have none; the date is
 * the engine's Due. With no planned event (First event skipped) it is a general sentence without a date. Nothing is ever sent.
 */
export function exampleReminder(club: ClubDraft, preview: DemoState | null): ExampleReminder {
  const named = club.roles.flatMap(r => {
    if (r.fn === "president" || !r.holderId) return []
    const p = club.people.find(x => x.id === r.holderId)
    return p && p.name.trim() ? [p] : []
  })
  const officer = named[0] ?? null
  const open = (preview?.nodes ?? [])
    .map((n, i) => ({ n, i, due: dueOf(n) }))
    .filter(x => x.n.status !== "done" && !!x.due)
    .sort((a, b) => a.due!.localeCompare(b.due!) || a.i - b.i)
  const mine = officer ? open.find(x => x.n.ownerId === officer.id) : undefined
  const theirs = mine ?? open.find(x => named.some(p => p.id === x.n.ownerId))
  const pick = theirs ?? open[0]
  // The reminder goes to the step's owner: when the first officer has no open step, it is the officer whose step is shown.
  const to = (theirs && named.find(p => p.id === theirs.n.ownerId)) ?? officer
  const name = to ? first(to.name) : c.yourOfficer
  if (!pick) return { name, step: null, event: null, due: null, text: c.exampleGeneric.replace("{name}", name) }
  const event = preview!.events.find(e => e.id === pick.n.eventId)?.name ?? ""
  const text = c.exampleDated.replace("{name}", name).replace("{step}", pick.n.title).replace("{event}", event).replace("{date}", fmtShort(pick.due!))
  return { name, step: pick.n.title, event, due: pick.due, text }
}
