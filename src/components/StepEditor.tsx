import { useRef, useState, type DragEvent } from "react"
import { Link } from "react-router-dom"
import { useSchedule, useStore } from "../data/store"
import type { Node, Phase } from "../data/types"
import { PHASE_LABEL } from "../engine/playbooks"
import { personalBuffer } from "../engine/schedule"
import { fmtShort } from "../lib/dates"
import {
  MAX_DAYS, PHASES, applyEdits, descendantsOf, displayOrder, doAfter, doAlongside, doBefore, inverseOf, movePhase, phaseOrderOf, setDays, stepDown, stepUp,
  type EditResult, type StepEdit,
} from "../lib/stepOrder"
import { Info } from "./ui"

/**
 * The step editor (M3): a ranking-question list for one event. Phase groups, steps inside them, a days box and a
 * "waits for" list on every row. It only ever asks the store to change dependsOn, estDays and phase (and the display
 * order of the groups); the rule engine dates everything, and the metro chart next to it redraws from the result.
 * Rules and reasons: docs/M3_RANKING_PLAN.md.
 */
interface Done { label: string; undo: StepEdit[]; phaseOrder?: Phase[] }
interface Prompt { rId: string; uId: string | null; vId: string | null }

const swapPhases = (order: Phase[], a: Phase, b: Phase) => order.map(p => (p === a ? b : p === b ? a : p))

