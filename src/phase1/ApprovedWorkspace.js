import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { Background, Controls, Handle, Position, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./approvedWorkspace.css";
function ApprovedStep({ data }) {
    return _jsxs("div", { className: "approved-step", children: [_jsx(Handle, { type: "target", position: Position.Left }), _jsx("strong", { children: data.title }), data.owners.length ? data.owners.map((owner, i) => _jsx("span", { style: { borderLeftColor: owner.color }, children: owner.title }, i)) : _jsx("span", { children: "Owner not assigned" }), _jsx(Handle, { type: "source", position: Position.Right })] });
}
const nodeTypes = { approvedStep: ApprovedStep };
export default function ApprovedWorkspace({ context }) {
    const location = useLocation();
    const activity = location.pathname.includes("/activity/");
    const board = location.pathname.endsWith("/executive");
    const { roles, departments, organization } = context.alwaysRead;
    const flow = context.onDemand.memberWorkflow;
    const nodes = useMemo(() => flow.nodes.map(n => ({
        id: n.id, type: "approvedStep", position: n.position,
        data: { title: n.title, owners: n.roleIds.map(id => {
                const role = roles.find(r => r.id === id);
                return { title: role.title, color: departments.find(d => d.id === role.departmentId).color };
            }) },
    })), [flow, roles, departments]);
    const edges = useMemo(() => flow.nodes.flatMap(n => n.dependsOn.map(id => ({ id: id + ":" + n.id, source: id, target: n.id, type: "default" }))), [flow]);
    return _jsxs("div", { className: "approved-workspace", "data-testid": "approved-workspace", "data-context-version": context.contextVersion, children: [_jsxs("div", { className: "approved-heading", children: [_jsxs("div", { children: [_jsxs("p", { className: "p1-eyebrow", children: ["CONFIRMED ORGANIZATION \u00B7 VERSION ", context.contextVersion] }), _jsx("h1", { children: activity ? (board ? "Board work" : flow.title) : organization.name }), _jsx("p", { children: activity ? organization.name : organization.mission })] }), _jsx(Link, { className: "p1-secondary", to: "/phase1/setup", children: "Edit organization" })] }), context.unresolved.length > 0 && _jsx("div", { className: "approved-notice", role: "note", children: context.unresolved.map((text, i) => _jsx("p", { children: text }, i)) }), _jsx("div", { className: "approved-departments", "aria-label": "Department colors", children: departments.map(d => _jsxs("span", { "data-department-id": d.id, style: { borderColor: d.color }, children: [_jsx("i", { style: { backgroundColor: d.color } }), d.name] }, d.id)) }), !activity ? _jsxs(_Fragment, { children: [_jsxs(Link, { className: "p1-activity-card", to: "/phase1/activity/member", children: [_jsx("span", { className: "p1-type", children: "MEMBER ACTIVITY" }), _jsx("h2", { children: flow.title }), _jsxs("p", { children: [flow.nodes.length, " steps \u00B7 Your confirmed team and workflow"] }), _jsx("span", { className: "p1-text-link", children: "View workflow \u2192" })] }), _jsxs("section", { "aria-label": "Confirmed team", children: [_jsx("h2", { children: "Your team" }), _jsx("div", { className: "approved-team", children: roles.map(r => {
                                    const dep = departments.find(d => d.id === r.departmentId);
                                    return _jsxs("article", { style: { borderTopColor: dep.color }, children: [_jsx("small", { children: dep.name }), _jsx("h3", { children: r.title }), r.description && _jsx("p", { children: r.description }), _jsx("ul", { children: r.responsibilities.map((duty, i) => _jsx("li", { children: duty }, i)) })] }, r.id);
                                }) })] })] }) : board ? _jsxs("section", { className: "approved-empty", children: [_jsx("h2", { children: "Start from the task" }), _jsx("p", { children: "Board tasks vary. No board workflow has been generated for this organization. Return to your member activity workflow or review your team." }), _jsx(Link, { to: "/phase1/activity/member", children: "View activity workflow \u2192" })] }) : _jsxs(_Fragment, { children: [_jsx("div", { className: "approved-graph", "aria-label": "Confirmed activity workflow", children: _jsxs(ReactFlow, { nodes: nodes, edges: edges, nodeTypes: nodeTypes, fitView: true, nodesDraggable: false, nodesConnectable: false, edgesReconnectable: false, elementsSelectable: false, minZoom: 0.15, maxZoom: 1.5, children: [_jsx(Background, {}), _jsx(Controls, { showInteractive: false })] }) }), _jsxs("section", { className: "approved-step-list", "aria-label": "Workflow steps", children: [_jsx("h2", { children: "Steps" }), _jsx("ol", { children: flow.nodes.map(n => _jsxs("li", { children: [_jsx("strong", { children: n.title }), _jsx("span", { children: n.roleIds.map(id => roles.find(r => r.id === id).title).join(" · ") || "Owner not assigned" }), n.dependsOn.length > 0 && _jsxs("small", { children: [n.dependencyMode === "any" ? "After either: " : "After: ", n.dependsOn.map(id => flow.nodes.find(x => x.id === id).title).join(" · ")] })] }, n.id)) })] })] })] });
}
