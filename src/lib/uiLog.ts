/**
 * Screen events for the interaction log (Phase 3 research build, docs/PHASE3_DATA_DICTIONARY.md).
 *
 * The app's data actions are logged by the store (src/data/store.tsx). This module adds what a participant
 * does on screen — pages visited, buttons and links pressed, choices made in checkboxes and drop-downs,
 * questions asked and what kind of answer came back — into the SAME log, with the same entry shape and one
 * numbering, so the export is one ordered record. UI entries are told apart by a `ui.` prefix on `type`.
 *
 * What is never read: keystrokes, the value of text, number, date, password or file fields (not even their
 * length), scrolling, mouse movement, and the AI's reply text. Query strings are dropped from every address.
 * Controls whose visible name or chosen option would name a person or a club's own text carry `data-log-name` (a fixed
 * name for the log) or, on a drop-down, `data-log-value="omit"` (no chosen value): the Cheers screens use both.
 * Nothing here sends anything anywhere; events only go to the in-browser log.
 *
 * Four behaviour-only items approved by Juanxi on 2026-11-07 (docs/PHASE3_DATA_DICTIONARY.md section 11):
 * study task markers (`ui.task`), leaving the page (`ui.visibility`), starting to type in a field (`ui.edit`,
 * never what was typed) and hover cards that stayed open for at least half a second (`ui.hover`).
 */

import type { LogEntry } from "../data/types"

export type UiType = "ui.navigate" | "ui.click" | "ui.change" | "ui.ask" | "ui.answer" | "ui.details" | "ui.reminder" | "ui.export"
  | "ui.task" | "ui.visibility" | "ui.edit" | "ui.hover"
export type UiPayload = Record<string, string | number | boolean | string[] | null>
export interface UiEvent {
  type: UiType
  payload: UiPayload
  /** false = the control was switched off (aria-disabled) or the answer failed. Defaults to true. */
  applied?: boolean
}

/* ───────────── The bus: components and the page listener emit, the store records ───────────── */

type Listener = (e: UiEvent) => void
const listeners = new Set<Listener>()
// Events emitted before the store subscribed (child effects run before the provider's) wait here.
const early: UiEvent[] = []
const EARLY_LIMIT = 50

export function emitUi(type: UiType, payload: UiPayload, applied = true): void {
  publishUi({ type, payload, ...(applied ? {} : { applied: false }) })
}
export function publishUi(event: UiEvent): void {
  if (!listeners.size) { if (early.length < EARLY_LIMIT) early.push(event); return }
  listeners.forEach(fn => fn(event))
}

/** The store subscribes here. Returns the unsubscribe function. */
export function onUi(fn: Listener): () => void {
  listeners.add(fn)
  early.splice(0).forEach(fn)
  return () => { listeners.delete(fn) }
}

/* ───────────── Text helpers ───────────── */

/** Collapse whitespace and cut to `n` characters. */
export function clip(text: string | null | undefined, n = 80): string {
  const t = (text ?? "").replace(/\s+/g, " ").trim()
  return t.length > n ? `${t.slice(0, n)}…` : t
}

/** "#/tasks?node=x" → { path: "/tasks", params: ["node"] }. Only the names of query parameters are kept, never their values. */
export function routeOf(hash: string): { path: string; params: string[] } {
  const h = hash.startsWith("#") ? hash.slice(1) : hash
  const [path, query = ""] = h.split("?")
  const params = query ? [...new Set(query.split("&").map(p => decodeURIComponentSafe(p.split("=")[0])).filter(Boolean))].slice(0, 5) : []
  return { path: path || "/", params }
}
const decodeURIComponentSafe = (s: string) => { try { return clip(decodeURIComponent(s), 20) } catch { return "" } }

/* ───────────── Reading a control ───────────── */

/** Things a participant presses. */
const PRESSABLE = 'a[href], button, summary, [role="button"], [role="tab"], [role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"], [role="option"], [role="link"], [role="switch"], [role="treeitem"], input[type="submit"], input[type="button"], input[type="reset"], input[type="image"]'
/** Parts of the screen, most specific first. */
const AREAS: [string, string][] = [
  ['[data-testid="bot-reply"]', "answer"], ['[data-testid="nudge-panel"]', "reminder"], ['[role="dialog"]', "dialog"], ['[role="menu"]', "menu"],
  ['[data-testid="ask-panel"]', "ask"], [".rail", "rail"], ["nav", "nav"], ["header", "header"], ["main", "main"],
]

