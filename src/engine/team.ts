import type { DemoState, Node, Person } from "../data/types"
import { addDays, fromISO } from "../lib/dates"
import { minutes } from "../data/settings"
import { validDate } from "../lib/commands"
import { personalWorkDay } from "./calendar"

export const tierWeight = (n: Node) => ({ light: 1, medium: 2, heavy: 3 }[n.tier])
export function workload(s: DemoState, personId: string) {
  const through = addDays(s.today, 13)
  const nodes = s.nodes.filter(n => n.ownerId === personId && n.status !== "done" && ((n.latestStart !== null && n.latestStart <= through) || (n.clubDeadline !== null && n.clubDeadline <= through)))
  const points = nodes.reduce((sum, n) => sum + tierWeight(n), 0)
  return { nodes, points, band: points <= 3 ? "Light" : points <= 7 ? "Balanced" : "Heavy", through }
}
export function contributionBoard(s: DemoState) {
  const rows = s.people.map(person => {
    const entries = s.contributions.filter((c, i, all) => c.personId === person.id && all.findIndex(x => x.nodeId === c.nodeId && x.personId === c.personId) === i && s.nodes.find(n => n.id === c.nodeId)?.status === "done" && (c.completedOn ?? s.nodes.find(n => n.id === c.nodeId)?.lastUpdate ?? s.today) <= s.today)
    return { person, points: entries.reduce((sum, c) => sum + c.points, 0), completed: entries.length, onTime: entries.filter(c => c.onTime).length, entries }
  }).sort((a, b) => b.points - a.points || a.person.name.localeCompare(b.person.name))
  return rows.map((r, i) => ({ ...r, rank: rows.findIndex(x => x.points === r.points) + 1, index: i }))
}

export function mondayOf(date: string): string {
  const day = fromISO(date).getDay()
  return addDays(date, -(day === 0 ? 6 : day - 1))
}
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
export function commonMeetingSlots(s: DemoState, ids: string[], date: string, duration: number): { slots: { from: string; to: string }[]; reason: string | null } {
  if (!validDate(date) || date < s.today || ![15, 30, 60, 90].includes(duration) || !ids.length || new Set(ids).size !== ids.length || ids.some(id => !s.people.some(p => p.id === id))) return { slots: [], reason: "Choose a current/future date, a duration, and at least one officer." }
  const people = ids.map(id => s.people.find(p => p.id === id)!)
  const day = fromISO(date).getDay()
  const unavailable = people.filter(p => !personalWorkDay(p.busyWeeks)(date))
  if (unavailable.length) return { slots: [], reason: "No club meeting on this date: a busy week, ASU closure, finals or semester break applies. Specific private busy dates stay in each officer's settings." }
  const missing = people.filter(p => !p.freeSlots.some(f => f.day === day))
  if (missing.length) return { slots: [], reason: `${missing.map(p => p.name).join(", ")} has not shared a free slot for this weekday.` }
  const covers = (p: Person, from: number, to: number) => {
    const intervals = p.freeSlots.filter(f => f.day === day).map(f => [minutes(f.from), minutes(f.to)]).sort((a, b) => a[0] - b[0])
    let end = from
    for (const [a, b] of intervals) { if (a > end) break; if (b > end) end = b; if (end >= to) return true }
    return false
  }
  const slots = []
  for (let start = 8 * 60; start + duration <= 22 * 60 && slots.length < 3; start += 15) {
    if (people.every(p => covers(p, start, start + duration))) { slots.push({ from: hhmm(start), to: hhmm(start + duration) }); start += duration - 15 }
  }
  return { slots, reason: slots.length ? null : "No shared time in the availability entered for this date. Try another date or fewer attendees." }
}
export function calendarDraftUrl(date: string, from: string, to: string): string {
  const stamp = (time: string) => date.replaceAll("-", "") + "T" + time.replace(":", "") + "00"
  const params = new URLSearchParams({ action: "TEMPLATE", text: "Fictional club planning meeting", dates: `${stamp(from)}/${stamp(to)}`, ctz: "America/Phoenix", details: "Draft from self-reported availability in the Platypus local demo. Check before saving; no invitations have been sent." })
  return `https://calendar.google.com/calendar/render?${params}`
}

/** Week heat map for the meeting finder (v1.1): how many chosen officers are free in each hour. */
export function availabilityGrid(s: DemoState, ids: string[], start: string, days = 7, fromHour = 8, toHour = 22) {
  const people = ids.map(id => s.people.find(p => p.id === id)).filter((p): p is Person => !!p)
  const dates = Array.from({ length: days }, (_, i) => addDays(start, i))
  return dates.map(date => {
    const day = fromISO(date).getDay()
    return { date, hours: Array.from({ length: toHour - fromHour }, (_, k) => {
      const h = fromHour + k
      const free = people.filter(p => personalWorkDay(p.busyWeeks)(date) && p.freeSlots.some(f => f.day === day && Math.min(minutes(f.to), (h + 1) * 60) - Math.max(minutes(f.from), h * 60) >= 30))
      return { hour: h, free: free.length }
    }) }
  })
}
