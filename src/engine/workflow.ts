import type { DemoState, Event, Node, Phase, Role, StepTemplate, Tier } from "../data/types"
import { addDays } from "../lib/dates"
import { EVENT_STEPS, buildEventNodes, roleFor } from "./playbooks"
import { computeSchedule } from "./schedule"

/**
 * The club's own event workflow (setup). Everything here is pure and has no dates in it: a step has an anchor and links, and the
 * rule engine (schedule.ts) dates them. The standard workflow is the starting point; the club's planning notes and files, read by
 * the AI, propose changes; this file applies them, refuses the ones ASU rules do not allow, and checks what is left against the rules.
 * Whatever the AI says, only these functions change the template.
 */
export const MAX_STEPS = 45
export const MAX_DAYS = 30
export const PHASE_LIST: Phase[] = ["plan", "prepare", "money", "marketing", "run", "close"]

export const presetSteps = (): StepTemplate[] => structuredClone(EVENT_STEPS)

/** A step ASU rules depend on: it has a rule, or its deadline comes from one. The club cannot remove it or move its deadline. */
export const isLocked = (s: Pick<StepTemplate, "ruleIds" | "anchor">) => !!s.ruleIds?.length || s.anchor?.kind === "rule"
export const ruleList = (s: Pick<StepTemplate, "ruleIds">) => (s.ruleIds ?? []).join(", ")

export interface StepPatch {
  title?: string
  phase?: Phase
  estDays?: number
  dependsOn?: string[]
  ownerRoleId?: string | null
  /** Club timing: how many days before the event this step should be done, as a number (never a date). Not for steps with ASU rules. */
  daysBefore?: number | null
  why?: string
  tier?: Tier
}
export interface WorkflowChange {
  id: string
  op: "add" | "update" | "remove"
  /** The step it changes (for "add": the new step's key). */
  key: string
  /** Display title: the step's own, or the new step's. */
  title: string
  patch: StepPatch
  /** Steps that must wait for a new step (add only). */
  beforeKeys?: string[]
  /** A short line from the club's own notes or files that this change comes from. */
  evidence: string
}
export interface Refusal { change: WorkflowChange; reason: string }

const uniq = <T,>(a: T[]) => [...new Set(a)]
const clampDays = (v: unknown) => Math.max(0, Math.min(MAX_DAYS, Math.round(Number(v) || 0)))
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 28) || "step"

/** Every step key that `key` waits for, directly or through other steps. */
export function ancestors(steps: StepTemplate[], key: string): Set<string> {
  const by = new Map(steps.map(s => [s.key, s]))
  const out = new Set<string>(), stack = [...(by.get(key)?.dependsOn ?? [])]
  while (stack.length) { const k = stack.pop()!; if (out.has(k) || !by.has(k)) continue; out.add(k); stack.push(...(by.get(k)!.dependsOn ?? [])) }
  return out
}
const loops = (steps: StepTemplate[]) => steps.some(s => ancestors(steps, s.key).has(s.key))

/** A step with the club's own timing (days before the event) on it. Steps with ASU rules keep their own deadline. */
const timing = (days: number | null | undefined, phase: Phase, current?: StepTemplate["anchor"]): StepTemplate["anchor"] | undefined => {
  if (days === undefined) return current
  if (days === null || phase === "close") return undefined
  return { kind: "target", days: Math.max(0, Math.min(180, Math.round(days))), unit: "calendar", label: "Club timing from your planning notes" }
}

/** Take a step out and let the steps that waited for it wait for what it waited for. */
export function removeStep(steps: StepTemplate[], key: string): StepTemplate[] {
  const gone = steps.find(s => s.key === key)
  if (!gone) return steps
  return steps.filter(s => s.key !== key).map(s => (s.dependsOn ?? []).includes(key) ? { ...s, dependsOn: uniq([...(s.dependsOn ?? []).filter(d => d !== key), ...(gone.dependsOn ?? [])]) } : s)
}

