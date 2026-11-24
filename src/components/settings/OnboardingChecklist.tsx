import { useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type ButtonHTMLAttributes, type ClipboardEvent, type CSSProperties, type KeyboardEvent, type TextareaHTMLAttributes } from "react"
import { useStore } from "../../data/store"
import type { ChecklistItem, ChecklistModule, ChecklistWhen, OnboardingChecklist as Checklist, Role } from "../../data/types"
import { starterChecklist } from "../../data/checklistStarter"
import {
  CHECKLIST_WHEN, MAX_ITEM_TITLE, MAX_MODULE_TITLE, WHEN_LABEL, allRolesGet, checklistIdMaker, countEveryone, countForRole, getsItem,
  sanitizeChecklist, toggleCell, toggleEveryone,
} from "../../lib/checklist"
import { parsePastedList, parseShorthand } from "../../lib/checklistParse"
import { Info } from "../ui"
import { useRail } from "../rail/RailContext"
import {
  LIMIT_REASON, addPastedCounted, applyLine, canAddModule, focusAfterRemoveItem, focusAfterRemoveModule, insertItems, itemPlace, itemStepWithRoom, limitIn, limitNote,
  locate, mapItem, moduleFullFor, moveItemTo, moveModuleTo, newItem, newModule, pasteIntoItem, patchModule, removeItem, removeModule, roomIn, type Dir,
} from "./onboarding/edit"
import { columnRoles, roleColumnGroups, type RoleColumnGroup } from "./onboarding/columns"
import { useRowDrag, type DragKind, type RowDrop } from "./onboarding/useRowDrag"
import "../../styles/ck-01-onboarding-matrix.css"

/**
 * Settings → Onboarding (option C, docs/feedback-fix/CHECKLIST_MATRIX_CONTRACT.md Sections 6 and 8): the whole-club onboarding
 * checklist as a matrix, one row per item and one column per current role, grouped under the teams of Settings → Roles & teams.
 * The draft on screen is the source of truth while editing; each discrete action saves at once, typing saves after 500 ms (and
 * at once when a title field loses focus or the page is hidden or left). The store sanitizes every save. Undo walks back the
 * last 30 saved versions made here.
 * When the saved checklist changes from outside (Reset demo, an import), the editor takes it as it is: typing still waiting is
 * dropped and the Undo history, which belongs to the old checklist, is cleared.
 * Rows move with their handle: drag it (mouse, touch, pen), or press Space / Enter on it, move with the arrow keys and drop with
 * Space / Enter (Escape cancels). Either way one drop is one save and one Undo step.
 * No dates and no AI here: "when" stays a relative label.
 */

const UNDO_LIMIT = 30
const TYPING_MS = 500
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const titleId = (id: string) => `ck-t-${id}`
const moduleNameId = (id: string) => `ck-m-${id}`
const hintId = (id: string) => `ck-h-${id}`
const cancelId = (id: string) => `ck-x-${id}`
/** The drag handle of an item or module (item and module ids never collide). */
const handleId = (id: string) => `ck-g-${id}`
const deleteId = (id: string) => `ck-del-${id}`
/** The empty state's first button: focus goes there when the last module is deleted. */
const START_ID = "ck-start"
const DRAG_HELP_ID = "ck-drag-help"
/** Module colours cycle through this many soft tones (`ck-mod-N`, ck-01-onboarding-matrix.css). */
const MODULE_TONES = 6

/** The first option of an item's When list: follow the module. The closed chip shows only the value, dashed. */
const followOption = (label: string) => `${label} (module)`

/** An item's title inside a control's name, cut to about 40 characters. */
function shortTitle(title: string) {
  const t = title.trim()
  if (!t) return "untitled item"
  return t.length > 40 ? `${t.slice(0, 39).trimEnd()}…` : t
}
const moduleName = (m: ChecklistModule) => m.title.trim() || "untitled module"

/**
 * The saved checklist as the editor can show it: sanitized with the current roles, so a damaged save (a module without its
 * items list, an unknown value) never reaches the matrix. Null when nothing is saved or the saved value is not a checklist.
 */
const readSaved = (raw: unknown, roleIds: readonly string[], today: string) => raw == null ? null : sanitizeChecklist(raw, roleIds, today)

/** A row picked up from the keyboard: it moves on screen with the arrow keys; `original` comes back on Escape. */
interface Lift { kind: DragKind; id: string; original: Checklist }

