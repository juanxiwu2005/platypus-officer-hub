import type { Event, Node, StepCond, WorkflowBranch } from "../data/types"
import type { MetroLayout } from "../components/flow/metro"
import { END_KEY, EVENT_KEY, START_KEY } from "../components/flow/metro"
import { ancestorsOf, createsLoop, reduceDeps, type EditResult, type StepEdit } from "./stepOrder"
import { conditionsOf, isStepCondition, placementOf, resolveBranches, scopeKey, validateBranchDefinitions } from "../engine/workflowBranches"
import { deletionReason, isAsuStep, isCoreStep } from "../engine/workflowPolicy"
import { orderedBranchNodes } from "./flowOrder"

export interface FlowInsertionTarget {
  branchId: string
  afterId: string | null
  beforeId: string | null
  referenceId?: string
  source: "before_node" | "after_node" | "gap"
  /** Explicit null means only the branch's scope; absent inherits the reference step. */
  condition?: StepCond | null
}
export interface FlowMoveContext { target: FlowInsertionTarget; branches: WorkflowBranch[]; conditionConfirmed?: boolean }

/**
 * Editing the event's flow chart directly (drag a step to a new place, add a step, delete a step, cut a link).
 * Pure functions: each one turns a gesture into changes to the steps' "waits for" links (and, for a new or deleted step, the step itself).
 * No date is read or written here; the rule engine dates everything afterwards, and the chart redraws from the result.
 * Same philosophy as lib/stepOrder.ts: a move changes the links of the few steps it names, never rebuilds the whole graph.
 */
const uniq = (a: string[]) => [...new Set(a)]
const ok = (edits: StepEdit[], message: string, note?: string): EditResult => ({ edits, message, ...(note ? { note } : {}) })
const fail = (error: string): EditResult => ({ edits: [], message: error, error })
const noop = (message: string): EditResult => ({ edits: [], message })
const q = (n: Node | null | undefined) => `“${n?.title ?? "that step"}”`
const same = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join() === [...b].sort().join()

/**
 * Take step `r` out of where it is and put it between `u` and `v` (either can be missing: the start, or the event day).
 * Whoever waited for `r` now waits for what `r` waited for; `r` then waits for `u`, and `v` waits for `r` instead of `u`.
 */
export function moveBetween(nodes: Node[], rId: string, uId: string | null, vId: string | null, context?: FlowMoveContext): EditResult {
  if (context) return moveOnBranch(nodes, rId, context)
  const by = new Map(nodes.map(n => [n.id, n]))
  const r = by.get(rId), u = uId ? by.get(uId) : null, v = vId ? by.get(vId) : null
  if (!r || (uId && !u) || (vId && !v)) return fail("Pick steps that are in this event.")
  if (uId === rId || vId === rId) return noop("No change.")
  if (uId && vId && uId === vId) return fail("Pick two different steps.")
  const deps = new Map(nodes.map(n => [n.id, [...n.dependsOn]]))
  const kids = nodes.filter(n => n.dependsOn.includes(rId))
  for (const k of kids) deps.set(k.id, uniq([...deps.get(k.id)!.filter(d => d !== rId), ...r.dependsOn]))
  deps.set(rId, uId ? [uId] : [])
  if (vId) deps.set(vId, uniq([...deps.get(vId)!.filter(d => d !== uId), rId]))
  const touched = uniq([rId, ...kids.map(k => k.id), ...(vId ? [vId] : [])])
  const after = nodes.map(n => (touched.includes(n.id) ? { ...n, dependsOn: deps.get(n.id)! } : n))
  const edits: StepEdit[] = []
  for (const id of touched) {
    const reduced = reduceDeps(after, deps.get(id)!)
    if (!same(reduced, by.get(id)!.dependsOn)) edits.push({ id, patch: { dependsOn: reduced } })
  }
  if (!edits.length) return noop(`${q(r)} is already there.`)
  const loop = createsLoop(nodes, edits)
  if (loop) return fail(`That would make ${q(by.get(loop))} wait for itself, so ${q(r)} was not moved.`)
  const where = u && v ? `between ${q(u)} and ${q(v)}` : u ? `after ${q(u)}` : v ? `before ${q(v)}` : "to the start"
  return ok(edits, `Moved ${q(r)} ${where}.`, r.ruleIds.length ? "It keeps its ASU deadline; only when it can start changes." : undefined)
}

