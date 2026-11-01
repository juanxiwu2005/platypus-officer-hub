import type { FlowNode, OrgFlow } from "./schema";
export function graphError(nodes: FlowNode[]): string | null {
  const by = new Map(nodes.map((n) => [n.id, n]));
  if (by.size !== nodes.length) return "Each step needs a unique ID.";
  const visiting = new Set<string>(),
    seen = new Set<string>();
  let error: string | null = null;
  const visit = (id: string) => {
    if (visiting.has(id)) {
      error = "These connections create a loop.";
      return;
    }
    if (seen.has(id)) return;
    const n = by.get(id);
    if (!n) {
      error = "A connection points to a missing step.";
      return;
    }
    visiting.add(id);
    n.dependsOn.forEach(visit);
    visiting.delete(id);
    seen.add(id);
  };
  nodes.forEach((n) => visit(n.id));
  return error;
}
export function connect(flow: OrgFlow, from: string, to: string): OrgFlow {
  if (from === to) throw new Error("A step cannot follow itself.");
  const nodes = flow.nodes.map((n) =>
    n.id === to ? { ...n, dependsOn: [...new Set([...n.dependsOn, from])] } : n,
  );
  const error = graphError(nodes);
  if (error) throw new Error(error);
  return { ...flow, nodes };
}
export function removeStep(flow: OrgFlow, id: string): OrgFlow {
  if (flow.nodes.length < 2) throw new Error("Keep at least one step.");
  const n = flow.nodes.find((n) => n.id === id);
  if (!n) return flow;
  return {
    ...flow,
    nodes: flow.nodes
      .filter((n) => n.id !== id)
      .map((x) => ({
        ...x,
        dependsOn: [
          ...new Set(
            x.dependsOn.flatMap((k) => (k === id ? n.dependsOn : [k])),
          ),
        ],
      })),
  };
}
export function arrangeRelative(
  flow: OrgFlow,
  id: string,
  targetId: string,
  mode: "before" | "parallel",
): OrgFlow {
  if (id === targetId) return flow;
  const target = flow.nodes.find((n) => n.id === targetId);
  if (!target) return flow;
  const original = flow.nodes.find((n) => n.id === id);
  if (!original) return flow;
  const nodes = flow.nodes.map((n) => {
    if (n.id === id)
      return {
        ...n,
        dependsOn: target.dependsOn.filter((k) => k !== id),
        position: {
          x: target.position.x - (mode === "before" ? 290 : 0),
          y: target.position.y + (mode === "parallel" ? 180 : 0),
        },
      };
    if (n.id === targetId && mode === "before")
      return { ...n, dependsOn: [id] };
    return {
      ...n,
      dependsOn: n.dependsOn
        .filter((k) => k !== id)
        .concat(n.dependsOn.includes(id) ? original.dependsOn : []),
    };
  });
  const error = graphError(nodes);
  if (error) throw new Error(error);
  return { ...flow, nodes };
}
