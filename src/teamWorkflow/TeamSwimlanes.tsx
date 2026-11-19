import { useId, type ReactNode } from "react"
import type { TeamLaneCompilation, TeamWorkflowIssue } from "./contracts"
import "./teamWorkflow.css"

/** Optional row shell, not a second workflow editor. The host provides station X positions and dependency paths. */
export function TeamSwimlanes<T>({ compilation, renderLane }: { compilation: TeamLaneCompilation<T>; renderLane: (lane: TeamLaneCompilation<T>["lanes"][number]) => ReactNode }) {
  const prefix = useId()
  // Refuse an invalid team list; otherwise duplicate team IDs could masquerade as valid lanes.
  const invalidTeams = compilation.issues.some(i => i.code === "invalid-id" || i.code === "empty-team-name")
  if (invalidTeams) return <IssueList issues={compilation.issues} />
  return <section className="tw-swimlanes" aria-label="Workflow by team">
    {compilation.lanes.map(lane => <section key={lane.team.id} className={`tw-lane tw-tone-${lane.team.tone ?? "teal"}`} aria-labelledby={`${prefix}-${lane.row}`} data-team-lane={lane.team.id}>
      <header><h3 id={`${prefix}-${lane.row}`}>{lane.team.name}</h3><span>{lane.steps.length} tasks</span></header>
      <div className="tw-lane-content">{lane.steps.length ? renderLane(lane) : <p className="tw-note">No tasks assigned yet.</p>}</div>
    </section>)}
    {/* This is an issue list, never an extra lane. N explicit teams must remain N rows. */}
    {!!compilation.issues.length && <IssueList issues={compilation.issues} />}
  </section>
}
function IssueList({ issues }: { issues: TeamWorkflowIssue[] }) {
  return <div className="tw-error" role="alert"><p>Resolve team assignments before using this template.</p><ul>{issues.slice(0, 5).map((i, index) => <li key={`${i.code}-${i.entityId ?? ""}-${index}`}>{i.entityId ? `${i.entityId}: ` : ""}{i.message}</li>)}</ul>{issues.length > 5 && <p>{issues.length - 5} more issues to resolve.</p>}</div>
}
