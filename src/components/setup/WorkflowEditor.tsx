import { useState } from "react"
import type { Phase, Role, StepTemplate } from "../../data/types"
import { PHASE_LABEL } from "../../engine/playbooks"
import { MAX_STEPS, isLocked, newStepKey, ownerOfStep, removeStep, ruleList, stepsAsNodes } from "../../engine/workflow"
import { MAX_DAYS, PHASES, descendantsOf, displayOrder, doAfter, doAlongside, movePhase, setDays, stepDown, stepUp, type EditResult, type StepEdit } from "../../lib/stepOrder"

/**
 * The step editor (M3), pointed at the club's workflow instead of one event. It uses the same ordering rules (lib/stepOrder.ts):
 * "waits for" links, days of work and phase groups; the rule engine dates everything afterwards. On top of the event version it
 * lets the president give each step to an officer role, add the club's own steps, and remove steps that no ASU rule needs.
 * Steps that ASU rules depend on show their rule and cannot be removed, moved to another phase or given another deadline.
 */
const applyEdits = (steps: StepTemplate[], edits: StepEdit[]): StepTemplate[] => {
  const by = new Map(edits.map(e => [e.id, e.patch]))
  return steps.map(s => { const p = by.get(s.key); return p ? { ...s, ...(p.dependsOn ? { dependsOn: p.dependsOn } : {}), ...(p.estDays !== undefined ? { estDays: p.estDays } : {}), ...(p.phase ? { phase: p.phase } : {}) } : s })
}

