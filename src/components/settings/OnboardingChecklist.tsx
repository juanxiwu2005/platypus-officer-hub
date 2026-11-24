import { useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type ClipboardEvent, type KeyboardEvent, type TextareaHTMLAttributes } from "react"
import { useStore } from "../../data/store"
import type { ChecklistItem, ChecklistModule, ChecklistWhen, ChecklistWho, OnboardingChecklist as Checklist, Role } from "../../data/types"
import { starterChecklist } from "../../data/checklistStarter"
import {
  CHECKLIST_WHEN, CHECKLIST_WHO, MAX_ITEM_TITLE, MAX_MODULE_TITLE, WHEN_LABEL, WHO_LABEL, cellState, checklistIdMaker,
  countEveryone, countForRole, sanitizeChecklist, toggleCell, toggleEveryone, type CellState,
} from "../../lib/checklist"
import { parsePastedList, parseShorthand } from "../../lib/checklistParse"
import { Info } from "../ui"
import { useRail } from "../rail/RailContext"
import {
  LIMIT_REASON, addPastedCounted, applyLine, canAddModule, canMoveModule, focusAfterRemoveItem, focusAfterRemoveModule, insertItems, limitIn, limitNote,
  locate, mapItem, moveItem, moveItemTarget, moveModule, newItem, newModule, pasteIntoItem, patchModule, removeItem, removeModule, roomIn, type Dir,
} from "./onboarding/edit"
import "../../styles/ck-01-onboarding-matrix.css"

/**
 * Settings → Onboarding (option C, docs/feedback-fix/CHECKLIST_MATRIX_CONTRACT.md Section 6): the whole-club onboarding checklist as
 * a matrix, one row per item and one column per current role. The draft on screen is the source of truth while editing; each
 * discrete action saves at once, typing saves after 500 ms (and at once when a title field loses focus or the page is hidden or
 * left). The store sanitizes every save. Undo walks back the last 30 saved versions made here.
 * When the saved checklist changes from outside (Reset demo, an import), the editor takes it as it is: typing still waiting is
 * dropped and the Undo history, which belongs to the old checklist, is cleared.
 * No dates and no AI here: "when" stays a relative label.
 */

const UNDO_LIMIT = 30
const TYPING_MS = 500
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const titleId = (id: string) => `ck-t-${id}`
const moduleNameId = (id: string) => `ck-m-${id}`
const hintId = (id: string) => `ck-h-${id}`
const cancelId = (id: string) => `ck-x-${id}`
/** Move up / Move down / Delete of an item or module (item and module ids never collide). */
const actionId = (id: string, act: "up" | "down" | "del") => `ck-${act}-${id}`
const moveId = (id: string, dir: Dir) => actionId(id, dir < 0 ? "up" : "down")
/** The empty state's first button: focus goes there when the last module is deleted. */
const START_ID = "ck-start"

/** The first option of an item's When / Who list: follow the module. The closed chip shows only the value, dashed. */
const followOption = (label: string) => `${label} (module)`

/** An item's title inside a control's name, cut to about 40 characters. */
function shortTitle(title: string) {
  const t = title.trim()
  if (!t) return "untitled item"
  return t.length > 40 ? `${t.slice(0, 39).trimEnd()}…` : t
}
/** A role cell's name: "Treasurer: gets Join the officer group chat". */
const CELL_NAME: Record<CellState, (role: string, item: string) => string> = {
  inherited: (role, item) => `${role}: gets ${item}`,
  included: (role, item) => `${role}: gets ${item}`,
  hidden: (role, item) => `${role}: hidden for ${item}`,
  off: (role, item) => `${role}: does not get ${item}`,
}

/**
 * The saved checklist as the editor can show it: sanitized with the current roles, so a damaged save (a module without its
 * items list, an unknown value) never reaches the matrix. Null when nothing is saved or the saved value is not a checklist.
 */
const readSaved = (raw: unknown, roleIds: readonly string[], today: string) => raw == null ? null : sanitizeChecklist(raw, roleIds, today)

