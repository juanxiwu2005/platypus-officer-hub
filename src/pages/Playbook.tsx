import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { PageHead } from "../components/Page"
import { AddExperience } from "../components/playbook/AddExperience"
import { modelSupports, playbookStoreAction } from "../components/playbook/compat"
import { QuestionRow } from "../components/playbook/QuestionRow"
import { categoriesOf, playbookViewer } from "../components/playbook/shared"
import { isRead, playbookOf, QUESTIONS_PER_VIEW, questionsFor } from "../data/playbook"
import { useStore } from "../data/store"
import "../styles/pb-01-playbook.css"

/**
 * Playbook (phase 1, docs/feedback-fix/PLAYBOOK_P1_CONTRACT.md §3): the club's question-first library. Questions are listed for
 * the viewer's role; a row opens in place to show at most one school rule, one club practice and one experience answer.
 */
export default function Playbook() {
  const { state, dispatch } = useStore()
  const viewer = playbookViewer(state)
  const [roleFilter, setRoleFilter] = useState<string>(viewer.roleId ?? "all")
  const [category, setCategory] = useState<string>("all")
  const [limit, setLimit] = useState(QUESTIONS_PER_VIEW)
  const [openIds, setOpenIds] = useState<string[]>([])
  const [adding, setAdding] = useState(false)
  const addButton = useRef<HTMLButtonElement>(null)

  // View as: a different person reads for their own role.
  const viewerKey = `${viewer.id}:${viewer.roleId ?? ""}`
  const lastViewer = useRef(viewerKey)
  useEffect(() => {
    if (lastViewer.current === viewerKey) return
    lastViewer.current = viewerKey
    setRoleFilter(viewer.roleId ?? "all"); setOpenIds([]); setLimit(QUESTIONS_PER_VIEW); setAdding(false)
  }, [viewerKey, viewer.roleId])

  const total = playbookOf(state).questions.length
  const questions = questionsFor(state, { roleId: roleFilter === "all" ? null : roleFilter, category: category === "all" ? null : category })
  const shown = questions.slice(0, limit)
  const more = Math.min(questions.length - shown.length, QUESTIONS_PER_VIEW)
  const openHandoffs = state.handoff ? state.handoffRoles.filter(r => !r.completed).length : 0
  const canImport = viewer.lead && modelSupports(state, { kind: "importStarter" })

  const filter = (role: string, cat: string) => { setRoleFilter(role); setCategory(cat); setLimit(QUESTIONS_PER_VIEW) }
  const toggle = (id: string) => {
    if (openIds.includes(id)) { setOpenIds(openIds.filter(x => x !== id)); return }
    setOpenIds([...openIds, id])
    if (!isRead(state, viewer.id, id)) dispatch(playbookStoreAction({ kind: "markRead", questionId: id }))
  }
  const closeAdd = () => { setAdding(false); requestAnimationFrame(() => addButton.current?.focus()) }

  return <>
    <PageHead path="/playbook" actions={viewer.officer && total > 0 && <button ref={addButton} type="button" className="btn btn-primary small" aria-expanded={adding} onClick={() => setAdding(!adding)} data-testid="pb-add-open">+ Add experience</button>} />
    <p className="pb-handoff"><Link to="/handoff" data-testid="pb-handoff-link">{openHandoffs ? `Handoff in progress · ${openHandoffs === 1 ? "1 role" : `${openHandoffs} roles`}` : "Handoff workspace"}</Link></p>
    {adding && <AddExperience viewer={viewer} defaultCategory={category === "all" ? categoriesOf(state)[0].id : category} roleIds={roleFilter === "all" ? "all" : [roleFilter]}
      onCancel={closeAdd}
      onSaved={(id, cat) => {
        const q = playbookOf(state).questions.find(x => x.id === id)
        if (q && roleFilter !== "all" && q.roleIds !== "all" && !q.roleIds.includes(roleFilter)) setRoleFilter("all")
        setAdding(false); setCategory(cat); setLimit(Number.MAX_SAFE_INTEGER)
        setOpenIds(ids => ids.includes(id) ? ids : [...ids, id])
        requestAnimationFrame(() => document.getElementById(`pb-q-${id}`)?.focus())
      }} />}
    {total === 0
      ? <section className="card pb-empty" data-testid="pb-empty">
        <p>No questions yet.</p>
        {viewer.officer && <div className="action-row">
          <button ref={addButton} type="button" className="btn btn-primary small" onClick={() => setAdding(true)} data-testid="pb-add-open">+ Add experience</button>
          {canImport && <button type="button" className="btn small" onClick={() => dispatch(playbookStoreAction({ kind: "importStarter" }))}>Start from your handoff notes</button>}
        </div>}
      </section>
      : <section className="card pb-list" aria-label="Questions">
        <div className="pb-filters">
          <label className="field-inline">Role
            <select value={roleFilter} onChange={e => filter(e.target.value, category)} data-testid="pb-role">
              {state.roles.map(r => <option key={r.id} value={r.id}>{r.displayName}</option>)}
              <option value="all">All roles</option>
            </select>
          </label>
          <div className="seg pb-cats" role="group" aria-label="Category">
            {[{ id: "all", label: "All" }, ...categoriesOf(state)].map(c => <button key={c.id} type="button" aria-pressed={category === c.id} onClick={() => filter(roleFilter, c.id)}>{c.label}</button>)}
          </div>
        </div>
        {shown.length
          ? <ul className="pb-questions">
            {shown.map(q => <QuestionRow key={q.id} q={q} viewer={viewer} read={isRead(state, viewer.id, q.id)} open={openIds.includes(q.id)} onToggle={() => toggle(q.id)} />)}
          </ul>
          : <p className="empty">No questions here yet. <button type="button" className="link" onClick={() => filter("all", "all")}>Show all</button></p>}
        {more > 0 && <button type="button" className="btn small pb-show-more" onClick={() => setLimit(limit + QUESTIONS_PER_VIEW)}>Show {more} more</button>}
      </section>}
  </>
}