export function WorkflowEditor({ steps, roles, onChange }: { steps: StepTemplate[]; roles: Role[]; onChange: (steps: StepTemplate[]) => void }) {
  const nodes = stepsAsNodes(steps)
  const groups = displayOrder(nodes, undefined, PHASES)
  const byKey = new Map(steps.map(s => [s.key, s]))
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null)
  const [draft, setDraft] = useState({ title: "", phase: "prepare" as Phase, after: "", owner: "" })
  const doers = roles.filter(r => r.fn !== "advisor")
  const commit = (r: EditResult) => {
    if (r.error) return setMsg({ text: r.error, error: true })
    if (r.edits.length) onChange(applyEdits(steps, r.edits))
    setMsg({ text: `${r.message}${r.note ? ` ${r.note}` : ""}` })
  }
  const patch = (key: string, p: Partial<StepTemplate>) => onChange(steps.map(s => s.key === key ? { ...s, ...p } : s))
  const setOwner = (key: string, id: string) => patch(key, { ownerRoleId: id, fn: roles.find(r => r.id === id)?.fn ?? byKey.get(key)!.fn })
  const add = () => {
    const title = draft.title.trim()
    if (!title || steps.length >= MAX_STEPS) return
    const owner = roles.find(r => r.id === draft.owner)
    const key = newStepKey(steps, title)
    onChange([...steps, { key, title, fn: owner?.fn ?? "programs", ownerRoleId: owner?.id ?? null, phase: draft.phase, estDays: 1, tier: "light", dependsOn: draft.after ? [draft.after] : [], why: "Added by the club.", source: "Your planning notes and files", custom: true }])
    setDraft({ title: "", phase: draft.phase, after: "", owner: "" }); setMsg({ text: `Added “${title}”.` })
  }
  return <section className="step-editor" data-testid="workflow-editor" aria-label="Event workflow steps">
    <div aria-live="polite" role="status" className="step-msg">{msg && <p className={`small ${msg.error ? "late-text" : ""}`} data-testid="workflow-msg">{msg.text}</p>}</div>
    {groups.map(g => <div key={g.phase} className="step-group">
      <div className="step-group-head"><h3>{PHASE_LABEL[g.phase]} <span className="small muted">{g.rows.length}</span></h3></div>
      <ol className="step-list" aria-label={`${PHASE_LABEL[g.phase]} steps`}>
        {g.rows.map((n, i) => {
          const s = byKey.get(n.id)!, prev = g.rows[i - 1], next = g.rows[i + 1], locked = isLocked(s)
          const waits = (s.dependsOn ?? []).map(k => byKey.get(k)).filter((x): x is StepTemplate => !!x)
          const blocked = descendantsOf(nodes, n.id)
          const addable = steps.filter(x => x.key !== s.key && !(s.dependsOn ?? []).includes(x.key) && !blocked.has(x.key))
          const owner = ownerOfStep(s, roles)
          return <li key={s.key} className="step-row" data-testid={`wf-step-${s.key}`}>
            <div className="step-main">
              <span className="step-move">
                <button type="button" className="btn btn-quiet icon-btn" aria-label={`Move up: ${s.title}`} disabled={!prev} onClick={() => prev && commit(stepUp(nodes, n.id, prev.id))}>▲</button>
                <button type="button" className="btn btn-quiet icon-btn" aria-label={`Move down: ${s.title}`} disabled={!next} onClick={() => next && commit(stepDown(nodes, n.id, next.id))}>▼</button>
              </span>
              <input type="text" className="step-title step-title-input" aria-label={`Step title: ${s.key}`} value={s.title} maxLength={120} onChange={e => patch(s.key, { title: e.target.value })} />
              {locked && <span className="tag-chip step-chip" title={`ASU rule ${ruleList(s)}`}>ASU {ruleList(s) || "deadline"}</span>}
              <select className="step-owner" aria-label={`Owner: ${s.title}`} value={owner?.id ?? ""} onChange={e => setOwner(s.key, e.target.value)}>
                {!owner && <option value="">No owner</option>}
                {doers.map(r => <option key={r.id} value={r.id}>{r.displayName}</option>)}
              </select>
              <span className="step-days">
                <button type="button" className="btn btn-quiet icon-btn" aria-label={`One day less: ${s.title}`} disabled={s.estDays <= 0} onClick={() => commit(setDays(nodes, n.id, s.estDays - 1))}>−</button>
                <input type="number" inputMode="numeric" min={0} max={MAX_DAYS} aria-label={`Days of work: ${s.title}`} value={s.estDays} onChange={e => commit(setDays(nodes, n.id, Number(e.target.value)))} />
                <button type="button" className="btn btn-quiet icon-btn" aria-label={`One day more: ${s.title}`} disabled={s.estDays >= MAX_DAYS} onClick={() => commit(setDays(nodes, n.id, s.estDays + 1))}>+</button>
              </span>
              <details className="step-menu">
                <summary aria-label={`More actions: ${s.title}`}>⋯</summary>
                <div className="step-menu-body">
                  <button type="button" className="btn small" disabled={!prev} onClick={e => { prev && commit(doAfter(nodes, n.id, prev.id)); e.currentTarget.closest("details")?.removeAttribute("open") }}>Do after the row above</button>
                  <button type="button" className="btn small" disabled={!prev} onClick={e => { prev && commit(doAlongside(nodes, n.id, prev.id)); e.currentTarget.closest("details")?.removeAttribute("open") }}>Do alongside the row above</button>
                  <label className="small">Move to phase<select aria-label={`Move to phase: ${s.title}`} disabled={locked} value={s.phase} onChange={e => commit(movePhase(nodes, n.id, e.target.value as Phase))}>{PHASES.map(ph => <option key={ph} value={ph}>{PHASE_LABEL[ph]}</option>)}</select></label>
                  {locked ? <p className="small muted">This step comes from ASU rule {ruleList(s) || "deadlines"}: it stays, in this phase, with its deadline.</p> : <button type="button" className="btn small" aria-label={`Remove step: ${s.title}`} onClick={() => { onChange(removeStep(steps, s.key)); setMsg({ text: `Removed “${s.title}”.` }) }}>Remove this step</button>}
                </div>
              </details>
            </div>
            <div className="step-links small">
              <span className="muted">Waits for:</span>{" "}
              {waits.length === 0 && <span className="muted">nothing</span>}
              {waits.map(w => <span key={w.key} className="tag-chip step-chip">{w.title} <button type="button" className="link" aria-label={`Remove: ${s.title} no longer waits for ${w.title}`} onClick={() => patch(s.key, { dependsOn: (s.dependsOn ?? []).filter(d => d !== w.key) })}>×</button></span>)}
              <select className="step-add" aria-label={`Add a step that ${s.title} waits for`} value="" onChange={e => { if (e.target.value) commit(doAfter(nodes, n.id, e.target.value)) }}>
                <option value="">+ Waits for…</option>
                {addable.map(x => <option key={x.key} value={x.key}>{x.title}</option>)}
              </select>
            </div>
          </li>
        })}
      </ol>
    </div>)}
    <details className="more" data-testid="workflow-add">
      <summary>Add a step of your own</summary>
      <p className="small muted">For something your club does that the standard workflow does not have. It waits for the step you choose, and you pick who does it.</p>
      <form className="form-grid" onSubmit={e => { e.preventDefault(); add() }}>
        <label>Step<input value={draft.title} maxLength={120} onChange={e => setDraft({ ...draft, title: e.target.value })} /></label>
        <label>Phase<select value={draft.phase} onChange={e => setDraft({ ...draft, phase: e.target.value as Phase })}>{PHASES.map(ph => <option key={ph} value={ph}>{PHASE_LABEL[ph]}</option>)}</select></label>
        <label>Comes after<select value={draft.after} onChange={e => setDraft({ ...draft, after: e.target.value })}><option value="">Nothing in particular</option>{steps.map(x => <option key={x.key} value={x.key}>{x.title}</option>)}</select></label>
        <label>Done by<select value={draft.owner} onChange={e => setDraft({ ...draft, owner: e.target.value })}><option value="">First officer for the work</option>{doers.map(r => <option key={r.id} value={r.id}>{r.displayName}</option>)}</select></label>
        <div><button type="submit" className="btn small" disabled={!draft.title.trim() || steps.length >= MAX_STEPS}>Add step</button></div>
      </form>
    </details>
  </section>
}
