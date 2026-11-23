/** P5-06B promotion repair bench: fix the poster, set the print count, and file the merchandise papers (rules 5.2-5.4 practice, no scoring here). */
import { useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react"
import { useDragSort } from "../../lib/dragSort"
import type { SampleDraft } from "./model"
import "../../styles/quest-promotion.css"

export interface PromotionProps { draft: SampleDraft; onEdit: (values: Partial<SampleDraft>) => void; onCheck: () => void }
export type PaperId = "order" | "proof"
export type PromotionDest = "tray" | "licensed" | "unverified" | "rff"
export type ToggleKey = "namingFixed" | "markRemoved" | "logoFlag"

const PAPERS: readonly PaperId[] = ["order", "proof"]
const PAPER_LABELS: Readonly<Record<PaperId, string>> = { order: "Merchandise order", proof: "Artwork proof" }
const DEST_LABELS: Readonly<Record<PromotionDest, string>> = { tray: "Riley's tray", licensed: "Licensed vendor", unverified: "Unverified vendor", rff: "RFF folder" }
/** The only known drop mapping: each paper may land on its own destinations only. */
const PAPER_DESTS: Readonly<Record<PaperId, readonly PromotionDest[]>> = { order: ["tray", "licensed", "unverified"], proof: ["tray", "rff"] }

/** Where each paper sits right now, from the draft alone. */
function currentDest(draft: SampleDraft, paper: PaperId): PromotionDest {
  return paper === "order" ? draft.promotion.vendor ?? "tray" : draft.promotion.artworkAttached ? "rff" : "tray"
}

export default function Promotion({ draft, onEdit, onCheck }: PromotionProps) {
  const [picked, setPicked] = useState<PaperId | null>(null)
  const [cursor, setCursor] = useState<PromotionDest>("tray")
  const [status, setStatus] = useState("")
  const rootRef = useRef<HTMLElement | null>(null)
  const paperRefs = useRef(new Map<PaperId, HTMLButtonElement>())
  const focusAfterMove = useRef<PaperId | null>(null)
  const { draggingId, over, cardProps } = useDragSort({ onDrop: (id, target) => { const paper = PAPERS.find((p) => p === id); const dest = target.dest as PromotionDest; if (paper !== undefined && DEST_LABELS[dest] !== undefined) place(paper, dest) } })
  const edit = (patch: Partial<SampleDraft["promotion"]>) => onEdit({ promotion: { ...draft.promotion, ...patch } })
  const toggle = (key: ToggleKey) => edit({ [key]: !draft.promotion[key] })
  /** Same-destination placement keeps focus; a real reparent rebuilds the button, so focus returns in a layout effect. */
  function place(paper: PaperId, dest: PromotionDest): void {
    if (!PAPER_DESTS[paper].includes(dest)) return
    const label = PAPER_LABELS[paper]
    if (currentDest(draft, paper) === dest) { focusAfterMove.current = null; paperRefs.current.get(paper)?.focus({ preventScroll: true }); setPicked(null); setStatus(`${label} stays at ${DEST_LABELS[dest]}.`); return }
    focusAfterMove.current = paper; setPicked(null); setStatus(`${label} is at ${DEST_LABELS[dest]}.`)
    edit(paper === "order" ? { vendor: dest === "licensed" ? "licensed" : dest === "unverified" ? "unverified" : null } : { artworkAttached: dest === "rff" })
  }
  function pick(paper: PaperId): void {
    setPicked(paper); setCursor(currentDest(draft, paper))   // the cursor starts at the paper's current destination
    setStatus(`${PAPER_LABELS[paper]} is picked. Choose ${PAPER_DESTS[paper].map((d) => DEST_LABELS[d]).join(" or ")}.`)
  }
  function cancelPick(paper: PaperId): void { setPicked(null); setStatus("Cancelled."); paperRefs.current.get(paper)?.focus({ preventScroll: true }) }
  useLayoutEffect(() => { const paper = focusAfterMove.current; if (!paper) return; focusAfterMove.current = null; paperRefs.current.get(paper)?.focus({ preventScroll: true }) }, [draft.promotion.vendor, draft.promotion.artworkAttached])

  const moveCursor = (paper: PaperId, dir: -1 | 1, focus: boolean) => {
    const list = PAPER_DESTS[paper]; const next = list[(list.indexOf(cursor) + dir + list.length) % list.length]
    setCursor(next); setStatus(DEST_LABELS[next])
    if (focus) rootRef.current?.querySelector<HTMLButtonElement>(`.sample-comms-promotion-target[data-dest="${next}"]`)?.focus({ preventScroll: true })
  }
  const paper = (id: PaperId) => (
    <button key={id} type="button" ref={(el) => { if (el) paperRefs.current.set(id, el); else paperRefs.current.delete(id) }}
      className={`sample-comms-promotion-paper${picked === id ? " is-picked" : ""}${draggingId === id ? " is-dragged" : ""}`} aria-pressed={picked === id}
      onClick={() => (picked === id ? place(id, cursor) : pick(id))} {...cardProps(id)}
      onKeyDown={(e: ReactKeyboardEvent) => { cardProps(id).onKeyDown(e); if (picked !== id) return; if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); moveCursor(id, e.key === "ArrowLeft" ? -1 : 1, false) } else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); place(id, cursor) } }}>
      {PAPER_LABELS[id]}
    </button>
  )
  const target = (dest: PromotionDest) => (
    <button type="button" className="sample-comms-promotion-target" data-dest={dest} aria-pressed={picked !== null && cursor === dest}
      onFocus={() => { if (picked !== null && PAPER_DESTS[picked].includes(dest)) setCursor(dest) }}
      onClick={() => { if (picked === null) setStatus("Pick a paper first."); else if (PAPER_DESTS[picked].includes(dest)) place(picked, dest); else setStatus(`${PAPER_LABELS[picked]} does not go there.`) }}
      onKeyDown={(e: ReactKeyboardEvent) => { if (picked !== null && (e.key === "ArrowLeft" || e.key === "ArrowRight")) { e.preventDefault(); moveCursor(picked, e.key === "ArrowLeft" ? -1 : 1, true) } }}>
      {DEST_LABELS[dest]}
    </button>
  )
  const slot = (dest: PromotionDest): readonly PaperId[] => PAPERS.filter((id) => currentDest(draft, id) === dest)
  const drop = (dest: PromotionDest) => (
    <div className={`sample-comms-promotion-drop${draggingId !== null && over?.dest === dest && (picked === null || PAPER_DESTS[picked].includes(dest)) ? " is-over" : ""}`} data-drop-col={dest}>
      {target(dest)}{slot(dest).map(paper)}
    </div>
  )
  const setCount = (raw: string) => { const n = Number(raw); edit({ printCount: raw === "" ? 0 : Number.isSafeInteger(n) ? Math.min(150, Math.max(0, n)) : draft.promotion.printCount }) }
  return (
    <section className="sample-comms-promotion" ref={rootRef} onKeyDown={(e: ReactKeyboardEvent) => { if (e.key === "Escape" && picked !== null && draggingId === null) cancelPick(picked) }}>
      <p className="quest-instruction">Fix the poster. Prepare the merchandise folder.</p>
      <div className="sample-comms-promotion-stage">
        <div className="sample-comms-promotion-poster">
          <button type="button" className="sample-comms-promotion-name" data-rewind-focus="poster-name" aria-pressed={draft.promotion.namingFixed} onClick={() => toggle("namingFixed")}>
            {draft.promotion.namingFixed ? "Desert Founders Society at ASU®" : "Desert Founders Society @ ASU"}
          </button>
          <button type="button" className="sample-comms-promotion-mark" aria-pressed={draft.promotion.markRemoved} onClick={() => toggle("markRemoved")}>{draft.promotion.markRemoved ? "Original club mark" : "Reserved university mark"}</button>
        </div>
        <div className="sample-comms-promotion-bench">
          {drop("tray")}
          <div className="sample-comms-promotion-outboxes">{drop("licensed")}{drop("unverified")}</div>
          {drop("rff")}
          <div className="sample-comms-promotion-controls">
            <label className="sample-comms-promotion-count">
              <span>Prints</span>
              <input type="range" aria-label="Print quantity" min={0} max={150} step={1} value={draft.promotion.printCount} onChange={(e) => setCount(e.target.value)} />
              <input type="number" aria-label="Print count" min={0} max={150} step={1} value={draft.promotion.printCount} onChange={(e) => setCount(e.target.value)} />
            </label>
            <p className="sample-comms-promotion-total">${draft.promotion.printCount * 5} / $500</p>
            <button type="button" className="sample-comms-promotion-stamp" aria-pressed={draft.promotion.logoFlag} onClick={() => toggle("logoFlag")}>Expense Includes Logo</button>
          </div>
        </div>
      </div>
      <p className="sample-comms-promotion-status" role="status">{status}</p>
      <div className="quest-actions"><button type="button" className="quest-primary" onClick={onCheck}>Send for review</button></div>
    </section>
  )
}
