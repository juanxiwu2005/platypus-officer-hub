import { useEffect, useMemo, useRef, useState } from "react";
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
  type EdgeChange,
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
import { track } from "./archive";
import {
  DEFAULT_TIMING,
  type TimingDefaults,
} from "../workspace/contracts/timing";
import { connect, graphError, removeStep } from "./graph";
type Link = { source: string; target: string };
function LinkTools({
  options,
  links,
  selected,
  add,
  remove,
  undo,
}: {
  options: { id: string; title: string }[];
  links: (Link & { id: string })[];
  selected: string[];
  add: (from: string, to: string) => void;
  remove: (links: Link[]) => void;
  undo?: () => void;
}) {
  const [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const selectedLinks = links.filter((link) => selected.includes(link.id));
  const title = (id: string) =>
    options.find((option) => option.id === id)?.title ?? id;
  return (
    <div className="v3-link-tools">
      {selectedLinks.length > 0 && (
        <div
          className="v3-selected-link"
          role="group"
          aria-label="Selected workflow link"
        >
          <span>
            {selectedLinks
              .map((link) => `${title(link.source)} → ${title(link.target)}`)
              .join("; ")}
          </span>
          <button onClick={() => remove(selectedLinks)}>
            Delete selected link{selectedLinks.length > 1 ? "s" : ""}
          </button>
        </div>
      )}
      {undo && <button onClick={undo}>Undo link deletion</button>}
      <details>
        <summary>Edit links with keyboard or touch</summary>
        <div className="v3-link-form">
          <label>
            From step
            <select
              aria-label="Link from"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            >
              <option value="">Choose a starting step</option>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            To step
            <select
              aria-label="Link to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            >
              <option value="">Choose the next step</option>
              {options
                .filter((option) => option.id !== from)
                .map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.title}
                  </option>
                ))}
            </select>
          </label>
          <button
            disabled={!from || !to || from === to}
            onClick={() => add(from, to)}
          >
            Add link
          </button>
        </div>
        <ul>
          {links.map((link) => (
            <li key={link.id}>
              <span>
                {title(link.source)} → {title(link.target)}
              </span>
              <button
                aria-label={`Delete link from ${title(link.source)} to ${title(link.target)}`}
                onClick={() => remove([link])}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
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
    <div
      className="v3-role"
      data-role-id={r.id}
      style={{ borderTopColor: dep?.color }}
    >
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
        deletable: false,
        position: r.position ?? { x: 0, y: 0 },
        data: { role: r, departments, roles, edit, remove: onRemove },
      })),
    [roles, departments],
  );
  const [view, setView] = useState<ReactFlowInstance<RoleNode> | null>(null);
  const [selectedEdges, setSelectedEdges] = useState<string[]>([]);
  const selectEdges = (changes: EdgeChange[]) =>
    setSelectedEdges((ids) => {
      const selected = new Set(ids);
      for (const c of changes)
        if (c.type === "select")
          c.selected ? selected.add(c.id) : selected.delete(c.id);
      return [...selected];
    });
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
      selected: selectedEdges.includes(`${r.parentRoleId}-${r.id}`),
    }));
  const [deletedLinks, setDeletedLinks] = useState<Link[]>([]);
  const removeLinks = (links: Link[]) => {
    const currentLinks = links.filter((link) =>
      roles.some(
        (role) => role.id === link.target && role.parentRoleId === link.source,
      ),
    );
    if (!currentLinks.length) return;
    onChange(
      roles.map((role) =>
        currentLinks.some((link) => link.target === role.id)
          ? {
              ...role,
              parentRoleId: null,
              manualFields: [
                ...new Set([...(role.manualFields ?? []), "parentRoleId"]),
              ],
            }
          : role,
      ),
    );
    setDeletedLinks(currentLinks);
    setSelectedEdges([]);
    track("team.links.removed", { links: currentLinks });
  };
  const undoLinks = () => {
    if (
      deletedLinks.some(
        (link) =>
          !roles.some((role) => role.id === link.source) ||
          !roles.some((role) => role.id === link.target) ||
          roles.some((role) => role.id === link.target && role.parentRoleId),
      )
    ) {
      onError(
        "A reporting line changed since deletion. Review the current team before restoring it.",
      );
      return;
    }
    const next = roles.map((role) => {
      const prior = deletedLinks.find((link) => link.target === role.id);
      return prior
        ? {
            ...role,
            parentRoleId: prior.source,
            manualFields: [
              ...new Set([...(role.manualFields ?? []), "parentRoleId"]),
            ],
          }
        : role;
    });
    const error = hierarchyError(next);
    if (error) {
      onError(error);
      return;
    }
    onChange(next);
    track("team.links.restored", { links: deletedLinks });
    setDeletedLinks([]);
  };
  const attach = (connection: Connection) => {
    if (connection.source && connection.target)
      edit(connection.target, { parentRoleId: connection.source });
  };
  return (
    <>
      <div className="v3-chart-toolbar">
        <button onClick={() => void view?.fitView()}>Overview</button>
        <button
          onClick={() => void view?.setViewport({ x: 30, y: 30, zoom: 1 })}
        >
          Read roles
        </button>
      </div>
      <LinkTools
        options={roles.map((role) => ({ id: role.id, title: role.title }))}
        links={edges}
        selected={selectedEdges}
        add={(from, to) => edit(to, { parentRoleId: from })}
        remove={removeLinks}
        undo={deletedLinks.length ? undoLinks : undefined}
      />
      <div className="v3-canvas" aria-label="Editable organization chart">
        <ReactFlow
          nodes={nodes.map((n) => ({
            ...n,
            data: {
              role: roles.find((r) => r.id === n.id) ?? n.data.role,
              departments,
              roles,
              edit,
              remove: onRemove,
            },
          }))}
          edges={edges}
          onEdgesChange={selectEdges}
          nodeTypes={roleTypes}
          onInit={setView}
          defaultViewport={{ x: 30, y: 30, zoom: 1 }}
          minZoom={0.2}
          maxZoom={1.3}
          nodesDraggable
          nodesConnectable
          deleteKeyCode={["Backspace", "Delete"]}
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
                  ? {
                      ...r,
                      parentRoleId: null,
                      manualFields: [
                        ...new Set([...(r.manualFields ?? []), "parentRoleId"]),
                      ],
                    }
                  : r.id === c.target
                    ? {
                        ...r,
                        parentRoleId: c.source,
                        manualFields: [
                          ...new Set([
                            ...(r.manualFields ?? []),
                            "parentRoleId",
                          ]),
                        ],
                      }
                    : r,
              );
              const e = hierarchyError(next);
              e ? onError(e) : onChange(next);
            } else attach(c);
          }}
          onEdgesDelete={removeLinks}
        >
          <Background gap={24} color="#e2e6ed" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </>
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
export function nextRolePosition(roles: OrgRole[]) {
  for (let i = 0; i <= roles.length * 4 + 4; i++) {
    const position = { x: (i % 4) * 300, y: Math.floor(i / 4) * 300 };
    if (
      roles.every(
        (r) =>
          !r.position ||
          Math.abs(r.position.x - position.x) >= 260 ||
          Math.abs(r.position.y - position.y) >= 280,
      )
    )
      return position;
  }
  return {
    x: 0,
    y: Math.max(0, ...roles.map((r) => r.position?.y ?? 0)) + 300,
  };
}
type StepData = {
  step: FlowNode;
  timingDefaults: TimingDefaults;
  roles: OrgRole[];
  departments: Department[];
  edit: (id: string, fields: Partial<FlowNode>) => void;
  add: (id: string) => void;
  remove: (id: string) => void;
};
type StepNode = Node<StepData, "step">;
function StepCard({ data }: NodeProps<StepNode>) {
  const {
    step: n,
    timingDefaults,
    roles,
    departments,
    edit,
    add,
    remove,
  } = data;
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
    <div
      className="v3-step"
      data-node-id={n.id}
      style={{ borderTopColor: colors[0] ?? "#617486" }}
    >
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
      {(n.timing || n.milestoneKey) && (
        <small className="v3-relative-target">
          {(() => {
            const fallback =
              n.milestoneKey === "items"
                ? timingDefaults.itemsWeeks * 7
                : n.milestoneKey === "quotes"
                  ? timingDefaults.quotesWeeks * 7
                  : timingDefaults.budgetWeeks * 7;
            const days = n.timing?.offsetDays ?? fallback;
            const unit =
              n.timing?.unit === "business" ? "working days" : "days";
            return `${Math.abs(days)} ${unit} ${days >= 0 ? "before" : "after"} activity${n.timing?.source === "manual" ? " · custom" : ""}`;
          })()}
        </small>
      )}
      {n.needsReview && (
        <small className="v3-relative-target">
          Affected by a recent team change
        </small>
      )}
      {colors.length > 1 && (
        <div className="v3-color-stripe">
          {colors.map((color) => (
            <i key={color} style={{ background: color }} />
          ))}
        </div>
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
  onSelect,
  timingDefaults = DEFAULT_TIMING,
}: {
  flow: OrgFlow;
  roles: OrgRole[];
  departments: Department[];
  onChange: (flow: OrgFlow) => void;
  onError: (s: string) => void;
  onSelect?: (id: string) => void;
  timingDefaults?: TimingDefaults;
}) {
  const commit = (f: OrgFlow) => {
    const error = graphError(f.nodes);
    if (error) {
      onError(error);
      return false;
    }
    onChange(f);
    return true;
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
        data: {
          step: n,
          timingDefaults,
          roles,
          departments,
          edit,
          add,
          remove,
        },
      })),
    [flow, roles, departments, timingDefaults],
  );
  const [view, setView] = useState<ReactFlowInstance<StepNode> | null>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const [selectedEdges, setSelectedEdges] = useState<string[]>([]);
  const selectEdges = (changes: EdgeChange[]) =>
    setSelectedEdges((ids) => {
      const selected = new Set(ids);
      for (const c of changes)
        if (c.type === "select")
          c.selected ? selected.add(c.id) : selected.delete(c.id);
      return [...selected];
    });
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
      selected: selectedEdges.includes(parent + "-" + n.id),
    })),
  );
  const [deletedLinks, setDeletedLinks] = useState<Link[]>([]);
  const removeLinks = (links: Link[]) => {
    const currentLinks = links.filter((link) =>
      flow.nodes.some(
        (node) =>
          node.id === link.target && node.dependsOn.includes(link.source),
      ),
    );
    if (!currentLinks.length) return;
    if (
      commit({
        ...flow,
        nodes: flow.nodes.map((node) => ({
          ...node,
          dependsOn: node.dependsOn.filter(
            (id) =>
              !currentLinks.some(
                (link) => link.target === node.id && link.source === id,
              ),
          ),
        })),
      })
    ) {
      setDeletedLinks(currentLinks);
      setSelectedEdges([]);
      track("workflow.links.removed", { links: currentLinks });
    }
  };
  const undoLinks = () => {
    try {
      let next = flow;
      for (const link of deletedLinks) {
        if (
          !next.nodes.some((node) => node.id === link.source) ||
          !next.nodes.some((node) => node.id === link.target)
        )
          throw new Error(
            "A step was removed after that link. Review the current workflow before restoring it.",
          );
        next = connect(next, link.source, link.target);
      }
      if (commit(next)) {
        track("workflow.links.restored", { links: deletedLinks });
        setDeletedLinks([]);
      }
    } catch (e) {
      onError((e as Error).message);
    }
  };
  const attach = (c: Connection) => {
    try {
      if (c.source && c.target) commit(connect(flow, c.source, c.target));
    } catch (e) {
      onError((e as Error).message);
    }
  };
  const timedSteps = flow.nodes
    .filter((node) => node.timing || node.milestoneKey)
    .map((node) => ({
      id: node.id,
      title: node.title,
      node,
      offset:
        node.timing?.offsetDays ??
        (node.milestoneKey === "items"
          ? timingDefaults.itemsWeeks * 7
          : node.milestoneKey === "quotes"
            ? timingDefaults.quotesWeeks * 7
            : timingDefaults.budgetWeeks * 7),
      unit: node.timing?.unit === "business" ? "working days" : "days",
    }));
  const timingEntries = timedSteps.length
    ? timedSteps
    : [
        {
          id: "default-items",
          title: "Confirm items",
          node: null,
          offset: timingDefaults.itemsWeeks * 7,
          unit: "days",
        },
        {
          id: "default-quotes",
          title: "Confirm quotes",
          node: null,
          offset: timingDefaults.quotesWeeks * 7,
          unit: "days",
        },
        {
          id: "default-budget",
          title: "Submit budget request",
          node: null,
          offset: timingDefaults.budgetWeeks * 7,
          unit: "days",
        },
      ];
  const timeline = [
    ...timingEntries,
    {
      id: "activity-day",
      title: "Activity day",
      node: null,
      offset: 0,
      unit: "days",
    },
  ].sort(
    (a, b) =>
      b.offset - a.offset ||
      (a.id === "activity-day" ? 1 : b.id === "activity-day" ? -1 : 0),
  );
  return (
    <>
      <section className="v3-timing-band" aria-label="Workflow relative timing">
        <h3>Relative timing</h3>
        {!flow.nodes.some((node) => node.milestoneKey === "budget_request") && (
          <p>
            Default funding timing · when funding is needed. Default targets do
            not add purchasing steps to this workflow.
          </p>
        )}
        <ol tabIndex={0} aria-label="Relative timing sequence">
          {timeline.map((entry) => (
            <li key={entry.id}>
              {entry.node ? (
                <button
                  onClick={() => {
                    onSelect?.(entry.node!.id);
                    canvas.current?.scrollIntoView({
                      block: "center",
                      behavior: "smooth",
                    });
                    void view?.fitView({
                      nodes: [{ id: entry.node!.id }],
                      minZoom: 0.8,
                      maxZoom: 1,
                      padding: 0.3,
                    });
                  }}
                >
                  <b>{entry.title}</b>
                  <small>
                    {Math.abs(entry.offset)} {entry.unit}{" "}
                    {entry.offset >= 0 ? "before" : "after"}
                  </small>
                </button>
              ) : (
                <span>
                  <b>{entry.title}</b>
                  {entry.id !== "activity-day" && (
                    <small>
                      {Math.abs(entry.offset)} {entry.unit} before · default
                    </small>
                  )}
                </span>
              )}
            </li>
          ))}
        </ol>
      </section>
      <div className="v3-chart-toolbar">
        <span>
          Connect dots to link steps. Select a line and press Delete to remove
          it.
        </span>
        <button onClick={() => void view?.fitView()}>Overview</button>
        <button
          onClick={() => void view?.setViewport({ x: 30, y: 70, zoom: 1 })}
        >
          Read steps
        </button>
        <button onClick={() => add("")}>+ Add step</button>
        <button onClick={() => commit(layoutFlow(flow))}>Arrange</button>
      </div>
      <LinkTools
        options={flow.nodes.map((node) => ({ id: node.id, title: node.title }))}
        links={edges}
        selected={selectedEdges}
        add={(source, target) =>
          attach({ source, target, sourceHandle: null, targetHandle: null })
        }
        remove={removeLinks}
        undo={deletedLinks.length ? undoLinks : undefined}
      />
      <div
        className="v3-canvas v3-workflow"
        ref={canvas}
        aria-label="Editable activity workflow"
      >
        <ReactFlow
          nodes={nodes.map((n) => ({
            ...n,
            data: {
              step: flow.nodes.find((step) => step.id === n.id) ?? n.data.step,
              timingDefaults,
              roles,
              departments,
              edit,
              add,
              remove,
            },
          }))}
          edges={edges}
          onEdgesChange={selectEdges}
          nodeTypes={stepTypes}
          onInit={setView}
          defaultViewport={{ x: 30, y: 70, zoom: 1 }}
          minZoom={0.15}
          maxZoom={1.4}
          deleteKeyCode={["Backspace", "Delete"]}
          onNodesChange={(cs: NodeChange<StepNode>[]) =>
            setNodes((ns) => applyNodeChanges(cs, ns))
          }
          onNodeDragStop={(_, n) => edit(n.id, { position: n.position })}
          onNodeClick={(_, n) => onSelect?.(n.id)}
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
          onEdgesDelete={removeLinks}
        >
          <Background gap={24} color="#e2e6ed" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </>
  );
}
