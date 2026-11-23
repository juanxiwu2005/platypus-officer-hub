import type { ChecklistItem, ChecklistModule, ChecklistWhen, ChecklistWho, OnboardingChecklist } from "../data/types"
import { nextCounter } from "./ids"

/**
 * The onboarding checklist matrix (Settings → Onboarding, option C; docs/feedback-fix/CHECKLIST_MATRIX_CONTRACT.md).
 * Pure functions only: no React and no store, so the editor, the store and the tests share one definition.
 * "When" values are relative labels, never dates: only the rule engine turns them into deadlines, in a later package.
 */

/** Every "when" value, in the order the editor lists them. */
export const CHECKLIST_WHEN: readonly ChecklistWhen[] = ["day1", "day3", "week1", "week2", "month1", "none"]
/** Every "who does it" value, in the order the editor lists them. */
export const CHECKLIST_WHO: readonly ChecklistWho[] = ["new", "buddy", "president", "outgoing"]
export const WHEN_LABEL: Readonly<Record<ChecklistWhen, string>> = { day1: "Day 1", day3: "Day 3", week1: "Week 1", week2: "Week 2", month1: "Month 1", none: "No deadline" }
export const WHO_LABEL: Readonly<Record<ChecklistWho, string>> = { new: "New officer", buddy: "Buddy", president: "President", outgoing: "Outgoing officer" }

export const MAX_CHECKLIST_MODULES = 20
export const MAX_MODULE_ITEMS = 60
export const MAX_CHECKLIST_ITEMS = 300
export const MAX_ITEM_TITLE = 120
export const MAX_MODULE_TITLE = 60
/** Where pasted items go when no module was named before them. */
export const DEFAULT_PASTE_MODULE = "Checklist"
/** Keeps a module that still has items when its name was cleared, instead of silently dropping its items. */
export const UNTITLED_MODULE = "Untitled module"

/** The only `source` form kept: a policy record label from src/data/policyCatalog.ts. */
const SOURCE_LABEL = /^ASU-R-\d{3}$/

export type CellState = "inherited" | "hidden" | "included" | "off"
/** One pasted or typed item before it has an id or role columns. */
export interface PastedItem { title: string; when?: ChecklistWhen; who?: ChecklistWho }
export interface PastedModule { title: string; items: PastedItem[] }
export interface PastedList { modules: PastedModule[] }

const isWhen = (v: unknown): v is ChecklistWhen => typeof v === "string" && (CHECKLIST_WHEN as readonly string[]).includes(v)
const isWho = (v: unknown): v is ChecklistWho => typeof v === "string" && (CHECKLIST_WHO as readonly string[]).includes(v)
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v)
const collapse = (s: string) => s.replace(/\s+/g, " ").trim()
/** Trim, collapse inner whitespace and cut to the limit; "" for anything that is not a string. */
const capText = (v: unknown, max: number) => typeof v === "string" ? collapse(v).slice(0, max).trim() : ""

/* ───────────── Reading the matrix ───────────── */

/** The item's own "when", else its module's. */
export const effectiveWhen = (m: ChecklistModule, i: ChecklistItem): ChecklistWhen => i.when ?? m.when
/** The item's own "who does it", else its module's. */
export const effectiveWho = (m: ChecklistModule, i: ChecklistItem): ChecklistWho => i.who ?? m.who

/** What one matrix cell shows: a light dot from Everyone, a crossed ring when hidden, a filled dot when chosen, an empty ring otherwise. */
export function cellState(i: ChecklistItem, roleId: string): CellState {
  if (i.everyone) return i.hiddenFor.includes(roleId) ? "hidden" : "inherited"
  return i.roleIds.includes(roleId) ? "included" : "off"
}
/** Whether the role gets the item. */
export const getsItem = (i: ChecklistItem, roleId: string) => { const state = cellState(i, roleId); return state === "inherited" || state === "included" }