/**
 * Apply proposed changes to a copy of the steps. Each change either applies or is refused with a reason a person can read.
 * Refused: removing or re-timing a step that ASU rules depend on, links that would make a step wait for itself, unknown steps, too many steps.
 */
export function applyChanges(steps: StepTemplate[], changes: WorkflowChange[], roles: Role[]): { steps: StepTemplate[]; applied: WorkflowChange[]; refused: Refusal[] } {
  let cur = structuredClone(steps)
  const applied: WorkflowChange[] = [], refused: Refusal[] = []
  const roleIds = new Set(roles.map(r => r.id))
  const no = (change: WorkflowChange, reason: string) => refused.push({ change, reason })
  for (const c of changes) {
    const at = cur.findIndex(s => s.key === c.key)
    if (c.op === "add") {
      if (cur.length >= MAX_STEPS) { no(c, `A workflow can have up to ${MAX_STEPS} steps.`); continue }
      let key = c.key; while (cur.some(s => s.key === key)) key += "-2"
      const phase = c.patch.phase ?? "prepare"
      const owner = c.patch.ownerRoleId && roleIds.has(c.patch.ownerRoleId) ? c.patch.ownerRoleId : null
      const step: StepTemplate = {
        key, title: c.patch.title ?? c.title, fn: roles.find(r => r.id === owner)?.fn ?? "programs", ownerRoleId: owner, phase, estDays: clampDays(c.patch.estDays ?? 1), tier: c.patch.tier ?? "light",
        dependsOn: uniq((c.patch.dependsOn ?? []).filter(d => cur.some(s => s.key === d))), why: c.patch.why ?? "From your planning notes and files.", source: "Your planning notes and files", custom: true,
        ...(timing(c.patch.daysBefore, phase) ? { anchor: timing(c.patch.daysBefore, phase) } : {}),
      }
      const before = uniq((c.beforeKeys ?? []).filter(k => cur.some(s => s.key === k)))
      const next = [...cur, step].map(s => before.includes(s.key) ? { ...s, dependsOn: uniq([...(s.dependsOn ?? []), key]) } : s)
      if (loops(next)) { no(c, "That would make a step wait for itself."); continue }
      cur = next; applied.push({ ...c, key }); continue
    }
    if (at < 0) { no(c, "That step is not in the workflow."); continue }
    const step = cur[at]
    if (c.op === "remove") {
      if (isLocked(step)) { no(c, `Kept: ASU rule${(step.ruleIds?.length ?? 0) > 1 ? "s" : ""} ${ruleList(step) || "on its deadline"} require${(step.ruleIds?.length ?? 0) > 1 ? "" : "s"} this step.`); continue }
      cur = removeStep(cur, c.key); applied.push(c); continue
    }
    const p = c.patch
    if (isLocked(step) && (p.phase || p.daysBefore !== undefined)) { no(c, `Kept: this step's place and deadline come from ASU rule ${ruleList(step) || "R0x"}.`); continue }
    const phase = p.phase ?? step.phase
    const owner = p.ownerRoleId === undefined ? step.ownerRoleId : p.ownerRoleId && roleIds.has(p.ownerRoleId) ? p.ownerRoleId : step.ownerRoleId
    const patched: StepTemplate = {
      ...step,
      ...(p.title ? { title: p.title } : {}), ...(p.why ? { why: p.why } : {}), ...(p.tier ? { tier: p.tier } : {}),
      phase, estDays: p.estDays === undefined ? step.estDays : clampDays(p.estDays),
      ownerRoleId: owner, fn: owner ? roles.find(r => r.id === owner)?.fn ?? step.fn : step.fn,
      dependsOn: p.dependsOn ? uniq(p.dependsOn.filter(d => d !== c.key && cur.some(s => s.key === d))) : step.dependsOn,
    }
    const anchor = timing(p.daysBefore, phase, step.anchor)
    if (anchor) patched.anchor = anchor; else delete patched.anchor
    const next = cur.map((s, i) => i === at ? patched : s)
    if (loops(next) && !loops(cur)) { no(c, "That would make a step wait for itself."); continue }
    cur = next; applied.push(c)
  }
  return { steps: cur, applied, refused }
}