export default function OnboardingChecklist() {
  const { state, tryDispatch, getState, saveProblem, persistenceFailed } = useStore()
  const raw = state.org.onboardingChecklist ?? null
  const roles = state.roles
  const roleKey = roles.map(r => r.id).join("\n")
  const saved = useMemo(() => readSaved(raw, roleKey ? roleKey.split("\n") : [], state.today), [raw, roleKey, state.today])
  const [draft, setDraftState] = useState<Checklist | null>(saved)
  const draftRef = useRef(draft)
  /** The stored value (by identity) this draft builds on. A save goes ahead only while the store still holds it. */
  const base = useRef<unknown>(raw)
  const [undoStack, setUndoStack] = useState<(Checklist | null)[]>([])
  const undoRef = useRef(undoStack)
  const [failed, setFailed] = useState(false)
  const [pending, setPending] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const focusNext = useRef<string | null>(null)
  const [, rerender] = useReducer((n: number) => n + 1, 0)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [confirmModule, setConfirmModule] = useState<string | null>(null)
  /** A short visible note (what a limit cut) and what the live region says (notes, Undo). Typing saves are never announced. */
  const [note, setNote] = useState<string | null>(null)
  const [spoken, setSpoken] = useState("")
  // Like Workflow and Roles & teams: the matrix needs the width, so the Ask panel steps aside (Ask stays one click away).
  const rail = useRail()
  useEffect(() => { if (rail.tab === "ask") rail.setOpen(false) }, [])

  const setDraft = (next: Checklist | null) => { draftRef.current = next; setDraftState(next) }
  const setUndo = (next: (Checklist | null)[]) => { undoRef.current = next; setUndoStack(next) }
  const say = (text: string | null, visible = true) => { setNote(visible ? text : null); setSpoken(text ?? "") }
  /** Focus an element after the next render (and make sure there is one). */
  const focusLater = (id: string) => { focusNext.current = id; rerender() }
  const readNow = (value: unknown) => { const s = getState(); return readSaved(value, s.roles.map(r => r.id), s.today) }

  /** Saves `next` to the store. A version that changed the store goes on the Undo stack. */
  const save = (next: Checklist | null) => {
    const before = getState().org.onboardingChecklist ?? null
    // Reset demo or an import replaced the checklist since this draft was read: never write the old draft over it.
    if (before !== base.current) return
    if (tryDispatch({ type: "saveOnboardingChecklist", checklist: next })) {
      setUndo([...undoRef.current, readNow(before)].slice(-UNDO_LIMIT))
      base.current = getState().org.onboardingChecklist ?? null
      setFailed(false)
    } else if (saveProblem()) setFailed(true)
  }
  /** Saves typing still waiting for its pause. */
  const flush = () => {
    if (!timer.current) return
    clearTimeout(timer.current); timer.current = null; setPending(false)
    save(draftRef.current)
  }
  /** A discrete change: saved at once (after any typing still waiting). */
  const act = (fn: (c: Checklist) => Checklist, focus?: string) => {
    flush()
    say(null)
    const current = draftRef.current
    if (!current) return
    const next = fn(current)
    if (next === current) return
    if (focus) focusNext.current = focus
    setDraft(next); save(next)
  }
  /** Typing: on screen now, saved after a pause. */
  const typeIn = (fn: (c: Checklist) => Checklist) => {
    const current = draftRef.current
    if (!current) return
    setDraft(fn(current))
    if (timer.current) clearTimeout(timer.current)
    setPending(true)
    timer.current = setTimeout(() => { timer.current = null; setPending(false); save(draftRef.current) }, TYPING_MS)
  }
  const start = (next: Checklist, focus?: string) => { flush(); say(null); if (focus) focusNext.current = focus; setDraft(next); save(next) }
  const undo = () => {
    flush()
    const stack = undoRef.current
    if (!stack.length) return
    const prev = stack[stack.length - 1]
    if (!tryDispatch({ type: "saveOnboardingChecklist", checklist: prev }) && saveProblem()) { setFailed(true); return }
    setUndo(stack.slice(0, -1))
    base.current = getState().org.onboardingChecklist ?? null
    setDraft(readNow(base.current)); setFailed(false); setConfirmModule(null)
    say("Undid the last change.", false)
  }

  // Typing still waiting is saved when the page is hidden or left (reload, tab closed) and when the editor closes.
  // Leaving a title field saves it too (onBlur below). A click or a changed control anywhere on the page also saves it first:
  // these listeners run in the capture phase, before React's handlers, so a View as switch to an officer who cannot edit the
  // checklist saves the typing while the viewer can still save it, even when the switch never moved focus.
  const flushRef = useRef(flush)
  flushRef.current = flush
  useEffect(() => {
    const leave = () => flushRef.current()
    const hidden = () => { if (document.visibilityState === "hidden") flushRef.current() }
    // A click into a text field changes nothing by itself (leaving the old field already saved it), so typing keeps one Undo step.
    const clicked = (e: Event) => { if (!(e.target instanceof HTMLTextAreaElement)) flushRef.current() }
    window.addEventListener("pagehide", leave)
    document.addEventListener("visibilitychange", hidden)
    document.addEventListener("click", clicked, true)
    document.addEventListener("change", leave, true)
    return () => {
      window.removeEventListener("pagehide", leave); document.removeEventListener("visibilitychange", hidden)
      document.removeEventListener("click", clicked, true); document.removeEventListener("change", leave, true)
      flushRef.current()
    }
  }, [])
  // The saved checklist changed from outside (Reset demo, an import): show it, drop typing still waiting and the old Undo history.
  useEffect(() => {
    if (raw === base.current) return
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    base.current = raw
    setPending(false); setDraft(saved); setUndo([]); setConfirmModule(null); setFailed(false); say(null)
  }, [raw])
  useEffect(() => {
    const id = focusNext.current
    if (!id) return
    focusNext.current = null
    document.getElementById(id)?.focus()
  })

  const makeId = () => checklistIdMaker(draftRef.current)
  /** Says that a single new item did not fit `m`. */
  const noRoom = (c: Checklist, m: ChecklistModule) => say(limitNote({ requested: 1, added: 0, limit: limitIn(c, m) }))

  const addItemToLast = () => {
    const c = draftRef.current
    const m = c?.modules[c.modules.length - 1]
    if (!c || !m) return
    if (!roomIn(c, m)) { noRoom(c, m); return }
    const id = makeId()()
    act(x => insertItems(x, m.id, m.items.length, [newItem(id)]), titleId(id))
  }
  const addModule = () => {
    const c = draftRef.current
    const id = makeId()()
    if (!c) { start({ version: 1, modules: [newModule(id, "New module")], updatedOn: "" }, moduleNameId(id)); return }
    if (!canAddModule(c)) return
    act(x => ({ ...x, modules: [...x.modules, newModule(id, "New module")] }), moduleNameId(id))
  }
  const addPastedList = (text: string) => {
    const c = draftRef.current
    const r = addPastedCounted(c, parsePastedList(text), checklistIdMaker(c))
    if (c) act(() => r.checklist)
    else start(r.checklist)
    setPasteOpen(false)
    const cut = limitNote(r)
    if (cut) say(cut)
  }
  const deleteModule = (id: string) => {
    const c = draftRef.current
    if (!c) return
    const near = focusAfterRemoveModule(c, id)
    act(x => removeModule(x, id), near ? moduleNameId(near) : START_ID)
  }

  const hasModules = !!draft?.modules.length
  const untitled = draft ? draft.modules.reduce((n, m) => n + m.items.filter(i => !i.title.trim()).length, 0) : 0
  const saveFailed = failed || (persistenceFailed && undoStack.length > 0)
  // Visible only: a screen reader is not told about every pause in typing. A failure is an alert.
  const status = saveFailed
    ? <span className="ck-status is-err" role="alert">Saving failed. Changes are only on screen.</span>
    : untitled ? <span className="ck-status is-warn">{plural(untitled, "item")} {untitled === 1 ? "needs" : "need"} a title</span>
    : raw ? <span className="ck-status">{pending ? "Saving…" : "Saved"}</span> : null

  return <section className="card form-stack ck-root" data-testid="onboarding-settings" aria-labelledby="ck-heading">
    <h2 id="ck-heading">Onboarding checklist</h2>
    {hasModules && draft && <div className="ck-toolbar">
      <button type="button" className="btn" onClick={addItemToLast} disabled={roomIn(draft, draft.modules[draft.modules.length - 1]) === 0}>+ Add item</button>
      <button type="button" className="btn" onClick={addModule} disabled={!canAddModule(draft)}>+ Add module</button>
      <button type="button" className="btn" aria-expanded={pasteOpen} onClick={() => setPasteOpen(o => !o)}>Paste a list</button>
      <div className="ck-toolbar-end"><span data-testid="onboarding-status">{status}</span>
        <button type="button" className="btn btn-quiet" onClick={undo} disabled={!undoStack.length}>Undo</button></div>
    </div>}
    <div className="sr-only" role="status" data-testid="onboarding-announce">{spoken}</div>
    {note && <p className="ck-note" data-testid="onboarding-note">{note}</p>}
    {pasteOpen && <PastePanel checklist={draft} onAdd={addPastedList} onCancel={() => setPasteOpen(false)} />}
    {!hasModules && <div className="ck-empty" data-testid="onboarding-empty">
      <p>Every new officer gets this list.</p>
      {raw !== null && saved === null && <p className="ck-unreadable">The saved checklist could not be read.</p>}
      <div className="action-row">
        <button type="button" id={START_ID} className="btn btn-primary" onClick={() => start(starterChecklist(state))}>Start from Platypus starter</button>
        <button type="button" className="btn" aria-expanded={pasteOpen} onClick={() => setPasteOpen(o => !o)}>Paste a list</button>
        <button type="button" className="btn" onClick={addModule}>Add module</button>
        {!!undoStack.length && <button type="button" className="btn btn-quiet" onClick={undo}>Undo</button>}
      </div>
    </div>}
    {hasModules && draft && <>
      <div className="ck-wrap">
        <table className="tbl ck-table" data-testid="onboarding-matrix">
          <thead><tr>
            <th scope="col">Item</th><th scope="col">When</th><th scope="col">Who does it</th><th scope="col" className="ck-col">Everyone</th>
            {roles.map(r => <th key={r.id} scope="col" className="ck-col">{r.displayName}</th>)}
            <th scope="col"><span className="sr-only">Actions</span></th>
          </tr></thead>
          {draft.modules.map((m, mi) => <ModuleRows key={m.id} module={m} first={mi === 0} last={mi === draft.modules.length - 1} checklist={draft} roles={roles}
            confirming={confirmModule === m.id}
            onModule={{
              rename: title => typeIn(c => patchModule(c, m.id, { title })),
              when: when => act(c => patchModule(c, m.id, { when })),
              who: who => act(c => patchModule(c, m.id, { who })),
              move: dir => {
                const c = draftRef.current
                if (!c) return
                const next = moveModule(c, m.id, dir)
                // The same button while the module can move on, else its name (a disabled button cannot hold focus).
                act(() => next, canMoveModule(next, m.id, dir) ? moveId(m.id, dir) : moduleNameId(m.id))
              },
              // × only asks: the module goes only from the prompt's Delete button, so a double press cannot delete it.
              remove: () => { if (!m.items.length) { deleteModule(m.id); return } setConfirmModule(m.id); focusLater(cancelId(m.id)) },
              confirmRemove: () => { setConfirmModule(null); deleteModule(m.id) },
              cancelRemove: () => { setConfirmModule(null); focusLater(actionId(m.id, "del")) },
              addFirst: () => {
                const c = draftRef.current, current = c?.modules.find(x => x.id === m.id)
                if (!c || !current) return
                if (!roomIn(c, current)) { noRoom(c, current); return }
                const id = makeId()()
                act(x => insertItems(x, m.id, 0, [newItem(id)]), titleId(id))
              },
              flush,
            }}
            onItem={{
              retitle: (id, title) => typeIn(c => mapItem(c, id, i => ({ ...i, title }))),
              when: (id, when) => act(c => mapItem(c, id, i => { const { when: _w, ...rest } = i; void _w; return when ? { ...rest, when } : rest })),
              who: (id, who) => act(c => mapItem(c, id, i => { const { who: _w, ...rest } = i; void _w; return who ? { ...rest, who } : rest })),
              cell: (id, roleId) => act(c => mapItem(c, id, i => toggleCell(i, roleId))),
              everyone: id => act(c => mapItem(c, id, toggleEveryone)),
              move: (id, dir) => {
                const c = draftRef.current
                if (!c) return
                const next = moveItem(c, id, dir)
                // The moved row keeps focus on the same button (its row may now sit in another module), else on its title.
                act(() => next, moveItemTarget(next, id, dir) ? moveId(id, dir) : titleId(id))
              },
              remove: id => {
                const c = draftRef.current
                if (!c) return
                const near = focusAfterRemoveItem(c, id)
                act(x => removeItem(x, id), !near ? undefined : "item" in near ? titleId(near.item) : moduleNameId(near.module))
              },
              enter: id => {
                const c = draftRef.current, at = c && locate(c, id)
                if (!c || !at) return
                const module = c.modules[at.mi]
                if (!module.items[at.ii].title.trim()) return
                const room = roomIn(c, module), nextId = makeId()()
                act(x => insertItems(mapItem(x, id, i => applyLine(i, parseShorthand(i.title))), module.id, at.ii + 1, [newItem(nextId)]), titleId(nextId))
                if (!room) noRoom(c, module)
              },
              backspace: id => {
                const c = draftRef.current, at = c && locate(c, id)
                if (!c || !at) return
                const prev = c.modules[at.mi].items[at.ii - 1]
                act(x => removeItem(x, id), prev ? titleId(prev.id) : moduleNameId(c.modules[at.mi].id))
              },
              paste: (id, text) => {
                const c = draftRef.current
                if (!c) return
                // Lines before any "Section:" line go below this row; "Section:" lines place what follows as Paste a list does.
                const r = pasteIntoItem(c, id, parsePastedList(text, ""), makeId())
                if (!r.requested) return
                act(() => r.checklist, r.focus ? titleId(r.focus) : undefined)
                const cut = limitNote(r)
                if (cut) say(cut)
              },
              flush,
            }} />)}
          <tfoot><tr data-testid="onboarding-totals">
            <th scope="row">Items per role</th><td colSpan={2} />
            <td className="ck-col" data-testid="count-everyone">{countEveryone(draft)}</td>
            {roles.map(r => <td key={r.id} className="ck-col" data-testid={`count-${r.id}`}>{countForRole(draft, r.id)}</td>)}
            <td />
          </tr></tfoot>
        </table>
      </div>
      <div className="ck-legend-row">
        <ul className="ck-legend" aria-label="Legend">
          <li><span className="ck-dot is-included" aria-hidden="true" />Included</li>
          <li><span className="ck-dot is-inherited" aria-hidden="true" />From Everyone</li>
          <li><span className="ck-dot is-off" aria-hidden="true" />Not included</li>
          <li><span className="ck-dot is-hidden" aria-hidden="true" />Hidden for this role</li>
          <li><span className="ck-chip-swatch" aria-hidden="true" />Follows the module</li>
        </ul>
        <Info label="How the matrix works">Click a dot to give or hide an item for one role. Everyone turns the whole row on. A dashed chip follows its module.</Info>
      </div>
    </>}
  </section>
}