/** Click on a role's cell: with Everyone on it hides or unhides the role; otherwise it adds or removes the role. Returns a new item. */
export function toggleCell(i: ChecklistItem, roleId: string): ChecklistItem {
  const flip = (ids: string[]) => ids.includes(roleId) ? ids.filter(id => id !== roleId) : [...ids, roleId]
  return i.everyone ? { ...i, hiddenFor: flip(i.hiddenFor) } : { ...i, roleIds: flip(i.roleIds) }
}

/** The Everyone cell. Either way both role lists start empty, so the result never mixes the two meanings. */
export const toggleEveryone = (i: ChecklistItem): ChecklistItem => ({ ...i, everyone: !i.everyone, roleIds: [], hiddenFor: [] })

/** Items the role gets, across all modules. */
export const countForRole = (c: OnboardingChecklist, roleId: string) => c.modules.reduce((n, m) => n + m.items.filter(i => getsItem(i, roleId)).length, 0)
/** Items with Everyone on. */
export const countEveryone = (c: OnboardingChecklist) => c.modules.reduce((n, m) => n + m.items.filter(i => i.everyone).length, 0)
/** Items in the whole checklist. */
export const countItems = (c: OnboardingChecklist) => c.modules.reduce((n, m) => n + m.items.length, 0)

/** The role's items, in checklist order, each with its module (for the module's when and who). */
export function itemsForRole(c: OnboardingChecklist, roleId: string): { module: ChecklistModule; item: ChecklistItem }[] {
  return c.modules.flatMap(module => module.items.filter(item => getsItem(item, roleId)).map(item => ({ module, item })))
}

/** JSON with object keys sorted, so two equal checklists compare equal whatever order their fields were written in. */
const stableJson = (v: unknown): string => Array.isArray(v) ? `[${v.map(stableJson).join(",")}]`
  : v && typeof v === "object" ? `{${Object.keys(v).sort().filter(k => (v as Record<string, unknown>)[k] !== undefined).map(k => `${JSON.stringify(k)}:${stableJson((v as Record<string, unknown>)[k])}`).join(",")}}`
  : JSON.stringify(v) ?? "null"
/** True when both hold the same modules and items; `updatedOn` is ignored, so a save that changes nothing changes nothing. */
export const sameChecklist = (a: OnboardingChecklist, b: OnboardingChecklist) => a.version === b.version && stableJson(a.modules) === stableJson(b.modules)

/**
 * Ids "ck-N" that do not collide with any id already in the checklist (src/lib/ids.ts). Callers pass the returned function
 * as `makeId`; tests pass their own counter instead, so every function here stays deterministic.
 */
export function checklistIdMaker(c?: OnboardingChecklist | null): () => string {
  const ids = (c?.modules ?? []).flatMap(m => [m.id, ...m.items.map(i => i.id)])
  let next = nextCounter(ids, /^ck-(\d+)$/)
  return () => `ck-${next++}`
}

/* ───────────── Validation ───────────── */

const cleanId = (v: unknown) => typeof v === "string" && v.length > 0 && v.length <= 100 ? v : null
const knownIds = (v: unknown, known: ReadonlySet<string>) => Array.isArray(v) ? [...new Set(v.filter((id): id is string => typeof id === "string" && known.has(id)))] : []

function sanitizeItem(raw: unknown, known: ReadonlySet<string>, seen: Set<string>): ChecklistItem | null {
  if (!isRecord(raw)) return null
  const id = cleanId(raw.id), title = capText(raw.title, MAX_ITEM_TITLE)
  if (!id || seen.has(id) || !title) return null
  seen.add(id)
  // A missing flag reads as Everyone, the default for new items. The list that the flag does not use is emptied.
  const everyone = typeof raw.everyone === "boolean" ? raw.everyone : true
  return {
    id, title,
    ...(isWhen(raw.when) ? { when: raw.when } : {}),
    ...(isWho(raw.who) ? { who: raw.who } : {}),
    everyone,
    roleIds: everyone ? [] : knownIds(raw.roleIds, known),
    hiddenFor: everyone ? knownIds(raw.hiddenFor, known) : [],
    ...(typeof raw.source === "string" && SOURCE_LABEL.test(raw.source) ? { source: raw.source } : {}),
  }
}

