/** P5-05 officer scenes: hand the room request to a registered account holder, then set Dr. Lee's shift. All people are fictional sample data. */
import { useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react"
import { useDragSort } from "../../lib/dragSort"
import { REQUESTORS } from "./decisions"
import type { SampleDraft } from "./model"
import hqArt from "../assets/club-hq.png"
import "../../styles/quest-officers.css"

export interface OfficerSceneProps { stage: "booking" | "advisor"; draft: SampleDraft; onEdit: (values: Partial<SampleDraft>) => void; onCheck: () => void }

/** Portrait crop positions in the approved Club HQ art, per person. */
const PORTRAIT: Readonly<Record<string, string>> = { riley: "31% 19%", alex: "47% 40%", sam: "80% 24%", advisor: "100% 29%" }
const SEGMENTS = ["Arrivals", "Talk", "Closing"] as const

function Booking({ draft, onEdit, onCheck }: Omit<OfficerSceneProps, "stage">) {
  const paper = useRef<HTMLButtonElement>(null)
  const root = useRef<HTMLElement | null>(null)
  const held = useRef(false)
  const [picked, setPicked] = useState(false)
  const [cursor, setCursor] = useState(0)
  const [note, setNote] = useState("")
  const desks = REQUESTORS
  const name = (id: string | null) => (id === null ? "the tray" : REQUESTORS.find(person => person.id === id)?.name ?? "the tray")
  const place = (id: string | null, say: string) => {
    if (id === draft.requestor) { held.current = false; paper.current?.focus({ preventScroll: true }) }
    else held.current = true
    onEdit({ requestor: id }); setPicked(false); setNote(say)
  }
  const dropOk = (id: string, dest: string) => id === "request" && (dest === "tray" || desks.some(person => person.id === dest))
  const drag = useDragSort({
    onDrop: (id, target) => { if (!dropOk(id, target.dest)) return; const dest = target.dest === "tray" ? null : target.dest; place(dest, dest === null ? "Room request back on the tray." : `Room request with ${name(dest)}.`) },
    onNudge: (_, direction) => {
      const order = ["tray", ...desks.map(person => person.id)]
      const next = Math.max(0, Math.min(order.length - 1, order.indexOf(draft.requestor ?? "tray") + direction))
      if (order[next] === (draft.requestor ?? "tray")) return null
      const id = order[next] === "tray" ? null : order[next]
      place(id, id === null ? "Room request back on the tray." : `Room request with ${name(id)}.`)
      return `Room request with ${name(id)}.`
    },
  })
  // The paper is re-parented into another desk, so it remounts; put the keyboard back on it.
  useLayoutEffect(() => { if (held.current) { held.current = false; paper.current?.focus({ preventScroll: true }) } }, [draft.requestor])
  const pick = () => { setCursor(Math.max(0, desks.findIndex(person => person.id === draft.requestor))); setPicked(true); setNote("Room request picked up. Choose a desk.") }
  const key = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.altKey) { drag.cardProps("request").onKeyDown(event); return }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      if (!picked) { pick(); return }
      place(desks[cursor].id, `Room request with ${desks[cursor].name}.`)
    } else if (picked && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault()
      const next = Math.max(0, Math.min(desks.length - 1, cursor + (event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1)))
      setCursor(next); setNote(`${desks[next].name} desk. Enter to place.`)
    }
  }
  // Escape from anywhere in the booking scene (paper, desk target, actions) cancels a pick; pointer drags keep their own Escape in useDragSort.
  const cancelPick = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Escape" || !picked || drag.draggingId !== null) return
    setPicked(false)
    setNote("Placement cancelled.")
    paper.current?.focus({ preventScroll: true })
  }
  const targetKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!picked || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return
    event.preventDefault()
    const next = Math.max(0, Math.min(desks.length - 1, index + (event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1)))
    setCursor(next); setNote(`${desks[next].name} desk. Enter to place.`)
    root.current?.querySelector<HTMLButtonElement>(`[data-officer-target="${desks[next].id}"]`)?.focus({ preventScroll: true })
  }
  const requestPaper = <button ref={paper} type="button" {...drag.cardProps("request")} data-rewind-focus="" aria-pressed={picked}
    className={`sample-paper${picked ? " is-selected" : ""}${drag.draggingId === "request" ? " is-dragged" : ""}`}
    onClick={() => { if (!picked) pick() }} onKeyDown={key}>
    <span aria-hidden="true">✉</span> Room request
  </button>
  return <section className="sample-scene" aria-label="Room request handoff" ref={root} onKeyDown={cancelPick}>
    <p className="quest-instruction">Hand the room request to an account holder.</p>
    <div className="sample-desks">
      {desks.map((person, index) => <div key={person.id} data-drop-col={person.id}
        className={`sample-desk${drag.over?.dest === person.id ? " is-over" : ""}${picked && cursor === index ? " is-target" : ""}`}>
        <button type="button" className="sample-desk-target" data-officer-target={person.id} aria-pressed={picked && cursor === index}
          style={{ "--sample-portrait": `url("${hqArt}")`, "--sample-portrait-pos": PORTRAIT[person.id] } as CSSProperties}
          onFocus={() => { if (picked) setCursor(index) }}
          onClick={() => { if (!picked) { setNote("Pick up the request first."); return } place(person.id, `Room request with ${person.name}.`) }}
          onKeyDown={(event) => targetKey(event, index)}>
          <span className="sample-desk-art" aria-hidden="true" />
          <span className="sample-desk-name">{person.name}</span>
          <span className="sample-desk-role">{person.role}</span>
        </button>
        {draft.requestor === person.id && requestPaper}
      </div>)}
    </div>
    <p className="sample-caption">Three registered officer accounts. One room request.</p>
    <div data-drop-col="tray" aria-label="Request tray" className={`sample-tray${drag.over?.dest === "tray" ? " is-over" : ""}`}>
      {draft.requestor === null ? requestPaper : <span className="sample-caption">The request is on a desk.</span>}
    </div>
    <div className="quest-actions"><button type="button" className="quest-primary" onClick={onCheck}>Send request <span aria-hidden="true">↗</span></button></div>
    <p className="sr-only" aria-live="polite" aria-atomic="true">{note || drag.announce}</p>
  </section>
}