interface ModuleHandlers {
  rename: (title: string) => void
  when: (when: ChecklistWhen) => void
  who: (who: ChecklistWho) => void
  move: (dir: Dir) => void
  remove: () => void
  confirmRemove: () => void
  cancelRemove: () => void
  addFirst: () => void
  /** Saves typing still waiting (a title field lost focus). */
  flush: () => void
}
interface ItemHandlers {
  retitle: (id: string, title: string) => void
  when: (id: string, when: ChecklistWhen | null) => void
  who: (id: string, who: ChecklistWho | null) => void
  cell: (id: string, roleId: string) => void
  everyone: (id: string) => void
  move: (id: string, dir: Dir) => void
  remove: (id: string) => void
  enter: (id: string) => void
  backspace: (id: string) => void
  paste: (id: string, text: string) => void
  flush: () => void
}

function ModuleRows({ module: m, first, last, checklist, roles, confirming, onModule, onItem }: {
  module: ChecklistModule; first: boolean; last: boolean; checklist: Checklist; roles: Role[]; confirming: boolean; onModule: ModuleHandlers; onItem: ItemHandlers
}) {
  const nameKey = (e: KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === "Enter") { e.preventDefault(); onModule.addFirst() } }
  // Escape anywhere in the row closes the delete prompt and gives focus back to ×.
  const rowKey = (e: KeyboardEvent<HTMLTableRowElement>) => { if (confirming && e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onModule.cancelRemove() } }
  return <tbody>
    <tr className="ck-module" data-testid="onboarding-module" onKeyDown={rowKey}>
      <th scope="row"><GrowField id={moduleNameId(m.id)} className="ck-name" aria-label="Module name" value={m.title} maxLength={MAX_MODULE_TITLE} onText={onModule.rename} onKeyDown={nameKey} onBlur={onModule.flush} /></th>
      <td><ChipSelect kind="is-module" label="Module when" shown={WHEN_LABEL[m.when]} value={m.when} options={CHECKLIST_WHEN.map(w => [w, WHEN_LABEL[w]] as const)} onPick={v => onModule.when(v as ChecklistWhen)} /></td>
      <td><ChipSelect kind="is-module" label="Module who does it" shown={WHO_LABEL[m.who]} value={m.who} options={CHECKLIST_WHO.map(w => [w, WHO_LABEL[w]] as const)} onPick={v => onModule.who(v as ChecklistWho)} /></td>
      <td colSpan={roles.length + 1} className="ck-module-info">{confirming
        ? <span className="ck-confirm" role="group" aria-label="Delete module"><span role="alert">Delete {plural(m.items.length, "item")} too?</span>
          <button type="button" className="btn small" onClick={onModule.confirmRemove}>Delete</button>
          <button type="button" id={cancelId(m.id)} className="btn small btn-quiet" onClick={onModule.cancelRemove}>Cancel</button></span>
        : <span className="muted">{plural(m.items.length, "item")}</span>}</td>
      <td className="ck-actions"><RowActions id={m.id} first={first} last={last} onMove={onModule.move} onDelete={onModule.remove} what="module" /></td>
    </tr>
    {m.items.map(item => <ItemRow key={item.id} module={m} item={item} roles={roles} canUp={!!moveItemTarget(checklist, item.id, -1)} canDown={!!moveItemTarget(checklist, item.id, 1)} on={onItem} />)}
  </tbody>
}