/**
 * The only way a checklist enters the store: a valid copy of `raw`, or null when it is not a version-1 checklist at all.
 * Unknown enum values fall back (items follow the module; a module uses No deadline / New officer), text is trimmed and
 * capped, items with an empty title, unknown or archived role ids, repeated ids and any `source` other than "ASU-R-NNN"
 * are dropped, and the limits (20 modules, 60 items per module, 300 in total) cut what is beyond them.
 * A module whose name is empty is dropped only when it has no items; otherwise it is kept as "Untitled module" so that
 * clearing a name while typing never deletes the module's items.
 */
export function sanitizeChecklist(raw: unknown, roleIds: readonly string[], today: string): OnboardingChecklist | null {
  if (!isRecord(raw) || raw.version !== 1 || !Array.isArray(raw.modules)) return null
  const known = new Set(roleIds), seen = new Set<string>()
  const modules: ChecklistModule[] = []
  let total = 0
  for (const rm of raw.modules) {
    if (modules.length >= MAX_CHECKLIST_MODULES) break
    if (!isRecord(rm)) continue
    const id = cleanId(rm.id)
    if (!id || seen.has(id)) continue
    seen.add(id)
    const items: ChecklistItem[] = []
    for (const ri of Array.isArray(rm.items) ? rm.items : []) {
      if (items.length >= MAX_MODULE_ITEMS || total >= MAX_CHECKLIST_ITEMS) break
      const item = sanitizeItem(ri, known, seen)
      if (item) { items.push(item); total++ }
    }
    const title = capText(rm.title, MAX_MODULE_TITLE) || (items.length ? UNTITLED_MODULE : "")
    if (!title) continue
    modules.push({ id, title, when: isWhen(rm.when) ? rm.when : "none", who: isWho(rm.who) ? rm.who : "new", items })
  }
  return { version: 1, modules, updatedOn: today }
}

/* ───────────── Typed shorthand and pasted lists ───────────── */

// Whole tokens only: "day 10" or "@newcomer" are not tokens. The leading space is kept in group 1 so removal keeps word gaps.
const WHO_TOKEN = /(^|\s)@(new|buddy|president|outgoing|predecessor)(?=\s|$)/gi
const WHEN_TOKEN = /(^|\s)(day\s+(?:1|3|30)|week\s+(?:1|2)|month\s+1)(?=\s|$)/gi
const WHO_OF_TOKEN: Record<string, ChecklistWho> = { new: "new", buddy: "buddy", president: "president", outgoing: "outgoing", predecessor: "outgoing" }
const WHEN_OF_TOKEN: Record<string, ChecklistWhen> = { "day 1": "day1", "day 3": "day3", "day 30": "month1", "week 1": "week1", "week 2": "week2", "month 1": "month1" }

/** The one value the tokens agree on; undefined when there is none or they disagree (no guessing). */
function single<T>(text: string, token: RegExp, of: (match: string) => T): T | undefined {
  const values = [...new Set([...text.matchAll(token)].map(m => of(collapse(m[2]).toLowerCase())))]
  return values.length === 1 ? values[0] : undefined
}
const whenTokenIn = (text: string) => single(text, WHEN_TOKEN, t => WHEN_OF_TOKEN[t])
const whoTokenIn = (text: string) => single(text, WHO_TOKEN, t => WHO_OF_TOKEN[t])

/**
 * "Meet your buddy @buddy day 3" → title "Meet your buddy", who buddy, when Day 3. Recognized tokens are case-insensitive
 * whole words: @new @buddy @president @outgoing @predecessor, and day 1, day 3, week 1, week 2, month 1, day 30 (= Month 1).
 * Tokens that disagree (day 1 … week 2) set nothing and stay in the title. When removing the tokens would leave no title,
 * the original text stays the title and nothing is set.
 */
