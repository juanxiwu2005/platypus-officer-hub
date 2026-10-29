import type { Event, Node, Phase } from "../data/types"
import type { Schedule } from "../engine/schedule"

/**
 * The step editor's rules (M3). Pure functions: they turn "move this row there" into edits to a few steps'
 * dependsOn / estDays / phase, and nothing else. No function here reads or writes a date; the rule engine
 * (src/engine) dates every step afterwards. See docs/M3_RANKING_PLAN.md.
 *
 * The stored truth is the dependency graph. The list a person sees is only one way to draw it, so a move NEVER
 * rebuilds dependencies from list order (that would chain a 28-step plan into one line and triple its length).
 * A move changes the links of the one or two steps it names, and removes only the links it makes redundant.
 */
export const PHASES: Phase[] = ["plan", "prepare", "money", "marketing", "run", "close"]
export const MAX_DAYS = 30

export interface StepPatch { dependsOn?: string[]; estDays?: number; phase?: Phase }
export interface StepEdit { id: string; patch: StepPatch }
export interface EditResult { edits: StepEdit[]; message: string; error?: string; note?: string }

const ok = (edits: StepEdit[], message: string, note?: string): EditResult => ({ edits, message, ...(note ? { note } : {}) })
const fail = (error: string): EditResult => ({ edits: [], message: error, error })
const noop = (message: string): EditResult => ({ edits: [], message })
const title = (n: Node | undefined) => `“${n?.title ?? "that step"}”`

/** The phase order for one event: its saved order if it is a full permutation, else the standard one. */
export function phaseOrderOf(ev: Pick<Event, "phaseOrder"> | undefined): Phase[] {
  const o = ev?.phaseOrder
  return Array.isArray(o) && o.length === PHASES.length && PHASES.every(p => o.includes(p)) ? o : PHASES
}

/** Every step id that `id` waits for, directly or through other steps. */
export function ancestorsOf(nodes: Node[], id: string): Set<string> {
  const byId = new Map(nodes.map(n => [n.id, n]))
  const seen = new Set<string>()
  const stack = [...(byId.get(id)?.dependsOn ?? [])]
  while (stack.length) {
    const d = stack.pop()!
    if (seen.has(d) || !byId.has(d)) continue
    seen.add(d)
    stack.push(...byId.get(d)!.dependsOn)
  }
  return seen
}

/** Every step id that waits for `id`, directly or through other steps. */
export function descendantsOf(nodes: Node[], id: string): Set<string> {
  return new Set(nodes.filter(n => n.id !== id && ancestorsOf(nodes, n.id).has(id)).map(n => n.id))
}

const uniq = (a: string[]) => [...new Set(a)]

/** Make `target` wait for `dep`. Drops only the links the new one makes redundant (steps `dep` already waits for). */
function addLink(nodes: Node[], targetId: string, depId: string): string[] {
  const target = nodes.find(n => n.id === targetId)!
  const implied = ancestorsOf(nodes, depId)
  return uniq([...target.dependsOn.filter(d => d !== depId && !implied.has(d)), depId])
}

/** Remove every link that another link already implies (same dates, fewer lines). */
export function reduceDeps(nodes: Node[], deps: string[]): string[] {
  const list = uniq(deps)
  return list.filter(d => !list.some(e => e !== d && ancestorsOf(nodes, e).has(d)))
}

/** The graph with these edits applied (a copy). */
export function applyEdits(nodes: Node[], edits: StepEdit[]): Node[] {
  const by = new Map(edits.map(e => [e.id, e.patch]))
  return nodes.map(n => (by.has(n.id) ? { ...n, ...by.get(n.id) } as Node : n))
}

/** Would the edits make some step wait for itself? Loops that were already there do not count. */
export function createsLoop(nodes: Node[], edits: StepEdit[]): string | null {
  const after = applyEdits(nodes, edits)
  for (const e of edits) {
    if (!e.patch.dependsOn) continue
    const n = after.find(x => x.id === e.id)!
    if (ancestorsOf(after, n.id).has(n.id) && !ancestorsOf(nodes, n.id).has(n.id)) return n.id
  }
  return null
}

const loopMessage = (nodes: Node[], id: string) => `That would make ${title(nodes.find(n => n.id === id))} wait for itself, so it was not changed.`