function Advisor({ draft, onEdit, onCheck }: Omit<OfficerSceneProps, "stage">) {
  const included = (index: number) => index >= draft.advisorStart && index <= draft.advisorEnd
  return <section className="sample-scene" aria-label="Advisor invitation">
    <div className="sample-advisor">
      <span className="sample-advisor-portrait" style={{ "--sample-portrait": `url("${hqArt}")`, "--sample-portrait-pos": PORTRAIT.advisor } as CSSProperties} role="img" aria-label="Dr. Lee, the club advisor" />
      <p className="sample-caption">I need the whole evening in my calendar.</p>
    </div>
    <p className="quest-instruction">Extend Dr. Lee's invitation across the whole night.</p>
    <ol className="sample-timeline" aria-label="Evening segments">
      {SEGMENTS.map((label, index) => <li key={label} aria-current={included(index) ? "true" : undefined} className={included(index) ? " is-included" : ""}>{label}</li>)}
    </ol>
    <div className="sample-shift">
      <label htmlFor="sample-advisor-start">Dr. Lee joins</label>
      <input id="sample-advisor-start" data-rewind-focus="" type="range" min={0} max={2} step={1} value={draft.advisorStart}
        onChange={event => { const start = Number(event.target.value); onEdit(start > draft.advisorEnd ? { advisorStart: start, advisorEnd: start } : { advisorStart: start }) }} />
      <label htmlFor="sample-advisor-end">Dr. Lee leaves</label>
      <input id="sample-advisor-end" type="range" min={0} max={2} step={1} value={draft.advisorEnd}
        onChange={event => { const end = Number(event.target.value); onEdit(end < draft.advisorStart ? { advisorStart: end, advisorEnd: end } : { advisorEnd: end }) }} />
    </div>
    <div className="quest-actions"><button type="button" className="quest-primary" onClick={onCheck}>Invite Dr. Lee <span aria-hidden="true">↗</span></button></div>
  </section>
}

export function OfficerScenes({ stage, draft, onEdit, onCheck }: OfficerSceneProps) {
  return stage === "advisor" ? <Advisor draft={draft} onEdit={onEdit} onCheck={onCheck} /> : <Booking draft={draft} onEdit={onEdit} onCheck={onCheck} />
}

export default OfficerScenes
