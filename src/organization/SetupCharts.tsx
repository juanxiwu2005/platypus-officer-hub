import { useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  applyNodeChanges,
  type Node,
  type NodeProps,
  type NodeChange,
  type Edge,
  type Connection,
  type ReactFlowInstance,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  type OrgRole,
  type Department,
  type OrgFlow,
  type FlowNode,
} from "./schema";
import { hierarchyError, layoutFlow } from "./setupLogic";
import { connect, graphError, removeStep } from "./graph";
type RoleData = {
  role: OrgRole;
  departments: Department[];
  roles: OrgRole[];
  edit: (id: string, fields: Partial<OrgRole>) => void;
  remove: (id: string) => void;
};
type RoleNode = Node<RoleData, "role">;
function RoleCard({ data }: NodeProps<RoleNode>) {
  const { role: r, departments, edit, roles, remove } = data;
  const dep = departments.find((x) => x.id === r.departmentId);
  return (
    <div className="v3-role" style={{ borderTopColor: dep?.color }}>
      <Handle type="target" position={Position.Top} />
      <span className="v3-source">
        {r.source === "constitution"
          ? "From constitution"
          : r.source === "manual"
            ? "Edited by you"
            : "Suggested"}
      </span>
      <input
        className="nodrag v3-node-title"
        aria-label={`Role title ${r.id}`}
        value={r.title}
        maxLength={180}
        onChange={(e) => edit(r.id, { title: e.target.value })}
      />
      <textarea
        className="nodrag"
        aria-label={`Description ${r.title}`}
        rows={2}
        maxLength={400}
        value={r.description ?? ""}
        onChange={(e) => edit(r.id, { description: e.target.value })}
      />
      <select
        className="nodrag"
        aria-label={`Department for ${r.title}`}
        value={r.departmentId}
        onChange={(e) => edit(r.id, { departmentId: e.target.value })}
      >
        {departments.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      <select
        className="nodrag v3-parent"
        aria-label={`Reports to for ${r.title}`}
        value={r.parentRoleId ?? ""}
        onChange={(e) => edit(r.id, { parentRoleId: e.target.value || null })}
      >
        <option value="">No reporting line</option>
        {roles
          .filter((x) => x.id !== r.id)
          .map((x) => (
            <option key={x.id} value={x.id}>
              {x.title}
            </option>
          ))}
      </select>
      <button
        className="nodrag v3-delete"
        aria-label={`Remove ${r.title}`}
        onClick={() => remove(r.id)}
      >
        ×
      </button>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
const roleTypes = { role: RoleCard };
export function TeamChart({
  roles,
  departments,
  onChange,
  onRemove,
  onSelect,
  onError,
}: {
  roles: OrgRole[];
  departments: Department[];
  onChange: (roles: OrgRole[]) => void;
  onRemove: (id: string) => void;
  onSelect: (id: string) => void;
  onError: (s: string) => void;
}) {
  const edit = (id: string, fields: Partial<OrgRole>) => {
    const updated = roles.map((r) =>
      r.id === id
        ? {
            ...r,
            ...fields,
            manualFields: [
              ...new Set([
                ...(r.manualFields ?? []),
                ...Object.keys(fields).filter((x) => x !== "position"),
              ]),
            ],
          }
        : r,
    );
    const e = hierarchyError(updated);
    if (e) {
      onError(e);
      return;
    }
    onChange(updated);
  };
  const prepared = useMemo(
    () =>
      roles.map((r) => ({
        id: r.id,
        type: "role" as const,
        position: r.position ?? { x: 0, y: 0 },
        data: { role: r, departments, roles, edit, remove: onRemove },
      })),
    [roles, departments],
  );
  const [view,setView]=useState<ReactFlowInstance<RoleNode>|null>(null);
  const [nodes, setNodes] = useState<RoleNode[]>(prepared);
  useEffect(() => setNodes(prepared), [prepared]);
  const edges = roles
    .filter((r) => r.parentRoleId)
    .map((r) => ({
      id: `${r.parentRoleId}-${r.id}`,
      source: r.parentRoleId!,
      target: r.id,
      type: "default",
      style: { stroke: "#a7afbc", strokeWidth: 2 },
      reconnectable: true,
    }));
  const attach = (connection: Connection) => {
    if (connection.source && connection.target)
      edit(connection.target, { parentRoleId: connection.source });
  };
  return (
    <><div className="v3-chart-toolbar"><button onClick={()=>void view?.fitView()}>Overview</button><button onClick={()=>void view?.setViewport({x:30,y:30,zoom:1})}>Read roles</button></div><div className="v3-canvas" aria-label="Editable organization chart">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={roleTypes}
        onInit={setView}
        defaultViewport={{x:30,y:30,zoom:1}}
        minZoom={0.2}
        maxZoom={1.3}
        nodesDraggable
        nodesConnectable
        deleteKeyCode={null}
        onNodeClick={(_, n) => onSelect(n.id)}
        onNodesChange={(changes: NodeChange<RoleNode>[]) =>
          setNodes((ns) => applyNodeChanges(changes, ns))
        }
        onNodeDragStop={(_, node) => {
          const target = roles.find(
            (r) =>
              r.id !== node.id &&
              Math.abs((r.position?.x ?? 0) - node.position.x) < 120 &&
              Math.abs((r.position?.y ?? 0) - node.position.y) < 100,
          );
          edit(node.id, {
            position: node.position,
            ...(target ? { parentRoleId: target.id } : {}),
          });
        }}
        onConnect={attach}
        onReconnect={(old, c) => {
          if (old.target !== c.target) {
            const next = roles.map((r) =>
              r.id === old.target
                ? { ...r, parentRoleId: null }
                : r.id === c.target
                  ? { ...r, parentRoleId: c.source }
                  : r,
            );
            const e = hierarchyError(next);
            e ? onError(e) : onChange(next);
          } else attach(c);
        }}
        onEdgesDelete={(es) =>
          onChange(
            roles.map((r) =>
              es.some((e) => e.target === r.id)
                ? { ...r, parentRoleId: null }
                : r,
            ),
          )
        }
      >
        <Background gap={24} color="#e2e6ed" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div></>
  );
}
export function arrangeTeam(roles: OrgRole[]) {
  const levels = new Map<string, number>(),
    counts = new Map<number, number>();
  const depth = (r: OrgRole): number => {
    if (levels.has(r.id)) return levels.get(r.id)!;
    const parent = roles.find((x) => x.id === r.parentRoleId);
    const n = parent ? depth(parent) + 1 : 0;
    levels.set(r.id, n);
    return n;
  };
  if (hierarchyError(roles)) return roles;
  return roles.map((r) => {
    const y = depth(r),
      x = counts.get(y) ?? 0;
    counts.set(y, x + 1);
    return { ...r, position: { x: x * 300, y: y * 300 } };
  });
}
type StepData = {
  step: FlowNode;
  roles: OrgRole[];
  departments: Department[];
  edit: (id: string, fields: Partial<FlowNode>) => void;
  add: (id: string) => void;
  remove: (id: string) => void;
};
type StepNode = Node<StepData, "step">;
function StepCard({ data }: NodeProps<StepNode>) {
  const { step: n, roles, departments, edit, add, remove } = data;
  const owners = n.roleIds
    .map((id) => roles.find((r) => r.id === id))
    .filter(Boolean) as OrgRole[];
  const colors = [
    ...new Set(
      owners.map(
        (r) =>
          departments.find((d) => d.id === r.departmentId)?.color ?? "#617486",
      ),
    ),
  ];
  return (
    <div className="v3-step" style={{ borderTopColor: colors[0] ?? "#617486" }}>
      <Handle type="target" position={Position.Left} />
      <input
        className="nodrag v3-node-title"
        aria-label={`Step title ${n.id}`}
        value={n.title}
        maxLength={180}
        onChange={(e) => edit(n.id, { title: e.target.value })}
      />
      <details className="nodrag v3-owner-select">
        <summary>
          {owners.length
            ? owners.map((r) => r.title).join(" · ")
            : "Choose owners"}
        </summary>
        <div>
          {roles.map((r) => (
            <label key={r.id}>
              <input
                type="checkbox"
                checked={n.roleIds.includes(r.id)}
                onChange={(e) =>
                  edit(n.id, {
                    roleIds: e.target.checked
                      ? [...n.roleIds, r.id]
                      : n.roleIds.filter((id) => id !== r.id),
                    needsReview: false,
                  })
                }
              />
              <i
                style={{
                  background: departments.find((d) => d.id === r.departmentId)
                    ?.color,
                }}
              />
              {r.title}
            </label>
          ))}
        </div>
      </details>
      {colors.length > 1 && (
        <div className="v3-color-stripe">
          {colors.map((color) => (
            <i key={color} style={{ background: color }} />
          ))}
        </div>
      )}
      {n.dependsOn.length > 1 && (
        <select
          className="nodrag v3-join"
          aria-label={`Join rule ${n.id}`}
          value={n.dependencyMode}
          onChange={(e) =>
            edit(n.id, { dependencyMode: e.target.value as "all" | "any" })
          }
        >
          <option value="all">After all connected steps</option>
          <option value="any">After either connected step</option>
        </select>
      )}
      {n.needsReview && (
        <button
          className="nodrag v3-review"
          onClick={() => edit(n.id, { needsReview: false })}
        >
          Owners changed · Mark reviewed
        </button>
      )}
      <button
        className="nodrag v3-delete"
        aria-label={`Remove step ${n.title}`}
        onClick={() => remove(n.id)}
      >
        ×
      </button>
      <button
        className="nodrag v3-after"
        aria-label={`Add step after ${n.title}`}
        onClick={() => add(n.id)}
      >
        +
      </button>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
const stepTypes = { step: StepCard };
export function ActivityChart({
  flow,
  roles,
  departments,
  onChange,
  onError,
}: {
  flow: OrgFlow;
  roles: OrgRole[];
  departments: Department[];
  onChange: (flow: OrgFlow) => void;
  onError: (s: string) => void;
}) {
  const commit = (f: OrgFlow) => {
    const error = graphError(f.nodes);
    if (error) {
      onError(error);
      return;
    }
    onChange(f);
  };
  const edit = (id: string, fields: Partial<FlowNode>) =>
    commit({
      ...flow,
      nodes: flow.nodes.map((n) => (n.id === id ? { ...n, ...fields } : n)),
    });
  const add = (after: string) => {
    const id = "step_" + crypto.randomUUID().slice(0, 8),
      parent = flow.nodes.find((n) => n.id === after);
    commit({
      ...flow,
      nodes: [
        ...flow.nodes.map((n) => ({
          ...n,
          dependsOn: n.dependsOn.map((x) => (x === after ? id : x)),
        })),
        {
          id,
          title: "New step",
          description: "",
          roleIds: parent?.roleIds ?? [],
          actionIds: [],
          dependsOn: after ? [after] : [],
          dependencyMode: "all",
          position: {
            x: (parent?.position.x ?? 0) + 300,
            y: parent?.position.y ?? 0,
          },
          basis: "Added by you",
        },
      ],
    });
  };
  const remove = (id: string) => {
    if (
      !window.confirm(
        "Remove this step? Its connections will be joined. The previous version remains in your records.",
      )
    )
      return;
    try {
      commit(removeStep(flow, id));
    } catch (e) {
      onError((e as Error).message);
    }
  };
  const prepared = useMemo(
    () =>
      flow.nodes.map((n) => ({
        id: n.id,
        type: "step" as const,
        deletable: false,
        position: n.position,
        data: { step: n, roles, departments, edit, add, remove },
      })),
    [flow, roles, departments],
  );
  const [view,setView]=useState<ReactFlowInstance<StepNode>|null>(null);
  const [nodes, setNodes] = useState<StepNode[]>(prepared);
  useEffect(() => setNodes(prepared), [prepared]);
  const edges: Edge[] = flow.nodes.flatMap((n) =>
    n.dependsOn.map((parent) => ({
      id: parent + "-" + n.id,
      source: parent,
      target: n.id,
      type: "default",
      style: { stroke: "#96a5b9", strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
      reconnectable: true,
    })),
  );
  const attach = (c: Connection) => {
    try {
      if (c.source && c.target) commit(connect(flow, c.source, c.target));
    } catch (e) {
      onError((e as Error).message);
    }
  };
  return (
    <>
      <div className="v3-chart-toolbar">
        <span>
          Connect dots to link steps. Select a line and press Delete to remove
          it.
        </span>
        <button onClick={()=>void view?.fitView()}>Overview</button><button onClick={()=>void view?.setViewport({x:30,y:70,zoom:1})}>Read steps</button><button onClick={() => add("")}>+ Add step</button>
        <button onClick={() => commit(layoutFlow(flow))}>Arrange</button>
      </div>
      <div
        className="v3-canvas v3-workflow"
        aria-label="Editable activity workflow"
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={stepTypes}
          onInit={setView}
          defaultViewport={{x:30,y:70,zoom:1}}
          minZoom={0.15}
          maxZoom={1.4}
          deleteKeyCode={["Backspace", "Delete"]}
          onNodesChange={(cs: NodeChange<StepNode>[]) =>
            setNodes((ns) => applyNodeChanges(cs, ns))
          }
          onNodeDragStop={(_, n) => edit(n.id, { position: n.position })}
          onConnect={attach}
          onReconnect={(old, c) => {
            try {
              const f = {
                ...flow,
                nodes: flow.nodes.map((n) =>
                  n.id === old.target
                    ? {
                        ...n,
                        dependsOn: n.dependsOn.filter(
                          (id) => id !== old.source,
                        ),
                      }
                    : n,
                ),
              };
              if (c.source && c.target) commit(connect(f, c.source, c.target));
            } catch (e) {
              onError((e as Error).message);
            }
          }}
          onEdgesDelete={(es) =>
            commit({
              ...flow,
              nodes: flow.nodes.map((n) => ({
                ...n,
                dependsOn: n.dependsOn.filter(
                  (id) => !es.some((e) => e.target === n.id && e.source === id),
                ),
              })),
            })
          }
        >
          <Background gap={24} color="#e2e6ed" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </>
  );
}
