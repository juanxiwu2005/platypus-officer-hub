import { useEffect, useRef } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useStore } from "../../data/store"
import { useRail } from "./RailContext"
import { AskPanel } from "./AskPanel"
import { NodePanel } from "../NodePanel"
import { NudgeComposer } from "../NudgeComposer"
import { TaskDetail } from "../TaskDetail"
import { useViewer } from "../../data/store"
import { FundingDetail } from "../../pages/Funding"
import { PartnerDetail } from "../../pages/Partners"
import { HandoffRoleDetail } from "../../pages/Handoff"
import { BoardSettingsPanel } from "../BoardSettings"

/** Right rail: Ask (the only AI box) and Details (whatever was clicked). */
export function Rail() {
  const rail = useRail()
  const { tab, setTab, detail } = rail
  return <aside className="rail" aria-label="Assistant and details" data-testid="rail">
    <div className="rail-tabs">
      <div role="tablist" aria-label="Side panel" className="tab-group">
        <button type="button" role="tab" aria-selected={tab === "ask"} onClick={() => setTab("ask")} data-testid="tab-ask">Ask</button>
        <button type="button" role="tab" aria-selected={tab === "details"} disabled={!detail} onClick={() => setTab("details")} data-testid="tab-details">Details</button>
      </div>
      <span className="spacer" />
      <button type="button" className="btn btn-quiet icon-btn" aria-label="Hide side panel" title="Hide side panel" onClick={() => rail.setOpen(false)}>
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
    </div>
    <div className="rail-body" hidden={tab !== "ask"}><AskPanel /></div>
    {detail && <div className="rail-body" hidden={tab !== "details"}><DetailView /></div>}
  </aside>
}

function DetailView() {
  const rail = useRail()
  const { state } = useStore()
  const { person } = useViewer()
  const navigate = useNavigate()
  const location = useLocation()
  const d = rail.detail!
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => { box.current?.scrollTo?.({ top: 0 }) }, [d])
  const close = () => {
    if (d.kind === "task" && location.pathname === "/tasks" && location.search.includes("node=")) navigate("/tasks", { replace: true })
    rail.closeDetail()
  }
  useEffect(() => {
    if (d.kind === "node" || d.kind === "nudge") return // these handle Escape themselves
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })
  const closer = <div className="detail-bar"><span className="spacer" /><button type="button" className="btn btn-quiet icon-btn" aria-label="Close details" onClick={close}>✕</button></div>
  let body: JSX.Element | null = null
  switch (d.kind) {
    case "node": return <div ref={box} className="detail-scroll"><NodePanel nodeId={d.id} onClose={close} onSelect={id => rail.show({ kind: "node", id })} /></div>
    case "nudge": return <div ref={box} className="detail-scroll"><NudgeComposer key={d.id} nodeId={d.id} onClose={close} /></div>
    case "task": {
      const node = state.nodes.find(n => n.id === d.id)
      body = node ? <TaskDetail key={`${node.id}:${state.viewerId}`} node={node} actorId={person.id} initialReply={d.reply} /> : <p className="empty">This task no longer exists.</p>
      break
    }
    case "funding": body = <FundingDetail eventId={d.eventId} />; break
    case "partner": body = <PartnerDetail id={d.id} />; break
    case "handoff": body = <HandoffRoleDetail roleId={d.roleId} />; break
    case "board": body = <BoardSettingsPanel />; break
  }
  return <div ref={box} className="detail-scroll">{closer}{body}</div>
}
