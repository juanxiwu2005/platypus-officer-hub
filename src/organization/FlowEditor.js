import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { ReactFlow, Background, Controls, Handle, Position, applyNodeChanges, } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { arrangeRelative, connect, graphError, removeStep } from "./graph";
import "./organization.css";
function StepCard({ data }) {
    return (_jsxs("div", { className: "os-flow-node", children: [_jsx(Handle, { type: "target", position: Position.Left }), _jsx("b", { children: data.title }), _jsx("span", { children: data.people || "Choose responsible roles" }), _jsxs("div", { className: "os-node-tip", children: [_jsx("strong", { children: data.title }), _jsx("p", { children: data.description }), _jsx("p", { children: data.people })] }), _jsx(Handle, { type: "source", position: Position.Right })] }));
}
const nodeTypes = { organizationStep: StepCard };
export default function FlowEditor({ flow, roles, onChange, disabled = false, }) {
    const [selected, setSelected] = useState(null), [error, setError] = useState(""), [adding, setAdding] = useState(false), [title, setTitle] = useState(""), [relation, setRelation] = useState("");
    const nodes = useMemo(() => flow.nodes.map((n) => ({
        id: n.id,
        type: "organizationStep",
        position: n.position,
        data: {
            title: n.title,
            people: n.roleIds
                .map((id) => roles.find((r) => r.id === id)?.title ?? "Unknown role")
                .join(" + "),
            description: n.description,
            basis: n.basis,
        },
        selected: n.id === selected,
    })), [flow, roles, selected]);
    const edges = flow.nodes.flatMap((n) => n.dependsOn.map((from) => ({
        id: `${from}-${n.id}`,
        source: from,
        target: n.id,
        type: "smoothstep",
        style: { stroke: "#7990aa", strokeWidth: 1.5 },
    })));
    const current = flow.nodes.find((n) => n.id === selected);
    const commit = (next) => {
        const e = graphError(next.nodes);
        if (e) {
            setError(e);
            return;
        }
        setError("");
        onChange(next);
    };
    const patch = (p) => {
        if (current)
            commit({
                ...flow,
                nodes: flow.nodes.map((n) => n.id === current.id ? { ...n, ...p } : n),
            });
    };
    const add = () => {
        if (!title.trim())
            return;
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
    const changed = (changes) => {
        if (disabled)
            return;
        const positions = changes.filter((c) => c.type === "position");
        if (!positions.length)
            return;
        const next = applyNodeChanges(positions, nodes);
        commit({
            ...flow,
            nodes: flow.nodes.map((n) => ({
                ...n,
                position: next.find((x) => x.id === n.id)?.position ?? n.position,
            })),
        });
    };
    return (_jsxs("div", { className: "os-flow-editor", children: [_jsxs("div", { className: "os-flow-header", children: [_jsxs("div", { children: [_jsx("h2", { children: flow.title }), _jsx("p", { children: flow.explanation })] }), _jsx("button", { type: "button", disabled: disabled, onClick: () => setAdding(!adding), children: "+ Add step" })] }), _jsx("div", { className: "os-flow-canvas", "aria-label": "Editable activity workflow", onContextMenu: (e) => {
                    e.preventDefault();
                    if (!disabled)
                        setAdding(true);
                }, children: _jsxs(ReactFlow, { nodes: nodes, edges: edges, nodeTypes: nodeTypes, onNodesChange: changed, onNodeClick: (_, n) => setSelected(n.id), onConnect: (c) => {
                        if (disabled || !c.source || !c.target)
                            return;
                        try {
                            commit(connect(flow, c.source, c.target));
                        }
                        catch (e) {
                            setError(e.message);
                        }
                    }, fitView: true, fitViewOptions: {
                        padding: 0.15,
                        nodes: flow.nodes.slice(0, 3).map((n) => ({ id: n.id })),
                        minZoom: 0.75,
                        maxZoom: 1,
                    }, minZoom: 0.1, maxZoom: 1.6, nodesDraggable: !disabled, nodesConnectable: !disabled, deleteKeyCode: null, children: [_jsx(Background, { color: "#dae2eb", gap: 22 }), _jsx(Controls, { showInteractive: false })] }) }), _jsx("div", { className: "os-mobile-flow", children: flow.nodes.map((n, i) => (_jsxs("button", { type: "button", onClick: () => setSelected(n.id), className: selected === n.id ? "selected" : "", children: [_jsx("small", { children: String(i + 1).padStart(2, "0") }), _jsxs("div", { children: [_jsx("b", { children: n.title }), _jsx("span", { children: n.roleIds
                                        .map((id) => roles.find((r) => r.id === id)?.title)
                                        .join(" + ") || "Choose responsible roles" }), n.dependsOn.length > 1 && (_jsxs("em", { children: ["After", " ", n.dependsOn
                                            .map((id) => flow.nodes.find((x) => x.id === id)?.title)
                                            .join(" + ")] }))] })] }, n.id))) }), _jsx("p", { className: "os-hint", children: "Drag empty space to follow the chain. Drag steps to arrange the view. Connect dots to change the sequence, or select a step to edit it." }), error && (_jsx("p", { className: "os-error", role: "alert", children: error })), adding && (_jsxs("form", { className: "os-add-step", onSubmit: (e) => {
                    e.preventDefault();
                    add();
                }, children: [_jsxs("label", { children: ["New step title", _jsx("input", { value: title, maxLength: 180, onChange: (e) => setTitle(e.target.value) })] }), _jsx("button", { type: "submit", disabled: !title.trim() || disabled, children: "Add to workflow" }), _jsx("button", { type: "button", onClick: () => setAdding(false), children: "Cancel" })] })), current && (_jsxs("section", { className: "os-step-inspector", "aria-label": "Selected workflow step", children: [_jsxs("div", { className: "os-section-heading", children: [_jsx("h3", { children: "Edit this step" }), _jsx("button", { type: "button", onClick: () => setSelected(null), children: "Close" })] }), _jsxs("label", { children: ["Step title", _jsx("input", { value: current.title, maxLength: 180, disabled: disabled, onChange: (e) => patch({ title: e.target.value }) })] }), _jsxs("label", { children: ["What needs to happen", _jsx("textarea", { value: current.description, maxLength: 500, disabled: disabled, onChange: (e) => patch({ description: e.target.value }) })] }), _jsxs("fieldset", { children: [_jsx("legend", { children: "Who does this work?" }), _jsx("div", { className: "os-checkboxes", children: roles.map((r) => (_jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: current.roleIds.includes(r.id), disabled: disabled, onChange: (e) => patch({
                                                roleIds: e.target.checked
                                                    ? [...current.roleIds, r.id]
                                                    : current.roleIds.filter((x) => x !== r.id),
                                            }) }), _jsx("span", { children: r.title })] }, r.id))) })] }), _jsxs("details", { children: [_jsx("summary", { children: "Sequence & parallel work" }), _jsxs("fieldset", { children: [_jsx("legend", { children: "This step follows" }), flow.nodes
                                        .filter((n) => n.id !== current.id)
                                        .map((n) => (_jsxs("label", { className: "os-checkline", children: [_jsx("input", { type: "checkbox", checked: current.dependsOn.includes(n.id), disabled: disabled, onChange: (e) => patch({
                                                    dependsOn: e.target.checked
                                                        ? [...current.dependsOn, n.id]
                                                        : current.dependsOn.filter((x) => x !== n.id),
                                                }) }), n.title] }, n.id)))] }), _jsxs("div", { className: "os-inline", children: [_jsxs("label", { children: ["Arrange relative to", _jsxs("select", { value: relation, onChange: (e) => setRelation(e.target.value), children: [_jsx("option", { value: "", children: "Choose a step" }), flow.nodes
                                                        .filter((n) => n.id !== current.id)
                                                        .map((n) => (_jsx("option", { value: n.id, children: n.title }, n.id)))] })] }), _jsx("button", { disabled: !relation || disabled, onClick: () => {
                                            try {
                                                commit(arrangeRelative(flow, current.id, relation, "before"));
                                            }
                                            catch (e) {
                                                setError(e.message);
                                            }
                                        }, children: "Move before" }), _jsx("button", { disabled: !relation || disabled, onClick: () => {
                                            try {
                                                commit(arrangeRelative(flow, current.id, relation, "parallel"));
                                            }
                                            catch (e) {
                                                setError(e.message);
                                            }
                                        }, children: "Run in parallel" })] })] }), _jsx("p", { className: "os-hint", children: current.basis }), _jsx("button", { type: "button", className: "os-danger", disabled: disabled || flow.nodes.length < 2, onClick: () => {
                            commit(removeStep(flow, current.id));
                            setSelected(null);
                        }, children: "Remove step" })] }))] }));
}