/** "R comes after U": R waits for U. */
export function doAfter(nodes: Node[], rId: string, uId: string): EditResult {
  const r = nodes.find(n => n.id === rId), u = nodes.find(n => n.id === uId)
  if (!r || !u || r.id === u.id) return fail("Pick two different steps.")
  if (descendantsOf(nodes, rId).has(uId)) return fail(`${title(u)} already waits for ${title(r)} (directly or through other steps), so it cannot come first.`)
  if (ancestorsOf(nodes, rId).has(uId)) return noop(`${title(r)} already comes after ${title(u)}.`)
  const edits = [{ id: rId, patch: { dependsOn: addLink(nodes, rId, uId) } }]
  const loop = createsLoop(nodes, edits)
  return loop ? fail(loopMessage(nodes, loop)) : ok(edits, `${title(r)} now waits for ${title(u)}.`)
}

/** "R comes before V": V waits for R. */
export function doBefore(nodes: Node[], rId: string, vId: string): EditResult {
  const r = nodes.find(n => n.id === rId), v = nodes.find(n => n.id === vId)
  if (!r || !v || r.id === v.id) return fail("Pick two different steps.")
  if (ancestorsOf(nodes, rId).has(vId)) return fail(`${title(r)} already waits for ${title(v)} (directly or through other steps), so it cannot come before it.`)
  if (descendantsOf(nodes, rId).has(vId)) return noop(`${title(v)} already comes after ${title(r)}.`)
  const edits = [{ id: vId, patch: { dependsOn: addLink(nodes, vId, rId) } }]
  const loop = createsLoop(nodes, edits)
  return loop ? fail(loopMessage(nodes, loop)) : ok(edits, `${title(v)} now waits for ${title(r)}.`)
}

/** Swap two steps that are linked directly: `waiter` waits for `waitee` becomes `waitee` waits for `waiter`. */
export function flipLink(nodes: Node[], waiterId: string, waiteeId: string): EditResult {
  const waiter = nodes.find(n => n.id === waiterId), waitee = nodes.find(n => n.id === waiteeId)
  if (!waiter || !waitee || !waiter.dependsOn.includes(waiteeId)) return fail("Those steps are not linked directly.")
  const without = nodes.map(n => (n.id === waiterId ? { ...n, dependsOn: n.dependsOn.filter(d => d !== waiteeId) } : n))
  if (ancestorsOf(without, waiterId).has(waiteeId)) return fail(`${title(waiter)} still waits for ${title(waitee)} through other steps, so they cannot swap.`)
  const edits: StepEdit[] = [
    { id: waiterId, patch: { dependsOn: waiter.dependsOn.filter(d => d !== waiteeId) } },
    { id: waiteeId, patch: { dependsOn: addLink(without, waiteeId, waiterId) } },
  ]
  const loop = createsLoop(nodes, edits)
  return loop ? fail(loopMessage(nodes, loop)) : ok(edits, `${title(waitee)} now waits for ${title(waiter)} (order swapped).`)
}

/** "Do alongside the row above": drop the direct link to U and take U's own prerequisites, so both start together. */
export function doAlongside(nodes: Node[], rId: string, uId: string): EditResult {
  const r = nodes.find(n => n.id === rId), u = nodes.find(n => n.id === uId)
  if (!r || !u || r.id === u.id) return fail("Pick two different steps.")
  if (!r.dependsOn.includes(uId)) {
    return ancestorsOf(nodes, rId).has(uId)
      ? fail(`${title(r)} waits for ${title(u)} through other steps. Remove that link on those steps first.`)
      : noop(`${title(r)} and ${title(u)} are not linked, so they already run side by side.`)
  }
  const edits = [{ id: rId, patch: { dependsOn: reduceDeps(nodes, [...r.dependsOn.filter(d => d !== uId), ...u.dependsOn]) } }]
  const loop = createsLoop(nodes, edits)
  return loop ? fail(loopMessage(nodes, loop)) : ok(edits, `${title(r)} now runs alongside ${title(u)}.`)
}

/** The ▼ button: this row comes after the row below it (or swaps with it if they are linked). */
export function stepDown(nodes: Node[], rId: string, nextId: string): EditResult {
  const next = nodes.find(n => n.id === nextId)
  if (next?.dependsOn.includes(rId)) return flipLink(nodes, nextId, rId)
  return doAfter(nodes, rId, nextId)
}