/** Cut the direct link "waiter waits for waitee". The two steps then run side by side (unless another path still joins them). */
export function unlinkSteps(nodes: Node[], waiterId: string, waiteeId: string): EditResult {
  const waiter = nodes.find(n => n.id === waiterId), waitee = nodes.find(n => n.id === waiteeId)
  if (!waiter || !waitee) return fail("Pick steps that are in this event.")
  if (!waiter.dependsOn.includes(waiteeId)) {
    return ancestorsOf(nodes, waiterId).has(waiteeId)
      ? fail(`${q(waiter)} waits for ${q(waitee)} through other steps. Cut a link on that path instead.`)
      : noop(`${q(waiter)} does not wait for ${q(waitee)}. The line only shows their order.`)
  }
  const edits: StepEdit[] = [{ id: waiterId, patch: { dependsOn: waiter.dependsOn.filter(d => d !== waiteeId) } }]
  const still = ancestorsOf(nodes.map(n => (n.id === waiterId ? { ...n, dependsOn: edits[0].patch.dependsOn! } : n)), waiterId).has(waiteeId)
  return ok(edits, `${q(waiter)} no longer waits for ${q(waitee)}.`, still ? "They are still joined through other steps, so their order does not change." : undefined)
}

/** Why a step cannot be deleted, or null. Steps ASU rules need, and steps already finished, stay. */
export function cannotDelete(n: Node): string | null {
  return deletionReason(n)
}

const keyOf = (n: Node) => n.stepKey ?? n.id
const isPreJoin = (n: Node) => ["finalcheck", "review", "checkin", "runshow"].includes(keyOf(n))
const isPostStart = (n: Node) => keyOf(n) === "headcount"

function validateTarget(nodes: Node[], target: FlowInsertionTarget, branches: WorkflowBranch[]): string | null {
  const branch = resolveBranches(nodes, branches).find(b => b.id === target.branchId)
  if (!branch || target.branchId === "main") return "Choose a branch line rather than the shared event spine."
  if (target.condition !== undefined && target.condition !== null && !isStepCondition(target.condition)) return "Choose a supported event condition."
  const ordered = orderedBranchNodes(nodes, target.branchId)
  const left = target.afterId ? nodes.find(n => n.id === target.afterId) : undefined
  const right = target.beforeId ? nodes.find(n => n.id === target.beforeId) : undefined
  if ((target.afterId && !left) || (target.beforeId && !right)) return "That insertion point changed. Select the line again."
  const leftHere = !!left && placementOf(left).branchId === branch.id
  const rightHere = !!right && placementOf(right).branchId === branch.id
  if (left && !leftHere && !(branch.side === "after_event" && isPostStart(left))) return "The preceding step belongs to another branch."
  if (right && !rightHere && !(branch.side === "before_event" && isPreJoin(right))) return "The following step belongs to another branch."
  const i = leftHere ? ordered.findIndex(n => n.id === left.id) : -1
  const j = rightHere ? ordered.findIndex(n => n.id === right.id) : ordered.length
  if (j !== i + 1) return "Those steps are no longer neighbours. Select the line again."
  if (target.referenceId && !ordered.some(n => n.id === target.referenceId)) return "The selected step no longer belongs to this branch."
  return null
}

function editsFrom(before: Node[], after: Node[]): StepEdit[] {
  const by = new Map(before.map(n => [n.id, n]))
  return after.flatMap(n => {
    const old = by.get(n.id)
    if (!old) return []
    const patch: StepEdit["patch"] = {}
    if (!same(n.dependsOn, old.dependsOn)) patch.dependsOn = n.dependsOn
    if (JSON.stringify(n.placement) !== JSON.stringify(old.placement)) patch.placement = n.placement
    if (n.cond !== old.cond) patch.cond = n.cond ?? null
    return Object.keys(patch).length ? [{ id: n.id, patch }] : []
  })
}

/** Existing nodes exclude fresh. The result patches the fresh node as well as its successor. */
export function insertFlowStep(nodes: Node[], fresh: Node, target: FlowInsertionTarget, branches: WorkflowBranch[]): EditResult {
  if (nodes.some(n => n.id === fresh.id) || nodes.some(n => n.eventId !== fresh.eventId)) return fail("Choose a new step in this event.")
  const error = validateTarget(nodes, target, branches)
  if (error) return fail(error)
  const branch = resolveBranches(nodes, branches).find(b => b.id === target.branchId)!
  if ((fresh.phase === "close") !== (branch.side === "after_event")) return fail("A step must stay on the same side of the event day.")
  const reference = nodes.find(n => n.id === target.referenceId)
  const condition = target.condition !== undefined ? target.condition ?? undefined : reference?.cond ?? fresh.cond
  const ordered = orderedBranchNodes(nodes, branch.id)
  const index = target.beforeId ? ordered.findIndex(n => n.id === target.beforeId) : -1
  const insertion = index < 0 ? ordered.length : index
  const ids = ordered.map(n => n.id); ids.splice(insertion, 0, fresh.id)
  const all = [...nodes, fresh]
  const after = all.map(n => {
    const order = ids.indexOf(n.id)
    const placement = order >= 0 ? { branchId: branch.id, order } : n.placement
    if (n.id === fresh.id) return { ...n, placement, cond: condition, dependsOn: target.afterId ? [target.afterId] : [] }
    if (n.id === target.beforeId) return { ...n, placement, dependsOn: uniq([...n.dependsOn.filter(d => d !== target.afterId), fresh.id]) }
    return order >= 0 ? { ...n, placement } : n
  })
  const edits = editsFrom(all, after)
  if (createsLoop(all, edits)) return fail("That insertion would create a circular dependency. Nothing changed.")
  return ok(edits, "Added a new step in this branch.")
}

