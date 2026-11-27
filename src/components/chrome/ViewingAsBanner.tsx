import { useState } from "react"
import { useStore } from "../../data/store"
import { defaultViewerId, viewerRole } from "./viewAs"

const KEY = "platypus.viewingAs.hidden"
function readHidden(): string[] {
  try { const v = JSON.parse(window.sessionStorage.getItem(KEY) ?? "[]"); return Array.isArray(v) ? v.filter(x => typeof x === "string") : [] } catch { return [] }
}

/**
 * A slim line under the top bar while the demo shows someone else's view (I12), so nobody loses track of whose page this is.
 * "Switch back" returns to the president; hiding it lasts for this browser session and for this person only.
 * The live region is always on the page, so a screen reader hears the line when it appears.
 */
export function ViewingAsBanner() {
  const { state, dispatch } = useStore()
  const [hidden, setHidden] = useState(readHidden)
  const home = defaultViewerId(state)
  const person = state.people.find(p => p.id === state.viewerId)
  const show = !!person && !!home && person.id !== home && !hidden.includes(person.id)
  const backToPill = () => document.querySelector<HTMLButtonElement>("[data-testid=demo-menu]")?.focus()
  const hide = () => {
    if (!person) return
    const next = [...hidden, person.id]
    setHidden(next)
    try { window.sessionStorage.setItem(KEY, JSON.stringify(next)) } catch { /* storage unavailable: hidden until reload */ }
    backToPill()
  }
  return <div className="viewing-as-slot" role="status" data-testid="viewing-as-slot">
    {show && <div className="viewing-as" data-testid="viewing-as">
      <p>Viewing as <b>{person.name.split(" ")[0]}</b>{viewerRole(state, person) ? ` · ${viewerRole(state, person)}` : ""}</p>
      <button type="button" className="btn small" data-testid="switch-back" onClick={() => { dispatch({ type: "setViewer", viewerId: home }); backToPill() }}>Switch back</button>
      <button type="button" className="btn btn-quiet icon-btn viewing-as-hide" aria-label="Hide this notice" data-testid="viewing-as-hide" onClick={hide}>
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5.5 5.5l9 9M14.5 5.5l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
      </button>
    </div>}
  </div>
}
