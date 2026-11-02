import { MEMBER_KEY } from "../invitation/choice"

/**
 * What the member preview remembers on screens 3 and 4 (busy weeks, the three About answers). Same idea as the OB-07 choice: this tab only,
 * gone when the tab closes, read once by the Done screen, which saves it and clears both keys.
 * personId says which officer the values were entered for; values for another officer are ignored.
 */
export const EXTRA_KEY = "platypus.v1.onboarding.member.extra"
export const MAX_BUSY_WEEKS = 20
export const MAX_NOTE = 500
export interface MemberExtra { v: 1; personId: string; busyWeeks?: string[]; careerGoal?: string; interests?: string; expectations?: string }
export type ExtraPatch = Partial<Omit<MemberExtra, "v" | "personId">>

const NOTES = ["careerGoal", "interests", "expectations"] as const
const DAY = /^\d{4}-\d{2}-\d{2}$/

export function parseExtra(raw: string | null): MemberExtra | null {
  if (!raw) return null
  let data: unknown
  try { data = JSON.parse(raw) } catch { return null }
  if (!data || typeof data !== "object") return null
  const o = data as Record<string, unknown>
  if (o.v !== 1 || typeof o.personId !== "string" || !o.personId || o.personId.length > 80) return null
  const out: MemberExtra = { v: 1, personId: o.personId }
  if (Array.isArray(o.busyWeeks)) out.busyWeeks = [...new Set(o.busyWeeks.filter((d): d is string => typeof d === "string" && DAY.test(d)))].slice(0, MAX_BUSY_WEEKS)
  for (const key of NOTES) { const v = o[key]; if (typeof v === "string" && v.length <= MAX_NOTE) out[key] = v }
  return out
}
/** The stored values for this officer, or null. */
export function readExtra(personId: string): MemberExtra | null {
  try { const extra = parseExtra(sessionStorage.getItem(EXTRA_KEY)); return extra && extra.personId === personId ? extra : null } catch { return null }
}
/** Apply a change for this officer; a key set to undefined is removed. */
export function writeExtra(personId: string, patch: ExtraPatch): void {
  try {
    const next: Record<string, unknown> = { ...(readExtra(personId) ?? { v: 1, personId }), ...patch }
    for (const key of Object.keys(next)) if (next[key] === undefined) delete next[key]
    sessionStorage.setItem(EXTRA_KEY, JSON.stringify(next))
  } catch { /* storage blocked: the preview still works, it just forgets between screens */ }
}
/** Remove everything the member preview staged (both keys). Called after the Done screen has saved it. */
export function clearStaged(): void {
  try { sessionStorage.removeItem(EXTRA_KEY); sessionStorage.removeItem(MEMBER_KEY) } catch { /* nothing to clear */ }
}
