import type { DemoState, FreeSlot, Node, Person } from "../data/types"
import { addDays, fromISO } from "../lib/dates"
import { minutes } from "../data/settings"
import { validDate } from "../lib/commands"
import { personalWorkDay } from "./calendar"

/** Relative effort is deliberately based on the step's own estimate first; the tier only calibrates that estimate. */
export const tierWeight = (n: Node) => ({ light: 1, medium: 1.35, heavy: 1.75 }[n.tier])
const effort = (n: Node) => Math.max(.25, n.estDays || 1) * tierWeight(n)
const directFollowers = (s: DemoState, n: Node) => s.nodes.filter(x => x.dependsOn.includes(n.id))
const impact = (s: DemoState, n: Node) => {
  const followers = directFollowers(s, n)
  return 1 + Math.min(.45, followers.length * .12) + (n.ruleIds.length ? .25 : 0)
}
const urgency = (s: DemoState, n: Node) => {
  if (n.latestStart && n.latestStart <= s.today) return 1.6
  if (n.latestStart && n.latestStart <= addDays(s.today, 3)) return 1.35
  if (n.clubDeadline && n.clubDeadline <= addDays(s.today, 7)) return 1.16
  return 1
}

export function workload(s: DemoState, personId: string) {
  const through = addDays(s.today, 13)
  const nodes = s.nodes.filter(n => n.ownerId === personId && n.status !== "done" && ((n.latestStart !== null && n.latestStart <= through) || (n.clubDeadline !== null && n.clubDeadline <= through)))
  const person = s.people.find(p => p.id === personId)
  const busySoon = !!person?.busyWeeks.some(w => w <= through && addDays(w, 6) >= s.today)
  const load = nodes.reduce((sum, n) => sum + effort(n) * impact(s, n) * urgency(s, n), 0) * (busySoon ? 1.2 : 1)
  // These are signals, not a quota. We never show the internal score or an amount of "remaining capacity".
  const band = load < 4.5 ? "Room to help" : load < 20 ? "Focused" : "Needs support"
  return { nodes, load, band, through, busySoon }
}
export function contributionBoard(s: DemoState) {
  const rows = s.people.map(person => {
    const entries = s.contributions.filter((c, i, all) => c.personId === person.id && all.findIndex(x => x.nodeId === c.nodeId && x.personId === c.personId) === i && s.nodes.find(n => n.id === c.nodeId)?.status === "done" && (c.completedOn ?? s.nodes.find(n => n.id === c.nodeId)?.lastUpdate ?? s.today) <= s.today)
    const completedNodes = entries.map(c => s.nodes.find(n => n.id === c.nodeId)!).filter(Boolean)
    const delivery = completedNodes.reduce((sum, n) => sum + effort(n) * impact(s, n), 0)
    const timely = entries.length ? entries.filter(c => c.onTime).length / entries.length : 0
    // Impact leads the ordering; reliability only settles otherwise similar delivery.
    const score = Math.round(delivery * (.9 + timely * .1) * 100)
    return {
      person, entries, delivery, timely, score,
      reliabilityLabel: !entries.length ? "New" : timely >= .9 ? "Excellent" : timely >= .6 ? "Good" : "Watch",
      reliabilityTone: !entries.length ? "new" : timely >= .9 ? "excellent" : timely >= .6 ? "good" : "watch",
    }
  }).sort((a, b) => b.score - a.score || a.person.name.localeCompare(b.person.name))
  const maxDelivery = Math.max(1, ...rows.map(r => r.delivery))
  return rows.map((r, i) => ({ ...r, rank: rows.findIndex(x => x.score === r.score) + 1, index: i, impactLevel: r.delivery ? Math.max(1, Math.ceil(r.delivery / maxDelivery * 4)) : 0 }))
}

export function mondayOf(date: string): string {
  const day = fromISO(date).getDay()
  return addDays(date, -(day === 0 ? 6 : day - 1))
}
/** Calendar-week start for the availability grid: Sunday is always the first column. */
export function sundayOf(date: string): string {
  return addDays(date, -fromISO(date).getDay())
}
export const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
/** True when one officer's entered free times for this weekday cover the whole of [from, to) minutes. */
function covers(p: Person, day: number, from: number, to: number) {
  const intervals = p.freeSlots.filter(f => f.day === day).map(f => [minutes(f.from), minutes(f.to)]).sort((a, b) => a[0] - b[0])
  let end = from
  for (const [a, b] of intervals) { if (a > end) break; if (b > end) end = b; if (end >= to) return true }
  return false
}
export function commonMeetingSlots(s: DemoState, ids: string[], date: string, duration: number): { slots: { from: string; to: string }[]; reason: string | null } {
  if (!validDate(date) || date < s.today || ![15, 30, 60, 90].includes(duration) || !ids.length || new Set(ids).size !== ids.length || ids.some(id => !s.people.some(p => p.id === id))) return { slots: [], reason: "Choose a current/future date, a duration, and at least one officer." }
  const people = ids.map(id => s.people.find(p => p.id === id)!)
  const unavailable = people.filter(p => !personalWorkDay(p.busyWeeks)(date))
  if (unavailable.length) return { slots: [], reason: "No club meeting on this date: a busy week, ASU closure, finals or semester break applies. Specific private busy dates stay in each officer's settings." }
  const missing = people.filter(p => !Array.from({ length: GRID_ROWS }, (_, k) => availableAt(p, date, GRID_FROM + k * GRID_STEP)).some(Boolean))
  if (missing.length) return { slots: [], reason: `${missing.map(p => p.name).join(", ")} has not shared a free slot for this weekday.` }
  const slots = []
  for (let start = 8 * 60; start + duration <= 22 * 60 && slots.length < 3; start += 15) {
    if (people.every(p => availableFor(p, date, start, start + duration))) { slots.push({ from: hhmm(start), to: hhmm(start + duration) }); start += duration - 15 }
  }
  return { slots, reason: slots.length ? null : "No shared time in the availability entered for this date. Try another date or fewer attendees." }
}
export function calendarDraftUrl(date: string, from: string, to: string): string {
  const stamp = (time: string) => date.replaceAll("-", "") + "T" + time.replace(":", "") + "00"
  const params = new URLSearchParams({ action: "TEMPLATE", text: "Fictional club planning meeting", dates: `${stamp(from)}/${stamp(to)}`, ctz: "America/Phoenix", details: "Draft from self-reported availability in the Platypus local demo. Check before saving; no invitations have been sent." })
  return `https://calendar.google.com/calendar/render?${params}`
}