/** The ▲ button: this row comes before the row above it (or swaps with it if they are linked). */
export function stepUp(nodes: Node[], rId: string, prevId: string): EditResult {
  const r = nodes.find(n => n.id === rId)
  if (r?.dependsOn.includes(prevId)) return flipLink(nodes, rId, prevId)
  return doBefore(nodes, rId, prevId)
}

/** Days of work: a whole number from 0 to 30. */
export const clampDays = (v: number) => Math.max(0, Math.min(MAX_DAYS, Math.round(Number(v) || 0)))
export function setDays(nodes: Node[], id: string, days: number): EditResult {
  const n = nodes.find(x => x.id === id)
  if (!n) return fail("That step no longer exists.")
  const d = clampDays(days)
  return d === n.estDays ? noop("No change.") : ok([{ id, patch: { estDays: d } }], `${title(n)} now takes ${d} working day${d === 1 ? "" : "s"}.`)
}

/** Move a step into another phase group. Into or out of Close changes its dates, so say so. */
export function movePhase(nodes: Node[], id: string, phase: Phase): EditResult {
  const n = nodes.find(x => x.id === id)
  if (!n) return fail("That step no longer exists.")
  if (n.phase === phase) return noop("No change.")
  const note = phase === "close" ? "Close-out steps are scheduled after the event." : n.phase === "close" ? "This step is no longer a close-out step, so it is scheduled before the event." : undefined
  return ok([{ id, patch: { phase } }], `${title(n)} moved to the ${phase} group.`, note)
}

/** Move a phase group up or down. Display only. */
export function moveGroup(order: Phase[], phase: Phase, delta: -1 | 1): Phase[] {
  const i = order.indexOf(phase), j = i + delta
  if (i < 0 || j < 0 || j >= order.length) return order
  const next = [...order]
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}

/** What to put back to undo these edits: each patched field as it is now. */
export function inverseOf(nodes: Node[], edits: StepEdit[]): StepEdit[] {
  return edits.map(e => {
    const n = nodes.find(x => x.id === e.id)
    const back: StepPatch = {}
    if (n) {
      if (e.patch.dependsOn) back.dependsOn = [...n.dependsOn]
      if (e.patch.estDays !== undefined) back.estDays = n.estDays
      if (e.patch.phase) back.phase = n.phase ?? undefined
    }
    return { id: e.id, patch: back }
  })
}

/** Keep only the three fields the editor may write; everything else (dates included) is dropped. */
export function cleanPatch(patch: unknown, eventIds: Set<string>, selfId: string): StepPatch {
  const p = (patch && typeof patch === "object" ? patch : {}) as Record<string, unknown>
  const out: StepPatch = {}
  if (Array.isArray(p.dependsOn)) out.dependsOn = uniq(p.dependsOn.filter((d): d is string => typeof d === "string" && d !== selfId && eventIds.has(d)))
  if (typeof p.estDays === "number" && Number.isFinite(p.estDays)) out.estDays = clampDays(p.estDays)
  if (typeof p.phase === "string" && (PHASES as string[]).includes(p.phase)) out.phase = p.phase as Phase
  return out
}

export interface Group { phase: Phase; rows: Node[] }

/**
 * The editor's list: phase groups in the event's order; inside a group, steps that come earlier first (fewest steps
 * before them), then by their club deadline from the engine, then by name. Derived every time, never stored.
 */
export function displayOrder(nodes: Node[], sched: Schedule | undefined, order: Phase[] = PHASES): Group[] {
  const byId = new Map(nodes.map(n => [n.id, n]))
  const depth = new Map<string, number>()
  const walk = (id: string, seen: Set<string>): number => {
    if (depth.has(id)) return depth.get(id)!
    if (seen.has(id)) return 0
    seen.add(id)
    const d = 1 + Math.max(0, ...(byId.get(id)?.dependsOn ?? []).filter(x => byId.has(x)).map(x => walk(x, seen)))
    seen.delete(id)
    depth.set(id, d)
    return d
  }
  nodes.forEach(n => walk(n.id, new Set()))
  const club = (n: Node) => sched?.nodes[n.id]?.club ?? n.clubDeadline ?? ""
  const rank = (a: Node, b: Node) => (depth.get(a.id)! - depth.get(b.id)!) || club(a).localeCompare(club(b)) || a.title.localeCompare(b.title)
  return order.map(phase => ({ phase, rows: nodes.filter(n => n.phase === phase).sort(rank) })).filter(g => g.rows.length > 0)
}