/** Undo one applied change, using the standard workflow for what a step was. Other changes stay. */
export function revertChange(steps: StepTemplate[], change: WorkflowChange, preset: StepTemplate[] = EVENT_STEPS): StepTemplate[] {
  const was = preset.find(s => s.key === change.key)
  if (change.op === "add") return removeStep(steps, change.key)
  if (change.op === "remove") {
    if (!was || steps.some(s => s.key === was.key)) return steps
    return [...steps.map(s => (was.key && preset.find(p => p.key === s.key)?.dependsOn?.includes(was.key)) ? { ...s, dependsOn: uniq([...(s.dependsOn ?? []), was.key]) } : s), structuredClone(was)]
  }
  if (!was) return steps
  return steps.map(s => {
    if (s.key !== change.key) return s
    const p = change.patch, back: StepTemplate = { ...s }
    if (p.title) back.title = was.title
    if (p.why) back.why = was.why
    if (p.tier) back.tier = was.tier
    if (p.phase) back.phase = was.phase
    if (p.estDays !== undefined) back.estDays = was.estDays
    if (p.dependsOn) back.dependsOn = [...(was.dependsOn ?? [])].filter(d => steps.some(x => x.key === d))
    if (p.ownerRoleId !== undefined) { back.ownerRoleId = was.ownerRoleId ?? null; back.fn = was.fn }
    if (p.daysBefore !== undefined) { if (was.anchor) back.anchor = was.anchor; else delete back.anchor }
    return back
  })
}

/** Who actually does a step: the chosen role, else the first role with the right function. */
export const ownerOfStep = (s: StepTemplate, roles: Role[]): Role | undefined => (s.ownerRoleId ? roles.find(r => r.id === s.ownerRoleId) : undefined) ?? roleFor(roles, s.fn)

/** Give every step a specific role. Chosen roles stay; the rest follow the function, the same as new events always did. */
export function withOwners(steps: StepTemplate[], roles: Role[], chosen: Record<string, string> = {}): StepTemplate[] {
  return steps.map(s => {
    const id = chosen[s.key] && roles.some(r => r.id === chosen[s.key]) ? chosen[s.key] : s.ownerRoleId && roles.some(r => r.id === s.ownerRoleId) ? s.ownerRoleId : ownerOfStep(s, roles)?.id ?? null
    return { ...s, ownerRoleId: id, fn: roles.find(r => r.id === id)?.fn ?? s.fn }
  })
}

export interface WorkflowIssue { level: "blocked" | "warning"; text: string; key?: string; rules?: string[] }

/** What a new event does with these steps, against the same event with the standard steps: only NEW errors count. */
export function simulationIssues(state: DemoState, steps: StepTemplate[], roles: Role[]): WorkflowIssue[] {
  const event: Event = { id: "sim", name: "Sample event", date: addDays(state.today, 28), type: "speaker", headcount: 60, venue: "campus", food: "offsite", funding: "usg", speaker: true, goalId: null, playbookId: "seo-event" }
  const run = (st: StepTemplate[]) => {
    const nodes: Node[] = buildEventNodes(event, roles, { steps: st })
    const sched = computeSchedule({ ...state, roles, people: [], events: [event], nodes })
    return { sched, nodes }
  }
  const base = run(EVENT_STEPS), mine = run(steps)
  const seen = new Set(Object.values(base.sched.nodes).flatMap(n => n.issues).concat(base.sched.events.sim?.issues ?? []).filter(i => i.severity === "error").map(i => `${i.code}:${i.nodeId ?? ""}`))
  const title = new Map(mine.nodes.map(n => [n.id, n.title]))
  const out: WorkflowIssue[] = []
  for (const i of [...Object.values(mine.sched.nodes).flatMap(n => n.issues), ...(mine.sched.events.sim?.issues ?? [])]) {
    if (i.severity !== "error" || seen.has(`${i.code}:${i.nodeId ?? ""}`)) continue
    seen.add(`${i.code}:${i.nodeId ?? ""}`)
    out.push({ level: "warning", text: `A sample event four weeks away would miss a deadline: ${i.text}${i.nodeId && title.get(i.nodeId) ? ` (${title.get(i.nodeId)})` : ""}`, key: i.nodeId?.replace(/^sim:/, ""), rules: i.ruleId ? [i.ruleId] : undefined })
  }
  return out.slice(0, 4)
}

