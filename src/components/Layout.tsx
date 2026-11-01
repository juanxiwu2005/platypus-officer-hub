import { useEffect, useRef } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { RailProvider, useRail } from "./rail/RailContext"
import { BtsProvider } from "./Bts"
import { Rail } from "./rail/Rail"
import { TopBar } from "./chrome/TopBar"
import { SideNav } from "./chrome/SideNav"
import { useToast } from "./chrome/Toast"

export function Layout() {
  return <BtsProvider><RailProvider><Frame /></RailProvider></BtsProvider>
}

function Frame() {
  const rail = useRail()
  const location = useLocation()
  const [toastNode, setToast] = useToast()
  // A new page starts with Ask, not with the last page's details.
  const lastPath = useRef(location.pathname)
  useEffect(() => {
    if (lastPath.current !== location.pathname) {
      if (rail.detail && rail.detail.kind !== "task") rail.closeDetail()
      // On a phone or tablet the panel covers the page, so a new page starts with it closed — except right after a
      // new event, whose plan check is about to appear in Ask (M2b), and a link straight to a task (?node=), whose details
      // the Tasks page opens in this same render pass (rail.detail is still the old value here).
      if (!window.matchMedia?.("(min-width: 1200px)").matches && !location.search.includes("node=") && !rail.reviewEventId) rail.setOpen(false)
    }
    lastPath.current = location.pathname
  }, [location.pathname])

  return (
    <>
      <TopBar onReset={() => setToast("Demo data reset")} />

      <div className={`shell${rail.open ? " with-rail" : ""}`}>
        <SideNav />
        <main id="main" tabIndex={-1}>
          <Outlet />
        </main>
        {rail.open && <Rail />}
      </div>
      {!rail.open && <button type="button" className="ask-fab" onClick={() => rail.setOpen(true)} aria-label="Ask Platypus">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 016.5 3h7A2.5 2.5 0 0116 5.5v5a2.5 2.5 0 01-2.5 2.5H9l-3.5 3v-3A2.5 2.5 0 014 10.5z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
      </button>}
      {toastNode}
    </>
  )
}