/** Visible text of an element without the text of controls inside it (a <label> around a <select> would otherwise include every option). */
function ownText(el: Element): string {
  let out = ""
  el.childNodes.forEach(node => {
    if (node.nodeType === 3) out += node.textContent ?? ""
    else if (node.nodeType === 1) {
      const child = node as Element
      // A hover card inside (role="tooltip") is not the control's name: its text only shows on hover.
      if (child.matches("select, option, textarea, input, [aria-hidden='true'], svg, [role='tooltip']")) return
      out += ` ${ownText(child)} `
    }
  })
  return out
}

/** A short accessible name: aria-label, aria-labelledby, the field's label, its text, title or image alt. Never a typed value. */
export function nameOf(el: Element): string {
  const aria = el.getAttribute("aria-label")
  if (aria) return clip(aria)
  const by = el.getAttribute("aria-labelledby")
  if (by) {
    const text = by.split(/\s+/).map(id => el.ownerDocument.getElementById(id)).filter(Boolean).map(x => ownText(x!)).join(" ")
    if (clip(text)) return clip(text)
  }
  const labels = (el as HTMLInputElement).labels
  if (labels && labels.length) { const text = clip([...labels].map(ownText).join(" ")); if (text) return text }
  if (el instanceof HTMLInputElement && /^(submit|button|reset)$/.test(el.type)) return clip(el.value)   // a button's caption, not typed text
  const text = clip(ownText(el))
  if (text) return text
  const title = el.getAttribute("title") ?? el.querySelector("[title]")?.getAttribute("title")
  if (title) return clip(title)
  const alt = el.querySelector("img[alt]")?.getAttribute("alt")
  return clip(alt ?? "")
}

export function roleOf(el: Element): string {
  const role = el.getAttribute("role")
  if (role) return role
  const tag = el.tagName.toLowerCase()
  if (tag === "a") return "link"
  if (tag === "summary") return "summary"
  if (tag === "select") return "combobox"
  if (tag === "input") {
    const type = (el as HTMLInputElement).type
    return type === "checkbox" ? "checkbox" : type === "radio" ? "radio" : "button"
  }
  return tag
}

export function areaOf(el: Element): string | null {
  for (const [selector, area] of AREAS) if (el.closest(selector)) return area
  return null
}

/** Where a link goes: an app page (path only), or an outside address (host + path, never the query). */
export function linkTarget(href: string, origin: string): { to: string } | { external: true; href: string } {
  if (href.startsWith("#")) return { to: routeOf(href).path }
  let url: URL
  try { url = new URL(href, origin) } catch { return { external: true, href: "unreadable" } }
  if (!/^https?:$/.test(url.protocol)) return { external: true, href: url.protocol }       // mailto:, sms:, tel: … — the scheme only
  if (url.origin === origin) return { to: url.hash.startsWith("#/") ? routeOf(url.hash).path : clip(url.pathname, 120) }
  return { external: true, href: clip(`${url.host}${url.pathname}`, 120) }
}

/**
 * The name the log records for a control: its `data-log-name` when it has one, otherwise its accessible name (nameOf).
 * `data-log-name` is for controls whose visible name is text a club wrote (a Playbook question, say): the log gets a fixed
 * label instead, and what a screen reader announces is unchanged. Only the control's own attribute counts, not a wrapper's.
 */
export function logNameOf(el: Element): string {
  const fixed = el.getAttribute("data-log-name")
  return fixed ? clip(fixed, 60) : nameOf(el)
}

const common = (el: Element, route: string): UiPayload => {
  const payload: UiPayload = { route, role: roleOf(el), name: logNameOf(el) }
  const testid = el.getAttribute("data-testid")
  if (testid) payload.testid = clip(testid, 60)
  const area = areaOf(el)
  if (area) payload.area = area
  return payload
}

