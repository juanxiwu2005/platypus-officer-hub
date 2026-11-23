/** P5-06A physical paper handoff: move the three confirmed documents from Riley's tray to Morgan's desk (rule 5.1 practice, no scoring here). */
import { useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from "react"
import { useDragSort } from "../../lib/dragSort"
import { DOCUMENTS } from "./decisions"
import type { SampleDraft } from "./model"
import morganArt from "../assets/club-hq.png"
import "../../styles/quest-handoff.css"
export interface HandOffProps { draft: SampleDraft; onEdit: (values: Partial<SampleDraft>) => void; onCheck: () => void }
export type HandoffDest = "tray" | "morgan"
const LABELS: Readonly<Record<string, string>> = { approval: "Approval", ritm: "RITM number", room: "Confirmed room" }
const destName = (dest: HandoffDest): string => (dest === "morgan" ? "Morgan's desk" : "Riley's tray")
export default function HandOff({ draft, onEdit, onCheck }: HandOffProps) {
  const [picked, setPicked] = useState<string | null>(null)
  const [cursor, setCursor] = useState<HandoffDest>("tray")
  const [status, setStatus] = useState("")
  const rootRef = useRef<HTMLElement | null>(null)
  const paperRefs = useRef(new Map<string, HTMLButtonElement>())
  // A paper that just changed destination; its button is rebuilt, so focus is restored after render.
  const focusAfterMove = useRef<string | null>(null)
  const { draggingId, over, cardProps } = useDragSort({
    onDrop: (id, target) => { if (target.dest === "tray" || target.dest === "morgan") place(id, target.dest) },
  })
  /** Places a known paper on a known destination. Never mutates the received array; a same-destination placement is a no-op that keeps order. */
  function place(id: string, dest: HandoffDest): void {
    if (!DOCUMENTS.includes(id) || (dest !== "tray" && dest !== "morgan")) return
    const label = LABELS[id] ?? id
    const at: HandoffDest = draft.documents.includes(id) ? "morgan" : "tray"
    if (at === dest) {
      focusAfterMove.current = null
      paperRefs.current.get(id)?.focus({ preventScroll: true })
      setPicked(null)
      setStatus(`${label} stays at ${destName(dest)}.`)
      return
    }
    focusAfterMove.current = id
    setPicked(null)
    setStatus(dest === "morgan" ? `${label} is on Morgan's desk.` : `${label} is back in Riley's tray.`)
    onEdit({ documents: dest === "morgan" ? [...draft.documents, id] : draft.documents.filter((document) => document !== id) })
  }
  function pick(id: string): void {
    if (!DOCUMENTS.includes(id)) return
    setPicked(id)
    setCursor(draft.documents.includes(id) ? "morgan" : "tray")
    setStatus(`${LABELS[id] ?? id} is picked. Choose Riley's tray or Morgan's desk.`)
  }
  function cancelPick(id: string): void {
    setPicked(null)
    setStatus("Cancelled.")
    paperRefs.current.get(id)?.focus({ preventScroll: true })
  }
  // True reparent: the paper renders in the other wrapper, so focus comes back in a layout effect.
  useLayoutEffect(() => {
    const id = focusAfterMove.current
    if (!id) return
    focusAfterMove.current = null
    paperRefs.current.get(id)?.focus({ preventScroll: true })
  }, [draft.documents])
  const paper = (id: string) => (
    <button key={id} type="button" ref={(el) => { if (el) paperRefs.current.set(id, el); else paperRefs.current.delete(id) }}
      className={`sample-comms-handoff-paper${picked === id ? " is-picked" : ""}${draggingId === id ? " is-dragged" : ""}`} data-rewind-focus={id === "approval" ? "approval" : undefined} aria-pressed={picked === id}
      onClick={() => (picked === id ? place(id, cursor) : pick(id))}
      {...cardProps(id)}
      onKeyDown={(e: ReactKeyboardEvent) => {
        cardProps(id).onKeyDown(e)
        if (picked !== id) return
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault()
          const dest: HandoffDest = e.key === "ArrowLeft" ? "tray" : "morgan"
          setCursor(dest)
          setStatus(destName(dest))
        } else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          place(id, cursor)
        }
      }}
    >
      {LABELS[id] ?? id}
    </button>
  )
  const target = (dest: HandoffDest) => (
    <button type="button" className="sample-comms-handoff-target" data-dest={dest}
      aria-pressed={picked !== null && cursor === dest}
      onFocus={() => { if (picked !== null) setCursor(dest) }}
      onClick={() => (picked !== null ? place(picked, dest) : setStatus("Pick a paper first."))}
      onKeyDown={(e: ReactKeyboardEvent) => {
        if (picked === null || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return
        e.preventDefault()
        const dest: HandoffDest = e.key === "ArrowLeft" ? "tray" : "morgan"
        setCursor(dest)
        setStatus(destName(dest))
        rootRef.current?.querySelector<HTMLButtonElement>(`.sample-comms-handoff-target[data-dest="${dest}"]`)?.focus({ preventScroll: true })
      }}
    >
      {destName(dest)}
    </button>
  )
  const overDest = draggingId !== null && (over?.dest === "tray" || over?.dest === "morgan") ? over.dest : null
  const trayIds = DOCUMENTS.filter((id) => !draft.documents.includes(id))
  const deskIds = draft.documents.filter((id) => DOCUMENTS.includes(id))
  return (
    <section
      className="sample-comms-handoff"
      ref={rootRef}
      onKeyDown={(e: ReactKeyboardEvent) => { if (e.key === "Escape" && picked !== null && draggingId === null) cancelPick(picked) }}
    >
      <p className="quest-instruction">Hand Morgan the confirmed event details.</p>
      <div className="sample-comms-handoff-stage">
        <div className="sample-comms-handoff-desk">
          <div className="sample-comms-handoff-morgan" style={{ "--sample-comms-handoff-art": `url("${morganArt}")` } as CSSProperties} aria-hidden="true" />
          <p className="sample-comms-handoff-caption">I need the confirmation before the teaser.</p>
          <div className={`sample-comms-handoff-drop${overDest === "morgan" ? " is-over" : ""}`} data-drop-col="morgan">
            {target("morgan")}
            {deskIds.map(paper)}
          </div>
        </div>
        <div className={`sample-comms-handoff-drop is-tray${overDest === "tray" ? " is-over" : ""}`} data-drop-col="tray">
          {target("tray")}
          {trayIds.map(paper)}
        </div>
      </div>
      <p className="sample-comms-handoff-status" role="status">{status}</p>
      <div className="quest-actions">
        <button type="button" className="quest-primary" onClick={onCheck}>Hand over</button>
      </div>
    </section>
  )
}
