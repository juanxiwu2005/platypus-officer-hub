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
import { PartnerDetail } from "../crm/ContactDetail"
import { OrgDetail } from "../crm/OrgDetail"
import { HandoffRoleDetail } from "../../pages/Handoff"
import { BoardSettingsPanel } from "../BoardSettings"
import { Empty } from "../ui"

/** Right rail: Ask (the only AI box) and Details (whatever was clicked). */
export function Rail() {
  const rail = useRail()
  const { tab, setTab, detail } = rail
  const aside = useRef<HTMLElement>(null)
  // Below 1200px the rail floats over the page (full screen on a phone). Then focus must move into it, stay out of the
  // page underneath (full screen only), come back to the button that opened it, and Escape must close it.
  useEffect(() => {
    const overlay = window.matchMedia?.("(max-width: 1199px)").matches
    if (!overlay) return
    const a = document.activeElement
    const opener = a instanceof HTMLElement && a !== document.body && !aside.current?.contains(a) ? a : null
    if (!aside.current?.contains(document.activeElement)) aside.current?.focus()
    // Phone (full screen): the whole page, top bar included, is covered. Tablet (861–1199px): the page is covered on the
    // right, so it is switched off too, and a click or tap on it closes the panel instead of doing nothing (Juanxi 2026-10-29).
    const phone = window.matchMedia("(max-width: 860px)").matches
    const covered = [...document.querySelectorAll<HTMLElement>(phone ? "header.topbar, nav.sidenav, #main" : "nav.sidenav, #main")]
    covered.forEach(el => el.setAttribute("inert", ""))
    const outside = (e: PointerEvent) => {
      const t = e.target as Element | null
      if (phone || !t || aside.current?.contains(t) || t.closest("header.topbar, .ask-fab")) return
      rail.setOpen(false)
    }
    document.addEventListener("pointerdown", outside)
    return () => {
      document.removeEventListener("pointerdown", outside)
      covered.forEach(el => el.removeAttribute("inert"))
      // The round Ask button is removed while the panel is open, so after closing, look for whichever opener is on screen.
      setTimeout(() => {
        const shown = [...document.querySelectorAll<HTMLElement>(".ask-fab, [data-testid=ask-toggle]")].find(el => el.getClientRects().length)
        // Only fall back when nothing else (for example the details' own focus return) has already taken focus.
        const free = !document.activeElement || document.activeElement === document.body
        if (opener?.isConnected && free) opener.focus()
        else if (free) shown?.focus()
      }, 0)
    }
  }, [])
  const hasDetail = !!detail
  useEffect(() => {
    if (!window.matchMedia?.("(max-width: 1199px)").matches) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !hasDetail) rail.setOpen(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [hasDetail, rail])
  return <aside className="rail" aria-label="Assistant and details" data-testid="rail" ref={aside} tabIndex={-1}>
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
  // Every kind of detail takes focus when it opens or changes (unless it already put focus inside itself).
  const key = d.kind === "node" || d.kind === "task" || d.kind === "nudge" || d.kind === "partner" || d.kind === "handoff" ? `${d.kind}:${"id" in d ? d.id : d.roleId}` : d.kind === "funding" ? `funding:${d.eventId}` : "board"
  useEffect(() => {
    box.current?.scrollTo?.({ top: 0 })
    if (box.current && !box.current.contains(document.activeElement)) box.current.focus()
  }, [key])
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
  const region = { role: "region", "aria-label": "Details", tabIndex: -1 } as const
  const closer = <div className="detail-bar"><span className="spacer" /><button type="button" className="btn btn-quiet icon-btn" aria-label="Close details" onClick={close}>✕</button></div>
  let body: JSX.Element | null = null
  switch (d.kind) {
    case "node": return <div ref={box} className="detail-scroll" {...region}><NodePanel nodeId={d.id} onClose={close} onSelect={id => rail.show({ kind: "node", id })} /></div>
    case "nudge": return <div ref={box} className="detail-scroll" {...region}><NudgeComposer key={d.id} nodeId={d.id} onClose={close} /></div>
    case "task": {
      const node = state.nodes.find(n => n.id === d.id)
      body = node ? <TaskDetail key={`${node.id}:${state.viewerId}`} node={node} actorId={person.id} initialReply={d.reply} /> : <Empty>This task no longer exists.</Empty>
      break
    }
    case "funding": body = <FundingDetail eventId={d.eventId} />; break
    case "partner": body = <PartnerDetail id={d.id} />; break
    case "org": body = <OrgDetail id={d.id} />; break
    case "handoff": body = <HandoffRoleDetail roleId={d.roleId} />; break
    case "board": body = <BoardSettingsPanel />; break
  }
  return <div ref={box} className="detail-scroll" {...region}>{closer}{body}</div>
}
