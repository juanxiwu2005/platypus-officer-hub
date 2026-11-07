/**
 * Screen events for the interaction log (Phase 3 research build, docs/PHASE3_DATA_DICTIONARY.md).
 *
 * The app's data actions are logged by the store (src/data/store.tsx). This module adds what a participant
 * does on screen — pages visited, buttons and links pressed, choices made in checkboxes and drop-downs,
 * questions asked and what kind of answer came back — into the SAME log, with the same entry shape and one
 * numbering, so the export is one ordered record. UI entries are told apart by a `ui.` prefix on `type`.
 *
 * What is never read: keystrokes, the value of text, number, date, password or file fields, hover,
 * scrolling, mouse movement, and the AI's reply text. Query strings are dropped from every address.
 * Nothing here sends anything anywhere; events only go to the in-browser log.
 */

export type UiType = "ui.navigate" | "ui.click" | "ui.change" | "ui.ask" | "ui.answer" | "ui.details" | "ui.reminder" | "ui.export"
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
      if (child.matches("select, option, textarea, input, [aria-hidden='true'], svg")) return
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

function areaOf(el: Element): string | null {
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

const common = (el: Element, route: string): UiPayload => {
  const payload: UiPayload = { route, role: roleOf(el), name: nameOf(el) }
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
  const payload = common(c, route)
  if (c.matches("a[href]")) Object.assign(payload, linkTarget(c.getAttribute("href") ?? "", origin))
  if (c.matches("summary") && c.parentElement instanceof HTMLDetailsElement) payload.expanded = !c.parentElement.open
  else if (c.hasAttribute("aria-expanded")) payload.expanded = c.getAttribute("aria-expanded") !== "true"
  if (c.getAttribute("role") === "tab") payload.selected = true
  const off = c.getAttribute("aria-disabled") === "true" || (c as HTMLButtonElement).disabled === true
  return { type: "ui.click", payload, ...(off ? { applied: false } : {}) }
}

/** A choice made in a checkbox, radio button or drop-down. Text, date, number and file fields return null: what is typed is never read. */
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
  rule: "rule-answer", form: "plan-form", taskform: "task-form", changes: "change-card", applied: "change-applied",
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
