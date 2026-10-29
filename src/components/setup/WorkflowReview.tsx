import type { Role, StepTemplate } from "../../data/types"
import type { Refusal, WorkflowChange, WorkflowIssue } from "../../engine/workflow"
import { Info } from "../ui"

const verb = { add: "Added", update: "Changed", remove: "Removed" } as const

/** What the club's notes and files changed in the standard workflow, one line each, with where it came from and a way back. */
export function WorkflowChanges({ applied, refused, conflicts, summary, steps, roles, onRevert }: {
  applied: WorkflowChange[]; refused: Refusal[]; conflicts: { text: string; rules: string[] }[]; summary: string
  steps: StepTemplate[]; roles: Role[]; onRevert: (c: WorkflowChange) => void
}) {
  const name = (c: WorkflowChange) => steps.find(s => s.key === c.key)?.title ?? c.title
  const role = (id?: string | null) => roles.find(r => r.id === id)?.displayName
  const detail = (c: WorkflowChange) => {
    const p = c.patch, bits: string[] = []
    if (c.op === "add") { const after = (p.dependsOn ?? []).map(k => steps.find(s => s.key === k)?.title).filter(Boolean); if (after.length) bits.push(`after ${after.join(", ")}`) }
    if (p.estDays !== undefined) bits.push(`${p.estDays} day${p.estDays === 1 ? "" : "s"}`)
    if (p.phase) bits.push(`in ${p.phase}`)
    if (c.op === "update" && p.dependsOn) bits.push("new order")
    if (p.ownerRoleId) bits.push(`by ${role(p.ownerRoleId)}`)
    if (p.daysBefore !== undefined && p.daysBefore !== null) bits.push(`${p.daysBefore} days before the event`)
    return bits.join(" · ")
  }
  if (!applied.length && !refused.length && !conflicts.length) return null
  return <section className="wf-changes" data-testid="workflow-changes" aria-label="Changes from the standard workflow">
    <h3 className="org-h">From your planning notes and files {summary && <Info>{summary}</Info>}</h3>
    <ul className="wf-list">
      {applied.map(c => <li key={c.id} data-testid="wf-applied"><span className="tag-chip step-chip">{verb[c.op]}</span> <b>{name(c)}</b>{detail(c) && <span className="small muted"> · {detail(c)}</span>}{c.evidence && <span className="small muted wf-evidence"> “{c.evidence}”</span>}{" "}<button type="button" className="btn small" aria-label={`Undo: ${verb[c.op]} ${name(c)}`} onClick={() => onRevert(c)}>Undo</button></li>)}
      {refused.map(r => <li key={r.change.id} className="wf-refused" data-testid="wf-refused"><span className="tag-chip">Not applied</span> <b>{r.change.title}</b> <span className="small">· {r.reason}</span></li>)}
      {conflicts.map((c, i) => <li key={`c${i}`} className="wf-conflict" data-testid="wf-conflict"><span className="tag-chip">AI noticed</span> <span className="small">{c.text}{c.rules.length ? ` (${c.rules.join(", ")})` : ""}</span></li>)}
    </ul>
  </section>
}

/** The engine's check of the workflow against ASU rules. Red ones must be fixed before setup continues. */
export function WorkflowIssues({ issues }: { issues: WorkflowIssue[] }) {
  if (!issues.length) return <p className="small muted" data-testid="workflow-ok">No conflict with ASU rules found.</p>
  return <section className="wf-issues" data-testid="workflow-issues" aria-label="Checks against ASU rules">
    <ul className="wf-list">{issues.map((i, n) => <li key={n} className={i.level === "blocked" ? "wf-blocked" : "wf-warning"} data-testid={`wf-${i.level}`}><span className="tag-chip">{i.level === "blocked" ? "Fix this" : "Check this"}</span> <span className="small">{i.text}{i.rules?.length ? ` (${i.rules.join(", ")})` : ""}</span></li>)}</ul>
  </section>
}
