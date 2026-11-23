/** The two walkthrough flows, in order. A step's `path` is its route under /welcome; `optional` steps can be skipped. */
export interface FlowStep { id: string; path: string; label: string; optional: boolean }
export type FlowName = "founder" | "member"

// ob-6 (S6, 2026-11-23): three founder screens. Screen 1 holds the club name and the first event (its Skip for now skips the event only; the
// name is still required), Team finishes setup (Confirm is gone) and opens the constitution reading inline, and Goals is gone. The member
// preview has four screens: Invitation now asks for the name and email (You is gone) and About you is gone. Old addresses redirect (src/App.tsx).
export const FOUNDER_STEPS: FlowStep[] = [
  { id: "founder.name", path: "founder/name", label: "Name and first event", optional: true },
  { id: "founder.team", path: "founder/team", label: "Team", optional: false },
  { id: "founder.invite", path: "founder/invite", label: "Invite", optional: false },
]
export const MEMBER_STEPS: FlowStep[] = [
  { id: "member.invitation", path: "member/invitation", label: "Invitation", optional: false },
  { id: "member.reminders", path: "member/reminders", label: "Reminders", optional: false },
  { id: "member.busy-weeks", path: "member/busy-weeks", label: "Busy weeks", optional: true },
  { id: "member.done", path: "member/done", label: "Done", optional: false },
]
export const FLOWS: Record<FlowName, FlowStep[]> = { founder: FOUNDER_STEPS, member: MEMBER_STEPS }

/** Which flow and step a /welcome sub-path belongs to, or null (welcome page, entry bridges or an old address that redirects). */
export function stepAt(pathname: string): { flow: FlowName; index: number } | null {
  const sub = pathname.replace(/^\/welcome\/?/, "")
  for (const flow of ["founder", "member"] as const) {
    const index = FLOWS[flow].findIndex(s => s.path === sub)
    if (index >= 0) return { flow, index }
  }
  return null
}
