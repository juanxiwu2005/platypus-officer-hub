import { useEffect, useLayoutEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent, type TextareaHTMLAttributes } from "react"
import { useStore } from "../../data/store"
import type { ChecklistItem, ChecklistModule, ChecklistWhen, ChecklistWho, OnboardingChecklist as Checklist, Role } from "../../data/types"
import { starterChecklist } from "../../data/checklistStarter"
import {
  CHECKLIST_WHEN, CHECKLIST_WHO, MAX_ITEM_TITLE, MAX_MODULE_TITLE, WHEN_LABEL, WHO_LABEL, cellState, checklistIdMaker,
  countEveryone, countForRole, toggleCell, toggleEveryone, type CellState,
} from "../../lib/checklist"
import { addPasted, parsePastedList, parseShorthand } from "../../lib/checklistParse"
import { Info } from "../ui"
import { useRail } from "../rail/RailContext"
import { canAddModule, insertItems, locate, mapItem, moveItem, moveItemTarget, moveModule, newItem, newModule, patchModule, removeItem, removeModule, roomIn, type Dir } from "./onboarding/edit"
import "../../styles/ck-01-onboarding-matrix.css"

/**
 * Settings → Onboarding (option C, docs/feedback-fix/CHECKLIST_MATRIX_CONTRACT.md Section 6): the whole-club onboarding checklist as
 * a matrix, one row per item and one column per current role. The draft on screen is the source of truth while editing; each
 * discrete action saves at once, typing saves after 500 ms. The store sanitizes every save. Undo walks back the last 30 saved versions.
 * No dates and no AI here: "when" stays a relative label.
 */

const UNDO_LIMIT = 30
const TYPING_MS = 500
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const titleId = (id: string) => `ck-t-${id}`
const moduleNameId = (id: string) => `ck-m-${id}`

/** The first option of an item's When / Who list: follow the module. The closed chip shows only the value, dashed. */
const followOption = (label: string) => `${label} (module)`

const CELL_WORDS: Record<CellState, string> = { inherited: "gets this item", included: "gets this item", hidden: "hidden", off: "not included" }

