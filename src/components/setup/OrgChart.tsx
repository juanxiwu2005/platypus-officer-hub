import { orgChart } from "../../engine/orgChart"
import type { Role } from "../../data/types"

const CARD_W = 148, CARD_H = 52, GAP_X = 16, GAP_Y = 36

/**
 * A small organization chart worked out by the engine from each role's "reports to": the president at the top, a line from each
 * role up to the role it reports to. Titles only. It updates as the roles above are edited, so the president can check the setup.
 */
export function OrgChart({ roles }: { roles: Role[] }) {
  const chart = orgChart(roles)
  const x = (col: number) => col * (CARD_W + GAP_X)
  const y = (level: number) => level * (CARD_H + GAP_Y)
  const width = Math.max(CARD_W, chart.columns * (CARD_W + GAP_X) - GAP_X), height = chart.levels * (CARD_H + GAP_Y) - GAP_Y
  const at = new Map(chart.nodes.map(n => [n.id, n]))
  const bossName = (id: string) => chart.edges.find(e => e.to === id) && at.get(chart.edges.find(e => e.to === id)!.from)?.title
  return <section className="org-chart-wrap" data-testid="org-chart" aria-label="Organization chart">
    <h3 className="org-h">Organization chart</h3>
    <div className="org-scroll" tabIndex={0} role="group" aria-label="Organization chart, scrolls sideways">
      <div className="org-canvas" style={{ width, height }}>
        <svg className="org-lines" width={width} height={height} aria-hidden="true">
          {chart.edges.map(e => {
            const a = at.get(e.from)!, b = at.get(e.to)!
            const x1 = x(a.col) + CARD_W / 2, y1 = y(a.level) + CARD_H, x2 = x(b.col) + CARD_W / 2, y2 = y(b.level), mid = y1 + GAP_Y / 2
            return <path key={`${e.from}-${e.to}`} d={`M${x1} ${y1} V${mid} H${x2} V${y2}`} />
          })}
        </svg>
        {chart.nodes.map(n => <div key={n.id} className={`org-card${n.advisor ? " advisor" : ""}`} style={{ left: x(n.col), top: y(n.level), width: CARD_W, height: CARD_H }} title={n.title}><span>{n.title}</span></div>)}
      </div>
    </div>
    <ul className="sr-only">{chart.nodes.map(n => <li key={n.id}>{n.title}{bossName(n.id) ? `, reports to ${bossName(n.id)}` : n.advisor ? ", advisor" : ", top of the chart"}</li>)}</ul>
  </section>
}