/** Creates a parallel route and connects only its new, explicit entry/exit. */
export function insertFlowBranch(nodes: Node[], fresh: Node, branch: WorkflowBranch, branches: WorkflowBranch[]): EditResult {
  const existing = resolveBranches(nodes, branches)
  const error = validateBranchDefinitions([...existing, branch])
  if (error || existing.some(b => b.id === branch.id)) return fail(error ?? "Choose a new branch ID.")
  const byKey = (keys: string[]) => keys.map(key => nodes.find(n => keyOf(n) === key)).find((n): n is Node => !!n)
  const start = branch.side === "after_event" ? byKey(["headcount"]) : undefined
  const join = branch.side === "before_event" ? byKey(["finalcheck", "review", "checkin", "runshow"]) : undefined
  return insertFlowStep(nodes, fresh, { branchId: branch.id, afterId: start?.id ?? null, beforeId: join?.id ?? null, source: "gap", condition: null }, [...existing, branch])
}

/** A graph move updates membership and only the source/target branch's order edges. */
function moveOnBranch(nodes: Node[], id: string, context: FlowMoveContext): EditResult {
  const r = nodes.find(n => n.id === id)
  if (!r) return fail("Choose a step in this event.")
  const source = placementOf(r)
  if (source.branchId === "main") return fail("Shared event checkpoints stay on the event spine.")
  if (context.target.afterId === id || context.target.beforeId === id) return noop("No change.")
  const branches = resolveBranches(nodes, context.branches)
  const origin = branches.find(b => b.id === source.branchId)
  const destination = branches.find(b => b.id === context.target.branchId)
  if (!origin || !destination) return fail("Choose an existing branch.")
  if (origin.side !== destination.side) return fail("Steps cannot move between preparation and close-out. Choose a branch on the same side of the event day.")
  const targetCondition = context.target.condition !== undefined ? context.target.condition ?? undefined : r.cond
  const candidate = { ...r, placement: { branchId: destination.id, order: source.order }, cond: targetCondition }
  if (isCoreStep(r) && conditionsOf(candidate, branches).length) return fail("Required workflow steps cannot be limited to conditional events.")
  if (isAsuStep(r) && scopeKey(r, branches) !== scopeKey(candidate, branches)) return fail("An ASU step must keep the events it applies to.")
  if (origin.id !== destination.id && scopeKey(r, branches) !== scopeKey(candidate, branches) && !context.conditionConfirmed) return fail("Moving to this branch changes which events use the step. Confirm the new scope first.")
  const external = r.dependsOn.filter(d => {
    const n = nodes.find(n => n.id === d)
    return !n || placementOf(n).branchId !== source.branchId
  })
  // Other branches that wait for r still wait for r. Only its former line closes up.
  const detached = nodes.filter(n => n.id !== id).map(n => {
    const sharedJoin = origin.side === "before_event" && isPreJoin(n)
    if (sharedJoin && origin.id !== destination.id && n.dependsOn.includes(id)) return { ...n, dependsOn: uniq([...n.dependsOn, ...r.dependsOn]) }
    const onSource = placementOf(n).branchId === source.branchId || sharedJoin
    return onSource && n.dependsOn.includes(id) ? { ...n, dependsOn: uniq([...n.dependsOn.filter(d => d !== id), ...r.dependsOn]) } : n
  })
  const error = validateTarget(detached, context.target, branches)
  if (error) return fail(error)
  const result = insertFlowStep(detached, { ...r, dependsOn: [] }, { ...context.target, condition: targetCondition ?? null }, branches)
  if (result.error) return result
  const patches = new Map(result.edits.map(e => [e.id, e.patch]))
  const after = [...detached, r].map(n => {
    const p = patches.get(n.id)
    const changed = p ? { ...n, ...p, cond: Object.hasOwn(p, "cond") ? p.cond ?? undefined : n.cond } : n
    return changed.id === id ? { ...changed, dependsOn: uniq([...changed.dependsOn, ...external]) } : changed
  })
  const sourceOrder = orderedBranchNodes(after, source.branchId).map(n => n.id)
  const normalized = after.map(n => sourceOrder.includes(n.id) ? { ...n, placement: { branchId: source.branchId, order: sourceOrder.indexOf(n.id) } } : n)
  const edits = editsFrom(nodes, normalized)
  if (createsLoop(nodes, edits)) return fail("That move would create a circular dependency. Nothing changed.")
  if (!edits.length) return noop("No change.")
  return ok(edits, `Moved ${q(r)} ${context.target.afterId ? `after ${q(nodes.find(n => n.id === context.target.afterId))}` : "to the start of this branch"}.`)
}

