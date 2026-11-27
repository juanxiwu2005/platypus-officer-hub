import { useEffect, useState } from "react"
import { NavLink } from "react-router-dom"
import { Logo } from "../icons"
import { useStore } from "../../data/store"
import { useRail } from "../rail/RailContext"
import { DemoMenu } from "./DemoMenu"
import { Bell } from "./Bell"

export function TopBar({ onReset }: { onReset: () => void }) {
  const { state } = useStore()
  const rail = useRail()
  // "View as", "AI features" and the club name (on a phone) live in the Demo menu (I12); the old phone "⋯" panel is gone.
  // The line under the top bar only shows once the page has scrolled under it (DX-23).
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 0)
    on()
    window.addEventListener("scroll", on, { passive: true })
    return () => window.removeEventListener("scroll", on)
  }, [])
  return (
    <header className="topbar" data-scrolled={scrolled}>
      <div className="bar-in">
        <NavLink to="/" className="brand">
          <Logo />
          <div>
            <b>Platypus</b>{" "}
            <span>{state.org.name}</span>
          </div>
        </NavLink>
        <div className="controls">
          <DemoMenu onReset={onReset} />
          <Bell />
          <button type="button" className={`btn ask-toggle ${rail.open ? "on" : ""}`} aria-pressed={rail.open} onClick={() => rail.setOpen(!rail.open)} data-testid="ask-toggle">
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 016.5 3h7A2.5 2.5 0 0116 5.5v5a2.5 2.5 0 01-2.5 2.5H9l-3.5 3v-3A2.5 2.5 0 014 10.5z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
            Ask Platypus
          </button>
        </div>
      </div>
    </header>
  )
}
