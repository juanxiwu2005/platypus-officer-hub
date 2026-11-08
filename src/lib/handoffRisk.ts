import type { DemoState } from "../data/types"
import { dossierOwner, roleDossier, roleTasks } from "./roleDossier"
import { addDays } from "./dates"

/** Handover risk for the Handoff page only (kept out of roleDossier.ts, which the store imports, to keep Today's first download small). */
const FIRST_DAYS = 30
export type RiskLevel = "high" | "medium" | "low"
export interface HandoffRisk { level: RiskLevel; score: number; reasons: string[] }
/**
 * How risky it is to hand this role over, by simple counts (no AI), so the president can look at the worst first. Points:
 * half a point per open task (at most 6, so one busy role does not drown the rest), 3 per ASU deadline in the next 30 days,
 * 2 per overdue task, 1 per waiting or blocked task, 2 when the holder has not updated anything for over two weeks, and 1 per gap in the record.
 * High from 10 points (or two ASU deadlines), medium from 6. The hover card shows the three biggest reasons.
 */
export function handoffRisk(s: DemoState, roleId: string): HandoffRisk {
  const role = s.roles.find(r => r.id === roleId)
  if (!role) return { level: "low", score: 0, reasons: [] }
  const who = dossierOwner(s, roleId)
  const open = roleTasks(s, role, who).filter(n => n.status !== "done")
  const horizon = addDays(s.today, FIRST_DAYS)
  const hard = open.filter(n => n.officialDeadline && n.officialDeadline >= s.today && n.officialDeadline <= horizon).length
  const overdue = open.filter(n => n.clubDeadline && n.clubDeadline < s.today).length
  const stuck = open.filter(n => n.status === "waiting" || n.status === "blocked").length
  const updates = open.map(n => n.lastUpdate).filter((d): d is string => !!d).sort()
  const quietDays = updates.length ? Math.round((Date.parse(s.today) - Date.parse(updates[updates.length - 1])) / 86_400_000) : 0
  const quiet = quietDays > 14
  const gaps = roleDossier(s, roleId).gaps + (s.handoffRoles.find(r => r.roleId === roleId)?.interview.length ? 0 : 1)
  const parts: [number, string][] = [
    [Math.min(open.length, 12) / 2, `${open.length} open task${open.length === 1 ? "" : "s"}`],
    ...(hard ? [[3 * hard, `${hard} ASU deadline${hard === 1 ? "" : "s"} within 30 days`] as [number, string]] : []),
    ...(overdue ? [[2 * overdue, `${overdue} overdue`] as [number, string]] : []),
    ...(stuck ? [[stuck, `${stuck} waiting or stuck`] as [number, string]] : []),
    ...(quiet ? [[2, `No update for ${quietDays} days`] as [number, string]] : []),
    ...(gaps ? [[gaps, `${gaps} gap${gaps === 1 ? "" : "s"} in the record`] as [number, string]] : []),
  ]
  const score = Math.round(parts.reduce((n, [p]) => n + p, 0) * 10) / 10
  const level: RiskLevel = hard >= 2 || score >= 10 ? "high" : score >= 6 ? "medium" : "low"
  return { level, score, reasons: [...parts].sort((a, b) => b[0] - a[0]).slice(0, 3).map(([, text]) => text) }
}
