import { useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  type NodeProps,
  type Node,
  type NodeChange,
  applyNodeChanges,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { OrgFlow, OrgRole, FlowNode } from "./schema";
import { arrangeRelative, connect, graphError, removeStep } from "./graph";
import "./organization.css";
type Data = {
  title: string;
  people: string;
  description: string;
  basis: string;
};
function StepCard({ data }: NodeProps<Node<Data>>) {
  return (
    <div className="os-flow-node">
      <Handle type="target" position={Position.Left} />
      <b>{data.title}</b>
      <span>{data.people || "Choose responsible roles"}</span>
      <div className="os-node-tip">
        <strong>{data.title}</strong>
        <p>{data.description}</p>
        <p>{data.people}</p>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
const nodeTypes = { organizationStep: StepCard };
export default function FlowEditor({
  flow,
  roles,
  onChange,
  disabled = false,
}: {
  flow: OrgFlow;
  roles: OrgRole[];
  onChange: (f: OrgFlow) => void;
  disabled?: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null),
    [error, setError] = useState(""),
    [adding, setAdding] = useState(false),
    [title, setTitle] = useState(""),
    [relation, setRelation] = useState("");
  const nodes = useMemo(
    () =>
      flow.nodes.map((n) => ({
        id: n.id,
        type: "organizationStep",
        position: n.position,
        data: {
          title: n.title,
          people: n.roleIds
            .map(
              (id) => roles.find((r) => r.id === id)?.title ?? "Unknown role",
            )
            .join(" + "),
          description: n.description,
          basis: n.basis,
        },
        selected: n.id === selected,
      })),
    [flow, roles, selected],
  );
  const edges = flow.nodes.flatMap((n) =>
    n.dependsOn.map((from) => ({
      id: `${from}-${n.id}`,
      source: from,
      target: n.id,
      type: "smoothstep",
      style: { stroke: "#7990aa", strokeWidth: 1.5 },
    })),
  );
  const current = flow.nodes.find((n) => n.id === selected);
  const commit = (next: OrgFlow) => {
    const e = graphError(next.nodes);
    if (e) {
      setError(e);
      return;
    }
    setError("");
    onChange(next);
  };
  const patch = (p: Partial<FlowNode>) => {
    if (current)
      commit({
        ...flow,
        nodes: flow.nodes.map((n) =>
          n.id === current.id ? { ...n, ...p } : n,
        ),
      });
  };
  const add = () => {
    if (!title.trim()) return;
    const id = crypto.randomUUID();
    const last = flow.nodes.at(-1);
    commit({
      ...flow,
      nodes: [
        ...flow.nodes,
        {
          id,
          title: title.trim(),
          description: "Describe what needs to happen.",
          actionIds: [],
          roleIds: [],
          dependsOn: last ? [last.id] : [],
          dependencyMode: "all",
          position: {
            x: (last?.position.x ?? 0) + 290,
            y: last?.position.y ?? 0,
          },
          basis: "Added by the president.",
        },
      ],
    });
    setSelected(id);
    setAdding(false);
    setTitle("");
  };
  const changed = (changes: NodeChange<Node<Data>>[]) => {
    if (disabled) return;
    const positions = changes.filter((c) => c.type === "position");
    if (!positions.length) return;
    const next = applyNodeChanges(positions, nodes);
    commit({
      ...flow,
      nodes: flow.nodes.map((n) => ({
        ...n,
        position: next.find((x) => x.id === n.id)?.position ?? n.position,
      })),
    });
  };
  return (
    <div className="os-flow-editor">
      <div className="os-flow-header">
        <div>
          <h2>{flow.title}</h2>
          <p>{flow.explanation}</p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setAdding(!adding)}
        >
          + Add step
        </button>
      </div>
      <div
        className="os-flow-canvas"
        aria-label="Editable activity workflow"
        onContextMenu={(e) => {
          e.preventDefault();
          if (!disabled) setAdding(true);
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={changed}
          onNodeClick={(_, n) => setSelected(n.id)}
          onConnect={(c) => {
            if (disabled || !c.source || !c.target) return;
            try {
              commit(connect(flow, c.source, c.target));
            } catch (e) {
              setError((e as Error).message);
            }
          }}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.1}
          maxZoom={1.6}
          nodesDraggable={!disabled}
          nodesConnectable={!disabled}
          deleteKeyCode={null}
        >
          <Background color="#dae2eb" gap={22} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <div className="os-mobile-flow">
        {flow.nodes.map((n, i) => (
          <button
            type="button"
            key={n.id}
            onClick={() => setSelected(n.id)}
            className={selected === n.id ? "selected" : ""}
          >
            <small>{String(i + 1).padStart(2, "0")}</small>
            <div>
              <b>{n.title}</b>
              <span>
                {n.roleIds
                  .map((id) => roles.find((r) => r.id === id)?.title)
                  .join(" + ") || "Choose responsible roles"}
              </span>
              {n.dependsOn.length > 1 && (
                <em>
                  After{" "}
                  {n.dependsOn
                    .map((id) => flow.nodes.find((x) => x.id === id)?.title)
                    .join(" + ")}
                </em>
              )}
            </div>
          </button>
        ))}
      </div>
      <p className="os-hint">
        Drag steps to arrange the view. Connect dots to change the sequence, or
        select a step to edit it.
      </p>
      {error && (
        <p className="os-error" role="alert">
          {error}
        </p>
      )}
      {adding && (
        <form
          className="os-add-step"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <label>
            New step title
            <input
              value={title}
              maxLength={180}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <button type="submit" disabled={!title.trim() || disabled}>
            Add to workflow
          </button>
          <button type="button" onClick={() => setAdding(false)}>
            Cancel
          </button>
        </form>
      )}
      {current && (
        <section
          className="os-step-inspector"
          aria-label="Selected workflow step"
        >
          <div className="os-section-heading">
            <h3>Edit this step</h3>
            <button type="button" onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
          <label>
            Step title
            <input
              value={current.title}
              maxLength={180}
              disabled={disabled}
              onChange={(e) => patch({ title: e.target.value })}
            />
          </label>
          <label>
            What needs to happen
            <textarea
              value={current.description}
              maxLength={500}
              disabled={disabled}
              onChange={(e) => patch({ description: e.target.value })}
            />
          </label>
          <fieldset>
            <legend>Who does this work?</legend>
            <div className="os-checkboxes">
              {roles.map((r) => (
                <label key={r.id}>
                  <input
                    type="checkbox"
                    checked={current.roleIds.includes(r.id)}
                    disabled={disabled}
                    onChange={(e) =>
                      patch({
                        roleIds: e.target.checked
                          ? [...current.roleIds, r.id]
                          : current.roleIds.filter((x) => x !== r.id),
                      })
                    }
                  />
                  <span>{r.title}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <details>
            <summary>Sequence & parallel work</summary>
            <fieldset>
              <legend>This step follows</legend>
              {flow.nodes
                .filter((n) => n.id !== current.id)
                .map((n) => (
                  <label className="os-checkline" key={n.id}>
                    <input
                      type="checkbox"
                      checked={current.dependsOn.includes(n.id)}
                      disabled={disabled}
                      onChange={(e) =>
                        patch({
                          dependsOn: e.target.checked
                            ? [...current.dependsOn, n.id]
                            : current.dependsOn.filter((x) => x !== n.id),
                        })
                      }
                    />
                    {n.title}
                  </label>
                ))}
            </fieldset>
            <div className="os-inline">
              <label>
                Arrange relative to
                <select
                  value={relation}
                  onChange={(e) => setRelation(e.target.value)}
                >
                  <option value="">Choose a step</option>
                  {flow.nodes
                    .filter((n) => n.id !== current.id)
                    .map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.title}
                      </option>
                    ))}
                </select>
              </label>
              <button
                disabled={!relation || disabled}
                onClick={() => {
                  try {
                    commit(
                      arrangeRelative(flow, current.id, relation, "before"),
                    );
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Move before
              </button>
              <button
                disabled={!relation || disabled}
                onClick={() => {
                  try {
                    commit(
                      arrangeRelative(flow, current.id, relation, "parallel"),
                    );
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Run in parallel
              </button>
            </div>
          </details>
          <p className="os-hint">{current.basis}</p>
          <button
            type="button"
            className="os-danger"
            disabled={disabled || flow.nodes.length < 2}
            onClick={() => {
              commit(removeStep(flow, current.id));
              setSelected(null);
            }}
          >
            Remove step
          </button>
        </section>
      )}
    </div>
  );
}