/** Whoever waited for the step now waits for what it waited for. */
export function removalEdits(nodes: Node[], id: string): StepEdit[] {
  const gone = nodes.find(n => n.id === id)
  if (!gone) return []
  const after = nodes.filter(n => n.id !== id).map(n => (n.dependsOn.includes(id) ? { ...n, dependsOn: uniq([...n.dependsOn.filter(d => d !== id), ...gone.dependsOn]) } : n))
  return nodes.filter(n => n.dependsOn.includes(id)).map(k => ({ id: k.id, patch: { dependsOn: reduceDeps(after, after.find(a => a.id === k.id)!.dependsOn) } }))
}

/** A new step made in the chart: one working day, no owner yet (it shows up in the details panel to fill in), same phase and kind of work as its neighbour. */
export function newStepNode(ev: Pick<Event, "id">, id: string, ref: Node | undefined, today: string): Node {
  return {
    id, title: "New step", eventId: ev.id, stepKey: null, phase: ref?.phase ?? "prepare", fn: ref?.fn ?? "programs", ownerId: null, approverRoleId: ref?.approverRoleId ?? null,
    consultedRoleIds: [], informedRoleIds: [], dependsOn: [], tier: "light", estDays: 1, anchor: null, clubDeadlineOverride: null, officialDeadline: null, clubDeadline: null, latestStart: null,
    ruleIds: [], status: "unclaimed", acceptedOn: null, waitingOn: null, draftLink: null, why: "Added in the flow chart.", source: "Added by you", lastUpdate: null, assignedOn: today, ownerVersion: 0,
  }
}

/* ---------- Where things are on the chart: tracks and the gaps between neighbours ---------- */

export interface TrackItem { key: string; node: Node | null; col: number; row: number }
export interface Track { id: string; items: TrackItem[] }
export interface Gap {
  id: string; track: string
  /** The real steps on either side (null at the start, the event day or the end). */
  uId: string | null; vId: string | null
  u: TrackItem; v: TrackItem
  /** Position in chart units (columns and rows). */
  col: number; row: number
}

/** The main line and every branch as lists of neighbours, each branch starting and ending on a main-line station. */
export function flowTracks(L: MetroLayout): Track[] {
  const main: Track = { id: "main", items: L.stations.map(s => ({ key: s.key, node: s.node, col: s.col, row: 0 })) }
  const branches: Track[] = L.branches.map(b => ({
    id: b.id,
    items: [
      { key: L.stations[b.from].key, node: L.stations[b.from].node, col: L.stations[b.from].col, row: 0 },
      ...b.nodes.map(x => ({ key: x.node.id, node: x.node, col: x.col, row: b.row })),
      { key: L.stations[b.to]?.key ?? END_KEY, node: L.stations[b.to]?.node ?? null, col: L.stations[b.to]?.col ?? (L.cols + 1), row: 0 },
    ],
  }))
  return [main, ...branches]
}

/** Every place a step can be dropped: between two neighbours on a track. Nothing is offered right after the event day (that is the "Close" group's own business). */
export function flowGaps(L: MetroLayout): Gap[] {
  const out: Gap[] = []
  for (const t of flowTracks(L)) {
    t.items.slice(0, -1).forEach((u, i) => {
      const v = t.items[i + 1]
      if (t.id === "main" && u.key === EVENT_KEY) return
      const branchRow = t.items.find(x => x.row !== 0)?.row ?? 0
      out.push({ id: `${t.id}:${u.key}:${v.key}`, track: t.id, uId: u.node?.id ?? null, vId: v.node?.id ?? null, u, v, col: (u.col + v.col) / 2, row: t.id === "main" ? 0 : branchRow })
    })
  }
  return out
}

export const isVirtual = (key: string) => key === START_KEY || key === EVENT_KEY || key === END_KEY

/** The neighbours of a step on its own track (the main line first, since main-line steps also start and end branches). */
export function neighboursOf(L: MetroLayout, nodeId: string): { prev: TrackItem | null; next: TrackItem | null } {
  for (const t of flowTracks(L)) {
    const i = t.items.findIndex(x => x.node?.id === nodeId && (t.id === "main" || (x.row !== 0)))
    if (i >= 0) return { prev: t.items[i - 1] ?? null, next: t.items[i + 1] ?? null }
  }
  return { prev: null, next: null }
}