export default function OnboardingChecklist() {
  const { state, tryDispatch, getState, saveProblem, persistenceFailed } = useStore()
  const saved = state.org.onboardingChecklist ?? null
  const roles = state.roles
  const [draft, setDraftState] = useState<Checklist | null>(saved)
  const draftRef = useRef(draft)
  const lastSaved = useRef(saved)
  const [undoStack, setUndoStack] = useState<(Checklist | null)[]>([])
  const undoRef = useRef(undoStack)
  const [failed, setFailed] = useState(false)
  const [pending, setPending] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const focusNext = useRef<string | null>(null)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [confirmModule, setConfirmModule] = useState<string | null>(null)
  // Like Workflow and Roles & teams: the matrix needs the width, so the Ask panel steps aside (Ask stays one click away).
  const rail = useRail()
  useEffect(() => { if (rail.tab === "ask") rail.setOpen(false) }, [])

  const setDraft = (next: Checklist | null) => { draftRef.current = next; setDraftState(next) }
  const setUndo = (next: (Checklist | null)[]) => { undoRef.current = next; setUndoStack(next) }

  /** Saves `next` to the store. A version that changed the store goes on the Undo stack. */
  const save = (next: Checklist | null) => {
    const before = getState().org.onboardingChecklist ?? null
    if (tryDispatch({ type: "saveOnboardingChecklist", checklist: next })) {
      setUndo([...undoRef.current, before].slice(-UNDO_LIMIT))
      lastSaved.current = getState().org.onboardingChecklist ?? null
      setFailed(false)
    } else if (saveProblem()) setFailed(true)
  }
  const flush = () => {
    if (!timer.current) return
    clearTimeout(timer.current); timer.current = null; setPending(false)
    save(draftRef.current)
  }
  /** A discrete change: saved at once (after any typing still waiting). */
  const act = (fn: (c: Checklist) => Checklist, focus?: string) => {
    flush()
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
  const start = (next: Checklist, focus?: string) => { flush(); if (focus) focusNext.current = focus; setDraft(next); save(next) }
  const undo = () => {
    flush()
    const stack = undoRef.current
    if (!stack.length) return
    const prev = stack[stack.length - 1]
    if (!tryDispatch({ type: "saveOnboardingChecklist", checklist: prev }) && saveProblem()) { setFailed(true); return }
    setUndo(stack.slice(0, -1))
    lastSaved.current = getState().org.onboardingChecklist ?? null
    setDraft(lastSaved.current); setFailed(false); setConfirmModule(null)
  }

  // Typing still waiting is saved when the tab closes.
  const flushRef = useRef(flush)
  flushRef.current = flush
  useEffect(() => () => flushRef.current(), [])
  // A change made elsewhere (Reset demo, another tab) replaces the draft, unless typing is waiting.
  useEffect(() => {
    if (saved !== lastSaved.current && !timer.current) { lastSaved.current = saved; setDraft(saved) }
  }, [saved])
  useEffect(() => {
    const id = focusNext.current
    if (!id) return
    focusNext.current = null
    document.getElementById(id)?.focus()
  })

  const makeId = () => checklistIdMaker(draftRef.current)

  const addItemToLast = () => {
    const c = draftRef.current
    const m = c?.modules[c.modules.length - 1]
    if (!c || !m) return
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
    const parsed = parsePastedList(text)
    const c = draftRef.current
    const next = addPasted(c, parsed, checklistIdMaker(c))
    if (c) act(() => next)
    else start(next)
    setPasteOpen(false)
  }

  const hasModules = !!draft?.modules.length
  const status = failed || (persistenceFailed && undoStack.length > 0)
    ? <span className="ck-status is-err">Saving failed. Changes are only on screen.</span>
    : saved ? <span className="ck-status">{pending ? "Saving…" : "Saved"}</span> : null

  return <section className="card form-stack ck-root" data-testid="onboarding-settings" aria-labelledby="ck-heading">
    <h2 id="ck-heading">Onboarding checklist</h2>
    {hasModules && draft && <div className="ck-toolbar">
      <button type="button" className="btn" onClick={addItemToLast} disabled={roomIn(draft, draft.modules[draft.modules.length - 1]) === 0}>+ Add item</button>
      <button type="button" className="btn" onClick={addModule} disabled={!canAddModule(draft)}>+ Add module</button>
      <button type="button" className="btn" aria-expanded={pasteOpen} onClick={() => setPasteOpen(o => !o)}>Paste a list</button>
      <div className="ck-toolbar-end"><span role="status" data-testid="onboarding-status">{status}</span>
        <button type="button" className="btn btn-quiet" onClick={undo} disabled={!undoStack.length}>Undo</button></div>
    </div>}
    {pasteOpen && <PastePanel onAdd={addPastedList} onCancel={() => setPasteOpen(false)} />}
    {!hasModules && <div className="ck-empty" data-testid="onboarding-empty">
      <p>Every new officer gets this list.</p>
      <div className="action-row">
        <button type="button" className="btn btn-primary" onClick={() => start(starterChecklist(state))}>Start from Platypus starter</button>
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
              move: dir => act(c => moveModule(c, m.id, dir)),
              remove: () => { if (m.items.length && confirmModule !== m.id) { setConfirmModule(m.id); return } setConfirmModule(null); act(c => removeModule(c, m.id)) },
              cancelRemove: () => setConfirmModule(null),
              addFirst: () => { const id = makeId()(); act(c => insertItems(c, m.id, 0, [newItem(id)]), titleId(id)) },
            }}
            onItem={{
              retitle: (id, title) => typeIn(c => mapItem(c, id, i => ({ ...i, title }))),
              when: (id, when) => act(c => mapItem(c, id, i => { const { when: _w, ...rest } = i; void _w; return when ? { ...rest, when } : rest })),
              who: (id, who) => act(c => mapItem(c, id, i => { const { who: _w, ...rest } = i; void _w; return who ? { ...rest, who } : rest })),
              cell: (id, roleId) => act(c => mapItem(c, id, i => toggleCell(i, roleId))),
              everyone: id => act(c => mapItem(c, id, toggleEveryone)),
              move: (id, dir) => act(c => moveItem(c, id, dir)),
              remove: id => act(c => removeItem(c, id)),
              enter: id => {
                const c = draftRef.current, at = c && locate(c, id)
                if (!c || !at) return
                const item = c.modules[at.mi].items[at.ii]
                if (!item.title.trim()) return
                const parsed = parseShorthand(item.title), nextId = makeId()()
                act(x => {
                  const typed = mapItem(x, id, i => ({ ...i, title: parsed.title, ...(parsed.when ? { when: parsed.when } : {}), ...(parsed.who ? { who: parsed.who } : {}) }))
                  return insertItems(typed, m.id, at.ii + 1, [newItem(nextId)])
                }, titleId(nextId))
              },
              backspace: id => {
                const c = draftRef.current, at = c && locate(c, id)
                if (!c || !at) return
                const prev = c.modules[at.mi].items[at.ii - 1]
                act(x => removeItem(x, id), prev ? titleId(prev.id) : moduleNameId(m.id))
              },
              paste: (id, text) => {
                const c = draftRef.current, at = c && locate(c, id)
                if (!c || !at) return
                const lines = parsePastedList(text).modules.flatMap(pm => pm.items)
                if (!lines.length) return
                const idOf = makeId()
                const replaceSelf = !c.modules[at.mi].items[at.ii].title.trim()
                const [firstLine, ...rest] = lines
                const items = (replaceSelf ? rest : lines).map(line => newItem(idOf(), line))
                act(x => {
                  const base = replaceSelf ? mapItem(x, id, i => ({ ...i, title: firstLine.title, ...(firstLine.when ? { when: firstLine.when } : {}), ...(firstLine.who ? { who: firstLine.who } : {}) })) : x
                  return insertItems(base, m.id, at.ii + 1, items)
                }, titleId(items.slice(0, roomIn(c, c.modules[at.mi])).at(-1)?.id ?? id))
              },
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
  cancelRemove: () => void
  addFirst: () => void
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
}

function ModuleRows({ module: m, first, last, checklist, roles, confirming, onModule, onItem }: {
  module: ChecklistModule; first: boolean; last: boolean; checklist: Checklist; roles: Role[]; confirming: boolean; onModule: ModuleHandlers; onItem: ItemHandlers
}) {
  const nameKey = (e: KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === "Enter") { e.preventDefault(); onModule.addFirst() } }
  return <tbody>
    <tr className="ck-module" data-testid="onboarding-module">
      <th scope="row"><GrowField id={moduleNameId(m.id)} className="ck-name" aria-label="Module name" value={m.title} maxLength={MAX_MODULE_TITLE} onText={onModule.rename} onKeyDown={nameKey} /></th>
      <td><ChipSelect kind="is-module" label="Module when" shown={WHEN_LABEL[m.when]} value={m.when} options={CHECKLIST_WHEN.map(w => [w, WHEN_LABEL[w]] as const)} onPick={v => onModule.when(v as ChecklistWhen)} /></td>
      <td><ChipSelect kind="is-module" label="Module who does it" shown={WHO_LABEL[m.who]} value={m.who} options={CHECKLIST_WHO.map(w => [w, WHO_LABEL[w]] as const)} onPick={v => onModule.who(v as ChecklistWho)} /></td>
      <td colSpan={roles.length + 1} className="ck-module-info">{confirming
        ? <span className="ck-confirm" role="group" aria-label="Delete module">Delete {plural(m.items.length, "item")} too?
          <button type="button" className="btn small" onClick={onModule.remove}>Delete</button>
          <button type="button" className="btn small btn-quiet" onClick={onModule.cancelRemove}>Cancel</button></span>
        : <span className="muted">{plural(m.items.length, "item")}</span>}</td>
      <td className="ck-actions"><RowActions first={first} last={last} onMove={onModule.move} onDelete={onModule.remove} what="module" /></td>
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
  return <tr className="ck-item" data-testid="onboarding-item">
    <th scope="row"><div className="ck-title-cell">
      <GrowField id={titleId(item.id)} className="ck-title" aria-label="Item title" value={item.title} maxLength={MAX_ITEM_TITLE} onText={title => on.retitle(item.id, title)} onKeyDown={key} onPaste={paste} />
      {item.source && <span className="rule-id">{item.source}</span>}
    </div></th>
    <td><ChipSelect kind={item.when ? "is-set" : "is-follow"} label={item.when ? "When" : `When: follows module, ${WHEN_LABEL[m.when]}`}
      shown={WHEN_LABEL[item.when ?? m.when]} value={item.when ?? ""} options={[["", followOption(WHEN_LABEL[m.when])], ...CHECKLIST_WHEN.map(w => [w, WHEN_LABEL[w]] as const)]}
      onPick={v => on.when(item.id, (v || null) as ChecklistWhen | null)} /></td>
    <td><ChipSelect kind={item.who ? "is-set" : "is-follow"} label={item.who ? "Who does it" : `Who does it: follows module, ${WHO_LABEL[m.who]}`}
      shown={WHO_LABEL[item.who ?? m.who]} value={item.who ?? ""} options={[["", followOption(WHO_LABEL[m.who])], ...CHECKLIST_WHO.map(w => [w, WHO_LABEL[w]] as const)]}
      onPick={v => on.who(item.id, (v || null) as ChecklistWho | null)} /></td>
    <td className="ck-col"><button type="button" className="ck-cell" aria-pressed={item.everyone} aria-label={`Everyone: ${item.everyone ? "on" : "off"}`} onClick={() => on.everyone(item.id)}>
      <span className={`ck-dot ${item.everyone ? "is-included" : "is-off"}`} aria-hidden="true" /></button></td>
    {roles.map(r => {
      const s = cellState(item, r.id)
      return <td key={r.id} className="ck-col"><button type="button" className="ck-cell" aria-pressed={s === "inherited" || s === "included"} aria-label={`${r.displayName}: ${CELL_WORDS[s]}`} onClick={() => on.cell(item.id, r.id)}>
        <span className={`ck-dot is-${s}`} aria-hidden="true" /></button></td>
    })}
    <td className="ck-actions"><RowActions first={!canUp} last={!canDown} onMove={dir => on.move(item.id, dir)} onDelete={() => on.remove(item.id)} what="item" /></td>
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

function RowActions({ first, last, onMove, onDelete, what }: { first: boolean; last: boolean; onMove: (dir: Dir) => void; onDelete: () => void; what: "item" | "module" }) {
  return <span className="ck-row-actions">
    <button type="button" className="ck-act" aria-label={`Move ${what} up`} title="Move up" disabled={first} onClick={() => onMove(-1)}>↑</button>
    <button type="button" className="ck-act" aria-label={`Move ${what} down`} title="Move down" disabled={last} onClick={() => onMove(1)}>↓</button>
    <button type="button" className="ck-act" aria-label={`Delete ${what}`} title="Delete" onClick={onDelete}>×</button>
  </span>
}

function PastePanel({ onAdd, onCancel }: { onAdd: (text: string) => void; onCancel: () => void }) {
  const [text, setText] = useState("")
  const parsed = parsePastedList(text)
  const items = parsed.modules.reduce((n, m) => n + m.items.length, 0)
  return <div className="ck-paste" data-testid="onboarding-paste">
    <label htmlFor="ck-paste-text">Paste a list</label>
    <textarea id="ck-paste-text" rows={6} value={text} onChange={e => setText(e.target.value)} aria-describedby="ck-paste-hint" autoFocus />
    <p id="ck-paste-hint" className="muted">Paste lines or spreadsheet rows. A line ending with ':' starts a module.</p>
    <div className="action-row">
      <span role="status" data-testid="onboarding-paste-preview">{plural(items, "item")} in {plural(parsed.modules.length, "module")}</span>
      <button type="button" className="btn btn-primary" disabled={!items} onClick={() => onAdd(text)}>Add to checklist</button>
      <button type="button" className="btn" onClick={onCancel}>Cancel</button>
    </div>
  </div>
}
