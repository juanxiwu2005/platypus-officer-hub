import { workflowChart, type WorkflowIssue } from "../../engine/workflow"
import { roleLabels } from "../../data/structure"
import { PHASE_LABEL } from "../../engine/playbooks"
import type { Phase, Role, StepTemplate } from "../../data/types"

const W = 176, H = 72, GX = 52, GY = 12

/**
 * The workflow as a chart, left to right in the order the work happens; a line joins a step to the steps it waits for. Each card
 * shows the step and who does it (short role names, the area first). The president looks here first and edits a step only when the
 * chart looks wrong: click a card to jump to that step in the list below. Cards with a problem from the engine's check are outlined.
 */
export function WorkflowChart({ steps, roles, issues, selected, onSelect }: { steps: StepTemplate[]; roles: Role[]; issues: WorkflowIssue[]; selected: string | null; onSelect: (key: string) => void }) {
  const chart = workflowChart(steps, roles), label = roleLabels(roles)
  const x = (level: number) => level * (W + GX), y = (row: number) => row * (H + GY)
  const width = chart.levels * (W + GX) - GX, height = chart.rows * (H + GY) - GY
  const at = new Map(chart.nodes.map(n => [n.key, n]))
  const bad = new Map(issues.filter(i => i.key).map(i => [i.key!, i.level]))
  const phases = [...new Set(chart.nodes.map(n => n.phase))] as Phase[]
  return <section className="wf-chart-wrap" data-testid="workflow-chart" aria-label="Event workflow chart">
    <div className="wf-legend small muted" aria-hidden="true">{phases.map(p => <span key={p}><i className={`wf-dot p-${p}`} />{PHASE_LABEL[p].replace(/ \(.*\)/, "")}</span>)}<span>Reads left to right. A line means “waits for”.</span></div>
    <div className="wf-scroll" tabIndex={0} role="group" aria-label="Event workflow chart, scrolls sideways">
      <div className="wf-canvas" style={{ width, height }}>
        <svg className="wf-lines" width={width} height={height} aria-hidden="true">
          {chart.edges.map(e => {
            const a = at.get(e.from)!, b = at.get(e.to)!
            const x1 = x(a.level) + W, y1 = y(a.row) + H / 2, x2 = x(b.level), y2 = y(b.row) + H / 2, c = Math.max(20, (x2 - x1) / 2)
            return <path key={`${e.from}-${e.to}`} d={`M${x1} ${y1} C${x1 + c} ${y1} ${x2 - c} ${y2} ${x2} ${y2}`} />
          })}
        </svg>
        {chart.nodes.map(n => {
          const owner = n.ownerRoleId ? label.get(n.ownerRoleId) : null
          const waits = (steps.find(s => s.key === n.key)?.dependsOn ?? []).map(k => at.get(k)?.title).filter(Boolean)
          return <button key={n.key} type="button" className={`wf-card p-${n.phase}${selected === n.key ? " is-selected" : ""}${bad.get(n.key) ? ` is-${bad.get(n.key)}` : ""}`} style={{ left: x(n.level), top: y(n.row), width: W, height: H }}
            data-testid={`wf-card-${n.key}`} onClick={() => onSelect(n.key)}
            aria-label={`${n.title}. ${owner ? `Done by ${owner}.` : "No owner."} ${waits.length ? `Waits for ${waits.join(", ")}.` : "Starts first."}${n.locked ? " Required by ASU rules." : ""}${bad.get(n.key) ? " Has a problem." : ""}`} title={n.title}>
            <span className="wf-card-title">{n.title}</span>
            <span className="wf-card-owner">{owner ?? "No owner"}{n.locked ? " · ASU" : ""}</span>
          </button>
        })}
      </div>
    </div>
  </section>
}
