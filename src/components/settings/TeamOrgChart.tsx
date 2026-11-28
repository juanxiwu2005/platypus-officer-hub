import { useLayoutEffect, useMemo, useRef } from "react"
import type { Person, Role, WorkflowTeam } from "../../data/types"
import { TEAM_CHART, teamOrgChart, zoneLabel } from "../../engine/teamOrgChart"
import { bossTitle, holderOf } from "../../data/roleEdits"

export type RolesSelection = { kind: "role"; id: string } | { kind: "team"; id: string }

export interface TeamOrgChartProps {
  roles: Role[]; people: Person[]; teams: readonly WorkflowTeam[]; roleTeams: Readonly<Record<string, string>>; stepCounts: Readonly<Record<string, number>>
  selected: RolesSelection; onSelect: (selection: RolesSelection) => void
}

/**
 * Settings → Roles & teams, Chart view: reporting lines (as in the organization chart) with each workflow team drawn as a coloured
 * area around its roles, in the same colours as the Settings → Workflow canvas (`wfx-tone-*`, src/styles/fb-10-team-tones.css).
 * Selecting a role or a team's label opens it in the inspector beside the chart. The chart scrolls sideways inside its box.
 */
export function TeamOrgChart({ roles, people, teams, roleTeams, stepCounts, selected, onSelect }: TeamOrgChartProps) {
  const chart = useMemo(() => teamOrgChart(roles, teams, roleTeams, stepCounts), [roles, teams, roleTeams, stepCounts])
  const C = TEAM_CHART
  const officer = (role: Role) => holderOf(people, role)?.name.trim() || "Open position"
  const teamName = (id: string | null) => teams.find(team => team.id === id)?.name
  const scroller = useRef<HTMLDivElement>(null), touched = useRef(false)
  // On a narrow screen the chart opens with the top role in the middle, until the person scrolls it themselves.
  const top = chart.nodes.find(n => n.level === 0 && !n.advisor) ?? chart.nodes[0]
  const topCenter = top ? top.x + C.cardW / 2 : 0
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el || touched.current || el.scrollWidth <= el.clientWidth) return
    const pad = parseFloat(getComputedStyle(el).paddingLeft) || 0
    el.scrollLeft = Math.max(0, pad + topCenter - el.clientWidth / 2)
  }, [topCenter, chart.width])
  const touch = () => { touched.current = true }
  const byId = new Map(roles.map(r => [r.id, r]))
  return <section className="rt-chart" data-testid="org-chart" aria-label="Roles and teams chart">
    <div ref={scroller} className="rt-scroll" tabIndex={0} role="group" aria-label="Organization chart, scrolls sideways" onPointerDown={touch} onWheel={touch} onKeyDown={touch} onTouchStart={touch}>
      <div className="rt-canvas" style={{ width: chart.width, height: chart.height }}>
        <svg className="rt-lines" width={chart.width} height={chart.height} aria-hidden="true">
          {chart.edges.map(e => <path key={`${e.from}-${e.to}`} className={e.kind === "advisory" ? "advisory" : undefined} d={e.d} />)}
        </svg>
        {chart.zones.map(z => {
          const label = zoneLabel(z), pressed = selected.kind === "team" && selected.id === z.teamId
          return <div key={z.key} data-testid="team-zone" data-team-id={z.teamId ?? ""} className={`rt-zone ${z.tone === null ? "is-none" : `wfx-tone-${z.tone}`}${pressed ? " is-selected" : ""}`} style={{ left: z.x, top: z.y, width: z.width, height: z.height }}>
            {z.teamId ? <button type="button" className="rt-pill" aria-pressed={pressed} aria-label={`${label}, edit team`} title={label} onClick={() => onSelect({ kind: "team", id: z.teamId! })}>{label}</button> : <span className="rt-pill">{label}</span>}
          </div>
        })}
        {chart.nodes.map(n => {
          const role = byId.get(n.id)!, who = officer(role), pressed = selected.kind === "role" && selected.id === n.id
          return <button key={n.id} type="button" data-testid={`role-card-${n.id}`} className={`rt-card ${n.tone === null ? "is-none" : `wfx-tone-${n.tone}`}${n.advisor ? " is-advisor" : ""}${role.holderId ? "" : " is-open"}`} style={{ left: n.x, top: n.y, width: C.cardW, height: C.cardH }} aria-pressed={pressed} aria-label={`${n.title}, ${who}`} title={`${n.title} · ${who}`} onClick={() => onSelect({ kind: "role", id: n.id })}>
            {/* The space keeps the visible text ("President Alex Rivera") inside the accessible name (WCAG 2.5.3). */}
            <strong>{n.title}</strong>{" "}<span>{who}</span>
          </button>
        })}
      </div>
    </div>
    <ul className="sr-only">{chart.nodes.map(n => { const role = byId.get(n.id)!; return <li key={n.id}>{n.title}, {role.reportsToId && byId.has(role.reportsToId) ? `reports to ${bossTitle(roles, role)}` : n.advisor ? "advisor" : "top of the chart"}, {teamName(n.teamId) ?? "not in a team"}</li> })}</ul>
  </section>
}
