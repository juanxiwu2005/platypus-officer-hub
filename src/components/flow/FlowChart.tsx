import { memo, useMemo } from "react"
import {
  ReactFlow, Controls, Handle, Position, MarkerType, useViewport, useReactFlow,
  type Edge, type Node as RFNode, type NodeProps,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import type { DemoState, Node } from "../../data/types"
import type { NodePlan, Schedule } from "../../engine/schedule"
import { SEO_MILESTONES } from "../../engine/playbooks"
import { addDays, fmtShort } from "../../lib/dates"
import { initials, personName, statusClass, statusOf, worstIssue } from "../../pages/helpers"
import { lanes, mondays, timeline } from "./layout"

const DAY_W = 34
const BOX_W = 188
const BOX_H = 76
const ROW_H = 90
const LANE_PAD = 12
const LABEL_W = 118
const AXIS_H = 40
const BOX_DAYS = Math.ceil((BOX_W + 14) / DAY_W)

type StepData = { node: Node; plan: NodePlan; owner: string; selected: boolean; onSelect: (id: string) => void }
type LaneData = { even: boolean }
type MarkData = { label: string; kind: "event" | "today" | "milestone"; height: number; title?: string }

const StepNode = memo(function StepNode({ data }: NodeProps<RFNode<StepData>>) {
  const { node: n, plan, owner, selected, onSelect } = data
  const st = statusOf(n)
  const issue = worstIssue(plan.issues)
  const cls = ["flow-step", statusClass(n), issue ? `has-${issue.severity}` : "", selected ? "is-selected" : ""].join(" ")
  const label = `${n.title}. ${st.text}. Owner ${owner}. Start by ${fmtShort(plan.latestStart)}, club deadline ${fmtShort(plan.club)}${plan.official ? `, ASU deadline ${fmtShort(plan.official)}` : ""}.${issue ? ` ${issue.text}` : ""}`
  return (
    <>
      <Handle type="target" position={Position.Left} isConnectable={false} className="flow-handle" />
      <button type="button" className={cls} onClick={() => onSelect(n.id)} aria-label={label} data-testid={`flow-node-${n.stepKey}`}>
        <span className="flow-title">{n.title}</span>
        <span className="flow-meta">
          <span className="avatar sm" aria-hidden>{n.ownerId ? initials(owner) : "?"}</span>
          <span className="num">{fmtShort(plan.latestStart)} → {fmtShort(plan.club)}</span>
          {issue && <span className={`flow-flag ${issue.severity}`} aria-hidden>!</span>}
        </span>
      </button>
      <Handle type="source" position={Position.Right} isConnectable={false} className="flow-handle" />
    </>
  )
})

const LaneNode = ({ data }: NodeProps<RFNode<LaneData>>) => <div className={`flow-lane ${data.even ? "even" : ""}`} />

const MarkNode = ({ data }: NodeProps<RFNode<MarkData>>) => (
  <div className={`flow-mark ${data.kind}`} style={{ height: data.height }} title={data.title}>
    <span>{data.label}</span>
  </div>
)

const nodeTypes = { step: StepNode, lane: LaneNode, mark: MarkNode }

interface Props {
  state: DemoState
  sched: Schedule
  eventId: string
  selectedId: string | null
  onSelect: (id: string) => void
}

export function FlowChart({ state, sched, eventId, selectedId, onSelect }: Props) {
  const ev = state.events.find(e => e.id === eventId)!
  const model = useMemo(() => {
    const tl = timeline(state, sched, eventId, DAY_W)
    const ls = lanes(state, sched, eventId, BOX_DAYS)
    const width = tl.days * DAY_W
    const nodes: RFNode[] = []
    const edges: Edge[] = []
    const laneTops: { label: string; y: number; h: number; id: string }[] = []
    let y = 0
    ls.forEach((lane, i) => {
      const h = lane.rowCount * ROW_H + LANE_PAD * 2 - (ROW_H - BOX_H)
      laneTops.push({ label: lane.role.displayName, y, h, id: lane.role.id })
      nodes.push({ id: `lane:${lane.role.id}`, type: "lane", position: { x: 0, y }, data: { even: i % 2 === 0 }, style: { width, height: h }, draggable: false, selectable: false, focusable: false, zIndex: 0 })
      for (const n of lane.nodes) {
        const plan = sched.nodes[n.id]
        nodes.push({
          id: n.id, type: "step", zIndex: 3, draggable: false, focusable: false,
          position: { x: tl.x(plan.latestStart), y: y + LANE_PAD + lane.rows[n.id] * ROW_H },
          data: { node: n, plan, owner: n.ownerId ? personName(state, n.ownerId) : "none", selected: n.id === selectedId, onSelect },
          style: { width: BOX_W, height: BOX_H },
        })
      }
      y += h
    })
    const totalH = y
    const mark = (id: string, date: string, kind: MarkData["kind"], label: string, title?: string) =>
      nodes.push({ id, type: "mark", position: { x: tl.x(date) + DAY_W / 2, y: 0 }, data: { label, kind, height: totalH, title }, draggable: false, selectable: false, focusable: false, zIndex: kind === "milestone" ? 1 : 2 })
    for (const m of SEO_MILESTONES) {
      const d = addDays(ev.date, -m.days)
      if (d >= tl.from && d <= tl.to) mark(`mark:${m.label}`, d, "milestone", m.label, `SEO ${m.label}: ${m.items}`)
    }
    mark("mark:today", state.today, "today", `Today ${fmtShort(state.today)}`)
    mark("mark:event", ev.date, "event", `Event ${fmtShort(ev.date)}`)

    const ids = new Set(state.nodes.filter(n => n.eventId === eventId).map(n => n.id))
    for (const n of state.nodes.filter(n => n.eventId === eventId)) {
      const plan = sched.nodes[n.id]
      for (const d of n.dependsOn) {
        if (!ids.has(d)) continue
        const pushed = plan.pushedBy === d
        const hot = selectedId === n.id || selectedId === d
        const settled = state.nodes.find(x => x.id === d)?.status === "done"
        edges.push({
          id: `${d}->${n.id}`, source: d, target: n.id, type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: pushed ? "var(--late)" : hot ? "var(--accent)" : "var(--edge)" },
          style: { stroke: pushed ? "var(--late)" : hot ? "var(--accent)" : "var(--edge)", strokeWidth: pushed || hot ? 2 : 1.2, opacity: settled && !hot ? 0.3 : 1 },
          zIndex: hot ? 2 : 1,
        })
      }
    }
    return { nodes, edges, tl, laneTops, width, totalH }
  }, [state, sched, eventId, selectedId, onSelect, ev.date])

  // Open on today, or on the first unfinished step if that comes later.
  const firstOpen = state.nodes
    .filter(n => n.eventId === eventId && n.status !== "done")
    .map(n => sched.nodes[n.id]?.latestStart)
    .filter((d): d is string => !!d)
    .sort()[0]
  const focusDate = firstOpen && firstOpen > state.today ? addDays(firstOpen, -3) : addDays(state.today, -6)
  const zoom = 0.85
  return (
    <div className="flow-wrap" data-testid="flow-chart">
      <ReactFlow
        nodes={model.nodes}
        edges={model.edges}
        nodeTypes={nodeTypes}
        defaultViewport={{ x: LABEL_W - model.tl.x(focusDate) * zoom, y: AXIS_H + 6, zoom }}
        minZoom={0.3}
        maxZoom={1.6}
        nodesDraggable={false}
        nodesConnectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        panOnScroll={false}
        preventScrolling={false}
        zoomOnDoubleClick={false}
        onNodeClick={(_, node) => node.type === "step" && onSelect(node.id)}
        proOptions={{ hideAttribution: true }}
        colorMode="system"
      >
        <Overlay laneTops={model.laneTops} days={mondays(model.tl.from, model.tl.to)} x={model.tl.x} />
        <Controls showInteractive={false} position="bottom-right" />
        <JumpToday x={model.tl.x(focusDate)} />
      </ReactFlow>
    </div>
  )
}

/** Lane names stay on the left and dates stay on top while the chart pans. */
function Overlay({ laneTops, days, x }: { laneTops: { label: string; y: number; h: number; id: string }[]; days: string[]; x: (d: string) => number }) {
  const vp = useViewport()
  return (
    <>
      <div className="flow-axis" aria-hidden>
        {days.map(d => {
          const left = x(d) * vp.zoom + vp.x
          return left < LABEL_W - 10 ? null : <span key={d} style={{ left }}>{fmtShort(d)}</span>
        })}
      </div>
      <div className="flow-lanes" aria-hidden>
        {laneTops.map(l => (
          <span key={l.id} style={{ top: l.y * vp.zoom + vp.y, height: l.h * vp.zoom }}>{l.label}</span>
        ))}
      </div>
    </>
  )
}

function JumpToday({ x }: { x: number }) {
  const rf = useReactFlow()
  return (
    <button type="button" className="btn flow-today" onClick={() => rf.setViewport({ x: LABEL_W - x * rf.getZoom(), y: rf.getViewport().y, zoom: rf.getZoom() }, { duration: 300 })}>
      Jump to today
    </button>
  )
}

