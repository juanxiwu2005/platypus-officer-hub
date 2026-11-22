import type { Node } from "../data/types"
import { placementOf } from "../engine/workflowBranches"
import { ancestorsOf } from "./stepOrder"

/** Dependencies decide order. Saved positions only order steps that can run independently. */
export function orderedBranchNodes(nodes: readonly Node[], branchId: string): Node[] {
  const all = [...nodes]
  const members = all.filter(n => placementOf(n).branchId === branchId)
  const ancestors = new Map(members.map(n => [n.id, ancestorsOf(all, n.id)]))
  const pending = new Map(members.map(n => [n.id, n]))
  const result: Node[] = []
  const rank = (a: Node, b: Node) => placementOf(a).order - placementOf(b).order || a.id.localeCompare(b.id)
  while (pending.size) {
    const ready = [...pending.values()].filter(n => ![...pending.keys()].some(id => id !== n.id && ancestors.get(n.id)!.has(id))).sort(rank)
    // Invalid historical graphs remain visible; editing still rejects new cycles.
    const next = ready[0] ?? [...pending.values()].sort(rank)[0]
    pending.delete(next.id); result.push(next)
  }
  return result
}