export function parseShorthand(text: string): PastedItem {
  const original = collapse(text)
  const when = whenTokenIn(original), who = whoTokenIn(original)
  let title = original
  if (when) title = title.replace(WHEN_TOKEN, "$1")
  if (who) title = title.replace(WHO_TOKEN, "$1")
  title = collapse(title).replace(/^[\s,;:\-–—]+|[\s,;:\-–—]+$/g, "")
  if (!title) return { title: original }
  return { title, ...(when ? { when } : {}), ...(who ? { who } : {}) }
}

/** A spreadsheet "Due" cell: a single when token ("Week 1", "Day 30") or a label ("No deadline"). Dates and anything else: none. */
function whenFromCell(cell: string): ChecklistWhen | undefined {
  const label = CHECKLIST_WHEN.find(w => WHEN_LABEL[w].toLowerCase() === collapse(cell).toLowerCase())
  return label ?? whenTokenIn(cell)
}

const OWNER_WORDS: [ChecklistWho, RegExp][] = [
  ["buddy", /\bbuddy\b/i],
  ["president", /\b(?:vice\s+)?president\b/i],
  ["outgoing", /\b(?:outgoing|predecessor|previous)\b/i],
]
/** A spreadsheet "Owner" cell: buddy, (vice) president, or outgoing/predecessor/previous. Anything else, or two of them, sets nothing. */
function whoFromCell(cell: string): ChecklistWho | undefined {
  const found = OWNER_WORDS.filter(([, word]) => word.test(cell)).map(([who]) => who)
  return found.length === 1 ? found[0] : undefined
}

const HEADER_NAMES = {
  item: ["checklist item", "item", "task", "title"],
  section: ["section", "module", "group"],
  owner: ["owner", "who", "responsible"],
  due: ["due", "when", "timing"],
} as const
type HeaderField = keyof typeof HEADER_NAMES
const normalHeader = (cell: string) => collapse(cell).toLowerCase().replace(/[:*]+$/, "")

/** Column index for each field. An exact header name wins over a longer one ("Due Date" for due), and a column is used once. */
function headerColumns(header: string[]): Partial<Record<HeaderField, number>> {
  const names = header.map(normalHeader), taken = new Set<number>(), out: Partial<Record<HeaderField, number>> = {}
  for (const field of Object.keys(HEADER_NAMES) as HeaderField[]) {
    const keys: readonly string[] = HEADER_NAMES[field]
    const free = (i: number) => !taken.has(i)
    let index = names.findIndex((n, i) => free(i) && keys.includes(n))
    if (index < 0) index = names.findIndex((n, i) => free(i) && keys.some(k => n.startsWith(`${k} `)))
    if (index >= 0) { out[field] = index; taken.add(index) }
  }
  return out
}

/** "0. Onboarding Confirmation" → "Onboarding Confirmation"; "1) Tools" → "Tools". */
const withoutNumber = (s: string) => collapse(s).replace(/^\d+(?:\.\d+)*[.)]?\s+/, "")
/** Strips list markers: -, *, •, ☐, [ ], 1., 1), 0.1 (repeatedly, so "- [ ] Item" works). A bare number such as "2026" stays. */
function withoutBullet(line: string): string {
  let out = line, prev = ""
  while (out !== prev) { prev = out; out = out.replace(/^(?:[-*•☐]|\[\s?\])\s*|^(?:\d+(?:\.\d+)+\.?|\d+[.)])\s+/, "").trim() }
  return out
}

function moduleList() {
  const modules: PastedModule[] = []
  const moduleFor = (title: string) => {
    let m = modules.find(x => x.title.toLowerCase() === title.toLowerCase())
    if (!m) { m = { title, items: [] }; modules.push(m) }
    return m
  }
  return { modules, moduleFor }
}