/** "Position 2 of 5 in Learn the club." / "Position 2 of 5." */
function placeText(c: Checklist, kind: DragKind, id: string) {
  if (kind === "module") return `Position ${c.modules.findIndex(m => m.id === id) + 1} of ${c.modules.length}.`
  const p = itemPlace(c, id)
  return p ? `Position ${p.position} of ${p.of} in ${moduleName(p.module)}.` : ""
}
const fullText = (m: ChecklistModule) => `No room in ${moduleName(m)}: ${LIMIT_REASON.module}.`

export default function OnboardingChecklist() {
  const { state, tryDispatch, getState, saveProblem, persistenceFailed } = useStore()
  const raw = state.org.onboardingChecklist ?? null
  const roles = state.roles
  const roleKey = roles.map(r => r.id).join("\n")
  const roleIds = useMemo(() => roleKey ? roleKey.split("\n") : [], [roleKey])
  const saved = useMemo(() => readSaved(raw, roleIds, state.today), [raw, roleIds, state.today])
  // Teams are read live from Settings → Roles & teams: renaming a team or moving a role regroups the columns at once.
  const groups = useMemo(() => roleColumnGroups(roles, state.org.workflowTeams, state.org.workflowRoleTeams), [roles, state.org.workflowTeams, state.org.workflowRoleTeams])
  const cols = useMemo(() => columnRoles(roles, groups), [roles, groups])
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
  const focusFallback = useRef<string | null>(null)
  const [, rerender] = useReducer((n: number) => n + 1, 0)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [confirmModule, setConfirmModule] = useState<string | null>(null)
  /** A short visible note (what a limit cut) and what the live region says (notes, Undo, moves). Typing saves are never announced. */
  const [note, setNote] = useState<string | null>(null)
  const [spoken, setSpoken] = useState("")
  const [lift, setLiftState] = useState<Lift | null>(null)
  const liftRef = useRef(lift)
  const wrapRef = useRef<HTMLDivElement>(null)
  const ghostRef = useRef<HTMLDivElement>(null)
  // Like Workflow and Roles & teams: the matrix needs the width, so the Ask panel steps aside (Ask stays one click away).
  const rail = useRail()
  useEffect(() => { if (rail.tab === "ask") rail.setOpen(false) }, [])
  const hasRows = !!draft?.modules.length
  // Frozen header (contract Section 8 item 8): the frame is the matrix's vertical scroll box, so its sticky header stays in view.
  // Its height is what the screen has left once the top bar and everything below the frame (legend, card and page padding) fit:
  // then even at the very end of the page the frame's top, and so its header, sits just under the top bar, never behind it.
  // Only when that space cannot show the header and one row (a very short window, a high zoom) is it taller, and never taller
  // than the screen below the top bar. The header's own height (--ck-head-h) keeps a focused row clear of it (scroll-padding).
  useLayoutEffect(() => {
    const wrap = wrapRef.current
    if (!wrap || typeof ResizeObserver === "undefined") return
    const fit = () => {
      const bar = document.querySelector(".topbar")?.getBoundingClientRect().height ?? 0
      const below = Math.max(0, document.documentElement.scrollHeight - (wrap.getBoundingClientRect().bottom + window.scrollY))
      const head = Math.ceil(wrap.querySelector("thead")?.getBoundingClientRect().height ?? 0)
      const row = Math.ceil(wrap.querySelector("tbody tr")?.getBoundingClientRect().height ?? 0)
      const screen = window.innerHeight - bar - 8
      const floor = Math.min(head + row, screen)
      wrap.style.setProperty("--ck-head-h", `${head}px`)
      wrap.style.setProperty("--ck-frame-h", `${Math.floor(Math.max(floor, screen - below))}px`)
    }
    fit()
    const watch = new ResizeObserver(fit)
    watch.observe(document.body)
    const thead = wrap.querySelector("thead")
    if (thead) watch.observe(thead)
    window.addEventListener("resize", fit)
    return () => { watch.disconnect(); window.removeEventListener("resize", fit) }
  }, [hasRows])

  const setDraft = (next: Checklist | null) => { draftRef.current = next; setDraftState(next) }
  const setUndo = (next: (Checklist | null)[]) => { undoRef.current = next; setUndoStack(next) }
  const setLift = (next: Lift | null) => { liftRef.current = next; setLiftState(next) }
  const say = (text: string | null, visible = true) => { setNote(visible ? text : null); setSpoken(text ?? "") }
  /** Focus an element after the next render (and make sure there is one); `fallback` when no element has that id any more. */
  const focusLater = (id: string, fallback?: string) => { focusNext.current = id; focusFallback.current = fallback ?? null; rerender() }
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
  /** A row picked up from the keyboard goes back where it was (Escape, a click elsewhere, focus leaving its handle). */
  const cancelLift = (announce = true) => {
    const l = liftRef.current
    if (!l) return
    setLift(null)
    setDraft(l.original)
    if (announce) say("Move cancelled.", false)
  }
  /** A discrete change: saved at once (after any typing still waiting). */
  const act = (fn: (c: Checklist) => Checklist, focus?: string) => {
    cancelLift(false)
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
    cancelLift(false)
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
  // A row picked up from the keyboard is put back when the pointer goes down anywhere or focus moves off its handle. Putting it
  // back can rebuild the rows the focus went to (the row returns to its module), so focus follows the element it went to by id,
  // or, when that element has none, stays on it while it is still there and otherwise goes to the row's grip.
  const flushRef = useRef(flush)
  flushRef.current = flush
  const cancelLiftRef = useRef(cancelLift)
  cancelLiftRef.current = cancelLift
  const focusLaterRef = useRef(focusLater)
  focusLaterRef.current = focusLater
  useEffect(() => {
    const leave = () => flushRef.current()
    const hidden = () => { if (document.visibilityState === "hidden") flushRef.current() }
    // A click into a text field changes nothing by itself (leaving the old field already saved it), so typing keeps one Undo step.
    const clicked = (e: Event) => { if (!(e.target instanceof HTMLTextAreaElement)) flushRef.current() }
    const pressed = () => cancelLiftRef.current()
    const focused = (e: FocusEvent) => {
      const l = liftRef.current, to = e.target instanceof HTMLElement ? e.target : null
      if (!l || to?.id === handleId(l.id)) return
      cancelLiftRef.current()
      if (to?.id) focusLaterRef.current(to.id, handleId(l.id))
      else window.requestAnimationFrame(() => { if (!to?.isConnected) document.getElementById(handleId(l.id))?.focus() })
    }
    window.addEventListener("pagehide", leave)
    document.addEventListener("visibilitychange", hidden)
    document.addEventListener("click", clicked, true)
    document.addEventListener("change", leave, true)
    document.addEventListener("pointerdown", pressed, true)
    document.addEventListener("focusin", focused)
    return () => {
      window.removeEventListener("pagehide", leave); document.removeEventListener("visibilitychange", hidden)
      document.removeEventListener("click", clicked, true); document.removeEventListener("change", leave, true)
      document.removeEventListener("pointerdown", pressed, true); document.removeEventListener("focusin", focused)
      flushRef.current()
    }
  }, [])
  // The saved checklist changed from outside (Reset demo, an import): show it, drop typing still waiting and the old Undo history.
  useEffect(() => {
    if (raw === base.current) return
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    base.current = raw
    setLift(null)
    setPending(false); setDraft(saved); setUndo([]); setConfirmModule(null); setFailed(false); say(null)
  }, [raw])
  useEffect(() => {
    const id = focusNext.current, fallback = focusFallback.current
    if (!id) return
    focusNext.current = null; focusFallback.current = null
    ;(document.getElementById(id) ?? (fallback ? document.getElementById(fallback) : null))?.focus()
  })

  const makeId = () => checklistIdMaker(draftRef.current)
  /** Says that a single new item did not fit `m`. */
  const noRoom = (c: Checklist, m: ChecklistModule) => say(limitNote({ requested: 1, added: 0, limit: limitIn(c, m) }))

  const addModule = () => {
    const c = draftRef.current
    const id = makeId()()
    if (!c) { start({ version: 1, modules: [newModule(id, "New module")], updatedOn: "" }, moduleNameId(id)); return }
    if (!canAddModule(c)) return
    act(x => ({ ...x, modules: [...x.modules, newModule(id, "New module")] }), moduleNameId(id))
  }
  /** "+ Add item" on a module row (at its end) or Enter in its name (at its start). */
  const addItemTo = (moduleId: string, at: "start" | "end") => {
    const c = draftRef.current, m = c?.modules.find(x => x.id === moduleId)
    if (!c || !m) return
    if (!roomIn(c, m)) { noRoom(c, m); return }
    const id = makeId()()
    act(x => insertItems(x, moduleId, at === "start" ? 0 : m.items.length, [newItem(id)]), titleId(id))
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

  /* ───────────── Moving rows: the pointer drag and the handle's keyboard mode ───────────── */

  const rowName = (c: Checklist, kind: DragKind, id: string) => {
    if (kind === "item") return shortTitle(c.modules.flatMap(m => m.items).find(i => i.id === id)?.title ?? "")
    const m = c.modules.find(x => x.id === id)
    return m ? `module ${moduleName(m)}` : "module"
  }
  const applyMove = (c: Checklist, kind: DragKind, id: string, to: { moduleId: string | null; index: number }) =>
    kind === "module" ? moveModuleTo(c, id, to.index) : moveItemTo(c, id, to.moduleId!, to.index)

  const { view: dragView, handleProps, handleRef } = useRowDrag({
    wrap: wrapRef, ghost: ghostRef,
    isFull: (itemId, moduleId) => { const c = draftRef.current; return !!c && moduleFullFor(c, itemId, moduleId) },
    onStart: () => { cancelLift(false); flush(); say(null); setConfirmModule(null) },
    onDrop: (kind, id, drop: RowDrop) => {
      const c = draftRef.current
      if (!c) return
      if (drop.full) { const m = c.modules.find(x => x.id === drop.moduleId); if (m) say(fullText(m)); focusLater(handleId(id)); return }
      const next = applyMove(c, kind, id, drop)
      if (next === c) { say("Not moved.", false); focusLater(handleId(id)); return }
      act(() => next, handleId(id))
      say(`Moved ${rowName(next, kind, id)}. ${placeText(next, kind, id)}`, false)
    },
    onCancel: (_kind, id) => { say("Move cancelled.", false); focusLater(handleId(id)) },
  })

  /** Space / Enter picks a row up or drops it, the arrow keys move it, Escape puts it back. */
  const handleKey = (kind: DragKind, id: string, e: KeyboardEvent<HTMLButtonElement>) => {
    const l = liftRef.current, mine = l?.id === id
    const c = draftRef.current
    if (!c) return
    // A held key repeats: only its first press picks up or drops (and a held arrow moves one place per press).
    if (e.repeat) { if (mine || e.key === " " || e.key === "Enter") e.preventDefault(); return }
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault()
      if (!mine) {
        cancelLift(false); flush(); setConfirmModule(null)
        const current = draftRef.current!
        setLift({ kind, id, original: current })
        say(`Picked up ${rowName(current, kind, id)}. ${placeText(current, kind, id)} Arrow keys move it, Space drops it, Escape cancels.`, false)
        return
      }
      setLift(null)
      if (c !== l.original) save(c)
      say(`Dropped ${rowName(c, kind, id)}. ${placeText(c, kind, id)}`, false)
      return
    }
    if (!mine) return
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cancelLift(); focusLater(handleId(id)); return }
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return
    e.preventDefault()
    const dir: Dir = e.key === "ArrowUp" ? -1 : 1
    if (kind === "module") {
      const i = c.modules.findIndex(m => m.id === id), next = moveModuleTo(c, id, i + dir)
      if (next === c) { say(dir < 0 ? "Already first." : "Already last.", false); return }
      setDraft(next); focusLater(handleId(id)); say(placeText(next, kind, id), false)
      return
    }
    // Like a pointer drag, the arrows pass over a full module to the next one with room, and say which they passed.
    const to = itemStepWithRoom(c, id, dir)
    if (!to) { say(dir < 0 ? "Already first." : "Already last.", false); return }
    if ("full" in to) { say(fullText(to.full), false); return }
    const next = moveItemTo(c, id, to.moduleId, to.index)
    const skipped = to.skipped.length ? `Skipped ${to.skipped.map(moduleName).join(", ")}, which ${to.skipped.length === 1 ? "is" : "are"} full. ` : ""
    setDraft(next); focusLater(handleId(id)); say(`${skipped}${placeText(next, kind, id)}`, false)
  }
  const handle = (kind: DragKind, id: string, label: string) => ({
    id: handleId(id), label, lifted: lift?.id === id, ref: handleRef,
    props: { ...handleProps(kind, id, label), onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => handleKey(kind, id, e) },
  })

  const hasModules = !!draft?.modules.length
  const untitled = draft ? draft.modules.reduce((n, m) => n + m.items.filter(i => !i.title.trim()).length, 0) : 0
  const saveFailed = failed || (persistenceFailed && undoStack.length > 0)
  // Visible only: a screen reader is not told about every pause in typing. A failure is an alert.
  const status = saveFailed
    ? <span className="ck-status is-err" role="alert">Saving failed. Changes are only on screen.</span>
    : untitled ? <span className="ck-status is-warn">{plural(untitled, "item")} {untitled === 1 ? "needs" : "need"} a title</span>
    : raw ? <span className="ck-status">{pending ? "Saving…" : "Saved"}</span> : null
  const drop = dragView?.drop ?? null

  return <section className={`card form-stack ck-root${dragView ? " is-dragging" : ""}`} data-testid="onboarding-settings" aria-labelledby="ck-heading">
    <h2 id="ck-heading">Onboarding checklist</h2>
    {hasModules && draft && <div className="ck-toolbar">
      <button type="button" className="btn" onClick={addModule} disabled={!canAddModule(draft)}>+ Add module</button>
      <button type="button" className="btn" aria-expanded={pasteOpen} onClick={() => setPasteOpen(o => !o)}>Paste a list</button>
      <div className="ck-toolbar-end"><span data-testid="onboarding-status">{status}</span>
        <button type="button" className="btn btn-quiet" onClick={undo} disabled={!undoStack.length}>Undo</button></div>
    </div>}
    <div className="sr-only" role="status" data-testid="onboarding-announce">{spoken}</div>
    <span id={DRAG_HELP_ID} className="sr-only">Drag to move, or press Space, then the arrow keys.</span>
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
      <div className="ck-wrap" ref={wrapRef} data-testid="onboarding-frame">
        <table className="tbl ck-table" data-testid="onboarding-matrix">
          <colgroup><col /><col /><col /></colgroup>
          {groups.map(g => <colgroup key={g.teamId ?? "none"} span={g.roleIds.length} />)}
          <colgroup><col /></colgroup>
          <thead>
            <tr className="ck-team-row">
              <th scope="col" rowSpan={2} className="ck-corner">Item</th>
              <th scope="col" rowSpan={2}>When</th>
              <th scope="col" rowSpan={2} className="ck-col">Everyone</th>
              {groups.map(g => <TeamHeader key={g.teamId ?? "none"} group={g} />)}
              <th scope="col" rowSpan={2} className="ck-actions-head"><span className="sr-only">Actions</span></th>
            </tr>
            <tr className="ck-role-row">
              {cols.map(r => <th key={r.id} scope="col" className="ck-col">{r.displayName}</th>)}
            </tr>
          </thead>
          {draft.modules.map((m, mi) => <ModuleRows key={m.id} module={m} tone={mi % MODULE_TONES} roles={cols} roleIds={roleIds}
            confirming={confirmModule === m.id} dragged={dragView?.kind === "module" && dragView.id === m.id} draggedItem={dragView?.kind === "item" ? dragView.id : null}
            handle={handle} room={roomIn(draft, m) > 0}
            onModule={{
              rename: title => typeIn(c => patchModule(c, m.id, { title })),
              when: when => act(c => patchModule(c, m.id, { when })),
              // × only asks: the module goes only from the prompt's Delete button, so a double press cannot delete it.
              remove: () => { if (!m.items.length) { deleteModule(m.id); return } setConfirmModule(m.id); focusLater(cancelId(m.id)) },
              confirmRemove: () => { setConfirmModule(null); deleteModule(m.id) },
              cancelRemove: () => { setConfirmModule(null); focusLater(deleteId(m.id)) },
              addFirst: () => addItemTo(m.id, "start"),
              addLast: () => addItemTo(m.id, "end"),
              flush,
            }}
            onItem={{
              retitle: (id, title) => typeIn(c => mapItem(c, id, i => ({ ...i, title }))),
              when: (id, when) => act(c => mapItem(c, id, i => { const { when: _w, ...rest } = i; void _w; return when ? { ...rest, when } : rest })),
              cell: (id, roleId) => act(c => mapItem(c, id, i => toggleCell(i, roleId, roleIds))),
              everyone: id => act(c => mapItem(c, id, i => toggleEveryone(i, roleIds))),
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
            <th scope="row">Items per role</th><td />
            <td className="ck-col" data-testid="count-everyone">{countEveryone(draft, roleIds)}</td>
            {cols.map(r => <td key={r.id} className="ck-col" data-testid={`count-${r.id}`}>{countForRole(draft, r.id)}</td>)}
            <td />
          </tr></tfoot>
        </table>
        {drop && <div className={`ck-drop-line${drop.full ? " is-full" : ""}`} data-testid="onboarding-drop-line" aria-hidden="true"
          style={{ "--ck-drop-y": `${drop.line}px`, "--ck-drop-w": `${drop.width}px` } as CSSProperties} />}
      </div>
      {dragView && <div ref={ghostRef} className="ck-ghost" aria-hidden="true">{dragView.label}</div>}
      <div className="ck-legend-row">
        <ul className="ck-legend" aria-label="Legend">
          <li><span className="ck-dot is-on" aria-hidden="true" />Gets it</li>
          <li><span className="ck-dot is-off" aria-hidden="true" />Does not get it</li>
          <li><span className="ck-chip-swatch" aria-hidden="true" />Follows the module</li>
        </ul>
        <Info label="How the matrix works">Click a dot to give or take an item for one role. Everyone gives it to all roles, or to none when all have it. Drag the grip to move a row. A dashed chip follows its module.</Info>
      </div>
    </>}
  </section>
}

/** One team over its role columns, in the team's Roles & teams colour; "Not in a team" is plain and dashed. */
function TeamHeader({ group: g }: { group: RoleColumnGroup }) {
  return <th scope="colgroup" colSpan={g.roleIds.length} className={`ck-team ${g.tone === null ? "is-none wfx-tone-none" : `wfx-tone-${g.tone}`}`} data-testid="onboarding-team" data-team-id={g.teamId ?? ""} title={g.name}>
    <span className="ck-team-name">{g.name}</span>
  </th>
}

interface HandleInfo { id: string; label: string; lifted: boolean; ref: (el: HTMLElement | null) => void; props: ButtonHTMLAttributes<HTMLButtonElement> }
type HandleFor = (kind: DragKind, id: string, label: string) => HandleInfo

/** The grip at the start of a row: drag it, or use it from the keyboard (WCAG 2.5.7). */
function Grip({ info }: { info: HandleInfo }) {
  return <button type="button" ref={info.ref} id={info.id} className={`ck-grip${info.lifted ? " is-lifted" : ""}`} aria-label={info.label} aria-describedby={DRAG_HELP_ID} title="Drag to move" {...info.props} />
}

interface ModuleHandlers {
  rename: (title: string) => void
  when: (when: ChecklistWhen) => void
  remove: () => void
  confirmRemove: () => void
  cancelRemove: () => void
  addFirst: () => void
  addLast: () => void
  /** Saves typing still waiting (a title field lost focus). */
  flush: () => void
}
interface ItemHandlers {
  retitle: (id: string, title: string) => void
  when: (id: string, when: ChecklistWhen | null) => void
  cell: (id: string, roleId: string) => void
  everyone: (id: string) => void
  remove: (id: string) => void
  enter: (id: string) => void
  backspace: (id: string) => void
  paste: (id: string, text: string) => void
  flush: () => void
}

function ModuleRows({ module: m, tone, roles, roleIds, confirming, dragged, draggedItem, handle, room, onModule, onItem }: {
  module: ChecklistModule; tone: number; roles: Role[]; roleIds: readonly string[]; confirming: boolean; dragged: boolean; draggedItem: string | null
  handle: HandleFor; room: boolean; onModule: ModuleHandlers; onItem: ItemHandlers
}) {
  const nameKey = (e: KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === "Enter") { e.preventDefault(); onModule.addFirst() } }
  // Escape anywhere in the row closes the delete prompt and gives focus back to ×.
  const rowKey = (e: KeyboardEvent<HTMLTableRowElement>) => { if (confirming && e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onModule.cancelRemove() } }
  const name = moduleName(m)
  return <tbody className={`ck-mod-${tone}${dragged ? " is-dragged" : ""}`} data-module-id={m.id} data-testid="onboarding-module-group">
    <tr className="ck-module" data-testid="onboarding-module" onKeyDown={rowKey}>
      <th scope="row"><div className="ck-lead">
        <Grip info={handle("module", m.id, `Move module ${name}`)} />
        <GrowField id={moduleNameId(m.id)} className="ck-name" aria-label="Module name" value={m.title} maxLength={MAX_MODULE_TITLE} onText={onModule.rename} onKeyDown={nameKey} onBlur={onModule.flush} />
      </div></th>
      <td><ChipSelect kind="is-module" label="Module when" shown={WHEN_LABEL[m.when]} value={m.when} options={CHECKLIST_WHEN.map(w => [w, WHEN_LABEL[w]] as const)} onPick={v => onModule.when(v as ChecklistWhen)} /></td>
      <td colSpan={roles.length + 1} className="ck-module-info"><div className="ck-module-bar">{confirming
        ? <span className="ck-confirm" role="group" aria-label="Delete module"><span role="alert">Delete {plural(m.items.length, "item")} too?</span>
          <button type="button" className="btn small" onClick={onModule.confirmRemove}>Delete</button>
          <button type="button" id={cancelId(m.id)} className="btn small btn-quiet" onClick={onModule.cancelRemove}>Cancel</button></span>
        : <span className="muted ck-module-count">{plural(m.items.length, "item")}</span>}
        {!confirming && <button type="button" className="btn small ck-add-item" aria-label={`+ Add item to ${name}`} disabled={!room} onClick={onModule.addLast}>+ Add item</button>}
      </div></td>
      <td className="ck-actions"><button type="button" id={deleteId(m.id)} className="ck-act" aria-label="Delete module" title="Delete" onClick={onModule.remove}>×</button></td>
    </tr>
    {m.items.map(item => <ItemRow key={item.id} module={m} item={item} roles={roles} roleIds={roleIds} dragged={draggedItem === item.id} handle={handle} on={onItem} />)}
  </tbody>
}

function ItemRow({ module: m, item, roles, roleIds, dragged, handle, on }: { module: ChecklistModule; item: ChecklistItem; roles: Role[]; roleIds: readonly string[]; dragged: boolean; handle: HandleFor; on: ItemHandlers }) {
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
  const all = allRolesGet(item, roleIds)
  return <tr className={`ck-item${dragged ? " is-dragged" : ""}`} data-testid="onboarding-item" data-item-id={item.id}>
    <th scope="row"><div className="ck-lead">
      <Grip info={handle("item", item.id, `Move ${name}`)} />
      <div className="ck-title-cell">
        <GrowField id={titleId(item.id)} className="ck-title" aria-label="Item title" aria-describedby={untitled ? hintId(item.id) : undefined} value={item.title} maxLength={MAX_ITEM_TITLE}
          onText={title => on.retitle(item.id, title)} onKeyDown={key} onPaste={paste} onBlur={on.flush} />
        {untitled && <span id={hintId(item.id)} className="ck-hint">Add a title to save</span>}
        {item.source && <span className="rule-id">{item.source}</span>}
      </div>
    </div></th>
    <td><ChipSelect kind={item.when ? "is-set" : "is-follow"} label={item.when ? `When for ${name}` : `When for ${name}: follows module, ${WHEN_LABEL[m.when]}`}
      shown={WHEN_LABEL[item.when ?? m.when]} value={item.when ?? ""} options={[["", followOption(WHEN_LABEL[m.when])], ...CHECKLIST_WHEN.map(w => [w, WHEN_LABEL[w]] as const)]}
      onPick={v => on.when(item.id, (v || null) as ChecklistWhen | null)} /></td>
    <td className="ck-col"><button type="button" className="ck-cell" aria-pressed={all} aria-label={`Everyone: ${all ? "all roles get" : "not all roles get"} ${name}`} onClick={() => on.everyone(item.id)}>
      <span className={`ck-dot ${all ? "is-on" : "is-off"}`} aria-hidden="true" /></button></td>
    {roles.map(r => {
      const gets = getsItem(item, r.id)
      return <td key={r.id} className="ck-col"><button type="button" className="ck-cell" aria-pressed={gets} aria-label={`${r.displayName}: ${gets ? "gets" : "does not get"} ${name}`} onClick={() => on.cell(item.id, r.id)}>
        <span className={`ck-dot ${gets ? "is-on" : "is-off"}`} aria-hidden="true" /></button></td>
    })}
    <td className="ck-actions"><button type="button" className="ck-act" aria-label="Delete item" title="Delete" onClick={() => on.remove(item.id)}>×</button></td>
  </tr>
}

/**
 * A When chip: the visible pill shows only the value (dashed when it follows the module), and a transparent native select
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
