/**
 * The two walkthrough flows, in order. A step's `path` is its route under /welcome; `optional` steps can be skipped.
 * ob-5 (FB-2): the founder flow is Name → Team → First event → Reminders → Confirm → Invite. The constitution is an optional section on the Team
 * screen and the mission is on the Name screen; goals are set in Settings only. The old ids "founder.constitution" and "founder.goals" no longer occur.
 */
export interface FlowStep { id: string; path: string; label: string; optional: boolean }
export type FlowName = "founder" | "member"

export const FOUNDER_STEPS: FlowStep[] = [
  { id: "founder.name", path: "founder/name", label: "Name", optional: false },
  { id: "founder.team", path: "founder/team", label: "Team", optional: true },
  { id: "founder.first-event", path: "founder/first-event", label: "First event", optional: true },
  { id: "founder.reminders", path: "founder/reminders", label: "Reminders", optional: true },
  { id: "founder.confirm", path: "founder/confirm", label: "Confirm", optional: false },
  { id: "founder.invite", path: "founder/invite", label: "Invite", optional: false },
]
export const MEMBER_STEPS: FlowStep[] = [
  { id: "member.invitation", path: "member/invitation", label: "Invitation", optional: false },
  { id: "member.you", path: "member/you", label: "You", optional: false },
  { id: "member.reminders", path: "member/reminders", label: "Reminders", optional: false },
  { id: "member.busy-weeks", path: "member/busy-weeks", label: "Busy weeks", optional: true },
  { id: "member.about", path: "member/about", label: "About you", optional: true },
  { id: "member.done", path: "member/done", label: "Done", optional: false },
]
export const FLOWS: Record<FlowName, FlowStep[]> = { founder: FOUNDER_STEPS, member: MEMBER_STEPS }

/** Which flow and step a /welcome sub-path belongs to, or null (welcome page, classic screens). */
export function stepAt(pathname: string): { flow: FlowName; index: number } | null {
  const sub = pathname.replace(/^\/welcome\/?/, "")
  for (const flow of ["founder", "member"] as const) {
    const index = FLOWS[flow].findIndex(s => s.path === sub)
    if (index >= 0) return { flow, index }
  }
  return null
}