/** What a click pressed, or null when it pressed nothing worth recording (empty space, a text field, a checkbox — its change is recorded instead). */
export function describeClick(target: EventTarget | null, route: string, origin: string): UiEvent | null {
  if (!target || !(target as Element).closest) return null
  const el = target as Element
  const field = el.closest("input, textarea, select, [contenteditable='true'], label")
  if (field) {
    if (field.matches("textarea, select, [contenteditable='true']")) return null
    if (field.matches("label")) {
      // A click on a label is passed on to its field; that field's change (if any) is what gets recorded.
      const control = (field as HTMLLabelElement).control
      if (control || !el.closest(PRESSABLE)) return null
    } else if (field instanceof HTMLInputElement && !/^(submit|button|reset|image)$/.test(field.type)) return null
  }
  const c = el.closest(PRESSABLE)
  if (!c) return null
  if (c.matches("a[download]")) return null                       // the export's own file link; "ui.export" records it
  if (c.closest("[data-ui-log='skip']")) return null              // a control that writes its own entry (the study task buttons: "ui.task")
  const payload = common(c, route)
  if (c.matches("a[href]")) Object.assign(payload, linkTarget(c.getAttribute("href") ?? "", origin))
  if (c.matches("summary") && c.parentElement instanceof HTMLDetailsElement) payload.expanded = !c.parentElement.open
  else if (c.hasAttribute("aria-expanded")) payload.expanded = c.getAttribute("aria-expanded") !== "true"
  if (c.getAttribute("role") === "tab") payload.selected = true
  const off = c.getAttribute("aria-disabled") === "true" || (c as HTMLButtonElement).disabled === true
  return { type: "ui.click", payload, ...(off ? { applied: false } : {}) }
}

/**
 * A choice made in a checkbox, radio button or drop-down. Text, date, number and file fields return null: what is typed is never read.
 * A drop-down marked `data-log-value="omit"` records its name only, never the option chosen (nor, for a multiple choice, how many).
 */
export function describeChange(target: EventTarget | null, route: string): UiEvent | null {
  const el = target as Element | null
  if (!el || !el.tagName) return null
  if (el instanceof HTMLInputElement) {
    if (el.type !== "checkbox" && el.type !== "radio") return null
    const payload = common(el, route)
    payload.checked = el.checked
    const group = el.closest("fieldset")?.querySelector("legend") ?? el.closest("[role='radiogroup'], [role='group']")
    if (group) { const g = group.matches("legend") ? clip(ownText(group), 60) : clip(group.getAttribute("aria-label"), 60); if (g) payload.group = g }
    return { type: "ui.change", payload }
  }
  if (el instanceof HTMLSelectElement) {
    const payload = common(el, route)
    // A drop-down whose options name people or club tasks (Cheers' To and task) records only that a choice was made.
    if (el.getAttribute("data-log-value") === "omit") return { type: "ui.change", payload }
    if (el.multiple) payload.selected = [...el.selectedOptions].length
    else payload.value = clip(el.selectedOptions[0]?.text ?? "", 60)   // the option's own label (app text or a fictional name), not typing
    return { type: "ui.change", payload }
  }
  return null
}

/**
 * Listen to the whole page for presses and choices. Capture phase, so the entry is written before the
 * app reacts (and before, say, the Export button reads the log). Only real clicks count by default: the
 * app's own programmatic clicks (e.g. the download link) are not a participant's action. Change events are
 * taken either way: the app never fires them itself, and some browsers and assistive tools deliver a
 * drop-down choice as an untrusted event.
 */
export function installUiCapture(doc: Document, emit: (e: UiEvent) => void, opts: { trustedOnly?: boolean } = {}): () => void {
  const trustedOnly = opts.trustedOnly ?? true
  const route = () => routeOf(doc.defaultView?.location.hash ?? "").path
  const origin = doc.defaultView?.location.origin ?? ""
  const onClick = (e: MouseEvent) => {
    if (trustedOnly && !e.isTrusted) return
    const ev = describeClick(e.target, route(), origin)
    if (ev) emit(ev)
  }
  const onChange = (e: Event) => {
    const ev = describeChange(e.target, route())
    if (ev) emit(ev)
  }
  doc.addEventListener("click", onClick, true)
  doc.addEventListener("change", onChange, true)
  return () => { doc.removeEventListener("click", onClick, true); doc.removeEventListener("change", onChange, true) }
}

/* ───────────── Ask: what kind of answer was shown (never its text) ───────────── */

interface CardLike { kind: string; citations?: string[]; inScope?: boolean; risks?: { rules?: string[] }[] }
const ANSWER_KIND: Record<string, string> = {
  rule: "rule-answer", form: "plan-form", taskform: "task-form", changes: "change-card", applied: "change-applied", created: "event-created",
  eventdate: "event-date-form", tasks: "task-list", nudge: "reminder-card", review: "plan-check", text: "text",
}