function ItemRow({ module: m, item, roles, canUp, canDown, on }: { module: ChecklistModule; item: ChecklistItem; roles: Role[]; canUp: boolean; canDown: boolean; on: ItemHandlers }) {
  const key = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") { e.preventDefault(); on.enter(item.id) }
    else if (e.key === "Backspace" && !item.title) { e.preventDefault(); on.backspace(item.id) }
  }
  const paste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData("text")
    if (!/\r?\n/.test(text.trim())) return
    e.preventDefault(); on.paste(item.id, text)
  }
  const name = shortTitle(item.title)
  // sanitizeChecklist drops an item without a title, so the row says it is not saved yet.
  const untitled = !item.title.trim()
  return <tr className="ck-item" data-testid="onboarding-item">
    <th scope="row"><div className="ck-title-cell">
      <GrowField id={titleId(item.id)} className="ck-title" aria-label="Item title" aria-describedby={untitled ? hintId(item.id) : undefined} value={item.title} maxLength={MAX_ITEM_TITLE}
        onText={title => on.retitle(item.id, title)} onKeyDown={key} onPaste={paste} onBlur={on.flush} />
      {untitled && <span id={hintId(item.id)} className="ck-hint">Add a title to save</span>}
      {item.source && <span className="rule-id">{item.source}</span>}
    </div></th>
    <td><ChipSelect kind={item.when ? "is-set" : "is-follow"} label={item.when ? `When for ${name}` : `When for ${name}: follows module, ${WHEN_LABEL[m.when]}`}
      shown={WHEN_LABEL[item.when ?? m.when]} value={item.when ?? ""} options={[["", followOption(WHEN_LABEL[m.when])], ...CHECKLIST_WHEN.map(w => [w, WHEN_LABEL[w]] as const)]}
      onPick={v => on.when(item.id, (v || null) as ChecklistWhen | null)} /></td>
    <td><ChipSelect kind={item.who ? "is-set" : "is-follow"} label={item.who ? `Who does it for ${name}` : `Who does it for ${name}: follows module, ${WHO_LABEL[m.who]}`}
      shown={WHO_LABEL[item.who ?? m.who]} value={item.who ?? ""} options={[["", followOption(WHO_LABEL[m.who])], ...CHECKLIST_WHO.map(w => [w, WHO_LABEL[w]] as const)]}
      onPick={v => on.who(item.id, (v || null) as ChecklistWho | null)} /></td>
    <td className="ck-col"><button type="button" className="ck-cell" aria-pressed={item.everyone} aria-label={`Everyone: ${item.everyone ? "on" : "off"} for ${name}`} onClick={() => on.everyone(item.id)}>
      <span className={`ck-dot ${item.everyone ? "is-included" : "is-off"}`} aria-hidden="true" /></button></td>
    {roles.map(r => {
      const s = cellState(item, r.id)
      return <td key={r.id} className="ck-col"><button type="button" className="ck-cell" aria-pressed={s === "inherited" || s === "included"} aria-label={CELL_NAME[s](r.displayName, name)} onClick={() => on.cell(item.id, r.id)}>
        <span className={`ck-dot is-${s}`} aria-hidden="true" /></button></td>
    })}
    <td className="ck-actions"><RowActions id={item.id} first={!canUp} last={!canDown} onMove={dir => on.move(item.id, dir)} onDelete={() => on.remove(item.id)} what="item" /></td>
  </tr>
}

