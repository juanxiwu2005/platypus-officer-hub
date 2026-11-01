import type { DemoState, Node, Phase } from "../data/types"
import type { Forecast } from "../engine/forecast"
import type { Stop, StopState } from "../components/ui"

export const PHASE_SHORT: Record<Phase, string> = { plan: "Plan", prepare: "Prep", money: "Money", marketing: "Promo", run: "Run", close: "Wrap" }
import { phaseOrderOf } from "./stepOrder"

/** One stop per phase of an event: the "parcel tracking" view used on Today. */
export function phaseChain(s: DemoState, forecast: Forecast, eventId: string): Stop[] {
  const nodes = s.nodes.filter(n => n.eventId === eventId)
  return phaseOrderOf(s.events.find(e => e.id === eventId)).filter(p => nodes.some(n => n.phase === p)).map(p => {
    const mine = nodes.filter(n => n.phase === p)
    const done = mine.filter(n => n.status === "done").length
    const open = mine.filter(n => n.status !== "done")
    const risky = open.filter(n => forecast.nodes[n.id]?.color === "red")
    const started = open.some(n => n.status !== "unclaimed" && n.status !== "accepted") || (done > 0 && open.length > 0) || open.some(n => (n.latestStart ?? "9999") <= s.today)
    const state: StopState = !open.length ? "done" : risky.length ? "risk" : started ? "now" : "todo"
    const current = open.sort((a, b) => (a.latestStart ?? "").localeCompare(b.latestStart ?? ""))[0]
    return { key: p, label: PHASE_SHORT[p], state, hint: <><b>{PHASE_SHORT[p]}: {done} of {mine.length} done</b>{current && <span className="hc-line">Next: {current.title}</span>}{risky[0] && <span className="hc-line">At risk: {risky[0].title}</span>}</> }
  })
}

export const nodeStop = (n: Node, today: string, risk: boolean): StopState =>
  n.status === "done" ? "done" : risk ? "risk" : n.status !== "unclaimed" && n.status !== "accepted" || (n.latestStart ?? "9999") <= today ? "now" : "todo"