/**
 * The checks that protect ASU policy, worked out by the engine (not by the AI). "blocked" must be fixed before setup continues;
 * "warning" is shown and the president decides.
 */
export function checkWorkflow(steps: StepTemplate[], roles: Role[], state?: DemoState): WorkflowIssue[] {
  const out: WorkflowIssue[] = []
  const by = new Map(steps.map(s => [s.key, s]))
  for (const p of EVENT_STEPS.filter(isLocked)) {
    const s = by.get(p.key)
    if (!s) { out.push({ level: "blocked", text: `“${p.title}” is missing. ASU rule${(p.ruleIds?.length ?? 0) > 1 ? "s" : ""} ${ruleList(p) || "on its deadline"} require it.`, key: p.key, rules: p.ruleIds }); continue }
    if (JSON.stringify(s.anchor ?? null) !== JSON.stringify(p.anchor ?? null)) out.push({ level: "blocked", text: `“${s.title}” has a deadline set by ASU rule ${ruleList(p) || "R0x"}. The club cannot change it; use the club buffer instead.`, key: p.key, rules: p.ruleIds })
    if (s.cond !== p.cond) out.push({ level: "blocked", text: `“${s.title}” only applies to some events, as ASU rule ${ruleList(p) || "R0x"} says. That cannot change.`, key: p.key, rules: p.ruleIds })
    // A step ASU rules depend on must still come after the steps it needs (for example the speaker request waits for the signed agreement).
    for (const d of (p.dependsOn ?? []).filter(k => EVENT_STEPS.find(x => x.key === k && isLocked(x)))) {
      if (by.has(d) && !ancestors(steps, p.key).has(d)) out.push({ level: "blocked", text: `“${s.title}” must wait for “${by.get(d)!.title}” (ASU rule ${ruleList(p) || ruleList(by.get(d)!)}).`, key: p.key, rules: p.ruleIds })
    }
  }
  for (const s of steps) {
    for (const d of s.dependsOn ?? []) if (!by.has(d)) out.push({ level: "blocked", text: `“${s.title}” waits for a step that is not in the workflow.`, key: s.key })
    if (ancestors(steps, s.key).has(s.key)) out.push({ level: "blocked", text: `“${s.title}” waits for itself, through other steps.`, key: s.key })
    const owner = ownerOfStep(s, roles)
    if (owner?.fn === "advisor") out.push({ level: "warning", text: `“${s.title}” is given to the advisor, who does not take event tasks.`, key: s.key })
    if (s.ownerRoleId && !roles.some(r => r.id === s.ownerRoleId)) out.push({ level: "warning", text: `“${s.title}” is given to a role that no longer exists. The first role with the right function will take it.`, key: s.key })
  }
  if (state && !out.some(i => i.level === "blocked")) out.push(...simulationIssues(state, steps, roles))
  // One issue per key and text.
  return out.filter((i, n) => out.findIndex(x => x.text === i.text) === n)
}

/** The steps as the edit module's list rows. The module's own rules (stepOrder) work on nodes, so a step is shown as a small node. */
export function stepsAsNodes(steps: StepTemplate[]): Node[] {
  return steps.map(s => ({
    id: s.key, title: s.title, eventId: "workflow", stepKey: s.key, phase: s.phase, fn: s.fn, ownerId: null, approverRoleId: null, consultedRoleIds: [], informedRoleIds: [],
    dependsOn: [...(s.dependsOn ?? [])], tier: s.tier, estDays: s.estDays, anchor: s.anchor ?? null, clubDeadlineOverride: null, officialDeadline: null, clubDeadline: null, latestStart: null,
    ruleIds: s.ruleIds ?? [], status: "unclaimed", acceptedOn: null, waitingOn: null, draftLink: null, why: s.why, source: s.source, lastUpdate: null,
  }) as Node)
}

