import type { DemoState, Node, Tier } from "../data/types"
import { computeSchedule, forecastClock, personalBuffer, topoOrder } from "./schedule"

export const FORECAST_RUNS = 1000
export const EFFORT: Record<Tier, [number, number]> = { light: [1, 2], medium: [3, 5], heavy: [5, 10] }
export const FORECAST_ASSUMPTIONS = [
  "1,000 seeded runs; independent uniform draws. Light 1–2, medium 3–5, heavy 5–10 student working days (1–2 work weeks).",
  "Unfinished work starts now after all dependencies; close-out starts after the event. Busy weeks, finals and semester breaks are skipped for student work.",
  "School submission lead times are R06/R07/R09/R10, not measured approval durations. When approval is still pending, the model uses those lead times plus 2–4 working days as a conservative planning assumption.",
  "USG cold start: allow at least 6–8 calendar weeks from a new funding request. Source: owner planning experience F3, PRODUCT_PLAN §9; not official turnaround data. No cross-club approval observations are claimed.",
  "Only scheduling uses personal buffer; no rankings or performance evaluation. Percentages describe assumptions, not a guarantee. Missing owners or dependency loops are treated as unresolved.",
]
export type ForecastColor = "green" | "yellow" | "red"
export const forecastColor = (p: number): ForecastColor => p >= .8 ? "green" : p >= .5 ? "yellow" : "red"
export interface ForecastResult { nodeId: string; probability: number; color: ForecastColor; reasons: string[]; runs: number }
export interface Forecast { nodes: Record<string, ForecastResult>; events: Record<string, ForecastResult> }
function random(seed: number) {
  let x = seed >>> 0
  return () => { x += 0x6D2B79F5; let t = x; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296 }
}
/** Pure, stable ordering and seed; never mutates state, dates, contributions or profiles. */
export function computeForecast(state: DemoState, seed = 20261022): Forecast {
  const schedule = computeSchedule(state)
  const { order, looped } = topoOrder([...state.nodes].sort((a,b) => a.id.localeCompare(b.id)))
  const invalid = new Set([...looped.map(n => n.id), ...state.nodes.filter(n=>n.dependsOn.includes(n.id)).map(n=>n.id)])
  const byId = new Map(state.nodes.map(n => [n.id,n]))
  const hit: Record<string, number> = Object.fromEntries(order.map(n => [n.id,0]))
  const rng = random(seed)
  const draw = (lo: number, hi: number) => lo + Math.floor(rng() * (hi-lo+1))
  const clock = forecastClock(state)
  const max = (...values: string[]) => values.sort().at(-1)!
  for (let run=0; run<FORECAST_RUNS; run++) {
    const finish: Record<string,string> = {}, available: Record<string,string> = {}
    for (const n of order) {
      const plan = schedule.nodes[n.id]
      if (!plan) continue
      if (n.status === "done") { finish[n.id] = n.completedOn ?? n.lastUpdate ?? state.today; available[n.id] = finish[n.id]; hit[n.id] += finish[n.id] <= plan.club ? 1 : 0; continue }
      if (!n.ownerId || invalid.has(n.id) || n.dependsOn.some(id => !byId.has(id) || available[id] === "9999-12-31")) { finish[n.id] = available[n.id] = "9999-12-31"; continue }
      const person = state.people.find(p => p.id === n.ownerId)
      const buffer = personalBuffer(state, person).days
      const event = state.events.find(e => e.id === n.eventId)
      const start = max(state.today, ...(n.phase === "close" && event ? [event.date] : []), ...n.dependsOn.map(id => available[id] ?? "9999-12-31"))
      const [lo,hi] = EFFORT[n.tier]
      const delay = n.status === "blocked" ? 3 : n.status === "waiting" ? draw(1,3) : 0
      finish[n.id] = clock(n,start,draw(lo,hi)+buffer+delay)
      hit[n.id] += finish[n.id] <= plan.club ? 1 : 0
      available[n.id] = finish[n.id]
      // Submission probability is measured BEFORE the approval wait. Downstream sees the wait.
      if (["usg","usgspeaker"].includes(n.stepKey ?? "")) {
        const funding = state.funding.find(f => f.eventId === n.eventId)
        if (!funding || funding.stage === "budget_request") available[n.id] = clock(n,finish[n.id],0,draw(42,56))
      } else if (n.status === "waiting" && ["foodex","permit"].includes(n.stepKey ?? "")) {
        const lead = n.stepKey === "permit" ? 7 : 10
        available[n.id] = clock({ ...n, ownerId: null }, finish[n.id], lead+draw(2,4))
      }
    }
  }
  const nodes: Forecast["nodes"] = {}
  for (const n of order) {
    const probability = hit[n.id]/FORECAST_RUNS
    const reasons: string[] = []
    if (!n.ownerId) reasons.push("No officer has taken ownership yet.")
    if (invalid.has(n.id)) reasons.push("A dependency loop needs to be resolved.")
    if (n.dependsOn.some(id => !byId.has(id))) reasons.push("A dependency is missing.")
    if (schedule.nodes[n.id]?.club < state.today && n.status !== "done") reasons.push("The club deadline has already passed.")
    const pending = n.dependsOn.map(id=>byId.get(id)).filter((x): x is Node => !!x && x.status !== "done")
    if (pending.length) reasons.push(`Waiting for upstream: ${pending[0].title}.`)
    if (n.status === "waiting") reasons.push(`Waiting on ${n.waitingOn || "an external reply"}.`)
    if (n.status === "blocked") reasons.push("The owner has asked for help.")
    if (probability < .8) reasons.push("The remaining work and dependencies leave little time before the club deadline.")
    if (!reasons.length) reasons.push("The remaining steps fit within the current planning window.")
    nodes[n.id] = { nodeId:n.id, probability, color:forecastColor(probability), reasons:reasons.slice(0,2), runs:FORECAST_RUNS }
  }
  const events: Forecast["events"] = {}
  for (const e of state.events) {
    const critical = state.nodes.filter(n=>n.eventId===e.id && n.phase!=="close" && n.status!=="done").map(n=>nodes[n.id]).filter(Boolean).sort((a,b)=>a.probability-b.probability || a.nodeId.localeCompare(b.nodeId))
    events[e.id] = critical[0] ?? { nodeId:"", probability:1,color:"green",reasons:["All pre-event steps are complete."],runs:FORECAST_RUNS }
  }
  return { nodes,events }
}
/**
 * The app's single forecast source: one computeForecast per state object, shared by pages, the AI
 * snapshot and the assistant. The store never mutates a state in place (every change makes a new
 * object), so the object itself is a safe cache key, and old states are garbage-collected.
 */
const cache = new WeakMap<DemoState, Forecast>()
export function forecastFor(state: DemoState): Forecast {
  let f = cache.get(state)
  if (!f) { f = computeForecast(state); cache.set(state, f) }
  return f
}
export function forecastQueue(state: DemoState, forecast: Forecast) {
  return state.nodes.filter(n=>n.status!=="done" && forecast.nodes[n.id]?.probability < .8)
    .sort((a,b)=>forecast.nodes[a.id].probability-forecast.nodes[b.id].probability || Number(!["waiting","blocked"].includes(a.status))-Number(!["waiting","blocked"].includes(b.status)) || (a.clubDeadline??"9999").localeCompare(b.clubDeadline??"9999") || a.id.localeCompare(b.id)).slice(0,3)
}
