import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { Background, Controls, Handle, Position, ReactFlow, type Node, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { ApprovedContext } from "./approvedContext";
import "./approvedWorkspace.css";

type StepData = { title: string; owners: { title: string; color: string }[] };
type Step = Node<StepData, "approvedStep">;
function ApprovedStep({ data }: NodeProps<Step>) {
  return <div className="approved-step">
    <Handle type="target" position={Position.Left} />
    <strong>{data.title}</strong>
    {data.owners.length ? data.owners.map((owner, i) => <span key={i} style={{ borderLeftColor: owner.color }}>{owner.title}</span>) : <span>Owner not assigned</span>}
    <Handle type="source" position={Position.Right} />
  </div>;
}
const nodeTypes = { approvedStep: ApprovedStep };

export default function ApprovedWorkspace({ context }: { context: ApprovedContext }) {
  const location = useLocation();
  const activity = location.pathname.includes("/activity/");
  const board = location.pathname.endsWith("/executive");
  const { roles, departments, organization } = context.alwaysRead;
  const flow = context.onDemand.memberWorkflow;
  const nodes: Step[] = useMemo(() => flow.nodes.map(n => ({
    id: n.id, type: "approvedStep", position: n.position,
    data: { title: n.title, owners: n.roleIds.map(id => {
      const role = roles.find(r => r.id === id)!;
      return { title: role.title, color: departments.find(d => d.id === role.departmentId)!.color };
    }) },
  })), [flow, roles, departments]);
  const edges = useMemo(() => flow.nodes.flatMap(n => n.dependsOn.map(id => ({ id: id + ":" + n.id, source: id, target: n.id, type: "default" }))), [flow]);
  return <div className="approved-workspace" data-testid="approved-workspace" data-context-version={context.contextVersion}>
    <div className="approved-heading">
      <div><p className="p1-eyebrow">CONFIRMED ORGANIZATION · VERSION {context.contextVersion}</p><h1>{activity ? (board ? "Board work" : flow.title) : organization.name}</h1><p>{activity ? organization.name : organization.mission}</p></div>
      <Link className="p1-secondary" to="/phase1/setup">Edit organization</Link>
    </div>
    {context.unresolved.length > 0 && <div className="approved-notice" role="note">{context.unresolved.map((text, i) => <p key={i}>{text}</p>)}</div>}
    <div className="approved-departments" aria-label="Department colors">{departments.map(d => <span key={d.id} data-department-id={d.id} style={{ borderColor: d.color }}><i style={{ backgroundColor: d.color }} />{d.name}</span>)}</div>
    {!activity ? <>
      <Link className="p1-activity-card" to="/phase1/activity/member"><span className="p1-type">MEMBER ACTIVITY</span><h2>{flow.title}</h2><p>{flow.nodes.length} steps · Your confirmed team and workflow</p><span className="p1-text-link">View workflow →</span></Link>
      <section aria-label="Confirmed team"><h2>Your team</h2><div className="approved-team">{roles.map(r => {
        const dep = departments.find(d => d.id === r.departmentId)!;
        return <article key={r.id} style={{ borderTopColor: dep.color }}><small>{dep.name}</small><h3>{r.title}</h3>{r.description && <p>{r.description}</p>}<ul>{r.responsibilities.map((duty, i) => <li key={i}>{duty}</li>)}</ul></article>;
      })}</div></section>
    </> : board ? <section className="approved-empty"><h2>Start from the task</h2><p>Board tasks vary. No board workflow has been generated for this organization. Return to your member activity workflow or review your team.</p><Link to="/phase1/activity/member">View activity workflow →</Link></section> : <>
      <div className="approved-graph" aria-label="Confirmed activity workflow"><ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView nodesDraggable={false} nodesConnectable={false} edgesReconnectable={false} elementsSelectable={false} minZoom={0.15} maxZoom={1.5}><Background /><Controls showInteractive={false} /></ReactFlow></div>
      <section className="approved-step-list" aria-label="Workflow steps"><h2>Steps</h2><ol>{flow.nodes.map(n => <li key={n.id}><strong>{n.title}</strong><span>{n.roleIds.map(id => roles.find(r => r.id === id)!.title).join(" · ") || "Owner not assigned"}</span>{n.dependsOn.length > 0 && <small>{n.dependencyMode === "any" ? "After either: " : "After: "}{n.dependsOn.map(id => flow.nodes.find(x => x.id === id)!.title).join(" · ")}</small>}</li>)}</ol></section>
    </>}
  </div>;
}