export function StepEditor({ eventId, selectedId, onSelect }: { eventId: string; selectedId: string | null; onSelect: (id: string) => void }) {
  const { state, dispatch } = useStore()
  const sched = useSchedule()
  const ev = state.events.find(e => e.id === eventId)
  const nodes = state.nodes.filter(n => n.eventId === eventId)
  const order = phaseOrderOf(ev)
  const groups = displayOrder(nodes, sched, order)
  const byId = new Map(nodes.map(n => [n.id, n]))
  const history = useRef<Done[]>([])
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null)
  const [, bump] = useState(0)
  const [drag, setDrag] = useState<string | null>(null)
  const [over, setOver] = useState<{ id: string; after: boolean } | null>(null)
  const [prompt, setPrompt] = useState<Prompt | null>(null)
  const [pAfter, setPAfter] = useState(true)
  const [pBefore, setPBefore] = useState(false)
  const person = state.people.find(p => p.id === state.viewerId)
  const myBuffer = personalBuffer(state, person).days

  const commit = (r: EditResult, label: string, phaseOrder?: Phase[]) => {
    if (r.error) return setMsg({ text: r.error, error: true })
    if (!r.edits.length && !phaseOrder) return setMsg({ text: r.message })
    history.current = [...history.current.slice(-9), { label, undo: inverseOf(nodes, r.edits), ...(phaseOrder ? { phaseOrder: order } : {}) }]
    dispatch({ type: "applyStepEdits", eventId, edits: r.edits, ...(phaseOrder ? { phaseOrder } : {}) })
    setMsg({ text: `${r.message}${r.note ? ` ${r.note}` : ""}` })
    bump(x => x + 1)
  }
  const undo = () => {
    const last = history.current.pop()
    if (!last) return
    dispatch({ type: "applyStepEdits", eventId, edits: last.undo, ...(last.phaseOrder ? { phaseOrder: last.phaseOrder } : {}) })
    setMsg({ text: `Undone: ${last.label}` })
    bump(x => x + 1)
  }

  const neighbours = (g: { rows: Node[] }, id: string) => { const i = g.rows.findIndex(r => r.id === id); return { prev: g.rows[i - 1], next: g.rows[i + 1] } }

  /** Dropping on a row opens a small choice: after the row above, before the row below, or both. */
  const dropOn = (e: DragEvent, target: Node, group: { phase: Phase; rows: Node[] }, after: boolean) => {
    e.preventDefault()
    const rId = drag
    setDrag(null); setOver(null)
    const r = rId ? byId.get(rId) : undefined
    if (!r || r.id === target.id) return
    if (r.phase !== group.phase) return commit(movePhase(nodes, r.id, group.phase), `Move ${r.title}`)
    const rows = group.rows.filter(x => x.id !== r.id)
    const at = rows.findIndex(x => x.id === target.id)
    const uId = after ? target.id : rows[at - 1]?.id ?? null
    const vId = after ? rows[at + 1]?.id ?? null : target.id
    setPAfter(!!uId); setPBefore(!uId)
    setPrompt({ rId: r.id, uId, vId })
  }
  const applyPrompt = () => {
    if (!prompt) return
    const { rId, uId, vId } = prompt
    let current = nodes
    const edits: StepEdit[] = []
    const messages: string[] = []
    for (const step of [pAfter && uId ? () => doAfter(current, rId, uId) : null, pBefore && vId ? () => doBefore(current, rId, vId) : null]) {
      if (!step) continue
      const r = step()
      if (r.error) return setMsg({ text: r.error, error: true })
      edits.push(...r.edits); messages.push(r.message)
      current = applyEdits(current, r.edits)
    }
    setPrompt(null)
    commit({ edits, message: messages.join(" ") || "No change." }, `Move ${byId.get(rId)?.title ?? "step"}`)
  }

  return <section className="card step-editor" aria-labelledby="se-h" data-testid="step-editor">
    <header>
      <h2 id="se-h">Edit steps</h2>
      <Info>Drag a row, or use the arrows and the ⋯ menu. Moving a step after another makes it wait for that step; other steps keep running side by side. Dates are worked out from the links and the days. The on-time forecast uses each step's effort size (light, medium, heavy), not days.</Info>
    </header>
    <p className="small muted" data-testid="buffer-line">Club buffer: {state.org.settings.clubBufferBusinessDays} working days before every ASU deadline · Your private buffer: {myBuffer} day{myBuffer === 1 ? "" : "s"} · <Link to="/settings">Change in Settings</Link></p>
    <div aria-live="polite" role="status" className="step-msg">{msg && <p className={`small ${msg.error ? "late-text" : ""}`} data-testid="step-msg">{msg.text}</p>}</div>
    {history.current.length > 0 && <button type="button" className="btn small" onClick={undo} data-testid="step-undo">Undo: {history.current[history.current.length - 1].label}</button>}

    {prompt && <form className="step-prompt" role="group" aria-label="Where this step goes" onSubmit={e => { e.preventDefault(); applyPrompt() }}>
      <p className="small"><b>{byId.get(prompt.rId)?.title}</b></p>
      {prompt.uId && <label className="check-label"><input type="checkbox" checked={pAfter} onChange={e => setPAfter(e.target.checked)} />Do after “{byId.get(prompt.uId)?.title}”</label>}
      {prompt.vId && <label className="check-label"><input type="checkbox" checked={pBefore} onChange={e => setPBefore(e.target.checked)} />Do before “{byId.get(prompt.vId)?.title}”</label>}
      <p className="small muted">Neither ticked: nothing changes, because the order of steps that do not wait for each other comes from their dates.</p>
      <div className="action-row"><button type="submit" className="btn btn-primary small">Apply</button><button type="button" className="btn small" onClick={() => setPrompt(null)}>Cancel</button></div>
    </form>}

    {groups.map((g, gi) => <div key={g.phase} className="step-group">
      <div className="step-group-head" onDragOver={e => { if (drag) e.preventDefault() }} onDrop={e => { e.preventDefault(); const r = drag ? byId.get(drag) : undefined; setDrag(null); setOver(null); if (r) commit(movePhase(nodes, r.id, g.phase), `Move ${r.title}`) }}>
        <h3>{PHASE_LABEL[g.phase]} <span className="small muted">{g.rows.length}</span></h3>
        <span className="step-move">
          <button type="button" className="btn btn-quiet icon-btn" aria-label={`Move the ${PHASE_LABEL[g.phase]} group up`} disabled={gi === 0} onClick={() => commit({ edits: [], message: `Moved the ${PHASE_LABEL[g.phase]} group up.` }, `Move ${PHASE_LABEL[g.phase]} group`, swapPhases(order, g.phase, groups[gi - 1].phase))}>▲</button>
          <button type="button" className="btn btn-quiet icon-btn" aria-label={`Move the ${PHASE_LABEL[g.phase]} group down`} disabled={gi === groups.length - 1} onClick={() => commit({ edits: [], message: `Moved the ${PHASE_LABEL[g.phase]} group down.` }, `Move ${PHASE_LABEL[g.phase]} group`, swapPhases(order, g.phase, groups[gi + 1].phase))}>▼</button>
        </span>
      </div>
      <ol className="step-list" aria-label={`${PHASE_LABEL[g.phase]} steps`}>
        {g.rows.map(n => {
          const { prev, next } = neighbours(g, n.id)
          const p = sched.nodes[n.id]
          const waits = n.dependsOn.map(d => byId.get(d)).filter((x): x is Node => !!x)
          const blocked = descendantsOf(nodes, n.id)
          const addable = nodes.filter(x => x.id !== n.id && !n.dependsOn.includes(x.id) && !blocked.has(x.id))
          const shown = over?.id === n.id && drag && drag !== n.id ? (over.after ? "drop-after" : "drop-before") : ""
          return <li key={n.id} className={`step-row ${n.id === selectedId ? "is-selected" : ""} ${drag === n.id ? "is-dragging" : ""} ${shown}`} data-testid={`step-${n.stepKey ?? n.id}`}
            onDragOver={e => { if (!drag) return; e.preventDefault(); const rect = e.currentTarget.getBoundingClientRect(); setOver({ id: n.id, after: e.clientY > rect.top + rect.height / 2 }) }}
            onDrop={e => dropOn(e, n, g, over?.id === n.id ? over.after : true)}>
            <div className="step-main">
              <button type="button" className="step-handle" draggable aria-label={`Drag to reorder: ${n.title}`} title="Drag to reorder"
                onDragStart={e => { setDrag(n.id); e.dataTransfer.setData("text/plain", n.id); e.dataTransfer.effectAllowed = "move"; const row = e.currentTarget.closest("li"); if (row) e.dataTransfer.setDragImage(row, 16, 16) }}
                onDragEnd={() => { setDrag(null); setOver(null) }}>≡</button>
              <span className="step-move">
                <button type="button" className="btn btn-quiet icon-btn" aria-label={`Move up: ${n.title}`} disabled={!prev} onClick={() => prev && commit(stepUp(nodes, n.id, prev.id), `Move up ${n.title}`)}>▲</button>
                <button type="button" className="btn btn-quiet icon-btn" aria-label={`Move down: ${n.title}`} disabled={!next} onClick={() => next && commit(stepDown(nodes, n.id, next.id), `Move down ${n.title}`)}>▼</button>
              </span>
              <button type="button" className="row-btn step-title" onClick={() => onSelect(n.id)}>{n.title}</button>
              <DaysField node={n} onCommit={d => commit(setDays(nodes, n.id, d), `Days for ${n.title}`)} />
              <details className="step-menu">
                <summary aria-label={`More actions: ${n.title}`}>⋯</summary>
                <div className="step-menu-body">
                  <button type="button" className="btn small" disabled={!prev} onClick={e => { prev && commit(doAfter(nodes, n.id, prev.id), `Do after ${prev.title}`); e.currentTarget.closest("details")?.removeAttribute("open") }}>Do after the row above</button>
                  <button type="button" className="btn small" disabled={!prev} onClick={e => { prev && commit(doAlongside(nodes, n.id, prev.id), `Do alongside ${prev.title}`); e.currentTarget.closest("details")?.removeAttribute("open") }}>Do alongside the row above</button>
                  <label className="small">Move to phase<select aria-label={`Move to phase: ${n.title}`} value={n.phase ?? ""} onChange={e => { commit(movePhase(nodes, n.id, e.target.value as Phase), `Move ${n.title}`) }}>
                    {PHASES.map(ph => <option key={ph} value={ph}>{PHASE_LABEL[ph]}</option>)}
                  </select></label>
                </div>
              </details>
            </div>
            <div className="step-links small">
              <span className="muted">Waits for:</span>{" "}
              {waits.length === 0 && <span className="muted">nothing</span>}
              {waits.map(w => <span key={w.id} className="tag-chip step-chip">{w.title} <button type="button" className="link" aria-label={`Remove: ${n.title} no longer waits for ${w.title}`} onClick={() => commit({ edits: [{ id: n.id, patch: { dependsOn: n.dependsOn.filter(d => d !== w.id) } }], message: `${n.title} no longer waits for ${w.title}.` }, `Unlink ${n.title}`)}>×</button></span>)}
              <select className="step-add" aria-label={`Add a step that ${n.title} waits for`} value="" onChange={e => { if (e.target.value) commit(doAfter(nodes, n.id, e.target.value), `Do after ${byId.get(e.target.value)?.title ?? "step"}`) }}>
                <option value="">+ Waits for…</option>
                {addable.map(x => <option key={x.id} value={x.id}>{x.title}</option>)}
              </select>
            </div>
            {p && <div className="step-dates small muted">Start {fmtShort(p.latestStart)} · Club {fmtShort(p.club)}{p.official ? ` · ASU ${fmtShort(p.official)}` : ""}{n.clubDeadlineOverride ? " · club deadline set by a person" : ""}</div>}
          </li>
        })}
      </ol>
    </div>)}
  </section>
}

/** Days of work. Typing is committed on Enter or when you leave the box; − and + commit at once. */
function DaysField({ node, onCommit }: { node: Node; onCommit: (days: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  const value = draft ?? String(node.estDays)
  const finish = () => { if (draft !== null) { setDraft(null); onCommit(Number(draft)) } }
  return <span className="step-days">
    <button type="button" className="btn btn-quiet icon-btn" aria-label={`One day less: ${node.title}`} disabled={node.estDays <= 0} onClick={() => onCommit(node.estDays - 1)}>−</button>
    <input type="number" inputMode="numeric" min={0} max={MAX_DAYS} aria-label={`Days of work: ${node.title}`} value={value} onChange={e => setDraft(e.target.value)} onBlur={finish} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); finish() } }} />
    <button type="button" className="btn btn-quiet icon-btn" aria-label={`One day more: ${node.title}`} disabled={node.estDays >= MAX_DAYS} onClick={() => onCommit(node.estDays + 1)}>+</button>
  </span>
}