/**
 * A When / Who chip: the visible pill shows only the value (dashed when it follows the module), and a transparent native select
 * on top of it opens the list. The select carries the accessible name; its first option names the module value, e.g. "Week 1 (module)".
 */
function ChipSelect({ kind, label, shown, value, options, onPick }: {
  kind: "is-module" | "is-set" | "is-follow"; label: string; shown: string; value: string; options: readonly (readonly [string, string])[]; onPick: (value: string) => void
}) {
  return <span className={`ck-chip ${kind}`}>
    <span aria-hidden="true">{shown}</span>
    <select className="ck-select" aria-label={label} value={value} onChange={e => onPick(e.target.value)}>
      {options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
    </select>
  </span>
}

/** Browsers that size a text area to its content from CSS alone (field-sizing); elsewhere GrowField measures it. */
const SIZES_ITSELF = typeof CSS !== "undefined" && typeof CSS.supports === "function" && CSS.supports("field-sizing", "content")
/** Sets --ck-h (read by the CSS) to the height the text needs, for browsers without field-sizing. */
function fitHeight(el: HTMLTextAreaElement) {
  el.style.setProperty("--ck-h", "auto")
  el.style.setProperty("--ck-h", `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`)
}

/**
 * A one-line title that wraps instead of hiding its end: a text area that grows with its text, so a long title in a narrow
 * Item column stays readable without hovering. Line breaks are never kept: the row handles Enter, and other breaks become spaces.
 */
function GrowField({ value, onText, ...rest }: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> & { value: string; onText: (text: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => { if (!SIZES_ITSELF && ref.current) fitHeight(ref.current) }, [value])
  useEffect(() => {
    const el = ref.current
    if (SIZES_ITSELF || !el || typeof ResizeObserver === "undefined") return
    let width = el.clientWidth
    const watch = new ResizeObserver(() => { if (el.clientWidth !== width) { width = el.clientWidth; fitHeight(el) } })
    watch.observe(el)
    return () => watch.disconnect()
  }, [])
  return <textarea ref={ref} rows={1} {...rest} value={value} onChange={e => onText(e.target.value.replace(/\s*\r?\n\s*/g, " "))} />
}

function RowActions({ id, first, last, onMove, onDelete, what }: { id: string; first: boolean; last: boolean; onMove: (dir: Dir) => void; onDelete: () => void; what: "item" | "module" }) {
  return <span className="ck-row-actions">
    <button type="button" id={actionId(id, "up")} className="ck-act" aria-label={`Move ${what} up`} title="Move up" disabled={first} onClick={() => onMove(-1)}>↑</button>
    <button type="button" id={actionId(id, "down")} className="ck-act" aria-label={`Move ${what} down`} title="Move down" disabled={last} onClick={() => onMove(1)}>↓</button>
    <button type="button" id={actionId(id, "del")} className="ck-act" aria-label={`Delete ${what}`} title="Delete" onClick={onDelete}>×</button>
  </span>
}

/** The Paste a list panel. Its preview counts what will actually be added, after the 20 / 60 / 300 limits. */
function PastePanel({ checklist, onAdd, onCancel }: { checklist: Checklist | null; onAdd: (text: string) => void; onCancel: () => void }) {
  const [text, setText] = useState("")
  const parsed = parsePastedList(text)
  const r = addPastedCounted(checklist, parsed, checklistIdMaker(checklist))
  const preview = r.limit ? `${r.added} of ${plural(r.requested, "item")} fit: ${LIMIT_REASON[r.limit]}.` : `${plural(r.requested, "item")} in ${plural(parsed.modules.length, "module")}`
  return <div className="ck-paste" data-testid="onboarding-paste">
    <label htmlFor="ck-paste-text">Paste a list</label>
    <textarea id="ck-paste-text" rows={6} value={text} onChange={e => setText(e.target.value)} aria-describedby="ck-paste-hint" autoFocus />
    <p id="ck-paste-hint" className="muted">Paste lines or spreadsheet rows. A line ending with ':' starts a module.</p>
    <div className="action-row">
      <span role="status" data-testid="onboarding-paste-preview">{preview}</span>
      <button type="button" className="btn btn-primary" disabled={!r.added} onClick={() => onAdd(text)}>Add to checklist</button>
      <button type="button" className="btn" onClick={onCancel}>Cancel</button>
    </div>
  </div>
}
