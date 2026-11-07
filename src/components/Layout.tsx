import { useEffect, useLayoutEffect, useRef, useState } from "react"
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

/** How long a design-upgrade token lasts, in milliseconds (the CSS is the one place the time is written). */
function tokenMs(name: string, fallback: number) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  const n = parseFloat(v)
  return Number.isFinite(n) ? (v.endsWith("ms") ? n : n * 1000) : fallback
}

/**
 * The side panel has to stay on the page while it slides away, and has to be painted once in its closed place before it
 * slides in. With Reduce Motion on, none of that happens: it is there when `open` is true and gone when it is false.
 * `mounted` = render the panel; `shown` = it sits in its open place (false on the first frame in and while leaving).
 */
function useRailPresence(open: boolean) {
  const reduced = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(open)
  useEffect(() => {
    if (reduced) { setMounted(open); setShown(open); return }
    if (open) {
      setMounted(true)
      let second = 0
      const first = requestAnimationFrame(() => { second = requestAnimationFrame(() => setShown(true)) })
      return () => { cancelAnimationFrame(first); cancelAnimationFrame(second) }
    }
    setShown(false)
    const t = setTimeout(() => setMounted(false), tokenMs("--dur-base", 220) + 40)
    return () => clearTimeout(t)
  }, [open, reduced])
  return reduced ? { mounted: open, shown: open } : { mounted: open || mounted, shown: open && shown }
}

function Frame() {
  const rail = useRail()
  const location = useLocation()
  const [toastNode, setToast] = useToast()
  const railPresence = useRailPresence(rail.open)
  // A new page fades in (opacity only, no slide, nothing leaves) so moving between pages is soft but never slower (DX-19).
  // The class goes on before the new page is painted and comes off again once the fade is over, so things that appear
  // inside a page later on (a card that opens, a list that loads) do not fade.
  const [pageFade, setPageFade] = useState(false)
  const fadedPath = useRef(location.pathname)
  useLayoutEffect(() => {
    if (fadedPath.current === location.pathname) return
    fadedPath.current = location.pathname
    setPageFade(true)
    const t = setTimeout(() => setPageFade(false), tokenMs("--dur-fast", 150) + 60)
    return () => clearTimeout(t)
  }, [location.pathname])
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

      <div className={`shell${railPresence.mounted ? " with-rail" : ""}`}>
        <SideNav />
        <main id="main" tabIndex={-1} className={pageFade ? "route-enter" : undefined}>
          <Outlet />
        </main>
        {railPresence.mounted && <Rail closing={!rail.open} shown={railPresence.shown} />}
      </div>
      {!rail.open && <button type="button" className="ask-fab" onClick={() => rail.setOpen(true)} aria-label="Ask Platypus">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 016.5 3h7A2.5 2.5 0 0116 5.5v5a2.5 2.5 0 01-2.5 2.5H9l-3.5 3v-3A2.5 2.5 0 014 10.5z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
      </button>}
      {toastNode}
    </>
  )
}