function parseSheet(rows: string[][], cols: Partial<Record<HeaderField, number>>): PastedList {
  const { modules, moduleFor } = moduleList()
  const cell = (row: string[], i: number | undefined) => i === undefined ? "" : row[i] ?? ""
  let current: string | null = null
  for (const row of rows) {
    const item = collapse(cell(row, cols.item))
    if (!item) {
      // A section row: text in the first cell only (the SEO sheet's "0. Onboarding Confirmation").
      const title = withoutNumber(row[0] ?? "")
      if (title) { current = title; moduleFor(title) }
      continue
    }
    const section = withoutNumber(cell(row, cols.section))
    if (section) current = section
    const when = whenFromCell(cell(row, cols.due)), who = whoFromCell(cell(row, cols.owner))
    moduleFor(current ?? DEFAULT_PASTE_MODULE).items.push({ title: item, ...(when ? { when } : {}), ...(who ? { who } : {}) })
  }
  return { modules }
}

function parseLines(lines: string[]): PastedList {
  const { modules, moduleFor } = moduleList()
  let current: string | null = null
  for (const raw of lines) {
    const line = withoutBullet(collapse(raw))
    if (!line) continue
    if (line.endsWith(":")) {
      const title = collapse(line.slice(0, -1))
      if (title) { current = title; moduleFor(title) }
      continue
    }
    moduleFor(current ?? DEFAULT_PASTE_MODULE).items.push(parseShorthand(line))
  }
  return { modules }
}

/**
 * Pasted text to modules and items, without ids. Tab-separated text whose first row names an item column
 * (Item, Checklist Item, Task, Title) is read as a spreadsheet: columns by header name, section rows become modules.
 * Anything else is read as lines: "Name:" starts a module, list markers are stripped, each line goes through parseShorthand.
 * Absolute dates are never read. Items before any module go into "Checklist". Modules with the same name are merged.
 */
export function parsePastedList(text: string): PastedList {
  const lines = text.split(/\r?\n/)
  const first = lines.findIndex(l => l.trim())
  if (first < 0) return { modules: [] }
  if (lines[first].includes("\t")) {
    const split = (l: string) => l.split("\t").map(c => c.trim().replace(/^"([\s\S]*)"$/, "$1").trim())
    const cols = headerColumns(split(lines[first]))
    if (cols.item !== undefined) return parseSheet(lines.slice(first + 1).filter(l => l.trim()).map(split), cols)
    return parseLines(lines.map(l => l.replace(/\t+/g, " ")))
  }
  return parseLines(lines)
}

/**
 * Append a parsed paste. A pasted module whose name matches an existing one (ignoring case) adds its items there;
 * other modules are new, with No deadline and New officer. New items go to everyone. Limits are respected: what does
 * not fit is left out. Ids come from `makeId`. `updatedOn` is carried over (empty for a new checklist): the store sets it on save.
 */
export function addPasted(c: OnboardingChecklist | null | undefined, parsed: PastedList, makeId: () => string): OnboardingChecklist {
  const modules: ChecklistModule[] = (c?.modules ?? []).map(m => ({ ...m, items: [...m.items] }))
  let total = modules.reduce((n, m) => n + m.items.length, 0)
  for (const pm of parsed.modules) {
    const title = capText(pm.title, MAX_MODULE_TITLE)
    if (!title) continue
    let target = modules.find(m => m.title.trim().toLowerCase() === title.toLowerCase())
    if (!target) {
      // A new module that could not hold any of its items is left out too; an empty pasted module is still added.
      if (modules.length >= MAX_CHECKLIST_MODULES || (total >= MAX_CHECKLIST_ITEMS && pm.items.length > 0)) continue
      target = { id: makeId(), title, when: "none", who: "new", items: [] }
      modules.push(target)
    }
    for (const pi of pm.items) {
      if (total >= MAX_CHECKLIST_ITEMS || target.items.length >= MAX_MODULE_ITEMS) break
      const itemTitle = capText(pi.title, MAX_ITEM_TITLE)
      if (!itemTitle) continue
      target.items.push({ id: makeId(), title: itemTitle, ...(isWhen(pi.when) ? { when: pi.when } : {}), ...(isWho(pi.who) ? { who: pi.who } : {}), everyone: true, roleIds: [], hiddenFor: [] })
      total++
    }
  }
  return { version: 1, modules, updatedOn: c?.updatedOn ?? "" }
}
