import { useCallback, useLayoutEffect, useRef, useState } from "react"
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
  const bossName = (id: string) => { const e = chart.edges.find(x => x.to === id && !x.kind); return e ? at.get(e.from)?.title : undefined }
  // The top role (level 0, not an advisor) is where the chart is read from: on a narrow screen it opens with that box in the middle.
  const top = chart.nodes.find(n => n.level === 0 && !n.advisor) ?? chart.nodes[0]
  const topCenter = top ? x(top.col) + CARD_W / 2 : 0
  const scroller = useRef<HTMLDivElement>(null)
  const touched = useRef(false)   // once the person scrolls the chart, editing the roles above never moves it again
  const [more, setMore] = useState({ left: false, right: false })
  const measure = useCallback(() => {
    const el = scroller.current
    if (!el) return
    const left = el.scrollLeft > 1, right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
    setMore(m => m.left === left && m.right === right ? m : { left, right })
  }, [])
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    if (!touched.current && el.scrollWidth > el.clientWidth) {
      const pad = parseFloat(getComputedStyle(el).paddingLeft) || 0
      const canvasLeft = Math.max(0, (el.scrollWidth - pad * 2 - width) / 2)   // the canvas is centred when it is narrower than the box
      el.scrollLeft = Math.max(0, pad + canvasLeft + topCenter - el.clientWidth / 2)
    }
    measure()
  }, [topCenter, width, measure])
  useLayoutEffect(() => {
    if (typeof ResizeObserver === "undefined" || !scroller.current) return
    const watch = new ResizeObserver(measure)
    watch.observe(scroller.current)
    return () => watch.disconnect()
  }, [measure])
  const touch = () => { touched.current = true }
  return <section className="org-chart-wrap" data-testid="org-chart" aria-label="Organization chart">
    <h3 className="org-h">Organization chart</h3>
    <div className={`org-fade${more.left ? " more-left" : ""}${more.right ? " more-right" : ""}`} data-testid="org-fade">
    <div ref={scroller} className="org-scroll" tabIndex={0} role="group" aria-label="Organization chart, scrolls sideways" onScroll={measure} onPointerDown={touch} onWheel={touch} onKeyDown={touch} onTouchStart={touch}>
      <div className="org-canvas" style={{ width, height }}>
        <svg className="org-lines" width={width} height={height} aria-hidden="true">
          {chart.edges.map(e => {
            const a = at.get(e.from)!, b = at.get(e.to)!
            if (e.kind === "advisory") {
              const [l, r] = a.col <= b.col ? [a, b] : [b, a], ym = y(a.level) + CARD_H / 2
              return <path key={`${e.from}-${e.to}`} className="advisory" d={`M${x(l.col) + CARD_W} ${ym} H${x(r.col)}`} />
            }
            const x1 = x(a.col) + CARD_W / 2, y1 = y(a.level) + CARD_H, x2 = x(b.col) + CARD_W / 2, y2 = y(b.level), mid = y1 + GAP_Y / 2
            return <path key={`${e.from}-${e.to}`} d={`M${x1} ${y1} V${mid} H${x2} V${y2}`} />
          })}
        </svg>
        {chart.nodes.map(n => <div key={n.id} className={`org-card${n.advisor ? " advisor" : ""}`} style={{ left: x(n.col), top: y(n.level), width: CARD_W, height: CARD_H }} title={n.title}><span>{n.title}</span></div>)}
      </div>
    </div>
    </div>
    <ul className="sr-only">{chart.nodes.map(n => <li key={n.id}>{n.title}{bossName(n.id) ? `, reports to ${bossName(n.id)}` : n.advisor ? ", advisor, shown beside the president with a dashed line" : ", top of the chart"}</li>)}</ul>
  </section>
}