/** Meeting finder grid (When2meet style): half-hour cells from 8:00 to 22:00. */
export const GRID_FROM = 8 * 60, GRID_TO = 22 * 60, GRID_STEP = 30
export const GRID_ROWS = (GRID_TO - GRID_FROM) / GRID_STEP
export const availabilityKey = (date: string, from: number) => `${date}:${Math.floor((from - GRID_FROM) / GRID_STEP)}`
/** The latest template that was already effective on the requested date. */
export const weeklySlotsOn = (p: Person, date: string) => {
  const versions = p.weeklyAvailabilityHistory?.filter(v => v.startsOn <= date).sort((a, b) => a.startsOn.localeCompare(b.startsOn))
  return versions?.at(-1)?.freeSlots ?? p.freeSlots
}
/** Recurring availability is versioned by effective date; an explicit date override wins for that half-hour. */
export const availableAt = (p: Person, date: string, from: number) => p.availabilityOverrides?.[availabilityKey(date, from)] ?? covers({ freeSlots: weeklySlotsOn(p, date) } as Person, fromISO(date).getDay(), from, from + GRID_STEP)
export const availableFor = (p: Person, date: string, from: number, to: number) => {
  for (let at = from; at < to; at += GRID_STEP) if (!availableAt(p, date, at)) return false
  return true
}

/** Who has explicitly shared availability for the whole of [from, to) on a real date.
 * This powers the Group grid, so weekends must reflect an officer's own selected time too.
 * Meeting suggestions apply their separate calendar safeguards in commonMeetingSlots(). */
export function whoIsFree(s: DemoState, ids: string[], date: string, from: number, to: number) {
  const people = ids.map(id => s.people.find(p => p.id === id)).filter((p): p is Person => !!p)
  const free = people.filter(p => availableFor(p, date, from, to))
  return { free, busy: people.filter(p => !free.includes(p)) }
}

/** Right-hand group grid: for each date and half hour, how many of the chosen officers are free. */
export function availabilityGrid(s: DemoState, ids: string[], start: string, days = 7) {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(start, i)
    return { date, slots: Array.from({ length: GRID_ROWS }, (_, k) => {
      const from = GRID_FROM + k * GRID_STEP
      return { from, free: whoIsFree(s, ids, date, from, from + GRID_STEP).free.length }
    }) }
  })
}

/** Left-hand personal grid: weekly free times as a set of "weekday:row" cells. */
export const cellKey = (day: number, k: number) => `${day}:${k}`
export function slotsToCells(slots: FreeSlot[]): Set<string> {
  const cells = new Set<string>()
  for (let day = 0; day < 7; day++) for (let k = 0; k < GRID_ROWS; k++) {
    const from = GRID_FROM + k * GRID_STEP
    if (covers({ freeSlots: slots } as Person, day, from, from + GRID_STEP)) cells.add(cellKey(day, k))
  }
  return cells
}
/** Cells back to merged free slots. Times outside the grid (before 8:00, after 22:00) are kept as they were. */
export function cellsToSlots(cells: Set<string>, old: FreeSlot[]): FreeSlot[] {
  const out: FreeSlot[] = []
  for (let day = 0; day < 7; day++) {
    let run: number | null = null
    for (let k = 0; k <= GRID_ROWS; k++) {
      const on = k < GRID_ROWS && cells.has(cellKey(day, k))
      if (on && run === null) run = k
      if (!on && run !== null) { out.push({ day, from: hhmm(GRID_FROM + run * GRID_STEP), to: hhmm(GRID_FROM + k * GRID_STEP) }); run = null }
    }
  }
  for (const f of old) {
    if (minutes(f.from) < GRID_FROM) out.push({ day: f.day, from: f.from, to: hhmm(Math.min(minutes(f.to), GRID_FROM)) })
    if (minutes(f.to) > GRID_TO) out.push({ day: f.day, from: hhmm(Math.max(minutes(f.from), GRID_TO)), to: f.to })
  }
  return out.sort((a, b) => a.day - b.day || minutes(a.from) - minutes(b.from))
}