export const newStepKey = (steps: StepTemplate[], title: string) => { let k = slug(title); while (steps.some(s => s.key === k)) k += "-2"; return k }

/** One line about how a workflow differs from the standard one, for the setup summary and Settings. */
export function describeWorkflow(steps: StepTemplate[]): string {
  const base = new Map(EVENT_STEPS.map(s => [s.key, s]))
  const added = steps.filter(s => !base.has(s.key)).length
  const removed = EVENT_STEPS.filter(s => !steps.some(x => x.key === s.key)).length
  // Links to steps that were added or removed are not counted again as a change to the step that waits for them.
  const mine = new Set(steps.map(s => s.key))
  const deps = (list: string[] | undefined, keep: (k: string) => boolean) => JSON.stringify([...(list ?? []).filter(keep)].sort())
  const changed = steps.filter(s => { const b = base.get(s.key); return b && (b.title !== s.title || b.estDays !== s.estDays || b.phase !== s.phase || deps(b.dependsOn, k => mine.has(k)) !== deps(s.dependsOn, k => base.has(k))) }).length
  const parts = [added && `${added} added`, changed && `${changed} changed`, removed && `${removed} removed`].filter(Boolean)
  return parts.length ? `Standard workflow, ${parts.join(", ")}.` : "The standard workflow."
}

export interface FlowNode { key: string; title: string; phase: Phase; level: number; row: number; locked: boolean; ownerRoleId: string | null }
export interface FlowChart { nodes: FlowNode[]; edges: { from: string; to: string }[]; levels: number; rows: number }

/**
 * The workflow as a chart: each step sits one column to the right of the latest step it waits for, and steps that do not wait for each
 * other stack in the same column. Nothing here is a date; the left-to-right order is the order the work must happen in. Steps in a
 * column are ordered to keep the lines short, then by phase.
 */
export function workflowChart(steps: StepTemplate[], roles: Role[] = []): FlowChart {
  const by = new Map(steps.map(s => [s.key, s]))
  const level = new Map<string, number>()
  const walk = (key: string, seen: Set<string>): number => {
    if (level.has(key)) return level.get(key)!
    if (seen.has(key)) return 0
    seen.add(key)
    const l = Math.max(-1, ...(by.get(key)?.dependsOn ?? []).filter(d => by.has(d)).map(d => walk(d, seen))) + 1
    seen.delete(key); level.set(key, l)
    return l
  }
  steps.forEach(s => walk(s.key, new Set()))
  const levels = Math.max(0, ...level.values()) + 1
  const rowOf = new Map<string, number>(), order: Record<string, number> = Object.fromEntries(PHASE_LIST.map((p, i) => [p, i]))
  const cols: StepTemplate[][] = Array.from({ length: levels }, (_, l) => steps.filter(s => level.get(s.key) === l))
  for (const col of cols) {
    const score = (s: StepTemplate) => { const r = (s.dependsOn ?? []).map(d => rowOf.get(d)).filter((x): x is number => x !== undefined); return r.length ? r.reduce((a, b) => a + b, 0) / r.length : steps.indexOf(s) / 100 }
    col.sort((a, b) => score(a) - score(b) || order[a.phase] - order[b.phase] || steps.indexOf(a) - steps.indexOf(b))
    col.forEach((s, i) => rowOf.set(s.key, i))
  }
  const rows = Math.max(1, ...cols.map(c => c.length))
  const nodes: FlowNode[] = steps.map(s => {
    const n = cols[level.get(s.key)!].length
    return { key: s.key, title: s.title, phase: s.phase, level: level.get(s.key)!, row: rowOf.get(s.key)! + (rows - n) / 2, locked: isLocked(s), ownerRoleId: ownerOfStep(s, roles)?.id ?? s.ownerRoleId ?? null }
  })
  return { nodes, edges: steps.flatMap(s => (s.dependsOn ?? []).filter(d => by.has(d)).map(d => ({ from: d, to: s.key }))), levels, rows }
}
