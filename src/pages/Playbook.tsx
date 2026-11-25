import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { PageHead } from "../components/Page"
import { AddExperience } from "../components/playbook/AddExperience"
import { HiddenQuestions } from "../components/playbook/HiddenQuestions"
import { QuestionRow } from "../components/playbook/QuestionRow"
import { categoriesOf, focusSoon, playbookDispatch, playbookViewer, rowButton } from "../components/playbook/shared"
import { isQuestionHidden, isRead, PLAYBOOK_CATEGORIES, playbookOf, QUESTIONS_PER_VIEW, questionsFor } from "../data/playbook"
import { starterPlaybook } from "../data/playbookStarter"
import { useStore } from "../data/store"
import "../styles/pb-01-playbook.css"

/**
 * Playbook (phase 1, docs/feedback-fix/PLAYBOOK_P1_CONTRACT.md §3): the club's question-first library. Questions are listed for
 * the viewer's role; a row opens in place to show at most one school rule, one club practice and one experience answer.
 * Words stay bounded by design: at most QUESTIONS_PER_VIEW rows (each at most 100 characters, "New" and two category words),
 * the seven universal category chips plus one "More" that reveals the club's own, and answers only inside an open row.
 */
export default function Playbook() {
  const { state, dispatch } = useStore()
  const viewer = playbookViewer(state)
  const [roleFilter, setRoleFilter] = useState<string>(viewer.roleId ?? "all")
  const [category, setCategory] = useState<string>("all")
  const [limit, setLimit] = useState(QUESTIONS_PER_VIEW)
  const [openIds, setOpenIds] = useState<string[]>([])
  const [adding, setAdding] = useState(false)
  const [moreCategories, setMoreCategories] = useState(false)
  const addButton = useRef<HTMLButtonElement>(null)

  // View as: a different person reads for their own role.
  const viewerKey = `${viewer.id}:${viewer.roleId ?? ""}`
  const lastViewer = useRef(viewerKey)
  useEffect(() => {
    if (lastViewer.current === viewerKey) return
    lastViewer.current = viewerKey
    setRoleFilter(viewer.roleId ?? "all"); setOpenIds([]); setLimit(QUESTIONS_PER_VIEW); setAdding(false)
  }, [viewerKey, viewer.roleId])

  // Only listed questions count: a Playbook whose questions are all hidden shows the empty state (the president or VP can unhide them).
  const total = questionsFor(state).length
  const hiddenQuestions = viewer.lead ? questionsFor(state, { includeHidden: true }).filter(isQuestionHidden) : []
  const questions = questionsFor(state, { roleId: roleFilter === "all" ? null : roleFilter, category: category === "all" ? null : category })
  const shown = questions.slice(0, limit)
  const more = Math.min(questions.length - shown.length, QUESTIONS_PER_VIEW)
  const openHandoffs = state.handoff ? state.handoffRoles.filter(r => !r.completed).length : 0
  const clubCategories = playbookOf(state).categories ?? []
  const clubSelected = clubCategories.some(c => c.id === category)
  const showClub = moreCategories || clubSelected

  const filter = (role: string, cat: string) => { setRoleFilter(role); setCategory(cat); setLimit(QUESTIONS_PER_VIEW) }
  const toggle = (id: string) => {
    if (openIds.includes(id)) { setOpenIds(openIds.filter(x => x !== id)); return }
    setOpenIds([...openIds, id])
    // A former officer only reads: nothing is written for them.
    if (viewer.canMarkRead && !isRead(state, viewer.id, id)) dispatch(playbookDispatch({ kind: "markRead", questionId: id }))
  }
  const hideQuestion = (id: string) => {
    // The focus moves to the next row, else the previous one, else "Add experience".
    const i = questions.findIndex(q => q.id === id), next = questions[i + 1] ?? questions[i - 1]
    dispatch(playbookDispatch({ kind: "hideQuestion", questionId: id, hidden: true }))
    setOpenIds(ids => ids.filter(x => x !== id))
    focusSoon(() => (next ? rowButton(next.id) : null) ?? addButton.current)
  }
  const importStarter = () => {
    // Computed here, in the lazily loaded page, so the starter code stays out of the startup bundle; the reducer checks it.
    const add = starterPlaybook(state, playbookOf(state))
    dispatch(playbookDispatch({ kind: "importStarter", questions: add.questions, answers: add.answers }))
  }
  const closeAdd = () => { setAdding(false); focusSoon(() => addButton.current) }
  const hidden = viewer.lead && <HiddenQuestions questions={hiddenQuestions} fallback={() => addButton.current} />

  return <>
    <PageHead path="/playbook" actions={viewer.officer && total > 0 && <button ref={addButton} type="button" className="btn btn-primary small" aria-expanded={adding} onClick={() => setAdding(!adding)} data-testid="pb-add-open">+ Add experience</button>} />
    <p className="pb-handoff"><Link to="/handoff" data-testid="pb-handoff-link">{openHandoffs ? `Handoff in progress · ${openHandoffs === 1 ? "1 role" : `${openHandoffs} roles`}` : "Handoff workspace"}</Link></p>
    {adding && <AddExperience viewer={viewer} defaultCategory={category === "all" ? categoriesOf(state)[0].id : category} roleIds={roleFilter === "all" ? "all" : [roleFilter]}
      onCancel={closeAdd}
      onSaved={(id, cat, next) => {
        const q = playbookOf(next).questions.find(x => x.id === id)
        const role = q && roleFilter !== "all" && q.roleIds !== "all" && !q.roleIds.includes(roleFilter) ? "all" : roleFilter
        // Show the list down to the question that was answered (at least the usual QUESTIONS_PER_VIEW), never the whole category.
        const index = questionsFor(next, { roleId: role === "all" ? null : role, category: cat }).findIndex(x => x.id === id)
        setAdding(false); setRoleFilter(role); setCategory(cat); setLimit(Math.max(QUESTIONS_PER_VIEW, index + 1))
        setOpenIds(ids => ids.includes(id) ? ids : [...ids, id])
        focusSoon(() => rowButton(id))
      }} />}
    {total === 0
      ? <section className="card pb-empty" data-testid="pb-empty">
        <p>No questions yet.</p>
        {viewer.officer && <div className="action-row">
          <button ref={addButton} type="button" className="btn btn-primary small" onClick={() => setAdding(true)} data-testid="pb-add-open">+ Add experience</button>
          {viewer.lead && <button type="button" className="btn small" onClick={importStarter}>Start from your handoff notes</button>}
        </div>}
        {hidden}
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
            {[{ id: "all", label: "All" }, ...PLAYBOOK_CATEGORIES].map(c => <button key={c.id} type="button" aria-pressed={category === c.id} onClick={() => filter(roleFilter, c.id)}>{c.label}</button>)}
            {clubCategories.length > 0 && <button type="button" aria-expanded={showClub} onClick={() => {
              if (!showClub) { setMoreCategories(true); return }
              setMoreCategories(false)
              if (clubSelected) filter(roleFilter, "all")
            }}>More</button>}
            {showClub && clubCategories.map(c => <button key={c.id} type="button" aria-pressed={category === c.id} onClick={() => filter(roleFilter, c.id)}>{c.label}</button>)}
          </div>
        </div>
        {shown.length
          ? <ul className="pb-questions">
            {shown.map(q => <QuestionRow key={q.id} q={q} viewer={viewer} read={isRead(state, viewer.id, q.id)} open={openIds.includes(q.id)} onToggle={() => toggle(q.id)} onHide={() => hideQuestion(q.id)} />)}
          </ul>
          : <p className="empty">No questions here yet. <button type="button" className="link" onClick={() => filter("all", "all")}>Show all</button></p>}
        {more > 0 && <button type="button" className="btn small pb-show-more" onClick={() => setLimit(limit + QUESTIONS_PER_VIEW)}>Show {more} more</button>}
        {hidden}
      </section>}
  </>
}