/** One line about an answer: its kind, the cards it showed, the rules and sources it cited, and whether a fallback answered. */
export function answerSummary(reply: { cards: CardLike[]; source: string; changeSet?: { id: string }; autoSet?: { id: string } }, ms: number): UiPayload {
  const kinds = reply.cards.map(c => ANSWER_KIND[c.kind] ?? clip(c.kind, 20))
  const main = kinds.find(k => k !== "text") ?? kinds[0] ?? "empty"
  const cites = [...new Set(reply.cards.flatMap(c => [...(c.citations ?? []), ...(c.risks ?? []).flatMap(r => r.rules ?? [])]))].map(id => clip(id, 30)).slice(0, 12)
  const label = clip(reply.source, 80)
  const payload: UiPayload = { answer: main, cards: kinds.slice(0, 8), citations: cites, source: label, fallback: /unavailable|fallback|AI off|didn't answer|filled from your words/i.test(label), ms: Math.max(0, Math.round(ms)) }
  const rule = reply.cards.find(c => c.kind === "rule")
  if (rule) payload.inScope = rule.inScope === true
  if (reply.changeSet) payload.changeSetId = clip(reply.changeSet.id, 60)
  if (reply.autoSet) payload.autoSetId = clip(reply.autoSet.id, 60)
  return payload
}

/* ───────────── Study task markers (ui.task) ───────────── */

/** The study's task cards are numbered 1 to 6 (docs/PHASE3_SESSION_RUNBOOK.md). */
export const STUDY_TASKS = [1, 2, 3, 4, 5, 6] as const

/** The task running now: the last task marker in the log, if it was a start. Read from the log, so it survives a reload. */
export function currentTask(log: readonly LogEntry[]): { task: number; at: number } | null {
  for (let i = log.length - 1; i >= 0; i--) {
    const e = log[i]
    if (e.type !== "ui.task") continue
    const p = (e.payload ?? {}) as { task?: unknown; event?: unknown }
    return p.event === "start" && typeof p.task === "number" ? { task: p.task, at: e.at } : null
  }
  return null
}

/**
 * The entries one press of a task button writes. `start` is the task pressed, or null for "Task done".
 * A new start ends the running task first (`implicit: true`); a done carries how long the task ran (`ms`).
 * Pressing the running task's own button again, or Done with nothing running, writes nothing.
 */
export function taskMarks(log: readonly LogEntry[], start: number | null, now: number, route: string): UiEvent[] {
  const running = currentTask(log)
  if (start !== null && running?.task === start) return []
  const out: UiEvent[] = []
  if (running) out.push({ type: "ui.task", payload: { task: running.task, event: "done", ...(start !== null ? { implicit: true } : {}), ms: Math.max(0, now - running.at), route } })
  if (start !== null) out.push({ type: "ui.task", payload: { task: start, event: "start", route } })
  return out
}

/* ───────────── Leaving the page (ui.visibility) ───────────── */

/** Away for less than this (a window flicker, a quick Alt-Tab and back) writes nothing. */
export const AWAY_FLICKER_MS = 1000
type AwayVia = "tab" | "window" | "close"
interface AwaySpan { since: number; via: AwayVia; picker: boolean; logged: boolean; timer?: ReturnType<typeof setTimeout> }
/** Focused when the window lost focus: these open the browser's own picker window, so "away" is really "choosing". */
const PICKER = 'select, input[type="file"], input[type="date"], input[type="time"], input[type="datetime-local"], input[type="month"], input[type="week"], input[type="color"]'

/**
 * Records time away from the page as one pair: `hidden` when it starts, `visible` with `awayMs` when it ends.
 * - `via: "tab"`: the page was hidden (another tab, the window minimised, another app on a phone, the screen locked).
 * - `via: "window"`: the page stayed on screen but another window had the focus (Zoom, a PDF or ASU page in its own
 *   window, a file chooser). Only the window's own blur/focus count, never a field's.
 * - `via: "close"`: the page was closed, reloaded or left (pagehide). Written at once, with no flicker wait.
 * Shorter than `flickerMs` writes nothing. The `hidden` entry is written when the absence has lasted `flickerMs`
 * (so its time is about one second late); `awayMs` on `visible` is exact. A phone that freezes a hidden page may
 * skip the `hidden` entry; `visible` still carries the whole `awayMs`.
 */
export function installAwayCapture(win: Window, doc: Document, emit: (e: UiEvent) => void, opts: { flickerMs?: number } = {}): () => void {
  const flicker = opts.flickerMs ?? AWAY_FLICKER_MS
  const route = () => routeOf(win.location.hash).path
  let span: AwaySpan | null = null
  const hidden = (s: AwaySpan) => {
    s.logged = true
    emit({ type: "ui.visibility", payload: { state: "hidden", via: s.via, route: route(), ...(s.picker ? { picker: true } : {}) } })
  }
  const begin = (via: AwayVia) => {
    if (span) { if (via === "tab" && span.via === "window") { span.via = "tab"; span.picker = false } return }
    const s: AwaySpan = { since: Date.now(), via, picker: via === "window" && !!doc.activeElement?.matches?.(PICKER), logged: false }
    s.timer = setTimeout(() => { if (span === s && !s.logged) hidden(s) }, flicker)
    span = s
  }
  const end = () => {
    const s = span
    if (!s) return
    span = null
    clearTimeout(s.timer)
    const awayMs = Math.max(0, Date.now() - s.since)
    if (!s.logged && awayMs < flicker) return                        // a flicker: nothing at all
    emit({ type: "ui.visibility", payload: { state: "visible", via: s.via, awayMs, route: route(), ...(s.picker ? { picker: true } : {}) } })
  }
  const onVisibility = () => (doc.visibilityState === "hidden" ? begin("tab") : end())
  // Only the window's own blur and focus: a field's are not "away" (they do not bubble here, but capture-phase ones could).
  const isWindow = (t: EventTarget | null) => !t || (t as Node).nodeType === undefined
  const onBlur = (e: FocusEvent) => { if (isWindow(e.target) && doc.visibilityState === "visible") begin("window") }
  const onFocus = (e: FocusEvent) => { if (isWindow(e.target) && doc.visibilityState === "visible") end() }
  const onPageHide = () => {
    if (span?.logged) return
    if (span) clearTimeout(span.timer)
    const s: AwaySpan = { since: span?.since ?? Date.now(), via: "close", picker: false, logged: false }
    span = s
    hidden(s)
  }
  const onPageShow = (e: PageTransitionEvent) => { if (e.persisted) end() }
  doc.addEventListener("visibilitychange", onVisibility)
  win.addEventListener("blur", onBlur)
  win.addEventListener("focus", onFocus)
  win.addEventListener("pagehide", onPageHide)
  win.addEventListener("pageshow", onPageShow)
  return () => {
    if (span) clearTimeout(span.timer)
    doc.removeEventListener("visibilitychange", onVisibility)
    win.removeEventListener("blur", onBlur)
    win.removeEventListener("focus", onFocus)
    win.removeEventListener("pagehide", onPageHide)
    win.removeEventListener("pageshow", onPageShow)
  }
}

/* ───────────── Starting to type in a field (ui.edit) ───────────── */

export type EditKind = "text" | "textarea" | "number" | "date" | "search"
const INPUT_KIND: Record<string, EditKind> = {
  text: "text", email: "text", url: "text", tel: "text", search: "search", number: "number",
  date: "date", "datetime-local": "date", time: "date", month: "date", week: "date",
}

/** What kind of typing field this is, or null when it is not one (buttons, boxes, drop-downs) or is a password field. */
export function editKind(el: EventTarget | null): EditKind | null {
  if (el instanceof HTMLTextAreaElement) return "textarea"
  if (el instanceof HTMLInputElement) {
    if (el.type === "password" || /password/i.test(el.autocomplete)) return null
    return INPUT_KIND[el.type] ?? null
  }
  if (el instanceof HTMLElement && el.isContentEditable) return "textarea"
  return null
}

/**
 * A field's name from its label only: aria-label, aria-labelledby, its <label>, placeholder or title.
 * Never its own text: a <textarea>'s text is what was typed into it.
 */
export function fieldNameOf(el: Element): string {
  const aria = el.getAttribute("aria-label")
  if (aria) return clip(aria)
  const by = el.getAttribute("aria-labelledby")
  if (by) {
    const text = clip(by.split(/\s+/).map(id => el.ownerDocument.getElementById(id)).filter(x => x && x !== el && !x.contains(el)).map(x => ownText(x!)).join(" "))
    if (text) return text
  }
  const labels = (el as HTMLInputElement).labels
  if (labels && labels.length) { const text = clip([...labels].map(ownText).join(" ")); if (text) return text }
  return clip(el.getAttribute("placeholder") ?? el.getAttribute("title") ?? "")
}

/**
 * Records, for each focus on a typing field, the first time the participant changes it (`event: "start"`), and when
 * focus leaves it, how long since that first change (`event: "end"`, `ms`). Only the field's name, kind, page and part
 * of the screen are kept: never the value, its length or any key. Password fields write nothing at all. Focusing a
 * field without typing writes nothing. Switching to another window takes the focus away too, so it ends the session.
 */
export function installEditCapture(doc: Document, emit: (e: UiEvent) => void, opts: { trustedOnly?: boolean } = {}): () => void {
  const trustedOnly = opts.trustedOnly ?? true
  const win = doc.defaultView
  const route = () => routeOf(win?.location.hash ?? "").path
  let active: { el: Element; startedAt: number | null; base: UiPayload | null } | null = null
  const end = () => {
    const a = active
    active = null
    if (a && a.startedAt !== null && a.base) emit({ type: "ui.edit", payload: { ...a.base, event: "end", ms: Math.max(0, Date.now() - a.startedAt) } })
  }
  const onFocusIn = (e: FocusEvent) => {
    if (active && active.el !== e.target) end()
    if (!active && editKind(e.target)) active = { el: e.target as Element, startedAt: null, base: null }
  }
  const onInput = (e: Event) => {
    if (trustedOnly && !e.isTrusted) return
    const kind = editKind(e.target)
    if (!kind) return
    const el = e.target as Element
    if (!active || active.el !== el) { end(); active = { el, startedAt: null, base: null } }
    if (active.startedAt !== null) return                              // once per focus
    const area = areaOf(el)
    active.base = { route: route(), field: fieldNameOf(el), kind, ...(area ? { area } : {}) }
    active.startedAt = Date.now()
    emit({ type: "ui.edit", payload: { ...active.base, event: "start" } })
  }
  const onFocusOut = (e: FocusEvent) => { if (active && active.el === e.target) end() }
  // A field removed while focused (the screen changed) does not get a focusout in every browser: close it on the next page change.
  const onHash = () => { if (active && (!active.el.isConnected || doc.activeElement !== active.el)) end() }
  doc.addEventListener("focusin", onFocusIn, true)
  doc.addEventListener("input", onInput, true)
  doc.addEventListener("focusout", onFocusOut, true)
  win?.addEventListener("hashchange", onHash)
  win?.addEventListener("pagehide", end)
  return () => {
    doc.removeEventListener("focusin", onFocusIn, true)
    doc.removeEventListener("input", onInput, true)
    doc.removeEventListener("focusout", onFocusOut, true)
    win?.removeEventListener("hashchange", onHash)
    win?.removeEventListener("pagehide", end)
  }
}

/* ───────────── Hover cards (ui.hover) ───────────── */

/** A hover card shown for less than this is a mouse passing over, not reading: nothing is written. */
export const HOVER_MIN_MS = 500
const GENERIC_NAME = /^(more information|info|details)$/i

/**
 * One entry for a hover card (the Hover / Info components) that was open for `ms`, written when it closes.
 * `name` is the trigger's accessible name (never the card's text); when that name is generic ("More information"),
 * `near` adds the heading it sits under so the card can be told apart. `via`: mouse, focus (keyboard, or a click
 * that left the focus on it) or tap (touch screens). Returns null under the threshold.
 */
export function describeHover(box: Element, ms: number, via: "mouse" | "focus" | "tap", route: string): UiEvent | null {
  if (ms < HOVER_MIN_MS) return null
  const trigger = [...box.querySelectorAll("button, a[href], input, select, textarea, [tabindex]")].find(el => !el.closest("[role='tooltip']")) ?? box
  const name = logNameOf(trigger)
  const payload: UiPayload = { route, name, ms: Math.round(ms), via }
  if (!name || GENERIC_NAME.test(name)) {
    const heading = box.closest("h1, h2, h3, h4") ?? box.closest("header")?.querySelector("h1, h2, h3, h4, b")
    const near = heading ? clip(ownText(heading), 60) : ""
    if (near) payload.near = near
  }
  const area = areaOf(box)
  if (area) payload.area = area
  return { type: "ui.hover", payload }
}
